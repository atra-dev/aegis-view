'use client'

import { useState, Suspense, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { categories, helpContent } from './helpContent'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

// Create a loading component with animation
const LoadingFallback = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center justify-center h-64"
  >
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      <p className="text-cyan-500/70 font-mono">[Loading Neural Interface...]</p>
    </div>
  </motion.div>
)

// Create a dynamic content component with animations
const DynamicContent = ({ category }) => {
  const content = helpContent[category] || []
  const categoryData = categories.find(c => c.id === category)
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={category}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {content.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-6 rounded-lg border ${item.color} ${item.borderColor} shadow-lg shadow-cyan-500/10`}
          >
            <h3 className="text-xl font-bold mb-4 text-cyan-400 font-mono">{item.title}</h3>
            {item.subtitle && (
              <p className="text-cyan-500/70 font-mono mb-4">{item.subtitle}</p>
            )}
            <p className="text-gray-300 mb-4">{item.content}</p>
            
            {item.steps && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-cyan-500/70 uppercase tracking-wider font-mono">[Steps]</h4>
                <ul className="space-y-2">
                  {item.steps.map((step, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-medium font-mono">
                        {i + 1}
                      </span>
                      <span className="text-gray-300">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {item.features && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-cyan-500/70 uppercase tracking-wider font-mono">[Features]</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {item.features.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-cyan-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {item.guidelines && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-cyan-500/70 uppercase tracking-wider font-mono">[Guidelines]</h4>
                <ul className="space-y-2">
                  {item.guidelines.map((guideline, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-cyan-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-300">{guideline}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {item.issues && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-cyan-500/70 uppercase tracking-wider font-mono">[System Diagnostics]</h4>
                <div className="space-y-3">
                  {item.issues.map((issue, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      className="bg-gray-800/50 p-4 rounded-lg border border-cyan-500/20"
                    >
                      <p className="font-medium text-cyan-400 flex items-center font-mono">
                        <svg className="w-5 h-5 text-cyan-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {issue.problem}
                      </p>
                      <p className="text-gray-300 mt-2 ml-7">{issue.solution}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}

export default function Help() {
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState('getting-started')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }
  }, [user, router])

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0B1120] relative overflow-hidden">
      {/* Matrix-like rain effect */}
      <div className="absolute inset-0 opacity-20" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='matrix' width='50' height='50' patternUnits='userSpaceOnUse'%3E%3Ctext x='50%25' y='50%25' fill='%2300ff00' font-family='monospace'%3E01%3C/text%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23matrix)'/%3E%3C/svg%3E")`,
        animation: 'matrix-rain 20s linear infinite'
      }}></div>

      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-gray-900/60 to-gray-900/90 backdrop-blur-sm"></div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800/50 rounded-lg border border-cyan-500/20 p-4 sticky top-8 shadow-lg shadow-cyan-500/10"
            >
              <h2 className="text-xl font-bold mb-4 text-cyan-400 font-mono">[Help Categories]</h2>
              <div className="space-y-2">
                {filteredCategories.map((category) => (
                  <motion.button
                    key={category.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center space-x-2 p-3 rounded-lg transition-colors duration-200 ${
                      activeCategory === category.id
                        ? `${category.color} ${category.borderColor} text-cyan-400`
                        : 'text-gray-400 hover:bg-gray-800/50'
                    }`}
                  >
                    <span className={`${activeCategory === category.id ? 'text-cyan-400' : 'text-gray-400'}`}>
                      {category.icon}
                    </span>
                    <span className="font-mono">{category.name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 rounded-lg border border-cyan-500/20 p-6 shadow-lg shadow-cyan-500/10"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <h1 className="text-2xl font-bold text-cyan-400 font-mono mb-4 md:mb-0">[Help Center]</h1>
                
                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search help articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={`w-full px-4 py-2 rounded-lg bg-gray-800/50 border font-mono ${
                      isSearchFocused
                        ? 'border-cyan-500 ring-2 ring-cyan-500/20 text-cyan-400'
                        : 'border-cyan-500/20 text-gray-300 hover:border-cyan-500/30'
                    }`}
                  />
                  <svg
                    className={`w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 ${
                      isSearchFocused ? 'text-cyan-400' : 'text-gray-400'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Dynamic Content */}
              <Suspense fallback={<LoadingFallback />}>
                <DynamicContent category={activeCategory} />
              </Suspense>
            </motion.div>
          </div>
        </div>
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