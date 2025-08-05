
/*fichier non fini a modif */

export function setupChoosePasswordHandler(navigate: (path: string) => void) {
	const form = document.getElementById("choosePasswordForm");
	if (!form) return;

	form.addEventListener("submit", async (event) => {
		event.preventDefault();

		alert("Mot de passe mis à jour !");
		navigate("/profile");
		});
}
