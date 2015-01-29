/* jshint node: true */
'use strict';

var sysPath = require('path');

module.exports = {
  name: 'ember-dev-fixtures',

  devFixturesConfig: function () {
    var ENV = this.project.config(process.env.EMBER_ENV || 'development');
    if (ENV.environment && ENV.devFixtures === undefined) {
      // activate it if it is not set at all for dev environment
      return {};
    }
    return ENV.devFixtures;
  },

  treeForApp: function () {
    var myConfig, trees = [];
    myConfig = this.devFixturesConfig();
    if (myConfig) {
      // inject our private tree into the app
      trees.push(this.pickFiles(this.treeGenerator(sysPath.join(__dirname, 'private')), {
        srcDir:  '/',
        files:   ['**/*.js'],
        destDir: '/'
      }));
      // inject the fixtures tree into the app
      trees.push(this.pickFiles(this.treeGenerator(sysPath.join(this.project.root, 'fixtures')), {
        srcDir:  '/',
        files:   ['**/*.js'],
        destDir: '/edf-fixtures'
      }));
      return this.mergeTrees(trees);
    }
  }
};
