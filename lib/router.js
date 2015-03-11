(function() {
  "use strict";

  var queryString      = require('query-string'),
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
    return Object.keys(search).length ? path + '?' + queryString.stringify(search) : path;
  }

  function Router() {
    this.__routes__   = [];
    this.__route__    = null;
    this.__default__  = null;
    this.__params__   = {};
    this.__location__ = {path: null, search: {}};
  }

  Router.prototype.urlFor = function(route, params) {
    var path = generatePath(route, params), search = generateSearch(route, params);
    return buildUrl(path, search);
  };

  Router.prototype.define = function(pattern, callback, opts) {
    var route = {
      pattern: pattern,
      regex: buildRegex(pattern),
      names: extractNames(pattern),
      callback: callback
    };

    this.__routes__.push(route);

    if (opts && opts.default) {
      if (this.__default__) { throw new Error('Router#define: multiple default routes defined'); }
      this.__default__ = route;
    }

    return route;
  };

  Router.prototype.unknown = function(callback) {
    this.__unknown__ = callback;
    return this;
  };

  Router.prototype.start = function(opts) {
    var _this = this;

    if (!this.__started__) {
      this.__window__ = (opts && opts.window) || (typeof window !== 'undefined' ? window : {});

      this._onPopState = function() {
        var loc = _this.__window__.location;
        _this._handleLocationChange(loc.pathname, loc.search);
      };

      this.__window__.addEventListener('popstate', this._onPopState);
      this._onPopState();
      this.__started__ = true;
    }

    return this;
  };

  Router.prototype.stop = function() {
    if (this.__started__) {
      this.__window__.removeEventListener('popstate', this._onPopState);
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

    this.__location__ = {path: path, search: queryString.parse(search)};
    params = util.assign({}, this.__location__.search);

    if (route = this.recognize(path)) {
      params = util.assign(params, extractParams(route, path));
      if (this.__route__ !== route || !equals(this.__params__, params)) {
        this.__route__  = route;
        this.__params__ = params;
        route.callback(params);
      }
    }

    if ((path === '' || path === '/') && this.__default__) {
      this.__default__.callback(params);
    }
    else if (this.__unknown__) {
      this.__unknown__(path);
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
    var loc    = this.__location__,
        path   = generatePath(this.__route__, this.__params__),
        search = generateSearch(this.__route__, this.__params__),
        url    = buildUrl(path, search);

    this.__window__.history[path === loc.path ? 'replaceState' : 'pushState']({}, null, url);
    this.__location__ = {path: path, search: search};

    clearTimeout(this._timer);
    delete this._timer;

    return this;
  };

  module.exports = new Router();
}());
