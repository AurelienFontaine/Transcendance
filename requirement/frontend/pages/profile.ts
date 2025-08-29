// pages/profile.ts
export function renderProfile() {
  return `
    <div class="max-w-md mx-auto mt-8 p-6 bg-gray-800 rounded-lg shadow-md space-y-6">
      <h1 class="text-3xl font-bold text-center">Profil</h1>

      <div id="showWelcome" class="text-center font-medium hidden"></div>
      <button id="logoutButton" class="hidden bg-red-600 hover:bg-red-700 text-white p-2 rounded w-full">Déconnexion</button>

      <form id="registerForm" class="space-y-4">
        <h2 class="text-xl font-semibold">Inscription</h2>
        <input id="registerName" type="text" placeholder="Nom" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <input id="registerEmail" type="email" placeholder="Email" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <input id="registerPassword" type="password" placeholder="Mot de passe" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded">S'inscrire</button>
      </form>

      <form id="loginForm" class="space-y-4">
        <h2 class="text-xl font-semibold">Connexion</h2>
        <input id="loginName" type="text" placeholder="Nom" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <input id="loginPassword" type="password" placeholder="Mot de passe" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded">Se connecter</button>
      </form>

      <div>
        <h2 class="text-xl font-semibold mb-3">Historique des matchs</h2>
        <!-- IMPORTANT: parent avec space-y-4 -->
        <div id="historyContent" class="space-y-4"></div>
      </div>
    </div>
  `;
}

/** À appeler depuis main.ts quand path === '/profile' */
export function setupProfilePage() {
  const historyDiv = document.getElementById('historyContent');
  const showWelcome = document.getElementById('showWelcome') as HTMLElement | null;
  const logoutBtn = document.getElementById('logoutButton') as HTMLButtonElement | null;
  if (!historyDiv) return;

  // Nom connecté (si présent)
  const name = (localStorage.getItem('username') || '').trim();

  // Affichage bienvenue + bouton logout si connecté
  if (name) {
    if (showWelcome) {
      showWelcome.classList.remove('hidden');
      showWelcome.textContent = `Bienvenue, ${name} !`;
    }
    if (logoutBtn) logoutBtn.classList.remove('hidden');
  }

  // Si pas connecté
  if (!name) {
    historyDiv.innerHTML = `<em class="text-gray-400">Connectez-vous pour voir votre historique.</em>`;
    return;
  }

  historyDiv.innerHTML = `<span class="text-gray-300">Chargement…</span>`;

  fetch(`http://localhost:3000/users/${encodeURIComponent(name)}/history`)
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((data) => {
      console.log('[profile] matches from backend:', data);
      const matches = Array.isArray(data?.matches) ? data.matches : [];
      if (!matches.length) {
        historyDiv.innerHTML = `<em class="text-gray-400">Aucun match enregistré pour ${name}.</em>`;
        return;
      }

      // Ne garder que les 10 derniers matchs (du plus récent au plus ancien)
  const last10 = [...matches].sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 10);

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
        <span class="text-black"><span class="font-semibold">Username :</span> ${m.me}</span>
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
