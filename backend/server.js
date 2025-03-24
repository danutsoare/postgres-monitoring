const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const CryptoJS = require('crypto-js');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_encryption_key';

// Set up logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Connect to application database
const dbPool = new Pool({
  user: process.env.DB_USER || 'pgmonitor',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pgmonitor_app',
  password: process.env.DB_PASSWORD || 'pgmonitor_secret',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
dbPool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection error:', err);
  } else {
    logger.info('Database connected successfully');
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Helper functions for encryption
function encryptPassword(password) {
  return CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
}

function decryptPassword(encryptedPassword) {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// API Routes

// Get all database connections (without passwords)
app.get('/api/connections', async (req, res) => {
  try {
    const result = await dbPool.query(`
      SELECT id, name, host, port, database_name, username, ssl, 
             created_at, last_connected_at 
      FROM database_connections
      ORDER BY name
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting connections:', error);
    res.status(500).json({ error: 'Failed to retrieve connections' });
  }
});

// Add a new connection
app.post('/api/connections', async (req, res) => {
  try {
    const { name, host, port, database_name, username, password, ssl } = req.body;
    
    // Validate required fields
    if (!name || !host || !database_name || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Encrypt the password
    const encryptedPassword = encryptPassword(password);
    
    const result = await dbPool.query(`
      INSERT INTO database_connections 
      (name, host, port, database_name, username, password, ssl) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, name, host, port, database_name, username, ssl, created_at
    `, [name, host, port || 5432, database_name, username, encryptedPassword, ssl || false]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error adding connection:', error);
    res.status(500).json({ error: 'Failed to add connection' });
  }
});

// Update a connection
app.put('/api/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, host, port, database_name, username, password, ssl } = req.body;
    
    // Validate required fields
    if (!name || !host || !database_name || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if connection exists
    const checkResult = await dbPool.query('SELECT * FROM database_connections WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Handle password update (if provided)
    let passwordClause = '';
    let values = [name, host, port || 5432, database_name, username, ssl || false, id];
    
    if (password) {
      // Encrypt the new password
      const encryptedPassword = encryptPassword(password);
      passwordClause = ', password = $8';
      values.push(encryptedPassword);
    }
    
    const result = await dbPool.query(`
      UPDATE database_connections 
      SET name = $1, host = $2, port = $3, database_name = $4, 
          username = $5, ssl = $6${passwordClause}
      WHERE id = $7
      RETURNING id, name, host, port, database_name, username, ssl, created_at, last_connected_at
    `, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating connection:', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

// Delete a connection
app.delete('/api/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if connection exists
    const checkResult = await dbPool.query('SELECT * FROM database_connections WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    await dbPool.query('DELETE FROM database_connections WHERE id = $1', [id]);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting connection:', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

// Test a connection
app.post('/api/connections/test', async (req, res) => {
  try {
    const { id, host, port, database_name, username, password, ssl } = req.body;
    
    // If ID is provided, get connection info from database
    let connectionInfo = { host, port, database: database_name, user: username, password, ssl };
    
    if (id) {
      const result = await dbPool.query('SELECT * FROM database_connections WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      
      const conn = result.rows[0];
      connectionInfo = {
        host: conn.host,
        port: conn.port,
        database: conn.database_name,
        user: conn.username,
        password: decryptPassword(conn.password),
        ssl: conn.ssl
      };
    }
    
    // Test the connection
    const testPool = new Pool({
      host: connectionInfo.host,
      port: connectionInfo.port || 5432,
      database: connectionInfo.database,
      user: connectionInfo.user,
      password: connectionInfo.password,
      ssl: connectionInfo.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000, // 5 second timeout
    });
    
    try {
      // Query for PostgreSQL version
      const versionResult = await testPool.query('SELECT version()');
      const version = versionResult.rows[0].version;
      
      // Update last_connected_at if id is provided
      if (id) {
        await dbPool.query('UPDATE database_connections SET last_connected_at = NOW() WHERE id = $1', [id]);
      }
      
      res.json({ 
        success: true, 
        version,
        message: 'Connection successful' 
      });
    } finally {
      // Always close the test connection
      await testPool.end();
    }
  } catch (error) {
    logger.error('Connection test failed:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Connection failed', 
      error: error.message 
    });
  }
});

// Get metrics for a connection
app.get('/api/connections/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if connection exists
    const checkResult = await dbPool.query('SELECT * FROM database_connections WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Get the latest metrics
    const metricsResult = await dbPool.query(`
      SELECT * FROM connection_metrics 
      WHERE connection_id = $1 
      ORDER BY collected_at DESC 
      LIMIT 1
    `, [id]);
    
    // Get table size metrics
    const tableSizeResult = await dbPool.query(`
      SELECT database_name, schema_name, table_name, size_bytes 
      FROM table_size_metrics 
      WHERE connection_id = $1 
      ORDER BY size_bytes DESC 
      LIMIT 10
    `, [id]);
    
    // Get wait event metrics
    const waitEventResult = await dbPool.query(`
      SELECT wait_event_type, wait_event, count 
      FROM wait_event_metrics 
      WHERE connection_id = $1 
      ORDER BY count DESC 
      LIMIT 10
    `, [id]);
    
    res.json({
      connection_metrics: metricsResult.rows[0] || null,
      table_sizes: tableSizeResult.rows,
      wait_events: waitEventResult.rows
    });
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// Collect metrics for a connection
app.post('/api/connections/:id/collect', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if connection exists
    const connResult = await dbPool.query('SELECT * FROM database_connections WHERE id = $1', [id]);
    if (connResult.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    const conn = connResult.rows[0];
    const connectionInfo = {
      host: conn.host,
      port: conn.port,
      database: conn.database_name,
      user: conn.username,
      password: decryptPassword(conn.password),
      ssl: conn.ssl
    };
    
    // Connect to the target database
    const targetPool = new Pool({
      host: connectionInfo.host,
      port: connectionInfo.port,
      database: connectionInfo.database,
      user: connectionInfo.user,
      password: connectionInfo.password,
      ssl: connectionInfo.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000, // 10 second timeout
    });
    
    try {
      // Collect basic metrics
      const versionResult = await targetPool.query('SELECT version()');
      const version = versionResult.rows[0].version;
      
      // Get connection count
      const connectionCountResult = await targetPool.query('SELECT count(*) FROM pg_stat_activity');
      const connectionCount = parseInt(connectionCountResult.rows[0].count);
      
      // Store basic metrics
      const metricsResult = await dbPool.query(`
        INSERT INTO connection_metrics (connection_id, db_version, connection_count, metrics_json)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [id, version, connectionCount, {}]);
      
      // Collect table size metrics
      try {
        const tableSizeResult = await targetPool.query(`
          SELECT 
            current_database() as database_name,
            schemaname as schema_name, 
            tablename as table_name,
            pg_total_relation_size(schemaname || '.' || tablename) as size_bytes
          FROM pg_tables
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
          ORDER BY size_bytes DESC
          LIMIT 20
        `);
        
        // Store table size metrics
        for (const table of tableSizeResult.rows) {
          await dbPool.query(`
            INSERT INTO table_size_metrics 
            (connection_id, database_name, schema_name, table_name, size_bytes)
            VALUES ($1, $2, $3, $4, $5)
          `, [id, table.database_name, table.schema_name, table.table_name, table.size_bytes]);
        }
      } catch (error) {
        logger.error('Error collecting table size metrics:', error);
      }
      
      // Collect wait event metrics
      try {
        const waitEventResult = await targetPool.query(`
          SELECT wait_event_type, wait_event, COUNT(*) as count
          FROM pg_stat_activity
          WHERE wait_event IS NOT NULL
          GROUP BY wait_event_type, wait_event
          ORDER BY count DESC
          LIMIT 20
        `);
        
        // Store wait event metrics
        for (const event of waitEventResult.rows) {
          await dbPool.query(`
            INSERT INTO wait_event_metrics 
            (connection_id, wait_event_type, wait_event, count)
            VALUES ($1, $2, $3, $4)
          `, [id, event.wait_event_type, event.wait_event, event.count]);
        }
      } catch (error) {
        logger.error('Error collecting wait event metrics:', error);
      }
      
      // Update last_connected_at
      await dbPool.query('UPDATE database_connections SET last_connected_at = NOW() WHERE id = $1', [id]);
      
      res.json({ 
        success: true, 
        message: 'Metrics collected successfully',
        metrics_id: metricsResult.rows[0].id
      });
    } finally {
      // Always close the target connection
      await targetPool.end();
    }
  } catch (error) {
    logger.error('Error collecting metrics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to collect metrics', 
      error: error.message 
    });
  }
});

// Get historical metrics
app.get('/api/connections/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { hours } = req.query;
    const timeLimit = parseInt(hours) || 24; // Default to 24 hours
    
    // Check if connection exists
    const checkResult = await dbPool.query('SELECT * FROM database_connections WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Get historical connection count metrics
    const connectionCountResult = await dbPool.query(`
      SELECT collected_at, connection_count 
      FROM connection_metrics 
      WHERE connection_id = $1 
        AND collected_at > NOW() - interval '${timeLimit} hours' 
      ORDER BY collected_at
    `, [id]);
    
    // Get historical table size totals
    const tableSizeTotalResult = await dbPool.query(`
      SELECT 
        date_trunc('hour', collected_at) as hour,
        SUM(size_bytes) as total_size_bytes
      FROM table_size_metrics 
      WHERE connection_id = $1 
        AND collected_at > NOW() - interval '${timeLimit} hours'
      GROUP BY hour
      ORDER BY hour
    `, [id]);
    
    // Get historical wait event totals
    const waitEventTotalResult = await dbPool.query(`
      SELECT 
        date_trunc('hour', collected_at) as hour,
        wait_event_type,
        SUM(count) as total_count
      FROM wait_event_metrics 
      WHERE connection_id = $1 
        AND collected_at > NOW() - interval '${timeLimit} hours'
      GROUP BY hour, wait_event_type
      ORDER BY hour, total_count DESC
    `, [id]);
    
    res.json({
      connection_counts: connectionCountResult.rows,
      table_size_totals: tableSizeTotalResult.rows,
      wait_event_totals: waitEventTotalResult.rows
    });
  } catch (error) {
    logger.error('Error getting historical metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve historical metrics' });
  }
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
