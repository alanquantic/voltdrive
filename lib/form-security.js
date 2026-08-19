import crypto from 'crypto';

const MIN_AGE_MS = 3_000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const VOWEL = /[aeiouáéíóúü]/i;
const CONSONANT_RUN = /[bcdfghjklmnpqrstvwxyzñ]{4,}/i;
const URL_OR_HTML = /https?:\/\/|\[url=|<a\s+href|<[a-z][^>]*>/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DISPOSABLE_EMAIL_MARKERS = [
  'mailinator.com',
  'tempmail',
  'guerrillamail',
  '10minutemail',
  'yopmail',
  'throwaway',
];

// Stopgap for long-lived Node processes. On serverless deployments, use a
// shared store such as Vercel KV or Upstash for a globally consistent limit.
const hits = new Map();

function formSecret() {
  return process.env.FORM_SECRET || '';
}

function sign(value) {
  return crypto.createHmac('sha256', formSecret()).update(value).digest('hex');
}

export function issueFormToken() {
  const timestamp = Date.now();
  if (!formSecret()) return `${timestamp}.unsigned`;
  return `${timestamp}.${sign(String(timestamp))}`;
}

export function verifyFormToken(token) {
  if (!formSecret()) return { valid: true, reason: 'FORM_SECRET no configurado' };
  if (typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'token ausente o malformado' };
  }

  const [timestampString, signature] = token.split('.');
  const timestamp = Number(timestampString);
  if (!Number.isFinite(timestamp) || !signature) {
    return { valid: false, reason: 'token malformado' };
  }

  const expected = sign(timestampString);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: 'firma inválida' };
  }

  const age = Date.now() - timestamp;
  if (age < MIN_AGE_MS) return { valid: false, reason: `demasiado rápido (${age}ms)` };
  if (age > MAX_AGE_MS) return { valid: false, reason: 'token vencido' };
  return { valid: true };
}

function hasAnomalousUppercase(value) {
  const letters = [...value].filter((character) => /\p{L}/u.test(character));
  if (!letters.length) return false;
  const hasLowercase = letters.some(
    (character) => character === character.toLowerCase() && character !== character.toUpperCase(),
  );
  if (!hasLowercase) return false;

  let interiorUppercase = 0;
  for (const word of value.split(/\s+/).filter(Boolean)) {
    let foundFirstLetter = false;
    for (const character of word) {
      if (!/\p{L}/u.test(character)) continue;
      const isUppercase =
        character === character.toUpperCase() && character !== character.toLowerCase();
      if (!foundFirstLetter) foundFirstLetter = true;
      else if (isUppercase) interiorUppercase += 1;
    }
  }
  return interiorUppercase / letters.length > 0.3;
}

export function checkText(field, raw, { required = true } = {}) {
  const value = String(raw ?? '').trim();
  if (!value && !required) return null;
  if (value.length < 2 || value.length > 100) return `${field}: longitud`;
  if (!VOWEL.test(value)) return `${field}: sin vocales`;
  if (CONSONANT_RUN.test(value)) return `${field}: 4+ consonantes`;
  if (hasAnomalousUppercase(value)) return `${field}: mayúsculas anómalas`;
  if (URL_OR_HTML.test(value)) return `${field}: URL/HTML`;
  return null;
}

export function checkEmail(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(value)) return 'email: formato';
  if (DISPOSABLE_EMAIL_MARKERS.some((marker) => value.includes(marker))) {
    return 'email: dominio desechable';
  }
  return null;
}

export function checkPhone(raw, { required = true } = {}) {
  const value = String(raw ?? '').trim();
  if (!value && !required) return null;
  const digits = value.replace(/[\s\-().+]/g, '');
  if (!/^\d{10,15}$/.test(digits)) return 'teléfono: longitud';
  if (/^(\d)\1+$/.test(digits)) return 'teléfono: dígitos iguales';
  if (digits === '1234567890' || digits === '0987654321') {
    return 'teléfono: secuencia obvia';
  }
  return null;
}

export function checkQuantity(raw, max = 200) {
  const value = String(raw ?? '').trim();
  if (!/^\d+$/.test(value)) return 'unidades: no entero';
  const quantity = Number(value);
  return quantity < 1 || quantity > max ? `unidades: fuera de 1-${max}` : null;
}

export function checkFreeText(raw, { required = false } = {}) {
  const value = String(raw ?? '').trim();
  if (!value && required) return 'mensaje: requerido';
  if (value.length > 2_000) return 'mensaje: muy largo';
  const urls = (value.match(/https?:\/\/|www\./gi) || []).length;
  const tags = (value.match(/<[^>]+>|\[[^\]]+\]/g) || []).length;
  return urls + tags > 2 ? 'mensaje: demasiados enlaces' : null;
}

function tooManySelected(values, optionCount) {
  if (!Array.isArray(values)) return false;
  return values.filter((value) => String(value).trim()).length > optionCount - 1;
}

export function validateQuotePayload(body = {}) {
  const customer = body.customer || {};
  const configuration = body.configuration || {};
  const model = String(configuration.model || '').toLowerCase();
  const packageCount = model.includes('halc') ? 4 : 3;

  return (
    checkText('nombre', customer.name) ||
    checkEmail(customer.email) ||
    checkPhone(customer.phone) ||
    (!['Compra', 'Renta', 'Leasing'].includes(customer.type) ? 'intención: inválida' : null) ||
    checkQuantity(customer.units) ||
    checkText('ciudad', customer.city) ||
    checkText('país', customer.country) ||
    (tooManySelected(configuration.packages, packageCount) ? 'todos los paquetes seleccionados' : null) ||
    (tooManySelected(configuration.selectedAccessories, 5)
      ? 'todos los accesorios seleccionados'
      : null)
  );
}

export function validateContactPayload(body = {}) {
  return (
    checkText('nombre', body.contact_name) ||
    checkEmail(body.email) ||
    checkPhone(body.phone, { required: false }) ||
    checkText('empresa', body.company, { required: false }) ||
    checkFreeText(body.message, { required: true })
  );
}

export function rateLimit(key, scope = 'form') {
  if (!key) return { allowed: true };
  const mapKey = `${scope}:${String(key).trim().toLowerCase()}`;
  const now = Date.now();
  const recent = (hits.get(mapKey) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(mapKey, recent);
    return { allowed: false };
  }
  recent.push(now);
  hits.set(mapKey, recent);
  return { allowed: true };
}

export function inspectSubmission(body, { type, rateLimitScope }) {
  if (String(body?.company_website || '').trim()) return 'honeypot';

  const token = verifyFormToken(body?.formToken);
  if (!token.valid) return `token: ${token.reason}`;

  const validationReason =
    type === 'quote' ? validateQuotePayload(body) : validateContactPayload(body);
  if (validationReason) return validationReason;

  const email = type === 'quote' ? body?.customer?.email : body?.email;
  if (!rateLimit(email, rateLimitScope).allowed) return 'rate limit';
  return null;
}

