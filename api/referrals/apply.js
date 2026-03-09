const {
  getJsonBody,
  normalizeReferralRewardPayload,
  requireUser,
  sendJson,
} = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const auth = await requireUser(req, res);
  if (!auth) {
    return;
  }

  const body = getJsonBody(req);
  const code = String(body.code || '').trim().toUpperCase();
  if (!code) {
    return sendJson(res, 400, { error: 'Invite code is required.' });
  }

  const { data, error } = await auth.supabase.rpc('apply_invitation_code', {
    p_code: code,
  });

  if (error) {
    return sendJson(res, 400, { error: error.message });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return sendJson(res, 200, normalizeReferralRewardPayload(row));
};
