/*
  CONFIGURAÇÃO DA PAUTA
  ---------------------
  1) Crie um projeto no Firebase e um "App da Web" (passo a passo no README.md).
  2) Cole abaixo o objeto firebaseConfig que o Firebase mostrar.
  3) Liste quem pode entrar (e-mails Google). Repita a mesma lista no firestore.rules —
     a trava de verdade é a regra do Firestore; esta lista só evita a tela abrir para quem não tem acesso.

  Enquanto "firebase" estiver null, o site abre em MODO DEMONSTRAÇÃO
  (dados de exemplo salvos só no seu navegador).
*/
window.APP_CONFIG = {
  officeName: 'Advocacia Coradelli',

  firebase: null,
  // firebase: {
  //   apiKey: "COLE_AQUI",
  //   authDomain: "seu-projeto.firebaseapp.com",
  //   projectId: "seu-projeto",
  //   storageBucket: "seu-projeto.appspot.com",
  //   messagingSenderId: "000000000000",
  //   appId: "1:000000000000:web:0000000000000000"
  // },

  // Quem pode entrar. Deixe as duas opções vazias para liberar qualquer conta Google (não recomendado).
  allowedEmails: [
    // 'seu-email@gmail.com',
    // 'colega@gmail.com',
  ],
  allowedDomain: '', // ex.: 'coradelli.adv.br' libera todo e-mail desse domínio

  // Mostra o botão "modo demonstração" mesmo com o Firebase configurado
  allowDemo: false,
};
