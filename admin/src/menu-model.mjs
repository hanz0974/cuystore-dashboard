export const initialMenu = {
  columns: 2,
  buttons: [
    { id: 'catalog', label: 'Lihat produk', action: 'catalog', visible: true, message: '', url: '' },
    { id: 'howto', label: 'Cara beli', action: 'message', visible: true, message: 'Pilih produk di katalog, lalu ikuti petunjuk pemesanan dari toko. Hubungi admin jika perlu bantuan.', url: '' },
    { id: 'support', label: 'Hubungi admin', action: 'message', visible: true, message: 'Butuh bantuan? Hubungi admin melalui kontak resmi toko. Atur informasi kontak di editor menu.', url: '' },
    { id: 'faq', label: 'FAQ', action: 'message', visible: true, message: 'Jam layanan dan ketentuan produk tersedia melalui admin toko. Silakan tanyakan sebelum membeli.', url: '' },
  ],
};
export function safeMenuUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
export function menuError(config) {
  if (!config || ![1, 2, 3].includes(config.columns) || !Array.isArray(config.buttons) || config.buttons.length > 20) return 'Susunan menu tidak valid. Gunakan maksimal 20 tombol.';
  const ids = new Set();
  for (const button of config.buttons) {
    if (!button || typeof button.id !== 'string' || ids.has(button.id)) return 'ID tombol menu harus unik.';
    ids.add(button.id);
    if (typeof button.message !== 'string' || typeof button.url !== 'string') return 'Isi tombol menu tidak valid.';
    if (typeof button.label !== 'string' || !button.label.trim() || button.label.length > 40) return 'Setiap tombol perlu nama, maksimal 40 karakter.';
    if (typeof button.visible !== 'boolean' || !['catalog', 'message', 'link'].includes(button.action)) return 'Pilih aksi yang valid untuk setiap tombol.';
    if (button.action === 'message' && (typeof button.message !== 'string' || !button.message.trim() || button.message.length > 2000)) return `Isi balasan untuk tombol “${button.label}”, maksimal 2.000 karakter.`;
    if (button.action === 'link' && (typeof button.url !== 'string' || !safeMenuUrl(button.url))) return `Isi alamat http:// atau https:// yang valid untuk tombol “${button.label}”.`;
  }
  return '';
}
export function moveMenuButton(config, id, delta) {
  const from = config.buttons.findIndex(button => button.id === id), to = from + delta;
  if (from < 0 || to < 0 || to >= config.buttons.length) return config;
  const buttons = [...config.buttons];
  [buttons[from], buttons[to]] = [buttons[to], buttons[from]];
  return { ...config, buttons };
}
