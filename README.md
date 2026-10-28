# Pauta — Advocacia Coradelli

Sistema interno de **prazos, agenda, equipe e chat** do escritório. Site estático (HTML/CSS/JS, sem build) hospedado no **GitHub Pages**, com **login Google** e banco em tempo real pelo **Firebase** (plano gratuito Spark atende um escritório pequeno).

Sem o Firebase configurado, ele abre em **modo local**: começa zerado, pede seu nome e salva tudo **só no navegador daquele aparelho** (use *Baixar backup* / *Restaurar backup* no menu da conta). Para a equipe usar junto, com login Google, siga "Colocando no ar". Depois de ligar o Firebase, os casos do modo local podem ser trazidos por *Importar casos (JSON)*.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `index.html` | Página única do app |
| `styles.css` | Visual (tema claro/escuro automático) |
| `app.js` | Toda a lógica |
| `config.js` | **Você edita:** dados do Firebase e e-mails liberados |
| `firestore.rules` | **Você edita:** regra de segurança do banco (cole no Firebase) |
| `exemplo-importacao.json` | Formato para importar casos em lote / pela IA |

## Escritório, login e convites (como está configurado)

- Projeto Firebase: **pauta-coradelli** (conta murilodannis123@gmail.com). Login Google ativado, domínio `murilodannis123-lang.github.io` autorizado e regras de `firestore.rules` publicadas.
- **Primeiro acesso**: a pessoa entra com Google. Se o e-mail dela não estiver em nenhum escritório, aparece "Criar escritório". Quem cria vira **administrador**.
- **Convidar**: aba Equipe → **Convidar pessoa** → e-mail Google da pessoa. O site gera a mensagem pronta para mandar. A pessoa entra com esse e-mail e já cai no mesmo escritório, vendo os mesmos processos, agenda e chat, em qualquer aparelho.
- Só administradores convidam, removem ou tornam alguém administrador. Quem criou o escritório não pode ser removido.
- Ao entrar num aparelho que tinha dados do **modo local**, aparece a opção **Enviar para o escritório**.
- Não é mais preciso listar e-mails no `config.js` nem nas regras: o acesso é controlado pela lista de membros de cada escritório.

## O que tem

- **Login Google**, só para e-mails liberados (trava no banco, não só na tela).
- **Prazos** (tela inicial): carimbo D-X por urgência, filtros Vencidos / Hoje / 1–3 dias / 4–7 / +7 / sem prazo / cumpridos, ordenação mais → menos urgente, busca, filtro por responsável e área, "só os meus".
- **Novo caso**: judicial (número CNJ com máscara, **conferência do dígito verificador** e tribunal preenchido sozinho) ou administrativo (NB/protocolo INSS/CRPS), partes, quem representamos, o que aconteceu, prazo, **responsável da equipe** e lembrete automático na agenda X dias úteis antes.
- **Calculadora de prazo**: a partir da intimação, em dias úteis ou corridos, pulando fins de semana, feriados nacionais (inclui Carnaval, Sexta-feira Santa, Corpus Christi, 20/11 e 08/12) e, opcional, o recesso de 20/12 a 20/01. **Feriados municipais/estaduais e suspensões do tribunal não entram — sempre conferir.**
- **Caso aberto**: andamentos (linha do tempo), marcar cumprido / reabrir, trocar responsável, agendar, **Documentos** (anexar PDFs) e **Resumo** gerado por IA a partir dos PDFs.
- **Agenda**: calendário mensal com compromissos e prazos fatais; tocando no dia aparece a programação embaixo; compromisso **vira "Finalizado" sozinho** quando passa do horário de fim (ou do início, se não tiver fim); responsável e processo vinculado.
- **Sininho**: prazos urgentes seus, casos atribuídos a você, compromissos marcados no seu nome e menções/mensagens diretas no chat.
- **Equipe**: cada pessoa com cor; tocando no nome mostra **tudo ligado a ela** (casos, prazos, próximos e finalizados).
- **Chat**: canal do escritório com `@nome` e conversas diretas.
- Extras: painel "Hoje" e "Carga da equipe", tema escuro, exportar agenda/prazos para Google Agenda (`.ics`), backup JSON, importação JSON, funciona offline e sincroniza quando a internet volta.

## Colocando no ar (≈ 20 min)

### 1. Firebase

1. Acesse <https://console.firebase.google.com> com a conta Google do escritório → **Adicionar projeto** (pode desativar o Analytics).
2. Na página do projeto, clique no ícone **Web `</>`** → dê um nome → **Registrar app**. Copie o objeto `firebaseConfig` que aparecer.
3. **Authentication → Começar → Método de login → Google → Ativar** → Salvar.
4. **Firestore Database → Criar banco de dados** → modo **produção** → região `southamerica-east1 (São Paulo)`.
5. Na aba **Regras** do Firestore, apague o que tiver, cole o conteúdo de `firestore.rules`, **troque `seu-email@gmail.com` pelos e-mails da equipe** e clique em **Publicar**.

### 2. config.js

Abra `config.js` e:

- troque `firebase: null,` pelo objeto copiado no passo 1.2 (é só tirar as `//` do bloco de exemplo e colar os valores);
- preencha `allowedEmails` com **a mesma lista** das regras.

> A `apiKey` do Firebase não é segredo — ela fica pública em qualquer site que usa Firebase. Quem protege os dados são as **regras do Firestore**.

### 3. GitHub Pages

1. Crie um repositório no GitHub (ex.: `pauta`).
2. **Add file → Upload files** → arraste todos os arquivos desta pasta → Commit.
3. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`** → Save.
4. Em ~1 min o site estará em `https://SEU-USUARIO.github.io/pauta/`.

### 4. Liberar o domínio no login

Firebase → **Authentication → Configurações → Domínios autorizados → Adicionar domínio** → `SEU-USUARIO.github.io`.

Pronto: entre com Google. O primeiro acesso de cada pessoa a adiciona automaticamente na **Equipe** (dá para editar nome, cargo e cor).

### Para adicionar alguém depois

1. Coloque o e-mail em `firestore.rules` (publicar) e em `config.js` (commit).
2. A pessoa entra com Google e já aparece na Equipe.

## Cuidados (LGPD e sigilo)

- No plano grátis do GitHub o repositório é **público**: o **código** fica visível, mas **nenhum dado de cliente** vai para o GitHub — tudo fica no Firestore, fechado pelas regras.
- Use a lista de e-mails nas regras; nunca deixe `allow read, write: if true`.
- Prefira uma conta Google do escritório como dona do projeto Firebase.
- Os prazos calculados são **estimativa**: a conferência no sistema do tribunal continua obrigatória.

## Próximas etapas (já esquematizadas no código)

### Casos adicionados automaticamente (IA)
- Já existe a função `window.Pauta.importarCasos([...])` e a tela **Conta → Importar casos (JSON)**. Formato em `exemplo-importacao.json`.
- `"origem": "ia"` faz o caso entrar com selo **"revisar"** e aviso na tela de prazos até alguém clicar em **Conferido**.
- `responsavel` aceita e-mail ou nome de quem está na Equipe.
- Caminho natural: uma função na nuvem (Firebase Cloud Functions) que recebe o texto da intimação/PDF, chama a IA e grava na coleção `casos` com `origem: "ia"`.

### Documentos e resumo (já funcionando)
- Cada caso tem a aba **Documentos**: arraste ou escolha PDFs, imagens ou .txt. Os arquivos ficam no **IndexedDB deste navegador** (não vão para o GitHub nem para o backup JSON).
- A aba **Resumo** lê os PDFs (texto extraído no próprio navegador com pdf.js) e manda para a **API do Claude**, que devolve o resumo com as páginas citadas. O resumo fica salvo no caso com o selo "gerado por IA · conferir".
- Precisa de uma chave da API: menu da conta → **Configurar IA**. A chave fica só naquele navegador. Cada resumo é cobrado na conta da API.
- PDFs escaneados (só imagem) vão direto como arquivo, até 100 páginas / 20 MB por documento.
- Processos muito longos: acima de ~500 mil caracteres, o início e o fim dos autos são lidos e o meio é pulado (o resumo avisa).

### Receber PDF de outra aba (para o Claude pegar o processo no tribunal)
A Pauta aceita arquivos enviados por `postMessage` de páginas `*.jus.br` (outras origens: `origensAnexo` no `config.js`). Na aba do tribunal, já logado:

```js
const buf = await fetch(URL_DO_PDF, { credentials: 'include' }).then(r => r.arrayBuffer());
const w = window.open('https://murilodannis123-lang.github.io/pauta-coradelli/', 'pauta');
await new Promise(ok => addEventListener('message', function h(e) { if (e.data?.tipo === 'pauta-pronta') { removeEventListener('message', h); ok(); } }));
const resp = new Promise(ok => addEventListener('message', e => e.data?.tipo === 'pauta-anexado' && ok(e.data)));
w.postMessage({ tipo: 'pauta-anexar', processo: 'NÚMERO CNJ', nome: 'autos.pdf', arquivo: buf }, 'https://murilodannis123-lang.github.io');
await resp; // { ok: true, casoId, docId } ou { ok: false, erro }
```

Na própria página da Pauta também existem `Pauta.anexarArquivo(numero, blob, nome)`, `Pauta.gerarResumo(numero)` e `Pauta.salvarResumo(numero, texto)`.

## Estrutura do banco (Firestore)

```
equipe/{id}     nome, cargo, email, cor, foto
casos/{id}      tipo, numero, autor, reu, representa, area, orgao, tipoPrazo, prazo (AAAA-MM-DD),
                responsavelId, status (aberto|cumprido), andamentos[], resumo, pdf,
                origem (manual|importado|ia), revisado, criadoPor, criadoEm,
                documentos[] {id, nome, tipo, tamanho, paginas, criadoEm, por}  (arquivo no IndexedDB do aparelho)
agenda/{id}     titulo, tipo, data, inicio, fim, responsavelId, casoId, descricao, concluido, criadoPor
mensagens/{id}  canal (geral | dm:idA:idB), autorId, autorNome, texto, criadoEm
```
