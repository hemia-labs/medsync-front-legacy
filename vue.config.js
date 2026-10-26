module.exports = {
  transpileDependencies: [
    'vuetify'
  ],
  chainWebpack(config) {
    if(process.env.NODE_ENV === 'production') {
      const result = require('./scripts/qa/enforce-https-api-url').validateApiUrl('production', process.env);
      if(!result.ok) throw new Error(result.error);
    }
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
