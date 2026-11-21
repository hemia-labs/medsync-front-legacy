module.exports = { productionSourceMap: false, transpileDependencies: ['vuetify'],
  pages: { index: { entry: 'scripts/qa/nc3-integrity-harness/main.js', template: 'scripts/qa/nc3-integrity-harness/index.html' } },
  devServer: { port: 8095, historyApiFallback: true } }
