package bruteforce

// TaskEngine exposes minimal control functions for starting and stopping
// bruteforce tasks. API handlers depend on this interface so a mock
// implementation can be used in tests.
type TaskEngine interface {
	StartTask(vpnType string) error
	StopTask(vpnType string) error
}
