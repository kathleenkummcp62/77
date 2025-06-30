package db

import (
	"database/sql"
	"fmt"
	"os"
	"testing"

	"github.com/fergusstrange/embedded-postgres"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestConnectToRunningDB(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("cannot run embedded postgres as root")
	}
	pg := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().
		Port(5545).Database("testdb").Username("postgres").Password("postgres"))
	if err := pg.Start(); err != nil {
		t.Fatalf("start embedded: %v", err)
	}
	defer pg.Stop()

	cfg := Config{DSN: fmt.Sprintf("postgres://postgres:postgres@localhost:%d/testdb?sslmode=disable", 5545), User: "postgres", Password: "postgres", Name: "testdb", Port: 5545}
	d, err := Connect(cfg)
	if err != nil {
		t.Fatalf("Connect: %v", err)
	}
	defer d.Close()
	if d.embedded != nil {
		t.Fatalf("expected no embedded instance")
	}
	var exists bool
	err = d.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tasks')`).Scan(&exists)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if !exists {
		t.Fatalf("tasks table not created")
	}
}

func TestInitSchemaTempDB(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("cannot run embedded postgres as root")
	}
	pg := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().
		Port(5546).Database("tempdb").Username("postgres").Password("postgres"))
	if err := pg.Start(); err != nil {
		t.Fatalf("start: %v", err)
	}
	defer pg.Stop()

	dsn := fmt.Sprintf("postgres://postgres:postgres@localhost:%d/tempdb?sslmode=disable", 5546)
	sqlDB, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer sqlDB.Close()

	d := &DB{DB: sqlDB}
	if err := initSchema(d); err != nil {
		t.Fatalf("init schema: %v", err)
	}
	var exists bool
	err = sqlDB.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='vendor_urls')`).Scan(&exists)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if !exists {
		t.Fatalf("vendor_urls table not created")
	}
}
