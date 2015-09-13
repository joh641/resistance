'use strict';

var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var MOVE_LEFT = new Buffer('1b5b3130303044', 'hex').toString();
var CLEAR_LINE = new Buffer('1b5b304b', 'hex').toString();

module.exports = {
  context: path.join(__dirname, '..'),
  entry: {
    resistance: [
      './app/styles/index.scss',
      './app/index.js'
    ]
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, '..', 'public', 'assets'),
    library: 'Resistance',
    libraryTarget: 'umd'
  },
  plugins: [
    new webpack.NoErrorsPlugin(),
    new webpack.ProgressPlugin(function(percentage, message) {
      process.stdout.write(
        CLEAR_LINE + Math.round(percentage * 100) +
        '%: ' + message + MOVE_LEFT
      );
    }),
    new ExtractTextPlugin('[name].css')
  ],
  extensions: ['', '.js', '.scss'],
  resolve: {
    root: [
      path.resolve(__dirname, './../app')
    ]
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules\//,
        loaders: ['babel-loader?optional=runtime']
      },
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract('style-loader', [
          'css-loader?root=images',
          'autoprefixer-loader?' + JSON.stringify({
            browsers: ['> 1%'],
            cascade: false
          }),
          'sass-loader?' + JSON.stringify({
            includePaths: [
              path.resolve(__dirname, 'app/images')
            ]
          })
        ].join('!'))
      },
      {
        test: /\.(gif|jpg|png|svg|woff|woff2)$/,
        loader: 'url-loader'
      }
    ]
  },
  progress: true
};
