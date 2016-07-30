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
const aws 					= require('aws-sdk');
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

const S3_BUCKET = process.env.S3_BUCKET_NAME;

// Promise utilities
function tryPromise(times,maker) {
	return new Promise(function(res,rej) {
		var promise = maker();
		promise.then(res, function(error) {
			if (times <= 1) {
				rej(error);
				return;
			}
			tryPromise(times-1,maker).then(res, rej);
		});
	});
}

// Utilities
var extRE = /(?:\.([^.]+))?$/;

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

//AWS
function fileExists(s3,fileName) {
	var params = {
		Bucket: S3_BUCKET,
		Key: fileName
	};
	console.log("0.2.1- Will check if file exists: " + fileName);
	return new Promise(function(res,rej) {
		console.log("0.2.2- Performing call");
		s3.headObject(params,function(error,metadata) {
			console.log("0.2.3- Responded call");
			if (error) {
				console.log("0.2.4A- Got error: " + error);
				if (error.code === "NotFound") {
					console.log("0.2.5A- Error code is not found");
					res(false);
				}else {
					console.log("0.2.5A- Error is another kind");
					rej(err(error));
				}
			}else {
				console.log("0.2.4B- No error. File exists");
				res(true);
			}
		});
	})
}
function generateFileName(ext) {
	var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i=0; i<5; i+=1) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    if (def(ext)) {
    	return text + "." + ext;
    }else {
    	return text;
    }
}
function generateUniqueFileName(s3,ext) {
	return new Promise(function(res,rej) {
		console.log("0.1- About to create file name.");
		var fileName = generateFileName(ext);
		console.log("0.2- Created file name: " + fileName);
		fileExists(s3,fileName + ".json").then(function(exists) {
			if (exists) {
				console.log("0.3A- File exists");
				generateUniqueFileName(s3).then(res,rej);
			} else {
				console.log("0.3B- File does not exist");
				res(fileName);
			}
		},rej);
	});
}
const validFileExtensions = ["jpg","jpeg","gif","png"];
function isExtensionValid(ext) {
	return validFileExtensions.indexOf(ext) > -1;
}
function getSignedURLInfo(s3,originalFileName,fileType,ext) {
	return new Promise(function(res,rej) {
		if (!def(originalFileName) || !def(fileType) || !def(ext)) {
			res({});
			return;
		}
		if (!isExtensionValid(ext)) {
			rej(err("Invalid file extension."));
			return;
		}
		
	});
}

//API
app.get('/sign-s3', function(req, res) {
	const s3 = new aws.S3();
	const originalFileName = req.query['file-name'];
	const ext = def(originalFileName) ? extRE.exec(originalFileName)[1].toLowerCase() : undefined;
	const fileType = req.query['file-type'];
	const message = req.query['message'];
	const name = req.query['name'];
	const latitude = req.query['latitude'];
	const longitude = req.query['longitude'];
	const zoom = req.query['zoom'];
	const json = {
		message,
		name,
		latitude,
		longitude,
		zoom
	}
	console.log("0- Will generate file name.");
	generateUniqueFileName(s3,ext).then(function(fileName) {
		console.log("1- Generated file name: " + fileName);
		var jsonFileName = fileName + ".json";
		var params = {
			Bucket: S3_BUCKET,
			Key: jsonFileName,
			ContentType: 'application/json',
			Body: JSON.stringify(json),
			ACL: 'public-read'
		}
		s3.putObject(params, function(error,data) {
			console.log("2- Put object");
			if (error) {
				res.json(errdict(error));
				return;
			}
			if (!def(fileType) || !def(ext)) {
				res.json({fileName});
				return;
			}
			var params = {
				Bucket: S3_BUCKET,
				Key: fileName,
				Expires: 60,
				ContentType: fileType,
				ACL: 'public-read'
			};
			s3.getSignedUrl('putObject', params, (error, data) => {
				console.log("3- Got signed url");
				if (error) {
					res.json(errdict(error));
					return;
				}
				res.json({
					fileName,
					signedRequest: data,
					url: "https://" + S3_BUCKET + ".s3.amazonaws.com/" + fileName
				});
			});
		});
	}, function(error) {
		res.json(errdict(error));
	});
});

// app.post('/submit', function (req, res) {
// 	var form = new formidable.IncomingForm();
// 	form.parse(req, function(error,fields,files) {
// 		if (error) {
// 			req.json(errdict(error));
// 			return;
// 		}
		
// 		res.json({id:"1"});
// 	});
// });

app.listen(process.env.PORT || 8080);