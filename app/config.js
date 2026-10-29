/*
  CONFIGURAÇÃO DA PAUTA
  ---------------------
  1) Crie um projeto no Firebase e um "App da Web" (passo a passo no README.md).
  2) Cole abaixo o objeto firebaseConfig que o Firebase mostrar.
  3) O acesso é controlado pelas regras do Firestore (firestore.rules): cada escritório só é lido
     por quem está na lista de membros dele. Não é preciso listar e-mails aqui.

  Enquanto "firebase" estiver null, o site abre em MODO LOCAL:
  começa zerado e salva tudo só no navegador de quem usa.
*/
window.APP_CONFIG = {
  officeName: '', // nome padrão; cada escritório define o seu dentro do app

  // E-mail para pedidos sobre dados pessoais da conta na Pauta (aparece em "Minha conta"). [PREENCHER]
  contatoPrivacidade: '',

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


  // Mostra o botão "modo demonstração" mesmo com o Firebase configurado
  allowDemo: false,
};
