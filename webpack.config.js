/**
 * @see http://webpack.github.io/docs/configuration.html
 * for webpack configuration options
 */
module.exports = {
  context: __dirname + '/lib',

  entry: './index.js',

  output:  {
    library: 'statechart',
    libraryTarget: 'this'
  },

  module: {
    loaders: [
    ]
  }
};
