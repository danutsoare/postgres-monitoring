// PostgreSQL Monitor - API Handler
const API = {
    // Base URL for API requests
    baseUrl: '/api',

    // Test database connection
    testConnection: async function(connectionConfig) {
        try {
            const response = await fetch(`${this.baseUrl}/connections/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(connectionConfig)
            });
            
            // Parse the response
            const data = await response.json();
            
            // Log detailed error information if available
            if (!data.success && data.details) {
                console.error('Connection test error details:', data.details);
            }
            
            return data;
        } catch (error) {
            console.error('API error during connection test:', error);
            return {
                success: false,
                error: error.message || 'Failed to test connection due to network error',
                details: error
            };
        }
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

// Export the API object
window.API = API;