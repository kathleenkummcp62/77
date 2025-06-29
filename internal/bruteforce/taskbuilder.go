package bruteforce

// TaskBuilder can be used to configure tasks programmatically.
// At the moment it only provides a proxy list but can be extended
// with more settings in the future.
import (
	"database/sql"

	"vpn-bruteforce-client/internal/db"
)

// Task represents a single scanning task loaded from the database.
type Task struct {
	ID          int
	VPNType     string
	VendorURLID int
	URL         string
	Server      string
	Status      string
	Progress    int
	Processed   int
	Goods       int
	Bads        int
	Errors      int
	RPS         int
}

// TaskBuilder can be used to configure tasks programmatically.
// It allows loading tasks and proxy lists from the database.
type TaskBuilder struct {
	ProxyList []string
	Tasks     []Task
}

// LoadTasks loads tasks from the provided database connection.
// The function automatically detects the tasks schema and populates
// the Tasks field with the results.
func (tb *TaskBuilder) LoadTasks(d *db.DB) error {
	if d == nil {
		return nil
	}

	var useVendor bool
	_ = d.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='vendor_url_id')`).Scan(&useVendor)

	var (
		rows *sql.Rows
		err  error
	)
	if useVendor {
		rows, err = d.Query(`
                        SELECT t.id, t.vendor_url_id, COALESCE(v.url, ''), t.server, t.status, t.progress, t.processed, t.goods, t.bads, t.errors, t.rps
                        FROM tasks t
                        LEFT JOIN vendor_urls v ON t.vendor_url_id = v.id`)
	} else {
		rows, err = d.Query(`SELECT id, vpn_type, server, status, progress, processed, goods, bads, errors, rps FROM tasks`)
	}
	if err != nil {
		return err
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var t Task
		if useVendor {
			if err := rows.Scan(&t.ID, &t.VendorURLID, &t.URL, &t.Server, &t.Status, &t.Progress, &t.Processed, &t.Goods, &t.Bads, &t.Errors, &t.RPS); err != nil {
				continue
			}
		} else {
			if err := rows.Scan(&t.ID, &t.VPNType, &t.Server, &t.Status, &t.Progress, &t.Processed, &t.Goods, &t.Bads, &t.Errors, &t.RPS); err != nil {
				continue
			}
		}
		tasks = append(tasks, t)
	}

	if err := rows.Err(); err != nil {
		return err
	}

	tb.Tasks = tasks
	return nil
}
