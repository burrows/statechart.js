NODE_PATH := build
SPEC ?= ./spec

default: spec

lint:
	./node_modules/.bin/jshint statechart.js --config ./jshint.json

spec: lint
	NODE_PATH=$(NODE_PATH) ./node_modules/.bin/jasmine

.PHONY: default lint spec
