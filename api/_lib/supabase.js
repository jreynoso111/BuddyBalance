const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') {
    return null;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function createAuthedClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
}

async function requireUser(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    sendJson(res, 401, { error: 'Missing authorization token.' });
    return null;
  }

  const supabase = createAuthedClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    sendJson(res, 401, { error: error?.message || 'Unauthorized.' });
    return null;
  }

  return { supabase, user, token };
}

function normalizeInviteSummary(row) {
  if (!row) {
    return null;
  }

  return {
    inviteCode: String(row.invite_code || '').trim(),
    referralCount: Number(row.referral_count || 0),
    referralsUntilNextReward: Number(row.referrals_until_next_reward || 3),
    nextRewardAtUses: Number(row.next_reward_at_uses || 3),
    rewardCyclesAwarded: Number(row.reward_cycles_awarded || 0),
    premiumReferralExpiresAt: row.premium_referral_expires_at || null,
    referredByUserId: row.referred_by_user_id || null,
    referredByCode: row.referred_by_code || null,
    hasUnseenReward: Boolean(row.has_unseen_reward),
    latestRewardAt: row.latest_reward_at || null,
  };
}

function normalizePendingCelebration(row) {
  if (!row) {
    return null;
  }

  const source = String(row.source || '').trim();
  if (!['referral', 'purchase', 'admin'].includes(source)) {
    return null;
  }

  return {
    source,
    grantedAt: row.granted_at || null,
    premiumReferralExpiresAt: row.premium_referral_expires_at || null,
    referralCount: Number(row.referral_count || 0),
    rewardMonths: Number(row.reward_months || 0),
    hasPending: Boolean(row.has_pending),
  };
}

function normalizeReferralRewardPayload(row) {
  if (!row) {
    return null;
  }

  return {
    rewardMonths: Number(row.reward_months || 0),
    referralCount: Number(row.referral_count || 0),
    premiumExpiresAt: row.premium_expires_at || null,
  };
}

function getJsonBody(req) {
  if (!req.body) {
    return {};
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

module.exports = {
  getJsonBody,
  normalizeInviteSummary,
  normalizePendingCelebration,
  normalizeReferralRewardPayload,
  requireUser,
  sendJson,
};
