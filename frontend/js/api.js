// Extended API interaction for PostgreSQL Monitoring Dashboard
export default class PostgreSQLMonitorAPI {
    static BASE_URL = '/api';

    // Fetch all database connections
    static async getConnections() {
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
    static async testConnection(connectionData) {
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
    static async addConnection(connectionData) {
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
    static async updateConnection(connectionId, connectionData) {
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
    static async deleteConnection(connectionId) {
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
    static async refreshConnection(connectionId) {
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
    static async refreshMetrics() {
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
    static async getVersion() {
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
    static async getTopSessions() {
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
    static async getWaitEvents() {
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
    static async getWaitEventsTimeline(hours = 1) {
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
    static async getBlockingSessionsHierarchy() {
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
    static async getTempSpaceUsage() {
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
    
    // Get comprehensive database statistics
    static async getDatabaseStats(connectionId) {
        try {
            const response = await fetch(`${this.BASE_URL}/stats/${connectionId}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch database statistics');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching database statistics:', error);
            throw error;
        }
    }

    // Get available PostgreSQL extensions
    static async getExtensions() {
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