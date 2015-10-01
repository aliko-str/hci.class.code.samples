var _rootF = "../../";
var express = require('express');
var http = require("http");
var errorhandler = require("errorhandler");
var bodyParser = require('body-parser');
var requestLogger = require(_rootF +"helpers/request.logger.js");
var notFoundLogger = require(_rootF +"helpers/not.found.logger.js");
var serverErrorLogger = require(_rootF +"helpers/server.error.logger.js");
var ejs = require("ejs");
var path = require("path");
var compression = require('compression');
var _ = require("underscore");

var aServer = function() {
	const appId = "API app";
	var routes;
	var self = this;
	
	self._terminator = function(sig) {
		if( typeof sig === "string") {
			console.log('%s: Received %s - terminating the %s ...', Date(Date.now()), sig, appId);
			process.exit(1);
		}
		console.log('%s: ' + appId + ' stopped.', Date(Date.now()));
	};

	self._setupTerminationHandlers = function() {
		//  Process on exit and signals.
		process.on('exit', function() {
			self._terminator();
		});

		['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'].forEach(function(element, index, array) {
			process.on(element, function() {
				self._terminator(element);
			});
		});
	};

	self._initializeServer = function() {
		var cacheFor = process._debugMode?0:86400000;
		
		self.app = express();
		self.app.use(compression());
		self.app.use(bodyParser());

		var dynRouteArr = routes.addRoutes(self.app);
		var statRouteDict = routes.getStaticRouteDict();

		for(var statRout in statRouteDict) {
			self.app.use(statRout, express.static(statRouteDict[statRout], {maxAge: cacheFor}));
		}

		for(var r in dynRouteArr.gets) {
			self.app.get(r, (function(r, func) {
				return function(req, res) {
					requestLogger.log(req, "GET");
					return func(req, res);
				};
			})(r, dynRouteArr.gets[r]));
		}
		for(var r in dynRouteArr.posts) {
			self.app.post(r, (function(r, func) {
				return function(req, res) {
					requestLogger.log(req, "POST");
					return func(req, res);
				};
			})(r, dynRouteArr.posts[r]));
		}
		for(var r in dynRouteArr.deletes) {
			self.app["delete"](r, dynRouteArr.deletes[r]);
		}
		self.app.use(function(req, res, next) {
			notFoundLogger.log(req);
			return res.redirect("/404");
		});

		if(process._debugMode) {
			self.app.use(errorhandler());
			self.app.disable('view cache');
		} else {
			self.app.use(function(err, req, res, next) {
				serverErrorLogger.log(req, err.toString().substring(0, 256));
				res.redirect("/500");
				return;
			});
		}
	};

	self.init = function(port, ip, debugApp) {
		routes = require("./api.routes.js").init(debugApp);
		self.port = port;
		self.ipaddress = ip;
		self._setupTerminationHandlers();
		self._initializeServer();
		self.app.set("ip", ip);
		self.app.set("port", port);
		return self;
	};
};

module.exports = new aServer();
