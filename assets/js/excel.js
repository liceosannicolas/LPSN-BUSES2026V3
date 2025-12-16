
(function(){
  function normalizeHeader(h){
    return String(h||'')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function guessMapping(headers){
    const norm = headers.map(normalizeHeader);
    function findOne(patterns){
      for(const p of patterns){
        const idx = norm.findIndex(h=>h.includes(p));
        if(idx>=0) return idx;
      }
      return -1;
    }
    return {
      email: findOne(['direccion de correo electronico','correo electronico','email']),
      rut: findOne(['r.u.n estudiante','run estudiante','rut','r.u.n','run']),
      nombres: findOne(['nombres del estudiante','nombres']),
      apPat: findOne(['apellido paterno','apellidopaterno']),
      apMat: findOne(['apellido materno','apellidomaterno']),
      domicilio: findOne(['domicilio estudiante','domicilio']),
      comuna: findOne(['comuna de residencia','comuna']),
      nivel2026: findOne(['nivel 2026','nivel']),
      curso2025: findOne(['curso 2025','curso']),
      telefono: findOne(['telefono del estudiante','telefono'])
    };
  }

  function cleanRut(r){
    return String(r||'').replace(/\./g,'').trim();
  }

  async function parseExcelFile(file, sheetName=null){
    if(!window.XLSX) throw new Error('Librería XLSX no cargó. Revisa tu conexión.');
    const buf = await file.arrayBuffer();
    // Robust read: Uint8Array + type:'array'
    const wb = XLSX.read(new Uint8Array(buf), { type:'array', cellDates:true, raw:false });
    const sheets = wb.SheetNames;
    const chosen = sheetName && sheets.includes(sheetName) ? sheetName : sheets[0];
    const ws = wb.Sheets[chosen];
    const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' }); // 2D
    const headers = data[0] || [];
    const map = guessMapping(headers);

    const rows = [];
    for(let i=1;i<data.length;i++){
      const r = data[i];
      const rut = map.rut>=0 ? cleanRut(r[map.rut]) : '';
      if(!rut) continue;
      rows.push({
        rut,
        email: map.email>=0 ? String(r[map.email]||'').trim() : '',
        nombres: map.nombres>=0 ? String(r[map.nombres]||'').trim() : '',
        apellido_paterno: map.apPat>=0 ? String(r[map.apPat]||'').trim() : '',
        apellido_materno: map.apMat>=0 ? String(r[map.apMat]||'').trim() : '',
        domicilio: map.domicilio>=0 ? String(r[map.domicilio]||'').trim() : '',
        comuna: map.comuna>=0 ? String(r[map.comuna]||'').trim() : '',
        nivel2026: map.nivel2026>=0 ? String(r[map.nivel2026]||'').trim() : '',
        curso2025: map.curso2025>=0 ? String(r[map.curso2025]||'').trim() : '',
        telefono: map.telefono>=0 ? String(r[map.telefono]||'').trim() : '',
      });
    }
    return { sheet: chosen, sheets, headers, mapping: map, students: rows };
  }

  function buildExportWorkbook({students, buses, zonas, assignments, waitlist}){
    if(!window.XLSX) throw new Error('Librería XLSX no cargó. Revisa tu conexión.');
    // Build Base_Actualizada by joining assignments onto students
    const assignByRut = new Map((assignments||[]).map(a=>[a.rut, a]));
    const base = (students||[]).map(s=>{
      const a = assignByRut.get(s.rut);
      return {
        RUT: s.rut,
        Correo: s.email,
        Nombres: s.nombres,
        ApellidoPaterno: s.apellido_paterno,
        ApellidoMaterno: s.apellido_materno,
        Domicilio: s.domicilio,
        Comuna: s.comuna,
        Nivel2026: s.nivel2026,
        Curso2025: s.curso2025,
        Telefono: s.telefono,
        Bus_Asignado: a ? a.bus_nombre : '',
        Recorrido: a ? a.recorrido : '',
        Estado: a ? a.estado : '',
        Digitador: a ? a.digitador : '',
        Fecha: a ? new Date(a.ts).toISOString() : ''
      };
    });

    const wb = XLSX.utils.book_new();
    function addSheet(name, arr){
      const ws = XLSX.utils.json_to_sheet(arr);
      XLSX.utils.book_append_sheet(wb, ws, name.substring(0,31));
    }
    addSheet('Base_Actualizada', base);
    addSheet('Asignaciones', assignments||[]);
    addSheet('En_espera', waitlist||[]);
    addSheet('Buses', buses||[]);
    addSheet('Zonas', zonas||[]);
    return wb;
  }

  function downloadWorkbook(wb, filename){
    XLSX.writeFile(wb, filename);
  }

  window.TS = window.TS || {};
  window.TS.excel = { parseExcelFile, buildExportWorkbook, downloadWorkbook };
})();
