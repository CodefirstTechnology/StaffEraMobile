import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'
import { checkPasswordStrength } from '../lib/generatePassword'
import { normalizeLoginErrorMessage } from '../lib/normalizeLoginErrorMessage'

function emailMessage(value) {
  const email = String(value ?? '').trim()
  if (!email) return 'Email is required'
  if (!email.includes('@')) return 'Email must include "@"'

  const atCount = (email.match(/@/g) || []).length
  if (atCount > 1) return 'Email must contain only one "@"'

  const [local, domain = ''] = email.split('@')
  if (!local) return 'Enter a name before "@"'
  if (!domain) return 'Enter a domain after "@" (e.g. example.com)'
  if (domain.startsWith('.') || domain.endsWith('.')) {
    return 'Enter a valid domain after "@" (e.g. example.com)'
  }
  if (!domain.includes('.')) return 'Email must include a domain extension (e.g. ".com")'

  const labels = domain.split('.')
  if (labels.some((part) => !part)) {
    return 'Enter a valid domain after "@" (e.g. example.com)'
  }
  const tld = labels[labels.length - 1]
  if (!/^[a-zA-Z]{2,}$/.test(tld)) {
    return 'Email must include a valid domain extension (e.g. ".com")'
  }
  const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9]+([._-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-]?[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
  if (/\s/.test(email) || !STRICT_EMAIL_REGEX.test(email)) {
    return 'Enter a valid email address'
  }
  return null
}

function usernameMessage(value) {
  const username = String(value ?? '').trim()
  if (!username) return 'Username is required'
  if (/\s/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
    return 'Enter a valid username (email address)'
  }
  return null
}

function passwordMessage(value) {
  const password = String(value ?? '')
  if (!password) return 'Password is required'
  if (password.trim().length === 0) return 'Password cannot contain only spaces'
  if (password.length < 6) return 'Password must be at least 6 characters'
  return null
}

function fieldClass(invalid, extra = '') {
  return `input-ghost w-full${extra}${invalid ? ' is-invalid' : ''}`
}

const schema = z.object({
  email: z.string().superRefine((value, ctx) => {
    const message = usernameMessage(value)
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message })
  }),
  password: z.string().superRefine((value, ctx) => {
    const message = passwordMessage(value)
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message })
  }),
})

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(
    () =>
      (location.state?.forbidden
        ? 'You do not have access to this portal. Sign in with an agent or admin account.'
        : '') || '',
  )
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  const passwordValue = watch('password')

  const emailInvalid = !!errors.email || !!error
  const passwordInvalid = !!errors.password || !!error

  const onSubmit = async (data) => {
    setError('')
    try {
      const user = await login(data.email.trim(), data.password)
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
      setError(normalizeLoginErrorMessage(e.response?.data?.message) || 'Invalid username or password. Please try again.')
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

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label className="text-xs font-medium text-on-surface-variant ml-1" htmlFor="login-email">
              Username <span className="text-error">*</span>
            </label>
            <input
              id="login-email"
              {...register('email', { onChange: () => setError('') })}
              type="text"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your username"
              aria-invalid={emailInvalid}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              className={fieldClass(emailInvalid, ' mt-1')}
            />
            {errors.email && (
              <p id="login-email-error" className="text-xs font-medium text-error mt-1.5 ml-1">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-on-surface-variant ml-1" htmlFor="login-password">
              Password <span className="text-error">*</span>
            </label>
            <div className="relative mt-1">
              <input
                id="login-password"
                {...register('password', { onChange: () => setError('') })}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={passwordInvalid}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                className={fieldClass(passwordInvalid, ' pr-11')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {passwordValue && (
              <div className="mt-1 flex items-center gap-1.5 ml-1">
                <span className="text-xs text-on-surface-variant font-medium">Strength:</span>
                <span className={`text-xs font-bold ${checkPasswordStrength(passwordValue).color}`}>
                  {checkPasswordStrength(passwordValue).label}
                </span>
              </div>
            )}
            {errors.password && (
              <p id="login-password-error" className="text-xs font-medium text-error mt-1.5 ml-1">
                {errors.password.message}
              </p>
            )}
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
