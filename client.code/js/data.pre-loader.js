window.App = window.App || {};
window.App.preloader = {
	preloadTimeout : 30,
	preLoadImgs : function(prefix, imgNames, callback, progressCallback) {
		var self = this;
		var progress = 0;
		var progressStep;
		var err;
		if(imgNames == undefined || Object.prototype.toString.call(imgNames) !== "[object Array]") {
			err = new Error("imgNames to preload aren't an array: " + imgNames);
			return callback(err);
		}
		var timerId = window.setTimeout(function() {
			console.log("Preloading hasn't finished before timeout, which was " + self.preloadTimeout + " seconds.");
			return callback(err);
		}, self.preloadTimeout * 1000);
		var semaphore = imgNames.length;
		progressStep = 100 / imgNames.length;
		imgNames.forEach(function(aName) {
			var anImg = new Image();
			anImg.src = prefix + aName;
			anImg.onload = function() {
				semaphore--;
				progress += progressStep;
				progressCallback(progress);
				if(!semaphore) {
					window.clearTimeout(timerId);
					callback(err);
				}
				return;
			};
		});
	}
};