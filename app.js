App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cooper-85-5gu6aql7c887e3bd',
        traceUser: true
      })
    }
  },

  globalData: {
    appName: '喝了么',
    cloudEnv: 'cooper-85-5gu6aql7c887e3bd'
  }
})
