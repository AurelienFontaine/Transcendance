import { apiBase } from "./utils";
import { initSocket, closeSocket } from '../handlers/friends-handler';
import { t } from '../handlers/language';
import * as userM from "./user_management";
import { routerRef } from './main';
import * as main from '../src/main';
const backendUrl = `${apiBase()}`;
import { notify } from '../handlers/notify';


export async function createUser(event: Event) {
	event.preventDefault();
	
	const nameInput = document.getElementById("registerName") as HTMLInputElement | null;
	if (!nameInput) return notify(t('auth.errors.missingField', { field: t('auth.fields.name') }), { type: 'error' });
	const name = nameInput.value;

	const emailInput = document.getElementById("registerEmail") as HTMLInputElement | null;
	if (!emailInput) return notify(t('auth.errors.missingField', { field: t('auth.fields.email') }), { type: 'error' });
	const email = emailInput.value;

	const passwordInput = document.getElementById("registerPassword") as HTMLInputElement | null;
	if (!passwordInput) return  notify(t('auth.errors.missingField', { field: t('auth.fields.password') }), { type: 'error' });
	const password = passwordInput.value;

	const response = await fetch(`${backendUrl}/register`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({name, email, password}),
	});
	
	const data = await response.json();

	if (data.token) {
		localStorage.setItem('token', data.token);
		localStorage.setItem('username', data.username);
		localStorage.setItem('name', data.name);
		localStorage.setItem('id', String(data.id));
		initSocket(data.token);
	}
	else {
		const fallback = t('auth.errors.unexpectedResponse');
		let message: string;
		if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error.trim()) {
			message = data.error;
		} else {
			message = response.statusText || JSON.stringify(data) || fallback;
		}
		notify(t('alerts.serverMessage', { message }), { type: 'error' });
	}
}

type TwoFAPromptResult = { mode: 'otp' | 'recovery'; value: string } | null;

export async function askTwoFACode(): Promise<TwoFAPromptResult> {
	const overlay = document.getElementById('twofaPromptOverlay');
	const modeSelect = document.getElementById('twofaPromptMode') as HTMLSelectElement | null;
	const valueInput = document.getElementById('twofaPromptValue') as HTMLInputElement | null;
	const cancelBtn = document.getElementById('twofaPromptCancel');
	const submitBtn = document.getElementById('twofaPromptSubmit');

	if (!overlay || !modeSelect || !valueInput || !cancelBtn || !submitBtn) {
		console.warn('2FA UI missing elements.');
		return null;
	}

	// Show 2FA prompt overlay
	overlay.classList.remove('hidden');
	overlay.classList.add('flex');
	valueInput.value = '';
	requestAnimationFrame(() => valueInput.focus());

	return new Promise((resolve) => {
		const onCancel = (evt: Event) => {
			evt.preventDefault();
			cleanup(null);
		};

		const onSubmit = (evt: Event) => {
			evt.preventDefault();
			const value = valueInput.value.trim();
			if (!value) {
				valueInput.focus();
				return;
			}
			cleanup({ mode: modeSelect.value === 'recovery' ? 'recovery' : 'otp', value });
		};

		const onOverlayClick = (evt: MouseEvent) => {
			if (evt.target === overlay) cleanup(null);
		};

		const onKeyDown = (evt: KeyboardEvent) => {
		if (evt.key === 'Enter') {
			evt.preventDefault();
			onSubmit(evt);
			return;
		}
		if (evt.key === 'Escape') {
			evt.preventDefault();
			onCancel(evt);
		}
		};

	const cleanup = (result: TwoFAPromptResult) => {
		overlay.classList.remove('flex');
		overlay.classList.add('hidden');
		cancelBtn.removeEventListener('click', onCancel);
		submitBtn.removeEventListener('click', onSubmit);
		valueInput.removeEventListener('keydown', onKeyDown);
		overlay.removeEventListener('click', onOverlayClick);
		resolve(result);
	};

		cancelBtn.addEventListener('click', onCancel);
		submitBtn.addEventListener('click', onSubmit);
		valueInput.addEventListener('keydown', onKeyDown);
		overlay.addEventListener('click', onOverlayClick);
	});
}

export async function completeTwoFaLogin(twofaToken: string): Promise<boolean> {
	const promptResult = await askTwoFACode();

	if (!promptResult) return false;
	const payload: Record<string, string> = { twofa_token: twofaToken };
	if (promptResult.mode === 'otp') payload.otp = promptResult.value;
	else payload.recovery_code = promptResult.value;

	const res = await fetch(`${backendUrl}/login/checkTwoFa`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	const data = await res.json();
	if (!res.ok) {
		const errorMessage =
			data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error.trim()
				? data.error
				: t('auth.errors.twofaUnknown');
		notify(t('auth.errors.twofa', { message: errorMessage }), { type: 'error' });
		return false;
	}

	localStorage.setItem('token', data.token);
	if (data.username) localStorage.setItem('username', data.username);
	if (data.name) localStorage.setItem('name', data.name);
	initSocket(data.token);

	await main.refreshSession();
	window.history.replaceState({}, '', '/profile');
	if (routerRef) {
		routerRef.resolveRoute(true);
	} else {
		window.dispatchEvent(new PopStateEvent('popstate'));
	}
	return true;
}


export async function loginUser(event: Event) {
	event.preventDefault();

	const nameInput = document.getElementById("loginName") as HTMLInputElement;
	const passwordInput = document.getElementById("loginPassword") as HTMLInputElement;
	const name = nameInput.value;
	const password = passwordInput.value;

	const response = await fetch(`${backendUrl}/login`, {
		method: "POST",
		headers: {
		"Content-Type": "application/json",
		},
		body: JSON.stringify({ name, password }),
	});

	const data = await response.json();
	if (response.ok && data.twofa_required && data.twofa_token) {
		if (data.username) localStorage.setItem('username', data.username);
		if (data.name) localStorage.setItem('name', data.name);
		await completeTwoFaLogin(data.twofa_token);

	} else if (response.ok && data.token) {
		localStorage.setItem("token", data.token);

		if (data.token)
			initSocket(data.token);		
		await main.refreshSession();
	} else {
		console.log('loginUser: Login failed.');
		const message =
			data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error.trim()
				? data.error
				: t('auth.errors.loginFallback');
		notify(t('auth.errors.loginFailed', { message }), { type: 'error' });
	}
}

export function updateUIForLoggedInUser() {  
	const loginForm = document.getElementById('loginForm');
	const registerForm = document.getElementById('registerForm');
	const logoutBtn = document.getElementById('logoutButton');
	const googleBtn = document.getElementById('googleLoginButton');
	const chatLink = document.getElementById('chatLink');
	const avatarUser = document.getElementById('currentAvatar');
	const chooseAvatar = document.getElementById('chooseAvatar');
	const uploadAvatarForm = document.getElementById('uploadAvatarForm');

	if (loginForm)
		loginForm.classList.add('hidden');
	if (registerForm)
		registerForm.classList.add('hidden');

	if (logoutBtn)
		logoutBtn.classList.remove('hidden');

	if (googleBtn)
		googleBtn.classList.add('hidden');

	if (chatLink)
		chatLink.classList.add('inline-block');
    // chatLink.style.display = 'inline-block';

	if (avatarUser)
		avatarUser.classList.remove('hidden');
	if (chooseAvatar)
		chooseAvatar.classList.remove('hidden');
	if (uploadAvatarForm)
		uploadAvatarForm.classList.remove('hidden');

	const username = localStorage.getItem('username');
	const userInfo = document.getElementById('userInfo');
	const currentUsername = document.getElementById('currentUsername');
	const changeForm = document.getElementById('changeUsernameForm');
	const passwordChangeBtn = document.getElementById('changePasswordBtn');
	userM.loadAvatar();
	if (username && userInfo && currentUsername && changeForm && passwordChangeBtn) {
		userInfo.classList.remove('hidden');
		changeForm.classList.remove('hidden');
    passwordChangeBtn.classList.remove('hidden');
		currentUsername.textContent = username;
	}
}

export async function checkIfLoggedIn() {
	await tokenCheck();
	const token = localStorage.getItem('token');
	const username = localStorage.getItem('username');
	if (token && username){
		updateUIForLoggedInUser();
		initSocket(token);
	}
}

export function updateUIForLoggedOutUser() {
	const userInfo = document.getElementById('userInfo');
	if (userInfo)
		userInfo.classList.add('hidden');

  const changeForm = document.getElementById('changeUsernameForm');
  if (changeForm)
		changeForm.classList.add('hidden');

  const passwordChangeBtn = document.getElementById('changePasswordBtn');
  if (passwordChangeBtn)
    passwordChangeBtn.classList.add('hidden');

  const logoutBtn = document.getElementById('logoutButton');
  if (logoutBtn)
    logoutBtn.classList.add('hidden');

  const loginForm = document.getElementById('loginForm');
  if (loginForm)
    loginForm.classList.remove('hidden');

  const registerForm = document.getElementById('registerForm');
  if (registerForm)
    registerForm.classList.remove('hidden');

  const googleBtn = document.getElementById('googleLoginButton');
  if (googleBtn)
    googleBtn.classList.remove('hidden');

  const chatLink = document.getElementById('chatLink');
	if (chatLink)
    chatLink.classList.add('hidden');

   const avatarUser = document.getElementById('currentAvatar');
  if (avatarUser)
    avatarUser.classList.add('hidden');

  const chooseAvatar = document.getElementById('chooseAvatar');
  if (chooseAvatar)
    chooseAvatar.classList.add('hidden');

  const uploadAvatarForm = document.getElementById('uploadAvatarForm');
  if (uploadAvatarForm)
    uploadAvatarForm.classList.add('hidden');
}

export async function logoutUser(e?: Event) {
  if (e) e.preventDefault();
  const token = localStorage.getItem('token');

  if (token){ 
    await fetch(`${backendUrl}/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
	closeSocket();
  }

  main.clearSessionStorage();

  const historyDiv  = document.getElementById('historyContent');
  const showWelcome = document.getElementById('showWelcome');
  const logoutBtn   = document.getElementById('logoutButton');
  if (historyDiv)  historyDiv.innerHTML = `<em class="text-gray-400">${t('profile.history.loginPrompt')}</em>`;
  if (showWelcome) { showWelcome.classList.add('hidden'); showWelcome.textContent = ''; }
  if (logoutBtn)   logoutBtn.classList.add('hidden');

  // Force refresh of profile page if we're on it (SPA way)
  if (window.location.pathname === '/profile') {
    if (main.routerRef) {
      main.routerRef.navigateTo('/profile', true);
    }
  } else {
    window.history.replaceState({}, '', '/profile');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
 }

export async function tokenCheck() {
	const token = localStorage.getItem('token');
	if (token) {
		try {
			const response = await fetch (`${backendUrl}/me`, {
				method: 'GET',
				headers: {
				'Authorization': `Bearer ${token}`,
				},
			});
			if (!response.ok)
				throw new Error('Token invalide');
		} catch (err) {
			console.warn('Token expire ou invalide.');
			logoutUser();
		}
	}
}

let authLoading = false;

export async function initAuth() {
	if (authLoading) return;
	authLoading = true;
	await new Promise(res => setTimeout(res, 150));

	const token = localStorage.getItem('token');
	if (!token) {
		//console.log('auth init: no token');
		authLoading = false;
		return;
	}

	try {
		const res = await fetch('/api/me', {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!res.ok) throw new Error('Invalid token');
	} catch (err) {
		console.error('Auth init failed:', err);
		localStorage.removeItem('token');
	} finally {
		authLoading = false;
	}
}
