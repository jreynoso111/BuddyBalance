const { requireUser, sendJson } = require('./_lib/supabase');

const isMissingDefaultLanguageColumn = (message) =>
  String(message || '').toLowerCase().includes('default_language');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const auth = await requireUser(req, res);
  if (!auth) {
    return;
  }

  let { data, error } = await auth.supabase
    .from('profiles')
    .select('role, default_language, plan_tier, premium_referral_expires_at')
    .eq('id', auth.user.id)
    .single();

  if (error && isMissingDefaultLanguageColumn(error.message)) {
    const fallback = await auth.supabase
      .from('profiles')
      .select('role, plan_tier, premium_referral_expires_at')
      .eq('id', auth.user.id)
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return sendJson(res, 400, { error: error.message });
  }

  return sendJson(res, 200, data || {});
};
