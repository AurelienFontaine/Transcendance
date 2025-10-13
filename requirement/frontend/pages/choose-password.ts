import { Page } from '../src/router';
import { apiBase } from "../src/utils";
import { t } from '../handlers/language';

export class ChoosePasswordPage implements Page {
	private formSubmitHandler: (event: Event) => void;

	constructor() {
		this.formSubmitHandler = this.handleSubmit.bind(this);
	}

	private async handleSubmit(event: Event) {
		event.preventDefault();

		const newPasswordInput = document.getElementById('newPassword') as HTMLInputElement;
		const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
		const passwordError = document.getElementById('passwordError') as HTMLParagraphElement;
		const choosePasswordMessage = document.getElementById('choosePasswordMessage') as HTMLDivElement;

		if (newPasswordInput.value !== confirmPasswordInput.value) {
			passwordError.textContent = t('choosePassword.mismatch');
			passwordError.classList.remove('hidden');
			choosePasswordMessage.textContent = '';
			return;
		}

	passwordError.classList.add('hidden');
	choosePasswordMessage.textContent = '';
	const success = await this.changePassword(newPasswordInput.value, confirmPasswordInput.value);
	if (success) {
		choosePasswordMessage.textContent = t('choosePassword.success');
		newPasswordInput.value = '';
		confirmPasswordInput.value = '';
	}
}

private changePassword = async (password: string, confirmPassword: string): Promise<boolean> => {
	const token = localStorage.getItem('token');
	if (!token) return false;

	try {
		const res = await fetch(`${apiBase()}/me/password`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ password, confirmPassword })
		});
		const data = await res.json();
		if (!res.ok) {
			const passwordError = document.getElementById('passwordError') as HTMLParagraphElement;
			passwordError.textContent = data.error || t('choosePassword.serverError');
			passwordError.classList.remove('hidden');
			return false;
		} else if (data.token) {
			localStorage.setItem('token', data.token);
		}
		return true;
	} catch (err) {
		console.error(err);
		const passwordError = document.getElementById('passwordError') as HTMLParagraphElement | null;
		if (passwordError) {
			passwordError.textContent = t('alerts.serverMessage', { message: t('choosePassword.serverError') });
			passwordError.classList.remove('hidden');
		}
		return false;
	}
}

	render(): string {
		return `
			<div class="flex flex-col items-center justify-center min-h-screen">
				<div class="card w-96 bg-base-100 shadow-xl">
					<div class="card-body">
						<h1 class="card-title">${t('choosePassword.title')}</h1>
						<form id="changePasswordForm" autocomplete="on">
							<label for="cpUsername" class="sr-only">
								<span class="label-text">${t('profile.registerForm.name')}</span>
							</label>
							<input id="cpUsername" name="username" type="text" autocomplete="username" class="sr-only" spellcheck="false" autocapitalize="none" inputmode="text" />
							<div class="form-control">
								<label for="newPassword" class="label">
									<span class="label-text">${t('choosePassword.labels.password')} :</span>
								</label>
								<input
									type="password"
									id="newPassword"
									name="newPassword"
									autocomplete="new-password"
									required
									class="input input-bordered w-full"
								/>
							</div>

							<div class="form-control">
								<label for="confirmPassword" class="label">
									<span class="label-text">${t('choosePassword.labels.confirm')} :</span>
								</label>
								<input
									type="password"
									id="confirmPassword"
									name="confirmPassword"
									autocomplete="new-password"
									required
									class="input input-bordered w-full"
								/>
							</div>

							<div class="form-control mt-6">
								<button type="submit" class="btn btn-primary w-full">
									${t('choosePassword.submit')}
								</button>
							</div>
						</form>

						<p id="passwordError" class="text-red-500 text-sm mt-4 text-center hidden"></p>
						<div id="choosePasswordMessage" class="text-green-500 text-sm mt-4 text-center"></div>
					</div>
				</div>
			</div>
		`;
	}

	mount(): void {
		const form = document.getElementById('changePasswordForm');
		if (form) {
			form.addEventListener('submit', this.formSubmitHandler);
		}

		const u = document.getElementById('cpUsername') as HTMLInputElement | null;
		if (u) {
			u.value = localStorage.getItem('username') || localStorage.getItem('email') || localStorage.getItem('name') || '';
		}
	}

	unmount(): void {
		const form = document.getElementById('changePasswordForm');
		if (form) form.removeEventListener('submit', this.formSubmitHandler);
	}
}
