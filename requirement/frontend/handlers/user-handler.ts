
/*fichier non fini a modif */
/*a refaire et etudier */
export function ChoosePasswordHandler(navigate: (path: string) => void) {
	const form = document.getElementById("choosePasswordForm");
	if (!form) return;

	form.addEventListener("submit", async (event) => {
		event.preventDefault();

		const newPasswordInput = document.getElementById("newPassword") as HTMLInputElement;
		const confirmPasswordInput = document.getElementById("confirmPassword") as HTMLInputElement;
		const errorP = document.getElementById("passwordError") as HTMLElement;

		const newPassword = newPasswordInput.value;
		const confirmPassword = confirmPasswordInput.value;

		if (newPassword !== confirmPassword) {
			errorP.textContent = "Les mots de passe ne correspondent pas.";
			errorP.style.display = "block";
			return;
		}

		const token = localStorage.getItem("token");
		if (!token) {
			alert("Vous devez être connecté.");
			navigate("/profile");
			return;
		}

		const response = await fetch("http://localhost:3000/choose-password", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ newPassword })
		});

		const result = await response.json();
		if (response.ok) {
			alert("Mot de passe mis à jour !");
			navigate("/profile");
		} else {
			errorP.textContent = result.error || "Erreur inconnue.";
			errorP.style.display = "block";
		}
	});
}
