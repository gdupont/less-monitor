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
	- recursive directory listing
	- ignore files/directory option
	- unwatch removed files
	- save async

	- write code comments
	- write tests
	- write docs
	- publish in npm.org

 */

(function() {

	'use strict';

	require('mootools');

	var fs = require('fs'),
		path = require('path'),
		less = require('less'),
		minimatch = require('minimatch'),
		async = require('async');

	var NodeMonitor = new Class({

		Implements: [process.EventEmitter, Options],

		options: {

			directory: '',
			files: '*.less',
			extension: '.css',
			optimization: 0,
			compress: false,
			interval: 250

		},

		initialize: function(options) {
			this.setOptions(options);
			this.options.directory = path.relative(process.cwd(), this.options.directory) || '.';

			this.files = {};
			this.results = {};
			this.watchList = {};

			this.incomplete = 0;
		},

		init: function() {

			this.listFiles(this.options.directory);
			this.emit("init");

			return this;
		},

		/* Tree Functions */
		listFiles: function(directory) {
			return fs.readdir(directory, function (err, files) {
				if (err) {
					this.emit("error", { message: 'Could not read directory "' + this.options.directory + '"', fatal: true });
				} else {

					// List directory files
					Array.forEach(files, function (f) {
						// Match input files
						if (minimatch(f, this.options.files)) {
							var file = "./" + f;
							var node = this.append(file);
							this.follow(file, node);
						}
					}, this);

					// Sorry, no files found
					if (Object.getLength(this.files) === 0) {
						this.emit("warn", { message: 'No files found in directory "' + this.options.directory + '"', fatal: true });
					}

				}
			}.bind(this));
		},

		append: function(file, branch) {

			branch = branch || this.files;

			if (!branch.hasOwnProperty(file)) {
				branch[file] = {};
			}

			return branch[file]; //return node

		},

		follow: function(file, branch) {
			this.incomplete++;
			fs.readFile(file, 'utf8', function(err, data) {
				if (err) {
					this.emit("error", { message: 'Could not open file "' + file + '"' });
				} else {
					var imports = [], dir = path.dirname(file) + '/';
					var match, re = /@import "(.*)";/gi;
					while ((match = re.exec(data)) !== null) {
						var fi = match[1];
						imports.push(dir + fi);
					}

					imports.each(function(f) {
						if (!minimatch(path.basename(f), "*.less")) {
							f += ".less";
						}
						var node = this.append(f, branch);
						this.follow(f, node);
					}.bind(this));
				}

				// All files processed
				if (--this.incomplete === 0) {
					process.nextTick(this.watch.bind(this));
				}
			}.bind(this));

			return this;
		},

		getResults: function(obj) {
			var result = new Array();
			// try object keys + values filter (less code, but slower, i think)
			Object.forEach(obj, function(value, key) {
				result.include(key);
				if (Object.getLength(value) != 0) {
					result.append(this.getResults(value));
				}
			}, this);
			return result;
		},

		getDependencies: function(obj, arr) {
			var result = new Object(), arr = Array.from(arr);
			Object.forEach(obj, function(value, key) {
				var from = arr.clone().include(key);
				result[key] = arr;
				Object.append(result, this.getDependencies(value, from));
			}, this);
			return result;
		},

		/* Watch files */
		watch: function() {
			this.emit("watch");

			// Generate results
			Object.forEach(this.files, function(value, key) {
				var flattened = this.getResults(value);
				this.results[key] = flattened.length;
			}, this);
			this.emit("results", this.results);

			// Get watch list
			this.watchList = this.getDependencies(this.files);
			this.emit("watchList", this.watchList);

			// Watch files
			Object.forEach(this.watchList, function(dependencies, file) {
				fs.watchFile(file, { interval: this.options.interval }, function(curr, prev){
					this.emit("fileUpdated", file, dependencies);
					this.parse(dependencies.include(file));
				}.bind(this));
			}, this);

			return this;

		},

		/* Parser */
		parse: function(files) {
			Array.from(files).forEach(function(file) {
				fs.readFile(file, 'utf-8', function(err, data) {
					if (err) {
						this.emit("error", { message: 'Could not open file "' + file + '"' });
					} else {
						var extension = path.extname(this.options.files);
						var output = path.basename(file, extension) + this.options.extension;
						this.emit("parseStart", file, output);
						new less.Parser({
							paths: [path.dirname(file)],
							optimization: this.options.optimization,
							filename: file
						}).parse(data, function (err, tree) {
							if (err) {
								this.emit("parseError", file, output);
								less.writeError(err, { color: true });
							} else {
								try {
									var css = tree.toCSS({ compress: this.options.compress });
									var fd = fs.openSync(output, "w");
									fs.writeSync(fd, css, 0, "utf8");
									this.emit("parseComplete", file, output);
								} catch (e) {
									this.emit("parseError", file, output);
									less.writeError(e, { color: true });
								}
							}
						}.bind(this));
					}
				}.bind(this));
			}.bind(this));

			return this;
		}

	});

	module.exports = new NodeMonitor();

}());