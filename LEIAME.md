# Site das lives "Vibe Coding: Do R$0 ao R$1.621"

Site estático: uma página inicial e uma página por live, com resumo, linha do tempo, dicas, scripts, dúvidas da galera, ferramentas, frases e a transcrição completa.

## O que tem na pasta

| Arquivo | Para que serve |
|---|---|
| `index.html` | Página inicial com um card por live |
| `dia-XX.html` | Página de cada live |
| `dia-XX-transcricao.txt` | Transcrição em texto puro, para baixar |
| `assets/style.css` e `assets/app.js` | Visual e interações, compartilhados por todas as páginas |
| `conteudo/dia-XX.json` | Conteúdo de cada live: dicas, dúvidas, scripts etc. |
| `gerar.js` | Monta as páginas a partir dos JSON e dos SRT |

Os arquivos HTML e TXT são gerados. Para mudar o texto de uma dica, edite o JSON e rode o gerador de novo.

## Como adicionar uma live nova

1. Salve o SRT da live na pasta `srt` do projeto.
2. Crie `conteudo/dia-XX.json` no mesmo formato dos outros. O campo `srt` aponta para o arquivo, relativo a esta pasta, por exemplo `../../srt/dia 7.srt`.
3. Rode:

```
node gerar.js
```

O gerador confere se todos os blocos do SRT entraram na página e avisa se algo faltar.

## Formato do JSON

```json
{
  "dia": 7,
  "slug": "dia-07",
  "srt": "../../srt/dia 7.srt",
  "titulo": "Dia 7 | ...",
  "data": "2026-09-09",
  "duracao": "2:45:55",
  "youtube": "https://www.youtube.com/watch?v=...",
  "faturamento": "R$ 994",
  "mrr": "R$ 99,80",
  "resumo": "...",
  "destaques": ["...", "...", "..."],
  "linha_do_tempo": [{ "t": "00:12:30", "texto": "..." }],
  "dicas": [{ "momento": "prospeccao", "t": "00:12:30", "titulo": "...", "texto": "..." }],
  "scripts": [{ "tipo": "whatsapp", "t": "00:40:00", "titulo": "...", "texto": "..." }],
  "duvidas": [{ "autor": "...", "pergunta": "...", "resposta": "...", "t": "01:02:00" }],
  "ferramentas": [{ "nome": "...", "uso": "..." }],
  "frases": [{ "t": "00:05:00", "texto": "..." }]
}
```

Valores aceitos em `momento`: mentalidade, prospeccao, analise, criacao, whatsapp, preco, fechamento, erros.
Valores aceitos em `tipo`: whatsapp, prompt.

## Publicar

A pasta inteira é o site. Para publicar na Vercel, suba esta pasta como projeto sem configuração de build. Qualquer hospedagem de arquivos estáticos serve. O site também abre direto pelo duplo clique no `index.html`.

A pasta `conteudo` e o `gerar.js` não precisam ir para a hospedagem, mas não atrapalham se forem.
