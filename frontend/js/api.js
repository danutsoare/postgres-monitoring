// PostgreSQL Monitor - API Handler with Enhanced Error Debugging
const API = {
    // Base URL for API requests
    baseUrl: '/api',

    // Test database connection with enhanced error handling
    testConnection: async function(connectionConfig) {
        console.log('Testing connection with config:', {
            ...connectionConfig,
            password: connectionConfig.password ? '******' : null // Mask password in logs
        });
        
        try {
            // First, check if our API endpoint exists by making a simple request
            // This helps diagnose if the server is running and API routes are properly configured
            const checkEndpoint = await fetch(`${this.baseUrl}/ping`, { 
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            }).catch(error => {
                console.error('API endpoint check failed:', error);
                return { ok: false, status: 0, statusText: error.message };
            });
            
            if (!checkEndpoint.ok) {
                console.error(`API endpoint check failed with status: ${checkEndpoint.status} ${checkEndpoint.statusText}`);
                
                // Try to read the response to see what's being returned
                try {
                    const responseText = await checkEndpoint.text();
                    console.log('Response from server (first 500 chars):', responseText.substring(0, 500));
                    
                    // If we received HTML, this indicates the API server might not be running
                    if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
                        return {
                            success: false,
                            error: 'API server not responding properly. Received HTML instead of JSON.',
                            details: 'The server might not be running or API routes are not set up correctly.'
                        };
                    }
                } catch (readError) {
                    console.error('Could not read response:', readError);
                }
                
                return {
                    success: false,
                    error: `API server not responding: ${checkEndpoint.status} ${checkEndpoint.statusText}`,
                    details: 'Check if the backend server is running and API routes are properly configured.'
                };
            }
            
            // Now proceed with the actual connection test
            console.log('API endpoint check successful, proceeding with connection test');
            
            // Make the connection test request with a more lenient response handling
            const response = await fetch(`${this.baseUrl}/connections/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(connectionConfig)
            });
            
            // Log the raw response information
            console.log('Connection test response status:', response.status);
            console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
            
            // Try to parse as JSON first
            let data;
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    // If not JSON, get the text response for debugging
                    const text = await response.text();
                    console.warn('Received non-JSON response:', text.substring(0, 500));
                    
                    // If it's HTML, provide a clear error message
                    if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
                        return {
                            success: false,
                            error: 'Received HTML instead of JSON from the server',
                            details: 'The API server is returning HTML, which indicates a server-side issue.'
                        };
                    }
                    
                    // Try to parse it as JSON anyway, in case content-type is wrong
                    try {
                        data = JSON.parse(text);
                    } catch (parseError) {
                        return {
                            success: false,
                            error: `Unable to parse server response: ${text.substring(0, 100)}...`,
                            details: 'The server did not return valid JSON.'
                        };
                    }
                }
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                
                // Try to get the text response for debugging
                try {
                    const text = await response.clone().text();
                    console.warn('Failed to parse JSON. Raw response:', text.substring(0, 500));
                    
                    return {
                        success: false,
                        error: `Failed to parse server response as JSON: ${jsonError.message}`,
                        details: `First 100 characters of response: ${text.substring(0, 100)}...`
                    };
                } catch (textError) {
                    return {
                        success: false,
                        error: `Failed to parse server response: ${jsonError.message}`,
                        details: 'Could not read response body'
                    };
                }
            }
            
            // Log detailed error information if available
            if (!data.success && data.details) {
                console.error('Connection test error details:', data.details);
            }
            
            return data;
        } catch (error) {
            console.error('API error during connection test:', error);
            return {
                success: false,
                error: `Network error: ${error.message}`,
                details: error.stack
            };
        }
    },
    
    // Mock API for local testing when actual backend is not available
    mockConnectionTest: function(connectionConfig) {
        console.log('Using mock API for connection test');
        
        return new Promise((resolve) => {
            setTimeout(() => {
                // For testing purposes, always return success
                resolve({
                    success: true,
                    version: '15.3',
                    details: {
                        uptime: '12345 seconds',
                        max_connections: 100,
                        current_connections: 15
                    }
                });
                
                // Uncomment to test error handling
                /*
                resolve({
                    success: false,
                    error: 'Connection refused',
                    details: 'ECONNREFUSED: Could not connect to PostgreSQL server on host'
                });
                */
            }, 1000);
        });
    },
    
    // Format detailed error messages from PostgreSQL errors
    formatPgError: function(error) {
        if (!error) return 'Unknown error';
        
        // Extract specific PostgreSQL error codes and provide more helpful messages
        if (error.code) {
            switch (error.code) {
                case 'ECONNREFUSED':
                    return `Connection refused. The server at ${error.address || 'specified address'} is not accepting connections on port ${error.port || 'specified port'}.`;
                case 'ETIMEDOUT':
                    return `Connection timed out. Unable to reach the database server.`;
                case 'ENOTFOUND':
                    return `Host not found. Check if the hostname is correct.`;
                case '28P01':
                    return `Authentication failed. Check your username and password.`;
                case '3D000':
                    return `Database does not exist. Check the database name.`;
                case '42P01':
                    return `Table does not exist. Required table or schema is missing.`;
                case '42501':
                    return `Insufficient privileges. The user does not have required permissions.`;
                case '53300':
                    return `Too many connections. The server has reached its maximum connection limit.`;
                default:
                    if (error.message) {
                        return error.message;
                    }
                    return `Database error (code: ${error.code})`;
            }
        }
        
        return error.message || 'Unknown database error';
    }
};

// Function to check if we're in development mode with no backend
function isLocalDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:';
}

// Modify the API object to use mock responses in local development when needed
if (isLocalDevelopment()) {
    console.log('Running in local development mode');
    
    // Store the original function
    const originalTestConnection = API.testConnection;
    
    // Override the function with one that tries real API first, then falls back to mock
    API.testConnection = async function(connectionConfig) {
        try {
            // First try the real API
            const result = await originalTestConnection.call(this, connectionConfig);
            
            // If we get a response about HTML or API not available, use mock instead
            if (!result.success && 
                (result.error.includes('HTML instead of JSON') ||
                 result.error.includes('API server not responding'))) {
                console.log('Falling back to mock API');
                return this.mockConnectionTest(connectionConfig);
            }
            
            return result;
        } catch (error) {
            console.error('Error in API call, falling back to mock:', error);
            return this.mockConnectionTest(connectionConfig);
        }
    };
}

// Export the API object
window.API = API;