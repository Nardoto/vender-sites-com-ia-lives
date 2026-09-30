'use strict';
// Valida as entradas antes de gerar qualquer página. Somente módulos nativos.
const fs = require('node:fs');
const path = require('node:path');

function segundos(tempo) {
  if (typeof tempo !== 'string' || !/^\d{1,2}:[0-5]\d:[0-5]\d(?:[,.]\d{1,3})?$/.test(tempo)) return NaN;
  return tempo.replace(',', '.').split(':').reduce((s, n) => s * 60 + Number(n), 0);
}

function validarConteudo(lives, guia, raiz, duvidas) {
  const erros = [], avisos = [], porDia = new Map(), videos = new Set(), slugs = new Set();
  const exigir = (ok, mensagem) => { if (!ok) erros.push(mensagem); };
  const texto = (s) => typeof s === 'string' && s.trim().length > 0;
  const listaTextos = (v) => Array.isArray(v) && v.every(texto);
  function horario(t, c, contexto) {
    exigir(Number.isFinite(segundos(t)) && segundos(t) <= segundos(c.duracao), `${contexto}: horário inválido ou além da duração (${t}).`);
  }
  function horarios(objeto, c, contexto) {
    if (!objeto || typeof objeto !== 'object') return;
    for (const [chave, valor] of Object.entries(objeto)) {
      if (chave === 'fonte_t' || (chave === 't' && valor != null && valor !== '')) horario(valor, c, `${contexto}.${chave}`);
      else if (valor && typeof valor === 'object') horarios(valor, c, `${contexto}.${chave}`);
    }
  }
  for (const c of lives) {
    const contexto = `Dia ${c.dia}`;
    exigir(Number.isInteger(c.dia) && c.dia > 0, `${contexto}: número inválido.`);
    const slug = `dia-${String(c.dia).padStart(2, '0')}`;
    exigir(c.slug === slug, `${contexto}: slug deve ser ${slug}.`);
    exigir(!slugs.has(c.slug), `${contexto}: slug duplicado.`);
    slugs.add(c.slug);
    const dias = c.dias || [c.dia];
    exigir(Array.isArray(dias) && dias.length > 0 && dias[0] === c.dia && dias.every(Number.isInteger), `${contexto}: dias deve ser uma lista de inteiros iniciada pelo dia principal.`);
    if (Array.isArray(dias)) for (const d of dias) {
      exigir(!porDia.has(d), `Dia ${d}: aparece em mais de uma gravação.`);
      porDia.set(d, c);
    }
    if (c.dia === 14 || (Array.isArray(dias) && dias.includes(15))) {
      exigir(c.dia === 14 && JSON.stringify(dias) === '[14,15]' && c.rotulo === 'Dias 14 e 15', 'Dias 14 e 15: use uma única gravação em dia-14, dias: [14,15] e rotulo: "Dias 14 e 15".');
    }
    exigir(c.fonte_limitada == null || typeof c.fonte_limitada === 'boolean', `${contexto}: fonte_limitada deve ser booleano.`);
    for (const campo of ['titulo', 'nome', 'youtube', 'data', 'duracao', ...(c.fonte_limitada === true ? [] : ['resumo', 'srt'])]) exigir(texto(c[campo]), `${contexto}: ${campo} deve ser texto preenchido.`);
    exigir(Number.isFinite(segundos(c.duracao)), `${contexto}: duração inválida.`);
    for (const campo of ['faturamento', 'mrr']) exigir(c[campo] == null || typeof c[campo] === 'string', `${contexto}: ${campo} deve ser texto ou null.`);
    let idVideo;
    try {
      const url = new URL(c.youtube);
      exigir(url.protocol === 'https:' && ['www.youtube.com', 'youtube.com', 'youtu.be'].includes(url.hostname), `${contexto}: URL do YouTube inválida.`);
      idVideo = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v');
      exigir(/^[\w-]{11}$/.test(idVideo || ''), `${contexto}: ID de vídeo inválido.`);
    } catch { erros.push(`${contexto}: URL de vídeo inválida.`); }
    exigir(!videos.has(idVideo), `${contexto}: vídeo duplicado (${idVideo}).`);
    videos.add(idVideo);
    const campos = {
      linha_do_tempo: ['t', 'texto'], dicas: ['t', 'titulo', 'texto', 'momento'],
      scripts: ['t', 'tipo', 'titulo', 'texto'], duvidas: ['t', 'pergunta', 'resposta'],
      ferramentas: ['nome', 'uso'], frases: ['t', 'texto'],
    };
    exigir(listaTextos(c.destaques || []), `${contexto}: destaques deve ser uma lista de textos.`);
    for (const [campo, obrigatorios] of Object.entries(campos)) {
      exigir(Array.isArray(c[campo] || []), `${contexto}: ${campo} deve ser uma lista.`);
      if (Array.isArray(c[campo])) c[campo].forEach((item, i) => {
        exigir(item && typeof item === 'object' && obrigatorios.every((chave) => chave === 't' ? item[chave] == null || texto(item[chave]) : texto(item[chave])), `${contexto}.${campo}[${i}]: campos obrigatórios ausentes ou de tipo incorreto.`);
      });
    }
    exigir(Array.isArray(c.como_praticar || []), `${contexto}: como_praticar deve ser uma lista.`);
    if (Array.isArray(c.como_praticar)) c.como_praticar.forEach((p, i) => {
      exigir(p && texto(p.titulo) && listaTextos(p.passos) && p.passos.length > 0 && texto(p.resultado) && texto(p.fonte_t), `${contexto}.como_praticar[${i}]: estrutura inválida.`);
    });
    horarios(c, c, contexto);
    if (c.fonte_limitada === true) {
      for (const campo of ['destaques', ...Object.keys(campos), 'como_praticar']) exigir(c[campo] == null || (Array.isArray(c[campo]) && c[campo].length === 0), `${contexto}: fonte limitada não admite conteúdo em ${campo}.`);
      continue;
    }
    if (typeof c.srt !== 'string') continue;
    const arquivo = path.resolve(raiz, c.srt), relativo = path.relative(path.join(raiz, 'srt'), arquivo);
    if (relativo.startsWith('..') || path.isAbsolute(relativo) || path.extname(arquivo) !== '.srt') {
      erros.push(`${contexto}: SRT deve ficar dentro de srt/.`); continue;
    }
    if (!fs.existsSync(arquivo)) { erros.push(`${contexto}: SRT ausente.`); continue; }
    const bruto = fs.readFileSync(arquivo, 'utf8');
    const intervalos = [...bruto.matchAll(/(\d{2}:\d{2}:\d{2}[,.]\d+)\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d+)/g)];
    exigir(intervalos.length > 0 && intervalos.length === (bruto.match(/-->/g) || []).length, `${contexto}: SRT vazio ou horários malformados.`);
    let anterior = -1, maiorFim = 0;
    for (const [, inicio, fim] of intervalos) {
      const a = segundos(inicio), b = segundos(fim);
      if (!(Number.isFinite(a) && Number.isFinite(b) && a >= anterior && b >= a)) {
        erros.push(`${contexto}: intervalo SRT inválido ${inicio} --> ${fim}.`); break;
      }
      anterior = a; maiorFim = Math.max(maiorFim, b);
    }
    const excesso = maiorFim - segundos(c.duracao);
    // As legendas antigas arredondam o encerramento em até três segundos.
    if (excesso > 0 && excesso <= 3) avisos.push(`${contexto}: SRT termina ${excesso.toFixed(3)} s após a duração declarada (tolerância de 3 s para legenda).`);
    exigir(excesso <= 3, `${contexto}: SRT excede a duração em ${excesso.toFixed(3)} s.`);
  }
  function fonte(f, contexto, campoTempo) {
    const c = porDia.get(f && f.dia);
    exigir(!!c, `${contexto}: dia ${f && f.dia} não disponível.`);
    if (c && f[campoTempo] != null) horario(f[campoTempo], c, contexto);
  }
  if (guia) {
    exigir(texto(guia.titulo) && texto(guia.introducao), 'Guia: título e introdução são obrigatórios.');
    exigir(Array.isArray(guia.passos) && guia.passos.length > 0, 'Guia: passos deve ser uma lista não vazia.');
    const ids = new Set();
    if (Array.isArray(guia.passos)) guia.passos.forEach((p, i) => {
      const contexto = `Guia, passo ${i + 1}`;
      if (!p || typeof p !== 'object') { erros.push(`${contexto}: objeto inválido.`); return; }
      exigir(typeof p.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id) && p.id !== 'glossario' && !ids.has(p.id), `${contexto}: id inválido ou duplicado.`);
      ids.add(p.id);
      for (const campo of ['titulo', 'objetivo', 'resultadoEsperado']) exigir(texto(p[campo]), `${contexto}: ${campo} deve ser texto preenchido.`);
      for (const campo of ['prerequisitos', 'comoFazer', 'checklist']) exigir(listaTextos(p[campo]), `${contexto}: ${campo} deve ser uma lista de textos.`);
      exigir(p.comoFazer?.length > 0 && p.checklist?.length > 0, `${contexto}: comoFazer e checklist não podem ser vazios.`);
      exigir(Array.isArray(p.fontes) && p.fontes.length > 0, `${contexto}: fontes obrigatórias.`);
      if (Array.isArray(p.fontes)) p.fontes.forEach((f) => {
        exigir(f && Number.isInteger(f.dia) && texto(f.tempo) && texto(f.assunto), `${contexto}: fonte deve ter dia inteiro, tempo e assunto.`);
        fonte(f, contexto, 'tempo');
      });
      exigir(p.referenciasAtuais == null || Array.isArray(p.referenciasAtuais), `${contexto}: referenciasAtuais deve ser uma lista.`);
      if (Array.isArray(p.referenciasAtuais)) p.referenciasAtuais.forEach((r) => {
        let urlValida = false;
        try { const url = new URL(r?.url); urlValida = url.protocol === 'https:' && !url.username && !url.password; } catch {}
        exigir(r && texto(r.titulo) && urlValida, `${contexto}: referência atual deve ter título e URL HTTPS válida.`);
      });
    });
    exigir(Array.isArray(guia.glossario), 'Guia: glossario deve ser uma lista.');
    if (Array.isArray(guia.glossario)) guia.glossario.forEach((g) => exigir(g && texto(g.termo) && texto(g.definicao), 'Guia: verbete inválido no glossário.'));
  } else avisos.push('Guia: entrega editorial ainda ausente; capítulo exibirá a pendência.');
  for (const tema of duvidas?.temas || []) for (const pergunta of tema.perguntas || []) for (const f of pergunta.fontes || []) fonte(f, 'Principais dúvidas', 't');
  return { erros, avisos };
}

module.exports = { validarConteudo, segundos };
