'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { saveAlert } from '@/services/management'
import { getBlockedEntries } from '@/services/management'
import { checkIPReputation } from '@/services/virustotal'
import { logger } from '@/utils/logger'
import { analyzeAlertWithGPT } from '@/services/chatgpt'

// Add project mapping constant
const PROJECT_MAPPING = {
    'NIKI': 'Project NIKI',
    'MWELL': 'Project Chiron',
    'MPIW': 'Project Hunt',
    'SiyCha Group of Companies': 'Project Orion',
    'Cantilan': 'Project Atlas'
};

// Function to get project display name
const getProjectDisplayName = (tenant) => {
    return PROJECT_MAPPING[tenant] || tenant;
};

export default function ManualAlert() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [jsonInput, setJsonInput] = useState('')
    const [formData, setFormData] = useState({
        timestamp: new Date().toLocaleString('en-US', { 
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2T$4:$5'),
        tenant: '',
        killChainStage: '',
        alertName: '',
        technique: '',
        category: '',
        status: 'Closed',
        verificationStatus: 'To Be Confirmed',
        remarks: '',
        hostname: '',
        host: '',
        sourceIp: '',
        sourceType: '',
        sourceGeo: {
            country: '',
            city: ''
        },
        destinationIp: '',
        destinationType: '',
        destinationGeo: {
            country: '',
            city: ''
        },
        description: '',
        link: ''
    })
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState(null)

    const checkIfIPIsBlocked = async (ip, tenant) => {
        try {
            const entries = await getBlockedEntries({ type: 'IP', status: 'ALL', tenant: tenant })
            const entry = entries.find(entry => entry.value === ip)
            return {
                exists: !!entry,
                isBlocked: entry?.blocked || false
            }
        } catch (error) {
            logger.error('Error checking blocked IPs:', error)
            return { exists: false, isBlocked: false }
        }
    }

    const handleJsonPaste = async () => {
        try {
            const jsonData = JSON.parse(jsonInput)
            
            // Convert timestamp to Philippines timezone
            const timestamp = jsonData.timestamp_utc ? 
                new Date(jsonData.timestamp_utc).toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2T$4:$5')
                : formData.timestamp

            // Get tenant/project name
            const tenant = jsonData.tenant_name ? 
                (jsonData.tenant_name.includes('Cantilan') ? jsonData.tenant_name.split(' ')[0] : jsonData.tenant_name) 
                : (jsonData.tenant ? 
                    (jsonData.tenant.includes('Cantilan') ? jsonData.tenant.split(' ')[0] : jsonData.tenant) 
                    : formData.tenant)

            // Get project display name
            const projectName = getProjectDisplayName(tenant)

            // Get alert name
            const alertName = jsonData.xdr_event?.display_name || jsonData.alertName || formData.alertName

            // Define specific alert names that trigger IP checking
            const specificAlerts = [
                'ESET Protect (Firewall Aggregated Event): Security vulnerability exploitation attempt',
                'Scanner Reputation Anomaly',
                'Internal User Login Failure Anomaly',
                'External User Login Failure Anomaly',
                'External IP / Port Scan Anomaly',
                'External Handshake Failure',
                'External SYN Flood Attacker',
                'External Account Login Failure Anomaly',
                'Public to Private Exploit Anomaly',
                'External Firewall Denial Anomaly'
                
            ]

            // Check if source IP is blocked
            const sourceIp = jsonData.srcip || jsonData.sourceIp || formData.sourceIp
            let remarks = jsonData.remarks || formData.remarks

            // Check for Trend Micro and 0.0 Bytes in any field
            const hasTrendMicro = Object.values(jsonData).some(value => {
                if (typeof value === 'string') {
                    return value.toLowerCase().includes('trend micro');
                }
                if (typeof value === 'object' && value !== null) {
                    return Object.values(value).some(subValue => 
                        typeof subValue === 'string' && subValue.toLowerCase().includes('trend micro')
                    );
                }
                return false;
            });

            const hasCleanedByDeleting = Object.values(jsonData).some(value => {
                if (typeof value === 'string') {
                    return value.includes('Cleaned by deleting');
                }
                if (typeof value === 'object' && value !== null) {
                    return Object.values(value).some(subValue => 
                        typeof subValue === 'string' && subValue.includes('Cleaned by deleting')
                    );
                }
                return false;
            });

            const hasZeroBytes = Object.values(jsonData).some(value => {
                if (typeof value === 'string') {
                    return value.includes('0.0 Bytes');
                }
                if (typeof value === 'object' && value !== null) {
                    return Object.values(value).some(subValue => 
                        typeof subValue === 'string' && subValue.includes('0.0 Bytes')
                    );
                }
                return false;
            });

            // Check for 0.0 bytes first
            if (hasZeroBytes) {
                remarks = 'The activity was a normal behavior.';
            }
            // Then check for Trend Micro
            else if (hasTrendMicro) {
                remarks = 'This detection is already dropped as it is associated with Trend Micro.';
            }
            // Then check for Cleaned by deleting
            else if (hasCleanedByDeleting) {
                remarks = 'Cleaned by deleting';
            }
            // Only apply IP checking logic for specific alert names if none of the above conditions are met
            else if (sourceIp && specificAlerts.includes(alertName) && !remarks) {
                const { exists, isBlocked } = await checkIfIPIsBlocked(sourceIp, tenant)

                if (exists) {
                    if (isBlocked) {
                        remarks = 'The source IP was already blocked.'
                    } else {
                        remarks = 'The source IP exists in the list but is not blocked. Request for blocking sent to ' + projectName
                    }
                } else {
                    // Check IP reputation with VirusTotal if not in blocked list
                    const vtResult = await checkIPReputation(sourceIp)
                    if (vtResult.success) {
                        if (vtResult.malicious > 0) {
                            remarks = `The source IP was not found in the blocked list but was detected as malicious by ${vtResult.malicious} security vendors. Request for blocking sent to ${projectName}`
                        } else {
                            remarks = 'The source IP was not found in the blocked list and was not detected as malicious.'
                        }
                    } else {
                        remarks = 'The source IP was not found in the blocked list. Could not verify reputation due to an error.'
                    }
                }
            }

            // Extract data from the JSON, keeping existing values if not present in JSON
            const extractedData = {
                timestamp: timestamp,
                tenant: tenant,
                killChainStage: jsonData.xdr_event?.xdr_killchain_stage || jsonData.killChainStage || formData.killChainStage,
                alertName: jsonData.xdr_event?.display_name || jsonData.alertName || formData.alertName,
                technique: jsonData.xdr_event?.technique?.name || jsonData.technique || formData.technique,
                category: jsonData.event_category || jsonData.category || formData.category,
                status: jsonData.event_status || jsonData.status || formData.status,
                verificationStatus: jsonData.verificationStatus || formData.verificationStatus,
                remarks: remarks,
                hostname: jsonData.host?.name || formData.hostname,
                host: jsonData.hostip || jsonData.host?.ip || formData.host,
                sourceIp: sourceIp,
                sourceType: jsonData.srcip_type || jsonData.sourceType || formData.sourceType,
                sourceGeo: {
                    country: jsonData.srcip_geo?.countryCode || jsonData.srcip_geo?.countryName || jsonData.sourceGeo?.country || formData.sourceGeo.country,
                    city: jsonData.srcip_geo?.city || jsonData.sourceGeo?.city || formData.sourceGeo.city
                },
                destinationIp: jsonData.dstip || jsonData.destinationIp || formData.destinationIp,
                destinationType: jsonData.dstip_type || jsonData.destinationType || formData.destinationType,
                destinationGeo: {
                    country: jsonData.dstip_geo?.countryCode || jsonData.dstip_geo?.countryName || jsonData.destinationGeo?.country || formData.destinationGeo.country,
                    city: jsonData.dstip_geo?.city || jsonData.destinationGeo?.city || formData.destinationGeo.city
                },
                description: jsonData.xdr_event?.description || jsonData.description || formData.description,
                link: jsonData.link || formData.link
            }

            setFormData(extractedData)
            toast.success('Form populated from JSON data')
        } catch (error) {
            logger.error('Error parsing JSON:', error)
            toast.error('Invalid JSON format')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Validate required fields
            const requiredFields = ['timestamp', 'alertName', 'status', 'link']
            const missingFields = requiredFields.filter(field => !formData[field])
            
            if (missingFields.length > 0) {
                toast.error(`Please fill in required fields: ${missingFields.join(', ')}`)
                setLoading(false)
                return
            }

            // Create a Date object from the form input
            const timestamp = new Date(formData.timestamp)

            // Prepare alert data with proper field handling
            const alertData = {
                timestamp: timestamp,
                tenant: formData.tenant || '',
                killChainStage: formData.killChainStage || '',
                alertName: formData.alertName,
                technique: formData.technique || '',
                category: formData.category || '',
                status: formData.status,
                verificationStatus: formData.verificationStatus,
                remarks: formData.remarks,
                hostname: formData.hostname || '',
                host: formData.host || '',
                sourceIp: formData.sourceIp || '',
                sourceType: formData.sourceType || '',
                sourceGeo: {
                    country: formData.sourceGeo?.country || '',
                    city: formData.sourceGeo?.city || ''
                },
                destinationIp: formData.destinationIp || '',
                destinationType: formData.destinationType || '',
                destinationGeo: {
                    country: formData.destinationGeo?.country || '',
                    city: formData.destinationGeo?.city || ''
                },
                description: formData.description || '',
                link: formData.link || ''
            }
            
            logger.info('Saving alert:', alertData)
            
            // Save the alert to Firebase
            const result = await saveAlert(alertData)
            
            if (result.success) {
                toast.success('Alert submitted successfully')
                router.push('/monitoring/alerts')
            } else {
                toast.error(result.error || 'Failed to submit alert')
            }
        } catch (error) {
            logger.error('Error submitting alert:', error)
            toast.error('Failed to submit alert')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        if (name === 'timestamp') {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }))
            return
        }

        if (name.includes('.')) {
            const [parent, child] = name.split('.')
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }))
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }))
        }
    }

    // Add new function to handle AI analysis
    const handleAIAnalysis = async () => {
        setIsAnalyzing(true)
        try {
            console.log('[ManualAlert] Starting AI analysis with data:', formData)
            const result = await analyzeAlertWithGPT(formData)
            if (result.success) {
                console.log('[ManualAlert] AI analysis successful:', result.analysis)
                setAnalysisResult(result.analysis)
                // Update remarks with AI analysis
                setFormData(prev => ({
                    ...prev,
                    remarks: `AI Analysis:\nRisk Assessment: ${result.analysis.riskAssessment.level}\nThreat Type: ${result.analysis.threatType.type}\n\nRecommendations:\n${result.analysis.recommendations.immediateActions.join('\n')}\n\nAnalysis Summary:\n${result.analysis.analysisSummary}\n\nConfidence Level: ${result.analysis.confidence}%`
                }))
                toast.success('AI analysis completed')
            } else {
                console.error('[ManualAlert] AI analysis failed:', result.error)
                toast.error(result.error || 'Failed to analyze alert with AI')
            }
        } catch (error) {
            console.error('[ManualAlert] Error in AI analysis:', error)
            toast.error(error.message || 'Error during AI analysis')
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent font-mono mb-3">
                        Manual Alert Input
                    </h1>
                    <p className="text-gray-400 text-lg font-mono max-w-2xl mx-auto">
                        Enter alert details below or paste JSON data to auto-fill the form
                    </p>
                </div>

                {/* JSON Paste Section */}
                <div className="bg-gray-800/50 p-6 rounded-xl shadow-2xl backdrop-blur-sm mb-8 border border-gray-700/50">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-200 flex items-center gap-2">
                                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Paste JSON Data
                            </h2>
                            <p className="text-sm text-gray-400 mt-1">
                                Paste your JSON data below to automatically fill the form fields
                            </p>
                        </div>
                        <button
                            onClick={handleJsonPaste}
                            className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 
                                     border border-purple-500/30 transition-all duration-200 flex items-center gap-2
                                     hover:scale-105 active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Auto-fill Form
                        </button>
                    </div>
                    
                    <div className="relative">
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder="Example:
{
    &quot;timestamp_utc&quot;: &quot;2024-03-23T10:30:00Z&quot;,
    &quot;tenant_name&quot;: &quot;Example Corp&quot;,
    &quot;alertName&quot;: &quot;Suspicious Activity&quot;,
    &quot;status&quot;: &quot;New&quot;,
    &quot;sourceIp&quot;: &quot;192.168.1.1&quot;,
    &quot;destinationIp&quot;: &quot;10.0.0.1&quot;,
    &quot;description&quot;: &quot;Detected unusual network activity&quot;
}"
                            className="w-full h-64 px-4 py-3 bg-gray-800/80 rounded-lg border border-gray-700/50 text-gray-200 
                                     focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 
                                     font-mono text-sm resize-y transition-all duration-200"
                            style={{ minHeight: '16rem' }}
                        />
                        <div className="absolute top-2 right-2 space-x-2">
                            <button
                                onClick={() => setJsonInput('')}
                                className="px-2 py-1 bg-gray-700/50 text-gray-400 rounded hover:bg-gray-700 
                                         transition-all duration-200 text-sm hover:text-gray-200"
                                title="Clear JSON"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Form Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Basic Information Section */}
                        <div className="bg-gray-800/50 p-6 rounded-xl shadow-2xl backdrop-blur-sm border border-gray-700/50">
                            <h3 className="text-xl font-semibold text-gray-200 mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Basic Information
                            </h3>
                            <div className="space-y-4">
                                {/* Basic Information Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Timestamp <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            name="timestamp"
                                            value={formData.timestamp}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                     text-gray-200 focus:outline-none focus:border-cyan-500/50 
                                                     focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Tenant</label>
                                        <input
                                            type="text"
                                            name="tenant"
                                            value={formData.tenant}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                     text-gray-200 focus:outline-none focus:border-cyan-500/50 
                                                     focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Kill Chain Stage</label>
                                        <input
                                            type="text"
                                            name="killChainStage"
                                            value={formData.killChainStage}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                     text-gray-200 focus:outline-none focus:border-cyan-500/50 
                                                     focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Alert Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="alertName"
                                            value={formData.alertName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                     text-gray-200 focus:outline-none focus:border-cyan-500/50 
                                                     focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Technique</label>
                                        <input
                                            type="text"
                                            name="technique"
                                            value={formData.technique}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                     text-gray-200 focus:outline-none focus:border-cyan-500/50 
                                                     focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                                        <input
                                            type="text"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                     text-gray-200 focus:outline-none focus:border-cyan-500/50 
                                                     focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Status <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="status"
                                            value="Closed"
                                            readOnly
                                            className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                     text-gray-200 cursor-not-allowed opacity-75"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Verification Status <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="verificationStatus"
                                            value={formData.verificationStatus}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                     text-gray-200 focus:outline-none focus:border-cyan-500/50 
                                                     focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                                            required
                                        >
                                            <option value="To Be Confirmed">To Be Confirmed</option>
                                            <option value="True Positive">True Positive</option>
                                            <option value="False Positive">False Positive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Network Information Section */}
                        <div className="bg-gray-800/50 p-6 rounded-xl shadow-2xl backdrop-blur-sm border border-gray-700/50">
                            <h3 className="text-xl font-semibold text-gray-200 mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Network Information
                            </h3>
                            <div className="space-y-4">
                                {/* Host Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Host</label>
                                        <input
                                            type="text"
                                            name="host"
                                            value={formData.host}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                     text-gray-200 focus:outline-none focus:border-blue-500/50 
                                                     focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Host Name</label>
                                        <input
                                            type="text"
                                            name="hostname"
                                            value={formData.hostname}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                     text-gray-200 focus:outline-none focus:border-blue-500/50 
                                                     focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Source Information */}
                                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/30">
                                    <h4 className="text-sm font-medium text-gray-300 mb-3">Source Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Source IP</label>
                                            <input
                                                type="text"
                                                name="sourceIp"
                                                value={formData.sourceIp}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                         text-gray-200 focus:outline-none focus:border-blue-500/50 
                                                         focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Source Type</label>
                                            <input
                                                type="text"
                                                name="sourceType"
                                                value={formData.sourceType}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                         text-gray-200 focus:outline-none focus:border-blue-500/50 
                                                         focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Source Country</label>
                                            <input
                                                type="text"
                                                name="sourceGeo.country"
                                                value={formData.sourceGeo.country}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                         text-gray-200 focus:outline-none focus:border-blue-500/50 
                                                         focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Source City</label>
                                            <input
                                                type="text"
                                                name="sourceGeo.city"
                                                value={formData.sourceGeo.city}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                         text-gray-200 focus:outline-none focus:border-blue-500/50 
                                                         focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Destination Information */}
                                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/30">
                                    <h4 className="text-sm font-medium text-gray-300 mb-3">Destination Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Destination IP</label>
                                            <input
                                                type="text"
                                                name="destinationIp"
                                                value={formData.destinationIp}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                         text-gray-200 focus:outline-none focus:border-blue-500/50 
                                                         focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Destination Type</label>
                                            <input
                                                type="text"
                                                name="destinationType"
                                                value={formData.destinationType}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                         text-gray-200 focus:outline-none focus:border-blue-500/50 
                                                         focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Destination Country</label>
                                            <input
                                                type="text"
                                                name="destinationGeo.country"
                                                value={formData.destinationGeo.country}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                         text-gray-200 focus:outline-none focus:border-blue-500/50 
                                                         focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Destination City</label>
                                            <input
                                                type="text"
                                                name="destinationGeo.city"
                                                value={formData.destinationGeo.city}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                                         text-gray-200 focus:outline-none focus:border-blue-500/50 
                                                         focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description and Remarks Section */}
                    <div className="bg-gray-800/50 p-6 rounded-xl shadow-2xl backdrop-blur-sm border border-gray-700/50">
                        <h3 className="text-xl font-semibold text-gray-200 mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Additional Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                             text-gray-200 focus:outline-none focus:border-purple-500/50 
                                             focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Remarks</label>
                                <textarea
                                    name="remarks"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Add any additional notes or remarks about this alert..."
                                    className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                             text-gray-200 focus:outline-none focus:border-purple-500/50 
                                             focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Link <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    name="link"
                                    value={formData.link}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-800/80 rounded-lg border border-gray-700/50 
                                             text-gray-200 focus:outline-none focus:border-purple-500/50 
                                             focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 mt-8">
                        <button
                            type="button"
                            onClick={() => router.push('/monitoring/alerts')}
                            className="px-6 py-2.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 
                                     transition-all duration-200 hover:scale-105 active:scale-95
                                     border border-gray-600/50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 
                                     rounded-lg hover:from-cyan-500/30 hover:to-blue-500/30
                                     border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed 
                                     transition-all duration-200 hover:scale-105 active:scale-95
                                     flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-cyan-300"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Submit Alert
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
} 