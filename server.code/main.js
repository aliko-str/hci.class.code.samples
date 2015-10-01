var _rootF = "../../";
var classes = require(_rootF + "helpers/classes.js");
var fs = require('fs');
var path = require('path');
var util = require(_rootF + "helpers/util.js");
var notFoundLogger = require(_rootF + "helpers/not.found.logger.js");
var stringCache = new classes.StringCache(path.resolve(__dirname, path.join("..", "client.code", "data", "strings2_2_1.txt")));
var Q = require("q");
var async = require("async");

var settings = {
	numOfImgPerSession : 20
};

function init(ifDebugApp) {
	var dataLayer = require("./data.layer.js").init(ifDebugApp);
	var testResBuilder = require("./test.result.builder.js").init(ifDebugApp);

	var _initPromise = (function _init() {
		var defer = Q.defer();
		require("./stimuli.management.js").init(ifDebugApp).addMissingStimuli(function(paramObj) {
			if(paramObj.code != 200) {
				defer.reject(new Error(paramObj.message));
			} else {
				defer.resolve(paramObj);
			}
		});
		return defer.promise;
	})();

	function checkIfExpSessionFinished(sessionId, onDone) {
		dataLayer.getSessionById(sessionId, function(paramObj) {
			if(paramObj.isErr()) {
				throw new Error(paramObj.message);
			}
			if(!paramObj.data.length) {
				throw new Error("The requested session (assignedId = " + sessionId + ") does not exits");
			}
			onDone(new classes.CallbackParam(200, paramObj.data[0].ifFinished, ""));
		});
	}
	function saveDemogr(dataObj, lang, onDone) {
		dataObj["lang"] = lang;
		dataLayer.createSession(dataObj, onDone);
	}
	function saveTestRes(sessionId, stimulusIdRatingPairArr, onDone) {
		dataLayer.saveRatings(sessionId, stimulusIdRatingPairArr, onDone);
	}
	function calcUserPerformace(sessionId, onDone) {
		testResBuilder.computeTestResult(sessionId, onDone);
	}
	function selectImgForTest(onDone) {
		dataLayer.getStimuliLessShown(settings.numOfImgPerSession, function(paramObj) {
			if(!paramObj.isErr()) {
				paramObj.data = paramObj.data.map(function(aStimulus) {
					return {
						id : aStimulus.id,
						codeName : aStimulus.codeName
					};
				});
			}
			onDone(paramObj);
		});
	}
	function saveFeedback(sessionId, feedbackStr, onDone) {
		var err;
		if(!feedbackStr) {
			err = "feedbackStr is empty";
		} else if(Object.prototype.toString.call(feedbackStr) !== "[object String]") {
			err = "feedbackStr isn't a string, it's: " + feedbackStr.toString().slice(0, 256);
		}
		if(err) {
			return onDone(new classes.CallbackParam(400, null, err));
		}
		dataLayer.saveFeedback(sessionId, feedbackStr, onDone);
	}
	function emailResults(lang, toAddr, plainText, nonInlinedHtml, onDone) {
		stringCache.getString(lang, "emailSubject", function(paramObj) {
			if(paramObj.isErr()) {
				return onDone(paramObj);
			}
			var subject = paramObj.data;
			testResBuilder.emailSpazioDResults(toAddr, subject, plainText, nonInlinedHtml, onDone);
		});
	}

	return {
		checkIfExpSessionFinished : checkIfExpSessionFinished,
		saveDemogr : saveDemogr,
		saveTestRes : saveTestRes,
		calcUserPerformace : calcUserPerformace,
		selectImgForTest : selectImgForTest,
		saveFeedback : saveFeedback,
		stringCache : stringCache,
		emailResults : emailResults
	};
	
	Object.keys(module.exports).forEach(function(aKey) {
		const _oldF = module.exports[aKey];
		if( typeof _oldF === "function") {
			module.exports[aKey] = function() {
				const _args = arguments;
				_initPromise.then(function() {
					return _oldF.apply(module.exports, _args);
				}, function(reason) {
					throw new Error(reason);
				});
			};
		}
	});
}

module.exports = {
	init : init
};
