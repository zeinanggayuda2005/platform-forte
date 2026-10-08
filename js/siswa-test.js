const session = requireRole("siswa");
const activeTestStr = sessionStorage.getItem("forte-active-test");
if (!activeTestStr) location.replace("siswa-dashboard.html");

const activeTest = JSON.parse(activeTestStr);
const form = document.querySelector("#test-form");
const msgEl = document.querySelector("#msg");
const submitBtn = document.querySelector("#submit-btn");

function options(name, items) {
  return items.map((text, i) => `<label class="option"><input type="radio" name="${name}" value="${i + 1}" required><span>${esc(text)}</span></label>`).join("");
}
function yesNo(name) {
  return `<label class="option"><input type="radio" name="${name}" value="1" required><span>Yakin</span></label><label class="option"><input type="radio" name="${name}" value="0" required><span>Tidak yakin</span></label>`;
}

function render() {
  document.querySelector("#who").textContent = `${session.nama} • ${session.info}`;
  document.querySelector("#test-mapel").textContent = `Topik: ${activeTest.materi}`;
  document.querySelector("#questions").innerHTML = activeTest.questions.map((q) => `
    <article class="card">
      <h2>Soal ${esc(q.no)}</h2>
      <p style="margin-bottom: 12px">${esc(q.soal)}</p>
      <fieldset class="tier"><legend>Tier 1 — Pilih Jawaban</legend>${options(`q${q.no}-a`, q.jawaban)}</fieldset>
      <fieldset class="tier"><legend>Tier 2 — Yakin dengan jawabanmu?</legend>${yesNo(`q${q.no}-c1`)}</fieldset>
      <fieldset class="tier"><legend>Tier 3 — Pilih Alasan</legend>${options(`q${q.no}-r`, q.alasan)}</fieldset>
      <fieldset class="tier"><legend>Tier 4 — Yakin dengan alasanmu?</legend>${yesNo(`q${q.no}-c2`)}</fieldset>
    </article>`).join("");
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!confirm("Kirim jawaban sekarang? Pastikan sudah diteliti.")) return;
    
    const f = new FormData(form);
    const answers = activeTest.questions.map((q) => ({
      no: q.no, jawaban: Number(f.get(`q${q.no}-a`)), yakin_jawaban: Number(f.get(`q${q.no}-c1`)),
      alasan: Number(f.get(`q${q.no}-r`)), yakin_alasan: Number(f.get(`q${q.no}-c2`))
    }));

    submitBtn.disabled = true; submitBtn.textContent = "Mengirim..."; msgEl.textContent = "";

    const res = await api("submit", { token: session.token, kode: activeTest.kode, answers: JSON.stringify(answers) });
    if (res.ok) {
      sessionStorage.removeItem("forte-active-test");
      form.classList.add("hidden");
      document.querySelector("#done").classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      msgEl.textContent = res.error; submitBtn.disabled = false; submitBtn.textContent = "Kirim Semua Jawaban";
    }
  });
}
render();