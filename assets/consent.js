/* Pauta — aviso de privacidade e escolha de armazenamento.
   A Pauta não usa cookies de publicidade nem ferramentas de análise.
   Armazenamento ESSENCIAL (sempre ativo): sessão de login (Firebase), escolha feita neste aviso,
   cópia offline dos dados do escritório e documentos anexados neste aparelho.
   Armazenamento de PREFERÊNCIAS (só com permissão): tema claro/escuro e notificações/mensagens já vistas. */
(function () {
  var KEY = 'pauta-consent', VERSAO = 1;
  var PREFIXOS_PREF = ['pauta-tema', 'pauta-vistos-', 'pauta-chat-'];

  function ler() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.v === VERSAO ? v : null; } catch (e) { return null; }
  }
  function ehPreferencia(k) { return PREFIXOS_PREF.some(function (p) { return k.indexOf(p) === 0; }); }
  function limparPreferencias() {
    try { Object.keys(localStorage).forEach(function (k) { if (ehPreferencia(k)) localStorage.removeItem(k); }); } catch (e) { /* sem acesso */ }
  }
  function gravar(preferencias) {
    var v = { v: VERSAO, preferencias: !!preferencias, em: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* sem acesso */ }
    if (!preferencias) limparPreferencias();
    document.dispatchEvent(new CustomEvent('pauta-consent', { detail: v }));
    return v;
  }
  function permitido(k) { if (!ehPreferencia(k)) return true; var v = ler(); return !!(v && v.preferencias); }

  var CSS = '.pc-banner{position:fixed;z-index:55;left:max(16px,env(safe-area-inset-left,0px));right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));max-width:720px;margin:0 auto;display:flex;flex-wrap:wrap;gap:12px 16px;align-items:center;padding:16px 18px;border-radius:14px;background:var(--surface,#fff);color:var(--ink,#131C31);border:1px solid var(--line,#D7DDE6);box-shadow:0 10px 30px rgba(0,0,0,.18);font:14px/1.5 var(--font-body,system-ui,sans-serif)}'
    + '.pc-banner p{margin:0;flex:1 1 320px;min-width:0}.pc-banner a{color:var(--accent,#2347B0);font-weight:500}'
    + '.pc-actions{display:flex;gap:8px;flex-wrap:wrap}.pc-actions button{min-height:40px;padding:0 16px;border-radius:999px;border:1.5px solid var(--ink,#131C31);background:transparent;color:var(--ink,#131C31);font:inherit;font-weight:600;cursor:pointer}'
    + '.pc-actions button:focus-visible{outline:2px solid var(--accent,#2347B0);outline-offset:2px}'
    + '@media (max-width:899px){.pc-banner.pc-app{bottom:calc(76px + env(safe-area-inset-bottom,0px))}}';

  function banner(opcoes) {
    opcoes = opcoes || {};
    if (ler() && !opcoes.forcar) return;
    var antigo = document.getElementById('pc-banner'); if (antigo) antigo.remove();
    if (!document.getElementById('pc-css')) { var s = document.createElement('style'); s.id = 'pc-css'; s.textContent = CSS; document.head.appendChild(s); }
    var atual = ler();
    var d = document.createElement('div');
    d.id = 'pc-banner'; d.className = 'pc-banner' + (opcoes.app ? ' pc-app' : '');
    d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Privacidade e armazenamento');
    d.innerHTML = '<p><b>Sua privacidade.</b> Usamos só o armazenamento essencial para o login e o funcionamento. Com sua permissão, este aparelho também guarda preferências (tema e notificações já vistas). Não usamos cookies de publicidade nem ferramentas de análise. <a href="' + (opcoes.privacidadeUrl || 'privacidade.html') + '#cookies">Saiba mais</a>'
      + (atual ? ' <span>(escolha atual: ' + (atual.preferencias ? 'preferências permitidas' : 'só o essencial') + ')</span>' : '') + '</p>'
      + '<div class="pc-actions"><button type="button" data-pc="essencial">Só o essencial</button><button type="button" data-pc="aceitar">Permitir preferências</button></div>';
    var reservar = function () { document.body.style.paddingBottom = (d.offsetHeight + 32) + 'px'; };
    d.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-pc]'); if (!b) return;
      gravar(b.getAttribute('data-pc') === 'aceitar'); d.remove(); document.body.style.paddingBottom = '';
      window.removeEventListener('resize', reservar);
    });
    document.body.appendChild(d);
    reservar(); window.addEventListener('resize', reservar);
    if (opcoes.forcar) { var btn = d.querySelector('button'); if (btn) btn.focus(); }
  }

  window.PautaConsent = { ler: ler, gravar: gravar, permitido: permitido, ehPreferencia: ehPreferencia, banner: banner };
})();
