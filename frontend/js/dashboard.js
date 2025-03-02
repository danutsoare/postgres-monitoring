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
    refreshTimerId: null
};

// Initialize the dashboard when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    window.postgresMonitorCharts.init();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize auto-refresh
    startAutoRefresh();
    
    // Initial data load
    refreshAllData();
    
    // Check for saved theme preference
    loadUserPreferences();
});

// Setup all event listeners for the dashboard
function setupEventListeners() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
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
            dashboardState.selectedDatabase = this.value;
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
    window.postgresMonitorCharts.updateTheme(isDark);
    
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
    if (interval > 0) {
        dashboardState.autoRefreshEnabled = true;
        document.getElementById('auto-refresh-status').textContent = `On (${interval}s)`;
        startAutoRefresh();
    } else {
        dashboardState.autoRefreshEnabled = false;
        document.getElementById('auto-refresh-status').textContent = 'Off';
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

// Refresh all data
async function refreshAllData() {
    try {
        // Show global loading indicator
        showLoading();
        
        // Call API to force refresh metrics
        await window.postgresMonitorApi.refreshMetrics();
        
        // Refresh charts with new data
        await window.postgresMonitorCharts.refreshAll();
        
        // Update last refresh time
        document.getElementById('last-refresh-time').textContent = new Date().toLocaleString();
        
        // Load section-specific data
        await refreshSectionData(dashboardState.currentSection);
        
        // Hide loading indicator
        hideLoading();
        
    } catch (error) {
        console.error('Error refreshing data:', error);
        hideLoading();
        showError('Failed to refresh data. Please check your connection.');
    }
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
        // This would need to be mapped to the appropriate API call
        refreshChartById(chartId)
            .finally(() => {
                // Remove loading overlay
                cardBody.removeChild(loadingOverlay);
            });
    } else {
        // For non-chart cards (tables, etc.)
        // Simulate API call delay
        setTimeout(() => {
            // Remove loading overlay
            cardBody.removeChild(loadingOverlay);
        }, 800);
    }
}

// Refresh chart by ID - maps to appropriate API call
async function refreshChartById(chartId) {
    // Map chart IDs to appropriate refresh functions
    const chartRefreshMap = {
        'cpu-usage': refreshCpuUsageChart,
        'wait-events': refreshWaitEventsChart,
        'wait-events-timeline': refreshWaitEventsTimelineChart,
        'wait-events-by-session': refreshWaitEventsBySessionChart,
        'lock-types': refreshLockTypesChart,
        'temp-space-timeline': refreshTempSpaceTimelineChart,
        'temp-space-by-hour': refreshTempSpaceByHourChart,
        'temp-space-by-query-type': refreshTempSpaceByQueryTypeChart,
        'buffer-cache': refreshBufferCacheChart
    };
    
    if (chartRefreshMap[chartId]) {
        return await chartRefreshMap[chartId]();
    } else {
        console.warn(`No refresh function found for chart: ${chartId}`);
    }
}

// Refresh specific section data based on current section
async function refreshSectionData(sectionName) {
    switch (sectionName) {
        case 'dashboard':
            await Promise.all([
                refreshCpuUsageChart(),
                refreshWaitEventsChart(),
                refreshTopSessions(),
                refreshTempSpaceUsage()
            ]);
            break;
        case 'sessions':
            await refreshAllSessions();
            break;
        case 'waits':
            await Promise.all([
                refreshWaitEventsChart(),
                refreshWaitEventsTimelineChart(),
                refreshWaitEventsBySessionChart()
            ]);
            break;
        case 'locks':
            await Promise.all([
                refreshLockHierarchy(),
                refreshLockTypesChart()
            ]);
            break;
        case 'storage':
            await Promise.all([
                refreshTempSpaceTimelineChart(),
                refreshTempSpaceByHourChart(),
                refreshTempSpaceByQueryTypeChart()
            ]);
            break;
        case 'extensions':
            await refreshExtensionsList();
            break;
        default:
            // No specific data to refresh
            break;
    }
}

// Individual chart/section refresh functions
async function refreshCpuUsageChart() {
    // Implementation would call API and update chart
    console.log('Refreshing CPU usage chart');
}

async function refreshWaitEventsChart() {
    // Implementation would call API and update chart
    console.log('Refreshing wait events chart');
}

async function refreshWaitEventsTimelineChart() {
    // Implementation would call API and update chart
    console.log('Refreshing wait events timeline chart');
}

async function refreshWaitEventsBySessionChart() {
    // Implementation would call API and update chart
    console.log('Refreshing wait events by session chart');
}

async function refreshLockTypesChart() {
    // Implementation would call API and update chart
    console.log('Refreshing lock types chart');
}

async function refreshTempSpaceTimelineChart() {
    // Implementation would call API and update chart
    console.log('Refreshing temp space timeline chart');
}

async function refreshTempSpaceByHourChart() {
    // Implementation would call API and update chart
    console.log('Refreshing temp space by hour chart');
}

async function refreshTempSpaceByQueryTypeChart() {
    // Implementation would call API and update chart
    console.log('Refreshing temp space by query type chart');
}

async function refreshBufferCacheChart() {
    // Implementation would call API and update chart
    console.log('Refreshing buffer cache chart');
}

async function refreshTopSessions() {
    try {
        const sessions = await window.postgresMonitorApi.getTopSessions();
        
        // Update sessions table
        const sessionTable = document.querySelector('#dashboard-section .table-responsive table');
        if (sessionTable) {
            const tbody = sessionTable.querySelector('tbody');
            if (tbody) {
                // Clear existing data
                tbody.innerHTML = '';
                
                // Add new rows
                sessions.forEach(session => {
                    const row = document.createElement('tr');
                    
                    // Calculate duration
                    let duration = '00:00:00';
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
                        <td>${session.username}</td>
                        <td>${session.application_name || 'N/A'}</td>
                        <td>${session.cpu_usage.toFixed(1)}%</td>
                        <td>-</td>
                        <td>${duration}</td>
                    `;
                    
                    tbody.appendChild(row);
                });
            }
        }
    } catch (error) {
        console.error('Error refreshing top sessions:', error);
    }
}

async function refreshTempSpaceUsage() {
    try {
        const tempData = await window.postgresMonitorApi.getTempSpaceUsage();
        
        // Update temp space table
        const tempTable = document.querySelector('#dashboard-section .card:nth-of-type(5) .table-responsive table');
        if (tempTable) {
            const tbody = tempTable.querySelector('tbody');
            if (tbody) {
                // Clear existing data
                tbody.innerHTML = '';
                
                // Calculate total temp space
                const totalTempSpace = tempData.reduce((sum, item) => sum + item.temp_bytes, 0);
                
                // Add new rows
                tempData.slice(0, 4).forEach(item => {
                    const row = document.createElement('tr');
                    const tempMB = Math.round(item.temp_bytes / 1024 / 1024);
                    const percentage = totalTempSpace > 0 ? ((item.temp_bytes / totalTempSpace) * 100).toFixed(1) : 0;
                    
                    row.innerHTML = `
                        <td>${item.pid}</td>
                        <td>${item.username}</td>
                        <td>${item.query_type || 'N/A'}</td>
                        <td>${tempMB} MB</td>
                    `;
                    
                    tbody.appendChild(row);
                });
                
                // Update progress bar
                const progressBar = document.querySelector('#dashboard-section .progress .progress-bar');
                if (progressBar) {
                    // Assuming temp_bytes is in bytes and we want to show as percentage of 1.2 GB
                    const totalMB = Math.round(totalTempSpace / 1024 / 1024);
                    const maxMB = 1228; // 1.2 GB in MB
                    const percentage = Math.min(Math.round((totalMB / maxMB) * 100), 100);
                    
                    progressBar.style.width = `${percentage}%`;
                    progressBar.setAttribute('aria-valuenow', percentage);
                    progressBar.textContent = `${percentage}%`;
                    
                    // Update labels
                    const usedLabel = document.querySelector('#dashboard-section .progress-label span:first-child');
                    if (usedLabel) {
                        usedLabel.textContent = `Used: ${totalMB} MB`;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error refreshing temp space usage:', error);
    }
}

async function refreshAllSessions() {
    // Implementation would call API and update sessions list
    console.log('Refreshing all sessions');
}

async function refreshLockHierarchy() {
    try {
        const locks = await window.postgresMonitorApi.getBlockingSessionsHierarchy();
        
        // This would require more complex tree building logic
        console.log('Lock hierarchy data:', locks);
    } catch (error) {
        console.error('Error refreshing lock hierarchy:', error);
    }
}

async function refreshExtensionsList() {
    try {
        const extensions = await window.postgresMonitorApi.getExtensions();
        
        // Update extensions table
        const extensionsTable = document.querySelector('#extensions-section .table-responsive table');
        if (extensionsTable) {
            const tbody = extensionsTable.querySelector('tbody');
            if (tbody) {
                // Clear existing data
                tbody.innerHTML = '';
                
                // Add new rows
                extensions.forEach(ext => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${ext.name}</td>
                        <td>${ext.version}</td>
                        <td>${ext.description || 'No description available'}</td>
                        <td><span class="badge bg-success">Enabled</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-info"><i class="fas fa-chart-line"></i> View Stats</button>
                        </td>
                    `;
                    
                    tbody.appendChild(row);
                });
            }
        }
    } catch (error) {
        console.error('Error refreshing extensions list:', error);
    }
}

// Save user preferences to local storage
function saveUserPreferences() {
    const preferences = {
        isDarkMode: dashboardState.isDarkMode,
        autoRefreshInterval: dashboardState.autoRefreshInterval,
        autoRefreshEnabled: dashboardState.autoRefreshEnabled,
        selectedTimeRange: dashboardState.selectedTimeRange,
        selectedDatabase: dashboardState.selectedDatabase
    };
    
    localStorage.setItem('pg_monitor_preferences', JSON.stringify(preferences));
}

// Load user preferences from local storage
function loadUserPreferences() {
    try {
        const savedPreferences = localStorage.getItem('pg_monitor_preferences');
        if (savedPreferences) {
            const preferences = JSON.parse(savedPreferences);
            
            // Apply saved preferences
            if (preferences.isDarkMode !== undefined) {
                toggleDarkMode(preferences.isDarkMode);
            }
            
            if (preferences.autoRefreshInterval !== undefined) {
                updateAutoRefreshInterval(preferences.autoRefreshInterval);
                
                // Update select input
                const refreshIntervalSelect = document.getElementById('refreshInterval');
                if (refreshIntervalSelect) {
                    refreshIntervalSelect.value = preferences.autoRefreshInterval.toString();
                }
            }
            
            if (preferences.selectedTimeRange) {
                dashboardState.selectedTimeRange = preferences.selectedTimeRange;
                
                // Update dropdown text
                const timeRangeDropdown = document.getElementById('timeRangeDropdown');
                const selectedItem = document.querySelector(`[data-range="${preferences.selectedTimeRange}"]`);
                
                if (timeRangeDropdown && selectedItem) {
                    timeRangeDropdown.innerHTML = `<i class="far fa-clock"></i> ${selectedItem.textContent}`;
                }
            }
            
            if (preferences.selectedDatabase) {
                dashboardState.selectedDatabase = preferences.selectedDatabase;
                
                // Update select input
                const databaseSelector = document.querySelector('.database-selector');
                if (databaseSelector) {
                    databaseSelector.value = preferences.selectedDatabase;
                }
            }
        }
    } catch (error) {
        console.error('Error loading user preferences:', error);
    }
}

// Apply all settings
function applySettings() {
    // Get values from settings form
    const darkModeEnabled = document.getElementById('darkModeSwitch').checked;
    const refreshInterval = parseInt(document.getElementById('refreshInterval').value);
    const dataRetentionPeriod = parseInt(document.getElementById('dataRetentionPeriod').value);
    const collectSessionMetrics = document.getElementById('collectSessionMetricsSwitch').checked;
    const collectQueryMetrics = document.getElementById('collectQueryMetricsSwitch').checked;
    const collectWaitEvents = document.getElementById('collectWaitEventsSwitch').checked;
    const collectLockInfo = document.getElementById('collectLockInfoSwitch').checked;
    const collectTempSpace = document.getElementById('collectTempSpaceSwitch').checked;
    
    // Log applied settings
    console.log(`Applying settings:`, {
        darkMode: darkModeEnabled,
        refreshInterval: refreshInterval,
        dataRetentionPeriod: dataRetentionPeriod,
        collectSessionMetrics: collectSessionMetrics,
        collectQueryMetrics: collectQueryMetrics,
        collectWaitEvents: collectWaitEvents,
        collectLockInfo: collectLockInfo,
        collectTempSpace: collectTempSpace
    });
    
    // Apply dark mode
    toggleDarkMode(darkModeEnabled);
    
    // Update refresh interval
    updateAutoRefreshInterval(refreshInterval);
    
    // These would communicate with the backend API to update settings
    // in a real implementation
    
    // Save preferences
    saveUserPreferences();
    
    // Refresh data
    refreshAllData();
}

// Show global loading indicator
function showLoading() {
    // Check if loading overlay already exists
    let loadingOverlay = document.querySelector('#global-loading-overlay');
    
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'global-loading-overlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.style.position = 'fixed';
        loadingOverlay.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
        document.body.appendChild(loadingOverlay);
    }
    
    loadingOverlay.style.display = 'flex';
}

// Hide global loading indicator
function hideLoading() {
    const loadingOverlay = document.querySelector('#global-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    // Create toast-style error message
    const errorToast = document.createElement('div');
    errorToast.className = 'position-fixed bottom-0 end-0 p-3';
    errorToast.style.zIndex = '1100';
    
    errorToast.innerHTML = `
        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-danger text-white">
                <strong class="me-auto">Error</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    document.body.appendChild(errorToast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorToast.parentNode) {
            errorToast.parentNode.removeChild(errorToast);
        }
    }, 5000);
    
    // Add click listener to close button
    const closeButton = errorToast.querySelector('.btn-close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            if (errorToast.parentNode) {
                errorToast.parentNode.removeChild(errorToast);
            }
        });
    }
}