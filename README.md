# Pauta

Ferramenta de prazos processuais, agenda, equipe e conversa para escritórios de advocacia. Site estático (HTML, CSS e JS, sem etapa de build) com login e banco de dados no Firebase.

> **Status:** fase de testes, ainda não divulgada ao público. Os campos marcados como **[PREENCHER]** em `privacidade.html`, `termos.html` e `app/config.js` precisam ser completados antes do lançamento.

## Estrutura

| Caminho | O que é |
|---|---|
| `index.html` | Página inicial pública (produto). Quem já usa o app neste aparelho é levado direto para `app/`. `?site` força a exibição da página. |
| `privacidade.html` | Política de Privacidade (LGPD) |
| `termos.html` | Termos de Uso |
| `app/` | O sistema: `index.html`, `app.js`, `styles.css`, `config.js` |
| `assets/consent.js` | Aviso de privacidade e escolha de armazenamento (essencial × preferências) |
| `assets/site.css` | Estilo das páginas públicas |
| `assets/fonts/` | Fontes servidas pelo próprio site (nada vem do Google Fonts) |
| `assets/vendor/` | Firebase SDK e PDF.js servidos pelo próprio site |
| `firestore.rules` | Regras de segurança do banco (o equivalente ao RLS) |
| `LICENCAS.md` | Licenças de terceiros |
| `exemplo-importacao.json` | Formato para importar casos em lote |

## Configuração atual (Firebase `pauta-coradelli`)

- **Login:** Google e e-mail/senha, com confirmação de e-mail obrigatória.
- **Política de senha:** obrigatória, mínimo de 8 caracteres e pelo menos um número. O app também exige letras e números.
- **Proteção contra enumeração de e-mails:** ativada. A tela de login nunca diz se um e-mail existe.
- **Limite de tentativas:** o Firebase bloqueia do lado do servidor (`auth/too-many-requests`). O app também bloqueia no aparelho após 5 erros: 30 s, dobrando até 15 min.
- **Banco:** Cloud Firestore em `southamerica-east1` (São Paulo). Backups programados **desativados** (ver Riscos).
- **Domínio autorizado:** `murilodannis123-lang.github.io`.

## Como funciona o acesso

1. A pessoa cria a conta (Google ou e-mail/senha). Com e-mail/senha, precisa confirmar o e-mail antes de entrar.
2. Sem convite, aparece **Criar escritório**. Quem cria vira dono e administrador.
3. Administradores convidam pelo e-mail na aba **Equipe**. O convidado entra com esse e-mail e já cai no escritório.
4. Os dados ficam em `escritorios/{id}/{equipe|casos|agenda|mensagens}`. Ninguém fora da lista `membros` lê nada (regras em `firestore.rules`).
5. Na primeira entrada após uma mudança dos termos (`TERMOS_V` em `app/app.js`), cada pessoa vê o aviso de novidades e precisa aceitar a nova versão.

### Regras de segurança (resumo)

| Coleção | Ler | Criar ou editar | Apagar |
|---|---|---|---|
| `escritorios/{id}` | membros | admin (o dono não pode ser removido); um membro comum só pode remover a si mesmo | ninguém |
| `…/equipe` | membros | admin, ou a própria pessoa no próprio perfil (sem trocar o e-mail) | admin ou a própria pessoa |
| `…/casos`, `…/agenda` | membros | membros (com limites de tamanho) | membros |
| `…/mensagens` | membros | só em nome próprio (`autorEmail` = e-mail do login), até 4.000 caracteres; sem edição | autor ou admin |
| `convites/{email}` | só o dono do e-mail | admin do escritório de destino | o próprio ou o admin |
| qualquer outro caminho | negado | negado | negado |

Para publicar as regras: Firebase Console → Firestore Database → Regras → colar `firestore.rules` → Publicar.

## Privacidade (resumo técnico)

- Coletamos nome, e-mail, forma de login e aceite dos termos. A foto do perfil Google não é guardada.
- Nenhum cookie de publicidade nem ferramenta de análise. O aviso separa o armazenamento **essencial** (sessão, cópia offline, documentos, escolha do aviso, contador de tentativas) das **preferências** (tema, notificações já vistas), que só são gravadas com permissão.
- **Minha conta e privacidade:** baixar meus dados (JSON), corrigir nome, criar ou trocar senha, sair apagando os dados do aparelho, excluir a conta (o dono do escritório não pode se excluir por aqui).
- Documentos anexados ficam só no IndexedDB do aparelho de quem anexou.
- O resumo por IA só funciona com uma chave de API da Anthropic cadastrada pelo usuário; o texto vai do navegador direto para a Anthropic.

## Riscos e pendências antes do lançamento público

1. **Hospedagem.** As regras do GitHub Pages dizem que ele não pode ser usado para rodar negócio on-line nem SaaS comercial, e que não deve ser usado para transações sensíveis como envio de senhas. Antes de vender a Pauta, migrar o site para outra hospedagem (por exemplo, Firebase Hosting no mesmo projeto) e usar um domínio próprio.
2. **Dados do responsável:** preencher os campos [PREENCHER] (nome ou razão social, CPF/CNPJ, endereço, encarregado, e-mail de privacidade, prazos de guarda, foro, preços).
3. **Termos de processamento de dados do Google/Firebase:** revisar e aceitar no console (Configurações do projeto → Privacidade dos dados).
4. **Backups:** o Firestore está sem backups programados. Avaliar a ativação, que exige o plano pago por uso.
5. **Dono do projeto:** o projeto do Firebase está numa conta pessoal. Avaliar incluir outra conta como proprietária, para não perder o acesso.
6. **Dados sensíveis e sigilo:** processos podem ter dados de saúde. Os Termos deixam claro que o escritório é o controlador. Vale um contrato de operador (DPA) com os escritórios clientes antes de cobrar.
7. **Documentos só no aparelho:** para compartilhar PDFs com a equipe, é preciso o Firebase Storage (plano pago por uso) e novas regras.

## Rotina de publicações (importação)

Casos podem entrar em lote pelo menu da conta → **Importar casos (JSON)** (formato em `exemplo-importacao.json`) ou por `window.Pauta.importarCasos([...])`. Com `"origem": "ia"`, o caso entra marcado como **revisar**.
