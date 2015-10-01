var _rootF = "../../";
var path = require("path");
var guiCollectorCrowd = require("./main.js");
var classes = require(_rootF + 'helpers/classes.js');
var clientErrorLogger = require(_rootF + "helpers/client.error.logger.js");
var clientFeedbackLogger = require(_rootF + "helpers/client.feedback.logger.js");
var serverErrorLogger = require(_rootF + "helpers/server.error.logger.js");
var _ = require("underscore");
const contract = require("fs").readFileSync(path.join(__dirname, "API.contract.txt"));

function addRoutes(server, main) {
	function _ifActionFailed(paramObj, req, res) {
		var failed = false;
		if(paramObj.isErr()) {
			failed = true;
			if(paramObj.code >= 500) {
				serverErrorLogger.log(req, paramObj.message.toString().substring(0, 256));
				res.status(paramObj.code).set("Content-Type", "text/plain").send("We are confused... An error occured on the server.");
			} else if(paramObj.code >= 400) {
				res.redirect("/404");
			} else {
				res.status(paramObj.code).set("Content-Type", "text/plain").send("Unrecognized Error");
			}
		}
		return failed;
	}
	var gets = {}, posts = {}, deletes = {};
	const routes = {
		"contract" : "/contract?",
		"ping" : "/ping?",
		"demo" : "/demographics.info/:lang?",
		"eval" : "/stimuli/:lang/:sessionId?",
		"results" : "/evaluation.results/:lang/:sessionId?",
		"emailme" : "/mail.results/:lang/:sessionId?",
		"feedback" : "/feedback/:sessionId?"
	};

	gets[routes["contract"]] = function(req, res) {
		res.status(200).set("content-type", "text/plain").send(contract);
	};

	gets[routes.ping] = function(req, res) {
		res.status(200).set("content-type", "application/json").send({
			"ping" : "ok"
		});
	};

	posts[routes.demo] = function(req, res) {
		main.saveDemogr(req.body, req.params.lang, function(paramObj) {
			if(!_ifActionFailed(paramObj, req, res)) {
				var session = paramObj.data;
				return res.status(200).set("Content-Type", "application/json").send(session);
			}
		});
	};

	gets[routes["eval"]] = function(req, res) {
		main.selectImgForTest(function(paramObj) {
			if(!_ifActionFailed(paramObj, req, res)) {
				var stimuli = paramObj.data.map(function(el) {
					el["url"] = "/imgstore/" + el["codeName"];
					return el;
				});
				res.status(200).set("content-type", "application/json").send(stimuli);
			}
		});
	};

	posts[routes["eval"]] = function(req, res) {
		main.saveTestRes(req.params.sessionId, req.body, function(paramObj) {
			if(!_ifActionFailed(paramObj, req, res)) {
				res.status(200).send(paramObj.data);
			}
		});
	};

	gets[routes["results"]] = function(req, res) {
		main.calcUserPerformace(req.params.sessionId, function(paramObj) {
			if(!_ifActionFailed(paramObj, req, res)) {
				res.status(200).send(paramObj.data);
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
					resp : "Emailed"
				}));
			});
		} else {
			res.status(200).send(JSON.stringify({
				resp : "Not emailed: no address given"
			}));
		}
	};

	posts[routes["feedback"]] = function(req, res) {
		main.saveFeedback(req.params.sessionId, req.body["feedback"], function(paramObj) {
			if(!_ifActionFailed(paramObj, req, res)) {
				res.status(200).send(JSON.stringify(paramObj.data));
			}
		});
	};

	gets["/404?"] = function(req, res) {
		res.status(400).set("content-type", "application/json").send({
			"status" : 400,
			"message" : "No luck. Try a different url."
		});
	};

	gets["/500?"] = function(req, res) {
		res.status(500).set("content-type", "application/json").send({
			"status" : 500,
			"message" : "The server has experienced a critical error. Please notify the server administrator with about the issue."
		});
	};

	// TODO add client error logging

	server.use(function(req, res, next) {
		if(req.method.toLowerCase() == "post") {
			if(!req.body || !_.size(req.body)) {
				return res.status(400).set("content-type", "text/plain").send("The body of a POST request is empty.");
			}
			if(!_isJsonString(req.body)){
				return res.status(400).set("content-type", "text/plain").send("The body of a POST ins't a valid JSON.");
			}
		}
		next();
	});

	return {
		gets : gets,
		posts : posts,
		deletes : deletes
	};
}
function _isJsonString(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}
function getStaticRouteDict() {
	return {
		"/imgstore" : path.join(__dirname, "..", "client.code", "data", "selected", "img")
	};
}
function init(ifDebugMode) {
	var main = require("./main.js").init(ifDebugMode);
	return {
		addRoutes : _.partial(addRoutes, _, main),
		getStaticRouteDict : getStaticRouteDict
	};
}

module.exports = {
	init : init
};
