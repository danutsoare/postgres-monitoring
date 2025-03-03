// server.js - Main application file for the PostgreSQL Monitoring API

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const cron = require('node-cron');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Add this route handler here
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Database connections management
const databaseConnections = new Map();
let metricsDb = null;

// Metrics database configuration
const metricsDbConfig = {
  user: process.env.METRICS_PG_USER || 'postgres',
  host: process.env.METRICS_PG_HOST || 'localhost',
  database: process.env.METRICS_PG_DATABASE || 'postgres_metrics',
  password: process.env.METRICS_PG_PASSWORD || 'postgres',
  port: process.env.METRICS_PG_PORT || 5432,
};

// Initialize metrics database
async function initializeMetricsDb() {
  try {
    metricsDb = new Pool(metricsDbConfig);
    
    // Replace the existing table creation logic with a call to the new schema function
    await updateDatabaseSchema();
    
    logger.info('Metrics database tables initialized');
    
    // Load saved connections
    await loadSavedConnections();
    
  } catch (error) {
    logger.error('Error initializing metrics database:', error);
  }
}

// Add this function to create proper foreign key constraints with ON DELETE CASCADE
async function updateDatabaseSchema() {
  try {
    // First check if tables exist
    const tablesExist = await metricsDb.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'database_connections'
      );
    `);

    // If tables don't exist, create them
    if (!tablesExist.rows[0].exists) {
      await metricsDb.query(`
        -- Create tables with ON DELETE CASCADE
        CREATE TABLE database_connections (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          host TEXT NOT NULL,
          port INTEGER NOT NULL,
          database TEXT NOT NULL,
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          ssl BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_connected_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE TABLE pg_version (
          id SERIAL PRIMARY KEY,
          connection_id INTEGER REFERENCES database_connections(id) ON DELETE CASCADE,
          version TEXT NOT NULL,
          collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE session_metrics (
          id SERIAL PRIMARY KEY,
          connection_id INTEGER REFERENCES database_connections(id) ON DELETE CASCADE,
          pid INTEGER NOT NULL,
          username TEXT NOT NULL,
          application_name TEXT,
          database_name TEXT NOT NULL,
          client_addr TEXT,
          backend_start TIMESTAMP WITH TIME ZONE,
          query_start TIMESTAMP WITH TIME ZONE,
          state TEXT,
          cpu_usage FLOAT,
          memory_usage FLOAT,
          collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE wait_events (
          id SERIAL PRIMARY KEY,
          connection_id INTEGER REFERENCES database_connections(id) ON DELETE CASCADE,
          pid INTEGER NOT NULL,
          wait_event_type TEXT,
          wait_event TEXT,
          wait_time FLOAT,
          collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE lock_info (
          id SERIAL PRIMARY KEY,
          connection_id INTEGER REFERENCES database_connections(id) ON DELETE CASCADE,
          pid INTEGER NOT NULL,
          locktype TEXT,
          relation TEXT,
          mode TEXT,
          granted BOOLEAN,
          blocking_pids INTEGER[],
          collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE temp_usage (
          id SERIAL PRIMARY KEY,
          connection_id INTEGER REFERENCES database_connections(id) ON DELETE CASCADE,
          pid INTEGER,
          username TEXT,
          database_name TEXT,
          temp_bytes BIGINT,
          query_type TEXT,
          collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE query_stats (
          id SERIAL PRIMARY KEY,
          connection_id INTEGER REFERENCES database_connections(id) ON DELETE CASCADE,
          query_id BIGINT,
          query TEXT,
          calls INTEGER,
          total_time FLOAT,
          min_time FLOAT,
          max_time FLOAT,
          mean_time FLOAT,
          rows BIGINT,
          collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes for better query performance
        CREATE INDEX IF NOT EXISTS session_metrics_collected_at_idx ON session_metrics(collected_at);
        CREATE INDEX IF NOT EXISTS wait_events_collected_at_idx ON wait_events(collected_at);
        CREATE INDEX IF NOT EXISTS lock_info_collected_at_idx ON lock_info(collected_at);
        CREATE INDEX IF NOT EXISTS temp_usage_collected_at_idx ON temp_usage(collected_at);
        CREATE INDEX IF NOT EXISTS query_stats_collected_at_idx ON query_stats(collected_at);
      `);
    } else {
      // For existing tables, update the constraints
      await metricsDb.query(`
        -- Drop existing constraints if they exist
        ALTER TABLE pg_version DROP CONSTRAINT IF EXISTS pg_version_connection_id_fkey;
        ALTER TABLE session_metrics DROP CONSTRAINT IF EXISTS session_metrics_connection_id_fkey;
        ALTER TABLE wait_events DROP CONSTRAINT IF EXISTS wait_events_connection_id_fkey;
        ALTER TABLE lock_info DROP CONSTRAINT IF EXISTS lock_info_connection_id_fkey;
        ALTER TABLE temp_usage DROP CONSTRAINT IF EXISTS temp_usage_connection_id_fkey;
        ALTER TABLE query_stats DROP CONSTRAINT IF EXISTS query_stats_connection_id_fkey;
        
        -- Re-add constraints with ON DELETE CASCADE
        ALTER TABLE pg_version 
          ADD CONSTRAINT pg_version_connection_id_fkey 
          FOREIGN KEY (connection_id) 
          REFERENCES database_connections(id) 
          ON DELETE CASCADE;
        
        ALTER TABLE session_metrics 
          ADD CONSTRAINT session_metrics_connection_id_fkey 
          FOREIGN KEY (connection_id) 
          REFERENCES database_connections(id) 
          ON DELETE CASCADE;
        
        ALTER TABLE wait_events 
          ADD CONSTRAINT wait_events_connection_id_fkey 
          FOREIGN KEY (connection_id) 
          REFERENCES database_connections(id) 
          ON DELETE CASCADE;
        
        ALTER TABLE lock_info 
          ADD CONSTRAINT lock_info_connection_id_fkey 
          FOREIGN KEY (connection_id) 
          REFERENCES database_connections(id) 
          ON DELETE CASCADE;
        
        ALTER TABLE temp_usage 
          ADD CONSTRAINT temp_usage_connection_id_fkey 
          FOREIGN KEY (connection_id) 
          REFERENCES database_connections(id) 
          ON DELETE CASCADE;
        
        ALTER TABLE query_stats 
          ADD CONSTRAINT query_stats_connection_id_fkey 
          FOREIGN KEY (connection_id) 
          REFERENCES database_connections(id) 
          ON DELETE CASCADE;
      `);
    }
    
    logger.info('Database schema updated with CASCADE delete constraints');
  } catch (error) {
    logger.error('Error updating database schema:', error);
  }
}

// Load saved connections from the database
async function loadSavedConnections() {
  try {
    const result = await metricsDb.query('SELECT * FROM database_connections');
    
    for (const connection of result.rows) {
      await createDatabaseConnection(connection);
    }
    
    logger.info(`Loaded ${result.rows.length} saved database connections`);
  } catch (error) {
    logger.error('Error loading saved connections:', error);
  }
}

// Load connections from config.js if it exists
function loadConnectionsFromConfig() {
  try {
    const configPath = path.join(__dirname, 'config.js');
    if (fs.existsSync(configPath)) {
      const config = require('./config.js');
      
      if (config.databases && Array.isArray(config.databases)) {
        config.databases.forEach(async (dbConfig) => {
          try {
            // Check if connection already exists
            const existingConnection = await metricsDb.query(
              'SELECT * FROM database_connections WHERE host = $1 AND port = $2 AND database = $3',
              [dbConfig.host, dbConfig.port || 5432, dbConfig.database]
            );
            
            if (existingConnection.rows.length === 0) {
              // Add to database
              const result = await metricsDb.query(
                `INSERT INTO database_connections 
                (name, host, port, database, username, password, ssl) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) 
                RETURNING id`,
                [
                  dbConfig.name, 
                  dbConfig.host, 
                  dbConfig.port || 5432, 
                  dbConfig.database, 
                  dbConfig.user, 
                  dbConfig.password, 
                  dbConfig.ssl || false
                ]
              );
              
              const connectionId = result.rows[0].id;
              await createDatabaseConnection({
                id: connectionId,
                ...dbConfig,
                username: dbConfig.user,
                port: dbConfig.port || 5432,
                ssl: dbConfig.ssl || false
              });
              
              logger.info(`Added connection from config.js: ${dbConfig.name}`);
            }
          } catch (error) {
            logger.error(`Error adding connection from config.js: ${dbConfig.name}`, error);
          }
        });
      }
    }
  } catch (error) {
    logger.error('Error loading config.js:', error);
  }
}

// Create a database connection
async function createDatabaseConnection(connectionInfo) {
  try {
    const connectionConfig = {
      user: connectionInfo.username,
      host: connectionInfo.host,
      database: connectionInfo.database,
      password: connectionInfo.password,
      port: connectionInfo.port,
      ssl: connectionInfo.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    };
    
    const pool = new Pool(connectionConfig);
    
    // Test connection
    await pool.query('SELECT 1');
    
    databaseConnections.set(connectionInfo.id, {
      pool,
      info: connectionInfo
    });
    
    // Update last_connected_at time
    await metricsDb.query(
      'UPDATE database_connections SET last_connected_at = NOW() WHERE id = $1',
      [connectionInfo.id]
    );
    
    logger.info(`Connected to database: ${connectionInfo.name} (${connectionInfo.host}:${connectionInfo.port}/${connectionInfo.database})`);
    return true;
  } catch (error) {
    logger.error(`Error connecting to database: ${connectionInfo.name}`, error);
    return false;
  }
}

// Function to collect metrics from all connected databases
async function collectAllMetrics() {
  for (const [connectionId, connection] of databaseConnections.entries()) {
    try {
      await collectPgVersion(connectionId, connection);
      await collectSessionMetrics(connectionId, connection);
      await collectWaitEvents(connectionId, connection);
      await collectLockInfo(connectionId, connection);
      await collectTempUsage(connectionId, connection);
      await collectQueryStats(connectionId, connection);
      
      logger.info(`Collected all metrics for connection ID: ${connectionId}`);
    } catch (error) {
      logger.error(`Error collecting metrics for connection ID: ${connectionId}`, error);
    }
  }
}

// Function to collect PostgreSQL version
async function collectPgVersion(connectionId, connection) {
  try {
    const result = await connection.pool.query('SELECT version()');
    const versionStr = result.rows[0].version;
    
    await metricsDb.query(
      'INSERT INTO pg_version (connection_id, version) VALUES ($1, $2)',
      [connectionId, versionStr]
    );
    
    logger.info(`PostgreSQL version collected for connection ID: ${connectionId}`);
    return versionStr;
  } catch (error) {
    logger.error(`Error collecting PostgreSQL version for connection ID: ${connectionId}`, error);
    return null;
  }
}

// Function to collect session metrics
async function collectSessionMetrics(connectionId, connection) {
  try {
    // This query uses pg_stat_activity to get session information
    const result = await connection.pool.query(`
      SELECT 
        pid,
        usename AS username,
        application_name,
        datname AS database_name,
        client_addr,
        backend_start,
        query_start,
        state,
        CASE
          WHEN state = 'active' THEN 100.0 / (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active')
          ELSE 0
        END AS cpu_usage_estimate
      FROM 
        pg_stat_activity 
      WHERE 
        pid <> pg_backend_pid()
    `);
    
    // Insert collected metrics into metrics database
    for (const row of result.rows) {
      await metricsDb.query(`
        INSERT INTO session_metrics 
        (connection_id, pid, username, application_name, database_name, client_addr, backend_start, query_start, state, cpu_usage)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        connectionId,
        row.pid, 
        row.username, 
        row.application_name, 
        row.database_name, 
        row.client_addr, 
        row.backend_start, 
        row.query_start, 
        row.state, 
        row.cpu_usage_estimate
      ]);
    }
    
    logger.info(`Collected metrics for ${result.rows.length} sessions for connection ID: ${connectionId}`);
    return result.rows;
  } catch (error) {
    logger.error(`Error collecting session metrics for connection ID: ${connectionId}`, error);
    return [];
  }
}

// Function to collect wait events
async function collectWaitEvents(connectionId, connection) {
  try {
    // This query uses pg_stat_activity and extensions like pg_wait_sampling if available
    // Note: pg_wait_sampling extension is required for detailed wait events
    const hasWaitSampling = await checkExtensionExists(connectionId, connection, 'pg_wait_sampling');
    
    let result;
    if (hasWaitSampling) {
      result = await connection.pool.query(`
        SELECT 
          pid,
          wait_event_type,
          wait_event,
          EXTRACT(EPOCH FROM (now() - state_change)) AS wait_time
        FROM 
          pg_stat_activity
        WHERE 
          wait_event IS NOT NULL
          AND pid <> pg_backend_pid()
        UNION ALL
        SELECT
          pid,
          wait_event_type,
          wait_event,
          EXTRACT(EPOCH FROM (now() - timestamp)) AS wait_time
        FROM
          pg_wait_sampling_current
      `);
    } else {
      result = await connection.pool.query(`
        SELECT 
          pid,
          wait_event_type,
          wait_event,
          EXTRACT(EPOCH FROM (now() - state_change)) AS wait_time
        FROM 
          pg_stat_activity
        WHERE 
          wait_event IS NOT NULL
          AND pid <> pg_backend_pid()
      `);
    }
    
    // Insert collected wait events into metrics database
    for (const row of result.rows) {
      await metricsDb.query(`
        INSERT INTO wait_events 
        (connection_id, pid, wait_event_type, wait_event, wait_time)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        connectionId,
        row.pid, 
        row.wait_event_type, 
        row.wait_event, 
        row.wait_time
      ]);
    }
    
    logger.info(`Collected ${result.rows.length} wait events for connection ID: ${connectionId}`);
    return result.rows;
  } catch (error) {
    logger.error(`Error collecting wait events for connection ID: ${connectionId}`, error);
    return [];
  }
}

// Function to collect lock information
async function collectLockInfo(connectionId, connection) {
  try {
    // This query uses pg_locks to get locking information
    const result = await connection.pool.query(`
      WITH blocking_pids AS (
        SELECT ARRAY_AGG(blocked_locks.pid) AS blocked_pids, 
               blocking_locks.pid AS blocking_pid
        FROM pg_catalog.pg_locks AS blocked_locks
        JOIN pg_catalog.pg_locks AS blocking_locks ON (
          blocked_locks.locktype = blocking_locks.locktype
          AND blocked_locks.database IS NOT DISTINCT FROM blocking_locks.database
          AND blocked_locks.relation IS NOT DISTINCT FROM blocking_locks.relation
          AND blocked_locks.page IS NOT DISTINCT FROM blocking_locks.page
          AND blocked_locks.tuple IS NOT DISTINCT FROM blocking_locks.tuple
          AND blocked_locks.virtualxid IS NOT DISTINCT FROM blocking_locks.virtualxid
          AND blocked_locks.transactionid IS NOT DISTINCT FROM blocking_locks.transactionid
          AND blocked_locks.classid IS NOT DISTINCT FROM blocking_locks.classid
          AND blocked_locks.objid IS NOT DISTINCT FROM blocking_locks.objid
          AND blocked_locks.objsubid IS NOT DISTINCT FROM blocking_locks.objsubid
          AND blocked_locks.pid != blocking_locks.pid
        )
        WHERE NOT blocked_locks.granted
        AND blocking_locks.granted
        GROUP BY blocking_locks.pid
      )
      SELECT 
        l.pid,
        l.locktype,
        CASE 
          WHEN l.relation IS NOT NULL THEN (
            SELECT relname FROM pg_class WHERE oid = l.relation
          )
          ELSE NULL
        END AS relation,
        l.mode,
        l.granted,
        bp.blocked_pids
      FROM pg_locks l
      LEFT JOIN blocking_pids bp ON l.pid = bp.blocking_pid
      WHERE l.pid <> pg_backend_pid()
        AND (bp.blocked_pids IS NOT NULL OR l.granted = false)
      ORDER BY 
        l.pid
    `);
    
    // Insert collected lock information into metrics database
    for (const row of result.rows) {
      await metricsDb.query(`
        INSERT INTO lock_info 
        (connection_id, pid, locktype, relation, mode, granted, blocking_pids)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        connectionId,
        row.pid, 
        row.locktype, 
        row.relation, 
        row.mode, 
        row.granted, 
        row.blocked_pids || null
      ]);
    }
    
    logger.info(`Collected lock information for ${result.rows.length} locks for connection ID: ${connectionId}`);
    return result.rows;
  } catch (error) {
    logger.error(`Error collecting lock information for connection ID: ${connectionId}`, error);
    return [];
  }
}

// Function to collect temporary space usage
async function collectTempUsage(connectionId, connection) {
  try {
    // This query uses pg_stat_activity and pg_stat_statements to get temp usage
    const hasStatStatements = await checkExtensionExists(connectionId, connection, 'pg_stat_statements');
    
    let result;
    if (hasStatStatements) {
      result = await connection.pool.query(`
        WITH temp_files_by_backend AS (
          SELECT
            backend_xid,
            backend_xmin,
            SUM(size) AS temp_bytes
          FROM
            pg_temp_files
          GROUP BY
            backend_xid, backend_xmin
        )
        SELECT
          a.pid,
          a.usename AS username,
          a.datname AS database_name,
          COALESCE(t.temp_bytes, 0) AS temp_bytes,
          CASE
            WHEN a.query ~* 'group by' THEN 'GROUP BY'
            WHEN a.query ~* 'order by' THEN 'ORDER BY'
            WHEN a.query ~* 'join' THEN 'JOIN'
            WHEN a.query ~* 'distinct' THEN 'DISTINCT'
            ELSE 'OTHER'
          END AS query_type
        FROM
          pg_stat_activity a
        LEFT JOIN
          temp_files_by_backend t ON (a.backend_xid = t.backend_xid OR a.backend_xmin = t.backend_xmin)
        WHERE
          a.pid <> pg_backend_pid()
          AND (t.temp_bytes IS NOT NULL OR a.state = 'active')
        ORDER BY
          temp_bytes DESC
      `);
    } else {
      // Fallback query without pg_stat_statements
      result = await connection.pool.query(`
        WITH temp_files_by_backend AS (
          SELECT
            backend_xid,
            backend_xmin,
            SUM(size) AS temp_bytes
          FROM
            pg_temp_files
          GROUP BY
            backend_xid, backend_xmin
        )
        SELECT
          a.pid,
          a.usename AS username,
          a.datname AS database_name,
          COALESCE(t.temp_bytes, 0) AS temp_bytes,
          'UNKNOWN' AS query_type
        FROM
          pg_stat_activity a
        LEFT JOIN
          temp_files_by_backend t ON (a.backend_xid = t.backend_xid OR a.backend_xmin = t.backend_xmin)
        WHERE
          a.pid <> pg_backend_pid()
          AND (t.temp_bytes IS NOT NULL OR a.state = 'active')
        ORDER BY
          temp_bytes DESC
      `);
    }
    
    // Insert collected temp usage into metrics database
    for (const row of result.rows) {
      await metricsDb.query(`
        INSERT INTO temp_usage 
        (connection_id, pid, username, database_name, temp_bytes, query_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        connectionId,
        row.pid, 
        row.username, 
        row.database_name, 
        row.temp_bytes, 
        row.query_type
      ]);
    }
    
    logger.info(`Collected temporary space usage for ${result.rows.length} sessions for connection ID: ${connectionId}`);
    return result.rows;
  } catch (error) {
    logger.error(`Error collecting temporary space usage for connection ID: ${connectionId}`, error);
    return [];
  }
}

// Function to collect query statistics
async function collectQueryStats(connectionId, connection) {
  try {
    // Check if pg_stat_statements extension is available
    const hasStatStatements = await checkExtensionExists(connectionId, connection, 'pg_stat_statements');
    
    if (!hasStatStatements) {
      logger.warn(`pg_stat_statements extension not available for connection ID: ${connectionId}, skipping query stats collection`);
      return [];
    }
    
    // This query uses pg_stat_statements to get query statistics
    const result = await connection.pool.query(`
      SELECT
        queryid AS query_id,
        query,
        calls,
        total_exec_time AS total_time,
        min_exec_time AS min_time,
        max_exec_time AS max_time,
        mean_exec_time AS mean_time,
        rows
      FROM
        pg_stat_statements
      ORDER BY
        total_exec_time DESC
      LIMIT 100
    `);
    
    // Insert collected query stats into metrics database
    for (const row of result.rows) {
      await metricsDb.query(`
        INSERT INTO query_stats 
        (connection_id, query_id, query, calls, total_time, min_time, max_time, mean_time, rows)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        connectionId,
        row.query_id,
        row.query,
        row.calls,
        row.total_time,
        row.min_time,
        row.max_time,
        row.mean_time,
        row.rows
      ]);
    }
    
    logger.info(`Collected statistics for ${result.rows.length} queries for connection ID: ${connectionId}`);
    return result.rows;
  } catch (error) {
    logger.error(`Error collecting query statistics for connection ID: ${connectionId}`, error);
    return [];
  }
}

// Helper function to check if an extension exists
async function checkExtensionExists(connectionId, connection, extensionName) {
  try {
    const result = await connection.pool.query(`
      SELECT 1 
      FROM pg_extension 
      WHERE extname = $1
    `, [extensionName]);
    
    return result.rows.length > 0;
  } catch (error) {
    logger.error(`Error checking for extension ${extensionName} for connection ID: ${connectionId}`, error);
    return false;
  }
}

// API Routes

// Get all database connections
app.get('/api/connections', async (req, res) => {
    try {
      const result = await metricsDb.query(`
        SELECT id, name, host, port, database, username, ssl, 
               created_at, last_connected_at 
        FROM database_connections
        ORDER BY name
      `);
      
      // Actually test each connection instead of returning static status
      const connections = await Promise.all(result.rows.map(async (conn) => {
        let isConnected = false;
        
        try {
          // Create a temporary connection for testing
          const testPool = new Pool({
            user: conn.username,
            host: conn.host,
            database: conn.database,
            password: conn.password, // You'll need to decrypt this if stored encrypted
            port: conn.port,
            ssl: conn.ssl ? { rejectUnauthorized: false } : false,
            connectionTimeoutMillis: 3000 // Short timeout for testing
          });
          
          // Simple query to test connection
          await testPool.query('SELECT 1');
          isConnected = true;
          
          // Close test connection
          await testPool.end();
        } catch (error) {
          logger.error(`Connection test failed for ${conn.name}:`, error);
          isConnected = false;
        }
        
        return {
          ...conn,
          password: undefined,
          status: isConnected ? 'Connected' : 'Disconnected'
        };
      }));
      
      res.json(connections);
    } catch (error) {
      logger.error('Error getting database connections:', error);
      res.status(500).json({ error: 'Error getting database connections' });
    }
  });

// Add a new database connection
app.post('/api/connections', async (req, res) => {
  try {
    const { name, host, port, database, username, password, ssl } = req.body;
    
    // Validate required fields
    if (!name || !host || !database || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Test connection before saving
    const testConnection = await createDatabaseConnection({
      id: 0, // Temporary ID for testing
      name,
      host,
      port: port || 5432,
      database,
      username,
      password,
      ssl: ssl || false
    });
    
    if (!testConnection) {
      return res.status(400).json({ error: 'Failed to connect to database' });
    }
    
    // Save connection to database
    const result = await metricsDb.query(
      `INSERT INTO database_connections 
      (name, host, port, database, username, password, ssl, last_connected_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
      RETURNING id, name, host, port, database, username, ssl, created_at, last_connected_at`,
      [name, host, port || 5432, database, username, password, ssl || false]
    );
    
    const connectionId = result.rows[0].id;
    
    // Create actual connection with real ID
    await createDatabaseConnection({
      id: connectionId,
      name,
      host,
      port: port || 5432,
      database,
      username,
      password,
      ssl: ssl || false
    });
    
    // Remove sensitive information
    const newConnection = {
      ...result.rows[0],
      password: undefined
    };
    
    res.status(201).json(newConnection);
  } catch (error) {
    logger.error('Error adding database connection:', error);
    res.status(500).json({ error: 'Error adding database connection' });
  }
});


// Update an existing database connection
app.put('/api/connections/:id', async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    const { name, host, port, database, username, password, ssl } = req.body;
    
    // Validate required fields
    if (!name || !host || !database || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if connection exists
    const checkResult = await metricsDb.query(
      'SELECT id, password FROM database_connections WHERE id = $1',
      [connectionId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Use existing password if the password field is empty
    const currentPassword = checkResult.rows[0].password;
    const updatedPassword = password.trim() === '' ? currentPassword : password;
    
    // Update connection in database
    const result = await metricsDb.query(
      `UPDATE database_connections 
       SET name = $1, host = $2, port = $3, database = $4, 
           username = $5, password = $6, ssl = $7
       WHERE id = $8
       RETURNING id, name, host, port, database, username, ssl, created_at, last_connected_at`,
      [name, host, port || 5432, database, username, updatedPassword, ssl || false, connectionId]
    );
    
    // Close existing pool connection if it exists
    if (databaseConnections.has(connectionId)) {
      const connection = databaseConnections.get(connectionId);
      await connection.pool.end();
      databaseConnections.delete(connectionId);
    }
    
    // Create a new connection with updated details
    await createDatabaseConnection({
      id: connectionId,
      name,
      host,
      port: port || 5432,
      database,
      username,
      password: updatedPassword,
      ssl: ssl || false
    });
    
    // Remove sensitive information
    const updatedConnection = {
      ...result.rows[0],
      password: undefined
    };
    
    res.json(updatedConnection);
  } catch (error) {
    logger.error('Error updating database connection:', error);
    res.status(500).json({ error: 'Error updating database connection' });
  }
});

// Improved connection deletion endpoint with transaction
app.delete('/api/connections/:id', async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    // Check if connection exists
    const checkResult = await metricsDb.query(
      'SELECT id FROM database_connections WHERE id = $1',
      [connectionId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Close pool if it exists
    if (databaseConnections.has(connectionId)) {
      const connection = databaseConnections.get(connectionId);
      await connection.pool.end();
      databaseConnections.delete(connectionId);
    }
    
    // Delete the connection - with CASCADE constraints in place, this should delete all dependent records
    await metricsDb.query('DELETE FROM database_connections WHERE id = $1', [connectionId]);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error removing database connection:', error);
    res.status(500).json({ error: 'Error removing database connection' });
  }
});

// Test a database connection
app.post('/api/connections/test', async (req, res) => {
  try {
    const { host, port, database, username, password, ssl } = req.body;
    
    // Validate required fields
    if (!host || !database || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create test connection
    const pool = new Pool({
      user: username,
      host,
      database,
      password,
      port: port || 5432,
      ssl: ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    });
    
    // Test connection
    await pool.query('SELECT 1');
    
    // Close pool
    await pool.end();
    
    res.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    logger.error('Connection test failed:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Connection failed', 
      error: error.message 
    });
  }
});

// Get PostgreSQL version for a specific connection
app.get('/api/connections/:id/version', async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    if (!databaseConnections.has(connectionId)) {
      return res.status(404).json({ error: 'Connection not found or not active' });
    }
    
    const result = await metricsDb.query(`
      SELECT version 
      FROM pg_version 
      WHERE connection_id = $1
      ORDER BY collected_at DESC 
      LIMIT 1
    `, [connectionId]);
    
    if (result.rows.length > 0) {
      res.json({ version: result.rows[0].version });
    } else {
      // If no version in DB, collect it now
      const connection = databaseConnections.get(connectionId);
      const version = await collectPgVersion(connectionId, connection);
      res.json({ version });
    }
  } catch (error) {
    logger.error('Error getting PostgreSQL version:', error);
    res.status(500).json({ error: 'Error getting PostgreSQL version' });
  }
});

// Get all PostgreSQL versions
app.get('/api/version', async (req, res) => {
  try {
    const result = await metricsDb.query(`
      SELECT DISTINCT ON (connection_id) 
        connection_id, version, collected_at
      FROM pg_version
      ORDER BY connection_id, collected_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting PostgreSQL versions:', error);
    res.status(500).json({ error: 'Error getting PostgreSQL versions' });
  }
});

// Get active sessions for a specific connection
app.get('/api/connections/:id/sessions', async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    const result = await metricsDb.query(`
      SELECT * 
      FROM session_metrics 
      WHERE connection_id = $1 AND collected_at > NOW() - INTERVAL '5 minutes'
      ORDER BY cpu_usage DESC
    `, [connectionId]);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting active sessions:', error);
    res.status(500).json({ error: 'Error getting active sessions' });
  }
});

// Get active sessions for all connections
app.get('/api/sessions', async (req, res) => {
  try {
    const result = await metricsDb.query(`
      SELECT s.*, c.name as connection_name, c.host as connection_host
      FROM session_metrics s
      JOIN database_connections c ON s.connection_id = c.id
      WHERE s.collected_at > NOW() - INTERVAL '5 minutes'
      ORDER BY s.cpu_usage DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting active sessions:', error);
    res.status(500).json({ error: 'Error getting active sessions' });
  }
});

// Get top resource-consuming sessions
app.get('/api/sessions/top', async (req, res) => {
  try {
    const result = await metricsDb.query(`
      SELECT s.pid, s.username, s.application_name, s.database_name, s.cpu_usage, 
             s.collected_at, c.name as connection_name, c.host as connection_host
      FROM session_metrics s
      JOIN database_connections c ON s.connection_id = c.id
      WHERE s.collected_at > NOW() - INTERVAL '5 minutes'
      ORDER BY s.cpu_usage DESC
      LIMIT 10
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting top sessions:', error);
    res.status(500).json({ error: 'Error getting top sessions' });
  }
});

// Get wait events for a specific connection
app.get('/api/connections/:id/waits', async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    const result = await metricsDb.query(`
      SELECT wait_event_type, wait_event, COUNT(*) as count, 
             AVG(wait_time) as avg_wait_time, SUM(wait_time) as total_wait_time
      FROM wait_events
      WHERE connection_id = $1 AND collected_at > NOW() - INTERVAL '5 minutes'
      GROUP BY wait_event_type, wait_event
      ORDER BY total_wait_time DESC
    `, [connectionId]);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting wait events:', error);
    res.status(500).json({ error: 'Error getting wait events' });
  }
});

// Get wait events for all connections
app.get('/api/waits', async (req, res) => {
  try {
    const result = await metricsDb.query(`
      SELECT w.wait_event_type, w.wait_event, COUNT(*) as count, 
             AVG(w.wait_time) as avg_wait_time, SUM(w.wait_time) as total_wait_time,
             c.name as connection_name, c.host as connection_host
      FROM wait_events w
      JOIN database_connections c ON w.connection_id = c.id
      WHERE w.collected_at > NOW() - INTERVAL '5 minutes'
      GROUP BY w.wait_event_type, w.wait_event, c.name, c.host
      ORDER BY total_wait_time DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting wait events:', error);
    res.status(500).json({ error: 'Error getting wait events' });
  }
});

// Get blocking sessions hierarchy for a specific connection
app.get('/api/connections/:id/locks/blocking', async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    const result = await metricsDb.query(`
      WITH RECURSIVE blockers AS (
        -- Find all blocking PIDs
        SELECT DISTINCT 
          l.pid AS blocking_pid,
          NULL::INTEGER AS blocked_pid,
          0 AS level
        FROM lock_info l
        WHERE l.connection_id = $1 
        AND l.blocking_pids IS NOT NULL
        AND l.collected_at > NOW() - INTERVAL '5 minutes'
        
        UNION ALL
        
        -- Find all blocked PIDs
        SELECT 
          b.blocking_pid,
          unnest.blocked_pid,
          b.level + 1
        FROM blockers b
        JOIN LATERAL unnest(
          (SELECT l.blocking_pids 
           FROM lock_info l 
           WHERE l.connection_id = $1
           AND l.pid = b.blocking_pid 
           ORDER BY l.collected_at DESC 
           LIMIT 1)
        ) AS unnest(blocked_pid) ON true
      )
      -- Get information about the hierarchy
      SELECT 
        b.blocking_pid,
        b.blocked_pid,
        b.level,
        s_blocker.username AS blocker_username,
        s_blocker.application_name AS blocker_application,
        s_blocked.username AS blocked_username,
        s_blocked.application_name AS blocked_application,
        l.locktype,
        l.relation,
        l.mode
      FROM blockers b
      LEFT JOIN (
        SELECT DISTINCT ON (pid) * 
        FROM session_metrics 
        WHERE connection_id = $1
        ORDER BY pid, collected_at DESC
      ) s_blocker ON b.blocking_pid = s_blocker.pid
      LEFT JOIN (
        SELECT DISTINCT ON (pid) * 
        FROM session_metrics 
        WHERE connection_id = $1
        ORDER BY pid, collected_at DESC
      ) s_blocked ON b.blocked_pid = s_blocked.pid
      LEFT JOIN (
        SELECT DISTINCT ON (pid) * 
        FROM lock_info 
        WHERE connection_id = $1
        ORDER BY pid, collected_at DESC
      ) l ON b.blocking_pid = l.pid
      ORDER BY b.level, b.blocking_pid
    `, [connectionId]);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting blocking sessions hierarchy:', error);
    res.status(500).json({ error: 'Error getting blocking sessions hierarchy' });
  }
});

// Get blocking sessions hierarchy for all connections
app.get('/api/locks/blocking', async (req, res) => {
  try {
    const result = await metricsDb.query(`
      WITH RECURSIVE blockers AS (
        -- Find all blocking PIDs
        SELECT DISTINCT 
          l.connection_id,
          l.pid AS blocking_pid,
          NULL::INTEGER AS blocked_pid,
          0 AS level
        FROM lock_info l
        WHERE l.blocking_pids IS NOT NULL
        AND l.collected_at > NOW() - INTERVAL '5 minutes'
        
        UNION ALL
        
        -- Find all blocked PIDs
        SELECT 
          b.connection_id,
          b.blocking_pid,
          unnest.blocked_pid,
          b.level + 1
        FROM blockers b
        JOIN LATERAL unnest(
          (SELECT l.blocking_pids 
           FROM lock_info l 
           WHERE l.connection_id = b.connection_id
           AND l.pid = b.blocking_pid 
           ORDER BY l.collected_at DESC 
           LIMIT 1)
        ) AS unnest(blocked_pid) ON true
      )
      -- Get information about the hierarchy
      SELECT 
        c.name as connection_name,
        c.host as connection_host,
        b.blocking_pid,
        b.blocked_pid,
        b.level,
        s_blocker.username AS blocker_username,
        s_blocker.application_name AS blocker_application,
        s_blocked.username AS blocked_username,
        s_blocked.application_name AS blocked_application,
        l.locktype,
        l.relation,
        l.mode
      FROM blockers b
      JOIN database_connections c ON b.connection_id = c.id
      LEFT JOIN (
        SELECT DISTINCT ON (connection_id, pid) connection_id, pid, username, application_name
        FROM session_metrics 
        ORDER BY connection_id, pid, collected_at DESC
      ) s_blocker ON b.connection_id = s_blocker.connection_id AND b.blocking_pid = s_blocker.pid
      LEFT JOIN (
        SELECT DISTINCT ON (connection_id, pid) connection_id, pid, username, application_name
        FROM session_metrics 
        ORDER BY connection_id, pid, collected_at DESC
      ) s_blocked ON b.connection_id = s_blocked.connection_id AND b.blocked_pid = s_blocked.pid
      LEFT JOIN (
        SELECT DISTINCT ON (connection_id, pid) connection_id, pid, locktype, relation, mode
        FROM lock_info 
        ORDER BY connection_id, pid, collected_at DESC
      ) l ON b.connection_id = l.connection_id AND b.blocking_pid = l.pid
      ORDER BY c.name, b.level, b.blocking_pid
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting blocking sessions hierarchy:', error);
    res.status(500).json({ error: 'Error getting blocking sessions hierarchy' });
  }
});

// Get temporary space usage for a specific connection
app.get('/api/connections/:id/temp/usage', async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    const result = await metricsDb.query(`
      SELECT * 
      FROM temp_usage
      WHERE connection_id = $1 AND collected_at > NOW() - INTERVAL '5 minutes'
      ORDER BY temp_bytes DESC
    `, [connectionId]);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting temporary space usage:', error);
    res.status(500).json({ error: 'Error getting temporary space usage' });
  }
});

// Get temporary space usage for all connections
app.get('/api/temp/usage', async (req, res) => {
  try {
    const result = await metricsDb.query(`
      SELECT t.*, c.name as connection_name, c.host as connection_host
      FROM temp_usage t
      JOIN database_connections c ON t.connection_id = c.id
      WHERE t.collected_at > NOW() - INTERVAL '5 minutes'
      ORDER BY t.temp_bytes DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting temporary space usage:', error);
    res.status(500).json({ error: 'Error getting temporary space usage' });
  }
});

// Get total temporary space usage over time for a specific connection
app.get('/api/connections/:id/temp/timeline', async (req, res) => {
  const connectionId = parseInt(req.params.id);
  const { hours } = req.query;
  const timeRange = hours ? parseInt(hours) : 1;
  
  try {
    const result = await metricsDb.query(`
      SELECT 
        date_trunc('minute', collected_at) AS time,
        SUM(temp_bytes) AS total_bytes
      FROM temp_usage
      WHERE connection_id = $1 AND collected_at > NOW() - INTERVAL '${timeRange} hours'
      GROUP BY time
      ORDER BY time
    `, [connectionId]);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting temporary space timeline:', error);
    res.status(500).json({ error: 'Error getting temporary space timeline' });
  }
});

// Get total temporary space usage over time for all connections
app.get('/api/temp/timeline', async (req, res) => {
  const { hours } = req.query;
  const timeRange = hours ? parseInt(hours) : 1;
  
  try {
    const result = await metricsDb.query(`
      SELECT 
        c.name as connection_name,
        c.host as connection_host,
        date_trunc('minute', t.collected_at) AS time,
        SUM(t.temp_bytes) AS total_bytes
      FROM temp_usage t
      JOIN database_connections c ON t.connection_id = c.id
      WHERE t.collected_at > NOW() - INTERVAL '${timeRange} hours'
      GROUP BY c.name, c.host, time
      ORDER BY c.name, time
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting temporary space timeline:', error);
    res.status(500).json({ error: 'Error getting temporary space timeline' });
  }
});

// Get query statistics for a specific connection
app.get('/api/connections/:id/queries/stats', async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    const result = await metricsDb.query(`
      SELECT DISTINCT ON (query_id)
        query_id, query, calls, total_time, mean_time, rows
      FROM query_stats
      WHERE connection_id = $1
      ORDER BY query_id, collected_at DESC
      LIMIT 50
    `, [connectionId]);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting query statistics:', error);
    res.status(500).json({ error: 'Error getting query statistics' });
  }
});

// Get query statistics for all connections
app.get('/api/queries/stats', async (req, res) => {
  try {
    const result = await metricsDb.query(`
      SELECT DISTINCT ON (q.connection_id, q.query_id)
        q.connection_id, q.query_id, q.query, q.calls, q.total_time, q.mean_time, q.rows,
        c.name as connection_name, c.host as connection_host
      FROM query_stats q
      JOIN database_connections c ON q.connection_id = c.id
      ORDER BY q.connection_id, q.query_id, q.collected_at DESC
      LIMIT 50
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting query statistics:', error);
    res.status(500).json({ error: 'Error getting query statistics' });
  }
});

// Get available PostgreSQL extensions for a specific connection
app.get('/api/connections/:id/extensions', async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    if (!databaseConnections.has(connectionId)) {
      return res.status(404).json({ error: 'Connection not found or not active' });
    }
    
    const connection = databaseConnections.get(connectionId);
    
    const result = await connection.pool.query(`
      SELECT 
        e.extname AS name, 
        e.extversion AS version, 
        n.nspname AS schema, 
        c.description
      FROM 
        pg_extension e
        JOIN pg_namespace n ON n.oid = e.extnamespace
        LEFT JOIN pg_description c ON c.objoid = e.oid
      ORDER BY 
        e.extname
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting PostgreSQL extensions:', error);
    res.status(500).json({ error: 'Error getting PostgreSQL extensions' });
  }
});

// Get extensions for all connections
app.get('/api/extensions', async (req, res) => {
  try {
    const extensions = [];
    
    for (const [connectionId, connection] of databaseConnections.entries()) {
      try {
        const result = await connection.pool.query(`
          SELECT 
            e.extname AS name, 
            e.extversion AS version, 
            n.nspname AS schema, 
            c.description
          FROM 
            pg_extension e
            JOIN pg_namespace n ON n.oid = e.extnamespace
            LEFT JOIN pg_description c ON c.objoid = e.oid
          ORDER BY 
            e.extname
        `);
        
        extensions.push({
          connection_id: connectionId,
          connection_name: connection.info.name,
          connection_host: connection.info.host,
          extensions: result.rows
        });
      } catch (error) {
        logger.error(`Error getting extensions for connection ID: ${connectionId}`, error);
      }
    }
    
    res.json(extensions);
  } catch (error) {
    logger.error('Error getting extensions:', error);
    res.status(500).json({ error: 'Error getting extensions' });
  }
});

// Force refresh of metrics for a specific connection
app.post('/api/connections/:id/refresh', async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    
    if (!databaseConnections.has(connectionId)) {
      return res.status(404).json({ error: 'Connection not found or not active' });
    }
    
    const connection = databaseConnections.get(connectionId);
    
    await collectPgVersion(connectionId, connection);
    await collectSessionMetrics(connectionId, connection);
    await collectWaitEvents(connectionId, connection);
    await collectLockInfo(connectionId, connection);
    await collectTempUsage(connectionId, connection);
    await collectQueryStats(connectionId, connection);
    
    res.json({ success: true, message: 'Metrics refreshed successfully' });
  } catch (error) {
    logger.error('Error refreshing metrics:', error);
    res.status(500).json({ error: 'Error refreshing metrics' });
  }
});

// Force refresh of all metrics
app.post('/api/refresh', async (req, res) => {
  try {
    await collectAllMetrics();
    res.json({ success: true, message: 'All metrics refreshed successfully' });
  } catch (error) {
    logger.error('Error refreshing metrics:', error);
    res.status(500).json({ error: 'Error refreshing metrics' });
  }
});

// Historical data endpoints for a specific connection
app.get('/api/connections/:id/history/sessions', async (req, res) => {
  const connectionId = parseInt(req.params.id);
  const { hours, limit } = req.query;
  const timeRange = hours ? parseInt(hours) : 24;
  const rowLimit = limit ? parseInt(limit) : 1000;
  
  try {
    const result = await metricsDb.query(`
      SELECT 
        pid, username, application_name, database_name, cpu_usage, collected_at
      FROM 
        session_metrics
      WHERE 
        connection_id = $1 AND collected_at > NOW() - INTERVAL '${timeRange} hours'
      ORDER BY 
        collected_at DESC, cpu_usage DESC
      LIMIT $2
    `, [connectionId, rowLimit]);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting historical session data:', error);
    res.status(500).json({ error: 'Error getting historical session data' });
  }
});

// Historical data endpoints for all connections
app.get('/api/history/sessions', async (req, res) => {
  const { hours, limit } = req.query;
  const timeRange = hours ? parseInt(hours) : 24;
  const rowLimit = limit ? parseInt(limit) : 1000;
  
  try {
    const result = await metricsDb.query(`
      SELECT 
        s.pid, s.username, s.application_name, s.database_name, s.cpu_usage, s.collected_at,
        c.name as connection_name, c.host as connection_host
      FROM 
        session_metrics s
      JOIN 
        database_connections c ON s.connection_id = c.id
      WHERE 
        s.collected_at > NOW() - INTERVAL '${timeRange} hours'
      ORDER BY 
        s.collected_at DESC, s.cpu_usage DESC
      LIMIT $1
    `, [rowLimit]);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting historical session data:', error);
    res.status(500).json({ error: 'Error getting historical session data' });
  }
});

// Start the server
async function startServer() {
  try {
    // Initialize metrics database
    await initializeMetricsDb();
    
    // Load connections from config file
    loadConnectionsFromConfig();
    
    // Schedule metrics collection (every minute)
    cron.schedule('* * * * *', collectAllMetrics);
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`PostgreSQL Monitoring API server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close all database connections
  for (const connection of databaseConnections.values()) {
    await connection.pool.end();
  }
  
  if (metricsDb) {
    await metricsDb.end();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Close all database connections
  for (const connection of databaseConnections.values()) {
    await connection.pool.end();
  }
  
  if (metricsDb) {
    await metricsDb.end();
  }
  
  process.exit(0);
});

// Start the server
startServer();