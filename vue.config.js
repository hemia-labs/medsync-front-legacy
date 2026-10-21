module.exports = {
  transpileDependencies: [
    'vuetify'
  ],
  chainWebpack(config) {
    // The renderer is requested only after Pulso has useful content.
    if(config.plugins.has('prefetch')) {
      config.plugin('prefetch').tap(options => {
        options[0].fileBlacklist = [...(options[0].fileBlacklist || []), /\.map$/, /hot-update\.js$/, /pulse-engine\./];
        return options;
      });
    }
  },
  devServer: {
    port: 4324,
    historyApiFallback: true
  }
}
