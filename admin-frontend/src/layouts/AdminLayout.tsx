import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav className="app-nav">
        <Link className="brand-link" to="/dashboard">
          <span className="brand-mark">IM</span>
          <span>
            <strong>一次买够</strong>
            <small>运营后台</small>
          </span>
        </Link>
        <div className="nav-links">
          <Link to="/dashboard">管理首页</Link>
          <Link to="/platform">平台运营</Link>
          <Link to="/merchant">商家运营</Link>
          <Link to="/merchant-apply">商家入驻</Link>
        </div>
        <Link className="nav-ghost" to="/login">独立登录页</Link>
      </nav>
      {children}
    </>
  )
}
