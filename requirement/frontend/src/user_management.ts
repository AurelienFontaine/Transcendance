import { apiBase } from "./utils";
import { t } from '../handlers/language';
import { notify } from "../handlers/notify";

const backendUrl = `${apiBase()}`;

export type TextSizeKey = 'xs' | 'sm' | 'base' | 'lg' | 'xl';

const textSizeKeyToNumber: Record<TextSizeKey, number> = {
	xs: 0,
	sm: 1,
	base: 2,
	lg: 3,
	xl: 4,
};

const textSizeNumberToKey: Record<number, TextSizeKey> = {
	0: 'xs',
	1: 'sm',
	2: 'base',
	3: 'lg',
	4: 'xl',
};

const THEME_FALLBACK = 'dark';

const themeBackendMap: Record<string, string> = {
	light: 'light',
	dark: 'dark',
	cupcake: 'cupcake',
	default: 'light',
	contrast: 'dark',
};

function normalizeThemeToBackend(theme: string): string {
	const lower = theme.toLowerCase();
	return themeBackendMap[lower] ?? lower;
}

function normalizeThemeToFrontend(theme: string | null | undefined): string {
	if (!theme) return THEME_FALLBACK;
	const lower = theme.toLowerCase();
	if (lower === 'default') return 'light';
	if (lower === 'contrast') return 'dark';
	return lower;
}

function ensureAuthToken(): string {
	const token = localStorage.getItem('token');
	if (!token)
		throw new Error(t('alerts.needLogin'));
	return token;
}

export function getStoredTheme(): string {
	const stored = localStorage.getItem('theme') || localStorage.getItem('backend_theme');
	const normalized = normalizeThemeToFrontend(stored ?? undefined);
	localStorage.setItem('theme', normalized);
	localStorage.setItem('backend_theme', normalizeThemeToBackend(normalized));
	return normalized;
}

export function getStoredTextSizeKey(): TextSizeKey {
	const storedKey = localStorage.getItem('textSize');
	if (storedKey && storedKey in textSizeKeyToNumber) {
		const key = storedKey as TextSizeKey;
		localStorage.setItem('text_size', String(textSizeKeyToNumber[key]));
		return key;
	}
	const storedNumber = localStorage.getItem('text_size');
	if (storedNumber !== null) {
		const parsed = Number(storedNumber);
		const key = textSizeNumberToKey[parsed];
		if (key) {
			localStorage.setItem('textSize', key);
			localStorage.setItem('text_size', String(parsed));
			return key;
		}
	}
	localStorage.setItem('textSize', 'base');
	localStorage.setItem('text_size', String(textSizeKeyToNumber.base));
	return 'base';
}

export function textSizeKeyFromSliderValue(value: number): TextSizeKey {
	return textSizeNumberToKey[value] ?? 'base';
}

export function sliderValueFromTextSizeKey(key: TextSizeKey): number {
	return textSizeKeyToNumber[key] ?? 2;
}

export function syncPreferencesFromBackend(textSizeValue: number | null | undefined, themeValue: string | null | undefined) {
	const numericTextSize = typeof textSizeValue === 'string' ? Number(textSizeValue) : textSizeValue;
	if (typeof numericTextSize === 'number' && Number.isFinite(numericTextSize) && textSizeNumberToKey[numericTextSize] !== undefined) {
		const key = textSizeNumberToKey[numericTextSize];
		localStorage.setItem('textSize', key);
		localStorage.setItem('text_size', String(numericTextSize));
	}

	if (typeof themeValue === 'string') {
		const normalizedTheme = normalizeThemeToFrontend(themeValue);
		localStorage.setItem('theme', normalizedTheme);
		localStorage.setItem('backend_theme', normalizeThemeToBackend(normalizedTheme));
	}
}

export async function updateTextSize(size: TextSizeKey): Promise<TextSizeKey> {
	const token = ensureAuthToken();
	const textSizeNumeric = textSizeKeyToNumber[size] ?? 2;

	const res = await fetch(`${backendUrl}/me/text_size`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ text_size: textSizeNumeric })
	});

	let data: any = null;
	try {
		data = await res.json();
	} catch {}

	if (!res.ok) {
		const message = data?.error || res.statusText;
		throw new Error(message);
	}

	const backendValueRaw = data?.text_size;
	const backendValue = typeof backendValueRaw === 'number'
		? backendValueRaw
		: Number.isFinite(Number(backendValueRaw))
			? Number(backendValueRaw)
			: textSizeNumeric;

	const finalKey = textSizeNumberToKey[backendValue] ?? size;
	localStorage.setItem('textSize', finalKey);
	localStorage.setItem('text_size', String(backendValue));
	return finalKey;
}

export async function updateTheme(theme: string): Promise<string> {
	const token = ensureAuthToken();
	const backendTheme = normalizeThemeToBackend(theme);

	const res = await fetch(`${backendUrl}/me/theme`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ theme: backendTheme })
	});

	let data: any = null;
	try {
		data = await res.json();
	} catch {}

	if (!res.ok) {
		const message = data?.error || res.statusText;
		throw new Error(message);
	}

	const savedBackendTheme = typeof data?.theme === 'string' ? data.theme : backendTheme;
	const finalTheme = normalizeThemeToFrontend(savedBackendTheme);
	localStorage.setItem('theme', finalTheme);
	localStorage.setItem('backend_theme', normalizeThemeToBackend(finalTheme));
	return finalTheme;
}

export async function loadInfoUser() {
	try {
		const res = await fetch(`${backendUrl}/me`, {
			method: 'GET',
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("token")
			}
		});
		if (!res.ok)
			throw(new Error ("Invalid token or server error"));
	
		const data = await res.json();
		if (data)
		{
			localStorage.setItem('userEmail', data.userSQL.email);
			localStorage.setItem('userName', data.userSQL.name);
			localStorage.setItem('userUsername', data.userSQL.username);
			localStorage.setItem('twofaEnabled', data.userSQL.twofa_enabled ? "true" : "false");
		}
	} catch (err) {
		console.error(err); 
	} 
}

export async function changeUsername(event: Event) {
	event.preventDefault();
	
	const input = document.getElementById('newUsername') as HTMLInputElement;
	if (!input)
		return notify(t('alerts.missingInput'), { type: 'warning' });
	
	const newUsername = input.value.trim();
	if (!newUsername)
		return notify(t('alerts.invalidUsername', { type: 'warning' }));
	
	if (newUsername.length < 3 || newUsername.length > 30)
		return notify(t('alerts.invalidUsernameLength'), { type: 'warning' });


	const token = localStorage.getItem('token');
	if (!token)
		return notify(t('alerts.needLogin'), { type: 'warning' });

	try { 
		const res = await fetch(`${backendUrl}/me/username`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ username: newUsername })
		});
		const data = await res.json();
		if (!res.ok)
			return console.warn(t('alerts.serverMessage', { message: data.error || res.statusText }));
		
		localStorage.setItem('username', data.username);
		if (data.token)
			localStorage.setItem('token', data.token);
		
		const currentUsername = document.getElementById('currentUsername');
		if (currentUsername)
			currentUsername.textContent = data.username;
		
		input.value = '';
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(message);
	}
}

export async function changePassword(event: Event) {
	event.preventDefault();
	
	const input = document.getElementById('newPassword') as HTMLInputElement;
	const inputConfirm = document.getElementById('confirmPassword') as HTMLInputElement;
	if (!input || !inputConfirm)
		return notify(t('alerts.missingInput'), { type: 'warning' });
	
	const password = input.value.trim();
	const confirmPassword = inputConfirm.value.trim();
	
	if (!password || !confirmPassword)
		return notify(t('alerts.invalidPassword'), { type: 'warning' });
	if (password != confirmPassword)
		return notify(t('alerts.passwordMismatch'), { type: 'warning' });
	
	const token = localStorage.getItem('token');
	if (!token)
		return notify(t('alerts.needLogin'), { type: 'warning' });

	try { 
		const res = await fetch(`${backendUrl}/me/password`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({
				password: password,
				confirmPassword: confirmPassword 
			})
		});
		const data = await res.json();
		if (!res.ok)
			return console.warn(t('alerts.serverMessage', { message: data.error || res.statusText }));
		
		if (data.username)
			localStorage.setItem('username', data.username);
		if (data.token)
			localStorage.setItem('token', data.token);
		
		input.value = '';
		inputConfirm.value = '';
		notify(t('alerts.passwordUpdated'), { type: 'success' });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(message);
	}
}

export async function setDefaultAvatar(filename: string) {
	await fetch(`${backendUrl}/setDefaultAvatar`, {
		method: "PUT",
		headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
		body: JSON.stringify({ avatar: filename })
	});
	loadAvatar();
}

export async function loadAvatar() {
	try {
		const response = await fetch(`${backendUrl}/me`, {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("token")
			}
		});
		if (!response.ok)
			throw (new Error("Can't load profile"));
		const data = await response.json(); 
		const avatarFile = data.userSQL.avatar; 
		const avatarImg = document.getElementById("currentAvatar") as HTMLImageElement;
		if (avatarFile && avatarImg)
			avatarImg.src = `${backendUrl}/images/${avatarFile}?t=${Date.now()}`; 
	} catch (err) {
		console.error(err); 
	}
}

export async function uploadAvatar(event: Event) {
	event.preventDefault();
	const form = event.currentTarget as HTMLFormElement;
	const fileInput = form.querySelector("input[name='avatar']") as HTMLInputElement;
	if (!fileInput)
		return;

	if (!fileInput.files || fileInput.files.length === 0)
		return notify(t('alerts.selectFile'), { type: 'warning'});
	
	const file = fileInput.files[0];
	const formData = new FormData();
	formData.append("avatar", file);
	
	try {
		const response = await fetch(`${backendUrl}/uploadAvatar`, {
									method: "POST",
									headers: {Authorization: "Bearer " + localStorage.getItem("token")},
									body: formData
								});
		if (!response.ok)
			throw new Error("Upload has failed");
		await response.json();
		loadAvatar();
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("Error: upload avatar: ", message);
	}
}
