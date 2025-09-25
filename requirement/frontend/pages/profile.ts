// pages/profile.ts
import { apiBase, navigate } from "../src/utils";

export function renderProfile() {
  return `
    <div class="max-w-md mx-auto mt-8 p-6 bg-gray-800 rounded-lg shadow-md">
      <h1 class="text-3xl font-bold mb-6 text-center">Profil</h1>
      
      <!-- Infos utilisateur -->
      <div id="userInfo" class="mb-4 text-white" style="display:none;">
        <p><strong>Bienvenue </strong> <span id="currentUsername"></span> !</p>
      </div>

      <!-- Avatar actuel -->
      <div class="mb-4 text-center">
        <img id="currentAvatar" style="display:none; width: 100px; height: 100px; object-fit: cover; border-radius: 50%;" src="" alt="avatar" class="w-24 h-24 rounded-full mx-auto" />
      </div

      <!-- Choisir un avatar par défaut -->
      <div id="chooseAvatar" class="flex justify-center gap-4 mb-4" style="display:none">
        <button id="chooseCroco">
          <img src="http://localhost:3000/images/Croco.jpg" style="width: 100px; height: 100px; object-fit: cover; border-radius: 50%;" class="w-16 h-16 rounded-full" />
        </button>
        <button id="chooseAstro">
          <img src="http://localhost:3000/images/Astro.jpg" style="width: 100px; height: 100px; object-fit: cover; border-radius: 50%;" class="w-16 h-16 rounded-full" />
        </button>
      </div>

      <!-- Upload avatar -->
      <form id="uploadAvatarForm" style="display:none" method="POST" enctype="multipart/form-data">
        <input type="file" name="avatar" accept="image/*" />
        <button type="submit">Uploader mon avatar</button>
      </form>

      <!-- Formulaire changement pseudo -->
      <form id="changeUsernameForm" style="display:none;" class="space-y-2 mt-4">
        <input id="newUsername" type="text" placeholder="Nouveau pseudo" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <button type="submit" class="w-full bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded">Changer de pseudo</button>
      </form>

      <!-- Formulaire changement mdp -->
      <button id="changePasswordBtn" style="display:none;" class="space-y-2 mt-4">Changer mon mot de passe</button>
    
      <!-- Déconnexion -->
      <button id="logoutButton" style="display:none;" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded mt-4">Déconnexion</button>

      <!-- Inscription -->
      <form id="registerForm" class="mb-8 space-y-4">
        <h2 class="text-xl font-semibold">Inscription</h2>
        <input id="registerName" type="text" placeholder="Nom" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <input id="registerEmail" type="email" placeholder="Email" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <input id="registerPassword" type="password" placeholder="Mot de passe" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded">S'inscrire</button>
      </form>

      <!-- Connexion -->
      <form id="loginForm" class="space-y-4">
        <h2 class="text-xl font-semibold">Connexion</h2>
        <input id="loginName" type="text" placeholder="Nom" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <input id="loginPassword" type="password" placeholder="Mot de passe" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded">Se connecter</button>
      </form>

      <!-- Auth Google -->
      <a id="googleLoginButton" href="${apiBase()}/auth/google">
        <button style="padding: 10px 20px; background-color: #4285F4; color: white; border: none; border-radius: 5px;">Se connecter avec Google</button>
      </a>

      <!-- Dashboard Button (only visible when logged in) -->
      <div id="dashboardSection" class="flex justify-center mt-6" style="display:none;">
        <button id="showDashboardBtn" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow-lg">
          📊 Dashboard Avancé
        </button>
      </div>
  `;
}

async function ensureUserInfo() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  // Si déjà présent → inutile de re-fetch
  const name = localStorage.getItem('name');
  if (name) {
    return {
      id: localStorage.getItem('id'),
      name,
      username: localStorage.getItem('username')
    };
  }

  try {
    const res = await fetch(`${apiBase()}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();
    const user = data.user ?? data;

    localStorage.setItem("id", String(user.id || ""));
    localStorage.setItem("name", user.name || "");
    localStorage.setItem("username", user.username || user.name || "");

    return user;
  } catch (err) {
    console.error("Erreur fetch /me", err);
    return null;
  }
}


export async function setupProfilePage() {
  const dashboardSection = document.getElementById('dashboardSection') as HTMLElement | null;
  const userInfo = document.getElementById('userInfo') as HTMLElement | null;
  const logoutBtn = document.getElementById('logoutButton') as HTMLButtonElement | null;

  if (!dashboardSection) return;

  const token = localStorage.getItem('token');
  const realName = (localStorage.getItem('name') || '').trim();
  const username = (localStorage.getItem('username') || realName).trim();

  // Si pas connecté (pas de token ou pas d'identifiant valide)
  if (!token || (!realName && !username)) {
    // Hide dashboard section
    dashboardSection.style.display = 'none';
    
    if (userInfo) {
      userInfo.style.display = 'none';
    }
    if (logoutBtn) logoutBtn.style.display = 'none';
    return;
  }

  // Si connecté → afficher bienvenue + bouton logout + dashboard
  const displayName = username || realName;
  if (displayName) {
    // Show dashboard section
    dashboardSection.style.display = 'flex';
    
    if (userInfo) {
      userInfo.style.display = 'block';
      const currentUsername = document.getElementById('currentUsername');
      if (currentUsername) {
        currentUsername.textContent = displayName;
      }
    }
    if (logoutBtn) logoutBtn.style.display = 'block';
  }

  // Dashboard button event listener
  const dashboardBtn = document.getElementById('showDashboardBtn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/dashboard');
    });
  }
}


