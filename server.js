import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const publicDir = path.join(__dirname, 'public');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir));

// Quote endpoint (Mailgun)
app.post('/api/quote', async (req, res) => {
  try {
    const { customer = {}, configuration = {} } = req.body || {};
    const required = ['name','email','phone','type','units','city','country'];
    const missing = required.filter((k) => !String(customer[k] || '').trim());
    if (missing.length) {
      return res.status(400).json({ ok: false, error: `Faltan campos: ${missing.join(', ')}` });
    }

    const domain = process.env.MAILGUN_DOMAIN;
    const apiKey = process.env.MAILGUN_API_KEY;
    const toEmail = process.env.MAILGUN_TO || 'contacto@voltdrive.mx';
    const fromEmail = process.env.MAILGUN_FROM || `Cotizador Volt Drive <cotizador@${domain || 'mailer.ceosnew.media'}>`;

    if (!domain || !apiKey) {
      return res.status(500).json({ ok: false, error: 'MAILGUN_DOMAIN o MAILGUN_API_KEY no configurado(s)' });
    }

    const subject = `Nueva solicitud — ${customer.type} • ${customer.units} unidad(es) • ${customer.city}, ${customer.country}`;

    const cfg = configuration || {};
    const html = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial;line-height:1.5;color:#0f172a">
        <h2 style="margin:0 0 12px 0">Volt Drive — Solicitud de cotización</h2>
        <p style="margin:0 0 16px 0;color:#334155">Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</p>
        <h3 style="margin:16px 0 8px 0">Datos del cliente</h3>
        <table style="border-collapse:collapse;min-width:520px">
          <tbody>
            ${[['Nombre', customer.name], ['Email', customer.email], ['Teléfono', customer.phone], ['Intención', customer.type], ['Unidades', customer.units], ['Ciudad', customer.city], ['País', customer.country]].map(([k,v])=>`<tr><td style='padding:6px 10px;background:#f1f5f9;border:1px solid #e2e8f0'><strong>${k}</strong></td><td style='padding:6px 10px;border:1px solid #e2e8f0'>${String(v||'')}</td></tr>`).join('')}
          </tbody>
        </table>
        <h3 style="margin:16px 0 8px 0">Configuración</h3>
        <table style="border-collapse:collapse;min-width:520px">
          <tbody>
            ${[['Modelo', cfg.model], ['Versión', cfg.version], ['Color', cfg.color], ['Color de Asientos', cfg.seats], ['Techo', cfg.roof], ['Paquetes', (cfg.packages||[]).join(', ') || '—'], ['Accesorios', (cfg.selectedAccessories||[]).join(', ') || '—']].map(([k,v])=>`<tr><td style='padding:6px 10px;background:#f1f5f9;border:1px solid #e2e8f0'><strong>${k}</strong></td><td style='padding:6px 10px;border:1px solid #e2e8f0'>${String(v||'')}</td></tr>`).join('')}
          </tbody>
        </table>
        <p style="margin-top:16px;color:#64748b;font-size:12px">Este mensaje fue generado automáticamente por el cotizador del sitio.</p>
      </div>`;

    const params = new URLSearchParams();
    params.append('from', fromEmail);
    params.append('to', toEmail);
    params.append('subject', subject);
    params.append('html', html);
    params.append('text', `Cliente: ${customer.name} <${customer.email}> (${customer.phone}) | ${customer.type} ${customer.units} unidades en ${customer.city}, ${customer.country}. Config: ${cfg.model}/${cfg.version} ${cfg.color} asientos ${cfg.seats}.`);

    const resp = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Mailgun error', resp.status, txt);
      return res.status(502).json({ ok: false, error: `Mailgun ${resp.status}` });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Quote error', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Volt Drive SPA lista en http://localhost:${port}`);
});


