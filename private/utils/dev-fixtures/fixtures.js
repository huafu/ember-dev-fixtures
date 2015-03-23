import Ember from 'ember';
import DevFixturesModule from './module';
import DevFixturesModel from './model';
import DevFixturesOverlay from './overlay';
import { BASE_OVERLAY } from './overlay';
import { MODULE_PREFIX, RELATIVE_PATH, MODEL_ATTRIBUTE, DELETED_FLAG } from './module';


var on = Ember.on;
var computed = Ember.computed;
var merge = Ember.merge;
var assert = Ember.assert;
var EmberString = Ember.String;
var fmt = EmberString.fmt;

var $ = Ember.$;


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
 * Get the cursor of a record for a given ID
 *
 * @function recordCursor
 * @param {Array} records
 * @param {string|number} id
 * @return {{record: Object, index: number}}
 */
function recordCursor(records, id) {
  var record;
  id = coerceId(id);
  for (var i = 0, len = records.length; i < len; i++) {
    record = records[i];
    if (coerceId(record.id) === id) {
      return {record: record, index: i};
    }
  }
}


/**
 * Deep copy the given object
 *
 * @function deepCopy
 * @param {{}} object
 * @return {{}}
 */
function deepCopy(object) {
  return $.extend(true, {}, object);
}


var DevFixturesFixtures;

/**
 * @class DevFixturesFixtures
 * @extends Ember.Object
 */
DevFixturesFixtures = Ember.Object.extend({
  /**
   * The name of the model
   * @property modelName
   * @type {string}
   */
  modelName: null,

  /**
   * The model
   * @property model
   * @type {DevFixturesModel}
   */
  model: computed('modelName', function () {
    return DevFixturesModel.for(this.get('modelName'));
  }),

  /**
   * Setup our model
   *
   * @method setupModel
   */
  setupModel: on('init', function () {
    // on init it'll override the model
    this.get('model');
  }),


  /**
   * Name of the overlay
   * @property overlayName
   * @type {string}
   */
  overlayName: null,

  /**
   * The overlay
   * @property overlay
   * @type {DevFixturesOverlay}
   */
  overlay: computed('overlayName', function () {
    return DevFixturesOverlay.for(this.get('overlayName'));
  }),

  /**
   * Module path for the fixtures
   * @property fixturesModulePath
   * @type {string}
   */
  fixturesModulePath: computed('overlayName', 'modelName', function () {
    var path = [MODULE_PREFIX, RELATIVE_PATH];
    if (!this.get('overlay.isBase')) {
      path.push('overlays', this.get('overlayName'));
    }
    path.push(this.get('modelName'));
    return path.join('/');
  }),

  /**
   * Fixtures module
   * @property fixturesModule
   * @type {DevFixturesModule}
   */
  fixturesModule: computed('fixturesModulePath', function () {
    return DevFixturesModule.for(this.get('fixturesModulePath'));
  }),

  /**
   * Fixtures from parent overlays
   * @property parents
   * @type {Ember.Array.<DevFixturesFixtures>}
   */
  parents: computed('overlay.parents.[]', 'modelName', function () {
    return Ember.A(this.get('overlay.parents').mapBy('fixtures.' + this.get('modelName')));
  }),

  /**
   * Fixtures chain
   * @property chain
   * @type {Ember.Array.<DevFixturesFixtures>}
   */
  chain: computed('overlay.chain.[]', 'modelName', function () {
    return Ember.A(this.get('overlay.chain').mapBy('fixtures.' + this.get('modelName')));
  }),


  /**
   * Source array
   * @property data
   * @type {Ember.Array.<{}>}
   */
  data: computed('fixturesModule.exports.default', function () {
    var tagger = this.get('tagger');
    return Ember.A(this.getWithDefault('fixturesModule.exports.default', [])).map(tagger);
  }),

  /**
   * The chain of data
   * @property dataChain
   * @type {Ember.Array.<Ember.Array.<{}>>}
   */
  dataChain: computed('chain.@each.data', function () {
    return Ember.A(this.get('chain').mapBy('data'));
  }),

  /**
   * Merged data (with parents)
   * @property mergedData
   * @type {Ember.Array.<{}>}
   */
  mergedData: computed('dataChain', function () {
    return this.get('dataChain').reduce(function (mergedData, layerData) {
      if (mergedData) {
        layerData.forEach(function (record) {
          var cursor = recordCursor(mergedData, record.id), meta;
          if (cursor) {
            if (record[DELETED_FLAG]) {
              mergedData.splice(cursor.index, 1);
            }
            else {
              meta = cursor.record[MODEL_ATTRIBUTE];
              delete cursor.record[MODEL_ATTRIBUTE];
              merge(cursor.record, record);
              cursor.record[MODEL_ATTRIBUTE] = meta;
              meta.sources.push.apply(meta.sources, record[MODEL_ATTRIBUTE].sources);
            }
          }
          else {
            if (!record[DELETED_FLAG]) {
              mergedData.push(merge({}, record));
            }
          }
        });
        return mergedData;
      }
      else {
        return layerData.map(deepCopy);
      }
    }, null);
  }),

  /**
   * Our record tagger
   * @property tagger
   * @type {Function}
   */
  tagger: computed('overlay.label', function () {
    var tag, modelName, overlayLabel;
    modelName = this.get('modelName');
    overlayLabel = this.get('overlay.label');
    tag = fmt('%@ (%@)', overlayLabel, this.get('fixturesModulePath') + '.js');
    return function (record) {
      var meta;
      assert(fmt(
        '[dev-fixtures] A fixture must have an `id` defined (model `%@` from %@, record: %@).',
        modelName, overlayLabel, JSON.stringify(record)
      ), record.id);
      meta = record[MODEL_ATTRIBUTE];
      if (!meta) {
        meta = record[MODEL_ATTRIBUTE] = Object.create(null);
        meta.sources = [];
      }
      meta.sources.push(tag);
      return record;
    };
  }),

  /**
   * A deep copy of the merged data
   * @property mergedDataCopy
   * @type {Ember.Array.<{}>}
   */
  mergedDataCopy: computed('mergedData', function () {
    return Ember.A(this.get('mergedData').map(deepCopy));
  }).volatile()

});


DevFixturesFixtures.reopenClass({
  /**
   * Our instances dictionary
   * @property instances
   * @type {Object}
   */
  instances: Object.create(null),

  /**
   * Get the instance for given overlay name and model name
   *
   * @method for
   * @param {string} overlayName
   * @param {string} modelName
   * @return {DevFixturesFixtures}
   */
  for: function (overlayName, modelName) {
    var key = (overlayName || BASE_OVERLAY) + '#' + modelName;
    if (!this.instances[key]) {
      this.instances[key] = DevFixturesFixtures.create({
        modelName:   modelName,
        overlayName: overlayName
      });
    }
    return this.instances[key];
  }
});


export default DevFixturesFixtures;
