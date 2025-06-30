package api

import "log"

// logEvent inserts a log entry into the database if available. On error it logs
// to the standard logger.
func (s *Server) logEvent(level, msg, src string) {
	if s == nil || s.db == nil {
		return
	}
	if err := s.db.InsertLog(level, msg, src); err != nil {
		log.Printf("log event error: %v", err)
	}
}
