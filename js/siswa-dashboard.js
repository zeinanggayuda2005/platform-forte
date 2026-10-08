const session = requireRole("siswa");
const msg = document.querySelector("#msg");

if (session) {
  document.querySelector("#p-nama").textContent = session.nama;
  document.querySelector("#p-nis").textContent = session.username;
  document.querySelector("#p-kelas").textContent = session.info;
  document.querySelector("#logout").addEventListener("click", logout);

  document.querySelector("#join-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "Mencari..."; msg.textContent = "";
    
    const kode = document.querySelector("#s-kode").value.trim().toUpperCase();
    const res = await api("getTest", { token: session.token, kode });
    
    if (!res.ok) {
      msg.textContent = res.error;
      btn.disabled = false; btn.textContent = "Cari & Mulai Tes";
      return;
    }

    // Simpan soal sementara lalu pindah halaman
    const testData = { kode, materi: res.materi, questions: res.questions };
    sessionStorage.setItem("forte-active-test", JSON.stringify(testData));
    location.href = "siswa-test.html";
  });
}