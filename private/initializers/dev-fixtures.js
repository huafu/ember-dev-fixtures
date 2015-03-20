/* globals require */
import Ember from 'ember';
import DS from 'ember-data';
import ENV from '../config/environment';
import DevFixturesAdapter from '../adapters/dev-fixtures';


var forEach = Ember.EnumerableUtils.forEach;
var keys = Ember.keys;
var warn = Ember.warn;
var isArray = Ember.isArray;
var merge = Ember.merge;

/**
 * Get or create the overlay with given name in the given dictionary
 *
 * @function getOverlay
 * @param {string} name
 * @param {Object} dict
 * @return {{name: string, options: {}, fixtures: {}}
 */
function getOverlay(name, dict) {
  var overlay = dict[name];
  if (!overlay) {
    dict[name] = overlay = {name: name, options: {include: []}, fixtures: {}};
  }
  return overlay;
}

/**
 * Used to create a fixture record source flagger
 *
 * @function fixtureSourceFlagger
 * @param {string} source
 * @return {Function}
 */
function fixtureSourceFlagger(source) {
  return function (record) {
    if (!record._devFixtureMeta) {
      record._devFixtureMeta = {sources: []};
    }
    if (record._devFixtureMeta.sources.indexOf(source) === -1) {
      record._devFixtureMeta.sources.push(source);
    }
  };
}

/**
 * Coerce an ID
 *
 * @function coerceId
 * @param {string|number} id
 * @return {string}
 */
function coerceId(id) {
  return '' + id;
}

/**
 * Get the meta of a record for a given ID
 *
 * @function recordMetaForId
 * @param {Ember.Array} records
 * @param {string|number} id
 * @return {{record: Object, index: number}}
 */
function recordMetaForId(records, id) {
  var meta;
  id = coerceId(id);
  return records.find(function (record, index) {
    if (coerceId(record.id) === id) {
      meta = {record: record, index: index};
      return true;
    }
    return false;
  }) ? meta : null;
}

/**
 * Overrides the fixtures with the given overlay name
 *
 * @function overrideFixturesWithOverlay
 * @param {Object} FIXTURES
 * @param {Object} OVERLAYS
 * @param {Object} overlayName
 * @param {string} source
 * @return {Object}
 */
function overrideFixturesWithOverlay(FIXTURES, OVERLAYS, overlayName, source) {
  var overlay, i;
  if (overlayName) {
    overlay = OVERLAYS[overlayName];
    // undefined overlay
    if (!overlay) {
      throw new Error(
        '[ember-dev-fixtures] Trying to import fixture overlay `' + overlayName +
        '` for ' + source + ' but there is no such overlay.'
      );
    }
    // be sure we are not re-including an already included overlay
    if (overlay.injectedBy) {
      warn(
        '[ember-dev-fixtures] The overlay `' + overlayName + '` has already been included from ' +
        overlay.injectedBy + '. The ' + source +
        ' is trying to include it as well, but it won\'t be included again.'
      );
      return FIXTURES;
    }
    // first include over overlays
    for (i = 0; i < overlay.options.include; i++) {
      overrideFixturesWithOverlay(
        FIXTURES, OVERLAYS, overlay.options.include[i], 'overlay `' + overlayName + '`'
      );
    }
    // test again if we had already been injected
    if (overlay.injectedBy) {
      throw new Error('[ember-dev-fixtures] Circular overlay reference. The overlay `' + overlayName +
      '` has been injected from ' + overlay.injectedBy + ' which is one of its own inclusion (`include`).');
    }
    // then include the given overlay
    forEach(keys(overlay.fixtures), function (modelName) {
      var fixtures, existingFixtures, flagRecord = fixtureSourceFlagger('fixtures/overlays/' + overlayName + '/' + modelName);
      fixtures = overlay.fixtures[modelName];
      existingFixtures = FIXTURES[modelName];
      // create the array if it does not exists for that model
      if (!existingFixtures) {
        FIXTURES[modelName] = existingFixtures = Ember.A([]);
      }
      // loop over all fixtures (records) for this model
      forEach(fixtures, function (record) {
        var meta;
        // try to find an existing record in the actual fixtures
        meta = recordMetaForId(existingFixtures, record.id);
        if (meta) {
          // if we have an existing fixture
          if (record.__removeFixture) {
            // remove it if it has the flag
            existingFixtures.splice(meta.index, 1);
          }
          else {
            // else merge it
            merge(meta.record, record);
            flagRecord(meta.record);
          }
        }
        else if (!record.__removeFixture) {
          // no fixture yet, add it if it has not the delete flag
          existingFixtures.pushObject(record);
          flagRecord(record);
        }
      });
    });
    // flag our overlay as included
    overlay.injectedBy = source;
  }
  return FIXTURES;
}

/**
 * Handle the import of an overlay fixture or overlay index
 *
 * @function handleOverlayImport
 * @param {string} base
 * @param {string} name
 * @param {Object} dict
 * @return {{name: string, options: {}, fixtures: {}}
 */
function handleOverlayImport(base, name, dict) {
  var match, overlay, modelName, options;
  if ((match = base.match(/^([^\/]+)\/_config$/))) {
    overlay = getOverlay(match[1], dict);
    overlay.options = options = require(name)['default'];
    if (options.include) {
      if (!isArray(options.include)) {
        options.include = [options.include];
      }
    }
    else {
      options.include = [];
    }
  }
  else if ((match = base.match(/^([^\/]+)\/([^\/]+)$/))) {
    overlay = getOverlay(match[1], dict);
    modelName = match[2];
    extendModel(modelName);
    overlay.fixtures[modelName] = require(name)['default'].slice();
  }
  return overlay;
}

/**
 * Overrides an adapter
 *
 * @param {string} name
 * @param {Object} [extension={}]
 * @param {Ember.Application} app
 * @param {DevFixtureAdapter} BaseAdapter
 * @return {subclass of DevFixturesAdapter}
 */
function overrideAdapter(name, extension, app, BaseAdapter) {
  var path = ENV.modulePrefix + '/adapters/' + name, Class, Module;
  if (require.entries[path]) {
    Module = require(path);
  }
  Class = (BaseAdapter || DevFixturesAdapter).extend(extension || {});
  if (Module && !Class.OriginalClass) {
    Class.reopenClass({
      OriginalClass: Module['default']
    });
    Module['default'] = Class;
  }
  app.register('adapter:' + name, Class);
  app.inject('adapter:' + name, 'FIXTURES', 'dev-fixtures:main');
  return Class;
}

var extendedModels = [];
/**
 * Extend a model to add the meta attribute
 *
 * @param {string} name
 * @return {subclass of DS.Model}
 */
function extendModel(name) {
  var path = ENV.modulePrefix + '/models/' + name, Class;
  if (require.entries[path] && extendedModels.indexOf(name) === -1) {
    extendedModels.push(name);
    Class = require(path)['default'].extend();
    Class.reopen({
      _devFixtureMeta: DS.attr('raw')
    });
  }
  return Class;
}

/**
 * Initialize our dev-fixtures stuffs
 *
 * @param {Ember.Container} container
 * @param {Ember.Application} application
 */
export function initialize(container, application) {
  var adapterNames, regexp, base, adapterOverrides = {}, from, BaseAdapter,
    name, BASE_FIXTURES = {}, OVERLAYS = {}, lsKey, currentOverlay;
  regexp = new RegExp('^' + ENV.modulePrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\/ember\\-dev\\-fixtures\\/');
  for (name in require.entries) {
    if (regexp.test(name)) {
      base = name.replace(regexp, '');

      if (/^adapters\/[^\/]+$/.test(base)) {
        // it is an adapter extension
        adapterOverrides[base.replace(/^adapters\//, '')] = require(name)['default'];
      }
      else if (/^overlays\//.test(base)) {
        // it is an overlay definition or overlay index
        handleOverlayImport(base.replace(/^overlays\//, ''), name, OVERLAYS);
      }
      else if (!/\//.test(base)) {
        // it is a base fixture
        extendModel(base);
        BASE_FIXTURES[base] = Ember.A(require(name)['default'].slice());
        BASE_FIXTURES[base].forEach(fixtureSourceFlagger('fixtures/' + base));
      }
    }
  }

  // grab the overlay name if any from the URL
  location.href.replace(/(?:\?|&)FIXTURES_OVERLAY(?:=([^&#$]*))?(?:&|#|$)/, function (dummy, value) {
    currentOverlay = value ? decodeURIComponent(value) : null;
    from = 'URL query parameter';
  });
  if (currentOverlay === undefined && application.get('devFixtures.overlay') !== undefined) {
    currentOverlay = application.get('devFixtures.overlay');
    from = 'config file';
  }

  // persist or read the overlay from local storage if accessible
  if (window.localStorage) {
    lsKey = ENV.modulePrefix + '$dev-fixtures-overlay$' + ENV.environment;
    if (currentOverlay !== undefined) {
      if (currentOverlay) {
        window.localStorage.setItem(lsKey, currentOverlay);
      }
      else {
        window.localStorage.removeItem(lsKey);
      }
    }
    else {
      currentOverlay = window.localStorage.getItem(lsKey);
      from = 'local storage';
    }
  }

  // override fixtures regarding the current overlay
  overrideFixturesWithOverlay(
    BASE_FIXTURES, OVERLAYS, currentOverlay, from
  );

  // register the fixtures and overlays
  application.register('dev-fixtures:main', BASE_FIXTURES, {instantiate: false});

  // create or override the adapters and inject the fixtures and overlays
  adapterNames = application.getWithDefault('devFixtures.adapters', ['application']);
  forEach(adapterNames, function (name) {
    if (!adapterOverrides[name]) {
      adapterOverrides[name] = {};
    }
  });
  // we want all to extend the application extension so that users can define global helpers
  if (adapterOverrides.application) {
    base = adapterOverrides.application;
    delete adapterOverrides.application;
  }
  else {
    base = {};
  }
  // we first extend the application one
  BaseAdapter = overrideAdapter('application', base, application);
  // and then extend all others based on the application one
  for (name in adapterOverrides) {
    overrideAdapter(name, adapterOverrides[name], application, BaseAdapter);
  }
}

export default {
  name:       'dev-fixtures',
  before:     'ember-data',
  initialize: initialize
};
