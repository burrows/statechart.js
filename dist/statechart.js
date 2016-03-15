(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["statechart"] = factory();
	else
		root["statechart"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	  State: __webpack_require__(1),
	  RoutableState: __webpack_require__(2),
	  router: __webpack_require__(3)
	};


/***/ },
/* 1 */
/***/ function(module, exports) {

	(function() {
	  "use strict";

	  var slice = Array.prototype.slice;

	  // Internal: Returns a boolean indicating whether the given object is an
	  // Array.
	  function isArray(o) {
	    return Object.prototype.toString.call(o) === '[object Array]';
	  }

	  // Internal: Flattens the given array by removing all nesting.
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

	  // Internal: Returns an array containing the unique states in the given array.
	  function uniqStates(states) {
	    var seen = {}, a = [], path, i, n;

	    for (i = 0, n = states.length; i < n; i++) {
	      if (!states[i]) { continue; }
	      path = states[i].path();
	      if (!seen[path]) {
	        a.push(states[i]);
	        seen[path] = true;
	      }
	    }

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
	    var a = [], i, n;

	    if (!this.__isCurrent__) { return []; }
	    if (this.substates.length === 0) { return [this]; }

	    for (i = 0, n = this.substates.length; i < n; i++) {
	      if (this.substates[i].__isCurrent__) {
	        a = a.concat(_current.call(this.substates[i]));
	      }
	    }

	    return a;
	  }

	  // Internal: Finds the pivot state between the receiver and the given state.
	  // The pivot state is the first common ancestor between the two states.
	  //
	  // Returns a `State` object.
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
	  // current states to receive an event before any transitions actually occur.
	  //
	  // pivot  - The pivot state between the start state and destination states.
	  // states - An array of destination states.
	  // opts   - The options object passed to the `goto` method.
	  //
	  // Returns nothing.
	  function queueTransition(pivot, states, opts) {
	    this.__transitions__.push(
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

	  // Internal: Invokes all registered enter handlers.
	  function callEnterHandlers(context) {
	    var i, n;
	    for (i = 0, n = this.enters.length; i < n; i++) {
	      this.enters[i].call(this, context);
	    }
	  }

	  // Internal: Invokes all registered exit handlers.
	  function callExitHandlers(context) {
	    var i, n;
	    for (i = 0, n = this.exits.length; i < n; i++) {
	      this.exits[i].call(this, context);
	    }
	  }

	  // Internal: Enters a clustered state. Entering a clustered state involves
	  // exiting the current substate (if one exists and is not a destination
	  // state), invoking the `enter` callbacks on the receiver state, and
	  // recursively entering the new destination substate. The new destination
	  // substate is determined as follows:
	  //
	  // 1. the substate indicated in the `states` argument if its not empty
	  // 2. the result of invoking the condition function defined with the `C`
	  //    method if it exists and returns a substate path
	  // 3. the most recently exited substate if the state was defined with the
	  //    `H` option and has been previously entered
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
	    var selflen = _path.call(this).length,
	        nexts   = [],
	        state, paths, cur, next, i, n;

	    for (i = 0, n = this.substates.length; i < n; i++) {
	      if (this.substates[i].__isCurrent__) { cur = this.substates[i]; break; }
	    }

	    for (i = 0, n = states.length; i < n; i++) {
	      nexts.push(_path.call(states[i])[selflen]);
	    }

	    if (uniqStates(nexts).length > 1) {
	      throw new Error("State#enterClustered: attempted to enter multiple substates of " + this + ": " + nexts.join(', '));
	    }

	    if (!(next = nexts[0]) && this.substates.length > 0) {
	      if (this.__condition__ && (paths = this.__condition__.call(this, opts.context))) {
	        paths  = flatten([paths]);
	        states = [];
	        for (i = 0, n = paths.length; i < n; i++) {
	          if (!(state = this.resolve(paths[i]))) {
	            throw new Error("State#enterClustered: could not resolve path '" + paths[i] + "' returned by condition function from " + this);
	          }
	          states.push(state);
	        }
	        return enterClustered.call(this, states, opts);
	      }
	      if (this.history) { next = this.__previous__; }
	      if (!next) { next = this.substates[0]; }
	    }

	    if (cur && cur !== next) { exit.call(cur, opts); }

	    if (!this.__isCurrent__ || opts.force) {
	      trace.call(this, "State: [ENTER]  : " + this.path() + (this.__isCurrent__ ? ' (forced)' : ''));
	      this.__isCurrent__ = true;
	      callEnterHandlers.call(this, opts.context);
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
	    var sstate, dstates, i, j, ni, nj;

	    if (!this.__isCurrent__ || opts.force) {
	      trace.call(this, "State: [ENTER]  : " + this.path() + (this.__isCurrent__ ? ' (forced)' : ''));
	      this.__isCurrent__ = true;
	      callEnterHandlers.call(this, opts.context);
	    }

	    for (i = 0, ni = this.substates.length; i < ni; i++) {
	      sstate  = this.substates[i];
	      dstates = [];

	      for (j = 0, nj = states.length; j < nj; j++) {
	        if (findPivot.call(sstate, states[j]) === sstate) {
	          dstates.push(states[j]);
	        }

	      }
	      enter.call(sstate, dstates, opts);
	    }

	    return this;
	  }

	  // Internal: Enters the receiver state. The actual entering logic is in the
	  // `enterClustered` and `enterConcurrent` methods.
	  //
	  // states - An array of destination states.
	  // opts   - The options passed to `goto`.
	  //
	  // Returns the receiver.
	  function enter(states, opts) {
	    return this.concurrent ?
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
	    var cur, i, n;

	    for (i = 0, n = this.substates.length; i < n; i++) {
	      if (this.substates[i].__isCurrent__) { cur = this.substates[i]; break; }
	    }

	    if (this.history) { this.__previous__ = cur; }

	    if (cur) { exit.call(cur, opts); }

	    callExitHandlers.call(this, opts.context);
	    this.__isCurrent__ = false;
	    trace.call(this, "State: [EXIT]   : " + this.path());

	    return this;
	  }

	  // Internal: Exits a concurrent state. Similiar to `exitClustered` we
	  // recursively exit each substate and invoke the `exit` method as the stack
	  // unwinds.
	  //
	  // opts - The options passed to `goto`.
	  //
	  // Returns the receiver.
	  function exitConcurrent(opts) {
	    var root = this.root(), i, n;

	    for (i = 0, n = this.substates.length; i < n; i++) {
	      exit.call(this.substates[i], opts);
	    }

	    callExitHandlers.call(this, opts.context);
	    this.__isCurrent__ = false;
	    if (this !== root) { trace.call(this, "State: [EXIT]   : " + this.path()); }

	    return this;
	  }

	  // Internal: Exits the receiver state. The actual exiting logic is in the
	  // `exitClustered` and `exitConcurrent` methods.
	  //
	  // opts   - The options passed to `goto`.
	  //
	  // Returns the receiver.
	  function exit(opts) {
	    return this.concurrent ?
	      exitConcurrent.call(this, opts) : exitClustered.call(this, opts);
	  }

	  // Internal: Asks the receiver state if it can exit.
	  //
	  // destStates - The destination states.
	  // opts       - The options passed to `goto`.
	  //
	  // Returns boolean.
	  function canExit(destStates, opts) {
	    var i, n;
	    for (i = 0, n = this.substates.length; i < n; i++) {
	      if (this.substates[i].__isCurrent__) {
	        if (canExit.call(this.substates[i], destStates, opts) === false) {
	          return false;
	        }
	      }
	    }

	    return this.canExit(destStates, opts.context);
	  }

	  // Internal: Sends an event to a clustered state.
	  //
	  // Returns a boolean indicating whether or not the event was handled by the
	  //   current substate.
	  function sendClustered() {
	    var handled = false, i, n, cur;

	    for (i = 0, n = this.substates.length; i < n; i++) {
	      if (this.substates[i].__isCurrent__) { cur = this.substates[i]; break; }
	    }

	    if (cur) { handled = !!cur.send.apply(cur, slice.call(arguments)); }

	    return handled;
	  }

	  // Internal: Sends an event to a concurrent state.
	  //
	  // Returns a boolean indicating whether or not the event was handled by all
	  //   substates.
	  function sendConcurrent() {
	    var args = slice.call(arguments), handled = true, state, i, n;

	    for (i = 0, n = this.substates.length; i < n; i++) {
	      state   = this.substates[i];
	      handled = state.send.apply(state, args) && handled;
	    }

	    return handled;
	  }

	  // Internal: Logs the given message. How the message gets logged is determined
	  // by the `State.logger` property. By default this is `console`, but can be
	  // setto use another logger object. It assumes that there is an `info` method
	  // on the logger object.
	  function trace(message) {
	    var logger = State.logger || console;
	    if (!this.root().trace || !logger) { return; }
	    logger.info(message);
	  }

	  // Public: The `State` constructor.
	  //
	  // name - A string containing the name of the state.
	  // opts - An object containing zero or more of the following keys (default:
	  //        `null`).
	  //        concurrent - Makes the state's substates concurrent.
	  //        H          - Causes the state to keep track of its history state.
	  //                     Set to `true` to track just the history of this state
	  //                     or `'*'` to track the history of all substates.
	  // f    - A function to invoke in the context of the newly created state
	  //        (default: `null`).
	  //
	  // Returns nothing.
	  // Throws `Error` if both the `concurrent` and `H` options are set.
	  function State(name, opts, f) {
	    if (typeof opts === 'function') {
	      f    = opts;
	      opts = {};
	    }

	    opts = opts || {};

	    if (opts.concurrent && opts.H) {
	      throw new Error('State: history states are not allowed on concurrent states');
	    }

	    this.name            = name;
	    this.substateMap     = {};
	    this.substates       = [];
	    this.superstate      = null;
	    this.enters          = [];
	    this.exits           = [];
	    this.events          = {};
	    this.concurrent      = !!opts.concurrent;
	    this.history         = !!(opts.H);
	    this.deep            = opts.H === '*';
	    this.__isCurrent__   = false;
	    this.__cache__       = {};
	    this.__transitions__ = [];
	    this.trace           = false;

	    if (f) { f.call(this); }
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
	  //   var sc = State.define({concurrent: true}, function() {
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

	    s = new this('__root__', opts, f);
	    return s;
	  };

	  // Public: Indicates whether the state is the root of the statechart created
	  // by the `State.define` method.
	  State.prototype.isRoot = function() { return this.name === '__root__'; };

	  // Public: Creates a substate with the given name and adds it as a substate to
	  // the receiver state. If a `State` object is given, then it simply adds the
	  // state as a substate. This allows you to split up the definition of your
	  // states instead of defining everything in one place.
	  //
	  // name - A string containing the name of the state or a `State` object.
	  // opts - An object of options to pass to the `State` constructor
	  //        (default: `null`).
	  // f    - A function to invoke in the context of the newly created state
	  //        (default: `null`).
	  //
	  // Examples
	  //
	  //   var s2 = new State('s2');
	  //   s2.state('s21');
	  //   s2.state('s22');
	  //
	  //   var sc = State.define(function() {
	  //     this.state('s', function() {
	  //       this.state('s1', function() {
	  //         this.state('s11');
	  //         this.state('s12');
	  //       });
	  //
	  //       this.state(s2);
	  //     });
	  //   });
	  //
	  // Returns the newly created state.
	  State.prototype.state = function(name, opts, f) {
	    var s = name instanceof this.constructor ? name :
	      new this.constructor(name, opts, f);
	    this.addSubstate(s);
	    return s;
	  };

	  // Public: Registers an enter handler to be called with the receiver state
	  // is entered. The `context` option passed to `goto` will be passed to the
	  // given function when invoked.
	  //
	  // Multiple enter handlers may be registered per state. They are invoked in
	  // the order in which they are defined.
	  //
	  // f - A function to call when the state is entered.
	  //
	  // Returns the receiver.
	  State.prototype.enter = function pState_enter(f) { this.enters.push(f); return this; };

	  // Public: Registers an exit handler to be called with the receiver state
	  // is exited. The `context` option passed to `goto` will be passed to the
	  // given function when invoked.
	  //
	  // Multiple exit handlers may be registered per state. They are invoked in
	  // the order in which they are defined.
	  //
	  // f - A function to call when the state is exited.
	  //
	  // Returns the receiver.
	  State.prototype.exit = function pState_exit(f) { this.exits.push(f); return this; };

	  // Public: A function that can be used to prevent a state from being exited.
	  // `destStates` and `context` are the destination states and context that
	  // will be transitioned to if the states can be exited.
	  //
	  // destStates - The destination states.
	  // context    - The destination context.
	  //
	  // Returns the receiver.
	  State.prototype.canExit = function(/*destStates, context*/) { return true; };

	  // Public: Registers an event handler to be called when an event with a
	  // matching name is sent to the state via the `send` method.
	  //
	  // Only one event handler may be registered per event.
	  //
	  // name - The name of the event.
	  // f    - A function to call when the event occurs.
	  //
	  // Returns the receiver.
	  State.prototype.event = function pState_event(name, f) { this.events[name] = f; return this; };

	  // Public: Defines a condition state on the receiver state. Condition states
	  // are consulted when entering a clustered state without specified destination
	  // states. The given function should return a path to some substate of the
	  // state that the condition state is defined on.
	  //
	  // f - The condition function.
	  //
	  // Examples
	  //
	  //   var sc = State.define(function() {
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
	  State.prototype.C = function pState_C(f) {
	    if (this.concurrent) {
	      throw new Error('State#C: a concurrent state may not have a condition state: ' + this);
	    }

	    this.__condition__ = f;
	  };

	  // Public: Returns an array of paths to all current leaf states.
	  State.prototype.current = function pState_current() {
	    var states = _current.call(this), paths = [], i, n;

	    for (i = 0, n = states.length; i < n; i++) {
	      paths.push(states[i].path());
	    }

	    return paths;
	  };

	  // Public: The `State` iterator - invokes the given function once for each
	  // state in the statechart. The states are traversed in a preorder depth-first
	  // manner.
	  //
	  // f - A function object, it will be invoked once for each state.
	  //
	  // Returns the receiver.
	  State.prototype.each = function pState_each(f) {
	    var i, n;

	    f(this);

	    for (i = 0, n = this.substates.length; i < n; i++) {
	      this.substates[i].each(f);
	    }

	    return this;
	  };

	  // Public: Adds the given state as a substate of the receiver state.
	  //
	  // Returns the receiver.
	  State.prototype.addSubstate = function pState_addSubstate(state) {
	    var deep = this.deep, didAttach = this.root().isRoot();
	    this.substateMap[state.name] = state;
	    this.substates.push(state);
	    state.superstate = this;
	    state.each(function(s) {
	      s.__cache__ = {};
	      if (deep) { s.history = s.deep = true; }
	      if (didAttach) { s.didAttach(); }
	    });
	    return this;
	  };

	  // Internal: Invoked by the `#addSubstate` method when the state has been
	  // connected to a root statechart. This is currently only used by the
	  // `RoutableState` substate and should not be invoked by client code.
	  State.prototype.didAttach = function pState_didAttach() {};

	  // Public: Indicates whether the receiver state is attached to a root statechart node.
	  State.prototype.isAttached = function pState_isAttached() { return this.root().isRoot(); };

	  // Public: Returns the root state.
	  State.prototype.root = function pState_root() {
	    return this.__cache__.root = this.__cache__.root ||
	      (this.superstate ? this.superstate.root() : this);
	  };

	  // Public: Returns a string containing the full path from the root state to
	  // the receiver state. State paths are very similar to unix directory paths.
	  //
	  // Examples
	  //
	  //   var r = new State('root'),
	  //       a = new State('a'),
	  //       b = new State('b'),
	  //       c = new State('c');
	  //
	  //   r.addSubstate(a);
	  //   a.addSubstate(b);
	  //   b.addSubstate(c);
	  //
	  //   r.path(); // => "/"
	  //   a.path(); // => "/a"
	  //   b.path(); // => "/a/b"
	  //   c.path(); // => "/a/b/c"
	  State.prototype.path = function pState_path() {
	    var states = _path.call(this), names = [], i, len;

	    for (i = 1, len = states.length; i < len; i++) {
	      names.push(states[i].name);
	    }

	    return '/' + names.join('/');
	  };

	  // Public: Sets up a transition from the receiver state to the given
	  // destination states. Transitions are usually triggered during event
	  // handlers called by the `send` method. This method should be called on the
	  // root state to send the statechart into its initial set of current states.
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
	  //   var sc = State.define(function() {
	  //     this.state('a', function() {
	  //       this.state('b', function() {
	  //         this.foo = function() { this.goto('../c'); };
	  //       });
	  //       this.state('c', function() {
	  //         this.bar = function() { this.goto('../b'); };
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
	  // Returns boolean. `false` if transition failed.
	  // Throws an `Error` if called on a non-current non-root state.
	  // Throws an `Error` if multiple pivot states are found between the receiver
	  //   and destination states.
	  // Throws an `Error` if a destination path is not reachable from the receiver.
	  State.prototype.goto = function pState_goto() {
	    var root   = this.root(),
	        paths  = flatten(slice.call(arguments)),
	        opts   = typeof paths[paths.length - 1] === 'object' ? paths.pop() : {},
	        states = [],
	        pivots = [],
	        state, pivot, i, n;

	    for (i = 0, n = paths.length; i < n; i++) {
	      if (!(state = this.resolve(paths[i]))) {
	        throw new Error('State#goto: could not resolve path ' + paths[i] + ' from ' + this);
	      }

	      states.push(state);
	    }

	    for (i = 0, n = states.length; i < n; i++) {
	      pivots.push(findPivot.call(this, states[i]));
	    }

	    if (uniqStates(pivots).length > 1) {
	      throw new Error("State#goto: multiple pivot states found between state " + this + " and paths " + paths.join(', '));
	    }

	    pivot = pivots[0] || this;

	    if (canExit.call(pivot, states, opts) === false){
	      trace.call(this, 'State: [GOTO]   : ' + this + ' can not exit]');
	      return false;
	    }

	    trace.call(this, 'State: [GOTO]   : ' + this + ' -> [' + states.join(', ') + ']');

	    if (!this.__isCurrent__ && this.superstate) {
	      throw new Error('State#goto: state ' + this + ' is not current');
	    }

	    // if the pivot state is a concurrent state and is not also the starting
	    // state, then we're attempting to cross a concurrency boundary, which is
	    // not allowed
	    if (pivot.concurrent && pivot !== this) {
	      throw new Error('State#goto: one or more of the given paths are not reachable from state ' + this + ': ' +  paths.join(', '));
	    }

	    queueTransition.call(root, pivot, states, opts);

	    if (!this.__isSending__) { transition.call(root); }

	    return true;
	  };

	  // Public: Sends an event to the statechart. A statechart handles an event
	  // by giving each current leaf state an opportunity to handle it. Events
	  // bubble up superstate chains as long as handler methods do not return a
	  // truthy value. When a handler does return a truthy value (indicating that
	  // it has handled the event) the bubbling is canceled. A handler method is
	  // registered with the `event` method.
	  //
	  // event   - A string containing the event name.
	  // args... - Zero or more arguments that get passed on to the handler methods.
	  //
	  // Returns a boolean indicating whether or not the event was handled.
	  // Throws `Error` if the state is not current.
	  State.prototype.send = function pState_send() {
	    var args = slice.call(arguments), events = this.events, handled;

	    if (!this.__isCurrent__) {
	      throw new Error('State#send: attempted to send an event to a state that is not current: ' + this);
	    }

	    if (this === this.root()) {
	      trace.call(this, 'State: [EVENT]  : ' + args[0]);
	    }

	    handled = this.concurrent ? sendConcurrent.apply(this, arguments) :
	      sendClustered.apply(this, arguments);

	    if (!handled && typeof events[args[0]] === 'function') {
	      this.__isSending__ = true;
	      handled = !!events[args[0]].apply(this, args.slice(1));
	      this.__isSending__ = false;
	    }

	    if (!this.superstate) { transition.call(this); }

	    return handled;
	  };

	  // Public: Resets the statechart by exiting all current states.
	  State.prototype.reset = function pState_reset() { exit.call(this, {}); };

	  // Public: Returns a boolean indicating whether or not the state at the given
	  // path is current.
	  //
	  // Returns `true` or `false`.
	  // Throws `Error` if the path cannot be resolved.
	  State.prototype.isCurrent = function pState_isCurrent(path) {
	    var state = this.resolve(path);
	    return !!(state && state.__isCurrent__);
	  };

	  // Public: Resolves a string path into an actual `State` object. Paths not
	  // starting with a '/' are resolved relative to the receiver state, paths that
	  // do start with a '/' are resolved relative to the root state.
	  //
	  // path      - A string containing the path to resolve or an array of path
	  //             segments.
	  //
	  // Returns the `State` object the path represents if it can be resolve and
	  //   `null` otherwise.
	  State.prototype.resolve = function pState_resolve(path) {
	    var head, next;

	    if (!path) { return null; }

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
	      next = this.substateMap[head];
	    }

	    if (!next) { return null; }

	    return path.length === 0 ? next : next.resolve(path);
	  };

	  // Public: Returns a formatted string with the state's full path.
	  State.prototype.toString = function pState_toString() { return 'State(' + this.path() + ')'; };

	  module.exports = State;
	}());



/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	(function() {
	  "use strict";

	  var State = __webpack_require__(1), router = __webpack_require__(3), util = __webpack_require__(10);

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
	    if (this.__route__) {
	      throw new Error("RoutableState#route: a route has already been defined on " + this);
	    }

	    if (this.isAttached()) {
	      this._registerRoute(pattern, opts);
	    }
	    else {
	      this.__pendingRoute__ = {pattern: pattern, opts: opts};
	    }


	    return this;
	  };

	  RoutableState.prototype._registerRoute = function(pattern, opts) {
	    var _this = this;

	    this.__route__ = router.define(pattern, function(params) {
	      return _this.root().goto(_this.path(), {force: true, context: params});
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
	  };

	  // Internal: Registers the state's route with the router if it has one pending.
	  RoutableState.prototype.didAttach = function() {
	    if (this.__pendingRoute__) {
	      this._registerRoute(this.__pendingRoute__.pattern, this.__pendingRoute__.opts);
	      delete this.__pendingRoute__;
	    }

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


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	(function() {
	  "use strict";

	  // Polyfill for older browsers that don't support the history API that falls back to using the
	  // URL hash.
	  __webpack_require__(4);

	  var qs               = __webpack_require__(6),
	      equals           = __webpack_require__(9),
	      util             = __webpack_require__(10),
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
	        _this._handleLocationChange(loc.pathname, qs.parse(loc.search.replace(/^\?/, '')));
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

	    path = (typeof this.preprocess === 'function') ? this.preprocess(path) : path;

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
	      this._handleLocationChange(pathname, qs.parse(a.search.replace(/^\?/, '')));
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
	    if (!this.__started__ || !this.__route__) { return this; }

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


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 * History API JavaScript Library v4.2.0
	 *
	 * Support: IE8+, FF3+, Opera 9+, Safari, Chrome and other
	 *
	 * Copyright 2011-2014, Dmitrii Pakhtinov ( spb.piksel@gmail.com )
	 *
	 * http://spb-piksel.ru/
	 *
	 * Dual licensed under the MIT and GPL licenses:
	 *   http://www.opensource.org/licenses/mit-license.php
	 *   http://www.gnu.org/licenses/gpl.html
	 *
	 * Update: 2014-11-06 21:35
	 */
	(function(factory) {
	    if ("function" === 'function' && __webpack_require__(5)['amd']) {
	        // https://github.com/devote/HTML5-History-API/issues/57#issuecomment-43133600
	        __webpack_require__(5)(typeof document !== "object" || document.readyState !== "loading" ? [] : "html5-history-api", factory);
	    } else {
	        factory();
	    }
	})(function() {
	    // Define global variable
	    var global = (typeof window === 'object' ? window : this) || {};
	    // Prevent the code from running if there is no window.history object or library already loaded
	    if (!global.history || "emulate" in global.history) return global.history;
	    // symlink to document
	    var document = global.document;
	    // HTML element
	    var documentElement = document.documentElement;
	    // symlink to constructor of Object
	    var Object = global['Object'];
	    // symlink to JSON Object
	    var JSON = global['JSON'];
	    // symlink to instance object of 'Location'
	    var windowLocation = global.location;
	    // symlink to instance object of 'History'
	    var windowHistory = global.history;
	    // new instance of 'History'. The default is a reference to the original object instance
	    var historyObject = windowHistory;
	    // symlink to method 'history.pushState'
	    var historyPushState = windowHistory.pushState;
	    // symlink to method 'history.replaceState'
	    var historyReplaceState = windowHistory.replaceState;
	    // if the browser supports HTML5-History-API
	    var isSupportHistoryAPI = !!historyPushState;
	    // verifies the presence of an object 'state' in interface 'History'
	    var isSupportStateObjectInHistory = 'state' in windowHistory;
	    // symlink to method 'Object.defineProperty'
	    var defineProperty = Object.defineProperty;
	    // new instance of 'Location', for IE8 will use the element HTMLAnchorElement, instead of pure object
	    var locationObject = redefineProperty({}, 't') ? {} : document.createElement('a');
	    // prefix for the names of events
	    var eventNamePrefix = '';
	    // String that will contain the name of the method
	    var addEventListenerName = global.addEventListener ? 'addEventListener' : (eventNamePrefix = 'on') && 'attachEvent';
	    // String that will contain the name of the method
	    var removeEventListenerName = global.removeEventListener ? 'removeEventListener' : 'detachEvent';
	    // String that will contain the name of the method
	    var dispatchEventName = global.dispatchEvent ? 'dispatchEvent' : 'fireEvent';
	    // reference native methods for the events
	    var addEvent = global[addEventListenerName];
	    var removeEvent = global[removeEventListenerName];
	    var dispatch = global[dispatchEventName];
	    // default settings
	    var settings = {"basepath": '/', "redirect": 0, "type": '/', "init": 0};
	    // key for the sessionStorage
	    var sessionStorageKey = '__historyAPI__';
	    // Anchor Element for parseURL function
	    var anchorElement = document.createElement('a');
	    // last URL before change to new URL
	    var lastURL = windowLocation.href;
	    // Control URL, need to fix the bug in Opera
	    var checkUrlForPopState = '';
	    // for fix on Safari 8
	    var triggerEventsInWindowAttributes = 1;
	    // trigger event 'onpopstate' on page load
	    var isFireInitialState = false;
	    // if used history.location of other code
	    var isUsedHistoryLocationFlag = 0;
	    // store a list of 'state' objects in the current session
	    var stateStorage = {};
	    // in this object will be stored custom handlers
	    var eventsList = {};
	    // stored last title
	    var lastTitle = document.title;

	    /**
	     * Properties that will be replaced in the global
	     * object 'window', to prevent conflicts
	     *
	     * @type {Object}
	     */
	    var eventsDescriptors = {
	        "onhashchange": null,
	        "onpopstate": null
	    };

	    /**
	     * Fix for Chrome in iOS
	     * See https://github.com/devote/HTML5-History-API/issues/29
	     */
	    var fastFixChrome = function(method, args) {
	        var isNeedFix = global.history !== windowHistory;
	        if (isNeedFix) {
	            global.history = windowHistory;
	        }
	        method.apply(windowHistory, args);
	        if (isNeedFix) {
	            global.history = historyObject;
	        }
	    };

	    /**
	     * Properties that will be replaced/added to object
	     * 'window.history', includes the object 'history.location',
	     * for a complete the work with the URL address
	     *
	     * @type {Object}
	     */
	    var historyDescriptors = {
	        /**
	         * Setting library initialization
	         *
	         * @param {null|String} [basepath] The base path to the site; defaults to the root "/".
	         * @param {null|String} [type] Substitute the string after the anchor; by default "/".
	         * @param {null|Boolean} [redirect] Enable link translation.
	         */
	        "setup": function(basepath, type, redirect) {
	            settings["basepath"] = ('' + (basepath == null ? settings["basepath"] : basepath))
	                .replace(/(?:^|\/)[^\/]*$/, '/');
	            settings["type"] = type == null ? settings["type"] : type;
	            settings["redirect"] = redirect == null ? settings["redirect"] : !!redirect;
	        },
	        /**
	         * @namespace history
	         * @param {String} [type]
	         * @param {String} [basepath]
	         */
	        "redirect": function(type, basepath) {
	            historyObject['setup'](basepath, type);
	            basepath = settings["basepath"];
	            if (global.top == global.self) {
	                var relative = parseURL(null, false, true)._relative;
	                var path = windowLocation.pathname + windowLocation.search;
	                if (isSupportHistoryAPI) {
	                    path = path.replace(/([^\/])$/, '$1/');
	                    if (relative != basepath && (new RegExp("^" + basepath + "$", "i")).test(path)) {
	                        windowLocation.replace(relative);
	                    }
	                } else if (path != basepath) {
	                    path = path.replace(/([^\/])\?/, '$1/?');
	                    if ((new RegExp("^" + basepath, "i")).test(path)) {
	                        windowLocation.replace(basepath + '#' + path.
	                            replace(new RegExp("^" + basepath, "i"), settings["type"]) + windowLocation.hash);
	                    }
	                }
	            }
	        },
	        /**
	         * The method adds a state object entry
	         * to the history.
	         *
	         * @namespace history
	         * @param {Object} state
	         * @param {string} title
	         * @param {string} [url]
	         */
	        pushState: function(state, title, url) {
	            var t = document.title;
	            if (lastTitle != null) {
	                document.title = lastTitle;
	            }
	            historyPushState && fastFixChrome(historyPushState, arguments);
	            changeState(state, url);
	            document.title = t;
	            lastTitle = title;
	        },
	        /**
	         * The method updates the state object,
	         * title, and optionally the URL of the
	         * current entry in the history.
	         *
	         * @namespace history
	         * @param {Object} state
	         * @param {string} title
	         * @param {string} [url]
	         */
	        replaceState: function(state, title, url) {
	            var t = document.title;
	            if (lastTitle != null) {
	                document.title = lastTitle;
	            }
	            delete stateStorage[windowLocation.href];
	            historyReplaceState && fastFixChrome(historyReplaceState, arguments);
	            changeState(state, url, true);
	            document.title = t;
	            lastTitle = title;
	        },
	        /**
	         * Object 'history.location' is similar to the
	         * object 'window.location', except that in
	         * HTML4 browsers it will behave a bit differently
	         *
	         * @namespace history
	         */
	        "location": {
	            set: function(value) {
	                if (isUsedHistoryLocationFlag === 0) isUsedHistoryLocationFlag = 1;
	                global.location = value;
	            },
	            get: function() {
	                if (isUsedHistoryLocationFlag === 0) isUsedHistoryLocationFlag = 1;
	                return isSupportHistoryAPI ? windowLocation : locationObject;
	            }
	        },
	        /**
	         * A state object is an object representing
	         * a user interface state.
	         *
	         * @namespace history
	         */
	        "state": {
	            get: function() {
	                return stateStorage[windowLocation.href] || null;
	            }
	        }
	    };

	    /**
	     * Properties for object 'history.location'.
	     * Object 'history.location' is similar to the
	     * object 'window.location', except that in
	     * HTML4 browsers it will behave a bit differently
	     *
	     * @type {Object}
	     */
	    var locationDescriptors = {
	        /**
	         * Navigates to the given page.
	         *
	         * @namespace history.location
	         */
	        assign: function(url) {
	            if (('' + url).indexOf('#') === 0) {
	                changeState(null, url);
	            } else {
	                windowLocation.assign(url);
	            }
	        },
	        /**
	         * Reloads the current page.
	         *
	         * @namespace history.location
	         */
	        reload: function() {
	            windowLocation.reload();
	        },
	        /**
	         * Removes the current page from
	         * the session history and navigates
	         * to the given page.
	         *
	         * @namespace history.location
	         */
	        replace: function(url) {
	            if (('' + url).indexOf('#') === 0) {
	                changeState(null, url, true);
	            } else {
	                windowLocation.replace(url);
	            }
	        },
	        /**
	         * Returns the current page's location.
	         *
	         * @namespace history.location
	         */
	        toString: function() {
	            return this.href;
	        },
	        /**
	         * Returns the current page's location.
	         * Can be set, to navigate to another page.
	         *
	         * @namespace history.location
	         */
	        "href": {
	            get: function() {
	                return parseURL()._href;
	            }
	        },
	        /**
	         * Returns the current page's protocol.
	         *
	         * @namespace history.location
	         */
	        "protocol": null,
	        /**
	         * Returns the current page's host and port number.
	         *
	         * @namespace history.location
	         */
	        "host": null,
	        /**
	         * Returns the current page's host.
	         *
	         * @namespace history.location
	         */
	        "hostname": null,
	        /**
	         * Returns the current page's port number.
	         *
	         * @namespace history.location
	         */
	        "port": null,
	        /**
	         * Returns the current page's path only.
	         *
	         * @namespace history.location
	         */
	        "pathname": {
	            get: function() {
	                return parseURL()._pathname;
	            }
	        },
	        /**
	         * Returns the current page's search
	         * string, beginning with the character
	         * '?' and to the symbol '#'
	         *
	         * @namespace history.location
	         */
	        "search": {
	            get: function() {
	                return parseURL()._search;
	            }
	        },
	        /**
	         * Returns the current page's hash
	         * string, beginning with the character
	         * '#' and to the end line
	         *
	         * @namespace history.location
	         */
	        "hash": {
	            set: function(value) {
	                changeState(null, ('' + value).replace(/^(#|)/, '#'), false, lastURL);
	            },
	            get: function() {
	                return parseURL()._hash;
	            }
	        }
	    };

	    /**
	     * Just empty function
	     *
	     * @return void
	     */
	    function emptyFunction() {
	        // dummy
	    }

	    /**
	     * Prepares a parts of the current or specified reference for later use in the library
	     *
	     * @param {string} [href]
	     * @param {boolean} [isWindowLocation]
	     * @param {boolean} [isNotAPI]
	     * @return {Object}
	     */
	    function parseURL(href, isWindowLocation, isNotAPI) {
	        var re = /(?:(\w+\:))?(?:\/\/(?:[^@]*@)?([^\/:\?#]+)(?::([0-9]+))?)?([^\?#]*)(?:(\?[^#]+)|\?)?(?:(#.*))?/;
	        if (href != null && href !== '' && !isWindowLocation) {
	            var current = parseURL(),
	                base = document.getElementsByTagName('base')[0];
	            if (!isNotAPI && base && base.getAttribute('href')) {
	              // Fix for IE ignoring relative base tags.
	              // See http://stackoverflow.com/questions/3926197/html-base-tag-and-local-folder-path-with-internet-explorer
	              base.href = base.href;
	              current = parseURL(base.href, null, true);
	            }
	            var _pathname = current._pathname, _protocol = current._protocol;
	            // convert to type of string
	            href = '' + href;
	            // convert relative link to the absolute
	            href = /^(?:\w+\:)?\/\//.test(href) ? href.indexOf("/") === 0
	                ? _protocol + href : href : _protocol + "//" + current._host + (
	                href.indexOf("/") === 0 ? href : href.indexOf("?") === 0
	                    ? _pathname + href : href.indexOf("#") === 0
	                    ? _pathname + current._search + href : _pathname.replace(/[^\/]+$/g, '') + href
	                );
	        } else {
	            href = isWindowLocation ? href : windowLocation.href;
	            // if current browser not support History-API
	            if (!isSupportHistoryAPI || isNotAPI) {
	                // get hash fragment
	                href = href.replace(/^[^#]*/, '') || "#";
	                // form the absolute link from the hash
	                // https://github.com/devote/HTML5-History-API/issues/50
	                href = windowLocation.protocol.replace(/:.*$|$/, ':') + '//' + windowLocation.host + settings['basepath']
	                    + href.replace(new RegExp("^#[\/]?(?:" + settings["type"] + ")?"), "");
	            }
	        }
	        // that would get rid of the links of the form: /../../
	        anchorElement.href = href;
	        // decompose the link in parts
	        var result = re.exec(anchorElement.href);
	        // host name with the port number
	        var host = result[2] + (result[3] ? ':' + result[3] : '');
	        // folder
	        var pathname = result[4] || '/';
	        // the query string
	        var search = result[5] || '';
	        // hash
	        var hash = result[6] === '#' ? '' : (result[6] || '');
	        // relative link, no protocol, no host
	        var relative = pathname + search + hash;
	        // special links for set to hash-link, if browser not support History API
	        var nohash = pathname.replace(new RegExp("^" + settings["basepath"], "i"), settings["type"]) + search;
	        // result
	        return {
	            _href: result[1] + '//' + host + relative,
	            _protocol: result[1],
	            _host: host,
	            _hostname: result[2],
	            _port: result[3] || '',
	            _pathname: pathname,
	            _search: search,
	            _hash: hash,
	            _relative: relative,
	            _nohash: nohash,
	            _special: nohash + hash
	        }
	    }

	    /**
	     * Initializing storage for the custom state's object
	     */
	    function storageInitialize() {
	        var sessionStorage;
	        /**
	         * sessionStorage throws error when cookies are disabled
	         * Chrome content settings when running the site in a Facebook IFrame.
	         * see: https://github.com/devote/HTML5-History-API/issues/34
	         * and: http://stackoverflow.com/a/12976988/669360
	         */
	        try {
	            sessionStorage = global['sessionStorage'];
	            sessionStorage.setItem(sessionStorageKey + 't', '1');
	            sessionStorage.removeItem(sessionStorageKey + 't');
	        } catch(_e_) {
	            sessionStorage = {
	                getItem: function(key) {
	                    var cookie = document.cookie.split(key + "=");
	                    return cookie.length > 1 && cookie.pop().split(";").shift() || 'null';
	                },
	                setItem: function(key, value) {
	                    var state = {};
	                    // insert one current element to cookie
	                    if (state[windowLocation.href] = historyObject.state) {
	                        document.cookie = key + '=' + JSON.stringify(state);
	                    }
	                }
	            }
	        }

	        try {
	            // get cache from the storage in browser
	            stateStorage = JSON.parse(sessionStorage.getItem(sessionStorageKey)) || {};
	        } catch(_e_) {
	            stateStorage = {};
	        }

	        // hang up the event handler to event unload page
	        addEvent(eventNamePrefix + 'unload', function() {
	            // save current state's object
	            sessionStorage.setItem(sessionStorageKey, JSON.stringify(stateStorage));
	        }, false);
	    }

	    /**
	     * This method is implemented to override the built-in(native)
	     * properties in the browser, unfortunately some browsers are
	     * not allowed to override all the properties and even add.
	     * For this reason, this was written by a method that tries to
	     * do everything necessary to get the desired result.
	     *
	     * @param {Object} object The object in which will be overridden/added property
	     * @param {String} prop The property name to be overridden/added
	     * @param {Object} [descriptor] An object containing properties set/get
	     * @param {Function} [onWrapped] The function to be called when the wrapper is created
	     * @return {Object|Boolean} Returns an object on success, otherwise returns false
	     */
	    function redefineProperty(object, prop, descriptor, onWrapped) {
	        var testOnly = 0;
	        // test only if descriptor is undefined
	        if (!descriptor) {
	            descriptor = {set: emptyFunction};
	            testOnly = 1;
	        }
	        // variable will have a value of true the success of attempts to set descriptors
	        var isDefinedSetter = !descriptor.set;
	        var isDefinedGetter = !descriptor.get;
	        // for tests of attempts to set descriptors
	        var test = {configurable: true, set: function() {
	            isDefinedSetter = 1;
	        }, get: function() {
	            isDefinedGetter = 1;
	        }};

	        try {
	            // testing for the possibility of overriding/adding properties
	            defineProperty(object, prop, test);
	            // running the test
	            object[prop] = object[prop];
	            // attempt to override property using the standard method
	            defineProperty(object, prop, descriptor);
	        } catch(_e_) {
	        }

	        // If the variable 'isDefined' has a false value, it means that need to try other methods
	        if (!isDefinedSetter || !isDefinedGetter) {
	            // try to override/add the property, using deprecated functions
	            if (object.__defineGetter__) {
	                // testing for the possibility of overriding/adding properties
	                object.__defineGetter__(prop, test.get);
	                object.__defineSetter__(prop, test.set);
	                // running the test
	                object[prop] = object[prop];
	                // attempt to override property using the deprecated functions
	                descriptor.get && object.__defineGetter__(prop, descriptor.get);
	                descriptor.set && object.__defineSetter__(prop, descriptor.set);
	            }

	            // Browser refused to override the property, using the standard and deprecated methods
	            if (!isDefinedSetter || !isDefinedGetter) {
	                if (testOnly) {
	                    return false;
	                } else if (object === global) {
	                    // try override global properties
	                    try {
	                        // save original value from this property
	                        var originalValue = object[prop];
	                        // set null to built-in(native) property
	                        object[prop] = null;
	                    } catch(_e_) {
	                    }
	                    // This rule for Internet Explorer 8
	                    if ('execScript' in global) {
	                        /**
	                         * to IE8 override the global properties using
	                         * VBScript, declaring it in global scope with
	                         * the same names.
	                         */
	                        global['execScript']('Public ' + prop, 'VBScript');
	                        global['execScript']('var ' + prop + ';', 'JavaScript');
	                    } else {
	                        try {
	                            /**
	                             * This hack allows to override a property
	                             * with the set 'configurable: false', working
	                             * in the hack 'Safari' to 'Mac'
	                             */
	                            defineProperty(object, prop, {value: emptyFunction});
	                        } catch(_e_) {
	                            if (prop === 'onpopstate') {
	                                /**
	                                 * window.onpopstate fires twice in Safari 8.0.
	                                 * Block initial event on window.onpopstate
	                                 * See: https://github.com/devote/HTML5-History-API/issues/69
	                                 */
	                                addEvent('popstate', descriptor = function() {
	                                    removeEvent('popstate', descriptor, false);
	                                    var onpopstate = object.onpopstate;
	                                    // cancel initial event on attribute handler
	                                    object.onpopstate = null;
	                                    setTimeout(function() {
	                                      // restore attribute value after short time
	                                      object.onpopstate = onpopstate;
	                                    }, 1);
	                                }, false);
	                                // cancel trigger events on attributes in object the window
	                                triggerEventsInWindowAttributes = 0;
	                            }
	                        }
	                    }
	                    // set old value to new variable
	                    object[prop] = originalValue;

	                } else {
	                    // the last stage of trying to override the property
	                    try {
	                        try {
	                            // wrap the object in a new empty object
	                            var temp = Object.create(object);
	                            defineProperty(Object.getPrototypeOf(temp) === object ? temp : object, prop, descriptor);
	                            for(var key in object) {
	                                // need to bind a function to the original object
	                                if (typeof object[key] === 'function') {
	                                    temp[key] = object[key].bind(object);
	                                }
	                            }
	                            try {
	                                // to run a function that will inform about what the object was to wrapped
	                                onWrapped.call(temp, temp, object);
	                            } catch(_e_) {
	                            }
	                            object = temp;
	                        } catch(_e_) {
	                            // sometimes works override simply by assigning the prototype property of the constructor
	                            defineProperty(object.constructor.prototype, prop, descriptor);
	                        }
	                    } catch(_e_) {
	                        // all methods have failed
	                        return false;
	                    }
	                }
	            }
	        }

	        return object;
	    }

	    /**
	     * Adds the missing property in descriptor
	     *
	     * @param {Object} object An object that stores values
	     * @param {String} prop Name of the property in the object
	     * @param {Object|null} descriptor Descriptor
	     * @return {Object} Returns the generated descriptor
	     */
	    function prepareDescriptorsForObject(object, prop, descriptor) {
	        descriptor = descriptor || {};
	        // the default for the object 'location' is the standard object 'window.location'
	        object = object === locationDescriptors ? windowLocation : object;
	        // setter for object properties
	        descriptor.set = (descriptor.set || function(value) {
	            object[prop] = value;
	        });
	        // getter for object properties
	        descriptor.get = (descriptor.get || function() {
	            return object[prop];
	        });
	        return descriptor;
	    }

	    /**
	     * Wrapper for the methods 'addEventListener/attachEvent' in the context of the 'window'
	     *
	     * @param {String} event The event type for which the user is registering
	     * @param {Function} listener The method to be called when the event occurs.
	     * @param {Boolean} capture If true, capture indicates that the user wishes to initiate capture.
	     * @return void
	     */
	    function addEventListener(event, listener, capture) {
	        if (event in eventsList) {
	            // here stored the event listeners 'popstate/hashchange'
	            eventsList[event].push(listener);
	        } else {
	            // FireFox support non-standart four argument aWantsUntrusted
	            // https://github.com/devote/HTML5-History-API/issues/13
	            if (arguments.length > 3) {
	                addEvent(event, listener, capture, arguments[3]);
	            } else {
	                addEvent(event, listener, capture);
	            }
	        }
	    }

	    /**
	     * Wrapper for the methods 'removeEventListener/detachEvent' in the context of the 'window'
	     *
	     * @param {String} event The event type for which the user is registered
	     * @param {Function} listener The parameter indicates the Listener to be removed.
	     * @param {Boolean} capture Was registered as a capturing listener or not.
	     * @return void
	     */
	    function removeEventListener(event, listener, capture) {
	        var list = eventsList[event];
	        if (list) {
	            for(var i = list.length; i--;) {
	                if (list[i] === listener) {
	                    list.splice(i, 1);
	                    break;
	                }
	            }
	        } else {
	            removeEvent(event, listener, capture);
	        }
	    }

	    /**
	     * Wrapper for the methods 'dispatchEvent/fireEvent' in the context of the 'window'
	     *
	     * @param {Event|String} event Instance of Event or event type string if 'eventObject' used
	     * @param {*} [eventObject] For Internet Explorer 8 required event object on this argument
	     * @return {Boolean} If 'preventDefault' was called the value is false, else the value is true.
	     */
	    function dispatchEvent(event, eventObject) {
	        var eventType = ('' + (typeof event === "string" ? event : event.type)).replace(/^on/, '');
	        var list = eventsList[eventType];
	        if (list) {
	            // need to understand that there is one object of Event
	            eventObject = typeof event === "string" ? eventObject : event;
	            if (eventObject.target == null) {
	                // need to override some of the properties of the Event object
	                for(var props = ['target', 'currentTarget', 'srcElement', 'type']; event = props.pop();) {
	                    // use 'redefineProperty' to override the properties
	                    eventObject = redefineProperty(eventObject, event, {
	                        get: event === 'type' ? function() {
	                            return eventType;
	                        } : function() {
	                            return global;
	                        }
	                    });
	                }
	            }
	            if (triggerEventsInWindowAttributes) {
	              // run function defined in the attributes 'onpopstate/onhashchange' in the 'window' context
	              ((eventType === 'popstate' ? global.onpopstate : global.onhashchange)
	                  || emptyFunction).call(global, eventObject);
	            }
	            // run other functions that are in the list of handlers
	            for(var i = 0, len = list.length; i < len; i++) {
	                list[i].call(global, eventObject);
	            }
	            return true;
	        } else {
	            return dispatch(event, eventObject);
	        }
	    }

	    /**
	     * dispatch current state event
	     */
	    function firePopState() {
	        var o = document.createEvent ? document.createEvent('Event') : document.createEventObject();
	        if (o.initEvent) {
	            o.initEvent('popstate', false, false);
	        } else {
	            o.type = 'popstate';
	        }
	        o.state = historyObject.state;
	        // send a newly created events to be processed
	        dispatchEvent(o);
	    }

	    /**
	     * fire initial state for non-HTML5 browsers
	     */
	    function fireInitialState() {
	        if (isFireInitialState) {
	            isFireInitialState = false;
	            firePopState();
	        }
	    }

	    /**
	     * Change the data of the current history for HTML4 browsers
	     *
	     * @param {Object} state
	     * @param {string} [url]
	     * @param {Boolean} [replace]
	     * @param {string} [lastURLValue]
	     * @return void
	     */
	    function changeState(state, url, replace, lastURLValue) {
	        if (!isSupportHistoryAPI) {
	            // if not used implementation history.location
	            if (isUsedHistoryLocationFlag === 0) isUsedHistoryLocationFlag = 2;
	            // normalization url
	            var urlObject = parseURL(url, isUsedHistoryLocationFlag === 2 && ('' + url).indexOf("#") !== -1);
	            // if current url not equal new url
	            if (urlObject._relative !== parseURL()._relative) {
	                // if empty lastURLValue to skip hash change event
	                lastURL = lastURLValue;
	                if (replace) {
	                    // only replace hash, not store to history
	                    windowLocation.replace("#" + urlObject._special);
	                } else {
	                    // change hash and add new record to history
	                    windowLocation.hash = urlObject._special;
	                }
	            }
	        } else {
	            lastURL = windowLocation.href;
	        }
	        if (!isSupportStateObjectInHistory && state) {
	            stateStorage[windowLocation.href] = state;
	        }
	        isFireInitialState = false;
	    }

	    /**
	     * Event handler function changes the hash in the address bar
	     *
	     * @param {Event} event
	     * @return void
	     */
	    function onHashChange(event) {
	        // https://github.com/devote/HTML5-History-API/issues/46
	        var fireNow = lastURL;
	        // new value to lastURL
	        lastURL = windowLocation.href;
	        // if not empty fireNow, otherwise skipped the current handler event
	        if (fireNow) {
	            // if checkUrlForPopState equal current url, this means that the event was raised popstate browser
	            if (checkUrlForPopState !== windowLocation.href) {
	                // otherwise,
	                // the browser does not support popstate event or just does not run the event by changing the hash.
	                firePopState();
	            }
	            // current event object
	            event = event || global.event;

	            var oldURLObject = parseURL(fireNow, true);
	            var newURLObject = parseURL();
	            // HTML4 browser not support properties oldURL/newURL
	            if (!event.oldURL) {
	                event.oldURL = oldURLObject._href;
	                event.newURL = newURLObject._href;
	            }
	            if (oldURLObject._hash !== newURLObject._hash) {
	                // if current hash not equal previous hash
	                dispatchEvent(event);
	            }
	        }
	    }

	    /**
	     * The event handler is fully loaded document
	     *
	     * @param {*} [noScroll]
	     * @return void
	     */
	    function onLoad(noScroll) {
	        // Get rid of the events popstate when the first loading a document in the webkit browsers
	        setTimeout(function() {
	            // hang up the event handler for the built-in popstate event in the browser
	            addEvent('popstate', function(e) {
	                // set the current url, that suppress the creation of the popstate event by changing the hash
	                checkUrlForPopState = windowLocation.href;
	                // for Safari browser in OS Windows not implemented 'state' object in 'History' interface
	                // and not implemented in old HTML4 browsers
	                if (!isSupportStateObjectInHistory) {
	                    e = redefineProperty(e, 'state', {get: function() {
	                        return historyObject.state;
	                    }});
	                }
	                // send events to be processed
	                dispatchEvent(e);
	            }, false);
	        }, 0);
	        // for non-HTML5 browsers
	        if (!isSupportHistoryAPI && noScroll !== true && "location" in historyObject) {
	            // scroll window to anchor element
	            scrollToAnchorId(locationObject.hash);
	            // fire initial state for non-HTML5 browser after load page
	            fireInitialState();
	        }
	    }

	    /**
	     * Finds the closest ancestor anchor element (including the target itself).
	     *
	     * @param {HTMLElement} target The element to start scanning from.
	     * @return {HTMLElement} An element which is the closest ancestor anchor.
	     */
	    function anchorTarget(target) {
	        while (target) {
	            if (target.nodeName === 'A') return target;
	            target = target.parentNode;
	        }
	    }

	    /**
	     * Handles anchor elements with a hash fragment for non-HTML5 browsers
	     *
	     * @param {Event} e
	     */
	    function onAnchorClick(e) {
	        var event = e || global.event;
	        var target = anchorTarget(event.target || event.srcElement);
	        var defaultPrevented = "defaultPrevented" in event ? event['defaultPrevented'] : event.returnValue === false;
	        if (target && target.nodeName === "A" && !defaultPrevented) {
	            var current = parseURL();
	            var expect = parseURL(target.getAttribute("href", 2));
	            var isEqualBaseURL = current._href.split('#').shift() === expect._href.split('#').shift();
	            if (isEqualBaseURL && expect._hash) {
	                if (current._hash !== expect._hash) {
	                    locationObject.hash = expect._hash;
	                }
	                scrollToAnchorId(expect._hash);
	                if (event.preventDefault) {
	                    event.preventDefault();
	                } else {
	                    event.returnValue = false;
	                }
	            }
	        }
	    }

	    /**
	     * Scroll page to current anchor in url-hash
	     *
	     * @param hash
	     */
	    function scrollToAnchorId(hash) {
	        var target = document.getElementById(hash = (hash || '').replace(/^#/, ''));
	        if (target && target.id === hash && target.nodeName === "A") {
	            var rect = target.getBoundingClientRect();
	            global.scrollTo((documentElement.scrollLeft || 0), rect.top + (documentElement.scrollTop || 0)
	                - (documentElement.clientTop || 0));
	        }
	    }

	    /**
	     * Library initialization
	     *
	     * @return {Boolean} return true if all is well, otherwise return false value
	     */
	    function initialize() {
	        /**
	         * Get custom settings from the query string
	         */
	        var scripts = document.getElementsByTagName('script');
	        var src = (scripts[scripts.length - 1] || {}).src || '';
	        var arg = src.indexOf('?') !== -1 ? src.split('?').pop() : '';
	        arg.replace(/(\w+)(?:=([^&]*))?/g, function(a, key, value) {
	            settings[key] = (value || '').replace(/^(0|false)$/, '');
	        });

	        /**
	         * hang up the event handler to listen to the events hashchange
	         */
	        addEvent(eventNamePrefix + 'hashchange', onHashChange, false);

	        // a list of objects with pairs of descriptors/object
	        var data = [locationDescriptors, locationObject, eventsDescriptors, global, historyDescriptors, historyObject];

	        // if browser support object 'state' in interface 'History'
	        if (isSupportStateObjectInHistory) {
	            // remove state property from descriptor
	            delete historyDescriptors['state'];
	        }

	        // initializing descriptors
	        for(var i = 0; i < data.length; i += 2) {
	            for(var prop in data[i]) {
	                if (data[i].hasOwnProperty(prop)) {
	                    if (typeof data[i][prop] === 'function') {
	                        // If the descriptor is a simple function, simply just assign it an object
	                        data[i + 1][prop] = data[i][prop];
	                    } else {
	                        // prepare the descriptor the required format
	                        var descriptor = prepareDescriptorsForObject(data[i], prop, data[i][prop]);
	                        // try to set the descriptor object
	                        if (!redefineProperty(data[i + 1], prop, descriptor, function(n, o) {
	                            // is satisfied if the failed override property
	                            if (o === historyObject) {
	                                // the problem occurs in Safari on the Mac
	                                global.history = historyObject = data[i + 1] = n;
	                            }
	                        })) {
	                            // if there is no possibility override.
	                            // This browser does not support descriptors, such as IE7

	                            // remove previously hung event handlers
	                            removeEvent(eventNamePrefix + 'hashchange', onHashChange, false);

	                            // fail to initialize :(
	                            return false;
	                        }

	                        // create a repository for custom handlers onpopstate/onhashchange
	                        if (data[i + 1] === global) {
	                            eventsList[prop] = eventsList[prop.substr(2)] = [];
	                        }
	                    }
	                }
	            }
	        }

	        // check settings
	        historyObject['setup']();

	        // redirect if necessary
	        if (settings['redirect']) {
	            historyObject['redirect']();
	        }

	        // initialize
	        if (settings["init"]) {
	            // You agree that you will use window.history.location instead window.location
	            isUsedHistoryLocationFlag = 1;
	        }

	        // If browser does not support object 'state' in interface 'History'
	        if (!isSupportStateObjectInHistory && JSON) {
	            storageInitialize();
	        }

	        // track clicks on anchors
	        if (!isSupportHistoryAPI) {
	            document[addEventListenerName](eventNamePrefix + "click", onAnchorClick, false);
	        }

	        if (document.readyState === 'complete') {
	            onLoad(true);
	        } else {
	            if (!isSupportHistoryAPI && parseURL()._relative !== settings["basepath"]) {
	                isFireInitialState = true;
	            }
	            /**
	             * Need to avoid triggering events popstate the initial page load.
	             * Hang handler popstate as will be fully loaded document that
	             * would prevent triggering event onpopstate
	             */
	            addEvent(eventNamePrefix + 'load', onLoad, false);
	        }

	        // everything went well
	        return true;
	    }

	    /**
	     * Starting the library
	     */
	    if (!initialize()) {
	        // if unable to initialize descriptors
	        // therefore quite old browser and there
	        // is no sense to continue to perform
	        return;
	    }

	    /**
	     * If the property history.emulate will be true,
	     * this will be talking about what's going on
	     * emulation capabilities HTML5-History-API.
	     * Otherwise there is no emulation, ie the
	     * built-in browser capabilities.
	     *
	     * @type {boolean}
	     * @const
	     */
	    historyObject['emulate'] = !isSupportHistoryAPI;

	    /**
	     * Replace the original methods on the wrapper
	     */
	    global[addEventListenerName] = addEventListener;
	    global[removeEventListenerName] = removeEventListener;
	    global[dispatchEventName] = dispatchEvent;

	    return historyObject;
	});


/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = function() { throw new Error("define cannot be used indirect"); };


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.decode = exports.parse = __webpack_require__(7);
	exports.encode = exports.stringify = __webpack_require__(8);


/***/ },
/* 7 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	// If obj.hasOwnProperty has been overridden, then calling
	// obj.hasOwnProperty(prop) will break.
	// See: https://github.com/joyent/node/issues/1707
	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	module.exports = function(qs, sep, eq, options) {
	  sep = sep || '&';
	  eq = eq || '=';
	  var obj = {};

	  if (typeof qs !== 'string' || qs.length === 0) {
	    return obj;
	  }

	  var regexp = /\+/g;
	  qs = qs.split(sep);

	  var maxKeys = 1000;
	  if (options && typeof options.maxKeys === 'number') {
	    maxKeys = options.maxKeys;
	  }

	  var len = qs.length;
	  // maxKeys <= 0 means that we should not limit keys count
	  if (maxKeys > 0 && len > maxKeys) {
	    len = maxKeys;
	  }

	  for (var i = 0; i < len; ++i) {
	    var x = qs[i].replace(regexp, '%20'),
	        idx = x.indexOf(eq),
	        kstr, vstr, k, v;

	    if (idx >= 0) {
	      kstr = x.substr(0, idx);
	      vstr = x.substr(idx + 1);
	    } else {
	      kstr = x;
	      vstr = '';
	    }

	    k = decodeURIComponent(kstr);
	    v = decodeURIComponent(vstr);

	    if (!hasOwnProperty(obj, k)) {
	      obj[k] = v;
	    } else if (Array.isArray(obj[k])) {
	      obj[k].push(v);
	    } else {
	      obj[k] = [obj[k], v];
	    }
	  }

	  return obj;
	};


/***/ },
/* 8 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	var stringifyPrimitive = function(v) {
	  switch (typeof v) {
	    case 'string':
	      return v;

	    case 'boolean':
	      return v ? 'true' : 'false';

	    case 'number':
	      return isFinite(v) ? v : '';

	    default:
	      return '';
	  }
	};

	module.exports = function(obj, sep, eq, name) {
	  sep = sep || '&';
	  eq = eq || '=';
	  if (obj === null) {
	    obj = undefined;
	  }

	  if (typeof obj === 'object') {
	    return Object.keys(obj).map(function(k) {
	      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
	      if (Array.isArray(obj[k])) {
	        return obj[k].map(function(v) {
	          return ks + encodeURIComponent(stringifyPrimitive(v));
	        }).join(sep);
	      } else {
	        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
	      }
	    }).join(sep);

	  }

	  if (!name) return '';
	  return encodeURIComponent(stringifyPrimitive(name)) + eq +
	         encodeURIComponent(stringifyPrimitive(obj));
	};


/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = shallow

	function shallow(a, b, compare) {
	  var aIsArray = Array.isArray(a)
	  var bIsArray = Array.isArray(b)

	  if (aIsArray !== bIsArray) return false

	  var aTypeof = typeof a
	  var bTypeof = typeof b

	  if (aTypeof !== bTypeof) return false
	  if (flat(aTypeof)) return compare
	    ? compare(a, b)
	    : a === b

	  return aIsArray
	    ? shallowArray(a, b, compare)
	    : shallowObject(a, b, compare)
	}

	function shallowArray(a, b, compare) {
	  var l = a.length
	  if (l !== b.length) return false

	  if (compare) {
	    for (var i = 0; i < l; i++)
	      if (!compare(a[i], b[i])) return false
	  } else {
	    for (var i = 0; i < l; i++) {
	      if (a[i] !== b[i]) return false
	    }
	  }

	  return true
	}

	function shallowObject(a, b, compare) {
	  var ka = 0
	  var kb = 0

	  if (compare) {
	    for (var key in a) {
	      if (
	        a.hasOwnProperty(key) &&
	        !compare(a[key], b[key])
	      ) return false

	      ka++
	    }
	  } else {
	    for (var key in a) {
	      if (
	        a.hasOwnProperty(key) &&
	        a[key] !== b[key]
	      ) return false

	      ka++
	    }
	  }

	  for (var key in b) {
	    if (b.hasOwnProperty(key)) kb++
	  }

	  return ka === kb
	}

	function flat(type) {
	  return (
	    type !== 'function' &&
	    type !== 'object'
	  )
	}


/***/ },
/* 10 */
/***/ function(module, exports) {

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


/***/ }
/******/ ])
});
;