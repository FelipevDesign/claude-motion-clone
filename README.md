# Claude Motion clone — versão para o PC

Editor de motion graphics controlado por chat, rodando no seu computador.
Sem limite de tamanho de mídia: imagens, vídeos, áudios e modelos 3D ficam em `data\media`.

## Como abrir
1. Dê dois cliques em **Iniciar.bat**.
   Na primeira vez ele instala as bibliotecas (precisa de internet) e cria o arquivo `.env`.
2. O navegador abre em http://localhost:4321 — use o Chrome ou o Edge.
3. Para fechar, feche a janela preta do servidor.

## Pelo terminal
- `npm start` — abre o app.
- `npm run dev` — modo desenvolvimento: refaz o app ao salvar arquivos em `src/` e reinicia o servidor quando `server.js` muda.
- `npm run build` — gera `public/index.html` a partir de `src/`.

## Projetos de exemplo
Na primeira execução, os projetos da pasta `examples` (Guia completo, Tour, Reel · Comover e Resumo do 3º trimestre) são copiados para `data`. Depois disso, `data` é só sua.

## Claude no chat
Configure uma opção no arquivo `.env`:
- **Chave da API** (`ANTHROPIC_API_KEY=...`): pago por uso, aceita imagens anexadas.
- **CLI do Claude Code**: se o comando `claude` já estiver instalado e logado no PC, ele é usado automaticamente pela sua assinatura (sem imagens anexadas).

Sem nenhuma das duas, o chat funciona no modo local, com comandos simples.

## Onde ficam as coisas
| Pasta | Conteúdo |
|---|---|
| `data\db` | projetos, versões, comentários e a galeria (um JSON por documento) |
| `data\media` | todas as mídias enviadas, sem limite de tamanho |
| `exports` | vídeos, GIFs, PNGs e legendas exportados |
| `public` | o app pronto (index.html e shim.js) |
| `src` | código-fonte do app; `npm run build` gera o `public\index.html` |

Para fazer backup, copie a pasta `data`.

## Vários projetos
Clique no ícone de pasta ao lado do nome do projeto (ou use Ctrl O) para criar, abrir, duplicar e excluir projetos.
Cada aba do navegador pode abrir um projeto diferente, e as abas ficam sincronizadas.
