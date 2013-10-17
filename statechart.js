// FIXME: maintain substate order
// The `Z.State` type provides an implementation of a
// [Harel Statechart](http://en.wikipedia.org/wiki/State_diagram#Harel_statechart).
//
// Statecharts are an improvement over state machines because they elegantly
// solve the state explosion problem that is common with state machines. They do
// this by adding two additional features to state machines - state clustering
// and concurrent states. State clustering provides an abstraction over lower
// level states where actions can be handled and transitions made in one place
// instead of many. Concurrent states essentially allow multiple statecharts to
// operate independently. The presence of concurrent states means that the
// current state of a statechart is actually a vector of states whose length is
// not fixed.
//
// More information on statecharts is available here:
//
// * http://www.wisdom.weizmann.ac.il/~harel/papers/Statecharts.pdf
// * http://www.wisdom.weizmann.ac.il/~harel/papers/Statecharts.History.pdf
// * http://www.amazon.com/Constructing-User-Interface-Statecharts-Horrocks/dp/0201342782
//
// Examples
//
//   var door = Z.State.define(function() {
//     this.state('closed', function() {
//       this.state('locked', function() {
//         this.def('unlockDoor', function() { this.goto('../unlocked'); });
//       });
//
//       this.state('unlocked', function() {
//         this.def('lockDoor', function() { this.goto('../locked'); });
//         this.def('openDoor', function() { this.goto('/opened'); });
//       });
//
//       this.def('knock', function() { console.log('*knock knock*'); });
//     });
//
//     this.state('opened', function() {
//       this.def('closeDoor', function() { this.goto('/closed/unlocked'); });
//     });
//   });
//
//   door.goto();
//   door.current();          // => [ '/closed/locked' ]
//   door.send('knock');      // *knock knock*
//   door.current();          // => [ '/closed/locked' ]
//   door.send('unlockDoor');
//   door.current();          // => [ '/closed/unlocked' ]
//   door.send('knock');      // *knock knock*
//   door.send('openDoor');
//   door.current();          // => [ '/opened' ]
//   door.send('closeDoor');
//   door.current();          // => [ '/closed/unlocked' ]
//   door.send('lockDoor');
//   door.current();          // => [ '/closed/locked' ]
(function(exports) {
  "use strict";
  var slice = Array.prototype.slice;

  function isArray(o) {
    return Object.prototype.toString.call(o) === '[object Array]';
  }

  function flatten(array) {
    var result = [], i, n;

    for (i = 0, n = array.length; i < n; i++) {
      if (isArray(array[i])) {
        result = result.concat(flatten(array[i]));
      }
      else {
        result.push(array[i]);
      }
    }

    return result;
  }

  // Internal: Returns an array of substates on the receiver state.
  function substates() {
    var a = [], n;
    for (n in this.substates) { a.push(this.substates[n]); }
    return a;
  }

  // Internal: Calculates and caches the path from the root state to the
  // receiver state. Subsequent calls will return the cached path array.
  //
  // Returns an array of `State` objects.
  function _path() {
    return this.__cache__._path = this.__cache__._path ||
      (this.superstate ? _path.call(this.superstate).concat(this) : [this]);
  }

  // Internal: Returns an array of all current leaf states.
  function _current() {
    var states = substates.call(this), a = [], i, n;

    if (!this.__isCurrent__) { return []; }
    if (states.length === 0) { return [this]; }

    for (i = 0, n = states.length; i < n; i++) {
      if (states[i].__isCurrent__) { a = a.concat(_current.call(states[i])); }
    }

    return a;
  }

  // Internal: Resolves a string path into an actual `Z.State` object. Paths not
  // starting with a '/' are resolved relative to the receiver state, paths that
  // do start with a '/' are resolved relative to the root state.
  //
  // path      - A string containing the path to resolve or an array of path
  //             segments.
  // origPath  - A string containing the original path that we're attempting to
  //             resolve. Multiple recursive calls are made to this method so we
  //             need to pass along the original string path for error messages
  //             in the case where the path cannot be resolved.
  // origState - The state where path resolution was originally attempted from.
  //
  // Returns the `Z.State` object the path represents.
  // Throws `Error` if the path cannot be resolved.
  function resolve(path, origPath, origState) {
    var head, next;

    origPath  = origPath || path;
    origState = origState || this;
    path      = typeof path === 'string' ? path.split('/') : path;
    head      = path.shift();

    switch (head) {
    case '':
      next = this.root();
      break;
    case '.':
      next = this;
      break;
    case '..':
      next = this.superstate;
      break;
    default:
      next = this.substates[head];
    }

    if (!next) {
      throw new Error('State#resolve: could not resolve path ' + origPath + ' from ' + origState);
    }

    return path.length === 0 ? next :
      resolve.call(next, path, origPath, origState);
  }

  // Internal: Finds the pivot state between the receiver and the given state.
  // The pivot state is the first common ancestor between the two states.
  //
  // Returns a `Z.State` object.
  // Throws `Error` if the two states do not belong to the same statechart.
  function findPivot(other) {
    var p1 = _path.call(this), p2 = _path.call(other), i, len, p;

    for (i = 0, len = p1.length < p2.length ? p1.length : p2.length; i < len; i++) {
      if (p1[i] === p2[i]) { p = p1[i]; } else { break; }
    }

    if (!p) {
      throw new Error('State#findPivot: states ' + this + ' and ' + other + ' do not belong to the same statechart');
    }

    return p;
  }

  // Internal: Queues up a transition for later processing. Transitions are
  // queued instead of happening immediately because we need to allow all
  // current states to receive an action before any transitions actually occur.
  //
  // pivot  - The pivot state between the start state and destination states.
  // states - An array of destination states.
  // opts   - The options object passed to the `goto` method.
  //
  // Returns nothing.
  function queueTransition(pivot, states, opts) {
    (this.__transitions__ = this.__transitions__ || []).push(
      {pivot: pivot, states: states, opts: opts});
  }

  // Internal: Performs all queued transitions. This is the method that actually
  // takes the statechart from one set of current states to another.
  function transition() {
    var ts = this.__transitions__, i, len;

    if (!ts || ts.length === 0) { return; }

    for (i = 0, len = ts.length; i < len; i++) {
      enter.call(ts[i].pivot, ts[i].states, ts[i].opts);
    }

    this.__transitions__ = [];
  }

  // Internal: Enters a clustered state. Entering a clustered state involves
  // exiting the current substate (if one exists and is not a destination
  // state), invoking the `enter` method on the receiver state, and recursively
  // entering the new destination substate. The new destination substate is
  // determined as follows:
  //
  // 1. the substate indicated in the `states` argument if its not empty
  // 2. the result of invoking the condition function defined with the `C`
  //    method if it exists
  // 3. the most recently exited substate if the state was defined with the
  //    `hasHistory` option and has been previously entered
  // 4. the first substate
  //
  // states - An array of destination states (may be empty to indicate that
  //          a condition, history, or default substate should be entered).
  // opts   - The options passed to `goto`.
  //
  // Returns the receiver.
  // Throws an `Error` if the given destination states include multiple
  //   substates.
  function enterClustered(states, opts) {
    var root    = this.root(),
        selflen = _path.call(this).length,
        sstates = substates.call(this),
        nexts   = [],
        paths, cur, next, i, n;

    for (i = 0, n = sstates.length; i < n; i++) {
      if (sstates[i].__isCurrent__) { cur = sstates[i]; break; }
    }

    for (i = 0, n = states.length; i < n; i++) {
      nexts.push(_path.call(states[i])[selflen]);
    }

    // FIXME: write a uniq helper
    //if (nexts.uniq().size() > 1) {
    //  throw new Error(Z.fmt("Z.State.enterClustered: attempted to enter multiple substates of %@: %@", this, nexts.pluck('name').join(', ')));
    //}

    if (!(next = nexts[0]) && sstates.length > 0) {
      if (this.__condition__) {
        paths  = flatten([this.__condition__.call(this, opts.context)]);
        states = [];
        for (i = 0, n = paths.length; i < n; i++) {
          states.push(resolve.call(this, paths[i]));
        }
        return enterClustered.call(this, states, opts);
      }
      else if (this.hasHistory) {
        next = this.__previous__ || sstates[0];
      }
      else {
        next = sstates[0];
      }
    }

    if (cur && cur !== next) { exit.call(cur, opts); }

    if (!this.__isCurrent__ || opts.force) {
      if (root.trace && this !== root) {
        console.log("State: entering state '" + this.path().join(', ') + "'" + (this.__isCurrent__ ? ' (forced)' : ''));
      }

      this.__isCurrent__ = true;
      if (typeof this.enter === 'function') { this.enter(opts.context); }
    }

    if (next) { enter.call(next, states, opts); }

    return this;
  }

  // Internal: Enters a concurrent state. Entering a concurrent state simply
  // involves calling the `enter` method on the receiver and recursively
  // entering each substate.
  //
  // states - An array of destination states.
  // opts   - The options passed to `goto`.
  //
  // Returns the receiver.
  function enterConcurrent(states, opts) {
    var root = this.root(), sstate, dstates, name, i, n;

    if (!this.__isCurrent__ || opts.force) {
      if (root.trace && this !== root) {
        console.log("State: entering state '" + this.path().join(', ') + "'" + (this.__isCurrent__ ? ' (forced)' : ''));
      }

      this.__isCurrent__ = true;
      if (typeof this.enter === 'function') { this.enter(opts.context); }
    }

    for (name in this.substates) {
      if (!this.substates.hasOwnProperty(name)) { continue; }
      sstate  = this.substates[name];
      dstates = [];
      for (i = 0, n = states.length; i < n; i++) {
        if (findPivot.call(sstate, states[i]) === sstate) {
          dstates.push(states[i]);
        }
      }
      enter.call(sstate, dstates, opts);
    }

    return this;
  }

  // Internal: Enters the receiver state. The actual entering logic is in the
  // `enterClustered` and `enterConcurrent` methods.
  //
  // states - An of destination states.
  // opts   - The options passed to `goto`.
  //
  // Returns the receiver.
  function enter(states, opts) {
    return this.isConcurrent ?
      enterConcurrent.call(this, states, opts) :
      enterClustered.call(this, states, opts);
  }

  // Internal: Exits a clustered state. Exiting happens bottom to top, so we
  // recursively exit the current substate and then invoke the `exit` method on
  // each state as the stack unwinds.
  //
  // opts - The options passed to `goto`.
  //
  // Returns the receiver.
  function exitClustered(opts) {
    var root = this.root(), sstates = substates.call(this), cur, i, n;

    for (i = 0, n = sstates.length; i < n; i++) {
      if (sstates[i].__isCurrent__) { cur = sstates[i]; break; }
    }

    if (this.hasHistory) { this.__previous__ = cur; }

    if (cur) { exit.call(cur, opts); }

    if (typeof this.exit === 'function') { this.exit(opts.context); }
    this.__isCurrent__ = false;

    if (root.trace && this !== root) {
      console.log("State: exiting state '" + this.path().join(', ') + "'");
    }

    return this;
  }

  // Internal: Exits a concurrent state. Similiar to `exitConcurrent` we
  // recursively exit each substate and invoke the `exit` method as the stack
  // unwinds.
  //
  // opts - The options passed to `goto`.
  //
  // Returnst he receiver.
  function exitConcurrent(opts) {
    var root = this.root(), name;

    for (name in this.substates) {
      if (!this.substates.hasOwnProperty(name)) { continue; }
      exit.call(this.substates[name], opts);
    }

    if (typeof this.exit === 'function') { this.exit(opts.context); }
    this.__isCurrent__ = false;

    if (root.trace && this !== root) {
      console.log("State: exiting state '" + this.path().join(', ') + "'");
    }

    return this;
  }

  // Internal: Exits the receiver state. The actual exiting logic is in the
  // `exitClustered` and `exitConcurrent` methods.
  //
  // states - A `Z.Array` of destination states.
  // opts   - The options passed to `goto`.
  //
  // Returns the receiver.
  function exit(opts) {
    return this.isConcurrent ?
      exitConcurrent.call(this, opts) : exitClustered.call(this, opts);
  }

  // Internal: Sends an action to a clustered state.
  //
  // Returns a boolean indicating whether or not the action was handled by the
  //   current substate.
  function sendClustered() {
    var handled = false, name, cur;

    for (name in this.substates) {
      if (!this.substates.hasOwnProperty(name)) { continue; }
      if (this.substates[name].__isCurrent__) {
        cur = this.substates[name];
        break;
      }
    }

    if (cur) { handled = !!cur.send.apply(cur, slice.call(arguments)); }

    return handled;
  }

  // Internal: Sends an action to a concurrent state.
  //
  // Returns a boolean indicating whether or not the action was handled by all
  //   substates.
  function sendConcurrent() {
    var args = slice.call(arguments), handled = true, state, name;

    for (name in this.substates) {
      if (!this.substates.hasOwnProperty(name)) { continue; }
      state   = this.substates[name];
      handled = state.send.apply(state, args) && handled;
    }

    return handled;
  }

  // Public: The `Z.State` constructor.
  //
  // name - A string containing the name of the state.
  // opts - An object containing zero or more of the following keys (default:
  //        `null`).
  //        isConcurrent - Makes the state's substates concurrent.
  //        hasHistory   - Causes the state to keep track of its history state.
  //
  // Returns nothing.
  // Throws `Error` if both the `isConcurrent` and `hasHistory` options are
  //   specified.
  function State(name, opts) {
    opts = opts || {};

    if (opts.isConcurrent && opts.hasHistory) {
      throw new Error('State: history states are not allowed on concurrent states');
    }

    this.name          = name;
    this.substates     = {};
    this.superstate    = null;
    this.isConcurrent  = !!opts.isConcurrent;
    this.hasHistory    = !!opts.hasHistory;
    this.__isCurrent__ = false;
    this.__cache__     = {};
    this.trace         = false;
  }

  // Public: Convenience method for creating a new statechart. Simply creates a
  // root state and invokes the given function in the context of that state.
  //
  // opts - An object of options to pass the to the `State` constructor
  //        (default: `null`).
  // f    - A function object to invoke in the context of the newly created root
  //        state (default: `null`).
  //
  // Examples
  //
  //   var sc = State.define({isConcurrent: true}, function() {
  //     this.state('a');
  //     this.state('b');
  //     this.state('c');
  //   });
  //
  // Returns the newly created root state.
  State.define = function() {
    var opts = {}, f = null, s;

    if (arguments.length === 2) {
      opts = arguments[0];
      f    = arguments[1];
    }
    else if (arguments.length === 1) {
      if (typeof arguments[0] === 'function') {
        f = arguments[0];
      }
      else {
        opts = arguments[0];
      }
    }

    s = new State('__root__', opts);
    if (f) { f.call(s); }
    return s;
  };

  State.prototype = {
    // Public: Creates a substate with the given name and adds it as a substate to
    // the receiver state. If a `Z.State` object is given, then it simply adds the
    // state as a substate. This allows you to split up the definition of your
    // states instead of defining everything in one place.
    //
    // name - A string containing the name of the state or a `Z.State` object.
    // opts - An object of options to pass to the `Z.State` constructor
    //        (default: `null`).
    // f    - A function to invoke in the context of the newly created state
    //        (default: `null`).
    //
    // Examples
    //
    //   var s2 = Z.State.create('s2').open(function() {
    //     this.state('s21);
    //     this.state('s22);
    //   });
    //
    //   var sc = Z.State.define(function() {
    //     this.state('s', function() {
    //       this.state('s1', function() {
    //         this.state('s11);
    //         this.state('s12);
    //       });
    //
    //       this.state(s2);
    //     });
    //   });
    //
    // Returns the newly created state.
    state: function(name) {
      var opts = {}, f = null, s;

      if (arguments.length === 3) {
        opts = arguments[1];
        f    = arguments[2];
      }
      else if (arguments.length === 2) {
        if (typeof arguments[1] === 'function') {
          f = arguments[1];
        }
        else {
          opts = arguments[1];
        }
      }

      if (name instanceof State) {
        s = name;
        this.addSubstate(s);
      }
      else {
        s = new State(name, opts);
        this.addSubstate(s);
        if (f) { f.call(s); }
      }

      return s;
    },

    // Public: Defines a condition state on the receiver state. Condition states
    // are consulted when entering a clustered state without specified destination
    // states. The given function should return a path to some substate of the
    // state that the condition state is defined on.
    //
    // f - The condition function.
    //
    // Examples
    //
    //   var sc = Z.State.define(function() {
    //     this.state('a', function() {
    //       this.C(function() {
    //         if (shouldGoToB) { return './b'; }
    //         if (shouldGoToC) { return './c'; }
    //         if (shouldGoToD) { return './d'; }
    //       });
    //       this.state('b');
    //       this.state('c');
    //       this.state('d');
    //     });
    //   });
    //
    // Returns nothing.
    C: function(f) {
      if (this.hasHistory) {
        throw new Error('State#C: a state may not have both condition and history states: ' + this);
      }

      if (this.isConcurrent) {
        throw new Error('State#C: a concurrent state may not have a condition state: ' + this);
      }

      this.__condition__ = f;
    },

    // Public: An observable property containing an array of the paths to all
    // current leaf states.
    current: function() {
      var states = _current.call(this), paths = [], i, len;

      for (i = 0, len = states.length; i < len; i++) {
        paths.push(states[i].path());
      }

      return paths;
    },

    // Public: The `State` iterator - invokes the given function once for each
    // state in the statechart. The states are traversed in a preorder depth-first
    // manner.
    //
    // f - A function object, it will be invoked once for each state.
    //
    // Returns the receiver.
    each: function(f) {
      var name;

      f(this);

      for (name in this.substates) {
        if (!this.substates.hasOwnProperty(name)) { continue; }
        this.substates[name].each(f);
      }

      return this;
    },

    // Public: Adds the given state as a substate of the receiver state.
    //
    // Returns the receiver.
    addSubstate: function(state) {
      this.substates[state.name] = state;
      state.each(function(s) { s.__cache__ = {}; });
      state.superstate = this;
      return this;
    },

    // Public: Returns the root state.
    root: function() {
      return this.__cache__.root = this.__cache__.root ||
        (this.superstate ? this.superstate.root() : this);
    },

    // Public: Returns a string containing the full path from the root state to
    // the receiver state. State paths are very similar to unix directory paths.
    //
    // Examples
    //
    //   var r = Z.State.create('root'),
    //       a = Z.State.create('a'),
    //       b = Z.State.create('b'),
    //       c = Z.State.create('c');
    //
    //   r.addSubstate(a);
    //   a.addSubstate(b);
    //   b.addSubstate(c);
    //
    //   r.path(); // => "/"
    //   a.path(); // => "/a"
    //   b.path(); // => "/a/b"
    //   c.path(); // => "/a/b/c"
    path: function() {
      var states = _path.call(this), names = [], i, len;

      for (i = 1, len = states.length; i < len; i++) {
        names.push(states[i].name);
      }

      return '/' + names.join('/');
    },

    // Public: Sets up a transition from the receiver state to the given
    // destination states. Transitions are usually triggered during action methods
    // called by the `send` method. This method should be called on the root state
    // to send the statechart into its initial set of current states.
    //
    // paths - Zero or more strings representing destination state paths (default:
    //         `[]`).
    // opts  - An object containing zero or more of the following keys:
    //         context - An object to pass along to the `exit` and `enter` methods
    //                   invoked during the actual transistion.
    //         force   - Forces `enter` methods to be called during the transition
    //                   on states that are already current.
    //
    // Examples
    //
    //   var sc = Z.State.define(function() {
    //     this.state('a', function() {
    //       this.state('b', function() {
    //         this.def('foo', function() {
    //           this.goto('../c');
    //         });
    //       });
    //       this.state('c', function() {
    //         this.def('bar', function() {
    //           this.goto('../b');
    //         });
    //       });
    //     });
    //   });
    //
    //   sc.goto();
    //   sc.current();   // => ['/a/b']
    //   sc.send('foo');
    //   sc.current();   // => ['/a/c']
    //   sc.send('bar');
    //   sc.current();   // => ['/a/b']
    //
    // Returns the receiver.
    // Throws an `Error` if called on a non-current non-root state.
    // Throws an `Error` if multiple pivot states are found between the receiver
    //   and destination states.
    // Throws an `Error` if a destination path is not reachable from the receiver.
    goto: function() {
      var root   = this.root(),
          paths  = flatten(slice.call(arguments)),
          opts   = typeof paths[paths.length - 1] === 'object' ? paths.pop() : {},
          states = [],
          pivots = [],
          pivot, i, n;

      for (i = 0, n = paths.length; i < n; i++) {
        states.push(resolve.call(this, paths[i]));
      }

      for (i = 0, n = states.length; i < n; i++) {
        pivots.push(findPivot.call(this, states[i]));
      }

      //FIXME: write a uniq helper
      //if (pivots.uniq().size() > 1) {
      //  throw new Error(Z.fmt("Z.State.goto: multiple pivot states found between state %@ and paths %@", this, paths.join(', ')));
      //}

      pivot = pivots[0] || this;

      if (root.trace) {
        console.log('State: transitioning to states [' +  paths.join(', ') + ']');
      }

      if (!this.__isCurrent__ && this.superstate) {
        throw new Error('State#goto: state ' + this + ' is not current');
      }

      // if the pivot state is a concurrent state and is not also the starting
      // state, then we're attempting to cross a concurrency boundary, which is
      // not allowed
      if (pivot.isConcurrent && pivot !== this) {
        throw new Error('State#goto: one or more of the given paths are not reachable from state ' + this + ': ' +  paths.join(', '));
      }

      queueTransition.call(root, pivot, states, opts);

      if (!this.__isSending__) { transition.call(root); }

      return this;
    },

    // Public: Sends an action to the statechart. A statechart handles an action
    // by giving each current leaf state an opportunity to handle the action.
    // Actions bubble up superstate chains as long as handler methods do not
    // return a truthy value. When a handler does return a truthy value the
    // bubbling is canceled. A handler method is simply a method who's name
    // matches the name passed to `send`.
    //
    // action  - A string containing the action name.
    // args... - Zero or more arguments that get passed on to the handler methods.
    //
    // Returns a boolean indicating whether or not the action was handled.
    // Throws `Error` if the state is not current.
    send: function() {
      var args = slice.call(arguments), handled;

      if (!this.__isCurrent__) {
        throw new Error('State#send: attempted to send an action to a state that is not current: ' + this);
      }

      handled = this.isConcurrent ? sendConcurrent.apply(this, arguments) :
        sendClustered.apply(this, arguments);

      if (!handled && typeof this[args[0]] === 'function') {
        this.__isSending__ = true;
        handled = !!this[args[0]].apply(this, args.slice(1));
        this.__isSending__ = false;
      }

      if (!this.superstate) { transition.call(this); }

      return handled;
    },

    // Public: Resets the statechart by exiting all current states.
    reset: function() { exit.call(this, {}); },

    // Public: Returns a boolean indicating whether or not the state at the given
    // path is current.
    //
    // Returns `true` or `false`.
    // Throws `Error` if the path cannot be resolved.
    isCurrent: function(path) { return resolve.call(this, path).__isCurrent__; },

    toString: function() { return 'State(' + this.path() + ')'; }
  };

  exports.State = State;
}(typeof exports === 'undefined' ? this.statechart = {} : exports));

