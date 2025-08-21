let socket: WebSocket | null = null;
let sessionMessages: string[] = [];

export async function chatHandler() {
	//recup elements html dans DOM (cree par renderChat)
	const friendsList = document.getElementById("friendsList");
	const chatSection = document.getElementById("chatSection");
	const chatWith = document.getElementById("chatWith");
	const chatMessages	= document.getElementById("chat-messages"); // type : HTMLElement | null, vaut null de base pour eviter les erreurs d'exec
	const chatInput		= document.getElementById("chat-input") as HTMLInputElement; // type : HTMLInputElement -> acces a .value, .checked, .disabled, etc...
	
	// Gestion du formulaire d'ajout d'ami
	const addFriendForm = document.getElementById("addFriendForm") as HTMLFormElement;
	const friendNameInput = document.getElementById("friendNameInput") as HTMLInputElement;

	addFriendForm?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const friendName = friendNameInput.value.trim();
		if (!friendName) return alert("Nom invalide");

		const res = await fetch("http://localhost:3000/friends/add", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${localStorage.getItem("token")!}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ friendName })
		});

		const data = await res.json();
		if (res.ok) {
			alert("Ami ajouté !");
			friendNameInput.value = "";
			await chatHandler(); // recharge amis
		} else {
			alert(data.error || "Erreur");
		}
	});


	/* verif: si bug -> chat.ts ne s'execute pas correctement;
	si changement des id; si chat charge av DOM pret (pas DOMContentLoaded);
	si appel chatHandlers sans renderChat ou avant	*/
	if (!chatInput)		console.warn("Champ 'chat-input' introuvable.");
	if (!chatMessages)	console.warn("Zone 'chat-messages' introuvable.");
	if (!friendsList || !chatSection || !chatWith || !chatMessages || !chatInput) return;

	const friends = await fetchFriends();
	friendsList.innerHTML = "";

	friends.forEach(friend => {
		const li = document.createElement("li");
		li.textContent = friend.name;
		li.style.cursor = "pointer";

		// Actions (supprimer bouton)
		const btns = document.createElement("div");
		btns.style.marginTop = "4px";

		const unfriendBtn = document.createElement("button");
		unfriendBtn.textContent = "❌ Supprimer";
		unfriendBtn.style.marginLeft = "10px";
		unfriendBtn.addEventListener("click", async (e) => {
			e.stopPropagation();

			const confirmed = confirm(`Supprimer ${friend.name} de vos amis ?`);
			if (!confirmed) return;

			const res = await fetch("http://localhost:3000/friends/remove", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${localStorage.getItem("token")!}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ friendId: friend.id })
			});

			if (res.ok) {
				alert("Ami supprimé !");
				await chatHandler(); // recharge amis
			} else {
				const data = await res.json();
				alert(data.error || "Erreur inconnue");
			}
		});

		btns.appendChild(unfriendBtn);
		li.appendChild(btns);

		li.addEventListener("click", () => {
			chatWith.textContent = `Chat avec ${friend.name}`;
			chatSection.style.display = "block";
			chatMessages.innerHTML = "";
			// ⚠️ initWebSocket(friend.id); ← Pour messages privés plus tard
		});

		friendsList.appendChild(li);
	});


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

async function fetchFriends(): Promise<{ id : number, name: string }[]> {
	const token = localStorage.getItem("token");
	if (!token) return [];

	const res = await fetch("http://localhost:3000/friends", {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});

	if (!res.ok) return [];
	const data = await res.json();
	return data.friends;
}

export function clearChatHistory() {
	sessionMessages = [];
}
