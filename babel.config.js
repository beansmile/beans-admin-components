module.exports = {
  presets: [
    ['@vue/app', { absoluteRuntime: false }]
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { 'legacy': true }],
    ['@babel/plugin-proposal-class-properties', { 'loose': true }],
    '@babel/plugin-proposal-export-default-from',
    'lodash',
    [
      'component',
      {
        'libraryName': 'element-ui',
        style: false,
      }
    ]
  ]
}
