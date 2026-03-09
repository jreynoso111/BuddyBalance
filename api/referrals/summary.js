const { normalizeInviteSummary, requireUser, sendJson } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const auth = await requireUser(req, res);
  if (!auth) {
    return;
  }

  const { data, error } = await auth.supabase.rpc('get_my_invite_summary');
  if (error) {
    return sendJson(res, 400, { error: error.message });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return sendJson(res, 200, normalizeInviteSummary(row));
};
