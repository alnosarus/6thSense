from starlette.requests import Request

from app.core.middleware import get_client_ip


def _make_request(headers: dict[str, str], client: tuple[str, int] | None = ("10.0.0.1", 0)):
    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": client,
    }
    return Request(scope)


def test_returns_rightmost_xff_entry():
    req = _make_request({"X-Forwarded-For": "1.2.3.4, 5.6.7.8, 9.9.9.9"})
    assert get_client_ip(req) == "9.9.9.9"


def test_ignores_spoofed_left_entries():
    # Client put `attacker-IP` first; Railway appends the real IP last.
    req = _make_request({"X-Forwarded-For": "evil, 8.8.8.8"})
    assert get_client_ip(req) == "8.8.8.8"


def test_falls_back_to_client_host():
    req = _make_request({}, client=("10.1.1.1", 0))
    assert get_client_ip(req) == "10.1.1.1"


def test_returns_unknown_when_no_client():
    req = _make_request({}, client=None)
    assert get_client_ip(req) == "unknown"
