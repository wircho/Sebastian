import express from 'express';
var bodyParser 				= require('body-parser');
var cookieParser 			= require('cookie-parser');
var session      			= require('express-session');
var moment 					= require('moment');
const app 					= express();

//HTTP->HTTPS Redirect
app.use(function(req, res, next) {
	console.log("protocol is "+req.protocol);
	if (req.protocol === "https" || req.headers.host.indexOf("localhost") === 0 || req.headers.host.indexOf("127.0.0.1") === 0) {
		next();
	}else {
		var url = 'https://' + req.headers.host + req.url;
		console.log("redirecting to "+url);
		res.redirect(url);
	}
});

//Babel+Webpack
app.use('/', express.static('public'));

app.listen(process.env.PORT || 8080);