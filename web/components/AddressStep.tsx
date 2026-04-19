'use client';

// Step 1: address capture. Typeahead combobox backed by Nominatim via
// /api/geocode/autocomplete — selecting a suggestion gives us lat/lng
// immediately, so continue doesn't need a second forward-geocode.
// "Use current location" (browser geolocation) is the only escape hatch.

import { useCallback, useEffect, useRef, useState } from 'react';
import { type UserProfile } from '@/lib/types';

interface AddressStepProps {
  initialAddress?: string;
  onContinue: (patch: Partial<UserProfile> & { address: string; lat: number; lng: number }) => void;
}

interface Suggestion {
  display_name: string;
  lat: number;
  lng: number;
  zip?: string | null;
  state?: string | null;
}

const DEBOUNCE_MS = 250;
const MIN_QUERY_LEN = 3;

export function AddressStep({ initialAddress, onContinue }: AddressStepProps) {
  const [address, setAddress] = useState(initialAddress ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextFetchRef = useRef(false);

  const canContinue = address.trim().length > 3 && !resolving && !locating;

  // Close the dropdown when clicking outside the combobox.
  useEffect(() => {
    const onDocPointer = (e: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoadingSuggestions(true);
    try {
      const res = await fetch(
        `/api/geocode/autocomplete?q=${encodeURIComponent(q)}&limit=5`,
        { signal: ctrl.signal }
      );
      if (!res.ok) {
        setSuggestions([]);
        return;
      }
      const data = (await res.json()) as { results?: Suggestion[] };
      setSuggestions(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Debounced typeahead. Skip the fetch right after a selection/geolocation
  // fills the input (suppressNextFetchRef) so we don't reopen the dropdown.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suppressNextFetchRef.current) {
      suppressNextFetchRef.current = false;
      return;
    }
    const trimmed = address.trim();
    if (trimmed.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(trimmed);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [address, fetchSuggestions]);

  const onAddressChange = (next: string) => {
    setAddress(next);
    // User is typing — invalidate any previously-selected coords so
    // continue re-resolves against the new text.
    if (coords) setCoords(null);
    if (locateError) setLocateError(null);
    setShowSuggestions(true);
    setActiveIndex(-1);
  };

  const pickSuggestion = (s: Suggestion) => {
    suppressNextFetchRef.current = true;
    setAddress(s.display_name);
    setCoords({ lat: s.lat, lng: s.lng });
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setLocateError(null);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && canContinue) {
        e.preventDefault();
        void handleContinue();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        pickSuggestion(suggestions[activeIndex]);
      } else if (canContinue) {
        void handleContinue();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const useCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocateError('Geolocation not supported in this browser.');
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: gps }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${gps.latitude}&lon=${gps.longitude}`,
            { headers: { Accept: 'application/json' } }
          );
          const data = await res.json();
          const a = data.address ?? {};
          const street =
            a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road;
          const parts = [street, a.city ?? a.town ?? a.village, a.state, a.postcode].filter(
            (s: unknown): s is string => typeof s === 'string' && s.length > 0
          );
          if (parts.length === 0) {
            setLocateError("Found your coordinates but no street address.");
          } else {
            suppressNextFetchRef.current = true;
            setAddress(parts.join(', '));
            setCoords({ lat: gps.latitude, lng: gps.longitude });
            setShowSuggestions(false);
          }
        } catch {
          setLocateError("Couldn't resolve your location to an address.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied.'
            : "Couldn't get a fix on your location."
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const handleContinue = async () => {
    const trimmed = address.trim();
    if (coords) {
      onContinue({ address: trimmed, lat: coords.lat, lng: coords.lng });
      return;
    }
    // Fallback path: user typed a free-text address without picking a
    // suggestion. Hit the blocking forward-geocode endpoint.
    setResolving(true);
    setLocateError(null);
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: trimmed }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          setLocateError("We couldn't find that address. Check the spelling or pick a suggestion.");
        } else {
          setLocateError('Address lookup failed — try again in a moment.');
        }
        return;
      }
      const data = (await res.json()) as { lat: number; lng: number; display_name: string };
      onContinue({ address: data.display_name || trimmed, lat: data.lat, lng: data.lng });
    } catch {
      setLocateError('Address lookup failed — try again in a moment.');
    } finally {
      setResolving(false);
    }
  };

  const continueLabel = resolving ? 'resolving address…' : 'continue · step 02';

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <h2
          className="type-display-soft text-[color:var(--color-text)]"
          style={{ fontSize: 'clamp(38px, 5vw, 62px)', lineHeight: 1.0 }}
        >
          Where are we running{' '}
          <span className="type-display-italic text-[color:var(--color-accent)]">the numbers</span>?
        </h2>

        <p className="max-w-xl text-[16px] leading-[1.65] text-[color:var(--color-text-muted)]">
          Start typing and pick a real address — we resolve to your utility,
          solar irradiance, permit velocity, and local installer pricing. All
          ten lookups fan out in parallel when you continue.
        </p>
      </header>

      <div className="space-y-3">
        <label htmlFor="address" className="type-label">
          street address
        </label>
        <div className="relative" ref={wrapperRef}>
          <input
            id="address"
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-autocomplete="list"
            aria-controls="address-suggestions"
            aria-activedescendant={
              activeIndex >= 0 ? `address-option-${activeIndex}` : undefined
            }
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={onKeyDown}
            placeholder="9500 Gilman Dr, La Jolla, CA"
            className="w-full rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)] py-4 pl-5 pr-36 text-[15px] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-dim)] focus:border-[color:var(--color-accent)] focus:outline-none"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-sm border border-[color:var(--color-hairline)] bg-[color:var(--color-card-elevated)]/80 px-3 py-2 text-[11px] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent)]/50 hover:text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: 'var(--font-mono)' }}
            aria-label="use current location"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {locating ? 'locating…' : 'use location'}
          </button>

          {showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
            <ul
              id="address-suggestions"
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card-elevated)] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {loadingSuggestions && suggestions.length === 0 && (
                <li className="px-4 py-3 text-[12px] text-[color:var(--color-text-dim)]">
                  searching…
                </li>
              )}
              {suggestions.map((s, i) => (
                <li
                  id={`address-option-${i}`}
                  key={`${s.lat},${s.lng},${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pickSuggestion(s);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`cursor-pointer border-b border-[color:var(--color-hairline)] px-4 py-2.5 text-[13px] last:border-b-0 ${
                    i === activeIndex
                      ? 'bg-[color:var(--color-card)] text-[color:var(--color-accent)]'
                      : 'text-[color:var(--color-text)] hover:bg-[color:var(--color-card)]'
                  }`}
                >
                  <span className="block truncate">{s.display_name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-[color:var(--color-text-dim)]">
                    {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                    {s.zip ? ` · ${s.zip}` : ''}
                    {s.state ? ` · ${s.state}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {locateError && (
          <p className="text-[12px] text-[color:var(--color-text-dim)]" style={{ fontFamily: 'var(--font-mono)' }}>
            {locateError}
          </p>
        )}
      </div>

      <div className="pt-4">
        <button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className="group relative inline-flex w-full items-center justify-between overflow-hidden rounded-sm bg-[color:var(--color-accent)] px-7 py-4 text-[13px] font-semibold text-[color:var(--color-bg)] transition disabled:cursor-not-allowed disabled:opacity-35"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span className="relative z-10">{continueLabel}</span>
          <span className="relative z-10 text-lg">→</span>
          <span className="absolute inset-0 -translate-x-full bg-[color:var(--color-accent-warm)] transition-transform duration-500 group-enabled:group-hover:translate-x-0" />
        </button>
      </div>
    </div>
  );
}
