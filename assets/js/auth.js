
(function(){
  const USERS = [
    {email:'belenacuna@liceosannicolas.cl', role:'digitador'},
    {email:'franciscopinto@liceosannicolas.cl', role:'admin'},
    {email:'echeverri@liceosannicolas.cl', role:'digitador'},
  ];
  const PASSWORD = 'Buses2026';
  const LS_SESSION = 'ts_session';

  function normalizeEmail(e){ return (e||'').trim().toLowerCase(); }

  function login(email, password){
    email = normalizeEmail(email);
    const u = USERS.find(x=>x.email===email);
    if(!u) throw new Error('Correo no autorizado');
    if(password !== PASSWORD) throw new Error('Clave incorrecta');
    const session = { email:u.email, role:u.role, ts: Date.now() };
    localStorage.setItem(LS_SESSION, JSON.stringify(session));
    return session;
  }
  function logout(){ localStorage.removeItem(LS_SESSION); }
  function getSession(){
    try{ return JSON.parse(localStorage.getItem(LS_SESSION)||'null'); }catch(e){ return null; }
  }
  function requireAuth(){
    const s = getSession();
    if(!s){ location.href = '../app/login.html'; }
    return s;
  }
  window.TS = window.TS || {};
  window.TS.auth = { login, logout, getSession, requireAuth };
})();
