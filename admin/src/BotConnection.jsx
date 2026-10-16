import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Link, LoaderCircle, RefreshCw, Send, ShieldCheck, Unplug } from 'lucide-react';
import './connection.css';

export default function BotConnection({ onStatus }) {
  const [status, setStatus] = useState(null);
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [useEnv, setUseEnv] = useState(false);
  const [busy, setBusy] = useState('loading');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  function apply(next) { setStatus(next); onStatus(next); }
  async function api(action, data) {
    let response, payload;
    try {
      response = await fetch(`/api/bot/${action}`, { method: data ? 'POST' : 'GET', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(40000), cache: 'no-store' });
      payload = await response.json();
    } catch { throw new Error('Backend koneksi tidak tersedia. Jalankan ulang server dashboard, lalu coba lagi.'); }
    if (!response.ok) throw new Error(payload.error || 'Koneksi gagal. Coba lagi.');
    return payload;
  }
  useEffect(() => {
    let active = true;
    api('status').then(next => { if (active) { apply(next); setChatId(next.adminChatId || ''); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, []);
  async function run(action) {
    if (busy) return;
    setBusy(action); setError(''); setMessage('');
    try {
      const next = await api(action, action === 'connect' ? { token, adminChatId: chatId, useEnv } : {});
      if (action === 'test') setMessage(next.message);
      else { apply(next); setToken(''); setMessage(action === 'connect' ? 'Bot berhasil terhubung ke API Telegram.' : action === 'disconnect' ? 'Koneksi dashboard diputus. Bot di Telegram tetap ada.' : 'Koneksi API Telegram berhasil diperiksa.'); }
    } catch (e) {
      setError(e.message);
      // Reconcile status after a failed request; a failed replacement keeps the previous bot.
      try { apply(await api('status')); } catch { /* Keep last known identity; UI reports unavailable backend. */ }
    } finally { setBusy(''); }
  }
  return <section className="panel bot-connection"><div className="panel-heading"><div><h2>Koneksi bot Telegram</h2><p>Hubungkan bot milik lo menggunakan token dari BotFather.</p></div><span className={`connection-badge ${status?.connected ? 'is-connected' : ''}`}><i/>{busy === 'loading' ? 'Memuat…' : status?.connected ? 'API terhubung' : status?.configured ? 'Perlu diperiksa' : 'Belum terhubung'}</span></div>
    <div className="connection-content">
      {error && <p className="connection-alert error" role="alert"><AlertCircle size={17}/><span>{error}</span></p>}
      {message && <p className="connection-alert success" role="status"><CheckCircle2 size={17}/><span>{message}</span></p>}
      {status?.configured && <div className="connected-bot"><span className="connected-bot-avatar"><Send size={25}/></span><div><strong>{status.bot.name}</strong><a href={`https://t.me/${status.bot.username}`} target="_blank" rel="noopener noreferrer">@{status.bot.username}<ExternalLink size={12}/></a><small>Bot ID: {status.bot.id}</small></div></div>}
      <form onSubmit={e => { e.preventDefault(); run('connect'); }} autoComplete="off">
        <label htmlFor="bot-token">Token bot <span>Wajib</span></label>
        <input id="bot-token" name="bot-token" type="password" autoComplete="new-password" spellCheck={false} disabled={Boolean(busy) || useEnv} required={!useEnv} maxLength={130} placeholder={status?.configured ? 'Masukkan token untuk mengganti / reconnect bot' : '123456789:AA… dari BotFather'} value={token} onChange={e => setToken(e.target.value)} aria-describedby="bot-token-hint"/>
        <p id="bot-token-hint" className="connection-hint">Token dikirim ke backend lokal untuk verifikasi ke Telegram. Token tidak disimpan di browser dan tidak ditampilkan lagi setelah Connect berhasil.</p>
        {status?.envAvailable && <label className="connection-checkbox"><input type="checkbox" checked={useEnv} disabled={Boolean(busy)} onChange={e => { setUseEnv(e.target.checked); setToken(''); }}/>Gunakan token yang sudah ada di .env server</label>}
        <label htmlFor="admin-chat-id">ID chat admin <span>Opsional</span></label>
        <input id="admin-chat-id" name="admin-chat-id" inputMode="numeric" pattern="[0-9]{5,20}" maxLength={20} placeholder="Contoh: 123456789" value={chatId} disabled={Boolean(busy)} onChange={e => setChatId(e.target.value)}/>
        <p className="connection-hint">Dipakai untuk pesan tes. Masukkan ID numerik chat pribadi dan tekan Start di bot terlebih dahulu. Perubahan ID diterapkan saat klik Connect.</p>
        <div className="connection-buttons"><button type="submit" className="button primary" disabled={Boolean(busy)}>{busy === 'connect' ? <LoaderCircle size={16} className="connection-spinner"/> : <Link size={16}/>} {busy === 'connect' ? 'Menghubungkan…' : 'Connect'}</button><button type="button" className="button secondary" disabled={Boolean(busy)} onClick={() => run('check')}><RefreshCw size={15} className={busy === 'check' ? 'connection-spinner' : ''}/>{busy === 'check' ? 'Memeriksa…' : 'Cek koneksi'}</button>{status?.configured && <button type="button" className="button secondary" disabled={Boolean(busy)} onClick={() => run('disconnect')}><Unplug size={15}/>Disconnect</button>}</div>
      </form>
      {status?.configured && <div className="connection-details"><dl><dt>Terakhir diverifikasi</dt><dd>{new Date(status.checkedAt).toLocaleString('id-ID',{timeZone:'Asia/Makassar',dateStyle:'medium',timeStyle:'short'})} WITA</dd><dt>Penerima pesan tes</dt><dd>{status.adminChatId || 'Belum diisi'}</dd><dt>Webhook</dt><dd>{status.webhookActive ? 'Aktif di layanan lain' : 'Tidak aktif'}</dd></dl><button className="button secondary" disabled={Boolean(busy) || !status.adminChatId || !status.connected} onClick={() => run('test')}><Send size={15}/>{busy === 'test' ? 'Mengirim…' : 'Kirim pesan tes'}</button></div>}
      {status?.webhookActive && <p className="connection-alert warning"><AlertCircle size={17}/><span>Bot memiliki webhook aktif. Dashboard dapat memverifikasi API, tetapi penerimaan pesan masih ditangani layanan webhook tersebut. Webhook tidak diubah saat Connect.</span></p>}
      <div className="connection-note"><ShieldCheck size={19}/><p>Koneksi disimpan selama backend dashboard berjalan. Jika backend restart, hubungkan ulang. Produk, pesanan, dan editor Menu Bot masih demo lokal; Connect belum menerapkan menu ke pelanggan.</p></div>
      <a className="botfather-link" href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">Buka BotFather untuk mendapatkan token <ExternalLink size={13}/></a>
    </div>
  </section>;
}
