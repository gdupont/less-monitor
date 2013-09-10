# less-monitor

Monitor and recompile your .less files and dependencies.


## Features

- Watch and parse found files and @import dependencies.
- Automatic backwards @import parsing.
- You can write your own Plugin.
- Work in progress! More features to come.

```
[Sep-15 03:05:52] Found global.less [+5 dependencies]
[Sep-15 03:05:52] Found layout.less [+14 dependencies]
```

- Fully customizable. (see options)
- Work in progress! More features to come.

## Instalation

### Requirements:

- Node.js Platform and npm package manager:
  - [Visit node.js website](http://nodejs.org/).

### Installing less-monitor
```
npm install less-monitor -g
```

## Usage

Go to your .less folder and type:
```
less-monitor [options]
```

## Plugins
- [less-livereload](https://github.com/gdupont/less-livereload)

## Options

```
  --directory, -d     Define the root directory to watch, if this is not
                      defined the program will use the current working
                      directory.

  --output, -o        Define the directory to output the files, if this is not
                      defined the program will use the same directory from file.



  --match, -m         Matching files that will be processed. Defaults to
                      **/*.less

  --extension, -e     Sets the extension of the files that will be generated.
                      Defaults to .css

  --force, -f         Force to recompile all files on startup before start
                      watching files.

  --ignore, -i        Define the ignore file list. Can be a file or directory.
                      Ex: **/src/_*.less

  --interval, -t      Sets the interval in miliseconds of the files that will
                      be watching. Defaults to 250

  --nofollow, -n      If set will not follow @import dependencies. Defaults to
                      false.

  --optimization, -p  Sets the optimization level for the less compiler,
                      options are: 0, 1, and 2.

  --compress, -c      Compresses the output

  --silent, -s        Sets to silent mode. Starts without log output.

  --options, -u       Show options on startup.

  --master, -x        Process only master files. Master files are not dependent
                      from any others. Defaults to false

  --help, -h          Show this message
```

## License 

(The MIT License)

Copyright (c) 2012 Guilherme Dupont &lt;guilhermedupont@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
