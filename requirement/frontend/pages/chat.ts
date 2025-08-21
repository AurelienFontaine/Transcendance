export function renderChat() {
	const token = localStorage.getItem("token");
	if (!token) {
		console.info("❌ Accès refusé : utilisateur non connecté.");
		return `<p>Accès refusé. Veuillez vous connecter.</p>`;
	}

	return `
		<h1> chat with friends ! </h1>

		<section id="addFriendSection">
			<h3>Ajouter un ami</h3>
			<form id="addFriendForm">
				<input id="friendNameInput" type="text" placeholder="Nom de l'ami à ajouter" required />
				<button type="submit">Ajouter</button>
			</form>
		</section>

		<section id="removeFriendSection">
			<h3>Retirer un ami</h3>
			<form id="removeFriendForm">
				<input id="removeFriendNameInput" type="text" placeholder="Nom de l'ami à retirer" required />
				<button type="submit">Supprimer</button>
			</form>
		</section>

		<section id="friendsListSection">
			<h2>Mes amis</h2>
			<ul id="friendsList" class="mb-4"></ul>
		</section>

		<section id="chatSection" style="display:none;">
			<h2 id="chatWith"></h2>
			<div id="chatMessages" style="border:1px solid #ccc; height:300px; overflow-y:auto; margin-bottom:10px;"></div>
			<input id="chatInput" type="text" placeholder="Écris ton message..." />
		</section>
	`;
}
