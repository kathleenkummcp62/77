/*
  # Add indexes to improve query performance

  1. New Indexes
    - Add indexes to frequently queried columns
    - Add unique indexes where appropriate
    - Add composite indexes for common query patterns

  2. Changes
    - Add index to credentials.ip for faster lookups
    - Add index to tasks.vpn_type for filtering
    - Add index to logs.timestamp for time-based queries
    - Add index to scan_results.status for filtering
    - Add composite index on servers (ip, status) for common queries
*/

-- Add index to credentials.ip for faster lookups
CREATE INDEX IF NOT EXISTS idx_credentials_ip ON credentials(ip);

-- Add index to tasks.vpn_type for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_vpn_type ON tasks(vpn_type);

-- Add index to logs.timestamp for time-based queries
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);

-- Add index to scan_results.status for filtering
CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status);

-- Add composite index on servers (ip, status) for common queries
CREATE INDEX IF NOT EXISTS idx_servers_ip_status ON servers(ip, status);

-- Add index to vendor_urls.url for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_urls_url ON vendor_urls(url);

-- Add index to proxies.address for faster lookups
CREATE INDEX IF NOT EXISTS idx_proxies_address ON proxies(address);

-- Add index to tasks.server for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_server ON tasks(server);

-- Add index to tasks.status for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Add index to logs.level for filtering
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);

-- Add index to logs.source for filtering
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);