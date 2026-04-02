const {
  getFeedItems,
  getCurrentUser,
  toggleFeedLike,
  addFeedComment
} = require('../../utils/store')

function formatFeedTime(timestamp, dateText) {
  if (!timestamp) return dateText || ''
  const d = new Date(timestamp)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function pickAvatarTone(seedText) {
  const palette = ['tone-blue', 'tone-pink', 'tone-violet', 'tone-amber', 'tone-cyan']
  const text = String(seedText || '喝了么')
  const sum = text.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return palette[sum % palette.length]
}

Page({
  data: {
    scopeFilter: 'all',
    typeFilter: 'all',
    list: []
  },

  onShow() {
    getCurrentUser()
    this.refresh()
  },

  setScopeFilter(e) {
    this.setData({ scopeFilter: e.currentTarget.dataset.value })
    this.refresh()
  },

  setTypeFilter(e) {
    this.setData({ typeFilter: e.currentTarget.dataset.value })
    this.refresh()
  },

  refresh() {
    const { scopeFilter, typeFilter } = this.data
    const list = getFeedItems(scopeFilter, typeFilter).map((item) => {
      const images = Array.isArray(item.images) ? item.images : []
      return {
        ...item,
        avatarText: (item.nickname || '喝').slice(0, 1),
        avatarTone: pickAvatarTone(item.nickname || item.friendCode || item.id),
        displayTime: formatFeedTime(item.createdAt, item.date),
        sourceLabel: item.source === 'friend' ? '好友动态' : '我的动态',
        typeLabel: item.type === 'drink' ? '喝酒' : '健身',
        gridClass:
          images.length === 1 ? 'grid-one' : images.length === 4 ? 'grid-four' : 'grid-many'
      }
    })
    this.setData({ list })
  },

  previewFeedImage(e) {
    const id = e.currentTarget.dataset.id
    const index = Number(e.currentTarget.dataset.index)
    const item = (this.data.list || []).find((entry) => entry.id === id)
    const urls = (item && item.images) || []
    if (!urls.length) return
    wx.previewImage({
      current: urls[index] || urls[0],
      urls
    })
  },

  onMomentMoreTap(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.list || []).find((entry) => entry.id === id)
    if (!item) return

    wx.showActionSheet({
      itemList: [item.interaction && item.interaction.liked ? '取消点赞' : '点赞', '评论'],
      success: (res) => {
        if (res.tapIndex === 0) {
          toggleFeedLike(id)
          this.refresh()
          return
        }
        if (res.tapIndex === 1) {
          this.commentMoment(id)
        }
      }
    })
  },

  commentMoment(id) {
    const user = getCurrentUser()
    wx.showModal({
      title: '发表评论',
      editable: true,
      placeholderText: '说点什么吧',
      success: (res) => {
        if (!res.confirm) return
        const text = String(res.content || '').trim()
        if (!text) {
          wx.showToast({ title: '评论不能为空', icon: 'none' })
          return
        }
        addFeedComment(id, {
          nickname: user.nickname || '喝了么用户',
          text
        })
        this.refresh()
      }
    })
  }
})
