// PostgreSQL Monitor - Direct Database Connection Module
// Uses pg-browser library for direct PostgreSQL connections from the browser

// Import the pg-browser library
// Note: Make sure to include this script in your HTML:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/pg-browser/1.0.0/pg-browser.min.js"></script>

const PgClient = {
    // Test connection to PostgreSQL database
    testConnection: async function(config) {
        console.log('Testing PostgreSQL connection with configuration:', {
            ...config,
            password: '********' // Hide password in logs
        });
        
        try {
            // Create a new client instance
            const client = new pg.Client({
                user: config.username,
                host: config.host,
                database: config.database,
                password: config.password,
                port: config.port,
                ssl: config.ssl ? { rejectUnauthorized: false } : false
            });
            
            console.log('Client instance created, attempting connection...');
            
            // Connect to the database
            await client.connect();
            console.log('Connected successfully to PostgreSQL server');
            
            // Query for PostgreSQL version
            const versionRes = await client.query('SELECT version();');
            const version = versionRes.rows[0].version;
            console.log('PostgreSQL version:', version);
            
            // Get server statistics 
            const statsRes = await client.query(`
                SELECT datname, numbackends, xact_commit, xact_rollback, blks_read, blks_hit,
                       tup_returned, tup_fetched, tup_inserted, tup_updated, tup_deleted
                FROM pg_stat_database 
                WHERE datname = $1
            `, [config.database]);
            console.log('Database statistics:', statsRes.rows[0]);
            
            // Extract version number from the full version string
            // Example: "PostgreSQL 15.3 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 10.2.1 20210130, 64-bit"
            const versionMatch = version.match(/PostgreSQL (\d+\.\d+)/);
            const versionNumber = versionMatch ? versionMatch[1] : 'unknown';
            
            // Close the connection
            await client.end();
            console.log('Connection closed successfully');
            
            // Return success response
            return {
                success: true,
                version: versionNumber,
                details: {
                    fullVersion: version,
                    stats: statsRes.rows[0]
                }
            };
        } 
        catch (error) {
            console.error('PostgreSQL connection error:', error);
            
            // Parse the error to provide more useful information
            const formattedError = this.formatPostgresError(error);
            
            return {
                success: false,
                error: formattedError.message,
                details: {
                    code: formattedError.code,
                    originalError: error.toString(),
                    stack: error.stack
                }
            };
        }
    },
    
    // Format PostgreSQL error messages to be more user-friendly
    formatPostgresError: function(error) {
        // Default message
        let message = error.message || 'Unknown database error';
        let code = error.code || 'UNKNOWN';
        
        // Handle specific error codes
        switch (code) {
            case 'ECONNREFUSED':
                message = `Connection refused. The PostgreSQL server at ${error.address || 'the specified address'} is not accepting connections on port ${error.port || 'the specified port'}.`;
                break;
            case 'ETIMEDOUT':
                message = `Connection timed out. Unable to reach the PostgreSQL server. Check network settings and firewall rules.`;
                break;
            case 'ENOTFOUND':
                message = `Host not found. The server address '${error.hostname || 'specified'}' could not be resolved.`;
                break;
            case '28P01':
                message = `Authentication failed. Invalid username or password.`;
                break;
            case '3D000':
                message = `Database "${error.database || 'specified'}" does not exist.`;
                break;
            case '42P01':
                message = `Relation (table/view) does not exist. This may indicate missing schema or insufficient privileges.`;
                break;
            case '42501':
                message = `Insufficient privileges. The user does not have the required permissions.`;
                break;
            case '53300':
                message = `Too many connections. The server has reached its maximum connection limit.`;
                break;
            case '08006':
                message = `Connection terminated unexpectedly. This could be due to a server crash or network issue.`;
                break;
            case '08001':
                message = `Unable to establish connection. Check that the PostgreSQL server is running.`;
                break;
            case '08004':
                message = `Connection rejected. The server rejected the connection, possibly due to client authentication configuration.`;
                break;
            case 'DEPTH_ZERO_SELF_SIGNED_CERT':
            case 'CERT_HAS_EXPIRED':
            case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
                message = `SSL certificate error: ${message}. Try disabling SSL or configuring proper certificates.`;
                break;
        }
        
        // Look for specific error patterns in the message
        if (message.includes('no pg_hba.conf entry for host')) {
            message = `Server configuration error: The PostgreSQL server is not configured to accept connections from this client's IP address. Check pg_hba.conf on the server.`;
        }
        
        return { message, code };
    },
    
    // Get database statistics (real-time monitoring data)
    getDbStats: async function(connectionId) {
        // This would fetch the stored connection details by ID from local storage or API
        const connection = await this.getConnectionById(connectionId);
        
        if (!connection) {
            throw new Error(`Connection with ID ${connectionId} not found`);
        }
        
        try {
            // Create a new client instance
            const client = new pg.Client({
                user: connection.username,
                host: connection.host,
                database: connection.database,
                password: connection.password, // This would need to be securely stored/retrieved
                port: connection.port,
                ssl: connection.ssl ? { rejectUnauthorized: false } : false
            });
            
            // Connect to the database
            await client.connect();
            
            // Query for various statistics
            const stats = {};
            
            // 1. Session information
            const sessionsQuery = await client.query(`
                SELECT pid, usename, application_name, client_addr, 
                       state, query_start, wait_event_type, wait_event,
                       query
                FROM pg_stat_activity
                WHERE state IS NOT NULL
                ORDER BY query_start DESC
            `);
            stats.sessions = sessionsQuery.rows;
            
            // 2. Database size
            const dbSizeQuery = await client.query(`
                SELECT pg_size_pretty(pg_database_size($1)) as size
            `, [connection.database]);
            stats.databaseSize = dbSizeQuery.rows[0].size;
            
            // 3. Table sizes
            const tableSizesQuery = await client.query(`
                SELECT schemaname, relname as table_name, 
                       pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
                       pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
                       pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - 
                                      pg_relation_size(schemaname||'.'||relname)) as index_size
                FROM pg_stat_user_tables
                ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
                LIMIT 20
            `);
            stats.tableSizes = tableSizesQuery.rows;
            
            // 4. Active queries
            const activeQueriesQuery = await client.query(`
                SELECT pid, usename, query_start, 
                       now() - query_start as duration,
                       state, wait_event_type, wait_event, query
                FROM pg_stat_activity
                WHERE state = 'active' AND pid <> pg_backend_pid()
                ORDER BY duration DESC
            `);
            stats.activeQueries = activeQueriesQuery.rows;
            
            // 5. Blocking sessions
            const blockingQuery = await client.query(`
                SELECT blocked_activity.pid as blocked_pid,
                       blocked_activity.usename as blocked_user,
                       blocking_activity.pid as blocking_pid,
                       blocking_activity.usename as blocking_user,
                       blocked_activity.query as blocked_query,
                       blocking_activity.query as blocking_query
                FROM pg_stat_activity blocked_activity
                JOIN pg_stat_activity blocking_activity 
                  ON blocked_activity.wait_event_type = 'Lock'
                  AND blocked_activity.pid != blocking_activity.pid
                  AND pg_blocking_pids(blocked_activity.pid) @> ARRAY[blocking_activity.pid]
            `);
            stats.blockingSessions = blockingQuery.rows;
            
            // Close the connection
            await client.end();
            
            // Return the collected statistics
            return {
                success: true,
                stats: stats,
                timestamp: new Date().toISOString()
            };
        } 
        catch (error) {
            console.error('Error fetching database statistics:', error);
            return {
                success: false,
                error: this.formatPostgresError(error).message,
                details: error
            };
        }
    },
    
    // This is a placeholder - in a real implementation, you would fetch this from local storage or an API
    getConnectionById: async function(connectionId) {
        // For demonstration purposes, return a dummy connection
        // In production, you would retrieve this securely
        return {
            id: connectionId,
            username: 'postgres',
            host: 'localhost',
            database: 'postgres',
            password: 'postgres', // In real implementation, this would be securely stored/retrieved
            port: 5432,
            ssl: false
        };
    }
};

// Make available globally
window.PgClient = PgClient;