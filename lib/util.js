(function() {
  "use strict";

  var slice = Array.prototype.slice;

  exports.assign = function assign(target) {
    var sources = slice.call(arguments).slice(1), i, n, k;

    for (i = 0, n = sources.length; i < n; i++) {
      for (k in sources[i]) {
        if (sources[i][k] === void 0 || sources[i][k] === null || sources[i][k] === false) {
          delete target[k];
        }
        else {
          target[k] = sources[i][k];
        }
      }
    }

    return target;
  };

  exports.pick = function pick(o, keys) {
    return keys.reduce(function(acc, k) {
      acc[k] = o[k];
      return acc;
    }, {});
  };

}());
