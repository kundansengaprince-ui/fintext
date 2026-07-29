const base = 'inline-flex items-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
const variants = {
  primary:   'bg-[#0E3B2E] text-white hover:bg-[#0A2820] focus:ring-[#0E3B2E] hover:shadow-[0_0_12px_rgba(14,59,46,0.35)]',
  secondary: 'bg-white text-[#3D4F47] border border-[#E2E9E5] hover:bg-[#FAFBF9] focus:ring-[#0E3B2E]',
  danger:    'bg-white text-[#9C4B3E] border border-[#E2E9E5] hover:bg-[#FDF4F3] focus:ring-[#9C4B3E]',
  ghost:     'text-[#7A9184] hover:bg-[#E2E9E5] focus:ring-[#0E3B2E]',
}
const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
