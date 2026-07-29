const variants = {
  EXCELLENT: { bg: 'rgba(14,59,46,0.08)',  color: '#0E3B2E', border: 'rgba(14,59,46,0.2)'  },
  GOOD:      { bg: 'rgba(14,59,46,0.08)',  color: '#0E3B2E', border: 'rgba(14,59,46,0.2)'  },
  FAIR:      { bg: 'rgba(201,161,92,0.1)', color: '#A07C3A', border: 'rgba(201,161,92,0.3)' },
  POOR:      { bg: 'rgba(156,75,62,0.08)', color: '#9C4B3E', border: 'rgba(156,75,62,0.2)'  },
  CRITICAL:  { bg: 'rgba(156,75,62,0.08)', color: '#9C4B3E', border: 'rgba(156,75,62,0.2)'  },
  UP:        { bg: 'rgba(14,59,46,0.08)',  color: '#0E3B2E', border: 'rgba(14,59,46,0.2)'  },
  DOWN:      { bg: 'rgba(156,75,62,0.08)', color: '#9C4B3E', border: 'rgba(156,75,62,0.2)'  },
  STABLE:    { bg: 'rgba(122,145,132,0.1)',color: '#7A9184', border: 'rgba(122,145,132,0.25)'},
}

export default function Badge({ label, variant }) {
  const v = variants[variant] ?? variants.STABLE
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11.5, fontWeight: 600,
      background: v.bg, color: v.color,
      border: `1px solid ${v.border}`,
    }}>
      {label}
    </span>
  )
}
