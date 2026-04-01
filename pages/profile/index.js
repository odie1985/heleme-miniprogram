const {
  getRecords,
  getCurrentUser,
  updateCurrentUser,
  markLoggedIn,
  getFriends,
  addFriend,
  addFriendShare,
  parseFriendQrPayload,
  today,
  buildFriendQrPayload
} = require('../../utils/store')

function pad2(n) {
  return String(n).padStart(2, '0')
}

function currentMonthPrefix() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

function getMonthTitle(prefix) {
  const [year, month] = prefix.split('-')
  return `${year}年${month}月`
}

function parseYm(ym) {
  const text = String(ym || '')
  const [y, m] = text.split('-').map((n) => Number(n))
  if (!y || !m) return null
  return { year: y, month: m }
}

function normalizeDrinkCategory(rawText) {
  const text = String(rawText || '').toLowerCase()
  if (!text) return ''

  if (text.includes('啤酒') || text.includes('beer')) return '啤酒'
  if (text.includes('红酒') || text.includes('葡萄酒') || text.includes('wine')) return '红酒'
  if (text.includes('白酒') || text.includes('baijiu')) return '白酒'
  if (text.includes('黄酒')) return '黄酒'
  if (
    text.includes('洋酒') ||
    text.includes('威士忌') ||
    text.includes('whisky') ||
    text.includes('whiskey') ||
    text.includes('伏特加') ||
    text.includes('vodka') ||
    text.includes('白兰地') ||
    text.includes('brandy') ||
    text.includes('朗姆') ||
    text.includes('rum') ||
    text.includes('金酒') ||
    text.includes('gin') ||
    text.includes('龙舌兰') ||
    text.includes('tequila') ||
    text.includes('鸡尾酒') ||
    text.includes('cocktail')
  ) {
    return '洋酒'
  }
  if (text.includes('其他')) return '其他'
  return ''
}

function normalizeDrinkScene(rawText) {
  const text = String(rawText || '').toLowerCase()
  if (!text) return ''
  if (text.includes('商务宴请')) return '商务宴请'
  if (text.includes('朋友小聚')) return '朋友小聚'
  if (text.includes('家庭聚会')) return '家庭聚会'
  if (text.includes('独自小酌')) return '独自小酌'
  if (text.includes('庆祝应酬')) return '庆祝应酬'
  if (text.includes('其他场景')) return '其他场景'
  return ''
}

Page({
  data: {
    monthTitle: '',
    monthDrinkCount: 0,
    monthFitnessCount: 0,
    monthTotal: 0,
    totalRecords: 0,
    drinkRate: 0,
    fitnessRate: 0,
    user: {
      friendCode: '',
      nickname: '',
      motto: '',
      avatarUrl: '',
      isLoggedIn: false
    },
    userAvatarChar: '喝',
    displayName: '未登录',
    displayMotto: '点击右侧微信登录',
    displayPhoneText: '未绑定手机号',
    friends: [],
    qrPayload: '',
    scanLoading: false,
    showFriendPanel: false,
    drinkPieLegend: [],
    drinkPieEmpty: true,
    drinkScenePieLegend: [],
    drinkScenePieEmpty: true,
    statMonth: '',
    statMonthLabel: ''
  },

  onLoad(options) {
    const parsed = parseYm(options && options.month)
    if (!parsed) return
    this.setData({ statMonth: `${parsed.year}-${pad2(parsed.month)}` })
  },

  onShow() {
    if (!this.data.statMonth) {
      this.setData({ statMonth: currentMonthPrefix() })
    }
    this.refresh()
  },

  refresh() {
    const list = getRecords()
    const monthPrefix = this.data.statMonth || currentMonthPrefix()
    const monthList = list.filter((item) => item.date.startsWith(monthPrefix))

    const monthDrinkCount = monthList.filter((item) => item.type === 'drink').length
    const monthFitnessCount = monthList.filter((item) => item.type === 'fitness').length
    const monthTotal = monthList.length
    const drinkCategoryStats = this.getDrinkCategoryStats(monthList)
    const drinkSceneStats = this.getDrinkSceneStats(monthList)

    const drinkRate = monthTotal ? Math.round((monthDrinkCount / monthTotal) * 100) : 0
    const fitnessRate = monthTotal ? Math.round((monthFitnessCount / monthTotal) * 100) : 0

    const user = getCurrentUser()
    const friends = getFriends()

    this.setData({
      monthTitle: getMonthTitle(monthPrefix),
      statMonthLabel: getMonthTitle(monthPrefix),
      monthDrinkCount,
      monthFitnessCount,
      monthTotal,
      totalRecords: list.length,
      drinkRate,
      fitnessRate,
      user,
      userAvatarChar: (user.nickname || '喝').slice(0, 1),
      displayName: user.isLoggedIn ? (user.nickname || '微信用户') : '未登录',
      displayMotto: user.isLoggedIn
        ? (user.motto || '这个人很懒，什么都没留下。')
        : '点击右侧微信登录',
      displayPhoneText: user.phoneBound
        ? `已绑定：${user.phoneMasked || '手机号'}`
        : '未绑定手机号',
      friends,
      qrPayload: buildFriendQrPayload(user),
      drinkPieLegend: drinkCategoryStats.legend,
      drinkPieEmpty: drinkCategoryStats.total === 0,
      drinkScenePieLegend: drinkSceneStats.legend,
      drinkScenePieEmpty: drinkSceneStats.total === 0
    })

    wx.nextTick(() => {
      this.drawPieById('drinkPieCanvas', drinkCategoryStats.segments, drinkCategoryStats.total)
      this.drawPieById('drinkScenePieCanvas', drinkSceneStats.segments, drinkSceneStats.total)
    })
  },

  changeStatMonth(delta) {
    const parsed = parseYm(this.data.statMonth || currentMonthPrefix())
    if (!parsed) return
    const next = new Date(parsed.year, parsed.month - 1 + delta, 1)
    const nextYm = `${next.getFullYear()}-${pad2(next.getMonth() + 1)}`
    this.setData({ statMonth: nextYm })
    this.refresh()
  },

  goPrevStatMonth() {
    this.changeStatMonth(-1)
  },

  goNextStatMonth() {
    this.changeStatMonth(1)
  },

  onStatMonthChange(e) {
    const ym = e.detail.value
    const parsed = parseYm(ym)
    if (!parsed) return
    this.setData({ statMonth: `${parsed.year}-${pad2(parsed.month)}` })
    this.refresh()
  },

  getDrinkCategoryStats(monthList) {
    const palette = ['#f59e0b', '#ef4444', '#f97316', '#a855f7', '#2563eb', '#6b7280']
    const categoryOrder = ['啤酒', '红酒', '白酒', '黄酒', '洋酒', '其他']
    const counter = categoryOrder.reduce((acc, item) => {
      acc[item] = 0
      return acc
    }, {})

    monthList
      .filter((item) => item.type === 'drink')
      .forEach((item) => {
        const contentText = String(item.content || '')
        const amountText = String(item.amount || '')
        const fromContentHead = contentText.split('·')[0].trim()
        const fromHead = normalizeDrinkCategory(fromContentHead)
        const fromContent = normalizeDrinkCategory(contentText)
        const fromAmount = normalizeDrinkCategory(amountText)
        const key = fromHead || fromContent || fromAmount || '其他'
        counter[key] += 1
      })

    const total = Object.values(counter).reduce((sum, n) => sum + n, 0)
    const segments = []
    const legend = []
    categoryOrder.forEach((name, index) => {
      const count = counter[name]
      if (!count) return
      const ratio = total ? count / total : 0
      segments.push({
        name,
        count,
        ratio,
        color: palette[index % palette.length]
      })
      legend.push({
        name,
        count,
        percentText: `${Math.round(ratio * 100)}%`,
        color: palette[index % palette.length]
      })
    })

    return { total, segments, legend }
  },

  getDrinkSceneStats(monthList) {
    const palette = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#9ca3af']
    const sceneOrder = ['商务宴请', '朋友小聚', '家庭聚会', '独自小酌', '庆祝应酬', '其他场景']
    const counter = sceneOrder.reduce((acc, item) => {
      acc[item] = 0
      return acc
    }, {})

    monthList
      .filter((item) => item.type === 'drink')
      .forEach((item) => {
        const contentText = String(item.content || '')
        const sceneFromContent = normalizeDrinkScene(contentText)
        const key = sceneFromContent || '其他场景'
        counter[key] += 1
      })

    const total = Object.values(counter).reduce((sum, n) => sum + n, 0)
    const segments = []
    const legend = []
    sceneOrder.forEach((name, index) => {
      const count = counter[name]
      if (!count) return
      const ratio = total ? count / total : 0
      segments.push({
        name,
        count,
        ratio,
        color: palette[index % palette.length]
      })
      legend.push({
        name,
        count,
        percentText: `${Math.round(ratio * 100)}%`,
        color: palette[index % palette.length]
      })
    })
    return { total, segments, legend }
  },

  drawPieById(canvasId, segments, total) {
    const query = wx.createSelectorQuery().in(this)
    query
      .select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const target = res && res[0]
        if (!target || !target.node) return

        const canvas = target.node
        const ctx = canvas.getContext('2d')
        const dpr = (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || wx.getSystemInfoSync().pixelRatio || 2
        const width = target.width
        const height = target.height

        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, width, height)

        const cx = width / 2
        const cy = height / 2
        const radius = Math.min(width, height) * 0.38

        if (!total || !segments.length) {
          ctx.beginPath()
          ctx.arc(cx, cy, radius, 0, Math.PI * 2)
          ctx.fillStyle = '#e5e7eb'
          ctx.fill()
          return
        }

        let start = -Math.PI / 2
        segments.forEach((seg) => {
          const angle = seg.ratio * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.arc(cx, cy, radius, start, start + angle)
          ctx.closePath()
          ctx.fillStyle = seg.color
          ctx.fill()
          start += angle
        })

        ctx.beginPath()
        ctx.arc(cx, cy, radius * 0.46, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
      })
  },

  loginAndSyncWechatProfile() {
    wx.login({
      success: (loginRes) => {
        const applyUserInfo = (userInfo = {}) => {
          updateCurrentUser({
            nickname: userInfo.nickName || getCurrentUser().nickname,
            avatarUrl: userInfo.avatarUrl || getCurrentUser().avatarUrl
          })
          markLoggedIn({ code: loginRes.code || '' })
          wx.showToast({ title: '登录成功', icon: 'success' })
          this.refresh()
        }

        if (typeof wx.getUserProfile === 'function') {
          wx.getUserProfile({
            desc: '用于展示你的头像和昵称',
            success: (res) => {
              applyUserInfo(res.userInfo || {})
            },
            fail: () => {
              markLoggedIn({ code: loginRes.code || '' })
              wx.showToast({ title: '已登录，可稍后授权头像昵称', icon: 'none' })
              this.refresh()
            }
          })
          return
        }

        if (typeof wx.getUserInfo === 'function') {
          wx.getUserInfo({
            success: (res) => applyUserInfo(res.userInfo || {}),
            fail: () => {
              markLoggedIn({ code: loginRes.code || '' })
              wx.showToast({ title: '已登录', icon: 'success' })
              this.refresh()
            }
          })
          return
        }

        markLoggedIn({ code: loginRes.code || '' })
        wx.showToast({ title: '已登录', icon: 'success' })
        this.refresh()
      },
      fail: () => {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      }
    })
  },

  onChooseAvatar(e) {
    if (!this.data.user.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const avatarUrl = (e.detail && e.detail.avatarUrl) || ''
    if (!avatarUrl) {
      wx.showToast({ title: '头像更新失败', icon: 'none' })
      return
    }
    updateCurrentUser({ avatarUrl })
    wx.showToast({ title: '头像已更新', icon: 'success' })
    this.refresh()
  },

  editNickname() {
    if (!this.data.user.isLoggedIn) {
      this.loginAndSyncWechatProfile()
      return
    }
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '输入昵称',
      content: this.data.user.nickname || '',
      success: (res) => {
        if (!res.confirm) return
        const nickname = (res.content || '').trim() || '喝了么用户'
        updateCurrentUser({ nickname })
        wx.showToast({ title: '昵称已更新', icon: 'success' })
        this.refresh()
      }
    })
  },

  onDisplayNameTap() {
    if (this.data.user.isLoggedIn) {
      this.editNickname()
      return
    }
    wx.showActionSheet({
      itemList: ['微信登录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.loginAndSyncWechatProfile()
        }
      }
    })
  },

  editMotto() {
    if (!this.data.user.isLoggedIn) {
      this.loginAndSyncWechatProfile()
      return
    }
    wx.showModal({
      title: '修改签名',
      editable: true,
      placeholderText: '输入签名',
      content: this.data.user.motto || '',
      success: (res) => {
        if (!res.confirm) return
        const motto = (res.content || '').trim() || '记录即改变，今天也保持节奏。'
        updateCurrentUser({ motto })
        wx.showToast({ title: '签名已更新', icon: 'success' })
        this.refresh()
      }
    })
  },

  onGetPhoneNumber(e) {
    if (!this.data.user.isLoggedIn) {
      wx.showToast({
        title: '请先微信登录',
        icon: 'none'
      })
      return
    }

    const detail = e.detail || {}
    if (detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({
        title: '你取消了手机号授权',
        icon: 'none'
      })
      return
    }

    // 小程序正式场景应把 detail.code 发给服务端换取手机号。
    const code = detail.code || ''
    const phoneNumber = detail.phoneNumber || ''
    const masked = phoneNumber
      ? `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`
      : '已授权（待服务端换号）'

    updateCurrentUser({
      phoneBound: true,
      phoneMasked: masked,
      phoneAuthCode: code
    })

    wx.showToast({
      title: '手机号授权成功',
      icon: 'success'
    })
    this.refresh()
  },

  toggleFriendPanel() {
    this.setData({
      showFriendPanel: !this.data.showFriendPanel
    })
  },

  goScanAddFriend() {
    if (this.data.scanLoading) return
    this.setData({ scanLoading: true })

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
        this.refresh()
      },
      fail: () => {
        wx.showToast({
          title: '扫码取消或失败',
          icon: 'none'
        })
      },
      complete: () => {
        this.setData({ scanLoading: false })
      }
    })
  },

  goMyQr() {
    wx.navigateTo({
      url: '/pages/friend-qr/index'
    })
  },

  mockFriendShare(e) {
    const friendCode = e.currentTarget.dataset.code
    const nickname = e.currentTarget.dataset.nickname
    addFriendShare({
      friendCode,
      nickname,
      type: Math.random() > 0.5 ? 'drink' : 'fitness',
      date: today(),
      content: Math.random() > 0.5 ? '今天状态不错，继续！' : '完成计划，打卡收工。',
      amount: Math.random() > 0.5 ? '2杯' : '30分钟'
    })
    wx.showToast({
      title: '已生成好友动态',
      icon: 'none'
    })
  },

  getShareInfoForStatMonth() {
    const month = this.data.statMonth || currentMonthPrefix()
    const monthLabel = this.data.statMonthLabel || getMonthTitle(month)
    const drink = this.data.monthDrinkCount || 0
    const fitness = this.data.monthFitnessCount || 0
    const total = this.data.monthTotal || 0
    return {
      month,
      title: `我在${monthLabel}记录了${total}次：喝酒${drink}次，健身${fitness}次`
    }
  },

  onShareAppMessage(options) {
    const source = options && options.target && options.target.dataset && options.target.dataset.shareSource
    if (source === 'stat') {
      const shareInfo = this.getShareInfoForStatMonth()
      return {
        title: shareInfo.title,
        path: `/pages/profile/index?month=${encodeURIComponent(shareInfo.month)}`
      }
    }

    const userName = this.data.displayName || '喝了么用户'
    return {
      title: `${userName}邀请你一起在喝了么打卡`,
      path: '/pages/profile/index'
    }
  },

  onShareTimeline() {
    const shareInfo = this.getShareInfoForStatMonth()
    return {
      title: shareInfo.title,
      query: `month=${encodeURIComponent(shareInfo.month)}`
    }
  }
})
