var State = require('./statechart').State;

var sc = State.define(function() {
  this.state('a', function() {
    this.state('b', function() {
      this.foo = function() {
        this.goto('../c');
      };
    });
    this.state('c', function() {
      this.bar = function() {
        this.goto('../b');
      };
    });
  });
});

sc.goto();
console.log(sc.current());   // => ['/a/b']
sc.send('foo');
console.log(sc.current());   // => ['/a/c']
sc.send('bar');
console.log(sc.current());   // => ['/a/b']
