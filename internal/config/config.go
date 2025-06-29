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

	// Ultra-performance settings
	MaxIdleConns        int           `yaml:"max_idle_conns"`
	MaxConnsPerHost     int           `yaml:"max_conns_per_host"`
	IdleConnTimeout     time.Duration `yaml:"idle_conn_timeout"`
	TLSHandshakeTimeout time.Duration `yaml:"tls_handshake_timeout"`

	// Advanced features
	ProxyEnabled  bool     `yaml:"proxy_enabled"`
	ProxyType     string   `yaml:"proxy_type"`
	ProxyList     []string `yaml:"proxy_list"`
	ProxyRotation bool     `yaml:"proxy_rotation"`

	// Smart scaling
	AutoScale      bool    `yaml:"auto_scale"`
	MinThreads     int     `yaml:"min_threads"`
	MaxThreads     int     `yaml:"max_threads"`
	ScaleThreshold float64 `yaml:"scale_threshold"`

	// Advanced error handling
	RetryDelay    time.Duration `yaml:"retry_delay"`
	BackoffFactor float64       `yaml:"backoff_factor"`
	MaxBackoff    time.Duration `yaml:"max_backoff"`

	// Memory optimization
	BufferSize    int  `yaml:"buffer_size"`
	PoolSize      int  `yaml:"pool_size"`
	StreamingMode bool `yaml:"streaming_mode"`

	// Database settings
	DatabaseDSN string `yaml:"database_dsn"`
	DBUser      string `yaml:"db_user"`
	DBPassword  string `yaml:"db_password"`
	DBName      string `yaml:"db_name"`
}

func Load(filename string) (*Config, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	// Apply intelligent defaults
	cfg.applyDefaults()
	return &cfg, nil
}

func Default() *Config {
	cfg := &Config{
		InputFile:  "credentials.txt",
		OutputFile: "valid.txt",
		VPNType:    "fortinet",
		Threads:    runtime.NumCPU() * 100, // Aggressive default
		Timeout:    3 * time.Second,        // Faster timeout
		MaxRetries: 3,
		RateLimit:  5000, // 5k RPS target
		Verbose:    false,

		// Ultra-performance defaults
		MaxIdleConns:        500,
		MaxConnsPerHost:     200,
		IdleConnTimeout:     15 * time.Second,
		TLSHandshakeTimeout: 3 * time.Second,

		// Smart scaling defaults
		AutoScale:      true,
		MinThreads:     runtime.NumCPU() * 50,
		MaxThreads:     runtime.NumCPU() * 300,
		ScaleThreshold: 0.8,

		// Advanced error handling
		RetryDelay:    100 * time.Millisecond,
		BackoffFactor: 1.5,
		MaxBackoff:    5 * time.Second,

		// Memory optimization
		BufferSize:    8192,
		PoolSize:      1000,
		StreamingMode: true,

		ProxyEnabled:  false,
		ProxyRotation: true,

		// Database defaults
		DatabaseDSN: "",
		DBUser:      "postgres",
		DBPassword:  "postgres",
		DBName:      "vpn_data",
	}

	cfg.applyDefaults()
	return cfg
}

func (c *Config) applyDefaults() {
	// Ensure minimum viable settings
	if c.Threads <= 0 {
		c.Threads = runtime.NumCPU() * 100
	}

	if c.RateLimit <= 0 {
		c.RateLimit = 5000
	}

	if c.MaxThreads <= 0 {
		c.MaxThreads = runtime.NumCPU() * 300
	}

	if c.MinThreads <= 0 {
		c.MinThreads = runtime.NumCPU() * 50
	}

	if c.BufferSize <= 0 {
		c.BufferSize = 8192
	}

	if c.PoolSize <= 0 {
		c.PoolSize = 1000
	}

	// Ensure MaxThreads >= MinThreads >= Threads
	if c.MinThreads > c.MaxThreads {
		c.MinThreads = c.MaxThreads
	}

	if c.Threads < c.MinThreads {
		c.Threads = c.MinThreads
	}

	if c.Threads > c.MaxThreads {
		c.Threads = c.MaxThreads
	}

	if c.DBName == "" {
		c.DBName = "vpn_data"
	}

	if c.DBUser == "" {
		c.DBUser = "postgres"
	}

	if c.DBPassword == "" {
		c.DBPassword = "postgres"
	}

	if c.DatabaseDSN == "" {
		const port = 5432
		c.DatabaseDSN = fmt.Sprintf("postgres://%s:%s@localhost:%d/%s?sslmode=disable",
			c.DBUser, c.DBPassword, port, c.DBName)
	}
}
