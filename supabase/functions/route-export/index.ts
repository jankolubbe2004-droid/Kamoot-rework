import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const url = new URL(req.url);
    const routeId = url.searchParams.get('routeId');

    if (!routeId) {
      return new Response(JSON.stringify({ error: 'routeId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: route, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .single();

    if (error || !route) {
      return new Response(JSON.stringify({ error: 'Route not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If route already has a stored GPX file, redirect to it
    if (route.gpx_url) {
      const { data: signedUrl } = await supabase.storage
        .from('gpx-files')
        .createSignedUrl(route.gpx_url, 3600);

      if (signedUrl) {
        return new Response(JSON.stringify({ url: signedUrl.signedUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Generate GPX from waypoints
    const waypoints: Array<{ lat: number; lng: number; title?: string }> = route.waypoints ?? [];
    const gpxContent = buildGpx(route.title, route.description ?? '', waypoints);

    return new Response(gpxContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/gpx+xml',
        'Content-Disposition': `attachment; filename="${slugify(route.title)}.gpx"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildGpx(
  name: string,
  description: string,
  waypoints: Array<{ lat: number; lng: number; title?: string }>
): string {
  const wptXml = waypoints
    .map(
      (w) =>
        `  <wpt lat="${w.lat}" lon="${w.lng}">${w.title ? `<name>${escapeXml(w.title)}</name>` : ''}</wpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RoamFree" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(description)}</desc>
  </metadata>
${wptXml}
</gpx>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
