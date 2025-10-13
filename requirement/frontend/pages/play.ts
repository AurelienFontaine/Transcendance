// requirement/frontend/pages/play2.ts
import type { Page } from '../src/router';
import { Router } from '../src/router';
import { Tournament, type Match } from "../handlers/game/tournament";
import { __forceRender as forceGameRender, startLocalMatch, showBoardForTournament, cleanupGame } from "../handlers/game/game-front";
import { t } from '../handlers/language';

// La fonction cleanupGame est maintenant importée de game-front.ts
import { apiBase } from "../src/utils";
import { notify } from '../handlers/notify';

type Player = { id: number; name: string; display: string };
type TournamentPlayer = { id: number; display: string };

// État de vue persistant pour corriger les soucis de refresh / navigation
type PlayView = "root" | "localMenu" | "onlineMenu" | "quickPlay" | "tournament" | "onlineGame";

export class Play2Page implements Page {
  private tournament: Tournament | null = null;
  private currentMatch: { p1: Player; p2: Player } | null = null;
  private players: Player[] = [];
  private displaySelf: Player | null = null;
  private playView: PlayView = "root";
  private launchMatchBtnHandler: (() => void) | null = null;

  // Handlers
  private localBtnHandler: () => void;
  private backToModeBtnHandler: () => void;
  private backToModeOnlineBtnHandler: () => void;
  private onlineBtnHandler: () => void;
  private quickPlayBtnHandler: () => void;
  private tournamentBtnHandler: () => void;
  private addPlayerBtnHandler: () => Promise<void>;
  private startTournamentBtnHandler: () => void;
  private resetTournamentBtnHandler: () => void;
  private closeTournamentBtnHandler: () => void;
  private resetSettingsHandler: () => void;
  private startOnlineGameBtnHandler: () => void;

  // Game control handlers
  private startBtnHandler: () => void;
  private pauseBtnHandler: () => void;
  private restartBtnHandler: () => void;
  private settingsBtnHandler: () => void;
  private applySettingsHandler: () => void;
  private backGameBtnHandler: () => void;

  private router: Router | null = null;

  constructor() {
    // Récupération de l'état persistant
    this.playView = (localStorage.getItem("playView") as PlayView) || "root";
    
    // Binding des handlers
    this.localBtnHandler = this.handleLocalBtnClick.bind(this);
    this.backToModeBtnHandler = this.handleBackToModeBtnClick.bind(this);
    this.backToModeOnlineBtnHandler = this.handleBackToModeOnlineBtnClick.bind(this);
    this.onlineBtnHandler = this.handleOnlineBtnClick.bind(this);
    this.startOnlineGameBtnHandler = this.handleStartOnlineGameBtnClick.bind(this);
    this.quickPlayBtnHandler = this.handleQuickPlayBtnClick.bind(this);
    this.tournamentBtnHandler = this.handleTournamentBtnClick.bind(this);
    this.closeTournamentBtnHandler = this.handleCloseTournamentBtnClick.bind(this);
    this.addPlayerBtnHandler = this.handleAddPlayerBtnClick.bind(this);
    this.startTournamentBtnHandler = this.handleStartTournamentBtnClick.bind(this);
    this.resetTournamentBtnHandler = this.handleResetTournamentBtnClick.bind(this);
    this.resetSettingsHandler = this.handleResetSettingsClick.bind(this);
    
    // Game control handlers
    this.startBtnHandler = this.handleStartBtnClick.bind(this);
    this.pauseBtnHandler = this.handlePauseBtnClick.bind(this);
    this.restartBtnHandler = this.handleRestartBtnClick.bind(this);
    this.settingsBtnHandler = this.handleSettingsBtnClick.bind(this);
    this.applySettingsHandler = this.handleApplySettingsClick.bind(this);
    this.resetSettingsHandler = this.handleResetSettingsClick.bind(this);
    this.backGameBtnHandler = this.handleBackGameBtnClick.bind(this);
  }

  setRouter(router: Router): void {
    this.router = router;
  }

  render(): string {
    return `
      <div class="min-h-screen">
        <div class="container mx-auto px-4 py-8">
          
          <!-- Header Section -->
          <div id="playHeader" class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-2">🎮 ${t('play.title')}</h1>
            <p class="text-gray-400">${t('play.chooseMode')}</p>
          </div>
          
          <!-- === Section 1 : choix du mode === -->
          <section id="modeChoice" class="max-w-4xl mx-auto mb-8">
            <div class="bg-base-100 rounded-lg shadow-xl p-6">
              <h2 class="text-2xl font-semibold text-center mb-6">${t('play.chooseMode')}</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button id="localBtn" class="btn btn-primary">
                  <div class="flex items-center justify-center">
                    <div class="text-4xl">🏠</div>
                    <div>
                      <h3 class="text-xl font-semibold">${t('play.localTitle')}</h3>
            <!--          <p class="text-blue-100 text-sm">${t('play.localBtn')}</p> 		-->
                    </div>
                  </div>
                </button>
                <button id="onlineBtn" class="btn btn-primary">
                  <div class="flex items-center justify-center gap-4">
                    <div class="text-4xl">🌐</div>
                    <div>
                      <h3 class="text-xl font-semibold">${t('play.onlineBtn')}</h3>
               <!--       <p class="text-green-100 text-sm">${t('play.onlineBtn')}</p>		-->
                    </div>
                  </div>
                </button>
              </div>
              <div id="playAlert" class="hidden mt-4 p-4 bg-red-600 rounded-lg text-base-content font-semibold text-center"></div>
            </div>
          </section>
          
          <!-- === Section 2 : sous-menu local === -->
          <section id="localSubmenu" class="max-w-4xl mx-auto mb-8 hidden">
            <div class="bg-base-100 rounded-lg shadow-xl p-6">
              <h3 class="text-2xl font-semibold text-center mb-6">${t('play.localTitle')}</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button id="quickPlayBtn" class="btn btn-secondary">
                  <div class="flex items-center justify-center gap-4">
                    <div class="text-3xl">⚡</div>
                    <div>
                      <h4 class="font-semibold">${t('play.quickBtn')}</h4>
                    </div>
                  </div>
                </button>
                <button id="tournamentBtn" class="btn btn-secondary">
                  <div class="flex items-center justify-center gap-4">
                    <div class="text-3xl">🏆</div>
                    <div>
                      <h4 class="font-semibold">${t('play.tournamentBtn')}</h4>
                    </div>
                  </div>
                </button>
                <button id="backToModeBtn" class="btn btn-ghost">
                  <div class="flex items-center justify-center gap-4">
                    <div class="text-3xl">↩️</div>
                    <div>
                      <h4 class="font-semibold">${t('play.backBtn')}</h4>
                    </div>
                  </div>
                </button>
              </div>
              <div id="playAlertLocal" class="hidden mt-4 p-4 bg-red-600 rounded-lg text-base-content font-semibold text-center"></div>
            </div>
          </section>
          
          <!-- === Section 2.5 : sous-menu online === -->
          <section id="onlineSubmenu" class="max-w-4xl mx-auto mb-8 hidden">
            <div class="bg-base-100 rounded-lg shadow-xl p-6">
              <h3 class="text-2xl font-semibold text-center mb-6">${t('play.onlineTitle')}</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button id="startOnlineGameBtn" class="btn btn-success">
                  <div class="flex items-center justify-center gap-4">
                    <div class="text-3xl">🚀</div>
                    <div>
                      <h4 class="font-semibold">${t('play.startOnlineGame')}</h4>
                    </div>
                  </div>
                </button>
                <button id="backToModeOnlineBtn" class="btn btn-ghost">
                  <div class="flex items-center justify-center gap-4">
                    <div class="text-3xl">↩️</div>
                    <div>
                      <h4 class="font-semibold">${t('play.backBtn')}</h4>
                    </div>
                  </div>
                </button>
              </div>
              <div id="playAlertOnline" class="hidden mt-4 p-4 bg-red-600 rounded-lg text-base-content font-semibold text-center"></div>
            </div>
          </section>
          
          <!-- === Section 3 : panneau tournoi (caché par défaut) === -->
          <section id="tournamentPanel" class="max-w-6xl mx-auto mb-8 hidden">
            <div class="bg-base-100 rounded-lg shadow-xl p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-semibold">🏆 ${t('play.tournamentTitle')}</h2>
                <button id="closeTournamentBtn" class="btn btn-error">
                  ✕ ${t('play.backBtn')}
                </button>
              </div>
              
              <div id="registration" class="bg-base-200 rounded-lg p-4 mb-6">
                <h3 class="text-lg font-semibold mb-4">${t('play.addPlayer')}</h3>
                <div class="flex flex-wrap gap-3 items-center">
                  <label for="aliasInput" class="label">
                    <span class="label-text">${t('auth.fields.name')} : </label
                  </label>
                  <input id="aliasInput" placeholder="${t('play.aliasPlaceholder')}" class="input input-bordered flex-1 min-w-48"/>
                  <button id="addPlayerBtn" class="btn btn-success">➕ ${t('play.addPlayer')}</button>
                  <button id="startTournamentBtn" class="btn btn-primary">
                    🚀 ${t('play.startTournament')}
                  </button>
                  <button id="resetTournamentBtn" class="btn btn-ghost">
                    🔄 ${t('play.resetTournament')}
                  </button>
                </div>
              </div>
              
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div id="playerList" class="bg-base-200 rounded-lg p-4">
                  <h3 class="text-lg font-semibold mb-3">👥 ${t('play.addPlayer')}</h3>
                  <div class="space-y-2 text-sm"></div>
                </div>
                <div id="matchInfo" class="bg-base-200 rounded-lg p-4">
                  <h3 class="text-lg font-semibold mb-3">🎯 ${t('play.nextMatch', { player1: '', player2: '' }).split(':')[0]}</h3>
                </div>
              </div>
              
              <div id="standings" class="mt-6 bg-base-200 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-3">📊 ${t('play.standingsTitle')}</h3>
              </div>
            </div>
          </section>
          
          <!-- === Section 4 : zone du jeu (canvas + boutons) === -->
          <section class="max-w-6xl mx-auto">
            <div id="menu" class="hidden"></div>
            
            <!-- Game Container -->
            <div id="gamecontainer" class="hidden relative bg-base-100 rounded-lg shadow-xl p-6">
              <div class="text-center mb-4">
                <h3 class="text-2xl font-semibold mb-2">🎮 ${t('play.gameInProgress')}</h3>
                <p class="text-gray-400">${t('play.gameDescription')}</p>
              </div>
              
              <!-- Game Controls -->
              <div class="flex flex-wrap justify-center gap-4 mb-6">
                <button id="startBtn" class="hidden btn btn-success">
                  ▶️ ${t('play.startBtn')}
                </button>
                <button id="pauseBtn" class="hidden btn btn-warning">
                  ⏸️ ${t('play.pauseBtn')}
                </button>
                <button id="restartBtn" class="hidden btn btn-error">
                  🔄 ${t('play.restartBtn')}
                </button>
                <button id="settingsBtn" class="hidden btn btn-info">
                  ⚙️ ${t('play.settingsBtn')}
                </button>
                <button id="backGameBtn" class="hidden bg-gray-600 hover:bg-gray-700 text-white px-8 py-4 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-lg">
                  ↩️ ${t('play.backBtn')}
                </button>
              </div>
              
              <!-- Game Canvas -->
              <div class="flex justify-center">
                <div id="gameApp" class="relative rounded-xl shadow-2xl overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-slate-900 via-purple-900/20 to-pink-900/20 w-[1000px] h-[700px]"></div>
              </div>
              
              <!-- Settings Panel -->
              <div id="settingsPanel" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-base-100 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                  <h3 class="text-xl font-semibold mb-4 text-center">⚙️ ${t('play.settingsTitle')}</h3>
                  
                  <div id="settingsContent" class="space-y-4">
                    <!-- Content will be generated dynamically based on game mode -->
                  </div>
                  
                  <div class="flex gap-3 mt-6">
                    <button id="applySettings" class="btn btn-success flex-1">
                      ✅ ${t('play.applyBtn')}
                    </button>
                    <button id="resetSettings" class="btn btn-warning flex-1">
                      🔄 ${t('play.resetBtn')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  mount(): void {
    // Initialisation de l'utilisateur connecté
    this.initializeUser();
    
    // Ajout des event listeners
    this.attachEventListeners();
    
    // Restauration de la vue
    this.restoreView();
  }

  unmount(): void {
    // Suppression des event listeners
    this.removeEventListeners();
    
    // Nettoyage du jeu - TOUJOURS appeler cleanupGame() pour arrêter toutes les boucles
    cleanupGame();
    
    // Nettoyage des références
    this.tournament = null;
    this.currentMatch = null;
    this.players = [];
    this.displaySelf = null;
    this.launchMatchBtnHandler = null;
  }

  private async initializeUser(): Promise<void> {
    const token = await this.ensureToken();
    const myId = localStorage.getItem("id");
    const rawUsername = localStorage.getItem("username");
    const rawName = localStorage.getItem("name");

    if (token && myId && rawName) {
      this.displaySelf = { 
        id: parseInt(myId, 10), 
        name: rawName, 
        display: rawUsername || rawName 
      };
      this.players.push(this.displaySelf);
    } else if (token) {
      try {
        // Récupération des données utilisateur depuis localStorage
        const meId = localStorage.getItem("id");
        const meName = localStorage.getItem("name");
        const meUsername = localStorage.getItem("username");
        
        if (meId && meName) {
          this.displaySelf = {
            id: Number(meId),
            name: meName,
            display: meUsername || meName,
          };
          this.players.push(this.displaySelf);
        }
      } catch (err) {
        console.warn("Impossible de récupérer /me :", err);
      }
    }
  }

  private addEventListeners(): void {
    const $ = (id: string) => document.getElementById(id)!;
    
    $("localBtn").addEventListener('click', this.localBtnHandler);
    $("backToModeBtn").addEventListener('click', this.backToModeBtnHandler);
    $("onlineBtn").addEventListener('click', this.onlineBtnHandler);
    $("quickPlayBtn").addEventListener('click', this.quickPlayBtnHandler);
    $("tournamentBtn").addEventListener('click', this.tournamentBtnHandler);
    $("closeTournamentBtn").addEventListener('click', this.closeTournamentBtnHandler);
    $("startTournamentBtn").addEventListener('click', this.startTournamentBtnHandler);
    $("resetTournamentBtn").addEventListener('click', this.resetTournamentBtnHandler);
    $("addPlayerBtn").addEventListener('click', (e) => {
      console.log("addPlayerBtn called.");
      e.preventDefault(); 
      this.addPlayerBtnHandler();
    });
    // Allow adding player with Enter key
    $("aliasInput").addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addPlayerBtnHandler();
      }
    });

    // Game control event listeners
    $("startBtn").addEventListener('click', this.startBtnHandler);
    $("pauseBtn").addEventListener('click', this.pauseBtnHandler);
    $("restartBtn").addEventListener('click', this.restartBtnHandler);
    $("settingsBtn").addEventListener('click', this.settingsBtnHandler);
    $("applySettings").addEventListener('click', this.applySettingsHandler);
    $("resetSettings").addEventListener('click', this.resetSettingsHandler);
  }

  private removeEventListeners(): void {
    const $ = (id: string) => document.getElementById(id)!;
    
    $("localBtn").removeEventListener('click', this.localBtnHandler);
    $("backToModeBtn").removeEventListener('click', this.backToModeBtnHandler);
    $("backToModeOnlineBtn").removeEventListener('click', this.backToModeOnlineBtnHandler);
    $("onlineBtn").removeEventListener('click', this.onlineBtnHandler);
    $("startOnlineGameBtn").removeEventListener('click', this.startOnlineGameBtnHandler);
    $("quickPlayBtn").removeEventListener('click', this.quickPlayBtnHandler);
    $("tournamentBtn").removeEventListener('click', this.tournamentBtnHandler);
    $("closeTournamentBtn").removeEventListener('click', this.closeTournamentBtnHandler);
    $("addPlayerBtn").removeEventListener('click', this.addPlayerBtnHandler);
    $("startTournamentBtn").removeEventListener('click', this.startTournamentBtnHandler);
    $("resetTournamentBtn").removeEventListener('click', this.resetTournamentBtnHandler);

    // Game control event listeners
    $("startBtn").removeEventListener('click', this.startBtnHandler);
    $("pauseBtn").removeEventListener('click', this.pauseBtnHandler);
    $("restartBtn").removeEventListener('click', this.restartBtnHandler);
    $("settingsBtn").removeEventListener('click', this.settingsBtnHandler);
    $("applySettings").removeEventListener('click', this.applySettingsHandler);
    $("resetSettings").removeEventListener('click', this.resetSettingsHandler);
    $("backGameBtn").removeEventListener('click', this.backGameBtnHandler);

    // Nettoyage du bouton de match dynamique
    const launchMatchBtn = document.getElementById("launchMatchBtn");
    if (launchMatchBtn && this.launchMatchBtnHandler) {
      launchMatchBtn.removeEventListener('click', this.launchMatchBtnHandler);
    }
  }

  private attachEventListeners(): void {
    const $ = (id: string) => document.getElementById(id);
    
    // Mode selection buttons
    $("localBtn")?.addEventListener('click', this.localBtnHandler);
    $("backToModeBtn")?.addEventListener('click', this.backToModeBtnHandler);
    $("backToModeOnlineBtn")?.addEventListener('click', this.backToModeOnlineBtnHandler);
    $("onlineBtn")?.addEventListener('click', this.onlineBtnHandler);
    $("startOnlineGameBtn")?.addEventListener('click', this.startOnlineGameBtnHandler);
    $("quickPlayBtn")?.addEventListener('click', this.quickPlayBtnHandler);
    $("tournamentBtn")?.addEventListener('click', this.tournamentBtnHandler);
    $("closeTournamentBtn")?.addEventListener('click', this.closeTournamentBtnHandler);
    $("addPlayerBtn")?.addEventListener('click', this.addPlayerBtnHandler);
    $("startTournamentBtn")?.addEventListener('click', this.startTournamentBtnHandler);
    $("resetTournamentBtn")?.addEventListener('click', this.resetTournamentBtnHandler);
    // Allow adding player with Enter key
    $("aliasInput")?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addPlayerBtnHandler();
      }
    });

    // Game control event listeners
    $("startBtn")?.addEventListener('click', this.startBtnHandler);
    $("pauseBtn")?.addEventListener('click', this.pauseBtnHandler);
    $("restartBtn")?.addEventListener('click', this.restartBtnHandler);
    $("settingsBtn")?.addEventListener('click', this.settingsBtnHandler);
    $("applySettings")?.addEventListener('click', this.applySettingsHandler);
    $("resetSettings")?.addEventListener('click', this.resetSettingsHandler);
    $("backGameBtn")?.addEventListener('click', this.backGameBtnHandler);
  }

  private async restoreView(): Promise<void> {
    // Vérification de la connexion pour le tournoi
    // if (this.playView === "tournament") {
    //   const token = await this.ensureToken();
    //   if (!token) {
    //     this.playView = "localMenu";
    //     const alertBox = document.getElementById("playAlert");
    //     if (alertBox) {
    //       alertBox.textContent = `⚠️ ${t('alerts.needLogin')}`;
    //       alertBox.classList.remove("hidden");
    //     }
    //   }
    // }
    this.playView = "root";
    this.setView(this.playView);
    this.refreshPlayers();
  }

  private setView(view: PlayView): void {
    this.playView = view;
    localStorage.setItem("playView", view);

    const $ = (id: string) => document.getElementById(id)!;
    const show = (el: HTMLElement) => el.classList.remove("hidden");
    const hide = (el: HTMLElement) => el.classList.add("hidden");
    
    const playHeader = $("playHeader");
    const modeChoice = $("modeChoice");
    const localSubmenu = $("localSubmenu");
    const onlineSubmenu = $("onlineSubmenu");
    const tournamentPanel = $("tournamentPanel");

    // Reset de base
    hide(modeChoice);
    hide(localSubmenu);
    hide(onlineSubmenu);
    hide(tournamentPanel);

    // Nettoyage du jeu si on quitte quickPlay, tournament ou onlineGame
    if (view !== "quickPlay" && view !== "tournament" && view !== "onlineGame") {
      cleanupGame();
    }

    // Affichage selon vue
    if (view === "root") {
      show(playHeader);
      show(modeChoice);
    } else if (view === "localMenu") {
      show(playHeader);
      show(localSubmenu);
    } else if (view === "onlineMenu") {
      show(playHeader);
      show(onlineSubmenu);
    } else if (view === "quickPlay") {
      // En mode Quick Play, on cache le header et le localSubmenu
      hide(playHeader);
      // Le jeu sera démarré par le handler qui appelle setView
    } else if (view === "onlineGame") {
      // En mode Online Game, on cache le header et le onlineSubmenu
      hide(playHeader);
      // Le jeu sera démarré par le handler qui appelle setView
    } else if (view === "tournament") {
      // En mode Tournament, on cache le header et le localSubmenu
      hide(playHeader);
      show(tournamentPanel);
    }
  }

  private async ensureToken(): Promise<string | null> {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const res = await fetch(`${apiBase()}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return token;
      }
    } catch (e) {
      console.warn("[ensureToken] Vérification échouée", e);
    }
    return null;
  }

  private async ensureSelfPlayer(): Promise<void> {
    const token = await this.ensureToken();
    if (!token) return;

    // On tente d'abord depuis localStorage (rapide)
    const idStr = localStorage.getItem("id");
    const name = localStorage.getItem("name") || "";
    const uname = localStorage.getItem("username") || name;

    let self: Player | null = null;

    if (idStr && name) {
      self = { id: parseInt(idStr, 10), name, display: uname || name };
    } else {
      // Sinon on rafraîchit depuis localStorage
      try {
        const meId = localStorage.getItem("id");
        const meName = localStorage.getItem("name");
        const meUsername = localStorage.getItem("username");
        
        if (meId && meName) {
          self = { id: Number(meId), name: meName, display: meUsername || meName };
        }
      } catch (e) {
        console.warn("ensureSelfPlayer: localStorage failed", e);
      }
    }

    if (self) {
      this.displaySelf = self;
      if (!this.players.some(p => p.id === self!.id)) {
        this.players.push(self);
      }
    }
  }

  // ========== Handlers ==========

  private handleLocalBtnClick(): void {
    this.setView("localMenu");
  }

  private handleBackToModeBtnClick(): void {
    this.setView("root");
    this.hideGameContainer();
  }

  private async handleOnlineBtnClick(): Promise<void> {
    const alertBox = document.getElementById("playAlert")!;

    const token = await this.ensureToken();

    if (!token) {
      if (alertBox) {
        alertBox.textContent = `⚠️ ${t('alerts.needLogin')}`;
        alertBox.classList.remove("hidden");
      }
      return;
    }

    if (alertBox) alertBox.classList.add("hidden");

    this.setView("onlineMenu");
  }

  private handleBackToModeOnlineBtnClick(): void {
    this.setView("root");
    this.hideGameContainer();
  }

  private handleStartOnlineGameBtnClick(): void {
    this.setView("onlineGame");
    this.showGameContainer();
    forceGameRender("game-online");
  }

  private handleQuickPlayBtnClick(): void {
    this.setView("quickPlay");
    this.showGameContainer();
    forceGameRender("game-local");
  }

  private async handleTournamentBtnClick(): Promise<void> {
    const tokenNow = await this.ensureToken();
    // On affiche l'alerte dans le sous-menu local (visible)
    const localAlert = document.getElementById("playAlertLocal");
    if (!tokenNow) {
      if (localAlert) {
        localAlert.textContent = `⚠️ ${t('alerts.needLogin')}`;
        localAlert.classList.remove("hidden");
      }
      return;
    }
    if (localAlert) localAlert.classList.add("hidden");
    // S'auto-inscrire *maintenant* (sans attendre un refresh de page)
    await this.ensureSelfPlayer();
    this.setView("tournament");
    this.refreshPlayers();
  }


  private async handleAddPlayerBtnClick(): Promise<void> {
    const aliasInput = document.getElementById("aliasInput") as HTMLInputElement;
    const alias = aliasInput.value.trim();
    if (!alias) return;

    try {
      const byName = await this.fetchUserByNameStrict(alias);
      if (!byName) {
        const isUsername = await this.fetchUserByUsernameForHint(alias);
        if (isUsername) {
          notify(t('play.errors.usernameOnly'), { type: 'warning'});
        } else {
          notify(t('play.errors.missingAccount'), { type: 'warning'});
        }
        return;
      }
      
      if (this.players.some(p => Number(p.id) === Number(byName.id))) {
        notify(t('play.errors.alreadyRegistered'), { type: 'warning'});
        return;
      }

      this.players.push(byName);
      aliasInput.value = "";
      this.refreshPlayers();
    } catch (err) {
      console.error(err);
      notify(t('play.errors.verifyPlayer'), { type: 'warning'});
    }
  }

  private handleStartTournamentBtnClick(): void {
    if (this.players.length < 2) {
      notify(t('play.errors.needTwoPlayers'), { type: 'warning'});
      return;
    }
    this.tournament = new Tournament();
    this.players.forEach((p) => this.tournament!.addPlayer({id : p.id, display: p.display}));
    this.tournament.generateMatches();
    this.renderStandings();
    this.showNextMatch();
  }

  private handleResetTournamentBtnClick(): void {
    // Nettoyer le jeu et le canvas si un match est en cours
    cleanupGame();
    this.hideGameContainer();
    
    this.players.splice(0, this.players.length);
    this.tournament = null;
    this.currentMatch = null;

    const matchInfo = document.getElementById("matchInfo")!;
    const standingsEl = document.getElementById("standings")!;
    matchInfo.innerHTML = "";
    standingsEl.innerHTML = "";

    if (this.displaySelf)
      this.players.push(this.displaySelf);
    this.refreshPlayers();
  }

  // ========== Helper Methods ==========

  private refreshPlayers(): void {
    const playerList = document.getElementById("playerList")!;
    const ln = this.displaySelf;
    const others = ln ? this.players.filter(p => p.id !== ln.id) : [...this.players];
    let html = '';
    if (ln) {
     html += `<div>${t('play.registeredSelf', { player: ln.display, name: ln.name })}</div>`;
    }
    if (others.length) {
     const list = others.map(p => `${p.display} <span class="text-gray-500">(name: ${p.name})</span>`).join(', ');
     html += `<div class="mt-1 text-sm text-gray-300">${t('play.registeredOthers', { list })}</div>`;
    }
    if (!html) html = t('play.registeredNone');
     playerList.innerHTML = html;
   }

  private renderStandings(): void {
    const standingsEl = document.getElementById("standings")!;
    if (!this.tournament) {
      standingsEl.innerHTML = "";
      return;
    }
    let html = `<h3 class="font-semibold mb-1">${t('play.standingsTitle')}</h3><ul class="list-disc ml-5">`;
    for (const { alias: name, points: pts } of this.tournament.getStandings()) {
      html += `<li>${name}: <strong>${pts}</strong> pts</li>`;
    }
    html += `</ul>`;
    standingsEl.innerHTML = html;
  }

  private showNextMatch(): void {
    const matchInfo = document.getElementById("matchInfo")!;
    const standingsEl = document.getElementById("standings")!;

    if (!this.tournament) return;
    const m = this.tournament.nextMatch();
    if (m) {
      // Convertir les joueurs du tournoi vers notre type Player
      const p1Player = this.players.find(p => p.id === m.p1.id);
      const p2Player = this.players.find(p => p.id === m.p2.id);
      if (p1Player && p2Player) {
        this.currentMatch = { p1: p1Player, p2: p2Player };
      } else {
        this.currentMatch = null;
      }
    } else {
      this.currentMatch = null;
    }

    if (!m) {
      matchInfo.innerHTML = `<h3 class="text-green-400">${t('play.tournamentFinished')}</h3>`;
      this.renderStandings();
      
      // Clean up the game canvas when tournament is finished
      cleanupGame();
      return;
    }

    matchInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <h3 class="text-lg">${t('play.nextMatch', { player1: m.p1.display, player2: m.p2.display })}</h3>
        <button id="launchMatchBtn" class="bg-amber-600 px-3 py-1 rounded">${t('play.launchMatch')}</button>
      </div>
    `;

    const launchBtn = document.getElementById("launchMatchBtn") as HTMLButtonElement | null;
    if (launchBtn) {
      this.launchMatchBtnHandler = () => {
        launchBtn.disabled = true;
        this.showGameContainer();
        showBoardForTournament();
        startLocalMatch(m.p1.display, m.p2.display, ({ s1, s2 }: { s1: number; s2: number }) => {
          this.tournament!.reportResult(m.p1.id, m.p2.id, s1, s2);

          const token = localStorage.getItem("token");
          if (token) {
            fetch(`${apiBase()}/game/result`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ p1Id: m.p1.id, p2Id: m.p2.id, s1, s2 }),
            }).catch((e) => console.warn(t('play.errors.saveResult'), e));
          }
          this.renderStandings();
          this.showNextMatch();
        });
      };
      launchBtn.addEventListener('click', this.launchMatchBtnHandler);
    }
  }

  private async fetchUserByNameStrict(name: string): Promise<Player | null> {
    const res = await fetch(`${apiBase()}/users/by-name/${encodeURIComponent(name.trim())}`);
    if (res.ok) {
      const data = await res.json();
      const id = Number(data.id);
       const nm = String(data.name || '').trim();
       const disp = String(data.username ?? data.name ?? '').trim();
       return { id, name: nm, display: disp };
    }
    if (res.status === 404) return null;
    throw new Error("Erreur serveur");
  }

  private async fetchUserByUsernameForHint(username: string): Promise<boolean> {
    const res = await fetch(`${apiBase()}/users/by-username/${encodeURIComponent(username)}`);
    return res.ok;
  }

  // ========== Game Control Methods ==========

  private showGameContainer(): void {
    const gameContainer = document.getElementById("gamecontainer");
    if (gameContainer) {
      gameContainer.classList.remove('hidden');
      // Show game buttons (except Start which is managed by game logic)
      this.showGameButtons();
    }
  }

  private hideGameContainer(): void {
    const gameContainer = document.getElementById("gamecontainer");
    if (gameContainer) {
      gameContainer.classList.add('hidden');
    }
  }

  private showGameButtons(): void {
    const $ = (id: string) => document.getElementById(id)!;
    // Note: startBtn visibility is managed by game logic (startLocalGame, startLocalMatch, etc.)
    // Don't show it here
    $("pauseBtn").classList.remove('hidden');
    $("restartBtn").classList.remove('hidden');
    $("settingsBtn").classList.remove('hidden');
    
    // Afficher le bouton "Back" en mode Quick Game et Online Game, pas en Tournament
    if (this.playView === "quickPlay" || this.playView === "onlineGame") {
      $("backGameBtn").classList.remove('hidden');
    } else {
      $("backGameBtn").classList.add('hidden');
    }
  }

  private hideGameButtons(): void {
    const $ = (id: string) => document.getElementById(id)!;
    $("startBtn").classList.add('hidden');
    $("pauseBtn").classList.add('hidden');
    $("restartBtn").classList.add('hidden');
    $("settingsBtn").classList.add('hidden');
    $("backGameBtn").classList.add('hidden');
  }

  private handleStartBtnClick(): void {
    // Le jeu devrait gérer le démarrage via forceGameRender
    // Cette méthode peut être étendue pour des contrôles spécifiques
  }

  private handlePauseBtnClick(): void {
    // Le jeu devrait gérer la pause
    // Cette méthode peut être étendue pour des contrôles spécifiques
  }

  private handleRestartBtnClick(): void {
    // Redémarrer le jeu
    const gameType = this.getCurrentGameType();
    if (gameType) {
      forceGameRender(gameType);
    }
  }

  private handleSettingsBtnClick(): void {
    const settingsPanel = document.getElementById("settingsPanel");
    if (settingsPanel) {
      settingsPanel.classList.remove('hidden');
    }
  }

  private handleApplySettingsClick(): void {
    // Cette fonction n'est plus utilisée car wireSettingsPanel gère maintenant tout
    // La logique est dans game-ui-helpers.ts
  }

  private handleResetSettingsClick(): void {
    // Réinitialiser les paramètres pour tous les modes (Quick Play, Online, Tournament)
    const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    const speedValue = document.getElementById('speedValue');
    const ballColor = document.getElementById('ballColor') as HTMLInputElement;
    const paddleColor = document.getElementById('paddleColor') as HTMLInputElement;
    const ballSize = document.getElementById('ballSize') as HTMLSelectElement;
    const paddleSize = document.getElementById('paddleSize') as HTMLSelectElement;
    
    // Réinitialiser l'UI
    if (speedSlider && speedValue) {
      speedSlider.value = '50';
      speedValue.textContent = '50%';
      // Déclencher l'événement input pour mettre à jour currentSpeedPercent et appliquer au jeu
      speedSlider.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    if (ballColor) {
      ballColor.value = '#FFFFFF';
    }
    
    if (paddleColor) {
      paddleColor.value = '#FFFFFF';
    }
    
    if (ballSize) {
      ballSize.value = 'normal';
    }
    
    if (paddleSize) {
      paddleSize.value = 'normal';
    }
    
    // Appliquer immédiatement les paramètres par défaut au jeu en cours
    const localGame = (window as any).localGame;
    if (localGame) {
      localGame.setColors('#FFFFFF', '#FFFFFF');
      localGame.setBallSize('normal');
      localGame.setPaddleSize('normal');
      localGame.setSpeedPercent(50);
    }
  }

  private getCurrentGameType(): "game-local" | "game-online" | "menu" | null {
    // Détermine le type de jeu actuel basé sur l'état
    // Cette logique peut être étendue selon les besoins
    return "game-local"; // Par défaut, on assume le jeu local
  }

  private handleCloseTournamentBtnClick(): void {
    // Nettoyage du jeu et du canvas
    cleanupGame();
    this.hideGameContainer();
    
    const tournamentPanel = document.getElementById('tournamentPanel');
    if (tournamentPanel) {
      tournamentPanel.classList.add('hidden');
    }

    this.handleResetTournamentBtnClick();
    // Retour au menu local (choix entre Quick Play et Tournament) au lieu de root
    this.setView("localMenu");

  }

  private handleBackGameBtnClick(): void {
    // Nettoyage du jeu avant de retourner au menu
    cleanupGame();
    this.hideGameContainer();
    
    // Retour au menu approprié selon le mode
    if (this.playView === "onlineGame") {
      this.setView("onlineMenu");
    } else {
      this.setView("localMenu");
    }
  }

}