const { requireUser, sendJson } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const auth = await requireUser(req, res);
  if (!auth) {
    return;
  }

  const { error } = await auth.supabase.rpc('mark_premium_celebration_seen');
  if (error) {
    return sendJson(res, 400, { error: error.message });
  }

  return sendJson(res, 200, { ok: true });
};
