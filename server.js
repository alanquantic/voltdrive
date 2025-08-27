import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

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

// Odoo CRM Integration
const ODOO_CONFIG = {
  url: 'https://alpha-tauro.odoo.com',
  apiKey: '2eae4fe8f3d27bc0804e7f022be644aa7e1cbec8',
  password: 'pqa6zxj-uej2zrz1GFP',
  companyId: 2,
  database: 'alpha-tauro' // Asumiendo que es el nombre de la base de datos
};

// Función para autenticarse con Odoo
async function authenticateOdoo() {
  try {
    const authResponse = await fetch(`${ODOO_CONFIG.url}/web/session/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: ODOO_CONFIG.database,
          login: 'admin', // Asumiendo que es el usuario admin
          password: ODOO_CONFIG.password
        }
      })
    });

    const authData = await authResponse.json();
    
    if (authData.error) {
      throw new Error(`Error de autenticación: ${authData.error.data.message}`);
    }

    return authData.result;
  } catch (error) {
    console.error('Error autenticando con Odoo:', error);
    throw error;
  }
}

// Función para crear un lead en Odoo
async function createOdooLead(leadData) {
  try {
    const auth = await authenticateOdoo();
    
    const leadPayload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'crm.lead',
        method: 'create',
        args: [{
          name: leadData.name || 'Lead desde sitio web',
          contact_name: leadData.contact_name,
          email_from: leadData.email,
          phone: leadData.phone,
          description: leadData.description,
          company_id: ODOO_CONFIG.companyId,
          stage_id: 1, // ID de la etapa "Nuevo"
          type: 'lead',
          source_id: false, // Puedes configurar una fuente específica
          user_id: false, // Se asignará automáticamente o puedes especificar un vendedor
          team_id: false, // Se asignará automáticamente
          ...leadData.additional_fields
        }]
      }
    };

    const response = await fetch(`${ODOO_CONFIG.url}/web/dataset/call_kw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': auth.cookies
      },
      body: JSON.stringify(leadPayload)
    });

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Error creando lead: ${result.error.data.message}`);
    }

    return result.result;
  } catch (error) {
    console.error('Error creando lead en Odoo:', error);
    throw error;
  }
}

// Endpoint para crear leads en Odoo
app.post('/api/odoo/lead', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      contact_name, 
      description, 
      source = 'Sitio Web',
      additional_fields = {} 
    } = req.body;

    // Validación básica
    if (!email || !contact_name) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Email y nombre de contacto son requeridos' 
      });
    }

    const leadData = {
      name: name || `Lead de ${contact_name}`,
      contact_name,
      email_from: email,
      phone: phone || '',
      description: description || '',
      additional_fields: {
        ...additional_fields,
        source_id: source
      }
    };

    const leadId = await createOdooLead(leadData);

    return res.json({ 
      ok: true, 
      lead_id: leadId,
      message: 'Lead creado exitosamente en Odoo CRM'
    });

  } catch (error) {
    console.error('Error en endpoint /api/odoo/lead:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Endpoint para crear leads desde el formulario de cotización
app.post('/api/odoo/quote-lead', async (req, res) => {
  try {
    const { customer = {}, configuration = {} } = req.body;
    
    // Validación
    const required = ['name', 'email', 'phone'];
    const missing = required.filter(k => !String(customer[k] || '').trim());
    if (missing.length) {
      return res.status(400).json({ 
        ok: false, 
        error: `Faltan campos: ${missing.join(', ')}` 
      });
    }

    const description = `
Solicitud de cotización desde el configurador:

DATOS DEL CLIENTE:
- Nombre: ${customer.name}
- Email: ${customer.email}
- Teléfono: ${customer.phone}
- Intención: ${customer.type || 'N/A'}
- Unidades: ${customer.units || 'N/A'}
- Ciudad: ${customer.city || 'N/A'}
- País: ${customer.country || 'N/A'}

CONFIGURACIÓN:
- Modelo: ${configuration.model || 'N/A'}
- Versión: ${configuration.version || 'N/A'}
- Color: ${configuration.color || 'N/A'}
- Color de Asientos: ${configuration.seats || 'N/A'}
- Techo: ${configuration.roof || 'N/A'}
- Paquetes: ${(configuration.packages || []).join(', ') || 'N/A'}
- Accesorios: ${(configuration.selectedAccessories || []).join(', ') || 'N/A'}

Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
    `.trim();

    const leadData = {
      name: `Cotización ${customer.type} - ${customer.name}`,
      contact_name: customer.name,
      email_from: customer.email,
      phone: customer.phone,
      description,
      additional_fields: {
        source_id: 'Configurador Web',
        type: customer.type,
        units: customer.units,
        city: customer.city,
        country: customer.country
      }
    };

    const leadId = await createOdooLead(leadData);

    return res.json({ 
      ok: true, 
      lead_id: leadId,
      message: 'Lead de cotización creado exitosamente en Odoo CRM'
    });

  } catch (error) {
    console.error('Error en endpoint /api/odoo/quote-lead:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Error interno del servidor' 
    });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Volt Drive SPA lista en http://localhost:${port}`);
});


