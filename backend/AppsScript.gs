/**
 * Transporte Escolar Sync – Google Apps Script (Web App)
 * - Validación por API_KEY (propiedad del script)
 * - Lista blanca de correos permitidos
 * - Hojas: Students, Buses, Zonas, Assignments, Waitlist
 */

const SHEETS = {
  students: 'Students',
  buses: 'Buses',
  zonas: 'Zonas',
  assignments: 'Assignments',
  waitlist: 'Waitlist',
};

const ALLOWED_EMAILS = [
  'belenacuna@liceosannicolas.cl',
  'franciscopinto@liceosannicolas.cl',
  'echeverri@liceosannicolas.cl',
];

function getKey_(){
  const k = PropertiesService.getScriptProperties().getProperty('API_KEY');
  return k || '';
}

function ensureSheet_(name){
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if(!sh) sh = ss.insertSheet(name);
  return sh;
}

function jsonResponse_(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e){
  return jsonResponse_({ok:true, message:'TransporteEscolar Sync online'});
}

function doPost(e){
  try{
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || '';
    const key = body.key || '';
    if(!getKey_() || key !== getKey_()){
      return jsonResponse_({ok:false, error:'API_KEY inválida o no configurada'});
    }
    const payload = body.payload || {};

    if(action === 'ping'){
      const email = String(payload.email||'').toLowerCase().trim();
      if(ALLOWED_EMAILS.indexOf(email) === -1) return jsonResponse_({ok:false, error:'Correo no autorizado'});
      return jsonResponse_({ok:true, message:'pong'});
    }

    if(action === 'exportData'){
      const data = exportData_();
      return jsonResponse_({ok:true, data});
    }

    if(action === 'assignBus'){
      const res = assignBus_(payload);
      return jsonResponse_({ok:true, ...res});
    }

    if(action === 'upsertBuses'){
      upsertBuses_(payload.buses || []);
      return jsonResponse_({ok:true});
    }

    if(action === 'upsertZonas'){
      upsertZonas_(payload.zonas || []);
      return jsonResponse_({ok:true});
    }

    if(action === 'upsertStudents'){
      upsertStudents_(payload.students || []);
      return jsonResponse_({ok:true});
    }

    return jsonResponse_({ok:false, error:'Acción no soportada: ' + action});
  }catch(err){
    return jsonResponse_({ok:false, error:String(err && err.message ? err.message : err)});
  }
}

function exportData_(){
  const ss = SpreadsheetApp.getActive();
  const out = {};
  out.students = sheetToObjects_(ensureSheet_(SHEETS.students));
  out.buses = sheetToObjects_(ensureSheet_(SHEETS.buses));
  out.zonas = sheetToObjects_(ensureSheet_(SHEETS.zonas));
  out.assignments = sheetToObjects_(ensureSheet_(SHEETS.assignments));
  out.waitlist = sheetToObjects_(ensureSheet_(SHEETS.waitlist));
  return out;
}

function sheetToObjects_(sh){
  const rng = sh.getDataRange();
  const values = rng.getValues();
  if(values.length < 2) return [];
  const headers = values[0].map(h=>String(h).trim());
  const rows = [];
  for(let i=1;i<values.length;i++){
    const o = {};
    for(let c=0;c<headers.length;c++){
      o[headers[c]] = values[i][c];
    }
    rows.push(o);
  }
  return rows;
}

function objectsToSheet_(sh, objs, headers){
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if(objs.length){
    const vals = objs.map(o=>headers.map(h=>o[h]!==undefined ? o[h] : ''));
    sh.getRange(2,1,vals.length,headers.length).setValues(vals);
  }
}

function upsertStudents_(students){
  const sh = ensureSheet_(SHEETS.students);
  const lock = LockService.getDocumentLock();
  lock.waitLock(25000);
  try{
    const existing = sheetToObjects_(sh);
    const byRut = new Map(existing.map(r=>[String(r.rut||r.RUT||'').trim(), r]));
    students.forEach(s=>{
      const rut = String(s.rut||'').trim();
      if(!rut) return;
      byRut.set(rut, {
        rut,
        email: s.email||'',
        nombres: s.nombres||'',
        apellido_paterno: s.apellido_paterno||'',
        apellido_materno: s.apellido_materno||'',
        domicilio: s.domicilio||'',
        comuna: s.comuna||'',
        nivel2026: s.nivel2026||'',
        curso2025: s.curso2025||'',
        telefono: s.telefono||'',
      });
    });
    const rows = Array.from(byRut.values());
    const headers = ['rut','email','nombres','apellido_paterno','apellido_materno','domicilio','comuna','nivel2026','curso2025','telefono'];
    objectsToSheet_(sh, rows, headers);
  }finally{
    lock.releaseLock();
  }
}

function upsertBuses_(buses){
  const sh = ensureSheet_(SHEETS.buses);
  const headers = ['bus_id','nombre','recorrido','capacidad','zonas'];
  objectsToSheet_(sh, buses, headers);
}

function upsertZonas_(zonas){
  const sh = ensureSheet_(SHEETS.zonas);
  const headers = ['zona_id','nombre','patrones'];
  objectsToSheet_(sh, zonas, headers);
}

function assignBus_(payload){
  const student = payload.student || {};
  const bus = payload.bus || {};
  const digitador = String(payload.digitador||'').toLowerCase().trim();
  if(ALLOWED_EMAILS.indexOf(digitador) === -1) throw new Error('Digitador no autorizado');

  const busId = String(bus.bus_id||'').trim();
  const busNombre = String(bus.nombre||'').trim();
  if(!busId) throw new Error('bus_id requerido');

  const rut = String(student.rut||'').trim();
  if(!rut) throw new Error('rut requerido');

  const shA = ensureSheet_(SHEETS.assignments);
  const shW = ensureSheet_(SHEETS.waitlist);
  const shB = ensureSheet_(SHEETS.buses);

  const lock = LockService.getDocumentLock();
  lock.waitLock(25000);
  try{
    const buses = sheetToObjects_(shB);
    const b = buses.find(x=>String(x.bus_id||'').trim()===busId) || bus;
    const cap = parseInt(b.capacidad||'0',10) || 0;

    // current assignments
    let assigns = sheetToObjects_(shA).filter(x=>String(x.estado||'')==='ASIGNADO');
    // remove previous for rut
    assigns = assigns.filter(x=>String(x.rut||'').trim()!==rut);
    const used = assigns.filter(x=>String(x.bus_id||'').trim()===busId).length;

    // waitlist
    let wait = sheetToObjects_(shW);
    wait = wait.filter(x=>String(x.rut||'').trim()!==rut);

    const entry = {
      rut,
      bus_id: busId,
      bus_nombre: busNombre || String(b.nombre||''),
      recorrido: String(bus.recorrido||b.recorrido||''),
      estado: '',
      digitador,
      ts: new Date(),
    };

    if(cap && used >= cap){
      entry.estado = 'EN_ESPERA';
      entry.motivo = 'BUS_LLENO';
      wait.push(entry);
      // write back
      objectsToSheet_(shW, wait, ['rut','bus_id','bus_nombre','recorrido','estado','motivo','digitador','ts']);
      objectsToSheet_(shA, assigns, ['rut','bus_id','bus_nombre','recorrido','estado','digitador','ts']);
      return {status:'WAITLIST'};
    }else{
      entry.estado = 'ASIGNADO';
      assigns.push(entry);
      objectsToSheet_(shA, assigns, ['rut','bus_id','bus_nombre','recorrido','estado','digitador','ts']);
      objectsToSheet_(shW, wait, ['rut','bus_id','bus_nombre','recorrido','estado','motivo','digitador','ts']);
      return {status:'ASSIGNED'};
    }
  }finally{
    lock.releaseLock();
  }
}
