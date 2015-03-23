/* globals require, define */
import Ember from 'ember';
import ENV from '../../config/environment';


var hasOwn = {}.hasOwnProperty;
var assert = Ember.assert;
var on = Ember.on;
var computed = Ember.computed;


export var RELATIVE_PATH = 'ember-dev-fixtures';
export var MODULE_PREFIX = ENV.modulePrefix;
export var MODEL_ATTRIBUTE = '_devFixtureMeta';
export var DELETED_FLAG = '__removeFixture';



var DevFixturesModule;

/**
 * @class DevFixturesModule
 * @extends Ember.Object
 */
DevFixturesModule = Ember.Object.extend({
  /**
   * Path of the module
   * @property path
   * @type {string}
   */
  path: null,

  /**
   * Name of the module
   * @property name
   * @type {string}
   */
  name: null,

  /**
   * Auto-define
   * @property autoDefine
   * @type {boolean}
   */
  autoDefine: false,


  /**
   * The full path to the module
   * @property fullPath
   * @type {string}
   */
  fullPath: computed('path', 'name', function (key, value) {
    var index;
    if (arguments.length > 1) {
      // set
      assert('The fullPath must contains at least one `/`', value && value.indexOf('/') !== -1);
      index = value.lastIndexOf('/');
      this.setProperties({
        name: value.substr(index + 1),
        path: value.substr(0, index)
      });
    }
    return this.get('path') + '/' + this.get('name');
  }),

  /**
   * The relative path of this module from modulePrefix
   * @property relativePath
   * @type {string}
   */
  relativePath: computed('path', function () {
    var path = this.get('path');
    return path.indexOf(ENV.modulePrefix) === 0 ? path.substr(ENV.modulePrefix.length + 1) : null;
  }),

  /**
   * Whether the module exists or not
   * @property exists
   * @type {boolean}
   */
  exists: computed('fullPath', function () {
    return hasOwn.call(require.entries, this.get('fullPath'));
  }),


  /**
   * The exports for this module
   * @property exports
   * @type {Object}
   */
  exports: computed('fullPath', function () {
    if (this.get('exists')) {
      return require(this.get('fullPath'));
    }
    else if (this.get('autoDefine')) {
      define(this.get('fullPath'), ['exports'], Ember.K);
      return require(this.get('fullPath'));
    }
  }),

  /**
   * Original default export for the module
   * @property originalDefault
   * @type {*}
   */
  originalDefault: computed(function () {
    return this.backupOriginalDefault();
  }).readOnly(),

  /**
   * Backup original default module export
   *
   * @method backupOriginalDefault
   * @return {*}
   */
  backupOriginalDefault: on('init', function () {
    if (!hasOwn.call(this, '_originalDefault')) {
      this._originalDefault = this.get('exists') ? this.get('exports.default') : undefined;
    }
    return this._originalDefault;
  })

});


DevFixturesModule.reopenClass({
  /**
   * The dictionary of instances
   * @property instances
   * @type {Object}
   */
  instances: Object.create(null),

  /**
   * Get the instance of the module for the given full path
   *
   * @method for
   * @param {string} fullPath
   * @param {boolean} autoDefine
   * @return {DevFixturesModule}
   */
  for: function (fullPath, autoDefine) {
    if (!this.instances[fullPath]) {
      this.instances[fullPath] = DevFixturesModule.create({
        fullPath:   fullPath,
        autoDefine: Boolean(autoDefine)
      });
    }
    return this.instances[fullPath];
  }

});

export default DevFixturesModule;
