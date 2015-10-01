window._getNextUrl = function(newPath) {
	return window.location.protocol + "//" + window.location.host + newPath;
};


window.enableDisableF = (function getEnableDisableF() {
	var jqButton;
	return function(ifEnable) {
		jqButton = jqButton || (window.jqRootSel && $(window.jqRootSel).find("#proceed"));
		if(ifEnable) {
			jqButton.prop("disabled", false).val(window.App.S["proceed"]);
		} else {
			jqButton.prop("disabled", true).val(window.App.S["saving"]);
		}
	};
})();

window.centerElByHeight = function(jqEl){
	var _css;
	if(jqEl.innerHeight() < window.innerHeight){
		var top = (window.innerHeight - jqEl.innerHeight()) / 2;
		var left = jqEl.position().left;
		_css = {"position": "absolute", "top": top+"px", "left": left+"px"}; 
		jqEl.css(_css);
	}
	return _css;
};

window._postToUrl = function(url, success, error, dataToSave) {
	$.ajax(url, {
		type : "POST",
		data : JSON.stringify(dataToSave),
		dataType : "JSON",
		success : success,
		error : error,
		contentType : "application/json"
	});
};