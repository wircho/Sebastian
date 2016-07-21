import express from 'express';
var bodyParser 				= require('body-parser');
var cookieParser 			= require('cookie-parser');
var session      			= require('express-session');
var moment 					= require('moment');
const app 					= express();

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

//Babel+Webpack
app.use('/', express.static('public'));


//api
// app.get('/api', function (req, res) {
//
// });

app.listen(process.env.PORT || 8080);