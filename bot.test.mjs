import test from 'node:test';
import assert from 'node:assert/strict';
import { createBot, chunks } from './bot.mjs';

function fixture() {
  const calls = [];
  const bot = createBot({ TELEGRAM_BOT_TOKEN: 'test', TELEGRAM_ALLOWED_USER_IDS: '42', NINE_ROUTER_MODEL: 'model-a' }, async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url, body });
    const data = url.endsWith('/chat/completions') ? { choices: [{ message: { content: 'Jawaban uji' } }] } : { ok: true, result: {} };
    return { ok: true, status: 200, json: async () => data };
  });
  const message = (text, user = 42, type = 'private') => ({ text, from: { id: user }, chat: { id: user, type } });
  return { bot, calls, message, completions: () => calls.filter(x => x.url.endsWith('/chat/completions')) };
}

test('unauthorized users and group chats never reach router', async () => {
  const f = fixture();
  await f.bot.handle(f.message('halo', 99));
  await f.bot.handle(f.message('halo', 42, 'group'));
  assert.equal(f.completions().length, 0);
});
test('conversation keeps history; model switch and reset clear it', async () => {
  const f = fixture();
  await f.bot.handle(f.message('satu'));
  await f.bot.handle(f.message('dua'));
  assert.equal(f.completions()[1].body.messages.length, 4);
  await f.bot.handle(f.message('/model custom-combo'));
  await f.bot.handle(f.message('tiga'));
  assert.equal(f.completions()[2].body.model, 'custom-combo');
  assert.equal(f.completions()[2].body.messages.length, 2);
  await f.bot.handle(f.message('/reset'));
  await f.bot.handle(f.message('empat'));
  assert.equal(f.completions()[3].body.messages.length, 2);
});
test('long emoji answers split without corrupting Unicode', () => {
  const original = 'a' + '😀'.repeat(6000);
  const parts = chunks(original);
  assert.equal(parts.join(''), original);
  assert.ok(parts.every(x => x.length <= 3800 && x.isWellFormed()));
});
test('provider failure does not add failed prompt to history', async () => {
  let fail = true; const requests = [];
  const bot = createBot({ TELEGRAM_ALLOWED_USER_IDS: '42', NINE_ROUTER_MODEL: 'x' }, async (url, options) => {
    if (url.endsWith('/chat/completions')) {
      requests.push(JSON.parse(options.body));
      if (fail) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, result: {} }) };
  });
  const m = text => ({ text, from: { id: 42 }, chat: { id: 42, type: 'private' } });
  await assert.rejects(bot.handle(m('gagal')));
  fail = false;
  await bot.handle(m('coba lagi'));
  assert.equal(requests[1].messages.length, 2);
  assert.equal(requests[1].messages[1].content, 'coba lagi');
});


test('missing provider credentials produces actionable error without leaking raw details', async () => {
  const bot = createBot({}, async () => ({ ok: false, status: 404,
    json: async () => ({ error: { message: 'No active credentials for provider: antigravity secret-data' } }) }));
  await assert.rejects(bot.router('chat/completions', {}), e => {
    assert.match(e.message, /Provider antigravity belum punya koneksi akun aktif/);
    assert.doesNotMatch(e.message, /secret-data/);
    assert.equal(e.status, 404);
    return true;
  });
});
