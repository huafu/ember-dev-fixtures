import DS from 'ember-data';

export default DS.Transform.extend({
  serialize:   function (deserialized) {
    return deserialized;
  },
  deserialize: function (serialized) {
    return serialized;
  }
});
