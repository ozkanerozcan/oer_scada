import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import DashboardViewer from '@/pages/DashboardViewer'
import DashboardManagement from '@/pages/DashboardManagement'
import Press500TDashboard from '@/pages/Press500TDashboard'
import Press500TPres1 from '@/pages/Press500TPres1'
import TagBrowser from '@/pages/TagBrowser'
import TagManagement from '@/pages/TagManagement'
import Alarms from '@/pages/Alarms'
import Users from '@/pages/Users'
import Devices from '@/pages/Devices'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboard-management" replace /> },
      { path: '/dashboards/:id', element: <DashboardViewer /> },
      { path: '/dashboard-management', element: <DashboardManagement /> },
      { path: '/press-500t-pres-1', element: <Press500TPres1 /> },
      { path: '/press-500t', element: <div className="p-8 text-center">Redirecting to Pres 1...</div> },
      { path: '/tags', element: <TagBrowser /> },
      { path: '/tags-management', element: <TagManagement /> },
      { path: '/alarms', element: <Alarms /> },
      { path: '/users', element: <Users /> },
      { path: '/devices', element: <Devices /> },
      
      // Placeholder routes for Phase 5 features
      { path: '/trends', element: <div className="p-8 text-center text-muted fade-in">Trend grafikleri (Geliştirme Aşamasında)</div> },
      { path: '/reports', element: <div className="p-8 text-center text-muted fade-in">Raporlar (Geliştirme Aşamasında)</div> },
      { path: '/settings', element: <div className="p-8 text-center text-muted fade-in">Ayarlar (Geliştirme Aşamasında)</div> },
      
      // Catch-all
      { path: '*', element: <Navigate to="/" replace /> },
    ]
  }
])

export default function App() {
  return <RouterProvider router={router} />
}
