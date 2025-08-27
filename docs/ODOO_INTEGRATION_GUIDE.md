# 🚀 Guía Completa de Integración Odoo CRM

## 📋 Resumen Ejecutivo

Esta guía documenta el proceso completo para integrar formularios web con Odoo CRM, permitiendo la creación automática de leads desde cualquier sitio web.

## 🎯 Objetivo

Crear una integración robusta que:
- ✅ Envíe leads automáticamente a Odoo CRM
- ✅ Mantenga la funcionalidad de email existente
- ✅ Sea reutilizable para múltiples proyectos
- ✅ Maneje errores sin afectar la experiencia del usuario

## 🛠️ Requisitos Previos

### **1. Acceso a Odoo:**
- URL de Odoo (ej: `https://tu-empresa.odoo.com`)
- Usuario con permisos de administrador
- ID de la empresa/organización
- Contraseña del usuario

### **2. Proyecto Web:**
- Node.js + Express
- Formularios funcionales
- Sistema de variables de entorno

## 🔧 Implementación Paso a Paso

### **Paso 1: Configuración del Servidor**

#### **1.1 Instalar dependencias:**
```bash
npm install node-fetch dotenv
```

#### **1.2 Crear configuración Odoo en `server.js`:**
```javascript
// Odoo CRM Integration
const ODOO_CONFIG = {
  url: process.env.ODOO_URL || 'https://tu-empresa.odoo.com',
  apiKey: process.env.ODOO_API_KEY,
  password: process.env.ODOO_PASSWORD,
  companyId: parseInt(process.env.ODOO_COMPANY_ID) || 1,
  database: process.env.ODOO_DATABASE || 'tu-database',
  user: process.env.ODOO_USER || 'tu-usuario@empresa.com'
};

// Validar variables de entorno
if (!process.env.ODOO_API_KEY || !process.env.ODOO_PASSWORD) {
  console.warn('⚠️  ADVERTENCIA: Variables de entorno de Odoo no configuradas.');
} else {
  console.log('✅ Variables de entorno de Odoo configuradas correctamente');
}
```

#### **1.3 Función de autenticación:**
```javascript
async function authenticateOdoo() {
  try {
    const authResponse = await fetch(`${ODOO_CONFIG.url}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: ODOO_CONFIG.database,
          login: ODOO_CONFIG.user,
          password: ODOO_CONFIG.password
        }
      })
    });

    const authData = await authResponse.json();
    
    if (authData.error) {
      throw new Error(`Error de autenticación: ${authData.error.data.message}`);
    }

    const cookies = authResponse.headers.get('set-cookie');
    
    return {
      ...authData.result,
      cookies: cookies
    };
  } catch (error) {
    console.error('Error autenticando con Odoo:', error);
    throw error;
  }
}
```

#### **1.4 Función para crear leads:**
```javascript
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
          source_id: false,
          user_id: false,
          team_id: false,
          ...leadData.additional_fields
        }],
        kwargs: {}
      }
    };

    const response = await fetch(`${ODOO_CONFIG.url}/web/dataset/call_kw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': auth.cookies || '',
        'X-Requested-With': 'XMLHttpRequest'
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
```

### **Paso 2: Endpoints de API**

#### **2.1 Endpoint para leads generales:**
```javascript
app.post('/api/odoo/lead', async (req, res) => {
  console.log('📥 Recibida solicitud para crear lead en Odoo:', req.body);
  
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

    if (!email || !contact_name) {
      console.log('❌ Validación fallida: email o contact_name faltantes');
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
        source_id: false,
        email: email // Agregar email explícitamente
      }
    };

    console.log('📤 Enviando datos a Odoo:', leadData);
    const leadId = await createOdooLead(leadData);
    console.log('✅ Lead creado exitosamente en Odoo con ID:', leadId);

    return res.json({ 
      ok: true, 
      lead_id: leadId,
      message: 'Lead creado exitosamente en Odoo CRM'
    });

  } catch (error) {
    console.error('❌ Error en endpoint /api/odoo/lead:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'Error interno del servidor' 
    });
  }
});
```

#### **2.2 Endpoint para leads de cotización:**
```javascript
app.post('/api/odoo/quote-lead', async (req, res) => {
  console.log('📥 Recibida solicitud para crear lead de cotización en Odoo:', req.body);
  
  try {
    const { customer = {}, configuration = {} } = req.body;
    
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
        source_id: false,
        email: customer.email // Agregar email explícitamente
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
      error: error.message || 'Error interno del servidor' 
    });
  }
});
```

### **Paso 3: Configuración del Frontend**

#### **3.1 Función de envío para formulario de cotización:**
```javascript
async function submit(){
  if (invalid) return;
  setSending(true);
  setError(null);
  
  try {
    // Enviar a Mailgun (email)
    const endpoint = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? '/api/quote' : '/api/quote';
    const r = await fetch(endpoint, { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({ customer: form, configuration }) 
    });
    
    if (!r.ok) {
      const errorData = await r.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${r.status}: ${r.statusText}`);
    }

    // Enviar a Odoo CRM (lead)
    console.log('🔄 Intentando enviar a Odoo CRM...');
    try {
      const odooEndpoint = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? '/api/odoo/quote-lead' : '/api/odoo/quote-lead';
      console.log('📡 Endpoint Odoo:', odooEndpoint);
      console.log('📦 Datos a enviar:', { customer: form, configuration });
      
      const odooResponse = await fetch(odooEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: form, configuration })
      });

      console.log('📥 Respuesta de Odoo:', odooResponse.status, odooResponse.statusText);

      if (odooResponse.ok) {
        const odooData = await odooResponse.json();
        console.log('✅ Lead creado en Odoo:', odooData);
      } else {
        const errorText = await odooResponse.text();
        console.error('❌ Error creando lead en Odoo:', odooResponse.status, errorText);
      }
    } catch (odooError) {
      console.error('💥 Error enviando a Odoo:', odooError);
    }
    
    setOpen(false);
    showToast('Solicitud enviada. Te contactaremos pronto.');
  } catch(e){
    console.error('Error en cotización:', e);
    setError(e.message || 'No se pudo enviar la solicitud. Inténtalo más tarde.');
    showToast('Error: ' + (e.message || 'No se pudo enviar la solicitud'));
  } finally { 
    setSending(false); 
  }
}
```

#### **3.2 Función de envío para formulario de contacto:**
```javascript
async function submitContactForm(e) {
  e.preventDefault();
  if (!contactForm.name || !contactForm.email || !contactForm.message) {
    setContactError('Por favor completa los campos requeridos');
    return;
  }
  
  setSendingContact(true);
  setContactError(null);
  
  try {
    console.log('🔄 Intentando enviar formulario de contacto a Odoo...');
    const odooData = {
      name: `Contacto desde Home - ${contactForm.name}`,
      contact_name: contactForm.name,
      email: contactForm.email,
      phone: contactForm.phone || '',
      description: `Empresa: ${contactForm.company || 'N/A'}\n\nMensaje:\n${contactForm.message}`,
      source: 'Formulario Home'
    };
    console.log('📦 Datos a enviar:', odooData);
    
    const odooResponse = await fetch('/api/odoo/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(odooData)
    });

    if (odooResponse.ok) {
      const odooData = await odooResponse.json();
      console.log('✅ Lead creado en Odoo:', odooData);
      showToast('Mensaje enviado. Te contactaremos pronto.');
      setContactForm({ name:'', email:'', phone:'', company:'', message:'' });
    } else {
      throw new Error('Error enviando a Odoo');
    }
  } catch (error) {
    console.error('Error en formulario de contacto:', error);
    setContactError('No se pudo enviar el mensaje. Inténtalo más tarde.');
    showToast('Error: No se pudo enviar el mensaje');
  } finally {
    setSendingContact(false);
  }
}
```

### **Paso 4: Configuración de Variables de Entorno**

#### **4.1 Archivo `.env` local:**
```bash
# Odoo CRM Integration
ODOO_URL=https://tu-empresa.odoo.com
ODOO_API_KEY=tu-api-key
ODOO_PASSWORD=tu-password
ODOO_COMPANY_ID=1
ODOO_DATABASE=tu-database
ODOO_USER=tu-usuario@empresa.com

# Mailgun (existing)
MAILGUN_DOMAIN=tu-dominio.com
MAILGUN_API_KEY=tu-api-key
MAILGUN_TO=contacto@tu-empresa.com
MAILGUN_FROM=cotizador@tu-dominio.com
```

#### **4.2 Variables en Vercel:**
Configurar en **Settings** → **Environment Variables**:

| Variable | Valor | Environments |
|----------|-------|--------------|
| `ODOO_URL` | `https://tu-empresa.odoo.com` | Production, Preview, Development |
| `ODOO_API_KEY` | `tu-api-key` | Production, Preview, Development |
| `ODOO_PASSWORD` | `tu-password` | Production, Preview, Development |
| `ODOO_COMPANY_ID` | `1` | Production, Preview, Development |
| `ODOO_DATABASE` | `tu-database` | Production, Preview, Development |
| `ODOO_USER` | `tu-usuario@empresa.com` | Production, Preview, Development |

### **Paso 5: Configuración de Vercel**

#### **5.1 Archivo `vercel.json`:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

#### **5.2 Script en `package.json`:**
```json
{
  "scripts": {
    "vercel-build": "npm run build"
  }
}
```

## 🧪 Pruebas y Verificación

### **1. Endpoint de prueba:**
```javascript
// Agregar en server.js
app.get('/api/test', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});
```

### **2. Pruebas locales:**
```bash
# Probar endpoint de prueba
curl http://localhost:3000/api/test

# Probar endpoint de lead
curl -X POST http://localhost:3000/api/odoo/lead \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Lead","email":"test@example.com","phone":"123456789","contact_name":"Test User","description":"Prueba de integración"}'

# Probar endpoint de cotización
curl -X POST http://localhost:3000/api/odoo/quote-lead \
  -H "Content-Type: application/json" \
  -d '{"customer":{"name":"Test","email":"test@example.com","phone":"123","type":"Compra","units":"1","city":"Test","country":"México"},"configuration":{"model":"Test Model"}}'
```

### **3. Verificación en Odoo:**
- Ir a **CRM** → **Leads**
- Verificar que aparezcan los leads creados
- Confirmar que los campos estén completos

## 🚨 Errores Comunes y Soluciones

### **Error 1: "Access Denied"**
**Causa:** Credenciales incorrectas
**Solución:** Verificar usuario y contraseña en Odoo

### **Error 2: "Session expired"**
**Causa:** Problema con cookies de sesión
**Solución:** Verificar manejo de cookies en la función de autenticación

### **Error 3: "Invalid field"**
**Causa:** Campo no existe en el modelo de Odoo
**Solución:** Remover campos no válidos de `additional_fields`

### **Error 4: "404 Not Found"**
**Causa:** Configuración incorrecta de Vercel
**Solución:** Verificar `vercel.json` y variables de entorno

### **Error 5: Email no aparece en Odoo**
**Causa:** Campo `email_from` no se mapea correctamente
**Solución:** Agregar `email: email` en `additional_fields`

## 📊 Logging y Debugging

### **Logs del servidor:**
```javascript
console.log('📥 Recibida solicitud para crear lead en Odoo:', req.body);
console.log('📤 Enviando datos a Odoo:', leadData);
console.log('✅ Lead creado exitosamente en Odoo con ID:', leadId);
console.error('❌ Error en endpoint /api/odoo/lead:', error);
```

### **Logs del frontend:**
```javascript
console.log('🔄 Intentando enviar a Odoo CRM...');
console.log('📡 Endpoint Odoo:', odooEndpoint);
console.log('📦 Datos a enviar:', { customer: form, configuration });
console.log('📥 Respuesta de Odoo:', odooResponse.status, odooResponse.statusText);
console.log('✅ Lead creado en Odoo:', odooData);
```

## 🔒 Seguridad

### **1. Variables de entorno:**
- ✅ Nunca hardcodear credenciales
- ✅ Usar `.env` para desarrollo local
- ✅ Configurar en Vercel para producción

### **2. Validación:**
- ✅ Validar campos requeridos
- ✅ Sanitizar datos de entrada
- ✅ Manejar errores sin exponer información sensible

### **3. Logs:**
- ✅ No loggear credenciales
- ✅ Usar logs estructurados
- ✅ Limpiar logs en producción

## 📈 Optimización

### **1. Performance:**
- ✅ Usar conexiones persistentes
- ✅ Implementar cache de autenticación
- ✅ Manejar timeouts apropiadamente

### **2. Escalabilidad:**
- ✅ Manejar múltiples organizaciones
- ✅ Implementar rate limiting
- ✅ Usar pools de conexiones

## 🎯 Checklist de Implementación

### **✅ Configuración del servidor:**
- [ ] Dependencias instaladas
- [ ] Configuración Odoo creada
- [ ] Funciones de autenticación y creación de leads
- [ ] Endpoints de API implementados
- [ ] Logging configurado

### **✅ Configuración del frontend:**
- [ ] Funciones de envío actualizadas
- [ ] Manejo de errores implementado
- [ ] Logging del frontend configurado
- [ ] Validación de formularios

### **✅ Configuración de despliegue:**
- [ ] Variables de entorno configuradas
- [ ] `vercel.json` creado
- [ ] Scripts de build actualizados
- [ ] Endpoint de prueba implementado

### **✅ Pruebas:**
- [ ] Pruebas locales exitosas
- [ ] Pruebas en producción exitosas
- [ ] Verificación en Odoo
- [ ] Manejo de errores verificado

## 📝 Notas Importantes

1. **Siempre probar localmente** antes de desplegar
2. **Verificar variables de entorno** en producción
3. **Monitorear logs** para detectar problemas
4. **Documentar cambios** para futuras referencias
5. **Hacer backup** antes de cambios importantes

## 🔄 Mantenimiento

### **Actualizaciones:**
- Revisar logs regularmente
- Actualizar dependencias
- Verificar compatibilidad con nuevas versiones de Odoo
- Optimizar performance según uso

### **Monitoreo:**
- Configurar alertas para errores
- Monitorear tasa de éxito de leads
- Revisar logs de autenticación
- Verificar salud de la integración

---

**Última actualización:** Agosto 2024  
**Versión:** 1.0  
**Autor:** Equipo de Desarrollo
