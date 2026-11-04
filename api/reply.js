const { n8n, chatTable, guard } = require('./_lib');

// Sends a WhatsApp message straight to the customer and logs it.
// It never touches the whatsapp_handoffs table, so the team's open/closed
// handoff state and their alerts are not affected.
module.exports = guard(async (req, res) => {
  const { to, text, name } = req.body || {};
  const msg = String(text || '').trim();
  if (!/^\d{8,15}$/.test(String(to || '')) || !msg) {
    return res.status(400).json({ error: 'Valid "to" number and non-empty "text" are required' });
  }
  const r = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: String(to),
        type: 'text',
        text: { body: msg.slice(0, 4000) },
      }),
    }
  );
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    return res.status(502).json({
      error: body?.error?.message || 'WhatsApp rejected the message',
      hint: 'Free-text replies only work within 24h of the customer last messaging you.',
    });
  }
  const cId = await chatTable({ create: true });
  if (cId) {
    await n8n(`/data-tables/${cId}/rows`, {
      method: 'POST',
      body: JSON.stringify({
        data: [{
          customer_phone: String(to),
          customer_name: String(name || ''),
          direction: 'out',
          sender: 'admin',
          text: msg.slice(0, 4000),
        }],
        returnType: 'count',
      }),
    });
  }
  res.status(200).json({ ok: true });
}, 'POST');
