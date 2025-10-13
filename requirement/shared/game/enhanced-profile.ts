// pages/enhanced-profile.ts - Enhanced profile page with dashboard functionality
import { dashboardManager, type DashboardData } from "../src/dashboard";
import { navigate, apiBase } from "../src/utils";

export function renderEnhancedProfile() {
  return `
    <div class="min-h-screen bg-gray-900">
      <!-- Header -->
      <div class="bg-gray-800 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <h1 class="text-3xl font-bold text-base-content">Player Dashboard</h1>
            <div class="flex space-x-4">
              <button id="refreshDashboard" class="btn-primary hover:bg-blue-700 text-base-content px-4 py-2 rounded-lg transition-colors">
                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
              </button>
              <button id="sessionAnalysisBtn" class="bg-purple-600 hover:bg-purple-700 text-base-content px-4 py-2 rounded-lg transition-colors">
                📈 Session Analysis
              </button>
              <button id="backToProfile" class="btn-ghost hover:bg-gray-700 text-base-content px-4 py-2 rounded-lg transition-colors">
                Back to Profile
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
          <p class="mt-4 text-gray-400">Loading dashboard data...</p>
        </div>

        <!-- Error State -->
        <div id="errorState" class="hidden bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium">Error loading dashboard</h3>
              <div class="mt-2 text-sm">
                <p id="errorMessage">An error occurred while loading your dashboard data.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Dashboard Content -->
        <div id="dashboardContent" class="hidden">
          <!-- User Info Header -->
          <div class="bg-gray-800 rounded-lg p-6 mb-8">
            <div class="flex items-center">
              <div>
                <h2 id="userName" class="text-2xl font-bold text-base-content">Profil : <span id="userDisplayName"></span></h2>
                <p id="userUsername" class="text-gray-400"></p>
              </div>
            </div>
          </div>

          <!-- Statistics Cards -->
          <div id="statsCards" class="mb-8"></div>

          <!-- Charts Section -->
          <div class="grid grid-cols-2 gap-8 mb-8">
            <!-- Win/Loss Chart -->
            <div class="bg-gray-800 rounded-lg p-6">
              <h3 class="text-xl font-semibold text-base-content mb-4">Win/Loss Distribution</h3>
              <div class="h-64">
                <div id="winLossChart"></div>
              </div>
            </div>

            <!-- Performance Trend Chart -->
            <div class="bg-gray-800 rounded-lg p-6">
              <h3 class="text-xl font-semibold text-base-content mb-4">Performance Trend</h3>
              <div class="h-64">
                <div id="performanceChart"></div>
              </div>
            </div>
          </div>

          <!-- Match History Section -->
          <div class="bg-gray-800 rounded-lg p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-xl font-semibold text-base-content">Recent Matches</h3>
              <div class="flex space-x-2">
                <button id="showAllMatches" class="btn-primary hover:bg-blue-700 text-base-content px-3 py-1 rounded text-sm transition-colors">
                  Show All
                </button>
                <button id="showRecentMatches" class="btn-ghost hover:bg-gray-700 text-base-content px-3 py-1 rounded text-sm transition-colors">
                  Recent Only
                </button>
              </div>
            </div>
            <div id="matchHistory" class="space-y-4"></div>
          </div>

          <!-- Additional Statistics -->
          <div class="grid grid-cols-3 gap-6 mt-8">
            <!-- Detailed Stats -->
            <div class="bg-gray-800 rounded-lg p-6">
              <h4 class="text-lg font-semibold text-base-content mb-4">Detailed Statistics</h4>
              <div id="detailedStats" class="space-y-2 text-sm">
                <!-- Will be populated by JavaScript -->
              </div>
            </div>

            <!-- Achievements -->
            <div class="bg-gray-800 rounded-lg p-6">
              <h4 class="text-lg font-semibold text-base-content mb-4">Achievements</h4>
              <div id="achievements" class="space-y-2">
                <!-- Will be populated by JavaScript -->
              </div>
            </div>

            <!-- Performance Insights -->
            <div class="bg-gray-800 rounded-lg p-6">
              <h4 class="text-lg font-semibold text-base-content mb-4">Performance Insights</h4>
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

export async function setupEnhancedProfilePage() {
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const dashboardContent = document.getElementById('dashboardContent');
  const errorMessage = document.getElementById('errorMessage');

  if (!loadingState || !errorState || !dashboardContent || !errorMessage) return;

  const token = localStorage.getItem('token');
  if (!token) {
    showError('Please log in to view your dashboard');
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
    showError('User information not found');
    return;
  }

  try {
    // Show loading state
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    dashboardContent.classList.add('hidden');


    // Load dashboard data - the dashboard manager will get the correct user name from /me endpoint
    const data = await dashboardManager.loadDashboardData(userName);
    
    
    // Populate dashboard
    await populateDashboard(data);

    // Hide loading, show content first
    loadingState.classList.add('hidden');
    dashboardContent.classList.remove('hidden');

    // Setup event listeners after content is visible
    setTimeout(() => {
      setupEventListeners(data);
    }, 50);

  } catch (error) {
    console.error('Error setting up enhanced profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
    console.error('Full error details:', error);
    showError(errorMessage);
  }
}

async function populateDashboard(data: DashboardData) {
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
  populateDetailedStats(data.stats);

  // Populate achievements
  populateAchievements(data.stats);

  // Populate insights
  populateInsights(data.stats, data.matches);
}

function populateDetailedStats(stats: any) {
  const container = document.getElementById('detailedStats');
  if (!container) return;

  container.innerHTML = `
    <div class="flex justify-between">
      <span class="text-gray-400">Total Points Scored:</span>
      <span class="text-base-content font-semibold">${stats.pointsGagnes}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Total Points Conceded:</span>
      <span class="text-base-content font-semibold">${stats.pointsPris}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Best Streak:</span>
      <span class="text-green-400 font-semibold">${stats.bestStreak}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Worst Streak:</span>
      <span class="text-red-400 font-semibold">${stats.worstStreak}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Best Score:</span>
      <span class="text-yellow-400 font-semibold">${stats.bestScore}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Worst Score:</span>
      <span class="text-orange-400 font-semibold">${stats.worstScore}</span>
    </div>
  `;
}

function populateAchievements(stats: any) {
  const container = document.getElementById('achievements');
  if (!container) return;

  const achievements = [];
  
  if (stats.winrate >= 80) achievements.push({ name: 'Dominator', desc: '80%+ win rate', icon: '👑' });
  if (stats.total >= 100) achievements.push({ name: 'Centurion', desc: '100+ games played', icon: '💯' });
  if (stats.bestStreak >= 10) achievements.push({ name: 'Hot Streak', desc: '10+ win streak', icon: '🔥' });
  if (stats.averageScore >= 4) achievements.push({ name: 'Sharp Shooter', desc: '4+ avg score', icon: '🎯' });
  if (stats.total >= 50 && stats.winrate >= 60) achievements.push({ name: 'Consistent', desc: '60%+ win rate over 50+ games', icon: '⭐' });

  if (achievements.length === 0) {
    container.innerHTML = '<p class="text-gray-400 text-sm">No achievements yet. Keep playing!</p>';
    return;
  }

  container.innerHTML = achievements.map(achievement => `
    <div class="flex items-center space-x-3 p-2 bg-gray-700 rounded">
      <span class="text-2xl">${achievement.icon}</span>
      <div>
        <div class="font-semibold text-base-content">${achievement.name}</div>
        <div class="text-xs text-gray-400">${achievement.desc}</div>
      </div>
    </div>
  `).join('');
}

function populateInsights(stats: any, matches: any[]) {
  const container = document.getElementById('insights');
  if (!container) return;

  const insights = [];

  if (stats.currentStreak > 0) {
    insights.push(`🔥 You're on a ${stats.currentStreak}-game winning streak!`);
  } else if (stats.currentStreak < 0) {
    insights.push(`💪 You're on a ${Math.abs(stats.currentStreak)}-game losing streak. Keep going!`);
  }

  if (stats.winrate > 70) {
    insights.push('🏆 Excellent performance! You\'re dominating the competition.');
  } else if (stats.winrate < 30) {
    insights.push('📈 Room for improvement. Consider practicing your technique.');
  }

  if (stats.averageScore > 4) {
    insights.push('🎯 Great accuracy! Your scoring is very consistent.');
  }

  if (matches.length > 0) {
    const recentMatches = matches.slice(0, 5);
    const recentWinRate = recentMatches.filter(m => m.result === 'W').length / recentMatches.length * 100;
    
    if (recentWinRate > stats.winrate + 10) {
      insights.push('📊 You\'re improving! Recent performance is better than your average.');
    }
  }

  if (insights.length === 0) {
    insights.push('🎮 Keep playing to unlock insights about your performance!');
  }

  container.innerHTML = insights.map(insight => `
    <div class="p-3 bg-gray-700 rounded-lg text-sm">
      ${insight}
    </div>
  `).join('');
}

function setupEventListeners(data: DashboardData) {
  
  // Refresh button - Remove existing listeners first
  const refreshBtn = document.getElementById('refreshDashboard');
  if (refreshBtn) {
    const newRefreshBtn = refreshBtn.cloneNode(true) as HTMLButtonElement;
    refreshBtn.parentNode?.replaceChild(newRefreshBtn, refreshBtn);
    
    newRefreshBtn.addEventListener('click', async () => {
      try {
        const userName = localStorage.getItem('name');
        if (userName) {
          const newData = await dashboardManager.loadDashboardData(userName);
          await populateDashboard(newData);
        }
      } catch (error) {
        console.error('Error refreshing dashboard:', error);
      }
    });
  } else {
    console.warn('Refresh button not found');
  }

  // Session analysis button - Remove existing listeners first
  const sessionBtn = document.getElementById('sessionAnalysisBtn');
  if (sessionBtn) {
    const newSessionBtn = sessionBtn.cloneNode(true) as HTMLButtonElement;
    sessionBtn.parentNode?.replaceChild(newSessionBtn, sessionBtn);
    
    newSessionBtn.addEventListener('click', () => {
      navigate('/session-analysis');
    });
  } else {
    console.warn('Session analysis button not found');
  }

  // Back to profile button - Remove existing listeners first
  const backBtn = document.getElementById('backToProfile');
  if (backBtn) {
    const newBackBtn = backBtn.cloneNode(true) as HTMLButtonElement;
    backBtn.parentNode?.replaceChild(newBackBtn, backBtn);
    
    newBackBtn.addEventListener('click', () => {
      navigate('/profile');
    });
  } else {
    console.warn('Back to profile button not found');
  }

  // Match history toggle buttons - Remove existing listeners first
  const showAllBtn = document.getElementById('showAllMatches');
  const showRecentBtn = document.getElementById('showRecentMatches');
  const matchHistory = document.getElementById('matchHistory');

  if (showAllBtn && showRecentBtn && matchHistory) {
    // Clone and replace show all button
    const newShowAllBtn = showAllBtn.cloneNode(true) as HTMLButtonElement;
    showAllBtn.parentNode?.replaceChild(newShowAllBtn, showAllBtn);
    
    newShowAllBtn.addEventListener('click', () => {
      dashboardManager.renderMatchHistory('matchHistory', data.matches);
      newShowAllBtn.classList.add('btn-primary');
      newShowAllBtn.classList.remove('btn-ghost');
      showRecentBtn.classList.add('btn-ghost');
      showRecentBtn.classList.remove('btn-primary');
    });

    // Clone and replace show recent button
    const newShowRecentBtn = showRecentBtn.cloneNode(true) as HTMLButtonElement;
    showRecentBtn.parentNode?.replaceChild(newShowRecentBtn, showRecentBtn);
    
    newShowRecentBtn.addEventListener('click', () => {
      dashboardManager.renderMatchHistory('matchHistory', data.recentMatches);
      newShowRecentBtn.classList.add('btn-primary');
      newShowRecentBtn.classList.remove('btn-ghost');
      newShowAllBtn.classList.add('btn-ghost');
      newShowAllBtn.classList.remove('btn-primary');
    });

    // Set initial state
    newShowRecentBtn.classList.add('btn-primary');
    newShowRecentBtn.classList.remove('btn-ghost');
  } else {
    console.warn('Match history toggle buttons not found');
  }
}

function showError(message: string) {
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
