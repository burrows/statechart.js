# statechart.js

The `statechart` module provides a `State` object that is an implementation
of a [Harel Statechart](http://en.wikipedia.org/wiki/State_diagram#Harel_statechart).

Statecharts are an improvement over state machines because they elegantly
solve the state explosion problem that is common with state machines. They do
this by adding two additional features to state machines - state clustering
and concurrent states. State clustering provides an abstraction over lower
level states where actions can be handled and transitions made in one place
instead of many. Concurrent states essentially allow multiple statecharts to
operate independently. The presence of concurrent states means that the
current state of a statechart is actually a vector of states whose length is
not fixed.

More information on statecharts is available here:

* http://www.wisdom.weizmann.ac.il/~harel/papers/Statecharts.pdf
* http://www.wisdom.weizmann.ac.il/~harel/papers/Statecharts.History.pdf
* http://www.amazon.com/Constructing-User-Interface-Statecharts-Horrocks/dp/0201342782

# Example

```javascript
var State = (typeof require === 'function' ? require('statechart') : window.statechart).State;

var door = State.define(function() {
  this.state('closed', function() {
    this.state('locked', function() {
      this.action('unlockDoor', function() { this.goto('../unlocked'); });
    });

    this.state('unlocked', function() {
      this.action('lockDoor', function() { this.goto('../locked'); });
      this.action('openDoor', function() { this.goto('/opened'); });
    });

    this.action('knock', function() { console.log('*knock knock*'); });
  });

  this.state('opened', function() {
    this.action('closeDoor', function() { this.goto('/closed/unlocked'); });
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

