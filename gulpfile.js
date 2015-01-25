var gulp = require("gulp");
var liveReload = require("gulp-livereload");

var paths = {
	htmlSrc: ["./**/*.html","./**/*.php", "!./node_modules/**/*"],
	jsSrc: ["./**/*.js", "!./node_modules/**/*"],
	cssSrc: ["./**/*.css", "!./node_modules/**/*"],
}

gulp.task("watch", function () {
	
	// start Live Reload server
	liveReload.listen();
	// Watch HTML
	gulp.watch(paths.htmlSrc).on("change", liveReload.changed);
	
	// Watch JS
	gulp.watch(paths.jsSrc).on("change", liveReload.changed);
	
	// Watch CSS
	gulp.watch(paths.cssSrc).on("change", liveReload.changed);
	
});

gulp.task("default", ["watch"]);

