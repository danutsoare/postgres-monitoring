/**
 * PostgreSQL Monitor API Service
 * Handles all API communication with the backend
 */
class APIService {
    constructor() {
        this.baseUrl = '/api';
    }

    /**
     * Show an alert message
     */
    showAlert(message, type = 'info', duration = 5000) {
        const alertContainer = document.getElementById('alert-container');
        
        if (!alertContainer) return;
        
        const alertId = 'alert-' + Date.now();
        const alertElement = document.createElement('div');
        alertElement.id = alertId;
        alertElement.className = `alert alert-${type}`;
        alertElement.style.position = 'fixed';
        alertElement.style.bottom = '20px';
        alertElement.style.right = '20px';
        alertElement.style.maxWidth = '400px';
        alertElement.style.zIndex = '1000';
        
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="close" onclick="document.getElementById('${alertId}').remove()">
                <span>&times;</span>
            </button>
        `;
        
        alertContainer.appendChild(alertElement);
        
        if (duration > 0) {
            setTimeout(() => {
                if (document.getElementById(alertId)) {
                    document.getElementById(alertId).remove();
                }
            }, duration);
        }
    }

    /**
     * Handle API errors
     */
    handleApiError(error) {
        console.error('API Error:', error);
        
        let errorMessage = 'An unexpected error occurred.';
        
        if (error && error.message) {
            errorMessage = error.message;
        }
        
        if (error && error.response) {
            // Try to get error details from response
            try {
                const errorData = error.response.json();
                if (errorData && errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                console.log('Could not parse error response', e);
            }
        }
        
        this.showAlert(errorMessage, 'danger');
        
        return Promise.reject(error);
    }

    /**
     * Make an API request
     */
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json'
                },
                ...options
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw {
                    status: response.status,
                    message: errorData.error || `HTTP error ${response.status}`,
                    response
                };
            }
            
            if (response.status === 204) {
                return null; // No content
            }
            
            return await response.json();
        } catch (error) {
            return this.handleApiError(error);
        }
    }

    /**
     * Get all database connections
     */
    async getConnections() {
        return this.request('/connections');
    }

    /**
     * Add a new database connection
     */
    async addConnection(connectionData) {
        return this.request('/connections', {
            method: 'POST',
            body: JSON.stringify(connectionData)
        });
    }

    /**
     * Update an existing database connection
     */
    async updateConnection(id, connectionData) {
        return this.request(`/connections/${id}`, {
            method: 'PUT',
            body: JSON.stringify(connectionData)
        });
    }

    /**
     * Delete a database connection
     */
    async deleteConnection(id) {
        return this.request(`/connections/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * Test a database connection
     */
    async testConnection(connectionData) {
        return this.request('/connections/test', {
            method: 'POST',
            body: JSON.stringify(connectionData)
        });
    }

    /**
     * Get metrics for a specific connection
     */
    async getMetrics(connectionId) {
        return this.request(`/connections/${connectionId}/metrics`);
    }

    /**
     * Collect new metrics for a specific connection
     */
    async collectMetrics(connectionId) {
        return this.request(`/connections/${connectionId}/collect`, {
            method: 'POST'
        });
    }

    /**
     * Get historical metrics for a specific connection
     */
    async getHistoricalMetrics(connectionId, hours = 24) {
        return this.request(`/connections/${connectionId}/history?hours=${hours}`);
    }
}

// Create global API service instance
const api = new APIService();
