var _rootF = "../../";
var path = require("path");
var classes = require(_rootF + 'helpers/classes.js');
var clientErrorLogger = require(_rootF + "helpers/client.error.logger.js");
var clientFeedbackLogger = require(_rootF + "helpers/client.feedback.logger.js");
var serverErrorLogger = require(_rootF + "helpers/server.error.logger.js");
var _ = require("underscore");

function init(ifDebugApp){
	var main = require("./main.js").init(ifDebugApp);
	return {
		addRoutes : _.partial(addRoutes, _, main),
		getStaticRouteDict : getStaticRouteDict,
		getViewRouteArr : getViewRouteArr
	};
}

function addRoutes(server, main) {
	function _ifActionFailed(paramObj, req, res) {
		var failed = false;
		if(paramObj.isErr()) {
			failed = true;
			if(paramObj.code >= 500) {
				serverErrorLogger.log(req, paramObj.message.toString().substring(0, 256));
				// res.redirect("/500");
				res.status(paramObj.code).set("Content-Type", "text/plain").send("We are confused... An error occured on the server.");
			} else if(paramObj.code >= 400) {
				res.redirect("/404");
				// res.send("The request contained a syntax error or asked a non-existing
				// resource.");
			} else {
				res.status(paramObj.code).set("Content-Type", "text/plain").send("Unrecognized Error");
			}
		}
		return failed;
	}
	var gets = {}, posts = {}, deletes = {};
	var routes = {
		"welcome" : "/welcome/:lang?",
		"demo" : "/demographics.info/:lang?",
		"instr" : "/instructions/:lang/:sessionId?",
		"pre-training" : "/pre.training/:lang/:sessionId?",
		"training" : "/training/:lang/:sessionId?",
		"pre-eval" : "/pre.evaluation/:lang/:sessionId?",
		"eval" : "/evaluation/:lang/:sessionId?",
		"results" : "/evaluation.results/:lang/:sessionId?",
		"emailme" : "/mail.results/:lang/:sessionId?",
		"feedback" : "/feedback/:sessionId?",
		"thanks" : "/thanks/:lang/:sessionId/:emailed?",
		"customFront": "/custom.front/:frontName?",
		"frontEditor": "/front.end.editor?",
		getReal : function(urlName, reqParams) {
			var resStr = this[urlName];
			Object.keys(reqParams).forEach(function(key) {
				resStr = resStr.replace(":" + key, reqParams[key]);
			});
			return resStr.replace("?", "/");
		}
	};

	gets["/strings/:lang/:main/tmp.js?"] = function(req, res) {
		function _codeWrapper(jsonStrings) {
			var cacheControl = process._debugMode ? "private, max-age=0, no-store, no-cache, must-revalidate" : 'public, max-age=' + (86400000 / 1000);
			if(!res.getHeader('Cache-Control')) {
				res.setHeader('Cache-Control', cacheControl);
			}
			var resBody = "window.App = window.App || {}; window.App.strings = window.App.strings || {}; window.App.strings['" + req.params.lang + "'] = " + jsonStrings + ";";
			if(req.params.main === "main") {
				resBody += "window.App.S = window.App.strings['" + req.params.lang + "'];";
			}
			res.status(200).send(resBody);
		}
		main.stringCache.getLocale((req.params.lang || "").toString().toLowerCase(), function(paramObj) {
			if(paramObj.isErr()) {
				if(req.params.lang.toLowerCase() == "en") {
					return res.redirect("/400");
				}
				return res.redirect(req.route.path.replace(":lang", "en").replace(":main", req.params.main));
			}
			_codeWrapper(paramObj.data);
		});
		return;
	};
	
	gets["/"] = function(req, res){
		res.redirect("/choose.language");
	};

	gets["/choose.language?"] = function(req, res) {
		res.status(200).render("main.template.ejs", {
			CssHrefs : ["/css/choose.lang.main.css"],
			jsSrcs : ["/js/choose.lang.main.js"],
			_debug : process._debugMode,
			langs : ["en", "it"],
			appParams : JSON.stringify({
				nextPage : routes.welcome
			})
		});
	};

	gets[routes.welcome] = function(req, res) {
		res.render("main.template.ejs", {
			CssHrefs : ["/css/message.css"],
			jsSrcs : ["/js/message.js", "/js/message.wlcm.js"],
			_debug : process._debugMode,
			langs : [req.params.lang],
			appParams : JSON.stringify({
				viewName : "welcome.ejs",
				nextPage : routes.getReal("demo", req.params)
			})
		});
	};

	gets[routes.demo] = function(req, res) {
		res.render("main.template.ejs", {
			CssHrefs : ["/css/demographics.css"],
			jsSrcs : ["/js/demographics.js"],
			_debug : process._debugMode,
			langs : [req.params.lang, "en"],
			appParams : JSON.stringify({
				postUrl : routes.getReal("demo", req.params)
			})
		});
	};

	// TODO update as API
	posts[routes.demo] = function(req, res) {
		main.saveDemogr(req.body, req.params.lang, function(paramObj) {
			if(!_ifActionFailed(paramObj, req, res)) {
				var session = paramObj.data;
				req.params.sessionId = session.assignedId;
				return res.status(200).set("Content-Type", "application/json").send({
					nextPage : routes.getReal("instr", req.params)
				});
			}
		});
	};

	gets[routes.instr] = function(req, res) {
		res.render("main.template.ejs", {
			CssHrefs : ["/css/message.css", "/css/message.instructions.css"],
			jsSrcs : ["/js/message.js"],
			_debug : process._debugMode,
			langs : [req.params.lang],
			appParams : JSON.stringify({
				viewName : "instructions.ejs",
				nextPage : routes.getReal("pre-training", req.params)
			})
		});
	};

	gets[routes["pre-training"]] = function(req, res) {
		res.render("main.template.ejs", {
			CssHrefs : ["/css/message.css"],
			jsSrcs : ["/js/message.js"],
			_debug : process._debugMode,
			langs : [req.params.lang],
			appParams : JSON.stringify({
				viewName : "pre.training.ejs",
				nextPage : routes.getReal("training", req.params)
			})
		});
	};

	function _theTest(stimuli, nextPage, postUrl, req, res) {
		res.render("main.template.ejs", {
			CssHrefs : ["/css/evaluation.css"],
			jsSrcs : ["/js/evaluation.js"],
			_debug : process._debugMode,
			langs : [req.params.lang],
			appParams : JSON.stringify({
				postUrl : postUrl,
				stimuli : stimuli,
				nextPage : nextPage
			})
		});
	}
	gets[routes["training"]] = function(req, res) {
		var stimuli = [{
			id : "test1",
			codeName : "1.png"
		}, {
			id : "test2",
			codeName : "2.png"
		}, {
			id : "test3",
			codeName : "3.png"
		}];
		stimuli = stimuli.map(function(el) {
			el["url"] = "/public/data/training/" + el["codeName"];
			return el;
		});
		_theTest(stimuli, routes.getReal("pre-eval", req.params), routes.getReal("training", req.params), req, res);
	};

	posts[routes["training"]] = function(req, res) {
		// we dont' save these data - just return 'success'
		res.status(200).send(JSON.stringify({
			resp : "Ok"
		}));
	};

	gets[routes["pre-eval"]] = function(req, res) {
		res.render("main.template.ejs", {
			CssHrefs : ["/css/message.css"],
			jsSrcs : ["/js/message.js"],
			_debug : process._debugMode,
			langs : [req.params.lang],
			appParams : JSON.stringify({
				viewName : "pre.evaluation.ejs",
				nextPage : routes.getReal("eval", req.params)
			})
		});
	};

	// TODO update as API
	gets[routes["eval"]] = function(req, res) {
		main.selectImgForTest(function(paramObj) {
			if(!_ifActionFailed(paramObj, req, res)) {
				var stimuli = paramObj.data.map(function(el) {
					el["url"] = "/imgstore/" + el["codeName"];
					return el;
				});
				_theTest(stimuli, routes.getReal("results", req.params), routes.getReal("eval", req.params), req, res);
			}
		});
	};

	// TODO update as API
	posts[routes["eval"]] = function(req, res) {
		main.saveTestRes(req.params.sessionId, req.body, function(paramObj) {
			if(!_ifActionFailed(paramObj, req, res)) {
				res.status(200).send(JSON.stringify({
					resp : "Ok"
				}));
			}
		});
	};

	// TODO update as API
	gets[routes["results"]] = function(req, res) {
		main.calcUserPerformace(req.params.sessionId, function(paramObj) {
			if(!_ifActionFailed(paramObj, req, res)) {
				res.render("main.template.ejs", {
					CssHrefs : ["/css/results.css"],
					jsSrcs : ["/js/results.js"],
					_debug : process._debugMode,
					langs : [req.params.lang],
					appParams : JSON.stringify({
						testResults : paramObj.data,
						postUrl : routes.getReal("emailme", req.params)
						// nextPage : routes.getReal("thanks", req.params)
					})
				});
			}
		});
	};

	posts[routes["emailme"]] = function(req, res) {
		req.params["emailed"] = "nonemailed";
		if(req.body.email) {
			var toAddr = req.body.email;
			var plainText = req.body.fallback;
			var nonInlinedHtml = req.body.html;
			main.emailResults(req.params.lang, toAddr, plainText, nonInlinedHtml, function(paramObj) {
				if(!paramObj.isErr()) {
					req.params["emailed"] = "emailed";
				}
				res.status(200).send(JSON.stringify({
					nextPageUrl : routes.getReal("thanks", req.params)
				}));
			});
		} else {
			res.status(200).send(JSON.stringify({
				nextPageUrl : routes.getReal("thanks", req.params)
			}));
		}
	};

	gets[routes["thanks"]] = function(req, res) {
		res.render("main.template.ejs", {
			CssHrefs : ["/css/message.css", "/css/thanks.css"],
			jsSrcs : ["/js/message.js", "/js/message.thanks.js"],
			_debug : process._debugMode,
			langs : [req.params.lang],
			appParams : JSON.stringify({
				emailed : req.params.emailed == "emailed" ? true : false,
				viewName : "thanks.ejs",
				postUrl : routes.getReal("feedback", req.params),
				nextPage : "/choose.language/"
			})
		});
	};

	posts[routes["feedback"]] = function(req, res) {
		main.saveFeedback(req.params.sessionId, req.body["feedback"], function(paramObj) {
			if(!_ifActionFailed(paramObj, req, res)) {
				res.status(200).send(JSON.stringify({
					ok : "ok"
				}));
			}
		});
	};
	
	// posts[routes["customFront"]] = function(req, res){
// 		
	// }

	(function _assign404() {
		var msgs = [];
		main.stringCache.getLangList(function(supportedLangs) {
			supportedLangs.forEach(function(lang) {
				main.stringCache.getString(lang, "_404", function(paramObj) {
					msgs.push(paramObj.data || "");
				});
			});
		});
		gets["/404"] = function(req, res) {
			res.status(400);
			if(req.accepts("html")) {
				return res.render("404.ejs", {
					msgs : msgs
				});
			}
			return res.set("Content-Type", "plain/text").send(msgs.join(". \n "));
		};
	})();

	(function _assign500() {
		var msgs = [];
		main.stringCache.getLangList(function(supportedLangs) {
			supportedLangs.forEach(function(lang) {
				main.stringCache.getString(lang, "_500", function(paramObj) {
					msgs.push(paramObj.data || "");
				});
			});
		});
		gets["/500"] = function(req, res) {
			res.status(500);
			if(req.accepts("html")) {
				return res.render("500.ejs", {
					msgs : msgs
				});
			}
			return res.set("Content-Type", "plain/text").send(msgs.join(". \n "));
		};
	})();

	clientErrorLogger.addRoutes(gets, posts);
	clientFeedbackLogger.addRoutes(gets, posts);

	return {
		gets : gets,
		posts : posts,
		deletes : deletes
	};
}
function getStaticRouteDict() {
	return {
		"/public" : path.join(__dirname, "..", "client.code"),
		"/public.shared" : path.join(__dirname, "..", "..", 'client.code.shared'),
		"/imgstore" : path.join(__dirname, "..", "client.code", "data", "selected", "img")
	};
}
function getViewRouteArr() {
	return [path.join(__dirname, "tmpl")];
}

module.exports = {
	init: init
};
