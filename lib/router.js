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

  function Router(opts) {
    this.__window__   = (opts && opts.window) || (typeof window !== 'undefined' ? window : {});
    this.__routes__   = [];
    this.__route__    = null;
    this.__params__   = {};
    this.__location__ = {path: null, search: {}};
  }

  Router.urlFor = function(route, params) {
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

  Router.prototype.start = function() {
    var _this = this;

    this._onPopState = function() {
      var loc = _this.__window__.location;
      _this._handleLocationChange(loc.pathname, loc.search);
    };

    this.__window__.addEventListener('popstate', this._onPopState);
    this._onPopState();
    return this;
  };

  Router.prototype.stop = function() {
    this.__window__.removeEventListener('popstate', this._onPopState);
    delete this._onPopState;
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

  Router.prototype._handleLocationChange = function(path, search) {
    var params, route, match, i, n;

    this.__location__ = {path: path, search: queryString.parse(search)};

    for (i = 0, n = this.__routes__.length; i < n; i++) {
      route = this.__routes__[i];

      if (match = route.regex.exec(path)) {
        params = util.assign({}, this.__location__.search, extractParams(route, path));
        if (this.__route__ !== route || !equals(this.__params__, params)) {
          this.__route__  = route;
          this.__params__ = params;
          route.callback(params);
        }
        return;
      }
    }

    if (this.__unknown__) { this.__unknown__(path); }
  };

  Router.prototype._flush = function() {
    var _this = this;

    if (!this._timer) {
      this._timer = setTimeout(function() {
        delete _this._timer;
        _this.flush();
      });
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
  };

  module.exports = Router;
}());
