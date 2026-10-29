const session = requireRole("guru");
const $ = (selector) => document.querySelector(selector);
const LETTERS = ["A", "B", "C", "D"];

let currentReport = null;

async function call(action, params = {}) {
  const result = await api(action, {
    token: session.token,
    ...params
  });

  if (result.error === "unauthorized") {
    alert("Sesi berakhir. Silakan masuk kembali.");
    logout();
  }

  return result;
}

if (session) {
  $("#g-nama").textContent = session.nama;
  $("#g-nip").textContent = session.username;
  $("#g-mapel").textContent = session.info;

  $("#logout").addEventListener("click", logout);
  $("#open-create-test").addEventListener("click", () => {
    location.href = "buat-tes.html";
  });

  loadTests();
}

async function loadTests() {
  const message = $("#tests-msg");
  const body = $("#tests-body");

  message.textContent = "Memuat daftar tes...";
  body.innerHTML = "";

  const result = await call("listTests");

  if (!result.ok) {
    message.textContent = result.error || "Daftar tes gagal dimuat.";
    return;
  }

  const tests = result.tests || [];
  message.textContent = "";

  if (tests.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">
          Belum ada tes. Klik “Buat Tes Baru” untuk memulai.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = tests.map((test) => {
    const isActive = test.status === "aktif";

    return `
      <tr>
        <td><strong>${esc(test.kode_tes)}</strong></td>
        <td>${esc(test.kelas)}</td>
        <td>${esc(test.materi)}</td>
        <td>
          <span class="status-chip ${isActive ? "status-active" : "status-closed"}">
            ${isActive ? "Aktif" : "Ditutup"}
          </span>
        </td>
        <td class="table-actions">
          <button
            type="button"
            class="btn outline small"
            data-view="${esc(test.kode_tes)}"
          >
            Hasil
          </button>
          <button
            type="button"
            class="btn ${isActive ? "secondary" : "primary"} small"
            data-toggle="${esc(test.kode_tes)}"
          >
            ${isActive ? "Tutup" : "Buka"}
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

$("#tests-body").addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.view) {
    await showResults(button.dataset.view);
  }

  if (button.dataset.toggle) {
    button.disabled = true;

    const result = await call("toggleTest", {
      kode: button.dataset.toggle
    });

    if (!result.ok) {
      alert(result.error || "Status tes gagal diubah.");
    }

    await loadTests();
  }
});

async function showResults(kode) {
  const result = await call("results", { kode });

  if (!result.ok) {
    alert(result.error || "Hasil tes gagal dimuat.");
    return;
  }

  const questionsByNumber = Object.fromEntries(
    result.questions.map((question) => [String(question.no), question])
  );

  const data = result.rows.map((row) => {
    const question = questionsByNumber[String(row.soal_id)] || {};

    return {
      ...row,
      category: classify(
        Number(row.jawaban) === Number(question.kunci_a),
        Number(row.alasan) === Number(question.kunci_r),
        Number(row.yakin_jawaban) === 1,
        Number(row.yakin_alasan) === 1
      )
    };
  });

  currentReport = { kode, data };

  const studentCount = new Set(data.map((item) => item.nis)).size;
  $("#report-title").textContent = `Hasil ${kode} · ${studentCount} siswa`;

  renderSummary(data);
  renderPerQuestion(result.questions, data);
  renderPatterns(data);
  renderStudents(result.questions, data);

  $("#report").classList.remove("hidden");
  $("#report").scrollIntoView({ behavior: "smooth" });
}

function renderSummary(data) {
  $("#summary").innerHTML = CATEGORIES.map((category) => {
    const count = data.filter((item) => item.category === category.key).length;
    const percent = data.length
      ? Math.round((count / data.length) * 100)
      : 0;

    return `
      <div class="summary-item">
        <span>${esc(category.label)}</span>
        <strong>${percent}%</strong>
        <div class="bar">
          <i class="${category.key}" data-width="${percent}"></i>
        </div>
        <small>${count} respons</small>
      </div>
    `;
  }).join("");

  requestAnimationFrame(() => {
    document.querySelectorAll(".bar i").forEach((bar) => {
      bar.style.setProperty("--w", `${bar.dataset.width}%`);
    });
  });
}

function renderPerQuestion(questions, data) {
  $("#q-head").innerHTML = `
    <tr>
      <th>Soal</th>
      <th>Respons</th>
      ${CATEGORIES.map((category) => `<th>${esc(category.label)}</th>`).join("")}
    </tr>
  `;

  $("#q-body").innerHTML = questions.map((question) => {
    const responses = data.filter(
      (item) => String(item.soal_id) === String(question.no)
    );

    return `
      <tr>
        <td><strong>Soal ${esc(question.no)}</strong></td>
        <td>${responses.length}</td>
        ${CATEGORIES.map((category) => `
          <td>${responses.filter((item) => item.category === category.key).length}</td>
        `).join("")}
      </tr>
    `;
  }).join("");
}

function renderPatterns(data) {
  const patterns = {};

  data
    .filter((item) => item.category === "miskonsepsi")
    .forEach((item) => {
      const answer = LETTERS[Number(item.jawaban) - 1] || "?";
      const reason = LETTERS[Number(item.alasan) - 1] || "?";
      const key = `Soal ${item.soal_id}: jawaban ${answer} + alasan ${reason}`;

      patterns[key] = (patterns[key] || 0) + 1;
    });

  const topPatterns = Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  $("#patterns").innerHTML = topPatterns.length
    ? topPatterns.map(([label, count]) => `
        <li>${esc(label)} <strong>(${count} siswa)</strong></li>
      `).join("")
    : "<li>Belum ada pola miskonsepsi yang tercatat.</li>";
}

function renderStudents(questions, data) {
  $("#s-head").innerHTML = `
    <tr>
      <th>Nama</th>
      <th>NIS/NISN</th>
      ${questions.map((question) => `<th>Soal ${esc(question.no)}</th>`).join("")}
    </tr>
  `;

  const students = {};

  data.forEach((item) => {
    if (!students[item.nis]) {
      students[item.nis] = {
        nama: item.nama,
        nis: item.nis,
        results: {}
      };
    }

    students[item.nis].results[item.soal_id] = item.category;
  });

  $("#s-body").innerHTML = Object.values(students).map((student) => `
    <tr>
      <td><strong>${esc(student.nama)}</strong></td>
      <td>${esc(student.nis)}</td>
      ${questions.map((question) => {
        const category = student.results[question.no];

        return `
          <td>
            ${
              category
                ? `<span class="chip ${esc(category)}">${esc(categoryLabel(category))}</span>`
                : "—"
            }
          </td>
        `;
      }).join("")}
    </tr>
  `).join("");
}

$("#export-csv").addEventListener("click", () => {
  if (!currentReport) return;

  const headers = [
    "waktu",
    "nama",
    "nis",
    "kelas",
    "soal",
    "jawaban",
    "yakin_jawaban",
    "alasan",
    "yakin_alasan",
    "kategori"
  ];

  const lines = currentReport.data.map((item) => {
    const answer = LETTERS[Number(item.jawaban) - 1] || "";
    const reason = LETTERS[Number(item.alasan) - 1] || "";

    const values = [
      item.waktu,
      item.nama,
      item.nis,
      item.kelas,
      item.soal_id,
      answer,
      Number(item.yakin_jawaban) === 1 ? "Yakin" : "Tidak yakin",
      reason,
      Number(item.yakin_alasan) === 1 ? "Yakin" : "Tidak yakin",
      categoryLabel(item.category)
    ];

    return values
      .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(",");
  });

  const csv = "\ufeff" + [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `hasil-${currentReport.kode}.csv`;
  link.click();

  URL.revokeObjectURL(url);
});