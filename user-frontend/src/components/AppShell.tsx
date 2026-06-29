import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <nav className="app-nav">
        <Link className="brand-link" to="/">
          <span className="brand-mark">IM</span>
          <span>
            <strong>一次买够</strong>
            <small>用户商城</small>
          </span>
        </Link>
        <div className="nav-links">
          <Link to="/">商城首页</Link>
          <Link to="/products">商品</Link>
          <Link to="/orders">订单</Link>
          <Link to="/community">社区</Link>
        </div>
        <div className="nav-links nav-auth">
          <Link to="/login">登录</Link>
          <Link to="/register">注册</Link>
        </div>
      </nav>
      {children}
    </>
  )
}
