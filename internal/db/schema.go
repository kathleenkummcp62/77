package db

// This file contains database schema initialization logic.

func InitSchema(d *DB) error {
	if d == nil {
		return nil
	}
	queries := []string{
		`CREATE TABLE IF NOT EXISTS vendor_urls (
                        id SERIAL PRIMARY KEY,
                        url TEXT NOT NULL
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
		`CREATE TABLE IF NOT EXISTS tasks (
                        id SERIAL PRIMARY KEY,
                        vpn_type TEXT NOT NULL,
                        server TEXT,
                        status TEXT,
                        progress INT DEFAULT 0,
                        processed INT DEFAULT 0,
                        goods INT DEFAULT 0,
                        bads INT DEFAULT 0,
                        errors INT DEFAULT 0,
                        rps INT DEFAULT 0,
                        created_at TIMESTAMPTZ DEFAULT NOW()
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
	return nil
}
