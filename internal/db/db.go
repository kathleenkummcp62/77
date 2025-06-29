package db

import (
	"context"
	"database/sql"
	"fmt"

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

// DB wraps the SQL database with optional embedded instance.
type DB struct {
	*sql.DB
	embedded *embeddedpostgres.EmbeddedPostgres
}

// Connect tries to connect to the provided DSN. If it fails,
// it starts an embedded Postgres instance with the provided
// credentials and database name.
func Connect(cfg config.Config) (*DB, error) {
	// Extract database settings from the main application configuration.
	c := ConfigFromApp(cfg)

	db, err := sql.Open("pgx", c.DSN)
	if err == nil {
		if err = db.Ping(); err == nil {
			return &DB{DB: db}, nil
		}
		db.Close()
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

	return &DB{DB: db, embedded: ep}, nil
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
