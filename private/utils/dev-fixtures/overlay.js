import Ember from 'ember';
import DevFixturesModule from './module';
import DevFixturesModel from './model';
import DevFixturesFixtures from './fixtures';
import { MODULE_PREFIX, RELATIVE_PATH } from './module';


var computed = Ember.computed;
var equal = computed.equal;
var merge = Ember.merge;
var EmberString = Ember.String;
var fmt = EmberString.fmt;
var EnumerableUtils = Ember.EnumerableUtils;
var forEach = EnumerableUtils.forEach;
var map = EnumerableUtils.map;

var DevFixturesOverlay;

export var BASE_OVERLAY = '';

/**
 * @class DevFixturesOverlay
 * @extends Ember.Object
 */
DevFixturesOverlay = Ember.Object.extend({
  /**
   * The name of the overlay
   * @property name
   * @type {string}
   */
  name: BASE_OVERLAY,

  /**
   * The label of the overlay
   * @property label
   * @type {string}
   */
  label: computed('name', function () {
    return this.get('isBase') ? 'base fixtures' : fmt('overlay `%@`', this.get('name'));
  }),


  /**
   * Module of the config
   * @property configModule
   * @type {DevFixturesModule}
   */
  configModule: computed('name', 'isBase', function () {
    return this.get('isBase') ? null : DevFixturesModule.for(
      MODULE_PREFIX + '/' + RELATIVE_PATH + '/overlays/' + this.get('name') + '/_config'
    );
  }),

  /**
   * The configuration
   * @property config
   * @type {{include: Array.<string>}}
   */
  config: computed('configModule.exports.default', function () {
    var config = merge({include: []}, this.get('configModule.exports.default'));
    if (!Ember.isArray(config.include)) {
      config.include = config.include ? [config.include] : [];
    }
    return config;
  }),

  /**
   * Parent overlays
   * @property parents
   * @type {Ember.Array.<DevFixturesOverlay>}
   */
  parents: computed('parentsWithoutBase', 'isBase', function () {
    var parents = [];
    if (!this.get('isBase')) {
      parents.push(DevFixturesOverlay.base());
    }
    return Ember.A(parents.concat(this.get('parentsWithoutBase')));
  }),

  /**
   * Parents without the base
   * @property parentsWithoutBase
   * @type {Ember.Array.<DevFixturesOverlay>}
   */
  parentsWithoutBase: computed('config.include', function () {
    var parents = [];
    forEach(this.get('config.include'), function (name) {
      var overlay = DevFixturesOverlay.for(name), overlayParents = overlay.get('parentsWithoutBase');
      if (overlayParents.length) {
        parents.push.apply(parents, overlayParents);
      }
      parents.push(overlay);
    });
    return Ember.A(parents);
  }),


  /**
   * The chain of overlay to merge
   * @property chain
   * @type {Ember.Array.<DevFixturesOverlay>}
   */
  chain: computed('parents', function () {
    return Ember.A(this.get('parents').concat([this]));
  }),


  /**
   * Whether this is the base overlay
   * @property isBase
   * @type {boolean}
   */
  isBase: equal('name', BASE_OVERLAY),

  /**
   * The array of all fixtures per model name
   * @property fixtures
   * @type {Ember.Object.<Array.<DevFixturesFixtures>>}
   */
  fixtures: computed(function () {
    var overlayName = this.get('name');
    return Ember.Object.extend({
      /**
       * Save all registered fixture collections
       * @property _index
       * @type {Ember.Array.<string>}
       */
      _index: computed(function () {
        return Ember.A([]);
      }),

      unknownProperty: function (key) {
        var fixture = DevFixturesFixtures.for(overlayName, key);
        this.get('_index').push(key);
        this.set(key, fixture);
        return fixture;
      }
    }).create();
  }),

  /**
   * All known models used/needed
   * @property knownModel
   * @type {Ember.Array.<DevFixturesModel>}
   */
  knownModels: computed('fixtures._index', function () {
    return Ember.A(this.get('fixtures._index').map(function (name) {
      return DevFixturesModel.for(name);
    }));
  }),

  /**
   * All known models from all parents
   * @property allKnownModels
   * @type {Ember.Array.<DevFixturesModel>}
   */
  allKnownModels: computed('parents.@each.knownModels', function () {
    var models = Ember.A([]);
    forEach(this.get('parents').mapBy('knownModels'), function (list) {
      models.pushObjects(list);
    });
    return models;
  }),


  /**
   * Serialized fixtures
   * @property serializedFixtures
   * @type {Object.<Ember.Array.<{}>>}
   */
  serializedFixtures: computed(function () {
    var fixtures = this.get('fixtures');
    return this.get('allKnownModels').reduce(function (dict, model) {
      var name = model.get('name');
      dict[name] = fixtures.get(name + '.mergedDataCopy');
      return dict;
    }, Object.create(null));
  }).volatile()
});


DevFixturesOverlay.reopenClass({
  /**
   * Dictionary of instances
   * @property instances
   * @type {Object}
   */
  instances: Object.create(null),

  /**
   * Get the singleton instance for the given overlay name
   *
   * @method for
   * @param {string} name
   * @return {DevFixturesOverlay}
   */
  for: function (name) {
    name = name || BASE_OVERLAY;
    if (!this.instances[name]) {
      this.instances[name] = DevFixturesOverlay.create({name: name});
    }
    return this.instances[name];
  },


  /**
   * Get the base overlay
   *
   * @method base
   * @return {DevFixturesOverlay}
   */
  base: function () {
    return this.for(null);
  }

});

export default DevFixturesOverlay;
