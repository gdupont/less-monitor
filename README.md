# less-monitor

Monitor and recompile your .less files and dependencies.


## Features

- Follow and monitor @import files dependencies.

```
[Sep-15 03:05:52] Found global.less [+14 dependencies]
```

- Fully customizable. (see options)

- Work in progress! More features to come.


## Instalation

```
npm install -g https://github.com/gdupont/less-monitor/raw/master/npm/less-monitor-0.0.2.tgz
```

## Usage

Go to your .less folder and type:
```
less-monitor [options]
```

## Options

```
  --directory, -d     Define the root directory to watch, if this is not
                      defined the program will use the current working
                      directory.

  --output, -o        Define the directory to output the files, if this is not
                      defined the program will use the current file directory.

  --extension, -e     Sets the extension of the files that will be generated.
                      Defaults to .css

  --force, -f         Force to recompile all files on startup before start
                      watching files

  --interval, -t      Sets the interval in miliseconds of the files that will
                      be watching. Defaults to 250

  --nofollow, -n      Sets true to no follow and watch @import dependencies.
                      Defaults to false

  --optimization, -p  Sets the optimization level for the less compiler,
                      options are: 0, 1, and 2

  --compress, -c      Compresses the output

  --watch, -w         Sets the extension of the files that will be watching.
                      Defaults to .less
```

## TODO

- recursive directory listing
- watch created files
- unwatch removed files
- ignore files/directory option

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