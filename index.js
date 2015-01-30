/* jshint node: true */
'use strict';

var sysPath = require('path');

module.exports = {
  name: 'ember-dev-fixtures',

  devFixturesConfig: null,

  treeForApp: function () {
    var trees;
    if (this.devFixturesConfig) {
      trees = [];
      trees.push(this.pickFiles(sysPath.join(this.project.root, 'fixtures'), {
        srcDir:  '/',
        files:   ['**/*.js'],
        destDir: '/ember-dev-fixtures'
      }));
      trees.push(this.pickFiles(this.treeGenerator(sysPath.join(__dirname, 'private')), {
        srcDir:  '/',
        files:   ['**/*.js'],
        destDir: '/'
      }));
      return this.mergeTrees(trees);
    }
  },

  included: function (app, parentAddon) {
    var target = (parentAddon || app),
      config = target.project.config(target.env),
      isDev = target.env === 'development';
    config = isDev && config.devFixtures === undefined ? {} : config.devFixtures;
    this.devFixturesConfig = config;
  }
};
