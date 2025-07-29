
// export function renderHome() {
//   return `
//     <h1 class="text-3xl font-bold mb-4">🏓 Pong Online</h1>
//     <p>Welcome! Start a match or view your profile.</p>
//   `;
// }

// export function renderHome(): string {
//   return `
//     <div class="flex items-center justify-center min-h-screen">
//       <h1 class="text-4xl">Welcome to Pong!</h1>
//     </div>
//   `;
// }

export function renderHome(): string {
  return `
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 class="text-5xl font-extrabold mb-6">🏓 Pong Game</h1>
      <a href="/play" data-link class="text-xl bg-blue-500 px-6 py-2 rounded hover:bg-blue-600">
        Start Playing
      </a>
    </div>
  `;
}
