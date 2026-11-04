const { handoffTable, chatTable, allRows, guard } = require('./_lib');

module.exports = guard(async (req, res) => {
  const hId = await handoffTable();
  const cId = await chatTable();
  const [handoffs, messages] = await Promise.all([
    allRows(hId, 1000),
    cId ? allRows(cId, 3000) : Promise.resolve([]),
  ]);
  res.status(200).json({ handoffs, messages, chatLogReady: Boolean(cId), now: new Date().toISOString() });
}, 'GET');
