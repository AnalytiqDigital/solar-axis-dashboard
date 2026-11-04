const { n8n, handoffTable, guard } = require('./_lib');

// Marks every open handoff for a customer as closed. Only the status column
// changes; no message is sent to the customer.
module.exports = guard(async (req, res) => {
  const { phone } = req.body || {};
  if (!/^\d{8,15}$/.test(String(phone || ''))) {
    return res.status(400).json({ error: 'Valid "phone" is required' });
  }
  const table = await handoffTable();
  await n8n(`/data-tables/${table}/rows/update`, {
    method: 'PATCH',
    body: JSON.stringify({
      filter: {
        type: 'and',
        filters: [
          { columnName: 'customer_phone', condition: 'eq', value: String(phone) },
          { columnName: 'status', condition: 'eq', value: 'open' },
        ],
      },
      data: { status: 'closed' },
    }),
  });
  res.status(200).json({ ok: true });
}, 'POST');
