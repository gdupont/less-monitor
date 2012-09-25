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

	TODO:
	[-] .log files

...
 */

( function() {

	'use strict';

	// ---------------------------------------------------------------
	// Dependencies
	// ---------------------------------------------------------------
	require('mootools');

	var colors = require('colors'),
		moment = require('moment');

	// ---------------------------------------------------------------
	// Start optimist command line tool
	// ---------------------------------------------------------------
	var options = require('optimist')
		.wrap(80)
		.usage( 'Usage: {OPTIONS}' )
		.option( 'directory', {
			alias: 'd',
			desc: 'Define the root directory to watch, if this is not defined the program will use the current working directory.'
		})
		.option( 'output', {
			alias: 'o',
			desc: 'Define the directory to output the files, if this is not defined the program will use the same directory from file.'
		})
		.option( 'match', {
			alias: 'm',
			desc: 'Matching files that will be processed. Defaults to **/*.less'
		})
		.option( 'extension', {
			alias: 'e',
			desc: 'Sets the extension of the files that will be generated. Defaults to .css'
		})
		.option( 'force', {
			alias: 'f',
			desc: 'Force to recompile all files on startup before start watching files.'
		})
		.option( 'ignore', {
			alias: 'i',
			desc: 'Define the ignore file list. Can be a file or directory. Ex: **/src/_*.less'
		})
		.option( 'interval', {
			alias: 't',
			desc: 'Sets the interval in miliseconds of the files that will be watching. Defaults to 250'
		})
		.option( 'nofollow', {
			alias: 'n',
			desc: 'If set will not follow @import dependencies. Defaults to false.'
		})
		.option( 'optimization', {
			alias: 'p',
			desc: 'Sets the optimization level for the less compiler, options are: 0, 1, and 2.'
		})
		.option( 'compress', {
			alias: 'c',
			desc: 'Compresses the output'
		})
		.option( 'silent', {
			alias: 's',
			desc: 'Sets to silent mode. Starts without log output.'
		})
		.option( 'options', {
			alias: 'u',
			desc: 'Show options on startup.'
		})
		.option( 'master', {
			alias: 'x',
			desc: 'Process only master files. Master files are not dependent from any others. Defaults to false'
		})
		.option( 'help', {
			alias: 'h',
			desc: 'Show this message'
		})
		.check( function( argv ) {
			if ( argv.help ) {
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
	var app = require( './lib/less-monitor.js' );

	// Set options used in optimist to the application 
	app.setOptions(options);

	// Silent mode
	if (options.silent) {
		return;
	}

	// ---------------------------------------------------------------
	// Add LOG functions
	// ---------------------------------------------------------------
	Object.merge(app, {
		log: function() {
			var args = Array.slice(arguments, 0);
			var date = '[' + moment().format( 'MMM-DD HH:mm:ss' ) + ']';
			args.unshift(date.grey);
			console.log.apply(this, args);
		},
		logLine: function(linebreak) {
			console.log();
		},
		logDivider: function(linebreak) {
			this.log(new Array(62).join( '-' ).grey + (linebreak ? '\n' : '' ));
		}
	});

	// ---------------------------------------------------------------
	// Watch events
	// ---------------------------------------------------------------
	app.once( 'init', function(err) {

		if ( err ) {
			process.exit();
		}

		// Start to find files
		this.log( new Array(62).join( '=' ).grey );
		this.log( '>'.grey, 'Finding',  this.options.match.cyan, 'files' );
		this.log( new Array(62).join( '=' ).grey );

		// Output current options
		if ( options.options ) {
			this.log( '>'.grey, 'Current Options:'.green );
			Object.forEach( this.options, function( value, option ) {
				this.log( '>'.grey, option.yellow, '=>'.red, typeof value == 'string' ? '"' + value + '"' : value.toString().cyan );
			}, this );
			this.log( new Array(62).join( '=' ).grey );
		}

		this.log( '[Hint: Press Ctrl+C to quit.]'.grey );
		this.logLine();
		this.log( 'Listing Done!'.cyan );
		this.logLine();

	})
	// ---------------------------------------------------------------
	// Watch started
	// ---------------------------------------------------------------
	.once( 'done', function() {

		this.logLine();
		this.log( 'Watch started.'.cyan );
		this.logLine();

	})
	// ---------------------------------------------------------------
	// Watch file is updated
	// ---------------------------------------------------------------
	.on( 'fileUpdated', function( file, dependencies ) { 

		this.log( 'Parsed'.yellow, '╒', file );

	})
	// ---------------------------------------------------------------
	// When a file is found and dependencies processed
	// ---------------------------------------------------------------
	.on( 'fileProcessed', function( file, dependencies ) { 

		var numDependencies = '';
		if ( dependencies.length == 1 ) {
			numDependencies = ('[+' + dependencies.length + ' dependency]');
		} else if ( dependencies.length > 1 ) {
			numDependencies = ('[+' + dependencies.length + ' dependencies]');
		}
		this.log( 'Found'.green, file, numDependencies.cyan );

	})
	// ---------------------------------------------------------------
	// When a file is removed
	// ---------------------------------------------------------------
	.on( 'fileRemoved', function( file, dependencies ) { 

		this.log( 'Removing'.yellow, file );

	})
	// ---------------------------------------------------------------
	// Parse completed, saving
	// ---------------------------------------------------------------
	.on( 'parseComplete', function( file, outputFile, last ) {

		this.log( 'Saving'.green, last ? '└' : '├', outputFile, '√' );

	})
	// ---------------------------------------------------------------
	// Parsed batch complete, if option --force was used
	// ---------------------------------------------------------------
	.on( 'parseCompleteAll', function( filesMap, options) {

		if (options.batch) {
			this.logLine();
			this.log( 'All files parsed.'.cyan );
			this.logLine();
		}

	})
	// ---------------------------------------------------------------
	// LESS parser found a error, output not saved
	// ---------------------------------------------------------------
	.on( 'parseError', function( file, outputFile) {

		this.log( 'Error parsing:'.red, file );
		this.logDivider( true );
		process.nextTick( function() {
			this.logDivider();
		}.bind(this));

	})
	// ---------------------------------------------------------------
	// Show application errors
	// ---------------------------------------------------------------
	.on( 'error', function(e) {

		this.log( 'ERROR:'.red, e.message );

	})
	// ---------------------------------------------------------------
	// Show application warning
	// ---------------------------------------------------------------
	.on( 'warn', function(w) {

		this.log( 'WARN:'.yellow, w.message );

	})
	// ---------------------------------------------------------------
	// Initialize NodeMonitor class
	// ---------------------------------------------------------------
	.init();

	// ---------------------------------------------------------------
	// Trigger message on process finish
	// ---------------------------------------------------------------
	process.on( 'exit', function() {
		console.warn( 'Quitting...' );
	});

	module.exports = app;

}());