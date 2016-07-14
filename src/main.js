import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import Immutable from 'immutable'
import $ from 'jquery'

//Google maps API Keys


//Utilities
function pad(num, size) {
  var s = num+"";
  while (s.length < size) s = "0" + s;
  return s;
}

function def(x) {
  return typeof x !== 'undefined';
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

//Object utilities
function mutate(object,newValues) {
  var copy = {};
  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      if (!def(newValues[property])) {
        copy[property] = object[property];
      }
    }
  }
  for (var property in newValues) {
    if (newValues.hasOwnProperty(property)) {
      copy[property] = newValues[property];
    }
  }
  return copy;
}
function remove(object,key) {
  var keys = (key.constructor === Array) ? key : [key];
  var copy = {};
  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      if (keys.indexOf(property) === -1) {
        copy[property] = object[property];
      }
    }
  }
  return copy;
}
function rotate(array,amount) {
  while (amount < 0) {
    amount += array.length;
  }
  if (amount > 0) {
    amount = amount % array.length;
    var first = array.slice(0,amount);
    var second = array.slice(amount);
    return second.concat(first);
  }else {
    return array;
  }
}

// Location utilities
function getLocation() {
  return new Promise(function(resolve,reject) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(resolve, function(error) {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            reject(Error("User denied the request for Geolocation."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(Error("Location information is unavailable."));
            break;
          case error.TIMEOUT:
            reject(Error("The request to get user location timed out."));
            break;
          case error.UNKNOWN_ERROR:
            reject(Error("An unknown error occurred."));
            break;
        }
      });
    } else {
      reject(Error("Not supported"));
    }
  });
}

// App
function stepChange(i,j) {
  var $stepI = $("#steps > li:nth-child("+i+")");
  var $stepJ = $("#steps > li:nth-child("+j+")");
  $stepI.addClass("done");
  $stepJ.removeClass("disabled");
}

window.initedGoogleMaps = function() {
  $(document).ready(function() {
    var $steps = $("#steps");
    var $picInput = $("#take-picture");
    var $locationButton = $("#pin-location");
    var $locationInput = $("#location");
    var mapCanvasId = "map-canvas";
    var $mapCanvas = $("#" + mapCanvasId);
    var $mapOverlay = $("#map-overlay");
    var $mapDone = $("#map-done");
    var $mapCancel = $("#map-cancel");
    var $textArea = $("#text");
    var $submitButton = $("#submit");
    $picInput.change(function() {
      stepChange(1,2);
      $locationButton.attr("disabled",false);
    });
    var showMap = function(location,zoom) {
      $steps.css("display","none");
      $mapCanvas.css("display","");
      $mapOverlay.css("display","");
      $mapDone.unbind();
      $mapCancel.unbind();
      var center = new google.maps.LatLng(location.coords.latitude,location.coords.longitude);
      var mapOptions = {
        center: center,
        zoom: zoom
      };
      var map = new google.maps.Map(document.getElementById(mapCanvasId),mapOptions);
      var mapZoomed = function(zoom) {
        if (zoom > 17) {
          $mapDone.removeClass("disabled");
          $mapDone.attr("disabled",false);
        }else {
          $mapDone.addClass("disabled");
          $mapDone.attr("disabled",true);
        }
      }
      mapZoomed(zoom);
      map.addListener("zoom_changed",function() {
        map.setCenter(center);
        mapZoomed(map.getZoom());
      });
      map.addListener("dragend",function() {
        center = map.getCenter();
      });
      var storeLocation = function() {
        var center = map.getCenter();
        var string = center.lat() + "," + center.lng() + "," + map.getZoom();
        $locationInput.val(string);
      };
      $mapDone.click(function() {
        stepChange(2,3);
        storeLocation();
        $textArea.attr("disabled",false);
        $submitButton.attr("disabled",false);
        $steps.css("display","");
        $mapCanvas.css("display","none");
        $mapOverlay.css("display","none");
        $textArea.focus();
      });
      $mapCancel.click(function() {
        storeLocation();
        $steps.css("display","");
        $mapCanvas.css("display","none");
        $mapOverlay.css("display","none");
      });
    };
    $locationButton.click(function() {
      var locationInfo = ($locationInput.val() + "").split(",");
      if (locationInfo.length === 3) {
        var lat = locationInfo[0]*1;
        var lng = locationInfo[1]*1;
        var zoom = locationInfo[2]*1;
        showMap({coords:{latitude:lat,longitude:lng}},zoom);
      }else {
        getLocation().then(function(location) {
          showMap(location,20);
        },function() {
          showMap({coords:{latitude:45.501926,longitude:-73.563103}},8)
        });
      }
    });
  });
};