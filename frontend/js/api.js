// API interaction for PostgreSQL Monitoring Dashboard
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
}