import DS from 'ember-data';

/**
 * @class DevFixturesMetaTransform
 * @extends DS.Transform
 */
export default DS.Transform.extend({
  serialize: function (deserialized) {
    return deserialized;
  },

  deserialize: function (serialized) {
    return serialized;
  }
});
