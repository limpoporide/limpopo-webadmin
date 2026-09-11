import { NextRequest, NextResponse } from 'next/server';

type Point = { lat: number; lng: number };

const cache = new Map<string, string>();

const keyFor = ({ lat, lng }: Point) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

async function lookupGoogle(point: Point, apiKey: string) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${point.lat},${point.lng}`);
  url.searchParams.set('result_type', 'neighborhood|sublocality|locality');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    results?: { address_components?: { long_name: string; types: string[] }[] }[];
  };

  const components = payload.results?.[0]?.address_components ?? [];
  const preferred =
    components.find((component) => component.types.includes('neighborhood')) ??
    components.find((component) => component.types.includes('sublocality')) ??
    components.find((component) => component.types.includes('locality'));

  return preferred?.long_name ?? null;
}

async function lookupNominatim(point: Point) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(point.lat));
  url.searchParams.set('lon', String(point.lng));
  url.searchParams.set('zoom', '14');

  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'LimpopoRideAdmin/1.0 (vehicle location lookup)' },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    address?: Record<string, string>;
  };

  const address = payload.address ?? {};

  return (
    address.neighbourhood ||
    address.suburb ||
    address.city_district ||
    address.town ||
    address.village ||
    address.city ||
    address.county ||
    null
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { points?: Point[] } | null;
  const points = (body?.points ?? []).filter(
    (point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng),
  );

  if (points.length === 0) {
    return NextResponse.json({ results: {} });
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const results: Record<string, string> = {};
  const pending = points.filter((point) => {
    const key = keyFor(point);

    if (cache.has(key)) {
      results[key] = cache.get(key)!;
      return false;
    }

    return true;
  });

  // Nominatim asks for no more than one request per second, so these stay sequential.
  for (const point of pending) {
    const key = keyFor(point);

    try {
      const name = apiKey ? await lookupGoogle(point, apiKey) : await lookupNominatim(point);

      if (name) {
        cache.set(key, name);
        results[key] = name;
      }
    } catch {
      // A failed lookup just leaves the coordinates on screen.
    }
  }

  return NextResponse.json({ results });
}
