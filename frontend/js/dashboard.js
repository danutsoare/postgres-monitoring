/**
 * PostgreSQL Monitor Dashboard
 * Handles dashboard UI, charts, and metrics data
 */
document.addEventListener('DOMContentLoaded', function() {
    // State and chart references
    const state = {
        selectedConnectionId: null,
        metrics: null,
        historicalData: null,
        charts: {
            tableSizeChart: null,
            waitEventsChart: null,
            connectionsHistoryChart: null
        }
    };
    
    // DOM Elements
    const connectionSelect = document.getElementById('connection-select');
    const loadMetricsBtn = document.getElementById('load-metrics-btn');
    const collectMetricsBtn = document.getElementById('collect-metrics-btn');
    const dashboardContent = document.getElementById('dashboard-content');
    const noDataMessage = document.getElementById('no-data-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const historyRange = document.getElementById('history-range');
    
    // Info elements
    const connectionNameElement = document.getElementById('connection-name');
    const dbVersionElement = document.getElementById('db-version');
    const connectionCountElement = document.getElementById('connection-count');
    const lastUpdatedElement = document.getElementById('last-updated');
    
    // Table elements
    const tableSizeTable = document.getElementById('table-size-table');
    const waitEventsTable = document.getElementById('wait-events-table');
    
    // Initialize event listeners
    connectionSelect.addEventListener('change', handleConnectionChange);
    loadMetricsBtn.addEventListener('click', loadMetrics);
    collectMetricsBtn.addEventListener('click', collectMetrics);
    historyRange.addEventListener('change', loadHistoricalData);
    
    // Initialize the dashboard
    initDashboard();
    
    /**
     * Initialize the dashboard
     */
    async function initDashboard() {
        try {
            await loadConnections();
            
            // Check for stored connection preference
            const storedConnectionId = localStorage.getItem('selectedConnectionId');
            if (storedConnectionId) {
                connectionSelect.value = storedConnectionId;
                handleConnectionChange();
            }
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            api.showAlert('Error initializing dashboard', 'danger');
        }
    }
    
    /**
     * Load all connections
     */
    async function loadConnections() {
        try {
            showLoading(true);
            
            // Clear the select
            connectionSelect.innerHTML = '<option value="">-- Select a connection --</option>';
            
            // Load connections from API
            const connections = await api.getConnections();
            
            if (connections && connections.length > 0) {
                // Add options to the select
                connections.forEach(connection => {
                    const option = document.createElement('option');
                    option.value = connection.id;
                    option.textContent = connection.name;
                    connectionSelect.appendChild(option);
                });
            } else {
                api.showAlert('No connections found. Please add a connection first.', 'info');
            }
        } catch (error) {
            console.error('Error loading connections:', error);
            api.showAlert('Error loading connections', 'danger');
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Handle connection selection change
     */
    function handleConnectionChange() {
        const connectionId = connectionSelect.value;
        
        if (connectionId) {
            state.selectedConnectionId = connectionId;
            localStorage.setItem('selectedConnectionId', connectionId);
            loadMetrics();
        } else {
            state.selectedConnectionId = null;
            dashboardContent.style.display = 'none';
            noDataMessage.style.display = 'none';
        }
    }
    
    /**
     * Load metrics for the selected connection
     */
    async function loadMetrics() {
        if (!state.selectedConnectionId) {
            api.showAlert('Please select a connection', 'warning');
            return;
        }
        
        try {
            showLoading(true);
            
            // Load metrics from API
            const metricsData = await api.getMetrics(state.selectedConnectionId);
            
            if (metricsData) {
                state.metrics = metricsData;
                
                if (metricsData.connection_metrics || 
                    (metricsData.table_sizes && metricsData.table_sizes.length > 0) || 
                    (metricsData.wait_events && metricsData.wait_events.length > 0)) {
                    
                    // We have data, show the dashboard
                    displayMetrics(metricsData);
                    dashboardContent.style.display = 'block';
                    noDataMessage.style.display = 'none';
                    
                    // Load historical data
                    loadHistoricalData();
                } else {
                    // No data, show message
                    dashboardContent.style.display = 'none';
                    noDataMessage.style.display = 'block';
                }
            } else {
                // No data, show message
                dashboardContent.style.display = 'none';
                noDataMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading metrics:', error);
            api.showAlert('Error loading metrics', 'danger');
            
            // Show no data message
            dashboardContent.style.display = 'none';
            noDataMessage.style.display = 'block';
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Collect new metrics for the selected connection
     */
    async function collectMetrics() {
        if (!state.selectedConnectionId) {
            api.showAlert('Please select a connection', 'warning');
            return;
        }
        
        try {
            showLoading(true);
            collectMetricsBtn.disabled = true;
            collectMetricsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Collecting...';
            
            // Collect metrics from API
            const result = await api.collectMetrics(state.selectedConnectionId);
            
            if (result && result.success) {
                api.showAlert('Metrics collected successfully', 'success');
                
                // Reload metrics
                await loadMetrics();
            } else {
                throw new Error(result.message || 'Failed to collect metrics');
            }
        } catch (error) {
            console.error('Error collecting metrics:', error);
            api.showAlert(error.message || 'Error collecting metrics', 'danger');
        } finally {
            showLoading(false);
            collectMetricsBtn.disabled = false;
            collectMetricsBtn.innerHTML = '<i class="fas fa-download"></i> Collect New Metrics';
        }
    }
    
    /**
     * Load historical data for the selected connection
     */
    async function loadHistoricalData() {
        if (!state.selectedConnectionId) return;
        
        try {
            const hours = historyRange.value || 24;
            
            // Load historical data from API
            const historicalData = await api.getHistoricalMetrics(state.selectedConnectionId, hours);
            
            if (historicalData) {
                state.historicalData = historicalData;
                updateHistoricalCharts(historicalData);
            }
        } catch (error) {
            console.error('Error loading historical data:', error);
        }
    }
    
    /**
     * Display metrics data on the dashboard
     */
    function displayMetrics(metricsData) {
        // Get connection details
        const connectionName = connectionSelect.options[connectionSelect.selectedIndex].text;
        connectionNameElement.textContent = connectionName;
        
        // Display database version
        if (metricsData.connection_metrics && metricsData.connection_metrics.db_version) {
            dbVersionElement.textContent = metricsData.connection_metrics.db_version;
        } else {
            dbVersionElement.textContent = 'Unknown';
        }
        
        // Display connection count
        if (metricsData.connection_metrics && metricsData.connection_metrics.connection_count !== undefined) {
            connectionCountElement.textContent = metricsData.connection_metrics.connection_count;
        } else {
            connectionCountElement.textContent = 'Unknown';
        }
        
        // Display last updated
        if (metricsData.connection_metrics && metricsData.connection_metrics.collected_at) {
            const date = new Date(metricsData.connection_metrics.collected_at);
            lastUpdatedElement.textContent = date.toLocaleString();
        } else {
            lastUpdatedElement.textContent = 'Unknown';
        }
        
        // Display table sizes
        displayTableSizes(metricsData.table_sizes || []);
        
        // Display wait events
        displayWaitEvents(metricsData.wait_events || []);
    }
    
    /**
     * Display table sizes data
     */
    function displayTableSizes(tableSizes) {
        // Sort by size (descending)
        tableSizes.sort((a, b) => b.size_bytes - a.size_bytes);
        
        // Update table
        const tbody = tableSizeTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        if (tableSizes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center">No table size data available</td></tr>';
            return;
        }
        
        tableSizes.forEach(table => {
            const row = document.createElement('tr');
            
            // Format size in MB
            const sizeMB = (table.size_bytes / (1024 * 1024)).toFixed(2);
            
            row.innerHTML = `
                <td>${escapeHtml(table.schema_name)}.${escapeHtml(table.table_name)}</td>
                <td>${sizeMB} MB</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Update or create chart
        updateTableSizeChart(tableSizes);
    }
    
    /**
     * Display wait events data
     */
    function displayWaitEvents(waitEvents) {
        // Sort by count (descending)
        waitEvents.sort((a, b) => b.count - a.count);
        
        // Update table
        const tbody = waitEventsTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        if (waitEvents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No wait events data available</td></tr>';
            return;
        }
        
        waitEvents.forEach(event => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${escapeHtml(event.wait_event_type)}</td>
                <td>${escapeHtml(event.wait_event)}</td>
                <td>${event.count}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Update or create chart
        updateWaitEventsChart(waitEvents);
    }
    
    /**
     * Update or create table size chart
     */
    function updateTableSizeChart(tableSizes) {
        // Prepare data for chart
        const chartData = tableSizes.slice(0, 10).map(table => {
            const sizeMB = (table.size_bytes / (1024 * 1024)).toFixed(2);
            return {
                label: `${table.schema_name}.${table.table_name}`,
                value: parseFloat(sizeMB)
            };
        });
        
        // Get canvas context
        const ctx = document.getElementById('table-size-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (state.charts.tableSizeChart) {
            state.charts.tableSizeChart.destroy();
        }
        
        // Create new chart
        state.charts.tableSizeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(item => item.label),
                datasets: [{
                    label: 'Table Size (MB)',
                    data: chartData.map(item => item.value),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Size (MB)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Table'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.x.toFixed(2)} MB`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Update or create wait events chart
     */
    function updateWaitEventsChart(waitEvents) {
        // Prepare data for chart
        const chartData = waitEvents.slice(0, 10);
        
        // Get canvas context
        const ctx = document.getElementById('wait-events-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (state.charts.waitEventsChart) {
            state.charts.waitEventsChart.destroy();
        }
        
        // Create new chart
        state.charts.waitEventsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.map(event => `${event.wait_event_type}: ${event.wait_event}`),
                datasets: [{
                    data: chartData.map(event => event.count),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)',
                        'rgba(83, 102, 255, 0.7)',
                        'rgba(40, 159, 64, 0.7)',
                        'rgba(210, 199, 199, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)',
                        'rgba(83, 102, 255, 1)',
                        'rgba(40, 159, 64, 1)',
                        'rgba(210, 199, 199, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 10
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / sum) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Update historical charts
     */
    function updateHistoricalCharts(historicalData) {
        updateConnectionsHistoryChart(historicalData.connection_counts || []);
    }
    
    /**
     * Update or create connections history chart
     */
    function updateConnectionsHistoryChart(connectionCounts) {
        // Sort by date
        connectionCounts.sort((a, b) => new Date(a.collected_at) - new Date(b.collected_at));
        
        // Prepare data for chart
        const labels = connectionCounts.map(item => {
            const date = new Date(item.collected_at);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });
        
        const data = connectionCounts.map(item => item.connection_count);
        
        // Get canvas context
        const ctx = document.getElementById('connections-history-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (state.charts.connectionsHistoryChart) {
            state.charts.connectionsHistoryChart.destroy();
        }
        
        // Create new chart
        state.charts.connectionsHistoryChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Database Connections',
                    data: data,
                    fill: true,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Connections'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Database Connections History'
                    }
                }
            }
        });
    }
    
    /**
     * Show or hide loading indicator
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
