const ALLOWED_ORIGINS = new Set([
  'https://ting-devin-han.github.io'
]);

const PAGE_SIZE = 1000;

type VisitorPoint = {
  latitude: number;
  longitude: number;
  country_code: string | null;
  city: string | null;
  visited_at: string;
};

type GeolocationResponse = {
  success?: boolean;
  latitude?: number;
  longitude?: number;
  country_code?: string;
  city?: string;
};

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
}

function jsonResponse(origin: string, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function clientIp(request: Request): string | null {
  const rawValue = request.headers.get('x-forwarded-for')
    ?? request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-real-ip');

  if (!rawValue) {
    return null;
  }

  let value = rawValue.split(',')[0].trim().replace(/^::ffff:/, '');
  if (value.startsWith('[') && value.includes(']')) {
    value = value.slice(1, value.indexOf(']'));
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(value)) {
    value = value.replace(/:\d+$/, '');
  }

  return value.length > 0 && value.length <= 45 ? value : null;
}

async function hashVisitor(ipAddress: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(ipAddress));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function locateVisitor(ipAddress: string): Promise<{
  latitude: number;
  longitude: number;
  country_code: string | null;
  city: string | null;
}> {
  const response = await fetch(
    `https://ipwho.is/${encodeURIComponent(ipAddress)}?fields=success,latitude,longitude,country_code,city`,
    {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    }
  );

  if (!response.ok) {
    throw new Error(`Geolocation request failed with ${response.status}`);
  }

  const data = await response.json() as GeolocationResponse;
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);

  if (data.success === false || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Geolocation response did not contain valid coordinates');
  }

  const countryCode = typeof data.country_code === 'string'
    ? data.country_code.toUpperCase().slice(0, 2)
    : null;
  const city = typeof data.city === 'string' && data.city.trim()
    ? data.city.trim().slice(0, 120)
    : null;

  return {
    latitude: Math.round(latitude * 10) / 10,
    longitude: Math.round(longitude * 10) / 10,
    country_code: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null,
    city
  };
}

function databaseHeaders(serviceRoleKey: string): HeadersInit {
  return {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json'
  };
}

async function recordVisitor(
  request: Request,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  const ipAddress = clientIp(request);
  if (!ipAddress) {
    throw new Error('The visitor IP address is unavailable');
  }

  const [location, visitorHash] = await Promise.all([
    locateVisitor(ipAddress),
    hashVisitor(ipAddress, serviceRoleKey)
  ]);
  const response = await fetch(
    `${supabaseUrl}/rest/v1/visitor_locations?on_conflict=visitor_hash%2Cvisit_date`,
    {
      method: 'POST',
      headers: {
        ...databaseHeaders(serviceRoleKey),
        'Prefer': 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify({
        ...location,
        visitor_hash: visitorHash
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Visitor insert failed with ${response.status}`);
  }
}

async function loadAllVisitors(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<VisitorPoint[]> {
  const points: VisitorPoint[] = [];
  let offset = 0;

  while (true) {
    const query = new URLSearchParams({
      select: 'latitude,longitude,country_code,city,visited_at',
      order: 'visited_at.asc',
      limit: String(PAGE_SIZE),
      offset: String(offset)
    });
    const response = await fetch(`${supabaseUrl}/rest/v1/visitor_locations?${query}`, {
      headers: databaseHeaders(serviceRoleKey)
    });

    if (!response.ok) {
      throw new Error(`Visitor query failed with ${response.status}`);
    }

    const batch = await response.json() as VisitorPoint[];
    points.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return points;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') ?? '';
  if (!ALLOWED_ORIGINS.has(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonResponse(origin, { error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(origin, { error: 'Service configuration is unavailable' }, 503);
  }

  try {
    if (request.method === 'POST') {
      await recordVisitor(request, supabaseUrl, serviceRoleKey);
    }

    const points = await loadAllVisitors(supabaseUrl, serviceRoleKey);
    return jsonResponse(origin, {
      count: points.length,
      points
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return jsonResponse(origin, { error: 'Visitor service is temporarily unavailable' }, 503);
  }
});
