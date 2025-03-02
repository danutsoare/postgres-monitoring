/**
 * PostgreSQL Monitoring Dashboard - API Communication
 * frontend/js/api.js
 * 
 * Handles all communication with the backend API
 */

// Base API URL - change this to match your backend server
const API_BASE_URL = 'http://localhost:3000/api';

// API request helper with error handling
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Request Error (${endpoint}):`, error);
        throw error;
    }
}

// API interface object
const api = {
    // Version information
    async getVersion() {
        return await apiRequest('/version');
    },

    // Session related endpoints
    async getSessions() {
        return await apiRequest('/sessions');
    },

    async getTopSessions() {
        return await apiRequest('/sessions/top');
    },

    // Wait events
    async getWaitEvents() {
        return await apiRequest('/waits');
    },

    async getWaitEventsTimeline(hours = 1) {
        return await apiRequest(`/history/waits?hours=${hours}`);
    },

    // Locks and blocking
    async getBlockingSessionsHierarchy() {
        return await apiRequest('/locks/blocking');
    },

    // Temporary space
    async getTempSpaceUsage() {
        return await apiRequest('/temp/usage');
    },

    async getTempSpaceTimeline(hours = 1) {
        return await apiRequest(`/temp/timeline?hours=${hours}`);
    },

    // Queries
    async getQueryStats() {
        return await apiRequest('/queries/stats');
    },

    // Extensions
    async getExtensions() {
        return await apiRequest('/extensions');
    },

    // Historical data
    async getHistoricalSessions(hours = 24, limit = 1000) {
        return await apiRequest(`/history/sessions?hours=${hours}&limit=${limit}`);
    },

    // Force refresh all metrics
    async refreshMetrics() {
        return await apiRequest('/refresh', { method: 'POST' });
    }
};

// Export the API interface
window.postgresMonitorApi = api;