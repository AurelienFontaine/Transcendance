// requirement/frontend/pages/twofa-controller.ts
import { apiBase } from '../src/utils';
import * as main from '../src/main';
import { t } from '../handlers/language';
import { notify } from '../handlers/notify';

export type TwofaDom = {
	section: HTMLElement | null;
	toggle: HTMLInputElement | null;
	label: HTMLElement | null;
	regenerateBtn: HTMLButtonElement | null;
	modal: HTMLElement | null;
	title: HTMLElement | null;
	intro: HTMLElement | null;
	qr: HTMLImageElement | null;
	otp: HTMLInputElement | null;
	message: HTMLElement | null;
	recoveryList: HTMLElement | null;
	cancel: HTMLButtonElement | null;
	confirm: HTMLButtonElement | null;
	download: HTMLButtonElement | null;
};

type BindFn = <K extends keyof HTMLElementEventMap>(
	element: HTMLElement | null,
	type: K,
	handler: (event: HTMLElementEventMap[K]) => void
) => void;

type UnbindFn = <K extends keyof HTMLElementEventMap>(
	element: HTMLElement | null,
	type: K
) => void;

export class TwofaController {
	private pendingSetup = false;
	private escapeHandler: ((ev: KeyboardEvent) => void) | null = null;
	private readonly handleCopy = () => { void this.copyRecovery(); };
	private readonly handleClose = () => { this.closeModal(); };

	constructor(private dom: TwofaDom) {}

	attachHandlers(bind: BindFn) {
		const { toggle, cancel, confirm, regenerateBtn, download, otp } = this.dom;
		bind(toggle, 'change', (e) => this.handleToggle(e));
		bind(cancel, 'click', () => this.closeModal());
		bind(confirm, 'click', (e) => this.handleConfirm(e));
		bind(regenerateBtn, 'click', () => this.handleRegenerate());
		bind(download, 'click', () => this.handleDownload());
		bind(otp, 'keydown', (e) => this.handleOtpKeydown(e));
	}

	detachHandlers(unbind: UnbindFn) {
		const { toggle, cancel, confirm, regenerateBtn, download, otp } = this.dom;
		unbind(toggle, 'change');
		unbind(cancel, 'click');
		unbind(confirm, 'click');
		unbind(regenerateBtn, 'click');
		unbind(download, 'click');
		unbind(otp, 'keydown');
		this.detachEscapeListener();
	}

	async refreshState() {
		const { section, toggle, label, regenerateBtn } = this.dom;
		if (!section || !toggle || !label || !regenerateBtn) return;

		const token = localStorage.getItem('token');
		if (!token) {
			section.classList.add('hidden');
			return;
		}

		if (localStorage.getItem('twofaEnabled') === null) {
			await main.refreshSession();
		}

		const enabled = localStorage.getItem('twofaEnabled') === 'true';
		section.classList.remove('hidden');
		toggle.checked = enabled;

	label.classList.remove('text-base-content', 'text-green-400', 'text-red-400');
	label.classList.add(enabled ? 'text-green-400' : 'text-red-400');
	label.textContent = enabled ? t('twofa.enabledLabel') : t('twofa.disabledLabel');

	// Toggle regenerateBtn visibility
	if (enabled) {
		regenerateBtn.classList.remove('hidden');
		regenerateBtn.classList.add('inline-flex');
	} else {
		regenerateBtn.classList.remove('inline-flex');
		regenerateBtn.classList.add('hidden');
	}
	}

	private async handleToggle(event: Event) {
		const input = event.currentTarget as HTMLInputElement | null;
		const token = localStorage.getItem('token');
		if (!input || !token) {
			if (input) input.checked = false;
			return;
		}

		try {
			if (input.checked) {
				await this.startSetup(token);
			} else {
				await this.disable(token);
			}
		} catch (err) {
			console.error(err);
			input.checked = !input.checked;
			notify(t('twofa.errors.unavailable'), { type: 'warning' });
		}
	}

	private async startSetup(token: string) {
		const { modal, qr, message, recoveryList, title, intro, otp, confirm, cancel, download } = this.dom;
		if (!modal || !qr || !message || !recoveryList || !title || !intro || !otp || !confirm || !cancel || !download) return;

	this.resetModal();
	message.innerHTML = `<p class="mt-6 text-sm text-gray-300 leading-relaxed">${t('twofa.setup.generating')}</p>`;
	this.ensureModalListAttached();
	recoveryList.innerHTML = '';
	// Show modal
	modal.classList.remove('hidden');
	modal.classList.add('flex');
	this.pendingSetup = true;
	this.attachEscapeListener();

		const res = await fetch(`${apiBase()}/2fa/setup`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` }
		});
		const data = await res.json();
		if (!res.ok) {
			this.pendingSetup = false;
			if (this.dom.toggle) this.dom.toggle.checked = false;
			this.closeModal();
			notify(data.error || t('twofa.errors.generate'), { type: 'warning' });
			return;
		}

		qr.src = data.qr_png_data_url;
		message.innerHTML = `<p class="mt-6 text-sm text-gray-300 leading-relaxed">${t('twofa.messages.instruction')}</p>`;
		this.ensureModalListAttached();
		requestAnimationFrame(() => otp.focus());
	}

	private async handleConfirm(event: Event) {
		event.preventDefault();
		const token = localStorage.getItem('token');
		const { confirm, otp, message } = this.dom;
		if (!token || !confirm) return;

		if (confirm.dataset.mode === 'copy') {
			await this.copyRecovery();
			return;
		}

		if (!otp) return;
		const code = otp.value.trim();
		if (!code) { otp.focus(); return; }

		const res = await fetch(`${apiBase()}/2fa/verify-setup`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ otp: code })
		});
		const data = await res.json();
		if (!res.ok) {
			if (message) {
				message.innerHTML = `<p class="mt-6 text-sm text-red-300 leading-relaxed">${data.error || t('twofa.errors.invalidOtp')}</p>`;
				this.ensureModalListAttached();
			}
			otp.select();
			return;
		}

		const codes = this.extractRecoveryCodes(data);
		if (!codes.length) {
			if (message) {
				message.innerHTML = `<p class="mt-6 text-sm text-yellow-300 leading-relaxed">${t('twofa.errors.noCodes')}</p>`;
				this.ensureModalListAttached();
			}
			this.pendingSetup = false;
			await main.refreshSession();
			await this.refreshState();
			return;
		}

		otp.value = '';
		this.pendingSetup = false;
		this.showRecovery(codes, 'setup');
		await main.refreshSession();
		await this.refreshState();
	}

	private async disable(token: string) {
		const ok = window.confirm(t('twofa.confirmDisable'));
		const { toggle } = this.dom;
		if (!ok) {
			if (toggle) toggle.checked = true;
			return;
		}

		const res = await fetch(`${apiBase()}/2fa/disable`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!res.ok) {
			const data = await res.json();
			throw new Error(data.error || t('twofa.errors.disable'));
		}
		await main.refreshSession();
		await this.refreshState();
	}

	private async handleRegenerate() {
		const token = localStorage.getItem('token');
		if (!token) return;

		const res = await fetch(`${apiBase()}/2fa/recovery/regenerate`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` }
		});
		const data = await res.json();
		if (!res.ok) {
			notify(data.error || t('twofa.errors.regenerate'), { type: 'warning' });
			return;
		}

		const codes = this.extractRecoveryCodes(data);
		if (!codes.length) {
			notify(t('twofa.errors.empty'), { type: 'warning' });
			return;
		}
		this.showRecovery(codes, 'regen');
	}

	private showRecovery(codes: string[], source: 'setup' | 'regen') {
		const { modal, title, intro, qr, otp, message, recoveryList, confirm, cancel, download } = this.dom;
		if (!modal || !title || !intro || !message || !recoveryList || !confirm || !cancel || !download) return;

		this.pendingSetup = false;

		title.textContent = t('twofa.setup.codesTitle');
		intro.classList.add('hidden');
		if (qr) qr.classList.add('hidden');
		if (otp) otp.classList.add('hidden');

		const infoText = source === 'setup'
			? t('twofa.setup.codesInfoSetup')
			: t('twofa.setup.codesInfoRegen');
		message.innerHTML = `<p class="mt-6 text-sm text-gray-300 leading-relaxed">${infoText}</p>`;
		this.ensureModalListAttached();

		recoveryList.innerHTML = codes
			.map((c) => `<li class="px-3 py-2 rounded bg-gray-900/70 text-sm tracking-wide font-mono text-sky-100 border border-gray-700">${c}</li>`)
			.join('');
		recoveryList.classList.add('grid', 'grid-cols-2', 'gap-2');

	confirm.textContent = t('twofa.buttons.copy');
	confirm.dataset.mode = 'copy';
	confirm.className = 'px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white';
	// Show download button
	download.classList.remove('hidden');
	download.classList.add('inline-flex');
	download.className = 'px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white';

	cancel.textContent = t('twofa.buttons.close');
	cancel.className = 'px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white';

	// Show modal
	modal.classList.remove('hidden');
	modal.classList.add('flex');
	this.attachEscapeListener();
	}

	private async copyRecovery() {
		const codes = this.collectCodesFromModal();
		if (!codes.length) return;
		try {
			await navigator.clipboard.writeText(codes.join('\n'));
			notify(t('twofa.codeCopied'), { type: 'success' })
		} catch (err) {
			console.warn(t('twofa.errors.copyFailed'), err);
		}
	}

	private handleDownload() {
		const codes = this.collectCodesFromModal();
		if (!codes.length) return;
		const blob = new Blob([codes.join('\n')], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'recovery_codes.txt';
		anchor.click();
		URL.revokeObjectURL(url);
	}

	private collectCodesFromModal(): string[] {
		const { recoveryList } = this.dom;
		if (!recoveryList) return [];
		return Array.from(recoveryList.querySelectorAll('li')).map((li) => li.textContent || '').filter(Boolean);
	}

closeModal() {
	const { modal, toggle } = this.dom;
	if (modal) {
		modal.classList.remove('flex');
		modal.classList.add('hidden');
	}
	this.resetModal();
	this.detachEscapeListener();

		if (this.pendingSetup) {
			this.pendingSetup = false;
			if (toggle) toggle.checked = false;
			void this.refreshState();
		}
	}

	private resetModal() {
		const { title, intro, qr, otp, message, recoveryList, confirm, cancel, download } = this.dom;
		if (title) title.textContent = t('twofa.setup.title');
		if (intro) {
			// intro.style.display = '';
			intro.classList.remove('hidden');
			intro.innerHTML = `<p class="mt-2 text-sm text-gray-300 leading-relaxed">${t('twofa.setup.instruction')}</p>`;
		}
		if (qr) {
			// qr.style.display = '';
			qr.classList.remove('hidden');
			qr.removeAttribute('src');
		}
		if (otp) {
			// otp.style.display = '';
			otp.classList.remove('hidden');
			otp.value = '';
		}
		if (message) {
			message.innerHTML = '';
			this.ensureModalListAttached();
		}
		if (recoveryList) {
			recoveryList.innerHTML = '';
			recoveryList.className = '';
		}
		if (confirm) {
			confirm.textContent = t('twofa.setup.activate');
			confirm.dataset.mode = 'verify';
			confirm.className = 'px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white';
		}
		if (cancel) {
			cancel.textContent = t('common.cancel');
			cancel.className = 'px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white';
		}
		if (download) {
			download.classList.add('hidden');
			download.onclick = null;
			download.className = 'px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white';
		}
	}

	private handleOtpKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		this.handleConfirm(event);
	}

	private extractRecoveryCodes(data: unknown): string[] {
		if (!data || (typeof data === 'object' && Object.keys(data as object).length === 0)) return [];
		if (Array.isArray(data)) return this.normalizeCodes(data);

		const candidates = [
			(data as any)?.recovery_codes,
			(data as any)?.recoveryCodes,
			(data as any)?.codes,
			(data as any)?.recovery,
			data
		];

		for (const candidate of candidates) {
			const normalized = this.normalizeCodes(candidate);
			if (normalized.length) return normalized;
		}

		return [];
	}

	private normalizeCodes(value: unknown): string[] {
		if (!value) return [];
		if (Array.isArray(value)) {
			return value
				.map((item) => (item == null ? '' : String(item).trim()))
				.filter(Boolean);
		}
		if (typeof value === 'string') {
			return value
				.split(/\r?\n|\s+/)
				.map((part) => part.trim())
				.filter(Boolean);
		}
		return [];
	}

	private ensureModalListAttached() {
		const { message, recoveryList } = this.dom;
		if (!message || !recoveryList) return;
		if (!message.contains(recoveryList)) {
			message.appendChild(recoveryList);
		}
		recoveryList.classList.add('grid', 'grid-cols-2', 'gap-2');
	}

	private attachEscapeListener() {
		if (this.escapeHandler) return;
		this.escapeHandler = (ev: KeyboardEvent) => {
			if (ev.key === 'Escape') {
				this.closeModal();
			}
		};
		document.addEventListener('keydown', this.escapeHandler);
	}

	private detachEscapeListener() {
		if (!this.escapeHandler) return;
		document.removeEventListener('keydown', this.escapeHandler);
		this.escapeHandler = null;
	}
}
