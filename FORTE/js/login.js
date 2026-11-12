const loginForm = document.querySelector("#form-login");
const registerForm = document.querySelector("#form-register-student");
const loginView = document.querySelector("#login-view");
const registerView = document.querySelector("#register-view");
const authTitle = document.querySelector("#auth-title");
const authDescription = document.querySelector("#auth-description");
const message = document.querySelector("#msg");

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = type ? `msg ${type}` : "msg";
}

function setAuthView(view) {
  const isRegistering = view === "register";
  loginView.classList.toggle("hidden", isRegistering);
  registerView.classList.toggle("hidden", !isRegistering);
  authTitle.textContent = isRegistering ? "Daftar Akun Siswa" : "Masuk ke FORTE";
  authDescription.textContent = isRegistering
    ? "Buat akun siswa untuk mengikuti tes diagnostik."
    : "Masuk untuk melanjutkan ke ruang belajar.";
  showMessage("");

  const firstField = isRegistering
    ? document.querySelector("#register-username")
    : document.querySelector("#username");
  firstField.focus();
}

document.querySelector("#show-register").addEventListener("click", () => {
  setAuthView("register");
});

document.querySelector("#show-login").addEventListener("click", () => {
  setAuthView("login");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!loginForm.reportValidity()) return;

  const button = document.querySelector("#login-button");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Memeriksa akun...";
  showMessage("");

  const result = await api("login", {
    username: document.querySelector("#username").value.trim(),
    password: document.querySelector("#password").value
  });

  if (!result.ok) {
    showMessage(result.error || "Login gagal. Periksa kembali data akun.", "error");
    button.disabled = false;
    button.textContent = originalText;
    return;
  }

  setSession({
    token: result.token,
    role: result.role,
    nama: result.nama,
    username: result.username,
    info: result.info
  });

  if (result.role === "siswa") {
    location.href = "siswa-dashboard.html";
  } else if (result.role === "guru") {
    location.href = "guru.html";
  } else {
    showMessage("Jenis akun tidak dikenali. Hubungi administrator.", "error");
    button.disabled = false;
    button.textContent = originalText;
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!registerForm.reportValidity()) return;

  const password = document.querySelector("#register-password").value;
  const passwordConfirmation = document.querySelector("#register-password-confirm").value;

  if (password !== passwordConfirmation) {
    showMessage("Konfirmasi password belum sama.", "error");
    document.querySelector("#register-password-confirm").focus();
    return;
  }

  const button = document.querySelector("#register-button");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Membuat akun...";
  showMessage("");

  const formData = new FormData(registerForm);
  const result = await api("registerStudent", {
    username: String(formData.get("username") || "").trim(),
    nama: String(formData.get("nama") || "").trim(),
    kelas: String(formData.get("kelas") || "").trim(),
    password
  });

  button.disabled = false;
  button.textContent = originalText;

  if (!result.ok) {
    showMessage(result.error || "Pendaftaran gagal. Silakan coba lagi.", "error");
    return;
  }

  const username = String(formData.get("username") || "").trim();
  registerForm.reset();
  document.querySelector("#username").value = username;
  document.querySelector("#password").value = "";
  setAuthView("login");
  showMessage("Akun siswa berhasil dibuat. Silakan masuk dengan NIS/NISN dan password.", "ok");
  document.querySelector("#password").focus();
});
