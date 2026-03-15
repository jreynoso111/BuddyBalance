import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

import {
  getCorsHeaders,
  getRequestOrigin,
  isAllowedOrigin,
  isAllowedRedirect,
  parseList,
} from '../_shared/public-security.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const DEFAULT_RESET_REDIRECT_TO = Deno.env.get('ADMIN_RESET_REDIRECT_TO') || 'buddybalance://reset-password';
const ADMIN_ALLOWED_ORIGINS = parseList(
  Deno.env.get('ADMIN_ALLOWED_ORIGINS') || 'https://buddybalance.net,https://www.buddybalance.net',
);
const ADMIN_ALLOWED_RESET_REDIRECTS = parseList(
  Deno.env.get('ADMIN_ALLOWED_RESET_REDIRECTS') ||
    `${DEFAULT_RESET_REDIRECT_TO},https://buddybalance.net/reset-password,https://www.buddybalance.net/reset-password`,
);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function json(body: Record<string, unknown>, origin: string, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(origin, ADMIN_ALLOWED_ORIGINS),
      'Content-Type': 'application/json',
    },
  });
}

function parseBearerToken(req: Request) {
  const header = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return header.slice(7).trim();
}

async function assertAdmin(authToken: string) {
  if (!authToken) {
    throw new HttpError('Missing admin access token.', 401);
  }

  const { data, error } = await supabaseAdmin.auth.getUser(authToken);
  if (error || !data.user?.id) {
    throw new HttpError('Unauthorized', 401);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    throw new HttpError(profileError.message, 500);
  }

  const normalizedRole = String(profile?.role || '').toLowerCase().trim();
  if (normalizedRole !== 'admin' && normalizedRole !== 'administrator') {
    throw new HttpError('Unauthorized', 403);
  }

  return data.user.id;
}

Deno.serve(async (req) => {
  const origin = getRequestOrigin(req);

  if (req.method === 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin, ADMIN_ALLOWED_ORIGINS)) {
      return json({ error: 'Origin not allowed.' }, origin, 403);
    }

    return new Response('ok', { headers: getCorsHeaders(origin, ADMIN_ALLOWED_ORIGINS) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, origin, 405);
  }

  if (origin && !isAllowedOrigin(origin, ADMIN_ALLOWED_ORIGINS)) {
    return json({ error: 'Origin not allowed.' }, origin, 403);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Missing Supabase function secrets.' }, origin, 500);
  }

  try {
    const adminUserId = await assertAdmin(parseBearerToken(req));
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').trim();

    if (action === 'send_password_reset') {
      const email = String(body?.email || '').trim().toLowerCase();
      const redirectTo = String(body?.redirectTo || DEFAULT_RESET_REDIRECT_TO).trim() || DEFAULT_RESET_REDIRECT_TO;

      if (!email) {
        return json({ error: 'Missing email.' }, origin, 400);
      }

      if (!EMAIL_PATTERN.test(email)) {
        return json({ error: 'Invalid email address.' }, origin, 400);
      }

      if (!isAllowedRedirect(redirectTo, ADMIN_ALLOWED_RESET_REDIRECTS)) {
        return json({ error: 'Reset redirect is not allowed.' }, origin, 400);
      }

      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        return json({ error: error.message }, origin, 500);
      }

      return json({
        ok: true,
        action,
        email,
        redirectTo,
      }, origin);
    }

    if (action === 'delete_user') {
      const userId = String(body?.userId || '').trim();
      if (!userId) {
        return json({ error: 'Missing userId.' }, origin, 400);
      }
      if (userId === adminUserId) {
        return json({ error: 'Admins cannot delete their own account here.' }, origin, 400);
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        return json({ error: error.message }, origin, 500);
      }

      return json({
        ok: true,
        action,
        userId,
      }, origin);
    }

    return json({ error: 'Unsupported action.' }, origin, 400);
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, origin, error.status);
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, origin, 500);
  }
});
