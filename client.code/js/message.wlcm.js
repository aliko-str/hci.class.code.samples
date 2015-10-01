var jqRoot;

$(window).load(function(ev) {
	jqRoot = $("#root");
	initAgreeToParticipate(1);
});

function initAgreeToParticipate(i){
	if(jqRoot.find("#agreeToParticipate").length){
		var jqProceed = jqRoot.find("#proceed"); 
		jqProceed.prop("disabled", true);
		jqRoot.find("#agreeToParticipate").click(function(ev){
			if(this.checked){
				jqProceed.prop("disabled", false);
			}else{
				jqProceed.prop("disabled", true);
			}
		});
	}else{
		console.log("Waiting a second for the dom to render: " + i);
		window.setTimeout(function(){
			initAgreeToParticipate(++i);
		}, 1000);
	}
}
