/*
|--------------------------------------------------------------------------
| Gulpfile
|--------------------------------------------------------------------------
|
| buildfile for jquery.formulary plugin
|
*/

var gulp = require('gulp'),
  concat = require('gulp-concat'),
  uglify = require('gulp-uglify'),
  rename = require("gulp-rename");

gulp.task('default', function() {
  gulp.src(['./resources/plugin/js/main.js'])
    // normal
    .pipe(concat('dist/jquery.formulator.js'))
    .pipe(gulp.dest('.'))
    // min
    .pipe(uglify({ preserveComments: false }))
    .pipe(rename({ suffix : '.min' }))
    .pipe(gulp.dest('.'));
});

gulp.task('watch', function () {
  gulp.watch('src/jquery.formulator.js', ['default']);
});