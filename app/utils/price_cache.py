import threading
from datetime import datetime, timezone


class PriceCache:
    _instance = None
    _init_lock = threading.Lock()

    def __init__(self):
        self._prices: dict[str, dict] = {}
        self._tracked: set[str] = set()
        self._lock = threading.Lock()
        self._version: int = 0

    @classmethod
    def get_instance(cls) -> "PriceCache":
        if cls._instance is None:
            with cls._init_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def register_tickers(self, tickers: list[str]) -> None:
        with self._lock:
            self._tracked.update(t.upper() for t in tickers)

    def bulk_update(self, prices: dict[str, dict]) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            for ticker, data in prices.items():
                key = ticker.upper()
                self._prices[key] = {
                    "price": data.get("price"),
                    "change_pct": data.get("change_pct"),
                    "volume": data.get("volume"),
                    "updated_at": now,
                }
            self._version += 1

    def get_prices(self, tickers: list[str] | None = None) -> dict[str, dict]:
        with self._lock:
            if tickers is None:
                return dict(self._prices)
            return {
                t.upper(): self._prices[t.upper()]
                for t in tickers
                if t.upper() in self._prices
            }

    def get_version(self) -> int:
        with self._lock:
            return self._version
