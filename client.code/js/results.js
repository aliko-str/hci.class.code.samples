var jqRoot;

var tmplResults = new EJS({
	url : '/public/views/results.ejs'
});

var tmplResSection = new EJS({
	url : '/public/views/result.section.ejs'
});

var tmplHeader = new EJS({
	url : '/public/views/visit.us.header.ejs'
});

var tmplFooter = new EJS({
	url : '/public/views/visit.us.footer.ejs'
});

$(document).ready(function() {
	jqRoot = $("#root");
	jqRoot.html(tmplResults.render({
		testResults : window.App.params.testResults
	}));

	var jqSections = jqRoot.find("#compareWrapper");
	var r = window.App.params.testResults;
	var s = window.App.S;
	jqSections.append(tmplResSection.render({
		compareTo1 : s["machine"],
		compareTo : s["machine"],
		corr : r.corr["compVC"],
		percentile : r.percent["compVC"],
		ifMachine : true
	}));
	jqSections.append(tmplResSection.render({
		compareTo1 : s["gender"],
		compareTo : s["qGenderOpt" + r.gender],
		corr : r.corr["gender"],
		percentile : r.percent["gender"],
		ifMachine : false
	}));
	jqSections.append(tmplResSection.render({
		compareTo1 : s["ageGroup"],
		compareTo : s["qAgeOpt" + r.ageGroup],
		corr : r.corr["ageGroup"],
		percentile : r.percent["ageGroup"],
		ifMachine : false
	}));
	jqSections.append(tmplResSection.render({
		compareTo1 : s["socialGroup"],
		compareTo : s["qGroupOpt" + r.socialGroup],
		corr : r.corr["socialGroup"],
		percentile : r.percent["socialGroup"],
		ifMachine : false
	}));
	jqSections.append(tmplResSection.render({
		compareTo1 : s["allOtherHumans"],
		compareTo : s["allOtherHumans"],
		corr : r.corr["otherHumans"],
		percentile : r.percent["otherHumans"],
		ifMachine : false
	}));
	$("#loader").hide();
	_attachHandlers();
});

function _attachHandlers() {
	jqRoot.find("form").submit(function(ev) {
		ev.preventDefault();
		var emailAddr = $(this).find("#theEmail").val();
		var dataToSend = {};
		if(emailAddr) {
			if(!_validateEmail(emailAddr)) {
				return jqRoot.find("#emailError").slideDown(500);
			}
			window.enableDisableF(false);
			jqRoot.find("#emailError").hide();

			dataToSend = {
				email : emailAddr,
				fallback : _stripHTML(),
				html : _stringifyHtml()
			};
		}
		return window._postToUrl(window.App.params.postUrl, function(data, textStatus, jqXHR) {
			// fool check
			var nextPageUrl = data.nextPageUrl.substring(0);
			window.location.href = window._getNextUrl(nextPageUrl);
		}, function(jqXHR, textStatus, errorThrown) {
			// try to resubmit
			window.alert(window.App.S["resubmit"].interpolate({
				textStatus : textStatus
			}));
			window.enableDisableF(true);
		}, dataToSend);
	});
}
function _stringifyHtml() {
	jqRoot.prepend(tmplHeader.render());
	jqRoot.append(tmplFooter.render());
	var jqHTML = $("html").clone();
	jqRoot.find("header, footer").hide();
	jqHTML.find("#emailForm").remove();
	jqHTML.find("script").remove();
	jqHTML.find("#resultTitleBox").remove();
	jqHTML.find("*[src]").each(function(i, el) {
		$(el).attr("src", el.src);
	});
	jqHTML.find("*[href]").each(function(i, el) {
		$(el).attr("href", el.href);
	});
	return jqHTML[0].outerHTML;
}
function _stripHTML() {
	var _clone = $("#root").clone();
	_clone.find("script").remove();
	var html = _clone[0].innerHTML;
	var tmp = document.createElement("DIV");
	tmp.innerHTML = html;
	return tmp.textContent || tmp.innerText;
}
function _validateEmail(email) {
	var re = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
	return re.test(email);
}
