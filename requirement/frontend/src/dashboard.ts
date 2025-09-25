// dashboard.ts - Enhanced dashboard functionality with data visualization
import { apiBase } from "./utils";
import Chart from 'chart.js/auto';
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface MatchData {
  id: number;
  me: string;
  opponent: string;
  myScore: number;
  oppScore: number;
  date: string;
  result: 'W' | 'L' | 'D';
}

export interface UserStats {
  wins: number;
  losses: number;
  total: number;
  winrate: number;
  pointsGagnes: number;
  pointsPris: number;
  ratioMarque: number;
  ratioPris: number;
  ppmMarque: number;
  ppmPris: number;
  currentStreak: number;
  bestStreak: number;
  worstStreak: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
}

export interface DashboardData {
  user: {
    id: string;
    name: string;
    username: string;
  };
  stats: UserStats;
  matches: MatchData[];
  recentMatches: MatchData[];
  performanceData: {
    dates: string[];
    winRates: number[];
    scores: number[];
  };
}

export class DashboardManager {
  private charts: Map<string, Chart> = new Map();
  private currentData: DashboardData | null = null;

  constructor() {
    this.initializeChartDefaults();
  }

  private initializeChartDefaults() {
    // Configure Chart.js defaults for better styling
    Chart.defaults.font.family = "'Inter', 'Segoe UI', 'Roboto', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#e5e7eb';
    Chart.defaults.plugins.legend.labels.color = '#e5e7eb';
  }

  async loadDashboardData(userName: string): Promise<DashboardData> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token');

    try {
      // Fetch user info
      const userRes = await fetch(`${apiBase()}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      const user = userData.user;

      // Fetch enhanced statistics
      const statsRes = await fetch(`${apiBase()}/users/${encodeURIComponent(userName)}/enhanced-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      
      // Fetch match history
      const historyRes = await fetch(`${apiBase()}/users/${encodeURIComponent(userName)}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const historyData = await historyRes.json();
      const matches = historyData.matches || [];

      // Use enhanced stats from backend
      const stats: UserStats = {
        wins: statsData.basic.wins,
        losses: statsData.basic.losses,
        total: statsData.basic.total,
        winrate: statsData.basic.winrate,
        pointsGagnes: statsData.enhanced.totalPointsScored,
        pointsPris: statsData.enhanced.totalPointsConceded,
        ratioMarque: statsData.enhanced.pointsRatio,
        ratioPris: 100 - statsData.enhanced.pointsRatio,
        ppmMarque: statsData.basic.total > 0 ? statsData.enhanced.totalPointsScored / statsData.basic.total : 0,
        ppmPris: statsData.basic.total > 0 ? statsData.enhanced.totalPointsConceded / statsData.basic.total : 0,
        currentStreak: statsData.enhanced.currentStreak,
        bestStreak: statsData.enhanced.bestStreak,
        worstStreak: statsData.enhanced.worstStreak,
        averageScore: statsData.enhanced.averageScore,
        bestScore: statsData.enhanced.bestScore,
        worstScore: statsData.enhanced.worstScore
      };
      
      // Get recent matches (last 10)
      const recentMatches = [...matches].slice(0, 10);
      
      // Calculate performance data for charts
      const performanceData = this.calculatePerformanceData(matches);

      this.currentData = {
        user,
        stats,
        matches,
        recentMatches,
        performanceData
      };

      return this.currentData;
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      throw error;
    }
  }

  private calculateEnhancedStats(matches: MatchData[]): UserStats {
    if (matches.length === 0) {
      return {
        wins: 0, losses: 0, total: 0, winrate: 0,
        pointsGagnes: 0, pointsPris: 0, ratioMarque: 0, ratioPris: 0,
        ppmMarque: 0, ppmPris: 0, currentStreak: 0, bestStreak: 0, worstStreak: 0,
        averageScore: 0, bestScore: 0, worstScore: 0
      };
    }

    let wins = 0, losses = 0;
    let pointsGagnes = 0, pointsPris = 0;
    let totalScore = 0;
    let bestScore = 0, worstScore = Infinity;
    let currentStreak = 0, bestStreak = 0, worstStreak = 0;
    let tempStreak = 0;

    // Process matches in chronological order
    const sortedMatches = [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedMatches.forEach((match) => {
      const isVictory = match.result === "W";
      const myScore = match.myScore;
      
      if (isVictory) {
        wins++;
        pointsGagnes += 5;
        pointsPris += match.oppScore;
        tempStreak = tempStreak >= 0 ? tempStreak + 1 : 1;
      } else {
        losses++;
        pointsGagnes += myScore;
        pointsPris += 5;
        tempStreak = tempStreak <= 0 ? tempStreak - 1 : -1;
      }

      totalScore += myScore;
      bestScore = Math.max(bestScore, myScore);
      worstScore = Math.min(worstScore, myScore);

      // Update streaks
      if (tempStreak > 0) {
        bestStreak = Math.max(bestStreak, tempStreak);
      } else if (tempStreak < 0) {
        worstStreak = Math.min(worstStreak, tempStreak);
      }
    });

    currentStreak = tempStreak;
    const total = wins + losses;
    const winrate = total > 0 ? (wins / total) * 100 : 0;
    const ratioMarque = (pointsGagnes + pointsPris) > 0 ? (pointsGagnes / (pointsGagnes + pointsPris)) * 100 : 0;
    const ratioPris = (pointsGagnes + pointsPris) > 0 ? (pointsPris / (pointsGagnes + pointsPris)) * 100 : 0;
    const ppmMarque = total > 0 ? pointsGagnes / total : 0;
    const ppmPris = total > 0 ? pointsPris / total : 0;
    const averageScore = total > 0 ? totalScore / total : 0;

    return {
      wins, losses, total, winrate,
      pointsGagnes, pointsPris, ratioMarque, ratioPris,
      ppmMarque, ppmPris, currentStreak, bestStreak, worstStreak,
      averageScore, bestScore, worstScore: worstScore === Infinity ? 0 : worstScore
    };
  }

  private calculatePerformanceData(matches: MatchData[]): { dates: string[], winRates: number[], scores: number[] } {
    if (matches.length === 0) return { dates: [], winRates: [], scores: [] };

    // Group matches by date and calculate daily performance
    const dailyData = new Map<string, { wins: number, total: number, totalScore: number }>();
    
    matches.forEach(match => {
      const date = format(parseISO(match.date), 'yyyy-MM-dd');
      if (!dailyData.has(date)) {
        dailyData.set(date, { wins: 0, total: 0, totalScore: 0 });
      }
      const dayData = dailyData.get(date)!;
      dayData.total++;
      dayData.totalScore += match.myScore;
      if (match.result === 'W') dayData.wins++;
    });

    // Convert to arrays for charting
    const dates = Array.from(dailyData.keys()).sort();
    const winRates = dates.map(date => {
      const data = dailyData.get(date)!;
      return data.total > 0 ? (data.wins / data.total) * 100 : 0;
    });
    const scores = dates.map(date => {
      const data = dailyData.get(date)!;
      return data.total > 0 ? data.totalScore / data.total : 0;
    });

    return { dates, winRates, scores };
  }

  renderStatsCards(containerId: string, stats: UserStats): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-6">
        <!-- Win Rate Card -->
        <div class="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-lg shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-100 text-sm font-medium">Win Rate</p>
              <p class="text-2xl font-bold text-white">${stats.winrate.toFixed(1)}%</p>
            </div>
            <div class="text-green-200">
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Total Games Card -->
        <div class="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-lg shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-blue-100 text-sm font-medium">Total Games</p>
              <p class="text-2xl font-bold text-white">${stats.total}</p>
            </div>
            <div class="text-blue-200">
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Current Streak Card -->
        <div class="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-lg shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-purple-100 text-sm font-medium">Current Streak</p>
              <p class="text-2xl font-bold text-white">${stats.currentStreak > 0 ? '+' : ''}${stats.currentStreak}</p>
            </div>
            <div class="text-purple-200">
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Average Score Card -->
        <div class="bg-gradient-to-br from-orange-600 to-orange-700 p-4 rounded-lg shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-orange-100 text-sm font-medium">Avg Score</p>
              <p class="text-2xl font-bold text-white">${stats.averageScore.toFixed(1)}</p>
            </div>
            <div class="text-orange-200">
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderWinLossChart(containerId: string, stats: UserStats): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing chart
    if (this.charts.has('winLoss')) {
      this.charts.get('winLoss')?.destroy();
    }

    // Clear container and create canvas
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'winLossChart';
    canvas.width = 400;
    canvas.height = 400;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2D context for win/loss chart');
      return;
    }

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Wins', 'Losses'],
        datasets: [{
          data: [stats.wins, stats.losses],
          backgroundColor: ['#10b981', '#ef4444'],
          borderColor: ['#059669', '#dc2626'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#e5e7eb',
              font: { size: 14 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      }
    });

    this.charts.set('winLoss', chart);
  }

  renderPerformanceTrend(containerId: string, performanceData: { dates: string[], winRates: number[], scores: number[] }): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing chart
    if (this.charts.has('performance')) {
      this.charts.get('performance')?.destroy();
    }

    // Clear container and create canvas
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'performanceChart';
    canvas.width = 400;
    canvas.height = 400;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2D context for performance chart');
      return;
    }

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: performanceData.dates.map(date => format(parseISO(date), 'MMM dd', { locale: fr })),
        datasets: [
          {
            label: 'Win Rate (%)',
            data: performanceData.winRates,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Average Score',
            data: performanceData.scores,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            grid: { color: 'rgba(229, 231, 235, 0.1)' },
            ticks: { color: '#e5e7eb' }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: 'rgba(229, 231, 235, 0.1)' },
            ticks: { color: '#e5e7eb' },
            title: {
              display: true,
              text: 'Win Rate (%)',
              color: '#e5e7eb'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#e5e7eb' },
            title: {
              display: true,
              text: 'Average Score',
              color: '#e5e7eb'
            }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#e5e7eb' }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: function(context) {
                return format(parseISO(performanceData.dates[context[0].dataIndex]), 'PPP', { locale: fr });
              }
            }
          }
        }
      }
    });

    this.charts.set('performance', chart);
  }

  renderMatchHistory(containerId: string, matches: MatchData[]): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (matches.length === 0) {
      container.innerHTML = '<p class="text-gray-400 text-center py-8">No matches found</p>';
      return;
    }

    const html = matches.map(match => {
      const isVictory = match.result === 'W';
      const resultClass = isVictory ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-100 border-red-300 text-red-800';
      const resultIcon = isVictory ? '✓' : '✗';
      const date = format(parseISO(match.date), 'MMM dd, yyyy HH:mm', { locale: fr });

      return `
        <div class="bg-gray-700 rounded-lg p-4 border-l-4 ${isVictory ? 'border-green-500' : 'border-red-500'}">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="text-2xl">${resultIcon}</span>
              <div>
                <div class="font-semibold">${match.opponent}</div>
                <div class="text-sm text-gray-400">${date}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold">${match.myScore} - ${match.oppScore}</div>
              <div class="text-sm ${isVictory ? 'text-green-400' : 'text-red-400'}">
                ${isVictory ? 'Victory' : 'Defeat'}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  destroy(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }
}

// Export singleton instance
export const dashboardManager = new DashboardManager();
