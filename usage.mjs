import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const empty = () => ({ requests: 0, input: 0, output: 0, total: 0, missing: 0 });
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
export function createUsageStore(file) {
  let state = { since: new Date().toISOString(), users: {} };
  if (file) {
    try {
      state = JSON.parse(readFileSync(file, 'utf8'));
      if (!state.since || !state.users || typeof state.users !== 'object') throw new Error('invalid');
      for (const u of Object.values(state.users)) {
        if (Object.keys(empty()).some(k => count(u[k]) === null)) throw new Error('invalid');
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw new Error('Tidak bisa membaca usage.json. Periksa file sebelum menjalankan bot; data tidak ditimpa.');
    }
  }
  let saveFailed = false;
  return {
    record(id, usage) {
      const u = state.users[String(id)] ||= empty();
      const input = count(usage?.prompt_tokens) ?? count(usage?.input_tokens);
      const output = count(usage?.completion_tokens) ?? count(usage?.output_tokens);
      const total = count(usage?.total_tokens) ?? (input !== null && output !== null ? input + output : null);
      u.requests++;
      u.input += input ?? 0; u.output += output ?? 0; u.total += total ?? 0;
      if (input === null || output === null || total === null) u.missing++;
      if (file) {
        try {
          writeFileSync(`${file}.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
          renameSync(`${file}.tmp`, file); saveFailed = false;
        } catch { saveFailed = true; console.error('Gagal menyimpan penggunaan token. Data sementara masih di RAM.'); }
      }
    },
    report(id) {
      const u = state.users[String(id)] || empty();
      const n = x => x.toLocaleString('id-ID');
      return `Pemakaian token lo lewat bot\nSejak pencatatan: ${state.since.slice(0, 10)}\nRespons API: ${n(u.requests)}\nInput tercatat: ${n(u.input)}\nOutput tercatat: ${n(u.output)}\nTotal tercatat: ${n(u.total)}\nRespons dengan data token tidak lengkap: ${n(u.missing)}\n\nSisa kuota akun: tidak tersedia dari respons chat.\nHanya pemakaian sejak fitur ini aktif; tidak termasuk aplikasi lain atau permintaan gagal tanpa respons usage. /reset tidak menghapus hitungan.${saveFailed ? '\nPenyimpanan gagal: hitungan terbaru masih di RAM dan bisa hilang saat restart.' : ''}`;
    }
  };
}
