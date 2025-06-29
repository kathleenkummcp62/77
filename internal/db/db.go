package db

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/fergusstrange/embedded-postgres"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// Config holds database connection settings.
type Config struct {
	DSN      string
	User     string
	Password string
	Name     string
}

// DB wraps the SQL database with optional embedded instance.
type DB struct {
	*sql.DB
	embedded *embeddedpostgres.EmbeddedPostgres
}

// Connect tries to connect to the provided DSN. If it fails,
// it starts an embedded Postgres instance with the provided
// credentials and database name.
func Connect(cfg Config) (*DB, error) {
	db, err := sql.Open("pgx", cfg.DSN)
	if err == nil {
		if err = db.Ping(); err == nil {
			return &DB{DB: db}, nil
		}
		db.Close()
	}

	// Start embedded Postgres
	ep := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().
		Username(cfg.User).
		Password(cfg.Password).
		Database(cfg.Name))
	if err = ep.Start(); err != nil {
		return nil, fmt.Errorf("failed to start embedded postgres: %w", err)
	}

	// Connect to embedded instance
	const port = 5432
	dsn := fmt.Sprintf("postgres://%s:%s@localhost:%d/%s?sslmode=disable",
		cfg.User, cfg.Password, port, cfg.Name)
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
