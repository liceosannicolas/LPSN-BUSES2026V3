/* Simple local auth (restricted list) */
const Auth = (() => {
  const allowed = [
    "belenacuna@liceosannicolas.cl",
    "franciscopinto@liceosannicolas.cl",
    "echeverri@liceosannicolas.cl"
  ];
  const pass = "Buses2026";

  function normalizeEmail(s){ return String(s||"").trim().toLowerCase(); }

  function login(email, password){
    const e = normalizeEmail(email);
    const okEmail = allowed.includes(e);
    const okPass = String(password||"") === pass;
    if(!okEmail) return {ok:false, msg:"Correo no autorizado. Usa un correo institucional habilitado."};
    if(!okPass) return {ok:false, msg:"Clave incorrecta."};
    const role = (e === "franciscopinto@liceosannicolas.cl") ? "admin" : "digitador";
    const auth = { email: e, role, at: Storage.nowISO() };
    Storage.set(Storage.KEYS.auth, auth);
    return {ok:true, msg:"Ingreso correcto.", auth};
  }

  function logout(){ Storage.del(Storage.KEYS.auth); }

  function current(){ return Storage.get(Storage.KEYS.auth, null); }

  function requireAuth(){
    const a = current();
    if(!a) { window.location.href = "login.html"; return null; }
    return a;
  }

  return { login, logout, current, requireAuth, allowed };
})();
