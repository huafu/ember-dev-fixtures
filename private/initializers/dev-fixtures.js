import Ember from 'ember';
import ENV from '../config/environment';
import DevFixturesAdapter from '../adapters/dev-fixtures';

var ALL_FIXTURES = {};


function overrideAdapter(name, extension, app) {
  var path = ENV.modulePrefix + '/adapters/' + name, Class, hasModule, Module;
  try {
    Module = require(path);
    hasModule = true;
  }
  catch (e) {
    hasModule = false;
  }
  Class = DevFixturesAdapter.extend(extension || {});
  if (hasModule) {
    Module['default'] = Class;
  }
  app.register('adapter:' + name, Class);
  return Class;
}

export function initialize(container, application) {
  var adapterNames, regexp, base, adapterOverrides = {}, name;
  regexp = new RegExp('^' + ENV.modulePrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '/fixtures/');
  for (name in require.entries) {
    if (regexp.test(name)) {
      base = name.replace(regexp, '');
      if (/^adapters\/[^\/]+$/.test(base)) {
        adapterOverrides[base.replace(/^adapters\//, '')] = require(name)['default']
      }
      else if (!/\//.test(base)) {
        ALL_FIXTURES[base] = require(name)['default'];
      }
    }
  }
  application.register('dev-fixtures:main', ALL_FIXTURES, {instantiate: false});
  adapterNames = Ember.getWithDefault(ENV, 'devFixtures.adapters', ['application']);
  Ember.EnumerableUtils.forEach(adapterNames, function (name) {
    if (!adapterOverrides[name]) {
      adapterOverrides[name] = {};
    }
  });
  for (name in adapterOverrides) {
    overrideAdapter(name, adapterOverrides[name], application);
    application.inject('adapter:' + name, 'FIXTURES', 'dev-fixtures:main');
  }
}

export default {
  name:       'dev-fixtures',
  before:     'store',
  initialize: initialize
};
