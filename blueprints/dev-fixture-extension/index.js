module.exports = {
  description: 'Generates a fixture extension file for a model in the given overlay.',

  availableOptions: [
    {
      name: 'overlay',
      type: String
    }
  ],

  locals: function (options) {
    return {overlay: options.overlay};
  },

  fileMapTokens: function () {
    return {
      __overlay__: function (options) {
        return options.locals.overlay;
      }
    };
  }
};
