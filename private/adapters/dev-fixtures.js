import Ember from 'ember';
import DS from 'ember-data';

var forEach = Ember.EnumerableUtils.forEach;
var find = Ember.EnumerableUtils.find;
var slice = [].slice;
var isArray = Ember.isArray;
var copy = Ember.copy;
var pluralize = Ember.String.pluralize;
var singularize = Ember.String.singularize;
var dasherize = Ember.String.dasherize;
var fmt = Ember.String.fmt;
var run = Ember.run;
var bind = run.bind;
var later = run.later;
var schedule = run.schedule;
var computed = Ember.computed;

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

function findById(records, id) {
  id = coerceId(id);
  return find(records, function (record) {
    return coerceId(record.id) === id;
  });
}

function injectNoConflict(into, fixtures) {
  forEach(fixtures, function (fixture) {
    var found = findById(into, fixture.id);
    Ember.assert('Another fixture with same ID found in the response.', !found || found === fixture);
    if (!found) {
      into.push(fixture);
    }
  });
}


/**
 * @class DevFixturesAdapter
 * @extends DS.Adapter
 */
export default DS.Adapter.extend({
  /**
   * Counters for record id generator
   * @property _generatedCounterId
   * @type {Object}
   * @private
   */
  _generatedCounterId: computed(function () {
    return this.container.lookup('dev-fixtures:counters');
  }),

  /**
   * The fixtures
   * @property FIXTURES
   * @type {Object.<Ember.Array.<{}>>}
   */
  FIXTURES: computed(function () {
    return this.container.lookup('dev-fixtures:main');
  }),


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
  serializer: computed(function () {
    return undefined;
  }),

  /**
   * Generate the JSON for a record
   *
   * @method mockJSON
   * @param {DS.Store} store
   * @param {subclass of DS.Model|string} type
   * @param {DS.Model} record
   * @param {boolean} [addId=false]
   * @return {Object}
   */
  mockJSON: function (store, type, record, addId) {
    var json;
    type = this._parseModelOrType(store, type);
    json = record.serialize({includeId: true});
    if (!json.id && addId) {
      json.id = this.generateId(store, type);
    }
    type.eachRelationship(function (key, meta) {
      var records;
      if (!meta.async && meta.kind === 'hasMany' && (records = record.get(key)) && !json[key]) {
        json[key] = records.mapBy('id').filter(Boolean);
      }
    });
    return json;
  },

  /**
   * Generates an ID for a record
   *
   * @method generateId
   * @param {DS.Store} store
   * @param {subclass of DS.Model|string} type
   * @param {DS.Model} record
   * @return {String} id
   */
  generateId: function (store, type/*, record*/) {
    var key, counters;
    key = dasherize(this._parseModelOrType(store, type).typeKey);
    counters = this.get('_generatedCounterId');
    if (!counters[key]) {
      counters[key] = 1;
    }
    return 'fixture-' + key + '-' + (counters[key]++);
  },

  /**
   * @inheritDoc
   */
  find: function (store, type, id) {
    var record = this.fixtureForId(store, type, id);
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
      this.createMultiRecordsResponse(store, type, this.fixturesForType(store, type))
    );
  },

  /**
   * @inheritDoc
   */
  findQuery: function (store, type, query) {
    return this.simulateRemoteCall(this.createMultiRecordsResponse(
      store, type, this.queryFixtures(this.fixturesForType(store, type), query)
    ));
  },

  /**
   * @inheritDoc
   */
  findMany: function (store, type, ids) {
    var records = [], missingRecordIds = [];
    Ember.A(ids).forEach(function (id) {
      var record = this.fixtureForId(store, type, id);
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
    var fixture = this.mockJSON(store, type, record, true);
    fixture = this.updateFixtures(store, type, fixture);
    return this.simulateRemoteCall(this.createSingleRecordResponse(store, type, fixture));
  },

  /**
   * @inheritDoc
   */
  updateRecord: function (store, type, record) {
    var fixture = this.mockJSON(store, type, record);
    fixture = this.updateFixtures(store, type, fixture);
    return this.simulateRemoteCall(this.createSingleRecordResponse(store, type, fixture));
  },

  /**
   * @inheritDoc
   */
  deleteRecord: function (store, type, record) {
    this.deleteLoadedFixture(store, type, record);
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
  fixturesForType: function (store, type) {
    var key, FIXTURES;
    type = this._parseModelOrType(store, type);
    key = dasherize(type.typeKey);
    FIXTURES = this.get('FIXTURES');
    if (!FIXTURES[key]) {
      FIXTURES[key] = Ember.A([]);
    }
    return FIXTURES[key];
  },

  /**
   * Get a fixture for a given type and ID
   *
   * @method fixtureForId
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {string|number} id
   * @return {Object}
   */
  fixtureForId: function (store, type, id) {
    id = coerceId(id);
    return this.fixturesForType(store, type).find(function (record) {
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
    var adapter = this, responseFunction, isOk, shouldCopy, isInvalid;
    statusCode = statusCode || 200;
    statusText = statusText || HTTP_STATUS_MESSAGES[statusCode];
    isOk = Math.round(statusCode / 100) === 2;
    if (typeof response === 'function') {
      shouldCopy = true;
      responseFunction = bind(this, response);
    }
    else {
      isInvalid = response instanceof DS.InvalidError;
      if (isInvalid) {
        response = new DS.InvalidError(response.errors);
      }
      else {
        response = copy(response, true);
      }
      responseFunction = function () {
        return response;
      };
    }
    return new Ember.RSVP.Promise(function (resolve, reject) {
      var value, func, data;
      func = isOk ? resolve : reject;
      data = responseFunction();
      if (shouldCopy) {
        data = copy(data, true);
      }
      value = isOk ? data : (isInvalid ? data : {
        response:     data || {error: statusText},
        responseJSON: data || {error: statusText},
        status:       statusCode,
        statusText:   statusText
      });
      Ember.runInDebug(function () {
        console[isOk ? 'log' : 'error'](
          fmt('[dev-fixtures] Simulating %@ response:', isOk ? 'success' : 'error'),
          response
        );
      });
      if (adapter.get('simulateRemoteResponse')) {
        // Schedule with setTimeout
        later(null, func, value, adapter.get('latency'));
      }
      else {
        // Asynchronous, but at the of the run-loop with zero latency
        schedule('actions', null, func, value);
      }
    }, "DS: DevFixtureAdapter#simulateRemoteCall");
  },


  /**
   * Complete a JSON response to add linked records which are not async
   *
   * @method completeJsonResponse
   * @param {DS.Store} store
   * @param {Object} json
   * @param {string|DS.Model|Object} [injections...]
   */
  completeJsonResponse: function (store, json) {
    var handledRecords = [], key, records, handleRecord, Model;
    handleRecord = function (record) {
      this.completeJsonForRecord(store, record, Model, json, handledRecords);
    };
    for (key in json) {
      if (json.hasOwnProperty(key)) {
        records = json[key];
        Model = store.modelFor(singularize(key));
        forEach(records, handleRecord, this);
      }
    }
    return json;
  },

  /**
   * Complete a record adding in the given json the related records which are not defined as async
   *
   * @method completeJsonForRecord
   * @param {DS.Store} store
   * @param {DS.Model} record
   * @param {subclass of DS.Model} Model
   * @param {Object} json
   * @param {Array.<DS.Model>} handledRecords
   */
  completeJsonForRecord: function (store, record, Model, json, handledRecords) {
    if (handledRecords.indexOf(record) === -1) {
      handledRecords.push(record);
      Model.eachRelationship(function (name, meta) {
        var related, fixtures, relatedTypeKey, ids;
        if (!meta.async && record[name]) {
          fixtures = Ember.A(this.fixturesForType(store, meta.type));
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
            relatedTypeKey = pluralize(meta.type.typeKey);
            if (!json[relatedTypeKey]) {
              json[relatedTypeKey] = [];
            }
            related.forEach(function (record) {
              if (json[relatedTypeKey].indexOf(record) === -1) {
                json[relatedTypeKey].push(record);
              }
              this.completeJsonForRecord(store, record, meta.type, json, handledRecords);
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
    type = this._parseModelOrType(store, type);
    json[pluralize(type.typeKey)] = [record];
    this._injectFixturesInResponse.apply(this, [store, json].concat(slice.call(arguments, 3)));
    return this.completeJsonResponse(store, json);
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
    type = this._parseModelOrType(store, type);
    json[pluralize(type.typeKey)] = records;
    this._injectFixturesInResponse.apply(this, [store, json].concat(slice.call(arguments, 3)));
    return this.completeJsonResponse(store, json);
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
   * Creates an error response to be used with simulateResponseCall
   *
   * @method createErrorResponse
   * @param {Object|Error|string} errors
   * @return {Object}
   */
  createErrorResponse: function (errors) {
    if (typeof errors === 'string' || errors instanceof Error) {
      errors = {'*': '' + errors};
    }
    else if (errors == null) {
      errors = {'*': 'Unknown error'};
    }
    return new DS.InvalidError(errors);
  },

  /**
   * Update the fixture for given type and fixture record
   *
   * @method updateFixtures
   * @param {DS.Store} store
   * @param {DS.Model|string} type
   * @param {Object} fixtureRecord
   * @return {Object}
   */
  updateFixtures: function (store, type, fixtureRecord) {
    var fixture;
    if (fixtureRecord.id) {
      type = this._parseModelOrType(store, type);
      // lookup for a fixture
      fixture = this.fixtureForId(store, type, fixtureRecord.id);
      if (fixture) {
        Ember.merge(fixture, fixtureRecord);
        this._touchDateAttr(store, type, fixture, 'updatedAt');
        return fixture;
      }
    }
    else {
      throw new Error('Updating a fixture requires an ID.');
    }
    // new fixture
    this._touchDateAttr(store, type, fixtureRecord, 'createdAt', 'updatedAt');
    this.fixturesForType(store, type).pushObject(fixtureRecord);
    return fixtureRecord;
  },

  /**
   * Creates a new fixture record and update fixtures with it
   *
   * @method createFixture
   * @param {DS.Store} store
   * @param {DS.Model|string} type
   * @param {Object} [fixtureRecord={}]
   * @return {Object}
   */
  createFixture: function (store, type, fixtureRecord) {
    var fixture = fixtureRecord || {};
    type = this._parseModelOrType(store, type);
    if (!fixtureRecord.id) {
      fixtureRecord.id = this.generateId(store, type);
    }
    if (this.fixtureForId(store, type, fixture.id)) {
      throw new Error('Fixture `' + type.typeKey + '` with id `' + fixture.id + '` already exists.');
    }
    return this.updateFixtures(store, type, fixture);
  },


  /**
   * Deletes a fixture for given type and record
   *
   * @method deleteLoadedFixture
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {Object} fixtureRecord
   * @return {null}
   */
  deleteLoadedFixture: function (store, type, fixtureRecord) {
    var fixture, fixturesArray;
    if (fixtureRecord.id) {
      fixture = this.fixtureForId(store, type, fixtureRecord.id);
      if (fixture) {
        fixturesArray = this.fixturesForType(store, type);
        fixturesArray.splice(fixturesArray.indexOf(fixtureRecord), 1);
      }
    }
    else {
      throw new Error('Deleting a fixture requires an ID.');
    }
    return null;
  },


  /**
   * Inject fixtures into the given json
   *
   * @method _injectFixturesInResponse
   * @param {DS.Store} store
   * @param {Object} json
   * @return {Object}
   */
  _injectFixturesInResponse: function (store, json) {
    var i, args = slice.call(arguments, 2), len = args.length, records, typeKey;
    for (i = 0; i < len; i += 2) {
      records = args[i + 1];
      records = records ? (isArray(records) ? records.slice() : [records]) : [];
      typeKey = pluralize(this._parseModelOrType(store, args[i]).typeKey);
      if (!json[typeKey]) {
        json[typeKey] = records;
      }
      else {
        injectNoConflict(json[typeKey], records);
      }
    }
    return json;
  },


  /**
   * Internal function to get the model of a record
   *
   * @method _parseModelOrType
   * @param {DS.Store} store
   * @param {string|subclass of DS.Model} modelOrType
   * @return {subclass of DS.Model}
   * @private
   */
  _parseModelOrType: function (store, modelOrType) {
    if (typeof modelOrType === 'string') {
      return store.modelFor(modelOrType);
    }
    return modelOrType;
  },

  /**
   * Update the date of the fixture at given attribute(s) to now (if the attribute is defined in the model)
   *
   * @method _touchDateAttr
   * @param {DS.Store} store
   * @param {subclass of DS.Model|string} type
   * @param {Object} fixture
   * @param {string} attributes...
   */
  _touchDateAttr: function (store, type, fixture) {
    var now = (new Date()).toISOString(), attributes = slice.call(arguments, 3);
    this._parseModelOrType(store, type).eachAttribute(function (name, meta) {
      if (attributes.indexOf(name) !== -1 && (!meta.type || meta.type === 'date')) {
        fixture[name] = now;
      }
    });
  }
});
