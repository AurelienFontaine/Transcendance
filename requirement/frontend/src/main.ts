//import styles
import "./styles.css";

//import vues/pages du site (SPA)
import { renderHome } from '../pages/home';
import { renderProfile, setupProfilePage } from '../pages/profile';
import { renderPlay, setupPlayPage } from '../pages/play';
import { renderChoosePassword } from '../pages/choose-password';

import { navigate } from "./utils";

import * as Game from '../handlers/game/game-front'; //present dans le docker via shared

import * as auth from "./authentification";

import * as userM from "./user_management";

import { renderChat } from '../pages/chat';

import { chatHandler } from '../handlers/chat-handler';

// Record<K, V> utility typescript type with K as key type and V as value type
// () => string : function without parameters returning a string
// "routes" is an object with a path as key and each value is a function that returns a string (here HTML code)
const routes: Record<string, () => string> = {
	'/': renderHome,
	'/profile': renderProfile,
	'/play': renderPlay,
	'/choose-password': renderChoosePassword,
	'/chat': renderChat,
};// objet, associe chaque chemin url a une fonction qui genere du html

///////// RENDER DE LA PAGE //////////////////////////////////////////

//ftc principale de rendu de la SPA
export function render() {
  const path = window.location.pathname;
  // Lire les paramètres d'URL (token + username)
	const urlParams = new URLSearchParams(window.location.search);
	const error = urlParams.get('error');
	const token = urlParams.get('token');
	const realName = urlParams.get('name');
	const username = urlParams.get('username');
	const firstTime = urlParams.get('firstTime'); //premiere connection avec OAuth

 	if (token) {
		localStorage.setItem('token', token);
		if (username) 
			localStorage.setItem('username', username);
		if (realName) 
			localStorage.setItem('name', realName);

		// fallback quand pas d'URL param
		// → aller lire le JWT pour extraire le `name`
		if (!realName) {
			try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			if (payload.name) localStorage.setItem('name', payload.name);
			} catch (e) {
			console.warn("Impossible de décoder le JWT:", e);
			}
		}
		window.history.replaceState({}, '', window.location.pathname);
		auth.updateUIForLoggedInUser();
		}

	//verification du refus de connection de l'user
	if (error === 'access_denied') {
		alert("Connexion via Google refusée.");
		//nettoie l'URL pour ne pas garder ?error
		window.history.replaceState({}, '', window.location.pathname);
  }

	if (firstTime === 'true'){ //demande d'initialisation de mdp
		alert("Bienvenue dans notre projet Transcendance ! Veuillez choisir un mot de passe pour finaliser votre inscription! ");
		navigate('/choose-password');
		return;
	}

	//affiche la page correspondant a l'url ou 404
	const page = routes[path] || (() => '<h1>404 Not Found</h1>');
	document.getElementById('app')!.innerHTML = page();

  // On attend que le DOM ait fini de peindre le contenu HTML injecté
  requestAnimationFrame(() => { //attends le prochain refresh d'ecran
    
    if (path === '/choose-password') {
		  const newPassword = document.getElementById("changePasswordForm") as HTMLFormElement;
      if (newPassword)
        newPassword.addEventListener('submit', userM.changePassword);
	  }
  
    if (path === '/play') {
    // 1) Wire the tournament UI (register players, start tournament, scoring)
    //    This function should be idempotent (won’t double-attach on re-render).
      setupPlayPage();
    }

    if (path === '/profile') {
		  const hasToken = ! !localStorage.getItem('token');
      
      
      const currentUsernameDOM = document.getElementById('currentUsername');
      if (currentUsernameDOM)
        currentUsernameDOM.textContent = username;
      const googleBtn = document.getElementById('googleLoginButton');

      setupProfilePage();

		  if (googleBtn)
			  googleBtn.style.display = hasToken ? 'none' : 'block';

      const registerForm = document.getElementById('registerForm');
    	if (registerForm)
        registerForm.addEventListener('submit', auth.createUser);

    	const loginForm = document.getElementById('loginForm');
      if (loginForm)
        loginForm.addEventListener('submit', auth.loginUser);

      const changeUsernameForm = document.getElementById('changeUsernameForm') as HTMLFormElement;
      if (changeUsernameForm)
        changeUsernameForm.addEventListener('submit', userM.changeUsername);

      const changePasswordButton = document.getElementById("changePasswordBtn");
      if (changePasswordButton)
        changePasswordButton.addEventListener('click', () => { navigate('/choose-password'); });

      const logoutBtn = document.getElementById('logoutButton');
      if (logoutBtn) 
        logoutBtn.addEventListener('click', auth.logoutUser);
      setupProfilePage();
    }

    if (path == '/chat'){
			const token = localStorage.getItem("token");

			if (!token) {
				alert("Accès refusé. Veuillez vous connecter.");
				navigate("/profile");
				return;
			}
			chatHandler();
		}

    auth.checkIfLoggedIn(); //verifie la session a chaque affichage
  });
}

// Intercept internal navigation pour spa
document.addEventListener('click', (e) => {
	const target = e.target as HTMLElement; // ensure it is a DOM element
	if (target.matches('[data-link]')) {
		e.preventDefault(); // avoid browser default behavior which would reload the page
		navigate(target.getAttribute('href')!);
	}
});

// Handle browser back/forward
window.addEventListener('popstate', render);

// Initial render
render();
