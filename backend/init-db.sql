-- Initialize PostgreSQL Monitor application database

-- Create tables for database connections
CREATE TABLE database_connections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 5432,
    database_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password TEXT NOT NULL, -- Will store encrypted passwords
    ssl BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_connected_at TIMESTAMP WITH TIME ZONE
);

-- Create tables for storing metrics
CREATE TABLE connection_metrics (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES database_connections(id) ON DELETE CASCADE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    db_version TEXT,
    connection_count INTEGER,
    metrics_json JSONB -- Stores all other metrics as JSON for flexibility
);

-- Create table for table size metrics
CREATE TABLE table_size_metrics (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES database_connections(id) ON DELETE CASCADE,
    database_name TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for wait event metrics
CREATE TABLE wait_event_metrics (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES database_connections(id) ON DELETE CASCADE,
    wait_event_type TEXT NOT NULL,
    wait_event TEXT NOT NULL,
    count INTEGER NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_conn_metrics_connection_id ON connection_metrics(connection_id);
CREATE INDEX idx_conn_metrics_collected_at ON connection_metrics(collected_at);
CREATE INDEX idx_table_size_connection_id ON table_size_metrics(connection_id);
CREATE INDEX idx_table_size_collected_at ON table_size_metrics(collected_at);
CREATE INDEX idx_wait_event_connection_id ON wait_event_metrics(connection_id);
CREATE INDEX idx_wait_event_collected_at ON wait_event_metrics(collected_at);
