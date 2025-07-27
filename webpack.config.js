const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  entry: {
    "offscreen-bundle": "./offscreen.entry.js",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  experiments: {
    topLevelAwait: true,
  },
  resolve: {
    fallback: {
      fs: false,
      path: false,
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          // Copy .wasm files from tfjs-backend-wasm
          from: path.resolve(__dirname, "node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm"),
          to: path.resolve(__dirname, "lib/[name][ext]"), // this preserves filename
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
};