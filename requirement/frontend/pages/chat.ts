export function renderChat() {
	const token = localStorage.getItem("token");
	if (!token) {
		console.info("❌ Accès refusé : utilisateur non connecté.");
		return `<p>Accès refusé. Veuillez vous connecter.</p>`;
	}

	return `
		<h1 class="text-2xl font-semibold mb-6">Chat avec vos amis</h1>

		<!-- Conteneur général -->
		<div class="flex flex-col sm:flex-row gap-6 items-start">

			<!-- Colonne gauche : Ajout + Suppression + Liste -->
			<div class="w-full sm:w-1/3">
				
				<!-- Ligne : Ajout + Suppression -->
				<div class="flex flex-col sm:flex-row gap-2 mb-4">
					<!-- Ajout -->
					<section id="addFriendSection" class="bg-gray-800 p-3 rounded shadow-sm w-full sm:w-1/2">
						<h3 class="text-sm font-semibold mb-2">Ajouter</h3>
						<form id="addFriendForm" class="flex gap-2">
							<input id="friendNameInput" type="text" placeholder="Nom"
								class="flex-grow p-1 text-sm rounded bg-gray-700 border border-gray-600"
								required />
							<button type="submit"
								class="text-xs px-3 py-1 bg-blue-600 rounded hover:bg-blue-700">+</button>
						</form>
					</section>

					<!-- Suppression -->
					<section id="removeFriendSection" class="bg-gray-800 p-3 rounded shadow-sm w-full sm:w-1/2">
						<h3 class="text-sm font-semibold mb-2">Retirer</h3>
						<form id="removeFriendForm" class="flex gap-2">
							<input id="removeFriendNameInput" type="text" placeholder="Nom"
								class="flex-grow p-1 text-sm rounded bg-gray-700 border border-gray-600"
								required />
							<button type="submit"
								class="text-xs px-3 py-1 bg-red-600 rounded hover:bg-red-700">❌</button>
						</form>
					</section>
				</div>

				<!-- Liste d’amis -->
				<section id="friendsListSection" class="p-4 bg-gray-800 rounded shadow">
					<h2 class="text-lg font-semibold mb-3">Mes amis</h2>
					<ul id="friendsList" class="space-y-2 text-sm"></ul>
				</section>
			</div>

			<!-- Colonne droite : chat -->
			<div class="flex-grow" id="chatSection" style="display:none;">
				<h2 id="chatWith" class="text-xl font-bold mb-2"></h2>
				<div id="chatMessages"
					class="border border-gray-700 rounded p-2 h-72 overflow-y-auto mb-2 bg-gray-900"></div>
				<input id="chatInput" type="text" placeholder="Écris ton message..."
					class="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
			</div>
		</div>
	`;
}
