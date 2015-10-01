var jqRoot;

var tmplMessage = new EJS({
	url : '/public/views/msg/' + App.params.viewName
});

var tmplMessageWrapper = new EJS({
	url : '/public/views/message.ejs'
});

$(document).ready(function() {
	jqRoot = $("#root");
	jqRoot.html(tmplMessageWrapper.render());
	jqRoot.find("#msgContent").html(tmplMessage.render());
	$("#loader").hide();
	jqRoot.find("#proceed").click(function(ev){
		// var pathIdx = window.location.href.indexOf(window.location.pathname);
		// window.location.href = window.location.href.slice(0, pathIdx) + window.App.params.nextPage;
		window.location.href = window._getNextUrl(window.App.params.nextPage);
	});
	window.centerElByHeight(jqRoot.find("#infoPageWrapper"));
});
