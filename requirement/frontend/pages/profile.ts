// pages/profile.ts
import { apiBase } from "../src/utils";

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

      <!-- Historique des matchs : -->
      <div>
        <h2 class="text-xl font-semibold mb-3">Historique des matchs : </h2>
        <div id="historyContent" class="space-y-4"></div>
      </div>
    </div>
  `;
}

export function setupProfilePage() {
  const historyDiv = document.getElementById('historyContent');
  const showWelcome = document.getElementById('showWelcome') as HTMLElement | null;
  const logoutBtn = document.getElementById('logoutButton') as HTMLButtonElement | null;
  if (!historyDiv) return;

  const token = localStorage.getItem('token');
  const realName = (localStorage.getItem('name') || '').trim();
  const username = (localStorage.getItem('username') || realName).trim();

  // Si pas connecté (pas de token ou pas de realName valide)
  if (!token || !realName) {
    if (showWelcome) {
      showWelcome.classList.add('hidden');
      showWelcome.textContent = '';
    }
    if (logoutBtn) logoutBtn.classList.add('hidden');
    historyDiv.innerHTML = `<em class="text-gray-400">Connectez-vous pour voir votre historique.</em>`;
    return;
  }

  // Si connecté → afficher bienvenue + bouton logout
  if (username) {
    if (showWelcome) {
      showWelcome.classList.remove('hidden');
      showWelcome.textContent = `Bienvenue, ${username} !`;
    }
    if (logoutBtn) logoutBtn.classList.remove('hidden');
  }

  // Charger l’historique
  historyDiv.innerHTML = `<span class="text-gray-300">Chargement…</span>`;
  fetch(`${apiBase()}/users/${encodeURIComponent(realName)}/history`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((data) => {
      const matches = Array.isArray(data?.matches) ? data.matches : [];
      if (!matches.length) {
        historyDiv.innerHTML = `<em class="text-gray-400">Aucun match enregistré pour ${username}.</em>`;
        return;
      }

      const last10 = [...matches]
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      const html = last10
        .map((m: any) => {
          const isVictory = m.result === 'W';
          const resultLabel = isVictory ? 'Victoire' : 'Défaite';
          const cardBg = isVictory ? 'bg-green-200' : 'bg-red-200';
          const borderClr = isVictory ? 'border-green-400' : 'border-red-400';
          const when = new Date(m.date).toLocaleString();

          return `
            <div class="${cardBg} border ${borderClr} rounded-lg p-4 shadow space-y-2">
              <div class="flex flex-wrap items-center gap-3">
                <span class="font-bold text-black">${resultLabel}</span>
                <span class="opacity-60 text-black">•</span>
                <span class="text-black"><span class="font-semibold">Moi :</span> ${m.me}</span>
                <span class="opacity-60 text-black">•</span>
                <span class="text-black"><span class="font-semibold">Score :</span> ${m.myScore} - ${m.oppScore}</span>
                <span class="opacity-60 text-black">•</span>
                <span class="text-black"><span class="font-semibold">Adversaire :</span> ${m.opponent}</span>
              </div>
              <div class="text-xs opacity-70 text-black">${when}</div>
            </div>
          `;
        })
        .join('');

      historyDiv.innerHTML = html;
    })
    .catch((err) => {
      console.error(err);
      historyDiv.innerHTML = `<span class="text-red-400">Erreur de chargement de l’historique.</span>`;
    });
}


