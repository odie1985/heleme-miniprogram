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

function safeDecode(text) {
  try {
    return decodeURIComponent(String(text || ''))
  } catch (e) {
    return String(text || '')
  }
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

const SHARE_CLOUD_DIR = 'share-posters'
const LOCAL_SHARE_PREFIX = 'heleme_timeline_share_'

function getFileExt(path) {
  const text = String(path || '')
  const match = text.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  return match ? match[1].toLowerCase() : 'png'
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
      images: [],
      locationName: '',
      latitude: 0,
      longitude: 0
    },
    editingRecordId: '',
    timelineShareDraft: null,
    timelineShareId: '',
    sharePosterCloudFileId: '',
    sharePosterImageUrl: '',
    shareCoverImageUrl: '',
    sharedRecord: null,
    sharedPosterUrl: ''
  },

  onLoad(options) {
    const parsed = parseYmd(options && options.date)
    const nextData = {}
    if (parsed) {
      nextData.currentYear = parsed.year
      nextData.currentMonth = parsed.month
      nextData.selectedDate = formatYmd(parsed.year, parsed.month, parsed.day)
    }
    if (options && options.sr === '1') {
      nextData.sharedRecord = {
        date: safeDecode(options.sd || options.date),
        typeLabel: safeDecode(options.st),
        content: safeDecode(options.sc),
        amount: safeDecode(options.sa),
        locationName: safeDecode(options.sl),
        imageCount: Number(options.si || 0) || 0,
        shareId: safeDecode(options.sid),
        firstImage: '',
        posterUrl: safeDecode(options.spu),
        cloudFileId: safeDecode(options.cf)
      }
    }
    if (Object.keys(nextData).length) {
      this.setData(nextData)
    }
  },

  onShow() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    if (this.data.sharedRecord) {
      this.renderSharedPoster()
      return
    }
    this.initCalendar()
  },

  buildTimelineShareQuery(shareInfo) {
    const params = [
      ['sr', '1'],
      ['date', shareInfo.date || ''],
      ['sd', shareInfo.date || ''],
      ['st', shareInfo.typeLabel || '记录'],
      ['sc', shareInfo.detail || shareInfo.title || ''],
      ['sa', shareInfo.amountText || ''],
      ['sl', shareInfo.locationName || ''],
      ['si', String(shareInfo.imageCount || 0)],
      ['sid', this.data.timelineShareId || ''],
      ['spu', this.data.sharePosterImageUrl || ''],
      ['cf', this.data.sharePosterCloudFileId || '']
    ]
    return params
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v || ''))}`)
      .join('&')
  },

  initCalendar() {
    const today = new Date()
    const todayDate = formatDate(today)
    const selectedDate = this.data.selectedDate || todayDate
    const selected = parseYmd(selectedDate)
    const year = selected ? selected.year : today.getFullYear()
    const month = selected ? selected.month : today.getMonth() + 1
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
        images: [],
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
        images: Array.isArray(record.images) ? record.images : [],
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
          const name = (res.name || res.address || '').trim()
          if (!name) {
            wx.showToast({
              title: '未获取到地点名',
              icon: 'none'
            })
            return
          }
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

  persistChosenImages(paths, done) {
    const input = Array.isArray(paths) ? paths.filter(Boolean) : []
    if (!input.length) {
      done([])
      return
    }

    const results = new Array(input.length)
    let finished = 0

    input.forEach((path, index) => {
      wx.saveFile({
        tempFilePath: path,
        success: (res) => {
          results[index] = res.savedFilePath || path
        },
        fail: () => {
          results[index] = path
        },
        complete: () => {
          finished += 1
          if (finished < input.length) return
          done(results.filter(Boolean))
        }
      })
    })
  },

  chooseQuickImages() {
    const current = this.data.quickForm.images || []
    const remain = Math.max(0, 9 - current.length)
    if (!remain) {
      wx.showToast({ title: '最多9张图片', icon: 'none' })
      return
    }
    wx.chooseImage({
      sourceType: ['album', 'camera'],
      count: remain,
      success: (res) => {
        const files = res.tempFilePaths || []
        const next = [...current, ...files].slice(0, 9)
        this.setData({ 'quickForm.images': next })
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || ''
        if (msg.includes('cancel')) return
        wx.showToast({ title: '添加图片失败', icon: 'none' })
      }
    })
  },

  removeQuickImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const list = this.data.quickForm.images || []
    if (Number.isNaN(index) || index < 0 || index >= list.length) return
    const next = list.filter((_, i) => i !== index)
    this.setData({ 'quickForm.images': next })
  },

  previewQuickImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const urls = this.data.quickForm.images || []
    if (!urls.length) return
    const current = urls[index] || urls[0]
    wx.previewImage({ current, urls })
  },

  onLogImageTap(e) {
    const recordId = e.currentTarget.dataset.id
    const index = Number(e.currentTarget.dataset.index)
    const record = (this.data.selectedLogs || []).find((item) => item.id === recordId)
    const urls = (record && record.images) || []
    if (!urls.length) return
    const current = urls[index] || urls[0]
    wx.previewImage({ current, urls })
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

  getShareInfoForQuickForm() {
    const { quickForm } = this.data
    const date = quickForm.date || this.data.selectedDate || this.data.todayDate
    if (quickForm.type === 'drink') {
      const drinkCategoryLabel = this.getLabel(this.data.drinkCategories, quickForm.drinkCategory)
      const drinkSceneLabel = this.getLabel(this.data.drinkScenes, quickForm.drinkScene)
      const drinkStateLabel = this.getLabel(this.data.drinkStates, quickForm.drinkState)
      const amountText = (quickForm.drinkAmountNote || '').trim()
      const brief = [drinkCategoryLabel, drinkSceneLabel, drinkStateLabel].filter(Boolean).join('·')
      return {
        date,
        title: `${date} 喝了么打卡：${brief || '喝酒记录'}${amountText ? `（${amountText}）` : ''}`,
        typeLabel: '喝酒记录',
        detail: brief || '喝酒记录',
        amountText,
        locationName: quickForm.locationName || '',
        imageCount: (quickForm.images || []).length,
        firstImage: (quickForm.images || [])[0] || ''
      }
    }

    const fitnessTypeLabel = this.getLabel(this.data.fitnessTypes, quickForm.fitnessType)
    const fitnessDurationLabel = this.getLabel(this.data.fitnessDurations, quickForm.fitnessDuration)
    const brief = [fitnessTypeLabel, fitnessDurationLabel].filter(Boolean).join('·')
    return {
      date,
      title: `${date} 喝了么打卡：${brief || '健身记录'}`,
      typeLabel: '健身记录',
      detail: brief || '健身记录',
      amountText: fitnessDurationLabel || '',
      locationName: quickForm.locationName || '',
      imageCount: (quickForm.images || []).length,
      firstImage: (quickForm.images || [])[0] || ''
    }
  },

  getShareInfoForSelectedDate() {
    const date = this.data.selectedDate || this.data.todayDate
    const logs = this.data.selectedLogs || []
    const drinkCount = logs.filter((item) => item.type === 'drink').length
    const fitnessCount = logs.filter((item) => item.type === 'fitness').length
    return {
      date,
      title: `${date} 打卡：喝酒${drinkCount}次，健身${fitnessCount}次`
    }
  },

  paintPoster(ctx, shareInfo, extra) {
    const locationName = (extra && extra.locationName) || ''
    const firstImage = (extra && extra.firstImage) || ''
    const width = 600
    const height = 960

    ctx.setFillStyle('#f3f4f6')
    ctx.fillRect(0, 0, width, height)

    ctx.setFillStyle('#111827')
    ctx.fillRect(32, 32, width - 64, height - 64)

    ctx.setFillStyle('#ffffff')
    ctx.fillRect(48, 48, width - 96, height - 96)

    ctx.setFillStyle('#2563eb')
    ctx.fillRect(48, 48, width - 96, 190)

    ctx.setFillStyle('#ffffff')
    ctx.setFontSize(40)
    ctx.fillText('喝了么', 76, 118)
    ctx.setFontSize(26)
    ctx.fillText('今日打卡分享', 76, 164)

    ctx.setFillStyle('#111827')
    ctx.setFontSize(30)
    ctx.fillText(shareInfo.typeLabel || '记录', 76, 296)
    ctx.setFontSize(24)
    ctx.setFillStyle('#374151')
    ctx.fillText(shareInfo.date || '', 76, 336)

    ctx.setFillStyle('#1f2937')
    ctx.setFontSize(28)
    const detailText = shareInfo.detail || shareInfo.title || '记录一下今天'
    ctx.fillText(detailText.slice(0, 18), 76, 392)
    if (detailText.length > 18) {
      ctx.fillText(detailText.slice(18, 36), 76, 432)
    }

    if (locationName) {
      ctx.setFillStyle('#6b7280')
      ctx.setFontSize(22)
      ctx.fillText(`地点：${locationName}`.slice(0, 24), 76, 486)
    }

    const drawImageBlock = (useImage) => {
      if (useImage) {
        ctx.drawImage(firstImage, 76, 526, width - 152, 286)
        return
      }
      ctx.setFillStyle('#e5e7eb')
      ctx.fillRect(76, 526, width - 152, 286)
      ctx.setFillStyle('#9ca3af')
      ctx.setFontSize(24)
      ctx.fillText('今天也要保持节奏', 190, 680)
    }
    drawImageBlock(Boolean(firstImage))

    ctx.setFillStyle('#6b7280')
    ctx.setFontSize(20)
    ctx.fillText('来自小程序「喝了么」', 76, 862)
  },

  drawPoster(shareInfo, extra, done) {
    const locationName = (extra && extra.locationName) || ''
    const firstImage = (extra && extra.firstImage) || ''
    const canvasId = 'sharePosterCanvas'
    const width = 600
    const height = 960
    const ctx = wx.createCanvasContext(canvasId, this)
    this.paintPoster(ctx, shareInfo, extra)

    const exportCanvas = (retry) => {
      ctx.draw(false, () => {
        wx.canvasToTempFilePath(
          {
            canvasId,
            x: 0,
            y: 0,
            width,
            height,
            destWidth: width,
            destHeight: height,
            success: (res) => {
              done(res.tempFilePath || '')
            },
            fail: () => {
              if (!retry || !firstImage) {
                done('')
                return
              }
              this.drawPoster(shareInfo, { ...extra, firstImage: '' }, done)
            }
          },
          this
        )
      })
    }
    exportCanvas(true)
  },

  paintCover(ctx, shareInfo, extra) {
    const firstImage = (extra && extra.firstImage) || ''
    const width = 600
    const height = 600

    ctx.setFillStyle('#0f172a')
    ctx.fillRect(0, 0, width, height)

    if (firstImage) {
      ctx.drawImage(firstImage, 0, 0, width, height)
      const overlay = ctx.createLinearGradient(0, 0, 0, height)
      overlay.addColorStop(0, 'rgba(15, 23, 42, 0.12)')
      overlay.addColorStop(1, 'rgba(15, 23, 42, 0.78)')
      ctx.setFillStyle(overlay)
      ctx.fillRect(0, 0, width, height)
    } else {
      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#1d4ed8')
      bg.addColorStop(1, '#0f172a')
      ctx.setFillStyle(bg)
      ctx.fillRect(0, 0, width, height)
    }

    ctx.setFillStyle('#ffffff')
    ctx.setFontSize(28)
    ctx.fillText('喝了么', 42, 64)

    ctx.setFontSize(42)
    ctx.fillText((shareInfo.typeLabel || '记录').slice(0, 6), 42, 452)

    ctx.setFontSize(24)
    ctx.fillText((shareInfo.date || '').slice(0, 16), 42, 494)

    ctx.setFontSize(28)
    const line1 = (shareInfo.detail || shareInfo.title || '记录一下今天').slice(0, 12)
    const line2 = (shareInfo.detail || shareInfo.title || '记录一下今天').slice(12, 24)
    ctx.fillText(line1, 42, 540)
    if (line2) {
      ctx.fillText(line2, 42, 578)
    }
  },

  drawCover(shareInfo, extra, done) {
    const canvasId = 'shareCoverCanvas'
    const width = 600
    const height = 600
    const ctx = wx.createCanvasContext(canvasId, this)
    this.paintCover(ctx, shareInfo, extra)
    ctx.draw(false, () => {
      wx.canvasToTempFilePath(
        {
          canvasId,
          x: 0,
          y: 0,
          width,
          height,
          destWidth: width,
          destHeight: height,
          success: (res) => {
            done(res.tempFilePath || '')
          },
          fail: () => {
            done('')
          }
        },
        this
      )
    })
  },

  getCloudTempUrl(fileId, done) {
    if (!fileId || !wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
      done('')
      return
    }
    wx.cloud.getTempFileURL({
      fileList: [fileId],
      success: (res) => {
        const item = (res.fileList || [])[0] || {}
        done(item.tempFileURL || '')
      },
      fail: () => done('')
    })
  },

  saveLocalShareBundle(bundle) {
    const shareId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    try {
      wx.setStorageSync(`${LOCAL_SHARE_PREFIX}${shareId}`, bundle)
    } catch (e) {}
    return shareId
  },

  getLocalShareBundle(shareId) {
    if (!shareId) return null
    try {
      return wx.getStorageSync(`${LOCAL_SHARE_PREFIX}${shareId}`) || null
    } catch (e) {
      return null
    }
  },

  ensureLocalShareFile(filePath, done) {
    if (!filePath) {
      done('')
      return
    }
    if (String(filePath).startsWith('wxfile://')) {
      done(filePath)
      return
    }
    wx.saveFile({
      tempFilePath: filePath,
      success: (res) => {
        done(res.savedFilePath || filePath)
      },
      fail: () => {
        done(filePath)
      }
    })
  },

  uploadShareAsset(filePath, done) {
    if (!filePath || !wx.cloud || typeof wx.cloud.uploadFile !== 'function') {
      done({ fileID: '', tempUrl: '', error: '云能力不可用' })
      return
    }

    const ext = getFileExt(filePath)
    const cloudPath = `${SHARE_CLOUD_DIR}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (uploadRes) => {
        const fileID = uploadRes.fileID || ''
        if (!fileID) {
          done({ fileID: '', tempUrl: '', error: '未返回 fileID' })
          return
        }
        this.getCloudTempUrl(fileID, (tempUrl) => {
          done({ fileID, tempUrl, error: tempUrl ? '' : '未获取到临时链接' })
        })
      },
      fail: (err) => {
        done({
          fileID: '',
          tempUrl: '',
          error: (err && err.errMsg) || 'uploadFile fail'
        })
      }
    })
  },

  drawQuickPoster(shareInfo, done) {
    const { quickForm } = this.data
    this.drawPoster(
      shareInfo,
      {
        locationName: quickForm.locationName || '',
        firstImage: (quickForm.images || [])[0] || ''
      },
      done
    )
  },

  renderSharedPoster() {
    const shared = this.data.sharedRecord
    if (!shared) return
    const localBundle = this.getLocalShareBundle(shared.shareId)
    if (localBundle) {
      const localPosterUrl =
        shared.imageCount > 0
          ? (localBundle.coverUrl || localBundle.posterUrl || '')
          : (localBundle.posterUrl || localBundle.coverUrl || '')
      if (localPosterUrl) {
        this.setData({ sharedPosterUrl: localPosterUrl })
        return
      }
    }
    if (shared.posterUrl) {
      this.setData({ sharedPosterUrl: shared.posterUrl })
      return
    }
    if (shared.cloudFileId) {
      this.getCloudTempUrl(shared.cloudFileId, (tempUrl) => {
        this.setData({ sharedPosterUrl: tempUrl || shared.posterUrl || '' })
      })
      return
    }
    this.setData({ sharedPosterUrl: shared.posterUrl || '' })
  },

  onEnterAppFromShare() {
    wx.switchTab({
      url: '/pages/profile/index'
    })
  },

  shareQuickToTimeline() {
    const shareInfo = this.getShareInfoForQuickForm()
    const extra = {
      locationName: this.data.quickForm.locationName || '',
      firstImage: (this.data.quickForm.images || [])[0] || ''
    }
    const persistAndOpenMenu = (coverUrl, posterCloud) => {
      const posterSource = (posterCloud && posterCloud.tempUrl) || coverUrl || ''
      this.ensureLocalShareFile(coverUrl, (localCoverUrl) => {
        this.ensureLocalShareFile(posterSource, (localPosterUrl) => {
          const shareId = this.saveLocalShareBundle({
            coverUrl: localCoverUrl || coverUrl || '',
            posterUrl: localPosterUrl || posterSource || '',
            info: shareInfo
          })
          this.setData({
            timelineShareDraft: shareInfo,
            timelineShareId: shareId,
            shareCoverImageUrl: localCoverUrl || coverUrl || '',
            sharePosterCloudFileId: (posterCloud && posterCloud.fileID) || '',
            sharePosterImageUrl: localPosterUrl || posterSource || ''
          })
          wx.showShareMenu({
            withShareTicket: true,
            menus: ['shareTimeline']
          })
          wx.showModal({
            title: '分享到朋友圈',
            content: '请点击右上角“···”选择“分享到朋友圈”',
            showCancel: false
          })
        })
      })
    }

    if (extra.firstImage) {
      persistAndOpenMenu(extra.firstImage, null)
      return
    }

    wx.showLoading({ title: '生成分享图...' })
    this.drawQuickPoster(shareInfo, (posterImageUrl) => {
      if (!posterImageUrl) {
        this.drawCover(shareInfo, extra, (fallbackCover) => {
          wx.hideLoading()
          if (!fallbackCover) {
            wx.showToast({
              title: '分享图生成失败，请重试',
              icon: 'none'
            })
            return
          }
          persistAndOpenMenu(fallbackCover, {
            fileID: '',
            tempUrl: posterImageUrl || fallbackCover
          })
        })
        return
      }
      this.drawCover(shareInfo, extra, (coverImageUrl) => {
        if (!coverImageUrl) {
          wx.hideLoading()
          wx.showToast({
            title: '朋友圈卡片图生成失败',
            icon: 'none'
          })
          return
        }
        wx.hideLoading()
        persistAndOpenMenu(coverImageUrl, {
          fileID: '',
          tempUrl: posterImageUrl
        })
      })
    })
  },

  onShareAppMessage(options) {
    const source = options && options.target && options.target.dataset && options.target.dataset.shareSource
    const shareInfo =
      source === 'quick' ? this.getShareInfoForQuickForm() : this.getShareInfoForSelectedDate()
    return {
      title: shareInfo.title,
      path: `/pages/calendar/index?date=${encodeURIComponent(shareInfo.date)}`
    }
  },

  onShareTimeline() {
    const shareInfo = this.data.timelineShareDraft || this.getShareInfoForSelectedDate()
    const imageUrl = this.data.shareCoverImageUrl || ''
    return {
      title: shareInfo.title,
      query: this.buildTimelineShareQuery(shareInfo),
      imageUrl
    }
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
    this.persistChosenImages(quickForm.images || [], (finalImages) => {
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
          images: finalImages || [],
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
          images: finalImages || [],
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
          images: [],
          locationName: '',
          latitude: 0,
          longitude: 0
        }
      })
      this.refresh()
    })
  }
})
