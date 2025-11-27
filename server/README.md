# Server for Gerenciador de Medicamentos

This small Express server provides a `/api/send-sms` endpoint that forwards SMS/WhatsApp messages to Twilio.

Setup

1. Copy `.env.example` to `.env` and fill the `TWILIO_*` variables.
2. Install dependencies:

```powershell
cd server
npm install
```

3. Run the server:

```powershell
npm run dev
# or
npm start
```

API

POST /api/send-sms
Body JSON:

```json
{
  "to": "+5511999999999",
  "message": "Teste",
  "channel": "sms" // or "whatsapp"
}
```

Returns JSON with `success` and `sid` (Twilio message SID) on success.
