import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        // Get the authorization header from the request
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Authentication required',
                    details: 'Valid Bearer token is required'
                },
                { status: 401 }
            );
        }

        // Get query parameters from the request URL
        const { searchParams } = new URL(request.url);
        const skip = parseInt(searchParams.get('skip') || '0');
        const limit = parseInt(searchParams.get('limit') || '50');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        console.log('Received request with params:', { skip, limit, startDate, endDate });

        // First, fetch all cases
        console.log('Fetching cases from Stellar API...');
        const casesResponse = await fetch('https://cisoasaservice.stellarcyber.cloud/connect/api/v1/cases', {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });

        // Log the raw cases response
        console.log('Cases API Response:', {
            status: casesResponse.status,
            statusText: casesResponse.statusText,
            headers: Object.fromEntries(casesResponse.headers.entries())
        });

        if (!casesResponse.ok) {
            let errorData;
            try {
                const text = await casesResponse.text();
                console.log('Cases error response text:', text);
                errorData = text ? JSON.parse(text) : {};
            } catch (parseError) {
                console.error('Error parsing cases error response:', parseError);
                errorData = {};
            }

            console.error('Failed to fetch cases:', {
                status: casesResponse.status,
                statusText: casesResponse.statusText,
                error: errorData
            });
            
            if (casesResponse.status === 401 || casesResponse.status === 403) {
                return NextResponse.json(
                    { 
                        success: false,
                        error: 'Authentication required',
                        details: errorData.error || 'Invalid or expired token'
                    },
                    { status: 401 }
                );
            }
            
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to fetch cases',
                    details: errorData.error || casesResponse.statusText
                },
                { status: casesResponse.status }
            );
        }

        let casesData;
        try {
            const text = await casesResponse.text();
            console.log('Cases API raw response:', text);
            casesData = JSON.parse(text);
        } catch (parseError) {
            console.error('Error parsing cases response:', parseError);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid response from Stellar API',
                    details: 'Failed to parse cases response'
                },
                { status: 500 }
            );
        }

        console.log('Parsed cases response:', casesData);

        // Extract cases array from the response, handling all possible structures
        let cases;
        if (casesData?.data?.cases && Array.isArray(casesData.data.cases)) {
            cases = casesData.data.cases;
        } else if (casesData?.cases && Array.isArray(casesData.cases)) {
            cases = casesData.cases;
        } else if (Array.isArray(casesData)) {
            cases = casesData;
        } else if (casesData?.data && Array.isArray(casesData.data)) {
            cases = casesData.data;
        } else {
            console.error('Unexpected cases response structure:', casesData);
            return NextResponse.json({
                success: false,
                error: 'Invalid cases response format',
                details: 'Could not extract cases array from response'
            }, { status: 500 });
        }

        console.log(`Found ${cases.length} cases`);

        if (cases.length === 0) {
            return NextResponse.json({
                success: true,
                data: [],
                total: 0,
                skip,
                limit
            });
        }

        // Log date filtering parameters
        console.log('Date filtering parameters:', {
            startDate,
            endDate,
            startDateObj: startDate ? new Date(startDate) : null,
            endDateObj: endDate ? new Date(endDate) : null
        });

        // Fetch alerts for each case in parallel
        console.log('Fetching alerts for each case...');
        const alertsPromises = cases.map(async (caseItem) => {
            try {
                console.log(`Fetching alerts for case ${caseItem._id}...`);
                const alertsResponse = await fetch(
                    `https://cisoasaservice.stellarcyber.cloud/connect/api/v1/cases/${caseItem._id}/alerts?skip=0&limit=1000`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': authHeader,
                            'Accept': 'application/json'
                        }
                    }
                );

                if (!alertsResponse.ok) {
                    console.error(`Failed to fetch alerts for case ${caseItem._id}:`, {
                        status: alertsResponse.status,
                        statusText: alertsResponse.statusText
                    });
                    return [];
                }

                let alertsData;
                try {
                    const text = await alertsResponse.text();
                    console.log(`Alerts response text for case ${caseItem._id}:`, text);
                    alertsData = JSON.parse(text);
                } catch (parseError) {
                    console.error(`Error parsing alerts for case ${caseItem._id}:`, parseError);
                    return [];
                }

                console.log(`Alerts for case ${caseItem._id}:`, alertsData);

                const alerts = Array.isArray(alertsData) ? alertsData :
                              Array.isArray(alertsData.data?.docs) ? alertsData.data.docs :
                              Array.isArray(alertsData.data) ? alertsData.data : [];

                // Add case information to each alert
                return alerts.map(alert => ({
                    ...alert,
                    case_id: caseItem._id,
                    case_name: caseItem.name,
                    case_status: caseItem.status,
                    case_severity: caseItem.severity
                }));
            } catch (error) {
                console.error(`Error fetching alerts for case ${caseItem._id}:`, error);
                return [];
            }
        });

        const allAlertsArrays = await Promise.all(alertsPromises);
        let allAlerts = allAlertsArrays.flat();

        console.log(`Total alerts before filtering: ${allAlerts.length}`);

        // Sort alerts by timestamp (newest first)
        allAlerts.sort((a, b) => {
            const dateA = new Date(a._source?.timestamp || a._source?.write_time || a.created_at);
            const dateB = new Date(b._source?.timestamp || b._source?.write_time || b.created_at);
            return dateB - dateA;
        });

        // Apply pagination
        const paginatedAlerts = allAlerts.slice(skip, skip + limit);

        console.log(`Returning ${paginatedAlerts.length} alerts after pagination`);

        // Transform the alerts to match our expected format
        const transformedAlerts = paginatedAlerts.map(alert => ({
            _id: alert._id,
            created_at: alert._source?.timestamp || alert._source?.write_time || alert.created_at,
            tenant_name: alert._source?.tenant_name || null,
            
            // Case Information
            case_id: alert.case_id,
            case_name: alert.case_name,
            case_status: alert.case_status,
            case_severity: alert.case_severity,
            
            // Event Details
            display_name: alert._source?.xdr_event?.display_name || alert._source?.display_name || null,
            event_category: alert._source?.event?.category || alert._source?.event_category || null,
            xdr_event: alert._source?.xdr_event ? {
                name: alert._source.xdr_event.name || null,
                description: alert._source.xdr_event.description || null,
                display_name: alert._source.xdr_event.display_name || null,
                scope: alert._source.xdr_event.scope || null,
                tactic: alert._source.xdr_event.tactic ? {
                    id: alert._source.xdr_event.tactic.id || null,
                    name: alert._source.xdr_event.tactic.name || null
                } : null,
                technique: alert._source.xdr_event.technique ? {
                    id: alert._source.xdr_event.technique.id || null,
                    name: alert._source.xdr_event.technique.name || null
                } : null,
                tags: Array.isArray(alert._source.xdr_event.tags) ? alert._source.xdr_event.tags : []
            } : null,
            xdr_killchain_stage: alert._source?.xdr_event?.xdr_killchain_stage || null,
            
            // Network Details
            source_ip: alert._source?.srcip || '',
            source_port: alert._source?.srcport ? parseInt(alert._source.srcport) : null,
            source_type: alert._source?.srcip_type || null,
            source_geo: alert._source?.srcip_geo ? {
                city: alert._source.srcip_geo.city || null,
                country_code: alert._source.srcip_geo.countryCode || null,
                country_name: alert._source.srcip_geo.countryName || null,
            } : null,
            
            destination_ip: alert._source?.dstip || '',
            destination_port: alert._source?.dstport ? parseInt(alert._source.dstport) : null,
            destination_type: alert._source?.dstip_type || null,
            destination_geo: alert._source?.dstip_geo ? {
                city: alert._source.dstip_geo.city || null,
                country_code: alert._source.dstip_geo.countryCode || null,
                country_name: alert._source.dstip_geo.countryName || null,
            } : null,
            
            // Host and Status
            hostname: alert._source?.host?.hostname || alert._source?.srcip_host || null,
            status: alert._source?.event_status || 'New',
            
            // Additional Details
            description: alert._source?.event?.description || alert._source?.event_description || '',
            attack_technique: alert._source?.attack_technique || null
        }));

        console.log(`Returning ${transformedAlerts.length} alerts`);

        return NextResponse.json({
            success: true,
            data: transformedAlerts,
            total: allAlerts.length,
            skip,
            limit
        });

    } catch (error) {
        console.error('All alerts fetch error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to fetch all alerts',
                details: error.message || 'An unexpected error occurred'
            },
            { status: 500 }
        );
    }
} 