export function renderChat() {
	const token = localStorage.getItem("token");
	if (!token) {
		console.info("❌ Accès refusé : utilisateur non connecté.");
		return `<p>Accès refusé. Veuillez vous connecter.</p>`;
	}

	return `
		<h1 class="text-2xl font-semibold mb-6">Chat avec vos amis</h1>

		<div class="flex flex-row items-start justify-start gap-8">

			<!-- Colonne gauche : Ajout/Suppression + Liste d’amis -->
			<div class="flex flex-col items-start w-1/3">

				<!-- Formulaires côte à côte -->
				<div class="flex flex-row gap-2 mb-4 w-full">
					<!-- Ajouter un ami -->
					<section id="addFriendSection" class="bg-gray-800 p-3 rounded w-1/2">
						<h3 class="text-sm font-semibold mb-2">Ajouter</h3>
						<form id="addFriendForm" class="flex gap-2">
							<input id="friendNameInput" type="text" placeholder="Nom"
								class="w-full p-1 text-sm rounded bg-gray-700 border border-gray-600"
								required />
							<button type="submit"
								class="text-xs px-3 py-1 bg-blue-600 rounded hover:bg-blue-700">+</button>
						</form>
					</section>

					<!-- Supprimer un ami -->
					<section id="removeFriendSection" class="bg-gray-800 p-3 rounded w-1/2">
						<h3 class="text-sm font-semibold mb-2">Retirer</h3>
						<form id="removeFriendForm" class="flex gap-2">
							<input id="removeFriendNameInput" type="text" placeholder="Nom"
								class="w-full p-1 text-sm rounded bg-gray-700 border border-gray-600"
								required />
							<button type="submit"
								class="text-xs px-3 py-1 bg-red-600 rounded hover:bg-red-700">❌</button>
						</form>
					</section>
				</div>

				<!-- Liste d'amis -->
				<section id="friendsListSection" class="p-4 bg-gray-800 rounded shadow w-full">
					<h2 class="text-lg font-semibold mb-3">Mes amis</h2>
					<ul id="friendsList" class="space-y-2 text-sm"></ul>
				</section>
			</div>

			<!-- Colonne droite : Chat -->
			<div class="flex flex-col w-2/3" id="chatSection">
				<h2 id="chatWith" class="text-xl font-bold mb-2">Chat (sélectionnez un ami)</h2>
				<div id="chat-messages"
					class="border border-gray-700 rounded p-2 h-72 overflow-y-auto mb-2 bg-gray-900"></div>
				<input id="chat-input" type="text" placeholder="Écris ton message..."
					class="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
			</div>
		</div>
	`;
}
