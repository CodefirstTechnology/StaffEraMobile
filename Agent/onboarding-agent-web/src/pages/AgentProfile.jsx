import { useAuth } from '../context/AuthContext'

export default function AgentProfile() {
  const { user } = useAuth()
  return (
    <div className="max-w-md rounded-xl bg-surface p-6 shadow-sm">
      <h2 className="text-xl font-bold">Profile</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-subtext">Name</dt>
          <dd className="font-medium">{user?.name}</dd>
        </div>
        <div>
          <dt className="text-subtext">Email</dt>
          <dd>{user?.email}</dd>
        </div>
        <div>
          <dt className="text-subtext">Role</dt>
          <dd>{user?.role}</dd>
        </div>
        {user?.agent && (
          <>
            <div>
              <dt className="text-subtext">Agency</dt>
              <dd>{user.agent.agencyName || '—'}</dd>
            </div>
            <div>
              <dt className="text-subtext">City</dt>
              <dd>{user.agent.city || '—'}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  )
}
