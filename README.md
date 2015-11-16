# statechart.js

The `statechart` module provides a `State` object that is an implementation
of a [Harel Statechart](http://en.wikipedia.org/wiki/State_diagram#Harel_statechart).

Statecharts are an improvement over state machines because they elegantly
solve the state explosion problem that is common with state machines. They do
this by adding two additional features to state machines - state clustering
and concurrent states. State clustering provides an abstraction over lower
level states where events can be handled and transitions made in one place
instead of many. Concurrent states essentially allow multiple statecharts to
operate independently. The presence of concurrent states means that the
current state of a statechart is actually a vector of states whose length is
not fixed.

More information on statecharts is available here:

* http://www.wisdom.weizmann.ac.il/~harel/papers/Statecharts.pdf
* http://www.wisdom.weizmann.ac.il/~harel/papers/Statecharts.History.pdf
* http://www.amazon.com/Constructing-User-Interface-Statecharts-Horrocks/dp/0201342782

## Installation

```
npm install --save statechartjs
```

## Usage

```javascript
var State = require('statechartjs').State;

var app = State.define(function() {
  this.state('a', function() {
    this.enter(function() {
    });
  });

  this.state('b', function() {
    this.enter(function() {
    });
  });
});

```

## Examples

### Lockable Door

```javascript
var State = require('statechartjs').State;

var door = State.define(function() {
  this.state('closed', function() {
    this.state('locked', function() {
      this.event('unlockDoor', function() { this.goto('../unlocked'); });
    });

    this.state('unlocked', function() {
      this.event('lockDoor', function() { this.goto('../locked'); });
      this.event('openDoor', function() { this.goto('/opened'); });
    });

    this.event('knock', function() { console.log('*knock knock*'); });
  });

  this.state('opened', function() {
    this.event('closeDoor', function() { this.goto('/closed/unlocked'); });
  });
});

door.goto();
door.current();          // => [ '/closed/locked' ]
door.send('knock');      // *knock knock*
door.current();          // => [ '/closed/locked' ]
door.send('unlockDoor');
door.current();          // => [ '/closed/unlocked' ]
door.send('knock');      // *knock knock*
door.send('openDoor');
door.current();          // => [ '/opened' ]
door.send('closeDoor');
door.current();          // => [ '/closed/unlocked' ]
door.send('lockDoor');
door.current();          // => [ '/closed/locked' ]
```

### Shallow History State

```javascript
var State = (typeof require === 'function' ? require('statechart') : window.statechart).State;

var sc = State.define(function() {
  // State /a is marked as a history state, so any time /a is entered without
  // specifying which substate to enter, the most recently exited substate of /a
  // is chosen (or the first substate if /a has never been entered).
  this.state('a', {H: true}, function() {
    this.state('a.1')
    this.state('a.2')
    this.state('a.3')
  });

  this.state('b', function() {
    this.state('b.1')
    this.state('b.2')
    this.state('b.3')
  });
});

sc.goto('/a/a.2');
sc.current(); // => ['/a/a.2']

sc.goto('/b');
sc.current(); // => ['/b/b.1']

sc.goto('/a');
sc.current(); // => ['/a/a.2']
```

### Deep History State

```javascript
var State = (typeof require === 'function' ? require('statechart') : window.statechart).State;

var sc = State.define(function() {
  // State /a has shallow history tracking.
  this.state('a', {H: true}, function() {
    this.state('a.1', function() {
      this.state('a.1.1');
      this.state('a.1.2');
      this.state('a.1.3');
    });

    this.state('a.2', function() {
      this.state('a.2.1');
      this.state('a.2.2');
      this.state('a.2.3');
    });
  });

  // State /b has deep history tracking. This is the same as making each
  // descendant state of /b a history state.
  this.state('b', {H: '*'}, function() {
    this.state('b.1', function() {
      this.state('b.1.1');
      this.state('b.1.2');
      this.state('b.1.3');
    });

    this.state('b.2', function() {
      this.state('b.2.1');
      this.state('b.2.2');
      this.state('b.2.3');
    });
  });
});

sc.goto('/a/a.2/a.2.2');
sc.current();  // => ['/a/a.2/a.2.2']

sc.goto('/b/b.2/b.2.3');
sc.current();  // => ['/b/b.2/b.2.3']

sc.goto('/a');
sc.current();  // => ['/a/a.2/a.2.1']

sc.goto('/b');
sc.current();  // => ['/b/b.2/b.2.3']
```

### State Concurrency

```javascript
var State = (typeof require === 'function' ? require('statechart') : window.statechart).State;

var word = State.define({concurrent: true}, function() {
  this.state('bold', function() {
    this.state('off', function() {
      this.event('toggleBold', function() { this.goto('../on'); });
    });

    this.state('on', function() {
      this.event('toggleBold', function() { this.goto('../off'); });
    });
  });

  this.state('underline', function() {
    this.state('off', function() {
      this.event('toggleUnderline', function() { this.goto('../on'); });
    });

    this.state('on', function() {
      this.event('toggleUnderline', function() { this.goto('../off'); });
    });
  });

  this.state('align', function() {
    this.state('left');
    this.state('right');
    this.state('center');
    this.state('justify');

    this.event('leftClicked', function() { this.goto('./left');});
    this.event('rightClicked', function() { this.goto('./right');});
    this.event('centerClicked', function() { this.goto('./center');});
    this.event('justifyClicked', function() { this.goto('./justify');});
  });

  this.state('bullets', function() {
    this.state('none', function() {
      this.event('regularClicked', function() { this.goto('../regular'); })
      this.event('numberClicked', function() { this.goto('../number'); })
    });

    this.state('regular', function() {
      this.event('regularClicked', function() { this.goto('../none'); })
      this.event('numberClicked', function() { this.goto('../number'); })
    });

    this.state('number', function() {
      this.event('regularClicked', function() { this.goto('../regular'); })
      this.event('numberClicked', function() { this.goto('../none'); })
    });
  });

  this.event('resetClicked', function() { this.goto(); });
});

word.goto();
word.current(); // => ['/bold/off', '/underline/off', '/align/left', '/bullets/none']

word.send('toggleBold');
word.current(); // => ['/bold/on', '/underline/off', '/align/left', '/bullets/none']

word.send('toggleUnderline');
word.current(); // => ['/bold/on', '/underline/on', '/align/left', '/bullets/none']

word.send('rightClicked');
word.current(); // => ['/bold/on', '/underline/on', '/align/right', '/bullets/none']

word.send('justifyClicked');
word.current(); // => ['/bold/on', '/underline/on', '/align/justify', '/bullets/none']

word.send('regularClicked');
word.current(); // => ['/bold/on', '/underline/on', '/align/justify', '/bullets/regular']

word.send('regularClicked');
word.current(); // => ['/bold/on', '/underline/on', '/align/justify', '/bullets/none']

word.send('numberClicked');
word.current(); // => ['/bold/on', '/underline/on', '/align/justify', '/bullets/number']

word.send('resetClicked');
word.current(); // => ['/bold/off', '/underline/off', '/align/left', '/bullets/none']
```

