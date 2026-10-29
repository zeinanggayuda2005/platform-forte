const session = requireRole("guru");
const $ = (s) => document.querySelector(s);

if (session) {
  $("#add-account-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector("button");
    const msg = $("#add-account-msg");
    
    btn.disabled = true; 
    msg.textContent = "Mendaftarkan...";
    
    // Panggil API dengan action 'addAccount'
    const res = await api("addAccount", { token: session.token, ...Object.fromEntries(f) });
    
    msg.className = `msg ${res.ok ? "ok" : ""}`;
    msg.textContent = res.ok ? "Berhasil! Akun telah didaftarkan." : res.error;
    btn.disabled = false;
    
    if (res.ok) { 
      e.target.reset(); 
    }
  });
}