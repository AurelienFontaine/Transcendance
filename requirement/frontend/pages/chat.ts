export function renderChat() {
	const token = localStorage.getItem("token");
	if (!token) {
		console.info("❌ Accès refusé : utilisateur non connecté.");
		return `<p>Accès refusé. Veuillez vous connecter.</p>`;
	}

	return `
		<h1>💬 Chat Global</h1>
		<div id="chat-messages" style="height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;"></div>
		<input id="chat-input" type="text" placeholder="Écrire un message..." style="width: 100%; padding: 8px;" />
	`;
}
