export const categories = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        <path className="animate-pulse" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 2L2 12h10V2z" />
      </svg>
    ),
    color: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30'
  },
  {
    id: 'attendance',
    name: 'Attendance System',
    icon: (
      <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <path className="animate-pulse" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3" />
      </svg>
    ),
    color: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30'
  },
  {
    id: 'security',
    name: 'Security Features',
    icon: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        <path className="animate-pulse" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 12v-2m0 0V8m0 2H8m4 0h4" />
      </svg>
    ),
    color: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30'
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    icon: (
      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        <path className="animate-pulse" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3" />
      </svg>
    ),
    color: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30'
  },
  {
    id: 'faq',
    name: 'FAQ',
    icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path className="animate-pulse" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3" />
      </svg>
    ),
    color: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30'
  }
];

export const helpContent = {
  'getting-started': [
    {
      title: 'Welcome to ATRA Platform',
      subtitle: 'Your Gateway to Digital Security',
      content: 'ATRA Platform is a cutting-edge security and attendance management system designed for the modern SOC analyst and team leader. Step into the future of security operations.',
      steps: [
        'Access your digital identity through secure authentication',
        'Navigate the neural network interface of your dashboard',
        'Configure your digital profile in the System Settings',
        'Initiate your daily security protocols through the attendance system'
      ],
      theme: 'cyberpunk',
      color: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30'
    },
    {
      title: 'Platform Overview',
      subtitle: 'Your Digital Command Center',
      content: 'ATRA Platform integrates multiple advanced modules to create a seamless security operations experience.',
      features: [
        'Neural Dashboard: Real-time security metrics and status visualization',
        'Security Matrix: Advanced monitoring of digital threats and incidents',
        'Time Protocol: Precision attendance tracking system',
        'Data Analytics: Advanced security metrics and pattern recognition',
        'Knowledge Base: Secure access to classified security databases',
        'System Config: Customize your digital workspace'
      ],
      theme: 'cyberpunk',
      color: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30'
    }
  ],
  'attendance': [
    {
      title: 'Time Protocol System',
      subtitle: 'Precision Time Tracking',
      content: 'The advanced attendance system ensures precise tracking of your security operations shifts.',
      steps: [
        'Select your operational shift (Alpha, Beta, or Gamma)',
        'Synchronize with the current time matrix',
        'Initiate your shift protocol',
        'Conclude your operational period',
        'Access your temporal records'
      ],
      theme: 'cyberpunk',
      color: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30'
    },
    {
      title: 'Time Protocol Features',
      subtitle: 'Advanced Temporal Management',
      content: 'Experience the future of attendance management:',
      features: [
        'Real-time temporal synchronization',
        'Shift-based operational tracking',
        'Historical temporal records',
        'Data export to secure formats',
        'Advanced temporal filtering',
        'Shift status visualization'
      ],
      theme: 'cyberpunk',
      color: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30'
    }
  ],
  'security': [
    {
      title: 'Security Matrix',
      subtitle: 'Advanced Protection Protocols',
      content: 'State-of-the-art security features for your digital operations.',
      features: [
        'Biometric authentication protocols',
        'Advanced session encryption',
        'Secure password algorithms',
        'Digital activity logging',
        'Role-based access matrix',
        'Quantum-secure data transmission'
      ],
      theme: 'cyberpunk',
      color: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'Security Protocols',
      subtitle: 'Digital Defense Guidelines',
      content: 'Maintain your digital security with these advanced protocols:',
      guidelines: [
        'Implement quantum-resistant passwords',
        'Activate biometric verification',
        'Monitor digital activity logs',
        'Update security protocols regularly',
        'Execute secure logout procedures',
        'Report anomalous activities'
      ],
      theme: 'cyberpunk',
      color: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30'
    }
  ],
  'troubleshooting': [
    {
      title: 'System Diagnostics',
      subtitle: 'Digital Issue Resolution',
      content: 'Advanced solutions for system anomalies:',
      issues: [
        {
          problem: 'Authentication failure',
          solution: 'Verify credentials and check biometric systems'
        },
        {
          problem: 'Time Protocol malfunction',
          solution: 'Check network synchronization and retry'
        },
        {
          problem: 'Data visualization error',
          solution: 'Clear cache and refresh neural interface'
        },
        {
          problem: 'Alert system desynchronization',
          solution: 'Verify network connection and refresh matrix'
        }
      ],
      theme: 'cyberpunk',
      color: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30'
    }
  ]
}; 