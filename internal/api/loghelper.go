package api

import (
	"log"

	"vpn-bruteforce-client/internal/db"
)

// InsertLogEntry inserts a log entry into the logs table using the provided
// database connection. Errors are logged but otherwise ignored.
func InsertLogEntry(d *db.DB, level, message, source string) {
	if d == nil {
		return
	}
	if _, err := d.Exec(`INSERT INTO logs(level, message, source) VALUES($1,$2,$3)`, level, message, source); err != nil {
		log.Printf("insert log error: %v", err)
	}
}
