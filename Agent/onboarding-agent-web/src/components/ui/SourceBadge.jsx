const sourceStyles = {
  SELF: 'bg-violet-100 text-violet-800',
  AGENT: 'bg-slate-100 text-slate-700',
}

const sourceLabels = {
  SELF: 'App registration',
  AGENT: 'Agent onboarded',
}

export function SourceBadge({ source }) {
  const key = source === 'SELF' ? 'SELF' : 'AGENT'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceStyles[key]}`}
    >
      {sourceLabels[key]}
    </span>
  )
}
