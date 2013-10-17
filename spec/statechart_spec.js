(function() {

var slice = Array.prototype.slice,
    State = (typeof require === 'function' ? require('../statechart') : window.statechart).State;

jasmine.pp = function(o) {
  return Object.prototype.toString.call(o);
}

describe('State constructor function', function() {
  it('should set the `name` property', function() {
    var s = new State('a');
    expect(s.name).toBe('a');
  });

  it('should set the `substates` property to an empty object', function() {
    var s = new State('a');
    expect(s.substates).toEqual({});
  });

  it('should set `__isCurrent__` to `false`', function() {
    var s = new State('a');
    expect(s.__isCurrent__).toBe(false);
  });

  it('should default `isConcurrent` to `false`', function() {
    var s = new State('a');
    expect(s.isConcurrent).toBe(false);
  });

  it('should allow setting `isConcurrent` to `true`', function() {
    var s = new State('a', {isConcurrent: true});
    expect(s.isConcurrent).toBe(true);
  });

  it('should default `hasHistory` to `false`', function() {
    var s = new State('a');
    expect(s.hasHistory).toBe(false);
  });

  it('should allow setting `hasHistory` to `true`', function() {
    var s = new State('a', {hasHistory: true});
    expect(s.hasHistory).toBe(true);
  });

  it('should throw an exception if `isConcurrent` and `hasHistory` are set', function() {
    expect(function() {
      new State('a', {isConcurrent: true, hasHistory: true});
    }).toThrow('State: history states are not allowed on concurrent states');
  });

  it('should guard against not using the `new` operator', function() {
    expect(function() {
      State('a');
    }).not.toThrow();
  });
});

describe('State#addSubstate', function() {
  it('should add the given state to the substates hash', function() {
    var a = new State('a'),
        b = new State('b'),
        c = new State('c');

    a.addSubstate(b);
    expect(a.substates).toEqual({b: b});
    a.addSubstate(c);
    expect(a.substates).toEqual({b: b, c: c});
  });

  it('should set the superstate property of the given state', function() {
    var a = new State('a'),
        b = new State('b'),
        c = new State('c');

    a.addSubstate(b);
    expect(b.superstate).toBe(a);
    a.addSubstate(c);
    expect(c.superstate).toBe(a);
  });
});

describe('Z.State#each', function() {
  it("should yield each state in the receiver's hierarchy", function() {
    var a    = new State('a'),
        b    = new State('b'),
        c    = new State('c'),
        d    = new State('d'),
        e    = new State('e'),
        f    = new State('f'),
        g    = new State('g'),
        test = [];

    a.addSubstate(b);
    a.addSubstate(c);
    a.addSubstate(d);
    b.addSubstate(e);
    b.addSubstate(f);
    f.addSubstate(g);

    a.each(function(s) { test.push(s); });

    expect(test).toEqual([a, b, e, f, g, c, d]);
  });
});

describe('State#root', function() {
  it('should return the root of the tree', function() {
    var a = new State('a'),
        b = new State('b'),
        c = new State('c');
        d = new State('d');

    a.addSubstate(b);
    a.addSubstate(c);
    c.addSubstate(d);
    expect(a.root()).toBe(a);
    expect(b.root()).toBe(a);
    expect(c.root()).toBe(a);
    expect(d.root()).toBe(a);
  });
});

describe('State#path', function() {
  it('should return a string of "/" separated state names leading up to the root state', function() {
    var a = new State('a'),
        b = new State('b'),
        c = new State('c'),
        d = new State('d');

    expect(a.path()).toBe('/');
    expect(b.path()).toBe('/');
    expect(c.path()).toBe('/');
    expect(d.path()).toBe('/');

    b.addSubstate(c);
    b.addSubstate(d);

    expect(a.path()).toBe('/');
    expect(b.path()).toBe('/');
    expect(c.path()).toBe('/c');
    expect(d.path()).toBe('/d');

    a.addSubstate(b);

    expect(a.path()).toBe('/');
    expect(b.path()).toBe('/b');
    expect(c.path()).toBe('/b/c');
    expect(d.path()).toBe('/b/d');
  });
});

describe('State#current', function() {
  var root, s, s1, s2, s11, s12, s21, s22;

  beforeEach(function() {
    root = new State('root');
    s    = new State('s', {isConcurrent: true});
    s1   = new State('s1');
    s2   = new State('s2');
    s11  = new State('s11');
    s12  = new State('s12');
    s21  = new State('s21');
    s22  = new State('s22');

    root.addSubstate(s);
    s.addSubstate(s1);
    s.addSubstate(s2);
    s1.addSubstate(s11);
    s1.addSubstate(s12);
    s2.addSubstate(s21);
    s2.addSubstate(s22);

    root.goto();
  });

  it('should return an empty array when the state is not current', function() {
    expect(s12.__isCurrent__).toBe(false);
    expect(s12.current()).toEqual([]);
  });

  it('should return an array of all current leaf state paths', function() {
    root.goto('/s/s1/s11', '/s/s2/s22');
    expect(s.current()).toEqual(['/s/s1/s11', '/s/s2/s22']);
  });
});

describe('State#goto', function() {
  var enters, exits, root, a, b, c, d, e, f, g, h, i, j, k, l, m;

  beforeEach(function() {
    var states, ii, nn;
    enters = [];
    exits  = [];

    root = new State('root');
    a    = new State('a');
    b    = new State('b', {hasHistory: true});
    c    = new State('c');
    d    = new State('d');
    e    = new State('e');
    f    = new State('f');
    g    = new State('g', {isConcurrent: true});
    h    = new State('h');
    i    = new State('i');
    j    = new State('j');
    k    = new State('k');
    l    = new State('l');
    m    = new State('m');

    root.addSubstate(a);
    a.addSubstate(b);
    a.addSubstate(e);
    b.addSubstate(c);
    b.addSubstate(d);
    e.addSubstate(f);
    e.addSubstate(g);
    g.addSubstate(h);
    g.addSubstate(k);
    h.addSubstate(i);
    h.addSubstate(j);
    k.addSubstate(l);
    k.addSubstate(m);

    root.goto();

    states = [root, a, b, c, d, e, f, g, h, i, j, k, l, m];

    for (ii = 0, nn = states.length; ii < nn; ii++) {
      states[ii].enter = function() { enters.push(this); };
      states[ii].exit  = function() { exits.push(this); };
    }
  });

  describe('on the root state', function() {
    it('should transition to all default states when no paths are given', function() {
      expect(root.current()).toEqual(['/a/b/c']);
    });

    it('should transition all current states to the given states', function() {
      root.goto('/a/e/g/h/j', '/a/e/g/k/l');
      expect(root.current()).toEqual(['/a/e/g/h/j', '/a/e/g/k/l']);
      root.goto('/a/b/d');
      expect(root.current()).toEqual(['/a/b/d']);
    });
  });

  it('should throw an exception when the receiver state is not current', function() {
    expect(function() {
      d.goto('/a/e/f');
    }).toThrow("State#goto: state " + d.toString() + " is not current");
  });

  it('should throw an exception when multiple pivot states are found between the receiver and the given destination paths', function() {
    expect(function() {
      c.goto('/a/b/d', '/a/e/f');
    }).toThrow("State#goto: multiple pivot states found between state " + c.toString() + " and paths /a/b/d, /a/e/f");
  });

  it('should throw an exception if any given destination state is not reachable from the receiver', function() {
    root.goto('/a/e/g/h/i');
    expect(function() {
      i.goto('/a/e/g/k/l');
    }).toThrow("State#goto: one or more of the given paths are not reachable from state " + i.toString() + ": /a/e/g/k/l");
  });

  it('should not throw an exception when the pivot state is the start state and is concurrent', function() {
    root.goto('/a/e/g/h/i', '/a/e/g/k/l');
    expect(root.current()).toEqual(['/a/e/g/h/i', '/a/e/g/k/l']);
    expect(function() {
      g.goto('./h/j');
    }).not.toThrow();
    expect(root.current()).toEqual(['/a/e/g/h/j', '/a/e/g/k/l']);
  });

  it('should throw an exception when given an invalid path', function() {
    expect(function() {
      c.goto('/a/b/x');
    }).toThrow("State#resolve: could not resolve path /a/b/x from " + c.toString());
  });

  it('should throw an exception when given paths to multiple clustered states', function() {
    expect(function() {
      c.goto('/a/e/f', '/a/e/g');
    }).toThrow("State#enter: attempted to enter multiple substates of " + e.toString() + ": f, g", e);
  });

  it('should handle directory-like relative paths', function() {
    expect(root.current()).toEqual(['/a/b/c']);
    c.goto('../d');
    expect(root.current()).toEqual(['/a/b/d']);
    d.goto('../../e/f');
    expect(root.current()).toEqual(['/a/e/f']);
    f.goto('./../../b/./d/../c');
    expect(root.current()).toEqual(['/a/b/c']);
    c.goto('../../e/g/h/j/../i', '../../e/g/k');
    expect(root.current()).toEqual(['/a/e/g/h/i', '/a/e/g/k/l']);
  });

  it('should exit the states leading up to the pivot state and enter the states leading to the destination states', function() {
    c.goto('/a/e/f');
    expect(exits).toEqual([c, b]);
    expect(enters).toEqual([e, f]);

    exits  = [];
    enters = [];

    f.goto('/a/e/g/h/i', '/a/e/g/k/m');
    expect(exits).toEqual([f]);
    expect(enters).toEqual([g, h, i, k, m]);
  });

  it('should set `__isCurrent__` to `true` on all states entered and to `false` on all states exited', function() {
    expect(a.__isCurrent__).toBe(true);
    expect(b.__isCurrent__).toBe(true);
    expect(c.__isCurrent__).toBe(true);
    expect(e.__isCurrent__).toBe(false);
    expect(f.__isCurrent__).toBe(false);

    c.goto('/a/e/f');

    expect(a.__isCurrent__).toBe(true);
    expect(b.__isCurrent__).toBe(false);
    expect(c.__isCurrent__).toBe(false);
    expect(e.__isCurrent__).toBe(true);
    expect(f.__isCurrent__).toBe(true);
  });

  it('should enter the default substate when a path to a leaf state is not given', function() {
    c.goto('/a/e/g');
    expect(enters).toEqual([e, g, h, i, k, l]);
  });

  it('should exit all substates when a concurrent superstate is exited', function() {
    c.goto('/a/e/g/h/j', '/a/e/g/k/l');

    exits  = [];
    enters = [];

    g.goto('/a/b/d');

    expect(exits).toEqual([j, h, l, k, g, e]);
  });

  it('should enter all substates when a concurrent superstate is entered', function() {
    c.goto('/a/e/g')
    expect(enters).toEqual([e, g, h, i, k, l]);
  });

  it('should not affect the states in concurrent superstates', function() {
    c.goto('/a/e/g/h/j', '/a/e/g/k/m');

    exits  = [];
    enters = [];

    m.goto('/a/e/g/k/l');
    expect(exits).toEqual([m]);
    expect(enters).toEqual([l]);
  });

  it('should enter the most recently exited substate when the path is not specified and the state has history tracking', function() {
    expect(root.current()).toEqual(['/a/b/c']);
    c.goto('/a/b/d');
    expect(root.current()).toEqual(['/a/b/d']);
    d.goto('/a/e/f');
    expect(root.current()).toEqual(['/a/e/f']);
    f.goto('/a/b');
    expect(root.current()).toEqual(['/a/b/d']);
  });

  it("should pass along its `context` option to each entered state's `enter` method", function() {
    var ectx, fctx;

    e.enter = function(ctx) { ectx = ctx; };
    f.enter = function(ctx) { fctx = ctx; };

    c.goto('/a/e/f', {context: 'foo'});

    expect(ectx).toEqual('foo');
    expect(fctx).toEqual('foo');
  });

  it("should pass along its `context` option to each exited state's `exit` method", function() {
    var bctx, cctx;

    b.exit = function(ctx) { bctx = ctx; };
    c.exit = function(ctx) { cctx = ctx; };

    c.goto('/a/e/f', {context: 'bar'});

    expect(bctx).toEqual('bar');
    expect(cctx).toEqual('bar');
  });

  it('should invoke `enter` methods on states that are already current when the `force` option is given', function() {
    c.goto('/a/e/f');
    expect(enters).toEqual([e, f]);

    enters = [];
    root.goto('/a/e/f');
    expect(enters).toEqual([]);

    root.goto('/a/e/f', {force: true});
    expect(enters).toEqual([root, a, e, f]);
  });
});

describe('condition states', function() {
  var root, a, b, c, d;

  beforeEach(function() {
    root = new State('root');
    x    = new State('x');
    a    = new State('a');
    b    = new State('b');
    c    = new State('c', {isConcurrent: true});
    d    = new State('d');
    e    = new State('e');
    f    = new State('f');
    g    = new State('g');
    h    = new State('h');
    i    = new State('i');

    root.addSubstate(x);
    root.addSubstate(a);
    a.addSubstate(b);
    a.addSubstate(c);
    c.addSubstate(d);
    c.addSubstate(e);
    d.addSubstate(f);
    d.addSubstate(g);
    e.addSubstate(h);
    e.addSubstate(i);

    root.goto();
    expect(root.current()).toEqual(['/x']);
  });

  it('should throw an exception when a condition state is defined on a state with history', function() {
    var s = new State('x', {hasHistory: true});

    expect(function() {
      s.C(function() {});
    }).toThrow("State#C: a state may not have both condition and history states: " + s);
  });

  it('should throw an exception when a condition state is defined on concurrent state', function() {
    var s = new State('x', {isConcurrent: true});

    expect(function() {
      s.C(function() {});
    }).toThrow("State#C: a concurrent state may not have a condition state: " + s);
  });

  it('should cause goto to enter the the state returned by the condition function', function() {
    a.C(function() { return './b'; });
    root.goto('/a');
    expect(root.current()).toEqual(['/a/b']);
  });

  it('should cause goto to enter the states returned by the condition function', function() {
    a.C(function() { return ['./c/d/g', '/a/c/e/i']; });
    root.goto('/a');
    expect(root.current()).toEqual(['/a/c/d/g', '/a/c/e/i']);
  });

  it('should pass the context to the condition function', function() {
    var passedContext;

    a.C(function(ctx) { passedContext = ctx; return ['./c/d/g', '/a/c/e/i']; });
    root.goto('/a', {context: [1,2,3]});
    expect(passedContext).toEqual([1,2,3]);
  });

  it('should not be called when destination states are given', function() {
    var called = false;

    a.C(function() { called = true; return ['./c/d/g', './c/e/h'] });
    root.goto('/a/b');

    expect(called).toBe(false);
    expect(root.current()).toEqual(['/a/b']);
  });
});

describe('State.define', function() {
  it('should create a root state with the name "__root__"', function() {
    var s = State.define(function() {});
    expect(s.superstate).toBeNull();
    expect(s.name).toBe('__root__');
  });

  it('should pass the options to the `State` constructor', function() {
    var s = State.define({isConcurrent: true}, function() {});
    expect(s.isConcurrent).toBe(true);
  });

  it('should call the given function in the context of the newly created state', function() {
    var context, s = State.define(function() { context = this; });
    expect(context).toBe(s);
  });
});

describe('State#state', function() {
  var root;

  beforeEach(function() { root = State.define(); });

  it('should create a substate with the given name on the receiver', function() {
    var x = root.state('x');
    expect(x instanceof State).toBe(true);
    expect(root.substates['x']).toBe(x);
  });

  it('should pass the options to the `Z.State` constructor', function() {
    var x = root.state('x', {isConcurrent: true});
    expect(x.isConcurrent).toBe(true);
  });

  it('should call the given function in the context of the newly created state', function() {
    var context, x = root.state('x', function() { context = this; });
    expect(context).toBe(x);
  });

  describe('when given a `State` instance', function() {
    it('should add the given state as a substate', function() {
      var s = new State('s');

      root.state(s);

      expect(root.substates['s']).toBe(s);
      expect(s.superstate).toBe(root);
    });
  });
});

describe('State#send', function() {
  var calls, root, a, b, c, d, e, f;

  beforeEach(function() {
    calls = [];
    root  = new State('root', {isConcurrent: true});
    a     = new State('a');
    b     = new State('b');
    c     = new State('c');
    d     = new State('d');
    e     = new State('e');
    f     = new State('f');

    root.addSubstate(a);
    a.addSubstate(b);
    a.addSubstate(c);
    root.addSubstate(d);
    d.addSubstate(e);
    d.addSubstate(f);

    root.someAction = function() { calls.push(this); };
    a.someAction = function() { calls.push(this); };
    b.someAction = function() { calls.push(this); };
    c.someAction = function() { calls.push(this); };
    d.someAction = function() { calls.push(this); };
    e.someAction = function() { calls.push(this); };
    f.someAction = function() { calls.push(this); };

    root.goto();
    expect(root.current()).toEqual(['/a/b', '/d/e']);
  });

  it('should send the action to all current states', function() {
    root.send('someAction');
    expect(calls).toContain(root);
    expect(calls).toContain(a);
    expect(calls).toContain(b);
    expect(calls).toContain(d);
    expect(calls).toContain(e);
  });

  it('should pass additional arguments to the action handler', function() {
    var bArgs;

    b.someAction = function() { bArgs = slice.call(arguments); };

    root.send('someAction', 1, 2, 'foo');
    expect(bArgs).toEqual([1, 2, 'foo']);
  });

  it("should bubble the action up each current state's superstate chain", function() {
    root.send('someAction');
    expect(calls).toEqual([b, a, e, d, root]);
  });

  it('should stop bubbling when a handler on a clustered substate returns a truthy value', function() {
    var r = new State('root'),
        a = new State('a'),
        b = new State('b'),
        calls = [];

    r.addSubstate(a);
    a.addSubstate(b);
    r.goto();

    r.someAction = function() { calls.push(this); };
    a.someAction = function() { calls.push(this); return 1; };
    b.someAction = function() { calls.push(this); };

    r.send('someAction');
    expect(calls).toEqual([b, a]);

    calls = [];
    b.someAction = function() { calls.push(this); return true; };

    r.send('someAction');
    expect(calls).toEqual([b]);
  });

  it('should stop bubbling when all handlers on a concurrent state return a truthy value', function() {
    a.someAction = function() { calls.push(this); return 1; };

    root.send('someAction');
    expect(calls).toEqual([b, a, e, d, root]);

    root.goto();
    calls = [];

    d.someAction = function() { calls.push(this); return 1; };

    root.send('someAction');
    expect(calls).toEqual([b, a, e, d]);
  });

  it('should not perform transitions made in an action handler until all current states have received the action', function() {
    var eCurrent;

    b.someAction = function() { this.goto('/a/c'); };
    e.someAction = function() { eCurrent = root.current(); };

    root.send('someAction');

    expect(root.current()).toEqual(['/a/c', '/d/e']);
    expect(eCurrent).toEqual(['/a/b', '/d/e']);
  });
});

describe('State#reset', function() {
  it('should exit all current states', function() {
    var sc = State.define(function() {
      this.state('x', function() {
        this.state('y');
        this.state('z');
      });
    });

    sc.goto();
    expect(sc.current()).toEqual(['/x/y']);
    expect(sc.__isCurrent__).toBe(true);
    sc.reset();
    expect(sc.current()).toEqual([]);
    expect(sc.__isCurrent__).toBe(false);
  });
});

describe('State#isCurrent', function() {
  it('return true if the state at the given relative path is current and false otherwise', function() {
    var r = new State(''),
        x = new State('x'),
        y = new State('y'),
        z = new State('z');

    r.addSubstate(x);
    x.addSubstate(y);
    x.addSubstate(z);

    r.goto();

    expect(r.isCurrent('./x/y')).toBe(true);
    expect(r.isCurrent('./x/z')).toBe(false);
    expect(y.isCurrent('.')).toBe(true);
    expect(y.isCurrent('..')).toBe(true);
    expect(z.isCurrent('..')).toBe(true);
    expect(z.isCurrent('.')).toBe(false);
    expect(z.isCurrent('/x/y')).toBe(true);
    expect(z.isCurrent('/x/z')).toBe(false);
  });
});

}());

