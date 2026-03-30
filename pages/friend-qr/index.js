const { getCurrentUser, buildFriendQrPayload } = require('../../utils/store')

Page({
  data: {
    user: {
      nickname: '',
      friendCode: ''
    },
    qrPayload: '',
    qrImageUrl: ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const user = getCurrentUser()
    const qrPayload = buildFriendQrPayload(user)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(qrPayload)}`

    this.setData({
      user,
      qrPayload,
      qrImageUrl
    })
  },

  copyFriendCode() {
    wx.setClipboardData({
      data: this.data.user.friendCode,
      success: () => {
        wx.showToast({ title: '好友码已复制', icon: 'none' })
      }
    })
  },

  copyPayload() {
    wx.setClipboardData({
      data: this.data.qrPayload,
      success: () => {
        wx.showToast({ title: '二维码内容已复制', icon: 'none' })
      }
    })
  }
})
