(function() {

var Router = require('../lib/router');

describe('Router', function() {
  beforeEach(function() {
    this.window = {
      history: {
        replaceState: jasmine.createSpy('replaceState'),
        pushState: jasmine.createSpy('pushState')
      },
      location: {pathname: '/', search: ''}
    };

    this.router = new Router({window: this.window});
  });

  describe('with simple routes', function() {
    beforeEach(function() {
      this.foosRoute = this.router.define('/foos', this.foosSpy = jasmine.createSpy('foos'));
      this.barsRoute = this.router.define('/bars', this.barsSpy = jasmine.createSpy('bars'));
      this.router.unknown(this.unknownSpy = jasmine.createSpy('unknown route'));
    });

    describe('upon a popstate event', function() {
      it('invokes the callback for the matched route and passes the extracted params object', function() {
        this.router._handleLocationChange('/foos', '');
        expect(this.foosSpy).toHaveBeenCalledWith({});
      });

      it('passes the search params to the callback', function() {
        this.router._handleLocationChange('/foos', '?a=1&b=2');
        expect(this.foosSpy).toHaveBeenCalledWith({a: '1', b: '2'});
      });

      it('calls the unknown callback when the path does not match any defined routes', function() {
        this.router._handleLocationChange('/does/not/exist', '');
        expect(this.unknownSpy).toHaveBeenCalledWith('/does/not/exist');
      });

      it("updates the router's route", function() {
        expect(this.router.route()).toBeNull();
        this.router._handleLocationChange('/foos', '');
        expect(this.router.route()).toBe(this.foosRoute);

        this.router._handleLocationChange('/bars', '');
        expect(this.router.route()).toBe(this.barsRoute);
      });

      it("updates the router's params", function() {
        expect(this.router.params()).toEqual({});
        this.router._handleLocationChange('/foos', '?a=1&b=2');
        expect(this.router.params()).toEqual({a: '1', b: '2'});
      });
    });
  });

  describe('with routes with named params', function() {
    beforeEach(function() {
      this.foosRoute = this.router.define('/foos/:id', this.foosSpy = jasmine.createSpy('foos'));
      this.searchRoute = this.router.define('/search/:query/p:num', this.searchSpy = jasmine.createSpy('search'));
    });

    describe('upon a popstate event', function() {
      it('invokes the callback for the matched route and passes the extracted params object', function() {
        this.router._handleLocationChange('/foos/123', '');
        expect(this.foosSpy).toHaveBeenCalledWith({id: '123'});

        this.router._handleLocationChange('/search/some-query/p4', '');
        expect(this.searchSpy).toHaveBeenCalledWith({query: 'some-query', num: '4'});
      });

      it('merges search params into the named params and passes to the callback', function() {
        this.router._handleLocationChange('/foos/456', '?a=1&b=2');
        expect(this.foosSpy).toHaveBeenCalledWith({id: '456', a: '1', b: '2'});
      });

      it('does not allow search params to clobber named params', function() {
        this.router._handleLocationChange('/foos/456', '?a=1&b=2&id=789');
        expect(this.foosSpy).toHaveBeenCalledWith({id: '456', a: '1', b: '2'});
      });

      it("updates the router's route and params", function() {
        expect(this.router.route()).toBeNull();
        this.router._handleLocationChange('/foos/123', '');
        expect(this.router.route()).toBe(this.foosRoute);
        expect(this.router.params()).toEqual({id: '123'});

        this.router._handleLocationChange('/search/abc/p12', '');
        expect(this.router.route()).toBe(this.searchRoute);
        expect(this.router.params()).toEqual({query: 'abc', num: '12'});
      });
    });
  });

  describe('with routes with splat params', function() {
    beforeEach(function() {
      this.router.define('/file/*path', this.fileSpy = jasmine.createSpy('file'));
      this.router.define('/foo/*splat1/bar/*splat2', this.twoSplatSpy = jasmine.createSpy('twoSplatSpy'));
    });

    describe('upon a popstate event', function() {
      it('invokes the callback for the matched route and passes the extracted params object', function() {
        this.router._handleLocationChange('/file/some/long/path/thing', '');
        expect(this.fileSpy).toHaveBeenCalledWith({path: 'some/long/path/thing'});

        this.router._handleLocationChange('/foo/a/b/c/bar/d-e-f', '');
        expect(this.twoSplatSpy).toHaveBeenCalledWith({splat1: 'a/b/c', splat2: 'd-e-f'});
      });
    });
  });

  describe('with routes with regular and splat params', function() {
    beforeEach(function() {
      this.router.define('/foos/:id/*splat', this.spy = jasmine.createSpy());
    });

    describe('upon a popstate event', function() {
      it('invokes the callback for the matched route and passes the extracted params object', function() {
        this.router._handleLocationChange('/foos/456/a/bunch/of/stuff', '');
        expect(this.spy).toHaveBeenCalledWith({id: '456', splat: 'a/bunch/of/stuff'});
      });
    });
  });

  describe('', function() {
    beforeEach(function() {
      this.indexRoute = this.router.define('/foos', this.indexSpy = jasmine.createSpy());
      this.showRoute = this.router.define('/foos/:id', this.showSpy = jasmine.createSpy());
      this.searchRoute = this.router.define('/search/:query/p:num', this.searchSpy = jasmine.createSpy());
      this.router.unknown(this.unknownSpy = jasmine.createSpy());
    });

    describe('#route', function() {
      it('invokes pushState with the generated url when given a route object', function() {
        this.router.route(this.indexRoute);
        this.router.flush();
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos');
      });

      it("does not trigger the route's callback with given a route object", function() {
        this.router.route(this.indexRoute);
        this.router.flush();
        expect(this.indexSpy).not.toHaveBeenCalled();
      });

      it('does not trigger the unknown route handler', function() {
        this.router.route(this.indexRoute);
        this.router.flush();
        expect(this.unknownSpy).not.toHaveBeenCalled();
      });

      it('returns the current route when called with no arguments', function() {
        expect(this.router.route()).toBeNull();
        this.router.route(this.indexRoute);
        expect(this.router.route()).toBe(this.indexRoute);
      });
    });

    describe('#params', function() {
      it('invokes pushState with the generated url when given a route object', function() {
        this.router.route(this.showRoute);
        this.router.params({id: 5});
        this.router.flush();
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos/5');
      });

      it('invokes pushState with the generated url containing search params for keys that are not named params', function (){
        this.router.route(this.showRoute);
        this.router.params({id: 5, a: 1, b: 2});
        this.router.flush();
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos/5?a=1&b=2');
      });

      it('invokes replaceState when only the search params have changed', function() {
        this.router.route(this.showRoute);
        this.router.params({id: 5});
        this.router.flush();
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos/5');

        this.router.params({foo: 'a', bar: 'b'});
        this.router.flush();
        expect(this.window.history.replaceState).toHaveBeenCalledWith({}, null, '/foos/5?foo=a&bar=b');
      });

      it('returns the current params when not given an argument', function() {
        this.router.route(this.indexRoute);
        this.router.params({id: '1'});
        expect(this.router.params()).toEqual({id: '1'});

        this.router.params({id: '2', foo: 'bar'});
        expect(this.router.params()).toEqual({id: '2', foo: 'bar'});
      });

      it('merges the given object with the current params', function() {
        this.router.route(this.searchRoute);
        this.router.params({query: 'abc', num: '2'});
        this.router.flush();

        expect(this.router.params()).toEqual({query: 'abc', num: '2'});
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/search/abc/p2');

        this.router.params({num: '3'});
        this.router.flush();

        expect(this.router.params()).toEqual({query: 'abc', num: '3'});
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/search/abc/p3');

        this.router.params({query: 'blah'});
        this.router.flush();

        expect(this.router.params()).toEqual({query: 'blah', num: '3'});
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/search/blah/p3');
      });

      it('replaces existing params when passed true as the second argument', function() {
        this.router.route(this.searchRoute);
        this.router.params({a: 'b', c: 'd'});
        expect(this.router.params()).toEqual({a: 'b', c: 'd'});

        this.router.params({x: 'y'}, true);
        expect(this.router.params()).toEqual({x: 'y'});
      });

      it('deletes params whose value is undefined', function() {
        this.router.route(this.searchRoute);
        this.router.params({a: 'b', c: 'd'});
        expect(this.router.params()).toEqual({a: 'b', c: 'd'});
        this.router.params({a: undefined, c: 'd'});
        expect(this.router.params()).toEqual({c: 'd'});
      });
    });

    describe('urlFor', function() {
      it('returns the generated url for the given route', function() {
        expect(Router.urlFor(this.indexRoute)).toBe('/foos');
        expect(Router.urlFor(this.showRoute, {id: 9})).toBe('/foos/9');
        expect(Router.urlFor(this.searchRoute, {query: 'abc', num: 9})).toBe('/search/abc/p9');
      });
    });
  });
});

}());
