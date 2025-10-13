// requirement/frontend/pages/game-session-dashboard.ts
import type { Page } from '../src/router';
import { Router } from '../src/router';
import { apiBase } from "../src/utils";
import { dashboardManager, type MatchData, type UserStats } from "../src/dashboard";
import Chart from 'chart.js/auto';
import { format, parseISO, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { t } from '../handlers/language';

export class GameSessionDashboardPage implements Page {
	private refreshSessionDataHandler: () => void;
	private backToDashboardHandler: () => void;
	private timeFilterHandler: () => void;
	private resultFilterHandler: () => void;
	private router: Router | null = null;
	private currentData: any = null;

	constructor() {
		this.refreshSessionDataHandler = this.handleRefreshSessionDataClick.bind(this);
		this.backToDashboardHandler = this.handleBackToDashboardClick.bind(this);
		this.timeFilterHandler = this.handleTimeFilterChange.bind(this);
		this.resultFilterHandler = this.handleResultFilterChange.bind(this);
	}

	// Helper to get theme-aware text color
	private getTextColor(): string {
		const baseContent = getComputedStyle(document.documentElement).getPropertyValue('--bc');
		if (baseContent) {
			return `hsl(${baseContent})`;
		}
		return '#9ca3af'; // fallback gray
	}

	setRouter(router: Router): void {
		this.router = router;
	}

	render(): string {
		return `
			<div class="min-h-screen bg-base-200">
				<!-- Header -->
				<div class="bg-base-100 shadow-lg">
					<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div class="flex justify-between items-center py-6">
							<h1 class="text-3xl font-bold text-base-content">${t('sessionDashboard.title')}</h1>
							<div class="flex space-x-4">
								<button id="refreshSessionData" class="btn btn-primary">
									<svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
									</svg>
									${t('sessionDashboard.refresh')}
								</button>
								<button id="backToDashboard" class="btn btn-ghost">
									${t('sessionDashboard.backToDashboard')}
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Main Content -->
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<!-- Loading State -->
					<div id="loadingState" class="text-center py-12">
						<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
						<p class="mt-4 text-base-content">${t('sessionDashboard.loading')}</p>
					</div>

					<!-- Error State -->
					<div id="errorState" class="hidden bg-red-900 border border-red-700 text-error-100 px-4 py-3 rounded mb-6">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
								</svg>
							</div>
							<div class="ml-3">
								<h3 class="text-sm font-medium">${t('sessionDashboard.errorLoading')}</h3>
								<div class="mt-2 text-sm">
									<p id="errorMessage">${t('sessionDashboard.errorMessage')}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Session Content -->
					<div id="sessionContent" class="hidden">
						<!-- Session Overview Cards -->
						<div id="sessionOverview" class="grid grid-cols-4 gap-6 mb-8"></div>

						<!-- Charts Section -->
						<div class="grid grid-cols-2 gap-8 mb-8">
							<!-- Score Distribution Chart -->
							<div class="bg-base-100 rounded-lg p-6">
								<h3 class="text-xl font-semibold text-base-content mb-4">${t('sessionDashboard.charts.scoreDistribution')}</h3>
								<div class="h-64">
									<div id="scoreDistributionChart"></div>
								</div>
							</div>

							<!-- Performance by Day of Week -->
							<div class="bg-base-100 rounded-lg p-6">
								<h3 class="text-xl font-semibold text-base-content mb-4">${t('sessionDashboard.charts.performanceByDay')}</h3>
								<div class="h-64">
									<div id="dayPerformanceChart"></div>
								</div>
							</div>
						</div>

						<!-- Match Analysis Section -->
						<div class="grid grid-cols-2 gap-8 mb-8">
							<!-- Recent Performance Trend -->
							<div class="bg-base-100 rounded-lg p-6">
								<h3 class="text-xl font-semibold text-base-content mb-4">${t('sessionDashboard.charts.recentTrend')}</h3>
								<div class="h-64">
									<div id="recentTrendChart"></div>
								</div>
							</div>

							<!-- Opponent Analysis -->
							<div class="bg-base-100 rounded-lg p-6">
								<h3 class="text-xl font-semibold text-base-content mb-4">${t('sessionDashboard.charts.opponentAnalysis')}</h3>
								<div class="h-64">
									<div id="opponentAnalysisChart"></div>
								</div>
							</div>
						</div>

						<!-- Detailed Match History -->
						<div class="bg-base-100 rounded-lg p-6">
							<div class="flex justify-between items-center mb-6">
								<h3 class="text-xl font-semibold text-base-content">${t('sessionDashboard.matchAnalysis.title')}</h3>
								<div class="flex space-x-2">
									<select id="timeFilter" class="bg-base-100 text-base-content px-3 py-1 rounded text-sm">
										<option value="all">${t('sessionDashboard.filters.allTime')}</option>
										<option value="week">${t('sessionDashboard.filters.lastWeek')}</option>
										<option value="month">${t('sessionDashboard.filters.lastMonth')}</option>
										<option value="3months">${t('sessionDashboard.filters.last3Months')}</option>
									</select>
									<select id="resultFilter" class="bg-base-100 text-base-content px-3 py-1 rounded text-sm">
										<option value="all">${t('sessionDashboard.filters.allResults')}</option>
										<option value="wins">${t('sessionDashboard.filters.winsOnly')}</option>
										<option value="losses">${t('sessionDashboard.filters.lossesOnly')}</option>
									</select>
								</div>
							</div>
							<div id="detailedMatchHistory" class="space-y-4"></div>
						</div>

						<!-- Session Insights -->
						<div class="grid grid-cols-2 gap-6 mt-8">
							<!-- Session Statistics -->
							<div class="bg-base-100 rounded-lg p-6">
								<h4 class="text-lg font-semibold text-base-content mb-4">${t('sessionDashboard.sessionStats.title')}</h4>
								<div id="sessionStats" class="space-y-3"></div>
							</div>

							<!-- Performance Insights -->
							<div class="bg-base-100 rounded-lg p-6">
								<h4 class="text-lg font-semibold text-base-content mb-4">${t('sessionDashboard.insights.title')}</h4>
								<div id="sessionInsights" class="space-y-3"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	mount(): void {
		this.setupGameSessionDashboardLogic();

		document.getElementById('refreshSessionData')?.addEventListener('click', this.refreshSessionDataHandler);
		document.getElementById('backToDashboard')?.addEventListener('click', this.backToDashboardHandler);
		document.getElementById('timeFilter')?.addEventListener('change', this.timeFilterHandler);
		document.getElementById('resultFilter')?.addEventListener('change', this.resultFilterHandler);
	}

	unmount(): void {
		document.getElementById('refreshSessionData')?.removeEventListener('click', this.refreshSessionDataHandler);
		document.getElementById('backToDashboard')?.removeEventListener('click', this.backToDashboardHandler);
		document.getElementById('timeFilter')?.removeEventListener('change', this.timeFilterHandler);
		document.getElementById('resultFilter')?.removeEventListener('change', this.resultFilterHandler);
	}

	private async setupGameSessionDashboardLogic() {
		const loadingState = document.getElementById('loadingState');
		const errorState = document.getElementById('errorState');
		const sessionContent = document.getElementById('sessionContent');
		const errorMessage = document.getElementById('errorMessage');

		if (!loadingState || !errorState || !sessionContent || !errorMessage) {
			console.error('Required DOM elements not found for session dashboard');
			return;
		}

		const token = localStorage.getItem('token');
		if (!token) {
			this.showError(t('sessionDashboard.loginRequired'));
			return;
		}

		const userName = localStorage.getItem('name') || localStorage.getItem('username');
		if (!userName) {
			this.showError(t('sessionDashboard.userNotFound'));
			return;
		}

		try {
			// Show loading state
			loadingState.classList.remove('hidden');
			errorState.classList.add('hidden');
			sessionContent.classList.add('hidden');

			// Load dashboard data
			const data = await dashboardManager.loadDashboardData(userName);
			this.currentData = data;
			
			// Populate session dashboard
			await this.populateSessionDashboard(data);

			// Hide loading, show content
			loadingState.classList.add('hidden');
			sessionContent.classList.remove('hidden');

		} catch (error) {
			console.error('Error setting up game session dashboard:', error);
			this.showError(error instanceof Error ? error.message : 'Failed to load session data');
		}
	}

	private async populateSessionDashboard(data: any) {
		// Populate session overview cards
		this.populateSessionOverview(data.stats, data.matches);

		// Render charts
		this.renderScoreDistributionChart(data.matches);
		this.renderDayPerformanceChart(data.matches);
		this.renderRecentTrendChart(data.matches);
		this.renderOpponentAnalysisChart(data.matches);

		// Populate detailed match history
		this.populateDetailedMatchHistory(data.matches);

		// Populate session statistics and insights
		this.populateSessionStatistics(data.stats, data.matches);
		this.populateSessionInsights(data.stats, data.matches);
	}

	private populateSessionOverview(stats: UserStats, matches: MatchData[]) {
		const container = document.getElementById('sessionOverview');
		if (!container) return;

		// Calculate session-specific metrics
		const recentMatches = matches.slice(0, 10);
		const recentWinRate = recentMatches.length > 0 ? 
			(recentMatches.filter(m => m.result === 'W').length / recentMatches.length) * 100 : 0;
  
		const averageScoreRecent = recentMatches.length > 0 ?
			recentMatches.reduce((sum, m) => sum + m.myScore, 0) / recentMatches.length : 0;

		const bestRecentScore = recentMatches.length > 0 ?
			Math.max(...recentMatches.map(m => m.myScore)) : 0;

		const sessionDuration = matches.length > 0 ? 
			Math.round((new Date().getTime() - new Date(matches[matches.length - 1].date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

		container.innerHTML = `
			<!-- Recent Win Rate -->
			<div class="bg-success p-4 rounded-lg shadow-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-base-content text-sm font-medium">${t('sessionDashboard.overview.recentWinRate')}</p>
						<p class="text-2xl font-bold text-base-content">${recentWinRate.toFixed(1)}%</p>
						<p class="text-base-content text-xs">${t('sessionDashboard.overview.lastGames', { n: '10' })}</p>
					</div>
					<div class="text-base-content">
						<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
						</svg>
					</div>
				</div>
			</div>

			<!-- Recent Average Score -->
			<div class="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-lg shadow-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-primary-100 text-sm font-medium">${t('sessionDashboard.overview.recentAvgScore')}</p>
						<p class="text-2xl font-bold text-base-content">${averageScoreRecent.toFixed(1)}</p>
						<p class="text-primary-200 text-xs">${t('sessionDashboard.overview.lastGames', { n: '10' })}</p>
					</div>
					<div class="text-primary-200">
						<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
							<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
					</div>
				</div>
			</div>

			<!-- Best Recent Score -->
			<div class="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-lg shadow-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-secondary-100 text-sm font-medium">${t('sessionDashboard.overview.bestRecent')}</p>
						<p class="text-2xl font-bold text-base-content">${bestRecentScore}</p>
						<p class="text-secondary-200 text-xs">${t('sessionDashboard.overview.lastGames', { n: '10' })}</p>
					</div>
					<div class="text-secondary-200">
						<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
							<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
						</svg>
					</div>
				</div>
			</div>

			<!-- Session Duration -->
			<div class="bg-gradient-to-br from-orange-600 to-orange-700 p-4 rounded-lg shadow-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-primary-600 text-sm font-medium">${t('sessionDashboard.overview.sessionDuration')}</p>
						<p class="text-2xl font-bold text-base-content">${sessionDuration}</p>
						<p class="text-primary-700 text-xs">${t('sessionDashboard.overview.daysActive')}</p>
					</div>
					<div class="text-primary-700">
						<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
						</svg>
					</div>
				</div>
			</div>
		`;
	}

	private renderScoreDistributionChart(matches: MatchData[]) {
		const container = document.getElementById('scoreDistributionChart');
		if (!container) return;

		// Clear existing chart
		const existingChart = Chart.getChart('scoreDistributionChart');
		if (existingChart) existingChart.destroy();

		const canvas = document.createElement('canvas');
		canvas.id = 'scoreDistributionChart';
		container.innerHTML = '';
		container.appendChild(canvas);

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Calculate score distribution
		const scoreCounts = new Map<number, number>();
		matches.forEach(match => {
			const score = match.myScore;
			scoreCounts.set(score, (scoreCounts.get(score) || 0) + 1);
		});

		const scores = Array.from(scoreCounts.keys()).sort((a, b) => a - b);
		const counts = scores.map(score => scoreCounts.get(score) || 0);

		new Chart(ctx, {
			type: 'bar',
			data: {
				labels: scores.map(s => s.toString()),
				datasets: [{
					label: t('sessionDashboard.charts.frequency'),
					data: counts,
					backgroundColor: 'rgba(59, 130, 246, 0.8)',
					borderColor: 'rgba(59, 130, 246, 1)',
					borderWidth: 1
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						title: {
							display: true,
							text: t('sessionDashboard.charts.score'),
							color: this.getTextColor()
						},
						grid: { color: 'rgba(229, 231, 235, 0.1)' },
						ticks: { color: this.getTextColor() }
					},
					y: {
						title: {
							display: true,
							text: t('sessionDashboard.charts.frequency'),
							color: this.getTextColor()
						},
						grid: { color: 'rgba(229, 231, 235, 0.1)' },
						ticks: { color: this.getTextColor() }
					}
				},
				plugins: {
					legend: {
						labels: { color: this.getTextColor() }
					}
				}
			}
		});
	}

	private renderDayPerformanceChart(matches: MatchData[]) {
		const container = document.getElementById('dayPerformanceChart');
		if (!container) return;

		const existingChart = Chart.getChart('dayPerformanceChart');
		if (existingChart) existingChart.destroy();

		const canvas = document.createElement('canvas');
		canvas.id = 'dayPerformanceChart';
		container.innerHTML = '';
		container.appendChild(canvas);

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Calculate performance by day of week
		const dayStats = new Map<string, { wins: number, total: number }>();
		const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const days = [
			t('sessionDashboard.days.sunday'),
			t('sessionDashboard.days.monday'),
			t('sessionDashboard.days.tuesday'),
			t('sessionDashboard.days.wednesday'),
			t('sessionDashboard.days.thursday'),
			t('sessionDashboard.days.friday'),
			t('sessionDashboard.days.saturday')
		];

		daysEn.forEach((day, index) => {
			dayStats.set(day, { wins: 0, total: 0 });
		});

		matches.forEach(match => {
			const day = format(parseISO(match.date), 'EEEE');
			const stats = dayStats.get(day);
			if (stats) {
				stats.total++;
				if (match.result === 'W') stats.wins++;
			}
		});

		const winRates = daysEn.map(day => {
			const stats = dayStats.get(day);
			return stats && stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
		});

		new Chart(ctx, {
			type: 'bar',
			data: {
				labels: days,
				datasets: [{
					label: t('sessionDashboard.charts.winRate'),
					data: winRates,
					backgroundColor: 'rgba(16, 185, 129, 0.8)',
					borderColor: 'rgba(16, 185, 129, 1)',
					borderWidth: 1
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						grid: { color: 'rgba(229, 231, 235, 0.1)' },
						ticks: { color: this.getTextColor() }
					},
					y: {
						title: {
							display: true,
							text: t('sessionDashboard.charts.winRate'),
							color: this.getTextColor()
						},
						grid: { color: 'rgba(229, 231, 235, 0.1)' },
						ticks: { color: this.getTextColor() }
					}
				},
				plugins: {
					legend: {
						labels: { color: this.getTextColor() }
					}
				}
			}
		});
	}

	private renderRecentTrendChart(matches: MatchData[]) {
		const container = document.getElementById('recentTrendChart');
		if (!container) return;

		const existingChart = Chart.getChart('recentTrendChart');
		if (existingChart) existingChart.destroy();

		const canvas = document.createElement('canvas');
		canvas.id = 'recentTrendChart';
		container.innerHTML = '';
		container.appendChild(canvas);

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Get last 20 matches for trend analysis
		const recentMatches = matches.slice(0, 20).reverse();
		const labels = recentMatches.map((_, index) => `Game ${index + 1}`);
		const scores = recentMatches.map(match => match.myScore);
		const results = recentMatches.map(match => match.result === 'W' ? 1 : 0);

		new Chart(ctx, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: t('sessionDashboard.charts.score'),
						data: scores,
						borderColor: 'rgba(59, 130, 246, 1)',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						tension: 0.4,
						yAxisID: 'y'
					},
					{
						label: t('sessionDashboard.charts.result'),
						data: results,
						borderColor: 'rgba(16, 185, 129, 1)',
						backgroundColor: 'rgba(16, 185, 129, 0.1)',
						tension: 0.4,
						yAxisID: 'y1'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						grid: { color: 'rgba(229, 231, 235, 0.1)' },
						ticks: { color: this.getTextColor() }
					},
					y: {
						type: 'linear',
						display: true,
						position: 'left',
						title: {
							display: true,
							text: t('sessionDashboard.charts.score'),
							color: this.getTextColor()
						},
						grid: { color: 'rgba(229, 231, 235, 0.1)' },
						ticks: { color: this.getTextColor() }
					},
					y1: {
						type: 'linear',
						display: true,
						position: 'right',
						title: {
							display: true,
							text: t('sessionDashboard.charts.result'),
							color: this.getTextColor()
						},
						grid: { drawOnChartArea: false },
						ticks: { color: this.getTextColor() }
					}
				},
				plugins: {
					legend: {
						labels: { color: this.getTextColor() }
					}
				}
			}
		});
	}

	private renderOpponentAnalysisChart(matches: MatchData[]) {
		const container = document.getElementById('opponentAnalysisChart');
		if (!container) return;

		const existingChart = Chart.getChart('opponentAnalysisChart');
		if (existingChart) existingChart.destroy();

		const canvas = document.createElement('canvas');
		canvas.id = 'opponentAnalysisChart';
		container.innerHTML = '';
		container.appendChild(canvas);

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Calculate performance against different opponents
		const opponentStats = new Map<string, { wins: number, total: number, avgScore: number }>();
  
		matches.forEach(match => {
			const opponent = match.opponent;
			if (!opponentStats.has(opponent)) {
				opponentStats.set(opponent, { wins: 0, total: 0, avgScore: 0 });
			}
			const stats = opponentStats.get(opponent)!;
			stats.total++;
			if (match.result === 'W') stats.wins++;
			stats.avgScore = (stats.avgScore * (stats.total - 1) + match.myScore) / stats.total;
		});

		// Get top 10 opponents by total matches
		const topOpponents = Array.from(opponentStats.entries())
			.sort((a, b) => b[1].total - a[1].total)
			.slice(0, 10);

		const labels = topOpponents.map(([opponent]) => opponent);
		const winRates = topOpponents.map(([, stats]) => 
			stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
		);
		const avgScores = topOpponents.map(([, stats]) => stats.avgScore);

		new Chart(ctx, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						label: t('sessionDashboard.charts.winRate'),
						data: winRates,
						backgroundColor: 'rgba(16, 185, 129, 0.8)',
						borderColor: 'rgba(16, 185, 129, 1)',
						borderWidth: 1,
						yAxisID: 'y'
					},
					{
						label: t('sessionDashboard.charts.avgScore'),
						data: avgScores,
						backgroundColor: 'rgba(59, 130, 246, 0.8)',
						borderColor: 'rgba(59, 130, 246, 1)',
						borderWidth: 1,
						yAxisID: 'y1'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						grid: { color: 'rgba(229, 231, 235, 0.1)' },
						ticks: { 
							color: this.getTextColor(),
							maxRotation: 45
						}
					},
					y: {
						type: 'linear',
						display: true,
						position: 'left',
						title: {
							display: true,
							text: t('sessionDashboard.charts.winRate'),
							color: this.getTextColor()
						},
						grid: { color: 'rgba(229, 231, 235, 0.1)' },
						ticks: { color: this.getTextColor() }
					},
					y1: {
						type: 'linear',
						display: true,
						position: 'right',
						title: {
							display: true,
							text: t('sessionDashboard.charts.avgScore'),
							color: this.getTextColor()
						},
						grid: { drawOnChartArea: false },
						ticks: { color: this.getTextColor() }
					}
				},
				plugins: {
					legend: {
						labels: { color: this.getTextColor() }
					}
				}
			}
		});
	}

	private populateDetailedMatchHistory(matches: MatchData[]) {
		const container = document.getElementById('detailedMatchHistory');
		if (!container) return;

		if (matches.length === 0) {
			container.innerHTML = `<p class="text-base-content text-center py-8">${t('sessionDashboard.matchAnalysis.noMatches')}</p>`;
			return;
		}

		const html = matches.map((match, index) => {
			const isVictory = match.result === 'W';
			const resultClass = isVictory ? 'bg-success border-green-300 text-base-content' : 'bg-error border-red-300 text-red-800';
			const resultIcon = isVictory ? '✓' : '✗';
			// Convert UTC time to local time for display
			const utcDate = new Date(match.date);
			const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
			const date = format(localDate, 'MMM dd, yyyy HH:mm', { locale: fr });
			const scoreDiff = match.myScore - match.oppScore;

			return `
				<div class="bg-base-100 rounded-lg p-4 border-l-4 ${isVictory ? 'border-green-500' : 'border-red-500'}">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-4">
							<div class="text-center">
								<div class="text-sm text-base-content">#${matches.length - index}</div>
								<div class="text-2xl">${resultIcon}</div>
							</div>
							<div>
								<div class="font-semibold text-base-content">vs ${match.opponent}</div>
								<div class="text-sm text-base-content">${date}</div>
								<div class="text-xs ${isVictory ? 'text-base-content' : 'text-error-400'}">
									${isVictory ? t('sessionDashboard.matchAnalysis.victory') : t('sessionDashboard.matchAnalysis.defeat')} ${scoreDiff > 0 ? `(+${scoreDiff})` : `(${scoreDiff})`}
								</div>
							</div>
						</div>
						<div class="text-right">
							<div class="text-2xl font-bold text-base-content">${match.myScore} - ${match.oppScore}</div>
							<div class="text-sm text-base-content">${t('sessionDashboard.matchAnalysis.scoreLabel')}</div>
						</div>
					</div>
				</div>
			`;
		}).join('');

		container.innerHTML = html;
	}

	private populateSessionStatistics(stats: UserStats, matches: MatchData[]) {
		const container = document.getElementById('sessionStats');
		if (!container) return;

		const recentMatches = matches.slice(0, 10);
		const recentWinRate = recentMatches.length > 0 ? 
			(recentMatches.filter(m => m.result === 'W').length / recentMatches.length) * 100 : 0;

		container.innerHTML = `
			<div class="space-y-2 text-sm">
				<div class="flex justify-between">
					<span class="text-base-content">${t('sessionDashboard.sessionStats.recentWinRate')}</span>
					<span class="text-base-content font-semibold">${recentWinRate.toFixed(1)}%</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content">${t('sessionDashboard.sessionStats.gamesThisSession')}</span>
					<span class="text-base-content font-semibold">${matches.length}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content">${t('sessionDashboard.sessionStats.bestStreak')}</span>
					<span class="text-base-content font-semibold">${stats.bestStreak}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content">${t('sessionDashboard.sessionStats.currentStreak')}</span>
					<span class="${stats.currentStreak >= 0 ? 'text-base-content' : 'text-error-400'} font-semibold">
						${stats.currentStreak > 0 ? '+' : ''}${stats.currentStreak}
					</span>
				</div>
			</div>
		`;
	}

	private populateSessionInsights(stats: UserStats, matches: MatchData[]) {
		const container = document.getElementById('sessionInsights');
		if (!container) return;

		const insights = [];
		const recentMatches = matches.slice(0, 5);
		
		if (recentMatches.length > 0) {
			const recentWinRate = (recentMatches.filter(m => m.result === 'W').length / recentMatches.length) * 100;
			
			if (recentWinRate > stats.winrate + 10) {
				insights.push(`🔥 ${t('sessionDashboard.insights.onFire')}`);
			} else if (recentWinRate < stats.winrate - 10) {
				insights.push(`📈 ${t('sessionDashboard.insights.belowAverage')}`);
			}

			const avgRecentScore = recentMatches.reduce((sum, m) => sum + m.myScore, 0) / recentMatches.length;
			if (avgRecentScore > stats.averageScore + 1) {
				insights.push(`🎯 ${t('sessionDashboard.insights.scoringImproved')}`);
			}
		}

		if (stats.currentStreak > 5) {
			insights.push(`🏆 ${t('sessionDashboard.insights.amazingStreak')}`);
		} else if (stats.currentStreak < -5) {
			insights.push(`💪 ${t('sessionDashboard.insights.dontGiveUp')}`);
		}

		if (insights.length === 0) {
			insights.push(`🎮 ${t('sessionDashboard.insights.keepPlaying')}`);
		}

		container.innerHTML = insights.map(insight => `
			<div class="p-3 bg-base-100 rounded-lg text-sm">
				${insight}
			</div>
		`).join('');
	}

	private handleRefreshSessionDataClick() {
		this.setupGameSessionDashboardLogic();
	}

	private handleBackToDashboardClick() {
		if (this.router) {
			this.router.navigateTo('/dashboard');
		} else {
			console.error('Router not available for navigation');
		}
	}

	private handleTimeFilterChange() {
		this.applyFilters();
	}

	private handleResultFilterChange() {
		this.applyFilters();
	}

	private applyFilters() {
		if (!this.currentData) return;

		const timeFilter = document.getElementById('timeFilter') as HTMLSelectElement;
		const resultFilter = document.getElementById('resultFilter') as HTMLSelectElement;

		if (!timeFilter || !resultFilter) return;

		let filteredMatches = [...this.currentData.matches];
		
		// Apply time filter
		const now = new Date();
		switch (timeFilter.value) {
			case 'week':
				filteredMatches = filteredMatches.filter(m => 
					new Date(m.date) >= subDays(now, 7)
				);
				break;
			case 'month':
				filteredMatches = filteredMatches.filter(m => 
					new Date(m.date) >= subDays(now, 30)
				);
				break;
			case '3months':
				filteredMatches = filteredMatches.filter(m => 
					new Date(m.date) >= subDays(now, 90)
				);
				break;
		}

		// Apply result filter
		switch (resultFilter.value) {
			case 'wins':
				filteredMatches = filteredMatches.filter(m => m.result === 'W');
				break;
			case 'losses':
				filteredMatches = filteredMatches.filter(m => m.result === 'L');
				break;
		}

		this.populateDetailedMatchHistory(filteredMatches);
	}

	private showError(message: string) {
		const loadingState = document.getElementById('loadingState');
		const errorState = document.getElementById('errorState');
		const sessionContent = document.getElementById('sessionContent');
		const errorMessage = document.getElementById('errorMessage');

		if (loadingState) loadingState.classList.add('hidden');
		if (errorState) {
			errorState.classList.remove('hidden');
			if (errorMessage) errorMessage.textContent = message;
		}
		if (sessionContent) sessionContent.classList.add('hidden');
	}
}
