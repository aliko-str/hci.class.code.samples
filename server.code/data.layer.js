var classes = require("../../helpers/classes.js");
var util = require("../../helpers/util.js");
var crypto = require("crypto");
var async = require("async");

(function constructor() {
	classes.registerClass("SpazioDSession", function(session) {
		this.lang = session.lang.toString().slice(0, 2).toLowerCase();
		this.gender = session.gender.toString().slice(0, 1).toLowerCase();
		this.ageGroup = session.ageGroup.toString().slice(0, 32).toLowerCase();
		this.socialGroup = session.socialGroup.toString().slice(0, 64).toLowerCase();
		this.ifColorBlind = parseInt(session.ifColorBlind.toString().slice(0, 1));
		this.ifDyslexic = parseInt(session.ifDyslexic.toString().slice(0, 1));
		if(isNaN(this.ifDyslexic)) {
			if(process._debugMode) {
				throw new Error("Missing ifDyslexic field: " + session.ifDyslexic);
			}
			this.ifDyslexic = 0;
		}
		if(isNaN(this.ifColorBlind)) {
			if(process._debugMode) {
				throw new Error("Missing ifColorBlind field: " + session.ifColorBlind);
			}
			this.ifColorBlind = 0;
		}
		if(!session.lang) {
			if(process._debugMode) {
				throw new Error("Missing language field: " + this.lang);
			}
			this.lang = "en";
		}
		// if(this.gender != "m" && this.gender != "w" && this.gender != "o") {
		if(!session.gender) {
			if(process._debugMode) {
				throw new Error("Impossible gender: " + session.gender.toString());
			}
			this.gender = "err";
		}
		if(!session.ageGroup) {
			if(process._debugMode) {
				throw new Error("Missing age group: " + session.ageGroup.toString());
			}
			this.ageGroup = "err";
		}
		if(!session.socialGroup) {
			if(process._debugMode) {
				throw new Error("Missing social group: " + session.socialGroup.toString());
			}
			this.socialGroup = "err";
		}
		this.assignedId = _createSessionId();
	});
})();

function _createSessionId() {
	return crypto.randomBytes(16).toString('hex').slice(0, 16);
}
function init(ifDebugApp) {
	var db;
	if(ifDebugApp) {
		db = require("../../helpers/db.js").init("spazioD_test");
	} else {
		db = require("../../helpers/db.js").init("spazioD");
	}
	function saveRatings(assignedSessionId, stimulusIdRatingPairArr, onDone) {
		async.series([
		function(cb) {
			var valuesArr = stimulusIdRatingPairArr.map(function(aPair) {
				return db.format("(?,?,?)", [aPair.rating, aPair.stimulusId, assignedSessionId]);
			});
			var sql = "INSERT INTO ratings (rating, stimulusId, sessionId) VALUES ";
			sql += valuesArr.join(",") + ";";
			db.execute(sql, function(paramObj) {
				cb(paramObj.isErr() ? paramObj : null, paramObj);
			});
		},
		function(cb) {
			valuesArr = stimulusIdRatingPairArr.map(function(aPair) {
				return db.format("?", aPair.stimulusId);
			});
			var sql = "UPDATE stimuli SET timesRated=timesRated+1 WHERE id IN ";
			sql += "(" + valuesArr.join(",") + ");";
			db.execute(sql, function(paramObj) {
				cb(paramObj.isErr() ? paramObj : null, paramObj);
			});
		},
		function(cb) {
			var sql = "UPDATE sessions SET ifFinished=1 WHERE assignedId = ?";
			sql = db.format(sql, [assignedSessionId]);
			db.execute(sql, function(paramObj) {
				cb(paramObj.isErr() ? paramObj : null, paramObj);
			});
		}], function(err, res) {
			if(err) {
				return onDone(err);
			}
			return onDone(res[0]);
		});
	}
	function getAllStimuli(onDone) {
		var sql = "SELECT * FROM stimuli";
		db.execute(sql, onDone);
	}
	function createStimuli(stimuliArr, onDone) {
		if(!stimuliArr.length) {
			return onDone(new classes.CallbackParam(200, null, "ok"));
		}
		var techParams = ["congestion", "quadSmall", "salObjNum", "colClust", "pointAmVert", "quadBig", "rosen"];
		var sql = "INSERT INTO stimuli (realName, codeName, compVC, " + techParams.join(",") + ") VALUES ";
		var valuesArr = stimuliArr.map(function(aStimulus) {
			var fmt = "(" + Array(techParams.length + 1).join("?,") + "?,?,?)";
			return db.format(fmt, [aStimulus.realName, aStimulus.codeName, aStimulus["vc1-9"]].concat(techParams.map(function(tName) {
				return aStimulus[tName];
			})));
		});
		sql += valuesArr.join(",") + ";";
		db.execute(sql, onDone);
	}
	function updateStimuliHide(stimuliToHide, onDone) {
		if(!stimuliToHide.length) {
			return onDone(new classes.CallbackParam(200, null, "ok"));
		}
		var sql = "UPDATE stimuli SET visible=0 WHERE id IN ";
		var valuesArr = stimuliToHide.map(function(anId) {
			return db.format("?", [anId]);
		});
		sql += "(" + valuesArr.join(",") + ");";
		db.execute(sql, onDone);
	}
	function updateStimuli_deleteRelatedRatings(stimuliCodeNameArr, onDone) {
		var sql = "SELECT id FROM stimuli WHERE codeName IN (" + stimuliCodeNameArr.map(function(aname) {
			return db.format("?", [aname]);
		}).join(",") + ");";
		db.execute(sql, function() {
			if(paramObj != 200) {
				return onDone(paramObj);
			}
			var inClause = "(" + paramObj.data.map(function(anId) {
				return db.format("?", [anId.id]);
			}).join(",") + ")";
			sql = "UPDATE stimuli SET timesRated=0 WHERE id IN " + inClause + ";";
			db.execute(sql, function(paramObj) {
				if(paramObj.code != 200) {
					return onDone(paramObj);
				}
				sql = "DELETE FROM ratings WHERE stimulusId IN " + inClause + ";";
				db.execute(sql, onDone);
			});
		});
	}
	function createSession(sessionData, onDone) {
		var session = new classes["SpazioDSession"](sessionData);
		var sql = "INSERT INTO sessions (assignedId, gender, ageGroup, socialGroup, lang, ifColorBlind) VALUES (?,?,?,?,?,?);";
		sql = db.format(sql, [session.assignedId, session.gender, session.ageGroup, session.socialGroup, session.lang, session.ifColorBlind]);
		db.execute(sql, function(paramObj) {
			if(paramObj.isErr()) {
				return onDone(paramObj);
			}
			paramObj.data = session;
			onDone(paramObj);
		});
	}
	function _getRatingsOtherRaters(thisSessionObj, demogrParam, thisSessionStimulusIds, onDone) {
		var sql = "SELECT assignedId FROM sessions WHERE " + demogrParam + " = ?" + " AND assignedId != ?";
		sql = db.format(sql, [thisSessionObj[demogrParam], thisSessionObj["assignedId"]]);
		db.execute(sql, function(paramObj) {
			if(paramObj.isErr() || !paramObj.data.length) {
				return onDone(paramObj);
			}
			var otherSessionIds = paramObj.data.map(function(aRow) {
				return aRow.assignedId;
			});
			sql = "SELECT * FROM ratings WHERE stimulusId IN ('" + thisSessionStimulusIds.join("','") + "') AND sessionId IN ('" + otherSessionIds.join("','") + "');";
			db.execute(sql, onDone);
		});
	}
	function _getRatings1(sessionId, sessionParamToRestrict, onDone) {
		var sessionObj;
		var stimulusIdArr;
		var otherSessionIds;
		getSessionById(sessionId, function(paramObj) {
			if(paramObj.isErr()) {
				return onDone(paramObj);
			}
			sessionObj = paramObj.data[0];
			getRatingsOneSession(sessionId, function(paramObj) {
				if(paramObj.isErr()) {
					return onDone(paramObj);
				}
				var stimulusIdArr = paramObj.data.map(function(aRow) {
					return aRow.stimulusId;
				});
				var sql = "SELECT assignedId FROM sessions WHERE " + sessionParamToRestrict + " = " + paramObj.data[0][sessionParamToRestrict];
				sql += " AND assignedId != ?";
				sql = db.format(sql, [sessionId]);
				db.execute(sql, function(paramObj) {
					if(paramObj.isErr() || !paramObj.data.length) {
						return onDone(paramObj);
					}
					otherSessionIds = paramObj.data.map(function(aRow) {
						return aRow.assignedId;
					});
					sql = "SELECT * FROM ratings WHERE stimulusId IN (" + stimulusIdArr.join(",") + ") AND sessionId IN (" + otherSessionIds.join(",") + ");";
					db.execute(sql, onDone);
					return "The END";
				});
			});
		});
	}
	function getRatingsOneSession(assignedId, onDone) {
		var whereCondition = db.format("sessionId = ?", [assignedId]);
		db.execute("SELECT * FROM ratings WHERE " + whereCondition, function(paramObj) {
			if(!paramObj.isErr() && !paramObj.data.length) {
				paramObj = new classes.CallbackParam(400, null, "No ratings associated with the sessionId " + assignedId);
			}
			return onDone(paramObj);
		});
	}
	function getRatingsOneAgeGroup(thisSessionObj, thisSessionStimulusIds, onDone) {
		return _getRatingsOtherRaters(thisSessionObj, "ageGroup", thisSessionStimulusIds, onDone);
	}
	function getRatingsOneSocialGroup(thisSessionObj, thisSessionStimulusIds, onDone) {
		return _getRatingsOtherRaters(thisSessionObj, "socialGroup", thisSessionStimulusIds, onDone);
	}
	function getRatingsOneGender(thisSessionObj, thisSessionStimulusIds, onDone) {
		return _getRatingsOtherRaters(thisSessionObj, "gender", thisSessionStimulusIds, onDone);
	}
	function getRatingsAllHumans(thisSessionObj, thisSessionStimulusIds, onDone) {
		var sql = "SELECT * FROM ratings WHERE stimulusId IN ('" + thisSessionStimulusIds.join("','") + "') AND sessionId != ?";
		sql = db.format(sql, [thisSessionObj.assignedId]);
		db.execute(sql, onDone);
	}
	function getSessionById(assignedId, onDone) {
		db.execute(db.format("SELECT * FROM sessions WHERE assignedId = ?", [assignedId]), function(paramObj) {
			if(!paramObj.isErr()) {
				if(!paramObj.data.length) {
					return onDone(new classes.CallbackParam(400, null, "The session with assignedId " + assignedId + " not found."));
				}
			}
			return onDone(paramObj);
		});
	}
	function getStimuliLessShown(numOfStimuliToGet, onDone) {
		var sql = "SELECT * FROM stimuli WHERE visible = 1 ORDER BY timesRated ASC LIMIT " + numOfStimuliToGet;
		db.execute(sql, function(paramObj) {
			if(!paramObj.isErr()) {
				if(paramObj.data.length < numOfStimuliToGet) {
					paramObj = new classes.CallbackParam(400, null, "Couldn't retrieve enough stimuli, have only " + paramObj.data.length);
				}
			}
			return onDone(paramObj);
		});
	}
	function getStimuliByIds(stimuliIdArr, onDone) {
		var sql = "SELECT * FROM stimuli WHERE id IN";
		var valArr = stimuliIdArr.map(function(id) {
			return db.format("?", id);
		});
		db.execute(sql + "(" + valArr.join(",") + ")", onDone);
	}
	function getStimuliByNotIds(stimuliIdArr, onDone) {
		var sql = "SELECT * FROM stimuli WHERE id NOT IN";
		var valArr = stimuliIdArr.map(function(id) {
			return db.format("?", id);
		});
		db.execute(sql + "(" + valArr.join(",") + ")", onDone);
	}
	function saveFeedback(sessionId, feedbackStr, onDone) {
		var sql = "UPDATE sessions SET feedback = ? WHERE assignedId = ?";
		sql = db.format(sql, [feedbackStr.toString().slice(0, 511), sessionId]);
		db.execute(sql, onDone);
	}
	return {
		saveRatings : saveRatings,
		getRatingsOneGender : getRatingsOneGender,
		getRatingsOneSocialGroup : getRatingsOneSocialGroup,
		getRatingsOneAgeGroup : getRatingsOneAgeGroup,
		getRatingsOneSession : getRatingsOneSession,
		createSession : createSession,
		updateStimuli_deleteRelatedRatings : updateStimuli_deleteRelatedRatings,
		updateStimuliHide : updateStimuliHide,
		createStimuli : createStimuli,
		getAllStimuli : getAllStimuli,
		getSessionById : getSessionById,
		getStimuliLessShown : getStimuliLessShown,
		saveFeedback : saveFeedback,
		getStimuliByIds : getStimuliByIds,
		getStimuliByNotIds : getStimuliByNotIds,
		getRatingsAllHumans : getRatingsAllHumans
	};
}

module.exports = {
	init : init
}; 