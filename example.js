var State = require('./statechart').State;

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

door.trace = true;

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
