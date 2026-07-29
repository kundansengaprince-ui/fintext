export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl ${className}`} style={{
      border: '1px solid #E2E9E5',
      boxShadow: '0 1px 2px rgba(10,40,32,0.05), 0 1px 12px rgba(10,40,32,0.04)',
    }}>
      {children}
    </div>
  )
}
