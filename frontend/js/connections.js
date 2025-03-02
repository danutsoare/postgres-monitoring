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

    // Sample connection data (would be fetched from server in production)
    let connections = [
        {
            id: 1,
            name: 'Local Development',
            host: 'localhost',
            port: 5432,
            database: 'postgres',
            username: 'postgres',
            status: 'online',
            ssl: false,
            version: '15.3'
        },
        {
            id: 2,
            name: 'Production Database',
            host: 'pg-prod.example.com',
            port: 5432,
            database: 'app_db',
            username: 'app_user',
            status: 'online',
            ssl: true,
            version: '15.3'
        },
        {
            id: 3,
            name: 'Analytics Server',
            host: 'pg-analytics.example.com',
            port: 5432,
            database: 'analytics',
            username: 'analytics_user',
            status: 'offline',
            ssl: true,
            version: '14.7'
        }
    ];

    // Initialize the connections table
    function initConnectionsManager() {
        loadConnections();
        setupEventListeners();
    }

    // Load connections data
    function loadConnections() {
        renderConnectionsTable();
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

        // Simulate API call with timeout
        setTimeout(() => {
            // In a real app, this would be an actual API call to test the connection
            const success = Math.random() > 0.2; // 80% success rate for demo

            if (success) {
                showAlert('success', 'Connection successful! PostgreSQL 15.3 detected.');
            } else {
                showAlert('danger', 'Connection failed. Please check your credentials and network settings.');
            }

            // Reset button state
            saveConnectionBtn.disabled = false;
            testConnectionBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        }, 1500);
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

        // Simulate API call with timeout
        setTimeout(() => {
            // Create a new connection object
            const newConnection = {
                id: connections.length > 0 ? Math.max(...connections.map(c => c.id)) + 1 : 1,
                name: name,
                host: host,
                port: parseInt(port),
                database: database,
                username: username,
                // In a real app, we wouldn't store the password in the browser
                status: 'online',
                ssl: ssl,
                version: '15.3' // This would be detected during the connection test
            };

            // Add to our connections array
            connections.push(newConnection);

            // Refresh the table
            renderConnectionsTable();

            // Hide the modal
            addConnectionModal.hide();

            // Reset the form
            document.getElementById('add-connection-form').reset();

            // Show success message
            showAlert('success', `Connection "${name}" has been added successfully.`);

            // Reset button state
            saveConnectionBtn.innerHTML = '<i class="fas fa-save"></i> Save Connection';
            saveConnectionBtn.disabled = false;
        }, 1000);
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

        // Simulate API call with timeout
        setTimeout(() => {
            // Remove the testing alert
            const alert = document.getElementById('testing-alert');
            if (alert) {
                alert.remove();
            }

            // In a real app, this would be an actual API call to test the connection
            const success = Math.random() > 0.2; // 80% success rate for demo

            if (success) {
                showAlert('success', `Connection to "${connection.name}" successful! PostgreSQL ${connection.version} detected.`);
                
                // Update status if it was offline
                if (connection.status === 'offline') {
                    connection.status = 'online';
                    renderConnectionsTable();
                }
            } else {
                showAlert('danger', `Connection to "${connection.name}" failed. Please check your credentials and network settings.`);
                
                // Update status if it was online
                if (connection.status === 'online') {
                    connection.status = 'offline';
                    renderConnectionsTable();
                }
            }
        }, 1500);
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

        // Simulate API call with timeout
        setTimeout(() => {
            // In a real app, this would be an actual API call to test the connection
            const success = Math.random() > 0.2; // 80% success rate for demo

            if (success) {
                showAlert('success', 'Connection successful! PostgreSQL 15.3 detected.');
            } else {
                showAlert('danger', 'Connection failed. Please check your credentials and network settings.');
            }

            // Reset button state
            updateConnectionBtn.disabled = false;
            editTestConnectionBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        }, 1500);
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

        // Find the connection in our array
        const connectionIndex = connections.findIndex(c => c.id === connId);
        
        if (connectionIndex === -1) {
            showAlert('danger', 'Connection not found.');
            return;
        }

        // Show updating indicator
        updateConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        updateConnectionBtn.disabled = true;

        // Simulate API call with timeout
        setTimeout(() => {
            // Update the connection object
            connections[connectionIndex] = {
                ...connections[connectionIndex],
                name: name,
                host: host,
                port: parseInt(port),
                database: database,
                username: username,
                ssl: ssl
            };

            // If password was provided, update it (in a real app, we'd send it to the server)
            if (password) {
                // We don't actually update the password in this demo
            }

            // Refresh the table
            renderConnectionsTable();

            // Hide the modal
            editConnectionModal.hide();

            // Show success message
            showAlert('success', `Connection "${name}" has been updated successfully.`);

            // Reset button state
            updateConnectionBtn.innerHTML = '<i class="fas fa-save"></i> Update Connection';
            updateConnectionBtn.disabled = false;
        }, 1000);
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

        // Simulate API call with timeout
        setTimeout(() => {
            // Remove the connection from our array
            connections.splice(connectionIndex, 1);

            // Refresh the table
            renderConnectionsTable();

            // Hide the modal
            deleteConnectionModal.hide();

            // Show success message
            showAlert('success', `Connection "${connectionName}" has been deleted successfully.`);

            // Reset button state
            confirmDeleteConnectionBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Connection';
            confirmDeleteConnectionBtn.disabled = false;
        }, 1000);
    }

    // Refresh connections
    function refreshConnections() {
        // Show refreshing indicator
        refreshConnectionsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshConnectionsBtn.disabled = true;

        // Simulate API call with timeout
        setTimeout(() => {
            // In a real app, this would fetch fresh connection data from the server
            
            // Randomly change some connection statuses for demo purposes
            connections.forEach(conn => {
                if (Math.random() > 0.8) {
                    conn.status = conn.status === 'online' ? 'offline' : 'online';
                }
            });

            // Refresh the table
            renderConnectionsTable();

            // Reset button state
            refreshConnectionsBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            refreshConnectionsBtn.disabled = false;

            // Show success message
            showAlert('success', 'Connections refreshed successfully.');
        }, 1000);
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
        alertContainer.style.top = '20px';
        alertContainer.style.right = '20px';
        alertContainer.style.zIndex = '9999';
        
        // Check if container already exists
        let container = document.querySelector('.alert-container');
        if (!container) {
            document.body.appendChild(alertContainer);
            container = alertContainer;
        }
        
        // Add the alert to the container
        container.appendChild(alert);
        
        // Auto-remove after 5 seconds for non-danger alerts
        if (type !== 'danger' && !id) {
            setTimeout(() => {
                if (alert && alert.parentNode) {
                    alert.classList.remove('show');
                    setTimeout(() => alert.remove(), 150);
                }
            }, 5000);
        }
    }

    // Initialize the connections manager
    initConnectionsManager();
});