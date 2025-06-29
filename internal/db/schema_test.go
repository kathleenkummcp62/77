package db

import (
	"database/sql"
	"os"
	"testing"

	"github.com/fergusstrange/embedded-postgres"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// TestInitSchema ensures that InitSchema creates the expected tables.
func TestInitSchema(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("cannot run embedded postgres as root")
	}
	// Configure and start a temporary Postgres instance
	postgres := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().
		Port(5433).Database("testdb").Username("postgres").Password("postgres"))

	if err := postgres.Start(); err != nil {
		t.Fatalf("failed to start embedded postgres: %v", err)
	}
	defer postgres.Stop()

	dsn := "postgres://postgres:postgres@localhost:5433/testdb?sslmode=disable"
	sqlDB, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("failed to open db: %v", err)
	}
	defer sqlDB.Close()

	d := &DB{DB: sqlDB}
	if err := InitSchema(d); err != nil {
		t.Fatalf("InitSchema failed: %v", err)
	}

	checkTable := func(name string) {
		var exists bool
		err := sqlDB.QueryRow(`SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='public' AND table_name=$1
        )`, name).Scan(&exists)
		if err != nil {
			t.Fatalf("check %s existence: %v", name, err)
		}
		if !exists {
			t.Fatalf("table %s was not created", name)
		}
	}

	checkTable("tasks")
	checkTable("credentials")
}
