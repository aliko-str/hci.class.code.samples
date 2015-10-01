var template = new EJS({url: '/public/views/choose.lang.ejs'});

$(document).ready(function(ev){
	$("#root").html(template.render());
	$('#loader').hide();
});

