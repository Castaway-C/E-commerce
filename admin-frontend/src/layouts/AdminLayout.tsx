import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav>
        <Link to="/dashboard">看板</Link> | <Link to="/products">商品管理</Link> | <Link to="/orders">订单售后</Link> |{' '}
        <Link to="/login">登录</Link>
      </nav>
      {children}
    </>
  )
}
