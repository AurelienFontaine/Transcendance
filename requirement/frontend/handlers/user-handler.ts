
/*fichier non fini a modif */


import axios from 'axios';

export function setupChoosePasswordHandler(navigate: (path: string) => void) {
	const form = document.getElementById("choosePasswordForm");
	if (!form) return;

	form.addEventListener("submit", async (event) => {
		event.preventDefault();

		const input = document.getElementById('newPassword') as HTMLInputElement;
		const confirm = document.getElementById('confirmPassword') as HTMLInputElement;
		const errorMsg = document.getElementById('passwordError');

		const password = input?.value;
		const confirmPassword = confirm?.value;

		// Vérification des champs
		if (!password || !confirmPassword) {
			errorMsg!.textContent = 'Tous les champs sont obligatoires.';
			errorMsg!.style.display = 'block';
			return;
		}

		if (password !== confirmPassword) {
			errorMsg!.textContent = 'Les mots de passe ne correspondent pas.';
			errorMsg!.style.display = 'block';
			return;
		}

		errorMsg!.style.display = 'none'; // Cache l'erreur si tout va bien

		const token = localStorage.getItem("token");
		if (!token) {
			alert("Aucun token trouvé. Veuillez vous reconnecter.");
			return navigate("/profile");
		}

		const response = await fetch("http://localhost:3000/set-password", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${token}`,
			},
			body: JSON.stringify({ password }),
		});

		const result = await response.json();
		if (result.success) {
			alert("Mot de passe mis à jour !");
			navigate("/profile");
		} else {
			errorDisplay.textContent = result.error || "Erreur lors de la mise à jour.";
			errorDisplay.style.display = "block";
		}
	});
}
