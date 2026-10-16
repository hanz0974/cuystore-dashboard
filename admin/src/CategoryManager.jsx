import React, { useState } from 'react';
import { Check, FolderOpen, Plus, Trash2 } from 'lucide-react';
import './categories.css';

export default function CategoryManager({ categories, products, onAdd, onRename, onDelete }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  function action(work) {
    const result = work();
    setError(result || '');
    setNotice(result ? '' : 'Kategori diperbarui di browser ini.');
    return !result;
  }
  return <details className="category-manager"><summary><span><FolderOpen size={17}/>Kelola kategori <b>{categories.length}</b></span><small>Tambah, ubah nama, atau hapus</small></summary><div className="category-content"><p>Buat kategori sesuai kebutuhan toko. Mengubah nama kategori juga memperbarui semua produk di dalamnya.</p><form className="category-add" onSubmit={e => { e.preventDefault(); if (action(() => onAdd(name))) setName(''); }}><label htmlFor="new-category">Kategori baru<input id="new-category" maxLength={50} required placeholder="Contoh: Voucher Game" value={name} onChange={e => setName(e.target.value)}/></label><button type="submit" className="button primary"><Plus size={15}/>Tambah kategori</button></form>{error && <p className="category-error" role="alert">{error}</p>}{notice && <p className="category-notice" role="status">{notice}</p>}<div className="category-list">{categories.map(category => <CategoryRow key={category} category={category} count={products.filter(p => p.category === category).length} onRename={next => action(() => onRename(category,next))} onDelete={() => action(() => onDelete(category))}/>)}{!categories.length && <p className="category-empty">Belum ada kategori. Tambahkan di atas atau ketik kategori saat membuat produk.</p>}</div><p className="category-hint">Kategori yang masih dipakai produk tidak bisa dihapus. Pindahkan produknya ke kategori lain terlebih dahulu.</p></div></details>;
}
function CategoryRow({ category, count, onRename, onDelete }) {
  const [draft, setDraft] = useState(category);
  return <form className="category-row" onSubmit={e => { e.preventDefault(); onRename(draft); }}><label><span className="sr-only">Nama kategori {category}</span><input value={draft} required maxLength={50} onChange={e => setDraft(e.target.value)}/></label><span className="category-count">{count} produk</span><button type="submit" className="icon-button" disabled={draft === category} aria-label={`Simpan nama kategori ${category}`}><Check size={17}/></button><button type="button" className="icon-button" disabled={count > 0} title={count ? 'Pindahkan produk sebelum menghapus kategori' : 'Hapus kategori'} aria-label={`Hapus kategori ${category}`} onClick={onDelete}><Trash2 size={16}/></button></form>;
}
