import { Navigate, Route, Routes } from 'react-router-dom'

import { LoginPage } from '../pages/auth/login'
import { RegisterPage } from '../pages/auth/register'
import { HomePage } from '../pages/home'
import { ProductPage } from '../pages/product'
import { UserCenterPage } from '../pages/user'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/products" element={<ProductPage />} />
      <Route path="/user" element={<UserCenterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
