import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { AdminLayout } from './layouts/AdminLayout'

export function App() {
  return (
    <BrowserRouter>
      <AdminLayout>
        <AppRoutes />
      </AdminLayout>
    </BrowserRouter>
  )
}
