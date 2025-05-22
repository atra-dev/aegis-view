import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        // Get the authorization header from the request
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { 
                    error: 'Authentication required',
                    details: 'Valid Bearer token is required'
                },
                { status: 401 }
            );
        }

        // Get query parameters from the request URL
        const { searchParams } = new URL(request.url);
        const caseId = searchParams.get('caseId');
        const skip = searchParams.get('skip');
        const limit = searchParams.get('limit');

        // Validate required parameters
        if (!caseId) {
            return NextResponse.json(
                { error: 'Case ID is required' },
                { status: 400 }
            );
        }

        if (!skip || !limit) {
            return NextResponse.json(
                { error: 'Skip and limit parameters are required' },
                { status: 400 }
            );
        }

        // Construct the API URL with the correct path and parameters
        const apiUrl = `https://cisoasaservice.stellarcyber.cloud/connect/api/v1/cases/${caseId}/alerts?skip=${skip}&limit=${limit}`;
        console.log('Fetching alerts from:', apiUrl);

        // Forward the token in the request
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });

        // Log the raw response details
        console.log('Raw Stellar API response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Stellar API error details:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });

            if (response.status === 401) {
                return NextResponse.json(
                    { 
                        error: 'Authentication required',
                        details: 'The provided token was invalid or has expired'
                    },
                    { status: 401 }
                );
            }

            return NextResponse.json(
                { 
                    error: 'Failed to fetch alerts',
                    details: errorText
                },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('Stellar API response data:', data);
        
        // Transform the response to match our expected format
        let alerts = [];
        if (Array.isArray(data)) {
            alerts = data.map(alert => ({
                _id: alert._id,
                name: formatAlertName(alert._source?.event_name || alert._source?.msg_class || 'Unknown Alert'),
                description: alert._source?.event_description || '',
                created_at: alert._source?.timestamp || alert._source?.write_time,
                
                // Network Details
                source_ip: alert._source?.srcip || '',
                source_port: alert._source?.srcport,
                source_type: alert._source?.srcip_type,
                source_reputation: alert._source?.srcip_reputation,
                source_reputation_source: alert._source?.srcip_reputation_source,
                source_host: alert._source?.srcip_host,
                
                destination_ip: alert._source?.dstip || '',
                destination_port: alert._source?.dstport,
                destination_type: alert._source?.dstip_type,
                destination_reputation: alert._source?.dstip_reputation,
                destination_host: alert._source?.dstip_host,
                
                protocol: formatString(alert._source?.proto_name || ''),
                protocol_number: alert._source?.proto,
                
                // Event Details
                event_type: alert._source?.event_type,
                event_name: alert._source?.event_name,
                event_category: alert._source?.event_category,
                event_source: alert._source?.event_source,
                record_type: alert._source?.record_type,
                detect_origin: alert._source?.detect_origin,
                
                // Scores and Metrics
                severity: alert._source?.severity,
                score: alert._source?.score,
                fidelity: alert._source?.fidelity,
                rate: alert._source?.rate,
                total_bytes: alert._source?.totalbytes,
                total_packets: alert._source?.totalpackets,
                num_hits: alert._source?.num_hits,
                num_matches: alert._source?.num_matches,
                syn_flood_events: alert._source?.syn_flood_events,
                
                // Application Details
                app_id: alert._source?.appid,
                app_name: alert._source?.appid_name,
                app_family: alert._source?.appid_family,
                app_stdport: alert._source?.appid_stdport,
                
                // Location and Device Info
                tenant_name: alert._source?.tenant_name,
                tenant_id: alert._source?.tenantid,
                location_id: alert._source?.locid,
                device_class: alert._source?.angid_device_class,
                device_desc: alert._source?.engid_device_desc,
                
                // Geographic Information
                source_geo: alert._source?.srcip_geo ? {
                    city: alert._source.srcip_geo.city,
                    country_code: alert._source.srcip_geo.countryCode,
                    country_name: alert._source.srcip_geo.countryName,
                    region: alert._source.srcip_geo.region,
                    latitude: alert._source.srcip_geo.latitude,
                    longitude: alert._source.srcip_geo.longitude,
                    postal: alert._source.srcip_geo.postal
                } : null,
                
                destination_geo: alert._source?.dstip_geo ? {
                    city: alert._source.dstip_geo.city,
                    country_code: alert._source.dstip_geo.countryCode,
                    country_name: alert._source.dstip_geo.countryName,
                    region: alert._source.dstip_geo.region,
                    latitude: alert._source.dstip_geo.latitude,
                    longitude: alert._source.dstip_geo.longitude,
                    postal: alert._source.dstip_geo.postal
                } : null,
                
                // Timestamps
                alert_time: alert._source?.alert_time,
                start_time: alert._source?.start_time,
                time_window: alert._source?.time_window ? {
                    start: alert._source.time_window.start,
                    end: alert._source.time_window.end
                } : null,
                
                // Additional Metadata
                orientation: alert._source?.orientation,
                advanced: alert._source?.advanced,
                asg_type: alert._source?.asgtype,
                asg_type_name: alert._source?.asgtype_name,
                url_reputation: alert._source?.url_reputation,
                
                // IDs and References
                orig_index: alert._source?.orig_index,
                orig_id: alert._source?.orig_id,
                eng_id: alert._source?.engid,
                eng_id_gateway: alert._source?.engid_gatemay,
                obs_id: alert._source?.obsid,
                
                raw_data: alert._source || ''
            }));
        } else if (data.data?.docs && Array.isArray(data.data.docs)) {
            alerts = data.data.docs.map(alert => {
                // Extract and format the source data
                const source = alert._source || {};
                
                // Helper function to safely extract nested object values
                const extractNestedValue = (obj, path) => {
                    if (!obj) return null;
                    const value = path.split('.').reduce((o, i) => (o ? o[i] : null), obj);
                    return value !== null && value !== undefined ? value : null;
                };

                // Helper function to format object data for display
                const formatObjectData = (obj) => {
                    if (!obj) return null;
                    if (typeof obj === 'string') return obj;
                    if (typeof obj === 'number') return obj.toString();
                    if (Array.isArray(obj)) return obj.map(item => formatObjectData(item)).filter(Boolean);
                    if (typeof obj === 'object') {
                        const formatted = {};
                        for (const [key, value] of Object.entries(obj)) {
                            if (value !== null && value !== undefined) {
                                formatted[key] = formatObjectData(value);
                            }
                        }
                        return formatted;
                    }
                    return null;
                };

                return {
                    _id: alert._id,
                    created_at: source.timestamp || source.write_time,
                    tenant_name: source.tenant_name || null,
                    
                    // Event Details
                    display_name: source.xdr_event?.display_name || source.display_name || null,
                    event_category: source.event?.category || source.event_category || null,
                    xdr_event: source.xdr_event ? {
                        name: source.xdr_event.name || null,
                        description: source.xdr_event.description || null,
                        display_name: source.xdr_event.display_name || null,
                        scope: source.xdr_event.scope || null,
                        tactic: source.xdr_event.tactic ? {
                            id: source.xdr_event.tactic.id || null,
                            name: source.xdr_event.tactic.name || null
                        } : null,
                        technique: source.xdr_event.technique ? {
                            id: source.xdr_event.technique.id || null,
                            name: source.xdr_event.technique.name || null
                        } : null,
                        tags: Array.isArray(source.xdr_event.tags) ? source.xdr_event.tags : []
                    } : null,
                    xdr_killchain_stage: source.xdr_event?.xdr_killchain_stage || null,
                    
                    // Network Details
                    source_ip: source.srcip || '',
                    source_port: source.srcport ? parseInt(source.srcport) : null,
                    source_type: source.srcip_type || null,
                    source_geo: source.srcip_geo ? {
                        city: source.srcip_geo.city || null,
                        country_code: source.srcip_geo.countryCode || null,
                        country_name: source.srcip_geo.countryName || null,
                    } : null,
                    
                    destination_ip: source.dstip || '',
                    destination_port: source.dstport ? parseInt(source.dstport) : null,
                    destination_type: source.dstip_type || null,
                    destination_geo: source.dstip_geo ? {
                        city: source.dstip_geo.city || null,
                        country_code: source.dstip_geo.countryCode || null,
                        country_name: source.dstip_geo.countryName || null,
                    } : null,
                    
                    // Host and Status
                    hostname: source.host?.hostname || source.srcip_host || null,
                    status: source.event_status || 'New',
                    
                    // Additional Details
                    description: source.event?.description || source.event_description || '',
                    attack_technique: source.attack_technique || null,
                    
                    raw_data: JSON.stringify(source)
                };
            });
        }

        // Helper function to format alert name
        function formatAlertName(name) {
            if (!name) return 'Unknown Alert';
            return name
                .replace(/_/g, ' ')  // Replace underscores with spaces
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
                .trim();
        }

        // Helper function to format strings
        function formatString(str) {
            if (!str) return '';
            return str
                .replace(/_/g, ' ')  // Replace underscores with spaces
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
                .trim();
        }

        console.log('Transformed alerts:', alerts);

        return NextResponse.json({
            success: true,
            data: alerts
        });

    } catch (error) {
        console.error('Alerts fetch error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        return NextResponse.json(
            { 
                error: 'Failed to fetch alerts',
                details: error.message || 'An unexpected error occurred'
            },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        // Get the authorization header from the request
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { 
                    error: 'Authentication required',
                    details: 'Valid Bearer token is required'
                },
                { status: 401 }
            );
        }

        const baseUrl = process.env.NEXT_PUBLIC_STELLAR_API_URL?.trim();
        if (!baseUrl) {
            console.error('Missing or invalid API URL');
            return NextResponse.json(
                { 
                    error: 'Configuration error',
                    details: 'API URL is not properly configured'
                },
                { status: 500 }
            );
        }

        // Get the request body
        const body = await request.json();
        if (!body || !Array.isArray(body.alerts)) {
            return NextResponse.json(
                { error: 'Invalid request body. Expected alerts array.' },
                { status: 400 }
            );
        }

        // Get query parameters from the request URL
        const { searchParams } = new URL(request.url);
        const queryString = searchParams.toString();

        // Ensure the URL is properly formatted
        const apiUrl = `${baseUrl.replace(/\/$/, '')}/cases/atra/alerts${queryString ? `?${queryString}` : ''}`;
        console.log('Making POST request to:', apiUrl);

        // Make the request to Stellar API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Stellar API error details:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });

            if (response.status === 401) {
                return NextResponse.json(
                    { 
                        error: 'Authentication required',
                        details: 'The provided token was invalid or has expired'
                    },
                    { status: 401 }
                );
            }

            return NextResponse.json(
                { 
                    error: 'Failed to add alerts',
                    details: errorText
                },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('Add alerts error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        return NextResponse.json(
            { 
                error: 'Failed to add alerts',
                details: error.message || 'An unexpected error occurred'
            },
            { status: 500 }
        );
    }
}
