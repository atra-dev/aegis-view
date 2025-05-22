'use client'

export function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Matrix-like rain effect */}
      <div className="absolute inset-0 opacity-20" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='matrix' width='50' height='50' patternUnits='userSpaceOnUse'%3E%3Ctext x='50%25' y='50%25' fill='%2300ff00' font-family='monospace'%3E01%3C/text%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23matrix)'/%3E%3C/svg%3E")`,
        animation: 'matrix-rain 20s linear infinite'
      }}></div>

      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-gray-900/60 to-gray-900/90 backdrop-blur-sm"></div>

      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center mb-4">
          <svg className="animate-spin h-12 w-12 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-cyan-400 font-mono mb-2">Loading_System</h2>
        <p className="text-cyan-500/50 font-mono text-sm">[Initializing Components...]</p>
      </div>

      <style jsx>{`
        @keyframes matrix-rain {
          0% { background-position: 0 0; }
          100% { background-position: 0 1000px; }
        }
      `}</style>
    </div>
  )
} 