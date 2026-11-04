const { chatTable, guard } = require('./_lib');

// Creates the chat-log data table in n8n if it does not exist yet.
module.exports = guard(async (req, res) => {
  const id = await chatTable({ create: true });
  res.status(200).json({ ok: true, chatTableId: id });
}, 'POST');
