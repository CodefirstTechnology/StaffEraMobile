import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(
    () =>
      (location.state?.forbidden
        ? 'You do not have access to this portal. Sign in with an agent or admin account.'
        : '') || '',
  )
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setError('')
    try {
      const user = await login(data.email, data.password)
      if (!['AGENT', 'ADMIN'].includes(user.role)) {
        localStorage.clear()
        setError(
          'This portal is for agents and admins only. Servants and house owners must use the mobile app.',
        )
        return
      }
      if (user.role === 'ADMIN') navigate('/admin')
      else navigate('/')
    } catch (e) {
      setError(e.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-15%] w-[420px] h-[420px] rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-10%] w-[320px] h-[320px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="glass-card w-full max-w-md p-10 z-10">
        <p className="text-sm font-semibold text-secondary mb-1">Agent & Admin Portal</p>
        <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">StaffEra</h1>
        <p className="text-on-surface-variant text-sm mb-8">
          Onboard and verify home staff. Trusted by families across India.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-on-surface-variant ml-1">Email</label>
            <input
              {...register('email')}
              type="email"
              className="input-ghost w-full mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-on-surface-variant ml-1">Password</label>
            <input
              {...register('password')}
              type="password"
              className="input-ghost w-full mt-1"
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="btn-gradient w-full py-3.5 mt-2">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-on-surface-variant/80 mt-8 text-center leading-relaxed">
          Secure access for authorised agents only. Servant accounts are created here, not in the mobile app.
        </p>
      </div>
    </div>
  )
}
