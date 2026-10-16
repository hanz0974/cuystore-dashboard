import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronLeft, ExternalLink, Eye, EyeOff, GripVertical, MessageCircle, Plus, RotateCcw, Save, Send, ShoppingBag, Trash2 } from 'lucide-react';
import { initialMenu, menuError, moveMenuButton, safeMenuUrl } from './menu-model.mjs';
import './menu.css';

const STORAGE_KEY = 'cuystore.bot-menu.v1';
const actionLabels = { catalog: 'Tampilkan katalog', message: 'Kirim balasan teks', link: 'Buka tautan' };
const rupiah = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
function readMenu() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return { menu: initialMenu, error: '' };
    const menu = JSON.parse(text), error = menuError(menu);
    return error ? { menu: initialMenu, error: 'Data menu tersimpan tidak valid. Menu contoh ditampilkan; simpan untuk menggantinya.' } : { menu, error: '' };
  } catch { return { menu: initialMenu, error: 'Data menu tidak bisa dibaca. Coba simpan ulang; periksa izin penyimpanan browser jika gagal.' }; }
}

export default function MenuBuilder({ settings, products }) {
  const [loaded] = useState(readMenu);
  const [saved, setSaved] = useState(loaded.menu);
  const [draft, setDraft] = useState(loaded.menu);
  const [selected, setSelected] = useState(loaded.menu.buttons[0]?.id ?? null);
  const [error, setError] = useState(loaded.error);
  const [feedback, setFeedback] = useState('');
  const [response, setResponse] = useState(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const button = draft.buttons.find(item => item.id === selected);
  const visible = draft.buttons.filter(item => item.visible);
  // Preview always follows the draft; replies are cleared when the menu changes.
  useEffect(() => setResponse(null), [draft, settings.welcome]);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const update = patch => { setDraft(prev => ({ ...prev, buttons: prev.buttons.map(item => item.id === selected ? { ...item, ...patch } : item) })); setFeedback(''); setError(''); };
  function addButton() {
    if (draft.buttons.length >= 20) return;
    const item = { id: crypto.randomUUID(), label: 'Menu baru', action: 'message', message: 'Tulis balasan untuk pelanggan di sini.', url: '', visible: true };
    setDraft(prev => ({ ...prev, buttons: [...prev.buttons, item] })); setSelected(item.id); setFeedback(''); setError('');
  }
  function save() {
    const issue = menuError(draft);
    if (issue) { setError(issue); setFeedback(''); return; }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setSaved(draft); setError(''); setFeedback('Menu disimpan di browser ini. Belum diterapkan ke Telegram.');
    } catch { setError('Menu belum tersimpan. Penyimpanan browser penuh atau diblokir. Coba kosongkan ruang lalu simpan kembali.'); setFeedback(''); }
  }
  function discard() { setDraft(saved); setSelected(saved.buttons[0]?.id ?? null); setError(''); setFeedback('Perubahan dibatalkan. Menu tersimpan dipulihkan.'); }
  function remove() {
    const remaining = draft.buttons.filter(item => item.id !== selected);
    setDraft(prev => ({ ...prev, buttons: remaining })); setSelected(remaining[0]?.id ?? null); setFeedback('Tombol dihapus dari draf. Batal perubahan akan memulihkannya sebelum disimpan.'); setError('');
  }
  return <div className="menu-builder">
    <div className="menu-toolbar"><div><span className={`menu-save-state ${dirty ? 'unsaved' : ''}`}><i/>{dirty ? 'Ada perubahan belum disimpan' : 'Menggunakan menu tersimpan'}</span><p>Atur tombol di bawah pesan sambutan. Preview berubah saat lo mengedit.</p></div><div className="menu-toolbar-actions"><button className="button secondary" disabled={!dirty} onClick={discard}><RotateCcw size={15}/>Batal perubahan</button><button className="button primary" onClick={save}><Save size={15}/>Simpan menu</button></div></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    {feedback && <p className="menu-feedback" role="status"><Check size={15}/>{feedback}</p>}
    <div className="menu-layout">
      <section className="panel menu-editor" aria-label="Editor menu bot">
        <div className="panel-heading"><div><h2>Tombol menu</h2><p>{visible.length} tampil · {draft.buttons.length} total · maksimal 20 tombol</p></div><button className="button secondary compact" disabled={draft.buttons.length >= 20} onClick={addButton}><Plus size={15}/>Tambah tombol</button></div>
        <div className="menu-layout-control"><label htmlFor="menu-columns">Tombol per baris</label><select id="menu-columns" value={draft.columns} onChange={e => { setDraft(prev => ({ ...prev, columns: Number(e.target.value) })); setFeedback(''); }}><option value={1}>1 tombol</option><option value={2}>2 tombol</option><option value={3}>3 tombol</option></select></div>
        <div className="menu-button-list" aria-label="Urutan tombol">
          {draft.buttons.map((item,index) => <div className={`menu-list-row ${selected === item.id ? 'selected' : ''} ${!item.visible ? 'hidden-item' : ''}`} key={item.id}><button className="menu-select" onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}><span className="menu-position">{index + 1}</span><span><strong>{item.label || 'Tanpa nama'}</strong><small>{actionLabels[item.action]}{!item.visible && ' · Disembunyikan'}</small></span></button><div className="menu-row-actions"><button className="icon-button" disabled={index === 0} aria-label={`Naikkan ${item.label}`} onClick={() => setDraft(prev => moveMenuButton(prev,item.id,-1))}><ArrowUp size={15}/></button><button className="icon-button" disabled={index === draft.buttons.length - 1} aria-label={`Turunkan ${item.label}`} onClick={() => setDraft(prev => moveMenuButton(prev,item.id,1))}><ArrowDown size={15}/></button><button className="icon-button" aria-label={`${item.visible ? 'Sembunyikan' : 'Tampilkan'} ${item.label}`} aria-pressed={item.visible} onClick={() => setDraft(prev => ({...prev,buttons:prev.buttons.map(b => b.id === item.id ? {...b,visible:!b.visible} : b)}))}>{item.visible ? <Eye size={16}/> : <EyeOff size={16}/>}</button></div></div>)}
          {!draft.buttons.length && <div className="empty">Belum ada tombol. Klik Tambah tombol untuk mulai.</div>}
        </div>
        {button && <div className="menu-fields"><div className="menu-fields-title"><h3>Edit tombol</h3><button className="delete-menu-button" onClick={remove}><Trash2 size={14}/>Hapus tombol</button></div><label htmlFor="menu-label">Nama tombol <span>{button.label.length}/40</span></label><input id="menu-label" maxLength={40} value={button.label} onChange={e => update({label:e.target.value})}/><label htmlFor="menu-action">Saat tombol diklik</label><select id="menu-action" value={button.action} onChange={e => update({action:e.target.value})}><option value="catalog">Tampilkan katalog produk</option><option value="message">Kirim balasan teks</option><option value="link">Buka tautan website / Telegram</option></select>
          {button.action === 'message' && <><label htmlFor="menu-message">Isi balasan <span>{button.message.length}/2.000</span></label><textarea id="menu-message" rows={4} maxLength={2000} value={button.message} onChange={e => update({message:e.target.value})}/><small className="menu-field-hint">Balasan teks biasa yang ditampilkan saat pelanggan menekan tombol ini.</small></>}
          {button.action === 'link' && <><label htmlFor="menu-url">Alamat tujuan</label><input id="menu-url" type="url" value={button.url} placeholder="https://t.me/username_admin" onChange={e => update({url:e.target.value})}/><small className="menu-field-hint">Gunakan tautan lengkap dengan http:// atau https://.</small></>}
          {button.action === 'catalog' && <div className="menu-catalog-note"><ShoppingBag size={18}/><p>Preview menampilkan {products.length} produk dari katalog demo toko. Kelola produknya melalui menu Produk.</p></div>}
          <label className="menu-checkbox"><input type="checkbox" checked={button.visible} onChange={e => update({visible:e.target.checked})}/>Tampilkan tombol ini ke pelanggan</label>
        </div>}
      </section>
      <aside className="menu-preview-column"><div className="preview-heading"><div><h2>Preview pelanggan</h2><p>Klik tombol untuk mencoba alurnya.</p></div><span><Eye size={13}/>Live</span></div><section className="telegram-preview" aria-label="Simulasi menu Telegram"><div className="telegram-top"><ChevronLeft size={20}/><span className="telegram-avatar"><ShoppingBag size={22}/></span><div><strong>{settings.name}</strong><small>bot · simulasi</small></div><button aria-label="Mulai ulang preview" className="icon-button" onClick={() => setResponse(null)}><RotateCcw size={17}/></button></div><div className="telegram-chat"><div className="chat-date">Preview menu bot</div><div className="chat-bubble"><strong>{settings.name}</strong><p>{settings.welcome}</p><small>14:32 <Check size={11}/></small></div><div className="telegram-keyboard" style={{gridTemplateColumns:`repeat(${draft.columns}, minmax(0,1fr))`}}>{visible.map(item => <button key={item.id} onClick={() => setResponse(item)}>{item.label || 'Tanpa nama'}{item.action === 'link' && <ExternalLink size={11}/>}</button>)}</div>{!visible.length && <p className="preview-empty">Tidak ada tombol yang ditampilkan. Aktifkan atau tambah tombol di editor.</p>}
          {response && <div className="chat-response" aria-live="polite"><div className="chat-sent">{response.label}<Check size={11}/></div><div className="chat-bubble"><strong>{settings.name}</strong>{response.action === 'message' && <p>{response.message || 'Balasan belum diisi.'}</p>}{response.action === 'catalog' && <><p>Berikut katalog produk demo kami:</p><div className="preview-products">{products.map(p => <div key={p.id}><span>{p.name}<small>{p.stock > 0 ? `${p.stock} tersedia` : 'Stok habis'}</small></span><b>{rupiah(p.price)}</b></div>)}</div>{!products.length && <p>Belum ada produk di katalog.</p>}</>}{response.action === 'link' && <><p>Tombol ini akan membuka tautan:</p>{safeMenuUrl(response.url) ? <a href={response.url} target="_blank" rel="noopener noreferrer">{response.url}<ExternalLink size={13}/></a> : <p className="preview-link-error">Alamat belum valid. Isi tautan di editor.</p>}<small className="preview-link-hint">Di preview, tautan hanya terbuka jika lo klik alamatnya.</small></>}</div><button className="preview-back" onClick={() => setResponse(null)}><ChevronLeft size={13}/>Kembali ke menu</button></div>}
        </div><div className="telegram-input"><MenuIcon/><span>Tulis pesan…</span><Send size={17}/></div></section><p className="preview-disclaimer"><MessageCircle size={16}/><span>Simulasi tampilan tombol di bawah pesan bot. Belum mengubah menu atau mengirim pesan di Telegram asli.</span></p></aside>
    </div>
  </div>;
}
function MenuIcon() { return <span className="telegram-menu-label">Menu</span>; }
