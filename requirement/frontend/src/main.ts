//import styles
import "./styles.css";

//import vues/pages du site (SPA)
import { renderHome } from '../pages/home';
import { renderProfile } from '../pages/profile';
import { renderPlay, setupPlayPage } from '../pages/play';
import { renderChoosePassword } from '../pages/choose-password';
import { setupChoosePasswordHandler } from '../handlers/user-handler';

// const backendUrl = "http://localhost:3000";


// Record<K, V> utility typescript type with K as key type and V as value type
// () => string : function without parameters returning a string
// "routes" is an object with a path as key and each value is a function that returns a string (here HTML code)
const routes: Record<string, () => string> = {
  '/': renderHome,
  '/profile': renderProfile,
  '/play': renderPlay,
  '/choose-password': renderChoosePassword,
};// objet, associe chaque chemin url a une fonction qui genere du html

import { navigate } from "./utils";

import * as Game from '../handlers/game/game-front'; //present dans le docker via shared

import * as auth from "./authentification";

import * as userM from "./user_management";

///////// RENDER DE LA PAGE //////////////////////////////////////////

//ftc principale de rendu de la SPA
export function render() {
  const path = window.location.pathname;
  // Lire les paramètres d'URL (token + name)
	const urlParams = new URLSearchParams(window.location.search);
	const error = urlParams.get('error');
	const token = urlParams.get('token');
	const name = urlParams.get('name');
	const firstTime = urlParams.get('firstTime'); //premiere connection avec OAuth

    //verification du refus de connection de l'user
	if (error === 'access_denied') {
		alert("Connexion via Google refusée.");
		//nettoie l'URL pour ne pas garder ?error
		window.history.replaceState({}, '', window.location.pathname);
  }

	if (firstTime === 'true'){ //demande d'initialisation de mdp
		alert("Bienvenue ! Veuillez choisir un mot de passe pour votre premiere connexion");
		navigate('/choose-password');
		return;
	}

	//gerer l'initialisation du mdp pas terminer, a terminer et commenter
	if (path === '/choose-password') {
		const newPassword = document.getElementById("googleChangePasswordForm") as HTMLFormElement;
    if (newPassword)
      newPassword.addEventListener('submit', userM.googleChangePassword);
	}

	if (token && name) { //Si user connecte -> mettre a jour la page
		localStorage.setItem('token', token);
		localStorage.setItem('username', name);
		// Nettoyer l'URL pour ne pas laisser les paramètres visibles
		window.history.replaceState({}, '', window.location.pathname);
		auth.updateUIForLoggedInUser();
	}

	//affiche la page correspondant a l'url ou 404
  const page = routes[path] || (() => '<h1>404 Not Found</h1>');
  document.getElementById('app')!.innerHTML = page();

  // On attend que le DOM ait fini de peindre le contenu HTML injecté
  requestAnimationFrame(() => { //attends le prochain refresh d'ecran
	if (path === '/play') {
  // 1) Wire the tournament UI (register players, start tournament, scoring)
  //    This function should be idempotent (won’t double-attach on re-render).
    setupPlayPage();

    // 2) Wire your game mode buttons (local / online) like before
    const localBtn  = document.getElementById('localBtn');
    const onlineBtn = document.getElementById('onlineBtn');

    localBtn?.addEventListener('click', () => {
      history.pushState({ page: 'game-local' }, '', '#game-local');
      // wait one paint so the DOM is present, then render the game
      requestAnimationFrame(() => {
        Game.__forceRender('game-local');
      });
    });

    onlineBtn?.addEventListener('click', () => {
      history.pushState({ page: 'game-online' }, '', '#game-online');
      requestAnimationFrame(() => {
        Game.__forceRender('game-online');
      });
    });
  }

    if (path === '/profile') {
		  const hasToken = ! !localStorage.getItem('token');

		  const googleBtn = document.getElementById('googleLoginButton');
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

      const changePasswordForm = document.getElementById('changePasswordForm') as HTMLFormElement;
      if (changePasswordForm)
        changePasswordForm.addEventListener('submit', userM.changePassword);

      const logoutBtn = document.getElementById('logoutButton');
      if (logoutBtn) 
			  logoutBtn.addEventListener('click', auth.logoutUser);
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
