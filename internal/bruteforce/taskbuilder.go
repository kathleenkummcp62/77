package bruteforce

// TaskBuilder can be used to configure tasks programmatically.
// At the moment it only provides a proxy list but can be extended
// with more settings in the future.
type TaskBuilder struct {
	ProxyList []string
}
