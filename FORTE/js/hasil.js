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

function choiceText(question, tier, value) {
  const index = Number(value);
  if (!Number.isInteger(index) || index < 1 || index > 4) return "—";
  return LETTERS[index - 1] + ". " + String(question[tier + index] || "");
}

function confidenceLabel(value) {
  return Number(value) === 1 ? "Yakin" : "Tidak yakin";
}

function classifyRows(questions, rows) {
  const questionMap = Object.fromEntries(
    questions.map((question) => [String(question.no), question])
  );

  return rows.map((row) => {
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
}

function renderSummary(data) {
  const summary = $("#summary");
  const total = data.length;
  const studentCount = new Set(data.map((item) => String(item.nis))).size;
  $("#response-count").textContent = total + " jawaban tercatat dari " + studentCount + " siswa";

  summary.innerHTML = CATEGORIES.map((category) => {
    const count = data.filter((item) => item.category === category.key).length;
    const percent = total ? Math.round((count / total) * 100) : 0;

    return '<article class="report-summary-card">' +
      '<span>' + esc(category.label) + '</span>' +
      '<strong>' + percent + '%</strong>' +
      '<div class="bar"><i class="' + esc(category.key) + '" style="--w:' + percent + '%"></i></div>' +
      '<small>' + count + ' jawaban</small>' +
    '</article>';
  }).join("");
}

function renderQuestions(questions, data) {
  const container = $("#question-report");

  if (!questions.length) {
    container.innerHTML = '<p class="report-empty">Soal tidak ditemukan untuk tes ini.</p>';
    return;
  }

  container.innerHTML = questions.map((question) => {
    const responses = data.filter(
      (item) => String(item.soal_id) === String(question.no)
    );

    const categoryCounts = CATEGORIES.map((category) => {
      const count = responses.filter(
        (item) => item.category === category.key
      ).length;

      return '<div class="report-category-count">' +
        '<span>' + esc(category.label) + '</span>' +
        '<strong>' + count + ' siswa</strong>' +
      '</div>';
    }).join("");

    return '<article class="report-question-card">' +
      '<h3>Soal ' + esc(question.no) + '</h3>' +
      '<p class="report-question-copy">' + esc(question.soal) + '</p>' +
      (question.gambar_url
        ? '<figure class="question-image-display report-question-image"><img src="' + esc(question.gambar_url) + '" alt="Gambar pada soal ' + esc(question.no) + '" loading="lazy"></figure>'
        : '') +
      '<div class="report-key-grid">' +
        '<div class="report-key-item"><span class="report-key-label">Kunci jawaban</span><strong>' +
          esc(choiceText(question, "a", question.kunci_a)) + '</strong></div>' +
        '<div class="report-key-item"><span class="report-key-label">Kunci alasan</span><strong>' +
          esc(choiceText(question, "r", question.kunci_r)) + '</strong></div>' +
      '</div>' +
      '<div class="report-category-counts">' + categoryCounts + '</div>' +
    '</article>';
  }).join("");
}

function renderPatterns(data) {
  const counts = {};

  data.filter((item) => item.category === "miskonsepsi").forEach((item) => {
    const answer = LETTERS[Number(item.jawaban) - 1] || "?";
    const reason = LETTERS[Number(item.alasan) - 1] || "?";
    const label = "Soal " + item.soal_id + ": jawaban " + answer + " + alasan " + reason;
    counts[label] = (counts[label] || 0) + 1;
  });

  const topPatterns = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  $("#patterns").innerHTML = topPatterns.length
    ? topPatterns.map((item) => '<li>' + esc(item[0]) +
        ' <strong>(' + item[1] + ' jawaban)</strong></li>').join("")
    : '<li>Belum ada pola miskonsepsi yang tercatat.</li>';
}

function renderStudents(questions, data) {
  const container = $("#student-results");

  if (!data.length) {
    container.innerHTML = '<p class="report-empty">Belum ada siswa yang mengerjakan tes ini.</p>';
    return;
  }

  const questionMap = Object.fromEntries(
    questions.map((question) => [String(question.no), question])
  );
  const students = {};

  data.forEach((item) => {
    const id = String(item.nis);
    if (!students[id]) {
      students[id] = {
        nama: item.nama,
        nis: item.nis,
        kelas: item.kelas,
        responses: []
      };
    }
    students[id].responses.push(item);
  });

  container.innerHTML = Object.values(students)
    .sort((a, b) => String(a.nama).localeCompare(String(b.nama), "id"))
    .map((student) => {
      const responseCards = student.responses
        .sort((a, b) => Number(a.soal_id) - Number(b.soal_id))
        .map((item) => {
          const question = questionMap[String(item.soal_id)] || {};
          const answerCorrect = Number(item.jawaban) === Number(question.kunci_a);
          const reasonCorrect = Number(item.alasan) === Number(question.kunci_r);

          return '<article class="student-response-card">' +
            '<div class="student-response-header">' +
              '<h4 class="student-response-question">Soal ' + esc(item.soal_id) + '</h4>' +
              '<span class="chip ' + esc(item.category) + '">' +
                esc(categoryLabel(item.category)) + '</span>' +
            '</div>' +
            '<div class="student-response-grid">' +
              '<div class="student-response-item"><span class="student-response-label">Jawaban siswa</span>' +
                '<strong class="student-response-value">' + esc(choiceText(question, "a", item.jawaban)) + '</strong>' +
                '<small class="answer-mark ' + (answerCorrect ? 'is-correct' : 'is-wrong') + '">' +
                  (answerCorrect ? 'Benar' : 'Belum tepat') + '</small></div>' +
              '<div class="student-response-item"><span class="student-response-label">Keyakinan jawaban</span>' +
                '<strong class="student-response-value">' + confidenceLabel(item.yakin_jawaban) + '</strong></div>' +
              '<div class="student-response-item"><span class="student-response-label">Alasan siswa</span>' +
                '<strong class="student-response-value">' + esc(choiceText(question, "r", item.alasan)) + '</strong>' +
                '<small class="answer-mark ' + (reasonCorrect ? 'is-correct' : 'is-wrong') + '">' +
                  (reasonCorrect ? 'Benar' : 'Belum tepat') + '</small></div>' +
              '<div class="student-response-item"><span class="student-response-label">Keyakinan alasan</span>' +
                '<strong class="student-response-value">' + confidenceLabel(item.yakin_alasan) + '</strong></div>' +
            '</div>' +
          '</article>';
        }).join("");

      return '<article class="student-result-card">' +
        '<header class="student-result-header"><div>' +
          '<h3>' + esc(student.nama) + '</h3>' +
          '<p><span>NIS/NISN</span><strong>' + esc(student.nis) + '</strong>' +
          '<span>Kelas</span><strong>' + esc(student.kelas) + '</strong></p>' +
        '</div></header>' +
        '<div class="student-response-list">' + responseCards + '</div>' +
      '</article>';
    }).join("");
}

async function typesetReport() {
  if (!window.MathJax || !window.MathJax.typesetPromise) return;

  try {
    await window.MathJax.startup.promise;
    await window.MathJax.typesetPromise([$("#report-page-content")]);
  } catch (error) {
    console.warn("Rumus matematika belum dapat dirender:", error);
  }
}

async function loadReport() {
  if (!session) return;

  const code = new URLSearchParams(location.search).get("kode");
  const message = $("#report-msg");

  if (!code) {
    message.textContent = "Token tes tidak ditemukan pada alamat halaman.";
    $("#report-title").textContent = "Hasil tes tidak ditemukan";
    return;
  }

  message.textContent = "Memuat hasil tes...";

  const result = await call("results", { kode: code });

  if (!result.ok) {
    message.textContent = result.error || "Hasil tes gagal dimuat.";
    $("#report-title").textContent = "Hasil tes gagal dimuat";
    return;
  }

  const test = result.test || {};
  const questions = result.questions || [];
  const data = classifyRows(questions, result.rows || []);
  const uniqueStudents = new Set(data.map((item) => String(item.nis))).size;

  $("#report-title").textContent = test.materi || "Hasil tes";
  $("#report-subtitle").textContent =
    "Token " + (test.kode_tes || code) + " · Kelas " + (test.kelas || "—") +
    " · " + uniqueStudents + " siswa";
  message.textContent = "";

  renderSummary(data);
  renderQuestions(questions, data);
  renderPatterns(data);
  renderStudents(questions, data);

  currentReport = {
    kode: test.kode_tes || code,
    questions,
    data
  };

  await typesetReport();
}

$("#export-csv").addEventListener("click", () => {
  if (!currentReport) return;

  const questionMap = Object.fromEntries(
    currentReport.questions.map((question) => [String(question.no), question])
  );
  const headers = [
    "waktu", "nama", "nis", "kelas", "nomor_soal", "isi_soal",
    "jawaban_siswa", "keyakinan_jawaban", "alasan_siswa",
    "keyakinan_alasan", "klasifikasi"
  ];

  const lines = currentReport.data.map((item) => {
    const question = questionMap[String(item.soal_id)] || {};
    const values = [
      item.waktu,
      item.nama,
      item.nis,
      item.kelas,
      item.soal_id,
      question.soal,
      choiceText(question, "a", item.jawaban),
      confidenceLabel(item.yakin_jawaban),
      choiceText(question, "r", item.alasan),
      confidenceLabel(item.yakin_alasan),
      categoryLabel(item.category)
    ];

    return values.map((value) =>
      '"' + String(value ?? "").replace(/"/g, '""') + '"'
    ).join(",");
  });

  const csv = "\ufeff" + [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "hasil-" + currentReport.kode + ".csv";
  link.click();
  URL.revokeObjectURL(url);
});

loadReport();
