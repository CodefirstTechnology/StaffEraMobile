import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'

/** Runs the query only after auth has finished loading and a user is present. */
export function useAuthenticatedQuery(options) {
  const { user, loading } = useAuth()
  const { enabled, ...rest } = options

  return useQuery({
    ...rest,
    enabled: !loading && Boolean(user) && (enabled ?? true),
  })
}

/** Admin-only queries — waits for auth and requires ADMIN role. */
export function useAdminQuery(options) {
  const { user, loading } = useAuth()
  const { enabled, ...rest } = options

  return useQuery({
    ...rest,
    enabled: !loading && user?.role === 'ADMIN' && (enabled ?? true),
  })
}
