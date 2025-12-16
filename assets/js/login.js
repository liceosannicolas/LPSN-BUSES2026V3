document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const pass = document.getElementById("password");
  const msg = document.getElementById("loginMsg");
  const toggle = document.getElementById("togglePass");

  toggle?.addEventListener("click", () => {
    pass.type = pass.type === "password" ? "text" : "password";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.className = "msg";
    const res = Auth.login(email.value, pass.value);
    if(res.ok){
      msg.textContent = "✅ Ingreso correcto. Redirigiendo al panel...";
      msg.classList.add("ok");
      setTimeout(()=> window.location.href = "dashboard.html", 400);
    }else{
      msg.textContent = "❌ " + res.msg;
      msg.classList.add("bad");
    }
  });
});
