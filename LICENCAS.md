# Licenças de terceiros

A Pauta usa os componentes abaixo, todos servidos pelo próprio site (sem CDN de terceiros). Os textos das licenças estão nas pastas indicadas.

| Componente | Versão | Licença | Onde | Observação |
|---|---|---|---|---|
| Firebase JS SDK (app, auth, firestore) | 10.12.2 | Apache-2.0 | `assets/vendor/firebase-10.12.2/` (texto da licença em `LICENSE-Apache-2.0.txt`) | Arquivos modificados: o endereço de importação do `firebase-app.js` foi trocado de `https://www.gstatic.com/...` para o caminho local `./firebase-app.js`, e os comentários de source map foram removidos. Nenhuma outra alteração. |
| PDF.js (pdfjs-dist) | 3.11.174 | Apache-2.0 | `assets/vendor/pdfjs-3.11.174/LICENSE` | Sem modificações. |
| IBM Plex Sans e IBM Plex Mono | via @fontsource 5.x | SIL Open Font License 1.1 | `assets/fonts/OFL-IBM-Plex.txt` | Apenas os subconjuntos latin e latin-ext, em woff2. |
| Spectral | via @fontsource 5.x | SIL Open Font License 1.1 | `assets/fonts/OFL-Spectral.txt` | Apenas os subconjuntos latin e latin-ext, em woff2. |

## Imagens e marcas

- O site não usa fotos, ilustrações ou imagens de banco de imagens. A amostra da lista de prazos na página inicial é feita em HTML, com nomes fictícios.
- Os ícones da interface foram desenhados para a Pauta, em SVG, e o sinal "§" é um caractere tipográfico.
- O logotipo "G" no botão "Entrar com Google" é marca do Google, usado só para identificar o login com Google. Confira as diretrizes de marca do Google para botões de login antes do lançamento público.
- "Firebase", "Google", "GitHub" e "Anthropic" são marcas de seus titulares. Aparecem só para identificar os fornecedores na Política de Privacidade.

## Código da Pauta

O código próprio da Pauta não tem licença de código aberto: todos os direitos são reservados ao titular. Como o repositório é público, qualquer pessoa pode ver o código, mas não ganha permissão para copiá-lo ou reutilizá-lo.
