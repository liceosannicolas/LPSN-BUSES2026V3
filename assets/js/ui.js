/* Inclusive controls: theme, contrast, font size, speech */
(function(){
  const prefsKey = "te_ui_prefs";
  const defaults = { theme:"dark", contrast:false, fontScale:1.0, lang:"es" };

  function loadPrefs(){
    try{
      return Object.assign({}, defaults, JSON.parse(localStorage.getItem(prefsKey)||"{}"));
    }catch(e){ return {...defaults}; }
  }
  function savePrefs(p){ localStorage.setItem(prefsKey, JSON.stringify(p)); }

  function apply(p){
    document.documentElement.style.setProperty("--base", `${16 * p.fontScale}px`);
    document.body.classList.toggle("contrast", !!p.contrast);
    document.body.dataset.theme = p.theme;
    if(p.theme === "light"){
      document.documentElement.style.setProperty("--bg", "#f6f7fb");
      document.documentElement.style.setProperty("--text", "#0b1020");
      document.documentElement.style.setProperty("--muted", "rgba(11,16,32,.68)");
      document.documentElement.style.setProperty("--border", "rgba(11,16,32,.12)");
    }else{
      document.documentElement.style.setProperty("--bg", "#0b1020");
      document.documentElement.style.setProperty("--text", "#e7ecff");
      document.documentElement.style.setProperty("--muted", "rgba(231,236,255,.72)");
      document.documentElement.style.setProperty("--border", "rgba(255,255,255,.12)");
    }
  }

  function speakAll(){
    try{
      const txt = document.body.innerText.replace(/\s+/g," ").trim();
      if(!txt) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = "es-CL";
      window.speechSynthesis.speak(u);
    }catch(e){}
  }

  function hook(){
    const p = loadPrefs(); apply(p);

    const byId = (id)=>document.getElementById(id);
    const btnHome = byId("btnHome");
    const btnSpeak = byId("btnSpeak");
    const btnTheme = byId("btnTheme");
    const btnContrast = byId("btnContrast");
    const btnAPlus = byId("btnAPlus");
    const btnAMinus = byId("btnAMinus");
    const btnLang = byId("btnLang");

    if(btnHome) btnHome.onclick = ()=> window.location.href = (window.location.pathname.includes("/app/")||window.location.pathname.includes("/tools/")) ? "../index.html" : "index.html";
    if(btnSpeak) btnSpeak.onclick = ()=> speakAll();
    if(btnTheme) btnTheme.onclick = ()=> { p.theme = (p.theme==="dark"?"light":"dark"); savePrefs(p); apply(p); };
    if(btnContrast) btnContrast.onclick = ()=> { p.contrast = !p.contrast; savePrefs(p); apply(p); };
    if(btnAPlus) btnAPlus.onclick = ()=> { p.fontScale = Math.min(1.35, +(p.fontScale+0.05).toFixed(2)); savePrefs(p); apply(p); };
    if(btnAMinus) btnAMinus.onclick = ()=> { p.fontScale = Math.max(0.85, +(p.fontScale-0.05).toFixed(2)); savePrefs(p); apply(p); };
    if(btnLang) btnLang.onclick = ()=> {
      // Placeholder (ES/EN) for later extension
      p.lang = (p.lang==="es"?"en":"es"); savePrefs(p);
      alert("Idioma (demo): " + (p.lang==="es"?"Español":"English") + "\n\nSi quieres i18n completo, lo integramos en V3 con JSON de traducciones.");
    };
  }

  document.addEventListener("DOMContentLoaded", hook);
})();
