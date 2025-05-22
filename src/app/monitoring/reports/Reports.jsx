"use client"
import { useState, useEffect } from 'react'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { getReportData } from '@/services/management'
import { logger } from '@/utils/logger'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
)

export default function Reports() {
  const [tenant, setTenant] = useState('all')
  const [timeRange, setTimeRange] = useState('1D')
  const [showFullScreenChart, setShowFullScreenChart] = useState(null)
  const [fullScreenChartData, setFullScreenChartData] = useState(null)
  const [fullScreenChartTitle, setFullScreenChartTitle] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => {
    // Get current date in Philippine timezone
    const phDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    // Format it directly as YYYY-MM-DD
    const year = phDate.getFullYear()
    const month = String(phDate.getMonth() + 1).padStart(2, '0')
    const day = String(phDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [reportData, setReportData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get date range based on selected time range
  const getDateRange = () => {
    const today = new Date()
    
    switch (timeRange) {
      case '1D':
        // Convert selected date to Philippine timezone
        const phTime = new Date(new Date(selectedDate).toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
        // Set to start of day in Philippine timezone
        phTime.setHours(0, 0, 0, 0)
        // Convert to UTC
        const startDate = new Date(phTime.getTime() - (phTime.getTimezoneOffset() * 60000))
        // Add 24 hours for end date
        const endDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000))
        return {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      case '7D':
        const weekAgo = new Date()
        weekAgo.setDate(today.getDate() - 6)
        weekAgo.setHours(0, 0, 0, 0)
        today.setHours(23, 59, 59, 999)
        return {
          startDate: weekAgo.toISOString(),
          endDate: today.toISOString()
        }
      case '1M':
        const [year, month] = selectedMonth.split('-')
        const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
        return {
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString()
        }
      default:
        const defaultDate = new Date()
        defaultDate.setHours(0, 0, 0, 0)
        const defaultEnd = new Date()
        defaultEnd.setHours(23, 59, 59, 999)
        return {
          startDate: defaultDate.toISOString(),
          endDate: defaultEnd.toISOString()
        }
    }
  }

  // Fetch report data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const { startDate, endDate } = getDateRange()
        
        // Map display names to stored tenant names
        const mapTenantName = (displayName) => {
          switch (displayName) {
            case 'SiyCha Group of Companies': return 'SiyCha';
            case 'Project Chiron': return 'MWELL';
            case 'Project Hunt': return 'MPIW';
            case 'Project NIKI': return 'NIKI';
            case 'Project Atlas': return 'Cantilan';
            default: return displayName;
          }
        }

        const data = await getReportData({
          tenant: tenant === 'all' ? 'all' : mapTenantName(tenant),
          startDate,
          endDate,
          month: timeRange === '1M' ? selectedMonth : undefined
        })
        
        setReportData(data)
      } catch (error) {
        logger.error('Error fetching report data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [tenant, timeRange, selectedDate, selectedMonth])

  // Common chart options
  const commonOptions = {
    responsive: true,
    elements: {
      line: {
        tension: 0.1,
        borderWidth: 2,
        fill: false,
        cubicInterpolationMode: 'monotone'
      },
      point: {
        radius: 3,
        hitRadius: 10,
        hoverRadius: 5
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: { color: 'rgba(255, 255, 255, 0.8)' }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: { 
          color: 'rgba(255, 255, 255, 0.8)',
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
    plugins: {
      legend: {
        labels: { color: 'rgba(255, 255, 255, 0.8)' }
      },
      datalabels: {
        color: 'rgba(255, 255, 255, 0.8)',
        anchor: 'end',
        align: 'top',
        offset: 5,
        formatter: (value) => value.toLocaleString(),
        font: {
          weight: 'bold',
          size: 11
        },
        textStrokeColor: 'rgba(0, 0, 0, 0.5)',
        textStrokeWidth: 2,
        textShadowBlur: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }

  // Doughnut chart specific options
  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: 'rgba(255, 255, 255, 0.8)' }
      },
      datalabels: {
        color: 'rgba(255, 255, 255, 0.8)',
        formatter: (value) => value,
        font: {
          weight: 'bold',
          size: 14
        },
        textStrokeColor: 'rgba(0, 0, 0, 0.5)',
        textStrokeWidth: 2,
        textShadowBlur: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  }

  // Prepare chart data from reportData
  const threatData = reportData ? {
    labels: Object.keys(reportData.techniquesData).map(label => {
      // Keep full technique names
      return label.split(' ').filter(word => word.length > 0).join('\n')
    }),
    datasets: [
      {
        label: 'True Positive',
        data: Object.values(reportData.techniquesData).map(d => d.truePositive),
        backgroundColor: 'rgba(239, 68, 68, 0.9)', // Red
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        borderRadius: 8,
        stack: 'stack0',
        order: 1
      },
      {
        label: 'False Positive',
        data: Object.values(reportData.techniquesData).map(d => d.falsePositive),
        backgroundColor: 'rgba(16, 185, 129, 0.9)', // Green
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        borderRadius: 8,
        stack: 'stack0',
        order: 2
      },
      {
        label: 'To Be Confirmed',
        data: Object.values(reportData.techniquesData).map(d => d.toBeConfirmed),
        backgroundColor: 'rgba(245, 158, 11, 0.9)', // Yellow/Amber
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 2,
        borderRadius: 8,
        stack: 'stack0',
        order: 3
      }
    ]
  } : null

  // Enhanced options for threat detection chart
  const threatChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Make it a horizontal bar chart
    barPercentage: 0.8,
    categoryPercentage: 0.9,
    scales: {
      x: {
        stacked: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          tickColor: 'rgba(255, 255, 255, 0.2)'
        },
        ticks: { 
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      y: {
        stacked: true,
        grid: {
          display: false
        },
        ticks: { 
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 11,
            weight: 'bold'
          },
          autoSkip: false,
          padding: 10
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { 
          color: 'rgba(255, 255, 255, 0.8)',
          padding: 20,
          font: {
            size: 13,
            weight: 'bold'
          },
          usePointStyle: true,
          pointStyle: 'rectRounded'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 15,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        displayColors: true,
        callbacks: {
          title: function(context) {
            return context[0].label.replace('\n', ' ');
          },
          label: function(context) {
            let total = 0;
            context.chart.data.datasets.forEach((dataset) => {
              total += dataset.data[context.dataIndex] || 0;
            });
            const percentage = ((context.parsed.x / total) * 100).toFixed(1);
            return `${context.dataset.label}: ${context.parsed.x} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        display: function(context) {
          return context.dataset.data[context.dataIndex] > 0;
        },
        color: 'white',
        anchor: 'center',
        align: 'center',
        font: {
          weight: 'bold',
          size: 12
        },
        formatter: (value, context) => {
          if (value === 0) return '';
          const total = context.chart.data.datasets.reduce((sum, dataset) => 
            sum + (dataset.data[context.dataIndex] || 0), 0
          );
          const percentage = ((value / total) * 100).toFixed(0);
          return percentage > 10 ? `${value}\n(${percentage}%)` : '';
        },
        textStrokeColor: 'rgba(0, 0, 0, 0.75)',
        textStrokeWidth: 3,
        textShadowBlur: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.75)'
      }
    }
  }

  const xdrAnomalyData = reportData ? {
    labels: Object.keys(reportData.techniquesData),
    datasets: [
      {
        label: 'Total Incidents',
        data: Object.values(reportData.techniquesData).map(d => 
          d.truePositive + d.falsePositive + d.toBeConfirmed
        ),
        backgroundColor: [
          'rgba(147, 51, 234, 0.6)',  // Purple
          'rgba(59, 130, 246, 0.6)',  // Blue
          'rgba(16, 185, 129, 0.6)',  // Green
          'rgba(245, 158, 11, 0.6)',  // Orange
          'rgba(239, 68, 68, 0.6)',   // Red
          'rgba(107, 114, 128, 0.6)', // Gray
          'rgba(236, 72, 153, 0.6)',  // Pink
          'rgba(168, 85, 247, 0.6)'   // Purple
        ],
        borderColor: [
          'rgba(147, 51, 234, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(107, 114, 128, 1)',
          'rgba(236, 72, 153, 1)',
          'rgba(168, 85, 247, 1)'
        ],
        borderWidth: 1,
      },
    ],
  } : null

  const totalMetricsData = reportData ? {
    labels: [
      'Total Malicious Traffic',
      'Total Malicious Domains'
    ],
    datasets: [
      {
        label: 'Count',
        data: [
          reportData.maliciousActivity?.totalMaliciousTraffic || 0,
          reportData.maliciousActivity?.totalMaliciousDomains || 0
        ],
        backgroundColor: [
          'rgba(147, 51, 234, 0.6)',   // Purple
          'rgba(245, 158, 11, 0.6)'     // Orange
        ],
        borderColor: [
          'rgba(147, 51, 234, 1)',
          'rgba(245, 158, 11, 1)'
        ],
        borderWidth: 1,
      },
    ],
  } : null

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-gray-100">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-cyan-400">Security Incident Reports</h1>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <select 
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className="bg-gray-800 text-gray-100 p-2 rounded-md border border-gray-700"
          >
            <option value="all">All Projects</option>
            <option value="Project Chiron">Project Chiron</option>
            <option value="SiyCha Group of Companies">Project Orion</option>
            <option value="Project Hunt">Project Hunt</option>
            <option value="Project NIKI">Project NIKI</option>
            <option value="Project Atlas">Project Atlas</option>
          </select>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-800 text-gray-100 p-2 rounded-md border border-gray-700"
          >
            <option value="1D">Daily View</option>
            <option value="7D">Weekly View</option>
            <option value="1M">Monthly View</option>
          </select>

          {timeRange === '1D' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-800 text-gray-100 p-2 rounded-md border border-gray-700"
            />
          )}

          {timeRange === '1M' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-gray-800 text-gray-100 p-2 rounded-md border border-gray-700"
            />
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-cyan-400"></div>
          </div>
        ) : (
          <>
            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-6 rounded-xl border border-cyan-500/30 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-500/20 rounded-full">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-mono text-cyan-400">Total Incidents</h3>
                    <p className="text-2xl font-bold text-white">{reportData?.summaryStats.totalIncidents || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500/20 to-rose-500/20 p-6 rounded-xl border border-red-500/30 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-mono text-red-400">True Positives</h3>
                    <p className="text-2xl font-bold text-white">{reportData?.summaryStats.truePositives || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 rounded-xl border border-green-500/30 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-mono text-green-400">False Positives</h3>
                    <p className="text-2xl font-bold text-white">{reportData?.summaryStats.falsePositives || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 p-6 rounded-xl border border-yellow-500/30 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500/20 rounded-full">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-mono text-yellow-400">To Be Confirmed</h3>
                    <p className="text-2xl font-bold text-white">{reportData?.summaryStats.toBeConfirmed || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-8">
              {/* Threat Detection Chart */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-lg backdrop-blur-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-cyan-400">
                    Threat Detection Overview
                    {timeRange === '1D' && ` - ${new Date(selectedDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}`}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-400">
                      {reportData?.summaryStats?.totalIncidents || 0} Total Incidents
                    </div>
                    <button
                      onClick={() => {
                        setFullScreenChartData(threatData)
                        setFullScreenChartTitle('Threat Detection Overview')
                        setShowFullScreenChart(true)
                      }}
                      className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                      title="View Full Screen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 111.414 1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="h-[600px]">
                  {threatData && <Bar data={threatData} options={threatChartOptions} />}
                </div>
              </div>

              {/* XDR Anomalies Chart */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-lg backdrop-blur-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-cyan-400">
                    XDR Anomalies Distribution
                    {timeRange === '1D' && ` - ${new Date(selectedDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}`}
                  </h2>
                  <button
                    onClick={() => {
                      setFullScreenChartData(xdrAnomalyData)
                      setFullScreenChartTitle('XDR Anomalies Distribution')
                      setShowFullScreenChart(true)
                    }}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                    title="View Full Screen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 111.414 1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="h-[400px] flex justify-center items-center">
                  {xdrAnomalyData && Object.values(xdrAnomalyData.datasets[0].data).some(value => value > 0) ? (
                    <Doughnut data={xdrAnomalyData} options={doughnutOptions} />
                  ) : (
                    <div className="text-4xl font-bold text-gray-400">0</div>
                  )}
                </div>
              </div>

              {/* Total Metrics Chart */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-lg backdrop-blur-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-cyan-400">
                    Total Malicious Activity
                    {timeRange === '1D' && ` - ${new Date(selectedDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}`}
                  </h2>
                  <button
                    onClick={() => {
                      setFullScreenChartData(totalMetricsData)
                      setFullScreenChartTitle('Total Malicious Activity')
                      setShowFullScreenChart(true)
                    }}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                    title="View Full Screen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 111.414 1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="h-[400px] flex justify-center">
                  {totalMetricsData && <Bar data={totalMetricsData} options={commonOptions} />}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Full Screen Chart Modal */}
      {showFullScreenChart && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full h-full max-w-[90vw] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-cyan-400">{fullScreenChartTitle}</h2>
              <button
                onClick={() => setShowFullScreenChart(false)}
                className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {fullScreenChartData && (
                <>
                  {fullScreenChartTitle === 'Threat Detection Overview' && (
                    <Bar 
                      data={fullScreenChartData} 
                      options={{
                        ...threatChartOptions,
                        maintainAspectRatio: false,
                        plugins: {
                          ...threatChartOptions.plugins,
                          datalabels: {
                            ...threatChartOptions.plugins.datalabels,
                            font: {
                              ...threatChartOptions.plugins.datalabels.font,
                              size: 14
                            }
                          }
                        }
                      }} 
                    />
                  )}
                  {fullScreenChartTitle === 'XDR Anomalies Distribution' && (
                    <Doughnut 
                      data={fullScreenChartData} 
                      options={{
                        ...doughnutOptions,
                        maintainAspectRatio: false,
                        plugins: {
                          ...doughnutOptions.plugins,
                          datalabels: {
                            ...doughnutOptions.plugins.datalabels,
                            font: {
                              ...doughnutOptions.plugins.datalabels.font,
                              size: 16
                            }
                          }
                        }
                      }} 
                    />
                  )}
                  {fullScreenChartTitle === 'Total Malicious Activity' && (
                    <Bar 
                      data={fullScreenChartData} 
                      options={{
                        ...commonOptions,
                        maintainAspectRatio: false,
                        plugins: {
                          ...commonOptions.plugins,
                          datalabels: {
                            ...commonOptions.plugins.datalabels,
                            font: {
                              ...commonOptions.plugins.datalabels.font,
                              size: 14
                            }
                          }
                        }
                      }} 
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
