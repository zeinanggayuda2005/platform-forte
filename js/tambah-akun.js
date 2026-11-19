const teacherSession = requireRole("guru");
const addAccountForm = document.querySelector("#add-account-form");
const addAccountMessage = document.querySelector("#add-account-msg");
const addAccountButton = document.querySelector("#add-account-button");

function setAccountMessage(text, type = "") {
  addAccountMessage.textContent = text;
  addAccountMessage.className = type ? `msg ${type}` : "msg";
}

if (teacherSession) {
  addAccountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!addAccountForm.reportValidity()) return;

    const formData = new FormData(addAccountForm);
    const password = String(formData.get("password") || "");
    const confirmation = String(formData.get("password-confirm") || "");

    if (password !== confirmation) {
      setAccountMessage("Konfirmasi password belum sama.", "error");
      document.querySelector("#account-password-confirm").focus();
      return;
    }

    const originalText = addAccountButton.textContent;
    addAccountButton.disabled = true;
    addAccountButton.textContent = "Mendaftarkan guru...";
    setAccountMessage("");

    const result = await api("addAccount", {
      token: teacherSession.token,
      username: String(formData.get("username") || "").trim(),
      nama: String(formData.get("nama") || "").trim(),
      mapel: String(formData.get("mapel") || "").trim(),
      password
    });

    addAccountButton.disabled = false;
    addAccountButton.textContent = originalText;

    if (!result.ok) {
      setAccountMessage(result.error || "Akun guru gagal dibuat.", "error");
      return;
    }

    addAccountForm.reset();
    setAccountMessage(result.message || "Akun guru berhasil ditambahkan.", "ok");
  });
}
