// Global Variables
let userData = {};
let currentUser = 'user1';
let achievements = {};
let isOnlineMode = false; // Start in offline mode for GitHub hosting
let autoSaveInterval;
let refreshInterval;

// GitHub-based data sharing using GitHub Gist API
const GITHUB_CONFIG = {
    enabled: false, // Users can enable this with their own token
    token: '', // Users need to provide their own GitHub token
    gistId: '', // Will be created automatically
    filename: 'workout-data.json'
};

// Initialize default data
function initializeDefaultData() {
    // Only add the current authenticated user to userData
    if (currentAuthUser) {
        const userId = currentAuthUser.id;
        if (!userData[userId]) {
            userData[userId] = {
                name: currentAuthUser.username,
                totalPoints: 0,
                todayPoints: 0,
                completedExercises: {},
                workoutHistory: []
            };
        }
    } else {
        // Fallback for non-authenticated users (shouldn't happen)
        userData = {
            user1: { name: 'User 1', totalPoints: 0, todayPoints: 0, completedExercises: {}, workoutHistory: [] },
            user2: { name: 'User 2', totalPoints: 0, todayPoints: 0, completedExercises: {}, workoutHistory: [] },
            user3: { name: 'User 3', totalPoints: 0, todayPoints: 0, completedExercises: {}, workoutHistory: [] },
            user4: { name: 'User 4', totalPoints: 0, todayPoints: 0, completedExercises: {}, workoutHistory: [] }
        };
    }
    
    achievements = {
        'First Steps': { description: 'Complete your first exercise', earned: false, points: 0 },
        'Consistent': { description: 'Complete exercises 3 days in a row', earned: false, points: 100 },
        'Point Master': { description: 'Earn 1000 points in a day', earned: false, points: 500 },
        'Elite Athlete': { description: 'Complete an elite challenge', earned: false, points: 1000 },
        'Team Player': { description: 'All users complete at least one exercise', earned: false, points: 2000 }
    };
}

// GitHub Gist API functions for optional data sharing
async function saveToGitHub(data) {
    if (!GITHUB_CONFIG.enabled || !GITHUB_CONFIG.token) {
        return false;
    }
    
    try {
        const gistData = {
            description: 'Level-Up Workout Tracker Data',
            public: false,
            files: {
                [GITHUB_CONFIG.filename]: {
                    content: JSON.stringify(data, null, 2)
                }
            }
        };
        
        const url = GITHUB_CONFIG.gistId 
            ? `https://api.github.com/gists/${GITHUB_CONFIG.gistId}`
            : 'https://api.github.com/gists';
            
        const method = GITHUB_CONFIG.gistId ? 'PATCH' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gistData)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (!GITHUB_CONFIG.gistId) {
                GITHUB_CONFIG.gistId = result.id;
                localStorage.setItem('workout-gist-id', result.id);
            }
            showNotification('Data saved to GitHub!', 'success');
            return true;
        }
    } catch (error) {
        console.error('GitHub save failed:', error);
        showNotification('GitHub save failed', 'error');
    }
    return false;
}

async function loadFromGitHub() {
    if (!GITHUB_CONFIG.enabled || !GITHUB_CONFIG.gistId) {
        return false;
    }
    
    try {
        const response = await fetch(`https://api.github.com/gists/${GITHUB_CONFIG.gistId}`, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`
            }
        });
        
        if (response.ok) {
            const gist = await response.json();
            const content = gist.files[GITHUB_CONFIG.filename]?.content;
            
            if (content) {
                const data = JSON.parse(content);
                userData = data.users || data.userData || userData;
                achievements = data.achievements || achievements;
                showNotification('Data loaded from GitHub!', 'success');
                return true;
            }
        }
    } catch (error) {
        console.error('GitHub load failed:', error);
        showNotification('GitHub load failed', 'error');
    }
    return false;
}

// Enhanced localStorage with compression and room sharing
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function joinRoom(roomCode) {
    if (!roomCode) return false;
    
    localStorage.setItem('workout-room-code', roomCode);
    showNotification(`Joined room: ${roomCode}`, 'success');
    return true;
}

// Update room display
function updateRoomDisplay() {
    const roomCode = getCurrentRoom();
    const roomElement = document.getElementById('room-code');
    if (roomElement) {
        roomElement.textContent = roomCode;
    }
}

function getCurrentRoom() {
    return localStorage.getItem('workout-room-code') || 'DEFAULT';
}

function saveToLocalStorage(data) {
    const roomCode = getCurrentRoom();
    const storageKey = `workout-data-${roomCode}`;
    
    try {
        // Compress data by removing empty entries
        const compressedData = {
            users: userData,
            achievements: achievements,
            lastUpdate: new Date().toISOString(),
            room: roomCode,
            updateTrigger: Math.random() // Force change detection for real-time updates
        };
        
        localStorage.setItem(storageKey, JSON.stringify(compressedData));
        localStorage.setItem('workout-tracker-backup', JSON.stringify(compressedData));
        return true;
    } catch (error) {
        console.error('localStorage save failed:', error);
        return false;
    }
}

function loadFromLocalStorage() {
    const roomCode = getCurrentRoom();
    const storageKey = `workout-data-${roomCode}`;
    
    try {
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
            const data = JSON.parse(savedData);
            userData = data.users || data.userData || {};
            achievements = data.achievements || {};
            
            // Set initial data hash for leaderboard polling
            lastDataHash = btoa(savedData).substring(0, 20);
            
            showNotification(`Loaded room: ${roomCode}`, 'success');
            return true;
        } else {
            // Initialize default data for new room
            initializeDefaultData();
            return true;
        }
    } catch (error) {
        console.error('localStorage load failed:', error);
        initializeDefaultData();
        return false;
    }
}

// Load data function
async function loadData() {
    showNotification('Loading data...', 'info');
    
    // Try GitHub first if configured
    if (GITHUB_CONFIG.enabled) {
        const loaded = await loadFromGitHub();
        if (loaded) {
            updateDisplay();
            updateLeaderboard();
            updateAchievements();
            updateConnectionStatus();
            return;
        }
    }
    
    // Fall back to localStorage
    loadFromLocalStorage();
    updateDisplay();
    updateLeaderboard();
    updateAchievements();
    updateConnectionStatus();
}

// Save data function
async function saveData() {
    const dataToSave = {
        users: userData,
        achievements: achievements
    };
    
    // Try GitHub first if configured
    if (GITHUB_CONFIG.enabled) {
        const saved = await saveToGitHub(dataToSave);
        if (saved) return;
    }
    
    // Always save to localStorage as backup
    saveToLocalStorage(dataToSave);
}

// Auto-save function
function startAutoSave() {
    // Save every 30 seconds
    autoSaveInterval = setInterval(async () => {
        await saveData();
    }, 30000);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', async function() {
    // Load saved GitHub configuration
    const savedGistId = localStorage.getItem('workout-gist-id');
    if (savedGistId) {
        GITHUB_CONFIG.gistId = savedGistId;
    }
    
    await loadData();
    
    // Initialize authentication first
    initializeAuth();
    
    // Reset daily points at midnight
    checkAndResetDailyPoints();
    
    // Start auto-save
    startAutoSave();
    
    // Add global functions
    window.syncData = syncData;
    window.createBackup = createBackup;
    window.setupGitHubSharing = setupGitHubSharing;
    window.joinWorkoutRoom = joinWorkoutRoom;
    window.createWorkoutRoom = createWorkoutRoom;
});

// Tab functionality
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }
    tablinks = document.getElementsByClassName("tab-btn");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// Complete exercise with rep counting
function completeExercise(exerciseId, targetReps, points) {
    if (!currentAuthUser) {
        showNotification('Please log in to track workouts', 'error');
        return;
    }
    
    const userId = currentAuthUser.id;
    const input = document.getElementById(exerciseId);
    const completedReps = parseInt(input.value) || 0;
    const statusElement = document.getElementById(exerciseId + '-status');
    
    if (completedReps <= 0) {
        showNotification('Please enter the number of reps completed!', 'error');
        return;
    }
    
    let earnedPoints = 0;
    let status = '';
    
    if (completedReps >= targetReps) {
        // Full completion
        earnedPoints = points;
        status = '✅ Completed!';
        statusElement.className = 'status completed';
    } else if (completedReps >= targetReps * 0.05) {
        // Partial completion (at least 5%)
        earnedPoints = Math.floor((completedReps / targetReps) * points);
        status = `⚠️ Partial (${Math.round((completedReps / targetReps) * 100)}%)`;
        statusElement.className = 'status partial';
    } else {
        // Less than 5% - lose points as per rules
        earnedPoints = -points;
        status = '❌ Skipped - Points Lost!';
        statusElement.className = 'status incomplete';
    }
    
    statusElement.textContent = status;
    
    // Ensure user data exists
    if (!userData[userId]) {
        userData[userId] = {
            name: currentAuthUser.username,
            totalPoints: 0,
            todayPoints: 0,
            completedExercises: {},
            workoutHistory: []
        };
    }
    
    // Add points to user
    userData[userId].totalPoints += earnedPoints;
    userData[userId].todayPoints += earnedPoints;
    
    // Mark exercise as completed
    const today = getCurrentDate();
    userData[userId].completedExercises[exerciseId] = {
        completed: true,
        reps: completedReps,
        points: earnedPoints,
        date: today
    };
    
    // Add to workout history
    userData[userId].workoutHistory.push({
        exercise: exerciseId,
        reps: completedReps,
        points: earnedPoints,
        date: new Date().toISOString(),
        userName: currentAuthUser.username
    });
    
    input.disabled = true;
    input.nextElementSibling.disabled = true;
    
    saveData();
    updateDisplay();
    updateLeaderboard();
    updateActivityFeed();
    checkAchievements(userId, earnedPoints);
    
    // Trigger leaderboard update for other users
    triggerLeaderboardUpdate();
    
    // Send chat message about exercise completion
    if (earnedPoints > 0) {
        const percentage = Math.round((completedReps / targetReps) * 100);
        sendSystemMessage(`${currentAuthUser.username} completed ${exerciseId} (${completedReps}/${targetReps} - ${percentage}%) +${earnedPoints} pts! 💪`);
    }
    
    // Show points animation
    showPointsAnimation(earnedPoints);
}

// Complete simple exercise (checkbox-based)
function completeSimpleExercise(exerciseId, points) {
    if (!currentAuthUser) {
        showNotification('Please log in to track workouts', 'error');
        return;
    }
    
    const userId = currentAuthUser.id;
    const checkbox = document.getElementById(exerciseId);
    
    if (!checkbox.checked) {
        showNotification('Please check the box to confirm completion!', 'error');
        return;
    }
    
    // Ensure user data exists
    if (!userData[userId]) {
        userData[userId] = {
            name: currentAuthUser.username,
            totalPoints: 0,
            todayPoints: 0,
            completedExercises: {},
            workoutHistory: []
        };
    }
    
    // Add points to user
    userData[userId].totalPoints += points;
    userData[userId].todayPoints += points;
    
    // Mark exercise as completed
    const today = getCurrentDate();
    userData[userId].completedExercises[exerciseId] = {
        completed: true,
        points: points,
        date: today
    };
    
    // Add to workout history
    userData[userId].workoutHistory.push({
        exercise: exerciseId,
        points: points,
        date: new Date().toISOString(),
        userName: currentAuthUser.username
    });
    
    checkbox.disabled = true;
    checkbox.nextElementSibling.disabled = true;
    
    saveData();
    updateDisplay();
    updateLeaderboard();
    updateActivityFeed();
    checkAchievements(userId, points);
    
    // Trigger leaderboard update for other users
    triggerLeaderboardUpdate();
    
    // Send chat message about exercise completion
    sendSystemMessage(`${currentAuthUser.username} completed ${exerciseId} +${points} pts! ✅`);
    
    // Show points animation
    showPointsAnimation(points);
}

// Complete full workout
function completeFullWorkout(workoutType, totalPoints) {
    const confirmation = confirm(`Complete the full ${workoutType} workout for ${totalPoints} points?`);
    if (!confirmation) return;
    
    addPoints(totalPoints);
    
    // Mark full workout as completed
    userData[currentUser].completedExercises[workoutType + '-full'] = {
        completed: true,
        points: totalPoints,
        date: new Date().toISOString().split('T')[0]
    };
    
    // Add to workout history
    userData[currentUser].workoutHistory.push({
        exercise: workoutType + ' Full Workout',
        points: totalPoints,
        date: new Date().toISOString()
    });
    
    saveData();
    updateDisplay();
    updateLeaderboard();
    checkAchievements();
    
    // Show points animation
    showPointsAnimation(totalPoints);
    
    alert(`Congratulations! You completed the full ${workoutType} workout and earned ${totalPoints} points!`);
}

// Apply negative points
function applyNegativePoints(type, points) {
    const confirmMessage = `Apply -${points} points for ${type}?`;
    if (!confirm(confirmMessage)) return;
    
    addPoints(-points);
    
    // Add to workout history
    userData[currentUser].workoutHistory.push({
        exercise: `Penalty: ${type}`,
        points: -points,
        date: new Date().toISOString()
    });
    
    saveData();
    updateDisplay();
    updateLeaderboard();
    
    // Show points animation
    showPointsAnimation(-points);
}

// Add points to current user
function addPoints(points) {
    userData[currentUser].totalPoints += points;
    userData[currentUser].todayPoints += points;
    
    // Ensure points don't go below 0
    if (userData[currentUser].totalPoints < 0) {
        userData[currentUser].totalPoints = 0;
    }
}

// Update display
function updateDisplay() {
    if (!currentAuthUser) return;
    
    const userId = currentAuthUser.id;
    if (!userData[userId]) return;
    
    document.getElementById('total-points').textContent = userData[userId].totalPoints;
    document.getElementById('today-points').textContent = userData[userId].todayPoints;
    
    // Update exercise status based on completed exercises
    updateExerciseStatus();
    
    // Update activity feed
    updateActivityFeed();
    
    // Update room display
    updateRoomDisplay();
}

// Update exercise status indicators
function updateExerciseStatus() {
    const today = new Date().toISOString().split('T')[0];
    const completed = userData[currentUser].completedExercises;
    
    // Reset all exercises for the current day
    Object.keys(completed).forEach(exerciseId => {
        const exercise = completed[exerciseId];
        if (exercise.date === today) {
            const statusElement = document.getElementById(exerciseId + '-status');
            const inputElement = document.getElementById(exerciseId);
            const buttonElement = inputElement ? inputElement.nextElementSibling : document.getElementById(exerciseId).nextElementSibling;
            
            if (statusElement) {
                if (exercise.points > 0) {
                    statusElement.textContent = '✅ Completed!';
                    statusElement.className = 'status completed';
                } else {
                    statusElement.textContent = '❌ Completed with penalty';
                    statusElement.className = 'status incomplete';
                }
            }
            
            if (inputElement) {
                inputElement.disabled = true;
                inputElement.value = exercise.reps || '';
            }
            if (buttonElement) {
                buttonElement.disabled = true;
            }
        }
    });
}

// Show points animation
function showPointsAnimation(points) {
    const pointsDisplay = points > 0 ? document.getElementById('today-points') : document.getElementById('total-points');
    pointsDisplay.classList.add('points-animation');
    
    setTimeout(() => {
        pointsDisplay.classList.remove('points-animation');
    }, 500);
}

// Update leaderboard
function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;
    
    // Sort users by total points
    const sortedUsers = Object.entries(userData).sort((a, b) => b[1].totalPoints - a[1].totalPoints);
    
    leaderboardList.innerHTML = '';
    
    sortedUsers.forEach(([userId, user], index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        if (index === 0) item.classList.add('first');
        else if (index === 1) item.classList.add('second');
        else if (index === 2) item.classList.add('third');
        
        const position = index + 1;
        const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : position + '.';
        
        item.innerHTML = `
            <span class="user-name">${emoji} ${user.name}</span>
            <span class="user-points">${user.totalPoints} pts</span>
        `;
        
        leaderboardList.appendChild(item);
        
        // Add animation for newly updated items
        setTimeout(() => {
            item.classList.add('updated');
            setTimeout(() => {
                item.classList.remove('updated');
            }, 2000);
        }, index * 100); // Stagger the animations
    });
    
    // Update daily progress
    updateDailyProgress();
}

// Update daily progress
function updateDailyProgress() {
    const dailyProgressDiv = document.getElementById('daily-progress');
    if (!dailyProgressDiv) return;
    
    dailyProgressDiv.innerHTML = '<h4>Today\'s Activity</h4>';
    
    Object.entries(userData).forEach(([userId, user]) => {
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
            <strong>${user.name}:</strong> ${user.todayPoints} points today
        `;
        dailyProgressDiv.appendChild(progressItem);
    });
}

// Check and award achievements
function checkAchievements(userId, earnedPoints) {
    if (!userId && currentAuthUser) {
        userId = currentAuthUser.id;
    }
    
    if (!userId || !userData[userId]) return;
    
    const user = userData[userId];
    
    // First Steps - Complete first exercise
    if (!achievements['First Steps'].earned && Object.keys(user.completedExercises).length > 0) {
        awardAchievement('First Steps', userId);
    }
    
    // Point Master - Earn 1000 points in a day
    if (!achievements['Point Master'].earned && user.todayPoints >= 1000) {
        awardAchievement('Point Master', userId);
    }
    
    // Elite Athlete - Complete an elite challenge
    const eliteExercises = ['burpees-elite', 'run-5k', 'pushups-100', 'murph-prep', 'handstand', 'muscle-up'];
    if (!achievements['Elite Athlete'].earned && 
        eliteExercises.some(exercise => user.completedExercises[exercise])) {
        awardAchievement('Elite Athlete', userId);
    }
    
    // Team Player - All users complete at least one exercise
    if (!achievements['Team Player'].earned) {
        const allUsersActive = Object.values(userData).every(user => 
            Object.keys(user.completedExercises).length > 0
        );
        if (allUsersActive) {
            awardAchievement('Team Player', userId);
        }
    }
    
    updateAchievements();
}

// Award achievement
function awardAchievement(achievementName, userId) {
    if (!userId && currentAuthUser) {
        userId = currentAuthUser.id;
    }
    
    if (!userId || !userData[userId]) return;
    
    achievements[achievementName].earned = true;
    const bonusPoints = achievements[achievementName].points;
    
    if (bonusPoints > 0) {
        userData[userId].totalPoints += bonusPoints;
        userData[userId].todayPoints += bonusPoints;
    }
    
    showNotification(`🏆 Achievement Unlocked: ${achievementName}! (+${bonusPoints} bonus points)`, 'success');
    saveData();
    
    // Trigger leaderboard update for other users
    triggerLeaderboardUpdate();
}

// Update achievements display
function updateAchievements() {
    const achievementsDiv = document.getElementById('achievements');
    if (!achievementsDiv) return;
    
    achievementsDiv.innerHTML = '';
    
    Object.entries(achievements).forEach(([name, achievement]) => {
        const badge = document.createElement('div');
        badge.className = `achievement-badge ${achievement.earned ? 'earned' : ''}`;
        badge.innerHTML = `
            <h4>${achievement.earned ? '🏆' : '🔒'} ${name}</h4>
            <p>${achievement.description}</p>
            ${achievement.points > 0 ? `<small>+${achievement.points} pts</small>` : ''}
        `;
        achievementsDiv.appendChild(badge);
    });
}

// Add new user
async function addNewUser() {
    const userName = prompt('Enter the new user\'s name:');
    if (!userName) return;
    
    const userId = 'user' + (Object.keys(userData).length + 1);
    const newUser = {
        name: userName,
        totalPoints: 0,
        todayPoints: 0,
        completedExercises: {},
        workoutHistory: []
    };
    
    userData[userId] = newUser;
    
    // Add to dropdown
    const select = document.getElementById('current-user');
    const option = document.createElement('option');
    option.value = userId;
    option.textContent = userName;
    select.appendChild(option);
    
    await saveData();
    updateLeaderboard();
    showNotification(`User ${userName} added successfully!`, 'success');
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(notification);
    }
    
    // Set message and style based on type
    notification.textContent = message;
    notification.className = `notification-${type}`;
    
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#38a169';
            break;
        case 'warning':
            notification.style.backgroundColor = '#d69e2e';
            break;
        case 'error':
            notification.style.backgroundColor = '#e53e3e';
            break;
        default:
            notification.style.backgroundColor = '#4299e1';
    }
    
    // Show notification
    notification.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
    }, 3000);
}

function updateConnectionStatus() {
    // Add connection status indicator to header
    let statusIndicator = document.getElementById('connection-status');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'connection-status';
        statusIndicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 20px;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
        `;
        document.querySelector('header').appendChild(statusIndicator);
    }
    
    const roomCode = getCurrentRoom();
    if (GITHUB_CONFIG.enabled) {
        statusIndicator.textContent = '🌐 GitHub Sync';
        statusIndicator.style.backgroundColor = '#c6f6d5';
        statusIndicator.style.color = '#2f855a';
    } else {
        statusIndicator.textContent = `📱 Room: ${roomCode}`;
        statusIndicator.style.backgroundColor = '#e2e8f0';
        statusIndicator.style.color = '#4a5568';
    }
}

function updateRoomDisplay() {
    const roomCode = getCurrentRoom();
    let roomDisplay = document.getElementById('room-display');
    if (!roomDisplay) {
        roomDisplay = document.createElement('div');
        roomDisplay.id = 'room-display';
        roomDisplay.style.cssText = `
            text-align: center;
            margin-top: 10px;
            font-size: 0.9em;
            color: #718096;
        `;
        document.querySelector('.score-display').appendChild(roomDisplay);
    }
    
    roomDisplay.innerHTML = `
        <strong>Room Code: ${roomCode}</strong><br>
        <small>Share this code with friends to compete together!</small>
    `;
}

// Sync data manually
async function syncData() {
    showNotification('Syncing data...', 'info');
    try {
        if (GITHUB_CONFIG.enabled) {
            await loadFromGitHub();
            updateDisplay();
            updateLeaderboard();
            updateAchievements();
            showNotification('Data synced with GitHub!', 'success');
        } else {
            // Reload from localStorage
            loadFromLocalStorage();
            updateDisplay();
            updateLeaderboard();
            updateAchievements();
            showNotification('Data refreshed from local storage!', 'success');
        }
    } catch (error) {
        showNotification('Sync failed', 'error');
    }
}

// Create backup
async function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
        userData: userData,
        achievements: achievements,
        room: getCurrentRoom(),
        backupDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `workout-backup-${timestamp}.json`;
    link.click();
    
    showNotification('Backup created!', 'success');
}

// Room management functions
function createWorkoutRoom() {
    const roomCode = generateRoomCode();
    if (joinRoom(roomCode)) {
        // Load data for the new room (will be empty for new room)
        loadData();
        
        // Ensure current user exists in the new room
        if (currentAuthUser && !userData[currentAuthUser.id]) {
            userData[currentAuthUser.id] = {
                name: currentAuthUser.username,
                totalPoints: 0,
                todayPoints: 0,
                completedExercises: {},
                workoutHistory: []
            };
            saveData();
        }
        
        // Load chat for new room
        loadChatMessages();
        
        // Send welcome message
        sendSystemMessage(`Welcome to room ${roomCode}! Share this code with friends to workout together.`);
        
        updateRoomDisplay();
        updateDisplay();
        updateLeaderboard();
        updateActivityFeed();
        showNotification(`Created new room: ${roomCode}`, 'success');
    }
}

function joinWorkoutRoom() {
    const roomCode = prompt('Enter room code:');
    if (roomCode && roomCode.length === 6) {
        if (joinRoom(roomCode.toUpperCase())) {
            loadData();
            loadChatMessages();
            
            // Send join message
            if (currentAuthUser) {
                sendSystemMessage(`${currentAuthUser.username} joined the room! 👋`);
            }
            
            updateRoomDisplay();
            updateDisplay();
            updateLeaderboard();
            updateActivityFeed();
        }
    } else {
        showNotification('Please enter a valid 6-character room code', 'error');
    }
}

// GitHub setup function
function setupGitHubSharing() {
    const token = prompt('Enter your GitHub Personal Access Token:');
    if (token) {
        GITHUB_CONFIG.token = token;
        GITHUB_CONFIG.enabled = true;
        localStorage.setItem('github-token', token);
        showNotification('GitHub sharing enabled!', 'success');
        updateConnectionStatus();
    }
}

// Export data
async function exportData() {
    const timestamp = new Date().toISOString().split('T')[0];
    const dataToExport = {
        userData: userData,
        achievements: achievements,
        room: getCurrentRoom(),
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `workout-data-export-${timestamp}.json`;
    link.click();
    showNotification('Data exported!', 'success');
}

// Reset all data
function resetAllData() {
    if (!confirm('Are you sure you want to reset ALL data? This cannot be undone!')) {
        return;
    }
    
    // Clear localStorage for current room
    const roomCode = getCurrentRoom();
    localStorage.removeItem(`workout-data-${roomCode}`);
    
    // Initialize fresh data
    initializeDefaultData();
    
    // Save the fresh data
    saveData();
    
    // Refresh display
    updateDisplay();
    updateLeaderboard();
    updateAchievements();
    
    showNotification('All data has been reset!', 'success');
}

// Update activity feed
function updateActivityFeed() {
    const activityFeed = document.getElementById('activity-feed');
    if (!activityFeed) return;
    
    // Get recent activities from all users
    const recentActivities = [];
    
    Object.entries(userData).forEach(([userId, user]) => {
        if (user.workoutHistory && user.workoutHistory.length > 0) {
            // Get last 3 activities from each user
            const userActivities = user.workoutHistory
                .slice(-3)
                .map(activity => ({
                    ...activity,
                    userName: user.name,
                    userId: userId
                }));
            recentActivities.push(...userActivities);
        }
    });
    
    // Sort by date and take last 5
    recentActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestActivities = recentActivities.slice(0, 5);
    
    // Update feed
    activityFeed.innerHTML = '';
    if (latestActivities.length === 0) {
        activityFeed.innerHTML = '<div class="activity-item">No recent activity</div>';
        return;
    }
    
    latestActivities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        const timeAgo = getTimeAgo(new Date(activity.date));
        const pointsText = activity.points > 0 ? `+${activity.points}` : `${activity.points}`;
        const pointsClass = activity.points > 0 ? 'positive' : 'negative';
        
        item.innerHTML = `
            <strong>${activity.userName}</strong> completed ${activity.exercise} 
            <span class="${pointsClass}">(${pointsText} pts)</span> 
            <small>${timeAgo}</small>
        `;
        
        activityFeed.appendChild(item);
    });
}

// Helper function to get time ago
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

// Check and reset daily points
function checkAndResetDailyPoints() {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = localStorage.getItem('lastDailyReset');
    
    if (lastReset !== today) {
        // Reset daily points for all users
        Object.keys(userData).forEach(userId => {
            userData[userId].todayPoints = 0;
        });
        
        // Clear today's completed exercises
        Object.keys(userData).forEach(userId => {
            const completed = userData[userId].completedExercises;
            Object.keys(completed).forEach(exerciseId => {
                if (completed[exerciseId].date !== today) {
                    delete completed[exerciseId];
                }
            });
        });
        
        localStorage.setItem('lastDailyReset', today);
        saveData();
    }
}

// Utility function to get current date
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// Initialize tooltips and help text
function initializeHelp() {
    // Add help tooltips to exercise cards
    const exerciseCards = document.querySelectorAll('.exercise-card');
    exerciseCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // You can add custom tooltips here if needed
        });
    });
}

// Authentication System
let currentAuthUser = null;
let registeredUsers = {};

// Initialize authentication
function initializeAuth() {
    // Load registered users from localStorage
    const savedUsers = localStorage.getItem('registeredUsers');
    if (savedUsers) {
        registeredUsers = JSON.parse(savedUsers);
    }
    
    // Check if user is already logged in
    const savedAuthUser = localStorage.getItem('currentAuthUser');
    if (savedAuthUser) {
        currentAuthUser = JSON.parse(savedAuthUser);
        showMainApp();
    } else {
        showAuthSection();
    }
}

// Show authentication section
function showAuthSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    
    // Hide tabs when not authenticated
    const tabsContainer = document.querySelector('.tabs');
    if (tabsContainer) {
        tabsContainer.classList.remove('show');
        tabsContainer.style.display = 'none';
    }
    
    // Stop chat polling when not authenticated
    stopChatPolling();
    
    // Stop leaderboard polling when not authenticated
    stopLeaderboardPolling();
    
    // Set up auth tab switching
    setupAuthTabs();
}

// Show main app
function showMainApp() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    
    // Show tabs and make them visible
    const tabsContainer = document.querySelector('.tabs');
    const allTabContent = document.querySelectorAll('.tab-content');
    
    if (tabsContainer) {
        tabsContainer.classList.add('show');
        tabsContainer.style.display = 'flex';
    }
    
    // Make sure tab content containers are visible
    allTabContent.forEach(content => {
        if (content.parentElement) {
            content.parentElement.style.display = 'block';
        }
    });
    
    // Update user info display
    updateUserInfo();
    
    // Set current user to the authenticated user's ID
    if (currentAuthUser) {
        currentUser = currentAuthUser.id;
    }
    
    // Initialize the default tab (main-workout should be active)
    initializeTabs();
    
    // Initialize chat
    setupChatInput();
    loadChatMessages();
    
    // Start chat polling for real-time updates
    startChatPolling();
    
    // Start leaderboard polling for real-time updates
    startLeaderboardPolling();
    
    // Update all displays
    updateRoomDisplay();
    updateDisplay();
    updateLeaderboard();
    updateActivityFeed();
}

// Initialize tabs - make sure the default tab is shown
function initializeTabs() {
    // Hide all tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show the main workout tab and activate its button
    const mainWorkoutTab = document.getElementById('main-workout');
    const mainWorkoutBtn = document.querySelector('[onclick*="main-workout"]');
    
    if (mainWorkoutTab) {
        mainWorkoutTab.classList.add('active');
    }
    if (mainWorkoutBtn) {
        mainWorkoutBtn.classList.add('active');
    }
}

// Setup authentication tabs
function setupAuthTabs() {
    const tabButtons = document.querySelectorAll('.auth-tab-btn');
    const authForms = document.querySelectorAll('.auth-form');
    
    console.log('Setting up auth tabs...', tabButtons.length, authForms.length);
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            console.log('Tab clicked:', targetTab);
            
            // Remove active class from all tabs and forms
            tabButtons.forEach(btn => btn.classList.remove('active'));
            authForms.forEach(form => form.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding form
            this.classList.add('active');
            const targetForm = document.getElementById(`${targetTab}-form`);
            if (targetForm) {
                targetForm.classList.add('active');
            }
        });
    });
    
    // Set up form submissions
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const guestBtn = document.getElementById('guest-btn');
    
    console.log('Found forms:', signupForm, loginForm, guestBtn);
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (guestBtn) {
        guestBtn.addEventListener('click', handleGuestLogin);
    }
    
    // Set default active tab
    const loginTab = document.querySelector('[data-tab="login"]');
    if (loginTab) {
        loginTab.click();
    }
}

// Handle signup
function handleSignup(e) {
    e.preventDefault();
    console.log('Signup handler called');
    
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    
    console.log('Signup data:', username, email, password);
    
    if (!username || !email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (registeredUsers[username]) {
        showNotification('Username already exists', 'error');
        return;
    }
    
    // Create new user
    const userId = 'user_' + Date.now();
    registeredUsers[username] = {
        id: userId,
        username: username,
        email: email,
        password: password, // In a real app, this would be hashed
        created: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    
    // Auto-login the new user
    currentAuthUser = {
        id: userId,
        username: username,
        email: email,
        type: 'registered'
    };
    
    localStorage.setItem('currentAuthUser', JSON.stringify(currentAuthUser));
    
    // Add user to userData if not exists
    if (!userData[userId]) {
        userData[userId] = {
            name: username,
            totalPoints: 0,
            todayPoints: 0,
            completedExercises: {},
            workoutHistory: []
        };
        saveData();
    }
    
    showNotification('Account created successfully!', 'success');
    showMainApp();
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showNotification('Please enter username and password', 'error');
        return;
    }
    
    const user = registeredUsers[username];
    if (!user || user.password !== password) {
        showNotification('Invalid username or password', 'error');
        return;
    }
    
    // Login successful
    currentAuthUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        type: 'registered'
    };
    
    localStorage.setItem('currentAuthUser', JSON.stringify(currentAuthUser));
    
    // Add user to userData if not exists
    if (!userData[user.id]) {
        userData[user.id] = {
            name: user.username,
            totalPoints: 0,
            todayPoints: 0,
            completedExercises: {},
            workoutHistory: []
        };
        saveData();
    }
    
    showNotification('Login successful!', 'success');
    showMainApp();
}

// Handle guest login
function handleGuestLogin() {
    console.log('Guest login handler called');
    const guestId = 'guest_' + Date.now();
    currentAuthUser = {
        id: guestId,
        username: 'Guest User',
        type: 'guest'
    };
    
    localStorage.setItem('currentAuthUser', JSON.stringify(currentAuthUser));
    
    // Add guest to userData
    userData[guestId] = {
        name: 'Guest User',
        totalPoints: 0,
        todayPoints: 0,
        completedExercises: {},
        workoutHistory: []
    };
    
    saveData();
    showNotification('Continue as guest', 'success');
    showMainApp();
}

// Update user info display
function updateUserInfo() {
    if (currentAuthUser) {
        document.getElementById('user-display-name').textContent = currentAuthUser.username;
        document.getElementById('user-info').style.display = 'flex';
    }
}

// Handle logout
function handleLogout() {
    currentAuthUser = null;
    localStorage.removeItem('currentAuthUser');
    showNotification('Logged out successfully', 'success');
    showAuthSection();
}

// Proportional Points System
function calculateProportionalPoints(exercise, completed, target) {
    const proportion = Math.min(completed / target, 1); // Cap at 100%
    const basePoints = getExercisePoints(exercise);
    return Math.floor(basePoints * proportion);
}

// Enhanced exercise completion with proportional points
function completeExerciseProportional(exerciseId, completedAmount) {
    if (!currentAuthUser) {
        showNotification('Please log in to track workouts', 'error');
        return;
    }
    
    const userId = currentAuthUser.id;
    const exercise = getExerciseById(exerciseId);
    
    if (!exercise) {
        showNotification('Exercise not found', 'error');
        return;
    }
    
    // Get target amount for the exercise
    const targetAmount = getExerciseTarget(exercise, exerciseId);
    
    // Calculate proportional points
    const points = calculateProportionalPoints(exercise, completedAmount, targetAmount);
    
    // Update user data
    if (!userData[userId]) {
        userData[userId] = {
            name: currentAuthUser.username,
            totalPoints: 0,
            todayPoints: 0,
            completedExercises: {},
            workoutHistory: []
        };
    }
    
    userData[userId].totalPoints += points;
    userData[userId].todayPoints += points;
    
    // Track completed amount
    const today = getCurrentDate();
    const exerciseKey = `${exerciseId}_${today}`;
    
    if (!userData[userId].completedExercises[exerciseKey]) {
        userData[userId].completedExercises[exerciseKey] = {
            exerciseId: exerciseId,
            completed: 0,
            target: targetAmount,
            date: today
        };
    }
    
    userData[userId].completedExercises[exerciseKey].completed += completedAmount;
    
    // Add to workout history
    userData[userId].workoutHistory.push({
        exercise: exercise.name,
        completed: completedAmount,
        target: targetAmount,
        points: points,
        date: new Date().toISOString(),
        userName: currentAuthUser.username
    });
    
    // Check achievements
    checkAchievements(userId, points);
    
    // Save data
    saveData();
    
    // Update displays
    updateDisplay();
    updateLeaderboard();
    updateActivityFeed();
    
    const percentage = Math.round((completedAmount / targetAmount) * 100);
    showNotification(`+${points} points! (${completedAmount}/${targetAmount} - ${percentage}%)`, 'success');
}

// Get exercise target amount
function getExerciseTarget(exercise, exerciseId) {
    // Define target amounts for each specific exercise ID
    const targets = {
        // Main workout exercises
        'pushups-main': 30,
        'jump-squats-main': 120,
        'plank-main': 120, // seconds
        'knee-pushups-main': 120,
        'situps-main': 150,
        'jumping-jacks-main': 400,
        
        // Second workout exercises  
        'pushups-second': 15,
        'plank-second': 180, // seconds
        'burpees-second': 50,
        'squats-second': 40,
        
        // Warm-up exercises
        'jj-warmup': 60, // seconds
        'arm-circles-warmup': 60, // seconds
        'hip-circles-warmup': 60, // seconds
        'bw-squats-warmup': 20, // reps
        'toe-touches-warmup': 30, // steps
        
        // Basic exercises
        'normal-squats': 40,
        'jj-basic': 50,
        'calf-raises': 50,
        'glute-bridges-basic': 25,
        'arm-circles-basic': 60, // seconds
        'high-knees': 60, // seconds
        'butt-kicks': 60, // seconds
        
        // Activation exercises
        'glute-bridges': 15, // reps
        'clamshells': 20, // total reps (10 each side)
        'shoulder-rot': 24, // total reps (12 each arm)
        'dead-bug': 16, // total reps (8 each side)
        'heel-toe': 40, // total steps (20 each)
        
        // Elite exercises
        'burpees-elite': 50,
        'pushups-100': 100,
        'handstand': 60, // seconds
        'muscle-up': 1,
        
        // Generic exercises (for backward compatibility)
        'Push-ups': 30,
        'Sit-ups': 50,
        'Squats': 40,
        'Plank': 60, // seconds
        'Burpees': 15,
        'Jumping Jacks': 50,
        'Mountain Climbers': 40,
        'High Knees': 60, // seconds
        'Running': 20, // minutes
        'Cycling': 30, // minutes
        'Swimming': 15, // minutes
        'Walking': 30, // minutes
        'Yoga': 20, // minutes
        'Weightlifting': 45, // minutes
        'HIIT': 20, // minutes
        'Stretching': 15, // minutes
        'Dancing': 30, // minutes
        'Rock Climbing': 60, // minutes
        'Martial Arts': 45, // minutes
        'Boxing': 30, // minutes
    };
    
    // First try to get target by exercise ID, then fall back to exercise name
    return targets[exerciseId] || targets[exercise.name] || 30; // Default target
}

// Get exercise by ID
function getExerciseById(exerciseId) {
    // This would normally come from your exercise data structure
    // For now, I'll create a simple mapping
    const exercises = {
        // Main workout exercises
        'pushups-main': { name: 'Push-ups', points: 300 },
        'jump-squats-main': { name: 'Jump Squats', points: 40 },
        'plank-main': { name: 'Plank', points: 200 },
        'knee-pushups-main': { name: 'Knee Push-ups', points: 60 },
        'situps-main': { name: 'Sit-ups', points: 120 },
        'jumping-jacks-main': { name: 'Jumping Jacks', points: 1000 },
        
        // Second workout exercises  
        'pushups-second': { name: 'Push-ups', points: 150 },
        'plank-second': { name: 'Plank', points: 300 },
        'burpees-second': { name: 'Burpees', points: 2500 },
        'squats-second': { name: 'Squats', points: 40 },
        
        // Warm-up exercises (now with proportional points)
        'jj-warmup': { name: 'Jumping Jacks', points: 30 },
        'arm-circles-warmup': { name: 'Arm Circles', points: 30 },
        'hip-circles-warmup': { name: 'Hip Circles', points: 20 },
        'bw-squats-warmup': { name: 'Bodyweight Squats', points: 20 },
        'toe-touches-warmup': { name: 'Walking Toe Touches', points: 20 },
        
        // Basic exercises
        'normal-squats': { name: 'Normal Squats', points: 40 },
        'jj-basic': { name: 'Jumping Jacks', points: 100 },
        'calf-raises': { name: 'Calf Raises', points: 50 },
        'glute-bridges-basic': { name: 'Glute Bridges', points: 75 },
        'arm-circles-basic': { name: 'Arm Circles', points: 25 },
        'high-knees': { name: 'High Knees', points: 120 },
        'butt-kicks': { name: 'Butt Kicks', points: 120 },
        
        // Activation exercises (now with proportional points)
        'glute-bridges': { name: 'Banded Glute Bridges', points: 20 },
        'clamshells': { name: 'Side-Lying Clamshells', points: 20 },
        'shoulder-rot': { name: 'Shoulder External Rotations', points: 20 },
        'dead-bug': { name: 'Dead Bug Core Holds', points: 20 },
        'heel-toe': { name: 'Heel Walks + Toe Walks', points: 20 },
        
        // Elite exercises
        'burpees-elite': { name: 'Burpees', points: 2500 },
        'pushups-100': { name: '100 Push-ups', points: 1500 },
        'handstand': { name: 'Handstand', points: 1000 },
        'muscle-up': { name: 'Muscle-up', points: 800 },
        
        // Generic exercises (for backward compatibility)
        'pushups': { name: 'Push-ups', points: 15 },
        'situps': { name: 'Sit-ups', points: 10 },
        'squats': { name: 'Squats', points: 12 },
        'plank': { name: 'Plank', points: 20 },
        'burpees': { name: 'Burpees', points: 25 },
        'jumping-jacks': { name: 'Jumping Jacks', points: 8 },
        'mountain-climbers': { name: 'Mountain Climbers', points: 15 },
        'running': { name: 'Running', points: 30 },
        'cycling': { name: 'Cycling', points: 25 },
        'swimming': { name: 'Swimming', points: 40 },
        'walking': { name: 'Walking', points: 15 },
        'yoga': { name: 'Yoga', points: 20 },
        'weightlifting': { name: 'Weightlifting', points: 35 },
        'hiit': { name: 'HIIT', points: 45 },
        'stretching': { name: 'Stretching', points: 10 },
        'dancing': { name: 'Dancing', points: 20 },
        'rock-climbing': { name: 'Rock Climbing', points: 50 },
        'martial-arts': { name: 'Martial Arts', points: 35 },
        'boxing': { name: 'Boxing', points: 30 }
    };
    
    return exercises[exerciseId];
}

// Get exercise points
function getExercisePoints(exercise) {
    return exercise.points || 20;
}

// Setup logout button
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Workout Session Management
let workoutInProgress = false;
let workoutStartTime = null;

function startWorkout() {
    workoutInProgress = true;
    workoutStartTime = new Date();
    
    // Update UI
    document.getElementById('start-workout-btn').style.display = 'none';
    document.getElementById('workout-status').classList.remove('hidden');
    
    // Navigate to main workout tab
    const mainWorkoutTab = document.getElementById('main-workout');
    const mainWorkoutBtn = document.querySelector('[onclick*="main-workout"]');
    
    if (mainWorkoutTab && mainWorkoutBtn) {
        // Hide all tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Remove active from all tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Show the main workout tab and activate its button
        mainWorkoutTab.classList.add('active');
        mainWorkoutBtn.classList.add('active');
    }
    
    // Add to chat
    sendSystemMessage(`${currentAuthUser.username} started working out! 💪`);
    
    showNotification('Workout started! Good luck! 💪', 'success');
}

function endWorkout() {
    if (!workoutInProgress) return;
    
    const duration = Math.round((new Date() - workoutStartTime) / 1000 / 60); // minutes
    workoutInProgress = false;
    workoutStartTime = null;
    
    // Update UI
    document.getElementById('start-workout-btn').style.display = 'block';
    document.getElementById('workout-status').classList.add('hidden');
    
    // Add to chat
    sendSystemMessage(`${currentAuthUser.username} finished their workout! (${duration} minutes) 🎉`);
    
    showNotification(`Great workout! You exercised for ${duration} minutes.`, 'success');
}

// Live Chat System
let chatMessages = [];
let chatCollapsed = false;
let lastMessageCount = 0;
let chatPollingInterval = null;

// Leaderboard real-time updates
let leaderboardPollingInterval = null;
let lastDataHash = '';

function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    const toggleBtn = document.getElementById('chat-toggle');
    
    chatCollapsed = !chatCollapsed;
    
    if (chatCollapsed) {
        chatBox.classList.add('collapsed');
        toggleBtn.textContent = '▶';
    } else {
        chatBox.classList.remove('collapsed');
        toggleBtn.textContent = '▼';
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message || !currentAuthUser) return;
    
    const messageData = {
        id: Date.now(),
        username: currentAuthUser.username,
        userId: currentAuthUser.id,
        message: message,
        timestamp: new Date().toISOString(),
        type: 'user'
    };
    
    addMessageToChat(messageData);
    saveChatMessage(messageData);
    
    input.value = '';
    input.focus();
}

function sendSystemMessage(message) {
    const messageData = {
        id: Date.now(),
        username: 'System',
        userId: 'system',
        message: message,
        timestamp: new Date().toISOString(),
        type: 'system'
    };
    
    addMessageToChat(messageData);
    saveChatMessage(messageData);
}

function addMessageToChat(messageData) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    
    const isOwn = currentAuthUser && messageData.userId === currentAuthUser.id;
    const isSystem = messageData.type === 'system';
    
    messageDiv.className = `chat-message ${isOwn ? 'own' : 'other'} ${isSystem ? 'system' : ''}`;
    
    const time = new Date(messageData.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    if (isSystem) {
        messageDiv.innerHTML = `
            <div class="message-text" style="font-style: italic; color: #718096;">${messageData.message}</div>
            <div class="timestamp">${time}</div>
        `;
    } else {
        messageDiv.innerHTML = `
            ${!isOwn ? `<div class="username">${messageData.username}</div>` : ''}
            <div class="message-text">${messageData.message}</div>
            <div class="timestamp">${time}</div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveChatMessage(messageData) {
    const roomCode = getCurrentRoom();
    const chatKey = `chat-${roomCode}`;
    
    let roomChat = JSON.parse(localStorage.getItem(chatKey) || '[]');
    roomChat.push(messageData);
    
    // Keep only last 100 messages
    if (roomChat.length > 100) {
        roomChat = roomChat.slice(-100);
    }
    
    localStorage.setItem(chatKey, JSON.stringify(roomChat));
    
    // Update the last known message count
    lastMessageCount = roomChat.length;
}

function loadChatMessages() {
    const roomCode = getCurrentRoom();
    const chatKey = `chat-${roomCode}`;
    
    const roomChat = JSON.parse(localStorage.getItem(chatKey) || '[]');
    const chatMessagesContainer = document.getElementById('chat-messages');
    
    if (!chatMessagesContainer) return;
    
    chatMessagesContainer.innerHTML = '';
    
    roomChat.forEach(messageData => {
        addMessageToChat(messageData);
    });
    
    // Update the last known message count
    lastMessageCount = roomChat.length;
}

function setupChatInput() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
}

// Add chat polling for real-time updates
function startChatPolling() {
    // Clear any existing polling
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
    }
    
    // Poll for new messages every 2 seconds
    chatPollingInterval = setInterval(() => {
        checkForNewChatMessages();
    }, 2000);
}

function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
}

function checkForNewChatMessages() {
    const roomCode = getCurrentRoom();
    const chatKey = `chat-${roomCode}`;
    
    const roomChat = JSON.parse(localStorage.getItem(chatKey) || '[]');
    
    // Only reload if there are new messages
    if (roomChat.length !== lastMessageCount) {
        lastMessageCount = roomChat.length;
        loadChatMessages();
    }
}

// Add leaderboard polling for real-time updates
function startLeaderboardPolling() {
    // Clear any existing polling
    if (leaderboardPollingInterval) {
        clearInterval(leaderboardPollingInterval);
    }
    
    // Poll for leaderboard changes every 3 seconds
    leaderboardPollingInterval = setInterval(() => {
        checkForLeaderboardUpdates();
    }, 3000);
}

function stopLeaderboardPolling() {
    if (leaderboardPollingInterval) {
        clearInterval(leaderboardPollingInterval);
        leaderboardPollingInterval = null;
    }
}

function checkForLeaderboardUpdates() {
    const roomCode = getCurrentRoom();
    const storageKey = `workout-data-${roomCode}`;
    
    try {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            // Create a simple hash of the data to detect changes
            const dataHash = btoa(savedData).substring(0, 20);
            
            if (dataHash !== lastDataHash && lastDataHash !== '') {
                lastDataHash = dataHash;
                
                // Load the updated data
                const data = JSON.parse(savedData);
                if (data.users) {
                    // Merge the data while preserving current user's session
                    const currentUserId = currentAuthUser ? currentAuthUser.id : null;
                    const currentUserData = currentUserId ? userData[currentUserId] : null;
                    
                    userData = data.users;
                    
                    // Restore current user data if it exists and wasn't overwritten
                    if (currentUserData && currentUserId && !userData[currentUserId]) {
                        userData[currentUserId] = currentUserData;
                    }
                    
                    // Update displays
                    updateLeaderboard();
                    updateDisplay();
                    updateActivityFeed();
                    
                    // Show a subtle notification about leaderboard update
                    showNotification('Leaderboard updated! 📊', 'info');
                }
            } else if (lastDataHash === '') {
                // First time setting the hash
                lastDataHash = dataHash;
            }
        }
    } catch (error) {
        console.error('Error checking for leaderboard updates:', error);
    }
}

// Enhanced save function to trigger leaderboard updates
function triggerLeaderboardUpdate() {
    // Update the data hash to force other clients to refresh
    const roomCode = getCurrentRoom();
    const storageKey = `workout-data-${roomCode}`;
    
    const dataToSave = {
        users: userData,
        achievements: achievements,
        lastUpdate: new Date().toISOString(),
        room: roomCode,
        updateTrigger: Math.random() // Force change detection
    };
    
    try {
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        localStorage.setItem('workout-tracker-backup', JSON.stringify(dataToSave));
    } catch (error) {
        console.error('localStorage save failed:', error);
    }
}

// Call initialization functions
document.addEventListener('DOMContentLoaded', function() {
    initializeHelp();
    setupLogout();
});
