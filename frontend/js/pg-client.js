// PostgreSQL Monitor - Direct Database Connection Module
// Uses pg-browser library for direct PostgreSQL connections from the browser



const PgClient = {
    // Connection pool to avoid creating new connections for every request
    connections: new Map(),
    connectionLocks: new Map(),
    
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
                ssl: config.ssl ? { rejectUnauthorized: false } : false,
                connectionTimeoutMillis: 5000 // Set reasonable timeout
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
            
            // Test query to check available extensions
            try {
                const extensionsRes = await client.query(`
                    SELECT name, default_version, installed_version, comment
                    FROM pg_available_extensions
                    WHERE installed_version IS NOT NULL
                    ORDER BY name
                `);
                console.log('Available extensions:', extensionsRes.rows.length);
            } catch (extError) {
                console.warn('Extensions query failed, might be insufficient permissions:', extError.message);
            }
            
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
    
    // Get or create a client for a connection
    getClient: async function(connectionId) {
        // Use a lock to prevent multiple simultaneous connection attempts
        if (this.connectionLocks.has(connectionId)) {
            return this.connectionLocks.get(connectionId);
        }

        const lockPromise = (async () => {
            try {
                // Check if we already have a client for this connection
                if (this.connections.has(connectionId)) {
                    const client = this.connections.get(connectionId);
                    
                    // Test if connection is still valid
                    try {
                        await client.query('SELECT 1');
                        return client;
                    } catch (error) {
                        console.warn(`Stored connection ${connectionId} is invalid, will create a new one:`, error.message);
                        // Close the invalid connection
                        try {
                            await client.end();
                        } catch (e) {
                            console.error('Error closing invalid connection:', e);
                        }
                        // Remove from map
                        this.connections.delete(connectionId);
                    }
                }
                
                // Get connection info from storage
                const connectionsStr = localStorage.getItem('pg_monitor_connections');
                const connections = connectionsStr ? JSON.parse(connectionsStr) : [];
                const connection = connections.find(conn => conn.id === connectionId);
                
                if (!connection) {
                    throw new Error(`Connection with ID ${connectionId} not found`);
                }
                
                // Create a new client
                const client = new pg.Client({
                    user: connection.username,
                    host: connection.host,
                    database: connection.database,
                    password: connection.password,
                    port: connection.port,
                    ssl: connection.ssl ? { rejectUnauthorized: false } : false
                });
                
                // Connect to the database
                await client.connect();
                
                // Store the client
                this.connections.set(connectionId, client);
                
                return client;
            } finally {
                this.connectionLocks.delete(connectionId);
            }
        })();

        this.connectionLocks.set(connectionId, lockPromise);
        return lockPromise;
    },
    
    // Get database statistics (real-time monitoring data)
    getDbStats: async function(connectionId) {
        try {
            // Get client
            const client = await this.getClient(connectionId);
            
            // Query for various statistics
            const stats = {};
            
            try {
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

                // 2. CPU usage estimation - based on pg_stat_activity
                const cpuUsageQuery = await client.query(`
                    WITH active_sessions AS (
                        SELECT pid, usename, query_start, now() - query_start as duration
                        FROM pg_stat_activity
                        WHERE state = 'active' AND pid <> pg_backend_pid()
                    ),
                    total_active AS (
                        SELECT count(*) as count
                        FROM active_sessions
                    )
                    SELECT pid, 
                           usename, 
                           extract(epoch from duration) as duration_seconds,
                           CASE 
                               WHEN (SELECT count FROM total_active) > 0 
                               THEN 100.0 / (SELECT count FROM total_active)
                               ELSE 0 
                           END as cpu_percentage
                    FROM active_sessions
                    ORDER BY duration DESC
                `);
                stats.cpuUsage = cpuUsageQuery.rows;
                
                // 3. Database size
                try {
                    const dbSizeQuery = await client.query(`
                        WITH db_size AS (
                            SELECT COALESCE(pg_size_pretty(pg_database_size(current_database())), '0 MB') as size
                        )
                        SELECT size FROM db_size
                    `);
                    
                    if (!dbSizeQuery.rows || dbSizeQuery.rows.length === 0) {
                        console.warn('Database size query returned no results');
                        stats.databaseSize = '0 MB';
                    } else {
                        stats.databaseSize = dbSizeQuery.rows[0].size || '0 MB';
                    }
                } catch (dbSizeError) {
                    console.warn('Error fetching database size:', dbSizeError.message);
                    stats.databaseSize = '0 MB';
                }
                
                // 4. Table sizes
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
                
                // 5. Active queries
                const activeQueriesQuery = await client.query(`
                    SELECT pid, usename, query_start, 
                           now() - query_start as duration,
                           state, wait_event_type, wait_event, query
                    FROM pg_stat_activity
                    WHERE state = 'active' AND pid <> pg_backend_pid()
                    ORDER BY duration DESC
                `);
                stats.activeQueries = activeQueriesQuery.rows;
                
                // 6. Wait events
                const waitEventsQuery = await client.query(`
                    SELECT wait_event_type, wait_event, COUNT(*) as count
                    FROM pg_stat_activity
                    WHERE wait_event IS NOT NULL
                    GROUP BY wait_event_type, wait_event
                    ORDER BY count DESC
                `);
                stats.waitEvents = waitEventsQuery.rows;
                
                // 7. Blocking sessions (with error handling)
                try {
                    const blockingQuery = await client.query(`
                        WITH RECURSIVE blockers AS (
                            SELECT waiting.pid AS waiting_pid, 
                                   waiting.usename AS waiting_user,
                                   waiting.query AS waiting_query,
                                   blocking.pid AS blocking_pid,
                                   blocking.usename AS blocking_user,
                                   blocking.query AS blocking_query,
                                   0 AS level
                            FROM pg_stat_activity waiting
                            JOIN pg_stat_activity blocking ON waiting.wait_event_type = 'Lock' 
                                AND blocking.pid = ANY(pg_blocking_pids(waiting.pid))
                            WHERE NOT waiting.wait_event_type IS NULL
                            
                            UNION ALL
                            
                            SELECT waiting.pid, 
                                   waiting.usename, 
                                   waiting.query,
                                   blocking.pid,
                                   blocking.usename,
                                   blocking.query,
                                   blockers.level + 1
                            FROM blockers
                            JOIN pg_stat_activity waiting ON waiting.pid = blockers.blocking_pid
                            JOIN pg_stat_activity blocking ON waiting.wait_event_type = 'Lock'
                                AND blocking.pid = ANY(pg_blocking_pids(waiting.pid))
                            WHERE NOT waiting.wait_event_type IS NULL
                            AND blockers.level < 3 -- prevent infinite recursion
                        )
                        SELECT blocking_pid, blocking_user, blocking_query, level,
                               array_agg(waiting_pid) AS blocked_pids,
                               json_agg(json_build_object(
                                   'pid', waiting_pid,
                                   'user', waiting_user,
                                   'query', waiting_query
                               )) AS blocked_sessions_info
                        FROM blockers
                        GROUP BY blocking_pid, blocking_user, blocking_query, level
                        ORDER BY level, blocking_pid;
                    `);
                    stats.blockingSessions = blockingQuery.rows;
                } catch (blockingError) {
                    console.warn('Error fetching blocking sessions:', blockingError.message);
                    // Try simpler query for older PostgreSQL versions
                    try {
                        const simpleBlockingQuery = await client.query(`
                            SELECT blocked_activity.pid AS waiting_pid,
                                   blocked_activity.usename AS waiting_user,
                                   blocked_activity.query AS waiting_query,
                                   blocking_activity.pid AS blocking_pid,
                                   blocking_activity.usename AS blocking_user,
                                   blocking_activity.query AS blocking_query
                            FROM pg_stat_activity blocked_activity
                            JOIN pg_stat_activity blocking_activity ON blocked_activity.wait_event_type = 'Lock'
                               AND blocked_activity.pid != blocking_activity.pid
                            WHERE blocked_activity.wait_event_type = 'Lock'
                        `);
                        
                        // Format in a compatible structure
                        const formatted = [];
                        const blockingPids = [...new Set(simpleBlockingQuery.rows.map(r => r.blocking_pid))];
                        
                        blockingPids.forEach(pid => {
                            const blockedRows = simpleBlockingQuery.rows.filter(r => r.blocking_pid === pid);
                            if (blockedRows.length > 0) {
                                formatted.push({
                                    blocking_pid: pid,
                                    blocking_user: blockedRows[0].blocking_user,
                                    blocking_query: blockedRows[0].blocking_query,
                                    level: 0,
                                    blocked_pids: blockedRows.map(r => r.waiting_pid),
                                    blocked_sessions_info: blockedRows.map(r => ({
                                        pid: r.waiting_pid,
                                        user: r.waiting_user,
                                        query: r.waiting_query
                                    }))
                                });
                            }
                        });
                        
                        stats.blockingSessions = formatted;
                    } catch (e) {
                        console.error('Failed with simple blocking query too:', e.message);
                        stats.blockingSessions = [];
                    }
                }
                
                // 8. Temporary space usage (with error handling)
                try {
                    const tempUsageQuery = await client.query(`
                        SELECT sa.pid,
                               sa.usename,
                               sa.query,
                               pg_size_pretty(temp.size) as temp_size,
                               temp.size as temp_bytes
                        FROM pg_stat_activity sa
                        JOIN (
                            SELECT sess_id as pid, sum(size) as size
                            FROM pg_temp_files
                            GROUP BY sess_id
                        ) temp ON sa.pid = temp.pid
                        ORDER BY temp.size DESC
                    `);
                    stats.tempUsage = tempUsageQuery.rows;
                } catch (tempError) {
                    console.warn('Error fetching temp usage:', tempError.message);
                    try {
                        // Try alternative query for PostgreSQL < 12
                        const altTempQuery = await client.query(`
                            SELECT sa.pid,
                                   sa.usename,
                                   sa.query,
                                   pg_size_pretty(0) as temp_size,
                                   0 as temp_bytes
                            FROM pg_stat_activity sa
                            WHERE state = 'active'
                            LIMIT 5
                        `);
                        stats.tempUsage = altTempQuery.rows;
                    } catch (e) {
                        console.error('Failed with alternative temp query too:', e.message);
                        stats.tempUsage = [];
                    }
                }
                
                // 9. Check for available extensions
                const extensionsQuery = await client.query(`
                    SELECT name, default_version, installed_version
                    FROM pg_available_extensions
                    WHERE installed_version IS NOT NULL
                    ORDER BY name
                `);
                stats.extensions = extensionsQuery.rows;
                
                // 10. Connection count
                try {
                    const connectionCountQuery = await client.query(`
                        SELECT count(*) as connection_count
                        FROM pg_stat_activity
                    `);
                    stats.connectionCount = connectionCountQuery.rows[0]?.connection_count || 0;
                } catch (countError) {
                    console.warn('Error fetching connection count:', countError.message);
                    stats.connectionCount = 0;
                }
                
                return {
                    success: true,
                    stats: stats,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                console.error('Query execution error:', error);
                return {
                    success: false,
                    error: this.formatPostgresError(error).message,
                    details: {
                        code: error.code,
                        message: error.message,
                        query: error.query || 'Unknown query'
                    }
                };
            }
        } catch (error) {
            console.error('Error connecting to database:', error);
            return {
                success: false,
                error: this.formatPostgresError(error).message,
                details: error
            };
        }
    },

    // Close all connections
    closeAllConnections: async function() {
        for (const [connectionId, client] of this.connections.entries()) {
            try {
                await client.end();
                console.log(`Closed connection ${connectionId}`);
            } catch (error) {
                console.error(`Error closing connection ${connectionId}:`, error);
            }
        }
        // Clear the map
        this.connections.clear();
    }
};

// Make available globally
window.PgClient = PgClient;