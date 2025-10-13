// game-ui-helpers.ts - UI helper functions
import { initializeSettingsPanel } from './settings-helpers';
export function getStartBtn()   { return document.getElementById("startBtn")    as HTMLButtonElement; }
export function getPauseBtn()   { return document.getElementById("pauseBtn")    as HTMLButtonElement; }
export function getRestartBtn() { return document.getElementById("restartBtn")  as HTMLButtonElement; }
export function getSettingsBtn(){ return document.getElementById("settingsBtn") as HTMLButtonElement; }

// Settings panel management
export function wireSettingsPanel(currentSpeedPercent: number, localGame: any, setLatestState: (state: any) => void, updateCurrentSpeedPercent?: (speed: number) => void, translateFn?: (key: string) => string) {
  const panel = document.getElementById("settingsPanel");
  
  if (!panel) {
    return;
  }

  // Initialiser le panneau en mode local
  initializeSettingsPanel(false, translateFn);
  
  const slider     = document.getElementById("speedSlider") as HTMLInputElement | null;
  const speedValue = document.getElementById("speedValue");

  if (!slider || !speedValue) {
    return;
  }

  // init depuis l'état mémorisé
  slider.value = String(currentSpeedPercent);
  speedValue.textContent = `${currentSpeedPercent}%`;

  // MAJ en direct + applique à la partie en cours
  slider.oninput = () => {
    const p = Math.max(0, Math.min(100, Math.round(Number(slider.value) || 0)));
    speedValue.textContent = `${p}%`;
    if (updateCurrentSpeedPercent) {
      updateCurrentSpeedPercent(p);
    }
    if (localGame) {
      localGame.setSpeedPercent(p);
    }
  };

  // Bouton Apply : applique les couleurs et tailles + ferme le panneau
  const applyBtn = document.getElementById("applySettings") as HTMLButtonElement | null;
  if (applyBtn) {
    const fresh = applyBtn.cloneNode(true) as HTMLButtonElement;
    applyBtn.replaceWith(fresh);
    fresh.onclick = () => {
      const ballColor   = (document.getElementById("ballColor") as HTMLInputElement).value;
      const paddleColor = (document.getElementById("paddleColor") as HTMLInputElement).value;
      const ballSize    = (document.getElementById("ballSize") as HTMLSelectElement).value;
      const paddleSize  = (document.getElementById("paddleSize") as HTMLSelectElement).value;
      if (localGame) {
        localGame.setColors(ballColor, paddleColor);
        localGame.setBallSize(ballSize as 'small' | 'normal' | 'large');
        localGame.setPaddleSize(paddleSize as 'small' | 'normal' | 'large');
        
        // Mettre à jour l'état avec toutes les propriétés actuelles
        const newState = {
          ...localGame.state,
          ballColor: localGame.ballColor,
          paddleColor: localGame.paddleColor,
          paddleHeight: localGame.paddleHeight,
          ball: {
            ...localGame.state.ball,
            radius: localGame.getBallRadius()
          }
        };
        setLatestState(newState);
      }
      panel.classList.add('hidden');
      
      // Update button visibility after closing settings panel
      if (typeof window !== 'undefined' && (window as any).updateSettingsButtonVisibility) {
        (window as any).updateSettingsButtonVisibility();
      }
    };
  }

  // Bouton Settings pour ouvrir/fermer le panneau
  const settingsBtn = getSettingsBtn();
  if (settingsBtn) {
    const freshBtn = settingsBtn.cloneNode(true) as HTMLButtonElement;
    settingsBtn.replaceWith(freshBtn);
    freshBtn.onclick = () => {
      const show = panel.classList.contains('hidden');
      if (show) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
      
      // If closing the panel, update button visibility
      if (!show) {
        if (typeof window !== 'undefined' && (window as any).updateSettingsButtonVisibility) {
          (window as any).updateSettingsButtonVisibility();
        }
      }
    };
  }
}

// Settings panel for online games
export function wireSettingsPanelOnline(ws: WebSocket, currentSpeedPercent: number, setLatestState?: (state: any) => void, translateFn?: (key: string) => string) {
  const panel = document.getElementById("settingsPanel");
  
  if (!panel) {
    return;
  }

  // Initialiser le panneau en mode online
  initializeSettingsPanel(true, translateFn);
  
  const slider     = document.getElementById("speedSlider") as HTMLInputElement | null;
  const speedValue = document.getElementById("speedValue");

  if (!slider || !speedValue) {
    return;
  }

  // init UI
  slider.value = String(currentSpeedPercent);
  speedValue.textContent = `${currentSpeedPercent}%`;

  // MAJ slider → envoi serveur
  slider.oninput = () => {
    const p = Math.max(0, Math.min(100, Math.round(Number(slider.value) || 0)));
    speedValue.textContent = `${p}%`;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "settings:set", speedPercent: p }));
    }
  };

  // Bouton Apply : couleurs et tailles + fermeture panneau
  const applyBtn = document.getElementById("applySettings") as HTMLButtonElement | null;
  if (applyBtn) {
    const fresh = applyBtn.cloneNode(true) as HTMLButtonElement;
    applyBtn.replaceWith(fresh);
        fresh.onclick = () => {
          const ballColor   = (document.getElementById("ballColor") as HTMLInputElement).value;
          const paddleColor = (document.getElementById("paddleColor") as HTMLInputElement).value;
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "settings:set", ballColor, paddleColor }));
          }
          
          // Update local state immediately for visual feedback (colors only)
          if (setLatestState) {
            setLatestState({
              ball: { x: 400, y: 300, vx: 5, vy: 5, radius: 12 }, // Default size
              paddles: { p1: 300, p2: 300 },
              score: { p1: 0, p2: 0 },
              ballColor,
              paddleColor,
              paddleHeight: 67 // Default size
            });
          }

          panel.classList.add('hidden');
          
          // Update button visibility after closing settings panel
          if (typeof window !== 'undefined' && (window as any).updateSettingsButtonVisibility) {
            (window as any).updateSettingsButtonVisibility();
          }
        };
  }

  // Bouton Settings pour ouvrir/fermer le panneau
  const settingsBtn = getSettingsBtn();
  if (settingsBtn) {
    const freshBtn = settingsBtn.cloneNode(true) as HTMLButtonElement;
    settingsBtn.replaceWith(freshBtn);
    freshBtn.onclick = () => {
      const show = panel.classList.contains('hidden');
      if (show) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
      
      // If closing the panel, update button visibility
      if (!show) {
        if (typeof window !== 'undefined' && (window as any).updateSettingsButtonVisibility) {
          (window as any).updateSettingsButtonVisibility();
        }
      }
    };
  }
}
