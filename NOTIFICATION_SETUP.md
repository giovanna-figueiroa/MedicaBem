# Guia de Setup de Notificações

Este arquivo documenta como configurar e usar o sistema de notificações de SMS e WhatsApp no app de gerenciamento de medicamentos.

## Visão Geral

O app suporta envio de notificações e relatórios para cuidadores via:
- **SMS** (SMS tradicional)
- **WhatsApp** (via WhatsApp Business Cloud API ou Twilio)

O backend (`server/`) atua como intermediário, gerenciando as credenciais e fazendo chamadas à API de cada provedor.

## Opções de Provedor

### Opção 1: Twilio (SMS + WhatsApp)
- **Provedor**: Twilio
- **Canais suportados**: SMS e WhatsApp
- **Prós**: Fácil de configurar, suporta ambos os canais, webhook integrado
- **Contras**: Requer conta paga (trial limitado), custos por mensagem
- **Setup**: Ver `server/.env.example` — preencha `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### Opção 2: WhatsApp Business Cloud API (Oficial Meta)
- **Provedor**: Meta/Facebook
- **Canais suportados**: WhatsApp apenas
- **Prós**: Oficial (não viola ToS), escalável, acesso a templates e mídia
- **Contras**: Requer configuração no Meta for Developers, mais steps de setup
- **Setup**: Ver `server/WHATSAPP_CLOUD_API_SETUP.md` — preencha `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`

### Opção 3: Ambos (Twilio como fallback)
- Configure tanto Twilio quanto WhatsApp Cloud API
- O backend escolhe automaticamente WhatsApp Cloud API se disponível; fallback para Twilio se não

## Como Configurar

### Passo 1: Configurar o Backend

1. Copie `server/.env.example` para `server/.env`:
   ```powershell
   cd server
   Copy-Item .env.example .env
   ```

2. Escolha uma ou mais opções:

   **Se usar Twilio:**
   - Acesse https://www.twilio.com e crie uma conta
   - Copie `Account SID` e `Auth Token` do console Twilio
   - Compre um número Twilio (ou use o de teste)
   - Preencha em `server/.env`:
     ```env
     TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     TWILIO_AUTH_TOKEN=your_auth_token_here
     TWILIO_PHONE_NUMBER=+12345678900
     ```

   **Se usar WhatsApp Business Cloud API:**
   - Siga o guia completo em `server/WHATSAPP_CLOUD_API_SETUP.md`
   - Preencha em `server/.env`:
     ```env
     WHATSAPP_PHONE_NUMBER_ID=123456789123456789
     WHATSAPP_ACCESS_TOKEN=EAAbsBCS1iio...
     WHATSAPP_VERIFY_TOKEN=my_voice_is_my_password_verify_me
     ```

### Passo 2: Instalar Dependências e Rodar Server

```powershell
cd server
npm install
npm run dev
```

Você deve ver:
```
Server listening on port 3001
Available endpoints:
  POST /api/send-notification  — Send SMS or WhatsApp
  POST /api/send-sms (legacy)
  GET  /api/status              — Check server & providers
  POST /api/webhook/whatsapp   — Meta webhook (status updates)
  GET  /api/webhook/whatsapp   — Webhook verification
```

### Passo 3: Configurar Frontend

O frontend já está configurado para chamar `VITE_API_BASE_URL`. Verifique `.env` na raiz:

```env
VITE_API_BASE_URL=http://localhost:3001
```

### Passo 4: Rodar Frontend

```powershell
npm run dev
```

O app estará disponível em `http://localhost:5173` (ou a porta indicada).

## Testando Notificações

### Via App UI

1. Vá para a aba **Cuidadores**
2. Clique em **Novo Cuidador**
3. Preencha:
   - **Nome**: ex. "João"
   - **Telefone**: seu número no formato E.164 (ex. `+5511999999999`)
   - **Tipo de Notificação**: escolha **SMS** ou **WhatsApp**
4. Clique em **Adicionar**
5. Na lista de cuidadores, clique no botão **🧪 Testar** ao lado do cuidador
6. Você deve receber um SMS ou WhatsApp em seu telefone

### Via cURL (comando manual)

```bash
# Testar SMS via Twilio
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511999999999",
    "message": "Teste de SMS",
    "channel": "sms"
  }'

# Testar WhatsApp (auto-seleciona provedor)
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511999999999",
    "message": "Teste de WhatsApp",
    "channel": "whatsapp"
  }'

# Forçar WhatsApp via Twilio
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511999999999",
    "message": "Teste",
    "channel": "whatsapp",
    "provider": "twilio"
  }'
```

### Verificar Status do Server

```bash
curl http://localhost:3001/api/status
```

Resposta esperada:
```json
{
  "server": "running",
  "port": 3001,
  "providers": {
    "twilio": true,
    "whatsapp_cloud_api": false
  },
  "timestamp": "2025-11-27T14:30:00.000Z"
}
```

## Troubleshooting

### "Notification send failed" no app

1. Verifique se o servidor está rodando: `npm run dev` em `server/`
2. Confira se o `.env` do server foi criado e preenchido corretamente
3. Verifique se `VITE_API_BASE_URL` no `.env` da raiz aponta para o servidor correto
4. Abra o console do navegador (F12) e veja se há erros de rede

### "Twilio not configured"

- Verifique `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` em `server/.env`
- Reinicie o servidor: `npm run dev`

### "WhatsApp not configured"

- Verifique `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN` em `server/.env`
- O token expirou? Gere um novo (veja `server/WHATSAPP_CLOUD_API_SETUP.md`)
- Reinicie o servidor

### Mensagem não chega (SMS/WhatsApp)

**Para SMS/WhatsApp via Twilio:**
- Número de destinatário está em E.164? (ex. `+5511999999999`)
- Você tem crédito/trial ativo no Twilio?
- Verifique os logs do Twilio console

**Para WhatsApp via Cloud API:**
- Seu número foi aprovado e está ativo no Meta?
- O destinatário recebeu já a mensagem antes? (primeira mensagem é tratada como "initial contact")
- Verifique os logs no Meta for Developers console

### Webhook não funciona

- Se configurou webhook no Meta, precisa de endpoint HTTPS público
- Para desenvolvimento local, use **ngrok**: 
  ```bash
  ngrok http 3001
  ```
- Configure o URL do webhook como: `https://seu-ngrok-url.ngrok.io/api/webhook/whatsapp`
- Verifique `WHATSAPP_VERIFY_TOKEN` — deve corresponder ao token no Meta

## Estrutura de Código Relevante

### Frontend
- `src/services/caregiverService.ts` — `sendNotification(caregiver, message)`
- `src/components/CaregiverManagement.tsx` — UI para cadastro e teste de cuidadores

### Backend
- `server/index.js` — Adapters para Twilio e WhatsApp Cloud API; endpoints
- `server/.env.example` — Template de variáveis de ambiente
- `server/WHATSAPP_CLOUD_API_SETUP.md` — Guia de setup Cloud API

## Próximos Passos

1. **Escalação**: Implementar fila de notificações (BullMQ, Redis) para envios em massa
2. **Templates**: Usar templates pré-aprovados do WhatsApp para mensagens fora da janela 24h
3. **Webhooks**: Processar callbacks (delivered, read, failed) e atualizar banco de dados
4. **Agendamento**: Cron jobs automáticos para lembretes diários
5. **Analytics**: Dashboard de notificações enviadas, taxa de entrega, etc.

---

**Última atualização**: Novembro 2025
