import express from 'express';
var bodyParser 				= require('body-parser');
var cookieParser 			= require('cookie-parser');
var session      			= require('express-session');
var mongoose 				= require('mongoose');
var MongoStore 				= require('connect-mongo')(session);
var moment 					= require('moment');
const app 					= express();
const MONGODB_URI 			= fallback(process.env.MONGODB_URI,"mongodb://localhost:27017/my-db");
const MONGODB_SECRET		= fallback(process.env.MONGODB_SECRET,"uy7gn7gn78g7");

//Utilities
function def(x) {
	return typeof x !== 'undefined';
}

function fallback(x,y) {
	return def(x) ? x : y;
}

function err(error) {
	if (error.constructor === Error) {
		return error;
	}else {
		var data = error.data;
		if (def(data)) {
			var error1 = geterr(data);
			if (def(error1)) {
				return error1
			}else {
				try {
					var parsedData = JSON.parse(data);
				} catch(error2) {
					return err(data.toString());
				}
				var parsedError = geterr(parsedData);
				if (def(parsedError)) {
					return parsedError;
				}else {
					return err(data.toString());
				}
			}
		}else if (def(error.message)) {
			return Error(error.message.toString());
		}else {
			return Error(error.toString());
		}
	}
}

function errstr(error) {
	return err(error).message;
}

function errdict(error) {
	return {error:errstr(error)};
}

function geterr(data) {
	var str = (def(data.errors) && data.errors.length > 0) ? data.errors[0] : data.error;
	if (def(str) && def(str.message)) {
		str = str.message;
	}
	return !def(str) ? undefined : err(str);
}

function projf() {
  var args = Array.prototype.slice.call(arguments);
  var f = args[0];
  var globalArray = args.slice(1);
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var array = globalArray.slice();
    for (var i=0; i<array.length; i+=1) {
      if (!def(array[i])) {
        array[i] = args.shift();
      }
    }
    array = array.concat(args);
    return f.apply(this,array);
  }
}

function projff() {
  var args = Array.prototype.slice.call(arguments);
  var f = args[0];
  var globalArray = args.slice(1);
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var array = globalArray.map(x=>(def(x) ? x() : undefined));
    for (var i=0; i<array.length; i+=1) {
      if (!def(array[i])) {
        array[i] = args.shift();
      }
    }
    array = array.concat(args);
    return f.apply(this,array);
  }
}

//Time constants
var ONE_MINUTE = 1000*60;
var TWO_MINUTES = ONE_MINUTE*2;
var HALF_HOUR = ONE_MINUTE*30;
var ONE_HOUR = ONE_MINUTE*60;
var ONE_DAY = ONE_HOUR*24;
var ONE_WEEK = ONE_DAY*7;
var TWO_WEEKS = ONE_WEEK*2;
var ONE_YEAR = ONE_DAY*365;

//Database+Session
mongoose.connect(MONGODB_URI, function(error) {
	if (error) {
		console.log("Error connecting to Mongo:");
		console.log(error);
	}
});
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    cookie: { maxAge: ONE_YEAR } ,
    secret: MONGODB_SECRET ,
    resave: true,
    saveUninitialized: true,
    store:new MongoStore({
    	mongooseConnection: mongoose.connection,
        collection: 'session', 
        auto_reconnect:true
    })
}));

//Babel+Webpack
app.use('/', express.static('public'));


//api
app.get('/api', function (req, res) {

});

app.listen(process.env.PORT || 8080);