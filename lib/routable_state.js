(function() {
  "use strict";

  var State = require('./state'), router = require('./router'), util = require('./util');

  function RoutableState() {
    State.apply(this, arguments);
  }

  util.assign(RoutableState, State);

  RoutableState.prototype = Object.create(State.prototype);
  RoutableState.prototype.constructor = RoutableState;

  RoutableState.prototype.route = function(pattern, state, opts) {
    var _state;

    if (arguments.length === 2 && typeof state !== 'string' && !(state instanceof State)) {
      opts = state;
      state = null;
    }

    _state = state || this;
    _state = typeof _state === 'string' ? this.resolve(_state) : _state;

    if (!_state) {
      throw new Error('RoutableState#route: invalid state: ' + String(state));
    }

    return _state._route(pattern, opts || {});
  };

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
        _this.root().goto(_this.path(), {force: true, context: params});
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

  RoutableState.prototype.start = function(opts) {
    router.start(opts);
    return this;
  };

  RoutableState.prototype.stop = function() {
    router.stop();
    return this;
  };

  RoutableState.prototype.params = function() {
    return router.params.apply(router, arguments);
  };

  RoutableState.prototype.unknown = function(f) {
    router.unknown(f);
    return this;
  };

  module.exports = RoutableState;
}());
