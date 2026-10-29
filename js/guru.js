const session = requireRole("guru");
const $ = (s) => document.querySelector(s);
const LETTERS = ["A", "B", "C", "D"];
let current = null;

async function call(action, params = {}) {
  const res = await api(action, { token: session.token, ...params });
  if (res.error === "unauthorized") { alert("Sesi berakhir."); logout(); }
  return res;
}

if (session) {
  $("#g-nama").textContent = session.nama;
  $("#g-nip").textContent = session.username;
  $("#g-mapel").textContent = session.info;
  $("#logout").addEventListener("click", logout);
  loadTests();
}

// ================= FITUR TAMBAH BANYAK SOAL SEKALIGUS =================
const qContainer = document.querySelector("#questions-container");
const btnAddMore = document.querySelector("#btn-add-more");

if (btnAddMore && qContainer) {
  // Tombol untuk menggandakan form soal
  btnAddMore.addEventListener("click", () => {
    const blocks = qContainer.querySelectorAll(".question-block");
    const clone = blocks[0].cloneNode(true);
    
    // Kosongkan isian di form baru
    clone.querySelectorAll("input, textarea").forEach(el => el.value = "");
    
    // Update nomor soal
    clone.querySelector(".q-number").textContent = blocks.length + 1;
    
    // Tampilkan tombol hapus untuk form tambahan ini
    const btnRemove = clone.querySelector(".remove-q");
    btnRemove.classList.remove("hidden");
    btnRemove.addEventListener("click", () => {
      clone.remove();
      updateQNumbers();
    });

    qContainer.appendChild(clone);
  });
}

function updateQNumbers() {
  qContainer.querySelectorAll(".question-block").forEach((block, index) => {
    block.querySelector(".q-number").textContent = index + 1;
  });
}

// Logika untuk mengirim (Submit) Array Data Soal
$("#add-q-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']");
  const msg = $("#add-q-msg");
  
  const materi = document.querySelector("#q-materi").value.trim();
  const blocks = qContainer.querySelectorAll(".question-block");
  const questionsData = [];

  // Looping untuk merangkum semua form kotak soal
  blocks.forEach(block => {
    questionsData.push({
      soal: block.querySelector("[name='soal']").value,
      a1: block.querySelector("[name='a1']").value,
      a2: block.querySelector("[name='a2']").value,
      a3: block.querySelector("[name='a3']").value,
      a4: block.querySelector("[name='a4']").value,
      kunci_a: block.querySelector("[name='kunci_a']").value,
      r1: block.querySelector("[name='r1']").value,
      r2: block.querySelector("[name='r2']").value,
      r3: block.querySelector("[name='r3']").value,
      r4: block.querySelector("[name='r4']").value,
      kunci_r: block.querySelector("[name='kunci_r']").value,
    });
  });

  btn.disabled = true; 
  msg.textContent = `Menyimpan ${questionsData.length} soal sekaligus...`;
  msg.className = "msg";

  // Memanggil fungsi baru di API bernama 'addQuestionsBatch'
  const res = await call("addQuestionsBatch", { 
    materi: materi,
    data_soal: JSON.stringify(questionsData) 
  });

  msg.className = `msg ${res.ok ? "ok" : ""}`;
  msg.textContent = res.ok ? `Berhasil! ${questionsData.length} soal sukses ditambahkan ke bank soal.` : res.error;
  btn.disabled = false;
  
  if(res.ok) {
    e.target.reset();
    // Hapus blok tambahan, kembalikan menjadi 1 form saja
    const extraBlocks = qContainer.querySelectorAll(".question-block:not(:first-child)");
    extraBlocks.forEach(b => b.remove());
  }
});
// ======================================================================

// Daftar Tes & Pembuatan Tes
async function loadTests() {
  const res = await call("listTests");
  const tests = res.tests || [];
  $("#tests-body").innerHTML = tests.map((t) => `
    <tr>
      <td><strong>${esc(t.kode_tes)}</strong></td><td>${esc(t.kelas)}</td><td>${esc(t.materi)}</td>
      <td><span style="color: ${t.status==='aktif'?'var(--green)':'var(--text-muted)'}; font-weight:600;">${esc(t.status).toUpperCase()}</span></td>
      <td class="text-right">
        <button class="btn small outline" data-view="${esc(t.kode_tes)}">Hasil</button>
        <button class="btn small ${t.status==='aktif'?'secondary':'primary'}" data-toggle="${esc(t.kode_tes)}">
          ${t.status==="aktif" ? "Tutup" : "Buka"}
        </button>
      </td>
    </tr>`).join("") || `<tr><td colspan="5" class="center-text">Belum ada tes.</td></tr>`;
}

$("#tests-body").addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.view) showResults(btn.dataset.view);
  if (btn.dataset.toggle) { btn.disabled = true; await call("toggleTest", { kode: btn.dataset.toggle }); loadTests(); }
});

$("#create-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const res = await call("createTest", { kelas: f.get("kelas").trim(), materi: f.get("materi").trim() });
  const msg = $("#create-msg");
  msg.className = `msg ${res.ok ? "ok" : ""}`;
  msg.textContent = res.ok ? `Berhasil! Kode Tes: ${res.kode}` : res.error;
  if (res.ok) { e.target.reset(); loadTests(); }
});

// Hasil & Analisis
async function showResults(kode) {
  const res = await call("results", { kode });
  if (!res.ok) return alert(res.error);

  const keys = Object.fromEntries(res.questions.map((q) => [String(q.no), q]));
  const data = res.rows.map((r) => {
    const q = keys[String(r.soal_id)] || {};
    const k = classify(r.jawaban === q.kunci_a, r.alasan === q.kunci_r, r.yakin_jawaban === 1, r.yakin_alasan === 1);
    return { ...r, k };
  });

  current = { kode, data };
  $("#report").classList.remove("hidden");
  $("#report-title").textContent = `Hasil: ${kode} (${new Set(data.map(d=>d.nis)).size} Siswa)`;

  renderSummary(data); renderPerQuestion(res.questions, data);
  renderPatterns(data); renderStudents(res.questions, data);
  $("#report").scrollIntoView({ behavior: "smooth" });
}

function renderSummary(data) {
  $("#summary").innerHTML = CATEGORIES.map((c) => {
    const n = data.filter((d) => d.k === c.key).length;
    const pct = data.length ? Math.round((n / data.length) * 100) : 0;
    return `<div class="summary-item"><span>${c.label}</span><strong>${pct}%</strong><div class="bar"><i class="${c.key}" data-w="${pct}"></i></div></div>`;
  }).join("");
  setTimeout(() => { document.querySelectorAll(".bar i").forEach((el) => { el.style.setProperty("--w", `${el.dataset.w}%`); }); }, 50);
}

function renderPerQuestion(questions, data) {
  $("#q-head").innerHTML = `<tr><th>Soal</th><th>Masuk</th>${CATEGORIES.map((c) => `<th>${c.label}</th>`).join("")}</tr>`;
  $("#q-body").innerHTML = questions.map((q) => {
    const d = data.filter((x) => String(x.soal_id) === String(q.no));
    return `<tr><td><strong>Soal ${esc(q.no)}</strong></td><td>${d.length}</td>${CATEGORIES.map((c) => `<td>${d.filter((x) => x.k === c.key).length}</td>`).join("")}</tr>`;
  }).join("");
}

function renderPatterns(data) {
  const count = {};
  data.filter((d) => d.k === "miskonsepsi").forEach((d) => {
    const key = `Soal ${d.soal_id}: Jawaban ${LETTERS[d.jawaban - 1]} + Alasan ${LETTERS[d.alasan - 1]}`;
    count[key] = (count[key] || 0) + 1;
  });
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $("#patterns").innerHTML = top.length ? top.map(([k, n]) => `<li>${esc(k)} (<strong>${n} siswa</strong>)</li>`).join("") : "<li>Belum ada pola signifikan.</li>";
}

function renderStudents(questions, data) {
  $("#s-head").innerHTML = `<tr><th>Nama</th><th>NIS</th>${questions.map((q) => `<th>S${esc(q.no)}</th>`).join("")}</tr>`;
  const byStudent = {};
  data.forEach((d) => {
    if (!byStudent[d.nis]) byStudent[d.nis] = { nama: d.nama, nis: d.nis, hasil: {} };
    byStudent[d.nis].hasil[d.soal_id] = d.k;
  });
  $("#s-body").innerHTML = Object.values(byStudent).map((s) => `
    <tr>
      <td><strong>${esc(s.nama)}</strong></td><td>${esc(s.nis)}</td>
      ${questions.map((q) => {
        const k = s.hasil[q.no];
        return `<td>${k ? `<span class="chip ${k}">${categoryLabel(k).split(" ")[0]}</span>` : "-"}</td>`;
      }).join("")}
    </tr>`).join("");
}

$("#export-csv").addEventListener("click", () => {
  if (!current) return;
  const head = ["waktu", "nama", "nis", "kelas", "soal", "jawaban", "yakin_jawaban", "alasan", "yakin_alasan", "kategori"];
  const lines = current.data.map((d) => [
    d.waktu, d.nama, d.nis, d.kelas, d.soal_id, LETTERS[d.jawaban - 1], d.yakin_jawaban ? "Yakin" : "Tidak",
    LETTERS[d.alasan - 1], d.yakin_alasan ? "Yakin" : "Tidak", categoryLabel(d.k)
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const blob = new Blob(["\ufeff" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `hasil-${current.kode}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
});

// Listener untuk Form Tambah Akun Pengguna Baru
$("#add-account-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const btn = e.target.querySelector("button");
  const msg = $("#add-account-msg");
  
  btn.disabled = true; 
  msg.textContent = "Mendaftarkan...";
  
  const res = await call("addAccount", Object.fromEntries(f));
  msg.className = `msg ${res.ok ? "ok" : ""}`;
  msg.textContent = res.ok ? "Akun berhasil didaftarkan!" : res.error;
  btn.disabled = false;
  
  if (res.ok) { 
    e.target.reset(); 
  }
});