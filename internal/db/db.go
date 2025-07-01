package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"

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
	Port     int
}

// to maintain backward compatibility, ConfigFromApp extracts database
// settings from the main application config.
func ConfigFromApp(c config.Config) Config {
	return Config{
		DSN:      c.DatabaseDSN,
		User:     c.DBUser,
		Password: c.DBPassword,
		Name:     c.DBName,
		Port:     c.DBPort,
	}
}

// ConnectFromApp converts the application configuration to a database
// configuration and then calls Connect.
func ConnectFromApp(c config.Config) (*DB, error) {
	return Connect(ConfigFromApp(c))
}

// DB wraps the SQL database with optional embedded instance.
type DB struct {
	*sql.DB
	embedded       *embeddedpostgres.EmbeddedPostgres
	UseVendorTasks bool
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
			d := &DB{DB: db}
			if err = InitSchema(d); err != nil {
				d.Close()
				return nil, err
			}
			return d, nil
		}
		db.Close()
	}

	if err != nil {
		log.Printf("db connection failed, starting embedded: %v", err)
	} else {
		log.Printf("db ping failed, starting embedded")
	}

	// Start embedded Postgres
	port := c.Port
	if port == 0 {
		port = 5432
	}
	ep := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().
		Username(c.User).
		Password(c.Password).
		Database(c.Name).
		Port(uint32(port)))
	if err = ep.Start(); err != nil {
		return nil, fmt.Errorf("failed to start embedded postgres: %w", err)
	}

	// Connect to embedded instance
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

	d := &DB{DB: db, embedded: ep}
	if err = InitSchema(d); err != nil {
		d.Close()
		return nil, err
	}

	return d, nil
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
