export function chatHandler() {
	//recup elements html dans DOM (cree par renderChat)
	const chatToggle	= document.getElementById("chat-toggle");
	const chatWindow	= document.getElementById("chat-window");
	const chatMessages	= document.getElementById("chat-messages"); // type : HTMLElement | null, vaut null de base pour eviter les erreurs d'exec
	const chatInput		= document.getElementById("chat-input") as HTMLInputElement; // type : HTMLInputElement -> acces a .value, .checked, .disabled, etc...
	
	/* verif: si bug -> chat.ts ne s'execute pas correctement;
	si changement des id; si chat charge av DOM pret (pas DOMContentLoaded);
	si appel chatHandlers sans renderChat ou avant	*/
	if (!chatToggle)	console.warn("Bouton 'chat-toggle' introuvable."); //affichee avertissement dans console, non bloquant
	if (!chatWindow)	console.warn("Fenêtre 'chat-window' introuvable.");
	if (!chatInput)		console.warn("Champ 'chat-input' introuvable.");
	if (!chatMessages)	console.warn("Zone 'chat-messages' introuvable.");
	if (!chatToggle || !chatWindow || !chatInput || !chatMessages) return;

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
	chatToggle.addEventListener("click", () => {
		chatWindow.style.display = chatWindow.style.display === "none" ? "block" : "none";
	});

	chatInput.addEventListener("keypress", (e) => {
		if (e.key == "Enter" && chatInput.value.trim() !== ""){
			const msg = document.createElement("div"); //cree bulle msg
			msg.textContent = `Moi : ${chatInput.value}`; // insere txt
			chatMessages.appendChild(msg); //ajout msg zone msg
			chatInput.value = ""; //initia champ
		}
	});
}

export function refreshChatVisibility() {
	const token = localStorage.getItem("token");
	const chatToggle = document.getElementById("chat-toggle");
	const chatWindow = document.getElementById("chat-window");

	if (!chatToggle || !chatWindow) {
		console.warn("Chat elements not found during visibility refresh.");
		return;
	}	

	if (token) {
		chatToggle.style.display = "block";
	} else {
		chatToggle.style.display = "none";
		chatWindow.style.display = "none";
	}
}
