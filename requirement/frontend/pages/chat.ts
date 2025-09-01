export function renderChat() {
	const token = localStorage.getItem("token");
	if (!token) {
		console.info("❌ Accès refusé : utilisateur non connecté.");
		return `<p>Accès refusé. Veuillez vous connecter.</p>`;
	}

	return `
		<h1 class="text-2xl font-bold mb-4">Chat avec tes amis</h1>

		<div class="flex flex-row gap-6">
			<!-- Colonne gauche : Ajout / Suppression / Liste -->
			<div class="w-1/3 space-y-6">
				<section id="addFriendSection">
					<h3 class="text-lg font-semibold">Ajouter un ami</h3>
					<form id="addFriendForm" class="space-x-2">
						<input id="friendNameInput" type="text" placeholder="Nom de l'ami" class="p-1 rounded text-black" required />
						<button type="submit" class="bg-green-600 px-3 py-1 rounded hover:bg-green-700">Ajouter</button>
					</form>
				</section>

				<section id="removeFriendSection">
					<h3 class="text-lg font-semibold">Retirer un ami</h3>
					<form id="removeFriendForm" class="space-x-2">
						<input id="removeFriendNameInput" type="text" placeholder="Nom à retirer" class="p-1 rounded text-black" required />
						<button type="submit" class="bg-red-600 px-3 py-1 rounded hover:bg-red-700">Supprimer</button>
					</form>
				</section>

				<section id="friendsListSection">
					<h2 class="text-lg font-semibold">Mes amis</h2>
					<ul id="friendsList" class="space-y-1"></ul>
				</section>
			</div>

			<!-- Colonne droite : Chat -->
			<div class="flex-1" id="chatRightSide">
				<section id="chatSection" style="display:none;">
					<h2 id="chatWith" class="text-xl font-bold mb-2"></h2>
					<div id="chat-messages" class="border border-gray-500 h-64 overflow-y-auto mb-2 p-2 bg-gray-800 rounded"></div>
					<input id="chat-input" type="text" placeholder="Écris ton message..." class="w-full p-2 text-black rounded" />
				</section>

				<div id="defaultChatMessage" class="text-center text-gray-400 mt-16">
					<p>Clique sur le nom d'un de tes amis pour commencer une conversation.</p>
				</div>
			</div>
		</div>
	`;
}
