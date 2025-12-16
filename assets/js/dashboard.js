
(function(){
  function norm(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function now(){ return Date.now(); }

  async function getMode(){
    return await TS.db.getModel(TS.db.KEYS.mode, 'local');
  }
  async function setMode(mode){
    await TS.db.setModel(TS.db.KEYS.mode, mode);
  }

  async function loadAllLocal(){
    const students = await TS.db.getModel(TS.db.KEYS.students, []);
    const buses = await TS.db.getModel(TS.db.KEYS.buses, []);
    const zonas = await TS.db.getModel(TS.db.KEYS.zonas, []);
    const assignments = await TS.db.getModel(TS.db.KEYS.assignments, []);
    const waitlist = await TS.db.getModel(TS.db.KEYS.waitlist, []);
    return {students, buses, zonas, assignments, waitlist};
  }

  function countAssignedForBus(assignments, bus_id){
    return assignments.filter(a=>a.bus_id===bus_id && a.estado==='ASIGNADO').length;
  }

  function suggestZona(student, zonas){
    const text = norm(`${student.domicilio||''} ${student.comuna||''}`);
    let best = null;
    for(const z of zonas){
      const pats = String(z.patrones||'').split(',').map(x=>norm(x.trim())).filter(Boolean);
      if(!pats.length) continue;
      const hits = pats.reduce((acc,p)=> acc + (text.includes(p)?1:0), 0);
      if(hits>0){
        if(!best || hits>best.hits) best={zona:z, hits};
      }
    }
    return best ? best.zona : null;
  }

  function suggestBus(student, zonas, buses, assignments){
    const z = suggestZona(student, zonas);
    if(!z) return null;
    // Choose first available bus servicing that zone with remaining capacity (if capacity provided)
    const candidates = buses.filter(b=>{
      const zcsv = String(b.zonas||'');
      return zcsv.split(',').map(x=>x.trim()).includes(z.nombre||z.zona_nombre||z.zona||z.id||'') || norm(zcsv).includes(norm(z.nombre||''));
    });
    for(const b of candidates){
      const cap = parseInt(b.capacidad||'0',10);
      const used = countAssignedForBus(assignments, b.bus_id);
      if(!cap || used < cap) return b;
    }
    // if all full, still return first candidate for waitlist
    return candidates[0] || null;
  }

  async function assignLocal({student, bus, digitador}){
    const data = await loadAllLocal();
    const assignments = data.assignments;
    const waitlist = data.waitlist;

    const cap = parseInt(bus.capacidad||'0',10);
    const used = countAssignedForBus(assignments, bus.bus_id);
    const entry = {
      rut: student.rut,
      bus_id: bus.bus_id,
      bus_nombre: bus.nombre,
      recorrido: bus.recorrido || '',
      digitador,
      ts: now(),
    };

    // remove previous assignment / waitlist for rut
    const newAssignments = assignments.filter(a=>a.rut!==student.rut);
    const newWaitlist = waitlist.filter(w=>w.rut!==student.rut);

    if(cap && used >= cap){
      newWaitlist.push({ ...entry, estado:'EN_ESPERA', motivo:'BUS_LLENO' });
      await TS.db.setModel(TS.db.KEYS.waitlist, newWaitlist);
      await TS.db.setModel(TS.db.KEYS.assignments, newAssignments);
      return {ok:true, status:'WAITLIST'};
    }else{
      newAssignments.push({ ...entry, estado:'ASIGNADO' });
      await TS.db.setModel(TS.db.KEYS.assignments, newAssignments);
      await TS.db.setModel(TS.db.KEYS.waitlist, newWaitlist);
      return {ok:true, status:'ASSIGNED'};
    }
  }

  async function assignSync({student, bus, digitador}){
    const res = await TS.sync.callApi('assignBus', { student, bus, digitador });
    return res;
  }

  async function upsertBusesLocal(buses){ await TS.db.setModel(TS.db.KEYS.buses, buses); }
  async function upsertZonasLocal(zonas){ await TS.db.setModel(TS.db.KEYS.zonas, zonas); }

  async function refreshFromSync(){
    const res = await TS.sync.callApi('exportData', {});
    // store into local cache for dashboards and offline read
    await TS.db.setModel(TS.db.KEYS.students, res.data.students||[]);
    await TS.db.setModel(TS.db.KEYS.buses, res.data.buses||[]);
    await TS.db.setModel(TS.db.KEYS.zonas, res.data.zonas||[]);
    await TS.db.setModel(TS.db.KEYS.assignments, res.data.assignments||[]);
    await TS.db.setModel(TS.db.KEYS.waitlist, res.data.waitlist||[]);
    return res.data;
  }

  async function setStudentsLocal(students){ await TS.db.setModel(TS.db.KEYS.students, students); }

  window.TS = window.TS || {};
  window.TS.core = {
    getMode, setMode,
    loadAllLocal, setStudentsLocal,
    suggestZona, suggestBus,
    assignLocal, assignSync,
    upsertBusesLocal, upsertZonasLocal,
    refreshFromSync
  };
})();
