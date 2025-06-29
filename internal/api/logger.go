package api

import (
	"log"
	"time"
)

// logEvent inserts a log entry into the database or falls back to the
// InsertLog helper when the database is unavailable. A timestamp is
// explicitly stored with each entry.
func (s *Server) logEvent(level, msg, src string) {
	if s == nil {
		return
	}

	ts := time.Now().UTC()
	if s.db != nil {
		if _, err := s.db.Exec(`INSERT INTO logs(timestamp, level, message, source) VALUES($1,$2,$3,$4)`, ts, level, msg, src); err != nil {
			log.Printf("log event error: %v", err)
		}
		return
	}

	// Fallback to file logging when no database is configured.
	s.InsertLog(level, msg, src)
}
