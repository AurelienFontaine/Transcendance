export function renderProfile() {
  return `
    <div class="max-w-md mx-auto mt-8 p-6 bg-gray-800 rounded-lg shadow-md">
      <h1 class="text-3xl font-bold mb-6 text-center">Profil</h1>
      
      <div id="showWelcome" style="display:none;"></div>
      <button id="logoutButton" style="display:none;" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded">Déconnexion</button>

      <form id="registerForm" class="mb-8 space-y-4">
        <h2 class="text-xl font-semibold">Inscription</h2>
        <input id="registerName" type="text" placeholder="Nom" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <input id="registerEmail" type="email" placeholder="Email" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <input id="registerPassword" type="password" placeholder="Mot de passe" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded">S'inscrire</button>
      </form>

      <form id="loginForm" class="space-y-4">
        <h2 class="text-xl font-semibold">Connexion</h2>
        <input id="loginName" type="text" placeholder="Nom" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <input id="loginPassword" type="password" placeholder="Mot de passe" class="w-full p-2 rounded bg-gray-700 text-white" required />
        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded">Se connecter</button>
      </form>
    </div>
  `;
}