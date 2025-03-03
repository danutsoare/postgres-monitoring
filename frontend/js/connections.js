// Fixed ConnectionManager class with proper edit functionality and test button
export default class ConnectionManager {
    constructor() {
        console.log('ConnectionManager initialized');

        // DOM Elements
        this.connectionsTable = document.getElementById('connections-table');
        this.addConnectionBtn = document.getElementById('add-connection-btn');
        this.saveConnectionBtn = document.getElementById('save-connection-btn');
        this.testConnectionBtn = document.getElementById('test-connection-btn');
        this.updateConnectionBtn = document.getElementById('update-connection-btn');
        this.editTestConnectionBtn = document.getElementById('edit-test-connection-btn');
        this.confirmDeleteConnectionBtn = document.getElementById('confirm-delete-connection-btn');
        this.refreshConnectionsBtn = document.getElementById('refresh-connections-btn');
        
        // Modals
        this.addConnectionModal = new bootstrap.Modal(document.getElementById('add-connection-modal'));
        this.editConnectionModal = new bootstrap.Modal(document.getElementById('edit-connection-modal'));
        this.deleteConnectionModal = new bootstrap.Modal(document.getElementById('delete-connection-modal'));
        
        // Forms
        this.addConnectionForm = document.getElementById('add-connection-form');
        this.editConnectionForm = document.getElementById('edit-connection-form');
        
        // Instance variables
        this.connectionToDelete = null;
        this.connectionToEdit = null;
        this.connections = []; // Store loaded connections
        
        // Bind methods
        this.initEventListeners = this.initEventListeners.bind(this);
        this.resetAddConnectionForm = this.resetAddConnectionForm.bind(this);
        this.testNewConnection = this.testNewConnection.bind(this);
        this.testExistingConnection = this.testExistingConnection.bind(this);
        this.saveNewConnection = this.saveNewConnection.bind(this);
        this.updateConnection = this.updateConnection.bind(this);
        this.loadConnections = this.loadConnections.bind(this);
        this.editConnection = this.editConnection.bind(this);
        this.deleteConnection = this.deleteConnection.bind(this);
        this.showDeleteConnectionConfirmation = this.showDeleteConnectionConfirmation.bind(this);
        
        // Initialize
        this.initEventListeners();
        this.loadConnections();
    }

    initEventListeners() {
        console.log('Initializing event listeners');

        // Add Connection Button
        if (this.addConnectionBtn) {
            this.addConnectionBtn.addEventListener('click', () => {
                console.log('Add Connection Button Clicked');
                this.resetAddConnectionForm();
            });
        }

        // Test Connection Button (Add form)
        if (this.testConnectionBtn) {
            this.testConnectionBtn.addEventListener('click', () => this.testNewConnection());
        }
        
        // Test Connection Button (Edit form)
        if (this.editTestConnectionBtn) {
            this.editTestConnectionBtn.addEventListener('click', () => this.testExistingConnection());
        }

        // Save Connection Button
        if (this.saveConnectionBtn) {
            this.saveConnectionBtn.addEventListener('click', () => this.saveNewConnection());
        }
        
        // Update Connection Button
        if (this.updateConnectionBtn) {
            this.updateConnectionBtn.addEventListener('click', () => this.updateConnection());
        }
        
        // Refresh connections button
        if (this.refreshConnectionsBtn) {
            this.refreshConnectionsBtn.addEventListener('click', () => {
                console.log('Refreshing connections...');
                this.loadConnections();
            });
        }
        
        // Delete confirmation button
        if (this.confirmDeleteConnectionBtn) {
            this.confirmDeleteConnectionBtn.addEventListener('click', () => {
                if (this.connectionToDelete) {
                    this.deleteConnection(this.connectionToDelete);
                }
            });
        }
    }

    resetAddConnectionForm() {
        console.log('Resetting Add Connection Form');
        
        if (this.addConnectionForm) {
            this.addConnectionForm.reset();
        }
    }

    async testNewConnection() {
        console.log('Testing New Connection');
        const connectionData = this.getConnectionFormData('add');

        try {
            this.disableButton(this.testConnectionBtn, 'Testing...');
            const result = await window.postgresMonitorApi.testConnection(connectionData);
            console.log('Connection Test Result:', result);
            this.showAlert('success', 'Connection test successful!');
        } catch (error) {
            console.error('Connection Test Error:', error);
            this.showAlert('danger', `Connection test failed: ${error.message}`);
        } finally {
            this.enableButton(this.testConnectionBtn, '<i class="fas fa-vial"></i> Test Connection');
        }
    }
    
    async testExistingConnection() {
        console.log('Testing Existing Connection');
        const connectionData = this.getConnectionFormData('edit');

        try {
            this.disableButton(this.editTestConnectionBtn, 'Testing...');
            const result = await window.postgresMonitorApi.testConnection(connectionData);
            console.log('Connection Test Result:', result);
            this.showAlert('success', 'Connection test successful!');
        } catch (error) {
            console.error('Connection Test Error:', error);
            this.showAlert('danger', `Connection test failed: ${error.message}`);
        } finally {
            this.enableButton(this.editTestConnectionBtn, '<i class="fas fa-vial"></i> Test Connection');
        }
    }

    async saveNewConnection() {
        console.log('Saving New Connection');
        const connectionData = this.getConnectionFormData('add');

        try {
            this.disableButton(this.saveConnectionBtn, 'Saving...');
            const newConnection = await window.postgresMonitorApi.addConnection(connectionData);
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
    
    async updateConnection() {
        console.log('Updating Connection');
        const connectionData = this.getConnectionFormData('edit');

        try {
            this.disableButton(this.updateConnectionBtn, 'Updating...');
            const updatedConnection = await window.postgresMonitorApi.updateConnection(this.connectionToEdit, connectionData);
            console.log('Updated Connection:', updatedConnection);
            this.showAlert('success', 'Connection updated successfully!');
            this.editConnectionModal.hide();
            this.loadConnections();
        } catch (error) {
            console.error('Update Connection Error:', error);
            this.showAlert('danger', `Failed to update connection: ${error.message}`);
        } finally {
            this.enableButton(this.updateConnectionBtn, '<i class="fas fa-save"></i> Update Connection');
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
            
            const connections = await window.postgresMonitorApi.getConnections();
            // Store connections for later use
            this.connections = connections;
            
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
        if (!tbody) return;
        
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
        
        // Find the connection details from our stored connections
        const connectionToEdit = this.connections.find(conn => conn.id === parseInt(connectionId));
        
        if (!connectionToEdit) {
            console.error(`Connection with ID ${connectionId} not found`);
            this.showAlert('danger', 'Connection not found');
            return;
        }
        
        // Store connection ID for update
        this.connectionToEdit = parseInt(connectionId);
        
        // Populate the edit form
        document.getElementById('edit-connection-id').value = connectionToEdit.id;
        document.getElementById('edit-connection-name').value = connectionToEdit.name;
        document.getElementById('edit-connection-host').value = connectionToEdit.host;
        document.getElementById('edit-connection-port').value = connectionToEdit.port;
        document.getElementById('edit-connection-database').value = connectionToEdit.database;
        document.getElementById('edit-connection-username').value = connectionToEdit.username;
        document.getElementById('edit-connection-password').value = ''; // Password field is blank for security reasons
        document.getElementById('edit-connection-ssl').checked = connectionToEdit.ssl;
        
        // Show the modal
        this.editConnectionModal.show();
    }
    
    showDeleteConnectionConfirmation(connectionId) {
        console.log(`Showing delete confirmation for connection ID: ${connectionId}`);
        
        // Store the connection ID for deletion
        this.connectionToDelete = parseInt(connectionId);
        
        // Show the delete confirmation modal
        this.deleteConnectionModal.show();
    }
    
    async deleteConnection(connectionId) {
        try {
            this.disableButton(this.confirmDeleteConnectionBtn, 'Deleting...');
            
            await window.postgresMonitorApi.deleteConnection(connectionId);
            
            this.showAlert('success', 'Connection deleted successfully!');
            this.deleteConnectionModal.hide();
            await this.loadConnections();
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
        if (!button) return;
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> ${loadingText}`;
    }

    enableButton(button, originalText) {
        if (!button) return;
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