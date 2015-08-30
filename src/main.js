import fs from 'fs';
import path from 'path';
import {spawn} from 'child_process';
import extend from 'extend';
import gutil from 'gulp-util';
import through from 'through2';
import resolve from 'resolve';
import is from 'is_js';

const PluginError = gutil.PluginError;
const pkg = require(__dirname + '/../package.json');

export default function(options) {
  const defaults = {
    nodeCmd: 'node',
    tasks: ['default'],
  };
  const config = extend(true, defaults, options);

  return through.obj(function stream(file, enc, cb) {
    const self = this;

    gutil.log(`${pkg.name} started`);

    self.push(file);

    function log(message) {
      gutil.log(message);
    }

    function logError(message) {
      self.emit('error', new PluginError(pkg.name, message));
    }

    if (file.isStream()) {
      logError('streams are not supported');
      return cb();
    }

    const gulpfile = {};
    gulpfile.path = file.path;
    gulpfile.relPath = path.relative(process.cwd(), gulpfile.path);
    gulpfile.base = path.dirname(file.path);
    gulpfile.relBase = path.relative(process.cwd(), gulpfile.base);
    gulpfile.name = path.basename(gulpfile.path);
    gulpfile.ext = path.extname(gulpfile.name);

    if (file.isBuffer()) {
      const time = new Date().getTime();
      const tmpName = `${path.basename(gulpfile.name, gulpfile.ext)}.tmp.${time}.${gulpfile.ext}`;
      gulpfile.origPath = gulpfile.path;
      gulpfile.path = path.join(gulpfile.base, tmpName);
      gulpfile.tmpPath = gulpfile.path;
      gulpfile.origRelPath = gulpfile.relPath;
      gulpfile.relPath = path.relative(process.cwd(), gulpfile.path);
      gulpfile.name = tmpName;
      fs.writeFileSync(gulpfile.path, file.contents);
    }

    let localGulpPackage = null;
    let localGulpPackageBase = null;
    let localGulpCliPath = null;
    try {
      localGulpPackageBase = path.dirname(resolve.sync('gulp', { basedir: gulpfile.base }));
      localGulpPackage = require(path.join(localGulpPackageBase, 'package.json'));
      localGulpCliPath = path.resolve(path.join(localGulpPackageBase, localGulpPackage.bin.gulp));
    } catch(err) {
      logError(`Problem finding locally-installed 'gulp' for gulpfile ${gutil.colors.magenta( gulpfile.origPath )}`);
      return cb();
    }

    const cmd = config.nodeCmd;
    let args = [localGulpCliPath, '--gulpfile', gulpfile.name].concat(config.tasks);

    if (is.array(config.args) || is.string(config.args)) {
      args = args.concat(config.args);
    }

    log(`Spawning Process In ${gulpfile.base} With Args: ${args.join(' ')}`);

    const spawnedGulp = spawn(cmd, args, { cwd: gulpfile.base, stdio: 'inherit' });

    function logGulpfileOutput(data) {
      log(data.toString());
    }

    function removeTmpFile() {
      try {
        if (gulpfile.tmpPath) {
          log(`Removing tmp file ${gulpfile.tmpPath}`);
          fs.unlinkSync(gulpfile.tmpPath);
          return true;
        }
      } catch (e) {
        return false;
      }
    }

    spawnedGulp.on('error', (error) => {
      logError(`Error executing gulpfile ${gulpfile.path}`);
      logError(error);
    });

    spawnedGulp.on('exit', (exitCode) => {
      removeTmpFile();
      if (exitCode === 0) {
        gutil.log(`${pkg.name} complete, returning to parent gulpfile`);
      } else {
        logError(`Gulpfile ${gulpfile.path} exited with an error`);
      }
      cb();
    });

    process.on('SIGINT', removeTmpFile);
  });
}
