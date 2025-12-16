/* Dashboard — assignment by RUT with capacity control + waitlist */
document.addEventListener("DOMContentLoaded", () => {
  const auth = Auth.requireAuth();
  if(!auth) return;

  const userPill = document.getElementById("userPill");
  const btnLogout = document.getElementById("btnLogout");
  const dbStatus = document.getElementById("dbStatus");
  const dbCount = document.getElementById("dbCount");
  const dbSheet = document.getElementById("dbSheet");

  const rutInput = document.getElementById("rutInput");
  const btnFind = document.getElementById("btnFind");
  const btnSuggest = document.getElementById("btnSuggest");
  const btnAssign = document.getElementById("btnAssign");
  const btnClear = document.getElementById("btnClear");
  const findMsg = document.getElementById("findMsg");

  const zoneSelect = document.getElementById("zoneSelect");
  const busSelect = document.getElementById("busSelect");
  const routeInput = document.getElementById("routeInput");
  const seatInfo = document.getElementById("seatInfo");

  const studentCard = document.getElementById("studentCard");
  const studentState = document.getElementById("studentState");

  const busSummary = document.getElementById("busSummary");
  const zoneSummary = document.getElementById("zoneSummary");
  const recentAssign = document.getElementById("recentAssign");
  const waitList = document.getElementById("waitList");
  const waitCount = document.getElementById("waitCount");

  const btnAddBus = document.getElementById("btnAddBus");
  const btnManageBuses = document.getElementById("btnManageBuses");
  const btnAddZone = document.getElementById("btnAddZone");
  const btnManageZones = document.getElementById("btnManageZones");

  const btnExport = document.getElementById("btnExport");
  const btnBackup = document.getElementById("btnBackup");

  userPill.textContent = auth.email + (auth.role==="admin" ? " · admin" : "");

  btnLogout.addEventListener("click", () => { Auth.logout(); window.location.href = "login.html"; });
  btnBackup.addEventListener("click", () => window.location.href = "../tools/backup.html");

  function setMsg(text, tone=""){
    findMsg.className = "msg" + (tone ? (" " + tone) : "");
    findMsg.textContent = text;
  }

  function normRut(s){
    return String(s||"").toLowerCase().replace(/\./g,"").replace(/\s+/g,"").replace(/[^0-9k-]/g,"").replace(/(\-)+/g,"-");
  }
  function rutKey(s){
    const t = normRut(s);
    return t.replace(/-/g,""); // key without hyphen
  }

  function loadDb(){
    const db = Storage.get(Storage.KEYS.db, null);
    const schema = Storage.get(Storage.KEYS.schema, null);
    if(!db?.rows?.length || !schema){
      dbStatus.textContent = "No cargada";
      dbCount.textContent = "0";
      dbSheet.textContent = "—";
      return {db:null, schema:null};
    }
    dbStatus.textContent = "OK";
    dbCount.textContent = String(db.rows.length);
    dbSheet.textContent = schema.sheet || db.sheet || "—";
    return {db, schema};
  }

  function defaultZones(){
    return [
      {id: crypto.randomUUID(), name:"Lantaño", patterns:["lantaño","lantano","parque lantaño","camino parque"], note:"Sector Lantaño"},
      {id: crypto.randomUUID(), name:"San Nicolás Centro", patterns:["san nicolas","centro"], note:"Centro"},
      {id: crypto.randomUUID(), name:"Chillán", patterns:["chillan","chillán"], note:"Comuna Chillán"},
      {id: crypto.randomUUID(), name:"Otras / Por definir", patterns:[], note:"Pendiente"}
    ];
  }

  function defaultBuses(){
    return [
      {id: crypto.randomUUID(), code:"Bus 1", capacity: 30, route:"(por definir)", zones:[], active:true},
      {id: crypto.randomUUID(), code:"Bus 2", capacity: 30, route:"(por definir)", zones:[], active:true}
    ];
  }

  function getZones(){
    let z = Storage.get(Storage.KEYS.zones, null);
    if(!Array.isArray(z) || z.length===0){
      z = defaultZones();
      Storage.set(Storage.KEYS.zones, z);
    }
    return z;
  }

  function getBuses(){
    let b = Storage.get(Storage.KEYS.buses, null);
    if(!Array.isArray(b) || b.length===0){
      b = defaultBuses();
      Storage.set(Storage.KEYS.buses, b);
    }
    return b;
  }

  function getAssignments(){
    return Storage.get(Storage.KEYS.assigns, {});
  }
  function setAssignments(a){ Storage.set(Storage.KEYS.assigns, a); }

  function getWaitlist(){
    const w = Storage.get(Storage.KEYS.wait, []);
    return Array.isArray(w) ? w : [];
  }
  function setWaitlist(w){ Storage.set(Storage.KEYS.wait, w); }

  function occupancyByBus(assigns){
    const occ = {};
    Object.values(assigns).forEach(a => {
      if(a?.busId && a?.status === "asignado"){
        occ[a.busId] = (occ[a.busId]||0) + 1;
      }
    });
    return occ;
  }

  function renderZoneOptions(zones){
    zoneSelect.innerHTML = "";
    for(const z of zones){
      const opt = document.createElement("option");
      opt.value = z.id;
      opt.textContent = z.name;
      zoneSelect.appendChild(opt);
    }
  }

  function renderBusOptions(buses, occ){
    busSelect.innerHTML = "";
    const active = buses.filter(b => b.active !== false);
    for(const b of active){
      const used = occ[b.id] || 0;
      const cap = Number(b.capacity||0);
      const full = cap>0 && used >= cap;
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = `${b.code} · ${used}/${cap || "∞"}${full ? " · LLENO" : ""}`;
      opt.dataset.full = full ? "1" : "0";
      busSelect.appendChild(opt);
    }
  }

  function zoneFromStudent(student, schema){
    const addr = String(student[schema.addressField]||"");
    const comuna = schema.comunaField ? String(student[schema.comunaField]||"") : "";
    const txt = (addr + " " + comuna).toLowerCase();

    const zones = getZones();
    let best = null;
    let bestScore = 0;

    zones.forEach(z => {
      let score = 0;
      (z.patterns||[]).forEach(p => {
        const pp = String(p||"").toLowerCase().trim();
        if(pp && txt.includes(pp)) score += 1;
      });
      if(score > bestScore){ bestScore = score; best = z; }
    });

    return best || zones[zones.length-1] || null;
  }

  function pickBusForZone(zoneId, buses, occ){
    const candidates = buses.filter(b => b.active !== false).filter(b => {
      const zs = b.zones || [];
      return zs.length === 0 || zs.includes(zoneId); // if bus has no zones configured, treat as candidate
    });

    // prefer buses with available capacity
    let best = null;
    let bestRatio = Infinity;
    for(const b of candidates){
      const used = occ[b.id] || 0;
      const cap = Number(b.capacity||0);
      if(cap>0 && used >= cap) continue;
      const ratio = cap>0 ? (used/cap) : used;
      if(ratio < bestRatio){ bestRatio = ratio; best = b; }
    }
    return best || candidates[0] || null;
  }

  function renderSummaries(){
    const zones = getZones();
    const buses = getBuses();
    const assigns = getAssignments();
    const occ = occupancyByBus(assigns);

    renderZoneOptions(zones);
    renderBusOptions(buses, occ);

    zoneSummary.innerHTML = "";
    zones.slice(0,4).forEach(z => {
      const item = document.createElement("div");
      item.className = "mini-item";
      item.innerHTML = `<div><strong>${escapeHtml(z.name)}</strong><div class="meta">${escapeHtml((z.patterns||[]).slice(0,3).join(", ") || "Sin patrones")}</div></div><span class="badge">🗺️</span>`;
      zoneSummary.appendChild(item);
    });

    busSummary.innerHTML = "";
    buses.slice(0,4).forEach(b => {
      const used = occ[b.id] || 0;
      const cap = Number(b.capacity||0) || "∞";
      const item = document.createElement("div");
      item.className = "mini-item";
      item.innerHTML = `<div><strong>${escapeHtml(b.code)}</strong><div class="meta">Cupos: ${used}/${cap} · ${escapeHtml(b.route||"(sin recorrido)")}</div></div><span class="badge">🚌</span>`;
      busSummary.appendChild(item);
    });

    // waitlist
    const w = getWaitlist();
    waitCount.textContent = String(w.length);
    waitList.innerHTML = "";
    w.slice(0,6).forEach(entry => {
      const item = document.createElement("div");
      item.className = "mini-item";
      item.innerHTML = `<div><strong>${escapeHtml(entry.rut||"")}</strong> · ${escapeHtml(entry.name||"")}<div class="meta">Deseado: ${escapeHtml(entry.desiredBusCode||"—")} · Zona: ${escapeHtml(entry.zoneName||"—")}</div></div><span class="badge">⏳</span>`;
      waitList.appendChild(item);
    });

    // recent assignments
    const rec = Object.values(assigns).sort((a,b)=> String(b.at||"").localeCompare(String(a.at||""))).slice(0,8);
    recentAssign.innerHTML = "";
    rec.forEach(a => {
      const item = document.createElement("div");
      item.className = "mini-item";
      const badge = a.status==="asignado" ? "✅" : "⏳";
      item.innerHTML = `<div><strong>${escapeHtml(a.rut||"")}</strong> · ${escapeHtml(a.name||"")}<div class="meta">${badge} ${escapeHtml(a.busCode||"En espera")} · ${escapeHtml(a.route||"")}</div></div><span class="badge">${badge}</span>`;
      recentAssign.appendChild(item);
    });

    // seat info for selected bus
    updateSeatInfo();
  }

  function updateSeatInfo(){
    const buses = getBuses();
    const assigns = getAssignments();
    const occ = occupancyByBus(assigns);
    const busId = busSelect.value;
    const b = buses.find(x => x.id === busId);
    if(!b){ seatInfo.textContent = "—"; return; }
    const used = occ[b.id] || 0;
    const cap = Number(b.capacity||0);
    const full = cap>0 && used >= cap;
    seatInfo.textContent = `Cupos: ${used}/${cap || "∞"}${full ? " · LLENO" : ""}`;
  }

  busSelect.addEventListener("change", updateSeatInfo);

  function escapeHtml(s){
    return String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function findStudentByRut(db, schema, rut){
    const key = rutKey(rut);
    const field = schema.rutField;
    for(const row of db.rows){
      const r = rutKey(row[field]);
      if(r && r === key) return row;
    }
    return null;
  }

  function assignmentForRut(assigns, rut){
    return assigns[rutKey(rut)] || null;
  }

  function setStudentCard(student, schema, assigns){
    if(!student){
      studentCard.className = "student-card empty";
      studentCard.innerHTML = "<div class='muted'>No hay estudiante cargado.</div>";
      studentState.textContent = "—";
      return;
    }
    const name = schema.nameField ? (student[schema.nameField]||"") : "";
    const addr = schema.addressField ? (student[schema.addressField]||"") : "";
    const comuna = schema.comunaField ? (student[schema.comunaField]||"") : "";
    const course = schema.courseField ? (student[schema.courseField]||"") : "";
    const rut = student[schema.rutField] || "";
    const a = assignmentForRut(assigns, rut);

    studentCard.className = "student-card";
    studentCard.innerHTML = `
      <div class="row space">
        <div><strong>${escapeHtml(name)}</strong><div class="meta">${escapeHtml(String(rut))}</div></div>
        <span class="badge">${a?.status==="asignado" ? "✅ Asignado" : (a?.status==="espera" ? "⏳ En espera" : "—")}</span>
      </div>
      <div class="hr"></div>
      <div class="kv">
        <div><span class="k">Domicilio</span><span class="v">${escapeHtml(String(addr||"—"))}</span></div>
        <div><span class="k">Comuna</span><span class="v">${escapeHtml(String(comuna||"—"))}</span></div>
        <div><span class="k">Curso/Nivel</span><span class="v">${escapeHtml(String(course||"—"))}</span></div>
      </div>
      ${a ? `<div class="notice small"><strong>Registro:</strong> ${escapeHtml(a.busCode||"En espera")} · ${escapeHtml(a.route||"")}<br><span class="muted">Digitador: ${escapeHtml(a.by||"")} · ${escapeHtml(a.at||"")}</span></div>` : ""}
    `;
    studentState.textContent = a?.status==="asignado" ? "✅ Asignado" : (a?.status==="espera" ? "⏳ En espera" : "Sin asignación");
  }

  function clearSelection(){
    rutInput.value = "";
    routeInput.value = "";
    setStudentCard(null, {}, {});
    setMsg("Listo.", "");
  }

  async function openManageZones(){
    const zones = getZones();
    const html = `
      <div class="muted">Define zonas y palabras clave (patrones) para sugerir zona desde el domicilio/comuna.</div>
      <div class="hr"></div>
      ${zones.map(z => `
        <div class="mini-item">
          <div style="width:100%">
            <div class="row space">
              <strong>🗺️ ${escapeHtml(z.name)}</strong>
              <button class="btn ghost" data-act="delzone" data-id="${z.id}">Eliminar</button>
            </div>
            <label class="field"><span>Nombre</span><input data-act="zname" data-id="${z.id}" value="${escapeHtml(z.name)}"></label>
            <label class="field"><span>Patrones (separados por coma)</span><input data-act="zpat" data-id="${z.id}" value="${escapeHtml((z.patterns||[]).join(", "))}"></label>
            <label class="field"><span>Nota</span><input data-act="znote" data-id="${z.id}" value="${escapeHtml(z.note||"")}"></label>
          </div>
        </div>
      `).join("")}
      <div class="row">
        <button class="btn primary" id="modalAddZone">➕ Agregar zona</button>
        <button class="btn success" id="modalSaveZones">✅ Guardar</button>
      </div>
    `;
    Modal.open("🗺️ Gestionar Zonas", html);

    const modalBody = document.getElementById("modalBody");
    modalBody.querySelector("#modalAddZone").onclick = () => {
      const z2 = zones.concat([{id: crypto.randomUUID(), name:"Nueva zona", patterns:[], note:""}]);
      Storage.set(Storage.KEYS.zones, z2);
      Modal.close(); openManageZones();
    };
    modalBody.querySelector("#modalSaveZones").onclick = () => {
      const inputs = modalBody.querySelectorAll("input[data-act]");
      const map = {};
      zones.forEach(z => map[z.id] = {...z});
      inputs.forEach(inp => {
        const id = inp.dataset.id;
        const act = inp.dataset.act;
        if(!map[id]) return;
        if(act==="zname") map[id].name = inp.value.trim() || "Zona";
        if(act==="zpat") map[id].patterns = inp.value.split(",").map(s=>s.trim()).filter(Boolean);
        if(act==="znote") map[id].note = inp.value.trim();
      });
      const out = Object.values(map);
      Storage.set(Storage.KEYS.zones, out);
      Modal.close();
      renderSummaries();
      setMsg("✅ Zonas guardadas.", "ok");
    };

    modalBody.addEventListener("click", (e) => {
      const t = e.target;
      if(t && t.dataset && t.dataset.act==="delzone"){
        const id = t.dataset.id;
        if(confirm("¿Eliminar zona?")){
          const out = zones.filter(z => z.id !== id);
          Storage.set(Storage.KEYS.zones, out);
          Modal.close(); openManageZones();
        }
      }
    });
  }

  async function openManageBuses(){
    const buses = getBuses();
    const zones = getZones();
    const assigns = getAssignments();
    const occ = occupancyByBus(assigns);

    const zoneOpts = (selected)=> zones.map(z => `<option value="${z.id}" ${selected?.includes(z.id)?"selected":""}>${escapeHtml(z.name)}</option>`).join("");

    const html = `
      <div class="muted">Define buses, capacidad (asientos) y recorrido. Puedes asociar zonas (opcional).</div>
      <div class="hr"></div>
      ${buses.map(b => {
        const used = occ[b.id]||0;
        return `
          <div class="mini-item">
            <div style="width:100%">
              <div class="row space">
                <strong>🚌 ${escapeHtml(b.code)}</strong>
                <button class="btn ghost" data-act="delbus" data-id="${b.id}">Eliminar</button>
              </div>

              <div class="grid cols-2">
                <label class="field"><span>Código / Nombre</span><input data-act="bcode" data-id="${b.id}" value="${escapeHtml(b.code)}"></label>
                <label class="field"><span>Capacidad (asientos)</span><input type="number" min="0" data-act="bcap" data-id="${b.id}" value="${escapeHtml(String(b.capacity??0))}"></label>
              </div>

              <label class="field"><span>Recorrido</span><input data-act="broute" data-id="${b.id}" value="${escapeHtml(b.route||"")}"></label>

              <label class="field">
                <span>Zonas cubiertas (Ctrl+Click para múltiples)</span>
                <select multiple size="4" data-act="bzones" data-id="${b.id}">${zoneOpts(b.zones||[])}</select>
              </label>

              <div class="row space">
                <span class="badge">Ocupación: ${used}/${Number(b.capacity||0) || "∞"}</span>
                <label class="row"><input type="checkbox" data-act="bactive" data-id="${b.id}" ${b.active!==false?"checked":""}> <span class="muted">Activo</span></label>
              </div>
            </div>
          </div>
        `;
      }).join("")}
      <div class="row">
        <button class="btn primary" id="modalAddBus">➕ Agregar bus</button>
        <button class="btn success" id="modalSaveBuses">✅ Guardar</button>
      </div>
    `;
    Modal.open("🚌 Gestionar Buses", html);

    const modalBody = document.getElementById("modalBody");

    modalBody.querySelector("#modalAddBus").onclick = () => {
      const b2 = buses.concat([{id: crypto.randomUUID(), code:`Bus ${buses.length+1}`, capacity:30, route:"(por definir)", zones:[], active:true}]);
      Storage.set(Storage.KEYS.buses, b2);
      Modal.close(); openManageBuses();
    };
    modalBody.querySelector("#modalSaveBuses").onclick = () => {
      const inputs = modalBody.querySelectorAll("input[data-act], select[data-act]");
      const map = {};
      buses.forEach(b => map[b.id] = {...b});
      inputs.forEach(el => {
        const id = el.dataset.id;
        const act = el.dataset.act;
        if(!map[id]) return;
        if(act==="bcode") map[id].code = el.value.trim() || "Bus";
        if(act==="bcap") map[id].capacity = Math.max(0, Number(el.value||0));
        if(act==="broute") map[id].route = el.value.trim();
        if(act==="bactive") map[id].active = el.checked;
        if(act==="bzones"){
          map[id].zones = Array.from(el.selectedOptions).map(o=>o.value);
        }
      });
      const out = Object.values(map);
      Storage.set(Storage.KEYS.buses, out);
      Modal.close();
      renderSummaries();
      setMsg("✅ Buses guardados.", "ok");
    };

    modalBody.addEventListener("click", (e) => {
      const t = e.target;
      if(t && t.dataset && t.dataset.act==="delbus"){
        const id = t.dataset.id;
        if(confirm("¿Eliminar bus? (No borra asignaciones históricas; solo deja de aparecer en selección)")){
          const out = buses.filter(b => b.id !== id);
          Storage.set(Storage.KEYS.buses, out);
          Modal.close(); openManageBuses();
        }
      }
    });
  }

  btnAddZone.addEventListener("click", () => {
    const zones = getZones();
    zones.push({id: crypto.randomUUID(), name:"Nueva zona", patterns:[], note:""});
    Storage.set(Storage.KEYS.zones, zones);
    renderSummaries();
    openManageZones();
  });
  btnManageZones.addEventListener("click", openManageZones);

  btnAddBus.addEventListener("click", () => {
    const buses = getBuses();
    buses.push({id: crypto.randomUUID(), code:`Bus ${buses.length+1}`, capacity:30, route:"(por definir)", zones:[], active:true});
    Storage.set(Storage.KEYS.buses, buses);
    renderSummaries();
    openManageBuses();
  });
  btnManageBuses.addEventListener("click", openManageBuses);

  let currentStudent = null;
  let currentSchema = null;
  let currentDb = null;

  function refresh(){
    const {db, schema} = loadDb();
    currentDb = db;
    currentSchema = schema;
    renderSummaries();
  }

  function onFind(){
    setMsg("", "");
    if(!currentDb || !currentSchema){
      setMsg("⚠️ Primero debes importar la base (Excel).", "warn");
      return;
    }
    const rut = rutInput.value.trim();
    if(!rut){ setMsg("Ingresa un RUT.", "warn"); return; }
    const student = findStudentByRut(currentDb, currentSchema, rut);
    const assigns = getAssignments();
    if(!student){
      setMsg("❌ No se encontró el estudiante en la base.", "bad");
      currentStudent = null;
      setStudentCard(null, {}, {});
      return;
    }
    currentStudent = student;
    const z = zoneFromStudent(student, currentSchema);
    if(z) zoneSelect.value = z.id;

    // suggested bus
    const buses = getBuses();
    const occ = occupancyByBus(assigns);
    const best = pickBusForZone(zoneSelect.value, buses, occ);
    if(best) busSelect.value = best.id;

    // route
    const b = buses.find(x=>x.id===busSelect.value);
    routeInput.value = (b?.route && b.route !== "(por definir)") ? b.route : (routeInput.value || "");
    setStudentCard(student, currentSchema, assigns);
    setMsg("✅ Estudiante cargado.", "ok");
    updateSeatInfo();
  }

  function onSuggest(){
    if(!currentStudent || !currentDb || !currentSchema){
      setMsg("Primero busca un estudiante.", "warn"); return;
    }
    const assigns = getAssignments();
    const buses = getBuses();
    const occ = occupancyByBus(assigns);

    const z = zoneFromStudent(currentStudent, currentSchema);
    if(z) zoneSelect.value = z.id;
    const best = pickBusForZone(zoneSelect.value, buses, occ);
    if(best){
      busSelect.value = best.id;
      routeInput.value = best.route || "";
      setMsg(`🤖 Sugerencia: ${best.code}.`, "ok");
    }else{
      setMsg("🤖 No hay buses candidatos (revisa buses/zonas).", "warn");
    }
    updateSeatInfo();
  }

  function onAssign(){
    if(!currentDb || !currentSchema){ setMsg("Primero importa la base.", "warn"); return; }
    if(!currentStudent){ setMsg("Primero busca un estudiante.", "warn"); return; }

    const buses = getBuses();
    const zones = getZones();
    const assigns = getAssignments();
    const occ = occupancyByBus(assigns);

    const rut = currentStudent[currentSchema.rutField] || rutInput.value;
    const rkey = rutKey(rut);
    const name = currentSchema.nameField ? (currentStudent[currentSchema.nameField]||"") : "";
    const zoneId = zoneSelect.value;
    const z = zones.find(x=>x.id===zoneId);
    const busId = busSelect.value;
    const b = buses.find(x=>x.id===busId);
    const used = occ[busId] || 0;
    const cap = Number(b?.capacity||0);
    const full = (b && cap>0 && used >= cap);

    const route = routeInput.value.trim() || (b?.route||"");
    const base = {
      rut: normRut(rut),
      rutKey: rkey,
      name: String(name||""),
      zoneId,
      zoneName: z?.name || "",
      busId: b?.id || "",
      busCode: b?.code || "",
      route: route,
      by: auth.email,
      at: new Date().toISOString()
    };

    if(full){
      // send to waitlist
      const wait = getWaitlist();
      // avoid duplicates
      const existingWait = wait.find(w => w.rutKey === rkey);
      if(!existingWait) {
        wait.unshift({
          ...base,
          status: "espera",
          reason: "Bus sin cupos",
          desiredBusId: b?.id || "",
          desiredBusCode: b?.code || ""
        });
        setWaitlist(wait);
      }
      assigns[rkey] = { ...base, status:"espera" };
      setAssignments(assigns);
      setMsg(`⏳ Bus lleno. Estudiante enviado a EN ESPERA (${b?.code}).`, "warn");
    }else{
      assigns[rkey] = { ...base, status:"asignado" };
      setAssignments(assigns);

      // if student existed in waitlist, remove it
      const wait = getWaitlist().filter(w => w.rutKey !== rkey);
      setWaitlist(wait);

      setMsg(`✅ Asignado: ${b?.code}.`, "ok");
    }

    setStudentCard(currentStudent, currentSchema, assigns);
    renderSummaries();
  }

  btnFind.addEventListener("click", onFind);
  btnSuggest.addEventListener("click", onSuggest);
  btnAssign.addEventListener("click", onAssign);
  btnClear.addEventListener("click", clearSelection);
  rutInput.addEventListener("keydown", (e)=> { if(e.key==="Enter"){ e.preventDefault(); onFind(); } });

  // Export Excel with base updated + assignments + waitlist
  btnExport.addEventListener("click", () => {
    if(typeof XLSX === "undefined"){
      alert("No se cargó la librería XLSX (CDN). Verifica conexión o publica en GitHub Pages.");
      return;
    }
    const {db, schema} = loadDb();
    if(!db?.rows?.length || !schema){ setMsg("Primero importa la base.", "warn"); return; }

    const assigns = getAssignments();
    const wait = getWaitlist();
    const buses = getBuses();
    const zones = getZones();

    // Base_Actualizada: same rows with new columns
    const headers = db.headers && db.headers.length ? db.headers.slice() : Object.keys(db.rows[0]);
    const colBus = "Bus Asignado";
    const colRoute = "Recorrido";
    const colStatus = "Estado Transporte";
    const colDigit = "Digitador";
    const colAt = "Fecha Asignación";

    const updHeaders = headers.concat([colBus, colRoute, colStatus, colDigit, colAt]);

    const baseAoa = [updHeaders];
    for(const row of db.rows){
      const r = [];
      for(const h of headers) r.push(row[h] ?? "");
      const rut = row[schema.rutField];
      const a = assigns[rutKey(rut)] || null;
      r.push(a?.status==="asignado" ? (a.busCode||"") : "");
      r.push(a?.status==="asignado" ? (a.route||"") : "");
      r.push(a?.status || "");
      r.push(a?.by || "");
      r.push(a?.at || "");
      baseAoa.push(r);
    }

    const assignedRows = Object.values(assigns).filter(a => a.status==="asignado").map(a => ({
      RUT: a.rut,
      Nombre: a.name,
      Zona: a.zoneName,
      Bus: a.busCode,
      Recorrido: a.route,
      Digitador: a.by,
      Fecha: a.at
    }));

    const waitRows = wait.map(w => ({
      RUT: w.rut,
      Nombre: w.name,
      Zona: w.zoneName,
      Bus_deseado: w.desiredBusCode || w.busCode || "",
      Motivo: w.reason || "Sin cupos",
      Digitador: w.by,
      Fecha: w.at
    }));

    const busRows = buses.map(b => {
      const used = Object.values(assigns).filter(a => a.status==="asignado" && a.busId===b.id).length;
      return {
        Bus: b.code,
        Capacidad: b.capacity,
        Ocupados: used,
        Disponible: (Number(b.capacity||0) ? (Number(b.capacity)-used) : ""),
        Recorrido: b.route,
        Activo: b.active!==false ? "Sí" : "No",
        Zonas: (b.zones||[]).map(id => zones.find(z=>z.id===id)?.name).filter(Boolean).join(" / ")
      };
    });

    const zoneRows = zones.map(z => ({
      Zona: z.name,
      Patrones: (z.patterns||[]).join(", "),
      Nota: z.note || ""
    }));

    const wb = XLSX.utils.book_new();
    const wsBase = XLSX.utils.aoa_to_sheet(baseAoa);
    XLSX.utils.book_append_sheet(wb, wsBase, "Base_Actualizada");

    const wsA = XLSX.utils.json_to_sheet(assignedRows);
    XLSX.utils.book_append_sheet(wb, wsA, "Asignaciones");

    const wsW = XLSX.utils.json_to_sheet(waitRows);
    XLSX.utils.book_append_sheet(wb, wsW, "En_espera");

    const wsB = XLSX.utils.json_to_sheet(busRows);
    XLSX.utils.book_append_sheet(wb, wsB, "Buses");

    const wsZ = XLSX.utils.json_to_sheet(zoneRows);
    XLSX.utils.book_append_sheet(wb, wsZ, "Zonas");

    const filename = `TransporteEscolar_asignaciones_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    setMsg("📤 Exportación generada.", "ok");
  });

  refresh();

  // If no base, warn
  if(!Storage.get(Storage.KEYS.db, null)){
    setMsg("⚠️ No hay base cargada. Ve a 🧰 Importar.", "warn");
  }
});
