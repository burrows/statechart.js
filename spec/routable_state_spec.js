(function() {

var RoutableState = require('../lib/routable_state'), router = require('../lib/router');

describe('RoutableState', function() {
  beforeEach(function() {
    this.statechart = RoutableState.define(function() {
      this.state('index', function() {
        this.route('/foos', {default: true});
      });

      this.state('show', function() {
        this.route('/foos/:id');
      });

      this.state('other', function() {
        this.route('/bars/:id');
      });

      this.state('noroute', function() {
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
    router.flush();
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

    it('registers the route with the router when the state is attached', function() {
      spyOn(router, 'define');
      RoutableState.define(function() {
        this.state('a', function() {
          this.route('/aaa');
        });
      });

      expect(router.define).toHaveBeenCalled();
      expect(router.define.calls.mostRecent().args[0]).toEqual('/aaa');
    });

    it('does not register the route with the router when the state is not attached', function() {
      spyOn(router, 'define');
      new RoutableState('foo', function() {
        this.route('/foo');
      });
      expect(router.define).not.toHaveBeenCalled();
    });
  });

  describe('RoutableState#didAttach', function() {
    it('registers the pending route with the router', function() {
      var s = RoutableState.define(), a;

      spyOn(router, 'define');

      a = new RoutableState('a', function() {
        this.route('/aaa');
      });

      expect(router.define).not.toHaveBeenCalled();
      s.state(a);
      expect(router.define).toHaveBeenCalled();
    });
  });

  describe('on popstate events', function() {
    it('triggers a transition to the state with the matching route', function() {
      router._handleLocationChange('/foos/1', '');
      router.flush();
      expect(this.statechart.current()).toEqual(['/show']);
      router._handleLocationChange('/foos', '');
      router.flush();
      expect(this.statechart.current()).toEqual(['/index']);
    });

    it('triggers a transition to the default route when the path is the root path', function() {
      router._handleLocationChange('/foos/1', '');
      router.flush();
      expect(this.statechart.current()).toEqual(['/show']);
      router._handleLocationChange('/', '');
      router.flush();
      expect(this.statechart.current()).toEqual(['/index']);
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

    describe('with a route with a canExit handler that returns false', function() {
      beforeEach(function() {
        this.statechart = RoutableState.define(function() {
          this.state('A', function() {
            this.route('/a');
            this.canExit = function() { return false; };
          });

          this.state('B', function() {
            this.route('/b');
          });
        });

        this.statechart.goto('/A');
      });

      it('does not change the current state', function() {
        expect(this.statechart.current()).toEqual(['/A']);
        router._handleLocationChange('/b', '');
        router.flush();
        expect(this.statechart.current()).toEqual(['/A']);
      });

      it('does not change the current route', function() {
        expect(router.route().pattern).toEqual('/a');
        router._handleLocationChange('/b', '');
        router.flush();
        expect(router.route().pattern).toEqual('/a');
      });
    });
  });

  describe('upon entering a state with a defined route', function() {
    it('updates the current location', function() {
      this.statechart.goto('/show', {context: {id: 9}});
      router.flush();
      expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos/9');

      this.statechart.goto('/index');
      router.flush();
      expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos');
    });
  });

  describe('upon state exit', function() {
    it("clears the route params from the router's params", function() {
      this.statechart.goto('/show', {context: {id: 3}});
      expect(router.params()).toEqual({id: 3});
      this.statechart.goto('/index');
      expect(router.params()).toEqual({});
    });
  });

  describe('#urlFor', function() {
    it('throws an error when given an invalid path', function() {
      var statechart = this.statechart;
      expect(function() {
        statechart.urlFor('/foo/bar');
      }).toThrow(new Error('RoutableState#urlFor: could not resolve path `/foo/bar`'));
    });

    it("throws an error when given a path to a state that doesn't have a define route", function() {
      var statechart = this.statechart;
      expect(function() {
        statechart.urlFor('/noroute');
      }).toThrow(new Error('RoutableState#urlFor: state `/noroute` does not have a route defined'));
    });

    it('returns a URL for the indicated state', function() {
      expect(this.statechart.urlFor('/index')).toBe('/foos');
      expect(this.statechart.urlFor('/show', {id: 4})).toBe('/foos/4');
    });
  });
});

}());
