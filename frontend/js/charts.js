/**
 * PostgreSQL Monitoring Dashboard - Chart Rendering
 * frontend/js/charts.js
 * 
 * Handles all chart creation and updates using ApexCharts
 */

// Chart registry to keep track of all charts
const charts = {};

// Color palettes
const chartColors = {
    default: ['#336791', '#214768', '#32a852', '#dc3545', '#ffc107', '#6c757d', '#17a2b8'],
    dark: ['#4682B4', '#6495ED', '#5F9EA0', '#48D1CC', '#87CEEB', '#87CEFA', '#00BFFF'],
    colorful: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#2ECC71']
};

// Default chart options
const defaultChartOptions = {
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    toolbar: {
        show: false
    },
    animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
            enabled: true,
            delay: 150
        },
        dynamicAnimation: {
            enabled: true,
            speed: 350
        }
    }
};

// Initialize all charts
function initCharts() {
    initCpuUsageChart();
    initWaitEventsChart();
    initWaitEventsTimelineChart();
    initWaitEventsBySessionChart();
    initLockTypesChart();
    initTempSpaceTimelineChart();
    initTempSpaceByHourChart();
    initTempSpaceByQueryTypeChart();
    initBufferCacheChart();
}

// CPU Usage Chart 
function initCpuUsageChart() {
    const options = {
        series: [{
            name: 'CPU Usage',
            data: [28.5, 22.1, 18.7, 12.4, 5.8, 4.2, 3.5, 2.9, 1.9]
        }],
        chart: {
            type: 'bar',
            height: 300,
            ...defaultChartOptions
        },
        plotOptions: {
            bar: {
                horizontal: true,
                distributed: true,
                dataLabels: {
                    position: 'top',
                },
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val + "%";
            },
            offsetX: 30,
            style: {
                fontSize: '12px',
                colors: ['#333']
            }
        },
        colors: chartColors.default,
        xaxis: {
            categories: ['PID 12345 (app_user)', 'PID 12348 (analytics_user)', 'PID 12350 (app_user)', 
                        'PID 12352 (reporting_user)', 'PID 12355 (admin_user)', 'PID 12360 (etl_user)',
                        'PID 12370 (app_user)', 'PID 12380 (app_user)', 'PID 12385 (app_user)'],
            labels: {
                show: true,
            },
            title: {
                text: 'CPU Usage (%)'
            }
        },
        yaxis: {
            labels: {
                show: true
            }
        },
        title: {
            text: 'CPU Usage by Session',
            align: 'left',
            style: {
                fontSize: '14px'
            }
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val + "% CPU";
                }
            }
        }
    };
    
    charts.cpuUsage = new ApexCharts(document.querySelector("#cpu-usage-chart"), options);
    charts.cpuUsage.render();
}

// Wait Events Chart
function initWaitEventsChart() {
    const options = {
        series: [{
            name: 'Wait Time',
            data: [245.3, 187.6, 112.4, 84.7, 70.8]
        }],
        chart: {
            type: 'bar',
            height: 300,
            ...defaultChartOptions
        },
        plotOptions: {
            bar: {
                horizontal: true,
                distributed: true,
                dataLabels: {
                    position: 'top',
                },
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val + "s";
            },
            offsetX: 30,
            style: {
                fontSize: '12px',
                colors: ['#333']
            }
        },
        colors: chartColors.default,
        xaxis: {
            categories: ['LWLock:buffer_content', 'IO:DataFileRead', 'Lock:tuple', 
                        'IO:WALWrite', 'LWLock:buffer_mapping'],
            labels: {
                show: true,
            },
            title: {
                text: 'Wait Time (seconds)'
            }
        },
        yaxis: {
            labels: {
                show: true
            }
        },
        title: {
            text: 'Top Wait Events',
            align: 'left',
            style: {
                fontSize: '14px'
            }
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val + " seconds";
                }
            }
        }
    };
    
    charts.waitEvents = new ApexCharts(document.querySelector("#wait-events-chart"), options);
    charts.waitEvents.render();
}

// Wait Events Timeline Chart
function initWaitEventsTimelineChart() {
    const options = {
        series: [
            {
                name: 'LWLock:buffer_content',
                data: [30, 40, 45, 50, 49, 60, 70, 91, 125]
            },
            {
                name: 'IO:DataFileRead',
                data: [20, 30, 40, 35, 50, 40, 35, 45, 55]
            },
            {
                name: 'Lock:tuple',
                data: [10, 15, 20, 25, 30, 25, 20, 30, 40]
            }
        ],
        chart: {
            height: 300,
            type: 'line',
            ...defaultChartOptions
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        colors: chartColors.default,
        xaxis: {
            categories: ['15:00', '15:05', '15:10', '15:15', '15:20', '15:25', '15:30', '15:35', '15:40'],
            title: {
                text: 'Time'
            }
        },
        yaxis: {
            title: {
                text: 'Wait Time (ms)'
            }
        },
        title: {
            text: 'Wait Events Over Time',
            align: 'left',
            style: {
                fontSize: '14px'
            }
        },
        legend: {
            position: 'top'
        }
    };
    
    charts.waitEventsTimeline = new ApexCharts(document.querySelector("#wait-events-timeline"), options);
    charts.waitEventsTimeline.render();
}

// Wait Events by Session Chart
function initWaitEventsBySessionChart() {
    const options = {
        series: [{
            name: 'Wait Time',
            data: [120, 90, 60, 48, 30]
        }],
        chart: {
            type: 'bar',
            height: 300,
            ...defaultChartOptions
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                endingShape: 'rounded'
            },
        },
        dataLabels: {
            enabled: false
        },
        colors: chartColors.default,
        xaxis: {
            categories: ['PID 12348', 'PID 12345', 'PID 12352', 'PID 12360', 'PID 12370'],
            title: {
                text: 'Session'
            }
        },
        yaxis: {
            title: {
                text: 'Total Wait Time (s)'
            }
        },
        title: {
            text: 'Wait Events by Session',
            align: 'left',
            style: {
                fontSize: '14px'
            }
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val + " seconds";
                }
            }
        }
    };
    
    charts.waitEventsBySession = new ApexCharts(document.querySelector("#wait-events-by-session"), options);
    charts.waitEventsBySession.render();
}

// Lock Types Chart
function initLockTypesChart() {
    const options = {
        series: [45, 25, 15, 10, 5],
        chart: {
            width: '100%',
            height: 300,
            type: 'pie',
            ...defaultChartOptions
        },
        labels: ['RowExclusiveLock', 'ShareLock', 'AccessExclusiveLock', 'AccessShareLock', 'ExclusiveLock'],
        colors: chartColors.default,
        title: {
            text: 'Lock Types Distribution',
            align: 'left',
            style: {
                fontSize: '14px'
            }
        },
        legend: {
            position: 'bottom'
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: 'bottom'
                }
            }
        }]
    };
    
    charts.lockTypes = new ApexCharts(document.querySelector("#lock-types-chart"), options);
    charts.lockTypes.render();
}

// Temp Space Timeline Chart
function initTempSpaceTimelineChart() {
    const options = {
        series: [{
            name: 'Temporary Space Usage',
            data: [400, 430, 448, 470, 540, 580, 690, 740, 780]
        }],
        chart: {
            height: 250,
            type: 'area',
            ...defaultChartOptions
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        colors: chartColors.default,
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: ['15:00', '15:05', '15:10', '15:15', '15:20', '15:25', '15:30', '15:35', '15:40'],
            title: {
                text: 'Time'
            }
        },
        yaxis: {
            title: {
                text: 'Usage (MB)'
            }
        },
        title: {
            text: 'Temporary Space Usage Over Time',
            align: 'left',
            style: {
                fontSize: '14px'
            }
        }
    };
    
    charts.tempSpaceTimeline = new ApexCharts(document.querySelector("#temp-space-timeline"), options);
    charts.tempSpaceTimeline.render();
}

// Temp Space by Hour Chart
function initTempSpaceByHourChart() {
    const options = {
        series: [{
            name: 'Avg Temp Space',
            data: [300, 450, 600, 780, 720, 650, 580, 500, 420, 380, 540, 680]
        }],
        chart: {
            height: 300,
            type: 'bar',
            ...defaultChartOptions
        },
        plotOptions: {
            bar: {
                columnWidth: '60%',
            }
        },
        colors: chartColors.default,
        xaxis: {
            categories: ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM'],
            title: {
                text: 'Hour of Day'
            }
        },
        yaxis: {
            title: {
                text: 'Avg Temp Space (MB)'
            }
        },
        title: {
            text: 'Average Temp Space by Hour of Day',
            align: 'left',
            style: {
                fontSize: '14px'
            }
        },
        dataLabels: {
            enabled: false
        }
    };
    
    charts.tempSpaceByHour = new ApexCharts(document.querySelector("#temp-space-by-hour"), options);
    charts.tempSpaceByHour.render();
}

// Temp Space by Query Type Chart
function initTempSpaceByQueryTypeChart() {
    const options = {
        series: [{
            name: 'Temp Space Usage',
            data: [320, 215, 145, 100]
        }],
        chart: {
            height: 300,
            type: 'bar',
            ...defaultChartOptions
        },
        plotOptions: {
            bar: {
                horizontal: true,
                distributed: true,
                dataLabels: {
                    position: 'top',
                },
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val + " MB";
            },
            offsetX: 30,
            style: {
                fontSize: '12px',
                colors: ['#333']
            }
        },
        colors: chartColors.default,
        xaxis: {
            categories: ['GROUP BY Queries', 'ORDER BY Queries', 'JOIN Queries', 'DISTINCT Queries'],
            title: {
                text: 'Temp Space (MB)'
            }
        },
        title: {
            text: 'Temp Space Usage by Query Type',
            align: 'left',
            style: {
                fontSize: '14px'
            }
        }
    };
    
    charts.tempSpaceByQueryType = new ApexCharts(document.querySelector("#temp-space-by-query-type"), options);
    charts.tempSpaceByQueryType.render();
}

// Buffer Cache Chart
function initBufferCacheChart() {
    const options = {
        series: [
            {
                name: 'Buffer Usage',
                data: [
                    {
                        x: 'customers',
                        y: 25
                    },
                    {
                        x: 'orders',
                        y: 20
                    },
                    {
                        x: 'order_items',
                        y: 18
                    },
                    {
                        x: 'products',
                        y: 15
                    },
                    {
                        x: 'inventory',
                        y: 12
                    },
                    {
                        x: 'users',
                        y: 10
                    }
                ]
            }
        ],
        chart: {
            height: 300,
            type: 'treemap',
            ...defaultChartOptions
        },
        colors: chartColors.default,
        title: {
            text: 'Buffer Cache Usage by Table',
            align: 'left',
            style: {
                fontSize: '14px'
            }
        },
        dataLabels: {
            enabled: true,
            style: {
                fontSize: '12px',
            },
            formatter: function(text, op) {
                return [text, op.value + '%']
            }
        }
    };
    
    charts.bufferCache = new ApexCharts(document.querySelector("#buffer-cache-chart"), options);
    charts.bufferCache.render();
}

// Update charts theme based on dark mode
function updateChartsTheme(isDarkMode) {
    const theme = isDarkMode ? 'dark' : 'light';
    const colors = isDarkMode ? chartColors.dark : chartColors.default;
    const foreColor = isDarkMode ? '#f8f9fa' : '#373d3f';
    
    // Update each chart with new theme
    for (const chartId in charts) {
        if (charts.hasOwnProperty(chartId)) {
            charts[chartId].updateOptions({
                theme: {
                    mode: theme
                },
                colors: colors,
                chart: {
                    foreColor: foreColor
                }
            }, false, true);
        }
    }
}

// Update chart with real data from API
async function updateChartWithApiData(chartId, apiFunction, dataMapper) {
    try {
        if (!charts[chartId]) {
            console.error(`Chart ${chartId} not found`);
            return;
        }
        
        // Get data from API
        const data = await apiFunction();
        
        // Process data with the mapper function
        const processedData = dataMapper(data);
        
        // Update chart
        charts[chartId].updateOptions(processedData, true);
        
    } catch (error) {
        console.error(`Error updating chart ${chartId}:`, error);
    }
}

// Update all charts with real data
async function refreshAllCharts() {
    try {
        // 1. Get PostgreSQL version
        const versionData = await window.postgresMonitorApi.getVersion();
        document.querySelector('.version-badge').textContent = versionData.version.split(' ')[0];
        
        // 2. Update session charts
        const sessionData = await window.postgresMonitorApi.getTopSessions();
        // Update CPU usage chart
        const cpuUsageData = {
            series: [{
                name: 'CPU Usage',
                data: sessionData.map(session => session.cpu_usage)
            }],
            xaxis: {
                categories: sessionData.map(session => `PID ${session.pid} (${session.username})`)
            }
        };
        charts.cpuUsage.updateOptions(cpuUsageData, true);
        
        // 3. Update wait events chart
        const waitEventsData = await window.postgresMonitorApi.getWaitEvents();
        const waitEventsSeries = {
            series: [{
                name: 'Wait Time',
                data: waitEventsData.slice(0, 5).map(event => event.total_wait_time)
            }],
            xaxis: {
                categories: waitEventsData.slice(0, 5).map(event => `${event.wait_event_type}:${event.wait_event}`)
            }
        };
        charts.waitEvents.updateOptions(waitEventsSeries, true);
        
        // 4. Update wait events timeline
        const waitTimelineData = await window.postgresMonitorApi.getWaitEventsTimeline(1);
        // Processing would be done here...
        
        // 5. Update temp space usage
        const tempSpaceData = await window.postgresMonitorApi.getTempSpaceUsage();
        const tempSpaceSeries = {
            series: [{
                name: 'Temp Space Usage',
                data: tempSpaceData.slice(0, 4).map(item => Math.round(item.temp_bytes / 1024 / 1024))
            }],
            xaxis: {
                categories: tempSpaceData.slice(0, 4).map(item => `${item.query_type} Queries`)
            }
        };
        charts.tempSpaceByQueryType.updateOptions(tempSpaceSeries, true);
        
        // 6. Update lock information
        // This would require more complex processing...
        
        // Update last refresh time
        document.getElementById('last-refresh-time').textContent = new Date().toLocaleString();
        
    } catch (error) {
        console.error('Error refreshing charts:', error);
    }
}

// Export chart functions
window.postgresMonitorCharts = {
    init: initCharts,
    updateTheme: updateChartsTheme,
    refreshAll: refreshAllCharts
};