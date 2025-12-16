
(function(){
  async function getSyncConfig(){
    // Merge config.js and persisted overrides
    const persisted = await TS.db.getModel(TS.db.KEYS.sync, {});
    const base = (window.TS_CONFIG && window.TS_CONFIG.SYNC) ? window.TS_CONFIG.SYNC : {enabled:false, appsScriptUrl:'', apiKey:''};
    return {...base, ...persisted};
  }
  async function setSyncConfig(cfg){
    await TS.db.setModel(TS.db.KEYS.sync, cfg);
  }

  async function callApi(action, payload){
    const cfg = await getSyncConfig();
    if(!cfg.enabled) throw new Error('Sync deshabilitado');
    if(!cfg.appsScriptUrl) throw new Error('Falta appsScriptUrl en config');
    const res = await fetch(cfg.appsScriptUrl, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action, key: cfg.apiKey || '', payload })
    });
    const data = await res.json().catch(()=>null);
    if(!res.ok || !data || data.ok===false){
      throw new Error((data && data.error) ? data.error : 'Error en Sync');
    }
    return data;
  }

  window.TS = window.TS || {};
  window.TS.sync = { getSyncConfig, setSyncConfig, callApi };
})();
