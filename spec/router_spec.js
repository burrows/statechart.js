(function() {

var router = require('../lib/router');

describe('Router', function() {
  beforeEach(function() {
    var _this = this;

    var stub = function(x, y, url) {
      var parts = url.split('?');
      _this.window.location.pathname = parts[0];
      _this.window.location.search = parts[1] ? '?' + parts[1] : '';
    };

    this.window = {
      addEventListener: function() {},
      removeEventListener: function() {},
      history: {
        replaceState: jasmine.createSpy('replaceState').and.callFake(stub),
        pushState: jasmine.createSpy('pushState').and.callFake(stub)
      },
      location: {pathname: '/', search: '', host: 'example.com'},
    };

    router.start({window: this.window});
  });

  afterEach(function() {
    router.reset();
  });

  describe('with simple routes', function() {
    beforeEach(function() {
      this.foosRoute = router.define('/foos', this.foosSpy = jasmine.createSpy('foos'));
      this.barsRoute = router.define('/bars', this.barsSpy = jasmine.createSpy('bars'));
      router.define('/nope', function() { return false; });
      router.unknown(this.unknownSpy = jasmine.createSpy('unknown route'));
    });

    describe('#_recognize', function() {
      it('returns the first route whose pattern matches the given path', function() {
        expect(router._recognize('/foos')).toBe(this.foosRoute);
        expect(router._recognize('/bars')).toBe(this.barsRoute);
      });

      it('returns null when no route matches', function() {
        expect(router._recognize('/asdf')).toBeNull();
      });
    });

    describe('upon a popstate event', function() {
      it('invokes the callback for the matched route and passes the extracted params object', function() {
        router._handleLocationChange('/foos', {});
        expect(this.foosSpy).toHaveBeenCalledWith({});
      });

      it('does not invoke the unknown handler when a matching route is found', function() {
        router._handleLocationChange('/foos', {});
        expect(this.unknownSpy).not.toHaveBeenCalled();
      });

      it('passes the search params to the callback', function() {
        router._handleLocationChange('/foos', {a: '1', b: '2'});
        expect(this.foosSpy).toHaveBeenCalledWith({a: '1', b: '2'});
      });

      it('calls the unknown callback when the path does not match any defined routes', function() {
        router._handleLocationChange('/does/not/exist', {});
        expect(this.unknownSpy).toHaveBeenCalledWith('/does/not/exist');
      });

      it("updates the router's route", function() {
        expect(router.route()).toBeNull();
        router._handleLocationChange('/foos', {});
        expect(router.route()).toBe(this.foosRoute);

        router._handleLocationChange('/bars', {});
        expect(router.route()).toBe(this.barsRoute);
      });

      it("updates the router's params", function() {
        expect(router.params()).toEqual({});
        router._handleLocationChange('/foos', {a: '1', b: '2'});
        expect(router.params()).toEqual({a: '1', b: '2'});
      });

      it('reverts back to the previous route and params when the matching route callback returns false', function() {
        router._handleLocationChange('/foos', {a: '1', b: '2'});
        router.flush();
        expect(router.route()).toBe(this.foosRoute);
        expect(router.params()).toEqual({a: '1', b: '2'});
        router._handleLocationChange('/nope', {});
        router.flush();
        expect(router.route()).toBe(this.foosRoute);
        expect(router.params()).toEqual({a: '1', b: '2'});
      });
    });
  });

  describe('with routes with named params', function() {
    beforeEach(function() {
      this.foosRoute = router.define('/foos/:id', this.foosSpy = jasmine.createSpy('foos'));
      this.searchRoute = router.define('/search/:query/p:num', this.searchSpy = jasmine.createSpy('search'));
    });

    describe('#_recognize', function() {
      it('returns the first route whose pattern matches the given path', function() {
        expect(router._recognize('/foos/12')).toBe(this.foosRoute);
        expect(router._recognize('/search/acb123/p8')).toBe(this.searchRoute);
        expect(router._recognize('/search/aaa/p18')).toBe(this.searchRoute);
      });

      it('returns null when no route matches', function() {
        expect(router._recognize('/asdf')).toBeNull();
      });
    });

    describe('upon a popstate event', function() {
      it('invokes the callback for the matched route and passes the extracted params object', function() {
        router._handleLocationChange('/foos/123', {});
        expect(this.foosSpy).toHaveBeenCalledWith({id: '123'});

        router._handleLocationChange('/search/some-query/p4', {});
        expect(this.searchSpy).toHaveBeenCalledWith({query: 'some-query', num: '4'});
      });

      it('merges search params into the named params and passes to the callback', function() {
        router._handleLocationChange('/foos/456', {a: '1', b: '2'});
        expect(this.foosSpy).toHaveBeenCalledWith({id: '456', a: '1', b: '2'});
      });

      it('does not allow search params to clobber named params', function() {
        router._handleLocationChange('/foos/456', {a: '1', b: '2', id: '789'});
        expect(this.foosSpy).toHaveBeenCalledWith({id: '456', a: '1', b: '2'});
      });

      it("updates the router's route and params", function() {
        expect(router.route()).toBeNull();
        router._handleLocationChange('/foos/123', {});
        expect(router.route()).toBe(this.foosRoute);
        expect(router.params()).toEqual({id: '123'});

        router._handleLocationChange('/search/abc/p12', {});
        expect(router.route()).toBe(this.searchRoute);
        expect(router.params()).toEqual({query: 'abc', num: '12'});
      });
    });
  });

  describe('with routes with splat params', function() {
    beforeEach(function() {
      this.fileRoute = router.define('/file/*path', this.fileSpy = jasmine.createSpy('file'));
      this.twoSplatRoute = router.define('/foo/*splat1/bar/*splat2', this.twoSplatSpy = jasmine.createSpy('twoSplatSpy'));
    });

    describe('#_recognize', function() {
      it('returns the first route whose pattern matches the given path', function() {
        expect(router._recognize('/file/a/b/c')).toBe(this.fileRoute);
        expect(router._recognize('/foo/a/b/c/bar/d/e/f')).toBe(this.twoSplatRoute);
      });

      it('returns null when no route matches', function() {
        expect(router._recognize('/foo/a/b/c/aaa/d/e/f')).toBeNull();
      });
    });

    describe('upon a popstate event', function() {
      it('invokes the callback for the matched route and passes the extracted params object', function() {
        router._handleLocationChange('/file/some/long/path/thing', {});
        expect(this.fileSpy).toHaveBeenCalledWith({path: 'some/long/path/thing'});

        router._handleLocationChange('/foo/a/b/c/bar/d-e-f', {});
        expect(this.twoSplatSpy).toHaveBeenCalledWith({splat1: 'a/b/c', splat2: 'd-e-f'});
      });
    });
  });

  describe('with routes with regular and splat params', function() {
    beforeEach(function() {
      this.foosRoute = router.define('/foos/:id/*splat', this.spy = jasmine.createSpy());
    });

    describe('#_recognize', function() {
      it('returns the first route whose pattern matches the given path', function() {
        expect(router._recognize('/foos/99/a/b/c')).toBe(this.foosRoute);
      });

      it('returns null when no route matches', function() {
        expect(router._recognize('/foosx/99/a/b/c')).toBeNull();
      });
    });
    describe('upon a popstate event', function() {
      it('invokes the callback for the matched route and passes the extracted params object', function() {
        router._handleLocationChange('/foos/456/a/bunch/of/stuff', {});
        expect(this.spy).toHaveBeenCalledWith({id: '456', splat: 'a/bunch/of/stuff'});
      });
    });
  });

  describe('', function() {
    beforeEach(function() {
      this.indexRoute = router.define('/foos', this.indexSpy = jasmine.createSpy());
      this.showRoute = router.define('/foos/:id', this.showSpy = jasmine.createSpy());
      this.searchRoute = router.define('/search/:query/p:num', this.searchSpy = jasmine.createSpy());
      router.unknown(this.unknownSpy = jasmine.createSpy());
    });

    describe('#route', function() {
      it('invokes pushState with the generated url when given a route object', function() {
        router.route(this.indexRoute);
        router.flush();
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos');
      });

      it("does not trigger the route's callback with given a route object", function() {
        router.route(this.indexRoute);
        router.flush();
        expect(this.indexSpy).not.toHaveBeenCalled();
      });

      it('does not trigger the unknown route handler', function() {
        router.route(this.indexRoute);
        router.flush();
        expect(this.unknownSpy).not.toHaveBeenCalled();
      });

      it('returns the current route when called with no arguments', function() {
        expect(router.route()).toBeNull();
        router.route(this.indexRoute);
        expect(router.route()).toBe(this.indexRoute);
      });
    });

    describe('#params', function() {
      it('invokes pushState with the generated url when given a route object', function() {
        router.route(this.showRoute);
        router.params({id: 5});
        router.flush();
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos/5');
      });

      it('invokes pushState with the generated url containing search params for keys that are not named params', function (){
        router.route(this.showRoute);
        router.params({id: 5, a: 1, b: 2});
        router.flush();
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos/5?a=1&b=2');
      });

      it('invokes replaceState when only the search params have changed', function() {
        router.route(this.showRoute);
        router.params({id: 5});
        router.flush();
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/foos/5');

        router.params({foo: 'a', bar: 'b'});
        router.flush();
        expect(this.window.history.replaceState).toHaveBeenCalledWith({}, null, '/foos/5?foo=a&bar=b');
      });

      it('returns the current params when not given an argument', function() {
        router.route(this.indexRoute);
        router.params({id: '1'});
        expect(router.params()).toEqual({id: '1'});

        router.params({id: '2', foo: 'bar'});
        expect(router.params()).toEqual({id: '2', foo: 'bar'});
      });

      it('merges the given object with the current params', function() {
        router.route(this.searchRoute);
        router.params({query: 'abc', num: '2'});
        router.flush();

        expect(router.params()).toEqual({query: 'abc', num: '2'});
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/search/abc/p2');

        router.params({num: '3'});
        router.flush();

        expect(router.params()).toEqual({query: 'abc', num: '3'});
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/search/abc/p3');

        router.params({query: 'blah'});
        router.flush();

        expect(router.params()).toEqual({query: 'blah', num: '3'});
        expect(this.window.history.pushState).toHaveBeenCalledWith({}, null, '/search/blah/p3');
      });

      it('replaces existing params when passed true as the second argument', function() {
        router.route(this.searchRoute);
        router.params({a: 'b', c: 'd'});
        expect(router.params()).toEqual({a: 'b', c: 'd'});

        router.params({x: 'y'}, true);
        expect(router.params()).toEqual({x: 'y'});
      });

      it('deletes params whose value is undefined', function() {
        router.route(this.searchRoute);
        router.params({a: 'b', c: 'd'});
        expect(router.params()).toEqual({a: 'b', c: 'd'});
        router.params({a: undefined, c: 'd'});
        expect(router.params()).toEqual({c: 'd'});
      });
    });

    describe('#urlFor', function() {
      it('returns the generated url for the given route', function() {
        expect(router.urlFor(this.indexRoute)).toBe('/foos');
        expect(router.urlFor(this.showRoute, {id: 9})).toBe('/foos/9');
        expect(router.urlFor(this.searchRoute, {query: 'abc', num: 9})).toBe('/search/abc/p9');
      });
    });

    describe('anchor click events', function() {
      beforeEach(function() {
        this.event = {
          which: 1,
          target: {nodeName: 'A', host: 'example.com', pathname: '/foos'},
          metaKey: false,
          preventDefault: jasmine.createSpy()
        };
      });

      it("invokes the callback for the route that matches the anchor's pathname", function() {
        router._handleClick(this.event);
        expect(this.indexSpy).toHaveBeenCalled();
      });

      it('locates the anchor element when the click event occurs on the child of an achor', function() {
        var a = this.event.target;
        this.event.target = {nodeName: 'IMG', parentNode: a};
        router._handleClick(this.event);
        expect(this.indexSpy).toHaveBeenCalled();
      });

      it('calls preventDefault on the event', function() {
        router._handleClick(this.event);
        expect(this.event.preventDefault).toHaveBeenCalled();
      });

      it('does not handle the event when the metaKey was pressed', function() {
        this.event.metaKey = true;
        router._handleClick(this.event);
        expect(this.indexSpy).not.toHaveBeenCalled();
        expect(this.event.preventDefault).not.toHaveBeenCalled();
      });

      it('does not handle the event when the ctrlKey was pressed', function() {
        this.event.ctrlKey = true;
        router._handleClick(this.event);
        expect(this.indexSpy).not.toHaveBeenCalled();
        expect(this.event.preventDefault).not.toHaveBeenCalled();
      });

      it('does not handle the event when which property is 2', function() {
        this.event.which = 2;
        router._handleClick(this.event);
        expect(this.indexSpy).not.toHaveBeenCalled();
        expect(this.event.preventDefault).not.toHaveBeenCalled();
      });

      it("does not handle the event when the anchor's hostname does not match the current hostname", function() {
        this.event.target.host = 'elsewhere.com';
        router._handleClick(this.event);
        expect(this.indexSpy).not.toHaveBeenCalled();
        expect(this.event.preventDefault).not.toHaveBeenCalled();
      });

      it('does handle the event when the anchor host reports the port number', function() {
        this.event.target.host = 'example.com:80';
        router._handleClick(this.event);
        expect(this.indexSpy).toHaveBeenCalled();
        expect(this.event.preventDefault).toHaveBeenCalled();
      });

      it('does handle the event when the location host reports the port number', function() {
        this.window.location.host = 'example.com:80';
        router._handleClick(this.event);
        expect(this.indexSpy).toHaveBeenCalled();
        expect(this.event.preventDefault).toHaveBeenCalled();
      });

      it('does handle the event when the anchor pathname does not include the leading slash', function() {
        this.event.target.pathname = 'foos';
        router._handleClick(this.event);
        expect(this.indexSpy).toHaveBeenCalled();
        expect(this.event.preventDefault).toHaveBeenCalled();
      });

      it('does not handle events that do not occur on or within an anchor element', function() {
        this.event.target.nodeName = 'BUTTON';
        router._handleClick(this.event);
        expect(this.indexSpy).not.toHaveBeenCalled();
        expect(this.event.preventDefault).not.toHaveBeenCalled();
      });

      it("does not handle the event when there is no matching route", function() {
        this.event.target.pathname = '/does/not/match';
        router._handleClick(this.event);
        expect(this.event.preventDefault).not.toHaveBeenCalled();
      });
    });
  });
});

}());
