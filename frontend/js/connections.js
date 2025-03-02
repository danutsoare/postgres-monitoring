// connections.js
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
        
        // Initialize
        this.initEventListeners();
    }

    initEventListeners() {
        console.log('Initializing event listeners');

        // Add Connection Button
        if (this.addConnectionBtn) {
            this.addConnectionBtn.addEventListener('click', (event) => {
                console.log('Add Connection Button Clicked');
                event.preventDefault();
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

        // Load connections
        this.loadConnections();
    }

    resetAddConnectionForm() {
        console.log('Resetting Add Connection Form');
        
        // Reset form
        if (this.addConnectionForm) {
            this.addConnectionForm.reset();
        }

        // Show modal
        if (this.addConnectionModal) {
            this.addConnectionModal.show();
            console.log('Add Connection Modal Shown');
        } else {
            console.error('Add Connection Modal not found');
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
            this.enableButton(this.testConnectionBtn, 'Test Connection');
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
            this.enableButton(this.saveConnectionBtn, 'Save Connection');
        }
    }

    async loadConnections() {
        try {
            const connections = await PostgreSQLMonitorAPI.getConnections();
            this.renderConnectionsTable(connections);
        } catch (error) {
            console.error('Load Connections Error:', error);
            this.showAlert('danger', `Failed to load connections: ${error.message}`);
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

// Ensure the script runs after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Fully Loaded - Initializing ConnectionManager');
    new ConnectionManager();
});