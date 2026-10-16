// Local backend only. Credentials live in this closure and never leave as responses.
const TOKEN_PATTERN = /^\d{5,20}:[A-Za-z0-9_-]{20,100}$/;
const CHAT_PATTERN = /^\d{5,20}$/;
const MAX_BODY = 8192;
class ApiError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
async function readJson(req) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new ApiError('Gunakan format JSON.', 415);
  let text = '', size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BODY) throw new ApiError('Data permintaan terlalu besar.', 413);
    text += chunk;
  }
  try {
    const value = JSON.parse(text || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new ApiError('Data permintaan tidak valid.'); }
}
export function createBotApi({ request = fetch, env = process.env, now = () => new Date().toISOString() } = {}) {
  let connection = null;
  let busy = false;
  function status() {
    if (!connection) return { configured: false, connected: false, envAvailable: Boolean(env.TELEGRAM_BOT_TOKEN), storage: 'memory' };
    const { bot, adminChatId, checkedAt, webhookActive, pendingUpdates, verified, lastError } = connection;
    return { configured: true, connected: verified, bot, adminChatId, checkedAt, webhookActive, pendingUpdates, lastError, envAvailable: Boolean(env.TELEGRAM_BOT_TOKEN), storage: 'memory' };
  }
  async function telegram(token, method, payload = {}) {
    let response, data;
    try {
      response = await request(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(15000), redirect: 'error',
      });
      data = await response.json();
    } catch { throw new ApiError('Tidak dapat menghubungi Telegram. Periksa internet, lalu coba lagi.', 502); }
    if (!response.ok || !data.ok) {
      const code = data.error_code || response.status;
      if ([401, 404].includes(code)) throw new ApiError('Token bot ditolak Telegram. Salin token terbaru dari BotFather.', 401);
      if (code === 429) throw new ApiError('Terlalu banyak permintaan ke Telegram. Tunggu sebentar lalu coba lagi.', 429);
      if (method === 'sendMessage') throw new ApiError('Pesan tes gagal. Pastikan ID chat admin benar dan admin sudah menekan Start pada bot.', 400);
      throw new ApiError('Telegram menolak pemeriksaan bot. Coba lagi atau periksa token di BotFather.', 502);
    }
    return data.result;
  }
  async function verify(token) {
    const me = await telegram(token, 'getMe');
    if (!me?.is_bot || !me.id || !me.username) throw new ApiError('Token tidak mengembalikan identitas bot yang valid.', 502);
    const webhook = await telegram(token, 'getWebhookInfo');
    return { bot: { id: String(me.id), name: String(me.first_name || me.username), username: String(me.username) }, webhookActive: Boolean(webhook?.url), pendingUpdates: webhook?.pending_update_count || 0, checkedAt: now(), verified: true, lastError: '' };
  }
  return async function botApi(req, res, next = () => { res.statusCode = 404; res.end(); }) {
    const path = String(req.url || '').split('?')[0];
    if (!path.startsWith('/api/bot/')) return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (code, payload) => { res.statusCode = code; res.end(JSON.stringify(payload)); };
    let ownsLock = false;
    try {
      const host = req.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) throw new ApiError('Dashboard hanya tersedia melalui localhost.', 403);
      if (req.headers.origin && req.headers.origin !== `http://${host}`) throw new ApiError('Asal permintaan tidak diizinkan.', 403);
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new ApiError('Permintaan lintas situs ditolak.', 403);
      if (path === '/api/bot/status' && req.method === 'GET') return reply(200, status());
      if (req.method !== 'POST') throw new ApiError('Metode tidak diizinkan.', 405);
      if (!['/api/bot/connect','/api/bot/disconnect','/api/bot/check','/api/bot/test'].includes(path)) throw new ApiError('Endpoint tidak ditemukan.', 404);
      if (busy) throw new ApiError('Proses koneksi masih berjalan. Tunggu sebentar.', 409);
      busy = true; ownsLock = true;
      const body = await readJson(req);
      if (path === '/api/bot/connect') {
        const token = body.useEnv === true ? String(env.TELEGRAM_BOT_TOKEN || '').trim() : String(body.token || '').trim();
        const adminChatId = String(body.adminChatId || '').trim();
        if (!TOKEN_PATTERN.test(token)) throw new ApiError('Format token belum benar. Gunakan token lengkap dari BotFather.');
        if (adminChatId && !CHAT_PATTERN.test(adminChatId)) throw new ApiError('ID chat admin harus berupa 5–20 angka, bukan username.');
        const verified = await verify(token);
        connection = { ...verified, token, adminChatId };
        return reply(200, status());
      }
      if (path === '/api/bot/disconnect') { connection = null; return reply(200, status()); }
      if (!connection) throw new ApiError('Hubungkan bot terlebih dahulu.', 409);
      if (path === '/api/bot/check') {
        try { connection = { ...connection, ...await verify(connection.token) }; }
        catch (error) { connection.verified = false; connection.lastError = error.message; throw error; }
        return reply(200, status());
      }
      if (!connection.adminChatId) throw new ApiError('Isi ID chat admin saat menghubungkan bot untuk mengirim tes.');
      await telegram(connection.token, 'sendMessage', { chat_id: connection.adminChatId, text: 'Koneksi Cuystore Dashboard berhasil. Ini pesan tes dari tombol Kirim pesan tes di Pengaturan.' });
      return reply(200, { message: 'Pesan tes berhasil dikirim ke chat admin.' });
    } catch (error) {
      // Never forward upstream error text, request objects, tokens, or URLs.
      reply(error instanceof ApiError ? error.status : 500, { error: error instanceof ApiError ? error.message : 'Backend mengalami masalah. Coba lagi.' });
    } finally { if (ownsLock) busy = false; }
  };
}
