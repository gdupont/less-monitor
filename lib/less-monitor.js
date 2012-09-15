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
...
 */

/*
	TODO:
	[X] save async
	[x] option: force
	[x] option: output
	[-] recursive directory listing
	[-] watch created files
	[-] unwatch removed files
	[-] ignore files/directory option

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
		minimatch = require('minimatch');

	// ---------------------------------------------------------------
	// NodeMonitor Class
	// ---------------------------------------------------------------
	var NodeMonitor = new Class({

		Implements: [process.EventEmitter, Options],

		options: {

			directory: '',
			output: '',
			files: '*.less',
			extension: '.css',
			optimization: 0,
			compress: false,
			interval: 250,
			nofollow: false,
			ignore: "",

		},


		// ---------------------------------------------------------------
		// New instance
		// ---------------------------------------------------------------

		initialize: function(options) {
			this.setOptions(options);
			this.options.directory = path.relative(process.cwd(), this.options.directory) || '.';

			this.files = {};
			this.results = {};
			this.watchList = {};

			this.following = 0;
			this.parsing = 0;
		},


		// ---------------------------------------------------------------
		// Start
		// ---------------------------------------------------------------

		init: function() {

			this.listFiles(this.options.directory);
			this.emit("init");

			return this;
		},


		// ---------------------------------------------------------------
		// List directories for LESS files
		// ---------------------------------------------------------------

		listFiles: function(directory) {
			return fs.readdir(directory, function (err, files) {
				if (err) {
					this.emit("error", { message: 'Could not read directory "' + this.options.directory + '"', fatal: true });
				} else {

					// List directory files, matching .less files
					var foundFiles = [];
					Array.forEach(files, function (file) {
						if (minimatch(file, this.options.files)) {
							foundFiles.include(file);
						}
					}, this);

					// Follow @import dependencies
					if (!this.options.nofollow) {
						Array.forEach(foundFiles, function (file) {
							var node = this.append(file);
							this.follow(file, node);
						}, this);
					}

					// Sorry, no files found
					if (Object.getLength(this.files) === 0) {
						this.emit("warn", { message: 'No files found in directory "' + this.options.directory + '"', fatal: true });
					}

				}
			}.bind(this));
		},

		// ---------------------------------------------------------------
		// Append to file tree
		// ---------------------------------------------------------------

		append: function(file, branch) {

			branch = branch || this.files;

			if (!branch.hasOwnProperty(file)) {
				branch[file] = {};
			}

			return branch[file]; //return node

		},

		// ---------------------------------------------------------------
		// Follow @import dependencies
		// ---------------------------------------------------------------

		follow: function(file, branch) {
			this.following++;
			fs.readFile(file, 'utf8', function(err, data) {
				if (err) {
					this.emit("error", { message: 'Could not open file "' + file + '"' });
				} else {

					var imports = [],
						dir = path.dirname(file),
						re = /@import "(.*)";/gi,
						match;

					while ((match = re.exec(data)) !== null) {
						var fi = path.join(dir, match[1]);
						imports.include(fi);
					}

					imports.each(function(f) {
						if (!minimatch(path.basename(f), '*.less')) {
							f += '.less';
						}
						var node = this.append(f, branch);
						this.follow(f, node);
					}.bind(this));
				}

				// All files processed
				if (--this.following === 0) {
					process.nextTick(this.done.bind(this));
				}
			}.bind(this));

			return this;
		},

		// ---------------------------------------------------------------
		// Generate results from file tree
		// ---------------------------------------------------------------

		generateResults: function(obj) {
			var result = new Array();
			// try object keys + values filter (less code, but slower, i think)
			Object.forEach(obj, function(value, key) {
				result.include(key);
				if (Object.getLength(value) != 0) {
					result.append(this.generateResults(value));
				}
			}, this);
			return result;
		}.protect(),

		generateDependencies: function(obj, arr) {
			var result = new Object(), arr = Array.from(arr);
			Object.forEach(obj, function(value, key) {
				var from = arr.clone().include(key);
				result[key] = arr;
				Object.append(result, this.generateDependencies(value, from));
			}, this);
			return result;
		}.protect(),

		generateFileArray: function(obj) {
			var result = new Array();
			Object.forEach(obj, function(value, key) {
				result.include(key);
				if (Object.getLength(value) != 0) {
					var treeFiles = this.generateFileArray(value);
					result.combine(treeFiles);
				}
			}, this);
			return result;
		}.protect(),

		// ---------------------------------------------------------------
		// Done listing files/dependencies
		// ---------------------------------------------------------------

		done: function() {

			// Generate results
			Object.forEach(this.files, function(value, key) {
				var flattened = this.generateResults(value);
				this.results[key] = flattened.length;
			}, this);
			this.emit("results", this.results);

			// Force parse all found files
			if (this.options.force) {
				this.parseAll();
			}

			// Watch files
			process.nextTick(this.watch.bind(this));

			return this;

		},

		// ---------------------------------------------------------------
		// LESS Parser
		// ---------------------------------------------------------------
		parse: function(files, options) {

			// Map files as input: output
			var extension = path.extname(this.options.files);
			var filesMap = new Object();

			Array.from(files).forEach(function(file) {

				// Sets the output dir
				var outputDir = this.options.output || path.dirname(file),
					output = path.join(outputDir, path.basename(file, extension)) + this.options.extension;

				// Append to map
				filesMap[file] = output;

				// Read input file
				fs.readFile(file, 'utf-8', function(err, data) {


					if (err) {
						this.emit("error", { message: 'Could not open file "' + file + '"' });
					} else {
						

						// Add parsing file count
						this.parsing++;

						this.emit("parseStart", file, output);

						// Parse less file and generate less tree
						new less.Parser({

							paths: [path.dirname(file)],
							optimization: this.options.optimization,
							filename: file

						}).parse(data, function (err, tree) {

							if (err) {

								this.emit("parseError", file, output);
								less.writeError(err, { color: true });
								this.parsing--;

							} else {

								var css;
								// Process less tree to css
								try {
									css = tree.toCSS({
										compress: this.options.compress
									});
								} catch (e) {
									this.emit("parseError", file, output);
									less.writeError(e, { color: true });
									this.parsing--;
								}

								// Write the output file
								fs.writeFile(output, css, "utf8", function(err) {

									if (err) {
										this.emit("error", { message: 'Could not write file "' + output + '"' });
									} else {
										this.emit("parseComplete", file, output);
									}

									if (--this.parsing === 0) {
										// All files parsed
										process.nextTick(function() {
											this.emit("parseCompleteAll", filesMap, options);
										}.bind(this));
									}

								}.bind(this));
								
							}

						}.bind(this));
						// end // Parser

					}

				}.bind(this));
				// end // Read input file

			}.bind(this));

			return this;
		}, 

		parseAll: function() {
			var fileArray = this.generateFileArray(this.files);
			this.parse(fileArray, {
				batch: true
			});
		},

		// ---------------------------------------------------------------
		// Watch found files/dependencies
		// ---------------------------------------------------------------

		watch: function() {

			// Get watch list
			this.watchList = this.generateDependencies(this.files);
			this.emit("watch", this.watchList);

			// Watch files and auto-generate dependencies
			Object.forEach(this.watchList, function(dependencies, file) {
				fs.watchFile(file, { interval: this.options.interval }, function(curr, prev){
					this.emit("fileUpdated", file, dependencies);
					this.parse(dependencies.include(file));
				}.bind(this));
			}, this);

		}

	});

	module.exports = new NodeMonitor();

}()); 