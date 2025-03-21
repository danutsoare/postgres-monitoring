/**
 * Updated api.js with the missing getDatabaseStats method
 * 
 * This is the complete api.js file with the new method added
 */

// Extended API interaction for PostgreSQL Monitoring Dashboard
export default class PostgreSQLMonitorAPI {
    constructor() {
        this.BASE_URL = '/api';
    }

    // Fetch all database connections
    async getConnections() {
        try {
            const response = await fetch(`${this.BASE_URL}/connections`);
            if (!response.ok) {
                throw new Error('Failed to fetch connections');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching connections:', error);
            throw error;
        }
    }

    // Test a new database connection
    async testConnection(connectionData) {
        try {
            const response = await fetch(`${this.BASE_URL}/connections/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(connectionData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Connection test failed');
            }

            return result;
        } catch (error) {
            console.error('Error testing connection:', error);
            throw error;
        }
    }

    // Add a new database connection
    async addConnection(connectionData) {
        try {
            const response = await fetch(`${this.BASE_URL}/connections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(connectionData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to add connection');
            }

            return result;
        } catch (error) {
            console.error('Error adding connection:', error);
            throw error;
        }
    }

    // Update an existing database connection
    async updateConnection(connectionId, connectionData) {
        try {
            const response = await fetch(`${this.BASE_URL}/connections/${connectionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(connectionData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to update connection');
            }

            return result;
        } catch (error) {
            console.error('Error updating connection:', error);
            throw error;
        }
    }

    // Delete a database connection
    async deleteConnection(connectionId) {
        try {
            const response = await fetch(`${this.BASE_URL}/connections/${connectionId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to delete connection');
            }

            return true;
        } catch (error) {
            console.error('Error deleting connection:', error);
            throw error;
        }
    }
    
    // Force refresh metrics for a specific connection
    async refreshConnection(connectionId) {
        try {
            const response = await fetch(`${this.BASE_URL}/connections/${connectionId}/refresh`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to refresh connection metrics');
            }
            
            return result;
        } catch (error) {
            console.error('Error refreshing connection metrics:', error);
            throw error;
        }
    }
    
    // Force refresh metrics for all connections
    async refreshMetrics() {
        try {
            const response = await fetch(`${this.BASE_URL}/refresh`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to refresh metrics');
            }
            
            return result;
        } catch (error) {
            console.error('Error refreshing metrics:', error);
            throw error;
        }
    }
    
    // Get PostgreSQL version information
    async getVersion() {
        try {
            const response = await fetch(`${this.BASE_URL}/version`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch version information');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching version information:', error);
            throw error;
        }
    }
    
    // Get top sessions consuming the most resources
    async getTopSessions() {
        try {
            const response = await fetch(`${this.BASE_URL}/sessions/top`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch top sessions');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching top sessions:', error);
            throw error;
        }
    }
    
    // Get wait events information
    async getWaitEvents() {
        try {
            const response = await fetch(`${this.BASE_URL}/waits`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch wait events');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching wait events:', error);
            throw error;
        }
    }
    
    // Get wait events timeline for a specific connection
    async getWaitEventsTimeline(hours = 1) {
        try {
            const response = await fetch(`${this.BASE_URL}/waits/timeline?hours=${hours}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch wait events timeline');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching wait events timeline:', error);
            throw error;
        }
    }
    
    // Get blocking sessions hierarchy
    async getBlockingSessionsHierarchy() {
        try {
            const response = await fetch(`${this.BASE_URL}/locks/blocking`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch blocking sessions hierarchy');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching blocking sessions hierarchy:', error);
            throw error;
        }
    }
    
    // Get temporary space usage
    async getTempSpaceUsage() {
        try {
            const response = await fetch(`${this.BASE_URL}/temp/usage`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch temporary space usage');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching temporary space usage:', error);
            throw error;
        }
    }
    
    // Get comprehensive database statistics for a specific connection
    async getDatabaseStats(connectionId) {
        try {
            // Make sure we have a valid connection ID
            if (!connectionId) {
                throw new Error('Connection ID is required');
            }
            
            console.log(`Fetching database stats for connection ID: ${connectionId}`);
            
            // Try the first endpoint format
            try {
                const url = `${this.BASE_URL}/connections/${connectionId}/stats`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    // If first endpoint fails, try the alternative
                    throw new Error(`First endpoint failed with status: ${response.status}`);
                }
                
                return await response.json();
            } catch (firstError) {
                console.warn(`First endpoint attempt failed: ${firstError.message}`);
                
                // Try alternative endpoint format
                const altUrl = `${this.BASE_URL}/stats/${connectionId}`;
                console.log(`Trying alternative endpoint: ${altUrl}`);
                
                const altResponse = await fetch(altUrl);
                
                if (!altResponse.ok) {
                    throw new Error(`Failed to fetch database statistics: ${altResponse.status} ${altResponse.statusText}`);
                }
                
                return await altResponse.json();
            }
        } catch (error) {
            console.error('Error fetching database statistics:', error);
            throw error; // Re-throw the error to be handled by the caller
        }
    }

    // Get available PostgreSQL extensions
    async getExtensions() {
        try {
            const response = await fetch(`${this.BASE_URL}/extensions`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch extensions');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching extensions:', error);
            throw error;
        }
    }
}