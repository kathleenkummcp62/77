package api

// logEvent inserts a log entry into the database if available. On error it logs
// to the standard logger.
func (s *Server) logEvent(level, msg, src string) {
	if s == nil {
		return
	}
	InsertLogEntry(s.db, level, msg, src)
}
