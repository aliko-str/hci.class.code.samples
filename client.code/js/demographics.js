var jqRoot;

var tmplMessage = new EJS({
	url : '/public/views/demographics.ejs'
});

$(document).ready(function() {
	jqRoot = $("#root");
	jqRoot.html(tmplMessage.render());
	$("#loader").hide();
	jqRoot.find("#demographicsForm").submit(function(ev) {
		ev.preventDefault();
		var output = {};
		$(this).serializeArray().forEach(function(el, i) {
			output[el["name"]] = el["value"];
		});
		window._postToUrl(window._getNextUrl(window.App.params.postUrl), function(data, textStatus, jqXHR) {
			// fool check
			var nextPageUrl = data.nextPage.substring(0);
			window.location.href = window._getNextUrl(nextPageUrl);
		}, function(jqXHR, textStatus, errorThrown) {
			window.alert(window.App.S["resubmit"].interpolate({
				textStatus : textStatus
			}));
			window.enableDisableF(true);
		}, output);
		window.enableDisableF(false);
	});
});
