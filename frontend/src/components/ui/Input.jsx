export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-[#3D4F47]">{label}</label>}
      <input
        className={`w-full rounded-lg border px-3 py-2 text-sm text-[#0A2820] placeholder-[#B7C4BC]
          focus:outline-none focus:ring-2 focus:ring-[#0E3B2E] focus:border-transparent
          ${error ? 'border-[#9C4B3E] bg-[#FDF4F3]' : 'border-[#E2E9E5] bg-white'}
          ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[#9C4B3E]">{error}</span>}
    </div>
  )
}
