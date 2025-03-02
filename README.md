# PostgreSQL Monitoring Dashboard

A comprehensive monitoring solution for PostgreSQL databases that provides real-time and historical insights into database performance, resource usage, and health.

## Features

- **Real-time Dashboard**: Monitor active sessions, resource usage, and performance metrics
- **Session Analysis**: Track which sessions are consuming the most CPU, memory, and I/O
- **Wait Event Monitoring**: Identify which wait events are causing performance bottlenecks
- **Blocking Session Visualization**: Visualize blocking session hierarchies with detailed information
- **Temporary Space Tracking**: Monitor temp space usage by session and query type
- **PostgreSQL Extension Support**: Leverage pg_stat_statements, pg_buffercache, and more
- **Historical Data Analysis**: Track performance trends over time
- **Multi-version Support**: Compatible with PostgreSQL versions 10 through 15
- **Dark Mode**: Optimized UI for day and night usage
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

The monitoring solution consists of multiple components:

1. **Frontend Dashboard**: HTML5/CSS/JavaScript web interface
2. **Backend API**: Node.js/Express service that collects and provides metrics
3. **Metrics Storage**: PostgreSQL database for historical data storage

## Prerequisites

- Docker Engine 20.10.0 or higher
- 4GB+ RAM available for containers
- Modern web browser with JavaScript enabled

## Quick Start

1. Clone this repository:
   ```
   git clone https://github.com/danutsoare/postgres-monitoring.git
   cd postgres-monitoring
   ```

2. Start the monitoring stack with Docker Compose:
   ```
   docker-compose up -d
   ```

3. Access the dashboard:
   - Dashboard UI: http://localhost
   - Adminer (metrics database administration): http://localhost:8080

## Configuration

### Environment Variables

The following environment variables can be set in the docker-compose.yml file:

- For the metrics storage database:
  - `METRICS_PG_USER`: PostgreSQL username (default: postgres)
  - `METRICS_PG_PASSWORD`: PostgreSQL password (default: postgres)
  - `METRICS_PG_DATABASE`: PostgreSQL database name (default: postgres_metrics)

- For the backend API:
  - `PORT`: API port (default: 3000)
  - `NODE_ENV`: Node.js environment (default: production)

### Dashboard Settings

The dashboard includes a settings panel accessible through the user menu, where you can configure:

- Auto-refresh interval
- Dark mode
- Data retention period
- Metrics collection settings
- Alert thresholds
- Database connections

## PostgreSQL Extensions

This monitoring solution leverages the following PostgreSQL extensions:

- **pg_stat_statements**: For query performance analysis
- **pg_buffercache**: To examine shared buffer usage
- **pg_stat_bgwriter**: For background writer statistics
- **pg_wait_sampling**: For detailed wait event analysis
- **pg_stat_monitor**: For enhanced query monitoring
- **pgstattuple**: For tuple-level statistics
- **pg_visibility**: For visibility map examination

## Development

### Project Structure

```
postgres-monitoring/
├── docker-compose.yml          # Main Docker Compose configuration
├── backend/                    # Backend API service
│   ├── Dockerfile              # Backend container configuration
│   ├── package.json            # Node.js dependencies
│   ├── server.js               # Main backend application
│   ├── config.js               # Optional configuration for external database connections
│   └── logs/                   # Log files directory
├── frontend/                   # Frontend web application
│   ├── Dockerfile              # Frontend container configuration
│   ├── index.html              # Main dashboard HTML
│   ├── css/                    # CSS stylesheets
│   │   └── style.css           # Main CSS styles
│   ├── js/                     # JavaScript files
│   │   ├── dashboard.js        # Dashboard functionality
│   │   ├── charts.js           # Chart rendering code
│   │   └── api.js              # API communication
│   └── img/                    # Images and icons
└── README.md                   # Project documentation
```

### Running for Development

For development purposes, you can run the frontend and backend separately:

1. Start the metrics storage database:
   ```
   docker-compose up -d postgres_metrics
   ```

2. Run the backend in development mode:
   ```
   cd backend
   npm install
   npm run dev
   ```

3. Serve the frontend using a local HTTP server:
   ```
   cd frontend
   # Using Python's simple HTTP server
   python -m http.server 8000
   # Or use any other HTTP server of your choice
   ```

4. Access the dashboard at http://localhost:8000

## Connecting to External PostgreSQL Databases

### Adding a New Database Connection

You can add and monitor multiple PostgreSQL databases through the dashboard interface:

1. Click on the user icon in the top right corner and select "Settings"
2. Navigate to the "Connections" tab
3. Click "Add Connection" to open the new connection form
4. Fill in the following details:
   - **Name**: A friendly name for this connection (e.g., "Production Database")
   - **Host**: The hostname or IP address of your PostgreSQL server
   - **Port**: The port number (default: 5432)
   - **Database**: The database name to monitor
   - **Username**: A user with sufficient privileges to read monitoring data
   - **Password**: The user's password
   - **Connection Options**: Any additional connection parameters
5. Click "Test Connection" to verify connectivity
6. Click "Save" to add the connection

### Required Database User Permissions

The database user needs the following permissions:

```sql
-- Create a dedicated monitoring user
CREATE ROLE pg_monitor_user WITH LOGIN PASSWORD 'your_secure_password';

-- Grant necessary permissions
GRANT pg_monitor TO pg_monitor_user;
GRANT CONNECT ON DATABASE your_database TO pg_monitor_user;
GRANT USAGE ON SCHEMA public TO pg_monitor_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO pg_monitor_user;
GRANT SELECT ON pg_stat_activity TO pg_monitor_user;
GRANT SELECT ON pg_stat_statements TO pg_monitor_user;
GRANT SELECT ON pg_locks TO pg_monitor_user;
```

### Recommended PostgreSQL Extensions

For optimal monitoring, install these extensions on your database:

```sql
CREATE EXTENSION pg_stat_statements;
CREATE EXTENSION pg_buffercache;
CREATE EXTENSION pgstattuple;
```

Add the following to your `postgresql.conf` file:

```
# Required for advanced monitoring
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
track_io_timing = on
track_activity_query_size = 4096
```

### Monitoring External Databases via Direct Configuration

For advanced users who prefer direct configuration instead of using the UI:

1. Edit the `backend/config.js` file (create it if it doesn't exist):

```javascript
// backend/config.js
module.exports = {
  databases: [
    {
      name: "Production DB",
      host: "your-postgres-host.example.com",
      port: 5432,
      database: "your_database",
      user: "pg_monitor_user",
      password: "your_secure_password",
      ssl: true, // Set to true for SSL connections
      connectionTimeoutMillis: 3000
    },
    // Add more databases as needed
  ]
};
```

2. Mount this file in the docker-compose.yml:

```yaml
services:
  monitor_api:
    # ... other settings ...
    volumes:
      - ./backend/config.js:/app/config.js
```

3. Restart the backend service:
```
docker-compose restart monitor_api
```

## Troubleshooting

### Common Issues

- **Dashboard shows no data**: Check if the backend API is running and can connect to your PostgreSQL databases
- **Extensions not available**: Some extensions require installation in your PostgreSQL instance
- **High memory usage**: Adjust the metrics collection interval in settings
- **Slow performance**: Consider reducing the data retention period
- **Connection failures**: Check network connectivity and credentials for your PostgreSQL databases

### Logs

- Backend logs: `docker-compose logs -f monitor_api`
- Metrics storage logs: `docker-compose logs -f postgres_metrics`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- ApexCharts.js for visualization
- Bootstrap for UI components
- FontAwesome for icons
- The PostgreSQL community for developing amazing extensions