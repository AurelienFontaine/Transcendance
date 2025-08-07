//import styles
import "./styles.css";

//import vues/pages du site (SPA)
import { renderHome } from '../pages/home';
import { renderProfile } from '../pages/profile';
import { renderPlay } from '../pages/play';
import { renderChoosePassword } from '../pages/choose-password';

import { setupChoosePasswordHandler } from '../handlers/user-handler';

// Record<K, V> utility typescript type with K as key type and V as value type
// () => string : function without parameters returning a string
// "routes" is an object with a path as key and each value is a function that returns a string (here HTML code)
const routes: Record<string, () => string> = {
  '/': renderHome,
  '/profile': renderProfile,
  '/play': renderPlay,
  '/choose-password': renderChoosePassword,
};// objet, associe chaque chemin url a une fonction qui genere du html

// window.history.pushState(state, title, url) adds a new entry to the browser history without reloading the page
function navigate(path: string) {
  history.pushState({}, '', path); //ajoute nouv entree dans l'historique
  render(); // re-render the page to match the last history state
} //sPA


function showElement(el: HTMLElement) {
  // hide options before toggling "hidden"
  el.classList.remove('opacity-100', 'scale-y-100');
  el.classList.add('opacity-0', 'scale-y-0');

  // if hiden : show. and vice-versa
  el.classList.toggle('hidden');

  // Force reflow to ensure transition runs
  void el.offsetWidth;
  el.classList.add('opacity-100', 'scale-y-100');
  el.classList.remove('opacity-0', 'scale-y-0');
}//affiche un element avec transition


function hideElement(el: HTMLElement) {
  el.classList.remove('opacity-100', 'scale-y-100');
  el.classList.add('opacity-0', 'scale-y-0');

  // Hide the other options
  el.classList.add('hidden');
}//cache un element avec animation

// function to animate game mode selection
function toggleOptions(showElem: HTMLElement | null, hideElem: HTMLElement | null) {
  if (!showElem || !hideElem) return;//securise si un element est null

  // Show the selected one
  showElement(showElem);

  // Hide the other one
  hideElement(hideElem)  
}

// Authentication //////////////////////////////////

//enregistre un user via formulaire
async function createUser(event: Event) {
  event.preventDefault(); //empeche le rechargement de la page

  //recuperation des champs du formulaire
  const nameInput = document.getElementById("registerName") as HTMLInputElement | null;
  if (!nameInput) return alert("Champ nom introuvable");
  const name = nameInput.value;
  const emailInput = document.getElementById("registerEmail") as HTMLInputElement | null;
  if (!emailInput) return alert("Champ email introuvable");
  const email = emailInput.value;
  const passwordInput = document.getElementById("registerPassword") as HTMLInputElement | null;
  if (!passwordInput) return alert("Champ mot de passe introuvable");
  const password = passwordInput.value;

  const backendUrl = "http://localhost:3000";

  const response = await fetch(`${backendUrl}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({name, email, password}),
  });
 
  const data = await response.json();

  if (data.token) { //gestion du log cote client
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', name);
    updateUIForLoggedInUser(name); //MAJ de l'interface client
  }
  else {
    alert(JSON.stringify(data));
  }
}

//connexion user
async function loginUser(event: Event) {
  event.preventDefault();
  const nameInput = document.getElementById("loginName") as HTMLInputElement;
  const passwordInput = document.getElementById("loginPassword") as HTMLInputElement;
  const name = nameInput.value;
  const password = passwordInput.value;
  const backendUrl = "http://localhost:3000";
  const response = await fetch (`${backendUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({name, password}),
  });
  const data = await response.json();
  if (data.token) { //gestion du log cote client si login reussi
    localStorage.setItem('token', data.token); //stock JWT
    localStorage.setItem('username', name); //stock nom
    updateUIForLoggedInUser(name); //MAJ de l'interface client
  } else {
    alert("Erreur : " + (data.error || "Connexion echouee"));
  }
  // alert(JSON.stringify(data)); //pour print la data de connexion
}

//Fonction qui modifie l'apparence de la page en fonction de la connection ou non
function updateUIForLoggedInUser(username: string) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) loginForm.style.display = 'none';
  if (registerForm) registerForm.style.display = 'none';

  const logoutBtn = document.getElementById('logoutButton');
  if (logoutBtn) logoutBtn.style.display = 'block';
  
  const showWelcome = document.getElementById('showWelcome');
  if (showWelcome) {
    showWelcome.style.display = 'block';
    showWelcome.textContent = `Bienvenue, ${username} !`;
  }
  const googleBtn = document.getElementById('googleLoginButton');
  if (googleBtn) googleBtn.style.display = 'none';
}

//affichage pour user deconnecte, maj UI
async function checkIfLoggedIn() {
  await tokenCheck(); //verif la validite du token en back
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('username'); // à stocker lors du login si tu veux
  if (token && name) {
    updateUIForLoggedInUser(name);
  }
}

//MAJ si user connecte
function updateUIForLoggedOutUser() {
  const showWelcome = document.getElementById('showWelcome');
  const logoutBtn = document.getElementById('logoutButton');
  if (showWelcome) showWelcome.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'none';

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (loginForm) loginForm.style.display = 'block';
  if (registerForm) registerForm.style.display = 'block';
  const googleBtn = document.getElementById('googleLoginButton');
  if (googleBtn) googleBtn.style.display = 'block';
}

//deconnection, supp token, reinitialise l'affichage
function logoutUser() {
  localStorage.removeItem('token');
  updateUIForLoggedOutUser();
}

// Verification du token
async function tokenCheck() {
  const backendUrl = "http://localhost:3000";
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const response = await fetch (`${backendUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Token invalide');
    } catch (err) {
      console.warn('Token expire ou invalide.');
      localStorage.removeItem('token');
      updateUIForLoggedOutUser();
    }
  }
}


///////// RENDER DE LA PAGE //////////////////////////////////////////

//ftc principale de rendu de la SPA
function render() {
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
		alert("Bienvenue dans notre projet Transcendance ! Veuillez choisir un mot de passe pour finaliser votre inscription! ");
		navigate('/choose-password');
		//return;
	}

	//gerer l'initialisation du mdp pas terminer, a terminer et commenter
	if (path === '/choose-password') {
		const token = localStorage.getItem("token");

		if (!token) {
			alert("Accès refusé. Veuillez vous connecter.");
			navigate("/profile");
			return;
		}
		// //setupChoosePasswordHandler(navigate);
	}

	if (token && name) {
	localStorage.setItem('token', token);
	localStorage.setItem('username', name);
	updateUIForLoggedInUser(name);
	// Nettoyer l'URL pour ne pas laisser les paramètres visibles
	window.history.replaceState({}, '', window.location.pathname);
	}

	//affiche la page correspondant a l'url ou 404
  const page = routes[path] || (() => '<h1>404 Not Found</h1>');
  document.getElementById('app')!.innerHTML = page();

  // On attend que le DOM ait fini de peindre le contenu HTML injecté
  requestAnimationFrame(() => { //attends le prochain refresh d'ecran
    if (path === '/play') {
      const localBtn = document.getElementById('localBtn');
      const localOptions = document.getElementById('localOptions');
      const onlineBtn = document.getElementById('onlineBtn');
      const onlineOptions = document.getElementById('onlineOptions');

      localBtn?.addEventListener('click', () => {
        toggleOptions(localOptions, onlineOptions);
      });

      onlineBtn?.addEventListener('click', () => {
        toggleOptions(onlineOptions, localOptions);
      });
    }

    if (path === '/profile') {
      const registerForm = document.getElementById('registerForm');
      if (registerForm)
        registerForm.addEventListener('submit', createUser);
      const loginForm = document.getElementById('loginForm');
      if (loginForm) {
        loginForm.addEventListener('submit', loginUser);
      }

      const logoutBtn = document.getElementById('logoutButton');
      if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
    }
    checkIfLoggedIn(); //verifie la session a chaque affichage
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
