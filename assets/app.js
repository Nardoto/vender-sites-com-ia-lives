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
    if (!t) { el.textContent = original; return 0; }
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

  // Capítulos: os links continuam sendo âncoras legíveis sem JavaScript.
  var capitulos = $$('[data-capitulo]');
  var seletor = $('#selecionar-capitulo');
  var capituloAtual;
  function destinoDoHash(hash) {
    var id;
    try { id = decodeURIComponent((hash || '').replace(/^#/, '')); } catch (e) { return null; }
    var alvo = document.getElementById(id);
    return alvo && alvo.closest('[data-capitulo]');
  }
  function mostrarCapitulo(capitulo, rolar, focar) {
    if (!capitulo) return;
    capituloAtual = capitulo;
    capitulos.forEach(function (c) {
      c.hidden = c !== capitulo;
      c.classList.toggle('capitulo-ativo', c === capitulo);
    });
    if (seletor) seletor.value = capitulo.id;
    var progresso = $('#progresso-capitulo');
    if (progresso) progresso.textContent = 'Capítulo ' + (capitulos.indexOf(capitulo) + 1) + ' de ' + capitulos.length;
    if (menu) $$('a[href^="#"]', menu).forEach(function (a) {
      var ativo = destinoDoHash(a.hash) === capitulo;
      a.classList.toggle('atual', ativo);
      if (ativo) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    });
    if (focar) capitulo.focus({ preventScroll: true });
    if (rolar) {
      var topo = $('.conteudo').getBoundingClientRect().top + window.scrollY - $('.topo').offsetHeight;
      window.scrollTo({ top: Math.max(0, topo), behavior: 'instant' });
    }
    aoRolar();
  }
  function navegarCapitulo(hash, focar) {
    var destino = destinoDoHash(hash);
    if (!destino) return;
    if (location.hash !== hash) history.pushState(null, '', hash);
    mostrarCapitulo(destino, true, focar);
    rolarAteAlvoInterno(hash, destino);
  }
  // Quando o link aponta para um trecho dentro do capítulo (ex.: um tema), rola até ele.
  function rolarAteAlvoInterno(hash, capitulo) {
    var id;
    try { id = decodeURIComponent((hash || '').replace(/^#/, '')); } catch (e) { return; }
    var alvo = id && document.getElementById(id);
    if (alvo && capitulo && alvo !== capitulo && capitulo.contains(alvo) && alvo.offsetParent !== null) {
      alvo.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  if (capitulos.length) {
    document.documentElement.classList.add('com-capitulos');
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    mostrarCapitulo(destinoDoHash(location.hash) || capitulos[0], false, false);
    document.addEventListener('click', function (e) {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.target === '_blank' || !destinoDoHash(a.hash)) return;
      e.preventDefault();
      navegarCapitulo(a.hash, true);
    });
    if (seletor) seletor.addEventListener('change', function () { navegarCapitulo('#' + seletor.value, true); });
    function restaurarCapitulo() {
      var destino = destinoDoHash(location.hash) || capitulos[0];
      mostrarCapitulo(destino, true, false);
      rolarAteAlvoInterno(location.hash, destino);
    }
    window.addEventListener('popstate', restaurarCapitulo);
    window.addEventListener('hashchange', restaurarCapitulo);
    // Aguarda a restauração nativa de âncoras ao abrir um link direto.
    window.addEventListener('load', restaurarCapitulo);
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
  var chips = $$('.chip:not(.chip-tema)');
  var momentoAtual = 'todos';
  function aplicarFiltro() {
    var termo = buscaGeral ? buscaGeral.value.trim() : '';
    if (termo.length < 2) termo = '';
    var dicasVisiveis = 0, duvidasVisiveis = 0;
    $$('.filtravel').forEach(function (el) {
      var alvos = $$('.hl', el);
      var achou = 0;
      alvos.forEach(function (a) { achou += destacar(a, termo); });
      var passaMomento = !el.classList.contains('dica') || momentoAtual === 'todos' || el.getAttribute('data-momento') === momentoAtual;
      var passaBusca = !termo || achou > 0;
      var mostrar = passaMomento && passaBusca;
      el.classList.toggle('oculto', !mostrar);
      if (termo && el.tagName === 'DETAILS') el.open = mostrar;
      if (mostrar && el.classList.contains('dica')) dicasVisiveis++;
      if (mostrar && el.classList.contains('duvida')) duvidasVisiveis++;
    });
    $$('.grupo-dicas').forEach(function (g) {
      var algum = $$('.dica', g).some(function (d) { return !d.classList.contains('oculto'); });
      g.classList.toggle('oculto', !algum);
    });
    var resultadoDicas = $('#resultados-dicas'), resultadoDuvidas = $('#resultados-duvidas');
    var plural = function (n, s, p) { return n + ' ' + (n === 1 ? s : p); };
    if (resultadoDicas) {
      resultadoDicas.textContent = termo ? plural(dicasVisiveis, 'resultado em Dicas', 'resultados em Dicas') : '';
      resultadoDicas.hidden = !termo;
    }
    if (resultadoDuvidas) {
      resultadoDuvidas.textContent = termo ? plural(duvidasVisiveis, 'resultado em Dúvidas', 'resultados em Dúvidas') : '';
      resultadoDuvidas.hidden = !termo;
    }
    var cont = $('#contagem-dicas');
    if (cont) cont.textContent = dicasVisiveis ? dicasVisiveis + ' dicas encontradas' : 'Nenhuma dica encontrada. Tente outro termo ou escolha outro momento.';
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
      if (capituloAtual && capituloAtual.id !== 'dicas' && capituloAtual.id !== 'duvidas') navegarCapitulo('#dicas', false);
      clearTimeout(espera);
      espera = setTimeout(aplicarFiltro, 120);
    });
    aplicarFiltro();
  }

  // Abrir e fechar dúvidas
  var abrirD = $('#abrir-duvidas'), fecharD = $('#fechar-duvidas');
  if (abrirD) abrirD.addEventListener('click', function () { $$('.duvida').forEach(function (d) { d.open = true; }); });
  if (fecharD) fecharD.addEventListener('click', function () { $$('.duvida').forEach(function (d) { d.open = false; }); });
  var duvidasAbertas;
  window.addEventListener('beforeprint', function () {
    duvidasAbertas = $$('.duvida').map(function (d) { var aberto = d.open; d.open = true; return aberto; });
  });
  window.addEventListener('afterprint', function () {
    if (duvidasAbertas) $$('.duvida').forEach(function (d, i) { d.open = duvidasAbertas[i]; });
  });

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
      var alvo = capituloAtual && capituloAtual.id === 'transcricao' ? buscaT : buscaGeral;
      if (alvo) { e.preventDefault(); alvo.focus(); }
    }
    if (e.key === 'Escape' && menu && abrirMenu) {
      var estavaAberto = menu.classList.contains('aberto');
      menu.classList.remove('aberto');
      abrirMenu.setAttribute('aria-expanded', 'false');
      if (estavaAberto) abrirMenu.focus();
    }
  });
})();
