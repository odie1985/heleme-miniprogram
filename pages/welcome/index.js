const DEFAULT_COUNTDOWN = 3

Page({
  data: {
    countdown: DEFAULT_COUNTDOWN
  },

  onLoad() {
    this.startCountdown()
  },

  onUnload() {
    this.clearCountdown()
  },

  onHide() {
    this.clearCountdown()
  },

  startCountdown() {
    this.clearCountdown()
    this.timer = setInterval(() => {
      const next = this.data.countdown - 1
      if (next <= 0) {
        this.setData({ countdown: 0 })
        this.enterApp()
        return
      }
      this.setData({ countdown: next })
    }, 1000)
  },

  clearCountdown() {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  },

  skipWelcome() {
    this.enterApp()
  },

  enterApp() {
    this.clearCountdown()
    wx.switchTab({
      url: '/pages/calendar/index'
    })
  }
})
