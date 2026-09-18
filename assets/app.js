(function () {
  'use strict';

  var $ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
  var $$ = function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); };

  function normalizar(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function escapar(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Destaca o termo em um elemento, ignorando acentos e maiúsculas. Guarda o texto original.
  function destacar(el, termo) {
    if (el._original === undefined) el._original = el.textContent;
    var original = el._original;
    if (!termo) { el.textContent = original; return 0; }
    var alvo = normalizar(original);
    var t = normalizar(termo);
    var partes = [];
    var i = 0, achados = 0, pos;
    while ((pos = alvo.indexOf(t, i)) !== -1) {
      partes.push(escapar(original.slice(i, pos)));
      partes.push('<mark>' + escapar(original.slice(pos, pos + t.length)) + '</mark>');
      i = pos + t.length;
      achados++;
    }
    if (!achados) { el.textContent = original; return 0; }
    partes.push(escapar(original.slice(i)));
    el.innerHTML = partes.join('');
    return achados;
  }

  // Tema
  var botaoTema = $('#alternar-tema');
  if (botaoTema) {
    botaoTema.addEventListener('click', function () {
      var claro = document.documentElement.classList.toggle('claro');
      try { localStorage.setItem('tema', claro ? 'claro' : 'escuro'); } catch (e) {}
    });
  }

  // Menu mobile
  var menu = $('#menu-lateral');
  var abrirMenu = $('#abrir-menu');
  if (menu && abrirMenu) {
    abrirMenu.addEventListener('click', function () {
      var aberto = menu.classList.toggle('aberto');
      abrirMenu.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('aberto');
        abrirMenu.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Progresso de leitura e voltar ao topo
  var barra = $('#barra-progresso');
  var topoBtn = $('#voltar-topo');
  function aoRolar() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (barra) barra.style.width = p + '%';
    if (topoBtn) topoBtn.classList.toggle('visivel', h.scrollTop > 600);
  }
  window.addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();
  if (topoBtn) topoBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // Seção atual no menu
  if (menu && 'IntersectionObserver' in window) {
    var links = $$('a[href^="#"]', menu);
    var mapa = {};
    links.forEach(function (a) { mapa[a.getAttribute('href').slice(1)] = a; });
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting && mapa[e.target.id]) {
          links.forEach(function (a) { a.classList.remove('atual'); });
          mapa[e.target.id].classList.add('atual');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(mapa).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) obs.observe(s);
    });
  }

  // Copiar scripts
  $$('.btn-copiar').forEach(function (b) {
    b.addEventListener('click', function () {
      var alvo = document.getElementById(b.getAttribute('data-copiar'));
      if (!alvo) return;
      var texto = alvo.textContent;
      function feito() {
        b.textContent = 'Copiado';
        b.classList.add('copiado');
        setTimeout(function () { b.textContent = 'Copiar'; b.classList.remove('copiado'); }, 1800);
      }
      function reserva() {
        var r = document.createRange();
        r.selectNodeContents(alvo);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        try { document.execCommand('copy'); feito(); } catch (e) { b.textContent = 'Selecionado'; }
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto).then(feito, reserva);
      } else {
        reserva();
      }
    });
  });

  // Filtro por momento e busca nas dicas e dúvidas
  var buscaGeral = $('#busca-geral');
  var chips = $$('.chip');
  var momentoAtual = 'todos';
  function aplicarFiltro() {
    var termo = buscaGeral ? buscaGeral.value.trim() : '';
    if (termo.length < 2) termo = '';
    var visiveis = 0, total = 0;
    $$('.filtravel').forEach(function (el) {
      var alvos = $$('.hl', el);
      var achou = 0;
      alvos.forEach(function (a) { achou += destacar(a, termo); });
      var passaMomento = !el.classList.contains('dica') || momentoAtual === 'todos' || el.getAttribute('data-momento') === momentoAtual;
      var passaBusca = !termo || achou > 0;
      var mostrar = passaMomento && passaBusca;
      el.classList.toggle('oculto', !mostrar);
      if (termo && el.tagName === 'DETAILS') el.open = mostrar;
      total++;
      if (mostrar) visiveis++;
    });
    $$('.grupo-dicas').forEach(function (g) {
      var algum = $$('.dica', g).some(function (d) { return !d.classList.contains('oculto'); });
      g.classList.toggle('oculto', !algum);
    });
    var cont = $('#contagem-busca');
    if (cont) {
      cont.textContent = termo || momentoAtual !== 'todos'
        ? visiveis + ' de ' + total + ' itens visíveis'
        : '';
    }
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      momentoAtual = c.getAttribute('data-momento');
      chips.forEach(function (x) {
        var ativo = x === c;
        x.classList.toggle('ativo', ativo);
        x.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      });
      aplicarFiltro();
    });
  });
  if (buscaGeral) {
    var espera;
    buscaGeral.addEventListener('input', function () {
      clearTimeout(espera);
      espera = setTimeout(aplicarFiltro, 120);
    });
  }

  // Abrir e fechar dúvidas
  var abrirD = $('#abrir-duvidas'), fecharD = $('#fechar-duvidas');
  if (abrirD) abrirD.addEventListener('click', function () { $$('.duvida').forEach(function (d) { d.open = true; }); });
  if (fecharD) fecharD.addEventListener('click', function () { $$('.duvida').forEach(function (d) { d.open = false; }); });
  window.addEventListener('beforeprint', function () { $$('.duvida').forEach(function (d) { d.open = true; }); });

  // Busca na transcrição
  var buscaT = $('#busca-transcricao');
  var contT = $('#contagem-transcricao');
  var segs = $$('#texto-transcricao .seg');
  var marcas = [];
  var indice = -1;
  function irPara(i) {
    if (!marcas.length) return;
    if (indice >= 0 && marcas[indice]) marcas[indice].classList.remove('atual');
    indice = (i + marcas.length) % marcas.length;
    var m = marcas[indice];
    m.classList.add('atual');
    m.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (contT) contT.textContent = (indice + 1) + ' de ' + marcas.length;
  }
  function buscarTranscricao() {
    var termo = buscaT.value.trim();
    if (termo.length < 2) termo = '';
    var total = 0;
    segs.forEach(function (s) { total += destacar(s, termo); });
    marcas = $$('#texto-transcricao mark');
    indice = -1;
    if (!termo) { if (contT) contT.textContent = ''; return; }
    if (!total) { if (contT) contT.textContent = 'Nenhuma ocorrência'; return; }
    irPara(0);
  }
  if (buscaT) {
    var esperaT;
    buscaT.addEventListener('input', function () {
      clearTimeout(esperaT);
      esperaT = setTimeout(buscarTranscricao, 200);
    });
    buscaT.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); irPara(indice + (e.shiftKey ? -1 : 1)); }
    });
    var ant = $('#anterior-transcricao'), prox = $('#proxima-transcricao');
    if (ant) ant.addEventListener('click', function () { irPara(indice - 1); });
    if (prox) prox.addEventListener('click', function () { irPara(indice + 1); });
  }

  // Atalho: "/" foca a busca
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'textarea') {
      var alvo = buscaGeral || buscaT;
      if (alvo) { e.preventDefault(); alvo.focus(); }
    }
    if (e.key === 'Escape' && menu) menu.classList.remove('aberto');
  });
})();
