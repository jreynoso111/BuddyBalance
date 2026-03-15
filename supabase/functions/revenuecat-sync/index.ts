import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

import {
  getCorsHeaders,
  getRequestOrigin,
  isAllowedOrigin,
  json,
  parseList,
} from '../_shared/public-security.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY') || '';
const REVENUECAT_ENTITLEMENT_ID = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') || 'premium';
const REVENUECAT_WEBHOOK_AUTH_TOKEN = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_TOKEN') || '';
const REVENUECAT_ALLOWED_ORIGINS = parseList(
  Deno.env.get('REVENUECAT_ALLOWED_ORIGINS') || 'https://buddybalance.net,https://www.buddybalance.net',
);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parseBearerToken(req: Request) {
  const header = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return header.slice(7).trim();
}

function getEntitlementCandidates() {
  return Array.from(
    new Set(
      REVENUECAT_ENTITLEMENT_ID
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function resolvePlanTierFromSubscriber(subscriber: any) {
  let entitlement = null;
  for (const candidate of getEntitlementCandidates()) {
    entitlement =
      subscriber?.entitlements?.[candidate] ||
      subscriber?.entitlements?.active?.[candidate] ||
      null;
    if (entitlement) break;
  }

  if (!entitlement) {
    return 'free';
  }

  if (entitlement.expires_date === null || entitlement.expiration_date === null) {
    return 'premium';
  }

  const expiresAt = entitlement.expires_date || entitlement.expiration_date || entitlement.expiresAt || null;
  if (!expiresAt) {
    return 'premium';
  }

  return new Date(expiresAt).getTime() > Date.now() ? 'premium' : 'free';
}

async function fetchRevenueCatSubscriber(appUserId: string) {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RevenueCat subscriber lookup failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function updateProfilePlan(appUserId: string, planTier: 'free' | 'premium') {
  const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
    .from('profiles')
    .select('plan_tier')
    .eq('id', appUserId)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  const previousPlanTier = String(existingProfile?.plan_tier || 'free').toLowerCase().trim();
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      plan_tier: planTier,
      last_premium_granted_at:
        planTier === 'premium' && previousPlanTier !== 'premium' ? new Date().toISOString() : undefined,
      last_premium_granted_source:
        planTier === 'premium' && previousPlanTier !== 'premium' ? 'purchase' : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appUserId);

  if (error) {
    throw new Error(error.message);
  }
}

Deno.serve(async (req) => {
  const origin = getRequestOrigin(req);

  if (req.method === 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin, REVENUECAT_ALLOWED_ORIGINS)) {
      return json({ error: 'Origin not allowed.' }, { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 403 });
    }

    return new Response('ok', { headers: getCorsHeaders(origin, REVENUECAT_ALLOWED_ORIGINS) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 405 });
  }

  if (origin && !isAllowedOrigin(origin, REVENUECAT_ALLOWED_ORIGINS)) {
    return json({ error: 'Origin not allowed.' }, { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 403 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Missing Supabase function secrets.' }, { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 500 });
  }

  if (!REVENUECAT_SECRET_API_KEY) {
    return json({ error: 'Missing REVENUECAT_SECRET_API_KEY.' }, { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 503 });
  }

  try {
    const token = parseBearerToken(req);
    const body = await req.json().catch(() => ({}));
    const event = typeof body?.event === 'object' && body?.event ? body.event : body;

    let appUserId = '';
    let source = 'webhook';

    if (token && token !== REVENUECAT_WEBHOOK_AUTH_TOKEN) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user?.id) {
        return json({ error: 'Unauthorized' }, { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 401 });
      }

      appUserId = data.user.id;
      source = 'client';
    } else {
      if (!REVENUECAT_WEBHOOK_AUTH_TOKEN) {
        return json(
          { error: 'RevenueCat webhook auth is not configured.' },
          { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 503 },
        );
      }

      if (token !== REVENUECAT_WEBHOOK_AUTH_TOKEN) {
        return json(
          { error: 'Unauthorized webhook request' },
          { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 401 },
        );
      }

      appUserId = String(event?.app_user_id || body?.app_user_id || '').trim();
    }

    if (!appUserId) {
      return json({ error: 'Missing app_user_id' }, { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 400 });
    }

    const subscriberResponse = await fetchRevenueCatSubscriber(appUserId);
    const subscriber = subscriberResponse?.subscriber || subscriberResponse;
    const planTier = resolvePlanTierFromSubscriber(subscriber);

    await updateProfilePlan(appUserId, planTier);

    return json(
      {
        ok: true,
        source,
        appUserId,
        planTier,
      },
      { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, { allowedOrigins: REVENUECAT_ALLOWED_ORIGINS, origin, status: 500 });
  }
});
