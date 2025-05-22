'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { motion } from 'framer-motion'

export default function Home() {
  const router = useRouter()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Aegis View",
    "applicationCategory": "SecurityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Advanced Threat Response & Analysis Cloud as a Service - A comprehensive security platform offering real-time monitoring, threat detection, and automated response capabilities for digital infrastructure protection.",
    "keywords": "Aegis View, ATRACaaS, security platform, threat detection, cloud security, SOC, security operations center, threat analysis, cybersecurity, cloud service, security monitoring",
    "url": "https://atracaas.cisoasaservice.io",
    "sameAs": [
      "https://twitter.com/atracaas",
      "https://linkedin.com/company/atracaas"
    ]
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  }

  const imageVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Gradient Background */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <motion.div
            className="absolute left-1/2 top-1/3 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-purple-600/20 blur-3xl animate-pulse"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
        <div className="relative z-10 w-full">
          <motion.div 
            className="text-center flex flex-col items-center justify-center"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mb-6 leading-tight drop-shadow-lg"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Advanced Threat Response & Analysis
            </motion.h1>
            <motion.p 
              className="mt-6 text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto drop-shadow"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Comprehensive security monitoring and threat detection platform for modern cybersecurity operations
            </motion.p>
            <motion.div 
              className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <motion.button 
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.97 }}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: 'loop', delay: 1 }}
                onClick={() => router.push('/auth/signin')}
                className="px-10 py-4 bg-cyan-500 text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-cyan-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                Get Started
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.97 }}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: 'loop', delay: 1.2 }}
                onClick={() => router.push('/demo')}
                className="px-10 py-4 border-2 border-cyan-400 text-cyan-300 text-lg font-semibold rounded-xl shadow-lg hover:bg-cyan-500/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                Request Demo
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Core Features Section */}
      <motion.div 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <motion.div className="text-center mb-20" variants={itemVariants}>
          <motion.h2 
            className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-4"
            initial={{ y: -20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Advanced Threat Response & Analysis Platform
          </motion.h2>
          <motion.p 
            className="text-xl text-gray-300 max-w-2xl mx-auto"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Comprehensive security solutions designed to protect and enhance your digital infrastructure
          </motion.p>
        </motion.div>
        
        <div className="space-y-24">
          {/* Threat Intelligence */}
          <motion.div 
            className="flex flex-col md:flex-row gap-12 items-center group"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div className="md:w-1/2" variants={itemVariants}>
              <motion.div 
                className="flex items-center gap-4 mb-6"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300"
                  whileHover={{ scale: 1.1 }}
                >
                  <svg className="h-8 w-8 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </motion.div>
                <motion.h3 
                  className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 group-hover:from-cyan-300 group-hover:to-blue-500 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Threat Intelligence
                </motion.h3>
              </motion.div>
              <motion.p 
                className="text-gray-300 text-lg mb-6 group-hover:text-gray-200 transition-colors duration-300"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Our advanced threat intelligence system provides real-time detection and analysis capabilities, 
                enabling proactive security measures against emerging threats. The system continuously monitors 
                and analyzes network activities to identify potential security incidents.
              </motion.p>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Real-time Threat Detection</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Continuous monitoring and immediate alerts for suspicious activities</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Network Analysis</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Deep packet inspection and traffic pattern analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Security Event Correlation</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Advanced algorithms to connect related security events</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            <motion.div 
              className="md:w-1/2 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-2 shadow-xl backdrop-blur-md border border-cyan-900/30 transition-all duration-300 hover:shadow-cyan-500/20"
              variants={imageVariants}
            >
              <motion.div 
                className="aspect-video bg-gray-900/80 rounded-lg flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-cyan-400/30"
                whileHover="hover"
              >
                <motion.img 
                  src="/hero images/Threat Intelligence.jpg" 
                  alt="Cyber Threat Intelligence" 
                  className="object-cover w-full h-full rounded-lg"
                  variants={imageVariants}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Security Monitoring */}
          <motion.div 
            className="flex flex-col md:flex-row-reverse gap-12 items-center group"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div className="md:w-1/2" variants={itemVariants}>
              <motion.div 
                className="flex items-center gap-4 mb-6"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300"
                  whileHover={{ scale: 1.1 }}
                >
                  <svg className="h-8 w-8 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </motion.div>
                <motion.h3 
                  className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 group-hover:from-cyan-300 group-hover:to-blue-500 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Security Monitoring
                </motion.h3>
              </motion.div>
              <motion.p 
                className="text-gray-300 text-lg mb-6 group-hover:text-gray-200 transition-colors duration-300"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Comprehensive security monitoring and alert management system that provides real-time visibility 
                into your security posture. The SOC dashboard offers a centralized view of all security events 
                and incidents, enabling quick response and decision-making.
              </motion.p>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Real-time Alerts</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Instant notifications for critical security events</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">SOC Dashboard</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Centralized view of security operations and metrics</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Security Event Logging</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Comprehensive logging of all security-related events</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            <motion.div 
              className="md:w-1/2 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-2 shadow-xl backdrop-blur-md border border-cyan-900/30 transition-all duration-300 hover:shadow-cyan-500/20"
              variants={imageVariants}
            >
              <motion.div 
                className="aspect-video bg-gray-900/80 rounded-lg flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-cyan-400/30"
                whileHover="hover"
              >
                <motion.img 
                  src="/hero images/Security Monitoring.jpg" 
                  alt="Security Monitoring" 
                  className="object-cover w-full h-full rounded-lg"
                  variants={imageVariants}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Analytics & Reporting */}
          <motion.div 
            className="flex flex-col md:flex-row gap-12 items-center group"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div className="md:w-1/2" variants={itemVariants}>
              <motion.div 
                className="flex items-center gap-4 mb-6"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300"
                  whileHover={{ scale: 1.1 }}
                >
                  <svg className="h-8 w-8 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </motion.div>
                <motion.h3 
                  className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 group-hover:from-cyan-300 group-hover:to-blue-500 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Analytics & Reporting
                </motion.h3>
              </motion.div>
              <motion.p 
                className="text-gray-300 text-lg mb-6 group-hover:text-gray-200 transition-colors duration-300"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Advanced security analytics and comprehensive reporting tools that provide deep insights into 
                your security operations. Generate detailed reports, track security metrics, and analyze threat 
                patterns to improve your security posture.
              </motion.p>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Security Metrics</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Key performance indicators and security measurements</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Statistical Reports</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Detailed analysis of security events and trends</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Threat Analysis</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">In-depth examination of security threats and vulnerabilities</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            <motion.div 
              className="md:w-1/2 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-2 shadow-xl backdrop-blur-md border border-cyan-900/30 transition-all duration-300 hover:shadow-cyan-500/20"
              variants={imageVariants}
            >
              <motion.div 
                className="aspect-video bg-gray-900/80 rounded-lg flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-cyan-400/30"
                whileHover="hover"
              >
                <motion.img 
                  src="/hero images/Analytics & Reporting.jpg" 
                  alt="Analytics and Reporting" 
                  className="object-cover w-full h-full rounded-lg"
                  variants={imageVariants}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Team Management */}
          <motion.div 
            className="flex flex-col md:flex-row-reverse gap-12 items-center group"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div className="md:w-1/2" variants={itemVariants}>
              <motion.div 
                className="flex items-center gap-4 mb-6"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300"
                  whileHover={{ scale: 1.1 }}
                >
                  <svg className="h-8 w-8 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </motion.div>
                <motion.h3 
                  className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 group-hover:from-cyan-300 group-hover:to-blue-500 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Team Management
                </motion.h3>
              </motion.div>
              <motion.p 
                className="text-gray-300 text-lg mb-6 group-hover:text-gray-200 transition-colors duration-300"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Efficient team coordination and management tools designed to streamline security operations. 
                Track attendance, manage shifts, and analyze team performance to optimize your security team's 
                effectiveness.
              </motion.p>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Attendance Tracking</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Automated tracking of team member presence and availability</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Shift Management</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Efficient scheduling and rotation of security personnel</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Team Analytics</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Performance metrics and team efficiency analysis</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            <motion.div 
              className="md:w-1/2 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-2 shadow-xl backdrop-blur-md border border-cyan-900/30 transition-all duration-300 hover:shadow-cyan-500/20"
              variants={imageVariants}
            >
              <motion.div 
                className="aspect-video bg-gray-900/80 rounded-lg flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-cyan-400/30"
                whileHover="hover"
              >
                <motion.img 
                  src="/hero images/Team Management.jpg" 
                  alt="Team Management" 
                  className="object-cover w-full h-full rounded-lg"
                  variants={imageVariants}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Project Management */}
          <motion.div 
            className="flex flex-col md:flex-row gap-12 items-center group"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div className="md:w-1/2" variants={itemVariants}>
              <motion.div 
                className="flex items-center gap-4 mb-6"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300"
                  whileHover={{ scale: 1.1 }}
                >
                  <svg className="h-8 w-8 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </motion.div>
                <motion.h3 
                  className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 group-hover:from-cyan-300 group-hover:to-blue-500 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Project Management
                </motion.h3>
              </motion.div>
              <motion.p 
                className="text-gray-300 text-lg mb-6 group-hover:text-gray-200 transition-colors duration-300"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Organized project tracking and management system that helps you efficiently manage security 
                projects, tenants, and resources. Streamline your security operations with comprehensive 
                project management tools.
              </motion.p>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Project Tracking</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Monitor progress and milestones of security initiatives</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Tenant Management</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Efficient handling of multiple client environments</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Resource Allocation</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Optimal distribution of security resources and personnel</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            <motion.div 
              className="md:w-1/2 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-2 shadow-xl backdrop-blur-md border border-cyan-900/30 transition-all duration-300 hover:shadow-cyan-500/20"
              variants={imageVariants}
            >
              <motion.div 
                className="aspect-video bg-gray-900/80 rounded-lg flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-cyan-400/30"
                whileHover="hover"
              >
                <motion.img 
                  src="/hero images/Project Management.jpg" 
                  alt="Project Management" 
                  className="object-cover w-full h-full rounded-lg"
                  variants={imageVariants}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Security Operations */}
          <motion.div 
            className="flex flex-col md:flex-row-reverse gap-12 items-center group"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div className="md:w-1/2" variants={itemVariants}>
              <motion.div 
                className="flex items-center gap-4 mb-6"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300"
                  whileHover={{ scale: 1.1 }}
                >
                  <svg className="h-8 w-8 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </motion.div>
                <motion.h3 
                  className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 group-hover:from-cyan-300 group-hover:to-blue-500 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Security Operations
                </motion.h3>
              </motion.div>
              <motion.p 
                className="text-gray-300 text-lg mb-6 group-hover:text-gray-200 transition-colors duration-300"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Comprehensive security operations management system that enables efficient SOC operations, 
                incident response, and security protocol implementation. Streamline your security operations 
                with advanced tools and automation.
              </motion.p>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">SOC Operations</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Streamlined security operations center management</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Incident Response</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Rapid and coordinated response to security incidents</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-cyan-300 transition-colors duration-300"></div>
                  <div>
                    <p className="font-medium">Security Protocols</p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Standardized procedures for security operations</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            <motion.div 
              className="md:w-1/2 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-2 shadow-xl backdrop-blur-md border border-cyan-900/30 transition-all duration-300 hover:shadow-cyan-500/20"
              variants={imageVariants}
            >
              <motion.div 
                className="aspect-video bg-gray-900/80 rounded-lg flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-cyan-400/30"
                whileHover="hover"
              >
                <motion.img 
                  src="/hero images/Security Operations.jpg" 
                  alt="Security Operations" 
                  className="object-cover w-full h-full rounded-lg"
                  variants={imageVariants}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Footer Section */}
      <motion.footer 
        className="bg-gray-900 border-t border-gray-800"
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                ATRACaaS
              </h3>
              <p className="text-gray-400 text-sm">
                Advanced Threat Response & Analysis Cloud as a Service Platform
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                Quick Links
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <a href="https://atracaas.cisoasaservice.io/docs" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="https://atracaas.cisoasaservice.io/api" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="https://atracaas.cisoasaservice.io/support" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                    Support
                  </a>
                </li>
                <li>
                  <a href="https://atracaas.cisoasaservice.io/blog" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                Resources
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <a href="https://atracaas.cisoasaservice.io/guides" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                    Security Guides
                  </a>
                </li>
                <li>
                  <a href="https://atracaas.cisoasaservice.io/case-studies" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                    Case Studies
                  </a>
                </li>
                <li>
                  <a href="https://atracaas.cisoasaservice.io/whitepapers" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                    Whitepapers
                  </a>
                </li>
                <li>
                  <a href="https://atracaas.cisoasaservice.io/webinars" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                    Webinars
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                Contact
              </h4>
              <ul className="mt-4 space-y-2">
                <li className="text-gray-400 text-sm">
                  support@cisoasaservice.io
                </li>
                <li className="text-gray-400 text-sm">
                  +63 (32) 123-4567
                </li>
                <li className="text-gray-400 text-sm">
                  Cebu City, Cebu<br />
                  Philippines 6000
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} ATRACaaS - Aegis View Platform. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="https://atracaas.cisoasaservice.io/privacy" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                  Privacy Policy
                </a>
                <a href="https://atracaas.cisoasaservice.io/terms" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                  Terms of Service
                </a>
                <a href="https://atracaas.cisoasaservice.io/security" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                  Security
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  )
}
