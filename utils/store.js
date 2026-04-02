const RECORD_KEY = 'hlm_records_v1'
const USER_KEY = 'hlm_user_v1'
const FRIEND_KEY = 'hlm_friends_v1'
const FRIEND_SHARE_KEY = 'hlm_friend_shares_v1'
const FEED_INTERACTION_KEY = 'hlm_feed_interactions_v1'

function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function isCoordinateText(text) {
  const v = String(text || '').trim()
  if (!v) return false
  return /^-?\d+(\.\d+)?\s*[,，]\s*-?\d+(\.\d+)?$/.test(v)
}

function sanitizeLocationName(name) {
  const v = String(name || '').trim()
  if (!v) return ''
  if (isCoordinateText(v)) return ''
  return v
}

function sanitizeImages(images) {
  if (!Array.isArray(images)) return []
  return images.filter((item) => typeof item === 'string' && item.trim())
}

function getRecords() {
  const records = wx.getStorageSync(RECORD_KEY) || []
  let changed = false
  const normalized = records.map((item) => {
    const nextName = sanitizeLocationName(item.locationName)
    const nextImages = sanitizeImages(item.images)
    const oldImages = Array.isArray(item.images) ? item.images : []
    if (
      nextName !== (item.locationName || '') ||
      JSON.stringify(nextImages) !== JSON.stringify(oldImages)
    ) {
      changed = true
      return {
        ...item,
        locationName: nextName,
        images: nextImages
      }
    }
    return item
  })
  if (changed) {
    saveRecords(normalized)
  }
  return normalized
}

function saveRecords(records) {
  wx.setStorageSync(RECORD_KEY, records)
}

function ensureUser() {
  const cached = wx.getStorageSync(USER_KEY)
  if (cached && cached.id) {
    const normalized = {
      phoneBound: false,
      phoneMasked: '',
      phoneAuthCode: '',
      ...cached
    }
    wx.setStorageSync(USER_KEY, normalized)
    return normalized
  }

  const id = genId('u')
  const user = {
    id,
    friendCode: id.slice(-6).toUpperCase(),
    nickname: '喝了么用户',
    motto: '记录即改变，今天也保持节奏。',
    avatarUrl: '',
    phoneBound: false,
    phoneMasked: '',
    phoneAuthCode: '',
    isLoggedIn: false,
    lastLoginAt: 0
  }
  wx.setStorageSync(USER_KEY, user)
  return user
}

function getCurrentUser() {
  return ensureUser()
}

function updateCurrentUser(patch) {
  const user = ensureUser()
  const next = {
    ...user,
    ...patch
  }
  wx.setStorageSync(USER_KEY, next)

  const records = getRecords()
  let changed = false
  const syncedRecords = records.map((item) => {
    if (item.source !== 'self' || item.ownerId !== next.id) return item
    const nextItem = {
      ...item,
      nickname: next.nickname,
      avatarUrl: next.avatarUrl || ''
    }
    if (nextItem.nickname !== item.nickname || nextItem.avatarUrl !== item.avatarUrl) {
      changed = true
      return nextItem
    }
    return item
  })

  if (changed) {
    saveRecords(syncedRecords)
  }
  return next
}

function markLoggedIn(payload = {}) {
  return updateCurrentUser({
    isLoggedIn: true,
    lastLoginAt: Date.now(),
    loginCode: payload.code || ''
  })
}

function getFriends() {
  return wx.getStorageSync(FRIEND_KEY) || []
}

function saveFriends(list) {
  wx.setStorageSync(FRIEND_KEY, list)
}

function addFriend(payload) {
  const friends = getFriends()
  const me = ensureUser()
  const code = String(payload.code || '').trim().toUpperCase()
  const nickname = String(payload.nickname || '').trim() || `好友${code.slice(-3) || ''}`

  if (!code) {
    return { ok: false, message: '好友码不能为空' }
  }

  if (code === me.friendCode) {
    return { ok: false, message: '不能添加自己' }
  }

  if (friends.some((item) => item.code === code)) {
    return { ok: false, message: '该好友已存在' }
  }

  const next = {
    id: genId('f'),
    code,
    nickname,
    addedAt: Date.now()
  }

  friends.unshift(next)
  saveFriends(friends)
  return { ok: true, data: next }
}

function getFriendShares() {
  return wx.getStorageSync(FRIEND_SHARE_KEY) || []
}

function saveFriendShares(list) {
  wx.setStorageSync(FRIEND_SHARE_KEY, list)
}

function getFeedInteractionMap() {
  return wx.getStorageSync(FEED_INTERACTION_KEY) || {}
}

function saveFeedInteractionMap(map) {
  wx.setStorageSync(FEED_INTERACTION_KEY, map)
}

function getFeedInteraction(itemId) {
  const map = getFeedInteractionMap()
  return map[itemId] || { liked: false, likeCount: 0, comments: [] }
}

function toggleFeedLike(itemId) {
  const map = getFeedInteractionMap()
  const current = map[itemId] || { liked: false, likeCount: 0, comments: [] }
  const liked = !current.liked
  const likeCount = Math.max(0, (current.likeCount || 0) + (liked ? 1 : -1))
  map[itemId] = {
    ...current,
    liked,
    likeCount
  }
  saveFeedInteractionMap(map)
  return map[itemId]
}

function addFeedComment(itemId, payload) {
  const map = getFeedInteractionMap()
  const current = map[itemId] || { liked: false, likeCount: 0, comments: [] }
  const comments = Array.isArray(current.comments) ? current.comments.slice() : []
  comments.push({
    id: genId('c'),
    nickname: payload.nickname || '喝了么用户',
    text: payload.text || '',
    createdAt: Date.now()
  })
  map[itemId] = {
    ...current,
    comments
  }
  saveFeedInteractionMap(map)
  return map[itemId]
}

function addFriendShare(payload) {
  const list = getFriendShares()
  const share = {
    id: genId('fs'),
    source: 'friend',
    friendCode: payload.friendCode,
    nickname: payload.nickname || '好友',
    avatarUrl: payload.avatarUrl || '',
    type: payload.type,
    date: payload.date || today(),
    content: payload.content || '',
    amount: payload.amount || '',
    locationName: sanitizeLocationName(payload.locationName),
    images: sanitizeImages(payload.images),
    createdAt: Date.now()
  }
  list.unshift(share)
  saveFriendShares(list)
  return share
}

function addRecord(payload) {
  const user = ensureUser()
  const records = getRecords()
  const record = {
    id: genId('r'),
    source: 'self',
    ownerId: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl || '',
    type: payload.type,
    date: payload.date,
    content: payload.content || '',
    amount: payload.amount || '',
    locationName: sanitizeLocationName(payload.locationName),
    images: sanitizeImages(payload.images),
    latitude: payload.latitude || 0,
    longitude: payload.longitude || 0,
    createdAt: Date.now()
  }
  records.unshift(record)
  saveRecords(records)
  return record
}

function updateRecordById(id, patch) {
  const records = getRecords()
  const index = records.findIndex((item) => item.id === id)
  if (index < 0) return null

  const next = {
    ...records[index],
    ...patch,
    locationName: sanitizeLocationName(
      patch && Object.prototype.hasOwnProperty.call(patch, 'locationName')
        ? patch.locationName
        : records[index].locationName
    ),
    images: sanitizeImages(
      patch && Object.prototype.hasOwnProperty.call(patch, 'images')
        ? patch.images
        : records[index].images
    ),
    updatedAt: Date.now()
  }
  records[index] = next
  saveRecords(records)
  return next
}

function deleteRecordById(id) {
  const records = getRecords()
  const next = records.filter((item) => item.id !== id)
  if (next.length === records.length) return false
  saveRecords(next)
  return true
}

function groupByDate(records) {
  return records.reduce((acc, item) => {
    const list = acc[item.date] || []
    list.push(item)
    acc[item.date] = list
    return acc
  }, {})
}

function getFeedItems(scopeFilter = 'all', typeFilter = 'all') {
  const currentUser = ensureUser()
  const interactionMap = getFeedInteractionMap()
  const myRecords = getRecords().map((item) => ({
    ...item,
    source: 'self',
    nickname: item.source === 'self' ? currentUser.nickname : item.nickname,
    avatarUrl: item.source === 'self' ? (currentUser.avatarUrl || '') : (item.avatarUrl || '')
  }))

  const friendCodes = getFriends().map((f) => f.code)
  const friendShares = getFriendShares()
    .filter((item) => friendCodes.includes(item.friendCode))
    .map((item) => ({
      ...item,
      source: 'friend'
    }))

  let merged = []
  if (scopeFilter === 'self') {
    merged = myRecords
  } else if (scopeFilter === 'friends') {
    merged = friendShares
  } else {
    merged = [...myRecords, ...friendShares]
  }

  if (typeFilter !== 'all') {
    merged = merged.filter((item) => item.type === typeFilter)
  }

  merged.sort((a, b) => b.createdAt - a.createdAt)
  return merged.map((item) => ({
    ...item,
    interaction: interactionMap[item.id] || { liked: false, likeCount: 0, comments: [] }
  }))
}

function buildFriendQrPayload(user) {
  const safeName = encodeURIComponent(user.nickname || '喝了么用户')
  return `hlm://add-friend?code=${user.friendCode}&nickname=${safeName}`
}

function parseFriendQrPayload(raw) {
  const text = String(raw || '').trim()
  if (!text) return null

  const codeFromPlain = text.toUpperCase().match(/^[A-Z0-9]{6,12}$/)
  if (codeFromPlain) {
    return { code: codeFromPlain[0], nickname: '' }
  }

  const match = text.match(/code=([A-Za-z0-9]{6,12})/)
  if (!match) return null

  const nicknameMatch = text.match(/nickname=([^&]+)/)
  const nickname = nicknameMatch ? decodeURIComponent(nicknameMatch[1]) : ''
  return {
    code: match[1].toUpperCase(),
    nickname
  }
}

module.exports = {
  getRecords,
  saveRecords,
  addRecord,
  updateRecordById,
  deleteRecordById,
  groupByDate,
  getCurrentUser,
  updateCurrentUser,
  markLoggedIn,
  getFriends,
  addFriend,
  addFriendShare,
  getFeedItems,
  getFeedInteraction,
  toggleFeedLike,
  addFeedComment,
  buildFriendQrPayload,
  parseFriendQrPayload,
  today
}
