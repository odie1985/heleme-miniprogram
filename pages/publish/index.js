const {
  addRecord,
  getPendingRecordDraft,
  clearPendingRecordDraft
} = require('../../utils/store')

function pad2(n) {
  return String(n).padStart(2, '0')
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

Page({
  data: {
    form: {
      type: 'drink',
      date: today(),
      content: '',
      amount: ''
    }
  },

  onLoad(query) {
    const form = { ...this.data.form }
    if (query.type === 'drink' || query.type === 'fitness') {
      form.type = query.type
    }
    if (query.date) {
      form.date = query.date
    }
    this.setData({ form })
  },

  onShow() {
    const draft = getPendingRecordDraft()
    if (!draft) return

    const nextForm = { ...this.data.form }
    if (draft.type === 'drink' || draft.type === 'fitness') {
      nextForm.type = draft.type
    }
    if (draft.date) {
      nextForm.date = draft.date
    }

    this.setData({ form: nextForm })
    clearPendingRecordDraft()
  },

  setType(e) {
    this.setData({ 'form.type': e.currentTarget.dataset.value })
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value })
  },

  onContentInput(e) {
    this.setData({ 'form.content': e.detail.value })
  },

  onAmountInput(e) {
    this.setData({ 'form.amount': e.detail.value })
  },

  submit() {
    const { form } = this.data
    if (!form.date || (form.type !== 'drink' && form.type !== 'fitness')) {
      wx.showToast({
        title: '请完善记录信息',
        icon: 'none'
      })
      return
    }
    addRecord(form)
    wx.showToast({
      title: '记录成功',
      icon: 'success'
    })

    this.setData({
      form: {
        ...form,
        content: '',
        amount: ''
      }
    })

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/calendar/index'
      })
    }, 500)
  }
})
