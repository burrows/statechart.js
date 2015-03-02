default: spec

lint:
	./node_modules/.bin/jshint statechart.js --config ./jshint.json

spec: lint spec_node spec_browser

spec_node:
	./node_modules/.bin/jasmine

spec_browser:
	./node_modules/karma/bin/karma start ./karma.config.js

.PHONY: default lint spec spec_node spec_browser
