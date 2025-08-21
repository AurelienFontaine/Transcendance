let socket: WebSocket | null = null;
let sessionMessages: string[] = [];

export function chatHandler() {
	//recup elements html dans DOM (cree par renderChat)
	const chatMessages	= document.getElementById("chat-messages"); // type : HTMLElement | null, vaut null de base pour eviter les erreurs d'exec
	const chatInput		= document.getElementById("chat-input") as HTMLInputElement; // type : HTMLInputElement -> acces a .value, .checked, .disabled, etc...
	
	/* verif: si bug -> chat.ts ne s'execute pas correctement;
	si changement des id; si chat charge av DOM pret (pas DOMContentLoaded);
	si appel chatHandlers sans renderChat ou avant	*/
	if (!chatInput)		console.warn("Champ 'chat-input' introuvable.");
	if (!chatMessages)	console.warn("Zone 'chat-messages' introuvable.");
	if (!chatInput || !chatMessages) return;

	// Recharger l'historique du chat depuis localStorage
	chatMessages.innerHTML = "";
	for (const content of sessionMessages) {
		appendMessageToChat(content);
	}

	/** fonction flechee anonyme callback:
	 * fonction flechee = syntaxe () => {....}
	 * anonyme = n'a pas de nom
	 * callback = appelee plus tard automatiquement par le nav quand l'user fait l'action (ici click)
	 * 
	 * chatToggle = element DOM cible, addEventListener = methode JS pour ecouter un event
	 * "click" = type d'event, () => {...} = fct flechee executee au moment du click
	 * () = aucun paramettre, * => = indique une fct, {...} = corp fct executee
	 */
	/** si chatWindow.style.display est none alors met block sinon remet none
	 * none == cachee completement ; block = affichee nom comme un block (div par default)
	*/

	if (!socket || socket.readyState !== WebSocket.OPEN) {
		socket = new WebSocket("ws://localhost:4000"); // ⚠️ adapte si en prod

		socket.addEventListener("open", () => {
			console.log("✅ Connecté au WebSocket chat");
		});

		socket.addEventListener("message", (event) => {
			const message = event.data;
			appendMessageToChat(message);
			sessionMessages.push(message);
		});

		socket.addEventListener("close", () => {
			console.log("❌ Déconnecté du WebSocket chat");
		});

		socket.addEventListener("error", (err) => {
			console.error("⛔ Erreur WebSocket", err);
		});
	}

	chatInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter" && chatInput.value.trim() !== "") {
			const message = `Moi : ${chatInput.value}`;
			appendMessageToChat(message);
			sessionMessages.push(message);
			socket?.send(message);
			chatInput.value = "";
		}
	});
}

// Affiche un message dans la zone chat
function appendMessageToChat(content: string) {
	const chatMessages = document.getElementById("chat-messages");
	if (!chatMessages) return;

	const p = document.createElement("p");
	p.textContent = content;
	chatMessages.appendChild(p);
}

export function clearChatHistory() {
	sessionMessages = [];
}
