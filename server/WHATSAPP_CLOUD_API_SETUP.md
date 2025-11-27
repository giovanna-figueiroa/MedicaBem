# WhatsApp Business Cloud API Setup Guide

Este guia detalha os passos para configurar o **WhatsApp Business Cloud API** (Meta) para enviar mensagens de WhatsApp pelo backend do seu app de medicamentos.

## Visão Geral

A **WhatsApp Business Cloud API** é a forma oficial de enviar mensagens via WhatsApp programaticamente. Você:
1. Cria um App no Meta for Developers
2. Adiciona a plataforma WhatsApp ao app
3. Obtém `Phone Number ID` e `Access Token`
4. Configura um webhook para receber callbacks (delivery status, etc.)
5. Compra/ativa um número de telefone para enviar mensagens

## Passos Detalhados

### 1. Acessar Meta for Developers

1. Acesse [https://developers.facebook.com](https://developers.facebook.com)
2. Faça login com sua conta Meta (Facebook/Instagram) ou crie uma nova
3. Clique em **My Apps** (canto superior direito)
4. Clique em **Create App**

### 2. Criar um Novo App

1. Escolha **App Type**: selecione **Business** (não Personal)
2. Preencha os detalhes:
   - **App Name**: ex. "Gerenciador de Medicamentos Bot"
   - **App Purpose**: ex. "Health notifications via WhatsApp"
3. Clique em **Create App**
4. Confirme as verificações de segurança (CAPTCHA, etc.)

### 3. Adicionar WhatsApp ao App

1. No dashboard do app, vá em **Add Products**
2. Procure por **WhatsApp** e clique em **Set Up**
3. Escolha o tipo de conta:
   - **WhatsApp Business Account**: (recomendado para negócios/produção)
   - Ou crie uma nova

### 4. Obter Credenciais Iniciais

1. Vá para **WhatsApp > Getting started**
2. Você verá um número de teste (ex. `+1234567890`) — use este para primeiros testes
3. Na aba **API Setup**, você verá:
   - **Phone Number ID** (ex. `1234567890123456789`)
   - Clique em **Generate Token** ou use um existing token
   - **Temporary Access Token** aparecerá (válido por ~ 24h)

### 5. Obter Token Permanente

Tokens temporários expiram. Para um token permanente (para produção):

1. Vá para **Settings > User roles** no Meta for Developers
2. Crie um **System User**:
   - Nome: ex. "WhatsApp Bot User"
   - Role: escolha uma role que tenha acesso a WhatsApp (ex. Admin)
3. Vá para **Apps & Assets > User Roles**
4. Atribua o System User ao seu app
5. Gere um **Permanent Access Token**:
   - Clique em **Generate Token** para o System User
   - Copie o token (não expira, a menos que revogado)

### 6. Comprar/Ativar Número de Telefone

1. Vá para **WhatsApp > Phone numbers**
2. Clique em **Add or purchase a phone number**
3. Escolha um número (alguns são gratuitos para teste; alguns requerem pagamento)
4. Complete a verificação de identidade/negócio se necessário
5. Aguarde aprovação (pode levar 24-48h)
6. Após aprovação, o número estará ativo; note o **Phone Number ID** (diferente do número real)

### 7. Configurar Webhook (Opcional, mas Recomendado)

Para receber callbacks quando mensagens são entregues/lidas/falharem:

1. Vá para **Settings > Configuration**
2. Na seção **Webhook URL**:
   - **Callback URL**: `https://seu-dominio.com/api/webhook/whatsapp`
   - **Verify Token**: (você define um string, ex. `my_voice_is_my_password_verify_me`)
   - Clique em **Verify and Save**
3. Meta enviará um GET request para validar seu endpoint

**Nota**: Para desenvolvimento local, você pode usar **ngrok** para expor seu server:
```bash
ngrok http 3001
```
Então use `https://seu-ngrok-url.ngrok.io/api/webhook/whatsapp` como URL de callback.

### 8. Preencher `server/.env`

Copie `server/.env.example` para `server/.env` e preencha:

```env
# ===== TWILIO (opcional, para fallback SMS/WhatsApp via Twilio) =====
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# ===== WHATSAPP BUSINESS CLOUD API =====
WHATSAPP_PHONE_NUMBER_ID=1234567890123456789   # Copy from Meta for Developers
WHATSAPP_ACCESS_TOKEN=EAABsBCS1234...           # Permanent access token
WHATSAPP_VERIFY_TOKEN=my_voice_is_my_password_verify_me  # Your webhook verification token

PORT=3001
```

### 9. Instalar Dependências e Rodar Server

```powershell
cd server
npm install  # instala axios (necessário para Cloud API)
npm run dev
```

O servidor deve logar:
```
Server listening on port 3001
Available endpoints:
  POST /api/send-notification  — Send SMS or WhatsApp
  ...
```

### 10. Testar Envio

Use a API `POST /api/send-notification` com o canal `whatsapp`:

```bash
curl -X POST http://localhost:3001/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511999999999",
    "message": "Olá! Este é um teste do bot de WhatsApp.",
    "channel": "whatsapp",
    "provider": "whatsapp_cloud_api"
  }'
```

Resposta esperada:
```json
{
  "success": true,
  "provider": "whatsapp_cloud_api",
  "messageId": "wamid.xxx...",
  "rawResponse": { ... }
}
```

### 11. Testar no App (Frontend)

1. Certifique-se de que o frontend está configurado para chamar o backend:
   - Verifique `VITE_API_BASE_URL=http://localhost:3001` no arquivo `.env` da raiz do projeto
2. Vá para a aba **Cuidadores** no app
3. Cadastre um cuidador com:
   - Nome: ex. "João"
   - Telefone: seu número no formato E.164 (ex. `+5511999999999`)
   - Notification Type: **WhatsApp** (ou SMS)
4. Clique em **🧪 Testar** para enviar uma mensagem de teste
5. Você deve receber um WhatsApp em seu telefone

## Troubleshooting

### "WhatsApp not configured"
- Verifique `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN` em `server/.env`
- Token expirou? Gere um novo permanente (veja passo 5)

### Mensagem não chega
- Verificou o número do destinatário está em E.164? (ex. `+5511999999999`)
- Seu número (no Meta) está **ativo** e **verificado**?
- Cheque os **Message Logs** no dashboard do Meta para ver erros

### Webhook não é validado
- `WHATSAPP_VERIFY_TOKEN` em `.env` corresponde ao token configurado no Meta?
- Seu endpoint é acessível publicamente? (Use ngrok se desenvolver localmente)

### Token inválido / expirado
- Tokens temporários expiram em ~24h
- Use um **Permanent Access Token** (criado via System User)

## Recursos Oficiais

- [WhatsApp Business Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Getting Started with WhatsApp](https://developers.facebook.com/docs/whatsapp/getting-started)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates) (para mensagens fora da janela 24h)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/webhooks)

## Próximos Passos (Opcional)

1. **Message Templates**: Para enviar mensagens fora da janela de 24h, use templates pré-aprovados.
2. **Media Messages**: Enviar imagens, vídeos, PDFs, etc.
3. **Interactive Messages**: Botões, menus, etc.
4. **Webhooks & Status Tracking**: Processar callbacks (delivered, read, failed).
5. **Rate Limiting**: Meta impõe limites de envio; monitore quotas no dashboard.

---

**Última atualização**: Novembro 2025
