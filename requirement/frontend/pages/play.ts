// export function renderPlay() {
//   return `
//     <h1 class="text-3xl font-bold mb-4">Choose a Game Mode</h1>
//     <div class="flex flex-col gap-4 items-center">
//       <a href="/play/local" data-link class="w-40 text-center bg-green-500 px-4 py-2 rounded hover:bg-green-600">Local</a>
//       <a href="/play/online" data-link class="w-40 text-center bg-blue-500 px-4 py-2 rounded hover:bg-blue-600">Online</a>
//       <!-- <a href="/play/" data-link class="w-40 text-center bg-red-500 px-4 py-2 rounded hover:bg-red-600">Ranked Match</a>
//       -->
//     </div>
//   `;
// }

export function renderPlay() {
  return `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 class="text-3xl font-bold mb-6">Choose a Game Mode</h1>

      <div class="flex flex-col gap-4 items-center">
        <button id="localBtn" class="w-40 text-center bg-green-500 px-4 py-2 rounded hover:bg-green-600">Local</button>
        <div id="localOptions"
            class="hidden flex flex-col gap-2 mt-2 opacity-0 scale-y-0 transition-all duration-300 transform origin-top">
          <a href="/play/local/friend" data-link class="w-40 text-center bg-green-300 px-3 py-1 rounded hover:bg-green-400 text-sm">Play with a Friend</a>
          <a href="/play/local/bot" data-link class="w-40 text-center bg-green-300 px-3 py-1 rounded hover:bg-green-400 text-sm">Play vs Bot</a>
        </div>

        <button id="onlineBtn" class="w-40 text-center bg-blue-500 px-4 py-2 rounded hover:bg-blue-600">Online</button>
        <div id="onlineOptions"
            class="hidden flex flex-col gap-2 mt-2 opacity-0 scale-y-0 transition-all duration-300 transform origin-top">
          <a href="/play/online/public" data-link class="w-40 text-center bg-blue-300 px-3 py-1 rounded hover:bg-blue-400 text-sm">Public Match</a>
          <a href="/play/online/private" data-link class="w-40 text-center bg-blue-300 px-3 py-1 rounded hover:bg-blue-400 text-sm">Private Room</a>
        </div>
      </div>
    </div>
  `;
}