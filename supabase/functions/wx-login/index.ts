// supabase/functions/wx-login/index.ts
// 微信小程序登录：code -> openid -> Supabase 会话令牌
// 部署：supabase functions deploy wx-login --no-verify-jwt
// Secrets：
//   supabase secrets set WX_APPID=你的小程序appid
//   supabase secrets set WX_APP_SECRET=你的小程序secret

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WxSessionResponse {
  openid?: string
  session_key?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()
    if (!code) {
      return json({ error: 'missing code' }, 400)
    }

    const appid = Deno.env.get('WX_APPID')!
    const secret = Deno.env.get('WX_APP_SECRET')!

    // 1. code 换 openid
    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    )
    const wx = (await wxRes.json()) as WxSessionResponse
    if (!wx.openid) {
      return json({ error: 'wx login failed', detail: wx }, 401)
    }
    const openid = wx.openid

    // 2. service_role 客户端
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 3. 按 openid 找/建用户（email 仅作为内部标识，不用于登录）
    const fakeEmail = `wx_${openid}@team-remind.internal`
    let userId = ''
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('openid', openid)
      .maybeSingle()

    if (profile?.id) {
      userId = profile.id
    } else {
      const password = crypto.randomUUID()
      const { data: created, error } = await admin.auth.admin.createUser({
        email: fakeEmail,
        email_confirm: true,
        password,
        user_metadata: { name: '微信用户' },
      })
      if (error || !created.user) {
        return json({ error: 'create user failed', detail: String(error) }, 500)
      }
      userId = created.user.id
      await admin.from('profiles').upsert({
        id: userId,
        openid,
        name: '微信用户',
        updated_at: new Date().toISOString(),
      })
    }

    // 4. 生成 magiclink 令牌，客户端用 token_hash 换正式会话
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: fakeEmail,
    })
    if (linkErr || !link) {
      return json({ error: 'generate link failed', detail: String(linkErr) }, 500)
    }

    return json({
      email: fakeEmail,
      token_hash: link.properties?.hashed_token ?? null,
      user_id: userId,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
