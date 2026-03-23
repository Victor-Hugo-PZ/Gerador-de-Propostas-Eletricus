import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route to send email
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, html, text } = req.body;

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = process.env.SMTP_PORT || '465';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      return res.status(400).json({ 
        error: 'Configuração de e-mail ausente. Você precisa configurar SMTP_USER e SMTP_PASS nos Secrets do AI Studio.' 
      });
    }

    // Check if host looks like an API key (common mistake)
    if (smtpHost.startsWith('AIza')) {
      return res.status(400).json({
        error: 'O campo SMTP_HOST parece conter uma chave de API (AIza...). Por favor, verifique se você não colou a chave do Gemini no lugar do servidor SMTP (ex: smtp.gmail.com).'
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // Increase timeout for slow connections
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    try {
      await transporter.sendMail({
        from: `"Eletricus Propostas" <${smtpUser}>`,
        to,
        subject,
        text,
        html,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Erro detalhado do Nodemailer:', error);
      
      let friendlyError = 'Falha ao enviar e-mail.';
      if (error.code === 'EAUTH') friendlyError = 'Erro de autenticação: Usuário ou Senha SMTP incorretos.';
      else if (error.code === 'ESOCKET') friendlyError = 'Erro de conexão: Não foi possível conectar ao servidor SMTP. Verifique o Host e a Porta.';
      else if (error.code === 'EENVELOPE') friendlyError = 'Erro no destinatário: O e-mail do cliente parece inválido.';
      else if (error.message.includes('getaddrinfo')) friendlyError = `Erro de DNS: O servidor "${smtpHost}" não foi encontrado. Verifique se o SMTP_HOST está correto.`;
      
      res.status(500).json({ 
        error: friendlyError,
        details: error.message 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
