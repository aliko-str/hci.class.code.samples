var _root = "../../";
var table = require("../../helpers/table.reader.js");
var stats = require("simple-statistics");
var async = require("async");
var classes = require(_root + "helpers/classes.js");
var lm = require("shaman").LinearRegression;
var Q = require("q");
var mailer = require(_root + "helpers/mailer");
var _ = require("underscore");

var lmParams = ["congestion", "quadSmall", "salObjNum", "colClust", "pointAmVert", "quadBig", "rosen"];
var _zScoreThrs = [-2.326, -2.054, -1.881, -1.751, -1.645, -1.555, -1.476, -1.405, -1.341, -1.282, -1.227, -1.175, -1.126, -1.08, -1.036, -0.994, -0.954, -0.915, -0.878, -0.842, -0.806, -0.772, -0.739, -0.706, -0.674, -0.643, -0.613, -0.583, -0.553, -0.524, -0.496, -0.468, -0.44, -0.412, -0.385, -0.358, -0.332, -0.305, -0.279, -0.253, -0.228, -0.202, -0.176, -0.151, -0.126, -0.1, -0.075, -0.05, -0.025, 0, 0.025, 0.05, 0.075, 0.1, 0.126, 0.151, 0.176, 0.202, 0.228, 0.253, 0.279, 0.305, 0.332, 0.358, 0.385, 0.412, 0.44, 0.468, 0.496, 0.524, 0.553, 0.583, 0.613, 0.643, 0.674, 0.706, 0.739, 0.772, 0.806, 0.842, 0.878, 0.915, 0.954, 0.994, 1.036, 1.08, 1.126, 1.175, 1.227, 1.282, 1.341, 1.405, 1.476, 1.555, 1.645, 1.751, 1.881, 2.054, 2.326];

function _calcAvgZscore(popMean, popSD, aVector) {
	var zSum = 0;
	aVector.forEach(function(el) {
		zSum += (el - popMean) / popSD;
	});
	return zSum / aVector.length;
}
function _calcPercentile(zScore) {
	var i = 0, ilen = _zScoreThrs.length;
	while(i < (ilen - 1) && zScore > _zScoreThrs[i]) {
		i++;
	}
	var res = 0;
	if(i == 0 || i == ilen - 1) {
		res = i + 1;
	} else {
		res = (i + 1) + (zScore - _zScoreThrs[i - 1]) / (_zScoreThrs[i] - _zScoreThrs[i - 1]);
	}
	return res.toFixed(1);
}

(function constructor() {
	classes.registerClass("TestOutcome", function(d) {
		var self = this;
		var _settings = {
			minNumToCompStats : 1 // at least 10 datapoints to compute statistics
		};
		var defer = Q.defer();
		// z - set-up: tmp variables, averages, means, sds, merged tables
		var genderRatings = table.meanNonUniqueCol(d.genderRatings, "stimulusId", "rating");
		var ageGroupRatings = table.meanNonUniqueCol(d.ageGroupRatings, "stimulusId", "rating");
		var socialGroupRatings = table.meanNonUniqueCol(d.socialGroupRatings, "stimulusId", "rating");
		var otherHumanRatings = table.meanNonUniqueCol(d.allOthersRatings, "stimulusId", "rating");
		var tmpMerge;
		// a - some basic demogr info
		this.gender = d.thisSessionObj.gender;
		this.ageGroup = d.thisSessionObj.ageGroup;
		this.socialGroup = d.thisSessionObj.socialGroup;
		// b - basic set-up
		this.corr = {};
		var tmpV = {};
		this.means = {};
		var sds = {};
		this.percent = {};
		tmpV["this"] = table.asVector(d.thisSessionRatings, "rating");
		this.means["this"] = stats.mean(tmpV["this"]);
		// c - machine-computed VC
		var tmpMergeAllParams = table.fullJoinByColName(d.thisSessionRatings, d.thisSessionStimuli, "stimulusId", "id");
		this.corr["compVC"] = stats.sampleCorrelation(table.asVector(tmpMergeAllParams, "rating"), table.asVector(tmpMergeAllParams, "compVC"));
		tmpV["compVC"] = table.asVector(d.thisSessionStimuli, "compVC");
		this.means["compVC"] = stats.mean(tmpV["compVC"]);
		sds["compVC"] = stats.standardDeviation(tmpV["compVC"]);
		this.percent["compVC"] = _calcPercentile(_calcAvgZscore(this.means["compVC"], sds["compVC"], tmpV["this"]));
		// d - same gender <-- if we have enough ratings
		if(genderRatings.length >= _settings.minNumToCompStats) {
			tmpMerge = table.fullJoinByColName(d.thisSessionRatings, genderRatings, "stimulusId");
			this.corr["gender"] = stats.sampleCorrelation(table.asVector(tmpMerge, "rating.1"), table.asVector(tmpMerge, "rating.2"));
			tmpV["gender"] = table.asVector(genderRatings, "rating");
			this.means["gender"] = stats.mean(tmpV["gender"]);
			sds["gender"] = stats.standardDeviation(tmpV["gender"]);
			this.percent["gender"] = _calcPercentile(_calcAvgZscore(this.means["gender"], sds["gender"], tmpV["this"]));
		}
		// e - same age group
		if(ageGroupRatings.length >= _settings.minNumToCompStats) {
			tmpMerge = table.fullJoinByColName(d.thisSessionRatings, ageGroupRatings, "stimulusId");
			this.corr["ageGroup"] = stats.sampleCorrelation(table.asVector(tmpMerge, "rating.1"), table.asVector(tmpMerge, "rating.2"));
			tmpV["ageGroup"] = table.asVector(ageGroupRatings, "rating");
			this.means["ageGroup"] = stats.mean(tmpV["ageGroup"]);
			sds["ageGroup"] = stats.standardDeviation(tmpV["ageGroup"]);
			this.percent["ageGroup"] = _calcPercentile(_calcAvgZscore(this.means["ageGroup"], sds["ageGroup"], tmpV["this"]));
		}
		// f - same social group
		if(socialGroupRatings.length >= _settings.minNumToCompStats) {
			tmpMerge = table.fullJoinByColName(d.thisSessionRatings, socialGroupRatings, "stimulusId");
			this.corr["socialGroup"] = stats.sampleCorrelation(table.asVector(tmpMerge, "rating.1"), table.asVector(tmpMerge, "rating.2"));
			tmpV["socialGroup"] = table.asVector(socialGroupRatings, "rating");
			this.means["socialGroup"] = stats.mean(tmpV["socialGroup"]);
			sds["socialGroup"] = stats.standardDeviation(tmpV["socialGroup"]);
			this.percent["socialGroup"] = _calcPercentile(_calcAvgZscore(this.means["socialGroup"], sds["socialGroup"], tmpV["this"]));
		}
		// g - other humans
		if(otherHumanRatings.length >= _settings.minNumToCompStats) {
			tmpMerge = table.fullJoinByColName(d.thisSessionRatings, otherHumanRatings, "stimulusId");
			this.corr["otherHumans"] = stats.sampleCorrelation(table.asVector(tmpMerge, "rating.1"), table.asVector(tmpMerge, "rating.2"));
			tmpV["otherHumans"] = table.asVector(otherHumanRatings, "rating");
			this.means["otherHumans"] = stats.mean(tmpV["otherHumans"]);
			sds["otherHumans"] = stats.standardDeviation(tmpV["otherHumans"]);
			this.percent["otherHumans"] = _calcPercentile(_calcAvgZscore(this.means["otherHumans"], sds["otherHumans"], tmpV["this"]));
		}
		// d - based on your preferences, our algorithms say you favorite website is...
		var trainingX = table.asMatrix(tmpMergeAllParams, lmParams);
		var predictX = table.asMatrix(d.otherStimuli, lmParams);
		var y = table.asVector(tmpMergeAllParams, "rating");
		var lm1 = new lm(trainingX, y, {
			algorithm : 'GradientDescent'
		});
		lm1.train(function(err) {
			if(!err) {
				var predictY = predictX.map(function(aRow) {
					return lm1.predict(aRow);
				});
				var _minIdx = predictY.indexOf(stats.min(predictY));
				var _maxIdx = predictY.indexOf(stats.max(predictY));
				if(process._debugMode && (_minIdx == -1 || _maxIdx == -1)) {
					throw new Error("A strange fuck-up.... min/max of predicted values aren't found");
				}
				self.mostFavored = d.otherStimuli[_minIdx];
				self.leastFavored = d.otherStimuli[_maxIdx];
				defer.resolve();
			} else {
				defer.reject();
			}
		});
		// fool check
		if(process._debugMode) {
			var self = this;
			Object.keys(this).forEach(function(aKey) {
				if(self[aKey] == undefined) {
					throw new Error("The property " + aKey + " of TestOutcome is undefined - check your code.");
				}
			});
		}
		this.promise = defer.promise;
	});
})();

function computeTestResult(dataLayer, sessionId, onDone) {
	_selectDataForResultOverview(dataLayer, sessionId, function(d) {
		var testOutcome = new classes.TestOutcome(d);
		testOutcome.promise.then(function resolve() {
			onDone(new classes.CallbackParam(200, testOutcome, ""));
		}, function reject(e) {
			onDone(new classes.CallbackParam(500, null, e));
		});
	});
	return;
}
function _selectDataForResultOverview(dataLayer, sessionId, onDone) {
	var d = {};
	async.waterfall([
	function(cb) {
		// 1 - get the session so we know demographics
		dataLayer.getSessionById(sessionId, function(paramObj) {
			var err = paramObj.isErr() ? paramObj : null;
			var session = paramObj.data[0];
			if(!session.ifFinished) {
				err = new classes.CallbackParam(400, null, "The current session (id = " + sessionId + ") hasn't finished yet");
			}
			cb(err, session);
		});
	},
	function(thisSessionObj, cb) {
		d.thisSessionObj = thisSessionObj;
		dataLayer.getRatingsOneSession(thisSessionObj.assignedId, function(paramObj) {
			cb(paramObj.isErr() ? paramObj : null, thisSessionObj, paramObj.data);
		});
	},
	function(thisSessionObj, thisSessionRatings, cb) {
		d.thisSessionRatings = thisSessionRatings;
		var thisSessionStimulusIds = thisSessionRatings.map(function(sessObj) {
			return sessObj.stimulusId;
		});
		async.parallel({
			otherStimuli : function(cb) {
				// 2.0 - select stimuli not rated in the current session
				dataLayer.getStimuliByNotIds(thisSessionStimulusIds, function(paramObj) {
					cb(paramObj.isErr() ? paramObj : null, paramObj.data);
				});
			},
			thisSessionStimuli : function(cb) {
				// 2.1 - select all the info about the stimuli rated in the current session
				dataLayer.getStimuliByIds(thisSessionStimulusIds, function(paramObj) {
					cb(paramObj.isErr() ? paramObj : null, paramObj.data);
				});
			},
			genderRatings : function(cb) {
				// 2.2 - select same-gender ratings
				if(thisSessionObj.gender == null){
					return cb(null, []);
				}
				dataLayer.getRatingsOneGender(thisSessionObj, thisSessionStimulusIds, function(paramObj) {
					cb(paramObj.isErr() ? paramObj : null, paramObj.data);
				});
			},
			ageGroupRatings : function(cb) {
				// 2.3 - select same age-group ratings
				if(thisSessionObj.ageGroup == null){
					return cb(null, []);
				}
				dataLayer.getRatingsOneAgeGroup(thisSessionObj, thisSessionStimulusIds, function(paramObj) {
					cb(paramObj.isErr() ? paramObj : null, paramObj.data);
				});
			},
			socialGroupRatings : function(cb) {
				// 2.4 - select same social-group ratings
				if(thisSessionObj.socialGroup == null){
					return cb(null, []);
				}
				dataLayer.getRatingsOneSocialGroup(thisSessionObj, thisSessionStimulusIds, function(paramObj) {
					cb(paramObj.isErr() ? paramObj : null, paramObj.data);
				});
			},
			allOthersRatings : function(cb) {
				dataLayer.getRatingsAllHumans(thisSessionObj, thisSessionStimulusIds, function(paramObj) {
					cb(paramObj.isErr() ? paramObj : null, paramObj.data);
				});
			}
		}, function(err, res) {
			if(res) {
				Object.keys(res).forEach(function(aKey) {
					d[aKey] = res[aKey];
				});
			}
			return cb(err);
		});
	},
	function(cb) {
		onDone(d);
	}], function(err, res) {
		if(err) {
			onDone(err);
		}
	});
}

function emailSpazioDResults(toAddr, subject, plainText, nonInlinedHtml, onDone){
	var from = "tlight@e.atw-lab.com";
	var bcc = "a.minyukovich@gmail.com";
	mailer.sendOutHtml(from, toAddr, bcc, subject, plainText, nonInlinedHtml, onDone);
}

function init(ifDebugApp){
	var dataLayer = require("./data.layer.js").init(ifDebugApp);
	return {
		emailSpazioDResults: emailSpazioDResults,
		computeTestResult : _.partial(computeTestResult, dataLayer)
	};
}

module.exports = {
	init: init
};
