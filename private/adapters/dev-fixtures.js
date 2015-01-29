import Ember from 'ember';
import DS from 'ember-data';

var forEach = Ember.EnumerableUtils.forEach;

var HTTP_STATUS_MESSAGES = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  306: "(Unused)",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required"
};

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
 * @extends DS.Adapter
 *
 * @property {Object} FIXTURES
 * @property {Object} OVERLAYS
 */
export default DS.Adapter.extend({
  /**
   * @inheritDoc
   */
  defaultSerializer: '-rest',

  /**
   * Simulate a remote host?
   * @property simulateRemoteResponse
   * @type {boolean}
   */
  simulateRemoteResponse: true,

  /**
   * The delay before responding to the call (fake server delay)
   * @property latency
   * @type {number}
   */
  latency: 50,

  /**
   * @inheritDoc
   */
  serializer: Ember.computed(function () {
    return undefined;
  }),

  /**
   * @inheritDoc
   */
  find: function (store, type, id) {
    var record = this.fixtureForId(type, id);
    if (record) {
      return this.simulateRemoteCall(this.createSingleRecordResponse(store, type, record));
    }
    else {
      return this.simulateRemoteCall(null, 404);
    }
  },

  /**
   * @inheritDoc
   */
  findAll: function (store, type) {
    return this.simulateRemoteCall(
      this.createMultiRecordsResponse(store, type, this.fixturesForType(type))
    );
  },

  /**
   * @inheritDoc
   */
  findQuery: function (store, type, query) {
    return this.simulateRemoteCall(this.createMultiRecordsResponse(
      store, type, this.queryFixtures(this.fixturesForType(type), query)
    ));
  },

  /**
   * @inheritDoc
   */
  findMany: function (store, type, ids) {
    var records = [], missingRecordIds = [];
    Ember.A(ids).forEach(function (id) {
      var record = this.fixtureForId(type, id);
      if (record) {
        records.push(record);
      }
      else {
        // FIXME: should we just silently not include the record of simulate a 404 or such?
        missingRecordIds.push(id);
      }
    }, this);
    return this.simulateRemoteCall(this.createMultiRecordsResponse(store, type, records));
  },

  /**
   * @inheritDoc
   */
  createRecord: function (store, type, record) {
    var fixture = this.mockJSON(store, type, record);
    fixture = this.updateFixtures(type, fixture);
    return this.simulateRemoteCall(this.createSingleRecordResponse(store, type, fixture));
  },

  /**
   * @inheritDoc
   */
  updateRecord: function (store, type, record) {
    var fixture = this.mockJSON(store, type, record);
    fixture = this.updateFixtures(type, fixture);
    return this.simulateRemoteCall(this.createSingleRecordResponse(store, type, fixture));
  },

  /**
   * @inheritDoc
   */
  deleteRecord: function (store, type, record) {
    this.deleteLoadedFixture(type, record);
    return this.simulateRemoteCall(this.createDeletedRecordResponse(store, type, record));
  },

  /**
   * @inheritDoc
   */
  queryFixtures: function (fixtures, query/*, type*/) {
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
    return fixtures.filter(matcher);
  },

  /**
   * @inheritDoc
   */
  fixturesForType: function (type) {
    var key = type.typeKey;
    if (!this.FIXTURES[key]) {
      this.FIXTURES[key] = Ember.A([]);
    }
    return this.FIXTURES[key];
  },

  /**
   * Get a fixture for a given type and ID
   *
   * @method fixtureForId
   * @param {DS.Model} type
   * @param {string|number} id
   * @return {Object}
   */
  fixtureForId: function (type, id) {
    id = coerceId(id);
    return this.fixturesForType(type).find(function (record) {
      return coerceId(record.id) === id;
    });
  },


  /**
   * Better method for simulating a remote call
   *
   * @method simulateRemoteCall
   * @param {Object|Function} response
   * @param {number} [statusCode=200]
   * @param {string} [statusText]
   * @return {Promise}
   */
  simulateRemoteCall: function (response, statusCode, statusText) {
    var adapter = this, responseFunction, isOk;
    statusCode = statusCode || 200;
    statusText = statusText || HTTP_STATUS_MESSAGES[statusCode];
    isOk = Math.round(statusCode / 100) === 2;
    if (typeof response === 'function' || typeof response === 'string') {
      responseFunction = Ember.run.bind(this, response);
    }
    else {
      responseFunction = Ember.run.bind(null, function () {
        return response;
      });
    }
    return new Ember.RSVP.Promise(function (resolve, reject) {
      var value, func;
      func = isOk ? resolve : reject;
      value = Ember.copy(responseFunction(), true);
      value = isOk ? value : {
        response:     value,
        responseJSON: value,
        status:       statusCode,
        statusText:   statusText
      };
      if (adapter.get('simulateRemoteResponse')) {
        // Schedule with setTimeout
        Ember.run.later(function () {
          func(value);
        }, adapter.get('latency'));
      }
      else {
        // Asynchronous, but at the of the runloop with zero latency
        Ember.run.schedule('actions', null, function () {
          func(value);
        });
      }
    }, "DS: DevFixtureAdapter#simulateRemoteCall");
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
  },

  /**
   * Creates a single response for the given type and record
   *
   * @method createSingleRecordResponse
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {Object} record
   * @return {Object}
   */
  createSingleRecordResponse: function (store, type, record) {
    var json = {};
    json[type.typeKey.pluralize()] = [record];
    return this.completeJsonResponse(json, store);
  },

  /**
   * Creates a multi-records response for the given type and records array
   *
   * @method createMultiRecordsResponse
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {Array.<Object>} records
   * @return {Object}
   */
  createMultiRecordsResponse: function (store, type, records) {
    var json = {};
    json[type.typeKey.pluralize()] = records;
    return this.completeJsonResponse(json, store);
  },

  /**
   * Creates a delete record response for the given type and record
   *
   * @method createDeletedRecordResponse
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {Object} record
   * @return {null}
   */
  createDeletedRecordResponse: function (/*store, type, record*/) {
    return null;
  },

  /**
   * Update the fixture for given type and fixture record
   *
   * @method updateFixtures
   * @param {DS.Model} type
   * @param {Object} fixtureRecord
   * @return {Object}
   */
  updateFixtures: function (type, fixtureRecord) {
    var fixture;
    if (fixtureRecord.id) {
      fixture = this.fixtureForId(type, fixtureRecord.id);
      if (fixture) {
        Ember.merge(fixture, fixtureRecord);
        return fixture;
      }
    }
    else {
      throw new Error('Updating a fixture required an ID.');
    }
    this.fixturesForType(type).pushObject(fixtureRecord);
    return fixtureRecord;
  },

  /**
   * Deletes a fixture for given type and record
   *
   * @method deleteLoadedFixture
   * @param {DS.Model} type
   * @param {Object} fixtureRecord
   * @return {null}
   */
  deleteLoadedFixture: function (type, fixtureRecord) {
    var fixture;
    if (fixtureRecord.id) {
      fixture = this.fixtureForId(type, fixtureRecord.id);
      if (fixture) {
        this.fixturesForType(type).without(fixtureRecord);
      }
    }
    else {
      throw new Error('Deleting a fixture required an ID.');
    }
    return null;
  }

});
