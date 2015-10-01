var tabTableReader = require("../../helpers/table.reader.js");
var util = require("../../helpers/util.js");
var path = require("path");
var _ = require("underscore");

var computedVCScoresTxtFname = "italianPublishers_sealed.txt";
var outFolderFullPath = path.normalize(path.join(__dirname, "../client.code/data/", "selected"));

function addMissingStimuli(dataLayer, onDone) {
	// 0 - read what we have available from fs
	var stimuliAsObj = tabTableReader.readTabTableAsObj(path.join(outFolderFullPath, computedVCScoresTxtFname), "givenName");
	// 1 - select stimuli from db
	dataLayer.getAllStimuli(function(paramObj) {
		// 2 - find set difference
		var stimuliToHide = paramObj.data.filter(function(aDbRow) {
			if(stimuliAsObj[aDbRow.codeName]) {
				stimuliAsObj[aDbRow.codeName].present = true;
				return false;
			}
			return true;
		});
		var stimuliToAddToDB = Object.keys(stimuliAsObj).filter(function(codeName) {
			return !stimuliAsObj[codeName].present;
		}).map(function(el) {
			el = stimuliAsObj[el];
			el["realName"] = el.names;
			el["codeName"] = el.givenName;
			return el;
		});
		// 4 - make non-selected stimuli - but those present in db - invisible
		dataLayer.updateStimuliHide(stimuliToHide.map(function(el) {
			return el.id;
		}), function(paramObj) {
			// 3 - create new rows for newly added stimuli
			dataLayer.createStimuli(util.shuffle(stimuliToAddToDB), onDone);
		});
	});
}

function nullifyResultsForExistingStimuli(dataLayer, onDone) {
	addMissingStimuli(function(paramObj){
		if(paramObj.code != 200){
			return onDone(paramObj);
		}
		var stimuliAsObj = tabTableReader.readTabTableAsObj(path.join(outFolderFullPath, computedVCScoresTxtFname), "givenName");
		dataLayer.updateStimuli_deleteRelatedRatings(stimuliAsObj, onDone);
	});
}

function init(ifDebugApp){
	var dataLayer = require("./data.layer.js").init(ifDebugApp);
	return {
		addMissingStimuli : _.partial(addMissingStimuli, dataLayer),
		nullifyResultsForExistingStimuli : _.partial(nullifyResultsForExistingStimuli, dataLayer)
	};
}

module.exports = {
	init: init
};
