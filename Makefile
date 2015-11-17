SOURCES = $(wildcard lib/*.js)

VERSION = $(shell node -e "console.log(JSON.parse(require('fs').readFileSync('./package.json')).version)")

default: spec

lint:
	./node_modules/.bin/jshint $(SOURCES) --config ./jshint.json

spec: lint spec_node spec_browser

spec_node:
	./node_modules/.bin/jasmine

spec_browser:
	./node_modules/karma/bin/karma start ./karma.config.js

dist/statechart.js: $(SOURCES)
	./node_modules/.bin/webpack --output-file $@

dist/statechart.min.js: $(SOURCES)
	./node_modules/.bin/webpack -p --output-file $@

package: dist/statechart.js dist/statechart.min.js

release:
	@echo Releasing $(VERSION)...
	npm publish
	git tag -a v$(VERSION) -m '$(VERSION) release'
	git push origin v$(VERSION)

clean:
	rm -rf ./dist

.PHONY: default clean lint spec spec_node spec_browser package release
