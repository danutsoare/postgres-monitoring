/**
 * Simple Debug Logger for PostgreSQL Monitoring Dashboard
 * Place this code at the top of your main JavaScript file
 */

// Create a simple debug logger
const SimpleDebugger = {
    // Log levels
    LEVELS: {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    },
    
    // Current log level
    currentLevel: 3, // Debug level by default
    
    // Storage for logs
    logs: [],
    
    // Maximum number of logs to keep
    maxLogs: 500,
    
    // DOM element for displaying logs
    logElement: null,
    
    // Initialize the debugger
    init: function(options = {}) {
      // Set options
      this.currentLevel = options.level !== undefined ? options.level : this.currentLevel;
      this.maxLogs = options.maxLogs || this.maxLogs;
      
      // Create UI if requested
      if (options.createUI) {
        this.createUI();
      }
      
      // Override console methods to capture logs
      this.overrideConsole();
      
      // Set up global error handler
      this.setupErrorHandler();
      
      this.info('Debug logger initialized', options);
      return this;
    },
    
    // Log a message
    log: function(level, message, data) {
      // Skip if level is higher than current
      if (level > this.currentLevel) return;
      
      // Create log entry
      const entry = {
        time: new Date(),
        level,
        levelName: this.getLevelName(level),
        message,
        data
      };
      
      // Store log
      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
      
      // Format for console
      const formattedMessage = `[${entry.time.toISOString()}] [${entry.levelName}] ${message}`;
      
      // Output to console with appropriate method
      switch (level) {
        case this.LEVELS.ERROR:
          console.error(formattedMessage, data || '');
          break;
        case this.LEVELS.WARN:
          console.warn(formattedMessage, data || '');
          break;
        case this.LEVELS.INFO:
          console.info(formattedMessage, data || '');
          break;
        case this.LEVELS.DEBUG:
        default:
          console.log(formattedMessage, data || '');
      }
      
      // Update UI if exists
      this.updateUI();
      
      return entry;
    },
    
    // Helper methods for different log levels
    error: function(message, data) {
      return this.log(this.LEVELS.ERROR, message, data);
    },
    
    warn: function(message, data) {
      return this.log(this.LEVELS.WARN, message, data);
    },
    
    info: function(message, data) {
      return this.log(this.LEVELS.INFO, message, data);
    },
    
    debug: function(message, data) {
      return this.log(this.LEVELS.DEBUG, message, data);
    },
    
    // Get level name
    getLevelName: function(level) {
      for (const [name, value] of Object.entries(this.LEVELS)) {
        if (value === level) return name;
      }
      return 'UNKNOWN';
    },
    
    // Override console methods to capture all logs
    overrideConsole: function() {
      const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
      };
      
      // Override console.log
      console.log = (...args) => {
        originalConsole.log(...args);
        this.captureConsoleLog(this.LEVELS.DEBUG, args);
      };
      
      // Override console.info
      console.info = (...args) => {
        originalConsole.info(...args);
        this.captureConsoleLog(this.LEVELS.INFO, args);
      };
      
      // Override console.warn
      console.warn = (...args) => {
        originalConsole.warn(...args);
        this.captureConsoleLog(this.LEVELS.WARN, args);
      };
      
      // Override console.error
      console.error = (...args) => {
        originalConsole.error(...args);
        this.captureConsoleLog(this.LEVELS.ERROR, args);
      };
    },
    
    // Capture console logs
    captureConsoleLog: function(level, args) {
      if (args.length === 0) return;
      
      const message = args[0];
      const data = args.length > 1 ? args.slice(1) : undefined;
      
      // Create log entry without recursively calling log()
      const entry = {
        time: new Date(),
        level,
        levelName: this.getLevelName(level),
        message: message !== null && message !== undefined ? message.toString() : 'undefined',
        data,
        fromConsole: true
      };
      
      // Store log
      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
      
      // Update UI
      this.updateUI();
    },
    
    // Set up global error handler
    setupErrorHandler: function() {
      window.onerror = (message, source, lineno, colno, error) => {
        this.error(`Global error: ${message}`, {
          source,
          line: lineno,
          column: colno,
          stack: error?.stack,
          error
        });
        
        // Don't prevent default error handling
        return false;
      };
      
      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', {
          reason: event.reason,
          stack: event.reason?.stack,
          event
        });
      });
    },
    
    // Create debug UI
    createUI: function() {
      if (typeof document === 'undefined') return;
      
      // Create container
      const container = document.createElement('div');
      container.id = 'simple-debug-container';
      container.style.cssText = `
        position: fixed;
        bottom: 0;
        right: 0;
        width: 50px;
        height: 50px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        z-index: 9999;
        border-radius: 8px 0 0 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
      `;
      
      // Create button
      const button = document.createElement('div');
      button.textContent = '🐞';
      button.style.fontSize = '24px';
      container.appendChild(button);
      
      // Create log panel (initially hidden)
      const panel = document.createElement('div');
      panel.id = 'simple-debug-panel';
      panel.style.cssText = `
        position: fixed;
        bottom: 50px;
        right: 0;
        width: 600px;
        height: 400px;
        background-color: rgba(0, 0, 0, 0.9);
        color: white;
        z-index: 9998;
        border-radius: 8px 0 0 0;
        display: none;
        flex-direction: column;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
      `;
      
      // Create header
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
      `;
      
      const title = document.createElement('div');
      title.textContent = 'Debug Logs';
      title.style.fontWeight = 'bold';
      header.appendChild(title);
      
      const closeButton = document.createElement('div');
      closeButton.textContent = '✖';
      closeButton.style.cursor = 'pointer';
      header.appendChild(closeButton);
      
      panel.appendChild(header);
      
      // Create logs container
      const logs = document.createElement('div');
      logs.id = 'simple-debug-logs';
      logs.style.cssText = `
        flex: 1;
        overflow-y: auto;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 4px;
        padding: 5px;
      `;
      panel.appendChild(logs);
      
      // Create footer with controls
      const footer = document.createElement('div');
      footer.style.cssText = `
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
      `;
      
      const clearButton = document.createElement('button');
      clearButton.textContent = 'Clear Logs';
      clearButton.style.cssText = `
        background-color: #555;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
      `;
      footer.appendChild(clearButton);
      
      const levelSelector = document.createElement('select');
      levelSelector.style.cssText = `
        background-color: #555;
        color: white;
        border: none;
        padding: 5px;
        border-radius: 4px;
      `;
      
      for (const [name, value] of Object.entries(this.LEVELS)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        if (value === this.currentLevel) {
          option.selected = true;
        }
        levelSelector.appendChild(option);
      }
      footer.appendChild(levelSelector);
      
      panel.appendChild(footer);
      
      // Add to document
      document.body.appendChild(container);
      document.body.appendChild(panel);
      
      // Store log element reference
      this.logElement = logs;
      
      // Add event listeners
      container.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      });
      
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.style.display = 'none';
      });
      
      clearButton.addEventListener('click', () => {
        this.clearLogs();
      });
      
      levelSelector.addEventListener('change', () => {
        this.currentLevel = parseInt(levelSelector.value);
        this.info('Log level changed', { level: this.currentLevel });
      });
      
      // Initial update
      this.updateUI();
    },
    
    // Update the UI with logs
    updateUI: function() {
      if (!this.logElement) return;
      
      // Get elements
      const logsElement = this.logElement;
      const container = document.getElementById('simple-debug-container');
      
      // Update logs display
      logsElement.innerHTML = '';
      
      // Show error indicator if there are errors
      const hasErrors = this.logs.some(log => log.level === this.LEVELS.ERROR);
      if (hasErrors) {
        container.style.backgroundColor = 'rgba(220, 53, 69, 0.7)';
      } else {
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      }
      
      // Add logs to display (newest first)
      this.logs.slice().reverse().forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.style.margin = '2px 0';
        logEntry.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        logEntry.style.paddingBottom = '2px';
        
        // Set color based on level
        let color;
        switch(log.level) {
          case this.LEVELS.ERROR:
            color = '#dc3545';
            break;
          case this.LEVELS.WARN:
            color = '#ffc107';
            break;
          case this.LEVELS.INFO:
            color = '#17a2b8';
            break;
          default:
            color = '#6c757d';
        }
        
        const time = log.time.toTimeString().split(' ')[0];
        
        logEntry.innerHTML = `
          <span style="color: #999;">[${time}]</span>
          <span style="color: ${color}; font-weight: bold;">[${log.levelName}]</span>
          <span>${this.escapeHtml(log.message)}</span>
          ${log.data ? '<span style="color: #28a745; cursor: pointer;" onclick="console.log(\'Log data:\', this.dataset.data)" data-data="' + this.escapeHtml(JSON.stringify(log.data)) + '">📋</span>' : ''}
        `;
        
        logsElement.appendChild(logEntry);
      });
      
      // Auto-scroll to bottom
      logsElement.scrollTop = logsElement.scrollHeight;
    },
    
    // Clear all logs
    clearLogs: function() {
      this.logs = [];
      this.updateUI();
      return this;
    },
    
    // Helper to safely escape HTML
    escapeHtml: function(unsafe) {
      if (unsafe === null || unsafe === undefined) return '';
      
      return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },
    
    // Export logs as JSON
    exportLogs: function() {
      const dataStr = JSON.stringify(this.logs, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'debug-logs.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };
  
  // Initialize and make globally available
  window.debug = SimpleDebugger.init({ createUI: true });
  
  // Function to add debugging to window.postgresMonitorApi
  function debugApi() {
    if (!window.postgresMonitorApi) {
      window.debug.error('postgresMonitorApi not found');
      return;
    }
    
    // Check if getDatabaseStats exists
    if (!window.postgresMonitorApi.getDatabaseStats) {
      window.debug.error('postgresMonitorApi.getDatabaseStats method is missing');
      
      // Check what methods do exist
      const methods = [];
      for (let prop in window.postgresMonitorApi) {
        if (typeof window.postgresMonitorApi[prop] === 'function') {
          methods.push(prop);
        }
      }
      window.debug.info('Available API methods:', methods);
      
      // Log the API object structure
      window.debug.info('API object structure:', window.postgresMonitorApi);
    }
  }
  
  // Add debugging to dashboard.js refreshAllData function
  function debugDashboard() {
    // Check if we can access the dashboard function
    if (typeof refreshAllData === 'function') {
      // Store original function
      const originalRefreshAllData = refreshAllData;
      
      // Replace with debugged version
      window.refreshAllData = async function() {
        window.debug.info('refreshAllData called');
        
        try {
          window.debug.info('dashboardState before refresh:', { ...dashboardState });
          
          // Check API availability
          window.debug.info('API client check:', { 
            postgresMonitorApi: !!window.postgresMonitorApi,
            PgClient: !!window.PgClient
          });
          
          if (window.postgresMonitorApi) {
            for (let method in window.postgresMonitorApi) {
              window.debug.debug(`API method check: ${method}`, typeof window.postgresMonitorApi[method]);
            }
          }
          
          // Call original function
          await originalRefreshAllData();
          
          window.debug.info('refreshAllData completed successfully');
        } catch (error) {
          window.debug.error('Error in refreshAllData:', {
            message: error.message,
            stack: error.stack
          });
          throw error;
        }
      };
      
      window.debug.info('refreshAllData function has been debugged');
    } else {
      window.debug.error('refreshAllData function not found');
    }
  }
  
  // Run debugging after DOM content loaded
  document.addEventListener('DOMContentLoaded', function() {
    window.debug.info('DOM loaded, running debug initializations');
    
    // Wait a short time to ensure all scripts are loaded
    setTimeout(() => {
      debugApi();
      debugDashboard();
      window.debug.info('Debug initializations complete');
    }, 500);
  });