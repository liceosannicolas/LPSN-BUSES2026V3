/* Import XLSX to localStorage */
document.addEventListener("DOMContentLoaded", () => {
  const fileEl = document.getElementById("file");
  const sheetSelect = document.getElementById("sheetSelect");
  const btnLoad = document.getElementById("btnLoad");
  const btnSave = document.getElementById("btnSave");
  const btnClearDb = document.getElementById("btnClearDb");
  const msg = document.getElementById("msg");
  const previewEl = document.getElementById("preview");

  const rutField = document.getElementById("rutField");
  const nameField = document.getElementById("nameField");
  const addressField = document.getElementById("addressField");
  const comunaField = document.getElementById("comunaField");
  const courseField = document.getElementById("courseField");

  let wb = null;
  let activeSheet = null;
  let activeData = []; // array of objects
  let headers = [];

  function setMsg(text, tone=""){
    msg.className = "msg" + (tone ? (" " + tone) : "");
    msg.textContent = text;
  }

  function guessField(select, headerList, patterns){
    const low = headerList.map(h => String(h||"").toLowerCase());
    for(const p of patterns){
      const idx = low.findIndex(h => h.includes(p));
      if(idx >= 0){ select.value = headerList[idx]; return; }
    }
    select.value = headerList[0] || "";
  }

  function fillSelect(select, items){
    select.innerHTML = "";
    for(const it of items){
      const opt = document.createElement("option");
      opt.value = it;
      opt.textContent = it;
      select.appendChild(opt);
    }
  }

  function renderPreview(rows){
    if(!rows || rows.length===0){ previewEl.innerHTML = "<div class='muted'>Sin datos.</div>"; return; }
    const cols = Object.keys(rows[0]).slice(0,8);
    let html = "<table><thead><tr>";
    for(const c of cols) html += "<th>"+escapeHtml(c)+"</th>";
    html += "</tr></thead><tbody>";
    for(const r of rows.slice(0,10)){
      html += "<tr>";
      for(const c of cols) html += "<td>"+escapeHtml(String(r[c]??""))+"</td>";
      html += "</tr>";
    }
    html += "</tbody></table>";
    previewEl.innerHTML = html;
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  async function readXlsx(file){
    const buf = await file.arrayBuffer();
    wb = XLSX.read(buf, { type: "array" });
    return wb;
  }

  function listSheets(){
    const names = wb.SheetNames || [];
    sheetSelect.disabled = false;
    btnLoad.disabled = false;
    sheetSelect.innerHTML = "";
    for(const n of names){
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      sheetSelect.appendChild(opt);
    }
    // prefer 'formulario' if present
    const idx = names.findIndex(s => String(s).toLowerCase() === "formulario");
    if(idx >= 0) sheetSelect.value = names[idx];
  }

  function loadSheet(name){
    activeSheet = name;
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if(!aoa || aoa.length < 2) return {rows:[], headers:[]};
    headers = aoa[0].map(h => String(h||"").trim()).filter(Boolean);
    // If some headers are empty, keep their position but name them
    const fullHeaders = aoa[0].map((h,i)=> {
      const t = String(h||"").trim();
      return t ? t : `Col_${i+1}`;
    });
    const body = aoa.slice(1);
    const rows = body.filter(r => r.some(v => String(v||"").trim()!=="")).map(r => {
      const obj = {};
      for(let i=0;i<fullHeaders.length;i++){
        obj[fullHeaders[i]] = r[i] ?? "";
      }
      return obj;
    });
    return {rows, headers: fullHeaders};
  }

  function updateFieldMapping(hs){
    const list = hs.length ? hs : [];
    fillSelect(rutField, list);
    fillSelect(nameField, list);
    fillSelect(addressField, list);
    fillSelect(comunaField, ["(ninguno)", ...list]);
    fillSelect(courseField, ["(ninguno)", ...list]);

    guessField(rutField, list, ["r.u.n","run","rut","identidad"]);
    guessField(nameField, list, ["nombre completo","nombres del estudiante","nombres","nombre"]);
    guessField(addressField, list, ["domicilio","direccion","dirección","domicilio estudiante"]);
    // comuna optional
    guessField(comunaField, ["(ninguno)", ...list], ["comuna"]);
    // course optional
    guessField(courseField, ["(ninguno)", ...list], ["nivel 2026","curso 2025","curso"]);
  }

  function saveDb(){
    if(activeData.length===0){ setMsg("No hay datos cargados.", "bad"); return; }
    const schema = {
      sheet: activeSheet,
      importedAt: new Date().toISOString(),
      rutField: rutField.value,
      nameField: nameField.value,
      addressField: addressField.value,
      comunaField: comunaField.value === "(ninguno)" ? "" : comunaField.value,
      courseField: courseField.value === "(ninguno)" ? "" : courseField.value,
      headers: headers
    };
    Storage.set(Storage.KEYS.db, { sheet: activeSheet, rows: activeData, headers: headers });
    Storage.set(Storage.KEYS.schema, schema);
    setMsg("✅ Base guardada en este navegador. Ya puedes ir al panel.", "ok");
  }

  function clearDb(){
    if(!confirm("¿Borrar la base local (nómina) de este navegador?")) return;
    Storage.del(Storage.KEYS.db);
    Storage.del(Storage.KEYS.schema);
    setMsg("Base borrada.", "warn");
  }

  fileEl.addEventListener("change", async () => {
    const f = fileEl.files?.[0];
    if(!f){ return; }
    setMsg("Leyendo archivo...", "");
    try{
      await readXlsx(f);
      listSheets();
      setMsg("Archivo listo. Selecciona la hoja y presiona “Cargar hoja”.", "ok");
    }catch(e){
      console.error(e);
      setMsg("No se pudo leer el XLSX. Verifica el archivo.", "bad");
    }
  });

  btnLoad.addEventListener("click", () => {
    if(!wb) return;
    const name = sheetSelect.value;
    const {rows, headers:hs} = loadSheet(name);
    activeData = rows;
    headers = hs;
    renderPreview(rows);
    updateFieldMapping(hs);
    btnSave.disabled = rows.length === 0;
    setMsg(`Hoja “${name}” cargada: ${rows.length} filas. Revisa el mapeo y guarda.`, "ok");
  });

  btnSave.addEventListener("click", saveDb);
  btnClearDb.addEventListener("click", clearDb);

  // show current db status
  const db = Storage.get(Storage.KEYS.db, null);
  if(db?.rows?.length){
    setMsg(`ℹ️ Ya existe una base local con ${db.rows.length} filas (hoja: ${db.sheet}). Puedes reemplazarla importando nuevamente.`, "warn");
  }
});
