package api

import "log"

// logEvent inserts a log entry into the database if available. On error it logs
// to the standard logger.
func (s *Server) logEvent(level, msg, src string) {
	if s == nil || s.db == nil {
		return
	}
	if _, err := s.db.Exec(`INSERT INTO logs(level, message, source) VALUES ($1,$2,$3)`, level, msg, src); err != nil {
		log.Printf("log event error: %v", err)
	}
}
