const { addFriend, addFriendShare, parseFriendQrPayload, today } = require('../../utils/store')

Page({
  data: {
    isScanning: false
  },

  onLoad(query) {
    if (query.scan === '1') {
      setTimeout(() => {
        this.scanFriendQr()
      }, 120)
    }
  },

  scanFriendQr() {
    if (this.data.isScanning) return
    this.setData({ isScanning: true })

    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
      success: (res) => {
        const parsed = parseFriendQrPayload(res.result)
        if (!parsed) {
          wx.showToast({
            title: '未识别到好友二维码',
            icon: 'none'
          })
          return
        }

        const result = addFriend({
          code: parsed.code,
          nickname: parsed.nickname
        })

        if (!result.ok) {
          wx.showToast({
            title: result.message,
            icon: 'none'
          })
          return
        }

        addFriendShare({
          friendCode: result.data.code,
          nickname: result.data.nickname,
          type: Math.random() > 0.5 ? 'drink' : 'fitness',
          date: today(),
          content: '很高兴认识你，一起打卡吧！',
          amount: Math.random() > 0.5 ? '1次' : '30分钟'
        })

        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 500)
      },
      fail: () => {
        wx.showToast({
          title: '扫码取消或失败',
          icon: 'none'
        })
      },
      complete: () => {
        this.setData({ isScanning: false })
      }
    })
  }
})
