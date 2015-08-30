/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var sequence = require('run-sequence').use(gulp);
var del = require('del');

function defaultTask(cb) {
  sequence(['lint', 'build'], cb);
}

function watch() {
  return gulp.watch('./src/**/*.js', ['default']);
}

function build(cb) {
  sequence('clean', 'compile', cb);
}

function compile() {
  return gulp.src('./src/**/*.js', { base: './src' })
    .pipe(plugins.plumber())
    .pipe(plugins.babel())
    .pipe(gulp.dest('./lib'));
}

function lint() {
  return gulp.src('./src/**/*.js')
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format());
}

function clean(cb) {
  del([
    './lib/**/*',
    './lib',
  ], cb);
}

gulp.task('default', defaultTask);
gulp.task('watch', watch);
gulp.task('compile', compile);
gulp.task('build', build);
gulp.task('lint', lint);
gulp.task('clean', clean);
