/*
---
	@name Less Monitor
	@description Monitor and recompile your .less files and dependencies.
	@author Guilherme Dupont
	@version 0.4

	Styleguide:
		https://github.com/gdupont/idiomatic.js
		http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml

	Work in progress

	Require:
		- Mootools
		- Less

...
 */

/*
	TODO:
	[-] cache follow (won't process existing files) (use mtime)
	[-] get tree function
	[-] deep

	- write code comments
	- write tests
	- write docs
	- publish in npm.org

 */

(function() {

	'use strict';

	// ---------------------------------------------------------------
	// Dependencies
	// ---------------------------------------------------------------
	require('mootools');

	var fs = require('fs'),
		path = require('path'),
		less = require('less'),
		minimatch = require('minimatch'),
		stalker = require('stalker');

	// ---------------------------------------------------------------
	// NodeMonitor Class
	// ---------------------------------------------------------------
	var NodeMonitor = new Class({

		Implements: [process.EventEmitter, Options],

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


		// ---------------------------------------------------------------
		// New instance
		// ---------------------------------------------------------------

		initialize: function( options ) {
			this.setOptions(options);

			this.files = {};
			this.watchList = [];

			this.process = {};
			this.parsingPending = 0;

		},


		// ---------------------------------------------------------------
		// Start
		// ---------------------------------------------------------------

		init: function() {

			this.options.directory = path.relative( process.cwd(), this.options.directory ) || '.';

			// Ignore a file or a directory
			this.options.ignore.replace( '\\', '/' );

			if ( this.options.ignore && !path.basename(this.options.ignore).contains(".") ) {
				// Ignore all files from directory
				this.options.ignore += '/*.*';
			}

			this.scan( this.options.directory );
			this.emit( 'init' );

			return this;
		},

		// ---------------------------------------------------------------
		// Scan the directory for files
		// ---------------------------------------------------------------

		scan: function( directory ) {

			// Watch directory for removed/created files
			stalker.watch( this.options.directory, function( err, file ) {
				
				// File found
				var path = this.getRelativePath( file );
				this.found( path );

			}.bind(this), function( err, file ) {

				// File removed
				var path = this.getRelativePath( file );
				this.removed( path );

			}.bind(this) );

			return this;

		},

		getRelativePath: function( file ) {
			return path.relative( this.options.directory, file ).replace('\\', '/');
		},

		// ---------------------------------------------------------------
		// Filter to accept only files we need
		// ---------------------------------------------------------------
		accept: function( file ) {
			return !minimatch( file, this.options.ignore ) && minimatch( file, this.options.match );
		},

		// ---------------------------------------------------------------
		// Filter array of accepted files
		// ---------------------------------------------------------------
		filter: function( files ) {
			return Array.from( files ).filter(function ( file ) {
				return this.accept( file );
			}, this );
		},

		// ---------------------------------------------------------------
		// Generate {input: output} object map
		// ---------------------------------------------------------------
		outputMap: function( files ) {
			var map = {},
				inExt = path.extname( this.options.match ) || '.less',
				outExt = this.options.extension || '.css';

			Array.from( files ).each(function ( file ) {
				var outputDir = this.options.output || path.dirname( file ),
					output = path.join( outputDir, path.basename( file, inExt ) ) + outExt;

				output = output.replace( '\\', '/');

				map[ file ] = output;
			}, this);

			return map;

		},

		// ---------------------------------------------------------------
		// Found files (found by scan)
		// ---------------------------------------------------------------
		found: function( file ) {

			if ( this.accept( file ) ) {
				this.emit( 'fileFound', file );
				this.add( file );
			}

			return this;

		},

		// ---------------------------------------------------------------
		// Removed files (removed by scan)
		// ---------------------------------------------------------------
		removed: function( file ) {

			if ( this.accept( file ) ) {
				this.emit( 'fileRemoved', file );
				this.unwatch( file );
				this.dettach( file );
			}

			return this;

		},

		// ---------------------------------------------------------------
		// Add and process files
		// ---------------------------------------------------------------
		add: function( files ) {

			Array.from(files).forEach( function ( file ) {
				if ( !this.options.nofollow ) {
					this.follow( file, this.fileProcessed );
				} else {
					this.append( file );
					this.fileProcessed( file );
				}
			}, this );

			return this;

		},

		// ---------------------------------------------------------------
		// Verify if a file already exists
		// ---------------------------------------------------------------
		exists: function( file ) {

			return this.files.hasOwnProperty( file );

		},

		// ---------------------------------------------------------------
		// Append to file tree
		// ---------------------------------------------------------------

		append: function( file, dependencies ) {

			this.files[ file ] = Array.from(dependencies);

			return this;

		},

		// ---------------------------------------------------------------
		// Dettach from file tree
		// ---------------------------------------------------------------

		dettach: function( file ) {

			delete this.files[ file ];

			return this;

		},

		// ---------------------------------------------------------------
		// Follow @import dependencies
		// @ file - path of the file to be processed
		// @ root - root file used for processing (optional, used in recursion)
		// @ callback - callback to be triggered when processing done
		// ---------------------------------------------------------------

		follow: function( file, root, callback ) {

			if (!callback & typeof root == 'function') {
				callback = root;
				root = file;
			}
			
			this.processing( root, true, callback );

			fs.readFile( file, 'utf8', function( err, data ) {

				if ( err ) {

					this.emit( 'error', { message: 'Could not open file "' + file + '"' });

				} else {

					var imports = new Array(),
						dir = path.dirname( file ),
						re = /@import "(.*)";/gi,
						match;

					// Match all @imports
					while ( ( match = re.exec( data ) ) !== null ) {
						var fi = this.getRelativePath( path.join( dir, match[1] ) );
						imports.include( fi );
					}

					// Add .less extension if no extension specified
					imports = imports.map(function( f ) {
						return minimatch(path.basename( f ), '*.less') ? f  : f + '.less';
					});

					// Add to file dependencies list
					this.append( file, imports );

					// Recursivelly follow all dependencies
					imports.each( function( f ) {
						this.follow( f, root );
					}.bind(this) );
				}

				// decrease processing to trigger when done
				this.processing( root, false );

			}.bind(this) );

			return this;
		},

		update: function( file ) {
			this.follow( file, function() {
				var parseList = this.reverseLookup( file );
				parseList.include( file );

				this.emit( 'fileUpdated', file, parseList );
				this.parse( parseList );
			});

			return this;
		},

		// ---------------------------------------------------------------
		// Process list
		// ---------------------------------------------------------------
		processing: function( file, add, callback ) {

			// All processes
			if ( !this.process.hasOwnProperty( '*' ) ) {
				this.process[ '*' ] = { count: 0, callback: this.done };
			}

			// File process
			if ( add ) {

				if ( !this.process.hasOwnProperty( file ) ) {
					this.process[ file ] = { count: 1 };
				} else {
					this.process[ file ].count++;
				}

				if (typeof callback == 'function') {
					this.process[ file ].callback = callback;
				}

				this.process[ '*' ].count++;

			} else {
				this.process[ file ].count--;
				this.process[ '*' ].count--;
			}

			// File done
			if ( this.process[ file ].count === 0 ) {
				this.process[ file ].callback.call( this, file );
			}

			// All done
			if ( this.process[ '*' ].count === 0 ) {
				process.nextTick( this.process[ '*' ].callback.bind(this) );
			}

			return this.process;

		},

		// ---------------------------------------------------------------
		// File processed all @imports
		// ---------------------------------------------------------------
		fileProcessed: function( file ) {
			var dependencies = this.lookup( file );
			this.emit( 'fileProcessed', file, dependencies);
			this.watch( file );

			return this;
		},

		// ---------------------------------------------------------------
		// Done listing files/dependencies
		// ---------------------------------------------------------------
		done: function() {

			// Force parse all found files
			if ( this.options.force ) {
				this.parseAll();
			}

			this.emit( 'done' );

			return this;

		},

		// ---------------------------------------------------------------
		// LESS Parser (async mode)
		// ---------------------------------------------------------------
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
					return this.reverseLookup( file ).length == 0;
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
				fs.readFile(file, 'utf-8', function( err, data ) {

					if (err) {
						this.emit( 'error', { message: 'Could not open file "' + file + '"' });
					} else {
						
						// Add parsing file count
						this.parsingPending++;

						this.emit( 'parseStart', file, output );

						// Parse less file and generate less tree
						new less.Parser({

							paths: [ path.dirname(file) ],
							optimization: this.options.optimization,
							filename: file

						}).parse( data, function ( err, tree ) {

							if ( err ) {

								this.emit( 'parseError', file, output );
								less.writeError( err, { color: true } );
								this.parsingPending--;

							} else {

								var css;
								// Process less tree to css
								try {
									css = tree.toCSS({
										compress: this.options.compress
									});
								} catch (e) {
									this.emit( 'parseError', file, output );
									less.writeError( e, { color: true } );
									this.parsingPending--;
								}

								// Write the output file
								fs.writeFile( output, css, "utf8", function( err ) {

									if ( err ) {
										this.emit( 'error', { message: 'Could not write file "' + output + '"' } );
									} else {
										pending.erase( file );
										this.emit( 'parseComplete', file, output, pending.length == 0 );
									}

									if ( --this.parsingPending === 0 ) {
										// All files parsed
										process.nextTick(function() {
											this.emit( 'parseCompleteAll', outputMap, options );
										}.bind(this) );
									}

								}.bind(this) );
								
							}

						}.bind(this) );
						// end // Parser

					}

				}.bind(this) );
				// end // Read input file

			}.bind(this) );

			return this;
		}, 

		// ---------------------------------------------------------------
		// Parse all files found
		// ---------------------------------------------------------------
		parseAll: function() {
			var fileArray = new Array();

			Object.forEach(this.files, function( value, key ) {
				fileArray.include( key );
				fileArray.combine( value );
			}, this );

			this.parse(fileArray, {
				batch: true
			});

			return this;
		},

		// ---------------------------------------------------------------
		// Lookup for dependencies
		// ---------------------------------------------------------------
		lookup: function( file ) {
			var result = new Array(),
				dependencies = Array.from( this.files[ file ] );

			Array.forEach( dependencies, function( dependency ) {
				result.include( dependency );
				result.combine( this.lookup( dependency ) );
			}, this );

			return result;
		},

		// ---------------------------------------------------------------
		// Reverse Lookup for dependencies
		// ---------------------------------------------------------------
		reverseLookup: function( dependency ) {
			var result = new Array();

			Object.forEach( this.files , function( fileList, file ) {
				if ( fileList.contains( dependency ) ) {
					result.include( file );
					result.combine( this.reverseLookup( file ) );
				}
			}, this );

			return result;
		},

		// ---------------------------------------------------------------
		// Watch files and found dependencies
		// ---------------------------------------------------------------
		watch: function( file ) {
			var watchFiles = this.lookup( file );
			watchFiles.include( file );

			Array.forEach( watchFiles, function( watchFile ) {

				// Verify file is already beign watched
				if ( !this.watchList.contains( watchFile ) ) {
					fs.watchFile( watchFile, { interval: this.options.interval }, function() {
						this.update( watchFile );
					}.bind(this) );
				}

				this.watchList.include( watchFile );

			}, this );

			return this;
		},

		// ---------------------------------------------------------------
		// Unwatch a file
		// ---------------------------------------------------------------
		unwatch: function( file ) {
			fs.unwatchFile( file );
			delete this.watchList[ file ];

			return this;
		}

	});

	module.exports = new NodeMonitor();

}()); 