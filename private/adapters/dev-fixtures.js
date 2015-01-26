import Ember from 'ember';
import DS from 'ember-data';

var forEach = Ember.EnumerableUtils.forEach;

function coerceId(id) {
  if (Ember.isArray(id)) {
    return id.map(coerceId);
  }
  else if (id != null) {
    return '' + id;
  }
  return id;
}

/**
 * @class DevFixturesAdapter
 * @extends DS.FixtureAdapter
 *
 * @property {Object} FIXTURES
 */
export default DS.FixtureAdapter.extend({
  /**
   * @inheritDoc
   */
  defaultSerializer: '-rest',

  /**
   * @inheritDoc
   */
  serializer: Ember.computed(function () {
    return undefined;
  }),

  /**
   * @inheritDoc
   */
  find: function (store, type) {
    var _this = this;
    return this._super.apply(this, arguments).then(function (record) {
      var json = {};
      json[type.typeKey.pluralize()] = [record];
      return _this.completeJsonResponse(json, store);
    });
  },

  /**
   * @inheritDoc
   */
  findQuery: function (store, type) {
    var _this = this;
    return this._super.apply(this, arguments).then(function (records) {
      var json = {};
      json[type.typeKey.pluralize()] = records;
      return _this.completeJsonResponse(json, store);
    });
  },

  /**
   * @inheritDoc
   */
  findMany: function (store, type) {
    var _this = this;
    return this._super.apply(this, arguments).then(function (records) {
      var json = {};
      json[type.typeKey.pluralize()] = records;
      return _this.completeJsonResponse(json, store);
    });
  },

  /**
   * @inheritDoc
   */
  createRecord: function (store, type/*, record*/) {
    var _this = this;
    return this._super.apply(this, arguments).then(function (record) {
      var json = {};
      json[type.typeKey.pluralize()] = [record];
      return _this.completeJsonResponse(json, store);
    });
  },

  /**
   * @inheritDoc
   */
  queryFixtures: function (fixture, query/*, type*/) {
    var matcher;
    // create our matcher
    matcher = function (record) {
      if (query) {
        for (var k in query) {
          if (query.hasOwnProperty(k)) {
            if (query[k] !== record[k]) {
              return false;
            }
          }
        }
      }
      return true;
    };
    return fixture.filter(matcher);
  },

  /**
   * @inheritDoc
   */
  fixturesForType: function (type) {
    var key = type.typeKey;
    if (!this.FIXTURES[key]) {
      this.FIXTURES[key] = [];
    }
    return this.FIXTURES[key];
  },

  /**
   * Complete a JSON response to add linked records which are not async
   *
   * @method completeJsonResponse
   * @param {Object} json
   * @param {DS.Store} store
   */
  completeJsonResponse: function (json, store) {
    var handledRecords = [], key, records, handleRecord, Model;
    handleRecord = function (record) {
      this.completeJsonForRecord(record, Model, json, handledRecords);
    };
    for (key in json) {
      if (json.hasOwnProperty(key)) {
        records = json[key];
        Model = store.modelFor(key.singularize());
        forEach(records, handleRecord, this);
      }
    }
    return json;
  },

  /**
   * Complete a record adding in the given json the related records which are not defined as async
   *
   * @method completeJsonForRecord
   * @param {DS.Model} record
   * @param {subclass of DS.Model} Model
   * @param {Object} json
   * @param {Array.<DS.Model>} handledRecords
   */
  completeJsonForRecord: function (record, Model, json, handledRecords) {
    if (handledRecords.indexOf(record) === -1) {
      handledRecords.push(record);
      Model.eachRelationship(function (name, meta) {
        var related, fixtures, relatedTypeKey, ids;
        if (!meta.async && record[name]) {
          fixtures = Ember.A(this.fixturesForType(meta.type));
          ids = coerceId(record[name]);
          if (meta.kind === 'hasMany') {
            if (ids && ids.length) {
              related = fixtures.filter(function (r) {
                return ids.indexOf(coerceId(r.id)) !== -1;
              });
            }
          }
          else if (meta.kind === 'belongsTo') {
            related = fixtures.find(function (r) {
              return coerceId(r.id) === ids;
            });
            if (related) {
              related = [related];
            }
          }
          if (related) {
            relatedTypeKey = meta.type.typeKey.pluralize();
            if (!json[relatedTypeKey]) {
              json[relatedTypeKey] = [];
            }
            related.forEach(function (record) {
              if (json[relatedTypeKey].indexOf(record) === -1) {
                json[relatedTypeKey].push(record);
              }
              this.completeJsonForRecord(record, meta.type, json, handledRecords);
            }, this);
          }
        }
      }, this);
    }
  }

});
