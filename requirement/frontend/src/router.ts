import { onLanguageChange } from '../handlers/language';
import { HomePage } from '../pages/home';
import { ChoosePasswordPage } from '../pages/choose-password';
import { FriendsPage } from '../pages/friends';
import { Play2Page as PlayPage } from '../pages/play';
import { ProfilePage } from '../pages/profile';
import { GameSessionDashboardPage } from '../pages/game-session-dashboard';
import {EnhancedProfilePage} from '../pages/enhanced-profile'

class Router {
	private currentPath: string = '';
	private currentPage: Page | null = null;
	private appElement: HTMLElement;

	constructor(appElement: HTMLElement) {
		this.appElement = appElement;
		window.addEventListener('popstate', () => this.resolveRoute());
		onLanguageChange(() => this.resolveRoute(true));
	}

	resolveRoute(force: boolean = false) {
		const path = window.location.pathname;
		if (this.currentPath === path && !force) {
			// return;
			if (this.currentPage)
			{
				this.currentPage.unmount();
				this.currentPage.mount();
			}
			return;
		}

		if (this.currentPage) {
			this.currentPage.unmount();
		}

		this.currentPath = path;

		const PageConstructor = routes[path] || routes['/'];
		const newPage = new PageConstructor();

		if (newPage.setRouter) {
			newPage.setRouter(this);
		}

		this.currentPage = newPage;

		this.appElement.innerHTML = newPage.render();

		newPage.mount();

		const mainRegion = this.appElement;
		window.requestAnimationFrame(() => {
			mainRegion.focus({ preventScroll: true });
			const firstHeading = mainRegion.querySelector<HTMLElement>('h1, h2, [role="heading"]');
			const announcer = document.getElementById('sr-announcer');
			if (announcer) {
				const announcement = firstHeading?.textContent?.trim() || document.title || path;
				announcer.textContent = announcement;
			}
		});

		document.dispatchEvent(new CustomEvent('router:navigated', { detail: { path } }));
	}

	navigateTo(path: string, force: boolean = false) {
		history.pushState({}, '', path);
		this.resolveRoute(force);
	}
}

export interface Page {
	render(): string;
	mount(): void;
	unmount(): void;
	setRouter?(router: Router): void;
}

const routes: { [path: string]: new () => Page } = {
	'/': HomePage,
	'/choose-password': ChoosePasswordPage,
	'/friends': FriendsPage,
	'/play': PlayPage,
	'/profile': ProfilePage,
	'/session-analysis': GameSessionDashboardPage,
	'/dashboard' : EnhancedProfilePage
};

export { Router };
