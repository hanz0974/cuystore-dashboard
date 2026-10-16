import { createUsageStore } from './usage.mjs';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

export function chunks(text, size = 3800) {
  const result = []; let part = '';
  for (const char of text) {
    if (part.length + char.length > size) { result.push(part); part = ''; }
    part += char;
  }
  if (part) result.push(part);
  return result;
}

export function createBot(env = process.env, request = fetch, usageStore = createUsageStore()) {
  const base = (env.NINE_ROUTER_BASE_URL || 'http://127.0.0.1:20128/v1').replace(/\/+$/, '');
  const allowed = new Set((env.TELEGRAM_ALLOWED_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean));
  const sessions = new Map();
  async function json(url, body, headers = {}, timeout = 120000) {
    let response;
    try {
      response = await request(url, { method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
    } catch { throw new Error('Koneksi gagal atau timeout. Cek internet dan apakah 9router masih berjalan.'); }
    let data;
    try { data = await response.json(); } catch { throw new Error(`Respons API tidak valid (HTTP ${response.status}).`); }
    if (!response.ok || data.ok === false) {
      const source = data.error ?? data;
      const detail = String(typeof source === 'string' ? source
        : source?.message || source?.description || source?.detail || data.description || '').trim()
        || (() => { try { return JSON.stringify(data).slice(0, 2000); } catch { return ''; } })();
      let message = `API gagal (HTTP ${response.status}, kode ${data.error_code || response.status}). Cek token/key, model, dan koneksi provider.`;
      if (url.startsWith(`${base}/`)) {
        const missing = detail.match(/No active credentials for provider:\s*([a-zA-Z0-9_-]+)/i);
        if (missing) message = `Provider ${missing[1]} belum punya koneksi akun aktif di 9router. Hubungkan atau aktifkan akun provider itu di dashboard 9router, atau pilih model dari provider yang sudah terhubung dengan /model nama-model. /models menampilkan katalog, bukan jaminan model siap dipakai.`;
        else if (/Missing API key|invalid.api.key/i.test(detail)) message = 'API key 9router kosong atau tidak valid. Periksa NINE_ROUTER_API_KEY di .env lalu restart bot.';
      }
      const error = new Error(message);
      error.status = data.error_code || response.status;
      error.retryAfter = data.parameters?.retry_after;
      error.detail = detail;
      throw error;
    }
    return data;
  }
  const router = (path, body) => json(`${base}/${path}`, body,
    env.NINE_ROUTER_API_KEY ? { Authorization: `Bearer ${env.NINE_ROUTER_API_KEY}` } : {});
  async function telegram(method, body) {
    for (let attempt = 0; ; attempt++) {
      try { return (await json(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, body, {}, 45000)).result; }
      catch (e) { if (e.status !== 429 || attempt >= 2) throw e; await sleep(Math.min(e.retryAfter || 5, 60) * 1000); }
    }
  }
  async function send(chatId, text) {
    for (const part of chunks(text)) await telegram('sendMessage', { chat_id: chatId, text: part });
  }
  async function handle(message) {
    if (!message || message.from?.is_bot || message.chat?.type !== 'private') return;
    const id = message.chat.id;
    const text = message.text?.trim() || '';
    const [raw, ...args] = text.split(/\s+/);
    const command = raw.split('@')[0].toLowerCase();
    if (command === '/id') return send(id, `ID Telegram lo: ${message.from.id}`);
    if (!allowed.has(String(message.from.id))) return send(id, 'Akses belum diizinkan. Masukkan ID dari /id ke TELEGRAM_ALLOWED_USER_IDS di .env, lalu restart bot.');
    if (!sessions.has(id)) sessions.set(id, { model: env.NINE_ROUTER_MODEL || '', history: [] });
    const session = sessions.get(id);
    if (command === '/start' || command === '/help') return send(id, 'Halo! Kirim teks untuk ngobrol lewat 9router.\n/model <nomor atau nama> — pilih model/combo\n/models [kata] [halaman] — cari model\n/reset — hapus riwayat\n/usage — pemakaian token\n/status — model aktif\n/id — ID Telegram');
    if (command === '/usage') return send(id, usageStore.report(message.from.id));
    if (command === '/reset') { session.history = []; return send(id, 'Riwayat dihapus. Mulai obrolan baru!'); }
    if (command === '/status') return send(id, `Model: ${session.model || 'belum dipilih'}\nRiwayat: ${session.history.length / 2} percakapan`);
    if (command === '/models') {
      const list = (await router('models')).data || [];
      const hasPage = /^\d+$/.test(args.at(-1) || '');
      const page = hasPage ? Number(args.at(-1)) : 1;
      const query = (hasPage ? args.slice(0, -1) : args).join(' ');
      const ids = [...new Set(list.map(x => x.id).filter(x => typeof x === 'string'))].filter(x => x.toLowerCase().includes(query.toLowerCase())).sort();
      if (!ids.length) { session.modelChoices = []; return send(id, 'Model tidak ditemukan. Coba /models.'); }
      const pages = Math.ceil(ids.length / 20);
      if (!Number.isSafeInteger(page) || page < 1 || page > pages) return send(id, `Halaman tersedia: 1-${pages}.`);
      session.modelChoices = ids;
      const start = (page - 1) * 20;
      const rows = ids.slice(start, start + 20).map((name, i) => `${start + i + 1}. ${name}${name === session.model ? ' (dipilih)' : ''}`);
      return send(id, `Katalog model 9router - halaman ${page}/${pages} (${ids.length} model)\n\n${rows.join('\n')}\n\nPilih: /model ${start + 1}\nAtau /model nama-model\n${page < pages ? `Berikutnya: /models ${query ? query + ' ' : ''}${page + 1}\n` : ''}Cari: /models gpt\nNomor mengikuti hasil /models terakhir. Respons bergantung pada provider yang terhubung di 9router.`);
    }
    if (command === '/model') {
      if (!args.length) return send(id, `Model: ${session.model || 'belum dipilih'}. Pakai /model nama-model-atau-combo`);
      let selected = args.join(' ');
      if (/^\d+$/.test(selected)) {
        selected = session.modelChoices?.[Number(selected) - 1];
        if (!selected) return send(id, 'Nomor tidak ada. Buka /models dulu, lalu pilih nomor dari daftar.');
      }
      session.model = selected; session.history = [];
      return send(id, `Pilihan model disimpan: ${session.model}. Riwayat direset. Koneksi provider belum diverifikasi; akan dicek saat mengirim pesan.`);
    }
    if (text.startsWith('/')) return send(id, 'Perintah tidak dikenal. Lihat /help.');
    if (!text) return send(id, 'Saat ini bot mendukung pesan teks.');
    if (!session.model) return send(id, 'Pilih model/combo aktif dari 9router dengan /model nama. Cari nama dengan /models kata.');
    const typing = () => telegram('sendChatAction', { chat_id: id, action: 'typing' }).catch(() => {});
    await typing();
    const timer = setInterval(typing, 4000);
    try {
      const history = [...session.history, { role: 'user', content: text }];
      const result = await router('chat/completions', {
        model: session.model, stream: false,
        max_tokens: Number(env.NINE_ROUTER_MAX_TOKENS) > 0 ? Number(env.NINE_ROUTER_MAX_TOKENS) : 4096,
        messages: [{ role: 'system', content: env.SYSTEM_PROMPT || 'Jawab dalam bahasa Indonesia dengan jelas.' }, ...history]
      });
      usageStore.record(message.from.id, result.usage);
      const answer = result.choices?.[0]?.message?.content;
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('Model tidak mengembalikan teks. Coba model lain.');
      await send(id, answer);
      session.history = [...history, { role: 'assistant', content: answer }].slice(-20);
      while (session.history.length > 2 && JSON.stringify(session.history).length > 40000) session.history.splice(0, 2);
    } finally { clearInterval(timer); }
  }
  return { router, telegram, send, handle };
}

const logError = e => console.error(e.detail && e.detail !== e.message ? `${e.message}\n[detail API] ${e.detail}` : e.message);

async function main() {
  const bot = createBot(process.env, fetch, createUsageStore(process.env.BOT_USAGE_FILE || fileURLToPath(new URL('./usage.json', import.meta.url))));
  if (process.argv.includes('--check')) {
    const models = await bot.router('models');
    console.log(`9router terhubung: ${models.data?.length || 0} model terdaftar.`);
    if (process.env.NINE_ROUTER_MODEL) {
      const result = await bot.router('chat/completions', { model: process.env.NINE_ROUTER_MODEL, stream: false, max_tokens: 64, messages: [{ role: 'user', content: 'Balas hanya OK.' }] });
      if (!result.choices?.[0]?.message?.content) throw new Error('Model tidak mengembalikan teks.');
      console.log('Tes respons model berhasil.');
    } else console.log('Model belum dipilih; tes inferensi dilewati.');
    return;
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('Isi TELEGRAM_BOT_TOKEN di .env terlebih dahulu.');
  const me = await bot.telegram('getMe', {});
  const webhook = await bot.telegram('getWebhookInfo', {});
  if (webhook.url) throw new Error('Bot ini punya webhook aktif. Gunakan bot baru atau hapus webhook lama sebelum menjalankan polling.');
  console.log(`Bot @${me.username} aktif. Ctrl+C untuk berhenti.`);
  if (!process.env.TELEGRAM_ALLOWED_USER_IDS) console.log('Akses AI terkunci. Kirim /id, isi TELEGRAM_ALLOWED_USER_IDS di .env, lalu restart.');
  let offset = 0;
  for (;;) {
    try {
      const updates = await bot.telegram('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] });
      for (const update of updates) {
        try { await bot.handle(update.message); }
        catch (e) {
          logError(e);
          if (update.message?.chat?.type === 'private') await bot.send(update.message.chat.id, e.message).catch(() => {});
        }
        offset = update.update_id + 1;
      }
    } catch (e) {
      if ([401, 409].includes(e.status)) throw e;
      logError(e); await sleep(5000);
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { logError(e); process.exitCode = 1; });
}
