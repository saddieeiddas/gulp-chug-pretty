'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _child_process = require('child_process');

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _gulpUtil = require('gulp-util');

var _gulpUtil2 = _interopRequireDefault(_gulpUtil);

var _through2 = require('through2');

var _through22 = _interopRequireDefault(_through2);

var _resolve = require('resolve');

var _resolve2 = _interopRequireDefault(_resolve);

var _is_js = require('is_js');

var _is_js2 = _interopRequireDefault(_is_js);

var PluginError = _gulpUtil2['default'].PluginError;
var pkg = require(__dirname + '/../package.json');

exports['default'] = function (options) {
  var defaults = {
    nodeCmd: 'node',
    tasks: ['default']
  };
  var config = (0, _extend2['default'])(true, defaults, options);

  return _through22['default'].obj(function stream(file, enc, cb) {
    var self = this;

    _gulpUtil2['default'].log(pkg.name + ' started');

    self.push(file);

    function log(message) {
      _gulpUtil2['default'].log(message);
    }

    function logError(message) {
      self.emit('error', new PluginError(pkg.name, message));
    }

    if (file.isStream()) {
      logError('streams are not supported');
      return cb();
    }

    var gulpfile = {};
    gulpfile.path = file.path;
    gulpfile.relPath = _path2['default'].relative(process.cwd(), gulpfile.path);
    gulpfile.base = _path2['default'].dirname(file.path);
    gulpfile.relBase = _path2['default'].relative(process.cwd(), gulpfile.base);
    gulpfile.name = _path2['default'].basename(gulpfile.path);
    gulpfile.ext = _path2['default'].extname(gulpfile.name);

    if (file.isBuffer()) {
      var time = new Date().getTime();
      var tmpName = _path2['default'].basename(gulpfile.name, gulpfile.ext) + '.tmp.' + time + '.' + gulpfile.ext;
      gulpfile.origPath = gulpfile.path;
      gulpfile.path = _path2['default'].join(gulpfile.base, tmpName);
      gulpfile.tmpPath = gulpfile.path;
      gulpfile.origRelPath = gulpfile.relPath;
      gulpfile.relPath = _path2['default'].relative(process.cwd(), gulpfile.path);
      gulpfile.name = tmpName;
      _fs2['default'].writeFileSync(gulpfile.path, file.contents);
    }

    var localGulpPackage = null;
    var localGulpPackageBase = null;
    var localGulpCliPath = null;
    try {
      localGulpPackageBase = _path2['default'].dirname(_resolve2['default'].sync('gulp', { basedir: gulpfile.base }));
      localGulpPackage = require(_path2['default'].join(localGulpPackageBase, 'package.json'));
      localGulpCliPath = _path2['default'].resolve(_path2['default'].join(localGulpPackageBase, localGulpPackage.bin.gulp));
    } catch (err) {
      logError('Problem finding locally-installed \'gulp\' for gulpfile ' + _gulpUtil2['default'].colors.magenta(gulpfile.origPath));
      return cb();
    }

    var cmd = config.nodeCmd;
    var args = [localGulpCliPath, '--gulpfile', gulpfile.name].concat(config.tasks);

    if (_is_js2['default'].array(config.args) || _is_js2['default'].string(config.args)) {
      args = args.concat(config.args);
    }

    log('Spawning Process In ' + gulpfile.base + ' With Args: ' + args.join(' '));

    var spawnedGulp = (0, _child_process.spawn)(cmd, args, { cwd: gulpfile.base, stdio: 'inherit' });

    function logGulpfileOutput(data) {
      log(data.toString());
    }

    function removeTmpFile() {
      try {
        if (gulpfile.tmpPath) {
          log('Removing tmp file ' + gulpfile.tmpPath);
          _fs2['default'].unlinkSync(gulpfile.tmpPath);
          return true;
        }
      } catch (e) {
        return false;
      }
    }

    spawnedGulp.on('error', function (error) {
      logError('Error executing gulpfile ' + gulpfile.path);
      logError(error);
    });

    spawnedGulp.on('exit', function (exitCode) {
      removeTmpFile();
      if (exitCode === 0) {
        _gulpUtil2['default'].log(pkg.name + ' complete, returning to parent gulpfile');
      } else {
        logError('Gulpfile ' + gulpfile.path + ' exited with an error');
      }
      cb();
    });

    process.on('SIGINT', removeTmpFile);
  });
};

module.exports = exports['default'];