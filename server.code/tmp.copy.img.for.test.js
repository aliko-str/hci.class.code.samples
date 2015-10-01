var tabTableReader = require("../../helpers/table.reader.js");
var path = require("path");
var fs = require("fs");
var rimraf = require("rimraf");

var computedVCScoresTxtFname = "italianPublishers_sealed.txt";
var computedImgParamsTxtFname = "italianPublishersAllParams_sealed.txt";
var rootDataFolder = path.join(__dirname, "../client.code/data/");
var outFolderFullPath = path.normalize(path.join(rootDataFolder, "selected"));
var outFolderFullPath_img = path.normalize(path.join(outFolderFullPath, "img"));

var origSSdataFolder = path.join(rootDataFolder, "italianPublishers_sealed");

var numOfExamplesToTake = 20;

function copyFile(source, target) {
	var cbCalled = false;
	var rd = fs.createReadStream(source);
	rd.on("error", function(err) {
		done(err);
	});
	var wr = fs.createWriteStream(target);
	wr.on("error", function(err) {
		done(err);
	});
	wr.on("close", function(ex) {
		done();
	});
	rd.pipe(wr);
	function done(err) {
		if(!cbCalled) {
			if(err) {
				console.log(err);
			}
			// cb(err);
			cbCalled = true;
		}
	}

}

function selectSpreadVC(numOfExamplesToTake) {
	// a) read the ranking results
	var vcScoresAsArray = tabTableReader.readTabTableAsArray(path.join(rootDataFolder, "txt", computedVCScoresTxtFname));

	// b) sort the results
	function tmpSort(a, b) {
		if(a.vc < b.vc) {
			return -1;
		} else if(a.vc > b.vc) {
			return 1;
		}
		return 0;
	}

	vcScoresAsArray = vcScoresAsArray.sort(tmpSort);

	// b.1) find max/min of VCs and use them as extremes to calculate a step
	var minVC = vcScoresAsArray[0].vc;
	var maxVC = vcScoresAsArray[vcScoresAsArray.length - 1].vc;

	// b.2) sift through and select examples

	function selectExamples(vcScoresAsArray, stepModifier, numOfExamplesToTake) {
		var step = (maxVC - minVC) / (numOfExamplesToTake + 1 + stepModifier);
		var vcScoresAsArray_selected = [];
		for(var istep = 1; istep <= numOfExamplesToTake; istep++) {
			var searchedVal = minVC + istep * step;
			var diff = Number.MAX_VALUE;
			var i = 0;
			var ilen = vcScoresAsArray.length;
			while(i < ilen && Math.abs(vcScoresAsArray[i].vc - searchedVal) < diff) {
				diff = Math.abs(vcScoresAsArray[i].vc - searchedVal);
				i++;
			}
			if(i == ilen) {
				break;
			}
			vcScoresAsArray_selected.push(vcScoresAsArray[i]);
			vcScoresAsArray.splice(i, 1);
		}
		return vcScoresAsArray_selected;
	}

	var stepModifier = 0;
	var vcScoresAsArray_selected;
	do {
		vcScoresAsArray_selected = selectExamples(vcScoresAsArray.slice(), stepModifier, numOfExamplesToTake);
		stepModifier++;
	} while(vcScoresAsArray_selected.length < numOfExamplesToTake);
	return vcScoresAsArray_selected;
}

// c) create output folder structure
function main() {
	var _tmpRestOfAction = function() {
		// here I simply rename-copy all available files
		var vcScoresAsArray_selected = tabTableReader.readTabTableAsArray(path.join(rootDataFolder, computedVCScoresTxtFname));
		restOfActions(vcScoresAsArray_selected);
	};
	if(fs.existsSync(outFolderFullPath)) {
		rimraf(outFolderFullPath, _tmpRestOfAction);
	}else{
		_tmpRestOfAction();
	}
}

function restOfActions(vcScoresAsArray_selected) {
	var imgParamsAsObj = tabTableReader.readTabTableAsObj(path.join(rootDataFolder, computedImgParamsTxtFname), "fname");
	fs.mkdirSync(outFolderFullPath);
	fs.mkdirSync(outFolderFullPath_img);
	// d) select and copy - for the graph visualization
	var selectedNames = [];
	for(var i = 0, ilen = vcScoresAsArray_selected.length; i < ilen; i++) {
		var aRowVC = vcScoresAsArray_selected[i];
		aRowVC.givenName = generateNewFName();
		anImgParam = imgParamsAsObj[aRowVC.names];
		Object.keys(anImgParam).forEach(function(aKey){
			if(aKey != "fname"){
				aRowVC[aKey] = anImgParam[aKey];
			}
		});
		selectedNames.push(aRowVC);
		copyAnImg(aRowVC.names, aRowVC.givenName);
	}
	// e) create a new, reduced table and save it in a txt
	tabTableReader.writeArrInTabTable(path.join(outFolderFullPath, computedVCScoresTxtFname), selectedNames);
}

function generateNewFName() {
	return Math.round(Math.random() * 1000).toString() + Date.now().toString().substring(6) + ".png";
}

function copyAnImg(fName, fNewName) {
	var outFullName = path.join(outFolderFullPath_img, fNewName);
	var inFullName = path.join(origSSdataFolder, fName);
	if(!fs.existsSync(outFullName)) {
		copyFile(inFullName, outFullName);
	}
}

main();
