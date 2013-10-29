var State = require('./statechart').State;

var s2 = new State('s2');
s2.state('s21');
s2.state('s22');

var sc = State.define(function() {
  this.state('s', function() {
    this.state('s1', function() {
      this.state('s11');
      this.state('s12');
    });

    this.state(s2);
  });
});

sc.each(function(s) {
  console.log(s.toString());
});

