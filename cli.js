#!/usr/bin/env node

/*
---
	@name Less Monitor
	@description Monitor and recompile your .less files and dependencies.
	@author Guilherme Dupont
	@version 0.2

	Work in progress

	Require:
		- Mootools
		- Less
		- Optimist
		- Moment.js
		- Colors

...
 */

(function() {

	'use strict';

	require('mootools');

	var colors = require('colors'),
		moment = require('moment');

	var options = require('optimist')
		.wrap(80)
		.usage('Usage: {OPTIONS}')
		.option('compress', {
			alias: 'c',
			desc: 'Compresses the output'
		})
		.option('directory', {
			alias: 'd',
			desc: 'Define the root directory to watch, if this is not defined the program will use the current working directory.'
		})
		.option('extension', {
			alias: 'e',
			desc: 'Sets the extension of the files that will be generated. Defaults to .css'
		})
		.option('files', {
			alias: ['find', 'f'],
			desc: 'Sets the extension of the files that will be watching. Defaults to .less'
		})
		.option('interval', {
			alias: 'ms',
			desc: 'Sets the interval in miliseconds of the files that will be watching. Defaults to 250'
		})
		.option('ignore', {
			alias: 'i',
			desc: 'Define the ignore file list. Can be a file or directory. Ex: src/_*.less'
		})
		.option('optimization', {
			alias: 'o',
			desc: 'Sets the optimization level for the less compiler, options are: 0, 1, and 2'
		})
		.option('help', {
			alias: 'h',
			desc: 'Show this message'
		})
		.check(function(argv) {
			if (argv.help) {
			throw '';
			}
		}).argv;

	// Remove unused options and alias
	delete options.$0;
	delete options._;
	Object.forEach(options, function(value, key) {
		if (key.length == 1) delete options[key];
	});

	// Start the application
	if (!options.help) {
		var app = require('./lib/less-monitor.js');

		app.setOptions(options);

		app.log = function() {
			var args = Array.slice(arguments, 0);
			var date = '[' + moment().format('MMM-DD HH:mm:ss') + ']';
			args.unshift(date.grey);
			console.log.apply(this, args);
		};

		app.once("init", function(err) {

			if (err) {
				process.exit();
			}

			// Start to find files
			this.log(new Array(62).join("=").grey);
			this.log(">".grey, "Finding",  this.options.files.cyan, "files");
			this.log(new Array(62).join("=").grey);

			// Output current options
			this.log(">".grey, "Current Options:".green);
			Object.forEach(this.options, function(value, option) {
				this.log(">".grey, option.capitalize().yellow, "=>".red, typeof value == "string" ? '"' + value + '"' : value.toString().cyan);
			}, this);
			this.log(new Array(62).join("=").grey);

		})
		.once("watch", function() {
			// watch started
			this.log("[Hint: Press Ctrl+C to quit.]".grey);
			this.log("Listing Done!".cyan);

		})
		.once("results", function(results) {

			Object.forEach(results, function(value, key) {
				this.log("Found".green, key, value ? ("[+" + value + "]").cyan : '');
			}, this);

		})
		.on("fileUpdated", function(file, dependencies) { 

			this.log("Updating:".yellow, file);

		})
		.on("parseComplete", function(file, outputFile) {

			this.log("Saving:".green, outputFile);

		})
		.on("parseError", function(file, outputFile) {

			this.log("Error parsing:".red, outputFile);
			this.log(new Array(62).join("-").grey + '\n');
			process.nextTick(function() {
				this.log(new Array(62).join("-").grey);
			}.bind(this));

		})
		.on("parseStart", function(file, outputFile) {

			this.log("Parsing to:".yellow, outputFile);

		})
		.on("error", function(e) {

			this.log("ERROR:".red, e.message);

		})
		.on("warn", function(w) {

			this.log("WARN:".yellow, w.message);

		})
		.init();

		process.on("exit", function() {
			console.warn("Quitting...");
		});
	}

	module.exports = app;

}());