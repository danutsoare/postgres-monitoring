/**
 * PostgreSQL Monitor - Connections Management
 * Handles connections list, add, edit, test, and delete operations
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const connectionsTable = document.getElementById('connections-table');
    const tbodyElement = connectionsTable.querySelector('tbody');
    const noConnectionsMessage = document.getElementById('no-connections-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Modal elements
    const addConnectionBtn = document.getElementById('add-connection-btn');
    const addConnectionModal = document.getElementById('add-connection-modal');
    const editConnectionModal = document.getElementById('edit-connection-modal');
    const deleteConnectionModal = document.getElementById('delete-connection-modal');
    const addCloseBtn = addConnectionModal.querySelector('.close');
    const editCloseBtn = editConnectionModal.querySelector('.close');
    const deleteCloseBtn = deleteConnectionModal.querySelector('.close');
    
    // Form elements
    const addForm = document.getElementById('add-connection-form');
    const editForm = document.getElementById('edit-connection-form');
    const testConnectionBtn = document.getElementById('test-connection-btn');
    const saveConnectionBtn = document.getElementById('save-connection-btn');
    const editTestConnectionBtn = document.getElementById('edit-test-connection-btn');
    const updateConnectionBtn = document.getElementById('update-connection-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // Add event listeners
    addConnectionBtn.addEventListener('click', showAddModal);
    addCloseBtn.addEventListener('click', () => closeModal(addConnectionModal));
    editCloseBtn.addEventListener('click', () => closeModal(editConnectionModal));
    deleteCloseBtn.addEventListener('click', () => closeModal(deleteConnectionModal));
    testConnectionBtn.addEventListener('click', testNewConnection);
    saveConnectionBtn.addEventListener('click', saveNewConnection);
    editTestConnectionBtn.addEventListener('click', testExistingConnection);
    updateConnectionBtn.addEventListener('click', updateConnection);
    cancelDeleteBtn.addEventListener('click', () => closeModal(deleteConnectionModal));
    confirmDeleteBtn.addEventListener('click', deleteConnection);
    
    // Load connections on page load
    loadConnections();
    
    /**
     * Load all connections from the API
     */
    async function loadConnections() {
        try {
            showLoading(true);
            
            const connections = await api.getConnections();
            
            if (connections && connections.length > 0) {
                renderConnectionsTable(connections);
                noConnectionsMessage.style.display = 'none';
            } else {
                tbodyElement.innerHTML = '';
                noConnectionsMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading connections:', error);
            tbodyElement.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Error loading connections. Please try again.
                    </td>
                </tr>
            `;
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Render the connections table
     */
    function renderConnectionsTable(connections) {
        tbodyElement.innerHTML = '';
        
        connections.forEach(connection => {
            const row = document.createElement('tr');
            
            // Format the last connected date
            let lastConnected = 'Never';
            if (connection.last_connected_at) {
                const date = new Date(connection.last_connected_at);
                lastConnected = date.toLocaleString();
            }
            
            row.innerHTML = `
                <td>${escapeHtml(connection.name)}</td>
                <td>${escapeHtml(connection.host)}</td>
                <td>${connection.port}</td>
                <td>${escapeHtml(connection.database_name)}</td>
                <td>${escapeHtml(connection.username)}</td>
                <td>${lastConnected}</td>
                <td>
                    <button class="btn btn-info btn-sm test-btn" data-id="${connection.id}">
                        <i class="fas fa-vial"></i> Test
                    </button>
                    <button class="btn btn-primary btn-sm edit-btn" data-id="${connection.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${connection.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            
            tbodyElement.appendChild(row);
        });
        
        // Add event listeners to the buttons
        addTableButtonListeners();
    }
    
    /**
     * Add event listeners to the table buttons
     */
    function addTableButtonListeners() {
        // Test buttons
        const testButtons = document.querySelectorAll('.test-btn');
        testButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const connectionId = e.target.closest('button').dataset.id;
                await testConnectionById(connectionId);
            });
        });
        
        // Edit buttons
        const editButtons = document.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const connectionId = e.target.closest('button').dataset.id;
                await showEditModal(connectionId);
            });
        });
        
        // Delete buttons
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const connectionId = e.target.closest('button').dataset.id;
                showDeleteModal(connectionId);
            });
        });
    }
    
    /**
     * Show the add connection modal
     */
    function showAddModal() {
        addForm.reset();
        document.getElementById('connection-port').value = '5432';
        document.getElementById('add-connection-alert').innerHTML = '';
        addConnectionModal.style.display = 'block';
    }
    
    /**
     * Show the edit connection modal
     */
    async function showEditModal(connectionId) {
        try {
            showLoading(true);
            
            // Get the connection from the API
            const connections = await api.getConnections();
            const connection = connections.find(c => c.id == connectionId);
            
            if (!connection) {
                throw new Error('Connection not found');
            }
            
            // Populate the form
            document.getElementById('edit-connection-id').value = connection.id;
            document.getElementById('edit-connection-name').value = connection.name;
            document.getElementById('edit-connection-host').value = connection.host;
            document.getElementById('edit-connection-port').value = connection.port;
            document.getElementById('edit-connection-database').value = connection.database_name;
            document.getElementById('edit-connection-username').value = connection.username;
            document.getElementById('edit-connection-password').value = '';
            document.getElementById('edit-connection-ssl').checked = connection.ssl;
            
            document.getElementById('edit-connection-alert').innerHTML = '';
            editConnectionModal.style.display = 'block';
        } catch (error) {
            console.error('Error loading connection for edit:', error);
            api.showAlert('Error loading connection details', 'danger');
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Show the delete connection modal
     */
    function showDeleteModal(connectionId) {
        document.getElementById('delete-connection-id').value = connectionId;
        
        // Find the connection name
        const nameCell = document.querySelector(`button.delete-btn[data-id="${connectionId}"]`)
            .closest('tr')
            .querySelector('td:first-child');
            
        document.getElementById('delete-connection-name').textContent = nameCell.textContent;
        
        deleteConnectionModal.style.display = 'block';
    }
    
    /**
     * Close a modal
     */
    function closeModal(modal) {
        modal.style.display = 'none';
    }
    
    /**
     * Test a new connection (from Add modal)
     */
    async function testNewConnection() {
        try {
            // Get form data
            const connectionData = {
                host: document.getElementById('connection-host').value,
                port: parseInt(document.getElementById('connection-port').value),
                database_name: document.getElementById('connection-database').value,
                username: document.getElementById('connection-username').value,
                password: document.getElementById('connection-password').value,
                ssl: document.getElementById('connection-ssl').checked
            };
            
            // Validate required fields
            if (!connectionData.host || !connectionData.database_name || 
                !connectionData.username || !connectionData.password) {
                throw new Error('Please fill in all required fields');
            }
            
            // Show loading
            testConnectionBtn.disabled = true;
            testConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            
            // Call API
            const result = await api.testConnection(connectionData);
            
            // Show result
            if (result && result.success) {
                document.getElementById('add-connection-alert').innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i> Connection successful! 
                        Version: ${escapeHtml(result.version)}
                    </div>
                `;
            } else {
                throw new Error(result.message || 'Connection failed');
            }
        } catch (error) {
            console.error('Test connection error:', error);
            document.getElementById('add-connection-alert').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> ${escapeHtml(error.message || 'Connection failed')}
                </div>
            `;
        } finally {
            // Restore button
            testConnectionBtn.disabled = false;
            testConnectionBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        }
    }
    
    /**
     * Test an existing connection by ID
     */
    async function testConnectionById(connectionId) {
        try {
            // Get target button
            const button = document.querySelector(`.test-btn[data-id="${connectionId}"]`);
            
            // Show loading
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            
            // Call API
            const result = await api.testConnection({ id: connectionId });
            
            // Show result
            if (result && result.success) {
                api.showAlert(`Connection successful! Version: ${result.version}`, 'success');
            } else {
                throw new Error(result.message || 'Connection failed');
            }
        } catch (error) {
            console.error('Test connection error:', error);
            api.showAlert(error.message || 'Connection test failed', 'danger');
        } finally {
            // Restore button
            const button = document.querySelector(`.test-btn[data-id="${connectionId}"]`);
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-vial"></i> Test';
            }
        }
    }
    
    /**
     * Test an existing connection (from Edit modal)
     */
    async function testExistingConnection() {
        try {
            // Get form data
            const connectionId = document.getElementById('edit-connection-id').value;
            const connectionData = {
                id: connectionId,
                host: document.getElementById('edit-connection-host').value,
                port: parseInt(document.getElementById('edit-connection-port').value),
                database_name: document.getElementById('edit-connection-database').value,
                username: document.getElementById('edit-connection-username').value,
                password: document.getElementById('edit-connection-password').value,
                ssl: document.getElementById('edit-connection-ssl').checked
            };
            
            // Validate required fields
            if (!connectionData.host || !connectionData.database_name || !connectionData.username) {
                throw new Error('Please fill in all required fields');
            }
            
            // Show loading
            editTestConnectionBtn.disabled = true;
            editTestConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            
            // Call API
            const result = await api.testConnection(connectionData);
            
            // Show result
            if (result && result.success) {
                document.getElementById('edit-connection-alert').innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i> Connection successful! 
                        Version: ${escapeHtml(result.version)}
                    </div>
                `;
            } else {
                throw new Error(result.message || 'Connection failed');
            }
        } catch (error) {
            console.error('Test connection error:', error);
            document.getElementById('edit-connection-alert').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> ${escapeHtml(error.message || 'Connection failed')}
                </div>
            `;
        } finally {
            // Restore button
            editTestConnectionBtn.disabled = false;
            editTestConnectionBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        }
    }
    
    /**
     * Save a new connection
     */
    async function saveNewConnection() {
        try {
            // Get form data
            const connectionData = {
                name: document.getElementById('connection-name').value,
                host: document.getElementById('connection-host').value,
                port: parseInt(document.getElementById('connection-port').value),
                database_name: document.getElementById('connection-database').value,
                username: document.getElementById('connection-username').value,
                password: document.getElementById('connection-password').value,
                ssl: document.getElementById('connection-ssl').checked
            };
            
            // Validate required fields
            if (!connectionData.name || !connectionData.host || 
                !connectionData.database_name || !connectionData.username || 
                !connectionData.password) {
                throw new Error('Please fill in all required fields');
            }
            
            // Show loading
            saveConnectionBtn.disabled = true;
            saveConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Call API
            await api.addConnection(connectionData);
            
            // Show success message
            api.showAlert('Connection added successfully', 'success');
            
            // Close modal and reload connections
            closeModal(addConnectionModal);
            loadConnections();
        } catch (error) {
            console.error('Save connection error:', error);
            document.getElementById('add-connection-alert').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> ${escapeHtml(error.message || 'Failed to save connection')}
                </div>
            `;
        } finally {
            // Restore button
            saveConnectionBtn.disabled = false;
            saveConnectionBtn.innerHTML = '<i class="fas fa-save"></i> Save Connection';
        }
    }
    
    /**
     * Update an existing connection
     */
    async function updateConnection() {
        try {
            // Get form data
            const connectionId = document.getElementById('edit-connection-id').value;
            const connectionData = {
                name: document.getElementById('edit-connection-name').value,
                host: document.getElementById('edit-connection-host').value,
                port: parseInt(document.getElementById('edit-connection-port').value),
                database_name: document.getElementById('edit-connection-database').value,
                username: document.getElementById('edit-connection-username').value,
                password: document.getElementById('edit-connection-password').value,
                ssl: document.getElementById('edit-connection-ssl').checked
            };
            
            // Validate required fields
            if (!connectionData.name || !connectionData.host || 
                !connectionData.database_name || !connectionData.username) {
                throw new Error('Please fill in all required fields');
            }
            
            // Show loading
            updateConnectionBtn.disabled = true;
            updateConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            
            // Call API
            await api.updateConnection(connectionId, connectionData);
            
            // Show success message
            api.showAlert('Connection updated successfully', 'success');
            
            // Close modal and reload connections
            closeModal(editConnectionModal);
            loadConnections();
        } catch (error) {
            console.error('Update connection error:', error);
            document.getElementById('edit-connection-alert').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> ${escapeHtml(error.message || 'Failed to update connection')}
                </div>
            `;
        } finally {
            // Restore button
            updateConnectionBtn.disabled = false;
            updateConnectionBtn.innerHTML = '<i class="fas fa-save"></i> Update Connection';
        }
    }
    
    /**
     * Delete a connection
     */
    async function deleteConnection() {
        try {
            const connectionId = document.getElementById('delete-connection-id').value;
            
            // Show loading
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            
            // Call API
            await api.deleteConnection(connectionId);
            
            // Show success message
            api.showAlert('Connection deleted successfully', 'success');
            
            // Close modal and reload connections
            closeModal(deleteConnectionModal);
            loadConnections();
        } catch (error) {
            console.error('Delete connection error:', error);
            api.showAlert(error.message || 'Failed to delete connection', 'danger');
        } finally {
            // Restore button
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Connection';
        }
    }
    
    /**
     * Show or hide the loading indicator
     */
    function showLoading(show) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(str) {
        if (!str) return '';
        
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
