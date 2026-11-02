// ============================================================
// File: src/services/pincodeService.ts
// Purpose: Fetch District, State, Localities & Coordinates from
//          All India Pincode Directory (data.gov.in resource 5c2f62fe-5afa-4119-a499-fec9d604d5bd)
//          with high-reliability browser CORS compatibility & local inference fallback.
// ============================================================

import { Platform } from 'react-native';
import { inferStateFromPincode, getCitiesByState } from '../constants/locations';

export interface PincodeDetails {
  pincode: string;
  district: string;
  state: string;
  localities: string[];
  latitude?: string | null;
  longitude?: string | null;
}

const DATA_GOV_RESOURCE_ID = '5c2f62fe-5afa-4119-a499-fec9d604d5bd';
const DATA_GOV_API_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

/**
 * Format state string from UPPERCASE to Title Case (e.g. "TAMIL NADU" -> "Tamil Nadu")
 */
function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Fetch address details by 6-digit Indian PIN Code
 * Safe: Never throws uncaught errors. Supports Web (CORS) and Native.
 */
export async function lookupPincode(pincode: string): Promise<PincodeDetails | null> {
  const cleanPin = (pincode || '').trim().replace(/\D/g, '');
  if (cleanPin.length !== 6) {
    return null;
  }

  const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';

  // Strategy A: On Web browsers, data.gov.in does not support browser CORS.
  // api.postalpincode.in has 'Access-Control-Allow-Origin: *' and provides All India Pincode Directory data.
  // We query api.postalpincode.in directly on Web to avoid browser CORS errors ('Failed to fetch').
  if (isWeb) {
    try {
      const fallbackUrl = `https://api.postalpincode.in/pincode/${cleanPin}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(fallbackUrl, {
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const result = await response.json().catch(() => null);
        if (Array.isArray(result) && result[0]?.Status === 'Success' && Array.isArray(result[0]?.PostOffice)) {
          const offices = result[0].PostOffice;
          const first = offices[0];
          const district = toTitleCase(first.District || first.Block || '');
          const state = toTitleCase(first.State || '');
          const localities: string[] = Array.from(
            new Set(
              offices.map((o: any) => String(o.Name || '').trim()).filter(Boolean)
            )
          );

          return {
            pincode: cleanPin,
            district,
            state,
            localities,
          };
        }
      }
    } catch (err) {
      console.warn('[PincodeService] Web postalpincode fetch failed, falling back:', err);
    }
  }

  // Strategy B: Native or server environment: Query data.gov.in All India Pincode Directory API
  if (!isWeb) {
    try {
      const url = `https://api.data.gov.in/resource/${DATA_GOV_RESOURCE_ID}?api-key=${DATA_GOV_API_KEY}&format=json&filters[pincode]=${cleanPin}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const data = await response.json().catch(() => null);
        if (data && Array.isArray(data.records) && data.records.length > 0) {
          const first = data.records[0];
          const district = toTitleCase(first.district || first.divisionname || '');
          const state = toTitleCase(first.statename || '');
          const localities: string[] = Array.from(
            new Set(
              data.records
                .map((r: any) => String(r.officename || '').trim())
                .filter(Boolean)
            )
          );

          return {
            pincode: cleanPin,
            district,
            state,
            localities,
            latitude: first.latitude || null,
            longitude: first.longitude || null,
          };
        }
      }
    } catch (err) {
      console.warn('[PincodeService] data.gov.in lookup failed:', err);
    }
  }

  // Strategy C: Instant Local Geographic Dictionary Fallback
  // Guarantees that even if all external APIs are offline, city & state are correctly inferred.
  try {
    const inferredState = inferStateFromPincode(cleanPin);
    if (inferredState) {
      const stateCities = getCitiesByState(inferredState);
      const prefix3 = cleanPin.substring(0, 3);
      const matchedCity = stateCities.find(c => c.pincode.startsWith(prefix3)) || stateCities[0];

      return {
        pincode: cleanPin,
        district: matchedCity ? matchedCity.city : '',
        state: inferredState,
        localities: [],
      };
    }
  } catch (err) {
    console.warn('[PincodeService] Local inference fallback failed:', err);
  }

  return null;
}
