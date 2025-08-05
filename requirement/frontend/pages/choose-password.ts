export function renderChoosePassword() {
	return `
		<h1>Définir un mot de passe</h1>
		<form id="choosePasswordForm"><br>
			<label for="newPassword">Mot de passe :</label>
			<input type="password" id="newPassword" name="newPassword" required /><br><br>

			<label for="confirmPassword">Confirmation :</label>
			<input type="password" id="confirmPassword" name="confirmPassword" required /> <br> <br>

			<button type="submit">Valider</button>
		</form>
		<p id="passwordError" style="color: red; display: none;"></p>
		<div id="choosePasswordMessage"></div>
	`;
}
