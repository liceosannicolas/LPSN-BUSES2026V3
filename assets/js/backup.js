document.addEventListener("DOMContentLoaded", () => {
  const btnExport = document.getElementById("btnExportState");
  const btnImport = document.getElementById("btnImportState");
  const file = document.getElementById("stateFile");
  const msg = document.getElementById("msg");

  function setMsg(t, tone=""){
    msg.className = "msg" + (tone ? (" " + tone) : "");
    msg.textContent = t;
  }

  btnExport.addEventListener("click", () => {
    const state = {
      version: "v2",
      exportedAt: new Date().toISOString(),
      buses: Storage.get(Storage.KEYS.buses, []),
      zones: Storage.get(Storage.KEYS.zones, []),
      assigns: Storage.get(Storage.KEYS.assigns, {}),
      wait: Storage.get(Storage.KEYS.wait, []),
      schema: Storage.get(Storage.KEYS.schema, null)
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `respaldo_transporte_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("✅ Respaldo descargado.", "ok");
  });

  btnImport.addEventListener("click", async () => {
    const f = file.files?.[0];
    if(!f){ setMsg("Selecciona un archivo JSON.", "bad"); return; }
    try{
      const text = await f.text();
      const state = JSON.parse(text);
      if(!state || !state.buses || !state.zones){ throw new Error("Formato inválido"); }
      Storage.set(Storage.KEYS.buses, state.buses || []);
      Storage.set(Storage.KEYS.zones, state.zones || []);
      Storage.set(Storage.KEYS.assigns, state.assigns || {});
      Storage.set(Storage.KEYS.wait, state.wait || []);
      if(state.schema) Storage.set(Storage.KEYS.schema, state.schema);
      setMsg("✅ Respaldo importado. Vuelve al panel.", "ok");
    }catch(e){
      console.error(e);
      setMsg("No se pudo importar. Verifica que sea un respaldo válido.", "bad");
    }
  });
});
