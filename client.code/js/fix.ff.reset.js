"use strict";
//name must be a valid form name eg. <form name="myFormName" ...
window.resettableForm = function(name) {
	var a = {
		"registerReset" : function() {
			//if the boxShadow property exists, bind the reset event handler
			//to the named form

			if( typeof document.forms[name].style.boxShadow !== 'undefined') {
				document.forms[name].addEventListener('reset', a.resetEventHandler);
			}
		},

		"reset" : function() {
			a.registerReset();
			document.forms[name].reset();
		},

		"resetEventHandler" : function() {
			//override the default style and apply no boxShadow and register
			//an invalid event handler to each of the form's input controls
			function applyFix(inputControls) {
				for(var i = 0; i < inputControls.length; i++) {

					inputControls[i].style.boxShadow = 'none';
					inputControls[i].addEventListener('invalid', a.invalidEventHandler);
					inputControls[i].addEventListener('keydown', a.keydownEventHandler);
				}
			}
			var inputControls = this.getElementsByTagName('input');
			applyFix(inputControls);

			var inputControls = this.getElementsByTagName('textarea');
			applyFix(inputControls);

			var inputControls = this.getElementsByTagName('select');
			applyFix(inputControls);

		},

		"invalidEventHandler" : function() {

			this.style.boxShadow = '';
			this.removeEventListener('invalid', a.invalidEventHandler);
			this.removeEventListener('keydown', a.keydownEventHandler);
		},

		//the following functions emulates the restore of :-moz-ui-invalid
		//when the user interacts with a form input control
		"keydownEventHandler" : function() {
			this.addEventListener('blur', a.blurEventHandler);
		},

		"blurEventHandler" : function() {
			this.checkValidity();
			this.removeEventListener('blur', a.blurEventHandler);
		}
	};
	return a;
};