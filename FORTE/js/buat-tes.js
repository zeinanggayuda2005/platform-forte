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

function setQuestionCount() {
  const blocks = [...questionList.querySelectorAll(".question-editor")];

  blocks.forEach((block, index) => {
    block.querySelector(".question-number").textContent = `Soal ${index + 1}`;
    block.querySelector(".remove-question").classList.toggle("hidden", blocks.length === 1);
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gambar tidak dapat dibaca."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Gambar gagal dikompres."));
    }, "image/jpeg", quality);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Gambar gagal diproses."));
    reader.readAsDataURL(blob);
  });
}

async function optimizeImage(file) {
  const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!acceptedTypes.includes(file.type)) {
    throw new Error("Pilih gambar JPG, PNG, atau WebP.");
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Ukuran file maksimal 12 MB sebelum dikompres.");
  }

  const image = await fileToImage(file);
  let scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const qualities = [0.82, 0.82, 0.74, 0.74, 0.66, 0.66, 0.58, 0.58, 0.5];
  let finalBlob = null;

  for (let attempt = 0; attempt < qualities.length; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser tidak dapat memproses gambar.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    finalBlob = await canvasToBlob(canvas, qualities[attempt]);
    if (finalBlob.size <= 850 * 1024) break;

    if ((attempt + 1) % 3 === 0) scale *= 0.85;
  }

  if (!finalBlob || finalBlob.size > 850 * 1024) {
    throw new Error("Gambar masih terlalu besar. Coba gunakan gambar yang lebih kecil.");
  }

  return {
    dataUrl: await blobToDataUrl(finalBlob),
    size: finalBlob.size
  };
}

function clearQuestionImage(block, statusText = "") {
  block.dataset.gambarData = "";
  block.querySelector(".question-image-input").value = "";
  block.querySelector(".question-image-preview").removeAttribute("src");
  block.querySelector(".question-image-preview-wrap").classList.add("hidden");

  const status = block.querySelector(".question-image-status");
  status.textContent = statusText;
  status.classList.remove("is-error", "is-ready");
}

function bindQuestionBlock(block) {
  block.querySelector(".remove-question").addEventListener("click", () => {
    block.remove();
    setQuestionCount();
  });

  const imageInput = block.querySelector(".question-image-input");
  const imageStatus = block.querySelector(".question-image-status");
  const preview = block.querySelector(".question-image-preview");
  const previewWrap = block.querySelector(".question-image-preview-wrap");

  imageInput.addEventListener("change", async () => {
    const file = imageInput.files && imageInput.files[0];
    if (!file) return;

    block.dataset.gambarData = "";
    imageStatus.className = "question-image-status";
    imageStatus.textContent = "Menyiapkan gambar...";
    previewWrap.classList.add("hidden");

    try {
      const image = await optimizeImage(file);
      block.dataset.gambarData = image.dataUrl;
      preview.src = image.dataUrl;
      previewWrap.classList.remove("hidden");
      imageStatus.textContent = `Gambar siap (${Math.ceil(image.size / 1024)} KB).`;
      imageStatus.classList.add("is-ready");
    } catch (error) {
      clearQuestionImage(block);
      imageStatus.textContent = error.message;
      imageStatus.classList.add("is-error");
    }
  });

  block.querySelector(".remove-question-image").addEventListener("click", () => {
    clearQuestionImage(block, "Gambar dihapus.");
  });
}

function addQuestion(focusNewQuestion = false) {
  const fragment = questionTemplate.content.cloneNode(true);
  const block = fragment.querySelector(".question-editor");

  bindQuestionBlock(block);
  questionList.appendChild(fragment);
  setQuestionCount();

  if (focusNewQuestion) {
    const newBlock = questionList.lastElementChild;
    newBlock.scrollIntoView({ behavior: "smooth", block: "start" });
    newBlock.querySelector('[name="soal"]').focus({ preventScroll: true });
  }
}

addQuestionButton.addEventListener("click", () => addQuestion(true));
addQuestion();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!session || !form.reportValidity()) return;

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
    kunci_r: Number(block.querySelector('[name="kunci_r"]').value),
    gambar_data: block.dataset.gambarData || ""
  }));

  const payload = {
    token: session.token,
    kelas: String(formData.get("kelas") || "").trim(),
    materi: String(formData.get("materi") || "").trim(),
    data_soal: JSON.stringify(questions)
  };

  submitButton.disabled = true;
  submitButton.textContent = "Menyimpan soal dan gambar...";
  message.textContent = "Gambar akan disimpan ke Google Drive agar tetap tersedia untuk siswa.";
  message.className = "msg";

  try {
    const result = await api("createTestWithQuestions", payload);

    if (!result.ok) {
      message.textContent = result.error || "Tes gagal dipublikasikan.";
      return;
    }

    createdToken.textContent = result.token || result.kode;
    createdInfo.textContent =
      `${result.addedQuestions} soal berhasil ditambahkan untuk kelas ${payload.kelas}.`;
    message.textContent = "";
    form.classList.add("hidden");
    successPanel.classList.remove("hidden");
    successPanel.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Gagal membuat tes:", error);
    message.textContent = "Terjadi kesalahan saat menyimpan tes. Silakan coba lagi.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Publikasikan Tes dan Buat Token";
  }
});

copyTokenButton.addEventListener("click", async () => {
  const token = createdToken.textContent.trim();

  try {
    await navigator.clipboard.writeText(token);
    copyTokenButton.textContent = "Tersalin!";
  } catch {
    copyTokenButton.textContent = "Salin manual";
  }

  setTimeout(() => {
    copyTokenButton.textContent = "Salin Token";
  }, 1500);
});

document.querySelector("#create-another").addEventListener("click", () => {
  form.reset();
  questionList.innerHTML = "";
  message.textContent = "";
  successPanel.classList.add("hidden");
  form.classList.remove("hidden");
  addQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
