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

function getCategoryLabel(key) {
  return CATEGORIES.find((category) => category.key === key)?.label || "—";
}

if (session) {
  $("#g-nama").textContent = session.nama;
  $("#g-nip").textContent = session.username;
  $("#g-mapel").textContent = session.info;

  $("#logout").addEventListener("click", logout);

  // Tombol ini opsional; HTML yang baru memakai link langsung ke buat-tes.html.
  const openCreateTestButton = $("#open-create-test");
  if (openCreateTestButton) {
    openCreateTestButton.addEventListener("click", () => {
      location.href = "buat-tes.html";
    });
  }

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
          Belum ada tes yang dipublikasikan. Buat dan publikasikan tes terlebih dahulu.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = tests.map((test) => {
    const code = esc(test.kode_tes);
    const isActive = String(test.status).toLowerCase() === "aktif";

    return `
      <tr>
        <td>
          <button
            type="button"
            class="test-open-link"
            data-view="${code}"
            aria-label="Buka hasil tes ${code}"
          >
            ${code}
          </button>
        </td>
        <td>${esc(test.kelas)}</td>
        <td>
          <button
            type="button"
            class="test-open-link material-link"
            data-view="${code}"
            aria-label="Buka hasil materi ${esc(test.materi)}"
          >
            ${esc(test.materi)}
          </button>
        </td>
        <td>
          <span class="status-chip ${isActive ? "status-active" : "status-closed"}">
            ${isActive ? "Aktif" : "Ditutup"}
          </span>
        </td>
        <td class="table-actions">
          <button
            type="button"
            class="btn outline small"
            data-view="${code}"
          >
            Hasil
          </button>
          <button
            type="button"
            class="btn ${isActive ? "secondary" : "primary"} small"
            data-toggle="${code}"
          >
            ${isActive ? "Tutup" : "Buka"}
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

$("#tests-body").addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  const toggleButton = event.target.closest("[data-toggle]");

  if (viewButton) {
    await showResults(viewButton.dataset.view);
    return;
  }

  if (toggleButton) {
    toggleButton.disabled = true;

    const result = await call("toggleTest", {
      kode: toggleButton.dataset.toggle
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

  const questions = result.questions || [];
  const questionMap = Object.fromEntries(
    questions.map((question) => [String(question.no), question])
  );

  const data = (result.rows || []).map((row) => {
    const question = questionMap[String(row.soal_id)] || {};

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

  const test = result.test || {};
  const studentCount = new Set(data.map((item) => item.nis)).size;
  const titleParts = [
    test.materi,
    test.kelas,
    kode,
    `${studentCount} siswa`
  ].filter(Boolean);

  $("#report-title").textContent = titleParts.join(" · ");

  renderSummary(data);
  renderPerQuestion(questions, data);
  renderPatterns(data);
  renderStudents(questions, data);

  currentReport = {
    kode,
    questions,
    data
  };

  $("#report").classList.remove("hidden");
  $("#report").scrollIntoView({ behavior: "smooth" });
}

function renderSummary(data) {
  $("#summary").innerHTML = CATEGORIES.map((category) => {
    const count = data.filter(
      (item) => item.category === category.key
    ).length;

    const percent = data.length
      ? Math.round((count / data.length) * 100)
      : 0;

    return `
      <div class="summary-item">
        <span>${esc(category.label)}</span>
        <strong>${percent}%</strong>
        <div class="bar">
          <i class="${esc(category.key)}" data-width="${percent}"></i>
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
      <th>Isi Soal</th>
      <th>Kunci Jawaban</th>
      <th>Kunci Alasan</th>
      <th>Respons</th>
      ${CATEGORIES.map(
        (category) => `<th>${esc(category.label)}</th>`
      ).join("")}
    </tr>
  `;

  if (questions.length === 0) {
    $("#q-body").innerHTML = `
      <tr><td colspan="9" class="empty-cell">Soal tidak ditemukan.</td></tr>
    `;
    return;
  }

  $("#q-body").innerHTML = questions.map((question) => {
    const responses = data.filter(
      (item) => String(item.soal_id) === String(question.no)
    );

    return `
      <tr>
        <td><strong>Soal ${esc(question.no)}</strong></td>
        <td class="question-text-cell">${esc(question.soal)}</td>
        <td>${esc(choiceText(question, question.kunci_a, "a"))}</td>
        <td>${esc(choiceText(question, question.kunci_r, "r"))}</td>
        <td>${responses.length}</td>
        ${CATEGORIES.map((category) => `
          <td>
            ${responses.filter(
              (item) => item.category === category.key
            ).length}
          </td>
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

function choiceText(question, value, tier) {
  const index = Number(value);

  if (!Number.isInteger(index) || index < 1 || index > 4) {
    return "—";
  }

  const letter = LETTERS[index - 1];
  const text = question[`${tier}${index}`] || "";

  return `${letter}. ${text}`;
}

function renderStudents(questions, data) {
  $("#s-head").innerHTML = `
    <tr>
      <th>Nama</th>
      <th>NIS/NISN</th>
      <th>Soal</th>
      <th>Jawaban siswa</th>
      <th>Keyakinan</th>
      <th>Alasan siswa</th>
      <th>Keyakinan alasan</th>
      <th>Klasifikasi</th>
    </tr>
  `;

  if (data.length === 0) {
    $("#s-body").innerHTML = `
      <tr>
        <td colspan="8" class="empty-cell">
          Belum ada siswa yang mengerjakan tes ini.
        </td>
      </tr>
    `;
    return;
  }

  const questionMap = Object.fromEntries(
    questions.map((question) => [String(question.no), question])
  );

  const sortedData = [...data].sort((a, b) => {
    const nameOrder = String(a.nama).localeCompare(String(b.nama), "id");
    if (nameOrder !== 0) return nameOrder;
    return Number(a.soal_id) - Number(b.soal_id);
  });

  $("#s-body").innerHTML = sortedData.map((item) => {
    const question = questionMap[String(item.soal_id)] || {};
    const answerCorrect =
      Number(item.jawaban) === Number(question.kunci_a);
    const reasonCorrect =
      Number(item.alasan) === Number(question.kunci_r);

    return `
      <tr>
        <td><strong>${esc(item.nama)}</strong></td>
        <td>${esc(item.nis)}</td>
        <td>
          <strong>Soal ${esc(item.soal_id)}</strong>
          <small class="detail-question">${esc(question.soal || "")}</small>
        </td>
        <td>
          <span>${esc(choiceText(question, item.jawaban, "a"))}</span>
          <small class="answer-mark ${answerCorrect ? "is-correct" : "is-wrong"}">
            ${answerCorrect ? "Benar" : "Belum tepat"}
          </small>
        </td>
        <td>${Number(item.yakin_jawaban) === 1 ? "Yakin" : "Tidak yakin"}</td>
        <td>
          <span>${esc(choiceText(question, item.alasan, "r"))}</span>
          <small class="answer-mark ${reasonCorrect ? "is-correct" : "is-wrong"}">
            ${reasonCorrect ? "Benar" : "Belum tepat"}
          </small>
        </td>
        <td>${Number(item.yakin_alasan) === 1 ? "Yakin" : "Tidak yakin"}</td>
        <td>
          <span class="chip ${esc(item.category)}">
            ${esc(getCategoryLabel(item.category))}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

$("#export-csv").addEventListener("click", () => {
  if (!currentReport) return;

  const headers = [
    "waktu",
    "nama",
    "nis",
    "kelas",
    "nomor_soal",
    "isi_soal",
    "jawaban_siswa",
    "keyakinan_jawaban",
    "alasan_siswa",
    "keyakinan_alasan",
    "klasifikasi"
  ];

  const questionMap = Object.fromEntries(
    currentReport.questions.map((question) => [
      String(question.no),
      question
    ])
  );

  const lines = currentReport.data.map((item) => {
    const question = questionMap[String(item.soal_id)] || {};

    const values = [
      item.waktu,
      item.nama,
      item.nis,
      item.kelas,
      item.soal_id,
      question.soal,
      choiceText(question, item.jawaban, "a"),
      Number(item.yakin_jawaban) === 1 ? "Yakin" : "Tidak yakin",
      choiceText(question, item.alasan, "r"),
      Number(item.yakin_alasan) === 1 ? "Yakin" : "Tidak yakin",
      getCategoryLabel(item.category)
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