import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_INACTIVE =
  'block rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface-variant/85 transition-colors hover:bg-surface-container hover:text-on-background'

const NAV_ACTIVE =
  'block rounded-xl px-3 py-2.5 text-sm font-semibold bg-primary text-white shadow-md shadow-primary/20'

/** Parent section stays visible when a child admin route is selected. */
const NAV_PARENT_ACTIVE =
  'block rounded-xl px-3 py-2.5 text-sm font-semibold bg-primary-fixed text-primary border border-primary/25'

const navLinkClass = ({ isActive }) => (isActive ? NAV_ACTIVE : NAV_INACTIVE)

function AdminOverviewLink() {
  const { pathname } = useLocation()
  const isExact = pathname === '/admin'
  const isChildRoute =
    pathname.startsWith('/admin/') &&
    !['/admin/agents', '/admin/users', '/admin/bookings', '/admin/servants', '/admin/skills', '/admin/pricing'].some(
      (route) => pathname.startsWith(route)
    )

  let className = NAV_INACTIVE
  if (isExact) className = NAV_ACTIVE
  else if (isChildRoute) className = NAV_PARENT_ACTIVE

  return (
    <NavLink to="/admin" end className={className}>
      Overview
    </NavLink>
  )
}

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'ADMIN'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed flex h-full w-64 flex-col border-r border-outline-variant/30 bg-surface/90 backdrop-blur-xl p-5">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-primary">StaffEra</h1>
          <p className="text-xs text-on-surface-variant">Agent pipeline</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/registrations" className={navLinkClass}>
            App Registrations
          </NavLink>
          <NavLink to="/servants" className={navLinkClass}>
            Servants
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            Profile
          </NavLink>
          {isAdmin && (
            <>
              <div className="my-3 border-t border-outline-variant/40" />
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant/75">
                Admin
              </p>
              <AdminOverviewLink />
              <NavLink to="/admin/agents" end className={navLinkClass}>
                Agents
              </NavLink>
              <NavLink to="/admin/users" end className={navLinkClass}>
                Users
              </NavLink>
              <NavLink to="/admin/bookings" end className={navLinkClass}>
                Bookings
              </NavLink>
              <NavLink to="/admin/servants" end className={navLinkClass}>
                All Servants
              </NavLink>
              <NavLink to="/admin/skills" end className={navLinkClass}>
                Skills
              </NavLink>
              <NavLink to="/admin/pricing" end className={navLinkClass}>
                Pricing & Limits
              </NavLink>
            </>
          )}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 rounded-xl border border-outline-variant py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-background"
        >
          Logout
        </button>
      </aside>
      <div className="ml-64 flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/40 bg-surface/80 px-8 py-4 backdrop-blur-xl shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-primary">Welcome, {user?.name}</h2>
          <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-primary">
            {user?.role}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export const AdminLayout = DashboardLayout
