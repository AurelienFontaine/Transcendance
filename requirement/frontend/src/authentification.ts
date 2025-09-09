const backendUrl = "http://localhost:3000";

import { navigate } from "./utils";

import * as userM from "./user_management";

export async function createUser(event: Event) {
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
    localStorage.setItem('username', data.username);
	navigate("/profile");
  }
  else {
    alert(JSON.stringify(data));
  }
}

export async function loginUser(event: Event) {
  event.preventDefault();
  const nameInput = document.getElementById("loginName") as HTMLInputElement;
  const passwordInput = document.getElementById("loginPassword") as HTMLInputElement;
  const name = nameInput.value;
  const password = passwordInput.value;

  const response = await fetch (`${backendUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({name, password}),
  });

  // Recuperation & stockage en local (client) des donnees USER + refresh la page
  const data = await response.json();
  if (data.token && data.username) { //gestion du log cote client si login reussi
    localStorage.setItem('token', data.token); //stock JWT
    localStorage.setItem('username', data.username); 
	  navigate("/profile"); // force le refresh pour mettre a jour l'UI
  } else {
    alert("Erreur : " + (data.error || "Connexion echouee"));
  }
  // alert(JSON.stringify(data)); //pour print la data de connexion
}


export function updateUIForLoggedInUser() {  
  const loginForm = document.getElementById('loginForm');
  if (loginForm)
    loginForm.style.display = 'none';

  const registerForm = document.getElementById('registerForm');
  if (registerForm)
    registerForm.style.display = 'none';

  const logoutBtn = document.getElementById('logoutButton');
  if (logoutBtn)
    logoutBtn.style.display = 'block';

  const googleBtn = document.getElementById('googleLoginButton');
  if (googleBtn)
    googleBtn.style.display = 'none';

  const chatLink = document.getElementById('chatLink');
	if (chatLink)
    chatLink.style.display = 'inline-block';

  const avatarUser = document.getElementById('currentAvatar');
  if (avatarUser)
    avatarUser.style.display = "block";

  const chooseAvatar = document.getElementById('chooseAvatar');
  if (chooseAvatar)
    chooseAvatar.style.display = "block";

  const uploadAvatarForm = document.getElementById('uploadAvatarForm');
  if (uploadAvatarForm)
    uploadAvatarForm.style.display = "block";

	const username = localStorage.getItem('username');
	const userInfo = document.getElementById('userInfo');
	const currentUsername = document.getElementById('currentUsername');
	const changeForm = document.getElementById('changeUsernameForm');
  const passwordChangeBtn = document.getElementById('changePasswordBtn');
  userM.loadAvatar();
	if (username && userInfo && currentUsername && changeForm && passwordChangeBtn) {
		userInfo.style.display = 'block';
		changeForm.style.display = 'block';
    // passwordForm.style.display = 'block';
    passwordChangeBtn.style.display = 'block';
		currentUsername.textContent = username;
		// Handle le changement de username
		changeForm.addEventListener('submit', (e) => {
		  e.preventDefault();
		  userM.changeUsername(e);
		});
	}
}


export async function checkIfLoggedIn() {
  await tokenCheck(); //verif la validite du token en back
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  if (token && username)
    updateUIForLoggedInUser();
}

export function updateUIForLoggedOutUser() {
	const userInfo = document.getElementById('userInfo');
	if (userInfo)
		userInfo.style.display = 'none';

  const changeForm = document.getElementById('changeUsernameForm');
  if (changeForm)
		changeForm.style.display = 'none';

  const passwordChangeBtn = document.getElementById('changePasswordBtn');
  if (passwordChangeBtn)
    passwordChangeBtn.style.display = 'none';

  const logoutBtn = document.getElementById('logoutButton');
  if (logoutBtn)
    logoutBtn.style.display = 'none';

  const loginForm = document.getElementById('loginForm');
  if (loginForm)
    loginForm.style.display = 'block';

  const registerForm = document.getElementById('registerForm');
  if (registerForm)
    registerForm.style.display = 'block';

  const googleBtn = document.getElementById('googleLoginButton');
  if (googleBtn)
    googleBtn.style.display = 'block';

  const chatLink = document.getElementById('chatLink');
	if (chatLink)
    chatLink.style.display = 'none';

   const avatarUser = document.getElementById('currentAvatar');
  if (avatarUser)
    avatarUser.style.display = "none";

  const chooseAvatar = document.getElementById('chooseAvatar');
  if (chooseAvatar)
    chooseAvatar.style.display = "none";

  const uploadAvatarForm = document.getElementById('uploadAvatarForm');
  if (uploadAvatarForm)
    uploadAvatarForm.style.display = "none";
}

export function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  updateUIForLoggedOutUser();
  navigate('/profile'); //refresh de la page
}

export async function tokenCheck() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const response = await fetch (`${backendUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok)
        throw new Error('Token invalide');
    } catch (err) {
      console.warn('Token expire ou invalide.');
      logoutUser();
    }
  }
}