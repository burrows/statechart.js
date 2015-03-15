(function() {
  "use strict";

  require('html5-history-api');

  var qs               = require('querystring'),
      equals           = require('shallow-equals'),
      util             = require('./util'),
      escapeRegex      = /[\-{}\[\]+?.,\\\^$|#\s]/g,
      namedParam       = /:(\w+)/g,
      splatParam       = /\*(\w+)/g,
      nameOrSplatParam = /[:*](\w+)/g;

  function buildRegex(pattern) {
    var re = pattern
      .replace(escapeRegex, '\\$&')
      .replace(namedParam, '([^/]*)')
      .replace(splatParam, '(.*?)');

    return new RegExp('^' + re + '$');
  }

  function extractNames(pattern) {
    var names = pattern.match(nameOrSplatParam) || [], i, n;

    for (i = 0, n = names.length; i < n; i++) {
      names[i] = names[i].slice(1);
    }

    return names;
  }

  function extractParams(route, path) {
    var vals = route.regex.exec(path).slice(1), params = {}, i, n;

    for (i = 0, n = route.names.length; i < n; i++) {
      params[route.names[i]] = vals[i];
    }

    return params;
  }

  function generatePath(route, params) {
    return route.pattern.replace(nameOrSplatParam, function(_, name) { return params[name]; });
  }

  function generateSearch(route, params) {
    var search = {}, k;

    for (k in params) {
      if (route.names.indexOf(k) !== -1) { continue; }
      search[k] = params[k];
    }

    return search;
  }

  function buildUrl(path, search) {
    return Object.keys(search).length ? path + '?' + qs.stringify(search) : path;
  }

  // Public: The `Router` constructor. The `Router` class provides an abstraction around the
  // browser's URL that allows applications to update the URL upon state changes as well as be
  // notified when the URL is changed by the user.
  //
  // Routes are defined with a pattern and a callback function. The callback is invoked when a user
  // changes the URL to match the pattern. The application can sync its own state to the URL by
  // informing the router what the current route should be. The router generates a new path based on
  // the given route and route params and updates the browser's URL.
  //
  // Route patterns can be a simple string that is matched exactly or they can contain parameter
  // parts. Parameter parts like `:param` match a single path segment while parts like `*splat` can
  // match multiple path segments.
  //
  // Examples
  //
  //   # define some routes
  //   var router      = new Router;
  //   var widgetIndex = router.define('/widgets', widgetIndexHandler);
  //   var widgetShow  = router.define('/widgets/:id', widgetShowHandler);
  //   var file        = router.define('/file/*path', fileHandler);
  //
  //   # set the current route (this will update the browser URL)
  //   router.route(widgetIndex);      # URL is now /widgets
  //
  //   router.route(widgetShow);
  //   router.params({id: 12});        # URL is now /widgets/12
  //
  //   router.route(file);
  //   router.params({path: 'a/b/c'}); # URL is now /file/a/b/c
  //
  //   # set search params
  //   router.route(widgetShow);
  //   router.params({id: 8, foo: 'bar'}); # URL is now /widgets/8?foo=bar
  function Router() {
    this.__routes__ = [];
    this.__route__  = null;
    this.__params__ = {};
  }

  Router.prototype.urlFor = function(route, params) {
    var path = generatePath(route, params), search = generateSearch(route, params);
    return buildUrl(path, search);
  };

  Router.prototype.define = function(pattern, callback) {
    var route = {
      pattern: pattern,
      regex: buildRegex(pattern),
      names: extractNames(pattern),
      callback: callback
    };

    this.__routes__.push(route);

    return route;
  };

  Router.prototype.unknown = function(callback) {
    this.__unknown__ = callback;
    return this;
  };

  Router.prototype.start = function(opts) {
    var _this = this;

    if (!this.__started__) {
      this.__window__   = (opts && opts.window) || (typeof window !== 'undefined' ? window : {});
      this.__location__ = this.__window__.history.location || this.__window__.location;
      this.__history__  = this.__window__.history;

      this._onPopState = function() {
        var loc = _this.__location__;
        _this._handleLocationChange(loc.pathname, qs.parse(loc.search));
      };

      this._onClick = function(e) { _this._handleClick(e); };

      this.__window__.addEventListener('popstate', this._onPopState);
      this.__window__.addEventListener('click', this._onClick);
      this._onPopState();
      this.__started__ = true;
    }

    return this;
  };

  Router.prototype.stop = function() {
    if (this.__started__) {
      this.__window__.removeEventListener('popstate', this._onPopState);
      this.__window__.removeEventListener('click', this._onClick);
      delete this._onPopState;
      this.__started__ = false;
    }
    return this;
  };

  Router.prototype.reset = function() {
    if (this._timer) { clearTimeout(this._timer); }
    this.stop();
    Router.call(this);
    return this;
  };

  Router.prototype.route = function(route) {
    if (!arguments.length) { return this.__route__; }
    this.__route__ = route;
    this._flush();
    return route;
  };

  Router.prototype.params = function(params, replace) {
    if (!arguments.length) { return this.__params__; }
    if (replace) {
      this.__params__ = params || {};
    }
    else {
      util.assign(this.__params__, params);
    }

    this._flush();

    return this.__params__;
  };

  Router.prototype.recognize = function(path) {
    var route, i, n;

    for (i = 0, n = this.__routes__.length; i < n; i++) {
      route = this.__routes__[i];
      if (route.regex.exec(path)) { return route; }
    }

    return null;
  };

  Router.prototype._handleLocationChange = function(path, search) {
    var params, route;

    params = util.assign({}, search);

    if (route = this.recognize(path)) {
      params = util.assign(params, extractParams(route, path));
      if (this.__route__ !== route || !equals(this.__params__, params)) {
        if (route.callback(params) === false) {
          this.flush();
        }
        else {
          this.__route__  = route;
          this.__params__ = params;
        }
      }
    }

    if (this.__unknown__) { this.__unknown__(path); }
  };

  Router.prototype._handleClick = function(e) {
    var a = e.target, pathname, aHost, locHost;

    if (e.ctrlKey || e.metaKey || e.which === 2) { return; }

    while (a && String(a.nodeName).toLowerCase() !== 'a') { a = a.parentNode; }

    if (!a) { return; }

    pathname = a.pathname;
    aHost    = a.host.replace(/:\d+$/, '');
    locHost  = this.__location__.host.replace(/:\d+$/, '');

    if (!pathname.match(/^\//)) { pathname = '/' + pathname; }

    if (aHost === locHost && this.recognize(pathname)) {
      e.preventDefault();
      this._handleLocationChange(pathname, a.search);
    }
  };

  Router.prototype._flush = function() {
    var _this = this;

    if (!this._timer) {
      this._timer = setTimeout(function() { _this.flush(); });
    }

    return this;
  };

  Router.prototype.flush = function() {
    var curPath = this.__location__.pathname,
        path    = generatePath(this.__route__, this.__params__),
        search  = generateSearch(this.__route__, this.__params__),
        url     = buildUrl(path, search),
        replace = this.replace || curPath === path;

    this.__history__[replace ? 'replaceState' : 'pushState']({}, null, url);

    clearTimeout(this._timer);
    delete this._timer;
    delete this.replace;

    return this;
  };

  module.exports = new Router();
}());
