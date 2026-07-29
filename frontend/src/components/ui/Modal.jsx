import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}
        style={{ border: '1px solid #E2E9E5' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E2E9E5' }}>
          <h2 className="text-lg font-semibold text-[#0A2820]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-[#7A9184] hover:text-[#0A2820] hover:bg-[#E2E9E5]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
