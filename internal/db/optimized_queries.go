package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// QueryWithPagination executes a query with pagination
func (d *DB) QueryWithPagination(query string, page, pageSize int, args ...interface{}) (*sql.Rows, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Count total rows
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM (%s) AS count_query", query)
	var total int
	err := d.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count query error: %w", err)
	}

	// Add pagination
	offset := (page - 1) * pageSize
	paginatedQuery := fmt.Sprintf("%s LIMIT %d OFFSET %d", query, pageSize, offset)

	// Execute paginated query
	rows, err := d.QueryContext(ctx, paginatedQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("paginated query error: %w", err)
	}

	return rows, total, nil
}

// GetCredentialsWithPagination retrieves credentials with pagination
func (d *DB) GetCredentialsWithPagination(page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `SELECT id, ip, username, password FROM credentials`
	rows, total, err := d.QueryWithPagination(query, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var credentials []map[string]interface{}
	for rows.Next() {
		var id int
		var ip, username, password string
		if err := rows.Scan(&id, &ip, &username, &password); err != nil {
			return nil, 0, err
		}

		// Decrypt sensitive data
		decryptedIP, _ := decryptString(ip)
		decryptedUsername, _ := decryptString(username)
		decryptedPassword, _ := decryptString(password)

		credentials = append(credentials, map[string]interface{}{
			"id":       id,
			"ip":       decryptedIP,
			"username": decryptedUsername,
			"password": decryptedPassword,
		})
	}

	return credentials, total, nil
}

// GetProxiesWithPagination retrieves proxies with pagination
func (d *DB) GetProxiesWithPagination(page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `SELECT id, address, username, password FROM proxies`
	rows, total, err := d.QueryWithPagination(query, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var proxies []map[string]interface{}
	for rows.Next() {
		var id int
		var address, username, password string
		if err := rows.Scan(&id, &address, &username, &password); err != nil {
			return nil, 0, err
		}

		// Decrypt sensitive data
		decryptedAddress, _ := decryptString(address)
		decryptedUsername, _ := decryptString(username)
		decryptedPassword, _ := decryptString(password)

		proxies = append(proxies, map[string]interface{}{
			"id":       id,
			"address":  decryptedAddress,
			"username": decryptedUsername,
			"password": decryptedPassword,
		})
	}

	return proxies, total, nil
}

// GetTasksWithPagination retrieves tasks with pagination
func (d *DB) GetTasksWithPagination(page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	var query string
	if d.UseVendorTasks {
		query = `
			SELECT t.id, t.vpn_type, t.vendor_url_id, COALESCE(v.url, ''), t.server, COALESCE(t.status, '')
			FROM tasks t
			LEFT JOIN vendor_urls v ON v.id = t.vendor_url_id
		`
	} else {
		query = `SELECT id, vendor, url, login, password, proxy FROM tasks`
	}

	rows, total, err := d.QueryWithPagination(query, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	if d.UseVendorTasks {
		for rows.Next() {
			var (
				id       int
				vpnType  sql.NullString
				vendorID sql.NullInt64
				url      sql.NullString
				server   sql.NullString
				status   sql.NullString
			)
			if err := rows.Scan(&id, &vpnType, &vendorID, &url, &server, &status); err != nil {
				continue
			}
			tasks = append(tasks, map[string]interface{}{
				"id":            id,
				"vpn_type":      vpnType.String,
				"vendor_url_id": vendorID.Int64,
				"url":           url.String,
				"server":        server.String,
				"status":        status.String,
			})
		}
	} else {
		for rows.Next() {
			var id int
			var vendor, url, login, password, proxy sql.NullString
			if err := rows.Scan(&id, &vendor, &url, &login, &password, &proxy); err != nil {
				continue
			}
			tasks = append(tasks, map[string]interface{}{
				"id":       id,
				"vendor":   vendor.String,
				"url":      url.String,
				"login":    login.String,
				"password": password.String,
				"proxy":    proxy.String,
			})
		}
	}

	return tasks, total, nil
}

// GetLogsWithPagination retrieves logs with pagination
func (d *DB) GetLogsWithPagination(page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `SELECT timestamp, level, message, source FROM logs ORDER BY timestamp DESC`
	rows, total, err := d.QueryWithPagination(query, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []map[string]interface{}
	for rows.Next() {
		var ts time.Time
		var level, msg, src string
		if err := rows.Scan(&ts, &level, &msg, &src); err != nil {
			continue
		}
		logs = append(logs, map[string]interface{}{
			"timestamp": ts.Format(time.RFC3339),
			"level":     level,
			"message":   msg,
			"source":    src,
		})
	}

	return logs, total, nil
}

// GetVendorURLsWithPagination retrieves vendor URLs with pagination
func (d *DB) GetVendorURLsWithPagination(page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `SELECT id, url FROM vendor_urls`
	rows, total, err := d.QueryWithPagination(query, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var vendorURLs []map[string]interface{}
	for rows.Next() {
		var id int
		var url string
		if err := rows.Scan(&id, &url); err != nil {
			continue
		}
		vendorURLs = append(vendorURLs, map[string]interface{}{
			"id":  id,
			"url": url,
		})
	}

	return vendorURLs, total, nil
}

// GetScheduledTasksWithPagination retrieves scheduled tasks with pagination
func (d *DB) GetScheduledTasksWithPagination(page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `SELECT id, title, description, task_type, vpn_type, scheduled_at, repeat, servers, active, executed, created_at FROM scheduled_tasks`
	rows, total, err := d.QueryWithPagination(query, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var (
			id          int
			title       string
			description sql.NullString
			taskType    string
			vpnType     sql.NullString
			scheduledAt time.Time
			repeat      string
			servers     sql.NullString
			active      sql.NullBool
			executed    sql.NullBool
			createdAt   time.Time
		)
		if err := rows.Scan(&id, &title, &description, &taskType, &vpnType, &scheduledAt, &repeat, &servers, &active, &executed, &createdAt); err != nil {
			continue
		}
		tasks = append(tasks, map[string]interface{}{
			"id":                id,
			"title":             title,
			"description":       description.String,
			"taskType":          taskType,
			"vpnType":           vpnType.String,
			"scheduledDateTime": scheduledAt.Format(time.RFC3339),
			"repeat":            repeat,
			"servers":           strings.Split(servers.String, ","),
			"active":            active.Bool,
			"executed":          executed.Bool,
			"createdAt":         createdAt.Format(time.RFC3339),
		})
	}

	return tasks, total, nil
}

// GetServerStatsWithPagination retrieves server stats with pagination
func (d *DB) GetServerStatsWithPagination(page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `SELECT ip, status, cpu_usage, memory_usage, disk_usage, current_task FROM servers`
	rows, total, err := d.QueryWithPagination(query, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var servers []map[string]interface{}
	for rows.Next() {
		var ip, status, task string
		var cpu, mem, disk float64
		if err := rows.Scan(&ip, &status, &cpu, &mem, &disk, &task); err != nil {
			continue
		}
		servers = append(servers, map[string]interface{}{
			"ip":     ip,
			"status": status,
			"uptime": "-",
			"cpu":    int(cpu + 0.5),
			"memory": int(mem + 0.5),
			"disk":   int(disk + 0.5),
			"task":   task,
		})
	}

	return servers, total, nil
}

// GetCredentialsByVPNType retrieves credentials filtered by VPN type
func (d *DB) GetCredentialsByVPNType(vpnType string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT c.id, c.ip, c.username, c.password 
		FROM credentials c
		JOIN tasks t ON c.id = t.credential_id
		WHERE t.vpn_type = $1
	`
	rows, total, err := d.QueryWithPagination(query, page, pageSize, vpnType)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var credentials []map[string]interface{}
	for rows.Next() {
		var id int
		var ip, username, password string
		if err := rows.Scan(&id, &ip, &username, &password); err != nil {
			continue
		}

		// Decrypt sensitive data
		decryptedIP, _ := decryptString(ip)
		decryptedUsername, _ := decryptString(username)
		decryptedPassword, _ := decryptString(password)

		credentials = append(credentials, map[string]interface{}{
			"id":       id,
			"ip":       decryptedIP,
			"username": decryptedUsername,
			"password": decryptedPassword,
		})
	}

	return credentials, total, nil
}

// GetTasksByStatus retrieves tasks filtered by status
func (d *DB) GetTasksByStatus(status string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	var query string
	if d.UseVendorTasks {
		query = `
			SELECT t.id, t.vpn_type, t.vendor_url_id, COALESCE(v.url, ''), t.server, COALESCE(t.status, '')
			FROM tasks t
			LEFT JOIN vendor_urls v ON v.id = t.vendor_url_id
			WHERE t.status = $1
		`
	} else {
		query = `
			SELECT id, vendor, url, login, password, proxy 
			FROM tasks 
			WHERE status = $1
		`
	}

	rows, total, err := d.QueryWithPagination(query, page, pageSize, status)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	if d.UseVendorTasks {
		for rows.Next() {
			var (
				id       int
				vpnType  sql.NullString
				vendorID sql.NullInt64
				url      sql.NullString
				server   sql.NullString
				status   sql.NullString
			)
			if err := rows.Scan(&id, &vpnType, &vendorID, &url, &server, &status); err != nil {
				continue
			}
			tasks = append(tasks, map[string]interface{}{
				"id":            id,
				"vpn_type":      vpnType.String,
				"vendor_url_id": vendorID.Int64,
				"url":           url.String,
				"server":        server.String,
				"status":        status.String,
			})
		}
	} else {
		for rows.Next() {
			var id int
			var vendor, url, login, password, proxy sql.NullString
			if err := rows.Scan(&id, &vendor, &url, &login, &password, &proxy); err != nil {
				continue
			}
			tasks = append(tasks, map[string]interface{}{
				"id":       id,
				"vendor":   vendor.String,
				"url":      url.String,
				"login":    login.String,
				"password": password.String,
				"proxy":    proxy.String,
			})
		}
	}

	return tasks, total, nil
}

// GetLogsByLevel retrieves logs filtered by level
func (d *DB) GetLogsByLevel(level string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT timestamp, level, message, source 
		FROM logs 
		WHERE level = $1
		ORDER BY timestamp DESC
	`
	rows, total, err := d.QueryWithPagination(query, page, pageSize, level)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []map[string]interface{}
	for rows.Next() {
		var ts time.Time
		var level, msg, src string
		if err := rows.Scan(&ts, &level, &msg, &src); err != nil {
			continue
		}
		logs = append(logs, map[string]interface{}{
			"timestamp": ts.Format(time.RFC3339),
			"level":     level,
			"message":   msg,
			"source":    src,
		})
	}

	return logs, total, nil
}

// GetLogsByTimeRange retrieves logs within a time range
func (d *DB) GetLogsByTimeRange(start, end time.Time, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT timestamp, level, message, source 
		FROM logs 
		WHERE timestamp BETWEEN $1 AND $2
		ORDER BY timestamp DESC
	`
	rows, total, err := d.QueryWithPagination(query, page, pageSize, start, end)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []map[string]interface{}
	for rows.Next() {
		var ts time.Time
		var level, msg, src string
		if err := rows.Scan(&ts, &level, &msg, &src); err != nil {
			continue
		}
		logs = append(logs, map[string]interface{}{
			"timestamp": ts.Format(time.RFC3339),
			"level":     level,
			"message":   msg,
			"source":    src,
		})
	}

	return logs, total, nil
}

// GetServersByStatus retrieves servers filtered by status
func (d *DB) GetServersByStatus(status string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT ip, status, cpu_usage, memory_usage, disk_usage, current_task 
		FROM servers 
		WHERE status = $1
	`
	rows, total, err := d.QueryWithPagination(query, page, pageSize, status)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var servers []map[string]interface{}
	for rows.Next() {
		var ip, status, task string
		var cpu, mem, disk float64
		if err := rows.Scan(&ip, &status, &cpu, &mem, &disk, &task); err != nil {
			continue
		}
		servers = append(servers, map[string]interface{}{
			"ip":     ip,
			"status": status,
			"uptime": "-",
			"cpu":    int(cpu + 0.5),
			"memory": int(mem + 0.5),
			"disk":   int(disk + 0.5),
			"task":   task,
		})
	}

	return servers, total, nil
}

// GetProxiesByType retrieves proxies filtered by type
func (d *DB) GetProxiesByType(proxyType string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT id, address, username, password 
		FROM proxies 
		WHERE type = $1
	`
	rows, total, err := d.QueryWithPagination(query, page, pageSize, proxyType)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var proxies []map[string]interface{}
	for rows.Next() {
		var id int
		var address, username, password string
		if err := rows.Scan(&id, &address, &username, &password); err != nil {
			continue
		}

		// Decrypt sensitive data
		decryptedAddress, _ := decryptString(address)
		decryptedUsername, _ := decryptString(username)
		decryptedPassword, _ := decryptString(password)

		proxies = append(proxies, map[string]interface{}{
			"id":       id,
			"address":  decryptedAddress,
			"username": decryptedUsername,
			"password": decryptedPassword,
		})
	}

	return proxies, total, nil
}

// GetTasksWithJoin retrieves tasks with joined vendor_urls
func (d *DB) GetTasksWithJoin(page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT t.id, t.vpn_type, t.vendor_url_id, v.url, t.server, t.status
		FROM tasks t
		JOIN vendor_urls v ON t.vendor_url_id = v.id
	`
	rows, total, err := d.QueryWithPagination(query, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var id int
		var vpnType string
		var vendorID int
		var url, server, status string
		if err := rows.Scan(&id, &vpnType, &vendorID, &url, &server, &status); err != nil {
			continue
		}
		tasks = append(tasks, map[string]interface{}{
			"id":            id,
			"vpn_type":      vpnType,
			"vendor_url_id": vendorID,
			"url":           url,
			"server":        server,
			"status":        status,
		})
	}

	return tasks, total, nil
}

// GetCredentialsWithSearch searches credentials by IP, username, or password
func (d *DB) GetCredentialsWithSearch(search string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT id, ip, username, password 
		FROM credentials 
		WHERE ip ILIKE $1 OR username ILIKE $1 OR password ILIKE $1
	`
	searchPattern := "%" + search + "%"
	rows, total, err := d.QueryWithPagination(query, page, pageSize, searchPattern)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var credentials []map[string]interface{}
	for rows.Next() {
		var id int
		var ip, username, password string
		if err := rows.Scan(&id, &ip, &username, &password); err != nil {
			continue
		}

		// Decrypt sensitive data
		decryptedIP, _ := decryptString(ip)
		decryptedUsername, _ := decryptString(username)
		decryptedPassword, _ := decryptString(password)

		credentials = append(credentials, map[string]interface{}{
			"id":       id,
			"ip":       decryptedIP,
			"username": decryptedUsername,
			"password": decryptedPassword,
		})
	}

	return credentials, total, nil
}

// GetLogsWithSearch searches logs by message or source
func (d *DB) GetLogsWithSearch(search string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT timestamp, level, message, source 
		FROM logs 
		WHERE message ILIKE $1 OR source ILIKE $1
		ORDER BY timestamp DESC
	`
	searchPattern := "%" + search + "%"
	rows, total, err := d.QueryWithPagination(query, page, pageSize, searchPattern)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []map[string]interface{}
	for rows.Next() {
		var ts time.Time
		var level, msg, src string
		if err := rows.Scan(&ts, &level, &msg, &src); err != nil {
			continue
		}
		logs = append(logs, map[string]interface{}{
			"timestamp": ts.Format(time.RFC3339),
			"level":     level,
			"message":   msg,
			"source":    src,
		})
	}

	return logs, total, nil
}

// GetTasksWithSearch searches tasks by vpn_type, server, or status
func (d *DB) GetTasksWithSearch(search string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	var query string
	if d.UseVendorTasks {
		query = `
			SELECT t.id, t.vpn_type, t.vendor_url_id, COALESCE(v.url, ''), t.server, COALESCE(t.status, '')
			FROM tasks t
			LEFT JOIN vendor_urls v ON v.id = t.vendor_url_id
			WHERE t.vpn_type ILIKE $1 OR t.server ILIKE $1 OR t.status ILIKE $1 OR v.url ILIKE $1
		`
	} else {
		query = `
			SELECT id, vendor, url, login, password, proxy 
			FROM tasks 
			WHERE vendor ILIKE $1 OR url ILIKE $1 OR login ILIKE $1 OR status ILIKE $1
		`
	}

	searchPattern := "%" + search + "%"
	rows, total, err := d.QueryWithPagination(query, page, pageSize, searchPattern)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	if d.UseVendorTasks {
		for rows.Next() {
			var (
				id       int
				vpnType  sql.NullString
				vendorID sql.NullInt64
				url      sql.NullString
				server   sql.NullString
				status   sql.NullString
			)
			if err := rows.Scan(&id, &vpnType, &vendorID, &url, &server, &status); err != nil {
				continue
			}
			tasks = append(tasks, map[string]interface{}{
				"id":            id,
				"vpn_type":      vpnType.String,
				"vendor_url_id": vendorID.Int64,
				"url":           url.String,
				"server":        server.String,
				"status":        status.String,
			})
		}
	} else {
		for rows.Next() {
			var id int
			var vendor, url, login, password, proxy sql.NullString
			if err := rows.Scan(&id, &vendor, &url, &login, &password, &proxy); err != nil {
				continue
			}
			tasks = append(tasks, map[string]interface{}{
				"id":       id,
				"vendor":   vendor.String,
				"url":      url.String,
				"login":    login.String,
				"password": password.String,
				"proxy":    proxy.String,
			})
		}
	}

	return tasks, total, nil
}

// GetServersBySearch searches servers by IP or current_task
func (d *DB) GetServersBySearch(search string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT ip, status, cpu_usage, memory_usage, disk_usage, current_task 
		FROM servers 
		WHERE ip ILIKE $1 OR current_task ILIKE $1
	`
	searchPattern := "%" + search + "%"
	rows, total, err := d.QueryWithPagination(query, page, pageSize, searchPattern)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var servers []map[string]interface{}
	for rows.Next() {
		var ip, status, task string
		var cpu, mem, disk float64
		if err := rows.Scan(&ip, &status, &cpu, &mem, &disk, &task); err != nil {
			continue
		}
		servers = append(servers, map[string]interface{}{
			"ip":     ip,
			"status": status,
			"uptime": "-",
			"cpu":    int(cpu + 0.5),
			"memory": int(mem + 0.5),
			"disk":   int(disk + 0.5),
			"task":   task,
		})
	}

	return servers, total, nil
}

// GetProxiesWithSearch searches proxies by address, username, or password
func (d *DB) GetProxiesWithSearch(search string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT id, address, username, password 
		FROM proxies 
		WHERE address ILIKE $1 OR username ILIKE $1
	`
	searchPattern := "%" + search + "%"
	rows, total, err := d.QueryWithPagination(query, page, pageSize, searchPattern)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var proxies []map[string]interface{}
	for rows.Next() {
		var id int
		var address, username, password string
		if err := rows.Scan(&id, &address, &username, &password); err != nil {
			continue
		}

		// Decrypt sensitive data
		decryptedAddress, _ := decryptString(address)
		decryptedUsername, _ := decryptString(username)
		decryptedPassword, _ := decryptString(password)

		proxies = append(proxies, map[string]interface{}{
			"id":       id,
			"address":  decryptedAddress,
			"username": decryptedUsername,
			"password": decryptedPassword,
		})
	}

	return proxies, total, nil
}

// GetVendorURLsWithSearch searches vendor_urls by URL
func (d *DB) GetVendorURLsWithSearch(search string, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT id, url 
		FROM vendor_urls 
		WHERE url ILIKE $1
	`
	searchPattern := "%" + search + "%"
	rows, total, err := d.QueryWithPagination(query, page, pageSize, searchPattern)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var vendorURLs []map[string]interface{}
	for rows.Next() {
		var id int
		var url string
		if err := rows.Scan(&id, &url); err != nil {
			continue
		}
		vendorURLs = append(vendorURLs, map[string]interface{}{
			"id":  id,
			"url": url,
		})
	}

	return vendorURLs, total, nil
}

// GetTasksWithFilters retrieves tasks with multiple filters
func (d *DB) GetTasksWithFilters(filters map[string]interface{}, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	// Build query with filters
	query := `
		SELECT t.id, t.vpn_type, t.vendor_url_id, COALESCE(v.url, ''), t.server, COALESCE(t.status, '')
		FROM tasks t
		LEFT JOIN vendor_urls v ON v.id = t.vendor_url_id
		WHERE 1=1
	`
	var args []interface{}
	argIndex := 1

	// Add filters
	for key, value := range filters {
		if value != nil && value != "" {
			query += fmt.Sprintf(" AND t.%s = $%d", key, argIndex)
			args = append(args, value)
			argIndex++
		}
	}

	// Add pagination
	rows, total, err := d.QueryWithPagination(query, page, pageSize, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var (
			id       int
			vpnType  sql.NullString
			vendorID sql.NullInt64
			url      sql.NullString
			server   sql.NullString
			status   sql.NullString
		)
		if err := rows.Scan(&id, &vpnType, &vendorID, &url, &server, &status); err != nil {
			continue
		}
		tasks = append(tasks, map[string]interface{}{
			"id":            id,
			"vpn_type":      vpnType.String,
			"vendor_url_id": vendorID.Int64,
			"url":           url.String,
			"server":        server.String,
			"status":        status.String,
		})
	}

	return tasks, total, nil
}

// GetLogsWithFilters retrieves logs with multiple filters
func (d *DB) GetLogsWithFilters(filters map[string]interface{}, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	// Build query with filters
	query := `
		SELECT timestamp, level, message, source 
		FROM logs 
		WHERE 1=1
	`
	var args []interface{}
	argIndex := 1

	// Add filters
	for key, value := range filters {
		if value != nil && value != "" {
			query += fmt.Sprintf(" AND %s = $%d", key, argIndex)
			args = append(args, value)
			argIndex++
		}
	}

	// Add order by
	query += " ORDER BY timestamp DESC"

	// Add pagination
	rows, total, err := d.QueryWithPagination(query, page, pageSize, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []map[string]interface{}
	for rows.Next() {
		var ts time.Time
		var level, msg, src string
		if err := rows.Scan(&ts, &level, &msg, &src); err != nil {
			continue
		}
		logs = append(logs, map[string]interface{}{
			"timestamp": ts.Format(time.RFC3339),
			"level":     level,
			"message":   msg,
			"source":    src,
		})
	}

	return logs, total, nil
}

// GetCredentialsWithFilters retrieves credentials with multiple filters
func (d *DB) GetCredentialsWithFilters(filters map[string]interface{}, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	// Build query with filters
	query := `
		SELECT id, ip, username, password 
		FROM credentials 
		WHERE 1=1
	`
	var args []interface{}
	argIndex := 1

	// Add filters
	for key, value := range filters {
		if value != nil && value != "" {
			query += fmt.Sprintf(" AND %s = $%d", key, argIndex)
			args = append(args, value)
			argIndex++
		}
	}

	// Add pagination
	rows, total, err := d.QueryWithPagination(query, page, pageSize, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var credentials []map[string]interface{}
	for rows.Next() {
		var id int
		var ip, username, password string
		if err := rows.Scan(&id, &ip, &username, &password); err != nil {
			continue
		}

		// Decrypt sensitive data
		decryptedIP, _ := decryptString(ip)
		decryptedUsername, _ := decryptString(username)
		decryptedPassword, _ := decryptString(password)

		credentials = append(credentials, map[string]interface{}{
			"id":       id,
			"ip":       decryptedIP,
			"username": decryptedUsername,
			"password": decryptedPassword,
		})
	}

	return credentials, total, nil
}

// GetProxiesWithFilters retrieves proxies with multiple filters
func (d *DB) GetProxiesWithFilters(filters map[string]interface{}, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	// Build query with filters
	query := `
		SELECT id, address, username, password 
		FROM proxies 
		WHERE 1=1
	`
	var args []interface{}
	argIndex := 1

	// Add filters
	for key, value := range filters {
		if value != nil && value != "" {
			query += fmt.Sprintf(" AND %s = $%d", key, argIndex)
			args = append(args, value)
			argIndex++
		}
	}

	// Add pagination
	rows, total, err := d.QueryWithPagination(query, page, pageSize, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var proxies []map[string]interface{}
	for rows.Next() {
		var id int
		var address, username, password string
		if err := rows.Scan(&id, &address, &username, &password); err != nil {
			continue
		}

		// Decrypt sensitive data
		decryptedAddress, _ := decryptString(address)
		decryptedUsername, _ := decryptString(username)
		decryptedPassword, _ := decryptString(password)

		proxies = append(proxies, map[string]interface{}{
			"id":       id,
			"address":  decryptedAddress,
			"username": decryptedUsername,
			"password": decryptedPassword,
		})
	}

	return proxies, total, nil
}

// GetServersByFilters retrieves servers with multiple filters
func (d *DB) GetServersByFilters(filters map[string]interface{}, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	// Build query with filters
	query := `
		SELECT ip, status, cpu_usage, memory_usage, disk_usage, current_task 
		FROM servers 
		WHERE 1=1
	`
	var args []interface{}
	argIndex := 1

	// Add filters
	for key, value := range filters {
		if value != nil && value != "" {
			query += fmt.Sprintf(" AND %s = $%d", key, argIndex)
			args = append(args, value)
			argIndex++
		}
	}

	// Add pagination
	rows, total, err := d.QueryWithPagination(query, page, pageSize, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var servers []map[string]interface{}
	for rows.Next() {
		var ip, status, task string
		var cpu, mem, disk float64
		if err := rows.Scan(&ip, &status, &cpu, &mem, &disk, &task); err != nil {
			continue
		}
		servers = append(servers, map[string]interface{}{
			"ip":     ip,
			"status": status,
			"uptime": "-",
			"cpu":    int(cpu + 0.5),
			"memory": int(mem + 0.5),
			"disk":   int(disk + 0.5),
			"task":   task,
		})
	}

	return servers, total, nil
}

// GetVendorURLsWithFilters retrieves vendor_urls with multiple filters
func (d *DB) GetVendorURLsWithFilters(filters map[string]interface{}, page, pageSize int) ([]map[string]interface{}, int, error) {
	if d == nil || d.DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	// Build query with filters
	query := `
		SELECT id, url 
		FROM vendor_urls 
		WHERE 1=1
	`
	var args []interface{}
	argIndex := 1

	// Add filters
	for key, value := range filters {
		if value != nil && value != "" {
			query += fmt.Sprintf(" AND %s = $%d", key, argIndex)
			args = append(args, value)
			argIndex++
		}
	}

	// Add pagination
	rows, total, err := d.QueryWithPagination(query, page, pageSize, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var vendorURLs []map[string]interface{}
	for rows.Next() {
		var id int
		var url string
		if err := rows.Scan(&id, &url); err != nil {
			continue
		}
		vendorURLs = append(vendorURLs, map[string]interface{}{
			"id":  id,
			"url": url,
		})
	}

	return vendorURLs, total, nil
}
