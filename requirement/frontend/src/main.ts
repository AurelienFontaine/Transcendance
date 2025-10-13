(window as any).setTheme = setTheme;

import "./styles.css";
import "./input.css";
import "./input.css";
import { Router } from './router';
import { apiBase } from "./utils";
import * as Game from '../handlers/game/game-front';
import * as auth from "./authentification";
import * as userM from "./user_management";
import { detectInitialLanguage, getLanguage, onLanguageChange, t, updateLanguage } from '../handlers/language';
import { notify } from "../handlers/notify";

// Expose translation function globally for shared game components
(window as any).t = t;

// Update static UI texts based on current language
function updateStaticUITexts() {
	const loginBtn = document.getElementById("loginNavBtn");
	if (loginBtn) {
		loginBtn.textContent = t('nav.loginLogout');
	}
	
	// Update theme dropdown button
	const themeBtn = document.querySelector('[role="button"][tabindex="0"]');
	if (themeBtn && themeBtn.textContent && themeBtn.textContent.trim() !== 'EN' && themeBtn.textContent.trim() !== 'FR' && themeBtn.textContent.trim() !== 'ES') {
		themeBtn.textContent = t('nav.theme');
	}
	
	// Update theme menu items
	const lightThemeItem = document.querySelector('[data-set-theme="light"]');
	const darkThemeItem = document.querySelector('[data-set-theme="dark"]');
	if (lightThemeItem) lightThemeItem.textContent = t('nav.themeLight');
	if (darkThemeItem) darkThemeItem.textContent = t('nav.themeDark');
}

export function clearSessionStorage() {
	localStorage.removeItem("token"); 
	localStorage.removeItem("id");    
	localStorage.removeItem("name");  
	localStorage.removeItem("username");
	localStorage.removeItem("avatar");
	localStorage.removeItem("email");
	localStorage.removeItem("twofaEnabled");
	localStorage.removeItem("twofaRecoveryCodes");
	localStorage.removeItem('color_ball');
	localStorage.removeItem('color_paddle');
	localStorage.removeItem('ball_speed');
	localStorage.removeItem('theme');
	localStorage.removeItem('backend_theme');
	localStorage.removeItem('textSize');
	localStorage.removeItem('text_size');
	// localStorage.removeItem("language");
}

export let routerRef: Router | null = null;

export async function refreshSession() {
	const token = localStorage.getItem("token");
	if (!token) return;

	try {
		const res = await fetch(`${apiBase()}/me`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!res.ok) {
			clearSessionStorage();
			return;
		};

		const data = await res.json();
		if (data.userSQL) {
			localStorage.setItem("id", String(data.userSQL.id));
			localStorage.setItem("name", data.userSQL.name);
			localStorage.setItem("username", data.userSQL.username);
			localStorage.setItem("avatar", data.userSQL.avatar);
			localStorage.setItem("email", data.userSQL.email);
			localStorage.setItem('twofaEnabled', data.userSQL.twofa_enabled ? 'true' : 'false');
			localStorage.setItem('language', data.userSQL.language);
			localStorage.setItem('color_ball',data.userSQL.color_ball);
			localStorage.setItem('color_paddle',data.userSQL.color_paddle);
			localStorage.setItem('ball_speed', data.userSQL.ball_speed);
			userM.syncPreferencesFromBackend(data.userSQL.text_size, data.userSQL.theme);
			setTheme(userM.getStoredTheme());
			document.documentElement.setAttribute('data-text-size', userM.getStoredTextSizeKey());
			const backendLang = data.userSQL.language;
			if (backendLang === 'en' || backendLang === 'fr' || backendLang === 'es') {
				await updateLanguage(backendLang, false);
				renderChrome();
			}
		}
	} catch (e) {
		console.warn("Impossible de rafraîchir la session:", e);
		clearSessionStorage();
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	setTheme(userM.getStoredTheme());
	document.documentElement.setAttribute('data-text-size', userM.getStoredTextSizeKey());
	const app = document.getElementById('app');
	if (!app) {
		console.error('App element not found!'); 
		return; 
	}

	/*garantir que la langue est connu avant le rendu */
	const initialLang = detectInitialLanguage();
	await updateLanguage(initialLang, false);
	renderChrome();

	const router = new Router(app);
	routerRef = router;

	/*rerender si lang changée */
	onLanguageChange(() => {
		renderChrome();
		router.resolveRoute(true);
	});

	const urlParams = new URLSearchParams(window.location.search);
	const error = urlParams.get('error');
	const token = urlParams.get('token');
	const realName = urlParams.get('name');
	const username = urlParams.get('username');
	const firstTime = urlParams.get('firstTime');
	const twofaRequired = urlParams.get('twofa_required');
	const twofaTokenParam = urlParams.get('twofa_token');

	if (twofaRequired === 'true' && twofaTokenParam) {
		router.navigateTo('/profile', true);
		await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
		clearSessionStorage();

		const usernameHint = urlParams.get('username');
		const nameHint = urlParams.get('name');
		if (usernameHint) localStorage.setItem('username', usernameHint);
		if (nameHint) localStorage.setItem('name', nameHint);

		window.history.replaceState({}, '', '/profile');
		const ok = await auth.completeTwoFaLogin(twofaTokenParam);
		if (ok) {
			if (firstTime === 'true') {
				alert(t('main.alerts.firstLogin'));
				router.navigateTo('/choose-password');
			}
			return;
		}
		return;
	} else if (token) {
		localStorage.setItem('token', token);
		if (username) localStorage.setItem('username', username);
		if (realName) localStorage.setItem('name', realName);

		if (!realName) {
			try {
				const payload = JSON.parse(atob(token.split('.')[1])); 
				if (payload.name) localStorage.setItem('name', payload.name);
			} catch (e) {
				console.warn("Impossible de décoder le JWT:", e);
			}
		}
		window.history.replaceState({}, '', window.location.pathname);
		auth.updateUIForLoggedInUser();
	}

	if (error === 'access_denied') {
		alert(t('main.alerts.googleDenied'));
		window.history.replaceState({}, '', window.location.pathname);
	}

	if (firstTime === 'true'){
		notify(t('main.alerts.firstLogin'));
		router.navigateTo('/choose-password');
		return;
	}
	// Chrome peut buguer si on accède au localStorage trop tôt
	await new Promise(res => setTimeout(res, 100));
	await auth.initAuth();
	await refreshSession();
	router.resolveRoute();
	
	// Update static UI texts on initial load
	updateStaticUITexts();
	
	// Update static UI texts when language changes
	onLanguageChange(() => {
		updateStaticUITexts();
	});

	document.body.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		if (target.matches('a[data-link]')) {
			e.preventDefault(); 
			const href = target.getAttribute('href');
			if (href) { router.navigateTo(href); }
		}
		if (target.matches('[data-language]')) {
			e.preventDefault();
			const lang = target.getAttribute('data-language');
			if (lang === 'en' || lang === 'fr' || lang === 'es') {
				void updateLanguage(lang);
			}

		}
	});

	//**bouton theme modifie le local storage */
	document.body.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		const theme = target.dataset.setTheme;
		if (theme) {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
		}
	});

	auth.checkIfLoggedIn();
	renderChrome();
	syncLanguageButtons();
});

/*système de changement de langues*/

function syncLanguageButtons() {
	document.querySelectorAll<HTMLButtonElement>('[data-language]').forEach((btn) => {
		const lang = btn.getAttribute('data-language') as 'en' | 'fr' | 'es' | null;
		btn.classList.toggle('border-white', lang === getLanguage());
		btn.classList.toggle('opacity-100', lang === getLanguage());
		btn.classList.toggle('opacity-80', lang !== getLanguage());
		btn.setAttribute('aria-pressed', String(lang === getLanguage()));
	});
}/****************** */

function renderChrome() {
	document.title = t('home.title');

	const homeLink = document.querySelector<HTMLAnchorElement>('a[href="/"][data-link]');
	const profileLink = document.querySelector<HTMLAnchorElement>('a[href="/profile"][data-link]');
	const playLink = document.querySelector<HTMLAnchorElement>('a[href="/play"][data-link]');
	const friendsLink = document.querySelector<HTMLAnchorElement>('a[href="/friends"][data-link]');
	const nav = document.querySelector<HTMLElement>('[data-nav-primary]');
	const languageGroup = document.querySelector<HTMLElement>('[data-language-group]');
	const skipLink = document.getElementById('skip-to-content');

	if (homeLink) homeLink.textContent = t('nav.home');
	if (profileLink) profileLink.textContent = t('nav.profile');
	if (playLink) playLink.textContent = t('nav.play');
	if (friendsLink) friendsLink.textContent = t('nav.friends');
	if (nav) nav.setAttribute('aria-label', t('nav.label'));
	if (languageGroup) languageGroup.setAttribute('aria-label', t('nav.languageLabel'));
	if (skipLink) skipLink.textContent = t('nav.skipToContent');
	syncLanguageButtons();
}

function setTheme(themeName: string) {
  document.documentElement.setAttribute('data-theme', themeName);
}
