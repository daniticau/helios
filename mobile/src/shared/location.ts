// Thin wrapper around expo-location that returns a tagged result so callers
// never have to catch. Used by OnboardAddress for the "use my location" flow.

import * as Location from 'expo-location';

export type GetCurrentAddressResult =
  | { ok: true; address: string; lat: number; lng: number }
  | { ok: false; reason: 'permission' | 'unavailable' | 'no_address' };

export async function getCurrentAddress(): Promise<GetCurrentAddressResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { ok: false, reason: 'permission' };
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;

    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (places.length === 0) {
      return { ok: false, reason: 'no_address' };
    }

    const p = places[0];
    const streetLine =
      p.streetNumber && p.street
        ? `${p.streetNumber} ${p.street}`
        : p.street ?? p.name ?? undefined;

    const parts = [streetLine, p.city, p.region, p.postalCode].filter(
      (s): s is string => typeof s === 'string' && s.length > 0
    );

    if (parts.length === 0) {
      return { ok: false, reason: 'no_address' };
    }

    return {
      ok: true,
      address: parts.join(', '),
      lat: latitude,
      lng: longitude,
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export function explainReason(reason: Exclude<GetCurrentAddressResult, { ok: true }>['reason']): string {
  switch (reason) {
    case 'permission':
      return 'Location permission denied. Enable it in Settings to autofill your address.';
    case 'unavailable':
      return "Couldn't get a fix on your location. Try again outdoors or enter the address manually.";
    case 'no_address':
      return "We found your coordinates but no street address. Enter it manually.";
  }
}
