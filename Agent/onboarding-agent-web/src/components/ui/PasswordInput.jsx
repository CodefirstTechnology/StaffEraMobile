import { useState } from 'react'

function EyeOpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function PasswordInput({ className = '', invalid, ...props }) {
  const [show, setShow] = useState(false)

  const classes = className.split(/\s+/).filter(Boolean)
  const wrapperClasses = ['relative']
  const inputClasses = []

  classes.forEach((c) => {
    if (
      c.startsWith('w-') ||
      c.startsWith('max-w-') ||
      c.startsWith('m-') ||
      c.startsWith('mx-') ||
      c.startsWith('my-') ||
      c.startsWith('mt-') ||
      c.startsWith('mb-') ||
      c.startsWith('ml-') ||
      c.startsWith('mr-') ||
      c === 'flex-1' ||
      c === 'shrink-0' ||
      c === 'grow'
    ) {
      wrapperClasses.push(c)
    } else {
      inputClasses.push(c)
    }
  })

  if (!inputClasses.some((c) => c.startsWith('w-'))) {
    inputClasses.push('w-full')
  }

  const finalInputClass = `${inputClasses.join(' ')}${inputClasses.join(' ').includes('pr-') ? '' : ' pr-11'}`.trim()

  return (
    <div className={wrapperClasses.join(' ')}>
      <input
        {...props}
        type={show ? 'text' : 'password'}
        autoComplete={props.autoComplete ?? 'new-password'}
        aria-invalid={invalid ? 'true' : props['aria-invalid']}
        className={finalInputClass}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary flex items-center justify-center"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeClosedIcon /> : <EyeOpenIcon />}
      </button>
    </div>
  )
}
