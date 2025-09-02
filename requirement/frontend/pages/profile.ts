export function renderProfile() {
  return `
    <div class="max-w-md mx-auto mt-8 p-6 bg-gray-800 rounded-lg shadow-md">
      <h1 class="text-3xl font-bold mb-6 text-center">Profil</h1>
      
      <!-- Infos utilisateur -->
      <div id="userInfo" class="mb-4 text-white" style="display:none;">
        <p><strong>Bienvenue </strong> <span id="currentUsername"></span> !</p>
      </div>

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
        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded">S'inscrire</button>
      </form>

      <!-- Connexion -->
      <form id="loginForm" class="space-y-4">
        <h2 class="text-xl font-semibold">Connexion</h2>
        <input id="loginName" type="text" placeholder="Nom" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <input id="loginPassword" type="password" placeholder="Mot de passe" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded">Se connecter</button>
      </form>

      <!-- Auth Google -->
      <a id="googleLoginButton" href="http://localhost:3000/auth/google">
        <button style="padding: 10px 20px; background-color: #4285F4; color: white; border: none; border-radius: 5px;">Se connecter avec Google</button>
      </a>
    </div>
  `;
}
