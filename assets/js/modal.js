const Modal = (() => {
  const el = () => document.getElementById("modal");
  const title = () => document.getElementById("modalTitle");
  const body = () => document.getElementById("modalBody");
  const closeBtn = () => document.getElementById("modalClose");

  function open(t, html){
    title().textContent = t;
    body().innerHTML = html;
    el().hidden = false;
    closeBtn().focus();
  }
  function close(){ el().hidden = true; body().innerHTML=""; }

  function hook(){
    const m = el();
    if(!m) return;
    m.addEventListener("click", (e) => {
      const target = e.target;
      if(target && target.dataset && target.dataset.close) close();
    });
    closeBtn()?.addEventListener("click", close);
    document.addEventListener("keydown", (e)=> { if(e.key==="Escape" && !m.hidden) close(); });
  }

  document.addEventListener("DOMContentLoaded", hook);
  return { open, close };
})();
