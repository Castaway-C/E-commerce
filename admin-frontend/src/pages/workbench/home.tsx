import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { http } from '../../services/http'
import { Field, Panel, ResultBoard, formatError, pickData, statusText, type ApiResult } from './shared'

type AdminProfile = {
  id: number
  username: string
  real_name: string
  role: string
  merchant_id?: number | null
}

export function AdminWorkbenchHomePage() {
  const [lastResult, setLastResult] = useState<ApiResult>(null)
  const [username, setUsername] = useState('admin_01')
  const [password, setPassword] = useState('12345678')
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  const tokenPreview = useMemo(() => {
    const token = localStorage.getItem('admin_access_token')
    return token ? `${token.slice(0, 16)}...` : '未登录'
  }, [profile, lastResult])

  async function run(title: string, action: () => Promise<unknown>) {
    try {
      const response = await action()
      const data = pickData(response)
      setLastResult({ title, ok: true, data })
      return data
    } catch (error) {
      const data = formatError(error)
      setLastResult({ title, ok: false, data })
      return null
    }
  }

  async function login() {
    await run('管理端登录', async () => {
      const response = await http.post('/admin/auth/login', { username, password })
      const data = pickData(response) as { access_token?: string; refresh_token?: string }
      if (data.access_token) localStorage.setItem('admin_access_token', data.access_token)
      if (data.refresh_token) localStorage.setItem('admin_refresh_token', data.refresh_token)
      return response
    })
    await loadMe()
  }

  async function loadMe() {
    const data = await run('当前管理员', () => http.get('/admin/auth/me'))
    if (data) setProfile(data as AdminProfile)
  }

  async function logout() {
    await run('退出登录', () => http.post('/admin/auth/logout'))
    localStorage.removeItem('admin_access_token')
    localStorage.removeItem('admin_refresh_token')
    setProfile(null)
  }

  return (
    <main className="admin-page">
      <header className="page-header">
        <div>
          <h1>一次买够管理端</h1>
          <p>先登录，再按账号角色进入平台运营、商家运营或商家入驻页面。</p>
        </div>
        <section className="status-card">
          <h2>当前登录</h2>
          <div className="info-list">
            <span>Token：{tokenPreview}</span>
            <span>账号：{profile ? `${profile.real_name || profile.username}（${statusText(profile.role)}）` : '未读取'}</span>
            <span>merchant_id：{profile?.merchant_id ?? '-'}</span>
          </div>
        </section>
      </header>

      <Panel title="登录与账号状态" description="平台账号由初始化脚本创建；商家账号请在商家入驻页自行注册。">
        <div className="form-grid">
          <Field label="用户名" value={username} onChange={setUsername} />
          <Field label="密码" value={password} onChange={setPassword} type="password" />
        </div>
        <div className="toolbar">
          <button onClick={login}>登录</button>
          <button onClick={loadMe}>刷新当前账号</button>
          <button
            onClick={() =>
              run('刷新 token', () =>
                http.post('/admin/auth/refresh', { refresh_token: localStorage.getItem('admin_refresh_token') }),
              )
            }
          >
            刷新 token
          </button>
          <button onClick={logout}>退出</button>
        </div>
      </Panel>

      <section className="entry-grid">
        <Link className="entry-card" to="/platform">
          <h2>平台运营</h2>
          <p>平台账号使用：看板、用户、账号、入驻审核、商品审核、全平台促销、社区审核、订单售后和日志。</p>
        </Link>
        <Link className="entry-card" to="/merchant">
          <h2>商家运营</h2>
          <p>审核通过后的商家账号使用：本店商品、库存、订单发货和店铺范围优惠券。</p>
        </Link>
        <Link className="entry-card" to="/merchant-apply">
          <h2>商家入驻</h2>
          <p>新商家自助注册、待审核登录、查看申请状态、被拒后重新提交资料。</p>
        </Link>
      </section>

      <ResultBoard result={lastResult} />
    </main>
  )
}
