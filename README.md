# Solar Axis chat dashboard

Standalone Vercel project. It reads the n8n data tables, alerts you on every AI handoff,
shows every chat with history, and lets you reply to customers directly.

## What it never touches
Replies go straight to WhatsApp and are logged in a separate table. The dashboard never writes to
`whatsapp_handoffs`, so the team's open/closed state and their alerts keep working unchanged.

## Deploy
1. Push this folder to a repo (or `vercel` from this folder). No build step is needed.
2. Add these environment variables in Vercel:

| Name | Value |
|---|---|
| `DASHBOARD_PASSWORD` | the password you choose for the dashboard |
| `N8N_BASE_URL` | `https://b49axc8r.rpcld.cc` |
| `N8N_API_KEY` | n8n → Settings → n8n API → create key |
| `WHATSAPP_PHONE_NUMBER_ID` | `1300630206478052` |
| `WHATSAPP_TOKEN` | permanent Meta access token for the Solar Axis app |
| `DATA_TABLE_ID` | optional, id of `whatsapp_handoffs` (`kz1nkyB7jYxofc0m`) |
| `CHAT_TABLE_ID` | optional, id of `whatsapp_chat_log` (`j1KzMvZXv0VQ6HZM`; found by name if empty) |

3. Open the site and sign in. Allow browser notifications, and keep the tab open for sound alerts.

## Chat history
History comes from the `whatsapp_chat_log` data table (customer_phone, customer_name, direction, sender, text).
The workflow logs customer messages, AI replies and team replies into it; dashboard replies are logged by the dashboard.
Until the workflow logs to it, chats show only the last message stored in `whatsapp_handoffs`.
`POST /api/setup` (with the `x-dashboard-password` header) creates the table if it does not exist.

## Notes
- Free-text replies only work within 24h of the customer's last message; the dashboard warns you.
- Alerts check every 10 seconds while the page is open.
- The n8n Data Tables API calls are written from the documented API; verify after the first deploy.
