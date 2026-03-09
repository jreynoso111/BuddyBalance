const { getJsonBody, requireUser, sendJson } = require('./_lib/supabase');

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
  const message = String(body.message || '').trim();
  if (!message) {
    return sendJson(res, 400, { error: 'Message is required.' });
  }

  const { error } = await auth.supabase.from('support_messages').insert([
    {
      user_id: auth.user.id,
      channel: 'in_app',
      subject: String(body.subject || '').trim() || null,
      message,
      status: 'open',
    },
  ]);

  if (error) {
    return sendJson(res, 400, { error: error.message });
  }

  return sendJson(res, 200, { ok: true });
};
