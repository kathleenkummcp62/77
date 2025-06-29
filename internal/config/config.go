package config

import (
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	InputFile    string        `yaml:"input_file"`
	OutputFile   string        `yaml:"output_file"`
	VPNType      string        `yaml:"vpn_type"`
	Threads      int           `yaml:"threads"`
	Timeout      time.Duration `yaml:"timeout"`
	MaxRetries   int           `yaml:"max_retries"`
	RateLimit    int           `yaml:"rate_limit"`
	Verbose      bool          `yaml:"verbose"`
	
	// Connection settings
	MaxIdleConns        int           `yaml:"max_idle_conns"`
	MaxConnsPerHost     int           `yaml:"max_conns_per_host"`
	IdleConnTimeout     time.Duration `yaml:"idle_conn_timeout"`
	TLSHandshakeTimeout time.Duration `yaml:"tls_handshake_timeout"`
	
	// Proxy settings
	ProxyEnabled bool   `yaml:"proxy_enabled"`
	ProxyType    string `yaml:"proxy_type"`
	ProxyAddr    string `yaml:"proxy_addr"`
	ProxyUser    string `yaml:"proxy_user"`
	ProxyPass    string `yaml:"proxy_pass"`
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

	return &cfg, nil
}

func Default() *Config {
	return &Config{
		InputFile:           "credentials.txt",
		OutputFile:          "valid.txt",
		VPNType:             "fortinet",
		Threads:             1000,
		Timeout:             5 * time.Second,
		MaxRetries:          2,
		RateLimit:           0,
		Verbose:             false,
		MaxIdleConns:        100,
		MaxConnsPerHost:     50,
		IdleConnTimeout:     30 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
		ProxyEnabled:        false,
	}
}