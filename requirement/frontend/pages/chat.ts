export function renderChat() { //interface visuelle chat
	const token = localStorage.getItem("token");
	if (!token) {
		console.info("chat unavailable : user not connected");
		return;
	}

	// Bouton
	const chatToggle = document.createElement("button"); //bouton
	chatToggle.id = "chat-toggle"; //id pour le retrouver
	chatToggle.textContent = "<3 Chat"; //txtbouton
	Object.assign(chatToggle.style, {//style bouton
		position: "fixed",
		bottom: "20px",
		right: "20px",
		zIndex: "1000",
		padding: "10px 15px",
		backgroundColor: "#007bff",
		color: "white",
		border: "none",
		borderRadius: "5px",
		cursor: "pointer",
	});

	// Fenêtre
	const chatWindow = document.createElement("div"); //conterneur pour fenetre
	chatWindow.id = "chat-window"; //id
	chatWindow.style.display = "none"; //caché par def
	Object.assign(chatWindow.style, {
		position: "fixed", //flottante
		bottom: "70px", //au dessus bouton
		right: "20px",
		width: "300px",
		height: "400px",
		backgroundColor: "white",
		color: "black",
		border: "1px solid #ccc",
		borderRadius: "10px",
		padding: "10px",
		boxShadow: "0 0 10px rgba(0,0,0,0.3)",
		zIndex: "1000",
	});

	const title = document.createElement("h3"); //titre fenetre
	title.textContent = "Chat";

	const messages = document.createElement("div"); //zone d'affichage messages
	messages.id = "chat-messages";
	Object.assign(messages.style, {
		height: "300px",
		overflowY: "auto", //scroll vertical
		border: "1px solid #eee",
		padding: "5px",
		marginBottom: "10px",
		fontSize: "14px",
	});

	//zone saisie
	const input = document.createElement("input");
	input.id = "chat-input";
	input.placeholder = "Message...";
	Object.assign(input.style, {
		width: "100%",
		padding: "5px",
	});

	// assemblage fenetre
	chatWindow.appendChild(title); //titre
	chatWindow.appendChild(messages);//messages
	chatWindow.appendChild(input);//saisie
	// ajoutbouton + fenetre page
	document.body.appendChild(chatToggle);
	document.body.appendChild(chatWindow);
}
