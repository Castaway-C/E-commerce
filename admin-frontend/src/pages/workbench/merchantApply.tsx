import { useState } from 'react'
import { http } from '../../services/http'
import {
  Empty,
  Field,
  Panel,
  ResultBoard,
  TextArea,
  formatError,
  pickData,
  randomText,
  statusText,
  type ApiResult,
} from './shared'

type MerchantApplication = {
  id: number
  merchant_name: string
  announcement?: string | null
  status: string
  reject_reason?: string | null
  merchant_id?: number | null
}

export function MerchantApplyPage() {
  const [lastResult, setLastResult] = useState<ApiResult>(null)
  const [application, setApplication] = useState<MerchantApplication | null>(null)
  const [username, setUsername] = useState(`merchant_${Math.random().toString(16).slice(2, 8)}`)
  const [password, setPassword] = useState('12345678')
  const [realName, setRealName] = useState('商家负责人')
  const [merchantName, setMerchantName] = useState(randomText('申请店铺'))
  const [announcement, setAnnouncement] = useState('申请入驻一次买够平台')

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

  async function register() {
    const data = await run('提交商家入驻申请', () =>
      http.post('/admin/merchant/register', {
        username,
        password,
        real_name: realName,
        merchant_name: merchantName,
        announcement,
      }),
    )
    if (data) setApplication(data as MerchantApplication)
  }

  async function login() {
    await run('商家账号登录', async () => {
      const response = await http.post('/admin/auth/login', { username, password })
      const data = pickData(response) as { access_token?: string; refresh_token?: string }
      if (data.access_token) localStorage.setItem('admin_access_token', data.access_token)
      if (data.refresh_token) localStorage.setItem('admin_refresh_token', data.refresh_token)
      return response
    })
    await loadApplication()
  }

  async function loadApplication() {
    const data = await run('查看我的入驻申请', () => http.get('/admin/merchant/application/me'))
    setApplication((data as MerchantApplication | null) ?? null)
  }

  async function resubmit() {
    const data = await run('重新提交入驻资料', () =>
      http.put('/admin/merchant/application/me', {
        merchant_name: merchantName,
        announcement,
      }),
    )
    if (data) setApplication(data as MerchantApplication)
  }

  return (
    <main className="admin-page">
      <header className="page-header">
        <div>
          <h1>商家入驻</h1>
          <p>商家自行注册后台账号。审核前只能登录、查看申请和重新提交资料；平台通过后再进入商家运营后台。</p>
        </div>
        <section className="status-card">
          <h2>申请状态</h2>
          {application ? (
            <div className="info-list">
              <span>店铺：{application.merchant_name}</span>
              <span>状态：{statusText(application.status)}</span>
              <span>店铺 ID：{application.merchant_id ?? '审核通过后生成'}</span>
              <span>拒绝原因：{application.reject_reason || '-'}</span>
            </div>
          ) : (
            <Empty>暂无申请信息。提交申请或登录后刷新查看。</Empty>
          )}
        </section>
      </header>

      <div className="workbench-grid narrow">
        <Panel title="入驻资料" description="被拒绝后可不限次数重新提交；通过后不可再通过本页修改申请。">
          <div className="form-grid">
            <Field label="登录用户名" value={username} onChange={setUsername} />
            <Field label="密码" value={password} onChange={setPassword} type="password" />
            <Field label="负责人姓名" value={realName} onChange={setRealName} />
            <Field label="店铺名称" value={merchantName} onChange={setMerchantName} />
            <TextArea label="店铺公告" value={announcement} onChange={setAnnouncement} />
          </div>
          <div className="toolbar">
            <button onClick={register}>提交入驻申请</button>
            <button onClick={login}>用商家账号登录</button>
            <button onClick={loadApplication}>查看我的申请</button>
            <button onClick={resubmit}>重新提交资料</button>
          </div>
        </Panel>
      </div>

      <ResultBoard result={lastResult} />
    </main>
  )
}
