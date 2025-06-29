package db

import "database/sql"

// initSchema ensures required tables exist.
func initSchema(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            vendor TEXT NOT NULL,
            url TEXT NOT NULL,
            login TEXT,
            password TEXT,
            proxy TEXT
        )`,
		`CREATE TABLE IF NOT EXISTS credentials (
            id SERIAL PRIMARY KEY,
            vendor TEXT,
            url TEXT,
            login TEXT NOT NULL,
            password TEXT NOT NULL,
            proxy TEXT
        )`,
	}
	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			return err
		}
	}
	return nil
}
