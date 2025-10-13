// requirement/frontend/pages/enhanced-profile.ts
import type { Page } from '../src/router';
import { Router } from '../src/router';
import { apiBase } from "../src/utils";
import { dashboardManager, type DashboardData } from "../src/dashboard";
import { t } from '../handlers/language';

export class EnhancedProfilePage implements Page {
	private refreshDashboardHandler: () => void;
	private sessionAnalysisBtnHandler: () => void;
	private backToProfileHandler: () => void;
	private showAllMatchesHandler: () => void;
	private showRecentMatchesHandler: () => void;
	private router: Router | null = null;
	private currentData: DashboardData | null = null;

	constructor() {
		this.refreshDashboardHandler = this.handleRefreshDashboardClick.bind(this);
		this.sessionAnalysisBtnHandler = this.handleSessionAnalysisBtnClick.bind(this);
		this.backToProfileHandler = this.handleBackToProfileClick.bind(this);
		this.showAllMatchesHandler = this.handleShowAllMatchesClick.bind(this);
		this.showRecentMatchesHandler = this.handleShowRecentMatchesClick.bind(this);
	}

	setRouter(router: Router): void {
		this.router = router;
	}

	render(): string {
		return `
			<div class="card min-h-screen bg-base-200">
				<!-- Header -->
				<div class="bg-base-100 shadow-lg">
					<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div class="flex justify-between items-center py-6">
							<h1 class="card-title">${t('enhancedProfile.title')}</h1>
							<div class="flex space-x-4">
								<button id="refreshDashboard" class="btn btn-primary">
									<svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
									</svg>
									${t('enhancedProfile.refresh')}
								</button>
								<button id="sessionAnalysisBtn" class="btn btn-primary">
									📈 ${t('enhancedProfile.sessionAnalysis')}
								</button>
								<button id="backToProfile" class="btn btn-ghost">
									${t('enhancedProfile.backToProfile')}
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Main Content -->
				<div class="card-body">
					<!-- Loading State -->
					<div id="loadingState" class="text-center py-12">
						<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
						<p class="mt-4 text-base-content">${t('enhancedProfile.loading')}</p>
					</div>

					<!-- Error State -->
					<div id="errorState" class="hidden bg-error-900 border border-error-700 text-error-100 px-4 py-3 rounded mb-6">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
								</svg>
							</div>
							<div class="ml-3">
								<h3 class="text-sm font-medium">${t('enhancedProfile.errorLoading')}</h3>
								<div class="mt-2 text-sm">
									<p id="errorMessage">${t('enhancedProfile.errorMessage')}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Dashboard Content -->
					<div id="dashboardContent" class="card-body hidden">
						<!-- User Info Header -->
						<div class="card-content p-4 bg-base-300 rounded-lg p-6 mb-8">
							<div class="flex items-center">
								<div>
									<h2 id="userName" class="card-title">${t('enhancedProfile.profileLabel')} <span id="userDisplayName"></span></h2>
									<p id="userUsername" class="text-primary-400"></p>
								</div>
							</div>
						</div>

						<!-- Statistics Cards -->
						<div id="statsCards" class="mb-8"></div>

						<!-- Charts Section -->
						<div class="grid grid-cols-2 gap-8 mb-8">
							<!-- Win/Loss Chart -->
							<div class="card-content p-4 bg-base-300 rounded space-y-4">
								<h3 class="text-xl font-semibold text-base-content mb-4">${t('enhancedProfile.winLossTitle')}</h3>
								<div class="h-48 flex items-start justify-center pt-4">
									<div id="winLossChart"></div>
								</div>
							</div>

							<!-- Performance Trend Chart -->
							<div class="card-content p-4 bg-base-300 rounded space-y-4">
								<h3 class="text-xl font-semibold text-base-content mb-4">${t('enhancedProfile.performanceTrendTitle')}</h3>
								<div class="h-64">
									<div id="performanceChart"></div>
								</div>
							</div>
						</div>

						<!-- Match History Section -->
						<div class="card-content p-4 bg-base-300 rounded space-y-4">
							<div class="flex justify-between items-center mb-6">
								<h3 class="text-xl font-semibold text-base-content">${t('enhancedProfile.recentMatchesTitle')}</h3>
								<div class="flex space-x-2">
									<button id="showAllMatches" class="btn btn-ghost">
										${t('enhancedProfile.showAll')}
									</button>
									<button id="showRecentMatches" class="btn btn-primary">
										${t('enhancedProfile.recentOnly')}
									</button>
								</div>
							</div>
							<div id="matchHistory" class="space-y-4"></div>
						</div>

						<!-- Additional Statistics -->
						<div class="card-content p-4 bg-base-300 rounded space-y-4">
							<!-- Detailed Stats -->
							<div class=" rounded-lg p-6">
								<h4 class="text-lg font-semibold text-base-content mb-4">${t('enhancedProfile.detailedStatsTitle')}</h4>
								<div id="detailedStats" class="space-y-2 text-sm">
									<!-- Will be populated by JavaScript -->
								</div>
							</div>

							<!-- Achievements -->
							<div class="card-content p-4 bg-base-300 rounded space-y-4">
								<h4 class="text-lg font-semibold text-base-content mb-4">${t('enhancedProfile.achievementsTitle')}</h4>
								<div id="achievements" class="space-y-2">
									<!-- Will be populated by JavaScript -->
								</div>
							</div>

							<!-- Performance Insights -->
							<div class="card-content p-4 bg-base-300 rounded space-y-4">
								<h4 class="text-lg font-semibold text-base-content mb-4">${t('enhancedProfile.insightsTitle')}</h4>
								<div id="insights" class="space-y-2 text-sm">
									<!-- Will be populated by JavaScript -->
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	mount(): void {
		('EnhancedProfilePage mount() called.');
		this.setupEnhancedProfileLogic();

		document.getElementById('refreshDashboard')?.addEventListener('click', this.refreshDashboardHandler);
		document.getElementById('sessionAnalysisBtn')?.addEventListener('click', this.sessionAnalysisBtnHandler);
		document.getElementById('backToProfile')?.addEventListener('click', this.backToProfileHandler);
		document.getElementById('showAllMatches')?.addEventListener('click', this.showAllMatchesHandler);
		document.getElementById('showRecentMatches')?.addEventListener('click', this.showRecentMatchesHandler);
	}

	unmount(): void {
		document.getElementById('refreshDashboard')?.removeEventListener('click', this.refreshDashboardHandler);
		document.getElementById('sessionAnalysisBtn')?.removeEventListener('click', this.sessionAnalysisBtnHandler);
		document.getElementById('backToProfile')?.removeEventListener('click', this.backToProfileHandler);
		document.getElementById('showAllMatches')?.removeEventListener('click', this.showAllMatchesHandler);
		document.getElementById('showRecentMatches')?.removeEventListener('click', this.showRecentMatchesHandler);
	}

	private async setupEnhancedProfileLogic() {
		const loadingState = document.getElementById('loadingState');
		const errorState = document.getElementById('errorState');
		const dashboardContent = document.getElementById('dashboardContent');
		const errorMessage = document.getElementById('errorMessage');

		if (!loadingState || !errorState || !dashboardContent || !errorMessage) {
			console.error('Requierror DOM elements not found for enhanced profile');
			return;
		}

		const token = localStorage.getItem('token');
		if (!token) {
			this.showError(t('enhancedProfile.loginRequired'));
			return;
		}

		const userName = localStorage.getItem('name') || localStorage.getItem('username');
		const username = localStorage.getItem('username');
		const name = localStorage.getItem('name');
  
		console.log('Available user data:', {
			name: name,
			username: username,
			userName: userName
		});
  
		if (!userName) {
			this.showError(t('enhancedProfile.userNotFound'));
			return;
		}

		try {
			// Show loading state
			loadingState.classList.remove('hidden');
			errorState.classList.add('hidden');
			dashboardContent.classList.add('hidden');


			// Load dashboard data - the dashboard manager will get the correct user name from /me endpoint
			const data = await dashboardManager.loadDashboardData(userName);
			this.currentData = data;
			
			// Populate dashboard
			await this.populateDashboard(data);

			// Hide loading, show content first
			loadingState.classList.add('hidden');
			dashboardContent.classList.remove('hidden');

		} catch (error) {
			console.error('Error setting up enhanced profile:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
			console.error('Full error details:', error);
			this.showError(errorMessage);
		}
	}

	private async populateDashboard(data: DashboardData) {
		// Populate user info
		const userName = document.getElementById('userName');
		const userUsername = document.getElementById('userUsername');
		const userDisplayName = document.getElementById('userDisplayName');

		// Display "Profil : [name]" format
		if (userDisplayName) userDisplayName.textContent = data.user.name;
  
		// Only show username if it's different from the name
		if (userUsername) {
			if (data.user.username && data.user.username !== data.user.name) {
				userUsername.textContent = `@${data.user.username}`;
			} else {
				userUsername.textContent = ''; // Hide if same as name
			}
		}

		// Render statistics cards
		dashboardManager.renderStatsCards('statsCards', data.stats);

		// Render charts with proper DOM readiness check
		setTimeout(() => {
			const winLossContainer = document.getElementById('winLossChart');
			const performanceContainer = document.getElementById('performanceChart');
			
			if (winLossContainer && performanceContainer) {
				dashboardManager.renderWinLossChart('winLossChart', data.stats);
				dashboardManager.renderPerformanceTrend('performanceChart', data.performanceData);
			} else {
				console.warn('Chart containers not found, retrying...');
				// Retry after a longer delay if containers not found
				setTimeout(() => {
					dashboardManager.renderWinLossChart('winLossChart', data.stats);
					dashboardManager.renderPerformanceTrend('performanceChart', data.performanceData);
				}, 200);
			}
		}, 100);

		// Render match history (recent matches by default)
		dashboardManager.renderMatchHistory('matchHistory', data.recentMatches);

		// Populate detailed statistics
		this.populateDetailedStats(data.stats);

		// Populate achievements
		this.populateAchievements(data.stats);

		// Populate insights
		this.populateInsights(data.stats, data.matches);
	}

	private populateDetailedStats(stats: any) {
		const container = document.getElementById('detailedStats');
		if (!container) return;

		container.innerHTML = `
			<div class="flex justify-between">
				<span class="text-base-content">${t('enhancedProfile.statsLabels.totalPointsScored')}</span>
				<span class="text-base-content font-semibold">${stats.pointsGagnes}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-base-content">${t('enhancedProfile.statsLabels.totalPointsConceded')}</span>
				<span class="text-base-content font-semibold">${stats.pointsPris}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-base-content">${t('enhancedProfile.statsLabels.bestStreak')}</span>
				<span class="text-success font-semibold">${stats.bestStreak}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-base-content">${t('enhancedProfile.statsLabels.worstStreak')}</span>
				<span class="text-error font-semibold">${stats.worstStreak}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-base-content">${t('enhancedProfile.statsLabels.bestScore')}</span>
				<span class="text-yellow-400 font-semibold">${stats.bestScore}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-base-content">${t('enhancedProfile.statsLabels.worstScore')}</span>
				<span class="text-orange-400 font-semibold">${stats.worstScore}</span>
			</div>
		`;
	}

	private populateAchievements(stats: any) {
		const container = document.getElementById('achievements');
		if (!container) return;

		const achievements = [];
  
		if (stats.winrate >= 80) achievements.push({ name: t('enhancedProfile.achievements.dominator.name'), desc: t('enhancedProfile.achievements.dominator.desc'), icon: '👑' });
		if (stats.total >= 100) achievements.push({ name: t('enhancedProfile.achievements.centurion.name'), desc: t('enhancedProfile.achievements.centurion.desc'), icon: '💯' });
		if (stats.bestStreak >= 10) achievements.push({ name: t('enhancedProfile.achievements.hotStreak.name'), desc: t('enhancedProfile.achievements.hotStreak.desc'), icon: '🔥' });
		if (stats.averageScore >= 4) achievements.push({ name: t('enhancedProfile.achievements.sharpShooter.name'), desc: t('enhancedProfile.achievements.sharpShooter.desc'), icon: '🎯' });
		if (stats.total >= 50 && stats.winrate >= 60) achievements.push({ name: t('enhancedProfile.achievements.consistent.name'), desc: t('enhancedProfile.achievements.consistent.desc'), icon: '⭐' });

		if (achievements.length === 0) {
			container.innerHTML = `<p class="text-base-content text-sm">${t('enhancedProfile.achievements.noAchievements')}</p>`;
			return;
		}

		container.innerHTML = achievements.map(achievement => `
			<div class="flex items-center space-x-3 p-2 bg-primary-300 rounded">
				<span class="text-2xl">${achievement.icon}</span>
				<div>
					<div class="font-semibold text-base-content">${achievement.name}</div>
					<div class="text-xs text-base-content">${achievement.desc}</div>
				</div>
			</div>
		`).join('');
	}

	private populateInsights(stats: any, matches: any[]) {
		const container = document.getElementById('insights');
		if (!container) return;

		const insights = [];

		if (stats.currentStreak > 0) {
			insights.push(`🔥 ${t('enhancedProfile.insights.winningStreak', { streak: stats.currentStreak.toString() })}`);
		} else if (stats.currentStreak < 0) {
			insights.push(`💪 ${t('enhancedProfile.insights.losingStreak', { streak: Math.abs(stats.currentStreak).toString() })}`);
		}

		if (stats.winrate > 70) {
			insights.push(`🏆 ${t('enhancedProfile.insights.excellent')}`);
		} else if (stats.winrate < 30) {
			insights.push(`📈 ${t('enhancedProfile.insights.needsImprovement')}`);
		}

		if (stats.averageScore > 4) {
			insights.push(`🎯 ${t('enhancedProfile.insights.goodAccuracy')}`);
		}

		if (matches.length > 0) {
			const recentMatches = matches.slice(0, 5);
			const recentWinRate = recentMatches.filter(m => m.result === 'W').length / recentMatches.length * 100;
			
			if (recentWinRate > stats.winrate + 10) {
				insights.push(`📊 ${t('enhancedProfile.insights.improving')}`);
			}
		}

		if (insights.length === 0) {
			insights.push(`🎮 ${t('enhancedProfile.insights.keepPlaying')}`);
		}

		container.innerHTML = insights.map(insight => `
			<div class="p-3 bg-base-100 rounded-lg text-sm">
				${insight}
			</div>
		`).join('');
	}

	private handleRefreshDashboardClick() {
		this.setupEnhancedProfileLogic();
	}

	private handleSessionAnalysisBtnClick() {
		if (this.router) {
			this.router.navigateTo('/session-analysis');
		} else {
			console.error('Router not available for navigation');
		}
	}

	private handleBackToProfileClick() {
		if (this.router) {
			this.router.navigateTo('/profile');
		} else {
			console.error('Router not available for navigation');
		}
	}

	private handleShowAllMatchesClick() {
		if (!this.currentData) return;
		
		dashboardManager.renderMatchHistory('matchHistory', this.currentData.matches);
		
		// Update button states
		const showAllBtn = document.getElementById('showAllMatches');
		const showRecentBtn = document.getElementById('showRecentMatches');
		
		if (showAllBtn && showRecentBtn) {
			showAllBtn.classList.add('btn-primary');
			showAllBtn.classList.remove('btn-ghost');
			showRecentBtn.classList.add('btn-ghost');
			showRecentBtn.classList.remove('btn-primary');
		}
	}

	private handleShowRecentMatchesClick() {
		if (!this.currentData) return;
		
		dashboardManager.renderMatchHistory('matchHistory', this.currentData.recentMatches);
		
		// Update button states
		const showAllBtn = document.getElementById('showAllMatches');
		const showRecentBtn = document.getElementById('showRecentMatches');
		
		if (showAllBtn && showRecentBtn) {
			showRecentBtn.classList.add('btn-primary');
			showRecentBtn.classList.remove('btn-ghost');
			showAllBtn.classList.add('btn-ghost');
			showAllBtn.classList.remove('btn-primary');
		}
	}

	private showError(message: string) {
		const loadingState = document.getElementById('loadingState');
		const errorState = document.getElementById('errorState');
		const dashboardContent = document.getElementById('dashboardContent');
		const errorMessage = document.getElementById('errorMessage');

		if (loadingState) loadingState.classList.add('hidden');
		if (errorState) {
			errorState.classList.remove('hidden');
			if (errorMessage) errorMessage.textContent = message;
		}
		if (dashboardContent) dashboardContent.classList.add('hidden');
	}
}
