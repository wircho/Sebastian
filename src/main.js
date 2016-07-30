import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import Immutable from 'immutable';
var classNames = require('classnames');
import $ from 'jquery';
import 'jquery-form';
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

// Local utilities
function nullFallback(x,y) {
  if (def(x) && x !== null) {
    return x;
  }
  return y;
}

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

// function submitForm(form) {
//   return new Promise(function(res,rej) {
//     $(form).ajaxSubmit({
//       dataType:"json",
//       success:function(data) {
//         var error = geterr(data);
//         if (def(error)) {
//           rej(error);
//           return;
//         }
//         res(data);
//       },
//       error:function(xhr, status, error) {
//         rej(error);
//       }
//     });
//   });
// }

function apiReq(dict) {
  return new Promise(function(res,rej) {
    $.ajax(mutate({
      method:"GET",
      dataType:"json",
      success:function(json) {
        var error = geterr(json);
        if (def(error)) {
          rej(error);
          return;
        }
        res(json);
      },
      error:function(xhr,status,error) {
        rej(err(error));
      }
    },dict));
  });
}

function uploadData() {
  var files = $("#picture").get(0).files;
  var file = (def(files) && files !== null) ? files[0] : undefined;
  file = (def(file) && file !== null) ? file : undefined;
  var message = $("#message").val();
  var name = $("#name").val();
  var latitude = $("#location-latitude").val();
  var longitude = $("#location-longitude").val();
  var zoom = $("#location-zoom").val();
  var data = {
    message,
    name,
    latitude,
    longitude,
    zoom
  };
  if (def(file)) {
    data["file-name"] = file.name;
    data["file-type"] = file.type;
  }
  return new Promise(function(res,rej) {
    apiReq({url:"/sign-s3",data}).then(function(json) {
      var signedRequest = json.signedRequest;
      var url = json.url;
      var fileName = json.fileName;
      if (!def(signedRequest) || !def(url)) {
        res({fileName});
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedRequest);
      xhr.onreadystatechange = () => {
        if(xhr.readyState === 4){
          if(xhr.status === 200){
            res({fileName});
          } else{
            rej(err("Failed to upload image file."));
          }
        }
      };
      xhr.send(file);
    },rej);
  });
}

const FORM = {
  MAX_MESSAGE:256,
  MAX_NAME:128
}

function clearForm() {
  $("#form").get(0).reset();
}

function storageAvailable(type) {
  try {
    var storage = window[type],
    x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  }
  catch(e) {
    return false;   
  }
}

var submittedMessagesKey = 'submittedMessages';
function storeMessageData(data) {
  if (storageAvailable('localStorage')) {
    var array = JSON.parse(nullFallback(localStorage.getItem(submittedMessagesKey),"[]"));
    array.push(data);
    localStorage.setItem(submittedMessagesKey,JSON.stringify(array));
  }
}

// Constants
const STEPS = {
  LOCKED:-1,
  NONE:0,
  PICTURE:1,
  LOCATION:2,
  MESSAGE:3,
  ALL:3
}

const ACTIONS = {
  FINISH_STEP:"FINISH_STEP", // step: Step.SOMETHING
  DISPLAY_MAP:"DISPLAY_MAP", // No parameters
  HIDE_MAP:"HIDE_MAP", // No parameters
  UPDATE_MAP:"UPDATE_MAP", // latitude:, longitude:, zoom:
  ENABLE_APP:"ENABLE_APP", // enabled: Bool
  CLEAR_STEPS:"CLEAR_STEPS", // No parameters
  UNDO_SUBMIT_STEP:"UNDO_SUBMIT_STEP", // No parameters
  DONE:"DONE" // No parameters
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
const clearSteps = enabled=>({type:ACTIONS.CLEAR_STEPS,enabled});
const undoSubmitStep = enabled=>({type:ACTIONS.UNDO_SUBMIT_STEP,enabled});
const showDone = ()=>({type:ACTIONS.DONE});

// Reducer
const initialState = {step:STEPS.LOCKED}
const clearState = {step:STEPS.NONE}
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
    case ACTIONS.CLEAR_STEPS:
      return clearState
      break;
    case ACTIONS.UNDO_SUBMIT_STEP:
      return mutate(state,{step:STEPS.ALL - 1});
      break;
    case ACTIONS.DONE:
      return mutate(state,{done:true});
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
  },
  clickedSubmitButton: (submitted,submitFailed) => {
    dispatch(finishStep(STEPS.ALL));
    uploadData().then(function(data) {
      submitted(data);
    }, function(error) {
      submitFailed(error);
    });
  },
  submitFailed: (error) => {
    dispatch(undoSubmitStep());
    alert("Something went wrong. Please try again. " + error.message);
  },
  submitted: (data) => {
    storeMessageData(data);
    clearForm();
    dispatch(showDone());
  },
  clickedGetBack: (event) => {
    event.preventDefault();
    dispatch(clearSteps());
  }
});

//React classes
const App = React.createClass({
  componentDidMount: function() {
    var component = this;
    $('#form').submit(function(event) {
      event.preventDefault();
      return false;
    });
  },
  clickedSubmitButton: function(event) {
    event.preventDefault();
    this.props.clickedSubmitButton(this.props.submitted,this.props.submitFailed);
  },
  render: function() {
    return (
      <div id="outer-content">
        <div id="sent-content" className={classNames({hidden:!fallback(this.props.done,false)})}>
          <div id="sent-title">Votre message a bien<br/>&eacute;t&eacute; envoy&eacute;.</div>
          <div id="sent-message">merci!</div>
          <a href="/" id="sent-back" onClick={this.props.clickedGetBack}>get back</a>
        </div>
        <div
          id="inner-content"
          className={classNames({disabled:!fallback(this.props.app_enabled,true),hidden:fallback(this.props.done,false)})}
        >
          <form
            id="form"
            ref="form"
            action="/submit"
            method="post"
            encType="multipart/form-data"
          >
            <div id="header">CHER MTL,</div>
            <Steps
              step={this.props.step}
              map={this.props.map}
              text={this.props.text}
              selectedPicture={this.props.selectedPicture}
              skippedPicture={this.props.skippedPicture}
              clickedLocationButton={this.props.clickedLocationButton}
              clickedSubmitButton={this.clickedSubmitButton}
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
          </form>
        </div>
      </div>
    );
  }
});

const Steps = React.createClass({
  render: function() {
    var nextStep = this.props.step + 1;
    return (<ul id="steps" className={(def(this.props.map) && this.props.map.visible) ? "hidden" : "block"}>
      <PictureStep 
        active={nextStep >= STEPS.PICTURE && this.props.step < STEPS.ALL}
        done={nextStep > STEPS.PICTURE} 
        selectedPicture={this.props.selectedPicture}
        skippedPicture={this.props.skippedPicture}
      />
      <LocationStep
        active={nextStep >= STEPS.LOCATION && this.props.step < STEPS.ALL}
        done={nextStep > STEPS.LOCATION}
        map={this.props.map}
        clickedLocationButton={this.props.clickedLocationButton}
      />
      <MessageStep
        active={nextStep >= STEPS.MESSAGE && this.props.step < STEPS.ALL}
        done={nextStep > STEPS.MESSAGE}
        clickedSubmitButton={this.props.clickedSubmitButton}
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
      <input type="file" id="picture" name="picture" accept="image/*" onChange={this.props.selectedPicture}/>
      <div id="orskip" className={classNames({hidden:this.props.done})}>
        <button id="skip" onClick={this.props.skippedPicture}>plus tard</button>
      </div>
    </Step>);
  }
});

const LocationStep = React.createClass({
  render: function() {
    var clickedLocationButton = projff(this.props.clickedLocationButton,undefined,()=>(this.props.map));
    return (<Step active={this.props.active} done={this.props.done}>
      <button id="pin-location" disabled={!this.props.active} onClick={clickedLocationButton}>trouver mon emplacement</button>
      <Info dictionary={def(this.props.map) ? this.props.map.savedLocation : undefined} prefix="location" />
    </Step>);
  }
});

const Info = React.createClass({
  render: function() {
    var dictionary = this.props.dictionary;
    var inputs = [];
    var prefix = this.props.prefix;
    for (var key in dictionary) {
      if (dictionary.hasOwnProperty(key)) {
        var id = prefix + "-" + key;
        inputs.push(<input type="hidden" key={key} value={dictionary[key]} id={id} name={id}/>);
      }
    }
    var hiddenStyle = {
      display:"none"
    }; 
    return (
      <div style={hiddenStyle}>{inputs}</div>
    )
  }
})

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
        name="message"
        className={classNames({tall:this.props.active,short:!this.props.active})}
        placeholder="message (optionnel)"
        disabled={!this.props.active}
        maxLength={FORM.MAX_MESSAGE}
      />
      <div id="merci" className={classNames({hidden:!this.props.active})}>
        MERCI,<br/>
        <input type="text" id="name" name="name" maxLength={FORM.MAX_NAME} placeholder="name (optional)" disabled={!this.props.active}/>
      </div>
      <button
        type="submit"
        id="submit"
        disabled={!this.props.active}
        onClick={this.props.clickedSubmitButton}
      >envoyer</button>
    </Step>);
  }
});

const isTouchDevice = 'ontouchstart' in document.documentElement;

const MapCanvas = React.createClass({
  componentDidUpdate: function(prevProps) {
    if (def(prevProps.map) && prevProps.map.visible) {
      return;
    }
    if (def(this.props.map) && this.props.map.visible) {
      var center = new google.maps.LatLng(this.props.map.location.latitude,this.props.map.location.longitude);
      var zoom = this.props.map.location.zoom;
      var mapOptions = {
        center: center,
        zoom: zoom
      };
      var map = new google.maps.Map(document.getElementById("map-canvas"),mapOptions);
      if (isTouchDevice) {
        var handler = function() {
          center = map.getCenter();
          this.props.mapChanged({zoom:map.getZoom(),latitude:center.lat(),longitude:center.lng()});
        }.bind(this);
        map.addListener("zoom_changed",handler);
        map.addListener("dragend",handler);
      }else {
        map.addListener("zoom_changed",function() {
          map.setCenter(center);
          this.props.mapChanged({zoom:map.getZoom()});
        }.bind(this));
        map.addListener("dragend",function() {
          center = map.getCenter();
          this.props.mapChanged({latitude:center.lat(),longitude:center.lng()});
        }.bind(this));
      }
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
          >choisir</button>
          <button
            id="map-cancel"
            onClick={this.props.clickedMapCancelButton}
          >annuler</button>
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
ReactDOM.render(
  <Provider store={store}><VisibleApp /></Provider>,
  document.getElementById('content')
);
window.initedGoogleMaps = function() {
  store.dispatch(finishStep(STEPS.NONE));
};
