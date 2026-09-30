# Lives: Vibe Coding, do R$0 ao R$1.621 vendendo sites com IA

Site com a jornada, as dicas, as dúvidas da galera e as transcrições disponíveis das lives da série do canal Junior Lima | MK Digital.

Site: https://vender-sites-com-ia-lives.vercel.app

O conteúdo é aberto. Se você assistiu a uma live que ainda não está aqui, ou achou uma dica que faltou, contribua.

O site contém 18 gravações: dias 1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13, 14/15, 16, 17, 18, 19, 20 e 21. O dia 21 está integrado somente com metadados reais e vídeo, com o aviso “Resumo e transcrição ainda não disponíveis”. Não há SRT previsto para esse dia nesta rodada.

## Como o site é montado

Cada live com transcrição tem dois arquivos:

| Arquivo | O que é |
|---|---|
| `srt/dia-XX.srt` | A legenda da live, com horários |
| `conteudo/dia-XX.json` | Resumo, dicas, scripts, dúvidas, ferramentas e frases da live |

Uma entrada com `fonte_limitada: true` dispensa SRT e gera somente a página de metadados e vídeo com o aviso humano de indisponibilidade. Não gera transcrição TXT, timeline, tarefas nem links para conteúdo ausente. As listas editoriais devem estar vazias. Os detalhes internos de `aviso_fonte` nunca são renderizados.

Na página inicial, cada live vira um capítulo próprio, com o `nome` curto do `dia-XX.json`. Uma live nova entra no índice, na busca, no placar e na navegação anterior/próximo sozinha. A página inicial usa também `conteudo/jornada.json` (introdução e marcos do placar), `conteudo/duvidas.json` (principais dúvidas) e `conteudo/guia-iniciante.json` (guia didático).

Os dias 14 e 15 são **uma gravação**, em `dia-14.json` e `dia-14.srt`: `dia: 14`, `dias: [14, 15]`, `rotulo: "Dias 14 e 15"`. Não criar `dia-15.json`, outra página, outro vídeo ou outro registro de faturamento. Os dias 7 e 9 não têm gravações disponíveis nesta coleção; não preencher essas lacunas artificialmente.

O faturamento é o **acumulado informado** em cada live. O MRR é o valor mensal informado. O placar usa o último registro disponível de cada indicador, identifica a live de origem e nunca soma snapshots entre lives. A quantidade de lives conta gravações, portanto 14/15 conta uma vez. O percentual da meta pode superar 100%; a barra visual fica limitada ao espaço disponível.

O script `gerar.js` junta tudo e cria as páginas HTML. Você não precisa editar HTML.

## Guia para começar e prática

O capítulo visível **Comece por aqui** usa `#guia-iniciante`. Sua linha do tempo é uma ordem sugerida para praticar, separada da cronologia real das lives. A versão editorial final tem 12 passos, 70 itens de checklist, 157 referências às lives e 9 links de referências atuais. Os links de `referenciasAtuais: [{titulo, url}]` aparecem no passo correspondente, separados dos trechos das lives.

Formato de `conteudo/guia-iniciante.json`:

```json
{
  "titulo": "Texto",
  "introducao": "Texto",
  "passos": [{
    "id": "identificador-unico",
    "titulo": "Texto",
    "objetivo": "Texto",
    "prerequisitos": [],
    "comoFazer": ["Ação"],
    "resultadoEsperado": "Texto",
    "checklist": ["Critério verificável"],
    "fontes": [{"dia": 1, "tempo": "00:10:32", "assunto": "Assunto verificado"}],
    "referenciasAtuais": [{"titulo": "Documentação oficial", "url": "https://vercel.com/docs/plans/hobby"}]
  }],
  "glossario": [{"termo": "Termo", "definicao": "Texto"}]
}
```

Cada passo abre diretamente por `#guia-identificador-unico`. Referências a 14 **ou** 15 resolvem para o mesmo vídeo e para a página `dia-14.html`. Os itens do checklist têm controles nativos acessíveis, funcionam pelo teclado e guardam as marcações somente no `localStorage` deste navegador. Se o armazenamento estiver bloqueado, continuam funcionando na página e o aviso explica a limitação. A impressão mostra o guia completo, com as caixas de seleção.

As novas lives aceitam `como_praticar: [{titulo, passos: [], resultado, fonte_t}]`. Esse campo cria o capítulo `#como-praticar`, exercícios com links para o trecho do vídeo e um acesso direto no capítulo do dia na inicial. Os textos devem vir da entrega editorial, sem completar instruções ou horários por suposição.

As gravações 13, 14/15, 16, 17, 18, 19 e 20 têm resumos e SRT reais. O Dia 21 usa a exceção de fonte limitada. Para atualizar o conteúdo, altere os JSON e os SRT disponíveis e rode o gerador.

## Como contribuir

1. Faça um fork deste repositório.
2. Para uma live nova, coloque a legenda em `srt/dia-XX.srt`, com o número do dia em dois dígitos.
3. Copie `conteudo/_modelo.json` para `conteudo/dia-XX.json` e preencha.
4. Rode o gerador para conferir:

```
node gerar.js
```

5. Abra `index.html` no navegador e confira a página.
6. Envie um pull request.

Os arquivos HTML e TXT gerados não vão para o repositório. A Vercel roda o gerador sozinha a cada atualização.

Todo pull request passa por uma checagem automática. Ela roda o gerador e confere se a transcrição inteira entrou na página.

## Regras do conteúdo

- Só entra o que foi dito na live. Nada de dica inventada.
- Todo item com horário usa o formato `HH:MM:SS` do momento em que aparece na live. O horário vira um link para o vídeo naquele ponto.
- `momento` aceita: mentalidade, prospeccao, analise, criacao, whatsapp, preco, fechamento, erros.
- `tipo` do script aceita: whatsapp, prompt.
- Texto curto e direto, em português, sem emojis.
- A transcrição fica como veio da legenda. Não corrija o SRT.
- `t: null` em conteúdo antigo significa que não há horário verificado e não gera link. O guia e os exercícios exigem horários preenchidos, dentro da duração da live.
- O gerador valida tipos, campos, slugs, dias, vídeos duplicados, referências e limites dos horários antes de escrever páginas. Há tolerância de até 3 segundos **somente no encerramento do SRT**, registrada como aviso, devido ao arredondamento das legendas. Não há essa tolerância para horários editoriais.

## Rodar localmente

Precisa do Node.js 18 ou mais novo. Não há dependências para instalar.

```
node gerar.js
```

Depois abra `index.html` no navegador.

A geração valida o conteúdo e confere se cada bloco do SRT entrou integralmente no HTML. O fluxo automático do repositório também valida os JSON e a sintaxe de `assets/app.js`.

## Créditos

O conteúdo vem das lives públicas de Junior Lima | MK Digital no YouTube. Este site é um resumo feito pela comunidade para estudo. Assista às lives originais no canal dele.
