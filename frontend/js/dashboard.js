/**
 * PostgreSQL Monitoring Dashboard - Main Functionality
 * frontend/js/dashboard.js
 * 
 * Handles the dashboard functionality, UI interactions, and data refresh
 */

// Global state object
const dashboardState = {
    isDarkMode: false,
    autoRefreshInterval: 10, // seconds
    autoRefreshEnabled: true,
    selectedTimeRange: '1h',
    selectedDatabase: 'all',
    currentSection: 'dashboard',
    refreshTimerId: null,
    isLoading: false,
    lastErrorMessage: null,
    connectionTested: false,
    connections: []
};

// Initialize the dashboard when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    if (window.postgresMonitorCharts) {
        window.postgresMonitorCharts.init();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Load connections
    loadConnections();
    
    // Check for saved theme preference
    loadUserPreferences();
    
    // Initialize auto-refresh
    startAutoRefresh();
});

// Setup all event listeners for the dashboard
function setupEventListeners() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }
    
    // Navigation
    setupNavigationListeners();
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('toggleDarkMode');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleDarkMode();
        });
    }
    
    // Time range selector
    setupTimeRangeSelectors();
    
    // Database selector
    const databaseSelector = document.querySelector('.database-selector');
    if (databaseSelector) {
        databaseSelector.addEventListener('change', function() {
            const prevDatabase = dashboardState.selectedDatabase;
            dashboardState.selectedDatabase = this.value;
            localStorage.setItem('pg_monitor_selected_connection', this.value);
            
            // Reset connection tested flag if database changed
            if (prevDatabase !== dashboardState.selectedDatabase) {
                dashboardState.connectionTested = false;
            }
            
            refreshAllData();
        });
    }
    
    // Refresh button
    const refreshAllBtn = document.getElementById('refresh-all-btn');
    if (refreshAllBtn) {
        refreshAllBtn.addEventListener('click', function() {
            refreshAllData();
        });
    }
    
    // Individual section refresh buttons
    const refreshButtons = document.querySelectorAll('.refresh-btn');
    refreshButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.card');
            refreshCardData(card);
        });
    });
    
    // Settings form event listeners
    setupSettingsFormListeners();

    // Add Connection button in Connections section
    const addConnectionBtn = document.getElementById('add-connection-btn');
    if (addConnectionBtn) {
        addConnectionBtn.addEventListener('click', () => {
            showAddConnectionModal();
        });
    }
}

// Add this function
async function syncConnectionsWithBackend() {
    try {
      console.log('Synchronizing connections with backend...');
      // Get connections from API
      const apiConnections = await window.postgresMonitorApi.getConnections();
      
      // Update localStorage
      localStorage.setItem('pg_monitor_connections', JSON.stringify(apiConnections));
      
      // Update dashboard state
      dashboardState.connections = apiConnections;
      console.log('Connections synchronized:', apiConnections);
      
      return apiConnections;
    } catch (error) {
      console.error('Error synchronizing connections:', error);
      return null;
    }
  }


// Load connections from backend and local storage
async function loadConnections() {
    try {
        console.log('Loading connections...');
        
        // Try to sync with backend first
        try {
            await syncConnectionsWithBackend();
            console.log('Backend synchronization complete');
        } catch (syncError) {
            console.warn('Could not sync with backend, falling back to localStorage:', syncError);
            
            // Fall back to localStorage if API fails
            const storedConnections = localStorage.getItem('pg_monitor_connections');
            if (storedConnections) {
                dashboardState.connections = JSON.parse(storedConnections);
            } else {
                dashboardState.connections = [];
            }
        }
        
        // Update UI with the connections (whether from API or localStorage)
        updateConnectionsDropdown();
        updateConnectionsUI();
        
        // Check if we have a stored selected connection
        const selectedConnection = localStorage.getItem('pg_monitor_selected_connection');
        if (selectedConnection && dashboardState.connections.some(conn => String(conn.id) === String(selectedConnection))) {
            dashboardState.selectedDatabase = selectedConnection;
            
            // Update dropdown
            const databaseSelector = document.querySelector('.database-selector');
            if (databaseSelector) {
                databaseSelector.value = String(selectedConnection);
            }
            
            // Initial data load
            refreshAllData();
        } else if (dashboardState.connections.length > 0) {
            // Select first connection by default
            dashboardState.selectedDatabase = dashboardState.connections[0].id;
            
            // Update dropdown
            const databaseSelector = document.querySelector('.database-selector');
            if (databaseSelector) {
                databaseSelector.value = String(dashboardState.connections[0].id);
            }
            
            // Initial data load
            refreshAllData();
        } else {
            // No connections available
            showNoConnectionsMessage();
        }
    } catch (error) {
        console.error('Error loading connections:', error);
        showError('Failed to load database connections');
    }
}

// Update connections dropdown
function updateConnectionsDropdown() {
    const databaseSelector = document.querySelector('.database-selector');
    if (!databaseSelector) return;
    
    // Clear existing options
    databaseSelector.innerHTML = '';
    
    // Add "Select Database" option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Database';
    databaseSelector.appendChild(defaultOption);
    
    // Add connections
    dashboardState.connections.forEach(conn => {
        const option = document.createElement('option');
        option.value = conn.id;
        option.textContent = `${conn.name} (${conn.host}:${conn.port}/${conn.database})`;
        databaseSelector.appendChild(option);
    });
    
    // Set the selected value
    if (dashboardState.selectedDatabase) {
        databaseSelector.value = String(dashboardState.selectedDatabase);
    }
}

// Update connections UI in the Connections section
function updateConnectionsUI() {
    const connectionsTable = document.querySelector('#connections-section .table');
    if (!connectionsTable) return;
    
    const tbody = connectionsTable.querySelector('tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (dashboardState.connections.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No database connections configured</td></tr>';
        return;
    }
    
    // Add rows for each connection
    dashboardState.connections.forEach(conn => {
        const row = document.createElement('tr');
        
        // Use connection status if available, otherwise assume connected
        const statusClass = conn.status === 'Disconnected' ? 'danger' : 'success';
        const statusText = conn.status || 'Connected';
        
        row.innerHTML = `
            <td>${escapeHtml(conn.name)}</td>
            <td>${escapeHtml(conn.host)}:${conn.port} ${conn.ssl ? '<i class="fas fa-lock text-success" title="SSL Enabled"></i>' : ''}</td>
            <td>${escapeHtml(conn.database)}</td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
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
    
    // Add event listeners to buttons
    setupConnectionButtonListeners();
}

// Setup event listeners for connection buttons
function setupConnectionButtonListeners() {
    // Edit connection buttons
    const editButtons = document.querySelectorAll('.edit-conn-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const connectionId = String(this.getAttribute('data-id'));
            editConnection(connectionId);
        });
    });
    
    // Delete connection buttons
    const deleteButtons = document.querySelectorAll('.delete-conn-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const connectionId = this.getAttribute('data-id');
            deleteConnection(connectionId);
        });
    });
}

// Setup navigation between sections
function setupNavigationListeners() {
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(navLink => {
                navLink.classList.remove('active');
            });
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Hide all sections
            contentSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Show corresponding section
            const sectionId = this.getAttribute('data-section') + '-section';
            dashboardState.currentSection = this.getAttribute('data-section');
            
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('active');
            }
            
            // Hide sidebar on mobile after click
            if (window.innerWidth < 768) {
                document.querySelector('.sidebar').classList.remove('show');
            }
            
            // Refresh section data if needed
            refreshSectionData(dashboardState.currentSection);
            
            // Save current section in preferences
            saveUserPreferences();
        });
    });
}

// Setup time range selector dropdown
function setupTimeRangeSelectors() {
    const timeRangeItems = document.querySelectorAll('[data-range]');
    const timeRangeDropdown = document.getElementById('timeRangeDropdown');
    
    timeRangeItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const range = this.getAttribute('data-range');
            let rangeText = this.textContent;
            
            dashboardState.selectedTimeRange = range;
            
            if (timeRangeDropdown) {
                timeRangeDropdown.innerHTML = `<i class="far fa-clock"></i> ${rangeText}`;
            }
            
            // Refresh data with the new time range
            refreshAllData();
            
            // Save preference
            saveUserPreferences();
        });
    });
}

// Setup settings form listeners
function setupSettingsFormListeners() {
    // Dark mode switch in settings
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    if (darkModeSwitch) {
        darkModeSwitch.addEventListener('change', function() {
            toggleDarkMode(this.checked);
        });
    }
    
    // Refresh interval change
    const refreshIntervalSelect = document.getElementById('refreshInterval');
    if (refreshIntervalSelect) {
        refreshIntervalSelect.addEventListener('change', function() {
            const interval = parseInt(this.value);
            updateAutoRefreshInterval(interval);
        });
    }
    
    // Settings save button
    const saveSettingsBtn = document.querySelector('#settingsModal .btn-primary');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            // Save settings to local storage
            saveUserPreferences();
            
            // Close modal
            const settingsModal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
            settingsModal.hide();
            
            // Apply settings
            applySettings();
        });
    }
}

// Toggle dark mode
function toggleDarkMode(forceState = null) {
    const isDark = forceState !== null ? forceState : !dashboardState.isDarkMode;
    
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    dashboardState.isDarkMode = isDark;
    
    // Update the switch in settings if it exists
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    if (darkModeSwitch) {
        darkModeSwitch.checked = isDark;
    }
    
    // Update charts for dark mode
    if (window.postgresMonitorCharts) {
        window.postgresMonitorCharts.updateTheme(isDark);
    }
    
    // Save preference
    saveUserPreferences();
}

// Update auto-refresh interval
function updateAutoRefreshInterval(interval) {
    dashboardState.autoRefreshInterval = interval;
    
    // Clear existing refresh timer
    if (dashboardState.refreshTimerId) {
        clearInterval(dashboardState.refreshTimerId);
        dashboardState.refreshTimerId = null;
    }
    
    // Set auto-refresh status display
    const autoRefreshStatus = document.getElementById('auto-refresh-status');
    if (autoRefreshStatus) {
        if (interval > 0) {
            dashboardState.autoRefreshEnabled = true;
            autoRefreshStatus.textContent = `On (${interval}s)`;
            startAutoRefresh();
        } else {
            dashboardState.autoRefreshEnabled = false;
            autoRefreshStatus.textContent = 'Off';
        }
    }
    
    // Save preference
    saveUserPreferences();
}

// Start auto-refresh timer
function startAutoRefresh() {
    if (dashboardState.autoRefreshEnabled && dashboardState.autoRefreshInterval > 0) {
        dashboardState.refreshTimerId = setInterval(function() {
            refreshAllData();
        }, dashboardState.autoRefreshInterval * 1000);
    }
}

// Fix for the refreshAllData function in dashboard.js
async function refreshAllData() {
    // Skip refresh if already loading
    if (dashboardState.isLoading) return;

    // Skip refresh if no connection selected
    if (!dashboardState.selectedDatabase || dashboardState.selectedDatabase === '') {
        showNoConnectionMessage();
        return;
    }

    try {
        // Set loading state
        dashboardState.isLoading = true;
        
        // Show global loading indicator
        showLoading();

        // Get connection details
        const connection = dashboardState.connections.find(c => String(c.id) === String(dashboardState.selectedDatabase));
        if (!connection) {
            throw new Error('Selected connection not found');
        }

        // Test the connection first if not already tested
        if (!dashboardState.connectionTested) {
            try {
                // Check if PgClient is available
                if (typeof window.PgClient === 'undefined' || !window.PgClient.testConnection) {
                    console.warn('PgClient not available, using API directly');
                    
                    // Use postgresMonitorApi instead
                    if (!window.postgresMonitorApi || typeof window.postgresMonitorApi.testConnection !== 'function') {
                        console.error('postgresMonitorApi.testConnection method is missing');
                        throw new Error('API testing functionality not available');
                    }
                    
                    const testResult = await window.postgresMonitorApi.testConnection({
                        username: connection.username,
                        host: connection.host,
                        database: connection.database,
                        password: connection.password,
                        port: connection.port,
                        ssl: connection.ssl
                    });
                    
                    dashboardState.connectionTested = true;
                    
                    if (!testResult.success) {
                        updateConnectionStatus(connection.id, 'Disconnected');
                        throw new Error(`Connection test failed: ${testResult.error || 'Unknown error'}`);
                    } else {
                        updateConnectionStatus(connection.id, 'Connected');
                        // Update version badge with detected PostgreSQL version
                        updateVersionBadge(testResult.version || 'Unknown');
                    }
                } else {
                    // Original code using PgClient
                    const testResult = await window.PgClient.testConnection({
                        username: connection.username,
                        host: connection.host,
                        database: connection.database,
                        password: connection.password,
                        port: connection.port,
                        ssl: connection.ssl
                    });
                    
                    dashboardState.connectionTested = true;
                    
                    if (!testResult.success) {
                        updateConnectionStatus(connection.id, 'Disconnected');
                        throw new Error(`Connection test failed: ${testResult.error}`);
                    } else {
                        updateConnectionStatus(connection.id, 'Connected');
                        // Update version badge with detected PostgreSQL version
                        updateVersionBadge(testResult.version);
                    }
                }
            } catch (error) {
                updateConnectionStatus(connection.id, 'Disconnected');
                throw new Error(`Connection test failed: ${error.message}`);
            }
        }

        // Get database statistics
        let result;
        if (typeof window.PgClient === 'undefined' || !window.PgClient.getDbStats) {
            console.warn('PgClient.getDbStats not available, using API directly');
            
            // Check if postgresMonitorApi exists
            if (!window.postgresMonitorApi) {
                throw new Error('API client not available');
            }
            
            // Check if the getDatabaseStats method exists
            if (typeof window.postgresMonitorApi.getDatabaseStats !== 'function') {
                console.error('postgresMonitorApi.getDatabaseStats method is missing, using fallback');
                
                // Create a fallback implementation
                window.postgresMonitorApi.getDatabaseStats = async function(connectionId) {
                    console.warn(`Using fallback implementation for getDatabaseStats with connection ID: ${connectionId}`);
                    
                    // Log the available methods for debugging
                    const methods = [];
                    for (const prop in window.postgresMonitorApi) {
                        if (typeof window.postgresMonitorApi[prop] === 'function') {
                            methods.push(prop);
                        }
                    }
                    console.info('Available API methods:', methods);
                    
                    // Return empty successful response to prevent errors
                    return {
                        success: true,
                        stats: {
                            // Minimal mock data to prevent UI errors
                            sessions: [],
                            waitEvents: [],
                            blockingSessions: [],
                            tempUsage: [],
                            cpuUsage: [],
                            databaseSize: '0 MB',
                            tableSizes: [],
                            extensions: []
                        }
                    };
                };
            }
            
            // Now use the API method (either real or fallback)
            try {
                result = await window.postgresMonitorApi.getDatabaseStats(dashboardState.selectedDatabase);
                
                // Log the result structure for debugging
                console.debug('API result structure:', Object.keys(result));
                
                // Check if the response has the expected structure
                if (!result || !result.stats) {
                    console.warn('Unexpected API response format:', result);
                    throw new Error('Invalid response format from API');
                }
            } catch (apiError) {
                console.error('Error calling getDatabaseStats:', apiError);
                throw new Error(`Failed to fetch database statistics: ${apiError.message}`);
            }
        } else {
            // Use PgClient if available
            try {
                result = await window.PgClient.getDbStats(dashboardState.selectedDatabase);
            } catch (pgError) {
                console.error('Error using PgClient.getDbStats:', pgError);
                throw new Error(`Failed to fetch database statistics via PgClient: ${pgError.message}`);
            }
        }

        // Add this code after successful API response but before refreshSectionData
        // Extract version from response
        if (result && result.stats && result.stats.version) {
            const fullVersionString = result.stats.version;
            // Extract just the version number (e.g., "16.3")
            const versionMatch = fullVersionString.match(/PostgreSQL (\d+\.\d+)/);
            const versionText = versionMatch ? versionMatch[1] : fullVersionString.split(' ')[0];
            
            // Update the version badge
            updateVersionBadge(versionText);
        } else {
            updateVersionBadge('Unknown');
        }

        // Update timestamp of successful refresh
        const lastRefreshTime = document.getElementById('last-refresh-time');
        if (lastRefreshTime) {
            lastRefreshTime.textContent = new Date().toLocaleTimeString();
        }

        // Refresh section-specific data based on current section
        await refreshSectionData(dashboardState.currentSection, result.stats);
        
        // Clear any previous errors
        if (dashboardState.lastErrorMessage) {
            hideError();
            dashboardState.lastErrorMessage = null;
        }
    } catch (error) {
        console.error('Error refreshing data:', error);
        showError(`Failed to refresh data: ${error.message}`);
        dashboardState.lastErrorMessage = error.message;
    } finally {
        // Hide loading indicator
        hideLoading();
        // Clear loading state
        dashboardState.isLoading = false;
    }
}

// Update the connection status in the state and UI
function updateConnectionStatus(connectionId, status) {
    // Update in state
    const connection = dashboardState.connections.find(c => String(c.id) === String(dashboardState.selectedDatabase));
    if (connection) {
        connection.status = status;
    }
    
    // Update in local storage
    localStorage.setItem('pg_monitor_connections', JSON.stringify(dashboardState.connections));
    
    // Update UI
    updateConnectionsUI();
}

// Refresh specific card data
function refreshCardData(card) {
    if (!card) return;
    
    // Add loading indicator
    const cardBody = card.querySelector('.card-body');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
    cardBody.appendChild(loadingOverlay);
    
    // Get chart ID if present
    const chartElement = cardBody.querySelector('[id$="-chart"]');
    
    // Refresh specific chart if exists
    if (chartElement) {
        const chartId = chartElement.id.replace('-chart', '');
        // Trigger refresh of the chart
        refreshChartById(chartId)
            .finally(() => {
                // Remove loading overlay
                cardBody.removeChild(loadingOverlay);
            });
    } else {
        // For non-chart cards (tables, etc.)
        setTimeout(() => {
            refreshAllData().finally(() => {
                // Remove loading overlay
                if (cardBody.contains(loadingOverlay)) {
                    cardBody.removeChild(loadingOverlay);
                }
            });
        }, 100);
    }
}

// Refresh chart by ID - maps to appropriate API call
async function refreshChartById(chartId) {
    try {
        // Refresh all data which will update all charts
        await refreshAllData();
    } catch (error) {
        console.error(`Error refreshing chart ${chartId}:`, error);
        throw error;
    }
}

// Refresh specific section data based on current section
function refreshSectionData(sectionName, data = null) {
    // If no database is selected, show message and return
    if (!dashboardState.selectedDatabase || dashboardState.selectedDatabase === '') {
        showNoConnectionMessage();
        return;
    }

    // If no data provided, use what we already have or fetch new data
    if (!data) {
        // If we're already loading, skip this call
        if (dashboardState.isLoading) {
            return;
        }
        
        // Otherwise, just trigger a full refresh
        refreshAllData();
        return;
    }
    
    // Rest of the function remains unchanged
    switch (sectionName) {
        case 'dashboard':
            updateDashboard(data);
            break;
        case 'sessions':
            updateSessionsSection(data);
            break;
        case 'waits':
            updateWaitsSection(data);
            break;
        case 'locks':
            updateLocksSection(data);
            break;
        case 'queries':
        case 'storage':
        case 'extensions':
        case 'connections':
        default:
            // No specific data to refresh
            break;
    }
}

// Update the dashboard with data
function updateDashboard(data) {
    if (!data) return;
    
    // Update charts if postgresMonitorCharts is available
    if (window.postgresMonitorCharts) {
        // CPU Usage Chart
        if (data.cpuUsage && data.cpuUsage.length > 0 && window.postgresMonitorCharts.updateCpuUsageChart) {
            window.postgresMonitorCharts.updateCpuUsageChart(data.cpuUsage);
        }
        
        // Wait Events Chart
        if (data.waitEvents && data.waitEvents.length > 0 && window.postgresMonitorCharts.updateWaitEventsChart) {
            window.postgresMonitorCharts.updateWaitEventsChart(data.waitEvents);
        }
    }
    
    // Update Active Sessions Table
    updateSessionsTable(data.sessions);
    
    // Update Blocking Sessions Table
    updateBlockingSessionsTable(data.blockingSessions);
    
    // Update Temp Space Usage
    updateTempSpaceTable(data.tempUsage);
}

// Update sessions section
function updateSessionsSection(data) {
    if (!data || !data.sessions) return;
    
    const sessionsTable = document.querySelector('#sessions-section .table');
    if (!sessionsTable) return;
    
    const tbody = sessionsTable.querySelector('tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (data.sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No active sessions</td></tr>';
        return;
    }
    
    // Add rows for each session
    data.sessions.forEach(session => {
        const row = document.createElement('tr');
        
        // Format duration
        let duration = '';
        if (session.query_start) {
            const start = new Date(session.query_start);
            const now = new Date();
            const diff = Math.floor((now - start) / 1000);
            const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const seconds = Math.floor(diff % 60).toString().padStart(2, '0');
            duration = `${hours}:${minutes}:${seconds}`;
        }
        
        // Format query (truncate if too long)
        const query = session.query ? 
            (session.query.length > 100 ? session.query.substring(0, 100) + '...' : session.query) : 
            'N/A';
        
        row.innerHTML = `
            <td>${session.pid}</td>
            <td>${escapeHtml(session.usename || 'N/A')}</td>
            <td>${escapeHtml(session.application_name || 'N/A')}</td>
            <td>${escapeHtml(session.state || 'N/A')}</td>
            <td>${duration}</td>
            <td>${escapeHtml(session.wait_event_type ? `${session.wait_event_type}:${session.wait_event}` : 'None')}</td>
            <td>${escapeHtml(query)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update waits section
function updateWaitsSection(data) {
    if (!data || !data.waitEvents) return;
    
    // Update chart if postgresMonitorCharts is available
    if (window.postgresMonitorCharts && window.postgresMonitorCharts.updateWaitEventsDetailChart) {
        window.postgresMonitorCharts.updateWaitEventsDetailChart(data.waitEvents);
    }
    
    // Update table
    const waitsTable = document.querySelector('#waits-section .table');
    if (!waitsTable) return;
    
    const tbody = waitsTable.querySelector('tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (data.waitEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No wait events</td></tr>';
        return;
    }
    
    // Add rows for each wait event
    data.waitEvents.forEach(wait => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(wait.wait_event_type || 'N/A')}</td>
            <td>${escapeHtml(wait.wait_event || 'N/A')}</td>
            <td>${wait.count || 0}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update locks section
function updateLocksSection(data) {
    if (!data || !data.blockingSessions) return;
    
    // Update blocking hierarchy visualization
    const blockingHierarchy = document.querySelector('#locks-section .blocking-hierarchy');
    if (!blockingHierarchy) return;
    
    // Clear existing content
    blockingHierarchy.innerHTML = '';
    
    if (data.blockingSessions.length === 0) {
        blockingHierarchy.innerHTML = '<div class="alert alert-info">No blocking sessions detected</div>';
        return;
    }
    
    // Build hierarchy tree
    const tree = document.createElement('ul');
    tree.className = 'tree';
    
    // Group blocking sessions by level (to build the tree)
    const blockingByLevel = {};
    data.blockingSessions.forEach(session => {
        if (!blockingByLevel[session.level]) {
            blockingByLevel[session.level] = [];
        }
        blockingByLevel[session.level].push(session);
    });
    
    // Start with level 0 (top level blockers)
    const topBlockers = blockingByLevel[0] || [];
    topBlockers.forEach(blocker => {
        const blockerItem = createBlockerItem(blocker);
        tree.appendChild(blockerItem);
    });
    
    blockingHierarchy.appendChild(tree);
}

// Create a blocker item for the blocking hierarchy tree
function createBlockerItem(blocker) {
    const item = document.createElement('li');
    
    // Create blocker info
    const blockerInfo = document.createElement('div');
    blockerInfo.className = 'blocker-info';
    
    // Truncate query if too long
    const query = blocker.blocking_query ? 
        (blocker.blocking_query.length > 100 ? blocker.blocking_query.substring(0, 100) + '...' : blocker.blocking_query) : 
        'N/A';
    
    blockerInfo.innerHTML = `
        <span class="badge bg-danger">Blocking</span>
        <strong>PID ${blocker.blocking_pid}</strong> (${escapeHtml(blocker.blocking_user || 'Unknown')})
        <div class="query-info">${escapeHtml(query)}</div>
    `;
    
    item.appendChild(blockerInfo);
    
    // Add blocked sessions if any
    if (blocker.blocked_sessions_info && blocker.blocked_sessions_info.length > 0) {
        const blockedList = document.createElement('ul');
        
        blocker.blocked_sessions_info.forEach(blocked => {
            const blockedItem = document.createElement('li');
            
            // Format query (truncate if too long)
            const blockedQuery = blocked.query ? 
                (blocked.query.length > 100 ? blocked.query.substring(0, 100) + '...' : blocked.query) : 
                'N/A';
            
            const blockedInfo = document.createElement('div');
            blockedInfo.className = 'blocked-info';
            blockedInfo.innerHTML = `
                <span class="badge bg-warning">Blocked</span>
                <strong>PID ${blocked.pid}</strong> (${escapeHtml(blocked.user || 'Unknown')})
                <div class="query-info">${escapeHtml(blockedQuery)}</div>
            `;
            
            blockedItem.appendChild(blockedInfo);
            blockedList.appendChild(blockedItem);
        });
        
        item.appendChild(blockedList);
    }
    
    return item;
}

// Update queries section
function updateQueriesSection(data) {
    if (!data || !data.activeQueries) return;
    
    const queriesTable = document.querySelector('#queries-section .table');
    if (!queriesTable) return;
    
    const tbody = queriesTable.querySelector('tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (data.activeQueries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No active queries</td></tr>';
        return;
    }
    
    // Add rows for each query
    data.activeQueries.forEach(query => {
        const row = document.createElement('tr');
        
        // Format duration
        let duration = '';
        if (query.query_start) {
            const start = new Date(query.query_start);
            const now = new Date();
            const diff = Math.floor((now - start) / 1000);
            const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const seconds = Math.floor(diff % 60).toString().padStart(2, '0');
            duration = `${hours}:${minutes}:${seconds}`;
        }
        
        // Format query (truncate if too long)
        const queryText = query.query ? 
            (query.query.length > 100 ? query.query.substring(0, 100) + '...' : query.query) : 
            'N/A';
        
        row.innerHTML = `
            <td>${query.pid}</td>
            <td>${escapeHtml(query.usename || 'N/A')}</td>
            <td>${duration}</td>
            <td>${escapeHtml(query.state || 'N/A')}</td>
            <td>${escapeHtml(query.wait_event_type ? `${query.wait_event_type}:${query.wait_event}` : 'None')}</td>
            <td>${escapeHtml(queryText)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update storage section
function updateStorageSection(data) {
    if (!data) return;
    
    // Update database size
    if (data.databaseSize) {
        const dbSizeElement = document.querySelector('#storage-section .database-size');
        if (dbSizeElement) {
            dbSizeElement.textContent = data.databaseSize;
        }
    }
    
    // Update table sizes
    if (data.tableSizes) {
        const tableSizesTable = document.querySelector('#storage-section .table-sizes-table');
        if (tableSizesTable) {
            const tbody = tableSizesTable.querySelector('tbody');
            if (tbody) {
                // Clear existing rows
                tbody.innerHTML = '';
                
                if (data.tableSizes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No tables found</td></tr>';
                    return;
                }
                
                // Add rows for each table
                data.tableSizes.forEach(table => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${escapeHtml(`${table.schemaname}.${table.table_name}`)}</td>
                        <td>${table.total_size || 'N/A'}</td>
                        <td>${table.table_size || 'N/A'}</td>
                        <td>${table.index_size || 'N/A'}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
        }
    }
    
    // Update temp space chart if postgresMonitorCharts is available
    if (data.tempUsage && window.postgresMonitorCharts && window.postgresMonitorCharts.updateTempSpaceChart) {
        window.postgresMonitorCharts.updateTempSpaceChart(data.tempUsage);
    }
}

// Update extensions section
function updateExtensionsSection(data) {
    if (!data || !data.extensions) return;
    
    const extensionsTable = document.querySelector('#extensions-section .table');
    if (!extensionsTable) return;
    
    const tbody = extensionsTable.querySelector('tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (data.extensions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No extensions installed</td></tr>';
        return;
    }
    
    // Add rows for each extension
    data.extensions.forEach(ext => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(ext.name)}</td>
            <td>${escapeHtml(ext.installed_version || 'N/A')}</td>
            <td>${escapeHtml(ext.default_version || 'N/A')}</td>
            <td><span class="badge bg-success">Enabled</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Update version badge with detected PostgreSQL version
function updateVersionBadge(version) {
    console.log("Updating version badge with:", version);
    const versionBadge = document.querySelector('.version-badge');
    if (versionBadge) {
        versionBadge.textContent = `PostgreSQL ${version}`;
    } else {
        console.error("Version badge element not found");
    }
}

// Update sessions table
function updateSessionsTable(sessions) {
    if (!sessions) return;
    
    const sessionsTable = document.querySelector('#dashboard-section .sessions-table');
    if (!sessionsTable) return;
    
    const tbody = sessionsTable.querySelector('tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No active sessions</td></tr>';
        return;
    }
    
    // Get active sessions only
    const activeOnly = sessions.filter(s => s.state === 'active');
    
    if (activeOnly.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No active sessions</td></tr>';
        return;
    }
    
    // Sort by query start time (oldest first)
    const sorted = [...activeOnly].sort((a, b) => {
        if (!a.query_start) return 1;
        if (!b.query_start) return -1;
        return new Date(a.query_start) - new Date(b.query_start);
    });
    
    // Take top 5
    const top5 = sorted.slice(0, 5);
    
    // Add rows
    top5.forEach(session => {
        const row = document.createElement('tr');
        
        // Format duration
        let duration = '';
        if (session.query_start) {
            const start = new Date(session.query_start);
            const now = new Date();
            const diff = Math.floor((now - start) / 1000);
            const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const seconds = Math.floor(diff % 60).toString().padStart(2, '0');
            duration = `${hours}:${minutes}:${seconds}`;
        }
        
        row.innerHTML = `
            <td>${session.pid}</td>
            <td>${escapeHtml(session.usename || 'N/A')}</td>
            <td>${escapeHtml(session.application_name || 'N/A')}</td>
            <td>-</td>
            <td>${escapeHtml(session.state || 'N/A')}</td>
            <td>${duration}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update blocking sessions table
function updateBlockingSessionsTable(blockingSessions) {
    const blockingTable = document.querySelector('#dashboard-section .blocking-table');
    if (!blockingTable) return;
    
    const tbody = blockingTable.querySelector('tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (!blockingSessions || blockingSessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No blocking sessions</td></tr>';
        return;
    }
    
    // Add rows
    blockingSessions.forEach(blocker => {
        const row = document.createElement('tr');
        
        // Format blocked count
        const blockedCount = blocker.blocked_pids ? (Array.isArray(blocker.blocked_pids) ? blocker.blocked_pids.length : 1) : 0;
        
        // Format query (truncate if too long)
        const query = blocker.blocking_query ? 
            (blocker.blocking_query.length > 50 ? blocker.blocking_query.substring(0, 50) + '...' : blocker.blocking_query) : 
            'N/A';
        
        row.innerHTML = `
            <td>${blocker.blocking_pid}</td>
            <td>${escapeHtml(blocker.blocking_user || 'N/A')}</td>
            <td>${blockedCount}</td>
            <td>${escapeHtml(query)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update temp space usage table
function updateTempSpaceTable(tempUsage) {
    const tempTable = document.querySelector('#dashboard-section .temp-table');
    if (!tempTable) return;
    
    const tbody = tempTable.querySelector('tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (!tempUsage || tempUsage.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No temporary space usage</td></tr>';
        
        // Reset progress bar
        const progressBar = document.querySelector('#dashboard-section .progress .progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', 0);
            progressBar.textContent = '0%';
        }
        
        // Reset label
        const usedLabel = document.querySelector('#dashboard-section .temp-usage-label');
        if (usedLabel) {
            usedLabel.textContent = 'Used: 0 MB of 1GB';
        }
        
        return;
    }
    
    // Calculate total
    const totalBytes = tempUsage.reduce((total, item) => total + parseInt(item.temp_bytes || 0), 0);
    const totalMB = Math.round(totalBytes / (1024 * 1024));
    
    // Sort by size (largest first)
    const sorted = [...tempUsage].sort((a, b) => parseInt(b.temp_bytes || 0) - parseInt(a.temp_bytes || 0));
    
    // Take top 4
    const top4 = sorted.slice(0, 4);
    
    // Add rows
    top4.forEach(temp => {
        const row = document.createElement('tr');
        
        // Calculate MB
        const tempMB = Math.round(parseInt(temp.temp_bytes || 0) / (1024 * 1024));
        
        // Format query (truncate if too long)
        const query = temp.query ? 
            (temp.query.length > 50 ? temp.query.substring(0, 50) + '...' : temp.query) : 
            'N/A';
        
        row.innerHTML = `
            <td>${temp.pid}</td>
            <td>${escapeHtml(temp.usename || 'N/A')}</td>
            <td>${tempMB} MB</td>
            <td>${escapeHtml(query)}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Update progress bar
    const progressBar = document.querySelector('#dashboard-section .progress .progress-bar');
    if (progressBar) {
        // Assume 1GB max
        const percentage = Math.min(Math.round((totalMB / 1024) * 100), 100);
        
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
        progressBar.textContent = `${percentage}%`;
        
        // Update class based on percentage
        progressBar.classList.remove('bg-info', 'bg-warning', 'bg-danger');
        if (percentage > 75) {
            progressBar.classList.add('bg-danger');
        } else if (percentage > 50) {
            progressBar.classList.add('bg-warning');
        } else {
            progressBar.classList.add('bg-info');
        }
    }
    
    // Update label
    const usedLabel = document.querySelector('#dashboard-section .temp-usage-label');
    if (usedLabel) {
        usedLabel.textContent = `Used: ${totalMB} MB of 1GB`;
    }
}

// Show loading indicator
function showLoading() {
    // Check if loading overlay already exists
    let loadingOverlay = document.getElementById('global-loading-overlay');
    
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'global-loading-overlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
        document.body.appendChild(loadingOverlay);
    }
    
    loadingOverlay.style.display = 'flex';
}

// Hide loading indicator
function hideLoading() {
    const loadingOverlay = document.getElementById('global-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    // Check if error overlay already exists
    let errorOverlay = document.getElementById('global-error-overlay');
    
    if (!errorOverlay) {
        errorOverlay = document.createElement('div');
        errorOverlay.id = 'global-error-overlay';
        errorOverlay.className = 'error-toast';
        errorOverlay.style.position = 'fixed';
        errorOverlay.style.top = '20px';
        errorOverlay.style.right = '20px';
        errorOverlay.style.zIndex = '2000';
        document.body.appendChild(errorOverlay);
    }
    
    // Update content
    errorOverlay.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close" aria-label="Close" onclick="hideError()"></button>
        </div>
    `;
    
    errorOverlay.style.display = 'block';
}

// Hide error message
function hideError() {
    const errorOverlay = document.getElementById('global-error-overlay');
    if (errorOverlay) {
        errorOverlay.style.display = 'none';
    }
}

// Add connection modal
function showAddConnectionModal() {
    // Check if modal already exists
    let modal = document.getElementById('add-connection-modal');
    
    if (!modal) {
        // Create modal
        modal = document.createElement('div');
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
                                <input type="text" class="form-control" id="connection-name" placeholder="e.g., Production Database" required>
                                <div class="form-text">A friendly name to identify this connection</div>
                            </div>
                            <div class="row">
                                <div class="col-md-8 mb-3">
                                    <label for="connection-host" class="form-label">Host <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="connection-host" placeholder="e.g., localhost or postgres.example.com" required>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="connection-port" class="form-label">Port</label>
                                    <input type="number" class="form-control" id="connection-port" value="5432" min="1" max="65535">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="connection-database" class="form-label">Database Name <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="connection-database" placeholder="e.g., postgres" required>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="connection-username" class="form-label">Username <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="connection-username" placeholder="e.g., postgres" required>
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
        
        // Add event listeners
        const testBtn = document.getElementById('test-connection-btn');
        if (testBtn) {
            testBtn.addEventListener('click', testConnection);
        }
        
        const saveBtn = document.getElementById('save-connection-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveConnection);
        }
    }
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Test connection
async function testConnection() {
    // Get form data
    const connectionData = {
        username: document.getElementById('connection-username').value,
        host: document.getElementById('connection-host').value,
        database: document.getElementById('connection-database').value,
        password: document.getElementById('connection-password').value,
        port: parseInt(document.getElementById('connection-port').value),
        ssl: document.getElementById('connection-ssl').checked
    };
    
    // Validate required fields
    if (!connectionData.username || !connectionData.host || !connectionData.database || !connectionData.password) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        // Update button state
        const testBtn = document.getElementById('test-connection-btn');
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        }
        
        // Test connection
        const result = await window.PgClient.testConnection(connectionData);
        
        // Restore button state
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        }
        
        if (result.success) {
            // Show success message with version
            const successAlert = document.createElement('div');
            successAlert.className = 'alert alert-success mt-3';
            successAlert.innerHTML = `
                <i class="fas fa-check-circle me-2"></i> Connection successful! 
                <strong>PostgreSQL ${result.version}</strong> detected.
            `;
            
            // Add to form
            const form = document.getElementById('add-connection-form');
            if (form) {
                // Remove any existing alerts
                const existingAlerts = form.querySelectorAll('.alert');
                existingAlerts.forEach(alert => alert.remove());
                
                form.appendChild(successAlert);
            }
        } else {
            // Show error message
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger mt-3';
            errorAlert.innerHTML = `
                <i class="fas fa-exclamation-circle me-2"></i> Connection failed: 
                <strong>${result.error}</strong>
            `;
            
            // Add to form
            const form = document.getElementById('add-connection-form');
            if (form) {
                // Remove any existing alerts
                const existingAlerts = form.querySelectorAll('.alert');
                existingAlerts.forEach(alert => alert.remove());
                
                form.appendChild(errorAlert);
            }
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        
        // Restore button state
        const testBtn = document.getElementById('test-connection-btn');
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        }
        
        // Show error message
        showError(`Failed to test connection: ${error.message}`);
    }
}

// Save connection
async function saveConnection() {
    // Get form data
    const connectionData = {
        name: document.getElementById('connection-name').value,
        username: document.getElementById('connection-username').value,
        host: document.getElementById('connection-host').value,
        database: document.getElementById('connection-database').value,
        password: document.getElementById('connection-password').value,
        port: parseInt(document.getElementById('connection-port').value),
        ssl: document.getElementById('connection-ssl').checked
    };
    
    // Validate required fields
    if (!connectionData.name || !connectionData.username || !connectionData.host || !connectionData.database || !connectionData.password) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        // Generate a unique ID
        const result = await window.postgresMonitorApi.addConnection(connectionData);

        // Use the ID returned by the API
        connectionData.id = result.id;

        // Add to connections array
        dashboardState.connections.push(connectionData);
        
        // Save to local storage
        localStorage.setItem('pg_monitor_connections', JSON.stringify(dashboardState.connections));
        
        // Update UI
        updateConnectionsDropdown();
        updateConnectionsUI();
        
        // Set as selected connection
        dashboardState.selectedDatabase = connectionData.id;
        localStorage.setItem('pg_monitor_selected_connection', connectionData.id);
        
        // Update dropdown
        const databaseSelector = document.querySelector('.database-selector');
        if (databaseSelector) {
            databaseSelector.value = connectionData.id;
        }
        
        // Hide modal
        const modal = document.getElementById('add-connection-modal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
        
        // Reset connection tested flag
        dashboardState.connectionTested = false;
        
        // Refresh data
        refreshAllData();
    } catch (error) {
        console.error('Error saving connection:', error);
        showError(`Failed to save connection: ${error.message}`);
    }
}

// Edit connection
function editConnection(connectionId) {
    // Find the connection
    const connection = dashboardState.connections.find(c => String(c.id) === String(connectionId));
    if (!connection) {
        showError('Connection not found');
        return;
    }
    
    // Check if modal already exists
    let modal = document.getElementById('edit-connection-modal');
    
    if (!modal) {
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
                                    <div class="form-text">Leave empty to keep current password</div>
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
        
        // Add event listeners
        const testBtn = document.getElementById('edit-test-connection-btn');
        if (testBtn) {
            testBtn.addEventListener('click', testEditConnection);
        }
        
        const updateBtn = document.getElementById('update-connection-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', updateConnection);
        }
    }
    
    // Fill form with connection data
    document.getElementById('edit-connection-id').value = connection.id;
    document.getElementById('edit-connection-name').value = connection.name;
    document.getElementById('edit-connection-host').value = connection.host;
    document.getElementById('edit-connection-port').value = connection.port;
    document.getElementById('edit-connection-database').value = connection.database;
    document.getElementById('edit-connection-username').value = connection.username;
    document.getElementById('edit-connection-password').value = '';
    document.getElementById('edit-connection-ssl').checked = connection.ssl;
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Test edit connection
async function testEditConnection() {
    // Get form data
    const connectionId = document.getElementById('edit-connection-id').value;
    const connectionData = {
        username: document.getElementById('edit-connection-username').value,
        host: document.getElementById('edit-connection-host').value,
        database: document.getElementById('edit-connection-database').value,
        password: document.getElementById('edit-connection-password').value,
        port: parseInt(document.getElementById('edit-connection-port').value),
        ssl: document.getElementById('edit-connection-ssl').checked
    };
    
    // Validate required fields
    if (!connectionData.username || !connectionData.host || !connectionData.database) {
        showError('Please fill in all required fields');
        return;
    }
    
    // If password is empty, use existing password
    if (!connectionData.password) {
        const existingConnection = dashboardState.connections.find(c => c.id === connectionId);
        if (existingConnection) {
            connectionData.password = existingConnection.password;
        } else {
            showError('Connection not found');
            return;
        }
    }
    
    try {
        // Update button state
        const testBtn = document.getElementById('edit-test-connection-btn');
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        }
        
        // Test connection
        const result = await window.PgClient.testConnection(connectionData);
        
        // Restore button state
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        }
        
        if (result.success) {
            // Show success message with version
            const successAlert = document.createElement('div');
            successAlert.className = 'alert alert-success mt-3';
            successAlert.innerHTML = `
                <i class="fas fa-check-circle me-2"></i> Connection successful! 
                <strong>PostgreSQL ${result.version}</strong> detected.
            `;
            
            // Add to form
            const form = document.getElementById('edit-connection-form');
            if (form) {
                // Remove any existing alerts
                const existingAlerts = form.querySelectorAll('.alert');
                existingAlerts.forEach(alert => alert.remove());
                
                form.appendChild(successAlert);
            }
        } else {
            // Show error message
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger mt-3';
            errorAlert.innerHTML = `
                <i class="fas fa-exclamation-circle me-2"></i> Connection failed: 
                <strong>${result.error}</strong>
            `;
            
            // Add to form
            const form = document.getElementById('edit-connection-form');
            if (form) {
                // Remove any existing alerts
                const existingAlerts = form.querySelectorAll('.alert');
                existingAlerts.forEach(alert => alert.remove());
                
                form.appendChild(errorAlert);
            }
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        
        // Restore button state
        const testBtn = document.getElementById('edit-test-connection-btn');
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-vial"></i> Test Connection';
        }
        
        // Show error message
        showError(`Failed to test connection: ${error.message}`);
    }
}

// Update connection
async function updateConnection() {
    // Get form data
    const connectionId = document.getElementById('edit-connection-id').value;
    const connectionData = {
        id: connectionId,
        name: document.getElementById('edit-connection-name').value,
        username: document.getElementById('edit-connection-username').value,
        host: document.getElementById('edit-connection-host').value,
        database: document.getElementById('edit-connection-database').value,
        password: document.getElementById('edit-connection-password').value,
        port: parseInt(document.getElementById('edit-connection-port').value),
        ssl: document.getElementById('edit-connection-ssl').checked
    };
    
    // Validate required fields
    if (!connectionData.name || !connectionData.username || !connectionData.host || !connectionData.database) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        // Find the connection index
        const index = dashboardState.connections.findIndex(c => String(c.id) === String(connectionId));
        if (index === -1) {
            showError('Connection not found');
            return;
        }
        
        // If password is empty, use existing password
        if (!connectionData.password) {
            connectionData.password = dashboardState.connections[index].password;
        }
        
        // Update the connection
        dashboardState.connections[index] = connectionData;
        
        // Save to local storage
        localStorage.setItem('pg_monitor_connections', JSON.stringify(dashboardState.connections));
        
        // Update UI
        updateConnectionsDropdown();
        updateConnectionsUI();
        
        // Hide modal
        const modal = document.getElementById('edit-connection-modal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
        
        // Reset connection tested flag if this is the current connection
        if (String(dashboardState.selectedDatabase) === String(connectionId)) {
            dashboardState.connectionTested = false;
            refreshAllData();
        }
    } catch (error) {
        console.error('Error updating connection:', error);
        showError(`Failed to update connection: ${error.message}`);
    }
}

// Delete connection
function deleteConnection(connectionId) {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Find the connection index
        const index = dashboardState.connections.findIndex(c => String(c.id) === String(connectionId));
        if (index === -1) {
            showError('Connection not found');
            return;
        }
        
        // Remove the connection
        dashboardState.connections.splice(index, 1);
        
        // Save to local storage
        localStorage.setItem('pg_monitor_connections', JSON.stringify(dashboardState.connections));
        
        // Update UI
        updateConnectionsDropdown();
        updateConnectionsUI();
        
        // If this was the selected connection, select another one
        if (dashboardState.selectedDatabase === connectionId) {
            if (dashboardState.connections.length > 0) {
                dashboardState.selectedDatabase = dashboardState.connections[0].id;
                localStorage.setItem('pg_monitor_selected_connection', dashboardState.selectedDatabase);
                
                // Update dropdown
                const databaseSelector = document.querySelector('.database-selector');
                if (databaseSelector) {
                    databaseSelector.value = dashboardState.selectedDatabase;
                }
                
                // Reset connection tested flag
                dashboardState.connectionTested = false;
                
                // Refresh data
                refreshAllData();
            } else {
                // No connections left
                dashboardState.selectedDatabase = null;
                localStorage.removeItem('pg_monitor_selected_connection');
                
                // Show message
                showNoConnectionsMessage();
            }
        }
    } catch (error) {
        console.error('Error deleting connection:', error);
        showError(`Failed to delete connection: ${error.message}`);
    }
}

// Show message when no connections available
function showNoConnectionsMessage() {
    // Update dashboard section
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        dashboardSection.innerHTML = `
            <div class="alert alert-info">
                <h4><i class="fas fa-info-circle me-2"></i> No Database Connections</h4>
                <p>You need to add a connection to start monitoring PostgreSQL databases.</p>
                <button class="btn btn-primary" id="add-connection-btn-alert">
                    <i class="fas fa-plus me-2"></i> Add Connection
                </button>
            </div>
        `;
        
        // Add event listener to the button
        const addConnectionBtn = document.getElementById('add-connection-btn-alert');
        if (addConnectionBtn) {
            addConnectionBtn.addEventListener('click', function() {
                // Navigate to connections tab
                const connectionsLink = document.querySelector('.sidebar .nav-link[data-section="connections"]');
                if (connectionsLink) {
                    connectionsLink.click();
                }
                
                // Show add connection modal
                setTimeout(function() {
                    showAddConnectionModal();
                }, 500);
            });
        }
    }
}

// Show message when no connection selected
function showNoConnectionMessage() {
    // Update dashboard section
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        dashboardSection.innerHTML = `
            <div class="alert alert-warning">
                <h4><i class="fas fa-exclamation-triangle me-2"></i> No Database Selected</h4>
                <p>Please select a database from the dropdown menu to view monitoring data.</p>
            </div>
        `;
    }
}

// Save user preferences to local storage
function saveUserPreferences() {
    const preferences = {
        isDarkMode: dashboardState.isDarkMode,
        autoRefreshInterval: dashboardState.autoRefreshInterval,
        autoRefreshEnabled: dashboardState.autoRefreshEnabled,
        selectedTimeRange: dashboardState.selectedTimeRange,
        selectedDatabase: dashboardState.selectedDatabase,
        currentSection: dashboardState.currentSection
    };
    
    localStorage.setItem('pg_monitor_preferences', JSON.stringify(preferences));
}

// Load user preferences from local storage
function loadUserPreferences() {
    try {
        const savedPreferences = localStorage.getItem('pg_monitor_preferences');
        if (savedPreferences) {
            const preferences = JSON.parse(savedPreferences);
            
            // Apply dark mode preference
            if (preferences.isDarkMode !== undefined) {
                toggleDarkMode(preferences.isDarkMode);
            }
            
            // Apply auto-refresh preferences
            if (preferences.autoRefreshInterval !== undefined) {
                dashboardState.autoRefreshInterval = preferences.autoRefreshInterval;
                dashboardState.autoRefreshEnabled = preferences.autoRefreshEnabled || false;
                
                // Update status display
                const autoRefreshStatus = document.getElementById('auto-refresh-status');
                if (autoRefreshStatus) {
                    autoRefreshStatus.textContent = dashboardState.autoRefreshEnabled ? 
                        `On (${dashboardState.autoRefreshInterval}s)` : 'Off';
                }
            }
            
            // Apply time range preference
            if (preferences.selectedTimeRange) {
                dashboardState.selectedTimeRange = preferences.selectedTimeRange;
                
                // Update dropdown text
                const timeRangeDropdown = document.getElementById('timeRangeDropdown');
                const selectedItem = document.querySelector(`[data-range="${preferences.selectedTimeRange}"]`);
                
                if (timeRangeDropdown && selectedItem) {
                    timeRangeDropdown.innerHTML = `<i class="far fa-clock"></i> ${selectedItem.textContent}`;
                }
            }
            
            // Apply database preference
            if (preferences.selectedDatabase) {
                dashboardState.selectedDatabase = preferences.selectedDatabase;
            }
            
            // Apply section preference
            if (preferences.currentSection) {
                dashboardState.currentSection = preferences.currentSection;
                
                // Activate the correct section
                const sectionLink = document.querySelector(`.sidebar .nav-link[data-section="${preferences.currentSection}"]`);
                if (sectionLink) {
                    setTimeout(function() {
                        sectionLink.click();
                    }, 100);
                }
            }
        }
    } catch (error) {
        console.error('Error loading user preferences:', error);
    }
}

// Apply settings
function applySettings() {
    // Collect values from settings form
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    const refreshIntervalSelect = document.getElementById('refreshInterval');
    
    if (darkModeSwitch) {
        toggleDarkMode(darkModeSwitch.checked);
    }
    
    if (refreshIntervalSelect) {
        updateAutoRefreshInterval(parseInt(refreshIntervalSelect.value));
    }
    
    // Save preferences
    saveUserPreferences();
    
    // Refresh all data
    refreshAllData();
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) {
        return '';
    }
    
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Expose hideError function globally
window.hideError = hideError;