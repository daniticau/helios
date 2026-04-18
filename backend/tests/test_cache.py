"""Tests for backend.cache — in-memory TTL cache."""

from __future__ import annotations

import time

from cache import TTLCache


def test_get_missing_key_returns_none() -> None:
    c = TTLCache()
    assert c.get("nope") is None


def test_set_then_get_returns_value_within_ttl() -> None:
    c = TTLCache()
    c.set("k", {"payload": 42}, ttl_seconds=5.0)
    assert c.get("k") == {"payload": 42}


def test_set_with_ttl_in_past_is_expired_on_get() -> None:
    c = TTLCache()
    # TTL of zero — anything past `time.time()` should miss.
    c.set("k", "v", ttl_seconds=0.0)
    # Give time a beat to advance past the expires_at.
    time.sleep(0.01)
    assert c.get("k") is None


def test_expired_key_is_evicted_from_store() -> None:
    """Hitting an expired key should remove it from the internal dict."""
    c = TTLCache()
    c.set("k", "v", ttl_seconds=0.0)
    time.sleep(0.01)
    c.get("k")
    assert "k" not in c._store


def test_clear_empties_cache() -> None:
    c = TTLCache()
    c.set("a", 1, ttl_seconds=60.0)
    c.set("b", 2, ttl_seconds=60.0)
    c.clear()
    assert c.get("a") is None
    assert c.get("b") is None


def test_set_overwrites_existing_value() -> None:
    c = TTLCache()
    c.set("k", "old", ttl_seconds=60.0)
    c.set("k", "new", ttl_seconds=60.0)
    assert c.get("k") == "new"


def test_many_keys_independent() -> None:
    c = TTLCache()
    for i in range(10):
        c.set(f"k{i}", i, ttl_seconds=60.0)
    for i in range(10):
        assert c.get(f"k{i}") == i
