import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen" style={{
      background: 'radial-gradient(circle at 20% 0%, rgba(14,59,46,0.16) 0%, rgba(14,59,46,0) 45%), #FAFBF9',
    }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
