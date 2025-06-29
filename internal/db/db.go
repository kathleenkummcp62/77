package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"sync"

	"github.com/fergusstrange/embedded-postgres"
	_ "github.com/jackc/pgx/v5/stdlib"

	"vpn-bruteforce-client/internal/config"
)

// Config holds database connection settings.
type Config struct {
	DSN      string
	User     string
	Password string
	Name     string
}

// to maintain backward compatibility, ConfigFromApp extracts database
// settings from the main application config.
func ConfigFromApp(c config.Config) Config {
	return Config{
		DSN:      c.DatabaseDSN,
		User:     c.DBUser,
		Password: c.DBPassword,
		Name:     c.DBName,
	}
}

// ConnectFromApp converts the application configuration to a database
// configuration and then calls Connect.
func ConnectFromApp(c config.Config) (*DB, error) {
	return Connect(ConfigFromApp(c))
}

// InitSchema creates required tables if they do not already exist. It is safe
// to call multiple times; the queries will execute only once per DB instance.
func (d *DB) InitSchema() error {
	d.initOnce.Do(func() {
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
				d.initErr = err
				return
			}
		}
	})
	return d.initErr
}

// DB wraps the SQL database with optional embedded instance.
type DB struct {
	*sql.DB
	embedded *embeddedpostgres.EmbeddedPostgres
	initOnce sync.Once
	initErr  error
}

// Connect tries to connect to the provided DSN. If it fails,
// it starts an embedded Postgres instance with the provided
// credentials and database name.
func Connect(cfg Config) (*DB, error) {
	// Attempt to connect to a running Postgres instance using the provided
	// configuration. If the connection fails an embedded instance will be
	// started automatically.
	c := cfg

	db, err := sql.Open("pgx", c.DSN)
	if err == nil {
		if err = db.Ping(); err == nil {
			conn := &DB{DB: db}
			if err = conn.InitSchema(); err != nil {
				conn.Close()
				return nil, err
			}
			return conn, nil
		}
		db.Close()
	}

	if err != nil {
		log.Printf("db connection failed, starting embedded: %v", err)
	} else {
		log.Printf("db ping failed, starting embedded")
	}

	// Start embedded Postgres
	ep := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().
		Username(c.User).
		Password(c.Password).
		Database(c.Name))
	if err = ep.Start(); err != nil {
		return nil, fmt.Errorf("failed to start embedded postgres: %w", err)
	}

	// Connect to embedded instance
	const port = 5432
	dsn := fmt.Sprintf("postgres://%s:%s@localhost:%d/%s?sslmode=disable",
		c.User, c.Password, port, c.Name)
	db, err = sql.Open("pgx", dsn)
	if err != nil {
		ep.Stop()
		return nil, err
	}
	if err = db.PingContext(context.Background()); err != nil {
		ep.Stop()
		return nil, err
	}

	conn := &DB{DB: db, embedded: ep}
	if err = conn.InitSchema(); err != nil {
		conn.Close()
		return nil, err
	}

	return conn, nil
}

// Close closes the connection and stops embedded Postgres if running.
func (d *DB) Close() error {
	if d.embedded != nil {
		d.embedded.Stop()
	}
	if d.DB != nil {
		return d.DB.Close()
	}
	return nil
}
