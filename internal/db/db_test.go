package db

import (
	"os"
	"testing"
)

// TestConnect verifies that Connect starts an embedded database and creates required tables.
func TestConnect(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("cannot run embedded postgres as root")
	}
	cfg := Config{DSN: "postgres://invalid:5432/notexist?sslmode=disable", User: "postgres", Password: "postgres", Name: "testdb"}
	d, err := Connect(cfg)
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	defer d.Close()

	check := func(name string) {
		var exists bool
		err := d.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`, name).Scan(&exists)
		if err != nil {
			t.Fatalf("check %s existence: %v", name, err)
		}
		if !exists {
			t.Fatalf("table %s was not created", name)
		}
	}

	check("tasks")
	check("credentials")
}
func TestInitSchemaCreatesAllTables(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("cannot run embedded postgres as root")
	}
	cfg := Config{DSN: "postgres://invalid:5432/notexist?sslmode=disable", User: "postgres", Password: "postgres", Name: "testdb"}
	d, err := Connect(cfg)
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	defer d.Close()

	tables := []string{"vendor_urls", "credentials", "proxies", "tasks", "logs"}
	for _, name := range tables {
		var exists bool
		err := d.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`, name).Scan(&exists)
		if err != nil {
			t.Fatalf("check %s existence: %v", name, err)
		}
		if !exists {
			t.Fatalf("table %s was not created", name)
		}
	}
}

func TestInsertLog(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("cannot run embedded postgres as root")
	}
	cfg := Config{DSN: "postgres://invalid:5432/notexist?sslmode=disable", User: "postgres", Password: "postgres", Name: "testdb"}
	d, err := Connect(cfg)
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	defer d.Close()

	if err := d.InsertLog("info", "hello", "test"); err != nil {
		t.Fatalf("InsertLog error: %v", err)
	}

	var count int
	if err := d.QueryRow(`SELECT COUNT(*) FROM logs WHERE message='hello'`).Scan(&count); err != nil {
		t.Fatalf("query logs: %v", err)
	}
	if count == 0 {
		t.Fatalf("log entry not inserted")
	}
}
