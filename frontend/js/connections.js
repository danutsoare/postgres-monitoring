// PostgreSQL Monitor - Connection Manager with Direct DB Connection Support
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

    // Connection storage key for localStorage
    const STORAGE_KEY = 'pg-monitor-connections';
    
    // Initialize connections array
    let connections = [];

    // Initialize the connections table
    function initConnectionsManager() {
        // Load connections from localStorage
        loadConnections();
        setupEventListeners();
        
        // Display the debug panel for developers
        if (isDebugMode()) {
            createDebugPanel();
        }
    }

    // Check if debug mode is enabled via URL parameter
    function isDebugMode() {
        return window.location.search.includes('debug=true');
    }
    
    // Load connections from localStorage
    function loadConnections() {
        // Show loading state
        const tbody = connectionsTable.querySelector('tbody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading connections...</td></tr>';

        try {
            // Get connections from localStorage
            const storedConnections = localStorage.getItem(STORAGE_KEY);
            if (storedConnections) {
                connections = JSON.parse(storedConnections);
                // Remove passwords from memory after loading
                connections.forEach(conn => {
                    delete conn.password;
                });
            } else {
                connections = [];
            }
            renderConnectionsTable();
        } catch (error) {
            console.error('Error loading connections from localStorage:', error);
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">
                Failed to load connections. ${error.message}</td></tr>`;
        }
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
                <td>${escapeHtml(conn.name)}</td>
                <td>${escapeHtml(conn.host)}:${conn.port} ${conn.ssl ? '<i class="fas fa-lock text-success" title="SSL Enabled"></i>' : ''}</td>
                <td>${escapeHtml(conn.database)}</td>
                <td><span class="badge bg-${statusClass}">${conn.status || 'unknown'}</span></td>
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
        
        // Save connections to localStorage (without passwords)
        const connectionsToSave = connections.map(conn => {
            // Create a copy without the password
            const { password, ...connWithoutPassword } = conn;
            return connWithoutPassword;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(connectionsToSave));
    }

    // Escape HTML to prevent XSS
    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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

    // Test new connection using direct PostgreSQL connection
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
        testConnectionBtn.disabled = true;

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

        // Log connection attempt for debugging
        console.log('Testing connection with data:', {
            ...connectionData,
            password: '********' // Hide password in logs
        });

        // Use the direct PgClient to test connection if available, otherwise fallback to API
        if (window.PgClient) {
            window.PgClient.testConnection(connectionData)
                .then(handleConnectionTestResult)
                .catch(handleConnectionTestError)
                .finally(resetTestConnectionButton);
        } else {
            // Fallback to API if PgClient is not available
            fetch('/api/connections/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(connectionData)
            })
            .then(response => response.json())
            .then(handleConnectionTestResult)
            .catch(handleConnectionTestError)
            .finally(resetTestConnectionButton);
        }
    }

    // Handler for successful connection test response
    function handleConnectionTestResult(data) {
        if (data.success) {
            showAlert('success', `Connection successful! PostgreSQL ${data.version} detected.`);
            
            // If we have detailed information, log it for debugging
            if (data.details) {
                console.log('Connection details:', data.details);
            }
        } else {
            // Show detailed error message
            showAlert('danger', `<strong>Connection failed:</strong> ${data.error}`);
            console.error('Connection test error details:', data.details);
            
            // Add detailed error to debug panel if it exists
            if (isDebugMode()) {
                appendToDebugPanel(`Connection Error: ${data.error}\n\nDetails: ${JSON.stringify(data.details, null, 2)}`);
            }
        }
    }

    // Handler for connection test errors
    function handleConnectionTestError(error) {
        showAlert('danger', `Connection test error: ${error.message}`);
        console.error('Connection test exception:', error);
        
        // Add error to debug panel if it exists
        if (isDebugMode()) {
            appendToDebugPanel(`Connection Exception: ${error.message}\n\nStack: ${error.stack}`);
        }
    }

    // Reset test connection button state
    function resetTestConnectionButton() {
        saveConnectionBtn.disabled = false;
        testConnectionBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        testConnectionBtn.disabled = false;
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

        // Test the connection first to ensure it works
        const connectionData = {
            name,
            host,
            port: parseInt(port),
            database,
            username,
            password,
            ssl
        };

        // Use direct database connection to test if available
        const testConnection = window.PgClient ? 
            window.PgClient.testConnection(connectionData) :
            fetch('/api/connections/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(connectionData)
            }).then(response => response.json());

        testConnection
            .then(result => {
                if (result.success) {
                    // Connection test successful, proceed with saving
                    // Generate a unique ID for the new connection
                    const newId = generateUniqueId();
                    
                    // Create connection object
                    const newConnection = {
                        id: newId,
                        name: name,
                        host: host,
                        port: parseInt(port),
                        database: database,
                        username: username,
                        status: 'online',
                        ssl: ssl,
                        version: result.version,
                        lastTested: new Date().toISOString()
                    };
                    
                    // Store the connection password in a secure way
                    // In a real app, this would be encrypted or stored securely
                    // For demonstration, we're using sessionStorage temporarily
                    if (password) {
                        sessionStorage.setItem(`pg-monitor-conn-pwd-${newId}`, password);
                    }
                    
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
                } else {
                    // Connection test failed, show error
                    showAlert('danger', `Cannot save connection: ${result.error}`);
                    console.error('Connection test failed during save:', result.details);
                }
            })
            .catch(error => {
                showAlert('danger', `Error testing connection: ${error.message}`);
                console.error('Error during save connection test:', error);
            })
            .finally(() => {
                // Reset button state
                saveConnectionBtn.innerHTML = '<i class="fas fa-save"></i> Save Connection';
                saveConnectionBtn.disabled = false;
            });
    }

    // Generate a unique ID for new connections
    function generateUniqueId() {
        // Find the highest existing ID and increment by 1
        const maxId = connections.length > 0 ? 
            Math.max(...connections.map(c => c.id)) : 0;
        return maxId + 1;
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
        
        // Prepare connection data
        const connectionData = {
            ...connection,
            // Retrieve the password from sessionStorage
            password: sessionStorage.getItem(`pg-monitor-conn-pwd-${connId}`)
        };

        // Use direct database connection if available
        const testConnection = window.PgClient ? 
            window.PgClient.testConnection(connectionData) :
            fetch(`/api/connections/${connId}/test`, {
                method: 'POST'
            }).then(response => response.json());

        testConnection
            .then(data => {
                // Remove the testing alert
                const alert = document.getElementById('testing-alert');
                if (alert) {
                    alert.remove();
                }

                if (data.success) {
                    showAlert('success', `Connection to "${connection.name}" successful! PostgreSQL ${data.version} detected.`);
                    
                    // Update connection status and version
                    connection.status = 'online';
                    if (data.version) {
                        connection.version = data.version;
                    }
                    connection.lastTested = new Date().toISOString();
                    
                    renderConnectionsTable();
                } else {
                    showAlert('danger', `<strong>Connection to "${connection.name}" failed:</strong> ${data.error}`);
                    console.error('Connection test error details:', data.details);
                    
                    // Update status if it was online
                    connection.status = 'offline';
                    connection.lastTested = new Date().toISOString();
                    
                    renderConnectionsTable();
                    
                    // Add to debug panel if enabled
                    if (isDebugMode()) {
                        appendToDebugPanel(`Connection to "${connection.name}" failed:\n${data.error}\n\nDetails: ${JSON.stringify(data.details, null, 2)}`);
                    }
                }
            })
            .catch(error => {
                const alert = document.getElementById('testing-alert');
                if (alert) {
                    alert.remove();
                }
                
                showAlert('danger', `Error testing connection: ${error.message}`);
                console.error('Test connection error:', error);
                
                // Update status
                connection.status = 'error';
                connection.lastTested = new Date().toISOString();
                renderConnectionsTable();
                
                // Add to debug panel if enabled
                if (isDebugMode()) {
                    appendToDebugPanel(`Error testing connection to "${connection.name}":\n${error.message}\n\nStack: ${error.stack}`);
                }
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
        editTestConnectionBtn.disabled = true;

        // Prepare connection data
        const connectionData = {
            id: connId,
            name,
            host,
            port: parseInt(port),
            database,
            username,
            ssl
        };

        // Use the stored password if no new password is provided
        if (password) {
            connectionData.password = password;
        } else {
            // Retrieve the stored password from sessionStorage
            const storedPassword = sessionStorage.getItem(`pg-monitor-conn-pwd-${connId}`);
            if (storedPassword) {
                connectionData.password = storedPassword;
            }
        }

        //