
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
	const removeFriendForm = document.getElementById("removeFriendForm") as HTMLFormElement;
	const removeFriendNameInput = document.getElementById("removeFriendNameInput") as HTMLInputElement;

	if (!removeFriendForm.hasAttribute("data-initialized")){//ne pas enregistrer plusieurs fois eventListener
		removeFriendForm?.addEventListener("submit", async (e) => {
			e.preventDefault(); //eviter le rechargement de la page et faire en sorte que je gere moi meme la soumission 
			const unfriendName = removeFriendNameInput.value.trim(); //recup txt dans formulaire + supp espaces av/ap
			if (!unfriendName) return alert ("unable to unfriend: Nom invalide"); //si rien dans champ

			const res = await fetch ("http://localhost:3000/friends/remove", {//env requette HTTP POST back
				method: "POST",
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")!}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ unfriendName })
			});

			const data = await res.json();
			if (res.ok){
				alert("Ami retiré !");
				removeFriendNameInput.value = "";
				await chatHandler();//maj list amis
			} else { alert(data.error || "Erreur"); }
		});
		removeFriendForm.setAttribute("data-initialized", "true");
	}

	if (!addFriendForm.hasAttribute("data-initialized")) {
		addFriendForm?.addEventListener("submit", async (e) => {
			e.preventDefault();
			const friendName = friendNameInput.value.trim();
			if (!friendName) return alert("unable to add friend: Nom invalide");

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
		addFriendForm.setAttribute("data-initialized", "true");
	}

	/* verif: si bug -> chat.ts ne s'execute pas correctement;
	si changement des id; si chat charge av DOM pret (pas DOMContentLoaded);
	si appel chatHandlers sans renderChat ou avant	*/
	console.log("DEBUG : friendsList =", friendsList);
	console.log("DEBUG : chatSection =", chatSection);
	console.log("DEBUG : chatWith =", chatWith);
	console.log("DEBUG : chatMessages =", chatMessages);
	console.log("DEBUG : chatInput =", chatInput);

	if (!chatInput)		console.warn("Champ 'chat-input' introuvable.");
	if (!chatMessages)	console.warn("Zone 'chat-messages' introuvable.");
	if (!friendsList || !chatSection || !chatWith ) return;
	//if (!chatInput || !chatMessages) return;

	const friends = await fetchFriends();
	console.log("Amis récupérés :", friends);
	friendsList.innerHTML = "";

	if (!Array.isArray(friends)) {
		console.warn("❌ Mauvais format : friends n'est pas un tableau !");
		return;
	}

	if (friends.length === 0) {
		console.warn("ℹ️ Aucun ami trouvé.");
	}

	friends.forEach(friend => {
		console.log("Ajout de l'ami :", friend);
		const li = document.createElement("li");
		li.textContent = friend.name;
		li.style.cursor = "pointer";

		li.addEventListener("click", () => {
			console.log(`👆 Click détecté sur ${friend.name}`);
			if (!chatWith || !chatSection || !chatMessages) {
				console.warn("❌ Élément manquant dans le DOM");
				return;
			}
			chatWith.textContent = `Chat avec ${friend.name}`;
			chatSection.style.display = "block";
			document.getElementById("defaultChatMessage")?.classList.add("hidden");
			chatMessages.innerHTML = ""; // vide l'ancien chat
		});
		// Écoute clavier pour envoyer un message

		friendsList.appendChild(li);
	});

	if (chatInput && chatMessages) {
		chatInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter" && chatInput.value.trim() !== "") {
				const message = `Moi : ${chatInput.value}`;
				appendMessageToChat(message);
				chatInput.value = "";
			}
		});
	}

	console.log("friendsList.innerHTML final :", friendsList?.innerHTML);

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

function appendMessageToChat(content: string) {
	const chatMessages = document.getElementById("chat-messages");
	if (!chatMessages) return;

	const p = document.createElement("p");
	p.textContent = content;
	chatMessages.appendChild(p);
	chatMessages.scrollTop = chatMessages.scrollHeight; // scroll vers le bas
}

