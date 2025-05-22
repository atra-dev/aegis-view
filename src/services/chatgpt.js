import { logger } from '@/utils/logger'

const CHATGPT_API_KEY = process.env.NEXT_PUBLIC_CHATGPT_API_KEY
const CHATGPT_API_URL = 'https://api.openai.com/v1/chat/completions'

// Custom console logger that works in both dev and prod
const log = {
    info: (...args) => {
        console.log('[ChatGPT] INFO:', ...args)
    },
    error: (...args) => {
        console.error('[ChatGPT] ERROR:', ...args)
    }
}

export const analyzeAlertWithGPT = async (alertData) => {
    try {
        // Validate API key
        if (!CHATGPT_API_KEY) {
            log.error('ChatGPT API key is not configured')
            return {
                success: false,
                error: 'ChatGPT API key is not configured. Please check your environment variables.'
            }
        }

        // Validate alert data
        if (!alertData || !alertData.alertName) {
            log.error('Invalid alert data provided')
            return {
                success: false,
                error: 'Invalid alert data. Alert name is required.'
            }
        }

        // Prepare the prompt for ChatGPT with enhanced context
        const prompt = `Analyze the following security alert and provide a detailed analysis. IMPORTANT: Your response must be a complete, valid JSON object without any additional text or markdown formatting.

Alert Details:
- Alert Name: ${alertData.alertName}
- Technique: ${alertData.technique}
- Category: ${alertData.category}
- Kill Chain Stage: ${alertData.killChainStage}
- Severity: ${alertData.severity || 'N/A'}
- Event Status: ${alertData.event_status || 'N/A'}

Host Information:
- Hostname: ${alertData.host?.name || 'N/A'}
- IP Address: ${alertData.host?.ip || alertData.hostip || 'N/A'}
- OS: ${alertData.eset?.os_name || 'N/A'}
- Location: ${alertData.hostip_geo?.city || 'N/A'}, ${alertData.hostip_geo?.countryName || 'N/A'}

Process Information:
- Process Name: ${alertData.eset?.processname || alertData.process?.executable || 'N/A'}
- Command Line: ${alertData.eset?.command_line || 'N/A'}
- Hash: ${alertData.eset?.hash || alertData.file?.hash?.sha1 || 'N/A'}

Network Information:
- Source IP: ${alertData.sourceIp || 'N/A'}
- Source Geo: ${alertData.sourceGeo?.country || 'N/A'}
- Destination IP: ${alertData.destinationIp || 'N/A'}
- Destination Geo: ${alertData.destinationGeo?.country || 'N/A'}

Additional Context:
- Description: ${alertData.description || alertData.xdr_event?.description || 'N/A'}
- Rule Name: ${alertData.eset?.rulename || 'N/A'}
- Event Type: ${alertData.eset?.event_type || 'N/A'}
- Computer Severity Score: ${alertData.eset?.computer_severity_score || 'N/A'}
- Detection UUID: ${alertData.eset?.detection_uuid || 'N/A'}
- Console Link: ${alertData.eset?.econsolelink || 'N/A'}

Provide a comprehensive analysis in the following JSON format. Do not include any additional text or markdown formatting:

{
    "riskAssessment": {
        "level": "string (High/Medium/Low)",
        "justification": "string"
    },
    "threatType": {
        "type": "string",
        "mitreAttack": ["string"],
        "description": "string"
    },
    "processAnalysis": {
        "findings": "string",
        "suspiciousIndicators": ["string"],
        "behaviorAnalysis": "string"
    },
    "networkAnalysis": {
        "findings": "string",
        "trafficPatterns": "string",
        "geographicContext": "string"
    },
    "recommendations": {
        "immediateActions": ["string"],
        "investigationSteps": ["string"],
        "mitigationMeasures": ["string"],
        "preventionStrategies": ["string"]
    },
    "analysisSummary": "string",
    "confidence": number
}`

        log.info('Sending request to ChatGPT API')
        const response = await fetch(CHATGPT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CHATGPT_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a senior cybersecurity analyst specializing in endpoint detection and response (EDR) systems. 
                        Your task is to analyze security alerts with a focus on process injection, suspicious activities, and potential threats.
                        Consider the following in your analysis:
                        1. Process behavior and command line analysis
                        2. Network traffic patterns and geographic context
                        3. MITRE ATT&CK framework mapping
                        4. Severity scoring and risk assessment
                        5. Specific, actionable recommendations
                        Provide detailed, technical analysis with specific indicators and recommendations.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            log.error('ChatGPT API error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            })
            throw new Error(`ChatGPT API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        log.info('Received response from ChatGPT API')
        
        // Extract the analysis from the response
        try {
            // Get the content from the response
            const content = data.choices[0].message.content
            
            // Clean the content by removing markdown code block formatting if present
            const cleanedContent = content
                .replace(/```json\n?/g, '')  // Remove ```json
                .replace(/```\n?/g, '')      // Remove closing ```
                .trim()                      // Remove any extra whitespace
            
            log.info('Cleaned response content:', cleanedContent)
            
            // Check if the content is a complete JSON object
            if (!cleanedContent.startsWith('{') || !cleanedContent.endsWith('}')) {
                log.error('Response is not a complete JSON object')
                return {
                    success: false,
                    error: 'The AI response was not properly formatted. Please try again.'
                }
            }

            // Try to parse the JSON
            let analysis
            try {
                analysis = JSON.parse(cleanedContent)
            } catch (parseError) {
                log.error('JSON parsing error:', parseError)
                // Try to extract the JSON part if it's embedded in text
                const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    analysis = JSON.parse(jsonMatch[0])
                } else {
                    throw parseError
                }
            }

            // Validate the required fields
            const requiredFields = ['riskAssessment', 'threatType', 'processAnalysis', 'networkAnalysis', 'recommendations', 'analysisSummary', 'confidence']
            const missingFields = requiredFields.filter(field => !analysis[field])
            
            if (missingFields.length > 0) {
                log.error('Missing required fields:', missingFields)
                return {
                    success: false,
                    error: `The AI response was incomplete. Missing fields: ${missingFields.join(', ')}`
                }
            }

            log.info('Successfully parsed ChatGPT analysis')
            return {
                success: true,
                analysis: analysis
            }
        } catch (parseError) {
            log.error('Error parsing ChatGPT response:', parseError)
            log.error('Raw response content:', data.choices[0].message.content)
            return {
                success: false,
                error: 'Failed to parse ChatGPT response. The response was not in the expected JSON format.'
            }
        }
    } catch (error) {
        log.error('Error in ChatGPT analysis:', error)
        return {
            success: false,
            error: error.message || 'An unexpected error occurred during AI analysis'
        }
    }
} 