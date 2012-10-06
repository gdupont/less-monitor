/*jslint node: true */
/*global Class: true, Options: true*/

'use strict';

 /**
  * Dependencies
  */
require('mootools');

var fs = require('fs'),
	path = require('path'),
	less = require('less'),
	minimatch = require('minimatch'),
	stalker = require('stalker');

/**
 * Monitor Class
 * @type {Class}
 */
var Monitor = new Class({

	Implements: [ process.EventEmitter, Options ],

	options: {

		directory: '',
		output: '',
		match: '**/*.less',
		ignore: '',
		extension: '.css',
		optimization: 0,
		compress: false,
		interval: 250,
		nofollow: false,
		master: false

	},

	/**
	 * Class constructor
	 *
	 * @construtor
	 */
	initialize: function() {

		this.files = {};
		this.filesCache = {};
		this.watchList = [];

		this.process = {};
		this.parsePending = 0;

	},


	/**
	 * Initialize the instance and start to scan directories
	 *
	 * @return {object} Class instance
	 */
	init: function( options ) {
		this.setOptions( options );

		this.options.directory = path.relative( process.cwd(), this.options.directory ) || '.';

		// Ignore a file or a directory
		this.options.ignore = this.options.ignore.split( '\\' ).join( '/' );

		if ( this.options.ignore && !path.basename( this.options.ignore ).contains(".") ) {
			// Ignore all files from directory
			this.options.ignore += '/*.*';
		}

		this.scan( this.options.directory );
		this.emit( 'init', this.options );

		return this;
	},

	/**
	 * scan Scan the directory for files
	 *
	 * @return {object} Class instance
	 */
	scan: function( directory ) {

		var queue = [];

		var check = function() {
			if ( queue.length === 0 ) {
				process.nextTick(this.done.bind(this));
			}
		};

		// Watch directory for removed/created files
		stalker.watch( this.options.directory, function( err, file ) {
			
			if (err) {
				return;
			}

			// File found
			var path = this.getRelativePath( file );

			// Add to queue list
			if ( this.isAccepted( file ) ) {
				queue.include( path );
			}

			this.found( path, function( fileFound ) {
				// File processed, remove from queue list
				queue.erase( fileFound );
				// Check if file queue is done
				check.call( this );
			});

		}.bind(this), function( err, file ) {

			// File removed
			var path = this.getRelativePath( file );
			this.removed( path );

		}.bind(this) );

		return this;

	},

	/**
	 * Get the relative path from directory specified on options
	 *
	 * @param  {string} file  Full path of the file
	 * @return {string}       Relative path of the file
	 */
	getRelativePath: function( file ) {
		return path.relative( this.options.directory, file ).split( '\\' ).join( '/' );
	},


	/**
	 * Get the absolute path from directory specified on options
	 *
	 * @param  {string} file  Full path of the file
	 * @return {string}       Relative path of the file
	 */
	getAbsolutePath: function( file ) {
		return path.join( this.options.directory, file );
	},

	/**
	 * Filter to accept only files matched and not ignored
	 *
	 * @return {boolean} File is accepted
	 */
	isAccepted: function( file ) {
		return !minimatch( file, this.options.ignore ) && minimatch( file, this.options.match );
	},

	/**
	 * Filter array of accepted files
	 *
	 * @param  {array} files  Files array
	 * @return {array}        Mapped array of accepted files
	 */
	filter: function( files ) {
		return Array.from( files ).filter( function ( file ) {
			return this.isAccepted( file );
		}, this );
	},

	/**
	 * Generate output map for the specified files
	 *
	 * @param  {array}  files  Files array
	 * @return {object}        Mapped object as {input: output}
	 */
	outputMap: function( files ) {
		var map = {},
			inExt = path.extname( this.options.match ) || '.less',
			outExt = this.options.extension || '.css';

		Array.from( files ).each( function ( file ) {
			var outputDir = this.options.output || path.dirname( file ),
				output = path.join( outputDir, path.basename( file, inExt ) ) + outExt;

			output = output.split( '\\' ).join( '/' );

			map[ file ] = output;
		}, this);

		return map;

	},

	/**
	 * Found files (found by scan)
	 *
	 * @param  {string} file  File path that is found, to be added on file tree
	 * @return {object}       Class instance
	 */
	found: function( file, callback ) {
		callback = callback || function() {};

		if ( this.isAccepted( file ) ) {
			this.emit( 'fileFound', file );
			this.add( file, function( fileFound ) {
				this.fileProcessed( fileFound );
				callback.call( this, fileFound );
			});
		}

		return this;

	},

	/**
	 * Removed files (removed by scan)
	 *
	 * @param  {string} file  File path to be removed from file tree
	 * @return {object}       Class instance
	 */
	removed: function( file ) {

		if ( this.isAccepted( file ) ) {
			this.emit( 'fileRemoved', file );
			this.unwatch( file );
			this.dettach( file );
		}

		return this;

	},

	/**
	 * Verify if a file already exists
	 *
	 * @param  {string}    file  Path of the file
	 * @return {boolean}         Exists on the file tree
	 */
	exists: function( file ) {

		return this.files.hasOwnProperty( file );

	},

	/**
	 * Append to file tree
	 *
	 * @param  {string}   file          Path of the file
	 * @param  {array}    dependencies  Array of file dependencies
	 * @return {object}                 Class instance
	 */
	append: function( file, dependencies ) {

		this.files[ file ] = Array.from( dependencies );

		return this;

	},

	/**
	 * Dettach from file tree
	 *
	 * @param {string}    file  Path of the file
	 */
	dettach: function( file ) {

		delete this.files[ file ];
		delete this.filesCache[ file ];

		return this;

	},

	/**
	 * Verify file is updated
	 * using mtime from stat
	 *
	 * @param  {string}   file     File path
	 * @param  {Function} callback
	 *
	 * @return {object}            Class instance
	 */
	isExpired: function( file, callback ) {

		var filePath = this.getAbsolutePath( file );

		fs.stat( filePath, function( err, stat ) {
			if ( err ) {
				this.emit( 'error', { message: 'Could not open file "' + file + '"' });
				return;
			} else {
				var modified = +stat.mtime > +(this.filesCache[ file ] || 0);
				this.filesCache[ file ] = +stat.mtime;
				callback.call( this, modified );
			}
		}.bind(this));

		return this;

	},

	/**
	 * Add files and all dependencies
	 *
	 * @param  {string}   file     File path
	 * @param  {Function} callback
	 *
	 * @return {object}              Class instance
	 */
	add: function( file, callback ) {

		callback = callback || function() {};

		// If follow option provided, no lookup needed
		if ( this.options.nofollow ) {
			this.append( file );
			callback.apply( this, file );
			return;
		}

		var queue = [],
			dependencies = [];

		var next = function( nextFile ) {
			
			return this.lookupFile( nextFile, function( currentFile, imports ) {
				// Prevent call stack
				if ( imports.contains( currentFile ) ) {
					this.emit('error', { message: currentFile + " can't import itself", fatal: true });
				}

				// Add root dependencies
				dependencies.append( imports );

				// Add next queues
				queue.append( imports );

				// Remove processed queue
				queue.erase( currentFile );

				// Append to global file tree
				this.append( currentFile, imports );

				if ( queue.length === 0 ) {
					// Job done
					callback.apply( this, [ file, dependencies ] );
				} else {
					// Process next imports
					imports.forEach( function( dependency ) {
						next.call( this, dependency );
					}, this);
				}
			});

		};

		next.call( this, file );

		return this;
	},

	/**
	 * Lookup for file dependencies
	 *
	 * @param  {string}   file       File path
	 * @param  {Function} callback
	 *
	 * @return {object}              Class instance
	 */
	lookupFile: function( file, callback ) {

		var filePath = this.getAbsolutePath( file );
		this.isExpired( file, function( expired ) {

			if ( expired ) {

				fs.readFile( filePath, 'utf8', function( err, data ) {

					if ( err ) {
						this.emit( 'error', { message: 'Could not open file "' + file + '"' });
					} else {

						var dir = path.dirname( filePath ),
							re = /@import "(.*)";/gi,
							imports = [],
							match;

						// Match all @imports
						while ( ( match = re.exec( data ) ) !== null ) {
							var fi = this.getRelativePath( path.join( dir, match[1] ) );
							imports.include( fi );
						}

						// Add .less extension if no extension specified
						imports = imports.map( function( f ) {
							return path.extname( f ) ? f  : f + '.less';
						});

						// Callback function
						if ( typeof callback == 'function' ) {
							callback.apply( this, [file, imports] );
						}
					}

				}.bind(this));

			} else {

				// Use cache
				if ( typeof callback == 'function' ) {
					var imports = Array.from( this.files[ file ] );
					callback.apply( this, [file, imports] );

				}

			}
		});

		return this;
	},

	/**
	 * Update a file after watch
	 *
	 * @param  {string}  file  File path
	 * @return {object}        Class instance
	 */
	update: function( file ) {
		this.add( file, function( fileUpdated, dependencies ) {
			var parseList = this.reverseLookup( fileUpdated );

			this.emit( 'fileUpdated', file, parseList );

			parseList.include( file );
			this.parse( parseList );
			this.watch( file );
		});

		return this;
	},

	/**
	 * File processed
	 *
	 * @param  {string}  file  File path
	 * @return {object}        Class instance
	 */
	fileProcessed: function( file ) {
		var dependencies = this.lookup( file );
		this.emit( 'fileProcessed', file, dependencies);
		this.watch( file );

		return this;
	},

	/**
	 * Done listing files/dependencies
	 *
	 * @return {object} Class instance
	 */
	done: function() {

		// Force parse all found files
		if ( this.options.force ) {
			this.parseAll();
		}

		this.emit( 'done' );

		return this;

	},

	/**
	 * Parse files in async mode
	 *
	 * @param  {array}   files
	 * @param  {object}  options
	 * @return {object}           Class instance
	 */
	parse: function( files, options ) {

		// Default options
		options = Object.merge( options || {}, {
			batch: false,
			master: this.options.master
		});

		// Filter only accepted files
		files = this.filter( files );

		// Filter master files if option passed
		// Master files are not dependent from any others
		if ( options.master ) {
			files = Array.filter( files, function( file ) {
				return this.reverseLookup( file ).length === 0;
			}, this );
		}

		// Map files as input: output
		var outputMap = this.outputMap( files );

		// Clone file list to remove each file after parsing
		var pending = Array.from( files ).clone();

		// Parse each file
		Array.forEach( files, function( file ) {

			var output = outputMap[ file ];

			// Read input file
			var filePath = this.getAbsolutePath( file );
			fs.readFile( filePath, 'utf-8', function( err, data ) {

				if ( err ) {
					this.emit( 'error', { message: 'Could not open file "' + file + '"' });
				} else {
					
					// Add parsing file count
					this.parsePending++;

					this.emit( 'parseStart', file, output );

					// Parse less file and generate less tree
					new less.Parser({

						paths: [ path.dirname( filePath ) ],
						optimization: this.options.optimization,
						filename: file

					}).parse( data, function ( err, tree ) {

						if ( err ) {

							this.emit( 'parseError', file, output );
							less.writeError( err, { color: true } );
							this.parsePending--;

						} else {

							var css,
								parseError = false;
							// Process less tree to css
							try {
								css = tree.toCSS({
									compress: this.options.compress
								});
							} catch ( e ) {
								this.emit( 'parseError', file, output );
								less.writeError( e, { color: true } );
								this.parsePending--;
								parseError = true;
							}

							// Write the output file
							if ( !parseError ) {
								fs.writeFile( this.getAbsolutePath( output ), css, "utf8", function( err ) {

									if ( err ) {
										this.emit( 'error', { message: 'Could not write file "' + output + '"' } );
									} else {
										pending.erase( file );
										this.emit( 'parseComplete', file, output, pending.length === 0 );
									}

									if ( --this.parsePending === 0 ) {
										// All files parsed
										process.nextTick( function() {
											this.emit( 'parseCompleteAll', outputMap, options );
										}.bind(this) );
									}

								}.bind(this) );
							}
							
						}

					}.bind(this) );
					// end // Parser

				}

			}.bind(this) );
			// end // Read input file

		}.bind(this) );

		return this;
	},

	/**
	 * Parse all files found
	 *
	 * @return {object}       Class instance
	 */
	parseAll: function() {
		var fileArray = [];

		Object.forEach( this.files, function( value, key ) {
			fileArray.include( key );
			fileArray.combine( value );
		}, this );

		this.parse( fileArray, {
			batch: true
		});

		return this;
	},

	/**
	 * Lookup for forward dependencies
	 *
	 * @param  {string} file
	 * @return {array}
	 */
	lookup: function( file ) {
		var result = [],
			dependencies = Array.from( this.files[ file ] );

		Array.forEach( dependencies, function( dependency ) {
			result.include( dependency );
			result.combine( this.lookup( dependency ) );
		}, this );

		return result;
	},

	/**
	 * Lookup for backward dependencies
	 *
	 * @param dependecy {string}
	 */
	reverseLookup: function( dependency ) {
		var result = [];

		Object.forEach( this.files , function( fileList, file ) {
			if ( fileList.contains( dependency ) ) {
				result.include( file );
				result.combine( this.reverseLookup( file ) );
			}
		}, this );

		return result;
	},

	/**
	 * Watch files and found dependencies
	 *
	 * @param  {string}  file  File path to watch
	 * @return {object}        Class instance
	 */
	watch: function( file ) {
		var watchFiles = this.lookup( file );
		watchFiles.include( file );

		Array.forEach( watchFiles, function( watchFile ) {

			// Verify file is already beign watched
			if ( !this.watchList.contains( watchFile ) ) {
				fs.watchFile( this.getAbsolutePath( watchFile ), { interval: this.options.interval }, function() {
					this.update( watchFile );
				}.bind(this) );
			}

			this.watchList.include( watchFile );

		}, this );

		return this;
	},

	/**
	 * Unwatch a file
	 *
	 * @param  {string}  file  File path to unwatch
	 * @return {object}        Class instance
	 */
	unwatch: function( file ) {
		fs.unwatchFile( file );
		delete this.watchList[ file ];

		return this;
	}

});

exports = module.exports = new Monitor();