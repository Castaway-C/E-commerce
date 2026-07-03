import { Navigate, Route, Routes } from 'react-router-dom'

import { LoginPage } from '../pages/auth/login'
import { RegisterPage } from '../pages/auth/register'
import { MerchantPage } from '../pages/merchant'
import { UserTestConsolePage } from '../pages/test-console'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<UserTestConsolePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/products" element={<UserTestConsolePage />} />
      <Route path="/group-buy" element={<UserTestConsolePage />} />
      <Route path="/merchants/:merchantId" element={<MerchantPage />} />
      <Route path="/cart" element={<UserTestConsolePage />} />
      <Route path="/checkout" element={<UserTestConsolePage />} />
      <Route path="/community" element={<UserTestConsolePage />} />
      <Route path="/promotions" element={<UserTestConsolePage />} />
      <Route path="/orders" element={<UserTestConsolePage />} />
      <Route path="/addresses" element={<UserTestConsolePage />} />
      <Route path="/user" element={<UserTestConsolePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
