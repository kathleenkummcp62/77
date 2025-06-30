package config

import (
	"fmt"
	"os"
	"runtime"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	InputFile  string        `yaml:"input_file"`
	OutputFile string        `yaml:"output_file"`
	VPNType    string        `yaml:"vpn_type"`
	Threads    int           `yaml:"threads"`
	Timeout    time.Duration `yaml:"timeout"`
	MaxRetries int           `yaml:"max_retries"`
	RateLimit  int           `yaml:"rate_limit"`
	Verbose    bool          `yaml:"verbose"`

	// Ultra-performance settings.
	MaxIdleConns        int           `yaml:"max_idle_conns"`
	MaxConnsPerHost     int           `yaml:"max_conns_per_host"`
	IdleConnTimeout     time.Duration `yaml:"idle_conn_timeout"`
	TLSHandshakeTimeout time.Duration `yaml:"tls_handshake_timeout"`

	// Advanced features.
	ProxyEnabled  bool     `yaml:"proxy_enabled"`
	ProxyType     string   `yaml:"proxy_type"`
	ProxyList     []string `yaml:"proxy_list"`
	ProxyRotation bool     `yaml:"proxy_rotation"`

	// Smart scaling.
	AutoScale      bool    `yaml:"auto_scale"`
	MinThreads     int     `yaml:"min_threads"`
	MaxThreads     int     `yaml:"max_threads"`
	ScaleThreshold float64 `yaml:"scale_threshold"`

	// Advanced error handling.
	RetryDelay    time.Duration `yaml:"retry_delay"`
	BackoffFactor float64       `yaml:"backoff_factor"`
	MaxBackoff    time.Duration `yaml:"max_backoff"`

	// Memory optimization.
	BufferSize    int  `yaml:"buffer_size"`
	PoolSize      int  `yaml:"pool_size"`
	StreamingMode bool `yaml:"streaming_mode"`

	// Database settings.
	DatabaseDSN string `yaml:"database_dsn"`
	DBUser      string `yaml:"db_user"`
	DBPassword  string `yaml:"db_password"`
	DBName      string `yaml:"db_name"`
	DBPort      int    `yaml:"db_port"`
}

// Load reads YAML config from file and applies defaults.
func Load(filename string) (*Config, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	cfg.applyDefaults()
	return &cfg, nil
}

// Default returns a Config with aggressive but sane defaults.
func Default() *Config {
	cfg := &Config{
		InputFile:  "credentials.txt",
		OutputFile: "valid.txt",
		VPNType:    "fortinet",
		Threads:    runtime.NumCPU() * 100,
		Timeout:    3 * time.Second,
		MaxRetries: 3,
		RateLimit:  5000,
		Verbose:    false,

		// Ultra-performance defaults.
		MaxIdleConns:        500,
		MaxConnsPerHost:     200,
		IdleConnTimeout:     15 * time.Second,
		TLSHandshakeTimeout: 3 * time.Second,

		// Smart scaling defaults.
		AutoScale:      true,
		MinThreads:     runtime.NumCPU() * 50,
		MaxThreads:     runtime.NumCPU() * 300,
		ScaleThreshold: 0.8,

		// Advanced error handling.
		RetryDelay:    100 * time.Millisecond,
		BackoffFactor: 1.5,
		MaxBackoff:    5 * time.Second,

		// Memory optimization.
		BufferSize:    8192,
		PoolSize:      1000,
		StreamingMode: true,

		// Proxy defaults.
		ProxyEnabled:  false,
		ProxyRotation: true,

		// Database defaults (can be overridden by YAML).
		DatabaseDSN: "",
		DBUser:      "postgres",
		DBPassword:  "postgres",
		DBName:      "vpn_data",
		DBPort:      5432,
	}

	cfg.applyDefaults()
	return cfg
}

// applyDefaults fills in zero or inconsistent fields with sensible values.
func (c *Config) applyDefaults() {
	// Threading defaults.
	if c.Threads <= 0 {
		c.Threads = runtime.NumCPU() * 100
	}

	if c.MaxThreads <= 0 {
		c.MaxThreads = runtime.NumCPU() * 300
	}
	if c.MinThreads <= 0 {
		c.MinThreads = runtime.NumCPU() * 50
	}

	// Keep invariants Threads ∈ [MinThreads, MaxThreads].
	if c.MinThreads > c.MaxThreads {
		c.MinThreads = c.MaxThreads
	}
	if c.Threads < c.MinThreads {
		c.Threads = c.MinThreads
	}
	if c.Threads > c.MaxThreads {
		c.Threads = c.MaxThreads
	}

	// Rate limiting.
	if c.RateLimit <= 0 {
		c.RateLimit = 5000
	}

	// Buffers & pools.
	if c.BufferSize <= 0 {
		c.BufferSize = 8192
	}
	if c.PoolSize <= 0 {
		c.PoolSize = 1000
	}

	// Database sane defaults.
	if c.DBName == "" {
		c.DBName = "vpn_data"
	}
	if c.DBUser == "" {
		c.DBUser = "postgres"
	}
	if c.DBPassword == "" {
		c.DBPassword = "postgres"
	}
	if c.DBPort == 0 {
		c.DBPort = 5432
	}

	if c.DatabaseDSN == "" {
		c.DatabaseDSN = fmt.Sprintf("postgres://%s:%s@localhost:%d/%s?sslmode=disable",
			c.DBUser, c.DBPassword, c.DBPort, c.DBName)
	}
}
