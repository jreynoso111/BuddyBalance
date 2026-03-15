import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

export type TurnstileVerificationResponse = {
  action?: string;
  hostname?: string;
  success?: boolean;
  ['error-codes']?: string[];
};

type RateLimitRpcRow = {
  allowed: boolean;
  remaining: number | null;
  retry_after_ms: number | null;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

let rateLimitClient: ReturnType<typeof createClient> | null = null;

export function parseList(raw: string) {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getRequestOrigin(req: Request) {
  const origin = req.headers.get('origin') || '';
  if (!origin) return '';

  try {
    return new URL(origin).origin;
  } catch {
    return '';
  }
}

export function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  return Boolean(origin) && allowedOrigins.includes(origin);
}

export function getCorsHeaders(origin: string, allowedOrigins: string[]) {
  const allowOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] || 'https://buddybalance.net';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(body: Record<string, unknown>, options?: {
  allowedOrigins?: string[];
  origin?: string;
  status?: number;
}) {
  const allowedOrigins = options?.allowedOrigins || [];
  const origin = options?.origin || '';
  const status = options?.status ?? 200;

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(origin, allowedOrigins),
      'Content-Type': 'application/json',
    },
  });
}

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
  return forwardedFor.split(',')[0]?.trim() || '';
}

function getRateLimitClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase service role configuration for rate limiting.');
  }

  if (!rateLimitClient) {
    rateLimitClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return rateLimitClient;
}

export async function checkRateLimit(options: {
  key: string;
  maxAttempts: number;
  scope: string;
  windowMs: number;
}) {
  const client = getRateLimitClient();
  const { data, error } = await client.rpc('check_public_rate_limit', {
    p_scope: options.scope,
    p_key: options.key,
    p_max_attempts: options.maxAttempts,
    p_window_ms: options.windowMs,
  });

  if (error) {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRpcRow | null;
  if (!row || typeof row.allowed !== 'boolean') {
    throw new Error('Rate limit check returned an invalid response.');
  }

  return {
    allowed: row.allowed,
    remaining: Math.max(Number(row.remaining || 0), 0),
    retryAfterMs: row.retry_after_ms == null ? undefined : Math.max(Number(row.retry_after_ms), 0),
  };
}

export function sanitizeRetryAfterSeconds(retryAfterMs?: number) {
  if (!retryAfterMs || retryAfterMs <= 0) return '60';
  return String(Math.max(Math.ceil(retryAfterMs / 1000), 1));
}

export function isAllowedRedirect(redirectTo: string, allowedRedirects: string[]) {
  if (!redirectTo) return false;

  try {
    const normalized = new URL(redirectTo).toString();

    return allowedRedirects.some((candidate) => {
      try {
        return new URL(candidate).toString() === normalized;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export async function verifyTurnstileToken(options: {
  allowedHostnames: string[];
  expectedAction: string;
  remoteIp: string;
  secretKey: string;
  token: string;
}) {
  const payload = new URLSearchParams({
    secret: options.secretKey,
    response: options.token,
  });

  if (options.remoteIp) {
    payload.set('remoteip', options.remoteIp);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    throw new Error('Turnstile verification request failed.');
  }

  const result = (await response.json().catch(() => ({}))) as TurnstileVerificationResponse;

  if (!result.success) {
    return {
      ok: false,
      reason: 'verification_failed',
      response: result,
    };
  }

  if (result.action !== options.expectedAction) {
    return {
      ok: false,
      reason: 'action_mismatch',
      response: result,
    };
  }

  if (!result.hostname || !options.allowedHostnames.includes(result.hostname)) {
    return {
      ok: false,
      reason: 'hostname_mismatch',
      response: result,
    };
  }

  return {
    ok: true,
    response: result,
  };
}
