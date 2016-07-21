import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import Immutable from 'immutable'
var classNames = require('classnames');
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
      navigator.geolocation.getCurrentPosition(function(location) {
        resolve({latitude:location.coords.latitude,longitude:location.coords.longitude});
      },
      function(error) {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            reject(err("User denied the request for Geolocation."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(err("Location information is unavailable."));
            break;
          case error.TIMEOUT:
            reject(err("The request to get user location timed out."));
            break;
          case error.UNKNOWN_ERROR:
            reject(err("An unknown error occurred."));
            break;
        }
      });
    } else {
      reject(err("Not supported"));
    }
  });
}

// Constants
const STEPS = {
  NONE:0,
  PICTURE:1,
  LOCATION:2,
  MESSAGE:3
}

const ACTIONS = {
  FINISH_STEP:"FINISH_STEP", // step: Step.SOMETHING
  DISPLAY_MAP:"DISPLAY_MAP", // No parameters
  HIDE_MAP:"HIDE_MAP", // No parameters
  UPDATE_MAP:"UPDATE_MAP", // latitude:, longitude:, zoom:
  ENABLE_APP:"ENABLE_APP", // enabled: Bool
}

const MONTREAL_LOCATION = {latitude:45.501926,longitude:-73.563103,zoom:8};

// Redux model
/*
{
  step:STEPS.SOMETHING,
  map:{
    visible:,
    location:{latitude:,longitude:,zoom:},
    savedLocation:{latitude:,longitude:,zoom:}
  }
  text:"..."
}
*/

// Actions creators
const finishStep = step=>({type:ACTIONS.FINISH_STEP,step});
const displayMap = ()=>({type:ACTIONS.DISPLAY_MAP});
const hideMap = save=>({type:ACTIONS.HIDE_MAP,save});
const updateMap = location=>({type:ACTIONS.UPDATE_MAP,location});
const enableApp = enabled=>({type:ACTIONS.ENABLE_APP,enabled});

// Reducer
const initialState = {step:STEPS.NONE}
function app(state,action) {
  if (!def(state)) {
    return initialState
  }
  switch (action.type) {
    case ACTIONS.FINISH_STEP:
      if (action.step > state.step) {
        return mutate(state,{step:action.step});
      }else {
        return state;
      }
      break;
    case ACTIONS.DISPLAY_MAP:
      return mutate(state,{map:mutate(fallback(state.map,{}),{visible:true})});
      break;
    case ACTIONS.HIDE_MAP:
      var location = state.map.location;
      var savedLocation = state.map.savedLocation;
      if (action.save) {
        return mutate(state,{map:mutate(fallback(state.map,{}),{visible:false,location,savedLocation:location})});
      }else if (def(savedLocation)){
        return mutate(state,{map:mutate(fallback(state.map,{}),{visible:false,location:savedLocation,savedLocation})});
      }else {
        return mutate(state,{map:mutate(remove(fallback(state.map,{}),["location","savedLocation"]),{visible:false})});
      }
      break;
    case ACTIONS.UPDATE_MAP:
      var oldLocation = def(state.map) ? fallback(state.map.location,{}) : {};
      var location = mutate(oldLocation,action.location);
      return mutate(state,{map:mutate(fallback(state.map,{}),{location})});
      break;
    case ACTIONS.ENABLE_APP:
      return mutate(state,{app_enabled:action.enabled});
      break;
  }
}

// Map state to props
const mapStateToProps = state=>state;

const mapDispatchToProps = (dispatch) => ({
  selectedPicture: (event) => {
    event.preventDefault();
    dispatch(finishStep(STEPS.PICTURE));
  },
  skippedPicture: (event) => {
    event.preventDefault();
    dispatch(finishStep(STEPS.PICTURE));
  },
  clickedLocationButton: (event,map) => {
    event.preventDefault();
    if (def(map) && def(map.location)) { // There is already some map info
      dispatch(displayMap());
    } else { // There is 
      dispatch(enableApp(false));
      getLocation().then(function(location) {
        dispatch(enableApp(true));
        dispatch(updateMap(mutate(location,{zoom:20})));
        dispatch(displayMap());
      },function() {
        dispatch(enableApp(true));
        dispatch(updateMap(MONTREAL_LOCATION));
        dispatch(displayMap());
      });
    }
  },
  clickedMapCancelButton: (event) => {
    event.preventDefault();
    dispatch(hideMap(false));
  },
  clickedMapDoneButton: (event) => {
    event.preventDefault();
    dispatch(finishStep(STEPS.LOCATION));
    dispatch(hideMap(true));
  },
  mapChanged: (location) => {
    dispatch(updateMap(location));
  }
});

//React classes
const App = React.createClass({
  render: function() {
    return (<div id="inner-content" className={classNames({disabled:!fallback(this.props.app_enabled,true)})}>
      <div id="header">CHER MTL,</div>
      <Steps
        step={this.props.step}
        map={this.props.map}
        text={this.props.text}
        selectedPicture={this.props.selectedPicture}
        skippedPicture={this.props.skippedPicture}
        clickedLocationButton={this.props.clickedLocationButton}
      />
      <MapCanvas
        map={this.props.map}
        mapChanged={this.props.mapChanged}
      />
      <MapOverlay
        map={this.props.map}
        clickedMapCancelButton={this.props.clickedMapCancelButton}
        clickedMapDoneButton={this.props.clickedMapDoneButton}
      />
    </div>);
  }
});

const Steps = React.createClass({
  render: function() {
    var nextStep = this.props.step + 1;
    return (<ul id="steps" className={(def(this.props.map) && this.props.map.visible) ? "hidden" : "block"}>
      <PictureStep 
        active={nextStep >= STEPS.PICTURE}
        done={nextStep > STEPS.PICTURE} 
        selectedPicture={this.props.selectedPicture}
        skippedPicture={this.props.skippedPicture}
      />
      <LocationStep
        active={nextStep >= STEPS.LOCATION}
        done={nextStep > STEPS.LOCATION}
        map={this.props.map}
        clickedLocationButton={this.props.clickedLocationButton}
      />
      <MessageStep
        active={nextStep >= STEPS.MESSAGE}
        done={nextStep > STEPS.MESSAGE}
      />
    </ul>);
  }
});

const Step = React.createClass({
  render: function() {
    return (<li id={this.props.id} className={classNames({disabled:!this.props.active,done:this.props.done})}>{this.props.children}</li>);
  }
})

const PictureStep = React.createClass({
  render: function() {
    return (<Step active={this.props.active} done={this.props.done}>
      <input type="file" id="take-picture" accept="image/*" onChange={this.props.selectedPicture}/>
      <div id="orskip" className={classNames({hidden:this.props.done})}>
        <button id="skip" onClick={this.props.skippedPicture}>skip</button>
      </div>
    </Step>);
  }
});

const LocationStep = React.createClass({
  render: function() {
    var clickedLocationButton = projff(this.props.clickedLocationButton,undefined,()=>(this.props.map));
    return (<Step active={this.props.active} done={this.props.done}>
      <button id="pin-location" disabled={!this.props.active} onClick={clickedLocationButton}>pin your location</button>
    </Step>);
  }
});

const MessageStep = React.createClass({
  componentDidUpdate: function(prevProps) {
    if (!prevProps.active && this.props.active) {
      $("#message").focus();
      $("html, body").animate({
        scrollTop: $("#message-step").offset().top - 5
      }, 100);
    }
  },
  render: function() {
    return (<Step active={this.props.active} done={this.props.done} id="message-step">
      <textarea
        id="message"
        className={classNames({tall:this.props.active,short:!this.props.active})}
        placeholder="message (optional)"
        disabled={!this.props.active}
      />
      <div id="merci" className={classNames({hidden:!this.props.active})}>
        MERCI,<br/>
        <input type="text" id="name" placeholder="name (optional)" disabled={!this.props.active}/>
      </div>
      <button id="submit" disabled={!this.props.active}>submit</button>
    </Step>);
  }
});

const MapCanvas = React.createClass({
  componentDidUpdate: function(prevProps) {
    if (def(prevProps.map) && prevProps.map.visible) {
      return;
    }
    if (def(this.props.map) && this.props.map.visible) {
      console.log("showing map...");
      var center = new google.maps.LatLng(this.props.map.location.latitude,this.props.map.location.longitude);
      var zoom = this.props.map.location.zoom;
      var mapOptions = {
        center: center,
        zoom: zoom
      };
      var map = new google.maps.Map(document.getElementById("map-canvas"),mapOptions);
      map.addListener("zoom_changed",function() {
        map.setCenter(center);
        this.props.mapChanged({zoom:map.getZoom()});
      }.bind(this));
      map.addListener("dragend",function() {
        center = map.getCenter();
        this.props.mapChanged({latitude:center.lat(),longitude:center.lng()});
      }.bind(this));
    }
  },
  render: function() {
    if (def(this.props.map) && this.props.map.visible) {
      return <div id="map-canvas-container"><div id="map-canvas" /></div>;
    }else {
      return false;
    }
  }
});

const MapOverlay = React.createClass({
  render: function() {
    if (def(this.props.map) && this.props.map.visible) {
      var disabled = this.props.map.location.zoom <= 17;
      return (<div id="map-overlay">
        <div id="map-pin"></div>
        <div id="map-buttons">
          <button
            id="map-done"
            className={disabled ? "disabled" : undefined}
            disabled={disabled}
            onClick={this.props.clickedMapDoneButton}
          >Done</button>
          <button
            id="map-cancel"
            onClick={this.props.clickedMapCancelButton}
          >Cancel</button>
        </div>
      </div>);
    }else {
      return false;
    }
  }
});

//React / Redux connection and render
const store = createStore(app);
const VisibleApp = connect(mapStateToProps,mapDispatchToProps)(App);
window.initedGoogleMaps = function() {
  ReactDOM.render(
    <Provider store={store}><VisibleApp /></Provider>,
    document.getElementById('content')
  );
};
/*

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

*/