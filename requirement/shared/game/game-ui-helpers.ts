// game-ui-helpers.ts - UI helper functions
export function getStartBtn()   { return document.getElementById("startBtn")    as HTMLButtonElement; }
export function getPauseBtn()   { return document.getElementById("pauseBtn")    as HTMLButtonElement; }
export function getRestartBtn() { return document.getElementById("restartBtn")  as HTMLButtonElement; }
export function getSettingsBtn(){ return document.getElementById("settingsBtn") as HTMLButtonElement; }

// Settings panel management
export function wireSettingsPanel(currentSpeedPercent: number, localGame: any, setLatestState: (state: any) => void, updateCurrentSpeedPercent?: (speed: number) => void) {
  const panel      = document.getElementById("settingsPanel");
  const slider     = document.getElementById("speedSlider") as HTMLInputElement | null;
  const speedValue = document.getElementById("speedValue");

  console.log("🔧 SETTINGS LOCAL:", { panel: !!panel, slider: !!slider, speedValue: !!speedValue, localGame: !!localGame });
  
  if (!panel || !slider || !speedValue) {
    console.error("❌ SETTINGS LOCAL MISSING ELEMENTS");
    return;
  }

  // init depuis l'état mémorisé
  slider.value = String(currentSpeedPercent);
  speedValue.textContent = `${currentSpeedPercent}%`;

  // MAJ en direct + applique à la partie en cours
  slider.oninput = () => {
    const p = Math.max(0, Math.min(100, Math.round(Number(slider.value) || 0)));
    speedValue.textContent = `${p}%`;
    console.log("🔧 LOCAL SLIDER CHANGED:", p);
    if (updateCurrentSpeedPercent) {
      updateCurrentSpeedPercent(p);
    }
    if (localGame) {
      console.log("🔧 APPLYING TO LOCAL GAME");
      localGame.setSpeedPercent(p);
    } else {
      console.log("❌ LOCAL GAME NOT AVAILABLE");
    }
  };

  // Bouton Apply : n'applique que les couleurs + ferme le panneau
  const applyBtn = document.getElementById("applySettings") as HTMLButtonElement | null;
  if (applyBtn) {
    const fresh = applyBtn.cloneNode(true) as HTMLButtonElement;
    applyBtn.replaceWith(fresh);
    fresh.onclick = () => {
      const ballColor   = (document.getElementById("ballColor") as HTMLInputElement).value;
      const paddleColor = (document.getElementById("paddleColor") as HTMLInputElement).value;
      console.log("🔧 LOCAL APPLY CLICKED:", { ballColor, paddleColor });
      if (localGame) {
        console.log("🔧 APPLYING COLORS TO LOCAL GAME");
        localGame.setColors(ballColor, paddleColor);
        const newState = {
          ...localGame.state,
          ballColor: localGame.ballColor,
          paddleColor: localGame.paddleColor
        };
        console.log("🔧 NEW STATE:", newState);
        setLatestState(newState);
        console.log("🔧 LOCAL GAME STATE UPDATED");
      } else {
        console.log("❌ LOCAL GAME NOT AVAILABLE FOR COLORS");
      }
      panel.style.display = "none";
    };
  }

  // Bouton Settings pour ouvrir/fermer le panneau
  const settingsBtn = getSettingsBtn();
  if (settingsBtn) {
    const freshBtn = settingsBtn.cloneNode(true) as HTMLButtonElement;
    settingsBtn.replaceWith(freshBtn);
    freshBtn.onclick = () => {
      const show = panel.style.display !== "block";
      panel.style.display = show ? "block" : "none";
    };
  }
}

// Settings panel for online games
export function wireSettingsPanelOnline(ws: WebSocket, currentSpeedPercent: number, setLatestState?: (state: any) => void) {
  const panel      = document.getElementById("settingsPanel");
  const slider     = document.getElementById("speedSlider") as HTMLInputElement | null;
  const speedValue = document.getElementById("speedValue");

  console.log("🔧 SETTINGS ONLINE:", { panel: !!panel, slider: !!slider, speedValue: !!speedValue, ws: !!ws });
  
  if (!panel || !slider || !speedValue) {
    console.error("❌ SETTINGS ONLINE MISSING ELEMENTS");
    return;
  }

  // init UI
  slider.value = String(currentSpeedPercent);
  speedValue.textContent = `${currentSpeedPercent}%`;

  // MAJ slider → envoi serveur
  slider.oninput = () => {
    const p = Math.max(0, Math.min(100, Math.round(Number(slider.value) || 0)));
    speedValue.textContent = `${p}%`;
    console.log("🔧 ONLINE SLIDER CHANGED:", p);
    if (ws?.readyState === WebSocket.OPEN) {
      console.log("🔧 SENDING TO WEBSOCKET:", { type: "settings:set", speedPercent: p });
      ws.send(JSON.stringify({ type: "settings:set", speedPercent: p }));
    } else {
      console.log("❌ WEBSOCKET NOT READY");
    }
  };

  // Bouton Apply : couleurs + fermeture panneau
  const applyBtn = document.getElementById("applySettings") as HTMLButtonElement | null;
  if (applyBtn) {
    const fresh = applyBtn.cloneNode(true) as HTMLButtonElement;
    applyBtn.replaceWith(fresh);
        fresh.onclick = () => {
          const ballColor   = (document.getElementById("ballColor") as HTMLInputElement).value;
          const paddleColor = (document.getElementById("paddleColor") as HTMLInputElement).value;
          console.log("🔧 ONLINE APPLY CLICKED:", { ballColor, paddleColor });
          if (ws?.readyState === WebSocket.OPEN) {
            console.log("🔧 SENDING COLORS TO WEBSOCKET:", { type: "settings:set", ballColor, paddleColor });
            ws.send(JSON.stringify({ type: "settings:set", ballColor, paddleColor }));
          } else {
            console.log("❌ WEBSOCKET NOT READY FOR COLORS");
          }
          
          // Update local state immediately for visual feedback
          if (setLatestState) {
            console.log("🔧 UPDATING LOCAL STATE FOR ONLINE GAME");
            setLatestState({
              ball: { x: 400, y: 300, vx: 5, vy: 5 },
              paddles: { p1: 300, p2: 300 },
              score: { p1: 0, p2: 0 },
              ballColor,
              paddleColor
            });
          }
          
          panel.style.display = "none";
        };
  }

  // Bouton Settings pour ouvrir/fermer le panneau
  const settingsBtn = getSettingsBtn();
  if (settingsBtn) {
    const freshBtn = settingsBtn.cloneNode(true) as HTMLButtonElement;
    settingsBtn.replaceWith(freshBtn);
    freshBtn.onclick = () => {
      const show = panel.style.display !== "block";
      panel.style.display = show ? "block" : "none";
    };
  }
}
