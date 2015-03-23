SOURCES = $(wildcard lib/*.js)

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

dist: dist/statechart.js dist/statechart.min.js

clean:
	rm -rf ./dist

.PHONY: default clean lint spec spec_node spec_browser dist
