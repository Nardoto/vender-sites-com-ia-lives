#!/usr/bin/env node
// Gera o site das lives a partir de conteudo/*.json + SRT de cada live.
// Uso: node gerar.js   (rode dentro desta pasta ou de qualquer lugar)
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const PASTA_CONTEUDO = path.join(RAIZ, 'conteudo');
const SERIE = 'Vibe Coding: Do R$0 ao R$1.621 Vendendo Sites com IA';
const CANAL = 'Junior Lima | MK Digital';

const MOMENTOS = [
  { id: 'mentalidade', nome: 'Mentalidade e rotina' },
  { id: 'prospeccao', nome: 'Prospecção' },
  { id: 'analise', nome: 'Análise do cliente' },
  { id: 'criacao', nome: 'Criação do site com IA' },
  { id: 'whatsapp', nome: 'Abordagem no WhatsApp' },
  { id: 'preco', nome: 'Preço e negociação' },
  { id: 'fechamento', nome: 'Fechamento e entrega' },
  { id: 'erros', nome: 'Erros e aprendizados' },
];
const NOME_MOMENTO = Object.fromEntries(MOMENTOS.map((m) => [m.id, m.nome]));

// ---------- utilidades ----------
const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function paraSegundos(t) {
  if (typeof t === 'number') return Math.floor(t);
  const p = String(t || '0').trim().replace(',', '.').split(':').map(Number);
  let s = 0;
  for (const n of p) s = s * 60 + (isNaN(n) ? 0 : n);
  return Math.floor(s);
}

function formatarTempo(seg) {
  seg = Math.max(0, Math.floor(seg));
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  const d2 = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${d2(m)}:${d2(s)}` : `${d2(m)}:${d2(s)}`;
}

function linkTempo(youtube, t) {
  const seg = paraSegundos(t);
  if (!youtube) return '#';
  return `${youtube}${youtube.includes('?') ? '&' : '?'}t=${seg}s`;
}

function tagTempo(youtube, t) {
  if (t == null || t === '') return '';
  const seg = paraSegundos(t);
  return `<a class="ts" href="${esc(linkTempo(youtube, seg))}" target="_blank" rel="noopener" aria-label="Assistir a partir de ${formatarTempo(seg)}">${formatarTempo(seg)}</a>`;
}

function dataBR(iso) {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : esc(iso || '');
}

// ---------- SRT ----------
function lerSRT(arquivo) {
  const bruto = fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const blocos = bruto.split(/\n\s*\n/);
  const segs = [];
  for (const b of blocos) {
    const linhas = b.split('\n').map((l) => l.trim()).filter((l) => l !== '');
    const iTempo = linhas.findIndex((l) => l.includes('-->'));
    if (iTempo < 0) continue;
    const [ini, fim] = linhas[iTempo].split('-->').map((x) => x.trim());
    const texto = linhas.slice(iTempo + 1).join(' ').replace(/\s+/g, ' ').trim();
    if (!texto) continue;
    segs.push({ ini: paraSegundosMs(ini), fim: paraSegundosMs(fim), texto });
  }
  return segs;
}

function paraSegundosMs(t) {
  const m = /(\d+):(\d+):(\d+)[,.](\d+)/.exec(t);
  if (!m) return paraSegundos(t);
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
}

// Agrupa blocos em parágrafos de leitura (~45 s ou pausa longa), sem perder nenhum bloco.
function agruparParagrafos(segs) {
  const pars = [];
  let atual = null;
  for (const s of segs) {
    const novo =
      !atual ||
      s.ini - atual.ini >= 45 ||
      s.ini - atual.ultimoFim > 6;
    if (novo) {
      atual = { ini: s.ini, ultimoFim: s.fim, segs: [] };
      pars.push(atual);
    }
    atual.segs.push(s);
    atual.ultimoFim = s.fim;
  }
  return pars;
}

// ---------- blocos de página ----------
function cabecalho(titulo, descricao, prefixoAssets) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="${prefixoAssets}assets/style.css">
<script>try{if(localStorage.getItem('tema')==='claro')document.documentElement.classList.add('claro')}catch(e){}</script>
</head>`;
}

function barraTopo(voltar) {
  return `<div class="progresso" aria-hidden="true"><span id="barra-progresso"></span></div>
<header class="topo">
  <button class="btn-icone so-mobile" id="abrir-menu" aria-label="Abrir menu de seções" aria-expanded="false" aria-controls="menu-lateral">Menu</button>
  <a class="marca" href="${voltar}">Lives <strong>Vender Sites com IA</strong></a>
  <button class="btn-icone" id="alternar-tema" aria-label="Alternar tema claro e escuro">Tema</button>
</header>`;
}

function rodapeScripts(prefixo) {
  return `<button class="topo-btn" id="voltar-topo" aria-label="Voltar ao topo">Topo</button>
<script src="${prefixo}assets/app.js"></script>
</body>
</html>
`;
}

function paginaLive(c, segs, anterior, proxima) {
  const yt = c.youtube;
  const titulo = `Dia ${c.dia}: dicas, dúvidas e transcrição da live | ${SERIE}`;
  const descricao = c.resumo ? c.resumo.slice(0, 180) : `Resumo da live Dia ${c.dia}`;
  const pars = agruparParagrafos(segs);

  const dicasPorMomento = MOMENTOS.map((m) => ({
    ...m,
    itens: (c.dicas || []).filter((d) => d.momento === m.id),
  })).filter((m) => m.itens.length);
  const outrasDicas = (c.dicas || []).filter((d) => !NOME_MOMENTO[d.momento]);
  if (outrasDicas.length) dicasPorMomento.push({ id: 'outros', nome: 'Outras dicas', itens: outrasDicas });

  const secoes = [
    ['resumo', 'Resumo'],
    ['linha-do-tempo', 'Linha do tempo'],
    ['dicas', `Dicas (${(c.dicas || []).length})`],
    ...((c.scripts || []).length ? [['scripts', `Scripts e prompts (${c.scripts.length})`]] : []),
    ['duvidas', `Dúvidas da galera (${(c.duvidas || []).length})`],
    ['ferramentas', 'Ferramentas'],
    ['frases', 'Frases marcantes'],
    ['transcricao', 'Transcrição completa'],
  ];

  const nomeTxt = `${c.slug}-transcricao.txt`;

  return `${cabecalho(titulo, descricao, '')}
<body>
${barraTopo('index.html')}
<div class="layout">
<nav class="menu" id="menu-lateral" aria-label="Seções da página">
  <p class="menu-titulo">Dia ${c.dia}</p>
  <ul>
    ${secoes.map(([id, nome]) => `<li><a href="#${id}">${esc(nome)}</a></li>`).join('\n    ')}
  </ul>
  <p class="menu-titulo">Outras lives</p>
  <ul>
    <li><a href="index.html">Todas as lives</a></li>
    ${anterior ? `<li><a href="${anterior.slug}.html">Dia ${anterior.dia}</a></li>` : ''}
    ${proxima ? `<li><a href="${proxima.slug}.html">Dia ${proxima.dia}</a></li>` : ''}
  </ul>
</nav>
<main class="conteudo">

<section class="hero" id="inicio">
  <p class="sobretitulo">${esc(CANAL)} &middot; Live Dia ${c.dia}</p>
  <h1>${esc(c.titulo || `Dia ${c.dia}`)}</h1>
  <div class="fichas">
    <div class="ficha"><span>Data</span><strong>${dataBR(c.data)}</strong></div>
    <div class="ficha"><span>Duração</span><strong>${esc(c.duracao || '')}</strong></div>
    <div class="ficha"><span>Faturamento no dia</span><strong>${esc(c.faturamento || 'Não informado')}</strong></div>
    ${c.mrr ? `<div class="ficha"><span>Receita recorrente</span><strong>${esc(c.mrr)}</strong></div>` : ''}
  </div>
  <div class="acoes">
    ${yt ? `<a class="btn btn-primario" href="${esc(yt)}" target="_blank" rel="noopener">Assistir no YouTube</a>` : ''}
    <a class="btn" href="#dicas">Ir para as dicas</a>
    <a class="btn" href="#transcricao">Ler a transcrição</a>
  </div>
</section>

<section id="resumo" class="secao">
  <h2>Resumo da live</h2>
  <p class="lead">${esc(c.resumo || '')}</p>
  ${(c.destaques || []).length ? `<div class="destaques">${c.destaques.map((d, i) => `<div class="destaque"><span class="num">${i + 1}</span><p>${esc(d)}</p></div>`).join('')}</div>` : ''}
</section>

<section id="linha-do-tempo" class="secao">
  <h2>O que aconteceu na live</h2>
  <ol class="timeline">
    ${(c.linha_do_tempo || []).map((m) => `<li>${tagTempo(yt, m.t)}<p>${esc(m.texto)}</p></li>`).join('\n    ')}
  </ol>
</section>

<section id="dicas" class="secao">
  <h2>Principais dicas</h2>
  <div class="filtros">
    <label class="busca"><span class="sr">Buscar nas dicas e dúvidas</span>
      <input type="search" id="busca-geral" placeholder="Buscar nas dicas e dúvidas (tecla /)" autocomplete="off">
    </label>
    <div class="chips" role="group" aria-label="Filtrar dicas por momento">
      <button class="chip ativo" data-momento="todos" aria-pressed="true">Todas</button>
      ${dicasPorMomento.map((m) => `<button class="chip m-${m.id}" data-momento="${m.id}" aria-pressed="false">${esc(m.nome)} <span>${m.itens.length}</span></button>`).join('\n      ')}
    </div>
    <p class="contagem" id="contagem-busca" aria-live="polite"></p>
  </div>
  ${dicasPorMomento.map((m) => `<div class="grupo-dicas" data-grupo="${m.id}">
    <h3 class="m-${m.id}">${esc(m.nome)}</h3>
    <div class="grade">
      ${m.itens.map((d) => `<article class="card dica filtravel" data-momento="${m.id}">
        <div class="card-topo"><span class="tag m-${m.id}">${esc(NOME_MOMENTO[m.id] || m.nome)}</span>${tagTempo(yt, d.t)}</div>
        <h4 class="hl">${esc(d.titulo)}</h4>
        <p class="hl">${esc(d.texto)}</p>
      </article>`).join('\n      ')}
    </div>
  </div>`).join('\n  ')}
</section>

${(c.scripts || []).length ? `<section id="scripts" class="secao">
  <h2>Scripts de WhatsApp e prompts</h2>
  <p class="nota">Textos ditados ou digitados na live, quase literais. Use o botão para copiar.</p>
  ${c.scripts.map((s, i) => `<div class="script">
    <div class="card-topo"><span class="tag ${s.tipo === 'prompt' ? 'm-criacao' : 'm-whatsapp'}">${s.tipo === 'prompt' ? 'Prompt' : 'WhatsApp'}</span>${tagTempo(yt, s.t)}</div>
    <h4>${esc(s.titulo)}</h4>
    <blockquote id="script-${i}">${esc(s.texto)}</blockquote>
    <button class="btn btn-copiar" data-copiar="script-${i}" aria-label="Copiar: ${esc(s.titulo)}">Copiar</button>
  </div>`).join('\n  ')}
</section>` : ''}

<section id="duvidas" class="secao">
  <h2>Principais dúvidas da galera</h2>
  <div class="barra-acoes">
    <button class="btn" id="abrir-duvidas">Abrir todas</button>
    <button class="btn" id="fechar-duvidas">Fechar todas</button>
  </div>
  ${(c.duvidas || []).length ? c.duvidas.map((d) => `<details class="duvida filtravel">
    <summary><span class="hl">${esc(d.pergunta)}</span>${d.autor ? `<small>${esc(d.autor)}</small>` : ''}</summary>
    <div class="resposta"><p class="hl">${esc(d.resposta)}</p>${tagTempo(yt, d.t)}</div>
  </details>`).join('\n  ') : '<p class="nota">Nenhuma dúvida do chat foi respondida em voz alta nesta live.</p>'}
</section>

<section id="ferramentas" class="secao">
  <h2>Ferramentas citadas</h2>
  <div class="grade grade-ferramentas">
    ${(c.ferramentas || []).map((f) => `<div class="card ferramenta"><h4>${esc(f.nome)}</h4><p>${esc(f.uso)}</p></div>`).join('\n    ')}
  </div>
</section>

<section id="frases" class="secao">
  <h2>Frases marcantes</h2>
  <div class="frases">
    ${(c.frases || []).map((f) => `<figure class="frase"><blockquote>${esc(f.texto)}</blockquote><figcaption>${tagTempo(yt, f.t)}</figcaption></figure>`).join('\n    ')}
  </div>
</section>

<section id="transcricao" class="secao">
  <h2>Transcrição completa</h2>
  <p class="nota">Registro integral da live, gerado por legenda automática. Pode conter erros de reconhecimento, principalmente em nomes próprios. Clique no horário para abrir o vídeo naquele ponto.</p>
  <div class="barra-transcricao">
    <label class="busca"><span class="sr">Buscar na transcrição</span>
      <input type="search" id="busca-transcricao" placeholder="Buscar na transcrição" autocomplete="off">
    </label>
    <button class="btn" id="anterior-transcricao" aria-label="Ocorrência anterior">Anterior</button>
    <button class="btn" id="proxima-transcricao" aria-label="Próxima ocorrência">Próxima</button>
    <span class="contagem" id="contagem-transcricao" aria-live="polite"></span>
    <a class="btn" href="${nomeTxt}" download>Baixar .txt</a>
  </div>
  <div class="transcricao" id="texto-transcricao" data-blocos="${segs.length}">
    ${pars.map((p) => `<p class="par">${tagTempo(yt, p.ini)} ${p.segs.map((s) => `<span class="seg">${esc(s.texto)}</span>`).join(' ')}</p>`).join('\n    ')}
  </div>
</section>

<nav class="navegacao-lives" aria-label="Navegação entre lives">
  ${anterior ? `<a class="btn" href="${anterior.slug}.html">Live anterior: Dia ${anterior.dia}</a>` : '<span></span>'}
  <a class="btn" href="index.html">Todas as lives</a>
  ${proxima ? `<a class="btn" href="${proxima.slug}.html">Próxima live: Dia ${proxima.dia}</a>` : '<span></span>'}
</nav>

<footer class="rodape">
  <p>Conteúdo organizado a partir das lives de ${esc(CANAL)} no YouTube. Resumos e dicas extraídos da transcrição automática.</p>
</footer>
</main>
</div>
${rodapeScripts('')}`;
}

function paginaIndex(lives) {
  const totalDicas = lives.reduce((a, c) => a + (c.dicas || []).length, 0);
  const totalDuvidas = lives.reduce((a, c) => a + (c.duvidas || []).length, 0);
  const titulo = `Lives: ${SERIE}`;
  const descricao = 'Dicas, dúvidas respondidas e transcrição completa de cada live do desafio de vender sites para empresas locais usando IA.';
  return `${cabecalho(titulo, descricao, '')}
<body class="pagina-index">
${barraTopo('index.html')}
<main class="conteudo conteudo-largo">
<section class="hero hero-index">
  <p class="sobretitulo">${esc(CANAL)}</p>
  <h1>${esc(SERIE)}</h1>
  <p class="lead">Um desafio ao vivo: sair do zero e chegar a um salário mínimo vendendo sites para empresas locais, criados com IA. Aqui estão as principais dicas, as dúvidas que a galera mandou no chat e a transcrição completa de cada live.</p>
  <div class="fichas">
    <div class="ficha"><span>Lives</span><strong>${lives.length}</strong></div>
    <div class="ficha"><span>Dicas</span><strong>${totalDicas}</strong></div>
    <div class="ficha"><span>Dúvidas respondidas</span><strong>${totalDuvidas}</strong></div>
    <div class="ficha"><span>Meta do desafio</span><strong>R$ 1.621</strong></div>
  </div>
</section>
<section class="secao">
  <h2>Escolha uma live</h2>
  <div class="grade grade-lives">
    ${lives.map((c) => `<a class="card card-live" href="${c.slug}.html">
      <div class="card-topo"><span class="tag">Dia ${c.dia}</span><span class="meta">${dataBR(c.data)} &middot; ${esc(c.duracao || '')}</span></div>
      <h3>${esc(c.titulo || `Dia ${c.dia}`)}</h3>
      <p class="meta">Faturamento no dia: <strong>${esc(c.faturamento || 'não informado')}</strong>${c.mrr ? ` &middot; Recorrente: <strong>${esc(c.mrr)}</strong>` : ''}</p>
      <ul>${(c.destaques || []).slice(0, 3).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
      <p class="meta">${(c.dicas || []).length} dicas &middot; ${(c.duvidas || []).length} dúvidas &middot; transcrição completa</p>
      <span class="ver">Abrir live</span>
    </a>`).join('\n    ')}
  </div>
</section>
<footer class="rodape">
  <p>Conteúdo organizado a partir das lives de ${esc(CANAL)} no YouTube.</p>
</footer>
</main>
${rodapeScripts('')}`;
}

// ---------- execução ----------
function main() {
  if (!fs.existsSync(PASTA_CONTEUDO)) {
    console.error('Pasta conteudo/ não encontrada.');
    process.exit(1);
  }
  const lives = fs
    .readdirSync(PASTA_CONTEUDO)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const c = JSON.parse(fs.readFileSync(path.join(PASTA_CONTEUDO, f), 'utf8'));
      c.slug = c.slug || `dia-${String(c.dia).padStart(2, '0')}`;
      return c;
    })
    .sort((a, b) => a.dia - b.dia);

  let falhou = false;
  lives.forEach((c, i) => {
    const arqSrt = path.resolve(RAIZ, c.srt);
    if (!fs.existsSync(arqSrt)) {
      console.error(`[Dia ${c.dia}] SRT não encontrado: ${arqSrt}`);
      falhou = true;
      return;
    }
    const segs = lerSRT(arqSrt);
    const html = paginaLive(c, segs, lives[i - 1], lives[i + 1]);
    fs.writeFileSync(path.join(RAIZ, `${c.slug}.html`), html, 'utf8');

    const txt = segs.map((s) => `[${formatarTempo(s.ini)}] ${s.texto}`).join('\n');
    fs.writeFileSync(
      path.join(RAIZ, `${c.slug}-transcricao.txt`),
      `${c.titulo || 'Dia ' + c.dia}\n${c.youtube || ''}\n\n${txt}\n`,
      'utf8'
    );

    // Checagem de integridade: todo bloco do SRT precisa estar na página.
    const noHtml = (html.match(/<span class="seg">/g) || []).length;
    const textoSrt = segs.map((s) => esc(s.texto)).join(' ');
    const textoHtml = [...html.matchAll(/<span class="seg">([\s\S]*?)<\/span>/g)].map((m) => m[1]).join(' ');
    const ok = noHtml === segs.length && textoHtml === textoSrt;
    if (!ok) falhou = true;
    console.log(
      `[Dia ${c.dia}] ${c.slug}.html | blocos SRT ${segs.length} / no HTML ${noHtml} | texto idêntico: ${textoHtml === textoSrt ? 'sim' : 'NÃO'} | dicas ${(c.dicas || []).length}, dúvidas ${(c.duvidas || []).length}, scripts ${(c.scripts || []).length}`
    );
  });

  fs.writeFileSync(path.join(RAIZ, 'index.html'), paginaIndex(lives), 'utf8');
  console.log(`index.html com ${lives.length} lives.`);
  if (falhou) {
    console.error('ATENÇÃO: alguma checagem falhou.');
    process.exit(2);
  }
}

main();
