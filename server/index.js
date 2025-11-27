require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SIMULATE_EMAIL = process.env.SIMULATE_EMAIL === 'true';

console.log(`\n[DEBUG] SIMULATE_EMAIL: ${SIMULATE_EMAIL}`);
console.log(`[DEBUG] GMAIL_USER: ${process.env.GMAIL_USER ? '✓ configured' : '✗ not configured'}`);
console.log(`[DEBUG] GMAIL_PASSWORD: ${process.env.GMAIL_PASSWORD ? '✓ configured' : '✗ not configured'}\n`);

// ============= ADAPTERS =============

// Gmail/Nodemailer Adapter
let emailTransporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD && !SIMULATE_EMAIL) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD // App Password for Gmail (not regular password!)
    }
  });
}

// Twilio Adapter
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// WhatsApp Business Cloud API Adapter
async function sendViaWhatsAppCloudAPI(to, message) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp Cloud API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env');
  }

  const url = `https://graph.instagram.com/v18.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: to, // recipient phone in E.164 format, e.g., +5511999999999
    type: 'text',
    text: { body: message }
  };

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.post(url, payload, { headers });
    return {
      success: true,
      provider: 'whatsapp_cloud_api',
      messageId: response.data.messages?.[0]?.id,
      rawResponse: response.data
    };
  } catch (err) {
    console.error('WhatsApp Cloud API error:', err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || err.message);
  }
}

// SMS via Twilio Adapter
async function sendViaTwilioSMS(to, message) {
  if (!twilioClient) {
    throw new Error('Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env');
  }

  try {
    const messageResponse = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    return {
      success: true,
      provider: 'twilio_sms',
      messageId: messageResponse.sid,
      rawResponse: messageResponse
    };
  } catch (err) {
    console.error('Twilio SMS error:', err.message);
    throw err;
  }
}

// WhatsApp via Twilio Adapter
async function sendViaWhatsAppTwilio(to, message) {
  if (!twilioClient) {
    throw new Error('Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env');
  }

  try {
    const messageResponse = await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`
    });
    return {
      success: true,
      provider: 'twilio_whatsapp',
      messageId: messageResponse.sid,
      rawResponse: messageResponse
    };
  } catch (err) {
    console.error('Twilio WhatsApp error:', err.message);
    throw err;
  }
}

// ============= ENDPOINTS =============

/**
 * POST /api/send-notification
 * Universal endpoint to send notifications (SMS or WhatsApp)
 * Body: { to, message, channel: "sms" | "whatsapp", provider?: "twilio" | "whatsapp_cloud_api" }
 */
app.post('/api/send-notification', async (req, res) => {
  const { to, message, channel = 'sms', provider } = req.body || {};

  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Missing `to` or `message` in request body' });
  }

  try {
    let result;

    if (channel === 'whatsapp') {
      // WhatsApp: prefer Cloud API if available, fallback to Twilio
      if (provider === 'twilio' || !process.env.WHATSAPP_ACCESS_TOKEN) {
        result = await sendViaWhatsAppTwilio(to, message);
      } else {
        result = await sendViaWhatsAppCloudAPI(to, message);
      }
    } else {
      // SMS: use Twilio
      result = await sendViaTwilioSMS(to, message);
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('Notification send error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error sending notification'
    });
  }
});

/**
 * POST /api/send-sms
 * Legacy endpoint (backward compatible)
 */
app.post('/api/send-sms', async (req, res) => {
  const { to, message, channel = 'sms' } = req.body || {};

  if (!to || !message) {
    return res.status(400).json({ success: false, message: 'Missing `to` or `message` in request body' });
  }

  try {
    let result;

    if (channel === 'whatsapp') {
      result = await sendViaWhatsAppTwilio(to, message);
    } else {
      result = await sendViaTwilioSMS(to, message);
    }

    return res.json({ success: true, sid: result.messageId });
  } catch (err) {
    console.error('SMS send error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error sending message' });
  }
});

/**
 * GET /api/status
 * Check server health and available providers
 */
app.get('/api/status', (req, res) => {
  const providers = {
    twilio: !!twilioClient,
    whatsapp_cloud_api: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
  };

  return res.json({
    server: 'running',
    port: PORT,
    providers,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/webhook/whatsapp
 * Webhook endpoint for WhatsApp Cloud API status updates (delivered, read, failed, etc.)
 * Meta will POST here when message status changes
 */
app.post('/api/webhook/whatsapp', (req, res) => {
  const body = req.body;

  // Verify webhook signature (optional but recommended for production)
  // For now, just log and acknowledge
  console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

  // Return 200 to acknowledge receipt
  return res.status(200).json({ received: true });
});

/**
 * GET /api/webhook/whatsapp
 * Verify webhook (Meta sends a challenge during setup)
 */
app.get('/api/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'my_voice_is_my_password_verify_me';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }

  console.warn('Webhook verification failed');
  return res.status(403).json({ error: 'Forbidden' });
});

/**
 * POST /api/send-email
 * Send email via Gmail
 * Body: { to, subject, html, text? }
 */
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html, text } = req.body || {};

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({
      success: false,
      error: 'Missing `to`, `subject`, or `html`/`text` in request body'
    });
  }

  if (!emailTransporter) {
    console.warn('Gmail not configured on server. Check environment variables.');
    return res.status(500).json({
      success: false,
      error: 'Gmail is not configured on the server. Set GMAIL_USER and GMAIL_PASSWORD in .env'
    });
  }

  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      text: text || undefined,
      html: html || undefined
    };

    const info = await emailTransporter.sendMail(mailOptions);

    console.log(`Email sent to ${to}: ${info.response}`);
    return res.json({
      success: true,
      provider: 'gmail',
      messageId: info.messageId,
      response: info.response
    });
  } catch (err) {
    console.error('Gmail send error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error sending email'
    });
  }
});

/**
 * POST /api/send-weekly-report
 * Send weekly adherence report via email
 * Body: { caregiverEmail, patientName, weeklyAdherence, weeklyData }
 */
app.post('/api/send-weekly-report', async (req, res) => {
  const { caregiverEmail, patientName, weeklyAdherence, weeklyData, caregiverPhone, notificationType } = req.body || {};

  console.log('[send-weekly-report] Received request:', { caregiverEmail, patientName, weeklyAdherence, hasWeeklyData: !!weeklyData });

  if (!caregiverEmail || !patientName || weeklyAdherence === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: caregiverEmail, patientName, weeklyAdherence'
    });
  }

  if (!emailTransporter && !SIMULATE_EMAIL) {
    console.warn('[send-weekly-report] Gmail not configured and simulation disabled');
    return res.status(500).json({
      success: false,
      error: 'Gmail is not configured. Set GMAIL_USER and GMAIL_PASSWORD in .env, or enable SIMULATE_EMAIL=true for testing'
    });
  }

  try {
    // Generate HTML report
    const reportDate = new Date().toLocaleDateString('pt-BR');
    const adherenceColor = weeklyAdherence >= 80 ? '#4CAF50' : weeklyAdherence >= 50 ? '#FF9800' : '#F44336';

    let dailyTableRows = '';
    if (weeklyData && typeof weeklyData === 'object') {
      Object.entries(weeklyData).forEach(([date, data]) => {
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        const percentage = data.scheduled > 0 ? Math.round((data.taken / data.scheduled) * 100) : 0;
        dailyTableRows += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${dayName}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${data.taken}/${data.scheduled}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${percentage}%</td>
          </tr>
        `;
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1976D2; color: white; padding: 20px; border-radius: 5px; text-align: center; }
          .content { margin: 20px 0; }
          .adherence-badge { display: inline-block; background-color: ${adherenceColor}; color: white; padding: 10px 20px; border-radius: 5px; font-size: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          table th { background-color: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
          .footer { color: #999; font-size: 12px; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Relatório Semanal de Aderência</h1>
          </div>

          <div class="content">
            <p>Olá,</p>
            <p>Segue abaixo o relatório semanal de aderência a medicamentos de <strong>${patientName}</strong>.</p>

            <h2>Aderência Geral</h2>
            <p>
              <span class="adherence-badge">${weeklyAdherence}%</span>
            </p>

            <h2>Detalhamento Diário</h2>
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th style="text-align: center;">Tomou/Programado</th>
                  <th style="text-align: center;">Aderência</th>
                </tr>
              </thead>
              <tbody>
                ${dailyTableRows || '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #999;">Sem dados</td></tr>'}
              </tbody>
            </table>

            <p style="margin-top: 20px;">
              📱 Para mais detalhes e ajustes, acesse o aplicativo de gerenciamento de medicamentos.
            </p>
          </div>

          <div class="footer">
            <p>Este é um relatório automático gerado em ${reportDate}.</p>
            <p>Se tiver dúvidas, entre em contato com o suporte.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: caregiverEmail,
      subject: `📊 Relatório Semanal: Aderência de ${patientName}`,
      html: htmlContent,
      text: `Relatório Semanal de Aderência - ${patientName}\nAderência Geral: ${weeklyAdherence}%`
    };

    console.log('[send-weekly-report] Sending email to:', caregiverEmail);
    
    let info;
    if (SIMULATE_EMAIL) {
      console.log('[send-weekly-report] SIMULATING email (SIMULATE_EMAIL=true)');
      info = {
        messageId: `sim_${Date.now()}@localhost`,
        response: '250 SIMULATED OK'
      };
    } else {
      info = await emailTransporter.sendMail(mailOptions);
    }

    console.log(`[send-weekly-report] Email sent successfully to ${caregiverEmail}: ${info.response}`);

    // Try sending an alert via SMS/WhatsApp informing that the email was sent
    let alertResult = null;
    if (caregiverPhone && notificationType) {
      const alertMsg = `Relatório semanal de ${patientName} foi enviado para ${caregiverEmail}.`;
      try {
        if (notificationType === 'whatsapp') {
          if (!process.env.WHATSAPP_ACCESS_TOKEN) {
            alertResult = await sendViaWhatsAppTwilio(caregiverPhone, alertMsg);
          } else {
            alertResult = await sendViaWhatsAppCloudAPI(caregiverPhone, alertMsg);
          }
        } else {
          alertResult = await sendViaTwilioSMS(caregiverPhone, alertMsg);
        }
        console.log('[send-weekly-report] Alert sent:', alertResult?.provider, alertResult?.messageId);
      } catch (alertErr) {
        console.warn('[send-weekly-report] Alert send failed:', alertErr.message || alertErr);
      }
    }

    return res.json({
      success: true,
      provider: SIMULATE_EMAIL ? 'gmail-simulated' : 'gmail',
      messageId: info.messageId,
      response: info.response,
      alertProvider: alertResult?.provider || null,
      alertMessageId: alertResult?.messageId || null,
    });
  } catch (err) {
    console.error('[send-weekly-report] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error sending report'
    });
  }
});

app.listen(PORT, () => {
  console.log(`\nServer listening on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  POST /api/send-notification    — Send SMS or WhatsApp`);
  console.log(`  POST /api/send-sms (legacy)`);
  console.log(`  POST /api/send-email           — Send email via Gmail`);
  console.log(`  POST /api/send-weekly-report   — Send weekly adherence report`);
  console.log(`  GET  /api/status               — Check server & providers`);
  console.log(`  POST /api/webhook/whatsapp    — Meta webhook (status updates)`);
  console.log(`  GET  /api/webhook/whatsapp    — Webhook verification\n`);
});
