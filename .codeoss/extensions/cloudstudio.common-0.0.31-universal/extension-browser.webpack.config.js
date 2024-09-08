//@ts-check

'use strict';

const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const withBrowserDefaults = require('../shared.webpack.config').browser;

module.exports = withBrowserDefaults({
  context: __dirname,
  entry: {
    extension: './src/browser/extension.ts',
  },
  optimization: {
    // @ts-ignore
    minimizer: [new UglifyJsPlugin()],
  },
  devtool: false,
});
