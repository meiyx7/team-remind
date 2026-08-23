// utils/api.js Supabase REST 客户端（wx.request 实现，不依赖 supabase-js）
// 覆盖三类调用：PostgREST 数据表 / GoTrue 认证 / Edge Functions
const config = require('./config')

const SESSION_KEY = 'supabase_session'

function getToken() {
  try {
    const s = wx.getStorageSync(SESSION_KEY)
    return s && s.access_token ? s.access_token : ''
  } catch {
    return ''
  }
}

function getSessionRaw() {
  try {
    const s = wx.getStorageSync(SESSION_KEY)
    return s && s.refresh_token ? s : null
  } catch {
    return null
  }
}

// 会话刷新（单飞行去重）：401 时由 withAuthRetry 调用
let refreshing = null
function refreshSession() {
  if (refreshing) return refreshing
  refreshing = new Promise((resolve, reject) => {
    const s = getSessionRaw()
    if (!s) {
      reject(new Error('no session'))
      return
    }
    wx.request({
      url: `${config.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      method: 'POST',
      header: { apikey: config.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      data: { refresh_token: s.refresh_token },
      timeout: 15000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.access_token) {
          setSession(res.data)
          resolve(res.data.access_token)
        } else {
          reject(new Error('refresh failed: HTTP ' + res.statusCode))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  }).finally(() => { refreshing = null })
  return refreshing
}

// 高阶包装：遇 401 刷新会话后重试一次；刷新失败清会话并抛出
function withAuthRetry(fn) {
  return async function (...args) {
    try {
      return await fn.apply(this, args)
    } catch (e) {
      const msg = (e && e.message) || ''
      if (/HTTP 401/.test(msg) && getSessionRaw()) {
        try {
          await refreshSession()
        } catch {
          setSession(null)
          throw e
        }
        return fn.apply(this, args)
      }
      throw e
    }
  }
}

// 登录成功后持久化会话（access_token / refresh_token / user）
function setSession(session) {
  try {
    wx.setStorageSync(SESSION_KEY, session || '')
  } catch (e) {
    console.error('[api] 会话保存失败', e)
  }
}

function baseHeaders() {
  const h = {
    apikey: config.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  }
  const token = getToken()
  if (token) h.Authorization = 'Bearer ' + token
  return h
}

function request(url, options) {
  const { method = 'GET', header = {}, data, timeout = 15000 } = options || {}
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      header,
      data,
      timeout,
      enableHttp2: true,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const msg = (res.data && (res.data.message || res.data.msg || res.data.error_description)) ||
            ('HTTP ' + res.statusCode)
          reject(new Error(msg))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

/* ============ PostgREST 数据表（均带 401 自动刷新重试） ============ */

// 查询：rest.select('todos', 'id,title', 'updated_at=gt.2026-01-01&order=updated_at.asc')
const select = withAuthRetry(function select(table, columns = '*', query = '') {
  let url = `${config.SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(columns)}`
  if (query) url += '&' + query
  return request(url, { header: baseHeaders() })
})

// 批量 upsert（按主键 id 合并）
const upsert = withAuthRetry(function upsert(table, rows) {
  return request(`${config.SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
    method: 'POST',
    header: {
      ...baseHeaders(),
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    data: rows
  })
})

// 按主键更新
const patch = withAuthRetry(function patch(table, id, fields) {
  return request(`${config.SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    header: { ...baseHeaders(), Prefer: 'return=minimal' },
    data: fields
  })
})

/* ============ GoTrue 认证 ============ */

// 小程序登录换取会话：wx.login code -> 云函数换 openid -> magiclink token -> 本地会话
async function wxCodeToSession(code) {
  const r = await callFunction('wx-login', { code })
  if (!r || !r.email || !r.token_hash) throw new Error('登录服务返回异常')
  return request(`${config.SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    header: { apikey: config.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    data: { type: 'magiclink', email: r.email, token_hash: r.token_hash }
  })
}

/* ============ Edge Functions ============ */

function callFunction(name, body, method = 'POST') {
  return request(`${config.SUPABASE_URL}/functions/v1/${name}`, {
    method,
    header: baseHeaders(),
    data: body
  })
}

module.exports = {
  getToken,
  getSessionRaw,
  refreshSession,
  setSession,
  select,
  upsert,
  patch,
  wxCodeToSession,
  callFunction
}
