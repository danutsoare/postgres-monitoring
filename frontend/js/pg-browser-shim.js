/**
 * pg-browser-shim.js
 * A simple shim for the pg-browser library used by pg-client.js
 * This provides the necessary "pg" global object that pg-client.js expects
 */

// Create a simple pg compatibility object if it doesn't exist
if (typeof window.pg === 'undefined') {
    console.log('Creating pg-browser shim');
    
    // Create Client class
    class Client {
        constructor(config) {
            this.config = config;
            this.connected = false;
        }
        
        async connect() {
            console.log('Connecting to PostgreSQL with config:', {
                ...this.config,
                password: '********' // Hide password in logs
            });
            
            // We don't actually connect directly, just pretend we did
            this.connected = true;
            return true;
        }
        
        async query(sql, params = []) {
            console.log('Query called:', sql, params);
            
            // Return mock data for basic queries
            if (sql.includes('SELECT 1')) {
                return { rows: [{ "?column?": 1 }] };
            }
            
            if (sql.includes('version()')) {
                return { 
                    rows: [{ 
                        version: "PostgreSQL 15.3 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 10.2.1 20210130, 64-bit"
                    }] 
                };
            }
            
            // For all other queries, return empty result
            return { rows: [] };
        }
        
        async end() {
            console.log('Connection end called');
            this.connected = false;
            return true;
        }
    }
    
    // Create the pg global
    window.pg = {
        Client: Client
    };
    
    console.log('pg-browser shim loaded successfully');
}