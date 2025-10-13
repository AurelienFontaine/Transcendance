// settings-helpers.ts - Helper functions for dynamic settings panel

// Fonction pour générer le contenu du panneau de paramètres selon le mode
export function generateSettingsContent(isOnlineMode: boolean = false, translateFn?: (key: string) => string) {
  // Use provided translation function or fallback to English
  const t = translateFn || ((key: string) => {
    const translations: { [key: string]: string } = {
      'play.ballSpeed': 'Ball Speed',
      'play.ballColor': 'Ball Color',
      'play.paddleColor': 'Paddle Color',
      'play.ballSize': 'Ball Size',
      'play.paddleSize': 'Paddle Size',
      'play.small': 'Small',
      'play.normal': 'Normal',
      'play.large': 'Large',
      'play.disabledOnline': 'Disabled in online mode'
    };
    return translations[key] || key;
  });

  let sizeControlsHtml = '';
  if (!isOnlineMode) {
    // En mode local, inclure les contrôles de taille
    sizeControlsHtml = `
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2">${t('play.ballSize')}</label>
          <select id="ballSize" class="w-full h-10 bg-gray-600 rounded-lg border border-gray-500 text-white px-3">
            <option value="small">${t('play.small')}</option>
            <option value="normal" selected>${t('play.normal')}</option>
            <option value="large">${t('play.large')}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">${t('play.paddleSize')}</label>
          <select id="paddleSize" class="w-full h-10 bg-gray-600 rounded-lg border border-gray-500 text-white px-3">
            <option value="small">${t('play.small')}</option>
            <option value="normal" selected>${t('play.normal')}</option>
            <option value="large">${t('play.large')}</option>
          </select>
        </div>
      </div>
    `;
  } else {
    // En mode online, désactiver les contrôles de taille
    sizeControlsHtml = `
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2 text-gray-400">${t('play.ballSize')}</label>
          <select id="ballSize" class="w-full h-10 bg-gray-700 rounded-lg border border-gray-600 text-gray-400 px-3" disabled>
            <option value="normal" selected>${t('play.normal')}</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">${t('play.disabledOnline')}</p>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2 text-gray-400">${t('play.paddleSize')}</label>
          <select id="paddleSize" class="w-full h-10 bg-gray-700 rounded-lg border border-gray-600 text-gray-400 px-3" disabled>
            <option value="normal" selected>${t('play.normal')}</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">${t('play.disabledOnline')}</p>
        </div>
      </div>
    `;
  }

  return `
    <div>
      <label class="block text-sm font-medium mb-2">${t('play.ballSpeed')}</label>
      <div class="flex items-center gap-3">
        <input id="speedSlider" type="range" min="1" max="100" value="50" 
               class="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
        <span id="speedValue" class="w-16 text-center font-semibold">50%</span>
      </div>
    </div>
    
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium mb-2">${t('play.ballColor')}</label>
        <input type="color" id="ballColor" value="#FFFFFF" 
               class="w-full h-10 bg-gray-600 rounded-lg border border-gray-500" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-2">${t('play.paddleColor')}</label>
        <input type="color" id="paddleColor" value="#FFFFFF" 
               class="w-full h-10 bg-gray-600 rounded-lg border border-gray-500" />
      </div>
    </div>
    
    ${sizeControlsHtml}
  `;
}

// Fonction pour initialiser le panneau de paramètres selon le mode
export function initializeSettingsPanel(isOnlineMode: boolean = false, translateFn?: (key: string) => string) {
  const settingsContent = document.getElementById("settingsContent");
  if (settingsContent) {
    settingsContent.innerHTML = generateSettingsContent(isOnlineMode, translateFn);
  }
}
