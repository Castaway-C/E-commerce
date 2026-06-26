import { Navigate, Route, Routes } from 'react-router-dom'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<div>user frontend skeleton</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

