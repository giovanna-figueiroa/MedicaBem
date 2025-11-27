# Gmail Setup Guide (Nodemailer)

Este guia detalha como configurar **Gmail** para enviar e-mails automáticos (relatórios semanais, notificações, etc.) do seu app de medicamentos.

## Por Que Gmail?

- ✅ Grátis
- ✅ Fácil de configurar
- ✅ Suporta até 500 e-mails/dia em modo trial
- ✅ Confiável para produção
- ⚠️ Requer "App Password" (não sua senha regular)

## Passos para Configurar

### 1️⃣ Habilitar Autenticação em Duas Etapas (2FA)

1. Acesse https://myaccount.google.com/
2. Vá em **Segurança** (lado esquerdo)
3. Procure por **Autenticação em duas etapas**
4. Clique em **Ativar** e siga os passos (pode usar SMS ou app de autenticação)
5. Confirme que está ativada

⚠️ **Importante**: Sem 2FA, você não conseguirá gerar App Password.

### 2️⃣ Gerar App Password

1. Acesse https://myaccount.google.com/ novamente
2. Vá em **Segurança**
3. Procure por **Senhas de app** (só aparece se tiver 2FA ativado)
4. Clique em **Senhas de app**
5. Selecione:
   - **Aplicativo**: Mail (ou escolha uma)
   - **Dispositivo**: Windows PC (ou seu SO)
6. Clique em **Gerar**
7. Google gerará uma senha (ex. `ksjd owep ytms qwer`) — **copie esta senha**

⚠️ **Importante**: 
- Esta NÃO é sua senha do Gmail regular
- Coloque espaços ou não — o Gmail aceita ambos
- Copie e guarde em segurança

### 3️⃣ Preencher `server/.env`

```env
GMAIL_USER=seu-email@gmail.com
GMAIL_PASSWORD=ksjd owep ytms qwer   # A senha de app que você acabou de gerar
```

**Exemplos**:
```env
GMAIL_USER=joao.silva@gmail.com
GMAIL_PASSWORD=abcd efgh ijkl mnop

# ou sem espaços:
GMAIL_PASSWORD=abcdefghijklmnop
```

### 4️⃣ Reiniciar o Servidor

```powershell
cd server
npm run dev
```

Você deve ver no console:
```
Server listening on port 3001
Available endpoints:
  POST /api/send-email           — Send email via Gmail
  POST /api/send-weekly-report   — Send weekly adherence report
  ...
```

### 5️⃣ Testar via cURL

```powershell
curl -X POST http://localhost:3001/api/send-email `
  -H "Content-Type: application/json" `
  -d '{
    "to": "seu-email-pessoal@gmail.com",
    "subject": "Teste de E-mail",
    "html": "<h1>Olá!</h1><p>Este é um teste de envio de e-mail.</p>"
  }'
```

Você deve receber um e-mail em alguns segundos!

Resposta esperada:
```json
{
  "success": true,
  "provider": "gmail",
  "messageId": "<...",
  "response": "250 2.0.0 OK"
}
```

### 6️⃣ Testar Relatório Semanal via cURL

```powershell
curl -X POST http://localhost:3001/api/send-weekly-report `
  -H "Content-Type: application/json" `
  -d '{
    "caregiverEmail": "seu-email-pessoal@gmail.com",
    "patientName": "João Silva",
    "weeklyAdherence": 85,
    "weeklyData": {
      "2025-11-24": { "taken": 4, "scheduled": 4 },
      "2025-11-25": { "taken": 3, "scheduled": 4 },
      "2025-11-26": { "taken": 4, "scheduled": 4 }
    }
  }'
```

Você deve receber um e-mail formatado com o relatório!

### 7️⃣ Testar no App (UI)

1. Abra o app em `http://localhost:5174`
2. Vá para a aba **Cuidadores**
3. Clique em **Novo Cuidador**
4. Preencha:
   - **Nome**: ex. "Maria"
   - **E-mail**: o e-mail do cuidador (ex. `maria@gmail.com`)
   - **Telefone**: número (se quiser SMS/WhatsApp também)
   - **Tipo de Notificação**: SMS ou WhatsApp
5. Clique em **Adicionar**
6. Na lista, procure o cuidador e clique em **📧 Enviar Relatório** (se implementado)

O cuidador receberá um e-mail com o relatório formatado!

## Troubleshooting

| Problema | Solução |
|----------|---------|
| "Gmail not configured" | Verificar se `GMAIL_USER` e `GMAIL_PASSWORD` estão preenchidos em `server/.env` e reiniciar servidor |
| "Invalid login credentials" | App Password está correta? Não é sua senha regular do Gmail? |
| E-mail não chega | Verificar pasta de spam / lixo; confirmar que o Gmail foi ativado e 2FA está ligado |
| "Failed: 534" | Significa que Google bloqueou o acesso (senha incorreta ou app não autorizado). Gere uma nova App Password |
| "Failed: 535" | Credenciais inválidas. Verifique `GMAIL_USER` e `GMAIL_PASSWORD` |

## Limites e Considerações

- **500 e-mails/dia**: Limite padrão para contas Gmail (normalmente suficiente)
- **Relatórios**: Use `POST /api/send-weekly-report` para gerar relatórios formatados
- **Notificações**: Combine com SMS/WhatsApp para cobertura total
- **Template**: Relatórios usam HTML. Você pode customizar o template em `server/index.js`

## Melhorias Futuras

1. **Agendamento automático**: Usar cron jobs (`node-cron`) para enviar relatórios toda segunda-feira
2. **Notificações de relembretes**: Enviar e-mail quando dose não for tomada
3. **Arquivos anexados**: Enviar relatórios como PDF/Excel
4. **Múltiplos cuidadores**: Enviar relatórios para vários cuidadores em paralelo
5. **Temas customizados**: Deixar pacientes escolherem temas de e-mail

## Recursos Oficiais

- [Google App Passwords](https://support.google.com/accounts/answer/185833)
- [Nodemailer Gmail](https://nodemailer.com/smtp/gmail/)
- [Gmail API vs Nodemailer](https://stackoverflow.com/questions/16512592)

---

**Próximo passo**: Configure Gmail, reinicie o servidor, e teste um envio via cURL ou UI do app! 🚀
