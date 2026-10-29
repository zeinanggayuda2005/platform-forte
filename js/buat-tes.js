const session = requireRole("guru");

const form = document.querySelector("#create-test-form");
const questionList = document.querySelector("#question-list");
const questionTemplate = document.querySelector("#question-template");
const addQuestionButton = document.querySelector("#add-question");
const message = document.querySelector("#create-test-msg");
const submitButton = document.querySelector("#save-test");

const successPanel = document.querySelector("#created-test");
const createdToken = document.querySelector("#created-test-token");
const createdInfo = document.querySelector("#created-test-info");
const copyTokenButton = document.querySelector("#copy-token");

function updateQuestionNumbers() {
  const blocks = questionList.querySelectorAll(".question-editor");

  blocks.forEach((block, index) => {
    block.querySelector(".question-number").textContent =
      `Soal ${index + 1}`;

    block
      .querySelector(".remove-question")
      .classList.toggle("hidden", blocks.length === 1);
  });
}

function addQuestion() {
  const fragment = questionTemplate.content.cloneNode(true);
  const block = fragment.querySelector(".question-editor");

  block
    .querySelector(".remove-question")
    .addEventListener("click", () => {
      block.remove();
      updateQuestionNumbers();
    });

  questionList.appendChild(fragment);
  updateQuestionNumbers();
}

addQuestionButton.addEventListener("click", addQuestion);
addQuestion();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!session) return;
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const blocks = [...questionList.querySelectorAll(".question-editor")];

  const questions = blocks.map((block) => ({
    soal: block.querySelector('[name="soal"]').value.trim(),
    a1: block.querySelector('[name="a1"]').value.trim(),
    a2: block.querySelector('[name="a2"]').value.trim(),
    a3: block.querySelector('[name="a3"]').value.trim(),
    a4: block.querySelector('[name="a4"]').value.trim(),
    kunci_a: Number(block.querySelector('[name="kunci_a"]').value),
    r1: block.querySelector('[name="r1"]').value.trim(),
    r2: block.querySelector('[name="r2"]').value.trim(),
    r3: block.querySelector('[name="r3"]').value.trim(),
    r4: block.querySelector('[name="r4"]').value.trim(),
    kunci_r: Number(block.querySelector('[name="kunci_r"]').value)
  }));

  const payload = {
    token: session.token,
    kelas: formData.get("kelas").trim(),
    materi: formData.get("materi").trim(),
    data_soal: JSON.stringify(questions)
  };

  submitButton.disabled = true;
  submitButton.textContent = "Mempublikasikan...";
  message.textContent = "";
  message.className = "msg";

  try {
    const result = await api("createTestWithQuestions", payload);

    if (!result.ok) {
      message.textContent = result.error || "Tes gagal dipublikasikan.";
      return;
    }

    const token = result.token || result.kode;

    createdToken.textContent = token;
    createdInfo.textContent =
      `${result.addedQuestions} soal ditambahkan. ` +
      `Tes ini berisi ${result.totalQuestions} soal untuk kelas ${payload.kelas}.`;

    form.classList.add("hidden");
    successPanel.classList.remove("hidden");
    successPanel.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Gagal membuat tes:", error);
    message.textContent = "Terjadi kesalahan saat mempublikasikan tes.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Publikasikan Tes dan Buat Token";
  }
});

copyTokenButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(createdToken.textContent);
    copyTokenButton.textContent = "Tersalin!";

    setTimeout(() => {
      copyTokenButton.textContent = "Salin Token";
    }, 1500);
  } catch {
    copyTokenButton.textContent = "Salin manual";
  }
});

document.querySelector("#create-another").addEventListener("click", () => {
  form.reset();
  questionList.innerHTML = "";
  addQuestion();

  message.textContent = "";
  successPanel.classList.add("hidden");
  form.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});