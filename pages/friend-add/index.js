const { addFriend, addFriendShare, parseFriendQrPayload, today, getRecords } = require('../../utils/store')

const FRIEND_LOCATIONS = ['静安小酒馆', '滨江夜跑道', '大学城健身房', '湖边露台', '城市天台']

function pickRandom(list) {
  if (!Array.isArray(list) || !list.length) return ''
  return list[Math.floor(Math.random() * list.length)]
}

function buildSeedFriendShare(friend) {
  const records = getRecords()
  const imageRecord = records.find((item) => Array.isArray(item.images) && item.images.length)
  const locationRecord = records.find((item) => item.locationName)
  const shareType = Math.random() > 0.5 ? 'drink' : 'fitness'

  if (shareType === 'drink') {
    return {
      friendCode: friend.code,
      nickname: friend.nickname,
      type: 'drink',
      date: today(),
      content: pickRandom(['刚和朋友碰了一杯，状态正好', '今晚小聚很开心，气氛特别对味', '下班之后来点放松，微醺就够']),
      amount: pickRandom(['2杯', '1瓶', '3杯']),
      locationName: locationRecord && locationRecord.locationName ? locationRecord.locationName : pickRandom(FRIEND_LOCATIONS),
      images: imageRecord && imageRecord.images ? [imageRecord.images[0]] : []
    }
  }

  return {
    friendCode: friend.code,
    nickname: friend.nickname,
    type: 'fitness',
    date: today(),
    content: pickRandom(['练完一组力量，整个人都清醒了', '夜跑结束，今天也没有偷懒', '刚做完有氧，汗流得很舒服']),
    amount: pickRandom(['30分钟', '45分钟', '60分钟']),
    locationName: locationRecord && locationRecord.locationName ? locationRecord.locationName : pickRandom(FRIEND_LOCATIONS),
    images: imageRecord && imageRecord.images ? [imageRecord.images[0]] : []
  }
}

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

        addFriendShare(buildSeedFriendShare(result.data))

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
