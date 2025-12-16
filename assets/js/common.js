
/* Common UI + accessibility controls */
(function(){
  const LS = {
    theme: 'ts_theme',
    font: 'ts_font_scale',
    lang: 'ts_lang',
  };

  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function setTheme(theme){
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(LS.theme, theme);
  }
  function toggleTheme(){
    const cur = document.documentElement.dataset.theme || 'dark';
    setTheme(cur === 'dark' ? 'light' : 'dark');
    toast(`🌓 Tema: ${document.documentElement.dataset.theme}`);
  }

  function setFontScale(scale){
    scale = Math.max(0.85, Math.min(1.35, scale));
    document.documentElement.style.fontSize = (16*scale)+'px';
    localStorage.setItem(LS.font, String(scale));
  }
  function incFont(){ setFontScale((parseFloat(localStorage.getItem(LS.font)||'1')||1)+0.05); toast('A+ Tamaño de letra'); }
  function decFont(){ setFontScale((parseFloat(localStorage.getItem(LS.font)||'1')||1)-0.05); toast('A− Tamaño de letra'); }

  let speaking=false, synth = window.speechSynthesis;
  function speakAll(){
    if(!('speechSynthesis' in window)){ toast('🗣️ Tu navegador no soporta narrador'); return; }
    if(speaking){ synth.cancel(); speaking=false; toast('🗣️ Narrador detenido'); return; }
    const text = document.body.innerText.replace(/\s+/g,' ').trim();
    if(!text){ toast('🗣️ Sin contenido para leer'); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = (localStorage.getItem(LS.lang) || 'es').startsWith('es') ? 'es-CL' : 'en-US';
    u.rate = 1.0; u.pitch = 1.0;
    u.onend = ()=>{ speaking=false; };
    speaking=true;
    synth.cancel();
    synth.speak(u);
    toast('🗣️ Leyendo contenido');
  }

  const i18n = {
    es: { home:'Inicio', login:'Login', panel:'Panel', importer:'Importar', buses:'Dashboard Buses', cursos:'Dashboard Cursos', help:'Guía', search:'Buscar', sync:'Modo Sync', local:'Modo Local' },
    en: { home:'Home', login:'Login', panel:'Panel', importer:'Import', buses:'Bus Dashboard', cursos:'Course Dashboard', help:'Guide', search:'Search', sync:'Sync mode', local:'Local mode' },
    fr: { home:'Accueil', login:'Connexion', panel:'Panneau', importer:'Importer', buses:'Tableau Bus', cursos:'Tableau Cours', help:'Guide', search:'Rechercher', sync:'Mode Sync', local:'Mode Local' }
  };

  function applyLang(lang){
    localStorage.setItem(LS.lang, lang);
    const dict = i18n[lang] || i18n.es;
    $all('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if(dict[key]) el.textContent = dict[key];
    });
    toast(`🌐 Idioma: ${lang.toUpperCase()}`);
  }
  function toggleLang(){
    const cur = localStorage.getItem(LS.lang) || 'es';
    const next = cur === 'es' ? 'en' : (cur === 'en' ? 'fr' : 'es');
    applyLang(next);
  }

  function toast(msg){
    let t = $('#toast');
    if(!t){
      t = document.createElement('div');
      t.id='toast';
      t.className='toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
  }
  window.TS = window.TS || {};
  window.TS.toast = toast;
  window.TS.ui = { toggleTheme, incFont, decFont, speakAll, toggleLang, applyLang, setTheme, setFontScale };

  // Initialize on load
  document.addEventListener('DOMContentLoaded', ()=>{
    const theme = localStorage.getItem(LS.theme) || 'dark';
    document.documentElement.dataset.theme = theme;
    const scale = parseFloat(localStorage.getItem(LS.font) || '1') || 1;
    setFontScale(scale);
    const lang = localStorage.getItem(LS.lang) || 'es';
    applyLang(lang);

    // Wire toolbar if present
    const btnTheme = document.querySelector('[data-action="theme"]');
    const btnAPlus = document.querySelector('[data-action="fontPlus"]');
    const btnAMinus = document.querySelector('[data-action="fontMinus"]');
    const btnSpeak = document.querySelector('[data-action="speak"]');
    const btnLang = document.querySelector('[data-action="lang"]');
    if(btnTheme) btnTheme.addEventListener('click', toggleTheme);
    if(btnAPlus) btnAPlus.addEventListener('click', incFont);
    if(btnAMinus) btnAMinus.addEventListener('click', decFont);
    if(btnSpeak) btnSpeak.addEventListener('click', speakAll);
    if(btnLang) btnLang.addEventListener('click', toggleLang);
  });
})();
