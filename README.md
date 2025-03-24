# PostgreSQL Monitor

A simple web-based application for monitoring PostgreSQL databases.

## Features

- **Connection Management**: Add, edit, test, and delete PostgreSQL database connections
- **Security**: Encrypted storage of database credentials
- **Real-time Monitoring**: View current database metrics
- **Historical Data**: Track metrics over time
- **Dashboard Visualization**: View metrics with interactive charts

## Metrics Monitored

- PostgreSQL version
- Database connection count
- Table sizes
- Wait events

## Technical Stack

- **Frontend**: Pure HTML, CSS, and JavaScript with Chart.js for visualization
- **Backend**: Node.js with Express
- **Database**: PostgreSQL for storing connections and metrics
- **Security**: CryptoJS for password encryption
- **Containerization**: Docker and Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your system
- Basic knowledge of PostgreSQL

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/postgres-monitor.git
   cd postgres-monitor
   ```

2. Start the application with Docker Compose:
   ```
   docker-compose up -d
   ```

3. Access the application:
   ```
   http://localhost
   ```

### Configuration

No additional configuration is required. The application is ready to use after installation.

## Usage

### Managing Connections

1. Navigate to the "Connections" page
2. Click "Add New Connection" to add a PostgreSQL database connection
3. Fill in the connection details:
   - Connection Name: A friendly name for the connection
   - Host: The hostname or IP address of the PostgreSQL server
   - Port: The port number (default: 5432)
   - Database Name: The name of the database
   - Username: Database username
   - Password: Database password
   - SSL: Enable SSL for secure connections
4. Click "Test Connection" to verify the connection works
5. Click "Save Connection" to save the connection details

### Viewing Metrics

1. Navigate to the "Dashboard" page
2. Select a connection from the dropdown
3. Click "Load Metrics" to view existing metrics
4. Click "Collect New Metrics" to gather fresh metrics from the database
5. View the metrics displayed in tables and charts
6. Change the historical view range to see trends over different time periods

## Database Schema

The application uses the following database schema:

### database_connections

Stores information about PostgreSQL database connections.

| Column           | Type      | Description                        |
|------------------|-----------|------------------------------------|
| id               | SERIAL    | Primary key                        |
| name             | VARCHAR   | Friendly name for the connection   |
| host             | VARCHAR   | Hostname or IP address             |
| port             | INTEGER   | Port number (default 5432)         |
| database_name    | VARCHAR   | Database name                      |
| username         | VARCHAR   | Database username                  |
| password         | TEXT      | Encrypted database password        |
| ssl              | BOOLEAN   | Whether to use SSL                 |
| created_at       | TIMESTAMP | Creation timestamp                 |
| last_connected_at| TIMESTAMP | Last successful connection         |

### connection_metrics

Stores general metrics about the database.

| Column           | Type      | Description                        |
|------------------|-----------|------------------------------------|
| id               | SERIAL    | Primary key                        |
| connection_id    | INTEGER   | Reference to database_connections  |
| collected_at     | TIMESTAMP | Collection timestamp               |
| db_version       | TEXT      | PostgreSQL version                 |
| connection_count | INTEGER   | Number of active connections       |
| metrics_json     | JSONB     | Additional metrics as JSON         |

### table_size_metrics

Stores information about table sizes.

| Column           | Type      | Description                        |
|------------------|-----------|------------------------------------|
| id               | SERIAL    | Primary key                        |
| connection_id    | INTEGER   | Reference to database_connections  |
| database_name    | TEXT      | Database name                      |
| schema_name      | TEXT      | Schema name                        |
| table_name       | TEXT      | Table name                         |
| size_bytes       | BIGINT    | Table size in bytes                |
| collected_at     | TIMESTAMP | Collection timestamp               |

### wait_event_metrics

Stores information about database wait events.

| Column           | Type      | Description                        |
|------------------|-----------|------------------------------------|
| id               | SERIAL    | Primary key                        |
| connection_id    | INTEGER   | Reference to database_connections  |
| wait_event_type  | TEXT      | Type of wait event                 |
| wait_event       | TEXT      | Wait event name                    |
| count            | INTEGER   | Count of wait events               |
| collected_at     | TIMESTAMP | Collection timestamp               |

## Security Considerations

- Database passwords are encrypted before storing in the database
- The encryption key is set via the ENCRYPTION_KEY environment variable
- Change this key in production deployments
- SSL connections to PostgreSQL databases are supported

## Future Enhancements

- **Query Analysis**: Monitor query performance and resource usage
- **Alerting**: Set up alerts for specific conditions
- **More Metrics**: Add additional PostgreSQL metrics
- **User Authentication**: Add user login and role-based access
- **Multiple Database Types**: Extend support to other database systems

## License

This project is licensed under the MIT License - see the LICENSE file for details.
