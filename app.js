/* =====================================================================
   PAUTA — prazos, agenda, equipe e chat do escritório
   SPA sem build (roda direto no GitHub Pages).
   - Com APP_CONFIG.firebase preenchido: login Google + Firestore em tempo real.
   - Sem config: modo demonstração (dados de exemplo no navegador).
   ===================================================================== */

const CFG = window.APP_CONFIG || {};
const OFFICE = CFG.officeName || 'Advocacia Coradelli';
const IS_ARTIFACT = !!CFG.artifactPreview;
const LS_DEMO = 'pauta-demo-v1';
const LS_LOCAL = 'pauta-local-v1';
const LS_LOCAL_EU = 'pauta-local-eu';
const FIREBASE_V = '10.12.2';

/* ---------------- utilidades ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayISO = () => toISO(new Date());
const addDaysISO = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
const trunc = (s, n) => (s = String(s || ''), s.length > n ? s.slice(0, n - 1) + '…' : s);
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* armazenamento indisponível */ } },
};
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const fmtDate = iso => iso ? parseISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtDayLong = iso => { const s = parseISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); return s[0].toUpperCase() + s.slice(1); };
const fmtShort = iso => parseISO(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '');
const dayRel = iso => { const d = daysBetween(todayISO(), iso); return d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : d === -1 ? 'Ontem' : fmtShort(iso); };
const fmtTime = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtStamp = ts => { const d = new Date(ts); return `${toISO(d) === todayISO() ? 'hoje' : d.toLocaleDateString('pt-BR')} ${fmtTime(ts)}`; };

/* ---------------- domínio jurídico ---------------- */
const AREAS = ['Previdenciário', 'Cível', 'Trabalhista', 'Família e Sucessões', 'Federal', 'Notarial e Imobiliário', 'Consumidor', 'Criminal', 'Outro'];
const TIPOS_PRAZO = ['Contestação', 'Réplica', 'Manifestação', 'Recurso', 'Contrarrazões', 'Embargos de declaração', 'Cumprimento de exigência (INSS)', 'Recurso administrativo (CRPS)', 'Audiência', 'Perícia', 'Outro'];
const TIPOS_EVENTO = ['Audiência', 'Reunião', 'Atendimento', 'Perícia', 'Diligência', 'Prazo interno', 'Outro'];
const CORES = ['#2347B0', '#9C3D54', '#1F7A6D', '#8A5A00', '#5B3FA8', '#2F6B2F', '#B04A1C', '#3D5A80'];

/* Número CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO — dígito verificador módulo 97 */
const UF_TR = ['', 'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DFT', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SE', 'SP', 'TO'];
function cnjDV(N, A, J, TR, O) { const r = BigInt(N + A + J + TR + O + '00') % 97n; return pad(Number(98n - r)); }
function cnjParse(s) {
  const d = String(s || '').replace(/\D/g, '');
  if (d.length !== 20) return null;
  const p = { N: d.slice(0, 7), DD: d.slice(7, 9), A: d.slice(9, 13), J: d.slice(13, 14), TR: d.slice(14, 16), O: d.slice(16, 20) };
  p.valid = BigInt(p.N + p.A + p.J + p.TR + p.O + p.DD) % 97n === 1n;
  p.formatted = `${p.N}-${p.DD}.${p.A}.${p.J}.${p.TR}.${p.O}`;
  return p;
}
function cnjMask(s) {
  const d = String(s || '').replace(/\D/g, '').slice(0, 20);
  const cut = [7, 9, 13, 14, 16]; const sep = ['-', '.', '.', '.', '.'];
  let out = ''; for (let i = 0; i < d.length; i++) { const k = cut.indexOf(i); if (k >= 0) out += sep[k]; out += d[i]; }
  return out;
}
function cnjOrgao(p) {
  const tr = +p.TR;
  switch (p.J) {
    case '1': return 'STF';
    case '3': return 'STJ';
    case '4': return tr >= 1 && tr <= 6 ? `TRF${tr}` : 'Justiça Federal';
    case '5': return tr === 0 ? 'TST' : `TRT${tr}`;
    case '6': return tr === 0 ? 'TSE' : `TRE-${(UF_TR[tr] || '').replace('DFT', 'DF')}`;
    case '8': return UF_TR[tr] ? `TJ${UF_TR[tr]}` : 'Justiça Estadual';
    default: return '';
  }
}

/* Feriados nacionais + datas forenses comuns. Estimativa: feriados locais e suspensões do tribunal ficam por conta de quem confere. */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da);
}
const _hol = {};
function holidays(y) {
  if (_hol[y]) return _hol[y];
  const map = {};
  [['01-01', 'Confraternização Universal'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['09-07', 'Independência'], ['10-12', 'N. Sra. Aparecida'],
   ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['11-20', 'Consciência Negra'], ['12-08', 'Dia da Justiça'], ['12-25', 'Natal']]
    .forEach(([md, n]) => { map[`${y}-${md}`] = n; });
  const e = easter(y);
  const add = (off, n) => { const d = new Date(e); d.setDate(d.getDate() + off); map[toISO(d)] = n; };
  add(-48, 'Carnaval'); add(-47, 'Carnaval'); add(-2, 'Sexta-feira Santa'); add(60, 'Corpus Christi');
  return (_hol[y] = map);
}
const holidayName = iso => holidays(+iso.slice(0, 4))[iso];
const inRecesso = iso => { const md = iso.slice(5); return md >= '12-20' || md <= '01-20'; };
function isBusinessDay(iso, recesso) {
  const w = parseISO(iso).getDay();
  if (w === 0 || w === 6) return false;
  if (holidayName(iso)) return false;
  if (recesso && inRecesso(iso)) return false;
  return true;
}
/* início = data da intimação/publicação; a contagem começa no dia seguinte */
function calcPrazo(inicio, n, modo, recesso) {
  let cur = inicio;
  if (modo === 'uteis') { let c = 0; while (c < n) { cur = addDaysISO(cur, 1); if (isBusinessDay(cur, recesso)) c++; } return cur; }
  cur = addDaysISO(inicio, n);
  while (!isBusinessDay(cur, recesso)) cur = addDaysISO(cur, 1);
  return cur;
}
function subBusinessDays(iso, n) { let cur = iso, c = 0; while (c < n) { cur = addDaysISO(cur, -1); if (isBusinessDay(cur, false)) c++; } return cur; }
function businessDaysUntil(iso) { const t = todayISO(); if (iso <= t) return 0; let cur = t, c = 0; while (cur < iso) { cur = addDaysISO(cur, 1); if (isBusinessDay(cur, false)) c++; } return c; }

/* urgência do prazo */
function urg(c) {
  if (c.status === 'cumprido') return { k: 'cumprido', label: 'Cumprido', top: '✓', sub: 'feito', rank: 9 };
  if (!c.prazo) return { k: 'semprazo', label: 'Sem prazo', top: '—', sub: 'sem data', rank: 8 };
  const d = daysBetween(todayISO(), c.prazo);
  if (d < 0) return { k: 'vencido', label: d === -1 ? 'Venceu ontem' : `Venceu há ${-d} dias`, top: `D+${-d}`, sub: 'vencido', rank: 0, d };
  if (d === 0) return { k: 'hoje', label: 'Vence hoje', top: 'HOJE', sub: 'fatal', rank: 1, d };
  if (d <= 3) return { k: 'urgente', label: d === 1 ? 'Vence amanhã' : `Vence em ${d} dias`, top: `D-${d}`, sub: 'urgente', rank: 2, d };
  if (d <= 7) return { k: 'proximo', label: `Vence em ${d} dias`, top: `D-${d}`, sub: 'semana', rank: 3, d };
  return { k: 'tranquilo', label: `Vence em ${d} dias`, top: `D-${d}`, sub: 'no prazo', rank: 4, d };
}
const FILTROS = [['ativos', 'Ativos'], ['vencido', 'Vencidos'], ['hoje', 'Hoje'], ['urgente', '1 a 3 dias'], ['proximo', '4 a 7 dias'], ['tranquilo', 'Mais de 7'], ['semprazo', 'Sem prazo'], ['cumprido', 'Cumpridos']];

/* status do compromisso: finaliza sozinho quando passa do horário */
function evDT(iso, hm) { const d = parseISO(iso); const [h, m] = (hm || '00:00').split(':').map(Number); d.setHours(h, m, 0, 0); return d; }
function eventStatus(e) {
  if (e.concluido) return 'finalizado';
  const now = new Date();
  const ini = e.inicio ? evDT(e.data, e.inicio) : null;
  const fim = e.fim ? evDT(e.data, e.fim) : (ini || evDT(e.data, '23:59'));
  if (now >= fim) return 'finalizado';
  if (ini && now >= ini) return 'andamento';
  return 'agendado';
}
const STATUS_LABEL = { agendado: 'Agendado', andamento: 'Em andamento', finalizado: 'Finalizado' };

/* ---------------- ícones ---------------- */
const ICON = {
  prazos: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/></svg>',
  calendario: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  equipe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  clip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7.1"/></svg>',
  key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5z"/></svg>',
  google: '<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
};

/* ---------------- dados de exemplo (modo demonstração) ---------------- */
function seedData() {
  const t = todayISO(), D = n => addDaysISO(t, n), now = Date.now(), H = h => now - h * 36e5;
  const cnj = (n, a, j, tr, o) => { const N = String(n).padStart(7, '0'), TR = pad(tr), O = String(o).padStart(4, '0'); return `${N}-${cnjDV(N, String(a), String(j), TR, O)}.${a}.${j}.${TR}.${O}`; };
  const equipe = [
    { id: 'm-voce', nome: 'Você (demo)', cargo: 'Coordenação', email: 'voce@demo.local', cor: CORES[0] },
    { id: 'm-ana', nome: 'Ana Paula Ribeiro', cargo: 'Advogada', email: 'ana@exemplo.com', cor: CORES[1] },
    { id: 'm-carlos', nome: 'Carlos Menezes', cargo: 'Estagiário', email: 'carlos@exemplo.com', cor: CORES[2] },
    { id: 'm-bia', nome: 'Beatriz Lima', cargo: 'Secretária', email: 'beatriz@exemplo.com', cor: CORES[3] },
  ];
  const and = (txt, dias, autor) => ({ id: uid(), data: D(dias), texto: txt, autor });
  const casos = [
    { id: 'c1', tipo: 'judicial', numero: cnj(5003127, 2025, 4, 3, 6105), autor: 'Maria das Graças Souza', reu: 'Instituto Nacional do Seguro Social – INSS', representa: 'autor', area: 'Previdenciário', orgao: 'TRF3 · 1ª Vara Federal', tipoPrazo: 'Manifestação', prazo: D(-1), responsavelId: 'm-ana', status: 'aberto', origem: 'manual',
      andamentos: [and('Distribuída ação de concessão de aposentadoria por incapacidade permanente.', -60, 'Ana Paula Ribeiro'), and('Juntado laudo pericial. Intimação para manifestação sobre o laudo.', -6, 'Ana Paula Ribeiro')], criadoEm: H(900) },
    { id: 'c2', tipo: 'judicial', numero: cnj(1012458, 2025, 8, 26, 19), autor: 'João Pedro Almeida', reu: 'Banco Exemplo S.A.', representa: 'autor', area: 'Consumidor', orgao: 'TJSP · 2ª Vara Cível', tipoPrazo: 'Réplica', prazo: D(0), responsavelId: 'm-voce', status: 'aberto', origem: 'manual',
      andamentos: [and('Banco apresentou contestação alegando regularidade das cobranças.', -15, 'Carlos Menezes')], criadoEm: H(700) },
    { id: 'c3', tipo: 'judicial', numero: cnj(10874, 2025, 5, 15, 99), autor: 'Rosana Ferreira', reu: 'Metalúrgica Exemplo Ltda.', representa: 'autor', area: 'Trabalhista', orgao: 'TRT15 · Vara do Trabalho', tipoPrazo: 'Recurso', prazo: D(2), responsavelId: 'm-carlos', status: 'aberto', origem: 'manual',
      andamentos: [and('Sentença de parcial procedência publicada. Avaliar recurso quanto às horas extras.', -6, 'Carlos Menezes')], criadoEm: H(300) },
    { id: 'c4', tipo: 'administrativo', numero: 'NB 198.765.432-1', autor: 'Antônio Carlos Pereira', reu: 'INSS', representa: 'autor', area: 'Previdenciário', orgao: 'APS Americana', tipoPrazo: 'Cumprimento de exigência (INSS)', prazo: D(5), responsavelId: 'm-bia', status: 'aberto', origem: 'manual',
      andamentos: [and('INSS emitiu carta de exigência pedindo PPP atualizado da última empresa.', -25, 'Beatriz Lima')], criadoEm: H(200) },
    { id: 'c5', tipo: 'judicial', numero: cnj(1003391, 2026, 8, 26, 19), autor: 'Ricardo Costa', reu: 'Fernanda Costa', representa: 'reu', area: 'Família e Sucessões', orgao: 'TJSP · Vara de Família', tipoPrazo: 'Contestação', prazo: D(12), responsavelId: 'm-ana', status: 'aberto', origem: 'manual',
      andamentos: [and('Citação recebida em ação de alimentos. Cliente trouxe comprovantes de renda.', -3, 'Ana Paula Ribeiro')], criadoEm: H(60) },
    { id: 'c6', tipo: 'administrativo', numero: 'Protocolo 1234567890', autor: 'José Aparecido Silva', reu: 'INSS', representa: 'autor', area: 'Previdenciário', orgao: 'CRPS · Junta de Recursos', tipoPrazo: 'Recurso administrativo (CRPS)', prazo: D(25), responsavelId: 'm-voce', status: 'aberto', origem: 'ia', revisado: false,
      andamentos: [and('Indeferimento de aposentadoria especial: períodos com agente químico não reconhecidos. (Lido automaticamente da carta de indeferimento — revisar.)', -5, 'Importação')], criadoEm: H(5) },
    { id: 'c7', tipo: 'judicial', numero: cnj(1007702, 2024, 8, 26, 19), autor: 'Luciana Martins', reu: 'Construtora Exemplo Ltda.', representa: 'autor', area: 'Cível', orgao: 'TJSP · 1ª Vara Cível', tipoPrazo: 'Embargos de declaração', prazo: D(-4), responsavelId: 'm-carlos', status: 'cumprido', cumpridoEm: H(100), cumpridoPor: 'Carlos Menezes', origem: 'manual',
      andamentos: [and('Embargos protocolados.', -5, 'Carlos Menezes')], criadoEm: H(1200) },
  ];
  const h = new Date().getHours();
  const agenda = [
    { id: 'e1', titulo: 'Reunião de pauta semanal', tipo: 'Reunião', data: t, inicio: '08:30', fim: '09:00', responsavelId: 'm-voce', criadoPor: 'Você (demo)', descricao: 'Revisar prazos da semana com a equipe.' },
    { id: 'e2', titulo: 'Atendimento — nova cliente (revisão de benefício)', tipo: 'Atendimento', data: t, inicio: '14:00', fim: '15:00', responsavelId: 'm-bia', criadoPor: 'Beatriz Lima' },
    { id: 'e3', titulo: 'Retornar ligação do Sr. Antônio sobre o PPP', tipo: 'Atendimento', data: h < 23 ? t : D(1), inicio: `${pad(h < 23 ? h + 1 : 9)}:00`, responsavelId: 'm-voce', criadoPor: 'Beatriz Lima', casoId: 'c4' },
    { id: 'e4', titulo: 'Audiência de conciliação', tipo: 'Audiência', data: D(1), inicio: '14:00', fim: '15:00', responsavelId: 'm-voce', criadoPor: 'Ana Paula Ribeiro', casoId: 'c2', descricao: 'CEJUSC — levar proposta mínima aprovada pelo cliente.' },
    { id: 'e5', titulo: 'Perícia médica judicial', tipo: 'Perícia', data: D(2), inicio: '10:00', responsavelId: 'm-ana', criadoPor: 'Ana Paula Ribeiro', casoId: 'c1' },
    { id: 'e6', titulo: 'Protocolar documentos no INSS', tipo: 'Diligência', data: D(-2), inicio: '11:00', responsavelId: 'm-bia', criadoPor: 'Beatriz Lima', casoId: 'c4' },
    { id: 'e7', titulo: 'Revisar minuta do recurso ao CRPS', tipo: 'Prazo interno', data: D(6), inicio: '09:00', responsavelId: 'm-voce', criadoPor: 'Ana Paula Ribeiro', casoId: 'c6' },
  ];
  const mensagens = [
    { id: 'g1', canal: 'geral', autorId: 'm-bia', autorNome: 'Beatriz Lima', texto: 'Bom dia! Chegou carta de exigência do INSS do Sr. Antônio, já cadastrei.', criadoEm: H(26) },
    { id: 'g2', canal: 'geral', autorId: 'm-ana', autorNome: 'Ana Paula Ribeiro', texto: '@Você a réplica do João Pedro vence hoje, consegue fechar até o fim da tarde?', criadoEm: H(3) },
    { id: 'g3', canal: 'geral', autorId: 'm-carlos', autorNome: 'Carlos Menezes', texto: 'Subi a minuta do recurso da Rosana na pasta, se alguém puder dar uma olhada.', criadoEm: H(2) },
    { id: 'd1', canal: 'dm:m-ana:m-voce', autorId: 'm-ana', autorNome: 'Ana Paula Ribeiro', texto: 'Marquei a audiência de amanhã no seu nome, beleza?', criadoEm: H(1) },
  ];
  agenda.forEach(e => { e.criadoEm = H(48); });
  return { equipe, casos, agenda, mensagens };
}

/* ---------------- camada de dados ---------------- */
const COLS = ['equipe', 'casos', 'agenda', 'mensagens'];
const Store = {
  mode: null, fb: null, loaded: {},
  data: { equipe: [], casos: [], agenda: [], mensagens: [] },
  subs: new Set(),
  on(fn) { this.subs.add(fn); },
  emit() { this.subs.forEach(f => f()); },
  get(c, id) { return this.data[c].find(x => x.id === id); },

  initLocal(demo = false) {
    this.key = demo ? LS_DEMO : LS_LOCAL;
    const saved = ls.get(this.key, null);
    this.data = saved && saved.v === 1 ? saved.data : (demo ? seedData() : { equipe: [], casos: [], agenda: [], mensagens: [] });
    COLS.forEach(c => { this.data[c] = this.data[c] || []; this.loaded[c] = true; });
    this.mode = 'local'; this.persist(); this.emit();
  },
  persist() { if (this.mode === 'local') ls.set(this.key || LS_LOCAL, { v: 1, data: this.data }); },
  resetDemo() { this.data = seedData(); this.persist(); this.emit(); },

  initFirebase(fbx) {
    this.mode = 'firebase'; this.fb = fbx;
    const { db, f } = fbx;
    return new Promise(resolve => {
      let pending = COLS.length;
      COLS.forEach(c => {
        const ref = c === 'mensagens' ? f.query(f.collection(db, c), f.orderBy('criadoEm', 'desc'), f.limit(500)) : f.collection(db, c);
        f.onSnapshot(ref, snap => {
          const rows = snap.docs.map(d => ({ ...d.data(), id: d.id }));
          this.data[c] = c === 'mensagens' ? rows.reverse() : rows;
          if (!this.loaded[c]) { this.loaded[c] = true; if (--pending === 0) resolve(); }
          this.emit();
        }, err => {
          toast(`Sem acesso a "${c}": ${err.code === 'permission-denied' ? 'confira as regras do Firestore e se seu e-mail está liberado' : err.message}`, 'danger');
          if (!this.loaded[c]) { this.loaded[c] = true; if (--pending === 0) resolve(); }
        });
      });
    });
  },

  async add(c, obj) {
    const id = obj.id || uid();
    const doc = { ...obj, id, criadoEm: obj.criadoEm || Date.now(), atualizadoEm: Date.now() };
    if (this.mode === 'local') { this.data[c].push(doc); this.persist(); this.emit(); }
    else { const { db, f } = this.fb; const { id: _, ...rest } = doc; await f.setDoc(f.doc(db, c, id), clean(rest)); }
    return id;
  },
  async update(c, id, patch) {
    patch = { ...patch, atualizadoEm: Date.now() };
    if (this.mode === 'local') { const it = this.get(c, id); if (it) Object.assign(it, patch); this.persist(); this.emit(); }
    else { const { db, f } = this.fb; await f.updateDoc(f.doc(db, c, id), clean(patch)); }
  },
  async remove(c, id) {
    if (this.mode === 'local') { this.data[c] = this.data[c].filter(x => x.id !== id); this.persist(); this.emit(); }
    else { const { db, f } = this.fb; await f.deleteDoc(f.doc(db, c, id)); }
  },
};
/* Firestore não aceita undefined */
function clean(o) { return JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v))); }
async function safe(p, okMsg) { try { await p; if (okMsg) toast(okMsg); } catch (e) { toast('Não foi possível salvar: ' + (e.message || e), 'danger'); } }

/* ---------------- sessão ---------------- */
let me = null;     // { email, nome, foto }
let fb = null;     // módulos do Firebase
const ui = {
  view: 'prazos', filtro: 'ativos', ordem: 'urgentes', busca: '', area: '', resp: '', soMeus: false,
  calY: new Date().getFullYear(), calM: new Date().getMonth(), calDia: todayISO(),
  membroId: null, canal: 'geral', caso: null, casoAba: 'andamentos', bell: false, menu: false, resumoJob: null,
};
const member = id => Store.data.equipe.find(m => m.id === id);
const meMember = () => me && (me.localId ? member(me.localId) : null) || me && !me.localId && Store.data.equipe.find(m => (m.email || '').toLowerCase() === (me.email || '').toLowerCase());
const seenKey = () => `pauta-vistos-${me?.email || 'x'}`;
const chatSeenKey = () => `pauta-chat-${me?.email || 'x'}`;
let seen = new Set();

function isAllowed(email) {
  const e = String(email || '').toLowerCase();
  const list = (CFG.allowedEmails || []).map(x => x.toLowerCase());
  const dom = (CFG.allowedDomain || '').toLowerCase();
  if (!list.length && !dom) return true;
  return list.includes(e) || (dom && e.endsWith('@' + dom));
}

/* ---------------- notificações (sininho) ---------------- */
function notifications() {
  const m = meMember(); if (!m) return [];
  const t = todayISO(), lim = addDaysISO(t, 14), out = [];
  for (const c of Store.data.casos) {
    if (c.responsavelId !== m.id || c.status === 'cumprido' || !c.prazo) continue;
    const u = urg(c); if (u.rank > 2) continue;
    out.push({ id: `pz:${c.id}:${c.prazo}`, g: 0, ord: c.prazo, tipo: 'prazo', ref: c.id, titulo: `${c.tipoPrazo || 'Prazo'} · ${c.autor} × ${c.reu}`, sub: u.label, cls: u.k });
  }
  for (const c of Store.data.casos) {
    if (c.responsavelId !== m.id || c.status === 'cumprido' || c.criadoPorId === m.id) continue;
    if (Date.now() - (c.criadoEm || 0) > 7 * 864e5) continue;
    out.push({ id: `nc:${c.id}:${c.responsavelId}`, g: 1, ord: String(9e15 - c.criadoEm), tipo: 'prazo', ref: c.id, titulo: `Caso atribuído a você: ${c.autor} × ${c.reu}`, sub: c.origem === 'ia' ? 'Importado automaticamente — revisar' : `por ${c.criadoPor || 'equipe'}` });
  }
  for (const e of Store.data.agenda) {
    if (e.responsavelId !== m.id || e.data < t || e.data > lim || eventStatus(e) === 'finalizado') continue;
    out.push({ id: `ag:${e.id}:${e.data}:${e.inicio || ''}`, g: 2, ord: e.data + (e.inicio || '00:00'), tipo: 'agenda', ref: e.id, data: e.data, titulo: e.titulo,
      sub: `${dayRel(e.data)}${e.inicio ? ' · ' + e.inicio : ''}${e.criadoPor && e.criadoPor !== m.nome ? ' · marcado por ' + firstName(e.criadoPor) : ''}` });
  }
  const since = Date.now() - 7 * 864e5, fn = firstName(m.nome);
  const mention = fn ? new RegExp('@' + escRe(fn) + '(?![\\wÀ-ÿ])', 'i') : null;
  for (const msg of Store.data.mensagens) {
    if ((msg.criadoEm || 0) < since || msg.autorId === m.id) continue;
    const dm = msg.canal.startsWith('dm:') && msg.canal.split(':').includes(m.id);
    if (!dm && !(mention && mention.test(msg.texto))) continue;
    out.push({ id: `msg:${msg.id}`, g: 3, ord: String(9e15 - msg.criadoEm), tipo: 'msg', ref: msg.canal, titulo: `${firstName(msg.autorNome)} ${dm ? 'te mandou mensagem' : 'mencionou você'}`, sub: trunc(msg.texto, 70) });
  }
  return out.sort((a, b) => a.g - b.g || (a.ord < b.ord ? -1 : 1));
}
const GRUPOS_NOTIF = ['Seus prazos urgentes', 'Atribuídos a você', 'Sua agenda', 'Mensagens'];

function channelsForMe() { const m = meMember(); return ['geral', ...Store.data.equipe.filter(x => m && x.id !== m.id).map(x => dmKey(m.id, x.id))]; }
const dmKey = (a, b) => 'dm:' + [a, b].sort().join(':');
function chatUnread(canal) {
  const m = meMember(); const seenAt = ls.get(chatSeenKey(), {})[canal] || 0;
  return Store.data.mensagens.filter(x => x.canal === canal && x.criadoEm > seenAt && x.autorId !== m?.id).length;
}
const chatUnreadTotal = () => channelsForMe().reduce((s, c) => s + chatUnread(c), 0);
function markChatSeen(canal) { const o = ls.get(chatSeenKey(), {}); o[canal] = Date.now(); ls.set(chatSeenKey(), o); }

/* ---------------- peças de interface ---------------- */
function initials(n) { const p = String(n || '?').replace(/\(.*?\)/g, '').trim().split(/\s+/); return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
function avatar(m, cls = '') {
  if (!m) return `<span class="av none ${cls}" title="Sem responsável">?</span>`;
  const foto = m.foto || (me && m.email && m.email === me.email ? me.foto : '');
  if (foto) return `<span class="av ${cls}" title="${esc(m.nome)}"><img src="${esc(foto)}" alt="" referrerpolicy="no-referrer"></span>`;
  return `<span class="av ${cls}" style="background:${esc(m.cor || CORES[0])}" title="${esc(m.nome)}">${esc(initials(m.nome))}</span>`;
}
const whoChip = m => m ? `<span class="who">${avatar(m, 'sm')}${esc(firstName(m.nome))}</span>` : '<span class="who">Sem responsável</span>';
const stamp = (u, inline = false) => `<span class="stamp ${u.k}${inline ? ' inline' : ''}"><span><b>${esc(u.top)}</b>${inline ? '' : `<small>${esc(u.sub)}</small>`}</span></span>`;
const memberOptions = (sel, none = 'Sem responsável') => `<option value="">${esc(none)}</option>` + Store.data.equipe.map(m => `<option value="${esc(m.id)}" ${m.id === sel ? 'selected' : ''}>${esc(m.nome)}</option>`).join('');
const options = (arr, sel, none) => (none ? `<option value="">${esc(none)}</option>` : '') + arr.map(a => `<option ${a === sel ? 'selected' : ''}>${esc(a)}</option>`).join('');

const NAV = [['prazos', 'Prazos'], ['calendario', 'Agenda'], ['equipe', 'Equipe'], ['chat', 'Chat']];
const TITULOS = { prazos: 'Prazos', calendario: 'Agenda', equipe: 'Equipe', chat: 'Chat' };

function shell() {
  const notifs = notifications(); const unread = notifs.filter(n => !seen.has(n.id)).length; const chatN = chatUnreadTotal();
  const navN = k => (k === 'chat' && chatN ? `<span class="nav-n">${chatN}</span>` : '');
  const m = meMember() || { nome: me?.nome || 'Você', email: me?.email };
  return `
  <div class="app">
    <aside class="rail" aria-label="Navegação principal">
      <div class="brand"><span class="brand-mark">§</span><div><div class="brand-name">Pauta</div><div class="brand-office">${esc(OFFICE)}</div></div></div>
      <nav class="rail-nav">${NAV.map(([k, l]) => `<button class="nav-btn ${ui.view === k ? 'on' : ''}" data-act="nav" data-v="${k}" ${ui.view === k ? 'aria-current="page"' : ''}>${ICON[k]}<span>${l}</span>${navN(k)}</button>`).join('')}</nav>
      <div class="rail-foot">${Store.mode === 'local' ? `<span class="demo-tag">${IS_ARTIFACT ? 'Modo demonstração' : 'Modo local'}</span>` : ''}<span>${esc(me?.localId ? m.nome : (m.email || ''))}</span></div>
    </aside>
    <div class="main">
      <header class="topbar">
        <span class="brand-mark mobile-brand" aria-hidden="true">§</span>
        <div><h1 class="view-title">${TITULOS[ui.view]}</h1></div>
        <div class="top-actions">
          <button class="icon-btn" data-act="bell" aria-label="Notificações${unread ? ` (${unread} novas)` : ''}" aria-expanded="${ui.bell}">${ICON.bell}${unread ? `<span class="badge">${unread > 99 ? '99+' : unread}</span>` : ''}</button>
          <button class="avatar-btn" data-act="menu" aria-label="Sua conta" aria-expanded="${ui.menu}">${avatar(m)}</button>
        </div>
      </header>
      ${Store.mode === 'local' && ui.view !== 'chat' ? `<div class="demo-banner">${ICON.info}<span>${IS_ARTIFACT ? 'Dados de exemplo, salvos só neste navegador.' : 'Tudo fica salvo só neste navegador. Para a equipe usar junto, de qualquer aparelho, falta ligar o Firebase (README). Faça backups pelo menu da conta.'}</span></div>` : ''}
      ${!meMember() && Store.mode === 'firebase' ? `<div class="demo-banner">${ICON.info}<span>Seu e-mail ainda não está na equipe. Adicione-se na aba Equipe para receber marcações.</span></div>` : ''}
      <main class="content" id="view">${renderView()}</main>
    </div>
    <nav class="tabbar" aria-label="Navegação">${NAV.map(([k, l]) => `<button class="tab-btn ${ui.view === k ? 'on' : ''}" data-act="nav" data-v="${k}">${ICON[k]}<span>${l}</span>${navN(k)}</button>`).join('')}</nav>
  </div>
  ${ui.bell ? bellPanel(notifs) : ''}
  ${ui.menu ? menuPanel(m) : ''}
  ${ui.caso ? drawerHTML() : ''}`;
}

function bellPanel(list) {
  let last = -1;
  const body = list.length ? list.map(n => {
    const head = n.g !== last ? `<div class="pop-group">${GRUPOS_NOTIF[n.g]}</div>` : ''; last = n.g;
    return head + `<button class="notif ${seen.has(n.id) ? '' : 'unread'}" data-act="open-notif" data-id="${esc(n.id)}" data-tipo="${n.tipo}" data-ref="${esc(n.ref)}" data-data="${esc(n.data || '')}"><span class="dot"></span><span><b>${esc(n.titulo)}</b><small class="${n.cls || ''}">${esc(n.sub)}</small></span></button>`;
  }).join('') : `<div class="pop-empty">Nada marcado para você agora.</div>`;
  return `<div class="pop-scrim" data-act="close-pop"></div>
  <div class="pop" role="dialog" aria-label="Notificações">
    <div class="pop-head"><h3>Marcações para você</h3>${list.length ? '<button class="linkish" data-act="seen-all">Marcar como vistas</button>' : ''}</div>
    ${body}
  </div>`;
}
function menuPanel(m) {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  return `<div class="pop-scrim" data-act="close-pop"></div>
  <div class="pop" role="menu" aria-label="Conta">
    <div class="menu-who">${avatar(m)}<div><b>${esc(m.nome)}</b><small>${esc(m.email || '')}</small></div></div>
    <button class="menu-item" data-act="theme">${ICON.moon}${dark ? 'Tema claro' : 'Tema escuro'}</button>
    <button class="menu-item" data-act="config-ia">${ICON.key}Configurar IA${iaCfg().key ? '' : ' (resumos)'}</button>
    <button class="menu-item" data-act="import">${ICON.up}Importar casos (JSON)</button>
    ${IS_ARTIFACT ? '' : `<button class="menu-item" data-act="export-ics">${ICON.calendario}Exportar agenda e prazos (.ics)</button>
    <button class="menu-item" data-act="export-json">${ICON.down}Baixar backup (JSON)</button>`}
    ${Store.mode === 'local' && !IS_ARTIFACT ? `<button class="menu-item" data-act="restore-backup">${ICON.up}Restaurar backup (JSON)</button>` : ''}
    ${Store.mode === 'local' && IS_ARTIFACT ? `<button class="menu-item" data-act="reset-demo">${ICON.undo}Restaurar dados de exemplo</button>` : ''}
    ${me?.localId ? '' : `<button class="menu-item" data-act="logout">${ICON.out}Sair</button>`}
  </div>`;
}

function renderView() {
  switch (ui.view) {
    case 'calendario': return viewCalendario();
    case 'equipe': return ui.membroId && member(ui.membroId) ? viewMembro(member(ui.membroId)) : viewEquipe();
    case 'chat': return viewChat();
    default: return viewPrazos();
  }
}

/* ---------------- PRAZOS ---------------- */
function caseMatches(c) {
  const q = ui.busca.trim().toLowerCase();
  if (q) {
    const hay = [c.numero, c.autor, c.reu, c.orgao, c.area, c.tipoPrazo, member(c.responsavelId)?.nome].join(' ').toLowerCase();
    const qd = q.replace(/\D/g, '');
    if (!hay.includes(q) && !(qd.length >= 4 && String(c.numero || '').replace(/\D/g, '').includes(qd))) return false;
  }
  if (ui.area && c.area !== ui.area) return false;
  if (ui.resp && c.responsavelId !== ui.resp) return false;
  if (ui.soMeus && c.responsavelId !== meMember()?.id) return false;
  return true;
}
function sortCases(list) {
  const key = c => c.prazo || '9999-12-31';
  if (ui.ordem === 'recentes') return list.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  if (ui.ordem === 'tranquilos') return list.sort((a, b) => (key(b) > key(a) ? 1 : key(b) < key(a) ? -1 : 0));
  return list.sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0));
}
function caseRow(c) {
  const u = urg(c), r = member(c.responsavelId);
  return `<button class="case-row ${c.status === 'cumprido' ? 'done' : ''}" role="listitem" data-act="open-case" data-id="${esc(c.id)}">
    ${stamp(u)}
    <span style="min-width:0">
      <span class="case-num">${esc(c.numero || 'Sem número')}${c.tipo === 'administrativo' ? '<span class="tag adm">ADM</span>' : ''}${c.origem === 'ia' && !c.revisado ? `<span class="tag ia">${ICON.spark}revisar</span>` : ''}</span>
      <span class="case-parts" style="display:block">${esc(c.autor)} <span class="vs">×</span> ${esc(c.reu)}</span>
      <span class="case-meta"><span>${esc(c.tipoPrazo || 'Prazo')}</span>${c.area ? `<span>· ${esc(c.area)}</span>` : ''}${c.orgao ? `<span>· ${esc(c.orgao)}</span>` : ''}</span>
    </span>
    <span class="case-side">${whoChip(r)}<span class="date">${c.prazo ? fmtDate(c.prazo) : ''}</span></span>
  </button>`;
}
function viewPrazos() {
  const base = Store.data.casos.filter(caseMatches);
  const counts = Object.fromEntries(FILTROS.map(([k]) => [k, 0]));
  base.forEach(c => { const k = urg(c).k; if (k !== 'cumprido') counts.ativos++; counts[k]++; });
  const list = sortCases(base.filter(c => { const k = urg(c).k; return ui.filtro === 'ativos' ? k !== 'cumprido' : k === ui.filtro; }));
  const iaPend = Store.data.casos.filter(c => c.origem === 'ia' && !c.revisado).length;
  const t = todayISO();
  const hoje = Store.data.agenda.filter(e => e.data === t).sort((a, b) => (a.inicio || '').localeCompare(b.inicio || ''));
  const prazosHoje = Store.data.casos.filter(c => c.prazo === t && c.status !== 'cumprido');
  const ativos = Store.data.casos.filter(c => c.status !== 'cumprido');
  const carga = Store.data.equipe.map(m => ({ m, n: ativos.filter(c => c.responsavelId === m.id).length, alert: ativos.filter(c => c.responsavelId === m.id && urg(c).rank <= 2).length })).sort((a, b) => b.n - a.n);
  const maxN = Math.max(1, ...carga.map(x => x.n));
  const emptyMsg = Store.data.casos.length
    ? `<div class="empty"><h3>Nenhum caso nesse filtro</h3><p>Troque o filtro de urgência ou limpe a busca.</p></div>`
    : `<div class="empty"><h3>Nenhum caso cadastrado</h3><p>Cadastre o primeiro processo com o prazo e quem vai cuidar dele.</p><button class="btn primary" data-act="novo-caso">${ICON.plus}Novo caso</button></div>`;
  return `
  <div class="prazos-layout">
    <section class="prazos-main" aria-label="Lista de prazos">
      <div class="toolbar">
        <label class="search">${ICON.search}<input id="busca" type="search" placeholder="Buscar por número, parte, órgão…" value="${esc(ui.busca)}" autocomplete="off" aria-label="Buscar casos"></label>
        <button class="btn primary" data-act="novo-caso">${ICON.plus}<span>Novo caso</span></button>
      </div>
      <div class="chips" role="tablist" aria-label="Filtrar por urgência">
        ${FILTROS.map(([k, l]) => `<button class="chip chip-${k} ${ui.filtro === k ? 'on' : ''}" role="tab" aria-selected="${ui.filtro === k}" data-act="filtro" data-v="${k}">${l}<span class="chip-n ${counts[k] ? 'has' : ''}">${counts[k]}</span></button>`).join('')}
      </div>
      <div class="subfilters">
        <select id="f-ordem" aria-label="Ordenar">
          <option value="urgentes" ${ui.ordem === 'urgentes' ? 'selected' : ''}>Mais urgentes primeiro</option>
          <option value="tranquilos" ${ui.ordem === 'tranquilos' ? 'selected' : ''}>Menos urgentes primeiro</option>
          <option value="recentes" ${ui.ordem === 'recentes' ? 'selected' : ''}>Cadastrados recentemente</option>
        </select>
        <select id="f-resp" aria-label="Responsável">${memberOptions(ui.resp, 'Toda a equipe')}</select>
        <select id="f-area" aria-label="Área">${options(AREAS, ui.area, 'Todas as áreas')}</select>
        <label class="check"><input type="checkbox" id="f-meus" ${ui.soMeus ? 'checked' : ''}> Só os meus</label>
      </div>
      ${iaPend ? `<div class="ia-queue">${ICON.spark}<span><b>${iaPend}</b> ${iaPend === 1 ? 'caso importado automaticamente aguarda' : 'casos importados automaticamente aguardam'} revisão humana.</span></div>` : ''}
      <div class="case-list" role="list">${list.length ? list.map(caseRow).join('') : emptyMsg}</div>
    </section>
    <aside class="today-panel" aria-label="Hoje">
      <div class="panel">
        <div class="panel-h"><h3>Hoje</h3><small>${esc(fmtDayLong(t))}</small></div>
        ${prazosHoje.map(c => `<button class="mini-ev" data-act="open-case" data-id="${esc(c.id)}"><span class="t" style="color:var(--danger)">FATAL</span><span><b>${esc(c.tipoPrazo || 'Prazo')} · ${esc(c.autor)}</b><small>${esc(member(c.responsavelId)?.nome || 'Sem responsável')}</small></span></button>`).join('')}
        ${hoje.length ? hoje.map(e => { const st = eventStatus(e); return `<button class="mini-ev ${st === 'finalizado' ? 'fin' : ''}" data-act="goto-day" data-v="${e.data}"><span class="t">${esc(e.inicio || 'dia')}</span><span><b>${esc(e.titulo)}</b><small>${esc(member(e.responsavelId)?.nome || '')} · ${STATUS_LABEL[st]}</small></span></button>`; }).join('') : (prazosHoje.length ? '' : '<p class="hint">Nada na agenda de hoje.</p>')}
        <button class="btn small ghost" data-act="novo-evento" data-v="${t}">${ICON.plus}Compromisso</button>
      </div>
      ${carga.length ? `<div class="panel"><div class="panel-h"><h3>Carga da equipe</h3><small>casos ativos</small></div>
        ${carga.map(x => `<div class="load-row">${avatar(x.m, 'sm')}<div style="min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.m.nome)}</div><div class="load-bar"><i style="width:${(x.n / maxN) * 100}%"></i></div></div><span class="mono" title="${x.alert} urgentes">${x.n}${x.alert ? ` <span style="color:var(--danger)">·${x.alert}</span>` : ''}</span></div>`).join('')}
      </div>` : ''}
    </aside>
  </div>`;
}


/* ---------------- DOCUMENTOS (arquivos ficam no IndexedDB deste aparelho) ---------------- */
const IDB = {
  _db: null,
  open() {
    if (this._db) return this._db;
    this._db = new Promise((res, rej) => {
      const r = indexedDB.open('pauta-arquivos', 1);
      r.onupgradeneeded = () => { const s = r.result.createObjectStore('arquivos', { keyPath: 'id' }); s.createIndex('casoId', 'casoId'); };
      r.onsuccess = () => res(r.result); r.onerror = () => { this._db = null; rej(r.error); };
    });
    return this._db;
  },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('arquivos', mode); const out = fn(t.objectStore('arquivos')); t.oncomplete = () => res(out && 'result' in out ? out.result : out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('Sem espaço para salvar o arquivo neste aparelho')); }); },
  put(rec) { return this.tx('readwrite', s => s.put(rec)); },
  get(id) { return this.tx('readonly', s => s.get(id)); },
  del(id) { return this.tx('readwrite', s => s.delete(id)); },
};
const fmtBytes = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
const isPdf = d => /pdf/i.test(d.tipo || '') || /\.pdf$/i.test(d.nome || '');
const isImg = d => /^image\/(png|jpe?g|webp|gif)$/i.test(d.tipo || '');
const isTxt = d => /^text\//i.test(d.tipo || '') || /\.txt$/i.test(d.nome || '');
const legivel = d => isPdf(d) || isImg(d) || isTxt(d);
const quemSou = () => meMember()?.nome || me?.nome || '';
function acharCaso(ref) {
  const r = String(ref || ''); const dig = r.replace(/\D/g, '');
  return Store.get('casos', r) || Store.data.casos.find(c => dig.length >= 10 && String(c.numero || '').replace(/\D/g, '') === dig) || Store.data.casos.find(c => c.numero === r);
}
async function anexarArquivo(ref, blob, nome) {
  const c = acharCaso(ref); if (!c) throw new Error('Processo não cadastrado na Pauta: ' + ref);
  const id = uid(), tipo = blob.type || (/\.pdf$/i.test(nome) ? 'application/pdf' : '');
  try { navigator.storage?.persist?.(); } catch { /* opcional */ }
  await IDB.put({ id, casoId: c.id, nome, tipo, tamanho: blob.size, criadoEm: Date.now(), blob, texto: null, paginas: null });
  const meta = { id, nome, tipo, tamanho: blob.size, criadoEm: Date.now(), por: quemSou() };
  await Store.update('casos', c.id, { documentos: [...(acharCaso(c.id).documentos || []), meta] });
  if (isPdf(meta)) prepararTexto(id).catch(() => {}); // conta páginas e guarda o texto em segundo plano
  return { casoId: c.id, docId: id };
}
async function anexarArquivos(casoId, files) {
  let ok = 0;
  for (const f of files) {
    try { await anexarArquivo(casoId, f, f.name); ok++; }
    catch (e) { toast(`Não foi possível anexar ${f.name}: ${e.message}`, 'danger'); }
  }
  if (ok) toast(ok === 1 ? 'Documento anexado' : `${ok} documentos anexados`);
}
async function removerDocumento(casoId, docId) {
  try { await IDB.del(docId); } catch { /* já não existia */ }
  const c = Store.get('casos', casoId);
  await Store.update('casos', casoId, { documentos: (c.documentos || []).filter(d => d.id !== docId) });
}

let _pdfjs = null;
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
function loadPdfJs() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = new Promise((res, rej) => {
    if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; return res(window.pdfjsLib); }
    const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => { _pdfjs = null; rej(new Error('Não consegui carregar o leitor de PDF. Confira a internet.')); };
    document.head.appendChild(s);
  });
  return _pdfjs;
}
async function extrairTextoPDF(blob, onProg) {
  const lib = await loadPdfJs();
  let pdf;
  try { pdf = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise; }
  catch (e) { throw new Error(e?.name === 'PasswordException' ? 'O PDF está protegido por senha.' : 'Não consegui abrir o PDF: ' + (e.message || e)); }
  const n = pdf.numPages; let out = '';
  for (let p = 1; p <= n; p++) {
    if (onProg && (p === 1 || p % 5 === 0 || p === n)) onProg(p, n);
    const page = await pdf.getPage(p); const tc = await page.getTextContent();
    out += `\n=== Página ${p} ===\n` + tc.items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join('');
    page.cleanup();
  }
  await pdf.destroy();
  return { texto: out, paginas: n };
}
const _preparando = {};
function prepararTexto(docId, onProg) {
  if (_preparando[docId] && !onProg) return _preparando[docId];
  const job = (async () => {
    const rec = await IDB.get(docId); if (!rec) throw new Error('Arquivo não está salvo neste aparelho.');
    if (rec.texto != null) return rec;
    const r = await extrairTextoPDF(rec.blob, onProg);
    rec.texto = r.texto; rec.paginas = r.paginas; await IDB.put(rec);
    const c = Store.get('casos', rec.casoId);
    if (c) await Store.update('casos', c.id, { documentos: (c.documentos || []).map(d => d.id === docId ? { ...d, paginas: r.paginas } : d) });
    return rec;
  })();
  _preparando[docId] = job; job.finally(() => { delete _preparando[docId]; });
  return job;
}
const blobToB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });

/* ---------------- RESUMO COM IA ---------------- */
const IA_KEY = 'pauta-ia';
const iaCfg = () => ({ modelo: 'claude-sonnet-5-5', key: '', ...ls.get(IA_KEY, {}) });
const LIMITE_TEXTO = 500000; // caracteres (~125 mil tokens)
function promptResumo() {
  const adv = CFG.advogada || 'a advogada do escritório';
  return `Você é assistente jurídico do escritório ${OFFICE}. Resuma o processo usando SOMENTE o conteúdo dos documentos fornecidos.

Regras:
- Não invente fatos, datas, valores, nomes ou números. Quando algo não constar, escreva "não consta nos documentos".
- Para cada fato relevante, indique a página entre parênteses, ex.: (p. 12). As páginas aparecem marcadas como "=== Página N ===".
- Não cite artigos de lei, súmulas ou precedentes por conta própria. Se mencionar algo que a parte ou o juízo citou, deixe claro quem citou.
- O cliente do escritório é a parte representada por ${adv}. Ela nunca é parte do processo.
- Português do Brasil, direto, sem floreio. No máximo ~700 palavras.

Responda em Markdown, exatamente com estas seções:
## Identificação
Número, juízo/vara, classe/assunto, partes (polo ativo e passivo), advogados e valor da causa.
## Cliente do escritório
Quem ${adv} representa e em qual polo. Se não der para identificar, diga.
## Pedido e fundamentos
## Linha do tempo
Uma linha por ato: DD/MM/AAAA — o que aconteceu (p. N).
## Situação atual
## Prazos e próximos passos
O que está pendente, para quem e com base em qual ato. Não calcule data final de prazo; informe o ato e o número de dias quando constar.
## Pontos de atenção
Provas faltantes, fundamentos de indeferimento, riscos e inconsistências.`;
}
async function gerarResumo(casoId, docIds) {
  const cfg = iaCfg(); const c0 = Store.get('casos', casoId);
  const setMsg = (msg, extra = {}) => { ui.resumoJob = { casoId, msg, ...extra }; refresh(); };
  if (!cfg.key) { setMsg('Falta configurar a chave da API (menu da conta → Configurar IA).', { erro: true }); return; }
  const docs = (c0.documentos || []).filter(d => docIds.includes(d.id) && legivel(d));
  if (!docs.length) { setMsg('Escolha pelo menos um PDF, imagem ou texto.', { erro: true }); return; }
  try {
    const textos = [], blocos = []; let bytes = 0;
    for (const d of docs) {
      if (isPdf(d)) {
        setMsg(`Lendo ${d.nome}…`);
        const rec = await prepararTexto(d.id, (p, n) => setMsg(`Lendo ${d.nome}: página ${p} de ${n}`));
        const util = rec.texto.replace(/=== Página \d+ ===/g, '').replace(/\s+/g, '').length;
        if (util >= rec.paginas * 40) { textos.push(`##### DOCUMENTO: ${d.nome} (${rec.paginas} páginas)\n${rec.texto}`); continue; }
        if (rec.blob.size > 20e6 || rec.paginas > 100)
          throw new Error(`"${d.nome}" parece digitalizado (só imagem) e passa do limite de leitura direta (${rec.paginas} págs, ${fmtBytes(rec.blob.size)}). Separe em partes de até 100 páginas e 20 MB.`);
        bytes += rec.blob.size;
        blocos.push({ type: 'text', text: `Documento digitalizado a seguir: ${d.nome} (${rec.paginas} páginas).` });
        blocos.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await blobToB64(rec.blob) } });
      } else {
        const rec = await IDB.get(d.id); if (!rec) throw new Error(`"${d.nome}" não está salvo neste aparelho.`);
        if (isTxt(d)) { textos.push(`##### DOCUMENTO: ${d.nome}\n${await rec.blob.text()}`); continue; }
        if (rec.blob.size > 5e6) throw new Error(`A imagem "${d.nome}" passa de 5 MB.`);
        bytes += rec.blob.size;
        blocos.push({ type: 'text', text: `Imagem a seguir: ${d.nome}.` });
        blocos.push({ type: 'image', source: { type: 'base64', media_type: rec.tipo.replace('jpg', 'jpeg'), data: await blobToB64(rec.blob) } });
      }
    }
    if (bytes > 22e6) throw new Error('Os documentos digitalizados somam mais de 22 MB. Gere o resumo com menos arquivos por vez.');
    let texto = textos.join('\n\n'), cortado = false;
    if (texto.length > LIMITE_TEXTO) { texto = texto.slice(0, 150000) + '\n\n[... trecho intermediário omitido por tamanho ...]\n\n' + texto.slice(-(LIMITE_TEXTO - 150000)); cortado = true; }
    const c = Store.get('casos', casoId);
    const cab = `Processo: ${c.numero || 'sem número'}\nPartes cadastradas: ${c.autor} × ${c.reu}\nÓrgão: ${c.orgao || 'não informado'}\n\n`;
    const content = [{ type: 'text', text: cab + (texto || '(sem texto extraído; ver documentos anexos)') }, ...blocos];
    setMsg('Escrevendo o resumo… pode levar até 1 minuto.');
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: cfg.modelo, max_tokens: 4000, system: promptResumo(), messages: [{ role: 'user', content }] }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const m = data?.error?.message || resp.statusText;
      throw new Error(resp.status === 401 ? 'Chave da API inválida. Confira em Configurar IA.'
        : resp.status === 429 ? 'Limite de uso da API atingido. Tente de novo em alguns minutos.'
        : resp.status === 413 ? 'Documento grande demais para um envio. Gere com menos arquivos.'
        : `A IA recusou o pedido (${resp.status}): ${m}`);
    }
    let out = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!out) throw new Error('A IA não devolveu texto.');
    if (data.stop_reason === 'max_tokens') out += '\n\n_(resumo cortado pelo limite de tamanho)_';
    if (cortado) out += '\n\n_(o processo era muito longo: o meio dos autos não foi lido; início e fim foram)_';
    await Store.update('casos', casoId, { resumo: { texto: out, origem: 'ia', atualizadoEm: Date.now(), por: quemSou(), fontes: docs.map(d => d.nome), modelo: cfg.modelo } });
    ui.resumoJob = null; refresh(); toast('Resumo pronto — confira antes de usar');
  } catch (e) {
    setMsg(e.message === 'Failed to fetch' ? 'Sem conexão com a API. Confira a internet.' : (e.message || String(e)), { erro: true });
  }
}
async function salvarResumo(ref, texto, fontes = []) {
  const c = acharCaso(ref); if (!c) throw new Error('Processo não cadastrado na Pauta: ' + ref);
  await Store.update('casos', c.id, { resumo: { texto: String(texto), origem: 'ia', atualizadoEm: Date.now(), por: 'Claude', fontes } });
  return { casoId: c.id };
}
function md(s) {
  let html = '', list = false;
  const close = () => { if (list) { html += '</ul>'; list = false; } };
  for (let l of esc(s).split('\n')) {
    l = l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1<em>$2</em>').replace(/\(p\.\s?(\d+(?:[-–,]\s?\d+)*)\)/g, '<span class="pg">p. $1</span>');
    if (/^#{1,6}\s/.test(l)) { close(); html += `<h4>${l.replace(/^#+\s*/, '')}</h4>`; }
    else if (/^\s*[-*•]\s+/.test(l)) { if (!list) { html += '<ul>'; list = true; } html += `<li>${l.replace(/^\s*[-*•]\s+/, '')}</li>`; }
    else if (!l.trim()) close();
    else { close(); html += `<p>${l}</p>`; }
  }
  close(); return html;
}
function docsBody(c) {
  const docs = [...(c.documentos || [])].sort((a, b) => b.criadoEm - a.criadoEm);
  return `
    <label class="dropzone drop-target" for="doc-file" data-caso="${esc(c.id)}">${ICON.clip}<b>Arraste os PDFs do processo aqui</b><span class="hint">ou toque para escolher · PDF, imagem ou texto</span></label>
    <input type="file" id="doc-file" multiple hidden accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,.txt,.doc,.docx">
    ${docs.length ? `<ul class="doc-list">${docs.map(d => `<li class="doc">
      <span class="doc-ic">${ICON.file}</span>
      <span class="doc-info"><b>${esc(d.nome)}</b><small>${fmtBytes(d.tamanho || 0)}${d.paginas ? ` · ${d.paginas} págs` : ''} · ${esc(fmtStamp(d.criadoEm))}${d.por ? ' · ' + esc(d.por) : ''}</small></span>
      <span class="doc-actions">
        <button class="mini-btn" data-act="doc-open" data-id="${esc(d.id)}">Abrir</button>
        <button class="mini-btn" data-act="doc-download" data-id="${esc(d.id)}">Baixar</button>
        <button class="mini-btn" data-act="doc-del" data-id="${esc(d.id)}" aria-label="Excluir ${esc(d.nome)}">${ICON.trash}</button>
      </span></li>`).join('')}</ul>` : '<p class="hint">Nenhum documento anexado.</p>'}
    ${docs.some(legivel) ? `<button class="btn small primary" data-act="case-tab" data-v="resumo">${ICON.spark}Resumir a partir dos documentos</button>` : ''}
    <p class="hint">Os arquivos ficam salvos neste aparelho${Store.mode === 'firebase' ? '; quem estiver em outro aparelho vê a lista, mas não abre o arquivo' : ''}. O backup JSON não inclui os arquivos.</p>
    <form id="f-pdf" class="field"><span>Link externo do processo (e-SAJ, PJe, Drive…)</span>
      <input id="pdf-url" type="url" data-keep placeholder="https://" value="${esc(c.pdf?.url || '')}">
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" type="submit">Salvar link</button>${c.pdf?.url ? `<a class="btn small" href="${esc(c.pdf.url)}" target="_blank" rel="noopener">Abrir link</a>` : ''}</div>
    </form>`;
}
function resumoBody(c) {
  const docs = (c.documentos || []).filter(legivel);
  const job = ui.resumoJob && ui.resumoJob.casoId === c.id ? ui.resumoJob : null;
  const rodando = job && !job.erro;
  const temChave = !!iaCfg().key, r = c.resumo;
  return `
    ${r?.texto ? `<article class="resumo-md">
        <div class="resumo-meta">${r.origem === 'ia' ? `<span class="tag ia">${ICON.spark}gerado por IA · conferir</span>` : '<span class="tag adm">manual</span>'}<span>${esc(fmtStamp(r.atualizadoEm || Date.now()))}${r.por ? ' · ' + esc(r.por) : ''}</span>${r.fontes?.length ? `<span>de: ${esc(r.fontes.join(', '))}</span>` : ''}</div>
        ${md(r.texto)}
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini-btn" data-act="copy-resumo">${ICON.copy}Copiar resumo</button></div>
      </article>` : ''}
    <div class="ia-box">
      <div class="label">${r?.texto ? 'Gerar de novo' : 'Gerar resumo com IA'}</div>
      ${docs.length ? `<div class="ia-docs">${docs.map(d => `<label class="check"><input type="checkbox" class="resumo-doc" value="${esc(d.id)}" checked ${rodando ? 'disabled' : ''}>${esc(d.nome)}${d.paginas ? ` <span class="hint">· ${d.paginas} págs</span>` : ''}</label>`).join('')}</div>`
        : `<p class="hint">Anexe o PDF do processo na aba Documentos.</p><button class="btn small" data-act="case-tab" data-v="docs">${ICON.clip}Ir para Documentos</button>`}
      ${temChave ? '' : `<div class="notice warn">${ICON.key}<span>Para a IA ler o processo, configure a chave da API uma vez neste aparelho.</span><button class="btn small" data-act="config-ia">Configurar IA</button></div>`}
      ${docs.length && temChave ? `<div><button class="btn small primary" data-act="gerar-resumo" data-id="${esc(c.id)}" ${rodando ? 'disabled' : ''}>${ICON.spark}${rodando ? 'Gerando…' : r?.texto ? 'Gerar de novo' : 'Gerar resumo'}</button></div>` : ''}
      ${job ? `<p class="hint ${job.erro ? 'bad' : ''}" role="status">${esc(job.msg)}</p>` : ''}
    </div>
    <details class="calc"${r?.texto ? '' : ' open'}><summary>${r?.texto ? 'Editar resumo à mão' : 'Escrever resumo à mão'}</summary>
      <form id="f-resumo" class="field calc-body">
        <textarea id="resumo-texto" data-keep rows="10" placeholder="Resumo do caso">${esc(r?.texto || '')}</textarea>
        <div><button class="btn small primary" type="submit">Salvar resumo</button></div>
      </form>
    </details>`;
}
function iaModal() {
  const cfg = iaCfg();
  openModal(`
  <form id="f-ia">
    ${modalHead('Configurar IA')}
    <div class="modal-body">
      <p>O resumo usa a API do Claude. A chave fica salva só neste navegador, nunca vai para o GitHub.</p>
      <label class="field"><span>Chave da API (Anthropic)</span><input id="ia-key" type="password" autocomplete="off" placeholder="sk-ant-..." value="${esc(cfg.key)}"></label>
      <p class="hint">Crie em console.anthropic.com → API Keys. Cada resumo é cobrado na conta da API, conforme o tamanho do processo.</p>
      <label class="field"><span>Modelo</span><input id="ia-modelo" class="mono" value="${esc(cfg.modelo)}"></label>
      <div class="notice warn">${ICON.info}<span>Ao gerar um resumo, o texto do processo é enviado à API da Anthropic. Avalie com o escritório se isso atende à política de sigilo e à LGPD.</span></div>
    </div>
    <div class="modal-foot">${cfg.key ? '<button type="button" class="btn danger" data-act="ia-remover" style="margin-right:auto">Remover chave</button>' : ''}<button type="button" class="btn" data-act="close-modal">Cancelar</button><button type="submit" class="btn primary">Salvar</button></div>
  </form>`, null, 'sm');
}

/* Recebe arquivo de outra aba (ex.: página do tribunal aberta pelo Claude) via postMessage */
function origemPermitida(origin) {
  try { const h = new URL(origin).hostname; return h.endsWith('.jus.br') || (CFG.origensAnexo || []).some(x => h === x || h.endsWith('.' + x)); } catch { return false; }
}
let _appPronto = false; const _filaMsgs = [];
async function tratarMensagem(ev) {
  const d = ev.data;
  try {
    const blob = d.arquivo instanceof Blob ? d.arquivo : new Blob([d.arquivo], { type: d.mime || 'application/pdf' });
    const r = await anexarArquivo(d.processo, blob, d.nome || 'processo.pdf');
    ev.source?.postMessage({ tipo: 'pauta-anexado', ok: true, ...r }, ev.origin);
    toast(`Documento recebido: ${d.nome || 'processo.pdf'}`);
  } catch (e) { ev.source?.postMessage({ tipo: 'pauta-anexado', ok: false, erro: e.message }, ev.origin); }
}
window.addEventListener('message', ev => {
  if (ev.data?.tipo !== 'pauta-anexar' || !origemPermitida(ev.origin)) return;
  if (_appPronto) tratarMensagem(ev); else _filaMsgs.push(ev);
});
function appPronto() {
  if (_appPronto) return; _appPronto = true;
  _filaMsgs.splice(0).forEach(tratarMensagem);
  try { window.opener?.postMessage({ tipo: 'pauta-pronta' }, '*'); } catch { /* sem opener */ }
}

/* ---------------- GAVETA DO CASO ---------------- */
function drawerHTML() {
  const c = Store.get('casos', ui.caso); if (!c) { ui.caso = null; return ''; }
  const u = urg(c), du = c.prazo && c.status !== 'cumprido' && u.rank <= 4 ? businessDaysUntil(c.prazo) : null;
  const abas = [['andamentos', 'Andamentos', ICON.list], ['resumo', 'Resumo', ICON.spark], ['docs', `Documentos${(c.documentos || []).length ? ' · ' + c.documentos.length : ''}`, ICON.clip], ['dados', 'Dados', ICON.info]];
  const eventos = Store.data.agenda.filter(e => e.casoId === c.id).sort((a, b) => (a.data + (a.inicio || '')).localeCompare(b.data + (b.inicio || '')));
  let body = '';
  if (ui.casoAba === 'andamentos') {
    const ands = [...(c.andamentos || [])].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    body = `
      <form id="f-andamento" class="field">
        <span>O que aconteceu</span>
        <textarea id="and-texto" data-keep placeholder="Ex.: Publicada decisão determinando emenda à inicial em 15 dias." required></textarea>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input type="date" id="and-data" class="input" style="width:auto" value="${todayISO()}" data-keep aria-label="Data do andamento"><button class="btn primary small" type="submit">${ICON.plus}Registrar andamento</button></div>
      </form>
      ${ands.length ? `<ol class="timeline">${ands.map(a => `<li><div class="when">${fmtDate(a.data)}${a.autor ? ' · ' + esc(a.autor) : ''}</div><div class="what">${esc(a.texto)}</div></li>`).join('')}</ol>` : '<p class="hint">Nenhum andamento registrado.</p>'}
      ${eventos.length ? `<div><div class="label" style="margin-bottom:8px">Na agenda</div><div class="ev-list">${eventos.map(e => `<button class="mini-ev ${eventStatus(e) === 'finalizado' ? 'fin' : ''}" data-act="goto-day" data-v="${e.data}"><span class="t">${esc(e.inicio || '—')}</span><span><b>${esc(e.titulo)}</b><small>${esc(fmtDate(e.data))} · ${esc(member(e.responsavelId)?.nome || '')}</small></span></button>`).join('')}</div></div>` : ''}`;
  } else if (ui.casoAba === 'resumo') {
    body = resumoBody(c);
  } else if (ui.casoAba === 'docs') {
    body = docsBody(c);
  } else {
    body = `<dl class="kv">
      <dt>Tipo</dt><dd>${c.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</dd>
      <dt>${c.tipo === 'administrativo' ? 'Protocolo / NB' : 'Número CNJ'}</dt><dd class="mono">${esc(c.numero || '—')}</dd>
      <dt>Polo ativo</dt><dd>${esc(c.autor)}${c.representa === 'autor' ? ' <span class="tag adm">cliente</span>' : ''}</dd>
      <dt>Polo passivo</dt><dd>${esc(c.reu)}${c.representa === 'reu' ? ' <span class="tag adm">cliente</span>' : ''}</dd>
      <dt>Área</dt><dd>${esc(c.area || '—')}</dd>
      <dt>Órgão / vara</dt><dd>${esc(c.orgao || '—')}</dd>
      <dt>Prazo</dt><dd>${esc(c.tipoPrazo || '—')} · ${fmtDate(c.prazo)}</dd>
      <dt>Responsável</dt><dd>${esc(member(c.responsavelId)?.nome || '—')}</dd>
      <dt>Origem</dt><dd>${c.origem === 'ia' ? 'Importado automaticamente' : c.origem === 'importado' ? 'Importado (JSON)' : 'Cadastro manual'}${c.criadoPor ? ' · ' + esc(c.criadoPor) : ''}</dd>
      <dt>Cadastrado</dt><dd>${c.criadoEm ? esc(fmtStamp(c.criadoEm)) : '—'}</dd>
      ${c.status === 'cumprido' ? `<dt>Cumprido</dt><dd>${c.cumpridoEm ? esc(fmtStamp(c.cumpridoEm)) : ''}${c.cumpridoPor ? ' por ' + esc(c.cumpridoPor) : ''}</dd>` : ''}
    </dl>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" data-act="edit-case" data-id="${esc(c.id)}">${ICON.edit}Editar</button><button class="btn small danger" data-act="del-case" data-id="${esc(c.id)}">${ICON.trash}Excluir caso</button></div>`;
  }
  return `<div class="scrim" data-act="close-drawer"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="Detalhes do caso">
    <header class="drawer-head">
      <div class="drawer-top"><span class="eyebrow">${c.tipo === 'administrativo' ? 'Processo administrativo' : 'Processo judicial'}${c.area ? ' · ' + esc(c.area) : ''}</span><button class="icon-btn" data-act="close-drawer" aria-label="Fechar">${ICON.x}</button></div>
      <div class="proc-num"><span class="mono">${esc(c.numero || 'Sem número')}</span>${c.numero ? `<button class="mini-btn" data-act="copy" data-text="${esc(c.numero)}">${ICON.copy}Copiar</button>` : ''}</div>
      <h2 class="drawer-title">${esc(c.autor)} <span class="vs">×</span> ${esc(c.reu)}</h2>
      <div class="meta-row">${stamp(u, true)}<span><b style="color:var(--ink)">${esc(c.tipoPrazo || 'Prazo')}</b> · ${c.prazo ? fmtDate(c.prazo) : 'sem data'}</span><span>${esc(u.label)}${du !== null && du > 0 ? ` · ${du} ${du === 1 ? 'dia útil' : 'dias úteis'}` : ''}</span>${c.orgao ? `<span>${esc(c.orgao)}</span>` : ''}</div>
      <div class="drawer-actions">
        <select id="drawer-resp" aria-label="Responsável">${memberOptions(c.responsavelId)}</select>
        ${c.status === 'cumprido'
          ? `<button class="btn small" data-act="toggle-cumprido" data-id="${esc(c.id)}">${ICON.undo}Reabrir prazo</button>`
          : `<button class="btn small primary" data-act="toggle-cumprido" data-id="${esc(c.id)}">${ICON.check}Marcar cumprido</button>`}
        <button class="btn small" data-act="novo-evento" data-v="${esc(c.prazo || todayISO())}" data-caso="${esc(c.id)}">${ICON.calendario}Agendar</button>
      </div>
      ${c.origem === 'ia' && !c.revisado ? `<div class="notice ia">${ICON.spark}<span>Cadastrado automaticamente. Confira número, partes e prazo no processo antes de confiar.</span><button class="btn small" data-act="revisado" data-id="${esc(c.id)}">${ICON.check}Conferido</button></div>` : ''}
    </header>
    <nav class="drawer-tabs" aria-label="Seções do caso">${abas.map(([k, l, ic]) => `<button class="${ui.casoAba === k ? 'on' : ''}" data-act="case-tab" data-v="${k}">${ic}${l}</button>`).join('')}</nav>
    <div class="drawer-body" data-scroll="drawer">${body}</div>
  </aside>`;
}

/* ---------------- CALENDÁRIO ---------------- */
function itemsByDay() {
  const map = {};
  for (const e of Store.data.agenda) (map[e.data] ||= { ev: [], pz: [] }).ev.push(e);
  for (const c of Store.data.casos) if (c.prazo && c.status !== 'cumprido') (map[c.prazo] ||= { ev: [], pz: [] }).pz.push(c);
  for (const k in map) map[k].ev.sort((a, b) => (a.inicio || '').localeCompare(b.inicio || ''));
  return map;
}
function evCard(e, showDate = false) {
  const st = eventStatus(e), r = member(e.responsavelId), c = e.casoId ? Store.get('casos', e.casoId) : null;
  return `<article class="ev ${st === 'finalizado' ? 'fin' : ''}">
    <div class="t">${esc(e.inicio || 'Dia')}${e.fim ? `<small>até ${esc(e.fim)}</small>` : ''}${showDate ? `<small>${esc(dayRel(e.data))}</small>` : ''}</div>
    <div style="min-width:0">
      <div class="ev-title">${esc(e.titulo)}</div>
      <div class="ev-meta"><span class="pill ${st}">${STATUS_LABEL[st]}</span>${e.tipo ? `<span>${esc(e.tipo)}</span>` : ''}${whoChip(r)}</div>
      ${c ? `<div class="ev-meta"><button class="linkish" data-act="open-case" data-id="${esc(c.id)}">${esc(c.autor)} × ${esc(c.reu)}</button></div>` : ''}
      ${e.descricao ? `<div class="ev-desc">${esc(e.descricao)}</div>` : ''}
      <div class="ev-actions">
        ${st === 'finalizado'
          ? (e.concluido ? `<button class="btn small" data-act="ev-reabrir" data-id="${esc(e.id)}">${ICON.undo}Reabrir</button>` : '')
          : `<button class="btn small" data-act="ev-concluir" data-id="${esc(e.id)}">${ICON.check}Concluir agora</button>`}
        <button class="btn small ghost" data-act="edit-evento" data-id="${esc(e.id)}">${ICON.edit}Editar</button>
        <button class="btn small ghost" data-act="del-evento" data-id="${esc(e.id)}" aria-label="Excluir compromisso">${ICON.trash}</button>
      </div>
    </div>
  </article>`;
}
function viewCalendario() {
  const y = ui.calY, mo = ui.calM, first = new Date(y, mo, 1), start = new Date(y, mo, 1 - first.getDay());
  const weeks = Math.ceil((first.getDay() + new Date(y, mo + 1, 0).getDate()) / 7);
  const map = itemsByDay(), t = todayISO();
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const iso = toISO(d), it = map[iso] || { ev: [], pz: [] }, hol = holidayName(iso), w = d.getDay();
    const items = [...it.pz.map(c => `<span class="cal-item prazo">Prazo · ${esc(firstName(c.autor))}</span>`), ...it.ev.map(e => `<span class="cal-item ${eventStatus(e) === 'finalizado' ? 'fin' : ''}" style="--c:${esc(member(e.responsavelId)?.cor || CORES[0])}">${e.inicio ? `<span class="mono">${esc(e.inicio)}</span> ` : ''}${esc(e.titulo)}</span>`)];
    const dots = [...it.pz.map(() => '<i class="prazo"></i>'), ...it.ev.map(e => `<i style="--c:${esc(member(e.responsavelId)?.cor || CORES[0])}"></i>`)].slice(0, 4).join('');
    cells += `<button class="cal-day ${d.getMonth() !== mo ? 'out' : ''} ${iso === t ? 'today' : ''} ${iso === ui.calDia ? 'sel' : ''} ${w === 0 || w === 6 ? 'wknd' : ''} ${hol ? 'hol' : ''}" data-act="cal-day" data-v="${iso}" aria-label="${esc(fmtDayLong(iso))}${it.ev.length + it.pz.length ? `, ${it.ev.length + it.pz.length} itens` : ''}" aria-pressed="${iso === ui.calDia}">
      <span class="n">${d.getDate()}</span>${hol ? `<span class="hol-name">${esc(hol)}</span>` : ''}
      ${items.slice(0, 3).join('')}${items.length > 3 ? `<span class="cal-more">+${items.length - 3}</span>` : ''}
      <span class="cal-dots">${dots}</span>
    </button>`;
  }
  const sel = map[ui.calDia] || { ev: [], pz: [] }, hol = holidayName(ui.calDia);
  return `
  <div class="cal-layout">
    <section class="cal" aria-label="Calendário">
      <div class="cal-head">
        <h2>${MESES[mo][0].toUpperCase() + MESES[mo].slice(1)} <span style="color:var(--muted);font-weight:500">${y}</span></h2>
        <button class="btn small" data-act="cal-today">Hoje</button>
        <button class="icon-btn" data-act="cal-prev" aria-label="Mês anterior">${ICON.left}</button>
        <button class="icon-btn" data-act="cal-next" aria-label="Próximo mês">${ICON.right}</button>
      </div>
      <div class="cal-grid">${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
    </section>
    <section class="day-panel" aria-label="Programação do dia">
      <div class="day-head"><div><h3>${esc(fmtDayLong(ui.calDia))}</h3><small>${hol ? esc(hol) + ' · ' : ''}${sel.ev.length} ${sel.ev.length === 1 ? 'compromisso' : 'compromissos'}${sel.pz.length ? ` · ${sel.pz.length} ${sel.pz.length === 1 ? 'prazo' : 'prazos'}` : ''}</small></div>
        <button class="btn primary small" data-act="novo-evento" data-v="${ui.calDia}">${ICON.plus}Adicionar</button></div>
      ${sel.pz.map(c => `<article class="ev prazo"><div class="t">FATAL</div><div style="min-width:0"><div class="ev-title">${esc(c.tipoPrazo || 'Prazo')} · ${esc(c.autor)} × ${esc(c.reu)}</div><div class="ev-meta"><span class="mono">${esc(c.numero || '')}</span>${whoChip(member(c.responsavelId))}</div><div class="ev-actions"><button class="btn small" data-act="open-case" data-id="${esc(c.id)}">Abrir caso</button></div></div></article>`).join('')}
      ${sel.ev.length ? sel.ev.map(e => evCard(e)).join('') : (sel.pz.length ? '' : `<div class="empty" style="padding:28px 12px"><p>Nada programado neste dia.</p></div>`)}
    </section>
  </div>`;
}

/* ---------------- EQUIPE ---------------- */
function statsFor(m) {
  const casos = Store.data.casos.filter(c => c.responsavelId === m.id && c.status !== 'cumprido');
  const t = todayISO();
  const prox = Store.data.agenda.filter(e => e.responsavelId === m.id && e.data >= t && eventStatus(e) !== 'finalizado');
  return { casos: casos.length, urg: casos.filter(c => urg(c).rank <= 2).length, agenda: prox.length };
}
function viewEquipe() {
  const eq = [...Store.data.equipe].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return `
  <div class="toolbar" style="margin-bottom:16px"><p class="hint" style="flex:1;min-width:200px">Toque em alguém para ver tudo que está no nome da pessoa: casos, prazos e agenda.</p><button class="btn primary" data-act="novo-membro">${ICON.plus}Adicionar pessoa</button></div>
  ${eq.length ? `<div class="team-grid">${eq.map(m => { const s = statsFor(m); return `<button class="member-card" data-act="open-membro" data-id="${esc(m.id)}">
    <div class="member-top">${avatar(m)}<div style="min-width:0"><b>${esc(m.nome)}${meMember()?.id === m.id ? ' <span class="tag adm">você</span>' : ''}</b><small>${esc(m.cargo || 'Sem cargo')}</small></div></div>
    <div class="member-stats"><div><b>${s.casos}</b><small>casos ativos</small></div><div><b class="${s.urg ? 'alert' : ''}">${s.urg}</b><small>urgentes</small></div><div><b>${s.agenda}</b><small>na agenda</small></div></div>
  </button>`; }).join('')}</div>` : `<div class="empty"><h3>Equipe vazia</h3><p>Adicione as pessoas do escritório para distribuir casos e compromissos.</p></div>`}`;
}
function viewMembro(m) {
  const t = todayISO();
  const casos = sortCases(Store.data.casos.filter(c => c.responsavelId === m.id && c.status !== 'cumprido'));
  const feitos = Store.data.casos.filter(c => c.responsavelId === m.id && c.status === 'cumprido');
  const ag = Store.data.agenda.filter(e => e.responsavelId === m.id).sort((a, b) => (a.data + (a.inicio || '')).localeCompare(b.data + (b.inicio || '')));
  const prox = ag.filter(e => e.data >= t && eventStatus(e) !== 'finalizado');
  const fin = ag.filter(e => eventStatus(e) === 'finalizado').reverse().slice(0, 10);
  const isMe = meMember()?.id === m.id;
  return `
  <button class="back" data-act="back-equipe">${ICON.left}Equipe</button>
  <div class="profile-head">${avatar(m, 'lg')}<div style="min-width:0"><h2>${esc(m.nome)}</h2><div class="sub">${esc(m.cargo || 'Sem cargo')}${m.email ? ' · ' + esc(m.email) : ''}</div></div>
    <div class="profile-actions">${!isMe && meMember() ? `<button class="btn small" data-act="dm" data-id="${esc(m.id)}">${ICON.chat}Mensagem</button>` : ''}<button class="btn small" data-act="novo-evento" data-v="${t}" data-resp="${esc(m.id)}">${ICON.calendario}Marcar compromisso</button><button class="btn small ghost" data-act="edit-membro" data-id="${esc(m.id)}">${ICON.edit}Editar</button></div></div>
  <div class="section-h"><h3>Casos sob responsabilidade</h3><small>${casos.length} ativos · ${feitos.length} cumpridos</small></div>
  <div class="case-list" role="list">${casos.length ? casos.map(caseRow).join('') : '<div class="empty" style="padding:24px"><p>Nenhum caso ativo.</p></div>'}</div>
  <div class="section-h"><h3>Próximos compromissos</h3><small>${prox.length}</small></div>
  <div class="ev-list">${prox.length ? prox.map(e => evCard(e, true)).join('') : '<p class="hint">Nada agendado.</p>'}</div>
  ${fin.length ? `<div class="section-h"><h3>Finalizados recentemente</h3><small>últimos ${fin.length}</small></div><div class="ev-list">${fin.map(e => evCard(e, true)).join('')}</div>` : ''}`;
}

/* ---------------- CHAT ---------------- */
function channelName(canal) {
  if (canal === 'geral') return 'Escritório';
  const m = meMember(); const other = canal.split(':').slice(1).find(id => id !== m?.id); return member(other)?.nome || 'Conversa';
}
function renderText(t) {
  const fn = firstName(meMember()?.nome || '').toLowerCase();
  return esc(t).replace(/@([\wÀ-ÿ]+)/g, (all, n) => `<span class="mention ${n.toLowerCase() === fn ? 'me' : ''}">@${n}</span>`);
}
function viewChat() {
  const m = meMember(); const chs = channelsForMe();
  if (!chs.includes(ui.canal)) ui.canal = 'geral';
  const msgs = Store.data.mensagens.filter(x => x.canal === ui.canal).sort((a, b) => a.criadoEm - b.criadoEm);
  let lastDay = '', html = '';
  for (const x of msgs) {
    const d = toISO(new Date(x.criadoEm));
    if (d !== lastDay) { html += `<div class="day-sep">${esc(dayRel(d))}</div>`; lastDay = d; }
    html += `<div class="msg">${avatar(member(x.autorId) || { nome: x.autorNome, cor: CORES[7] })}<div style="min-width:0"><div class="msg-h"><b>${esc(x.autorNome)}</b><small>${fmtTime(x.criadoEm)}</small></div><div class="msg-t">${renderText(x.texto)}</div></div></div>`;
  }
  const chBtn = c => { const n = chatUnread(c); const other = c === 'geral' ? null : member(c.split(':').slice(1).find(id => id !== m?.id));
    return `<button class="ch ${ui.canal === c ? 'on' : ''}" data-act="canal" data-v="${esc(c)}">${c === 'geral' ? '<span class="hash">#</span>' : avatar(other, 'sm')}<span class="nm">${esc(c === 'geral' ? 'escritorio' : other?.nome || '')}</span>${n && ui.canal !== c ? `<span class="nav-n">${n}</span>` : ''}</button>`; };
  return `
  <div class="chat">
    <nav class="channels" aria-label="Conversas"><div class="ch-group">Canais</div>${chBtn('geral')}<div class="ch-group">Diretas</div>${chs.slice(1).map(chBtn).join('')}</nav>
    <section class="conv" aria-label="Mensagens">
      <div class="conv-head"><b>${esc(channelName(ui.canal))}</b><small>${ui.canal === 'geral' ? 'toda a equipe · use @nome para chamar alguém' : 'conversa direta'}</small></div>
      <div class="msgs" id="msgs" data-scroll="msgs">${html || '<div class="empty"><p>Nenhuma mensagem ainda.</p></div>'}</div>
      ${m ? `<form id="f-chat" class="compose"><textarea id="chat-input" data-keep rows="1" placeholder="Mensagem para ${esc(ui.canal === 'geral' ? 'o escritório' : firstName(channelName(ui.canal)))}" aria-label="Escrever mensagem"></textarea><button class="btn primary" type="submit" aria-label="Enviar">${ICON.send}</button></form>`
        : '<div class="compose"><p class="hint">Adicione seu e-mail na aba Equipe para conversar.</p></div>'}
    </section>
  </div>`;
}

/* ---------------- MODAIS ---------------- */
function openModal(html, onMount, cls = '') {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-wrap" data-act="modal-bg"><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  const first = root.querySelector('input:not([type=hidden]):not([type=radio]), select, textarea');
  if (first && matchMedia('(min-width: 700px)').matches) setTimeout(() => first.focus(), 30);
  onMount && onMount(root);
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };
const modalHead = t => `<div class="modal-head"><h2>${esc(t)}</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Fechar">${ICON.x}</button></div>`;

function confirmModal(text, yesLabel, onYes) {
  openModal(`${modalHead('Confirmar')}<div class="modal-body"><p>${esc(text)}</p></div><div class="modal-foot"><button class="btn" data-act="close-modal">Cancelar</button><button class="btn danger" id="confirm-yes">${esc(yesLabel)}</button></div>`,
    root => root.querySelector('#confirm-yes').addEventListener('click', () => { closeModal(); onYes(); }), 'sm');
}

function caseModal(c) {
  const edit = !!c; c = c || { tipo: 'judicial', representa: 'autor', responsavelId: meMember()?.id || '' };
  openModal(`
  <form id="f-caso" data-id="${esc(c.id || '')}">
    ${modalHead(edit ? 'Editar caso' : 'Novo caso')}
    <div class="modal-body">
      <div class="seg" role="radiogroup" aria-label="Tipo de processo">
        <label><input type="radio" name="tipo" value="judicial" ${c.tipo !== 'administrativo' ? 'checked' : ''}>Judicial</label>
        <label><input type="radio" name="tipo" value="administrativo" ${c.tipo === 'administrativo' ? 'checked' : ''}>Administrativo (INSS/CRPS)</label>
      </div>
      <label class="field"><span id="c-numero-label">${c.tipo === 'administrativo' ? 'Protocolo / NB' : 'Número do processo (CNJ)'}</span>
        <input id="c-numero" name="numero" class="mono" inputmode="${c.tipo === 'administrativo' ? 'text' : 'numeric'}" autocomplete="off" placeholder="${c.tipo === 'administrativo' ? 'NB 000.000.000-0' : '0000000-00.0000.0.00.0000'}" value="${esc(c.numero || '')}">
        <span class="hint" id="c-numero-hint">${c.tipo === 'administrativo' ? 'Número do benefício ou do protocolo no Meu INSS.' : 'Digite só os números; o formato e o dígito verificador são conferidos na hora.'}</span></label>
      <div class="grid2">
        <label class="field"><span>Polo ativo (autor)</span><input name="autor" required value="${esc(c.autor || '')}" placeholder="Nome completo"></label>
        <label class="field"><span>Polo passivo (réu)</span><input name="reu" required value="${esc(c.reu || '')}" placeholder="Ex.: INSS"></label>
      </div>
      <div class="field"><span>Representamos</span><div class="seg"><label><input type="radio" name="representa" value="autor" ${c.representa !== 'reu' ? 'checked' : ''}>Polo ativo</label><label><input type="radio" name="representa" value="reu" ${c.representa === 'reu' ? 'checked' : ''}>Polo passivo</label></div></div>
      <div class="grid2">
        <label class="field"><span>Área</span><select name="area">${options(AREAS, c.area || 'Previdenciário')}</select></label>
        <label class="field"><span>Órgão / vara</span><input id="c-orgao" name="orgao" value="${esc(c.orgao || '')}" placeholder="Ex.: TJSP · 2ª Vara Cível"></label>
      </div>
      ${edit ? '' : `<label class="field"><span>O que aconteceu</span><textarea name="andamento" placeholder="Ex.: Publicada sentença de improcedência; avaliar apelação."></textarea></label>`}
      <div class="grid2">
        <label class="field"><span>Tipo de prazo</span><select name="tipoPrazo">${options(TIPOS_PRAZO, c.tipoPrazo || 'Manifestação')}</select></label>
        <label class="field"><span>Data final do prazo</span><input id="c-prazo" name="prazo" type="date" value="${esc(c.prazo || '')}"></label>
      </div>
      <details class="calc">
        <summary>Calcular prazo a partir da intimação</summary>
        <div class="calc-body">
          <div class="grid3">
            <label class="field"><span>Intimação / publicação</span><input id="calc-ini" type="date" value="${todayISO()}"></label>
            <label class="field"><span>Prazo (dias)</span><input id="calc-dias" type="number" min="1" max="365" value="15"></label>
            <label class="field"><span>Contagem</span><select id="calc-modo"><option value="uteis">Dias úteis</option><option value="corridos">Dias corridos</option></select></label>
          </div>
          <label class="check"><input type="checkbox" id="calc-recesso" checked> Pular recesso forense (20/12 a 20/01)</label>
          <div class="calc-out"><span>Vence em</span><b id="calc-res">—</b><span class="hint" id="calc-res-dia"></span><button type="button" class="btn small" id="calc-usar" style="margin-left:auto">Usar esta data</button></div>
          <p class="hint">A contagem começa no dia seguinte à intimação e pula fins de semana e feriados nacionais. Feriados locais e suspensões do tribunal não entram: confira sempre no calendário do órgão.</p>
        </div>
      </details>
      <label class="field"><span>Quem da equipe vai fazer</span><select name="responsavelId">${memberOptions(c.responsavelId)}</select></label>
      ${edit ? '' : `<div class="field"><label class="check"><input type="checkbox" name="lembrete" checked> Lembrete na agenda do responsável</label>
        <select name="lembreteDias" class="input" style="max-width:260px"><option value="1">1 dia útil antes do prazo</option><option value="2" selected>2 dias úteis antes</option><option value="3">3 dias úteis antes</option><option value="5">5 dias úteis antes</option></select></div>`}
    </div>
    <div class="modal-foot"><button type="button" class="btn" data-act="close-modal">Cancelar</button><button type="submit" class="btn primary">${edit ? 'Salvar alterações' : 'Cadastrar caso'}</button></div>
  </form>`, root => {
    const f = root.querySelector('#f-caso'), num = f.querySelector('#c-numero'), hint = f.querySelector('#c-numero-hint'), orgao = f.querySelector('#c-orgao');
    const tipo = () => f.querySelector('[name=tipo]:checked').value;
    const checkNum = () => {
      if (tipo() !== 'judicial') return;
      num.value = cnjMask(num.value);
      const p = cnjParse(num.value);
      if (!num.value) { hint.className = 'hint'; hint.textContent = 'Digite só os números; o formato e o dígito verificador são conferidos na hora.'; return; }
      if (!p) { hint.className = 'hint'; hint.textContent = `${num.value.replace(/\D/g, '').length} de 20 dígitos`; return; }
      const org = cnjOrgao(p);
      if (p.valid) { hint.className = 'hint ok'; hint.textContent = `Número válido${org ? ' · ' + org : ''} · ano ${p.A}`; if (org && (!orgao.value || orgao.dataset.auto)) { orgao.value = org; orgao.dataset.auto = '1'; } }
      else { hint.className = 'hint bad'; hint.textContent = 'Dígito verificador não confere. Revise o número.'; }
    };
    num.addEventListener('input', checkNum);
    orgao.addEventListener('input', () => { delete orgao.dataset.auto; });
    f.querySelectorAll('[name=tipo]').forEach(r => r.addEventListener('change', () => {
      const adm = tipo() === 'administrativo';
      f.querySelector('#c-numero-label').textContent = adm ? 'Protocolo / NB' : 'Número do processo (CNJ)';
      num.placeholder = adm ? 'NB 000.000.000-0' : '0000000-00.0000.0.00.0000'; num.inputMode = adm ? 'text' : 'numeric';
      hint.className = 'hint'; hint.textContent = adm ? 'Número do benefício ou do protocolo no Meu INSS.' : 'Digite só os números; o formato e o dígito verificador são conferidos na hora.';
      if (adm) { f.querySelector('#calc-modo').value = 'corridos'; f.querySelector('#calc-recesso').checked = false; calc(); } else checkNum();
    }));
    if (c.numero) checkNum();
    const calc = () => {
      const ini = f.querySelector('#calc-ini').value, n = +f.querySelector('#calc-dias').value;
      if (!ini || !n) { f.querySelector('#calc-res').textContent = '—'; return; }
      const r = calcPrazo(ini, n, f.querySelector('#calc-modo').value, f.querySelector('#calc-recesso').checked);
      f.querySelector('#calc-res').textContent = fmtDate(r); f.querySelector('#calc-res').dataset.v = r;
      f.querySelector('#calc-res-dia').textContent = parseISO(r).toLocaleDateString('pt-BR', { weekday: 'long' });
    };
    ['#calc-ini', '#calc-dias', '#calc-modo', '#calc-recesso'].forEach(s => f.querySelector(s).addEventListener('input', calc));
    calc();
    f.querySelector('#calc-usar').addEventListener('click', () => { const v = f.querySelector('#calc-res').dataset.v; if (v) { f.querySelector('#c-prazo').value = v; toast('Data do prazo preenchida: ' + fmtDate(v)); } });
  });
}

function eventModal(e, preset = {}) {
  const edit = !!e; e = e || { data: preset.data || todayISO(), responsavelId: preset.resp || meMember()?.id || '', casoId: preset.caso || '', tipo: preset.caso ? 'Prazo interno' : 'Reunião' };
  const casos = Store.data.casos.filter(c => c.status !== 'cumprido' || c.id === e.casoId);
  openModal(`
  <form id="f-evento" data-id="${esc(e.id || '')}">
    ${modalHead(edit ? 'Editar compromisso' : 'Novo compromisso')}
    <div class="modal-body">
      <label class="field"><span>O que é</span><input name="titulo" required value="${esc(e.titulo || '')}" placeholder="Ex.: Audiência de instrução"></label>
      <div class="grid3">
        <label class="field"><span>Dia</span><input name="data" type="date" required value="${esc(e.data)}"></label>
        <label class="field"><span>Início</span><input name="inicio" type="time" value="${esc(e.inicio || '')}"></label>
        <label class="field"><span>Fim</span><input name="fim" type="time" value="${esc(e.fim || '')}"></label>
      </div>
      <p class="hint">Quando passar do horário de fim (ou do início, se não tiver fim), o compromisso aparece como finalizado.</p>
      <div class="grid2">
        <label class="field"><span>Tipo</span><select name="tipo">${options(TIPOS_EVENTO, e.tipo)}</select></label>
        <label class="field"><span>Responsável</span><select name="responsavelId">${memberOptions(e.responsavelId)}</select></label>
      </div>
      <label class="field"><span>Processo vinculado</span><select name="casoId"><option value="">Nenhum</option>${casos.map(c => `<option value="${esc(c.id)}" ${c.id === e.casoId ? 'selected' : ''}>${esc(trunc(`${c.autor} × ${c.reu}`, 60))}</option>`).join('')}</select></label>
      <label class="field"><span>Observações</span><textarea name="descricao" placeholder="Local, link da sala virtual, documentos para levar…">${esc(e.descricao || '')}</textarea></label>
    </div>
    <div class="modal-foot"><button type="button" class="btn" data-act="close-modal">Cancelar</button><button type="submit" class="btn primary">${edit ? 'Salvar' : 'Adicionar à agenda'}</button></div>
  </form>`);
}

function memberModal(m) {
  const edit = !!m; m = m || { cor: CORES[Store.data.equipe.length % CORES.length] };
  openModal(`
  <form id="f-membro" data-id="${esc(m.id || '')}">
    ${modalHead(edit ? 'Editar pessoa' : 'Adicionar à equipe')}
    <div class="modal-body">
      <label class="field"><span>Nome</span><input name="nome" required value="${esc(m.nome || '')}"></label>
      <div class="grid2">
        <label class="field"><span>Cargo</span><input name="cargo" value="${esc(m.cargo || '')}" placeholder="Advogada, estagiário…"></label>
        <label class="field"><span>E-mail Google</span><input name="email" type="email" value="${esc(m.email || '')}" placeholder="para login e marcações"></label>
      </div>
      <p class="hint">O e-mail liga a pessoa ao login: é assim que o sininho sabe o que é dela. Para ela conseguir entrar, o e-mail também precisa estar liberado nas regras do Firestore.</p>
      <div class="field"><span>Cor</span><div class="color-row">${CORES.map((c, i) => `<label><input type="radio" name="cor" value="${c}" ${c === m.cor ? 'checked' : ''} aria-label="Cor ${i + 1}"><span style="--c:${c}"></span></label>`).join('')}</div></div>
    </div>
    <div class="modal-foot">${edit ? `<button type="button" class="btn danger" data-act="del-membro" data-id="${esc(m.id)}" style="margin-right:auto">${ICON.trash}Remover</button>` : ''}<button type="button" class="btn" data-act="close-modal">Cancelar</button><button type="submit" class="btn primary">${edit ? 'Salvar' : 'Adicionar'}</button></div>
  </form>`, null, 'sm');
}

const EXEMPLO_IMPORT = `[
  {
    "tipo": "judicial",
    "numero": "0000000-00.0000.0.00.0000",
    "autor": "Nome do autor",
    "reu": "Nome do réu",
    "area": "Previdenciário",
    "orgao": "TRF3 · 1ª Vara Federal",
    "tipoPrazo": "Manifestação",
    "prazo": "2026-11-05",
    "responsavel": "email@escritorio.com",
    "andamento": "O que aconteceu no processo",
    "resumo": "opcional",
    "origem": "ia"
  }
]`;
function importModal() {
  openModal(`
  <form id="f-import">
    ${modalHead('Importar casos')}
    <div class="modal-body">
      <p>Cole uma lista de casos em JSON. É por aqui que casos gerados automaticamente (por exemplo, lidos de um PDF ou de uma intimação) entram no sistema.</p>
      <label class="field"><span>JSON</span><textarea id="import-json" class="mono" rows="10" placeholder='[{"numero": "...", "autor": "...", "reu": "...", "prazo": "AAAA-MM-DD"}]'></textarea></label>
      <details class="calc"><summary>Ver formato aceito</summary><div class="calc-body"><pre class="code">${esc(EXEMPLO_IMPORT)}</pre><p class="hint"><span class="mono">responsavel</span> aceita o e-mail ou o nome da pessoa da equipe. Itens com <span class="mono">"origem": "ia"</span> entram marcados para revisão humana.</p></div></details>
      <p class="hint" id="import-msg"></p>
    </div>
    <div class="modal-foot"><button type="button" class="btn" data-act="close-modal">Cancelar</button><button type="submit" class="btn primary">${ICON.up}Importar</button></div>
  </form>`);
}

/* API de integração: window.Pauta.importarCasos([...]) — usada pela tela de importação e, no futuro, pela automação */
async function importarCasos(arr, origemPadrao = 'importado') {
  if (!Array.isArray(arr)) arr = [arr];
  const ok = [], erros = [];
  for (const [i, raw] of arr.entries()) {
    if (!raw || typeof raw !== 'object') { erros.push(`Item ${i + 1}: não é um objeto`); continue; }
    if (!raw.autor || !raw.reu) { erros.push(`Item ${i + 1}: faltam "autor" e/ou "reu"`); continue; }
    if (raw.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(raw.prazo)) { erros.push(`Item ${i + 1}: prazo deve estar como AAAA-MM-DD`); continue; }
    const ref = String(raw.responsavel || '').toLowerCase();
    const resp = Store.data.equipe.find(m => (m.email || '').toLowerCase() === ref || m.nome.toLowerCase() === ref || m.id === raw.responsavelId);
    const tipo = raw.tipo === 'administrativo' ? 'administrativo' : 'judicial';
    const p = tipo === 'judicial' ? cnjParse(raw.numero) : null;
    const origem = raw.origem === 'ia' ? 'ia' : origemPadrao;
    const caso = {
      tipo, numero: p ? p.formatted : String(raw.numero || ''), autor: String(raw.autor), reu: String(raw.reu),
      representa: raw.representa === 'reu' ? 'reu' : 'autor', area: AREAS.includes(raw.area) ? raw.area : (raw.area || 'Outro'),
      orgao: raw.orgao || (p ? cnjOrgao(p) : ''), tipoPrazo: raw.tipoPrazo || 'Outro', prazo: raw.prazo || '', responsavelId: resp?.id || '',
      status: 'aberto', origem, revisado: origem !== 'ia', criadoPor: origem === 'ia' ? 'Importação automática' : (meMember()?.nome || ''), criadoPorId: origem === 'ia' ? '' : (meMember()?.id || ''),
      andamentos: raw.andamento ? [{ id: uid(), data: todayISO(), texto: String(raw.andamento), autor: origem === 'ia' ? 'Importação' : (meMember()?.nome || '') }] : [],
      resumo: raw.resumo ? { texto: String(raw.resumo), origem, atualizadoEm: Date.now() } : null,
    };
    if (p && !p.valid) erros.push(`Item ${i + 1}: importado, mas o dígito verificador do número não confere`);
    try { await Store.add('casos', caso); ok.push(caso); } catch (e) { erros.push(`Item ${i + 1}: ${e.message}`); }
  }
  return { importados: ok.length, erros };
}
window.Pauta = { importarCasos, formato: EXEMPLO_IMPORT, calcPrazo, cnjParse, anexarArquivo, salvarResumo, gerarResumo: (ref, ids) => { const c = acharCaso(ref); return gerarResumo(c.id, ids || (c.documentos || []).map(d => d.id)); }, caso: acharCaso };

/* ---------------- exportações (só fora do preview) ---------------- */
function download(name, text, type) {
  const blob = new Blob([text], { type }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function buildICS() {
  const e = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const ymd = iso => iso.replace(/-/g, ''), stampNow = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pauta//PT-BR', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:Pauta ${OFFICE}`];
  for (const c of Store.data.casos) if (c.prazo && c.status !== 'cumprido')
    L.push('BEGIN:VEVENT', `UID:prazo-${c.id}@pauta`, `DTSTAMP:${stampNow}`, `DTSTART;VALUE=DATE:${ymd(c.prazo)}`, `DTEND;VALUE=DATE:${ymd(addDaysISO(c.prazo, 1))}`,
      `SUMMARY:${e(`PRAZO ${c.tipoPrazo || ''} · ${c.autor} × ${c.reu}`)}`, `DESCRIPTION:${e(`${c.numero || ''}\nResponsável: ${member(c.responsavelId)?.nome || '-'}`)}`, 'END:VEVENT');
  for (const ev of Store.data.agenda) {
    const ini = ev.inicio ? `DTSTART:${ymd(ev.data)}T${ev.inicio.replace(':', '')}00` : `DTSTART;VALUE=DATE:${ymd(ev.data)}`;
    const fim = ev.inicio ? `DTEND:${ymd(ev.data)}T${(ev.fim || ev.inicio).replace(':', '')}00` : `DTEND;VALUE=DATE:${ymd(addDaysISO(ev.data, 1))}`;
    L.push('BEGIN:VEVENT', `UID:ev-${ev.id}@pauta`, `DTSTAMP:${stampNow}`, ini, fim, `SUMMARY:${e(ev.titulo)}`, `DESCRIPTION:${e(`${ev.descricao || ''}\nResponsável: ${member(ev.responsavelId)?.nome || '-'}`)}`, 'END:VEVENT');
  }
  L.push('END:VCALENDAR'); return L.join('\r\n');
}

/* ---------------- toasts ---------------- */
function toast(msg, kind = '') {
  const box = $('#toasts'); if (!box) return;
  const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = msg; box.appendChild(el);
  setTimeout(() => el.remove(), kind === 'danger' ? 6000 : 2800);
}

/* ---------------- renderização ---------------- */
let lastMsgCount = -1;
function refresh() {
  const app = $('#app'); if (!app || app.dataset.mode !== 'app') return;
  const a = document.activeElement, fid = a && a.id && app.contains(a) ? a.id : null;
  let sel = null; try { if (fid && a.selectionStart != null) sel = [a.selectionStart, a.selectionEnd]; } catch { /* sem seleção */ }
  const keep = {}; app.querySelectorAll('[data-keep]').forEach(el => { if (el.id) keep[el.id] = el.value; });
  const scrolls = {}; app.querySelectorAll('[data-scroll]').forEach(el => { scrolls[el.dataset.scroll] = el.scrollTop; });
  app.innerHTML = shell();
  for (const [id, v] of Object.entries(keep)) { const el = document.getElementById(id); if (el) el.value = v; }
  app.querySelectorAll('[data-scroll]').forEach(el => { if (scrolls[el.dataset.scroll] != null) el.scrollTop = scrolls[el.dataset.scroll]; });
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch { /* ok */ } } }
  if (ui.view === 'chat') {
    const box = $('#msgs'); const n = Store.data.mensagens.filter(x => x.canal === ui.canal).length;
    if (box && n !== lastMsgCount) { box.scrollTop = box.scrollHeight; lastMsgCount = n; }
    markChatSeen(ui.canal);
  }
}
function go(view) {
  ui.view = view; ui.bell = ui.menu = false; ui.membroId = view === 'equipe' ? ui.membroId : null; lastMsgCount = -1;
  try { if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view); } catch { /* preview */ }
  refresh(); window.scrollTo(0, 0);
}

/* ---------------- eventos ---------------- */
document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, id = el.dataset.id, v = el.dataset.v;
  if (act === 'modal-bg' && ev.target !== el) return;
  switch (act) {
    case 'login-google': return loginGoogle();
    case 'login-demo': return startDemo();
    case 'nav': ui.caso = null; if (v === 'equipe') ui.membroId = null; return go(v);
    case 'bell': ui.bell = !ui.bell; ui.menu = false; return refresh();
    case 'menu': ui.menu = !ui.menu; ui.bell = false; return refresh();
    case 'close-pop': ui.bell = ui.menu = false; return refresh();
    case 'seen-all': notifications().forEach(n => seen.add(n.id)); ls.set(seenKey(), [...seen].slice(-500)); return refresh();
    case 'open-notif': {
      seen.add(id); ls.set(seenKey(), [...seen].slice(-500)); ui.bell = false;
      const tipo = el.dataset.tipo, ref = el.dataset.ref;
      if (tipo === 'prazo') { ui.caso = ref; ui.casoAba = 'andamentos'; return refresh(); }
      if (tipo === 'agenda') { const d = el.dataset.data; ui.calDia = d; ui.calY = +d.slice(0, 4); ui.calM = +d.slice(5, 7) - 1; return go('calendario'); }
      if (tipo === 'msg') { ui.canal = ref; return go('chat'); }
      return refresh();
    }
    case 'theme': {
      const root = document.documentElement;
      const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'light' : 'dark'; ls.set('pauta-tema', root.dataset.theme); ui.menu = false; return refresh();
    }
    case 'logout': ui.menu = false; return logout();
    case 'restore-backup': ui.menu = false; refresh(); return $('#backup-file')?.click();
    case 'reset-demo': ui.menu = false; refresh(); return confirmModal('Apagar o que você mexeu e voltar aos dados de exemplo?', 'Restaurar', () => { Store.resetDemo(); toast('Dados de exemplo restaurados'); });
    case 'import': ui.menu = false; refresh(); return importModal();
    case 'config-ia': ui.menu = false; refresh(); return iaModal();
    case 'ia-remover': { const c = iaCfg(); ls.set(IA_KEY, { modelo: c.modelo }); closeModal(); toast('Chave removida deste aparelho'); return refresh(); }
    case 'gerar-resumo': { const ids = [...document.querySelectorAll('.resumo-doc:checked')].map(x => x.value); return gerarResumo(id, ids); }
    case 'copy-resumo': { const t = Store.get('casos', ui.caso)?.resumo?.texto || ''; try { await navigator.clipboard.writeText(t); toast('Resumo copiado'); } catch { toast('Não consegui copiar; use Editar e copie o texto', 'danger'); } return; }
    case 'doc-open': {
      const w = window.open('', '_blank');
      try { const rec = await IDB.get(id); if (!rec) throw new Error(); const url = URL.createObjectURL(rec.blob); if (w) w.location.href = url; else location.href = url; }
      catch { w?.close(); toast('Esse arquivo não está salvo neste aparelho', 'danger'); }
      return;
    }
    case 'doc-download': {
      try { const rec = await IDB.get(id); if (!rec) throw new Error(); const a = document.createElement('a'); a.href = URL.createObjectURL(rec.blob); a.download = rec.nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
      catch { toast('Esse arquivo não está salvo neste aparelho', 'danger'); }
      return;
    }
    case 'doc-del': { const cid = ui.caso; return confirmModal('Excluir este documento do caso? O arquivo some deste aparelho.', 'Excluir', () => safe(removerDocumento(cid, id), 'Documento excluído')); }
    case 'export-ics': ui.menu = false; refresh(); download('pauta-agenda.ics', buildICS(), 'text/calendar'); return toast('Arquivo .ics baixado — importe no Google Agenda');
    case 'export-json': ui.menu = false; refresh(); download(`pauta-backup-${todayISO()}.json`, JSON.stringify(Store.data, null, 2), 'application/json'); return toast('Backup baixado');

    case 'filtro': ui.filtro = v; return refresh();
    case 'novo-caso': return caseModal();
    case 'open-case': ui.caso = id; ui.casoAba = 'andamentos'; return refresh();
    case 'close-drawer': ui.caso = null; return refresh();
    case 'case-tab': ui.casoAba = v; return refresh();
    case 'edit-case': return caseModal(Store.get('casos', id));
    case 'del-case': return confirmModal('Excluir este caso e todo o histórico de andamentos? Os compromissos da agenda continuam.', 'Excluir caso', async () => { ui.caso = null; await safe(Store.remove('casos', id), 'Caso excluído'); refresh(); });
    case 'toggle-cumprido': {
      const c = Store.get('casos', id); const done = c.status !== 'cumprido';
      return safe(Store.update('casos', id, done ? { status: 'cumprido', cumpridoEm: Date.now(), cumpridoPor: meMember()?.nome || me?.nome || '' } : { status: 'aberto', cumpridoEm: null, cumpridoPor: null }), done ? 'Prazo marcado como cumprido' : 'Prazo reaberto');
    }
    case 'revisado': return safe(Store.update('casos', id, { revisado: true }), 'Caso marcado como conferido');
    case 'copy': {
      const text = el.dataset.text;
      try { await navigator.clipboard.writeText(text); toast('Número copiado'); }
      catch { const s = window.getSelection(), r = document.createRange(); const span = el.previousElementSibling; if (span) { r.selectNodeContents(span); s.removeAllRanges(); s.addRange(r); } toast('Selecionei o número: copie com Ctrl+C'); }
      return;
    }

    case 'cal-day': ui.calDia = v; { const d = parseISO(v); if (d.getMonth() !== ui.calM) { ui.calM = d.getMonth(); ui.calY = d.getFullYear(); } } refresh();
      if (matchMedia('(max-width: 1099px)').matches) $('.day-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    case 'cal-prev': ui.calM--; if (ui.calM < 0) { ui.calM = 11; ui.calY--; } return refresh();
    case 'cal-next': ui.calM++; if (ui.calM > 11) { ui.calM = 0; ui.calY++; } return refresh();
    case 'cal-today': { const d = new Date(); ui.calY = d.getFullYear(); ui.calM = d.getMonth(); ui.calDia = todayISO(); return refresh(); }
    case 'goto-day': ui.calDia = v; ui.calY = +v.slice(0, 4); ui.calM = +v.slice(5, 7) - 1; ui.caso = null; return go('calendario');
    case 'novo-evento': return eventModal(null, { data: v, caso: el.dataset.caso, resp: el.dataset.resp });
    case 'edit-evento': return eventModal(Store.get('agenda', id));
    case 'del-evento': return confirmModal('Excluir este compromisso da agenda?', 'Excluir', () => safe(Store.remove('agenda', id), 'Compromisso excluído'));
    case 'ev-concluir': return safe(Store.update('agenda', id, { concluido: true }), 'Compromisso finalizado');
    case 'ev-reabrir': return safe(Store.update('agenda', id, { concluido: false }), 'Compromisso reaberto');

    case 'novo-membro': return memberModal();
    case 'open-membro': ui.membroId = id; refresh(); return window.scrollTo(0, 0);
    case 'back-equipe': ui.membroId = null; return refresh();
    case 'edit-membro': return memberModal(member(id));
    case 'del-membro': closeModal(); return confirmModal('Remover esta pessoa da equipe? Os casos e compromissos dela ficam sem responsável.', 'Remover', async () => {
      await safe(Store.remove('equipe', id), 'Pessoa removida'); ui.membroId = null; refresh(); });
    case 'dm': { const m = meMember(); if (!m) return; ui.canal = dmKey(m.id, id); return go('chat'); }
    case 'canal': ui.canal = v; lastMsgCount = -1; return refresh();

    case 'close-modal': case 'modal-bg': return closeModal();
  }
});

document.addEventListener('input', ev => {
  if (ev.target.id === 'busca') { ui.busca = ev.target.value; refresh(); }
  if (ev.target.id === 'chat-input') { const t = ev.target; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'doc-file' && t.files?.length) { const files = [...t.files]; t.value = ''; return anexarArquivos(ui.caso, files); }
  if (t.id === 'backup-file' && t.files?.[0]) { restoreBackup(t.files[0]); t.value = ''; return; }
  if (t.id === 'f-ordem') { ui.ordem = t.value; refresh(); }
  if (t.id === 'f-resp') { ui.resp = t.value; refresh(); }
  if (t.id === 'f-area') { ui.area = t.value; refresh(); }
  if (t.id === 'f-meus') { ui.soMeus = t.checked; refresh(); }
  if (t.id === 'drawer-resp') { const nm = member(t.value)?.nome; safe(Store.update('casos', ui.caso, { responsavelId: t.value }), nm ? `Agora com ${firstName(nm)}` : 'Caso sem responsável'); }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    if ($('#modal-root').innerHTML) return closeModal();
    if (ui.bell || ui.menu) { ui.bell = ui.menu = false; return refresh(); }
    if (ui.caso) { ui.caso = null; return refresh(); }
  }
  if (ev.target.id === 'chat-input' && ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ev.target.form.requestSubmit(); }
});

['dragenter', 'dragover'].forEach(t => document.addEventListener(t, ev => {
  const files = [...(ev.dataTransfer?.types || [])].includes('Files'); if (files) ev.preventDefault();
  const z = ev.target.closest?.('.drop-target'); if (!z) return; ev.preventDefault(); z.classList.add('over');
}));
['dragleave', 'drop'].forEach(t => document.addEventListener(t, ev => {
  if (t === 'drop' && [...(ev.dataTransfer?.types || [])].includes('Files')) ev.preventDefault();
  const z = ev.target.closest?.('.drop-target'); if (!z) return; ev.preventDefault(); z.classList.remove('over');
  if (t === 'drop' && ev.dataTransfer?.files?.length) anexarArquivos(z.dataset.caso, [...ev.dataTransfer.files]);
}));

document.addEventListener('submit', async ev => {
  const f = ev.target; ev.preventDefault();
  const fd = Object.fromEntries(new FormData(f).entries());
  const quem = meMember()?.nome || me?.nome || '';
  switch (f.id) {
    case 'f-start': { const nome = (fd.nome || '').trim(); if (nome) await startLocal(nome); return; }
    case 'f-caso': {
      const tipo = fd.tipo, editId = f.dataset.id;
      let numero = (fd.numero || '').trim();
      if (tipo === 'judicial' && numero) { const p = cnjParse(numero); if (p) numero = p.formatted; }
      const base = { tipo, numero, autor: fd.autor.trim(), reu: fd.reu.trim(), representa: fd.representa, area: fd.area, orgao: (fd.orgao || '').trim(), tipoPrazo: fd.tipoPrazo, prazo: fd.prazo || '', responsavelId: fd.responsavelId || '' };
      if (editId) { closeModal(); return safe(Store.update('casos', editId, base), 'Caso atualizado'); }
      const caso = { ...base, status: 'aberto', origem: 'manual', revisado: true, criadoPor: quem, criadoPorId: meMember()?.id || '',
        andamentos: fd.andamento?.trim() ? [{ id: uid(), data: todayISO(), texto: fd.andamento.trim(), autor: quem }] : [] };
      closeModal();
      try {
        const id = await Store.add('casos', caso);
        if (fd.lembrete && caso.prazo && caso.prazo >= todayISO()) {
          let dia = subBusinessDays(caso.prazo, +fd.lembreteDias || 2); if (dia < todayISO()) dia = todayISO();
          await Store.add('agenda', { titulo: `Lembrete: ${caso.tipoPrazo} · ${caso.autor}`, tipo: 'Prazo interno', data: dia, inicio: '09:00', responsavelId: caso.responsavelId, casoId: id, criadoPor: quem, descricao: `Prazo fatal em ${fmtDate(caso.prazo)}.` });
        }
        toast(caso.responsavelId && caso.responsavelId !== meMember()?.id ? `Caso cadastrado e atribuído a ${firstName(member(caso.responsavelId)?.nome)}` : 'Caso cadastrado');
        ui.caso = id; ui.casoAba = 'andamentos'; ui.view = 'prazos'; refresh();
      } catch (e) { toast('Não foi possível salvar: ' + e.message, 'danger'); }
      return;
    }
    case 'f-evento': {
      if (fd.inicio && fd.fim && fd.fim <= fd.inicio) return toast('O fim precisa ser depois do início', 'danger');
      const editId = f.dataset.id;
      const obj = { titulo: fd.titulo.trim(), data: fd.data, inicio: fd.inicio || '', fim: fd.fim || '', tipo: fd.tipo, responsavelId: fd.responsavelId || '', casoId: fd.casoId || '', descricao: (fd.descricao || '').trim() };
      closeModal();
      if (editId) return safe(Store.update('agenda', editId, obj), 'Compromisso atualizado');
      await safe(Store.add('agenda', { ...obj, criadoPor: quem, concluido: false }), obj.responsavelId && obj.responsavelId !== meMember()?.id ? `Marcado para ${firstName(member(obj.responsavelId)?.nome)} — aparece no sininho dela(e)` : 'Adicionado à agenda');
      if (ui.view === 'calendario') { ui.calDia = obj.data; ui.calY = +obj.data.slice(0, 4); ui.calM = +obj.data.slice(5, 7) - 1; refresh(); }
      return;
    }
    case 'f-membro': {
      const editId = f.dataset.id; const email = (fd.email || '').trim().toLowerCase();
      if (email && Store.data.equipe.some(m => m.id !== editId && (m.email || '').toLowerCase() === email)) return toast('Já existe alguém com esse e-mail', 'danger');
      const obj = { nome: fd.nome.trim(), cargo: (fd.cargo || '').trim(), email, cor: fd.cor || CORES[0] };
      closeModal();
      return safe(editId ? Store.update('equipe', editId, obj) : Store.add('equipe', obj), editId ? 'Dados atualizados' : `${firstName(obj.nome)} entrou na equipe`);
    }
    case 'f-import': {
      const msg = f.querySelector('#import-msg');
      let data; try { data = JSON.parse(f.querySelector('#import-json').value); } catch (e) { msg.className = 'hint bad'; msg.textContent = 'JSON inválido: ' + e.message; return; }
      const r = await importarCasos(data);
      if (r.importados && !r.erros.length) { closeModal(); toast(`${r.importados} ${r.importados === 1 ? 'caso importado' : 'casos importados'}`); return; }
      msg.className = r.erros.length ? 'hint bad' : 'hint ok'; msg.innerHTML = `${r.importados} importado(s).<br>${r.erros.map(esc).join('<br>')}`; return;
    }
    case 'f-andamento': {
      const c = Store.get('casos', ui.caso); const txt = f.querySelector('#and-texto').value.trim(); if (!c || !txt) return;
      const and = { id: uid(), data: f.querySelector('#and-data').value || todayISO(), texto: txt, autor: quem };
      f.querySelector('#and-texto').value = '';
      return safe(Store.update('casos', c.id, { andamentos: [...(c.andamentos || []), and] }), 'Andamento registrado');
    }
    case 'f-ia': {
      const key = f.querySelector('#ia-key').value.trim(), modelo = f.querySelector('#ia-modelo').value.trim() || 'claude-sonnet-5-5';
      ls.set(IA_KEY, { key, modelo }); closeModal(); toast(key ? 'IA configurada neste aparelho' : 'Configuração salva'); return refresh();
    }
    case 'f-resumo': return safe(Store.update('casos', ui.caso, { resumo: { texto: f.querySelector('#resumo-texto').value, origem: 'manual', atualizadoEm: Date.now(), por: quem } }), 'Resumo salvo');
    case 'f-pdf': { const url = f.querySelector('#pdf-url').value.trim(); return safe(Store.update('casos', ui.caso, { pdf: url ? { url, nome: '' } : null }), url ? 'Link salvo' : 'Link removido'); }
    case 'f-chat': {
      const inp = f.querySelector('#chat-input'); const txt = inp.value.trim(); const m = meMember(); if (!txt || !m) return;
      inp.value = ''; inp.style.height = 'auto';
      return safe(Store.add('mensagens', { canal: ui.canal, autorId: m.id, autorNome: m.nome, texto: txt }));
    }
  }
});

/* ---------------- login e inicialização ---------------- */
function loginHTML(msg) {
  const hasFb = !!(CFG.firebase && CFG.firebase.apiKey);
  return `<div class="login"><div class="login-card">
    <div class="login-brand"><span class="brand-mark big">§</span><div><div class="login-title">Pauta</div><div class="login-office">${esc(OFFICE)}</div></div></div>
    <p class="login-lede">Prazos, agenda, equipe e conversa do escritório num lugar só.</p>
    ${msg ? `<p class="login-msg">${esc(msg)}</p>` : ''}
    ${hasFb ? `<button class="btn google" data-act="login-google">${ICON.google}Entrar com Google</button>
    ${CFG.allowDemo ? '<button class="btn ghost" data-act="login-demo">Abrir modo demonstração</button>' : ''}` : `
    <form id="f-start" class="field"><span>Seu nome</span><input id="start-nome" name="nome" required autocomplete="name" placeholder="Como a equipe te chama"><button class="btn primary" type="submit" style="margin-top:6px">Começar</button></form>
    <p class="hint">Por enquanto os dados ficam salvos neste navegador. O login com Google e o uso pela equipe toda ligam quando o <span class="mono">config.js</span> recebe os dados do Firebase (passo a passo no README).</p>`}
    ${hasFb ? '<p class="login-foot">Acesso restrito à equipe. Dados de clientes ficam protegidos pelas regras do banco — só e-mails liberados leem e gravam.</p>' : ''}
  </div></div>`;
}
function showLogin(msg) { const app = $('#app'); app.dataset.mode = 'login'; app.innerHTML = loginHTML(msg); }
function showApp() {
  seen = new Set(ls.get(seenKey(), []));
  const h = (location.hash || '').slice(1); if (TITULOS[h]) ui.view = h;
  const app = $('#app'); app.dataset.mode = 'app'; refresh();
  appPronto();
}
function startDemo() {
  me = { email: 'voce@demo.local', nome: 'Você (demo)', foto: '' };
  Store.initLocal(true); showApp();
}
async function startLocal(nome) {
  Store.initLocal(false);
  let id = ls.get(LS_LOCAL_EU, null);
  if (!id || !member(id)) {
    if (!nome) return showLogin();
    id = await Store.add('equipe', { nome, cargo: '', email: '', cor: CORES[Store.data.equipe.length % CORES.length] });
    ls.set(LS_LOCAL_EU, id);
  }
  me = { email: '', nome: member(id).nome, foto: '', localId: id };
  showApp();
}
async function restoreBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { return toast('Esse arquivo não é um backup válido', 'danger'); }
  if (!data || !COLS.every(c => Array.isArray(data[c]))) return toast('Esse arquivo não é um backup da Pauta', 'danger');
  confirmModal(`Substituir tudo que está aqui pelo backup (${data.casos.length} casos, ${data.agenda.length} compromissos, ${data.equipe.length} pessoas)?`, 'Restaurar', () => {
    Store.data = data; Store.persist(); Store.emit(); toast('Backup restaurado');
  });
}
async function loadFirebase(cfg) {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_V}/`;
  const [appM, a, f] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const app = appM.initializeApp(cfg);
  let db;
  try { db = f.initializeFirestore(app, { localCache: f.persistentLocalCache({ tabManager: f.persistentMultipleTabManager() }) }); }
  catch { db = f.getFirestore(app); }
  return { app, auth: a.getAuth(app), db, a, f };
}
async function loginGoogle() {
  if (!fb) return;
  const provider = new fb.a.GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
  try { await fb.a.signInWithPopup(fb.auth, provider); }
  catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return fb.a.signInWithRedirect(fb.auth, provider);
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request')
      showLogin(e.code === 'auth/unauthorized-domain' ? 'Este endereço ainda não está nos domínios autorizados do Firebase (Authentication → Configurações).' : 'Não foi possível entrar: ' + e.message);
  }
}
async function logout() {
  if (Store.mode === 'firebase' && fb) { await fb.a.signOut(fb.auth); location.reload(); return; }
  me = null; Store.mode = null; showLogin();
}
async function ensureMember() {
  if (meMember()) return;
  const others = Store.data.equipe.length;
  await Store.add('equipe', { nome: me.nome || me.email.split('@')[0], email: me.email.toLowerCase(), cargo: others ? '' : 'Administração', cor: CORES[others % CORES.length], foto: me.foto || '' });
}

async function boot() {
  const tema = ls.get('pauta-tema', null); if (tema) document.documentElement.dataset.theme = tema;
  Store.on(() => { if ($('#app').dataset.mode === 'app') refresh(); });
  setInterval(() => { if ($('#app').dataset.mode === 'app' && !ui.bell && !ui.menu) refresh(); }, 60000); // atualiza "finalizado" e contagens
  const hasFb = !!(CFG.firebase && CFG.firebase.apiKey);
  if (IS_ARTIFACT) return startDemo();
  if (!hasFb) return startLocal();
  showLogin();
  try { fb = await loadFirebase(CFG.firebase); }
  catch (e) { return showLogin('Não consegui carregar o Firebase. Confira a internet e o config.js. (' + e.message + ')'); }
  fb.a.getRedirectResult(fb.auth).catch(() => {});
  fb.a.onAuthStateChanged(fb.auth, async user => {
    if (!user) return showLogin();
    if (!isAllowed(user.email)) { await fb.a.signOut(fb.auth); return showLogin(`O e-mail ${user.email} não tem acesso. Peça para liberarem no config.js e nas regras do Firestore.`); }
    me = { email: user.email, nome: user.displayName || user.email, foto: user.photoURL || '' };
    $('#app').innerHTML = '<div class="login"><p class="hint">Carregando o escritório…</p></div>';
    await Store.initFirebase(fb);
    try { await ensureMember(); } catch { /* regras podem bloquear; o banner avisa */ }
    showApp();
  });
}
boot();
