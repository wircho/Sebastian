import express from 'express';
var http 					= require('http');
var https 					= require('https');
var bodyParser 				= require('body-parser');
var cookieParser 			= require('cookie-parser');
var session      			= require('express-session');
var moment 					= require('moment');
const app 					= express();
var path 					= require('path');
var formidable 				= require('formidable');
var fs 						= require('fs');
import {
//Utilities
  pad,
  def,
  fallback,
  err,
  errstr,
  errdict,
  geterr,
  projf,
  projff,
//Object utilities
  mutate,
  remove,
  rotate
} from 'wircho-utilities';

//HTTP->HTTPS Redirect
app.use(function(req, res, next) {
	var secure = req.headers['x-forwarded-proto'] === "https";
	if (secure || req.headers.host.indexOf("localhost") === 0 || req.headers.host.indexOf("127.0.0.1") === 0) {
		next();
	}else {
		res.redirect('https://' + req.headers.host + req.url);
	}
});

//Babel+Webpack
app.use('/', express.static('public'));

//API
app.post('/submit', function (req, res) {
	var proto = req.headers['x-forwarded-proto'];
	var form = new formidable.IncomingForm();
	form.parse(req, function(error,fields,files) {
		if (error) {
			req.json(errdict(error));
			return;
		}
		console.log(fallback(proto,"http") + '://' + req.headers.host + "/submitted.html");
		res.redirect(fallback(proto,"http") + '://' + req.headers.host + "/submitted.html");
	});
});

app.listen(process.env.PORT || 8080);