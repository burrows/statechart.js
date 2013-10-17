NODE_PATH := build
SPEC ?= ./spec

lint:
	./node_modules/.bin/jshint state.js --config ./jshint.json
