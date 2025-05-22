export const fetchAlertTypes = async () => {
  try {
    const token = localStorage.getItem('stellar_token');
    if (!token) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    const response = await fetch('/api/stellar/alert-types', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Check for authentication/authorization errors
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('stellar_token'); // Clear invalid token
        return {
          success: false,
          error: 'Authentication required'
        };
      }
      
      console.error('Error fetching alert types:', data);
      return { 
        success: false, 
        error: data.error || 'Failed to fetch alert types' 
      };
    }

    return { 
      success: true, 
      data 
    };
  } catch (error) {
    console.error('Alert types fetch error:', error);
    // Check if it's an authentication error
    if (error.message?.toLowerCase().includes('unauthorized') || 
        error.message?.toLowerCase().includes('forbidden')) {
      localStorage.removeItem('stellar_token');
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    return { 
      success: false, 
      error: error.message || 'Failed to fetch alert types' 
    };
  }
};

//export const fetchStellarData = async () => {
//  try {
//    const token = localStorage.getItem('stellar_token');
//    if (!token) {
//      throw new Error('Authentication required');
//    }
    
  
//    const response = await fetch('https://cisoasaservice.stellarcyber.cloud/connect/api/v1/servers', {
//      method: 'GET',
//      headers: {
//        'Content-Type': 'application/json',
//      'Accept': 'application/json',
//        'Authorization': `Bearer ${token}`,
//      },
//    });
    
//    if (!response.ok) {
//      const data = await response.json();
     
//      if (response.status === 401) {
//        localStorage.removeItem('stellar_token');
//        throw new Error('Authentication required');
//      }
      
//      throw new Error(data.error || `HTTP error! status: ${response.status}`);
//    }
    
//    const data = await response.json();
//    console.log('Server data received:', data);
//    return { success: true, data };
//  } catch (error) {
//    console.error('Error fetching Stellar data:', error);
//    return {
//      success: false,
//      error: error.message,
//      details: error.details
//    };
//  }
//};

export const fetchCases = async (params = {}) => {
  try {
    const token = localStorage.getItem('stellar_token');
    if (!token) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      status: params.status || 'New',
      sort: params.sort || 'created_at',
      order: params.order || 'desc',
      include_summary: true,
      ...params
    }).toString();

    const response = await fetch(`/api/stellar/cases?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Raw API response:', data); // Debug log
    
    if (!response.ok) {
      // Check for authentication/authorization errors
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('stellar_token');
        return {
          success: false,
          error: 'Authentication required'
        };
      }
      
      console.error('Error fetching cases:', data);
      return { 
        success: false, 
        error: data.error || 'Failed to fetch cases' 
      };
    }

    // Ensure we return an array of cases
    const cases = Array.isArray(data) ? data : 
                 Array.isArray(data.cases) ? data.cases :
                 Array.isArray(data.data) ? data.data : [];

    return { 
      success: true, 
      data: cases
    };
  } catch (error) {
    console.error('Cases fetch error:', error);
    if (error.message?.toLowerCase().includes('unauthorized') || 
        error.message?.toLowerCase().includes('forbidden')) {
      localStorage.removeItem('stellar_token');
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    return { 
      success: false, 
      error: error.message || 'Failed to fetch cases',
      data: [] // Always return an array even in error case
    };
  }
};

export async function fetchAlerts(caseId, skip = 0, limit = 50) {
    const token = localStorage.getItem('stellar_token');
    if (!token) {
        return { success: false, error: 'Authentication required' };
    }

    if (!caseId) {
        return { success: false, error: 'Case ID is required' };
    }

    try {
        const response = await fetch(`/api/stellar/alerts?caseId=${encodeURIComponent(caseId)}&skip=${skip}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('stellar_token');
                return { success: false, error: 'Authentication required' };
            }
            const errorData = await response.json();
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log('Alerts response:', data); // Debug log
        
        // Handle different possible response structures
        const alerts = Array.isArray(data) ? data :
                      data.data?.docs ? data.data.docs :
                      Array.isArray(data.data) ? data.data :
                      data.alerts ? data.alerts : [];

        console.log('Processed alerts:', alerts); // Debug log

        return {
            success: true,
            data: alerts
        };
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch alerts',
            data: []
        };
    }
}

export async function addAlertsToCase(alerts) {
    const token = localStorage.getItem('stellar_token');
    if (!token) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        const response = await fetch('/api/stellar/cases/atra/alerts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ alerts })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('stellar_token');
                return { success: false, error: 'Authentication required' };
            }
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            data: data.data
        };
    } catch (error) {
        console.error('Error adding alerts:', error);
        return {
            success: false,
            error: error.message || 'Failed to add alerts'
        };
    }
}

export async function fetchAllAlerts(skip = 0, limit = 50, startDate = null, endDate = null) {
    const token = localStorage.getItem('stellar_token');
    if (!token) {
        return { success: false, error: 'Authentication required' };
    }

    try {
        // Build query parameters
        const params = new URLSearchParams({
            skip: skip.toString(),
            limit: limit.toString()
        });

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        console.log('Making request to all-alerts endpoint with params:', {
            skip,
            limit,
            startDate,
            endDate
        });

        const response = await fetch(`/api/stellar/all-alerts?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Log the raw response for debugging
        console.log('Raw response status:', response.status);

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('stellar_token');
                return { success: false, error: 'Authentication required' };
            }

            const errorText = await response.text();
            console.error('Error response:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.error || errorData.details || `Request failed with status ${response.status}`);
            } catch (e) {
                throw new Error(`Request failed with status ${response.status}`);
            }
        }

        const text = await response.text();
        console.log('Response text:', text);
        
        const data = JSON.parse(text);
        console.log('Parsed response:', data);

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch alerts');
        }

        return {
            success: true,
            data: data.data || [],
            total: data.total || 0,
            skip: data.skip || skip,
            limit: data.limit || limit
        };
    } catch (error) {
        console.error('Error fetching all alerts:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch all alerts',
            data: [],
            total: 0,
            skip,
            limit
        };
    }
}

export const fetchSensorImages = async () => {
  try {
    const token = localStorage.getItem('stellar_token');
    if (!token) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    const response = await fetch('/api/stellar/sensor-images', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('stellar_token'); // Clear invalid token
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const errorData = await response.json();
      throw new Error(errorData.error || errorData.details || 'Failed to fetch sensor images');
    }

    const data = await response.json();
    console.log('Sensor images API response:', {
      success: data.success,
      hasData: !!data.data,
      dataType: typeof data.data,
      isArray: Array.isArray(data.data),
      dataLength: Array.isArray(data.data) ? data.data.length : 'N/A',
      sampleImage: data.data?.[0] ? {
        id: data.data[0].id,
        name: data.data[0].name,
        version: data.data[0].version
      } : null
    });
    return { 
      success: true, 
      data: Array.isArray(data.data) ? data.data : [] 
    };
  } catch (error) {
    console.error('Sensor images fetch error:', error);
    // Check if it's an authentication error
    if (error.message?.toLowerCase().includes('unauthorized') || 
        error.message?.toLowerCase().includes('forbidden')) {
      localStorage.removeItem('stellar_token');
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    return { 
      success: false, 
      error: error.message || 'Failed to fetch sensor images' 
    };
  }
};

export const fetchDataSensors = async (custId = null) => {
  try {
    const token = localStorage.getItem('stellar_token');
    if (!token) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    const url = custId ? `/api/stellar/data-sensors?cust_id=${encodeURIComponent(custId)}` : '/api/stellar/data-sensors';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Check for authentication/authorization errors
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('stellar_token'); // Clear invalid token
        return {
          success: false,
          error: 'Authentication required'
        };
      }
      
      console.error('Error fetching data sensors:', data);
      return { 
        success: false, 
        error: data.error || 'Failed to fetch data sensors' 
      };
    }

    return { 
      success: true, 
      total: data.total,
      sensors: data.sensors || []
    };
  } catch (error) {
    console.error('Data sensors fetch error:', error);
    if (error.message?.toLowerCase().includes('unauthorized') || 
        error.message?.toLowerCase().includes('forbidden')) {
      localStorage.removeItem('stellar_token');
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    return { 
      success: false, 
      error: error.message || 'Failed to fetch data sensors',
      sensors: []
    };
  }
}; 