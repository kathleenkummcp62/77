package db

import (
	"database/sql"
	"os"
	"testing"

	"github.com/fergusstrange/embedded-postgres"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// TestInitSchemaAllTables starts an embedded Postgres instance and ensures
// InitSchema creates every expected table.
func TestInitSchemaAllTables(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("cannot run embedded postgres as root")
	}
	pg := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().
		Port(5444).Database("testdb").Username("postgres").Password("postgres"))
	if err := pg.Start(); err != nil {
		t.Fatalf("start postgres: %v", err)
	}
	defer pg.Stop()

	dsn := "postgres://postgres:postgres@localhost:5444/testdb?sslmode=disable"
	sqlDB, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer sqlDB.Close()

	d := &DB{DB: sqlDB}
	if err := InitSchema(d); err != nil {
		t.Fatalf("InitSchema: %v", err)
	}

	tables := []string{"vendor_urls", "credentials", "proxies", "tasks", "logs"}
	for _, name := range tables {
		var exists bool
		err := sqlDB.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`, name).Scan(&exists)
		if err != nil {
			t.Fatalf("check %s: %v", name, err)
		}
		if !exists {
			t.Fatalf("table %s not created", name)
		}
	}
}
