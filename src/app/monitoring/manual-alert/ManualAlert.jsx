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
        <div className="min-h-screen p-8 bg-gray-900 text-gray-100">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-mono">
                        Manual Alert Input
                    </h1>
                    <p className="text-gray-400 mt-3 text-lg font-mono">
                        Enter alert details below or paste JSON data to auto-fill
                    </p>
                </div>

                {/* JSON Paste Section */}
                <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg backdrop-blur-sm mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-200">Paste JSON Data</h2>
                            <p className="text-sm text-gray-400 mt-1">
                                Paste your JSON data below to automatically fill the form fields. The data will be converted to Philippines timezone.
                            </p>
                        </div>
                        <button
                            onClick={handleJsonPaste}
                            className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 
                                     border border-purple-500/30 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                                />
                            </svg>
                            Auto-fill Form
                        </button>
                    </div>
                    
                    <div className="space-y-4">
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
                                className="w-full h-64 px-4 py-3 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                         focus:outline-none focus:border-cyan-500 font-mono text-sm resize-y"
                                style={{ minHeight: '16rem' }}
                            />
                            <div className="absolute top-2 right-2 space-x-2">
                                <button
                                    onClick={() => setJsonInput('')}
                                    className="px-2 py-1 bg-gray-700/50 text-gray-400 rounded hover:bg-gray-700 
                                             transition-colors text-sm"
                                    title="Clear JSON"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg backdrop-blur-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Timestamp <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        name="timestamp"
                                        value={formData.timestamp}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
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
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Kill Chain Stage</label>
                                    <input
                                        type="text"
                                        name="killChainStage"
                                        value={formData.killChainStage}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
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
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
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
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
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
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500 cursor-not-allowed"
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
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                        required
                                    >
                                        <option value="To Be Confirmed">To Be Confirmed</option>
                                        <option value="True Positive">True Positive</option>
                                        <option value="False Positive">False Positive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Network Information */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Host</label>
                                    <input
                                        type="text"
                                        name="host"
                                        value={formData.host}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Host Name</label>
                                    <input
                                        type="text"
                                        name="hostname"
                                        value={formData.hostname}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Source IP</label>
                                    <input
                                        type="text"
                                        name="sourceIp"
                                        value={formData.sourceIp}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Source Type</label>
                                    <input
                                        type="text"
                                        name="sourceType"
                                        value={formData.sourceType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Source Country</label>
                                    <input
                                        type="text"
                                        name="sourceGeo.country"
                                        value={formData.sourceGeo.country}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Source City</label>
                                    <input
                                        type="text"
                                        name="sourceGeo.city"
                                        value={formData.sourceGeo.city}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>

                            {/* Destination Information */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Destination IP</label>
                                    <input
                                        type="text"
                                        name="destinationIp"
                                        value={formData.destinationIp}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Destination Type</label>
                                    <input
                                        type="text"
                                        name="destinationType"
                                        value={formData.destinationType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Destination Country</label>
                                    <input
                                        type="text"
                                        name="destinationGeo.country"
                                        value={formData.destinationGeo.country}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Destination City</label>
                                    <input
                                        type="text"
                                        name="destinationGeo.city"
                                        value={formData.destinationGeo.city}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>

                            {/* Description and Link */}
                            <div className="space-y-4 md:col-span-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows="4"
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Link <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="url"
                                        name="link"
                                        value={formData.link}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Remarks</label>
                                    <textarea
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleChange}
                                        rows="4"
                                        placeholder="Add any additional notes or remarks about this alert..."
                                        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 
                                                 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add AI Analysis Button */}
                    {/* <div className="flex justify-end gap-4 mb-6">
                        <button
                            onClick={handleAIAnalysis}
                            disabled={isAnalyzing || !formData.alertName}
                            className={`px-6 py-2.5 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 
                                     border border-purple-500/30 transition-colors flex items-center gap-2
                                     ${isAnalyzing || !formData.alertName ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-300"></div>
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    Analyze with AI
                                </>
                            )}
                        </button>
                    </div> */}

                    {/* Display Analysis Results */}
                    {/* {analysisResult && (
                        <div className="mb-6 bg-gray-800/50 p-6 rounded-lg shadow-lg backdrop-blur-sm">
                            <h3 className="text-xl font-semibold text-gray-200 mb-4">AI Analysis Results</h3>
                            <div className="space-y-6">
                                <div className="bg-gray-700/30 p-4 rounded-lg">
                                    <h4 className="text-lg font-medium text-cyan-300 mb-2">Risk Assessment</h4>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                                            analysisResult.riskAssessment.level === 'High' ? 'bg-red-500/20 text-red-300' :
                                            analysisResult.riskAssessment.level === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                            'bg-green-500/20 text-green-300'
                                        }`}>
                                            {analysisResult.riskAssessment.level}
                                        </span>
                                        <span className="text-sm text-gray-400">{analysisResult.riskAssessment.justification}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )} */}

                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => router.push('/monitoring/alerts')}
                            className="px-6 py-2.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 
                                     transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 
                                     border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed 
                                     transition-colors"
                        >
                            {loading ? 'Submitting...' : 'Submit Alert'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
} 