(function() {
  "use strict";

  // Polyfill for older browsers that don't support the history API that falls back to using the
  // URL hash.
  require('html5-history-api');

  var qs               = require('querystring'),
      equals           = require('shallow-equals'),
      util             = require('./util'),
      escapeRegex      = /[\-{}\[\]+?.,\\\^$|#\s]/g,
      namedParam       = /:(\w+)/g,
      splatParam       = /\*(\w+)/g,
      nameOrSplatParam = /[:*](\w+)/g;

  // Internal: Converts a route pattern into a regex that can be used to test for matches.
  //
  // pattern - A route pattern.
  //
  // Returns a `RegExp`.
  function buildRegex(pattern) {
    var re = pattern
      .replace(escapeRegex, '\\$&')
      .replace(namedParam, '([^/]*)')
      .replace(splatParam, '(.*?)');

    return new RegExp('^' + re + '$');
  }

  // Internal: Extracts the parameter names from a route pattern.
  //
  // pattern - A route pattern.
  //
  // Returns an array of param names.
  function extractNames(pattern) {
    var names = pattern.match(nameOrSplatParam) || [], i, n;

    for (i = 0, n = names.length; i < n; i++) {
      names[i] = names[i].slice(1);
    }

    return names;
  }

  // Internal: Extracts the route parameters from a matching URL path.
  //
  // route - A route object created by the `Route#define` method.
  // path  - The URL path that matches `route`.
  //
  // Returns an object mapping the param names to their values.
  function extractParams(route, path) {
    var vals = route.regex.exec(path).slice(1), params = {}, i, n;

    for (i = 0, n = route.names.length; i < n; i++) {
      params[route.names[i]] = vals[i];
    }

    return params;
  }

  // Internal: Generates a URL path based on the given route and params object.
  //
  // route  - A route object created by the `Router#define` method.
  // params - An object containing param values to interpolate into the route's pattern.
  //
  // Returns a string.
  function generatePath(route, params) {
    return route.pattern.replace(nameOrSplatParam, function(_, name) { return params[name]; });
  }

  // Internal: Generates a search params object. The returned object contains the key/value pairs
  // from the given `params` object with any named path params removed.
  //
  // route  - A route object created by the `Router#define` method.
  // params - An object containing both named route params and search params.
  //
  // Returns an object.
  function generateSearch(route, params) {
    var search = {}, k;

    for (k in params) {
      if (route.names.indexOf(k) !== -1) { continue; }
      search[k] = params[k];
    }

    return search;
  }

  // Internal: Returns a URL string made from the given path string and search object.
  //
  // path   - A string containing a URL path.
  // search - An object containing search params.
  //
  // Returns a string.
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
  // On modern browsers the `history` API (`pushState`, `replaceState`, and `popstate` event) is
  // used to provide nice looking URLs. A polyfill is included that falls back to using the URL
  // hash and `hashchange` event on older browsers (<= ie9).
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

  // Public: Returns a URL string for the given route object and params.
  //
  // route  - A route object.
  // params - An object containing route params.
  //
  // Returns a URL string.
  Router.prototype.urlFor = function(route, params) {
    var path = generatePath(route, params), search = generateSearch(route, params);
    return buildUrl(path, search);
  };

  // Public: Defines a new route. Routes consist of a pattern and a callback function. Whenever the
  // URL is changed to match the given pattern, the given callback is invoked. The route change can
  // be canceled by returning `false` from the callback function. When a route change is canceled,
  // the browser's URL is set back to its previous value.
  //
  // pattern  - A string representing the route's pattern.
  // callback - A function to invoke when a URL change is made that matches the pattern.
  //
  // Returns the new route object.
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

  // Public: Registers an unknown route handler.
  //
  // callback - A function to invoke when a URL change is made that doesn't match any defined
  //            routes.
  //
  // Returns the receiver.
  Router.prototype.unknown = function(callback) {
    this.__unknown__ = callback;
    return this;
  };

  // Public: Starts the route by causing it to start watching for URL changes.
  //
  // opts - Zero ore more of the following options:
  //        window - Specify the `window` object to use to access the brower's `location` and
  //        `history` APIs. This is only useful for testing.
  //
  // Returns the receiver.
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

  // Public: Stops the router by causing it to stop watching for URL changes.
  //
  // Returns the receiver.
  Router.prototype.stop = function() {
    if (this.__started__) {
      this.__window__.removeEventListener('popstate', this._onPopState);
      this.__window__.removeEventListener('click', this._onClick);
      delete this._onPopState;
      this.__started__ = false;
    }
    return this;
  };

  // Public: Resets the router by stopping it and clearing all of its defined routes. Likely only
  // useful for testing.
  //
  // Returns the receiver.
  Router.prototype.reset = function() {
    if (this._timer) { clearTimeout(this._timer); }
    this.stop();
    Router.call(this);
    return this;
  };

  // Public: Gets the current route object when given no arguments and sets it when passed a route
  // argument. Setting the route causes the router to update the browser's URL to match the given
  // route.
  //
  // route - A route object (optional).
  //
  // Returns the current route object.
  Router.prototype.route = function(route) {
    if (!arguments.length) { return this.__route__; }
    this.__route__ = route;
    this._flush();
    return route;
  };

  // Public: Gets or sets the current route params. Setting the route params causes the router to
  // update the browser's URL.
  //
  // params  - An object containing route params.
  // replace - A boolean indicating whether to replace or merge the given params with the existing
  //           params (default: `false`).
  //
  // Returns the current route params.
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

  // Internal: Attempts to find a matching route for the given path.
  //
  // path - A string containing a URL path.
  //
  // Returns the matching route object or `null` if one can't be found.
  Router.prototype._recognize = function(path) {
    var route, i, n;

    for (i = 0, n = this.__routes__.length; i < n; i++) {
      route = this.__routes__[i];
      if (route.regex.exec(path)) { return route; }
    }

    return null;
  };

  // Internal: The handler function invoked when the browser's URL changes. Attempts to find a
  // matching route and invokes the route's callback if one is found. If a matching route can't be
  // found then the "unknown route" handler is invoked if one has been defined via the
  // `Router#unknown` method.
  //
  // path   - The current URL path.
  // search - The current URL search params.
  //
  // Returns nothing.
  Router.prototype._handleLocationChange = function(path, search) {
    var curRoute = this.route(), curParams = this.params(), params, route;

    params = util.assign({}, search);

    if (route = this._recognize(path)) {
      params = util.assign(params, extractParams(route, path));
      if (this.__route__ !== route || !equals(this.__params__, params)) {
        this.__route__  = route;
        this.__params__ = params;

        if (route.callback(params) === false) {
          this.__route__  = curRoute;
          this.__params__ = curParams;
          this.flush();
        }
      }

      return;
    }

    if (this.__unknown__) { this.__unknown__(path); }
  };

  // Internal: The click handler function registered in `Router#start`. Click events need to be
  // handled on anchor elements in order to prevent the browser from reloading the page. When a
  // click on an anchor element is observed, an attempt is made to match the anchor's href against
  // the registered routes. If a match is found, the click event is canceled (so the browser doesn't
  // attempt to navigate to the new page) and the matching route's callback is invoked.
  //
  // e - The click event.
  //
  // Returns nothing.
  Router.prototype._handleClick = function(e) {
    var a = e.target, pathname, aHost, locHost;

    if (e.ctrlKey || e.metaKey || e.which === 2) { return; }

    while (a && String(a.nodeName).toLowerCase() !== 'a') { a = a.parentNode; }

    if (!a) { return; }

    pathname = a.pathname;
    aHost    = a.host.replace(/:\d+$/, '');
    locHost  = this.__location__.host.replace(/:\d+$/, '');

    if (!pathname.match(/^\//)) { pathname = '/' + pathname; }

    if (aHost === locHost && this._recognize(pathname)) {
      e.preventDefault();
      this._handleLocationChange(pathname, a.search);
    }
  };

  // Internal: Queues up a call to `Router#flush` via a `setTimeout`. `Router#flush` calls are
  // performed asynchronously so that multiple changes can be made the the params during a single
  // thread of execution before the brower's URL is updated.
  Router.prototype._flush = function() {
    var _this = this;

    if (!this._timer) {
      this._timer = setTimeout(function() { _this.flush(); });
    }

    return this;
  };

  // Internal: Flushes route and param changes to the browser's URL. Normally the
  // `window.history.pushState` method is used in order to create a new history entry. If only the
  // params have changed, the `window.history.replaceState` method is used instead so that a history
  // entry is not created.
  //
  // Returns the receiver.
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

  // Export a singleton `Router` instance.
  module.exports = new Router();
}());
