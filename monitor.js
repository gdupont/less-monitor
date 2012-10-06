/**
---
	@name Less Monitor
	@description Monitor and recompile your LESS files with automatic backwards @import parsing.
	@author Guilherme Dupont
	@version 0.2.0

	Styleguide:
		https://github.com/gdupont/idiomatic.js

	Work in progress

	Require:
		- mootools
		- less
		- minimatch
		- stalker

...
 */

module.exports = {

	app: require('./lib/app'),
	cli: require('./lib/cli'),
	version: '0.2.0'

};