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

    it('throws an exception when given a state string that does not resolve', function() {
      expect(function() {
        RoutableState.define(function() {
          this.route('/foo/bar', './foo/bar');
        });
      }).toThrow(new Error('RoutableState#route: invalid state: ./foo/bar'));
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

    describe('with routes defined with a state string', function() {
      beforeEach(function() {
        this.statechart = RoutableState.define(function() {
          this.state('start');
          this.state('A');
          this.state('B');
          this.state('C');

          this.route('/a', './A');
          this.route('/b', './B');
          this.route('/c', './C');
        });

        this.statechart.goto('/start');
      });

      it('triggers a transition to the state with the matching route', function() {
        expect(this.statechart.current()).toEqual(['/start']);
        router._handleLocationChange('/a', '');
        router.flush();
        expect(this.statechart.current()).toEqual(['/A']);
        router._handleLocationChange('/b', '');
        router.flush();
        expect(this.statechart.current()).toEqual(['/B']);
        router._handleLocationChange('/c', '');
        router.flush();
        expect(this.statechart.current()).toEqual(['/C']);
      });
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
