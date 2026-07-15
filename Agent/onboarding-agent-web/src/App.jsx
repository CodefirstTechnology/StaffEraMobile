import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import { DashboardLayout, AdminLayout } from './components/DashboardLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ServantList from './pages/ServantList'
import AppRegistrationList from './pages/AppRegistrationList'
import OnboardServant from './pages/OnboardServant'
import ServantDetail from './pages/ServantDetail'
import EditServant from './pages/EditServant'
import AgentProfile from './pages/AgentProfile'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminBookings from './pages/admin/AdminBookings'
import AdminServants from './pages/admin/AdminServants'
import AdminSkills from './pages/admin/AdminSkills'
import AdminAgents from './pages/admin/AdminAgents'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error?.response?.status
        if (status === 401 || status === 403) return false
        return failureCount < 2
      },
    },
  },
})

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute roles={['AGENT', 'ADMIN']}>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "registrations", element: <AppRegistrationList /> },
      { path: "servants", element: <ServantList /> },
      { path: "servants/new", element: <OnboardServant /> },
      { path: "servants/:id", element: <ServantDetail /> },
      { path: "servants/:id/edit", element: <EditServant /> },
      { path: "profile", element: <AgentProfile /> },
    ]
  },
  {
    path: "/admin",
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "agents", element: <AdminAgents /> },
      { path: "users", element: <AdminUsers /> },
      { path: "bookings", element: <AdminBookings /> },
      { path: "servants", element: <AdminServants /> },
      { path: "skills", element: <AdminSkills /> },
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  }
])

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
