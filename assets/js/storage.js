
(function(){
  const DB_NAME = 'ts_transporte';
  const DB_VERSION = 1;
  const STORE = 'kv';

  function openDB(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e)=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)){
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }

  async function idbGet(key){
    const db = await openDB();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE,'readonly');
      const st = tx.objectStore(STORE);
      const req = st.get(key);
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }
  async function idbSet(key, val){
    const db = await openDB();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE,'readwrite');
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>reject(tx.error);
      tx.objectStore(STORE).put(val, key);
    });
  }
  async function idbDel(key){
    const db = await openDB();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE,'readwrite');
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>reject(tx.error);
      tx.objectStore(STORE).delete(key);
    });
  }

  // Convenience model keys
  const KEYS = {
    students:'students_min', // array
    buses:'buses',
    zonas:'zonas',
    assignments:'assignments',
    waitlist:'waitlist',
    mode:'mode', // 'local' | 'sync'
    sync:'sync_config' // object
  };

  async function getModel(key, fallback){
    const v = await idbGet(key);
    return (v===undefined || v===null) ? fallback : v;
  }
  async function setModel(key, val){ return idbSet(key,val); }

  window.TS = window.TS || {};
  window.TS.db = { getModel, setModel, del:idbDel, KEYS };
})();
