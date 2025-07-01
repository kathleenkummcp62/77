package db

// This file contains database schema initialization logic.

// InitSchema exposes the schema initialization logic for external callers.
func InitSchema(d *DB) error {
	return initSchema(d)
}

// initSchema creates all required tables if they do not exist.
func initSchema(d *DB) error {
	if d == nil {
		return nil
	}
	queries := []string{
		`CREATE TABLE IF NOT EXISTS vendor_urls (
                        id SERIAL PRIMARY KEY,
                        url TEXT NOT NULL
                )`,
		`CREATE TABLE IF NOT EXISTS workers (
                        id SERIAL PRIMARY KEY,
                        ip TEXT NOT NULL,
                        port INT NOT NULL,
                        username TEXT NOT NULL,
                        password TEXT NOT NULL
                )`,
		`CREATE TABLE IF NOT EXISTS credentials (
                        id SERIAL PRIMARY KEY,
                        ip TEXT NOT NULL,
                        username TEXT NOT NULL,
                        password TEXT NOT NULL
                )`,
		`CREATE TABLE IF NOT EXISTS proxies (
                        id SERIAL PRIMARY KEY,
                        address TEXT NOT NULL,
                        username TEXT,
                        password TEXT
                )`,
		`CREATE TABLE IF NOT EXISTS scheduled_tasks (
                        id SERIAL PRIMARY KEY,
                        title TEXT NOT NULL,
                        description TEXT,
                        task_type TEXT NOT NULL,
                        vpn_type TEXT,
                        scheduled_at TIMESTAMPTZ NOT NULL,
                        repeat TEXT NOT NULL,
                        servers TEXT,
                        active BOOLEAN DEFAULT TRUE,
                        executed BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )`,
		`CREATE TABLE IF NOT EXISTS tasks (
                        id SERIAL PRIMARY KEY,
                        vendor TEXT,
                        url TEXT,
                        login TEXT,
                        password TEXT,
                        proxy TEXT,
                        vendor_url_id INT REFERENCES vendor_urls(id)
                )`,
		`CREATE TABLE IF NOT EXISTS logs (
                        id SERIAL PRIMARY KEY,
                        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        level TEXT,
                        message TEXT,
                        source TEXT
                )`,
	}
	for _, q := range queries {
		if _, err := d.Exec(q); err != nil {
			return err
		}
	}

	// ensure the vendor_url_id column exists in tasks table
	var exists bool
	err := d.QueryRow(`SELECT EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_name='tasks' AND column_name='vendor_url_id'
       )`).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		if _, err := d.Exec(`ALTER TABLE tasks ADD COLUMN vendor_url_id INT REFERENCES vendor_urls(id)`); err != nil {
			return err
		}
	}
	return nil
}
