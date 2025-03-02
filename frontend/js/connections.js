// PostgreSQL Monitor - Connection Manager
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const addConnectionBtn = document.getElementById('add-connection-btn');
    const addConnectionModal = new bootstrap.Modal(document.getElementById('add-connection-modal'));
    const editConnectionModal = new bootstrap.Modal(document.getElementById('edit-connection-modal'));
    const deleteConnectionModal = new bootstrap.Modal(document.getElementById('delete-connection-modal'));
    const testConnectionBtn = document.getElementById('test-connection-btn');
    const saveConnectionBtn = document.getElementById('save-connection-btn');
    const editTestConnectionBtn = document.getElementById('edit-test-connection-btn');
    const updateConnectionBtn = document.getElementById('update-connection-btn');
    const confirmDeleteConnectionBtn = document.getElementById('confirm-delete-connection-btn');
    const connectionsTable = document.getElementById('connections-table');
    const refreshConnectionsBtn = document.getElementById('refresh-connections-btn');

    // Initialize connections array - will be populated from the backend
    let connections = [];

    // Initialize the connections table
    function initConnectionsManager() {
        loadConnections();
        setupEventListeners();
    }

    // Load connections data from the backend
    function loadConnections() {
        // Show loading state
        const tbody = connectionsTable.querySelector('tbody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading connections...</td></tr>';

        // Fetch connections from the backend
        fetch('/api/connections')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                connections = data;
                renderConnectionsTable();
            })
            .catch(error => {
                console.error('Error loading connections:', error);
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">
                    Failed to load connections. ${error.message}</td></tr>`;
            });
    }

    // Render connections table
    function renderConnectionsTable() {
        const tbody = connectionsTable.querySelector('tbody');
        
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

        tbody.innerHTML = '';
        
        connections.forEach(conn => {
            const row = document.createElement('tr');
            
            // Status badge color
            const statusClass = conn.status === 'online' ? 'success' : 'danger';
            
            row.innerHTML = `
                <td>${conn.name}</td>
                <td>${conn.host}:${conn.port} ${conn.ssl ? '<i class="fas fa-lock text-success" title="SSL Enabled"></i>' : ''}</td>
                <td>${conn.database}</td>
                <td><span class="badge bg-${statusClass}">${conn.status}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary test-conn-btn" data-id="${conn.id}" title="Test Connection">
                            <i class="fas fa-vial"></i>
                        </button>
                        <button class="btn btn-outline-primary edit-conn-btn" data-id="${conn.id}" title="Edit Connection">
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

        // Add event listeners to the newly created buttons
        addTableButtonListeners();
    }

    // Add event listeners to table action buttons
    function addTableButtonListeners() {
        // Test connection buttons
        document.querySelectorAll('.test-conn-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const connId = parseInt(this.getAttribute('data-id'));
                testExistingConnection(connId);
            });
        });

        // Edit connection buttons
        document.querySelectorAll('.edit-conn-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const connId = parseInt(this.getAttribute('data-id'));
                openEditConnectionModal(connId);
            });
        });

        // Delete connection buttons
        document.querySelectorAll('.delete-conn-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const connId = parseInt(this.getAttribute('data-id'));
                openDeleteConnectionModal(connId);
            });
        });
    }

    // Set up event listeners
    function setupEventListeners() {
        // Add Connection button
        addConnectionBtn.addEventListener('click', function() {
            document.getElementById('add-connection-form').reset();
            addConnectionModal.show();
        });

        // Test Connection button in Add modal
        testConnectionBtn.addEventListener('click', function() {
            testNewConnection();
        });

        // Save Connection button in Add modal
        saveConnectionBtn.addEventListener('click', function() {
            saveNewConnection();
        });

        // Test Connection button in Edit modal
        editTestConnectionBtn.addEventListener('click', function() {
            testEditedConnection();
        });

        // Update Connection button in Edit modal
        updateConnectionBtn.addEventListener('click', function() {
            updateConnection();
        });

        // Confirm Delete button in Delete modal
        confirmDeleteConnectionBtn.addEventListener('click', function() {
            deleteConnection();
        });

        // Refresh Connections button
        refreshConnectionsBtn.addEventListener('click', function() {
            refreshConnections();
        });
    }

    // Test new connection
    function testNewConnection() {
        const name = document.getElementById('connection-name').value;
        const host = document.getElementById('connection-host').value;
        const port = document.getElementById('connection-port').value;
        const database = document.getElementById('connection-database').value;
        const username = document.getElementById('connection-username').value;
        const password = document.getElementById('connection-password').value;
        const ssl = document.getElementById('connection-ssl').checked;

        // Validate form fields
        if (!validateConnectionForm(name, host, database, username, password)) {
            return;
        }

        // Show testing indicator
        saveConnectionBtn.disabled = true;
        testConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';

        // Prepare connection data
        const connectionData = {
            name,
            host,
            port: parseInt(port),
            database,
            username,
            password,
            ssl
        };

        // Send test connection request to backend
        fetch('/api/connections/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', `Connection successful! PostgreSQL ${data.version} detected.`);
            } else {
                // Show detailed error message for debugging
                showAlert('danger', `<strong>Connection failed:</strong> ${data.error}`);
                console.error('Connection test error details:', data.details);
            }
        })
        .catch(error => {
            showAlert('danger', `Connection test failed: ${error.message}`);
            console.error('Connection test error:', error);
        })
        .finally(() => {
            // Reset button state
            saveConnectionBtn.disabled = false;
            testConnectionBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        });
    }

    // Save new connection
    function saveNewConnection() {
        const name = document.getElementById('connection-name').value;
        const host = document.getElementById('connection-host').value;
        const port = document.getElementById('connection-port').value;
        const database = document.getElementById('connection-database').value;
        const username = document.getElementById('connection-username').value;
        const password = document.getElementById('connection-password').value;
        const ssl = document.getElementById('connection-ssl').checked;

        // Validate form fields
        if (!validateConnectionForm(name, host, database, username, password)) {
            return;
        }

        // Show saving indicator
        saveConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveConnectionBtn.disabled = true;

        // Prepare connection data
        const connectionData = {
            name,
            host,
            port: parseInt(port),
            database,
            username,
            password,
            ssl
        };

        // Send save connection request to backend
        fetch('/api/connections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Add to our connections array
                connections.push(data.connection);

                // Refresh the table
                renderConnectionsTable();

                // Hide the modal
                addConnectionModal.hide();

                // Reset the form
                document.getElementById('add-connection-form').reset();

                // Show success message
                showAlert('success', `Connection "${name}" has been added successfully.`);
            } else {
                showAlert('danger', `Failed to save connection: ${data.error}`);
                console.error('Save connection error details:', data.details);
            }
        })
        .catch(error => {
            showAlert('danger', `Error saving connection: ${error.message}`);
            console.error('Save connection error:', error);
        })
        .finally(() => {
            // Reset button state
            saveConnectionBtn.innerHTML = '<i class="fas fa-save"></i> Save Connection';
            saveConnectionBtn.disabled = false;
        });
    }

    // Validate connection form
    function validateConnectionForm(name, host, database, username, password) {
        let isValid = true;
        let errorMessage = '';

        if (!name.trim()) {
            errorMessage = 'Connection name is required.';
            isValid = false;
        } else if (!host.trim()) {
            errorMessage = 'Host is required.';
            isValid = false;
        } else if (!database.trim()) {
            errorMessage = 'Database name is required.';
            isValid = false;
        } else if (!username.trim()) {
            errorMessage = 'Username is required.';
            isValid = false;
        } else if (!password && !document.getElementById('edit-connection-id')) {
            // Only require password for new connections
            errorMessage = 'Password is required.';
            isValid = false;
        }

        if (!isValid) {
            showAlert('danger', errorMessage);
        }

        return isValid;
    }

    // Test existing connection
    function testExistingConnection(connId) {
        const connection = connections.find(c => c.id === connId);
        
        if (!connection) {
            showAlert('danger', 'Connection not found.');
            return;
        }

        // Show testing alert
        showAlert('info', `Testing connection to ${connection.name}...`, 'testing-alert');

        // Send test request to backend
        fetch(`/api/connections/${connId}/test`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            // Remove the testing alert
            const alert = document.getElementById('testing-alert');
            if (alert) {
                alert.remove();
            }

            if (data.success) {
                showAlert('success', `Connection to "${connection.name}" successful! PostgreSQL ${data.version} detected.`);
                
                // Update status if it was offline
                if (connection.status === 'offline') {
                    connection.status = 'online';
                    renderConnectionsTable();
                }
            } else {
                showAlert('danger', `<strong>Connection to "${connection.name}" failed:</strong> ${data.error}`);
                console.error('Connection test error details:', data.details);
                
                // Update status if it was online
                if (connection.status === 'online') {
                    connection.status = 'offline';
                    renderConnectionsTable();
                }
            }
        })
        .catch(error => {
            showAlert('danger', `Error testing connection: ${error.message}`);
            console.error('Test connection error:', error);
        });
    }

    // Open edit connection modal
    function openEditConnectionModal(connId) {
        const connection = connections.find(c => c.id === connId);
        
        if (!connection) {
            showAlert('danger', 'Connection not found.');
            return;
        }

        // Populate the edit form
        document.getElementById('edit-connection-id').value = connection.id;
        document.getElementById('edit-connection-name').value = connection.name;
        document.getElementById('edit-connection-host').value = connection.host;
        document.getElementById('edit-connection-port').value = connection.port;
        document.getElementById('edit-connection-database').value = connection.database;
        document.getElementById('edit-connection-username').value = connection.username;
        document.getElementById('edit-connection-password').value = ''; // Don't show the password
        document.getElementById('edit-connection-ssl').checked = connection.ssl;

        // Show the modal
        editConnectionModal.show();
    }

    // Test edited connection
    function testEditedConnection() {
        const connId = parseInt(document.getElementById('edit-connection-id').value);
        const name = document.getElementById('edit-connection-name').value;
        const host = document.getElementById('edit-connection-host').value;
        const port = document.getElementById('edit-connection-port').value;
        const database = document.getElementById('edit-connection-database').value;
        const username = document.getElementById('edit-connection-username').value;
        const password = document.getElementById('edit-connection-password').value;
        const ssl = document.getElementById('edit-connection-ssl').checked;

        // Validate form fields (password can be empty for edit)
        if (!validateEditConnectionForm(name, host, database, username)) {
            return;
        }

        // Show testing indicator
        updateConnectionBtn.disabled = true;
        editTestConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';

        // Prepare connection data
        const connectionData = {
            id: connId,
            name,
            host,
            port: parseInt(port),
            database,
            username,
            password, // Include password only if provided
            ssl
        };

        // Send test connection request to backend
        fetch('/api/connections/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', `Connection successful! PostgreSQL ${data.version} detected.`);
            } else {
                showAlert('danger', `<strong>Connection failed:</strong> ${data.error}`);
                console.error('Connection test error details:', data.details);
            }
        })
        .catch(error => {
            showAlert('danger', `Error testing connection: ${error.message}`);
            console.error('Test connection error:', error);
        })
        .finally(() => {
            // Reset button state
            updateConnectionBtn.disabled = false;
            editTestConnectionBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        });
    }

    // Validate edit connection form
    function validateEditConnectionForm(name, host, database, username) {
        let isValid = true;
        let errorMessage = '';

        if (!name.trim()) {
            errorMessage = 'Connection name is required.';
            isValid = false;
        } else if (!host.trim()) {
            errorMessage = 'Host is required.';
            isValid = false;
        } else if (!database.trim()) {
            errorMessage = 'Database name is required.';
            isValid = false;
        } else if (!username.trim()) {
            errorMessage = 'Username is required.';
            isValid = false;
        }

        if (!isValid) {
            showAlert('danger', errorMessage);
        }

        return isValid;
    }

    // Update connection
    function updateConnection() {
        const connId = parseInt(document.getElementById('edit-connection-id').value);
        const name = document.getElementById('edit-connection-name').value;
        const host = document.getElementById('edit-connection-host').value;
        const port = document.getElementById('edit-connection-port').value;
        const database = document.getElementById('edit-connection-database').value;
        const username = document.getElementById('edit-connection-username').value;
        const password = document.getElementById('edit-connection-password').value;
        const ssl = document.getElementById('edit-connection-ssl').checked;

        // Validate form fields (password can be empty for edit)
        if (!validateEditConnectionForm(name, host, database, username)) {
            return;
        }

        // Show updating indicator
        updateConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        updateConnectionBtn.disabled = true;

        // Prepare connection data
        const connectionData = {
            name,
            host,
            port: parseInt(port),
            database,
            username,
            ssl
        };

        // Add password only if provided
        if (password) {
            connectionData.password = password;
        }

        // Send update connection request to backend
        fetch(`/api/connections/${connId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Find and update the connection in our array
                const connectionIndex = connections.findIndex(c => c.id === connId);
                if (connectionIndex !== -1) {
                    connections[connectionIndex] = {
                        ...connections[connectionIndex],
                        ...connectionData,
                        id: connId // Ensure ID is preserved
                    };
                }

                // Refresh the table
                renderConnectionsTable();

                // Hide the modal
                editConnectionModal.hide();

                // Show success message
                showAlert('success', `Connection "${name}" has been updated successfully.`);
            } else {
                showAlert('danger', `Failed to update connection: ${data.error}`);
                console.error('Update connection error details:', data.details);
            }
        })
        .catch(error => {
            showAlert('danger', `Error updating connection: ${error.message}`);
            console.error('Update connection error:', error);
        })
        .finally(() => {
            // Reset button state
            updateConnectionBtn.innerHTML = '<i class="fas fa-save"></i> Update Connection';
            updateConnectionBtn.disabled = false;
        });
    }

    // Open delete connection modal
    function openDeleteConnectionModal(connId) {
        const connection = connections.find(c => c.id === connId);
        
        if (!connection) {
            showAlert('danger', 'Connection not found.');
            return;
        }

        // Store the connection ID in the confirm button's data attribute
        confirmDeleteConnectionBtn.setAttribute('data-id', connId);

        // Update modal text to include connection name
        const modalBody = document.querySelector('#delete-connection-modal .modal-body');
        modalBody.innerHTML = `
            <p><i class="fas fa-exclamation-triangle text-warning me-2"></i> Are you sure you want to delete the connection "${connection.name}"?</p>
            <p>This will permanently remove the connection and all associated historical monitoring data. This action cannot be undone.</p>
        `;

        // Show the modal
        deleteConnectionModal.show();
    }

    // Delete connection
    function deleteConnection() {
        const connId = parseInt(confirmDeleteConnectionBtn.getAttribute('data-id'));
        
        // Find the connection in our array
        const connectionIndex = connections.findIndex(c => c.id === connId);
        const connectionName = connections[connectionIndex]?.name || 'Unknown';
        
        if (connectionIndex === -1) {
            showAlert('danger', 'Connection not found.');
            return;
        }

        // Show deleting indicator
        confirmDeleteConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        confirmDeleteConnectionBtn.disabled = true;

        // Send delete connection request to backend
        fetch(`/api/connections/${connId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove the connection from our array
                connections.splice(connectionIndex, 1);

                // Refresh the table
                renderConnectionsTable();

                // Hide the modal
                deleteConnectionModal.hide();

                // Show success message
                showAlert('success', `Connection "${connectionName}" has been deleted successfully.`);
            } else {
                showAlert('danger', `Failed to delete connection: ${data.error}`);
                console.error('Delete connection error details:', data.details);
            }
        })
        .catch(error => {
            showAlert('danger', `Error deleting connection: ${error.message}`);
            console.error('Delete connection error:', error);
        })
        .finally(() => {
            // Reset button state
            confirmDeleteConnectionBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Connection';
            confirmDeleteConnectionBtn.disabled = false;
        });
    }

    // Refresh connections
    function refreshConnections() {
        // Show refreshing indicator
        refreshConnectionsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshConnectionsBtn.disabled = true;

        // Fetch updated connections from the backend
        fetch('/api/connections')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                connections = data;
                renderConnectionsTable();
                showAlert('success', 'Connections refreshed successfully.');
            })
            .catch(error => {
                console.error('Error refreshing connections:', error);
                showAlert('danger', `Failed to refresh connections: ${error.message}`);
            })
            .finally(() => {
                // Reset button state
                refreshConnectionsBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                refreshConnectionsBtn.disabled = false;
            });
    }

    // Show alert
    function showAlert(type, message, id = null) {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.setAttribute('role', 'alert');
        
        if (id) {
            alert.id = id;
        }
        
        // Add alert content
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Find the container for alerts
        const alertContainer = document.createElement('div');
        alertContainer.className = 'alert-container';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '80px';
        alertContainer.style.right = '20px';
        alertContainer.style.maxWidth = '400px';
        alertContainer.style.zIndex = '9999';
        
        // Check if container already exists
        let container = document.querySelector('.alert-container');
        if (!container) {
            document.body.appendChild(alertContainer);
            container = alertContainer;
        }
        
        // Add the alert to the container
        container.appendChild(alert);
        
        // Auto-remove after some time (longer for errors to allow reading)
        const timeout = type === 'danger' ? 10000 : 5000;
        if (!id) {
            setTimeout(() => {
                if (alert && alert.parentNode) {
                    alert.classList.remove('show');
                    setTimeout(() => alert.remove(), 150);
                }
            }, timeout);
        }
    }

    // Initialize the connections manager
    initConnectionsManager();
});