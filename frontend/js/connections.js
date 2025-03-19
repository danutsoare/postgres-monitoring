export default class ConnectionManager {
    constructor() {
        console.log('ConnectionManager initialized');
        this.initializeDOMElements();
        this.initializeModals();
        this.initEventListeners();
        this.loadConnections();
    }

    initializeDOMElements() {
        // DOM Elements
        this.connectionsTable = document.getElementById('connections-table');
        this.addConnectionBtn = document.getElementById('add-connection-btn');
        this.saveConnectionBtn = document.getElementById('save-connection-btn');
        this.testConnectionBtn = document.getElementById('test-connection-btn');
        this.updateConnectionBtn = document.getElementById('update-connection-btn');
        this.editTestConnectionBtn = document.getElementById('edit-test-connection-btn');
        this.confirmDeleteConnectionBtn = document.getElementById('confirm-delete-connection-btn');
        this.refreshConnectionsBtn = document.getElementById('refresh-connections-btn');
    }

    initializeModals() {
        // Create modals if they don't exist
        this.createAddModal();
        this.createEditModal();
        this.createDeleteModal();

        // Initialize Bootstrap modals
        const addModal = document.getElementById('add-connection-modal');
        const editModal = document.getElementById('edit-connection-modal');
        const deleteModal = document.getElementById('delete-connection-modal');

        if (addModal) {
            this.addConnectionModal = new bootstrap.Modal(addModal);
        }
        if (editModal) {
            this.editConnectionModal = new bootstrap.Modal(editModal);
        }
        if (deleteModal) {
            this.deleteConnectionModal = new bootstrap.Modal(deleteModal);
        }
    }

    createAddModal() {
        if (document.getElementById('add-connection-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'add-connection-modal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-labelledby', 'addConnectionModalLabel');
        modal.setAttribute('aria-hidden', 'true');

        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addConnectionModalLabel">Add Database Connection</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="add-connection-form">
                            <div class="mb-3">
                                <label for="connection-name" class="form-label">Connection Name <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="connection-name" required>
                            </div>
                            <div class="row">
                                <div class="col-md-8 mb-3">
                                    <label for="connection-host" class="form-label">Host <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="connection-host" required>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="connection-port" class="form-label">Port</label>
                                    <input type="number" class="form-control" id="connection-port" value="5432">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="connection-database" class="form-label">Database Name <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="connection-database" required>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="connection-username" class="form-label">Username <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="connection-username" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="connection-password" class="form-label">Password <span class="text-danger">*</span></label>
                                    <input type="password" class="form-control" id="connection-password" required>
                                </div>
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="connection-ssl">
                                <label class="form-check-label" for="connection-ssl">Use SSL connection</label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-info" id="test-connection-btn">
                            <i class="fas fa-vial"></i> Test Connection
                        </button>
                        <button type="button" class="btn btn-primary" id="save-connection-btn">
                            <i class="fas fa-save"></i> Save Connection
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    createDeleteModal() {
        if (document.getElementById('delete-connection-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'delete-connection-modal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Delete Connection</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete this connection? This action cannot be undone.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirm-delete-connection-btn">
                            <i class="fas fa-trash"></i> Delete Connection
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    initEventListeners() {
        // Add Connection Button
        if (this.addConnectionBtn) {
            this.addConnectionBtn.addEventListener('click', () => {
                console.log('Add Connection Button Clicked');
                this.showAddModal();
            });
        }

        // Refresh connections button
        if (this.refreshConnectionsBtn) {
            this.refreshConnectionsBtn.addEventListener('click', () => {
                console.log('Refreshing connections...');
                this.loadConnections();
            });
        }

        // Add event listeners for dynamically created elements
        document.addEventListener('click', (e) => {
            // Test Connection Button (Add form)
            if (e.target.matches('#test-connection-btn')) {
                this.testNewConnection();
            }
            // Save Connection Button
            else if (e.target.matches('#save-connection-btn')) {
                this.saveNewConnection();
            }
            // Test Connection Button (Edit form)
            else if (e.target.matches('#edit-test-connection-btn')) {
                this.testExistingConnection();
            }
            // Update Connection Button
            else if (e.target.matches('#update-connection-btn')) {
                this.updateConnection();
            }
            // Delete Connection Button
            else if (e.target.matches('#confirm-delete-connection-btn')) {
                if (this.connectionToDelete) {
                    this.deleteConnection(this.connectionToDelete);
                }
            }
        });
    }

    showAddModal() {
        if (this.addConnectionModal) {
            this.resetAddConnectionForm();
            this.addConnectionModal.show();
        } else {
            console.error('Add connection modal not initialized');
            this.showAlert('danger', 'Could not open add connection form');
        }
    }

    createEditModal() {
        // Check if modal already exists
        let modal = document.getElementById('edit-connection-modal');
        if (modal) return;

        // Create modal
        modal = document.createElement('div');
        modal.id = 'edit-connection-modal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-labelledby', 'editConnectionModalLabel');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editConnectionModalLabel">Edit Database Connection</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-connection-form">
                            <input type="hidden" id="edit-connection-id">
                            <div class="mb-3">
                                <label for="edit-connection-name" class="form-label">Connection Name <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="edit-connection-name" required>
                            </div>
                            <div class="row">
                                <div class="col-md-8 mb-3">
                                    <label for="edit-connection-host" class="form-label">Host <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="edit-connection-host" required>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="edit-connection-port" class="form-label">Port</label>
                                    <input type="number" class="form-control" id="edit-connection-port" min="1" max="65535">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="edit-connection-database" class="form-label">Database Name <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="edit-connection-database" required>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="edit-connection-username" class="form-label">Username <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="edit-connection-username" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="edit-connection-password" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="edit-connection-password" placeholder="Leave empty to keep current password">
                                </div>
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="edit-connection-ssl">
                                <label class="form-check-label" for="edit-connection-ssl">Use SSL connection</label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-info" id="edit-test-connection-btn">
                            <i class="fas fa-vial"></i> Test Connection
                        </button>
                        <button type="button" class="btn btn-primary" id="update-connection-btn">
                            <i class="fas fa-save"></i> Update Connection
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
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
        
        // Find the current connection to get the existing password if needed
        const currentConnection = this.connections.find(conn => conn.id === this.connectionToEdit);
        
        // If password is blank and we have the current connection, use the stored password
        if (connectionData.password === '' && currentConnection) {
            // Note: The actual password isn't available client-side for security
            // We need to handle this on the server side
            connectionData.useExistingPassword = true;
        }
    
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
        // Find the connection
        const connection = this.connections.find(c => String(c.id) === String(connectionId));
        if (!connection) {
            console.error('Connection not found:', connectionId);
            this.showAlert('danger', 'Connection not found');
            return;
        }

        // Store the connection ID for later use
        this.connectionToEdit = connectionId;

        // Ensure modal exists and is initialized
        this.createEditModal();
        
        // Initialize modal if not already done
        if (!this.editConnectionModal) {
            const modalElement = document.getElementById('edit-connection-modal');
            if (modalElement) {
                this.editConnectionModal = new bootstrap.Modal(modalElement);
            } else {
                console.error('Edit modal element not found');
                this.showAlert('danger', 'Could not open edit form');
                return;
            }
        }

        // Show the modal
        this.editConnectionModal.show();

        // Wait for modal to be shown before populating fields
        const modalElement = document.getElementById('edit-connection-modal');
        if (!modalElement) {
            console.error('Modal element not found after showing');
            this.showAlert('danger', 'Could not load edit form');
            return;
        }

        // Remove any existing event listeners
        const newModalElement = modalElement.cloneNode(true);
        modalElement.parentNode.replaceChild(newModalElement, modalElement);

        // Add event listener for modal shown event
        newModalElement.addEventListener('shown.bs.modal', () => {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                this.populateEditForm(connection);
            }, 100);
        }, { once: true });
    }

    populateEditForm(connection) {
        try {
            // Get all form fields
            const fields = {
                id: document.getElementById('edit-connection-id'),
                name: document.getElementById('edit-connection-name'),
                host: document.getElementById('edit-connection-host'),
                port: document.getElementById('edit-connection-port'),
                database: document.getElementById('edit-connection-database'),
                username: document.getElementById('edit-connection-username'),
                password: document.getElementById('edit-connection-password'),
                ssl: document.getElementById('edit-connection-ssl')
            };

            // Check if all fields exist
            const missingFields = Object.entries(fields)
                .filter(([_, element]) => !element)
                .map(([fieldName]) => fieldName);

            if (missingFields.length > 0) {
                throw new Error(`Missing form fields: ${missingFields.join(', ')}`);
            }

            // Populate form fields
            fields.id.value = connection.id || '';
            fields.name.value = connection.name || '';
            fields.host.value = connection.host || '';
            fields.port.value = connection.port || 5432;
            fields.database.value = connection.database || '';
            fields.username.value = connection.username || '';
            fields.password.value = ''; // Don't populate password
            fields.ssl.checked = connection.ssl || false;

            // Re-initialize event listeners for the edit form
            this.initEditFormEventListeners();

        } catch (error) {
            console.error('Error populating edit form:', error);
            this.showAlert('danger', `Error loading edit form: ${error.message}`);
            if (this.editConnectionModal) {
                this.editConnectionModal.hide();
            }
        }
    }

    initEditFormEventListeners() {
        // Test Connection Button
        const testBtn = document.getElementById('edit-test-connection-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testExistingConnection());
        }

        // Update Connection Button
        const updateBtn = document.getElementById('update-connection-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.updateConnection());
        }
    }

    resetAddConnectionForm() {
        const form = document.getElementById('add-connection-form');
        if (form) {
            form.reset();
            // Set default port
            const portField = document.getElementById('connection-port');
            if (portField) {
                portField.value = '5432';
            }
        }
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

    // In connections.js, add proper validation
    getConnectionFormData(type) {
        const nameField = type === 'add' ? 'connection-name' : 'edit-connection-name';
        const hostField = type === 'add' ? 'connection-host' : 'edit-connection-host';
        const portField = type === 'add' ? 'connection-port' : 'edit-connection-port';
        const databaseField = type === 'add' ? 'connection-database' : 'edit-connection-database';
        const usernameField = type === 'add' ? 'connection-username' : 'edit-connection-username';
        const passwordField = type === 'add' ? 'connection-password' : 'edit-connection-password';
        const sslField = type === 'add' ? 'connection-ssl' : 'edit-connection-ssl';

        const port = parseInt(document.getElementById(portField).value);
        if (port < 1 || port > 65535) {
            throw new Error('Port number must be between 1 and 65535');
        }

        const database = document.getElementById(databaseField).value.trim();
        if (!/^[a-zA-Z0-9_]+$/.test(database)) {
            throw new Error('Database name can only contain letters, numbers, and underscores');
        }

        return {
            name: document.getElementById(nameField).value.trim(),
            host: document.getElementById(hostField).value.trim(),
            port,
            database,
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

    showAlert(type, message = 'An error occurred') {
        try {
            // Remove any existing alerts first
            const existingAlerts = document.querySelectorAll('.alert');
            existingAlerts.forEach(alert => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            });

            // Create new alert
            const alertContainer = document.createElement('div');
            alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
            alertContainer.style.zIndex = '1050';
            alertContainer.setAttribute('role', 'alert');
            
            // Ensure message is a string
            const safeMessage = message && typeof message === 'object' ? 
                (message.message || JSON.stringify(message)) : 
                (message || 'An error occurred');
            
            alertContainer.innerHTML = `
                ${this.escapeHtml(safeMessage)}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            
            document.body.appendChild(alertContainer);
            
            // Auto-remove after 5 seconds for non-error alerts
            if (type !== 'danger') {
                setTimeout(() => {
                    if (alertContainer && alertContainer.parentNode) {
                        alertContainer.parentNode.removeChild(alertContainer);
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('Error showing alert:', error);
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