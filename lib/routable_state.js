(function() {
  "use strict";

  var State = require('./state'), router = require('./router'), util = require('./util');

  // Public: Provides a `State` subclass that integrates seemlessly with the `Router` singleton.
  // `RoutableState` instances have methods for defining routes that map to that particular state.
  //
  // Examples
  //
  // var statechart = RoutableState.define(function() {
  //   this.state('foosIndex', function() {
  //     this.route('/foos');
  //   });
  //
  //   this.state('foosShow', function() {
  //     this.route('/foos/:id');
  //   });
  // });
  function RoutableState() {
    State.apply(this, arguments);
  }

  util.assign(RoutableState, State);

  RoutableState.prototype = Object.create(State.prototype);
  RoutableState.prototype.constructor = RoutableState;

  // Public: Define a route for the current state. When this state is entered the route will be set
  // as the current route on the `router` singleton. Also, when the user changes the URL to match
  // the route, a state transition is automatically triggered to this state.
  //
  // Routes can be defined on the state that they map to directly or at some parent state. Defining
  // multiple routes at a parent state gives you the ability to control the order in which the
  // states are defined and therefore searched for matches.
  //
  // pattern - A route pattern (see the docs for `Router#define`).
  // state   - A string containing a state path.
  // opts    - One or more of the following options:
  //           default - Makes this route the default route.
  //
  // Returns the receiver.
  // Throws `Error` if a route has already been defined on the state.
  RoutableState.prototype.route = function(pattern, state, opts) {
    var _state;

    if (arguments.length === 2 && typeof state !== 'string' && !(state instanceof State)) {
      opts = state;
      state = null;
    }

    _state = state || '.';
    _state = typeof _state === 'string' ? this.resolve(_state) : _state;

    if (!_state) {
      throw new Error('RoutableState#route: invalid state: ' + String(state));
    }

    return _state._route(pattern, opts || {});
  };

  // Internal: Defines a route on the receiver state.
  //
  // pattern - A route pattern (see the docs for `Router#define`).
  // opts    - One or more of the following options:
  //           default - Makes this route the default route.
  //
  // Returns the receiver.
  // Throws `Error` if a route on the state has already been defined.
  RoutableState.prototype._route = function(pattern, opts) {
    var _this = this;

    if (this.__route__) {
      throw new Error("RoutableState#route: a route has already been defined on " + this);
    }

    this.__route__ = router.define(pattern, function(params) {
      _this.root().goto(_this.path(), {force: true, context: params});
    });

    if (opts.default) {
      router.define('/', function(params) {
        router.replace = true;
        return _this.root().goto(_this.path(), {force: true, context: params});
      });
    }

    this.enter(function(ctx) {
      router.route(this.__route__);
      router.params(util.pick(ctx || {}, this.__route__.names));
    });

    this.exit(function(ctx) {
      var params = {}, names = this.__route__.names, i, n;

      ctx = ctx || {};

      for (i = 0, n = names.length; i < n; i++) {
        if (!(names[i] in ctx)) {
          params[names[i]] = undefined;
        }
      }

      router.params(params);
    });

    return this;
  };

  // Public: Starts the router and triggers a transition to the state that matches the browser's
  // current URL. This should be called when the application is started.
  //
  // Returns the receiver.
  RoutableState.prototype.start = function(opts) {
    router.start(opts);
    return this;
  };

  // Public: Stops the router. This is likely only useful during tests.
  //
  // Returns the receiver.
  RoutableState.prototype.stop = function() {
    router.stop();
    return this;
  };

  // Public: Get or set the router's current params.
  RoutableState.prototype.params = function() {
    return router.params.apply(router, arguments);
  };

  // Public: Register an unknown route handler.
  RoutableState.prototype.unknown = function(f) {
    router.unknown(f);
    return this;
  };

  // Public: Returns a URL string for the state indicated by the given path and params.
  //
  // path   - A string containing the a state path relative to the receiver.
  // params - A hash containing query string params (default: `{}`).
  //
  // Returns a URL string for the given state.
  // Throws `Error` if the path cannot be resolved.
  // Throws `Error` if the resolved state does not have a route defined.
  RoutableState.prototype.urlFor = function(path, params) {
    var state = this.resolve(path);

    if (!state) {
      throw new Error('RoutableState#urlFor: could not resolve path `' + path + '`');
    }

    if (!state.__route__) {
      throw new Error('RoutableState#urlFor: state `' + path + '` does not have a route defined');
    }

    return router.urlFor(state.__route__, params || {});
  };

  module.exports = RoutableState;
}());
