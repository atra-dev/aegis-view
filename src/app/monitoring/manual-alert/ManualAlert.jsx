'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { saveAlert } from '@/services/management'
import { getBlockedEntries } from '@/services/management'
import { checkIPReputation } from '@/services/virustotal'
import { logger } from '@/utils/logger'
import { analyzeAlertWithGPT } from '@/services/chatgpt'
import { 
    GB, US, CA, AU, NZ, JP, KR, CN, IN, SG, MY, ID, PH, TH, VN,
    AF, AL, DZ, AD, AO, AG, AR, AM, AT, AZ, BS, BH, BD, BB, BY, BE, BZ, BJ, BT, BO, BA, BW, BR, BN, BG, BF, BI, KH, CM, CV, CF, TD, CL, CO, KM, CG, CR, HR, CU, CY, CZ, DK, DJ, DM, DO, EC, EG, SV, GQ, ER, EE, ET, FJ, FI, FR, GA, GM, GE, DE, GH, GR, GD, GT, GN, GW, GY, HT, HN, HU, IS, IL, IT, JM, JO, KZ, KE, KI, KP, KW, KG, LA, LV, LB, LS, LR, LY, LI, LT, LU, MG, MW, MV, ML, MT, MH, MR, MU, MX, FM, MD, MC, MN, ME, MA, MZ, MM, NA, NR, NP, NL, NI, NE, NG, NO, OM, PK, PW, PA, PG, PY, PE, PL, PT, QA, RO, RU, RW, KN, LC, VC, WS, SM, ST, SA, SN, RS, SC, SL, SB, SO, ZA, SS, ES, LK, SD, SR, SZ, SE, CH, SY, TW, TJ, TZ, TL, TO, TT, TN, TR, TM, TV, UG, UA, AE, UY, UZ, VU, VA, VE, YE, ZM, ZW
} from 'country-flag-icons/react/3x2'

// Add project mapping constant
const PROJECT_MAPPING = {
    'NIKI': 'Project NIKI',
    'MWELL': 'Project Chiron',
    'MPIW': 'Project Hunt',
    'SiyCha Group of Companies': 'Project Orion',
    'Cantilan': 'Project Atlas'
};

// Add country code to flag mapping
const COUNTRY_FLAGS = {
    'GB': GB, 'US': US, 'CA': CA, 'AU': AU, 'NZ': NZ, 'JP': JP, 'KR': KR, 'CN': CN, 'IN': IN, 'SG': SG, 'MY': MY, 'ID': ID, 'PH': PH, 'TH': TH, 'VN': VN,
    'AF': AF, 'AL': AL, 'DZ': DZ, 'AD': AD, 'AO': AO, 'AG': AG, 'AR': AR, 'AM': AM, 'AT': AT, 'AZ': AZ, 'BS': BS, 'BH': BH, 'BD': BD, 'BB': BB, 'BY': BY,
    'BE': BE, 'BZ': BZ, 'BJ': BJ, 'BT': BT, 'BO': BO, 'BA': BA, 'BW': BW, 'BR': BR, 'BN': BN, 'BG': BG, 'BF': BF, 'BI': BI, 'KH': KH, 'CM': CM, 'CV': CV,
    'CF': CF, 'TD': TD, 'CL': CL, 'CO': CO, 'KM': KM, 'CG': CG, 'CR': CR, 'HR': HR, 'CU': CU, 'CY': CY, 'CZ': CZ, 'DK': DK, 'DJ': DJ, 'DM': DM, 'DO': DO,
    'EC': EC, 'EG': EG, 'SV': SV, 'GQ': GQ, 'ER': ER, 'EE': EE, 'ET': ET, 'FJ': FJ, 'FI': FI, 'FR': FR, 'GA': GA, 'GM': GM, 'GE': GE, 'DE': DE, 'GH': GH,
    'GR': GR, 'GD': GD, 'GT': GT, 'GN': GN, 'GW': GW, 'GY': GY, 'HT': HT, 'HN': HN, 'HU': HU, 'IS': IS, 'IL': IL, 'IT': IT, 'JM': JM, 'JO': JO, 'KZ': KZ,
    'KE': KE, 'KI': KI, 'KP': KP, 'KW': KW, 'KG': KG, 'LA': LA, 'LV': LV, 'LB': LB, 'LS': LS, 'LR': LR, 'LY': LY, 'LI': LI, 'LT': LT, 'LU': LU, 'MG': MG,
    'MW': MW, 'MV': MV, 'ML': ML, 'MT': MT, 'MH': MH, 'MR': MR, 'MU': MU, 'MX': MX, 'FM': FM, 'MD': MD, 'MC': MC, 'MN': MN, 'ME': ME, 'MA': MA, 'MZ': MZ,
    'MM': MM, 'NA': NA, 'NR': NR, 'NP': NP, 'NL': NL, 'NI': NI, 'NE': NE, 'NG': NG, 'NO': NO, 'OM': OM, 'PK': PK, 'PW': PW, 'PA': PA, 'PG': PG, 'PY': PY,
    'PE': PE, 'PL': PL, 'PT': PT, 'QA': QA, 'RO': RO, 'RU': RU, 'RW': RW, 'KN': KN, 'LC': LC, 'VC': VC, 'WS': WS, 'SM': SM, 'ST': ST, 'SA': SA, 'SN': SN,
    'RS': RS, 'SC': SC, 'SL': SL, 'SB': SB, 'SO': SO, 'ZA': ZA, 'SS': SS, 'ES': ES, 'LK': LK, 'SD': SD, 'SR': SR, 'SZ': SZ, 'SE': SE, 'CH': CH, 'SY': SY,
    'TW': TW, 'TJ': TJ, 'TZ': TZ, 'TL': TL, 'TO': TO, 'TT': TT, 'TN': TN, 'TR': TR, 'TM': TM, 'TV': TV, 'UG': UG, 'UA': UA, 'AE': AE, 'UY': UY, 'UZ': UZ,
    'VU': VU, 'VA': VA, 'VE': VE, 'YE': YE, 'ZM': ZM, 'ZW': ZW
}

// Function to get project display name
const getProjectDisplayName = (tenant) => {
    return PROJECT_MAPPING[tenant] || tenant;
};

// Function to get country code from country name
const getCountryCode = (countryName) => {
    const countryMap = {
        'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Andorra': 'AD', 'Angola': 'AO', 'Antigua and Barbuda': 'AG',
        'Argentina': 'AR', 'Armenia': 'AM', 'Australia': 'AU', 'Austria': 'AT', 'Azerbaijan': 'AZ', 'Bahamas': 'BS',
        'Bahrain': 'BH', 'Bangladesh': 'BD', 'Barbados': 'BB', 'Belarus': 'BY', 'Belgium': 'BE', 'Belize': 'BZ',
        'Benin': 'BJ', 'Bhutan': 'BT', 'Bolivia': 'BO', 'Bosnia and Herzegovina': 'BA', 'Botswana': 'BW', 'Brazil': 'BR',
        'Brunei': 'BN', 'Bulgaria': 'BG', 'Burkina Faso': 'BF', 'Burundi': 'BI', 'Cambodia': 'KH', 'Cameroon': 'CM',
        'Canada': 'CA', 'Cape Verde': 'CV', 'Central African Republic': 'CF', 'Chad': 'TD', 'Chile': 'CL', 'China': 'CN',
        'Colombia': 'CO', 'Comoros': 'KM', 'Congo': 'CG', 'Costa Rica': 'CR', 'Croatia': 'HR', 'Cuba': 'CU',
        'Cyprus': 'CY', 'Czech Republic': 'CZ', 'Denmark': 'DK', 'Djibouti': 'DJ', 'Dominica': 'DM', 'Dominican Republic': 'DO',
        'Ecuador': 'EC', 'Egypt': 'EG', 'El Salvador': 'SV', 'Equatorial Guinea': 'GQ', 'Eritrea': 'ER', 'Estonia': 'EE',
        'Ethiopia': 'ET', 'Fiji': 'FJ', 'Finland': 'FI', 'France': 'FR', 'Gabon': 'GA', 'Gambia': 'GM', 'Georgia': 'GE',
        'Germany': 'DE', 'Ghana': 'GH', 'Greece': 'GR', 'Grenada': 'GD', 'Guatemala': 'GT', 'Guinea': 'GN',
        'Guinea-Bissau': 'GW', 'Guyana': 'GY', 'Haiti': 'HT', 'Honduras': 'HN', 'Hungary': 'HU', 'Iceland': 'IS',
        'India': 'IN', 'Indonesia': 'ID', 'Iran': 'IR', 'Iraq': 'IQ', 'Ireland': 'IE', 'Israel': 'IL', 'Italy': 'IT',
        'Jamaica': 'JM', 'Japan': 'JP', 'Jordan': 'JO', 'Kazakhstan': 'KZ', 'Kenya': 'KE', 'Kiribati': 'KI',
        'North Korea': 'KP', 'South Korea': 'KR', 'Kuwait': 'KW', 'Kyrgyzstan': 'KG', 'Laos': 'LA', 'Latvia': 'LV',
        'Lebanon': 'LB', 'Lesotho': 'LS', 'Liberia': 'LR', 'Libya': 'LY', 'Liechtenstein': 'LI', 'Lithuania': 'LT',
        'Luxembourg': 'LU', 'Madagascar': 'MG', 'Malawi': 'MW', 'Malaysia': 'MY', 'Maldives': 'MV', 'Mali': 'ML',
        'Malta': 'MT', 'Marshall Islands': 'MH', 'Mauritania': 'MR', 'Mauritius': 'MU', 'Mexico': 'MX', 'Micronesia': 'FM',
        'Moldova': 'MD', 'Monaco': 'MC', 'Mongolia': 'MN', 'Montenegro': 'ME', 'Morocco': 'MA', 'Mozambique': 'MZ',
        'Myanmar': 'MM', 'Namibia': 'NA', 'Nauru': 'NR', 'Nepal': 'NP', 'Netherlands': 'NL', 'New Zealand': 'NZ',
        'Nicaragua': 'NI', 'Niger': 'NE', 'Nigeria': 'NG', 'Norway': 'NO', 'Oman': 'OM', 'Pakistan': 'PK', 'Palau': 'PW',
        'Palestine': 'PS', 'Panama': 'PA', 'Papua New Guinea': 'PG', 'Paraguay': 'PY', 'Peru': 'PE', 'Philippines': 'PH',
        'Poland': 'PL', 'Portugal': 'PT', 'Qatar': 'QA', 'Romania': 'RO', 'Russia': 'RU', 'Rwanda': 'RW',
        'Saint Kitts and Nevis': 'KN', 'Saint Lucia': 'LC', 'Saint Vincent and the Grenadines': 'VC', 'Samoa': 'WS',
        'San Marino': 'SM', 'Sao Tome and Principe': 'ST', 'Saudi Arabia': 'SA', 'Senegal': 'SN', 'Serbia': 'RS',
        'Seychelles': 'SC', 'Sierra Leone': 'SL', 'Singapore': 'SG', 'Solomon Islands': 'SB', 'Somalia': 'SO',
        'South Africa': 'ZA', 'South Sudan': 'SS', 'Spain': 'ES', 'Sri Lanka': 'LK', 'Sudan': 'SD', 'Suriname': 'SR',
        'Swaziland': 'SZ', 'Sweden': 'SE', 'Switzerland': 'CH', 'Syria': 'SY', 'Taiwan': 'TW', 'Tajikistan': 'TJ',
        'Tanzania': 'TZ', 'Thailand': 'TH', 'Timor-Leste': 'TL', 'Togo': 'TG', 'Tonga': 'TO', 'Trinidad and Tobago': 'TT',
        'Tunisia': 'TN', 'Turkey': 'TR', 'Turkmenistan': 'TM', 'Tuvalu': 'TV', 'Uganda': 'UG', 'Ukraine': 'UA',
        'United Arab Emirates': 'AE', 'United Kingdom': 'GB', 'United States': 'US', 'Uruguay': 'UY', 'Uzbekistan': 'UZ',
        'Vanuatu': 'VU', 'Vatican City': 'VA', 'Venezuela': 'VE', 'Vietnam': 'VN', 'Yemen': 'YE', 'Zambia': 'ZM',
        'Zimbabwe': 'ZW'
    }
    return countryMap[countryName] || countryName
}

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
                                            <div className="flex items-center gap-2">
                                                {formData.sourceGeo.country && (
                                                    <div className="w-6 h-4">
                                                        {(() => {
                                                            const FlagComponent = COUNTRY_FLAGS[getCountryCode(formData.sourceGeo.country)]
                                                            return FlagComponent ? <FlagComponent className="w-full h-full object-cover rounded" /> : null
                                                        })()}
                                                    </div>
                                                )}
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
                                            <div className="flex items-center gap-2">
                                                {formData.destinationGeo.country && (
                                                    <div className="w-6 h-4">
                                                        {(() => {
                                                            const FlagComponent = COUNTRY_FLAGS[getCountryCode(formData.destinationGeo.country)]
                                                            return FlagComponent ? <FlagComponent className="w-full h-full object-cover rounded" /> : null
                                                        })()}
                                                    </div>
                                                )}
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