(function() {

var State = require('../lib').State, slice = Array.prototype.slice;

describe('State constructor function', function() {
  it('should set the `name` property', function() {
    var s = new State('a');
    expect(s.name).toBe('a');
  });

  it('should set the `substates` property to an empty object', function() {
    var s = new State('a');
    expect(s.substates).toEqual([]);
  });

  it('should set `__isCurrent__` to `false`', function() {
    var s = new State('a');
    expect(s.__isCurrent__).toBe(false);
  });

  it('should default `concurrent` to `false`', function() {
    var s = new State('a');
    expect(s.concurrent).toBe(false);
  });

  it('should allow setting `concurrent` to `true`', function() {
    var s = new State('a', {concurrent: true});
    expect(s.concurrent).toBe(true);
  });

  it('should default `history` to `false`', function() {
    var s = new State('a');
    expect(s.history).toBe(false);
  });

  it('should allow setting `history` to `true` via the `H` option', function() {
    var s = new State('a', {H: true});
    expect(s.history).toBe(true);
    expect(s.deep).toBe(false);
  });

  it('should allow setting `history` and `deep` to `true` via setting the `H` option to "*"', function() {
    var s = new State('a', {H: '*'});
    expect(s.history).toBe(true);
    expect(s.deep).toBe(true);
  });

  it('should throw an exception if `concurrent` and `H` are set', function() {
    expect(function() {
      new State('a', {concurrent: true, H: true});
    }).toThrow(new Error('State: history states are not allowed on concurrent states'));
  });

  it('should invoke the given function in the context of the new state when given as the second argument', function() {
    var context = null, f = function() { context = this; }, s;
    s = new State('x', f);
    expect(context).toBe(s);
  });

  it('should invoke the given function in the context of the new state when given as the third argument', function() {
    var context = null, f = function() { context = this; }, s;
    s = new State('x', {H: true}, f);
    expect(context).toBe(s);
  });
});

describe('State#addSubstate', function() {
  it('should add the given state to the substates array', function() {
    var a = new State('a'),
        b = new State('b'),
        c = new State('c');

    a.addSubstate(b);
    expect(a.substates).toContain(b);
    a.addSubstate(c);
    expect(a.substates).toContain(c);
  });

  it('should add the given state tot he subtateMap object', function() {
    var a = new State('a'),
        b = new State('b'),
        c = new State('c');

    a.addSubstate(b);
    expect(a.substateMap).toEqual({b: b});
    a.addSubstate(c);
    expect(a.substateMap).toEqual({b: b, c: c});
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

  it('invokes the didAttach method on the the substate when its connected to the root statechart', function() {
    var s = State.define(), a = new State('a'), b = new State('b');

    spyOn(a, 'didAttach')
    spyOn(b, 'didAttach')
    s.addSubstate(a);
    expect(a.didAttach).toHaveBeenCalled();
    a.addSubstate(b);
    expect(b.didAttach).toHaveBeenCalled();
  });

  it('invokes the didAttach method on the substate and all of its descendents when a tree of states is connected to the root statechart', function() {
    var s = State.define(), a = new State('a'), b = new State('b'), c = new State('c');

    spyOn(a, 'didAttach')
    spyOn(b, 'didAttach')
    spyOn(c, 'didAttach')

    a.addSubstate(b);
    a.addSubstate(c);

    expect(a.didAttach).not.toHaveBeenCalled();
    expect(b.didAttach).not.toHaveBeenCalled();
    expect(c.didAttach).not.toHaveBeenCalled();
    s.addSubstate(a);
    expect(a.didAttach).toHaveBeenCalled();
    expect(b.didAttach).toHaveBeenCalled();
    expect(c.didAttach).toHaveBeenCalled();
  });

  it('does not invoke the didAttach method on the substate when its not connected to the root statechart', function() {
    var a = new State('a'), b = new State('b');

    spyOn(b, 'didAttach')
    a.addSubstate(b);
    expect(b.didAttach).not.toHaveBeenCalled();
  });
});

describe('State#isAttached', function() {
  it('returns true when the state is connected to a root statechart', function() {
    var s = State.define(), a = new State('a'), b = new State('b');

    s.addSubstate(a);
    a.addSubstate(b);

    expect(s.isAttached()).toBe(true);
    expect(a.isAttached()).toBe(true);
    expect(b.isAttached()).toBe(true);
  });

  it('returns false when the state is not connected to a root statechart', function() {
    var a = new State('a'), b = new State('b');

    a.addSubstate(b);

    expect(a.isAttached()).toBe(false);
    expect(b.isAttached()).toBe(false);
  });
});

describe('State#each', function() {
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
    s    = new State('s', {concurrent: true});
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
    b    = new State('b', {H: true});
    c    = new State('c');
    d    = new State('d');
    e    = new State('e', {H: '*'});
    f    = new State('f');
    g    = new State('g', {concurrent: true});
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
      states[ii].enter(function() { enters.push(this); });
      states[ii].exit(function() { exits.push(this); });
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
    }).toThrow(new Error("State#goto: state " + d.toString() + " is not current"));
  });

  it('should throw an exception when multiple pivot states are found between the receiver and the given destination paths', function() {
    expect(function() {
      c.goto('/a/b/d', '/a/e/f');
    }).toThrow(new Error("State#goto: multiple pivot states found between state " + c.toString() + " and paths /a/b/d, /a/e/f"));
  });

  it('should throw an exception if any given destination state is not reachable from the receiver', function() {
    root.goto('/a/e/g/h/i');
    expect(function() {
      i.goto('/a/e/g/k/l');
    }).toThrow(new Error("State#goto: one or more of the given paths are not reachable from state " + i.toString() + ": /a/e/g/k/l"));
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
    }).toThrow(new Error("State#goto: could not resolve path /a/b/x from " + c.toString()));
  });

  it('should throw an exception when given paths to multiple clustered states', function() {
    expect(function() {
      c.goto('/a/e/f', '/a/e/g');
    }).toThrow(new Error("State#enterClustered: attempted to enter multiple substates of " + e + ": " + [f, g].join(', ')));
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

  it('should enter the most recently exited leaf states when the path is not specified and the state has deep history tracking', function() {
    root.goto('/a/e/g/h/j', '/a/e/g/k/m');
    expect(root.current()).toEqual(['/a/e/g/h/j', '/a/e/g/k/m']);
    root.goto('/a/b/c');
    expect(root.current()).toEqual(['/a/b/c']);
    root.goto('/a/e');
    expect(root.current()).toEqual(['/a/e/g/h/j', '/a/e/g/k/m']);
  });

  it("should pass along its `context` option to each entered state's `enter` method", function() {
    var ectx, fctx;

    e.enter(function(ctx) { ectx = ctx; });
    f.enter(function(ctx) { fctx = ctx; });

    c.goto('/a/e/f', {context: 'foo'});

    expect(ectx).toEqual('foo');
    expect(fctx).toEqual('foo');
  });

  it('should invoke all enter handlers registered on the state', function() {
    var calls = [];

    e.enter(function() { calls.push('enter1'); });
    e.enter(function() { calls.push('enter2'); });
    e.enter(function() { calls.push('enter3'); });

    c.goto('/a/e/f', {context: 'foo'});
    expect(calls).toEqual(['enter1', 'enter2', 'enter3']);
  });

  it("should pass along its `context` option to each exited state's `exit` method", function() {
    var bctx, cctx;

    b.exit(function(ctx) { bctx = ctx; });
    c.exit(function(ctx) { cctx = ctx; });

    c.goto('/a/e/f', {context: 'bar'});

    expect(bctx).toEqual('bar');
    expect(cctx).toEqual('bar');
  });

  it('should invoke all exit handlers registered on the state', function() {
    var calls = [];

    b.exit(function() { calls.push('exit1'); });
    b.exit(function() { calls.push('exit2'); });

    c.goto('/a/e/f', {context: 'foo'});
    expect(calls).toEqual(['exit1', 'exit2']);
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

describe('canExit', function() {
  var root, a, b;

  beforeEach(function() {
    root = new State('root');
    a = new State('a');
    b = new State('b');

    root.addSubstate(a);
    root.addSubstate(b);
    root.goto();
  });

  it('blocks transition if it returns false', function(){
    a.canExit = function(){
      return false;
    };

    root.goto('/b');
    expect(root.current()).toEqual(['/a']);
  });

  it('does not block transition if it returns anything', function(){
    root.canExit = function(){ return undefined; };

    expect(root.goto('/b')).toBe(true);
    expect(root.current()).toEqual(['/b']);
  });

  it('causes goto to return false', function(){
    a.canExit = function(){
      return false;
    };

    expect(root.goto('/b')).toBe(false);
  });

  it('gets called with the destination states, context and other opts', function(){
    var canExitArgs;
    a.canExit = function(){
      canExitArgs = arguments;
    };

    root.goto('/b', { context: 'the context', force: true });
    expect(canExitArgs[0]).toEqual([root.resolve('/b')]);
    expect(canExitArgs[1]).toEqual({context: 'the context', force: true});
  });
});

describe('condition states', function() {
  var root, a, b, c, d;

  beforeEach(function() {
    root = new State('root');
    x    = new State('x');
    y    = new State('y');
    z    = new State('z', {H: true});
    z1   = new State('z1');
    z2   = new State('z2');
    a    = new State('a');
    b    = new State('b');
    c    = new State('c', {concurrent: true});
    d    = new State('d');
    e    = new State('e');
    f    = new State('f');
    g    = new State('g');
    h    = new State('h');
    i    = new State('i');

    root.addSubstate(x);
    root.addSubstate(a);
    root.addSubstate(z);
    a.addSubstate(b);
    a.addSubstate(c);
    a.addSubstate(y);
    c.addSubstate(d);
    c.addSubstate(e);
    d.addSubstate(f);
    d.addSubstate(g);
    e.addSubstate(h);
    e.addSubstate(i);
    z.addSubstate(z1);
    z.addSubstate(z2);

    root.goto();
    expect(root.current()).toEqual(['/x']);
  });

  it('should throw an exception when a condition state is defined on concurrent state', function() {
    var s = new State('x', {concurrent: true});

    expect(function() {
      s.C(function() {});
    }).toThrow(new Error("State#C: a concurrent state may not have a condition state: " + s));
  });

  it("should throw an exception when the states returned by the condition function don't exist", function() {
    a.C(function() { return './blah'; });

    expect(function() {
      root.goto('/a');
    }).toThrow(new Error("State#enterClustered: could not resolve path './blah' returned by condition function from " + a));
  });

  it('should cause goto to enter the the state returned by the condition function', function() {
    a.C(function() { return './y'; });
    root.goto('/a');
    expect(root.current()).toEqual(['/a/y']);
  });

  it('should cause goto to enter the first substate when null is returned by the condition function', function() {
    a.C(function() { return null; });
    root.goto('/a');
    expect(root.current()).toEqual(['/a/b']);
  });

  it('should cause goto to use the history state when its defined and the condition function returns null', function() {
    z.C(function() { return null; });
    root.goto('/z/z2');
    expect(root.current()).toEqual(['/z/z2']);
    root.goto('/x');
    expect(root.current()).toEqual(['/x']);
    root.goto('/z');
    expect(root.current()).toEqual(['/z/z2']);
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
    var s = State.define({concurrent: true}, function() {});
    expect(s.concurrent).toBe(true);
  });

  it('should call the given function in the context of the newly created state', function() {
    var context, s = State.define(function() { context = this; });
    expect(context).toBe(s);
  });
});

describe('State#isRoot', function() {
  it('returns true for the node returned by State.define', function() {
    expect(State.define().isRoot()).toBe(true);
  });

  it('returns false for all other states', function() {
    var r = State.define(),
        a = new State('b'),
        b = new State('b');

    r.addSubstate(a);
    a.addSubstate(b);

    expect((new State).isRoot()).toBe(false);
    expect(a.isRoot()).toBe(false);
    expect(b.isRoot()).toBe(false);
  });
});

describe('State#state', function() {
  var root;

  beforeEach(function() { root = State.define(); });

  it('should create a substate with the given name on the receiver', function() {
    var x = root.state('x');
    expect(x instanceof State).toBe(true);
    expect(root.substates).toContain(x);
    expect(root.substateMap['x']).toBe(x);
  });

  it('should pass the options to the `State` constructor', function() {
    var x = root.state('x', {concurrent: true});
    expect(x.concurrent).toBe(true);
  });

  it('should call the given function in the context of the newly created state', function() {
    var context, x = root.state('x', function() { context = this; });
    expect(context).toBe(x);
  });

  describe('when given a `State` instance', function() {
    it('should add the given state as a substate', function() {
      var s = new State('s');

      root.state(s);

      expect(root.substates).toContain(s);
      expect(root.substateMap['s']).toBe(s);
      expect(s.superstate).toBe(root);
    });
  });
});

describe('State#send', function() {
  var calls, root, a, b, c, d, e, f;

  beforeEach(function() {
    calls = [];
    root  = new State('root', {concurrent: true});
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

    root.event('someEvent', function() { calls.push(this); });
    a.event('someEvent', function() { calls.push(this); });
    b.event('someEvent', function() { calls.push(this); });
    c.event('someEvent', function() { calls.push(this); });
    d.event('someEvent', function() { calls.push(this); });
    e.event('someEvent', function() { calls.push(this); });
    f.event('someEvent', function() { calls.push(this); });

    root.goto();
    expect(root.current()).toEqual(['/a/b', '/d/e']);
  });

  it('should send the event to all current states', function() {
    root.send('someEvent');
    expect(calls[0]).toBe(b);
    expect(calls[1]).toBe(a);
    expect(calls[2]).toBe(e);
    expect(calls[3]).toBe(d);
    expect(calls[4]).toBe(root);
  });

  it('should pass additional arguments to the event handler', function() {
    var bArgs;

    b.event('someEvent', function() { bArgs = slice.call(arguments); });

    root.send('someEvent', 1, 2, 'foo');
    expect(bArgs).toEqual([1, 2, 'foo']);
  });

  it("should bubble the event up each current state's superstate chain", function() {
    root.send('someEvent');
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

    r.event('someEvent', function() { calls.push(this); });
    a.event('someEvent', function() { calls.push(this); return 1; });
    b.event('someEvent', function() { calls.push(this); });

    r.send('someEvent');
    expect(calls).toEqual([b, a]);

    calls = [];
    b.event('someEvent', function() { calls.push(this); return true; });

    r.send('someEvent');
    expect(calls).toEqual([b]);
  });

  it('should stop bubbling when all handlers on a concurrent state return a truthy value', function() {
    a.event('someEvent', function() { calls.push(this); return 1; });

    root.send('someEvent');
    expect(calls).toEqual([b, a, e, d, root]);

    root.goto();
    calls = [];

    d.event('someEvent', function() { calls.push(this); return 1; });

    root.send('someEvent');
    expect(calls).toEqual([b, a, e, d]);
  });

  it('should not perform transitions made in an event handler until all current states have received the event', function() {
    var eCurrent;

    b.event('someEvent', function() { this.goto('/a/c'); });
    e.event('someEvent', function() { eCurrent = root.current(); });

    root.send('someEvent');

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

  it('should return false if the state does not exist', function() {
    expect((new State('')).isCurrent('/x/y/z')).toBe(false);
  });
});

describe('State#resolve', function() {
  var root, s, s1, s2, s11, s12, s21, s22;

  beforeEach(function() {
    root = new State('root');
    s    = new State('s');
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
  });

  it('should return the state object at the given full path from the root state', function() {
    expect(root.resolve('/s')).toBe(s);
    expect(root.resolve('/s/s1')).toBe(s1);
    expect(root.resolve('/s/s2/s22')).toBe(s22);
  });

  it('should return the state object at the given relative path from the root state', function() {
    expect(root.resolve('s')).toBe(s);
    expect(root.resolve('s/s1')).toBe(s1);
    expect(root.resolve('s/s1/../s2')).toBe(s2);
  });

  it('should return the state object at the given full path from a child state', function() {
    expect(s12.resolve('/s')).toBe(s);
    expect(s22.resolve('/s/s1')).toBe(s1);
    expect(s21.resolve('/s/s2/s22')).toBe(s22);
  });

  it('should resolve the state object at the given relative path from a child state', function() {
    expect(s1.resolve('s12')).toBe(s12);
    expect(s1.resolve('s11')).toBe(s11);
    expect(s22.resolve('../..')).toBe(s);
    expect(s22.resolve('../../..')).toBe(root);
  });

  it('should return null when given an invalid path', function() {
    expect(root.resolve('/a/b/x')).toBeNull();
  });

  it('should return null when given given null or undefined', function() {
    expect(root.resolve(null)).toBeNull();
    expect(root.resolve(undefined)).toBeNull();
  });
});

describe('Subclass of State', function() {
  var CustomState = (function(Class){
    var Subclass, constructor, prop;

    Subclass = function(){ Class.apply(this, arguments); }
    Subclass.prototype = Object.create(Class.prototype); // inherit
    Subclass.prototype.constructor = Subclass;
    for (var prop in Class) {
      if (Class.hasOwnProperty(prop)) {
        Subclass[prop] = Class[prop];
      }
    }
    return Subclass;
  }(State));

  describe('CustomState.define', function() {
    it('creates instances of CustomState', function() {
      var state = CustomState.define();
      expect(state instanceof CustomState).toBe(true);
    });
  });

  describe('CustomState#state', function() {
    it('creates instances of CustomState', function() {
      var root = CustomState.define(),
          x = root.state('x');
      expect(x instanceof CustomState).toBe(true);
    });
  });

});

}());

