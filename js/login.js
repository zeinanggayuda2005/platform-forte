const formLogin = document.querySelector("#form-login");
const msg = document.querySelector("#msg");

if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formLogin.querySelector("button");
    const oriText = btn.textContent;
    btn.disabled = true; btn.textContent = "Memeriksa Kredensial..."; msg.textContent = "";

    const res = await api("login", {
      username: document.querySelector("#username").value.trim(),
      password: document.querySelector("#password").value
    });
    
    if (!res.ok) {
      msg.textContent = res.error;
      btn.disabled = false; btn.textContent = oriText;
      return;
    }

    setSession({ token: res.token, role: res.role, nama: res.nama, username: res.username, info: res.info });
    
    // Routing otomatis berdasarkan role
    if (res.role === "siswa") location.href = "siswa-dashboard.html";
    else if (res.role === "guru") location.href = "guru.html";
  });
}