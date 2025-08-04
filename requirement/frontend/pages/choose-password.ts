export function renderChoosePassword() {
	return `
		<h1>Définir un mot de passe</h1>
		<form id="choosePasswordForm">
			<label for="newPassword">Choisis ton mot de passe :</label><br>
			<input type="password" id="newPassword" name="newPassword" required /><br><br>

			<label for="confirmPassword">Confirmez le mot de passe :</label>
			<input type="password" id="confirmPassword" name="confirmPassword" required />

			<button type="submit">Valider</button>
		</form>
		<p id="passwordError" style="color: red; display: none;"></p>
		<div id="choosePasswordMessage"></div>
	`;
}
