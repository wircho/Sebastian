import express from 'express';
var bodyParser 				= require('body-parser');
var cookieParser 			= require('cookie-parser');
var session      			= require('express-session');
var moment 					= require('moment');
const app 					= express();

//Babel+Webpack
app.use('/', express.static('public'));

app.listen(process.env.PORT || 8080);