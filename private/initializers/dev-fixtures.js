import Ember from 'ember';
import ENV from '../config/environment';
import devFixturesLoad from '../utils/dev-fixtures/load';
import Overlay from '../utils/dev-fixtures/overlay';


var debug = Ember.debug;
var $ = Ember.$;
var EmberString = Ember.String;
var fmt = EmberString.fmt;

export var STORAGE_KEY = ENV.modulePrefix + '$dev-fixtures-overlay#' + ENV.environment;


// first of all load all the modules
devFixturesLoad();


/**
 * Reads and save the overlay
 *
 * @function readOverlay
 * @param {Ember.Application} application
 * @return {{from: string, name: string|null}}
 */
function readOverlay(application) {
  var possibleValues, value;
  if (Ember.testing) {
    // when in test mode, use the overlay specified in the application
    value = {from: 'test:startApp()', name: application.get('devFixtures.overlay')};
  }
  else {
    // else try many locations
    possibleValues = [];
    location.href.replace(/(?:\?|&)FIXTURES_OVERLAY(?:=([^&#$]*))?(?:&|#|$)/, function (dummy, value) {
      value = value ? decodeURIComponent(value) : null;
      possibleValues.push({from: 'location.search:FIXTURES_OVERLAY', name: value});
    });
    possibleValues.push({
      from: 'file:config/environment.js',
      name: application.get('devFixtures.overlay')
    });
    possibleValues.push({
      from: 'localStorage:' + STORAGE_KEY,
      name: window.localStorage.getItem(STORAGE_KEY)
    });
    // grabbing the first one not undefined
    value = Ember.A(possibleValues).find(function (value) {
      return value !== undefined;
    });
    // saving it in the localStorage
    if (value && value.name) {
      window.localStorage.setItem(STORAGE_KEY, value.name);
    }
    else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  // no overlay found anywhere
  if (!value) {
    value = {from: 'default', name: null};
  }
  return value;
}


/**
 * Initialize our dev-fixtures stuffs
 *
 * @param {Ember.Container} container
 * @param {Ember.Application} application
 */
export function initialize(container, application) {
  var overlayMeta, overlay, fixtures;

  // read the overlay
  overlayMeta = readOverlay(application);
  overlay = Overlay.for(overlayMeta.name);
  fixtures = overlay.get('serializedFixtures');
  debug(fmt('[dev-fixtures] Using %@ (specified in: %@).', overlay.get('label'), overlayMeta.from));
  if (application.get('LOG_DEV_FIXTURES')) {
    console.log('[dev-fixtures] Fixtures loaded:', $.extend(true, {}, fixtures));
  }

  // register the fixtures and overlays
  application.register('dev-fixtures:main', fixtures, {instantiate: false});
  application.register('dev-fixtures:counters', Object.create(null), {instantiate: false});
}

export default {
  name:       'dev-fixtures',
  before:     'ember-data',
  initialize: initialize
};
