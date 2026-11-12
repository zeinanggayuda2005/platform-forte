const session = requireRole("guru");
const $ = (selector) => document.querySelector(selector);

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
    body.innerHTML =
      '<tr><td colspan="5" class="empty-cell">Belum ada tes yang dipublikasikan.</td></tr>';
    return;
  }

  body.innerHTML = tests.map((test) => {
    const code = esc(test.kode_tes);
    const active = String(test.status).toLowerCase() === "aktif";

    return '<tr>' +
      '<td><strong>' + code + '</strong></td>' +
      '<td>' + esc(test.kelas) + '</td>' +
      '<td>' + esc(test.materi) + '</td>' +
      '<td><span class="status-chip ' +
        (active ? 'status-active' : 'status-closed') + '">' +
        (active ? 'Aktif' : 'Ditutup') + '</span></td>' +
      '<td class="table-actions">' +
        '<button type="button" class="btn outline small" data-results="' + code + '">Hasil</button>' +
        '<button type="button" class="btn ' +
          (active ? 'secondary' : 'primary') +
          ' small" data-toggle="' + code + '">' +
          (active ? 'Tutup' : 'Buka') +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join("");
}

$("#tests-body").addEventListener("click", async (event) => {
  const resultsButton = event.target.closest("[data-results]");
  const toggleButton = event.target.closest("[data-toggle]");

  if (resultsButton) {
    const code = resultsButton.dataset.results;
    location.href = "hasil.html?kode=" + encodeURIComponent(code);
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