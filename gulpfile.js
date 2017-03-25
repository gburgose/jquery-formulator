/*
|--------------------------------------------------------------------------
| Gulpfile
|--------------------------------------------------------------------------
|
| buildfile for jquery.formulary plugin
|
*/

var gulp              = require('gulp');
var concat            = require('gulp-concat');
var uglify            = require('gulp-uglify');
var rename            = require("gulp-rename");
var addsrc            = require('gulp-add-src');
var beautify          = require('gulp-beautify');
var removeEmptyLines  = require('gulp-remove-empty-lines');
var strip             = require('gulp-strip-comments');

/*
|--------------------------------------------------------------------------
| Default
|--------------------------------------------------------------------------
*/

gulp.task('js:default', function() {
  gulp.src(['./resources/plugin/js/main.js'])
    .pipe(concat('dist/jquery.formulator.js'))
    .pipe(beautify({indent_size: 2}))
    .pipe(strip())
    .pipe(removeEmptyLines({ removeComments: true }))
    .pipe(gulp.dest('.'));
});

/*
|--------------------------------------------------------------------------
| Minify
|--------------------------------------------------------------------------
*/

gulp.task('js:minify', function() {
  gulp.src(['./resources/plugin/js/main.js'])
    .pipe(concat('dist/jquery.formulator.js'))
    .pipe(uglify({ preserveComments: true }))
    .pipe(rename({ suffix : '.min' }))
    .pipe(gulp.dest('.'));
});

/*
|--------------------------------------------------------------------------
| Package
|--------------------------------------------------------------------------
*/

jsDependecies = [
  './node_modules/jquery-form/src/jquery.form.js',
  './node_modules/jquery-validation/dist/jquery.validate.js',
  './node_modules/jquery-validation/dist/additional-methods.js',
  './node_modules/jquery.rut/jquery.rut.js'
];

gulp.task('js:package', function() {
  gulp.src(['./resources/plugin/js/main.js'])
    .pipe(addsrc.prepend( jsDependecies ))
    .pipe(uglify({ preserveComments: false }))
    .pipe(rename({ suffix : '.min' }))
    .pipe(concat('dist/jquery.formulator.pkg.js'))
    .pipe(gulp.dest('.'));
});

/*
|--------------------------------------------------------------------------
| Build
|--------------------------------------------------------------------------
*/

gulp.task('build',['js:default', 'js:minify', 'js:package']);

/*
|--------------------------------------------------------------------------
| Watch
|--------------------------------------------------------------------------
*/

gulp.task('watch', function () {
  gulp.watch('./resources/plugin/js/main.js', ['js:default']);
});