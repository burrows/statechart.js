(function() {
  "use strict";

  var State  = require('./state'),
      Router = require('./router'),
      util   = require('./util'),
      router = new Router();

  function RoutableState() {
    State.apply(this, arguments);
    this.__router__ = router;
  }

  util.assign(RoutableState, State);

  RoutableState.prototype = Object.create(State.prototype);
  RoutableState.prototype.constructor = RoutableState;

  RoutableState.prototype.route = function(pattern) {
    var _this = this;

    if (this.__route__) {
      throw new Error("RoutableState#route: a route as already been defined on " + this);
    }

    this.__route__ = router.define(pattern, function(params) {
      _this.root().goto(_this.path(), {force: true, context: params});
    });

    this.enter(function(ctx) {
      router.route(this.__route__);
      router.params(util.pick(ctx || {}, this.__route__.names));
    });

    this.exit(function(ctx) {
      var params = {}, names = this.__route__.names, i, n;

      for (i = 0, n = names.length; i < n; i++) {
        if (!(name in ctx)) {
          params[name] = undefined;
        }
      }

      router.params(params);
    });

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
