const { getJsonBody, requireUser, sendJson } = require('./_lib/supabase');

const isMissingDefaultLanguageColumn = (message) =>
  String(message || '').toLowerCase().includes('default_language');
const isMissingAvatarUrlColumn = (message) =>
  String(message || '').toLowerCase().includes('avatar_url');
const isMissingFriendCodeColumn = (message) =>
  String(message || '').toLowerCase().includes('friend_code');

const fullFields =
  'full_name, email, phone, currency_default, default_language, avatar_url, friend_code, plan_tier, premium_referral_expires_at';

async function loadProfile(auth) {
  let { data, error } = await auth.supabase.from('profiles').select(fullFields).eq('id', auth.user.id).maybeSingle();

  if (
    error &&
    (isMissingDefaultLanguageColumn(error.message) ||
      isMissingAvatarUrlColumn(error.message) ||
      isMissingFriendCodeColumn(error.message))
  ) {
    const fallbackFields = [
      'full_name',
      'email',
      'phone',
      'currency_default',
      'plan_tier',
      'premium_referral_expires_at',
      ...(isMissingDefaultLanguageColumn(error.message) ? [] : ['default_language']),
      ...(isMissingAvatarUrlColumn(error.message) ? [] : ['avatar_url']),
      ...(isMissingFriendCodeColumn(error.message) ? [] : ['friend_code']),
    ].join(', ');

    const fallback = await auth.supabase
      .from('profiles')
      .select(fallbackFields)
      .eq('id', auth.user.id)
      .maybeSingle();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    const bootstrap = await auth.supabase
      .from('profiles')
      .upsert(
        {
          id: auth.user.id,
          full_name: String(auth.user.user_metadata?.full_name || '').trim() || null,
          email: auth.user.email || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select(fullFields)
      .maybeSingle();

    if (bootstrap.error) {
      throw bootstrap.error;
    }

    data = bootstrap.data;
  }

  let resolvedFriendCode = String(data?.friend_code || '').trim();
  if (!resolvedFriendCode) {
    const ensuredCode = await auth.supabase.rpc('ensure_my_friend_code');
    if (!ensuredCode.error) {
      resolvedFriendCode = String(ensuredCode.data || '').trim();
    }
  }

  return {
    ...data,
    friend_code: resolvedFriendCode,
  };
}

async function updateProfile(auth, payload) {
  const patch = {
    full_name: payload.full_name ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? auth.user.email ?? null,
    currency_default: payload.currency_default || 'USD',
    default_language: payload.default_language || null,
    avatar_url: payload.avatar_url ?? null,
    updated_at: payload.updated_at || new Date().toISOString(),
  };

  let languageSavedWithFallback = false;
  let avatarSavedWithFallback = false;
  let { error } = await auth.supabase.from('profiles').update(patch).eq('id', auth.user.id);

  if (error && (isMissingDefaultLanguageColumn(error.message) || isMissingAvatarUrlColumn(error.message))) {
    languageSavedWithFallback = isMissingDefaultLanguageColumn(error.message);
    avatarSavedWithFallback = isMissingAvatarUrlColumn(error.message);

    const fallbackPatch = { ...patch };
    if (languageSavedWithFallback) {
      delete fallbackPatch.default_language;
    }
    if (avatarSavedWithFallback) {
      delete fallbackPatch.avatar_url;
    }

    const fallback = await auth.supabase.from('profiles').update(fallbackPatch).eq('id', auth.user.id);
    error = fallback.error;
  }

  if (error) {
    throw error;
  }

  return {
    languageSavedWithFallback,
    avatarSavedWithFallback,
  };
}

module.exports = async function handler(req, res) {
  const auth = await requireUser(req, res);
  if (!auth) {
    return;
  }

  try {
    if (req.method === 'GET') {
      const profile = await loadProfile(auth);
      return sendJson(res, 200, profile);
    }

    if (req.method === 'PUT') {
      const result = await updateProfile(auth, getJsonBody(req));
      return sendJson(res, 200, result);
    }

    res.setHeader('Allow', 'GET, PUT');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || 'Profile request failed.' });
  }
};
