const variants = {
  EXCELLENT: 'bg-emerald-100 text-emerald-700',
  GOOD:      'bg-green-100 text-green-700',
  FAIR:      'bg-yellow-100 text-yellow-700',
  POOR:      'bg-orange-100 text-orange-700',
  CRITICAL:  'bg-red-100 text-red-700',
  UP:        'bg-emerald-100 text-emerald-700',
  DOWN:      'bg-red-100 text-red-700',
  STABLE:    'bg-gray-100 text-gray-600',
}

export default function Badge({ label, variant }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}
