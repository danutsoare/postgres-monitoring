// connections.js - Updated version
import PostgreSQLMonitorAPI from './api.js';

export default class ConnectionManager {
    constructor() {
        console.log('ConnectionManager initialized');

        // DOM Elements
        this.connectionsTable = document.getElementById('connections-table');
        this.addConnectionBtn = document.getElementById('add-connection-btn');
        this.saveConnectionBtn = document.getElementById('save-connection-btn');
        this.testConnectionBtn = document.getElementById('test-connection-btn');
        this.updateConnectionBtn = document.getElementById('update-connection-btn');
        this.confirmDeleteConnectionBtn = document.getElementById('confirm-delete-connection-btn');
        this.refreshConnectionsBtn = document.getElementById('refresh-connections-btn');
        
        // Modals
        this.addConnectionModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('add-connection-modal'));
        this.editConnectionModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('edit-connection-modal'));
        this.deleteConnectionModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('delete-connection-modal'));
        
        // Forms
        this.addConnectionForm = document.getElementById('add-connection-form');
        this.editConnectionForm = document.getElementById('edit-connection-form');
        
        // Bind methods
        this.initEventListeners = this.initEventListeners.bind(this);
        this.resetAddConnectionForm = this.resetAddConnectionForm.bind(this);
        this.testNewConnection = this.testNewConnection.bind(this);
        this.saveNewConnection = this.saveNewConnection.bind(this);
        this.loadConnections = this.loadConnections.bind(this);
        
        // Add debug button (temporary)
        setTimeout(() => this.addDebugButton(), 1000);
        
        // Initialize
        this.initEventListeners();
    }

    initEventListeners() {
        console.log('Initializing event listeners');

        // Add Connection Button
        if (this.addConnectionBtn) {
            this.addConnectionBtn.addEventListener('click', (event) => {
                console.log('Add Connection Button Clicked');
                // Modal is opened by data-bs-toggle and data-bs-target attributes
                this.resetAddConnectionForm();
            });
        } else {
            console.error('Add Connection Button not found');
        }

        // Test Connection Button
        if (this.testConnectionBtn) {
            this.testConnectionBtn.addEventListener('click', () => this.testNewConnection());
        }

        // Save Connection Button
        if (this.saveConnectionBtn) {
            this.saveConnectionBtn.addEventListener('click', () => this.saveNewConnection());
        }
        
        // Refresh connections button
        if (this.refreshConnectionsBtn) {
            this.refreshConnectionsBtn.addEventListener('click', () => {
                console.log('Refreshing connections...');
                this.loadConnections();
            });
        }

        // Load connections
        this.loadConnections();
    }
    
    addDebugButton() {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Debug API';
        debugBtn.className = 'btn btn-sm btn-warning ms-2';
        debugBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/connections');
                const data = await response.json();
                console.log('API response:', data);
                alert(`API returned ${data.length} connections`);
                this.renderConnectionsTable(data);
            } catch (err) {
                console.error('API request failed:', err);
                alert(`API request failed: ${err.message}`);
            }
        });
        
        if (this.refreshConnectionsBtn && this.refreshConnectionsBtn.parentNode) {
            this.refreshConnectionsBtn.parentNode.appendChild(debugBtn);
        }
    }

    resetAddConnectionForm() {
        console.log('Resetting Add Connection Form');
        
        // Reset form
        if (this.addConnectionForm) {
            this.addConnectionForm.reset();
        }
    }

    async testNewConnection() {
        console.log('Testing New Connection');
        const connectionData = this.getConnectionFormData('add');

        try {
            this.disableButton(this.testConnectionBtn, 'Testing...');
            const result = await PostgreSQLMonitorAPI.testConnection(connectionData);
            console.log('Connection Test Result:', result);
            this.showAlert('success', 'Connection test successful!');
        } catch (error) {
            console.error('Connection Test Error:', error);
            this.showAlert('danger', `Connection test failed: ${error.message}`);
        } finally {
            this.enableButton(this.testConnectionBtn, '<i class="fas fa-vial"></i> Test Connection');
        }
    }

    async saveNewConnection() {
        console.log('Saving New Connection');
        const connectionData = this.getConnectionFormData('add');

        try {
            this.disableButton(this.saveConnectionBtn, 'Saving...');
            const newConnection = await PostgreSQLMonitorAPI.addConnection(connectionData);
            console.log('New Connection:', newConnection);
            this.showAlert('success', 'Connection added successfully!');
            this.addConnectionModal.hide();
            this.loadConnections();
        } catch (error) {
            console.error('Save Connection Error:', error);
            this.showAlert('danger', `Failed to save connection: ${error.message}`);
        } finally {
            this.enableButton(this.saveConnectionBtn, '<i class="fas fa-save"></i> Save Connection');
        }
    }

    async loadConnections() {
        try {
            console.log('Loading connections from API...');
            
            // Add a visual loading indicator
            const tbody = this.connectionsTable.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">
                            <div class="d-flex justify-content-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                            <div class="mt-2">Loading connections...</div>
                        </td>
                    </tr>
                `;
            }
            
            const connections = await PostgreSQLMonitorAPI.getConnections();
            console.log('Connections loaded:', connections);
            this.renderConnectionsTable(connections);
        } catch (error) {
            console.error('Load Connections Error:', error);
            this.showAlert('danger', `Failed to load connections: ${error.message}`);
            
            // Show error in table
            const tbody = this.connectionsTable.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-danger">
                            <i class="fas fa-exclamation-circle me-2"></i>
                            Error loading connections: ${error.message}
                            <div class="mt-2">
                                <button class="btn btn-sm btn-outline-primary" id="retry-load-btn">
                                    <i class="fas fa-sync"></i> Retry
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                
                // Add retry button handler
                const retryBtn = document.getElementById('retry-load-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => this.loadConnections());
                }
            }
        }
    }

    renderConnectionsTable(connections) {
        const tbody = this.connectionsTable.querySelector('tbody');
        tbody.innerHTML = '';

        if (connections.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <p class="my-3">No database connections configured.</p>
                        <p>Click the "Add Connection" button to monitor a PostgreSQL database.</p>
                    </td>
                </tr>
            `;
            return;
        }

        connections.forEach(conn => {
            const row = document.createElement('tr');
            const statusClass = conn.status === 'Connected' ? 'success' : 'danger';
            
            row.innerHTML = `
                <td>${this.escapeHtml(conn.name)}</td>
                <td>${this.escapeHtml(conn.host)}:${conn.port} ${conn.ssl ? '<i class="fas fa-lock text-success" title="SSL Enabled"></i>' : ''}</td>
                <td>${this.escapeHtml(conn.database)}</td>
                <td><span class="badge bg-${statusClass}">${conn.status}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-info edit-conn-btn" data-id="${conn.id}" title="Edit Connection">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-conn-btn" data-id="${conn.id}" title="Delete Connection">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        this.addRowButtonListeners();
    }
    
    addRowButtonListeners() {
        // Edit buttons
        const editButtons = document.querySelectorAll('.edit-conn-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const connectionId = e.currentTarget.getAttribute('data-id');
                this.editConnection(connectionId);
            });
        });
        
        // Delete buttons
        const deleteButtons = document.querySelectorAll('.delete-conn-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const connectionId = e.currentTarget.getAttribute('data-id');
                this.showDeleteConnectionConfirmation(connectionId);
            });
        });
    }
    
    editConnection(connectionId) {
        console.log(`Editing connection with ID: ${connectionId}`);
        // You would need to fetch the connection details and populate the edit form
        // Implementation would go here
    }
    
    showDeleteConnectionConfirmation(connectionId) {
        console.log(`Showing delete confirmation for connection ID: ${connectionId}`);
        // Store the connection ID for deletion
        this.connectionToDelete = connectionId;
        // Show the delete confirmation modal
        this.deleteConnectionModal.show();
        
        // Make sure the delete confirmation button has a click handler
        if (this.confirmDeleteConnectionBtn) {
            // Remove existing handlers
            this.confirmDeleteConnectionBtn.replaceWith(this.confirmDeleteConnectionBtn.cloneNode(true));
            this.confirmDeleteConnectionBtn = document.getElementById('confirm-delete-connection-btn');
            
            // Add new handler
            this.confirmDeleteConnectionBtn.addEventListener('click', () => {
                this.deleteConnection(this.connectionToDelete);
            });
        }
    }
    
    async deleteConnection(connectionId) {
        try {
            this.disableButton(this.confirmDeleteConnectionBtn, 'Deleting...');
            await PostgreSQLMonitorAPI.deleteConnection(connectionId);
            this.showAlert('success', 'Connection deleted successfully!');
            this.deleteConnectionModal.hide();
            this.loadConnections();
        } catch (error) {
            console.error('Delete Connection Error:', error);
            this.showAlert('danger', `Failed to delete connection: ${error.message}`);
        } finally {
            this.enableButton(this.confirmDeleteConnectionBtn, '<i class="fas fa-trash"></i> Delete Connection');
        }
    }

    getConnectionFormData(type) {
        const nameField = type === 'add' ? 'connection-name' : 'edit-connection-name';
        const hostField = type === 'add' ? 'connection-host' : 'edit-connection-host';
        const portField = type === 'add' ? 'connection-port' : 'edit-connection-port';
        const databaseField = type === 'add' ? 'connection-database' : 'edit-connection-database';
        const usernameField = type === 'add' ? 'connection-username' : 'edit-connection-username';
        const passwordField = type === 'add' ? 'connection-password' : 'edit-connection-password';
        const sslField = type === 'add' ? 'connection-ssl' : 'edit-connection-ssl';

        return {
            name: document.getElementById(nameField).value.trim(),
            host: document.getElementById(hostField).value.trim(),
            port: parseInt(document.getElementById(portField).value),
            database: document.getElementById(databaseField).value.trim(),
            username: document.getElementById(usernameField).value.trim(),
            password: document.getElementById(passwordField).value.trim(),
            ssl: document.getElementById(sslField).checked
        };
    }

    disableButton(button, loadingText) {
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> ${loadingText}`;
    }

    enableButton(button, originalText) {
        button.disabled = false;
        button.innerHTML = originalText;
    }

    showAlert(type, message) {
        const alertContainer = document.createElement('div');
        alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alertContainer.style.zIndex = '1050';
        alertContainer.setAttribute('role', 'alert');
        
        alertContainer.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.body.appendChild(alertContainer);
        
        // Auto-remove after 5 seconds for non-error alerts
        if (type !== 'danger') {
            setTimeout(() => {
                alertContainer.classList.remove('show');
                setTimeout(() => alertContainer.remove(), 150);
            }, 5000);
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}