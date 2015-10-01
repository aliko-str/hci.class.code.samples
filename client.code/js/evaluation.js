var jqRoot;

var tmplTrial = new EJS({
	url : '/public/views/test.trial.ejs'
});

var settings = {
	msPerStimulus : 1000 * 1, // disable rotation for now
	msPerCross : 1000 * 1,
	msPerNoise : 100,
	msPerSubmitDelay : 250,
	progressTickEvery : 1 // %
};

$(document).ready(function() {
	jqRoot = $("#root");
	jqRoot.html(tmplTrial.render({
		numOfTrials : window.App.params.stimuli.length
	}));
	window.loadJsFile("/public/js/fix.ff.reset.js", function(){
		window.resettableForm("testTrialForm").registerReset();
	});
	$("#loader").find("img").replaceWith('<progress style="padding-bottom:10px;" id="theProgress" max="100" value="1"></progress>');
	window.App.preloader.preLoadImgs("", window.App.params.stimuli.map(function(el) {
		return el.url;
	}), onAllImgLoaded, getOnProgressTick());
	$(window).unload(function(ev){
		return window.App.S["closeConfirm"];
	});
});

function onAllImgLoaded(err) {
	if(err) {
		App.Logger.error(err);
	}
	$("#loader").hide();
	var dataStoreArr = [];
	_assignHandlers(jqRoot.find("form"), dataStoreArr);
	jqRoot.find("#confirmReadyButton").click(function(ev) {
		var stimuli = window.App.params.stimuli;
		jqRoot.find("#confirmReadyWrapper").remove();
		setUpRecursiveTrials(stimuli.shuffle(), function() {
			onAllTrialsRun(dataStoreArr);
		});
	});
	return;
}
function getOnProgressTick() {
	var jqProgress = $("#theProgress");
	return function(progressPercentage) {
		jqProgress.val(progressPercentage);
	};
}
function onAllTrialsRun(dataStoreArr) {
	// 1 - save the data
	enableDisableF(false);
	window._postToUrl(window._getNextUrl(window.App.params.postUrl), function(data, textStatus, jqXHR) {
		// 2 - redirect the page
		window.location.href = window._getNextUrl(window.App.params.nextPage);
	}, function(jqXHR, textStatus, errorThrown) {
		window.alert(window.App.S["resubmit"].interpolate({
			textStatus : textStatus
		}));
		enableDisableF(true);
	}, dataStoreArr);
}
function setUpRecursiveTrials(leftStimuli, onDoneAll) {
	var jqCross = jqRoot.find("#redCrossWrapper");
	var jqTest = jqRoot.find("#theImageWrapper");
	var jqTestImg = jqTest.find("img");
	var jqNoise = jqRoot.find("#noiseMaskWrapper");
	var jqControls = jqRoot.find("#setRatingWrapper");
	var jqControlsId = jqControls.find("#stimulusId");
	var jqContorlsName = jqControls.find("#codeName");
	var jqAllWrappers = jqRoot.find("#testWrapper > div");
	var jqExpTime = jqControls.find("#exposureTime");
	var jqForm = jqRoot.find("form");
	var jqRadios = jqRoot.find("input[type=radio]");
	var jqTrialNum = jqRoot.find("#trialNumber");
	var _trialCounter = 0;
	window.centerElByHeight(jqControls.find("#toBeCentered"));

	function runTrialsRecursively(currStim) {
		// a - set up visuals  + reset the radios
		jqControlsId.val(currStim.id);
		jqContorlsName.val(currStim.codeName);
		jqTestImg.attr("src", currStim.url);
		// jqRadios.prop("checked", false);
		// b - run a sequence of show/hide <-- will be triggered in img.onLoad
	};
	jqTestImg.load(function(ev) {
		// 0 - reset visuals
		jqAllWrappers.hide();
		enableDisableF(true);
		jqForm[0].reset();
		jqTrialNum.text(++_trialCounter);
		// 1 - show the cross
		jqCross.show();
		window.setTimeout(function() {
			// 2 - show the img
			jqCross.hide();
			jqTest.show();
			var startT = Date.now();
			window.setTimeout(function() {
				// 3 - show the mask
				jqTest.hide();
				var endT = Date.now();
				jqNoise.show();
				window.setTimeout(function() {
					// 4 - finally, show the controls to set the rating
					jqNoise.hide();
					jqControls.show();
				}, settings.msPerNoise);
				jqExpTime.val(endT - startT);
			}, settings.msPerStimulus);
		}, settings.msPerCross + Math.round(500 * Math.random()));
	});
	jqRoot.find("form").submit(function(ev) {
		enableDisableF(false);
		ev.preventDefault();
		var currStim;
		if(!leftStimuli.length) {
			return onDoneAll();
		}
		// a small time out for the submission to look more natural
		window.setTimeout(function() {
			runTrialsRecursively(leftStimuli.shift());
		}, settings.msPerSubmitDelay);
	});
	runTrialsRecursively(leftStimuli.shift());
};

function _assignHandlers(jqForm, dataStoreArr) {
	const jqSubmitBtn = jqRoot.find("#submitButton");
	const jqRadios = jqForm.find("input[type=radio]");
	jqForm.submit(function(ev) {
		ev.preventDefault();
		var datum = {};
		$(this).serializeArray().forEach(function(el, i) {
			datum[el["name"]] = el["value"];
		});
		dataStoreArr.push(datum);
	});
	$(document).on("keypress", function(e) {
		e.preventDefault();
		if(jqSubmitBtn.is(":visible") && jqSubmitBtn.is(":enabled")){
			if(e.which === 13) {
				jqSubmitBtn.focus();
				return jqSubmitBtn.click();
			}
			if(e.which >= 49 && e.which <= 57) {
				var id = "#r" + (e.which - 49 + 1);
				jqRadios.prop("checked", false);
				jqRadios.filter(id).prop("checked", true);
			}
		}
	});
}
var enableDisableF = (function getEnableDisableF() {
	var jqButton;
	return function(ifEnable) {
		jqButton = jqButton || jqRoot.find("#submitButton");
		if(ifEnable) {
			jqButton.prop("disabled", false).val(window.App.S["rateThePage"]);
		} else {
			jqButton.prop("disabled", true).val(window.App.S["saving"]);
		}
	};
})();
