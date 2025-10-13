// requirement/frontend/pages/profile.ts
import type { Page } from '../src/router';
import { Router } from '../src/router';
import { apiBase } from "../src/utils";
import * as userM from '../src/user_management';
import * as auth from '../src/authentification';
import * as main from '../src/main';
import { TwofaController } from './twofa-controller';
import type { TwofaDom } from './twofa-controller';
import { t } from '../handlers/language';

export class ProfilePage implements Page {
	private profileSettingsBtnHandler: () => void;
	private chooseCrocoHandler: () => void;
	private chooseAstroHandler: () => void;
	private uploadAvatarFormHandler: (event: Event) => void;
	private changeUsernameFormHandler: (event: Event) => void;
	private changePasswordBtnHandler: () => void;
	private logoutButtonHandler: () => void;
	private statisticsButtonHandler: () => void;
	private registerFormHandler: (event: Event) => void;
	private loginFormHandler: (event: Event) => void;
	private showLoginCardHandler: (event: Event) => void;
	private showRegisterCardHandler: (event: Event) => void;
	private currentAuthView: 'login' | 'register' = 'login';
	private twofaController: TwofaController | null = null;
	private twofaListeners = new Map<HTMLElement, Map<string, EventListener>>();
	private twofaUnbind: (<K extends keyof HTMLElementEventMap>(element: HTMLElement | null, type: K) => void) | null = null;
	/**access */
	private handleThemeChangeHandler: (event: Event) => void | Promise<void>;
	private handleTextSizeChangeHandler: (event: Event) => void | Promise<void>;
	/*** */

	private router: Router | null = null;

	constructor() {
		this.profileSettingsBtnHandler = this.handleProfileSettingsBtnClick.bind(this);
		this.chooseCrocoHandler = this.handleChooseCrocoClick.bind(this);
		this.chooseAstroHandler = this.handleChooseAstroClick.bind(this);
		this.uploadAvatarFormHandler = this.handleUploadAvatarFormSubmit.bind(this);
		this.changeUsernameFormHandler = this.handleChangeUsernameFormSubmit.bind(this);
		this.changePasswordBtnHandler = this.handleChangePasswordBtnClick.bind(this);
		this.logoutButtonHandler = this.handleLogoutButtonClick.bind(this);
		this.statisticsButtonHandler = this.handleStatisticsButtonClick.bind(this);
		this.registerFormHandler = this.handleRegisterFormSubmit.bind(this);
		this.loginFormHandler = this.handleLoginFormSubmit.bind(this);
		this.showLoginCardHandler = this.handleShowLoginCard.bind(this);
		this.showRegisterCardHandler = this.handleShowRegisterCard.bind(this);
		//***access */
		this.handleThemeChangeHandler = this.handleThemeChange.bind(this);
		this.handleTextSizeChangeHandler = this.handleTextSizeChange.bind(this);
		//**** */
	}

	setRouter(router: Router): void {
		this.router = router;
	}

	render(): string {
	return `
		<div class="min-h-screen bg-base-200 text-base-content">
			<div class="container mx-auto p-6">
				<h1 class="text-3xl font-bold text-center mb-8">${t('profile.pageTitle')}</h1>
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div class="lg:col-span-1 space-y-6">
						<div class="card bg-primary text-primary-content shadow-xl">
							<div class="card-body items-center text-center space-y-4">
								<div id="loginRegisterButtons" class="w-full flex flex-col gap-3 hidden" aria-hidden="true">
									<button id="loginBtn" type="button" class="btn btn-secondary w-full" aria-controls="loginFormCard" aria-pressed="false">
										${t('profile.loginForm.title')}
									</button>
									<button id="registerBtn" type="button" class="btn btn-primary w-full" aria-controls="registerFormCard" aria-pressed="false">
										${t('profile.registerForm.title')}
									</button>
								</div>
								<div id="avatarDiv" class="w-full space-y-4 hidden">
									<h2 class="card-title justify-center">${t('profile.avatarTitle')}</h2>
									<div class="avatar mx-auto">
										<div class="w-24 rounded-full ring ring-offset-2 ring-offset-base-100 ring-base-300">
											<img id="currentAvatar" src="" alt="avatar" class="object-cover w-24 h-24 hidden" />
										</div>
									</div>
								</div>
								<div id="userInfo" class="w-full space-y-2 hidden">
									<p class="text-lg">
										<strong>${t('profile.welcome')} </strong>
										<span id="currentUsername" class="font-semibold"></span> !
									</p>
									<p>${t('profile.loginLabel')}: <span id="currentName"></span></p>
									<p>${t('profile.emailLabel')}: <span id="currentEmail"></span></p>
									<div class="card-actions justify-center mt-4">
										<button id="profileSettingsBtn" class="btn btn-accent">${t('profile.editButton')}</button>
									</div>
								</div>
								<button id="statisticsButton" class="btn btn-success">${t('profile.stats')}</button>
								<button id="logoutButton" class="btn btn-error w-full hidden">${t('profile.logout')}</button>
							</div>
						</div>
					</div>
					<div class="lg:col-span-2 space-y-6">
						<div id="profileEdit" class="card bg-primary text-primary-content shadow-xl hidden">
							<div class="card-body space-y-4">
								<h2 class="card-title">${t('profile.editTitle')}</h2>
								<div class="form-control">
									<label class="label" for="themeSelect">
										<span class="label-text text-base-content">${t('nav.theme')}</span>
									</label>
									<select id="themeSelect" class="select select-bordered text-base-content">
										<option value="light">${t('nav.themeLight')}</option>
										<option value="dark">${t('nav.themeDark')}</option>
										<option value="cupcake">Cupcake</option>
									</select>
								</div>
								<div class="form-control">
									<label class="label" for="textSizeSlider">
										<span class="label-text text-primary-content">Text Size</span>
									</label>
									<input id="textSizeSlider" type="range" min="0" max="4" value="2" step="1" class="range range-secondary" aria-describedby="textSizeScale" />
									<div id="textSizeScale" class="w-full flex justify-between text-xs px-2 text-primary-content">
										<span>XS</span>
										<span>S</span>
										<span>M</span>
										<span>L</span>
										<span>XL</span>
									</div>
								</div>
								<div id="chooseAvatar" class="form-control hidden">
									<label class="label">
										<span class="label-text text-primary-content">${t('profile.avatarTitle')}</span>
									</label>
									<div class="flex flex-wrap justify-center gap-4">
										<button id="chooseCroco">
											<img src="${apiBase()}/images/Croco.jpg" class="w-16 h-16 rounded-full object-cover border-2 border-base-100" alt="Croco Avatar" />
										</button>
										<button id="chooseAstro">
											<img src="${apiBase()}/images/Astro.jpg" class="w-16 h-16 rounded-full object-cover border-2 border-base-100" alt="Astro Avatar" />
										</button>
									</div>
								</div>
								<form id="uploadAvatarForm" class="form-control hidden" method="POST" enctype="multipart/form-data">
									<label class="label">
										<span class="label-text text-primary-content">${t('profile.uploadLabel')}</span>
									</label>
									<input type="file" name="avatar" accept="image/*" class="file-input file-input-bordered w-full" />
									<button type="submit" class="btn btn-primary mt-2 w-full">${t('profile.uploadCta')}</button>
								</form>
								<form id="changeUsernameForm" class="form-control hidden">
									<label for="newUsername" class="label">
										<span class="label-text text-primary-content">${t('profile.usernameLabel')}</span>
									</label>
									<input id="newUsername" type="text" placeholder="${t('profile.usernamePlaceholder')}" class="input input-bordered w-full" required />
									<button type="submit" class="btn btn-accent mt-2 w-full">${t('profile.usernameCta')}</button>
								</form>
								<button id="changePasswordBtn" class="btn btn-secondary w-full hidden">${t('profile.passwordCta')}</button>
								<section id="twofaSection" class="space-y-3 hidden">
									<h2 class="text-xl font-semibold">${t('twofa.sectionTitle')}</h2>
									<div class="flex items-center gap-3">
										<label class="label cursor-pointer gap-3 mb-0" for="twofaToggle">
											<span class="label-text text-primary-content">2FA</span>
											<input type="checkbox" id="twofaToggle" class="toggle toggle-primary" />
										</label>
										<span id="twofaToggleLabel" class="badge badge-outline">2FA</span>
									</div>
									<div class="flex items-center gap-3">
										<button	id="regenerateRecoveryBtn" class="btn btn-warning hidden">${t('twofa.regenerate')}</button>
									</div>
									<p class="text-xs opacity-80">${t('twofa.hint')}</p>
								</section>
								<div id="twofaSetupWrap" class="hidden fixed inset-0 flex items-center justify-center bg-black/60 z-[9998]">
									<div class="card bg-base-100 text-base-content shadow-2xl max-w-3xl w-11/12 sm:w-auto" role="dialog" aria-modal="true">
										<div class="card-body space-y-4">
											<h3 id="twofaSetupTitle" class="card-title">${t('twofa.setup.title')}</h3>
											<p id="twofaIntroText" class="text-sm opacity-80">
												<br>${t('twofa.setup.instruction')}<br>
											</p>
											<div class="space-y-6">
												<div class="flex justify-center">
													<img
														id="twofaQrImg"
														class="rounded border border-base-300 w-[180px] h-[180px]"
														alt="QR Code 2FA"
													/>
												</div>
												<div class="mx-auto flex w-full max-w-xs flex-col gap-3 text-center">
													<input id="twofaOtpInput" class="input input-bordered w-full" placeholder="${t('twofa.setup.otpPlaceholder')} autocomplete="one-time-code"" />
													<div id="twofaSetupMsg" class="text-sm opacity-80 space-y-2 min-h-6">
														<ul id="twofaRecoveryList" class="space-y-1 text-left text-xs"></ul>
													</div>
												</div>
											</div>
											<div class="card-actions justify-end">
												<button id="twofaSetupCancel" class="btn btn-ghost">${t('common.cancel')}</button>
												<button id="twofaDownloadBtn" class="btn btn-success hidden">${t('twofa.buttons.download')}</button>
												<button id="twofaVerifyBtn" class="btn btn-primary">${t('twofa.setup.activate')}</button>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div class="card bg-base-100 shadow-xl hidden" id="loginFormCard" aria-hidden="true">
							<div class="card-body space-y-4">
								<h2 class="card-title">${t('profile.loginForm.title')}</h2>
								<form id="loginForm" class="form-control space-y-3">
									<label for="loginName" class="label">
										<span class="label-text">${t('profile.loginForm.name')}</span>
									</label>
									<input id="loginName" type="text" placeholder="${t('profile.loginForm.name')}" class="input input-bordered w-full" autocomplete="name" required />
									<label for="loginPassword" class="label">
										<span class="label-text">${t('profile.loginForm.password')}</span>
									</label>
									<input id="loginPassword" type="password" placeholder="${t('profile.loginForm.password')}" class="input input-bordered w-full" autocomplete="current-password" required />
									<button type="submit" class="btn btn-primary w-full">${t('profile.loginForm.submit')}</button>
								</form>
								<div class="divider">OR</div>
								<a id="googleLoginButton" href="${apiBase()}/auth/google" class="btn btn-outline w-full gap-2">
									<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" role="img" aria-hidden="true">
										<path d="M12.24 10.24v3.52h6.08c-.24 1.44-.96 2.8-2.08 3.84l-.08.08-2.88 2.24c-1.76 1.36-4 2.16-6.4 2.16-4.96 0-9.04-4.08-9.04-9.04s4.08-9.04 9.04-9.04c2.64 0 4.88.96 6.64 2.64l2.48-2.48c-2.08-2.08-4.8-3.28-7.12-3.28-6.64 0-12 5.36-12 12s5.36 12 12 12c3.28 0 6.24-1.36 8.32-3.68 2.08-2.32 3.28-5.44 3.28-8.88 0-.8-.08-1.6-.24-2.32h-11.36z"/>
									</svg>
									${t('profile.google')}
								</a>
							</div>
						</div>
						<div class="card bg-base-100 shadow-xl hidden" id="registerFormCard" aria-hidden="true">
							<div class="card-body space-y-4">
								<h2 class="card-title">${t('profile.registerForm.title')}</h2>
								<form id="registerForm" class="form-control space-y-3">
									<label for="registerName" class="label">
										<span class="label-text">${t('profile.registerForm.name')}</span>
									</label>
									<input id="registerName" type="text" placeholder="${t('profile.registerForm.name')}" class="input input-bordered w-full" autocomplete="username" required />
									<label for="registerEmail" class="label">
										<span class="label-text">${t('profile.registerForm.email')}</span>
									</label>
									<input id="registerEmail" type="email" placeholder="${t('profile.registerForm.email')}" class="input input-bordered w-full" autocomplete="email" required />
									<label for="registerPassword" class="label">
										<span class="label-text">${t('profile.registerForm.password')}</span>
									</label>
									<input id="registerPassword" type="password" placeholder="${t('profile.registerForm.password')}" class="input input-bordered w-full" autocomplete="new-password" required />
									<button type="submit" class="btn btn-primary w-full">${t('profile.registerForm.submit')}</button>
								</form>
							</div>
						</div>
						<div class="card bg-base-100 shadow-xl">
							<div class="card-body space-y-3">
								<h2 class="card-title">${t('profile.history.title')}</h2>
								<div id="historyContent" class="space-y-4"></div>
							</div>
						</div>
					</div>
				</div>
				<div id="twofaPromptOverlay" class="hidden fixed inset-0 flex items-center justify-center bg-black/60 z-[9998]">
					<div class="card bg-base-100 text-base-content shadow-2xl max-w-sm w-11/12" role="dialog" aria-modal="true">
						<div class="card-body space-y-4">
							<h3 class="card-title">${t('twofa.prompt.title')}</h3>
							<label class="form-control">
								<span class="label-text">${t('twofa.prompt.modeLabel')}</span>
								<select id="twofaPromptMode" class="select select-bordered mt-1">
									<option value="otp">${t('twofa.prompt.otpOption')}</option>
									<option value="recovery">${t('twofa.prompt.recoveryOption')}</option>
								</select>
							</label>
							<label class="form-control">
								<span class="label-text">${t('twofa.prompt.valueLabel')}</span>
								<input
									id="twofaPromptValue"
									type="text"
									autocomplete="one-time-code"
									class="input input-bordered mt-1"
									placeholder="${t('twofa.prompt.valueLabel')}"
								/>
							</label>
							<div class="card-actions justify-end gap-3">
								<button id="twofaPromptCancel" class="btn btn-ghost">${t('twofa.prompt.cancel')}</button>
								<button id="twofaPromptSubmit" class="btn btn-primary">${t('twofa.prompt.submit')}</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
}

	mount(): void {
		this.setupProfilePageLogic();

		document.getElementById('profileSettingsBtn')?.addEventListener('click', this.profileSettingsBtnHandler);
		document.getElementById('chooseCroco')?.addEventListener('click', this.chooseCrocoHandler);
		document.getElementById('chooseAstro')?.addEventListener('click', this.chooseAstroHandler);
		document.getElementById('uploadAvatarForm')?.addEventListener('submit', this.uploadAvatarFormHandler);
		document.getElementById('changeUsernameForm')?.addEventListener('submit', this.changeUsernameFormHandler);
		document.getElementById('changePasswordBtn')?.addEventListener('click', this.changePasswordBtnHandler);
		document.getElementById('logoutButton')?.addEventListener('click', this.logoutButtonHandler);
		document.getElementById('statisticsButton')?.addEventListener('click', this.statisticsButtonHandler);
		document.getElementById('registerForm')?.addEventListener('submit', this.registerFormHandler);
		document.getElementById('loginForm')?.addEventListener('submit', this.loginFormHandler);
		document.getElementById('loginBtn')?.addEventListener('click', this.showLoginCardHandler);
		document.getElementById('registerBtn')?.addEventListener('click', this.showRegisterCardHandler);

		//***access */
		document.getElementById('themeSelect')?.addEventListener('change', this.handleThemeChangeHandler);
		document.getElementById('textSizeSlider')?.addEventListener('change', this.handleTextSizeChangeHandler);
		this.applySavedTheme();
		this.applySavedTextSize();
		//********* */

		this.initTwofaController();
		void this.twofaController?.refreshState();
	}

	unmount(): void {
		document.getElementById('profileSettingsBtn')?.removeEventListener('click', this.profileSettingsBtnHandler);
		document.getElementById('chooseCroco')?.removeEventListener('click', this.chooseCrocoHandler);
		document.getElementById('chooseAstro')?.removeEventListener('click', this.handleChooseAstroClick);
		document.getElementById('uploadAvatarForm')?.removeEventListener('submit', this.uploadAvatarFormHandler);
		document.getElementById('changeUsernameForm')?.removeEventListener('submit', this.changeUsernameFormHandler);
		document.getElementById('changePasswordBtn')?.removeEventListener('click', this.changePasswordBtnHandler);
		document.getElementById('logoutButton')?.removeEventListener('click', this.logoutButtonHandler);
		document.getElementById('statisticsButton')?.removeEventListener('click', this.statisticsButtonHandler);
		document.getElementById('registerForm')?.removeEventListener('submit', this.registerFormHandler);
		document.getElementById('loginForm')?.removeEventListener('submit', this.loginFormHandler);
		document.getElementById('loginBtn')?.removeEventListener('click', this.showLoginCardHandler);
		document.getElementById('registerBtn')?.removeEventListener('click', this.showRegisterCardHandler);
		//*****accesss */
		document.getElementById('themeSelect')?.removeEventListener('change', this.handleThemeChangeHandler);
		document.getElementById('textSizeSlider')?.removeEventListener('change', this.handleTextSizeChangeHandler);
		//******* */ */

		if (this.twofaController && this.twofaUnbind) {
			this.twofaController.detachHandlers(this.twofaUnbind);
			this.twofaController = null;
		}
		this.twofaListeners.clear();
		this.twofaUnbind = null;
	}

	private handleShowLoginCard(event: Event) {
		event.preventDefault();
		this.setAuthView('login');
	}

	private handleShowRegisterCard(event: Event) {
		event.preventDefault();
		this.setAuthView('register');
	}

	private setAuthView(view: 'login' | 'register') {
		this.currentAuthView = view;
		const loginFormCard = document.getElementById('loginFormCard');
		const registerFormCard = document.getElementById('registerFormCard');
		const loginForm = document.getElementById('loginForm');
		const registerForm = document.getElementById('registerForm');
		const googleLoginButton = document.getElementById('googleLoginButton');
		const loginBtn = document.getElementById('loginBtn');
		const registerBtn = document.getElementById('registerBtn');

		const show = (el: HTMLElement | null) => {
			if (!el) return;
			// el.style.removeProperty('display');
			el.classList.remove('hidden');
			el.setAttribute('aria-hidden', 'false');
		};

		const hide = (el: HTMLElement | null) => {
			if (!el) return;
			el.classList.add('hidden');
			el.setAttribute('aria-hidden', 'true');
		};

		if (view === 'login') {
			show(loginFormCard);
			show(loginForm);
			show(googleLoginButton);
			hide(registerFormCard);
			hide(registerForm);
			if (loginBtn) {
				loginBtn.classList.add('btn-active');
				loginBtn.setAttribute('aria-pressed', 'true');
			}
			if (registerBtn) {
				registerBtn.classList.remove('btn-active');
				registerBtn.setAttribute('aria-pressed', 'false');
			}
		} else {
			show(registerFormCard);
			show(registerForm);
			hide(loginFormCard);
			hide(loginForm);
			hide(googleLoginButton);
			if (registerBtn) {
				registerBtn.classList.add('btn-active');
				registerBtn.setAttribute('aria-pressed', 'true');
			}
			if (loginBtn) {
				loginBtn.classList.remove('btn-active');
				loginBtn.setAttribute('aria-pressed', 'false');
			}
		}
	}

	private setupProfilePageLogic() {
		const historyDiv = document.getElementById('historyContent');
		const userInfo = document.getElementById('userInfo');
		const currentAvatar = document.getElementById('currentAvatar') as HTMLImageElement | null;
		const profileEdit = document.getElementById('profileEdit');
		const logoutBtn = document.getElementById('logoutButton') as HTMLButtonElement | null;
		const statisticsBtn = document.getElementById('statisticsButton') as HTMLButtonElement | null;
		const registerForm = document.getElementById('registerForm');
		const loginForm = document.getElementById('loginForm');
		const googleLoginButton = document.getElementById('googleLoginButton');
		const avatarDiv = document.getElementById('avatarDiv');
		const registerFormCard = document.getElementById('registerFormCard');
		const loginFormCard = document.getElementById('loginFormCard');
		const loginRegisterButtons = document.getElementById('loginRegisterButtons');
		const loginBtn = document.getElementById('loginBtn');
		const registerBtn = document.getElementById('registerBtn');

		if (!historyDiv) return;
		
		const show = (el: HTMLElement | null) => {
			if (!el) return;
			// el.style.removeProperty('display');
			el.classList.remove('hidden');
			el.setAttribute('aria-hidden', 'false');
		};
		const hide = (el: HTMLElement | null) => {
			if (!el) return;
			el.classList.add('hidden');
			el.setAttribute('aria-hidden', 'true');
		};

		const token = localStorage.getItem('token');
		const realName = (localStorage.getItem('name') || '').trim();
		const username = (localStorage.getItem('username') || realName).trim();
		const email = (localStorage.getItem('email') || '').trim();
		
		if (!token || !realName) {
			hide(userInfo);
			hide(currentAvatar);
			hide(profileEdit);
			hide(logoutBtn);
			hide(statisticsBtn);
			hide(avatarDiv);
			show(loginRegisterButtons);
			this.setAuthView(this.currentAuthView);
			historyDiv.innerHTML = `<em class="text-gray-400">${t('profile.history.loginPrompt')}</em>`;
		} else {
			show(userInfo);
			show(currentAvatar);
			show(logoutBtn);
			show(statisticsBtn);
			show(avatarDiv);
			hide(loginRegisterButtons);
			hide(registerFormCard);
			hide(loginFormCard);
			hide(registerForm);
			hide(loginForm);
			hide(googleLoginButton);
			if (loginBtn) {
				loginBtn.classList.remove('btn-active');
				loginBtn.setAttribute('aria-pressed', 'false');
			}
			if (registerBtn) {
				registerBtn.classList.remove('btn-active');
				registerBtn.setAttribute('aria-pressed', 'false');
			}

			(document.getElementById('currentUsername') as HTMLSpanElement).textContent = username;
			(document.getElementById('currentName') as HTMLSpanElement).textContent = realName;
			(document.getElementById('currentEmail') as HTMLSpanElement).textContent = email;

			if (currentAvatar) {
				const avatarName = localStorage.getItem('avatar') || 'Astro.jpg';
				currentAvatar.src = `${apiBase()}/images/${avatarName}`;
				show(currentAvatar);
			}

			historyDiv.innerHTML = `<span class="text-gray-300">${t('profile.history.loading')}</span>`;
			fetch(`${apiBase()}/users/${encodeURIComponent(realName)}/history`, {
				headers: { Authorization: `Bearer ${token}` }
			})
				.then((res) => {
					if (!res.ok) throw new Error('HTTPS ' + res.status);
					return res.json();
				})
				.then((data) => {
					const matches = Array.isArray(data?.matches) ? data.matches : [];
					if (!matches.length) {
						historyDiv.innerHTML = `<em class="text-gray-400">${t('profile.history.empty', { username })}</em>`;
						return;
					}

					const last10 = [...matches]
						.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
						.slice(0, 10);

					const html = last10
						.map((m: any) => {
							const isVictory = m.result === 'W';
							const resultLabel = isVictory ? t('profile.match.victory') : t('profile.match.defeat');
							const cardBg = isVictory ? 'bg-green-200' : 'bg-red-200';
							const borderClr = isVictory ? 'border-green-400' : 'border-red-400';
							// Convert UTC time to local time for display
							const utcDate = new Date(m.date);
							const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
							const when = localDate.toLocaleString();

							return `
								<div class="${cardBg} border ${borderClr} rounded-lg p-4 shadow space-y-2">
									<div class="flex flex-wrap items-center gap-3">
										<span class="font-bold text-black">${resultLabel}</span>
										<span class="opacity-60 text-black">•</span>
										<span class="text-black"><span class="font-semibold">${t('profile.match.you')} :</span> ${m.me}</span>
										<span class="opacity-60 text-black">•</span>
										<span class="text-black"><span class="font-semibold">${t('profile.match.score')} :</span> ${m.myScore} - ${m.oppScore}</span>
										<span class="opacity-60 text-black">•</span>
										<span class="text-black"><span class="font-semibold">${t('profile.match.opponent')} :</span> ${m.opponent}</span>
									</div>
									<div class="text-xs opacity-70 text-black">${when}</div>
								</div>
							`;
						})
						.join('');

					historyDiv.innerHTML = html;
				})
				.catch((err) => {
					console.error(err);
					historyDiv.innerHTML = `<span class="text-red-400">${t('profile.history.error')}</span>`;
				});
		}
		void this.twofaController?.refreshState();
		const section = document.getElementById('twofaSection') as HTMLElement | null;
		if (section)
		{
			if (token && realName)
				section?.classList.remove('hidden');
			else
				section?.classList.add('hidden');
		}
	}

	private handleProfileSettingsBtnClick() {
		const profileEdit = document.getElementById('profileEdit');
		const chooseAvatar = document.getElementById('chooseAvatar');
		const uploadAvatarForm = document.getElementById('uploadAvatarForm');
		const changeUsernameForm = document.getElementById('changeUsernameForm');
		const changePasswordBtn = document.getElementById('changePasswordBtn');

		const show = (el: HTMLElement | null) => {
			if (!el) return;
			// el.style.removeProperty('display');
			el.classList.remove('hidden');
			el.setAttribute('aria-hidden', 'false');
		};
		const hide = (el: HTMLElement | null) => {
			if (!el) return;
			el.classList.add('hidden');
			el.setAttribute('aria-hidden', 'true');
		};

		if (!profileEdit) {
			return;
		}

		const shouldShow = profileEdit.classList.contains('hidden');

		if (shouldShow) {
			show(profileEdit);
			show(chooseAvatar);
			show(uploadAvatarForm);
			show(changeUsernameForm);
			show(changePasswordBtn);
		} else {
			hide(profileEdit);
			hide(chooseAvatar);
			hide(uploadAvatarForm);
			hide(changeUsernameForm);
			hide(changePasswordBtn);
		}
	}

	private async handleChooseCrocoClick() {
		userM.setDefaultAvatar('Croco.jpg');
		userM.loadAvatar();
		await main.refreshSession();
		this.setupProfilePageLogic();
	}

	private async handleChooseAstroClick() {
		userM.setDefaultAvatar('Astro.jpg');
		userM.loadAvatar();
		await main.refreshSession();
		this.setupProfilePageLogic();
	}

	private async handleUploadAvatarFormSubmit(event: Event) {
		event.preventDefault();
		await userM.uploadAvatar(event);
		await main.refreshSession();
		this.setupProfilePageLogic();
	}

	private async handleChangeUsernameFormSubmit(event: Event) {
		event.preventDefault();
		await userM.changeUsername(event);
		await main.refreshSession();
		this.setupProfilePageLogic();
	}

	private handleChangePasswordBtnClick() {
		if (this.router) {
			this.router.navigateTo('/choose-password');
			} else {
			console.error('Router not available for navigation.');
		}
	}

	private async handleLogoutButtonClick() {
		this.currentAuthView = 'login';
		await auth.logoutUser();
		if (this.router) {
			this.router.navigateTo('/');
		} else {
			console.error('Router not available for navigation');
		}
	}

	private handleStatisticsButtonClick() {
		if (this.router) {
			this.router.navigateTo('/dashboard');
		} else {
			console.error('Router not available for navigation');
		}
	}

	private async handleRegisterFormSubmit(event: Event) {
		event.preventDefault();
		await auth.createUser(event);
		await main.refreshSession();
		this.setupProfilePageLogic();
	}

	private async handleLoginFormSubmit(event: Event) {
		event.preventDefault();
		await auth.loginUser(event);
		
		const tokenAfterLogin = localStorage.getItem('token');
		if (tokenAfterLogin)
		{
			await main.refreshSession();
			this.setupProfilePageLogic();
		}
	}
	
	private collectTwofaDom(): TwofaDom {
	const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
	return {
		section: byId('twofaSection'),
		toggle: byId('twofaToggle') as HTMLInputElement | null,
		label: byId('twofaToggleLabel'),
		regenerateBtn: byId('regenerateRecoveryBtn') as HTMLButtonElement | null,
		modal: byId('twofaSetupWrap'),
		title: byId('twofaSetupTitle'),
		intro: byId('twofaIntroText'),
		qr: byId('twofaQrImg') as HTMLImageElement | null,
		otp: byId('twofaOtpInput') as HTMLInputElement | null,
		message: byId('twofaSetupMsg'),
		recoveryList: byId('twofaRecoveryList'),
		cancel: byId('twofaSetupCancel') as HTMLButtonElement | null,
		confirm: byId('twofaVerifyBtn') as HTMLButtonElement | null,
		download: byId('twofaDownloadBtn') as HTMLButtonElement | null,
	};
	}

	private initTwofaController() {
		const dom = this.collectTwofaDom();

		const bind = <K extends keyof HTMLElementEventMap>(
			element: HTMLElement | null,
			type: K,
			handler: (event: HTMLElementEventMap[K]) => void
		) => {
			if (!element) return;
			element.addEventListener(type, handler as EventListener);
			if (!this.twofaListeners.has(element)) this.twofaListeners.set(element, new Map());
			this.twofaListeners.get(element)!.set(type as string, handler as EventListener);
		};

		const unbind = <K extends keyof HTMLElementEventMap>(
			element: HTMLElement | null,
			type: K
		) => {
			if (!element) return;
			const map = this.twofaListeners.get(element);
			const listener = map?.get(type as string);
			if (listener) element.removeEventListener(type, listener);
			map?.delete(type as string);
			if (map && map.size === 0) this.twofaListeners.delete(element);
		};

		this.twofaUnbind = unbind;
		this.twofaController = new TwofaController(dom);
		this.twofaController.attachHandlers(bind);
	}

//*************************************accesss */
	private applyTheme(theme: string) {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}

	private applySavedTheme() {
		const savedTheme = userM.getStoredTheme();
		this.applyTheme(savedTheme);
		const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;
		if (themeSelect) {
			themeSelect.value = savedTheme;
		}
	}

	private async handleThemeChange(event: Event) {
		const selectElement = event.target as HTMLSelectElement;
		const newTheme = selectElement.value;
		const previousTheme = userM.getStoredTheme();

		this.applyTheme(newTheme);

		try {
			const finalTheme = await userM.updateTheme(newTheme);
			await main.refreshSession();
			const syncedTheme = userM.getStoredTheme();
			this.applyTheme(syncedTheme);
			selectElement.value = syncedTheme;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error('Failed to update theme:', message);
			this.applyTheme(previousTheme);
			selectElement.value = previousTheme;
		}
	}

	private applyTextSize(size: userM.TextSizeKey) {
		document.documentElement.setAttribute('data-text-size', size);
		localStorage.setItem('textSize', size);
	}

	private applySavedTextSize() {
		const savedSize = userM.getStoredTextSizeKey();
		this.applyTextSize(savedSize);
		const textSizeSlider = document.getElementById('textSizeSlider') as HTMLInputElement;
		if (textSizeSlider) {
			textSizeSlider.value = String(userM.sliderValueFromTextSizeKey(savedSize));
		}
	}

	private async handleTextSizeChange(event: Event) {
		const slider = event.target as HTMLInputElement;
		const sliderValue = Number(slider.value);
		const selectedSize = userM.textSizeKeyFromSliderValue(sliderValue);
		const previousSize = userM.getStoredTextSizeKey();

		this.applyTextSize(selectedSize);

		try {
			const finalSize = await userM.updateTextSize(selectedSize);
			await main.refreshSession();
			const syncedSize = userM.getStoredTextSizeKey();
			this.applyTextSize(syncedSize);
			slider.value = String(userM.sliderValueFromTextSizeKey(syncedSize));
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error('Failed to update text size:', message);
			this.applyTextSize(previousSize);
			slider.value = String(userM.sliderValueFromTextSizeKey(previousSize));
		}
	}
}