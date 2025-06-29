package logger

import (
	"database/sql"
	"fmt"
	"log"
)

type Execer interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
}

func Log(exec Execer, level, source, format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	log.Printf(msg)
	if exec == nil {
		return
	}
	if _, err := exec.Exec(`INSERT INTO logs(level, message, source) VALUES ($1,$2,$3)`, level, msg, source); err != nil {
		log.Printf("log insert error: %v", err)
	}
}
