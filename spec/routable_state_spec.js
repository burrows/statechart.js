(function() {

var RoutableState = require('../lib/routable_state'), router = require('../lib/router');

describe('RoutableState', function() {
  beforeEach(function() {
    this.statechart = RoutableState.define(function() {
      this.state('start');

      this.state('index', function() {
        this.route('/foos');
      });

      this.state('show', function() {
        this.route('/foos/:id');
      });

      this.state('other', function() {
        this.route('/bars/:id');
      });
    });

    this.window = {
      addEventListener: function() {},
      removeEventListener: function() {},
      history: {
        replaceState: jasmine.createSpy('replaceState'),
        pushState: jasmine.createSpy('pushState')
      },
      location: {pathname: '/', search: ''}
    };

    this.statechart.start({window: this.window});
    this.statechart.goto('/start');
  });

  afterEach(function() {
    router.reset();
  });

  describe('#route', function() {
    it('throws an exception when a route has already been defined on the state', function() {
      var state = this.statechart.resolve('/index');
      expect(function() {
        state.route('/abc');
      }).toThrow(new Error('RoutableState#route: a route has already been defined on ' + state));
    });
  });

  describe('on popstate events', function() {
    it('triggers a transition to the state with the matching route', function() {
      expect(this.statechart.current()).toEqual(['/start']);
      router._handleLocationChange('/foos', '');
      router.flush();
      expect(this.statechart.current()).toEqual(['/index']);
      router._handleLocationChange('/foos/12', '');
      router.flush();
      expect(this.statechart.current()).toEqual(['/show']);
    });
  });

  describe('upon entering a state with a defined route', function() {
    it('updates the current location', function() {
      expect(this.statechart.current()).toEqual(['/start']);

      this.statechart.goto('/index');
      router.flush();
      expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos');

      this.statechart.goto('/show', {context: {id: 9}});
      router.flush();
      expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos/9');
    });
  });

  describe('upon state exit', function() {
    it("clears the route params from the router's params", function() {
      this.statechart.goto('/show', {context: {id: 3}});
      expect(router.params()).toEqual({id: 3});
      this.statechart.goto('/start');
      expect(router.params()).toEqual({});
    });
  });
});

}());
