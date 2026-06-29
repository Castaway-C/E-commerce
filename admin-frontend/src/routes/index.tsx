import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminLoginPage } from '../pages/auth/login'
import { AdminWorkbenchHomePage } from '../pages/workbench/home'
import { MerchantApplyPage } from '../pages/workbench/merchantApply'
import { MerchantWorkbenchPage } from '../pages/workbench/merchant'
import { PlatformWorkbenchPage } from '../pages/workbench/platform'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/dashboard" element={<AdminWorkbenchHomePage />} />
      <Route path="/platform" element={<PlatformWorkbenchPage />} />
      <Route path="/merchant" element={<MerchantWorkbenchPage />} />
      <Route path="/merchant-apply" element={<MerchantApplyPage />} />
      <Route path="/products" element={<MerchantWorkbenchPage />} />
      <Route path="/promotions" element={<PlatformWorkbenchPage />} />
      <Route path="/community" element={<PlatformWorkbenchPage />} />
      <Route path="/orders" element={<PlatformWorkbenchPage />} />
      <Route path="/users" element={<PlatformWorkbenchPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
