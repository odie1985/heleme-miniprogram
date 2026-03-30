const { getFeedItems } = require('../../utils/store')

Page({
  data: {
    scopeFilter: 'all',
    typeFilter: 'all',
    list: []
  },

  onShow() {
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
    const list = getFeedItems(scopeFilter, typeFilter).map((item) => ({
      ...item,
      sourceLabel: item.source === 'friend' ? `好友 · ${item.nickname}` : `我 · ${item.nickname}`
    }))
    this.setData({ list })
  }
})
