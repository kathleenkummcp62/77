package bruteforce

// TaskBuilder can be used to configure tasks programmatically.
// At the moment it only provides a proxy list but can be extended
// with more settings in the future.
// Task represents a single scanning task loaded from the database.
// It mirrors the "tasks" table structure used by the API.
type Task struct {
	ID       int    `json:"id"`
	Vendor   string `json:"vendor"`
	URL      string `json:"url"`
	Login    string `json:"login"`
	Password string `json:"password"`
	Proxy    string `json:"proxy"`
}

type TaskBuilder struct {
	ProxyList []string
	Tasks     []Task
}
