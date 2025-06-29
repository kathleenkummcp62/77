package db

import "fmt"

// InsertLog writes a log entry to the logs table.
// It returns an error if the insert fails or if the DB is nil.
func (d *DB) InsertLog(level, message, source string) error {
	if d == nil || d.DB == nil {
		return fmt.Errorf("db unavailable")
	}
	_, err := d.Exec(`INSERT INTO logs(level, message, source) VALUES($1,$2,$3)`, level, message, source)
	return err
}
