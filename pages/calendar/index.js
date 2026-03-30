const {
  getRecords,
  groupByDate,
  addRecord,
  updateRecordById,
  deleteRecordById
} = require('../../utils/store')

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function formatYmd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function parseYmd(ymd) {
  const text = String(ymd || '')
  const [y, m, d] = text.split('-').map((n) => Number(n))
  if (!y || !m || !d) return null
  return { year: y, month: m, day: d }
}

function parseYm(ym) {
  const text = String(ym || '')
  const [y, m] = text.split('-').map((n) => Number(n))
  if (!y || !m) return null
  return { year: y, month: m }
}

function detectDrinkCategory(content, amount) {
  const text = `${content || ''} ${amount || ''}`
  if (text.includes('啤酒')) return 'beer'
  if (text.includes('红酒') || text.includes('葡萄酒')) return 'wine'
  if (text.includes('白酒')) return 'baijiu'
  if (text.includes('黄酒')) return 'yellow_wine'
  if (
    text.includes('洋酒') ||
    text.includes('鸡尾酒') ||
    text.includes('威士忌') ||
    text.includes('伏特加') ||
    text.includes('白兰地') ||
    text.includes('朗姆') ||
    text.includes('金酒') ||
    text.includes('龙舌兰')
  ) {
    return 'foreign_liquor'
  }
  return 'other'
}

function detectDrinkState(content) {
  const text = String(content || '')
  if (text.includes('微醺')) return 'tipsy'
  if (text.includes('小酌')) return 'light'
  if (text.includes('上头')) return 'high'
  if (text.includes('断片')) return 'blackout'
  return 'light'
}

function detectDrinkScene(content) {
  const text = String(content || '')
  if (text.includes('商务宴请')) return 'business'
  if (text.includes('朋友小聚')) return 'friends'
  if (text.includes('家庭聚会')) return 'family'
  if (text.includes('独自小酌')) return 'solo'
  if (text.includes('庆祝应酬')) return 'celebrate'
  return 'other_scene'
}

function detectFitnessType(content) {
  const text = String(content || '')
  if (text.includes('有氧')) return 'aerobic'
  if (text.includes('无氧')) return 'anaerobic'
  if (text.includes('拉伸')) return 'stretch'
  if (text.includes('球类')) return 'sports'
  return 'aerobic'
}

function detectFitnessDuration(amount) {
  const text = String(amount || '')
  if (text.includes('15')) return '15m'
  if (text.includes('30')) return '30m'
  if (text.includes('45')) return '45m'
  if (text.includes('60')) return '60m_plus'
  return '30m'
}

Page({
  data: {
    currentYear: 0,
    currentMonth: 0,
    todayDate: '',
    days: [],
    selectedDate: '',
    selectedLogs: [],
    showQuickPanel: false,
    drinkCategories: [
      { value: 'beer', label: '啤酒' },
      { value: 'wine', label: '红酒' },
      { value: 'baijiu', label: '白酒' },
      { value: 'yellow_wine', label: '黄酒' },
      { value: 'foreign_liquor', label: '洋酒' },
      { value: 'other', label: '其他' }
    ],
    drinkStates: [
      { value: 'tipsy', label: '微醺' },
      { value: 'light', label: '小酌' },
      { value: 'high', label: '上头' },
      { value: 'blackout', label: '断片' }
    ],
    drinkScenes: [
      { value: 'business', label: '商务宴请' },
      { value: 'friends', label: '朋友小聚' },
      { value: 'family', label: '家庭聚会' },
      { value: 'solo', label: '独自小酌' },
      { value: 'celebrate', label: '庆祝应酬' },
      { value: 'other_scene', label: '其他场景' }
    ],
    fitnessTypes: [
      { value: 'aerobic', label: '有氧' },
      { value: 'anaerobic', label: '无氧' },
      { value: 'stretch', label: '拉伸' },
      { value: 'sports', label: '球类' }
    ],
    fitnessDurations: [
      { value: '15m', label: '15分钟' },
      { value: '30m', label: '30分钟' },
      { value: '45m', label: '45分钟' },
      { value: '60m_plus', label: '60分钟以上' }
    ],
    quickForm: {
      type: 'drink',
      date: '',
      drinkCategory: 'beer',
      drinkScene: 'friends',
      drinkAmountNote: '',
      drinkState: 'light',
      fitnessType: 'aerobic',
      fitnessDuration: '30m',
      locationName: '',
      latitude: 0,
      longitude: 0
    },
    editingRecordId: ''
  },

  onShow() {
    this.initCalendar()
  },

  initCalendar() {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const todayDate = formatDate(today)
    const selectedDate = this.data.selectedDate || todayDate
    this.setData({ currentYear: year, currentMonth: month, selectedDate, todayDate })
    this.refresh()
  },

  changeMonth(delta) {
    const { currentYear, currentMonth, selectedDate } = this.data
    const selected = parseYmd(selectedDate)
    const keepDay = selected ? selected.day : 1

    const base = new Date(currentYear, currentMonth - 1 + delta, 1)
    const year = base.getFullYear()
    const month = base.getMonth() + 1
    const lastDay = new Date(year, month, 0).getDate()
    const day = Math.min(keepDay, lastDay)

    this.setData({
      currentYear: year,
      currentMonth: month,
      selectedDate: formatYmd(year, month, day)
    })
    this.refresh()
  },

  goPrevMonth() {
    this.changeMonth(-1)
  },

  goNextMonth() {
    this.changeMonth(1)
  },

  onNavigateDateChange(e) {
    const date = e.detail.value
    const parsed = parseYmd(date)
    if (!parsed) return
    this.setData({
      currentYear: parsed.year,
      currentMonth: parsed.month,
      selectedDate: date
    })
    this.refresh()
  },

  onNavigateMonthChange(e) {
    const ym = e.detail.value
    const parsed = parseYm(ym)
    if (!parsed) return

    const selected = parseYmd(this.data.selectedDate)
    const keepDay = selected ? selected.day : 1
    const lastDay = new Date(parsed.year, parsed.month, 0).getDate()
    const day = Math.min(keepDay, lastDay)

    this.setData({
      currentYear: parsed.year,
      currentMonth: parsed.month,
      selectedDate: formatYmd(parsed.year, parsed.month, day)
    })
    this.refresh()
  },

  refresh() {
    const records = getRecords()
    const grouped = groupByDate(records)
    const { currentYear, currentMonth, selectedDate, todayDate } = this.data
    const totalDays = new Date(currentYear, currentMonth, 0).getDate()
    const days = []
    const firstWeekday = new Date(currentYear, currentMonth - 1, 1).getDay()

    for (let i = 0; i < firstWeekday; i += 1) {
      days.push({
        key: `p_${currentYear}_${currentMonth}_${i}`,
        isPlaceholder: true
      })
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = `${currentYear}-${pad2(currentMonth)}-${pad2(day)}`
      const list = grouped[date] || []
      days.push({
        key: date,
        day,
        date,
        isPlaceholder: false,
        active: date === selectedDate,
        isToday: date === todayDate,
        hasDrink: list.some((item) => item.type === 'drink'),
        hasFitness: list.some((item) => item.type === 'fitness')
      })
    }

    this.setData({
      days,
      selectedLogs: grouped[selectedDate] || []
    })
  },

  pickDay(e) {
    const date = e.currentTarget.dataset.date
    this.setData({
      selectedDate: date
    })
    this.refresh()
  },

  openQuickPanel() {
    const date = this.data.selectedDate || this.data.todayDate
    this.setData({
      showQuickPanel: true,
      editingRecordId: '',
      quickForm: {
        type: 'drink',
        date,
        drinkCategory: this.data.drinkCategories[0].value,
        drinkScene: this.data.drinkScenes[1].value,
        drinkAmountNote: '',
        drinkState: this.data.drinkStates[1].value,
        fitnessType: this.data.fitnessTypes[0].value,
        fitnessDuration: this.data.fitnessDurations[1].value,
        locationName: '',
        latitude: 0,
        longitude: 0
      }
    })
  },

  closeQuickPanel() {
    this.setData({
      showQuickPanel: false,
      editingRecordId: ''
    })
  },

  onLogAction(e) {
    const recordId = e.currentTarget.dataset.id
    const record = (this.data.selectedLogs || []).find((item) => item.id === recordId)
    if (!record) return

    wx.showActionSheet({
      itemList: ['修改', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.startEditRecord(record)
        } else if (res.tapIndex === 1) {
          this.confirmDeleteRecord(record)
        }
      }
    })
  },

  startEditRecord(record) {
    const isDrink = record.type === 'drink'
    this.setData({
      showQuickPanel: true,
      editingRecordId: record.id,
      quickForm: {
        type: isDrink ? 'drink' : 'fitness',
        date: record.date || this.data.selectedDate || this.data.todayDate,
        drinkCategory: detectDrinkCategory(record.content, record.amount),
        drinkScene: detectDrinkScene(record.content),
        drinkAmountNote: isDrink ? (record.amount || '') : '',
        drinkState: detectDrinkState(record.content),
        fitnessType: detectFitnessType(record.content),
        fitnessDuration: detectFitnessDuration(record.amount),
        locationName: record.locationName || '',
        latitude: record.latitude || 0,
        longitude: record.longitude || 0
      }
    })
  },

  chooseQuickLocation() {
    const doChooseLocation = () => {
      wx.chooseLocation({
        success: (res) => {
          const detailName = [res.address, res.name].filter(Boolean).join(' ')
          const fallback = `${Number(res.latitude || 0).toFixed(6)}, ${Number(res.longitude || 0).toFixed(6)}`
          const name = detailName || fallback
          this.setData({
            'quickForm.locationName': name,
            'quickForm.latitude': res.latitude || 0,
            'quickForm.longitude': res.longitude || 0
          })
        },
        fail: (err) => {
          const msg = (err && err.errMsg) || ''
          if (msg.includes('cancel')) {
            wx.showToast({
              title: '你取消了选点',
              icon: 'none'
            })
            return
          }
          wx.showToast({
            title: msg || '选择位置失败',
            icon: 'none'
          })
        }
      })
    }

    wx.getSetting({
      success: (res) => {
        const auth = res.authSetting || {}
        if (auth['scope.userLocation']) {
          doChooseLocation()
          return
        }

        wx.authorize({
          scope: 'scope.userLocation',
          success: () => {
            doChooseLocation()
          },
          fail: () => {
            wx.showModal({
              title: '需要定位权限',
              content: '请在设置中开启定位权限后再选择位置',
              confirmText: '去设置',
              success: (modalRes) => {
                if (!modalRes.confirm) return
                wx.openSetting({})
              }
            })
          }
        })
      },
      fail: () => {
        doChooseLocation()
      }
    })
  },

  clearQuickLocation() {
    this.setData({
      'quickForm.locationName': '',
      'quickForm.latitude': 0,
      'quickForm.longitude': 0
    })
  },

  confirmDeleteRecord(record) {
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条记录吗？',
      success: (res) => {
        if (!res.confirm) return
        const ok = deleteRecordById(record.id)
        if (!ok) {
          wx.showToast({
            title: '删除失败',
            icon: 'none'
          })
          return
        }
        wx.showToast({
          title: '已删除',
          icon: 'success'
        })
        this.refresh()
      }
    })
  },

  setQuickType(e) {
    const nextType = e.currentTarget.dataset.value
    this.setData({ 'quickForm.type': nextType })
  },

  selectDrinkCategory(e) {
    this.setData({ 'quickForm.drinkCategory': e.currentTarget.dataset.value })
  },

  selectDrinkScene(e) {
    this.setData({ 'quickForm.drinkScene': e.currentTarget.dataset.value })
  },

  onDrinkAmountNoteInput(e) {
    this.setData({ 'quickForm.drinkAmountNote': e.detail.value })
  },

  selectDrinkState(e) {
    this.setData({ 'quickForm.drinkState': e.currentTarget.dataset.value })
  },

  selectFitnessType(e) {
    this.setData({ 'quickForm.fitnessType': e.currentTarget.dataset.value })
  },

  selectFitnessDuration(e) {
    this.setData({ 'quickForm.fitnessDuration': e.currentTarget.dataset.value })
  },

  getLabel(list, value) {
    const found = (list || []).find((item) => item.value === value)
    return found ? found.label : ''
  },

  submitQuickRecord() {
    const { quickForm } = this.data
    if (!quickForm.date || (quickForm.type !== 'drink' && quickForm.type !== 'fitness')) {
      wx.showToast({
        title: '记录信息不完整',
        icon: 'none'
      })
      return
    }
    let payload = null
    if (quickForm.type === 'drink') {
      if (!quickForm.drinkCategory || !quickForm.drinkScene || !quickForm.drinkState) {
        wx.showToast({
          title: '请选择种类、场景和状态',
          icon: 'none'
        })
        return
      }
      const drinkCategoryLabel = this.getLabel(this.data.drinkCategories, quickForm.drinkCategory)
      const drinkSceneLabel = this.getLabel(this.data.drinkScenes, quickForm.drinkScene)
      const drinkStateLabel = this.getLabel(this.data.drinkStates, quickForm.drinkState)
      payload = {
        type: 'drink',
        date: quickForm.date,
        amount: (quickForm.drinkAmountNote || '').trim(),
        content: `${drinkCategoryLabel} · ${drinkSceneLabel} · ${drinkStateLabel}`,
        locationName: quickForm.locationName || '',
        latitude: quickForm.latitude || 0,
        longitude: quickForm.longitude || 0
      }
    } else {
      if (!quickForm.fitnessType || !quickForm.fitnessDuration) {
        wx.showToast({
          title: '请选择运动种类和时长',
          icon: 'none'
        })
        return
      }
      const fitnessTypeLabel = this.getLabel(this.data.fitnessTypes, quickForm.fitnessType)
      const fitnessDurationLabel = this.getLabel(this.data.fitnessDurations, quickForm.fitnessDuration)
      payload = {
        type: 'fitness',
        date: quickForm.date,
        amount: fitnessDurationLabel,
        content: fitnessTypeLabel,
        locationName: quickForm.locationName || '',
        latitude: quickForm.latitude || 0,
        longitude: quickForm.longitude || 0
      }
    }

    if (this.data.editingRecordId) {
      updateRecordById(this.data.editingRecordId, payload)
    } else {
      addRecord(payload)
    }
    wx.showToast({
      title: this.data.editingRecordId ? '修改成功' : '记录成功',
      icon: 'success'
    })

    this.setData({
      showQuickPanel: false,
      editingRecordId: '',
      quickForm: {
        ...quickForm,
        drinkAmountNote: '',
        locationName: '',
        latitude: 0,
        longitude: 0
      }
    })
    this.refresh()
  }
})
