"""
URL guard — an toàn URL + tôn trọng robots.txt.
=================================================
Hai lớp bảo vệ trước khi fetch bất kỳ URL nào:

1. is_safe_url() — CHẶN SSRF: crawl agent fetch URL từ config; nếu config bị
   tiêm nhiễm, không được phép với private IP, localhost, cloud metadata
   (169.254.169.254), hay scheme lạ.

2. RobotsCache — tôn trọng robots.txt của site (anti-pattern "ignoring
   robots.txt" trong data-scraper-agent). Fail-open khi không đọc được
   robots.txt (site không đặt luật = không cấm), nhưng ghi log.
"""

import ipaddress
from urllib.parse import urlparse
from loguru import logger

BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "metadata",
}
BLOCKED_HOST_SUFFIXES = (".local", ".internal", ".localhost")
ALLOWED_SCHEMES = {"http", "https"}


def is_safe_url(url: str) -> tuple[bool, str]:
    """
    Kiểm tra URL có an toàn để fetch không. HÀM THUẦN.

    @returns (an_toàn, lý_do_nếu_không)
    """
    try:
        parsed = urlparse(str(url))
    except (ValueError, TypeError):
        return False, "URL không parse được"

    if parsed.scheme not in ALLOWED_SCHEMES:
        return False, f"Scheme '{parsed.scheme}' không được phép (chỉ http/https)"

    host = (parsed.hostname or "").lower()
    if not host:
        return False, "URL không có host"

    if host in BLOCKED_HOSTNAMES or host.endswith(BLOCKED_HOST_SUFFIXES):
        return False, f"Host '{host}' bị chặn (loopback/internal)"

    # Host là IP literal → chặn private/loopback/link-local/reserved
    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return False, f"IP {ip} thuộc dải nội bộ (SSRF risk)"
    except ValueError:
        pass  # không phải IP → hostname thường, ok

    return True, ""


def parse_robots(text: str, user_agent: str = "*") -> list[str]:
    """
    Parse robots.txt tối giản: trả danh sách Disallow áp dụng cho user_agent.
    HÀM THUẦN. Luật: nhóm UA cụ thể khớp thì ưu tiên hơn nhóm '*'.
    'Disallow:' rỗng = cho phép tất cả.

    @returns danh sách path prefix bị cấm (rỗng = cho phép hết)
    """
    groups: list[tuple[list[str], list[str]]] = []  # (agents, disallowed)
    current_agents: list[str] = []
    current_disallow: list[str] = []

    def _flush():
        if current_agents or current_disallow:
            groups.append((list(current_agents), list(current_disallow)))
        current_agents.clear()
        current_disallow.clear()

    for line in str(text or "").splitlines():
        line = line.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()

        if key == "user-agent":
            # user-agent liên tiếp = cùng 1 nhóm
            if current_disallow:
                _flush()
            current_agents.append(value.lower())
        elif key == "disallow":
            current_disallow.append(value)

    _flush()

    # Ưu tiên nhóm khớp UA cụ thể; nếu không có thì dùng nhóm '*'
    ua = user_agent.lower()
    specific = [d for agents, dis in groups if ua in agents for d in dis]
    if specific:
        return [d for d in specific if d]

    wildcard = [d for agents, dis in groups if "*" in agents for d in dis]
    return [d for d in wildcard if d]


def path_allowed(path: str, disallowed: list[str]) -> bool:
    """
    Path có được phép crawl không (theo danh sách Disallow). HÀM THUẦN.
    Luật robots: prefix dài nhất khớp thắng; không có prefix nào khớp = cho phép.
    """
    path = path or "/"
    longest = ""
    matched = False
    for prefix in disallowed:
        if path.startswith(prefix) and len(prefix) > len(longest):
            longest = prefix
            matched = True
    return not matched


class RobotsCache:
    """Cache robots.txt theo domain. Fail-open khi không đọc được."""

    def __init__(self, user_agent: str = "*", timeout: float = 10.0):
        self.user_agent = user_agent
        self.timeout = timeout
        self._cache: dict[str, list[str]] = {}  # origin → disallowed prefixes
        self._client = None

    def _get_client(self):
        if self._client is None or self._client.is_closed:
            import httpx
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                headers={"User-Agent": f"MTKCrawlBot/1.0 ({self.user_agent})"},
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _fetch_disallowed(self, origin: str) -> list[str]:
        """Đọc robots.txt của origin. Lỗi → trả [] (fail-open, site không đặt luật)."""
        try:
            client = self._get_client()
            resp = await client.get(f"{origin}/robots.txt")
            if resp.status_code == 200:
                return parse_robots(resp.text, self.user_agent)
            if resp.status_code not in (404, 403):
                logger.debug(f"robots.txt {origin} trả {resp.status_code} — coi như không cấm")
            return []
        except Exception as e:
            logger.debug(f"Không đọc được robots.txt {origin} ({e}) — fail-open")
            return []

    async def is_allowed(self, url: str) -> bool:
        """URL có được phép fetch không (safe + robots)."""
        safe, why = is_safe_url(url)
        if not safe:
            logger.warning(f"URL bị chặn bởi guard: {url} ({why})")
            return False

        parsed = urlparse(url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin not in self._cache:
            self._cache[origin] = await self._fetch_disallowed(origin)

        return path_allowed(parsed.path, self._cache[origin])
