import express from 'express';
var http 					= require('http');
var https 					= require('https');
var bodyParser 				= require('body-parser');
var cookieParser 			= require('cookie-parser');
var session      			= require('express-session');
var moment 					= require('moment');
const app 					= express();

//HTTP->HTTPS Redirect
app.use(function(req, res, next) {
	var secure = req.headers['x-forwarded-proto'] === "https";
	console.log("secure connection: " + secure);
	if (secure || req.headers.host.indexOf("localhost") === 0 || req.headers.host.indexOf("127.0.0.1") === 0) {
		next();
	}else {
		var url = 'https://' + req.headers.host + req.url;
		console.log("redirecting to: " + url);
		res.redirect(url);
	}
});

//Babel+Webpack
app.use('/', express.static('public'));

app.listen(process.env.PORT || 8080);