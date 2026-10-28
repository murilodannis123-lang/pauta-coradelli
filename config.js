/*
  CONFIGURAÇÃO DA PAUTA
  ---------------------
  1) Crie um projeto no Firebase e um "App da Web" (passo a passo no README.md).
  2) Cole abaixo o objeto firebaseConfig que o Firebase mostrar.
  3) Liste quem pode entrar (e-mails Google). Repita a mesma lista no firestore.rules —
     a trava de verdade é a regra do Firestore; esta lista só evita a tela abrir para quem não tem acesso.

  Enquanto "firebase" estiver null, o site abre em MODO LOCAL:
  começa zerado e salva tudo só no navegador de quem usa.
*/
window.APP_CONFIG = {
  officeName: 'Advocacia Coradelli',
  advogada: 'Dra. Cristiane Paiva Coradelli Abate', // usada no resumo para identificar o cliente

  // Sites que podem mandar PDF direto para a Pauta (além de *.jus.br)
  origensAnexo: [],

  firebase: {
    apiKey: "AIzaSyD1yeocYdZaqi_AtdLqr5VM7ebR12LJ0hI",
    authDomain: "pauta-coradelli.firebaseapp.com",
    projectId: "pauta-coradelli",
    storageBucket: "pauta-coradelli.firebasestorage.app",
    messagingSenderId: "884802584687",
    appId: "1:884802584687:web:1664420fbefdf8a717cd9a"
  },

  // Quem pode entrar. Deixe as duas opções vazias para liberar qualquer conta Google (não recomendado).
  allowedEmails: [
    // 'seu-email@gmail.com',
    // 'colega@gmail.com',
  ],
  allowedDomain: '', // ex.: 'coradelli.adv.br' libera todo e-mail desse domínio

  // Mostra o botão "modo demonstração" mesmo com o Firebase configurado
  allowDemo: false,
};
