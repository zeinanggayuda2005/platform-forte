const session = requireRole("siswa");

if (session) {
  const activeTestText = sessionStorage.getItem("forte-active-test");

  if (!activeTestText) {
    location.replace("siswa-dashboard.html");
  } else {
    const activeTest = JSON.parse(activeTestText);
    const form = document.querySelector("#test-form");
    const questionContainer = document.querySelector("#questions");
    const message = document.querySelector("#msg");
    const submitButton = document.querySelector("#submit-btn");
    const donePanel = document.querySelector("#done");
    const confirmation = document.querySelector("#submit-confirmation");
    const confirmButton = document.querySelector("#confirm-submit");
    const cancelButton = document.querySelector("#cancel-submit");

    function renderOptions(name, items) {
      return items.map((text, index) =>
        '<label class="option">' +
          '<input type="radio" name="' + esc(name) + '" value="' + (index + 1) + '" required>' +
          '<span class="math-text">' + esc(text) + '</span>' +
        '</label>'
      ).join("");
    }

    function renderConfidence(name) {
      return '<label class="option"><input type="radio" name="' + esc(name) + '" value="1" required><span>Yakin</span></label>' +
        '<label class="option"><input type="radio" name="' + esc(name) + '" value="0" required><span>Tidak yakin</span></label>';
    }

    async function renderMath() {
      if (!window.MathJax || !window.MathJax.typesetPromise) return;

      try {
        await window.MathJax.startup.promise;
        await window.MathJax.typesetPromise([questionContainer]);
      } catch (error) {
        console.warn("Rumus belum dapat dirender:", error);
      }
    }

    async function renderQuestions() {
      document.querySelector("#who").textContent = session.nama + " · " + session.info;
      document.querySelector("#test-mapel").textContent = "Materi: " + activeTest.materi;

      questionContainer.innerHTML = (activeTest.questions || []).map((question) => {
        const image = question.gambar_url
          ? '<figure class="question-image-display"><img src="' + esc(question.gambar_url) + '" alt="Gambar pada soal ' + esc(question.no) + '" loading="lazy"></figure>'
          : "";

        return '<article class="card student-question-card">' +
          '<h2>Soal ' + esc(question.no) + '</h2>' +
          '<p class="student-question-prompt math-text">' + esc(question.soal) + '</p>' +
          image +
          '<fieldset class="tier"><legend>Tier 1 — Pilih Jawaban</legend>' +
            '<div class="option-list">' + renderOptions("q" + question.no + "-a", question.jawaban || []) + '</div>' +
          '</fieldset>' +
          '<fieldset class="tier"><legend>Tier 2 — Yakin dengan jawabanmu?</legend>' +
            '<div class="option-list">' + renderConfidence("q" + question.no + "-c1") + '</div>' +
          '</fieldset>' +
          '<fieldset class="tier"><legend>Tier 3 — Pilih Alasan</legend>' +
            '<div class="option-list">' + renderOptions("q" + question.no + "-r", question.alasan || []) + '</div>' +
          '</fieldset>' +
          '<fieldset class="tier"><legend>Tier 4 — Yakin dengan alasanmu?</legend>' +
            '<div class="option-list">' + renderConfidence("q" + question.no + "-c2") + '</div>' +
          '</fieldset>' +
        '</article>';
      }).join("");

      await renderMath();
    }

    async function sendAnswers() {
      const answers = activeTest.questions.map((question) => ({
        no: question.no,
        jawaban: Number(new FormData(form).get("q" + question.no + "-a")),
        yakin_jawaban: Number(new FormData(form).get("q" + question.no + "-c1")),
        alasan: Number(new FormData(form).get("q" + question.no + "-r")),
        yakin_alasan: Number(new FormData(form).get("q" + question.no + "-c2"))
      }));

      confirmButton.disabled = true;
      cancelButton.disabled = true;
      confirmButton.textContent = "Mengirim...";
      message.textContent = "";
      confirmation.close();
      submitButton.disabled = true;
      submitButton.textContent = "Mengirim jawaban...";

      const result = await api("submit", {
        token: session.token,
        kode: activeTest.kode,
        answers: JSON.stringify(answers)
      });

      if (result.ok) {
        sessionStorage.removeItem("forte-active-test");
        form.classList.add("hidden");
        donePanel.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      message.textContent = result.error || "Jawaban gagal dikirim. Silakan coba lagi.";
      submitButton.disabled = false;
      submitButton.textContent = "Kirim Semua Jawaban";
      confirmButton.disabled = false;
      cancelButton.disabled = false;
      confirmButton.textContent = "Ya, kirim jawaban";
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!form.reportValidity()) return;
      confirmation.showModal();
    });

    cancelButton.addEventListener("click", () => confirmation.close());
    confirmButton.addEventListener("click", sendAnswers);

    confirmation.addEventListener("click", (event) => {
      if (event.target === confirmation) confirmation.close();
    });

    renderQuestions();
  }
}
