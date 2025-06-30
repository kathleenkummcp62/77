import importlib
import sys
import asyncio
from types import SimpleNamespace

import pytest

class DummyResponse:
    def __init__(self, status=200, text='', headers=None):
        self.status = status
        self._text = text
        self.headers = headers or {}
    async def text(self):
        return self._text
    async def __aenter__(self):
        return self
    async def __aexit__(self, exc_type, exc, tb):
        pass

class DummySession:
    def __init__(self, response):
        self.response = response
    def post(self, *args, **kwargs):
        return self.response

@pytest.fixture
def scanner(tmp_path, monkeypatch):
    creds = tmp_path / "creds.txt"
    creds.write_text("1.1.1.1;user;pass\n")
    sys.argv = ["vpn_scanner.py", "--vpn-type", "fortinet", "--creds-file", str(creds)]
    mod = importlib.import_module("vpn_scanner")
    yield mod
    importlib.reload(mod)

@pytest.mark.asyncio
async def test_check_fortinet_success(scanner):
    resp = DummyResponse(status=200, text="welcome.html")
    session = DummySession(resp)
    result = await scanner.check_fortinet(session, "https://example.com/remote/login", "u", "p")
    assert result is True

@pytest.mark.asyncio
async def test_process_credential_updates_stats(scanner, tmp_path, monkeypatch):
    async def fake_check(*args, **kwargs):
        return True
    monkeypatch.setattr(scanner, "check_fortinet", fake_check)
    out = tmp_path / "valid.txt"
    session = object()
    scanner.stats = {k:0 for k in scanner.stats}
    await scanner.process_credential(session, "ip;u;p", str(out))
    assert scanner.stats["goods"] == 1
    assert out.read_text().strip() == "ip;u;p"
