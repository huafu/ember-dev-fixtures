import Ember from 'ember';
import DevFixturesModule from './module';
import DevFixturesAdapterClass from '../../adapters/dev-fixtures';
import { MODULE_PREFIX, MODEL_ATTRIBUTE, RELATIVE_PATH } from './module';

var on = Ember.on;
var computed = Ember.computed;
var readOnly = computed.readOnly;
var equal = computed.equal;


export var BASE_ADAPTER = 'application';

var DevFixturesAdapter;

/**
 * @class DevFixturesAdapter
 * @extends Ember.Object
 */
DevFixturesAdapter = Ember.Object.extend({
  /**
   * The name of the adapter
   * @property name
   * @type {string}
   */
  name: null,

  /**
   * Are we the base adapter or not
   * @property isBase
   * @type {boolean}
   */
  isBase: equal('name', BASE_ADAPTER),


  /**
   * Module of the adapter class
   * @property extensionModule
   * @type {DevFixturesModule}
   */
  extensionModule: computed('name', function () {
    return DevFixturesModule.for(
      MODULE_PREFIX + '/' + RELATIVE_PATH + '/adapters/' + this.get('name')
    );
  }),

  /**
   * The extension if any
   * @property extension
   * @type {{}}
   */
  extension: computed('extensionModule.default', function () {
    return this.getWithDefault('extensionModule.exports.default', {});
  }),

  /**
   * The parent adapter class
   * @property parentAdapterClass
   * @type {subclass of DevFixturesAdapterClass}
   */
  parentAdapterClass: computed('isBase', function () {
    return this.get('isBase') ? DevFixturesAdapterClass : DevFixturesAdapter.base().get('extendedAdapterClass');
  }),


  /**
   * Adapter module
   * @property adapterModule
   * @type {DevFixturesModule}
   */
  adapterModule: computed('name', function () {
    return DevFixturesModule.for(
      MODULE_PREFIX + '/adapters/' + this.get('name'), true
    );
  }),


  /**
   * The original adapter class
   * @property originalAdapterClass
   * @type {{include: Array.<string>}}
   */
  originalAdapterClass: readOnly('adapterModule.originalDefault'),

  /**
   * The extended adapter class
   * @property extendedAdapterClass
   * @type {subclass of DevFixturesAdapterClass}
   */
  extendedAdapterClass: computed('extension', 'parentAdapterClass', function () {
    return this.get('parentAdapterClass')
      .extend(this.get('extension'))
      .reopenClass({
        OriginalClass: this.get('originalAdapterClass')
      });
  }),

  /**
   * Override adapter class
   *
   * @method overrideAdapterClass
   * @return {subclass of DevFixturesAdapterClass}
   */
  overrideAdapterClass: on('init', function () {
    var Class;
    Class = this.get('extendedAdapterClass');
    if (!this._overridden) {
      this._overridden = true;
      this.set('adapterModule.exports.default', Class);
    }
    return Class;
  })
});


DevFixturesAdapter.reopenClass({
  /**
   * All instances
   * @property instances
   * @type {Object.<DevFixturesAdapter>}
   */
  instances: Object.create(null),

  /**
   * Get or create the singleton instance for given adapter name
   *
   * @method for
   * @param {string} name
   * @return {DevFixturesAdapter}
   */
  for: function (name) {
    if (!this.instances[name]) {
      this.instances[name] = DevFixturesAdapter.create({name: name});
    }
    return this.instances[name];
  },

  /**
   * Get or create the singleton instance for the base adapter
   *
   * @method base
   * @return {DevFixturesAdapter}
   */
  base: function () {
    return this.for(BASE_ADAPTER);
  }
});

export default DevFixturesAdapter;
