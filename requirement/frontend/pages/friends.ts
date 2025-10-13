// requirement/frontend/pages/friends.ts
import { Page } from '../src/router';
import * as friendService from '../handlers/friends-handler';
import { t } from '../handlers/language';

export class FriendsPage implements Page {
	private addFriendFormHandler: (event: Event) => void;
	private removeFriendFormHandler: (event: Event) => void;

	constructor() {
		this.addFriendFormHandler = friendService.addFriends;
		this.removeFriendFormHandler = friendService.removeFriends;

	}

	render(): string {
		const token = localStorage.getItem("token");
		if (!token) {
			console.info(t('alerts.needLogin'));
			return `<p>${t('alerts.needLogin')}</p>`;
		}

		return `
		<!-- WRAPPER FULL-BLEED : edge-to-edge + couvre la zone sous la navbar -->
		<div class="relative left-1/2 right-1/2 -mx-[50vw] w-screen min-h-screen -mt-16 pt-16 overflow-x-hidden bg-base-200 text-base-content">
			<div class="relative min-h-screen overflow-hidden">
				<!-- fond uni + ombres sur les cartes -->

				<div class="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-14 px-6 py-16">
					<header class="mx-auto max-w-3xl text-center">
						<span class="badge badge-primary badge-outline mb-3 shadow shadow-primary/30">${t('friends.subtitle')}</span>
						<h1 class="text-4xl font-extrabold tracking-tight drop-shadow-md">${t('friends.title')}</h1>
					</header>

					<div class="grid gap-14 lg:grid-cols-[1fr_1fr]">
						<section class="relative flex flex-col gap-8">
							<div class="rounded-[2.5rem] border border-base-300/70 bg-base-100 p-10 shadow-[0_40px_120px_-70px_rgba(17,25,61,0.85)] backdrop-blur-xl">
								<div class="grid gap-8 md:grid-cols-2">
									<!-- ➜ transparent, plus de couleur en fond -->
									<section id="addFriendSection" class="flex flex-col gap-4 rounded-[2rem] p-7 bg-transparent">
										<h2 class="text-lg font-semibold">${t('friends.addTitle')}</h3>
										<form id="addFriendForm" class="form-control gap-4">
											<label class="sr-only" for="friendUsernameInput">${t('friends.addPlaceholder')}</label>
											<input id="friendUsernameInput" type="text" placeholder="${t('friends.addPlaceholder')}" class="input input-bordered w-full" required />
											<button type="submit" class="btn btn-primary w-full shadow-lg shadow-primary/35">${t('friends.addCta')}</button>
										</form>
									</section>

									<!-- ➜ transparent, plus de couleur en fond -->
									<section id="removeFriendSection" class="flex flex-col gap-4 rounded-[2rem] p-7 bg-transparent">
										<h2 class="text-lg font-semibold">${t('friends.removeTitle')}</h3>
										<form id="removeFriendForm" class="form-control gap-4">
											<label class="sr-only" for="removefriendUsernameInput">${t('friends.removePlaceholder')}</label>
											<input id="removefriendUsernameInput" type="text" placeholder="${t('friends.removePlaceholder')}" class="input input-bordered w-full" required />
											<button type="submit" class="btn btn-outline btn-error w-full shadow-lg shadow-error/25">${t('friends.removeCta')}</button>
										</form>
									</section>
								</div>
							</div>

							<section id="friendsListSection" class="rounded-[2.5rem] border border-base-300/70 bg-base-100 p-10 shadow-[0_40px_120px_-70px_rgba(17,25,61,0.85)] backdrop-blur-xl">
								<div class="mb-6 flex items-center justify-between">
									<h3 class="text-xl font-semibold">${t('friends.listTitle')}</h2>
								</div>
								<ul id="friendsList" class="flex max-h-[28rem] flex-col gap-4 py-2 overflow-y-auto pr-[0.35rem]"></ul>
							</section>
						</section>

						<section id="friendProfileSection" class="space-y-10 rounded-[2.5rem] border border-base-300/70 bg-base-100 p-10 shadow-[0_40px_120px_-70px_rgba(17,25,61,0.85)] backdrop-blur-xl">
							<div class="space-y-3 text-center">
								<h3 class="text-3xl font-semibold">${t('friends.profileTitle')}</h2>
								<p id="friendProfileHint" class="rounded-2xl border border-dashed border-base-300 bg-base-200/70 px-6 py-7 text-sm opacity-75 shadow-inner">${t('friends.hint')}</p>
							</div>

							<!-- ➜ fond neutre + ombre, sans teinte primaire -->
							<div id="friendProfileCard" class="hidden flex flex-col items-center gap-6 rounded-2xl bg-base-100 px-8 py-10 text-center shadow-xl">
								<div class="avatar drop-shadow-lg">
									<div class="h-28 w-28 rounded-full border-[3px] border-primary shadow-lg shadow-primary/30">
										<img id="friendProfileAvatar" src="/assets/default-avatar.png" class="object-cover" />
									</div>
								</div>
								<div class="space-y-2">
									<div id="friendProfileName" class="text-2xl font-semibold"></div>
									<div class="text-sm opacity-70">${t('friends.usernameLabel')} <span id="friendProfileUsername" class="font-medium"></span></div>
								</div>
							</div>

							<div id="friendHistorySection" class="hidden rounded-2xl bg-base-100 px-7 py-8 shadow-inner">
								<h3 class="text-lg font-semibold">${t('friends.history.title')}</h3>
								<div id="friendHistoryContent" class="mt-6 space-y-4 text-sm"></div>
							</div>
						</section>
					</div>
				</div>
			</div>
		</div>
		`;
	}

	mount(): void {
		const addFriendForm = document.getElementById('addFriendForm');
		const removeFriendForm = document.getElementById('removeFriendForm');
		const friendsList = document.getElementById("friendsList") as HTMLElement | null;
		const token = localStorage.getItem('token');

		if (addFriendForm) addFriendForm.addEventListener('submit', this.addFriendFormHandler);
		if (removeFriendForm) removeFriendForm.addEventListener('submit', this.removeFriendFormHandler);

		if (friendsList && token) {
			friendService.refreshFriendsList().catch(err => console.warn('refreshFriendsList failed:', err));
		}
	}

	unmount(): void {
		const addFriendForm = document.getElementById('addFriendForm');
		const removeFriendForm = document.getElementById('removeFriendForm');
		if (addFriendForm) addFriendForm.removeEventListener('submit', this.addFriendFormHandler);
		if (removeFriendForm) removeFriendForm.removeEventListener('submit', this.removeFriendFormHandler);
	}
}
