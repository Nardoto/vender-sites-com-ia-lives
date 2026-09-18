# Lives: Vibe Coding, do R$0 ao R$1.621 vendendo sites com IA

Site com a jornada completa, as dicas, as dúvidas da galera e a transcrição integral de cada live da série do canal Junior Lima | MK Digital.

Site: https://vender-sites-com-ia-lives.vercel.app

O conteúdo é aberto. Se você assistiu a uma live que ainda não está aqui, ou achou uma dica que faltou, contribua.

## Como o site é montado

Cada live tem dois arquivos:

| Arquivo | O que é |
|---|---|
| `srt/dia-XX.srt` | A legenda da live, com horários |
| `conteudo/dia-XX.json` | Resumo, dicas, scripts, dúvidas, ferramentas e frases da live |

A página inicial usa também `conteudo/jornada.json`, com as etapas do processo inteiro.

O script `gerar.js` junta tudo e cria as páginas HTML. Você não precisa editar HTML.

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

## Rodar localmente

Precisa do Node.js 18 ou mais novo. Não há dependências para instalar.

```
node gerar.js
```

Depois abra `index.html` no navegador.

## Créditos

O conteúdo vem das lives públicas de Junior Lima | MK Digital no YouTube. Este site é um resumo feito pela comunidade para estudo. Assista às lives originais no canal dele.
