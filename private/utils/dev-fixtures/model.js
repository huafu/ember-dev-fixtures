import DS from 'ember-data';
import Ember from 'ember';
import DevFixturesModule from './module';
import { MODULE_PREFIX, MODEL_ATTRIBUTE } from './module';

var modelClassExtension = {};
modelClassExtension[MODEL_ATTRIBUTE] = DS.attr('dev-fixtures-meta');


var on = Ember.on;
var computed = Ember.computed;
var readOnly = computed.readOnly;


var DevFixturesModel;
/**
 * @class DevFixturesModel
 * @extends Ember.Object
 */
DevFixturesModel = Ember.Object.extend({
  /**
   * The name of the model
   * @property name
   * @type {string}
   */
  name: null,

  /**
   * Module of the model class
   * @property modelModule
   * @type {DevFixturesModule}
   */
  modelModule: computed('name', function () {
    return DevFixturesModule.for(
      MODULE_PREFIX + '/models/' + this.get('name')
    );
  }),

  /**
   * The model class
   * @property modelClass
   * @type {{include: Array.<string>}}
   */
  modelClass: readOnly('modelModule.exports.default'),

  /**
   * Overrides the model to add dev-fixture specific attribute
   *
   * @method override
   * @return {subclass of DS.Model}
   */
  override: on('init', function () {
    var Class = this.get('modelClass');
    if (!this._overridden) {
      this._overridden = true;
      Class.reopen(modelClassExtension);
    }
    return Class;
  })
});


DevFixturesModel.reopenClass({
  /**
   * All instances
   * @property instances
   * @type {Object.<DevFixturesModel>}
   */
  instances: Object.create(null),

  /**
   * Get or create the singleton instance for given model name
   *
   * @method for
   * @param {string} name
   * @return {DevFixturesModel}
   */
  for: function (name) {
    if (!this.instances[name]) {
      this.instances[name] = DevFixturesModel.create({name: name});
    }
    return this.instances[name];
  }
});

export default DevFixturesModel;

