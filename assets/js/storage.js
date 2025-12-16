/* Local storage wrapper */
const Storage = (() => {
  const KEYS = {
    auth: "te_auth",
    db: "te_students_db",
    schema: "te_students_schema",
    buses: "te_buses",
    zones: "te_zones",
    assigns: "te_assignments",
    wait: "te_waitlist",
    prefs: "te_prefs"
  };

  function get(key, fallback=null){
    try{
      const raw = localStorage.getItem(key);
      if(raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    }catch(e){ return fallback; }
  }
  function set(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }
  function del(key){ localStorage.removeItem(key); }

  function nowISO(){ return new Date().toISOString(); }

  return { KEYS, get, set, del, nowISO };
})();
