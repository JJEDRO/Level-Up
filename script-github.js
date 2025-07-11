// Global Variables
let userData = {};
let currentUser = 'user1';
let achievements = {};
let isOnlineMode = false; // Start in offline mode for GitHub hosting
let autoSaveInterval;
let refreshInterval;
let selectedWorkouts = new Set();
const MAX_WORKOUT_SELECTION = 5;

// Timer variables
let timerInterval = null;
let timerStartTime = null;
let timerElapsedTime = 0;
let timerPaused = false;

// Profile variables
let selectedAvatarForModal = '👤';
let customAvatarImage = null;

// Image Editor variables
let originalImage = null;
let editedImage = null;
let currentImageData = null;
let cropMode = false;
let cropStartX = 0, cropStartY = 0, cropEndX = 0, cropEndY = 0;
let isDragging = false;
let imageRotation = 0;
let imageFlipH = false;
let imageFlipV = false;

// Filter values
let currentFilters = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    invert: 0
};

// Simple Cross-tab Real-time Chat using localStorage events
let isRealtimeChatEnabled = true; // Always enabled for localStorage events

// GitHub-based data sharing using GitHub Gist API
const GITHUB_CONFIG = {
    enabled: false, // Users can enable this with their own token
    token: '', // Users need to provide their own GitHub token
    gistId: '', // Will be created automatically
    filename: 'workout-data.json'
};

// Firebase configuration for real-time multiplayer chat
// Using Firebase v9 compat mode for easier integration
const firebaseConfig = {
    apiKey: "AIzaSyAaE6nHLYlQ3XQKc-R7lQ6Sc8_RJ3UgVm8",
    authDomain: "level-up-demo-2025.firebaseapp.com",
    databaseURL: "https://level-up-demo-2025-default-rtdb.firebaseio.com/",
    projectId: "level-up-demo-2025",
    storageBucket: "level-up-demo-2025.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};

// Firebase variables
let firebaseApp = null;
let firebaseDatabase = null;
let chatListener = null;

// Initialize Firebase for multiplayer chat
function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            updateChatStatus('🔄 Connecting...', 'connecting');
            
            firebaseApp = firebase.initializeApp(firebaseConfig);
            firebaseDatabase = firebase.database();
            
            // Test connection
            firebaseDatabase.ref('.info/connected').on('value', (snapshot) => {
                if (snapshot.val()) {
                    console.log('🔥 Firebase connected - Multiplayer chat enabled!');
                    updateChatStatus('🌐 Multiplayer', 'connected');
                    showNotification('🌐 Multiplayer chat connected!', 'success');
                } else {
                    console.log('🔥 Firebase disconnected');
                    updateChatStatus('📱 Local Only', '');
                }
            });
            
            return true;
        } else {
            console.warn('Firebase SDK not loaded, using localStorage for chat');
            updateChatStatus('📱 Local Only', '');
            return false;
        }
    } catch (error) {
        console.warn('Firebase initialization failed, using localStorage for chat:', error);
        updateChatStatus('📱 Local Only', '');
        return false;
    }
}

function updateChatStatus(text, className = '') {
    const statusElement = document.getElementById('chat-status');
    if (statusElement) {
        statusElement.textContent = text;
        statusElement.className = 'chat-status ' + className;
    }
}

// Initialize default data
function initializeDefaultData() {
    // Skip authentication initialization - allow immediate access
    userData = {
        'guest-user': { 
            name: 'Workout User', 
            totalPoints: 0, 
            todayPoints: 0, 
            completedExercises: {}, 
            workoutHistory: [],
            workoutDays: 1,
            lastWorkoutDate: getCurrentDate(),
            profile: {
                avatar: '👤',
                name: 'Workout User',
                joinDate: getCurrentDate()
            },
            streakData: {
                currentStreak: 0,
                longestStreak: 0,
                lastWorkoutDate: null,
                workoutDates: []
            }
        }
    };
    
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
    
    // Stop any existing chat listener
    stopFirebaseChatListener();
    
    localStorage.setItem('workout-room-code', roomCode);
    
    // Set up Firebase chat listener for this room
    setTimeout(() => {
        setupFirebaseChatListener();
        loadFirebaseChatHistory();
    }, 500);
    
    showNotification(`Joined room: ${roomCode}`, 'success');
    sendSystemMessage(`${currentAuthUser?.username || 'User'} joined the room`);
    
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
        // Add timestamp to ensure data changes are detected
        const compressedData = {
            users: userData,
            achievements: achievements,
            lastUpdate: new Date().toISOString(),
            room: roomCode,
            updateTrigger: Math.random() // Force change detection for real-time updates
        };
        
        const dataString = JSON.stringify(compressedData);
        localStorage.setItem(storageKey, dataString);
        localStorage.setItem('workout-tracker-backup', dataString);
        
        // Create a second backup with timestamp
        const timestampKey = `workout-backup-${new Date().toISOString().split('T')[0]}`;
        localStorage.setItem(timestampKey, dataString);
        
        console.log('Data saved to localStorage successfully:', storageKey);
        return true;
    } catch (error) {
        console.error('localStorage save failed:', error);
        showNotification('⚠️ Save failed - storage may be full', 'error');
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
            
            // Ensure all users have proper streak data structure
            Object.keys(userData).forEach(userId => {
                const user = userData[userId];
                if (!user.streakData) {
                    user.streakData = {
                        currentStreak: 0,
                        longestStreak: 0,
                        lastWorkoutDate: null,
                        workoutDates: []
                    };
                }
                
                // Recalculate current streak to ensure accuracy
                if (user.streakData.workoutDates && user.streakData.workoutDates.length > 0) {
                    const streak = calculateCurrentStreak(user.streakData.workoutDates);
                    user.streakData.currentStreak = streak;
                }
            });
            
            // Set initial data hash for leaderboard polling
            lastDataHash = btoa(savedData).substring(0, 20);
            
            console.log('Data loaded from localStorage:', data);
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
            updateActivityFeed();
            updateConnectionStatus();
            return;
        }
    }
    
    // Fall back to localStorage
    loadFromLocalStorage();
    updateDisplay();
    updateActivityFeed();
    updateConnectionStatus();
}

// Save data function
async function saveData() {
    try {
        // Ensure userData exists
        if (!userData || typeof userData !== 'object') {
            console.warn('userData is not properly initialized, initializing default data');
            initializeDefaultData();
        }
        
        const dataToSave = {
            users: userData,
            achievements: achievements || {}
        };
        
        // Try GitHub first if configured
        if (GITHUB_CONFIG.enabled && GITHUB_CONFIG.token) {
            try {
                const saved = await saveToGitHub(dataToSave);
                if (saved) {
                    console.log('Data saved to GitHub successfully');
                    return true;
                }
            } catch (githubError) {
                console.warn('GitHub save failed, falling back to localStorage:', githubError);
            }
        }
        
        // Always save to localStorage as backup
        const localSaveResult = saveToLocalStorage(dataToSave);
        if (localSaveResult) {
            console.log('Data saved to localStorage successfully');
            return true;
        } else {
            console.error('Failed to save to localStorage');
            return false;
        }
        
    } catch (error) {
        console.error('Error in saveData function:', error);
        return false;
    }
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
    try {
        // Skip Firebase and authentication - go straight to workout selection
        console.log('🏋️ Level-Up Workout Tracker initialized');
        
        // Ensure userData is initialized
        if (!userData) {
            userData = {};
        }

        // Load data first - this is critical for maintaining progress
        await loadData();
        
        // Ensure guest user exists with proper initialization
        const guestUserId = 'guest-user';
        if (!userData[guestUserId]) {
            userData[guestUserId] = createDefaultUserData('Workout User');
            console.log('Created new guest user data');
        } else {
            console.log('Loaded existing guest user data:', userData[guestUserId]);
            
            // Ensure streak data exists and is properly structured
            if (!userData[guestUserId].streakData) {
                userData[guestUserId].streakData = {
                    currentStreak: 0,
                    longestStreak: 0,
                    lastWorkoutDate: null,
                    workoutDates: []
                };
            }
            
            // Recalculate streak on load to ensure accuracy
            if (userData[guestUserId].streakData.workoutDates && userData[guestUserId].streakData.workoutDates.length > 0) {
                const recalculatedStreak = calculateCurrentStreak(userData[guestUserId].streakData.workoutDates);
                userData[guestUserId].streakData.currentStreak = recalculatedStreak;
                console.log('Recalculated streak on load:', recalculatedStreak);
            }
        }
        
        // Save immediately to persist any initialization changes
        await saveData();
        
        // Set current user
        currentUser = guestUserId;
        
        // Initialize profile display
        updateProfileDisplay();
        
        // Show workout selection and hide other content initially
        showWorkoutSelectionOnly();
        
        // Initialize workout selection
        initializeWorkoutSelection();
        
        // Reset daily points at midnight
        checkAndResetDailyPoints();
        
        // Start auto-save
        startAutoSave();
        
        // Add global functions
        window.syncData = syncData;
        window.createBackup = createBackup;
        window.goToNewDay = goToNewDay;
        window.saveProgress = saveProgress;
        
        // Add debug functions for troubleshooting
        window.debugUserData = function() {
            console.log('Current userData:', userData);
            return userData;
        };
        
        window.debugStreakData = function() {
            const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
            if (userData[userId] && userData[userId].streakData) {
                console.log('Streak data for user:', userId, userData[userId].streakData);
                return userData[userId].streakData;
            }
            console.log('No streak data found for user:', userId);
            return null;
        };
        
        window.forceStreakUpdate = function() {
            console.log('Forcing streak update...');
            updateStreakData();
            updateDisplay();
            updateProfileDisplay();
            console.log('Streak update completed');
        };
        
        window.resetUserData = function() {
            if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                localStorage.clear();
                location.reload();
            }
        };
        
        // Add test function to validate fixes
        window.testSaveAndStreak = function() {
            console.log('=== Testing Save and Streak Functionality ===');
            
            const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
            console.log('Current user ID:', userId);
            
            // Test 1: Check if userData exists and is accessible
            console.log('1. Current userData:', userData);
            
            if (!userData[userId]) {
                console.log('Creating user data...');
                userData[userId] = createDefaultUserData('Test User');
            }
            
            // Test 2: Test save functionality
            console.log('2. Testing save...');
            const initialPoints = userData[userId].totalPoints;
            userData[userId].totalPoints += 100; // Add test points
            saveData();
            console.log('Points updated from', initialPoints, 'to', userData[userId].totalPoints);
            
            // Test 3: Test streak functionality
            console.log('3. Testing streak...');
            const initialStreak = userData[userId].streakData?.currentStreak || 0;
            updateStreakData();
            const newStreak = userData[userId].streakData?.currentStreak || 0;
            console.log('Streak updated from', initialStreak, 'to', newStreak);
            
            // Test 4: Force page reload simulation
            console.log('4. Testing data persistence after reload simulation...');
            saveData();
            loadData().then(() => {
                console.log('Data after reload simulation:', userData[userId]);
                console.log('=== Test completed ===');
                showNotification('✅ Test completed! Check console for results.', 'success');
            });
        };
        
        window.debugStreakAndSave = function() {
            console.log('=== Debug: Streak and Save Status ===');
            
            const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
            console.log('User ID:', userId);
            
            // Check localStorage content
            const roomCode = getCurrentRoom();
            const storageKey = `workout-data-${roomCode}`;
            const savedData = localStorage.getItem(storageKey);
            
            console.log('Room code:', roomCode);
            console.log('Storage key:', storageKey);
            console.log('Saved data exists:', !!savedData);
            
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    console.log('Parsed saved data:', parsed);
                } catch (e) {
                    console.error('Error parsing saved data:', e);
                }
            }
            
            // Check current user data
            if (userData[userId]) {
                console.log('Current user data:', userData[userId]);
                console.log('Streak data:', userData[userId].streakData);
                console.log('Total points:', userData[userId].totalPoints);
                console.log('Today points:', userData[userId].todayPoints);
                console.log('Completed exercises:', userData[userId].completedExercises);
            } else {
                console.log('No user data found for:', userId);
            }
            
            console.log('=== Debug completed ===');
            showNotification('✅ Debug info logged to console!', 'info');
        };
        
        // Add timer functions to global scope
        window.startTimer = startTimer;
        window.pauseTimer = pauseTimer;
        window.stopTimer = stopTimer;
        
        // Add profile functions to global scope - ENSURE THESE ARE SET UP
        window.openProfileModal = openProfileModal;
        window.closeProfileModal = closeProfileModal;
        window.selectAvatar = selectAvatar;
        window.saveProfile = saveProfile;
        window.selectCustomImage = selectCustomImage;
        window.handleCustomImageUpload = handleCustomImageUpload;
        
        // Add image editor functions to global scope
        window.enableCropMode = enableCropMode;
        window.resetImage = resetImage;
        window.resizeImage = resizeImage;
        window.applyFilters = applyFilters;
        window.applyPresetFilter = applyPresetFilter;
        window.rotateImage = rotateImage;
        window.flipImage = flipImage;
        window.saveEditedImage = saveEditedImage;
        window.cancelImageEdit = cancelImageEdit;
        
        // Setup filter event listeners
        setupFilterEventListeners();
        window.applyCustomNegativePoints = applyCustomNegativePoints;
        
        // Add tab functions to global scope
        window.openTab = openTab;
        window.completeExercise = completeExercise;
        window.completeSimpleExercise = completeSimpleExercise;
        window.completeFullWorkout = completeFullWorkout;
        window.applyNegativePoints = applyNegativePoints;
        window.startWorkout = startWorkout;
        window.endWorkout = endWorkout;
        window.resetAllProgress = resetAllProgress;
        
        // Test profile modal functionality
        console.log('Profile modal function available:', typeof window.openProfileModal === 'function');
        console.log('DOM profile modal element exists:', !!document.getElementById('profile-modal'));
        
        // Add debug function to test modal
        window.testProfileModal = function() {
            console.log('Testing profile modal...');
            const modal = document.getElementById('profile-modal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('active');
                console.log('Modal should now be visible');
            } else {
                console.error('Modal element not found!');
            }
        };
        
        // Add debug function for streak and saving
        window.debugStreakAndSave = function() {
            const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
            const user = userData[userId];
            
            console.log('=== STREAK AND SAVE DEBUG ===');
            console.log('Current user ID:', userId);
            console.log('User data:', user);
            console.log('Streak data:', user?.streakData);
            console.log('Today\'s date:', getCurrentDate());
            console.log('LocalStorage keys:', Object.keys(localStorage).filter(key => key.includes('workout')));
            
            // Force save
            saveProgress();
            
            // Check localStorage content
            const roomCode = getCurrentRoom();
            const storageKey = `workout-data-${roomCode}`;
            const savedData = localStorage.getItem(storageKey);
            console.log('Saved data in localStorage:', savedData ? JSON.parse(savedData) : 'No data found');
            
            return {
                userId,
                userData: user,
                streakData: user?.streakData,
                savedData: savedData ? JSON.parse(savedData) : null
            };
        };
        
        // Add function to manually add workout days for testing
        window.addTestWorkoutDay = function(daysAgo = 0) {
            const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
            
            // Ensure userData exists
            if (!userData) {
                userData = {};
            }
            
            if (!userData[userId]) {
                userData[userId] = createDefaultUserData('Workout User');
            }
            
            const user = userData[userId];
            
            // Initialize streak data if needed
            if (!user.streakData) {
                user.streakData = {
                    currentStreak: 0,
                    longestStreak: 0,
                    lastWorkoutDate: null,
                    workoutDates: []
                };
            }
            
            // Calculate the date to add
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const dateString = date.toISOString().split('T')[0];
            
            // Add the date if it's not already there
            if (!user.streakData.workoutDates.includes(dateString)) {
                user.streakData.workoutDates.push(dateString);
                user.streakData.workoutDates.sort();
                
                // Recalculate streak
                const streak = calculateCurrentStreak(user.streakData.workoutDates);
                user.streakData.currentStreak = streak;
                
                if (streak > user.streakData.longestStreak) {
                    user.streakData.longestStreak = streak;
                }
                
                user.streakData.lastWorkoutDate = user.streakData.workoutDates[user.streakData.workoutDates.length - 1];
                
                // Save and update
                saveData();
                updateDisplay();
                updateProfileDisplay();
                
                console.log(`Added workout day: ${dateString}, new streak: ${streak}`);
                showNotification(`Added workout day ${dateString}. Streak: ${streak}`, 'success');
            } else {
                console.log(`Workout day ${dateString} already exists`);
            }
            
            return user.streakData;
        };
        
        console.log('Debug functions added:');
        console.log('- debugStreakAndSave() - Debug saving and streak issues');
        console.log('- addTestWorkoutDay(daysAgo) - Add workout days for testing (0=today, 1=yesterday, etc.)');
        console.log('- testProfileModal() - Test modal display');
        console.log('- testSaveAndStreak() - Test the saving and streak functionality');
        
        // Add simple test function
        window.testSaveAndStreak = function() {
            console.log('=== TESTING SAVE AND STREAK ===');
            
            try {
                // Test saving
                console.log('Testing save...');
                saveProgress();
                
                // Test streak
                console.log('Testing streak...');
                updateStreakData();
                
                // Show current state
                const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
                const user = userData[userId];
                
                console.log('Current user data:', user);
                console.log('Streak info:', user?.streakData);
                
                showNotification('✅ Save and streak test completed! Check console for details.', 'success');
                
                return {
                    saveWorking: true,
                    streakWorking: user?.streakData !== undefined,
                    userData: user
                };
                
            } catch (error) {
                console.error('Test failed:', error);
                showNotification('❌ Test failed: ' + error.message, 'error');
                
                return {
                    saveWorking: false,
                    streakWorking: false,
                    error: error.message
                };
            }
        };
        
        console.log('App initialization complete. Current userData:', userData);
        
    } catch (error) {
        console.error('Error during app initialization:', error);
        showNotification('❌ Error initializing app: ' + error.message, 'error');
        
        // Try to recover by initializing minimal data
        userData = {};
        userData['guest-user'] = createDefaultUserData('Workout User');
        currentUser = 'guest-user';
        showWorkoutSelectionOnly();
    }
});

function showWorkoutSelectionOnly() {
    // Show workout selection
    const workoutSelection = document.getElementById('workout-selection');
    if (workoutSelection) {
        workoutSelection.style.display = 'block';
    }
    
    // Hide main app content
    const appContent = document.getElementById('app-content');
    if (appContent) {
        appContent.classList.add('hidden');
    }
    
    // Hide workout tabs
    const workoutTabs = document.getElementById('workout-tabs');
    if (workoutTabs) {
        workoutTabs.classList.add('hidden');
    }
}

// Tab functionality
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    
    // Hide all tab content
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
        tabcontent[i].style.display = "none";
    }
    
    // Remove active class from all tab buttons
    tablinks = document.getElementsByClassName("tab-btn");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    
    // Show the selected tab content and mark button as active
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add("active");
        selectedTab.style.display = "block";
    }
    
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add("active");
    }
    
    // Show notification about tab switch
    const tabDisplayNames = {
        'main-workout': 'Main Workout',
        'second-workout': '2nd Workout', 
        'mobility-workout': 'Mobility & Stretching',
        'basic-exercises': 'Basic Exercises',
        'elite-challenges': 'Elite Challenges',
        'workout-quests': 'Workout Quests',
        'side-quests': 'Side Quests'
    };
    
    const displayName = tabDisplayNames[tabName] || tabName;
    showNotification(`Switched to ${displayName} 💪`, 'info');
}

// Complete exercise with rep counting
function completeExercise(exerciseId, targetReps, points) {
    try {
        console.log('Completing exercise:', exerciseId, 'target:', targetReps, 'points:', points);
        
        // No authentication required - allow anyone to track workouts
        const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
        const input = document.getElementById(exerciseId);
        
        if (!input) {
            console.error('Input element not found for exercise:', exerciseId);
            showNotification('❌ Error: Exercise input not found!', 'error');
            return;
        }
        
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
            if (statusElement) statusElement.className = 'status completed';
        } else if (completedReps >= targetReps * 0.05) {
            // Partial completion (at least 5%)
            earnedPoints = Math.floor((completedReps / targetReps) * points);
            status = `⚠️ Partial (${Math.round((completedReps / targetReps) * 100)}%)`;
            if (statusElement) statusElement.className = 'status partial';
        } else {
            // Less than 5% - lose points as per rules
            earnedPoints = -points;
            status = '❌ Skipped - Points Lost!';
            if (statusElement) statusElement.className = 'status incomplete';
        }
        
        if (statusElement) {
            statusElement.textContent = status;
        }
        
        // Ensure userData exists
        if (!userData) {
            console.warn('userData not initialized, creating...');
            userData = {};
        }
        
        // Ensure user data exists
        if (!userData[userId]) {
            console.warn('User data not found, creating default for:', userId);
            userData[userId] = createDefaultUserData(currentAuthUser ? currentAuthUser.username : 'Workout User');
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
            userName: userData[userId].name
        });
        
        input.disabled = true;
        
        // Find and disable the complete button safely
        const button = document.getElementById(exerciseId).nextElementSibling;
        if (button) {
            button.disabled = true;
        } else {
            // Alternative method: find button by looking for onclick attribute
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.onclick && btn.onclick.toString().includes(exerciseId)) {
                    btn.disabled = true;
                    break;
                }
            }
        }
        
        // Update streak data when completing first exercise of the day
        updateStreakData();
        
        // Force immediate save
        saveData();
        
        // Update all displays
        updateDisplay();
        updateActivityFeed();
        updateProfileDisplay();
        checkAchievements(userId, earnedPoints);
        
        // Show points animation
        showPointsAnimation(earnedPoints);
        
        console.log(`Exercise ${exerciseId} completed. Points: ${earnedPoints}, User: ${userId}`);
        
    } catch (error) {
        console.error('Error completing exercise:', error);
        showNotification('❌ Error completing exercise: ' + error.message, 'error');
    }
}

// Complete simple exercise (checkbox-based)
function completeSimpleExercise(exerciseId, points) {
    try {
        console.log('Completing simple exercise:', exerciseId, 'points:', points);
        
        // No authentication required - allow anyone to track workouts
        const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
        const checkbox = document.getElementById(exerciseId);
        
        if (!checkbox) {
            console.error('Checkbox element not found for exercise:', exerciseId);
            showNotification('❌ Error: Exercise checkbox not found!', 'error');
            return;
        }
        
        if (!checkbox.checked) {
            showNotification('Please check the box to confirm completion!', 'error');
            return;
        }
        
        // Ensure userData exists
        if (!userData) {
            console.warn('userData not initialized, creating...');
            userData = {};
        }
        
        // Ensure user data exists
        if (!userData[userId]) {
            console.warn('User data not found, creating default for:', userId);
            userData[userId] = createDefaultUserData(currentAuthUser ? currentAuthUser.username : 'Workout User');
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
            userName: userData[userId].name
        });
        
        checkbox.disabled = true;
        
        // Find and disable the complete button safely
        const label = checkbox.nextElementSibling;
        if (label) {
            label.disabled = true;
        } else {
            // Alternative method: find label by looking for the checkbox
            const labels = document.querySelectorAll('label');
            for (let lbl of labels) {
                if (lbl.htmlFor === exerciseId) {
                    lbl.disabled = true;
                    break;
                }
            }
        }
        
        // Update streak data when completing first exercise of the day
        updateStreakData();
        
        // Force immediate save
        saveData();
        
        // Update all displays
        updateDisplay();
        updateActivityFeed();
        updateProfileDisplay();
        checkAchievements(userId, points);
        
        // Show points animation
        showPointsAnimation(points);
        
        console.log(`Simple exercise ${exerciseId} completed. Points: ${points}, User: ${userId}`);
        
    } catch (error) {
        console.error('Error completing simple exercise:', error);
        showNotification('❌ Error completing exercise: ' + error.message, 'error');
    }
}

// Complete full workout
function completeFullWorkout(workoutType, totalPoints) {
    const confirmation = confirm(`Complete the full ${workoutType} workout for ${totalPoints} points?`);
    if (!confirmation) return;
    
    const userId = currentAuthUser ? currentAuthUser.id : (currentUser || 'guest-user');
    
    // Ensure user data exists
    if (!userData[userId]) {
        userData[userId] = {
            name: currentAuthUser ? currentAuthUser.username : 'Workout User',
            totalPoints: 0,
            todayPoints: 0,
            completedExercises: {},
            workoutHistory: [],
            workoutDays: 1,
            lastWorkoutDate: getCurrentDate()
        };
    }
    
    addPoints(totalPoints, userId);
    
    // Mark full workout as completed
    userData[userId].completedExercises[workoutType + '-full'] = {
        completed: true,
        points: totalPoints,
        date: getCurrentDate()
    };
    
    // Add to workout history
    userData[userId].workoutHistory.push({
        exercise: workoutType + ' Full Workout',
        points: totalPoints,
        date: new Date().toISOString(),
        userName: userData[userId].name
    });
    
    saveData();
    updateDisplay();
    checkAchievements(userId, totalPoints);
    
    // Show points animation
    showPointsAnimation(totalPoints);
    
    alert(`Congratulations! You completed the full ${workoutType} workout and earned ${totalPoints} points!`);
}

// Apply negative points
function applyNegativePoints(type, points) {
    const confirmMessage = `Apply -${points} points for ${type}?`;
    if (!confirm(confirmMessage)) return;
    
    const userId = currentAuthUser ? currentAuthUser.id : (currentUser || 'guest-user');
    
    addPoints(-points, userId);
    
    // Add to workout history
    userData[userId].workoutHistory.push({
        exercise: `Penalty: ${type}`,
        points: -points,
        date: new Date().toISOString(),
        userName: userData[userId].name
    });
    
    saveData();
    updateDisplay();
    
    // Show points animation
    showPointsAnimation(-points);
}

// Add points to current user
function addPoints(points, userId = null) {
    if (!userId) {
        userId = currentAuthUser ? currentAuthUser.id : (currentUser || 'guest-user');
    }
    
    if (!userData[userId]) {
        userData[userId] = {
            name: currentAuthUser ? currentAuthUser.username : 'Workout User',
            totalPoints: 0,
            todayPoints: 0,
            completedExercises: {},
            workoutHistory: [],
            workoutDays: 1,
            lastWorkoutDate: getCurrentDate()
        };
    }
    
    userData[userId].totalPoints += points;
    userData[userId].todayPoints += points;
    
    // Ensure points don't go below 0
    if (userData[userId].totalPoints < 0) {
        userData[userId].totalPoints = 0;
    }
}

// Update display
function updateDisplay() {
    const userId = currentAuthUser ? currentAuthUser.id : (currentUser || 'guest-user');
    
    // Ensure user data exists
    if (!userData[userId]) {
        userData[userId] = createDefaultUserData(currentAuthUser ? currentAuthUser.username : 'Workout User');
    }
    
    document.getElementById('total-points').textContent = userData[userId].totalPoints;
    document.getElementById('today-points').textContent = userData[userId].todayPoints;
    
    // Update day tracker
    updateDayTracker(userId);
    
    // Update exercise status based on completed exercises
    updateExerciseStatus();
    
    // Update activity feed
    updateActivityFeed();
    
    // Update profile display
    updateProfileDisplay();
}

// Update day tracker
function updateDayTracker(userId) {
    const user = userData[userId];
    if (!user) return;
    
    const currentDayElement = document.getElementById('current-day');
    const streakElement = document.getElementById('workout-streak');
    
    if (currentDayElement) {
        currentDayElement.textContent = user.workoutDays || 1;
    }
    
    if (streakElement) {
        const streak = calculateWorkoutStreak(userId);
        streakElement.textContent = streak;
    }
}

// Calculate workout streak
function calculateWorkoutStreak(userId) {
    const user = userData[userId];
    if (!user) return 0;
    
    // Use new streak data if available
    if (user.streakData && user.streakData.workoutDates) {
        return calculateCurrentStreak(user.streakData.workoutDates);
    }
    
    // Fall back to old method for backward compatibility
    if (!user.workoutHistory) return 0;
    
    // Get unique workout dates
    const workoutDates = [...new Set(user.workoutHistory.map(workout => 
        new Date(workout.date).toISOString().split('T')[0]
    ))].sort().reverse();
    
    if (workoutDates.length === 0) return 0;
    
    let streak = 1;
    const today = new Date();
    
    // Check if user worked out today or yesterday
    const mostRecentDate = new Date(workoutDates[0]);
    const daysDiff = Math.floor((today - mostRecentDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 1) return 0; // Streak broken
    
    // Count consecutive days
    for (let i = 1; i < workoutDates.length; i++) {
        const prevDate = new Date(workoutDates[i-1]);
        const currDate = new Date(workoutDates[i]);
        const diff = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
        
        if (diff === 1) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// Go to new day function
function goToNewDay() {
    const confirmation = confirm('🌅 Start a new workout day?\n\nThis will:\n• Reset today\'s points to 0\n• Clear today\'s completed exercises\n• Increase your day counter\n• Take you back to workout selection\n\nYour total points, streak, and history will be saved!');
    
    if (!confirmation) return;
    
    const userId = currentAuthUser ? currentAuthUser.id : (currentUser || 'guest-user');
    
    if (!userData[userId]) {
        userData[userId] = createDefaultUserData(currentAuthUser ? currentAuthUser.username : 'Workout User');
    }
    
    // Store current streak data before reset
    const currentStreakData = userData[userId].streakData ? {...userData[userId].streakData} : null;
    
    // Reset today's progress
    userData[userId].todayPoints = 0;
    userData[userId].completedExercises = {};
    userData[userId].workoutDays = (userData[userId].workoutDays || 1) + 1;
    userData[userId].lastWorkoutDate = getCurrentDate();
    
    // Preserve streak data
    if (currentStreakData) {
        userData[userId].streakData = currentStreakData;
    }
    
    // Reset workout selection
    selectedWorkouts.clear();
    
    // Save progress immediately
    saveData();
    
    // Hide main app and show workout selection
    const workoutSelection = document.getElementById('workout-selection');
    const appContent = document.getElementById('app-content');
    const workoutTabs = document.getElementById('workout-tabs');
    const workoutControlsSelection = document.getElementById('workout-controls-selection');
    
    if (workoutSelection) {
        workoutSelection.style.display = 'block';
    }
    
    if (appContent) {
        appContent.classList.add('hidden');
        appContent.style.display = 'none';
    }
    
    if (workoutTabs) {
        workoutTabs.classList.add('hidden');
        workoutTabs.style.display = 'none';
    }
    
    if (workoutControlsSelection) {
        workoutControlsSelection.style.display = 'none';
    }
    
    // Hide all workout tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    
    // Reset workout selection UI
    const workoutCheckboxes = document.querySelectorAll('.workout-checkbox');
    workoutCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.disabled = false;
        checkbox.parentElement.style.opacity = '1';
    });
    
    // Reset all exercise inputs and statuses
    resetAllExerciseInputs();
    
    // Update selection count
    updateWorkoutSelection();
    
    // Update displays to show preserved streak
    updateDisplay();
    updateProfileDisplay();
    
    showNotification(`🌅 Welcome to Day ${userData[userId].workoutDays}! Choose your workouts for today.`, 'success');
    
    console.log('New day started. User data:', userData[userId]);
}

// Save progress function
function saveProgress() {
    try {
        // Ensure userData exists and user is initialized
        const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
        
        if (!userData) {
            userData = {};
        }
        
        if (!userData[userId]) {
            userData[userId] = createDefaultUserData(currentAuthUser ? currentAuthUser.username : 'Workout User');
        }
        
        // Force immediate save
        const saveResult = saveData();
        
        if (saveResult === false) {
            throw new Error('Save operation failed');
        }
        
        // Update streak data to ensure it's current
        if (userData[userId].streakData && userData[userId].streakData.workoutDates) {
            const streak = calculateCurrentStreak(userData[userId].streakData.workoutDates);
            userData[userId].streakData.currentStreak = streak;
        }
        
        // Save again after streak update
        saveData();
        
        // Update all displays
        updateDisplay();
        updateProfileDisplay();
        updateActivityFeed();
        
        showNotification('💾 Progress saved successfully!', 'success');
        
        // Log current state for debugging
        console.log('Progress saved. Current user data:', userData[userId]);
        
    } catch (error) {
        console.error('Error saving progress:', error);
        showNotification('❌ Error saving progress: ' + error.message, 'error');
    }
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
    } else if (isRealtimeChatEnabled) {
        statusIndicator.textContent = `💬 Live Chat • Room: ${roomCode}`;
        statusIndicator.style.backgroundColor = '#bee3f8';
        statusIndicator.style.color = '#2b6cb0';
    } else {
        statusIndicator.textContent = `📱 Local Room: ${roomCode}`;
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
            updateActivityFeed();
            showNotification('Data synced with GitHub!', 'success');
        } else {
            // Reload from localStorage
            loadFromLocalStorage();
            updateDisplay();
            updateActivityFeed();
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
        // Stop previous PubNub listener
        if (isRealtimeChatEnabled) {
            stopPubNubChatListener();
        }
        
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
        
        // Load chat for new room and setup real-time listener
        loadChatMessages();
        if (isRealtimeChatEnabled) {
            setupPubNubChatListener();
        }
        
        // Send welcome message
        sendSystemMessage(`Welcome to room ${roomCode}! Share this code with friends to workout together.`);
        
        updateRoomDisplay();
        updateDisplay();
        updateActivityFeed();
        showNotification(`Created new room: ${roomCode}`, 'success');
    }
}

function joinWorkoutRoom() {
    const roomCode = prompt('Enter room code:');
    if (roomCode && roomCode.length === 6) {
        if (joinRoom(roomCode.toUpperCase())) {
            // Stop previous PubNub listener
            if (isRealtimeChatEnabled) {
                stopPubNubChatListener();
            }
            
            loadData();
            loadChatMessages();
            
            // Setup real-time listener for the new room
            if (isRealtimeChatEnabled) {
                setupPubNubChatListener();
            }
            
            // Send join message
            if (currentAuthUser) {
                sendSystemMessage(`${currentAuthUser.username} joined the room! 👋`);
            }
            
            updateRoomDisplay();
            updateDisplay();
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

// Reset all progress function
function resetAllProgress() {
    const confirmation = confirm('⚠️ Are you sure you want to reset EVERYTHING? This will:\n\n• Clear all workout progress\n• Reset all points to zero\n• Clear workout history\n• Reset achievements\n• Reset profile data\n• Clear custom images\n• Return to workout selection\n\nThis action cannot be undone!');
    
    if (!confirmation) return;
    
    // Second confirmation for safety
    const finalConfirmation = confirm('🚨 FINAL WARNING: This will completely reset your progress AND profile. Are you absolutely sure?');
    
    if (!finalConfirmation) return;
    
    try {
        // Clear all localStorage data completely
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn('Could not remove key:', key, e);
            }
        });
        
        // Reset global variables completely
        userData = {};
        achievements = {};
        selectedWorkouts = new Set();
        currentAuthUser = null;
        currentUser = 'guest-user';
        customAvatarImage = null;
        selectedAvatarForModal = '👤';
        
        // Reset timer variables
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timerStartTime = null;
        timerElapsedTime = 0;
        timerPaused = false;
        
        // Reset image editor variables
        originalImage = null;
        editedImage = null;
        currentImageData = null;
        cropMode = false;
        imageRotation = 0;
        imageFlipH = false;
        imageFlipV = false;
        
        // Reset filter values
        currentFilters = {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            invert: 0
        };
        
        // Initialize fresh default data
        initializeDefaultData();
        
        // Reset all UI elements
        resetAllUIElements();
        
        // Hide main app content and show workout selection
        showWorkoutSelectionOnly();
        
        // Reset workout selection checkboxes
        const workoutCheckboxes = document.querySelectorAll('.workout-checkbox');
        workoutCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.disabled = false;
            checkbox.parentElement.style.opacity = '1';
        });
        
        // Reset selected count
        updateWorkoutSelection();
        
        // Reset all exercise inputs and statuses
        resetAllExerciseInputs();
        
        // Reset profile display
        updateProfileDisplay();
        
        // Close any open modals
        closeProfileModal();
        hideImageEditor();
        
        // Reset tab displays
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active');
        });
        
        // Reset timer display
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.textContent = '00:00:00';
            timerDisplay.classList.remove('active');
        }
        
        // Reset workout status
        const workoutStatus = document.getElementById('workout-status');
        const startWorkoutBtn = document.getElementById('start-workout-btn');
        const workoutTimer = document.getElementById('workout-timer');
        
        if (workoutStatus) workoutStatus.classList.add('hidden');
        if (startWorkoutBtn) startWorkoutBtn.style.display = 'block';
        if (workoutTimer) {
            workoutTimer.classList.add('hidden');
            workoutTimer.classList.remove('active');
        }
        
        // Clear activity feed
        const activityFeed = document.getElementById('activity-feed');
        if (activityFeed) {
            activityFeed.innerHTML = '<div class="activity-item">No recent activity</div>';
        }
        
        // Clear any custom avatar displays
        const avatarOptions = document.querySelectorAll('.avatar-option.custom-image');
        avatarOptions.forEach(option => {
            if (!option.classList.contains('custom-image-option')) {
                option.remove();
            }
        });
        
        // Reset file inputs
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => input.value = '');
        
        // Show success notification
        showNotification('🔄 Everything has been completely reset! Starting fresh...', 'success');
        
        console.log('🔄 Complete reset performed - everything cleared');
        
        // Force a page refresh to ensure everything is clean
        setTimeout(() => {
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error during reset:', error);
        showNotification('❌ Error during reset. Refreshing page...', 'error');
        setTimeout(() => {
            location.reload();
        }, 2000);
    }
}

// Helper function to reset all UI elements
function resetAllUIElements() {
    // Reset points displays
    const totalPoints = document.getElementById('total-points');
    const todayPoints = document.getElementById('today-points');
    const profileTotalPoints = document.getElementById('profile-total-points');
    const profileWorkoutsCompleted = document.getElementById('profile-workouts-completed');
    const profileCurrentStreak = document.getElementById('profile-current-streak');
    
    if (totalPoints) totalPoints.textContent = '0';
    if (todayPoints) todayPoints.textContent = '0';
    if (profileTotalPoints) profileTotalPoints.textContent = '0';
    if (profileWorkoutsCompleted) profileWorkoutsCompleted.textContent = '0';
    if (profileCurrentStreak) profileCurrentStreak.textContent = '0';
    
    // Reset profile display
    const profileAvatar = document.getElementById('profile-avatar');
    const profileName = document.getElementById('profile-name');
    
    if (profileAvatar) {
        profileAvatar.style.backgroundImage = '';
        profileAvatar.classList.remove('custom-image');
        profileAvatar.textContent = '👤';
    }
    
    if (profileName) {
        profileName.textContent = 'Workout User';
    }
    
    // Reset day tracker
    const currentDay = document.getElementById('current-day');
    const workoutStreak = document.getElementById('workout-streak');
    
    if (currentDay) currentDay.textContent = '1';
    if (workoutStreak) workoutStreak.textContent = '0';
    
    // Reset profile form inputs
    const profileNameInput = document.getElementById('profile-name-input');
    if (profileNameInput) profileNameInput.value = 'Workout User';
    
    // Reset avatar selection
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.getAttribute('data-avatar') === '👤') {
            option.classList.add('selected');
        }
    });
}

// Helper function to reset all exercise inputs and statuses
function resetAllExerciseInputs() {
    // Reset all number inputs
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.value = '';
        input.disabled = false;
    });
    
    // Reset all checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(.workout-checkbox)');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.disabled = false;
    });
    
    // Reset all status displays
    const statusElements = document.querySelectorAll('.status');
    statusElements.forEach(status => {
        status.textContent = '';
        status.className = 'status';
    });
    
    // Reset all exercise buttons
    const exerciseButtons = document.querySelectorAll('.exercise-card button');
    exerciseButtons.forEach(button => {
        button.disabled = false;
    });
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
    
    // Stop Firebase chat listener when not authenticated
    if (isRealtimeChatEnabled) {
        stopFirebaseChatListener();
    }
    
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
    
    // Start chat polling for real-time updates (fallback for local storage)
    if (!isRealtimeChatEnabled) {
        startChatPolling();
    }
    
    // Update all displays
    updateRoomDisplay();
    updateDisplay();
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
    
    // Show and activate timer
    const timer = document.getElementById('workout-timer');
    if (timer) {
        timer.classList.remove('hidden');
        timer.classList.add('active');
        
        // Update timer info
        const timerInfo = document.getElementById('timer-info');
        if (timerInfo) {
            timerInfo.textContent = 'Workout timer ready! Click start to begin timing.';
            timerInfo.classList.add('active');
        }
    }
    
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
    
    // Add to chat (if authenticated)
    if (currentAuthUser) {
        sendSystemMessage(`${currentAuthUser.username} started working out! 💪`);
    }
    
    showNotification('Workout started! Use the timer to track your session! 💪', 'success');
}

function endWorkout() {
    if (!workoutInProgress) return;
    
    const duration = Math.round((new Date() - workoutStartTime) / 1000 / 60); // minutes
    workoutInProgress = false;
    workoutStartTime = null;
    
    // Stop timer if running
    stopTimer();
    
    // Update UI
    document.getElementById('start-workout-btn').style.display = 'block';
    document.getElementById('workout-status').classList.add('hidden');
    
    // Hide timer
    const timer = document.getElementById('workout-timer');
    if (timer) {
        timer.classList.add('hidden');
        timer.classList.remove('active');
    }
    
    // Update streak data
    updateStreakData();
    
    // Add to chat (if authenticated)
    if (currentAuthUser) {
        sendSystemMessage(`${currentAuthUser.username} finished their workout! (${duration} minutes) 🎉`);
    }
    
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
        type: 'user',
        roomCode: getCurrentRoom()
    };
    
    // Try Firebase first, fallback to localStorage
    if (firebaseDatabase) {
        sendMessageToFirebase(messageData);
    } else {
        addMessageToChat(messageData);
        saveChatMessage(messageData);
        triggerCrossTabChatUpdate();
    }
    
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
        type: 'system',
        roomCode: getCurrentRoom()
    };
    
    // Try Firebase first, fallback to localStorage
    if (firebaseDatabase) {
        sendMessageToFirebase(messageData);
    } else {
        addMessageToChat(messageData);
        saveChatMessage(messageData);
        triggerCrossTabChatUpdate();
    }
}

// Firebase real-time chat functions
function sendMessageToFirebase(messageData) {
    if (!firebaseDatabase) {
        console.warn('Firebase not available, falling back to localStorage');
        addMessageToChat(messageData);
        saveChatMessage(messageData);
        triggerCrossTabChatUpdate();
        return;
    }
    
    const roomCode = getCurrentRoom();
    const chatRef = firebaseDatabase.ref(`chats/${roomCode}/messages`);
    
    // Push message to Firebase
    chatRef.push(messageData).then(() => {
        console.log('💬 Message sent to Firebase');
    }).catch((error) => {
        console.error('Error sending message to Firebase:', error);
        // Fallback to localStorage
        addMessageToChat(messageData);
        saveChatMessage(messageData);
        triggerCrossTabChatUpdate();
    });
}

function setupFirebaseChatListener() {
    if (!firebaseDatabase) {
        console.warn('Firebase not available, using localStorage chat');
        setupCrossTabChatListener();
        return;
    }
    
    const roomCode = getCurrentRoom();
    const chatRef = firebaseDatabase.ref(`chats/${roomCode}/messages`);
    
    // Remove existing listener
    if (chatListener) {
        chatListener.off();
    }
    
    // Listen for new messages
    chatListener = chatRef.on('child_added', (snapshot) => {
        const messageData = snapshot.val();
        if (messageData && messageData.roomCode === roomCode) {
            // Check if message is not from current user to avoid duplicates
            if (messageData.userId !== currentAuthUser?.id || 
                messageData.type === 'system') {
                addMessageToChat(messageData);
            }
        }
    });
    
    console.log(`🔥 Listening for real-time messages in room: ${roomCode}`);
}

function stopFirebaseChatListener() {
    if (chatListener && firebaseDatabase) {
        chatListener.off();
        chatListener = null;
        console.log('🔥 Stopped Firebase chat listener');
    }
}

function loadFirebaseChatHistory() {
    if (!firebaseDatabase) {
        console.warn('Firebase not available, loading local chat history');
        loadChatMessages();
        return;
    }
    
    const roomCode = getCurrentRoom();
    const chatRef = firebaseDatabase.ref(`chats/${roomCode}/messages`);
    
    // Load recent messages (last 50)
    chatRef.limitToLast(50).once('value').then((snapshot) => {
        const chatMessagesContainer = document.getElementById('chat-messages');
        if (!chatMessagesContainer) return;
        
        chatMessagesContainer.innerHTML = '';
        
        snapshot.forEach((childSnapshot) => {
            const messageData = childSnapshot.val();
            if (messageData && messageData.roomCode === roomCode) {
                addMessageToChat(messageData);
            }
        });
        
        console.log('🔥 Loaded chat history from Firebase');
    }).catch((error) => {
        console.error('Error loading chat history from Firebase:', error);
        // Fallback to local storage
        loadChatMessages();
    });
}

// Cross-tab real-time chat using localStorage events
function setupCrossTabChatListener() {
    window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith('chat-update-')) {
            const roomCode = getCurrentRoom();
            if (event.key === `chat-update-${roomCode}`) {
                // Reload chat messages when another tab sends a message
                setTimeout(() => {
                    loadChatMessages();
                }, 100);
            }
        }
        
        if (event.key && event.key.startsWith('workout-data-')) {
            // Also listen for workout data changes for leaderboard updates
            checkForLeaderboardUpdates();
        }
    });
    
    console.log('Cross-tab chat listener set up');
}

function triggerCrossTabChatUpdate() {
    const roomCode = getCurrentRoom();
    const updateKey = `chat-update-${roomCode}`;
    
    // Set a temporary value to trigger storage event in other tabs
    localStorage.setItem(updateKey, Date.now().toString());
    
    // Remove it immediately (we just need to trigger the event)
    setTimeout(() => {
        localStorage.removeItem(updateKey);
    }, 100);
}

function setupPubNubChatListener() {
    // For localStorage-based system, this is handled by setupCrossTabChatListener
    console.log('Using cross-tab localStorage chat system');
}

function stopPubNubChatListener() {
    // No need to stop localStorage events
    console.log('Cross-tab chat continues running');
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
    // Use PubNub if available, otherwise use local storage
    if (isRealtimeChatEnabled) {
        loadPubNubChatHistory();
    } else {
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
    initializeWorkoutSelection();
});

// Workout Selection Functionality
function initializeWorkoutSelection() {
    const workoutCheckboxes = document.querySelectorAll('.workout-checkbox');
    const selectedCountElement = document.getElementById('selected-count');
    const startButton = document.getElementById('start-selected-workouts');
    
    // Add event listeners to checkboxes
    workoutCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateWorkoutSelection();
            updateWorkoutPreview();
        });
    });
    
    // Add event listener to start button
    if (startButton) {
        startButton.addEventListener('click', startSelectedWorkouts);
    }
    
    // Initialize workout selection tabs
    initializeWorkoutSelectionTabs();
}

function initializeWorkoutSelectionTabs() {
    const tabButtons = document.querySelectorAll('.workout-tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            switchWorkoutSelectionTab(targetTab);
        });
    });
}

function switchWorkoutSelectionTab(tabName) {
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.workout-tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Hide all tab content
    const tabContents = document.querySelectorAll('.workout-tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Activate selected tab button
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Show selected tab content
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
}

function updateWorkoutPreview() {
    const previewContainer = document.getElementById('selected-workouts-preview');
    const previewMessage = document.querySelector('.preview-message');
    
    if (!previewContainer || !previewMessage) return;
    
    // Clear existing preview
    previewContainer.innerHTML = '';
    
    if (selectedWorkouts.size === 0) {
        previewMessage.style.display = 'block';
        return;
    }
    
    previewMessage.style.display = 'none';
    
    // Workout data for preview
    const workoutData = {
        'select-main-workout': {
            title: '💪 Main Workout',
            points: '1,720 points',
            exercises: ['Pushups (30 reps)', 'Jump Squats (120 reps)', 'Plank (2 minutes)', 'Knee Pushups (120 reps)', 'Situps (150 reps)', 'Jumping Jacks (400 reps)']
        },
        'select-second-workout': {
            title: '🔥 2nd Workout',
            points: '2,990 points',
            exercises: ['Pushups (15 reps)', 'Plank (3 minutes)', 'Burpees (50 reps)', 'Normal Squats (40 reps)']
        },
        'select-mobility-workout': {
            title: '🧘 Mobility & Stretching',
            points: '440 points',
            exercises: ['Warm-up exercises', 'Mobility work', 'Activation exercises', 'Cool-down stretches']
        },
        'select-basic-exercises': {
            title: '🏃 Basic Exercises',
            points: '530 points',
            exercises: ['Normal Squats (40 reps)', 'Jumping Jacks (50 reps)', 'Calf Raises (50 reps)', 'Glute Bridges (25 reps)', 'High Knees (60 seconds)', 'Butt Kicks (60 seconds)']
        },
        'select-elite-challenges': {
            title: '⚡ Elite Challenges',
            points: '20,800 points',
            exercises: ['Burpees (50 reps)', '5k Run', '100 Push-ups', 'Murph Prep', 'Handstand Hold (60 seconds)', 'Muscle-up (1 rep)']
        },
        'select-workout-quests': {
            title: '🎯 Workout Quests',
            points: '1,675 points',
            exercises: ['Push-ups (15 reps)', 'Lunges (20 reps each leg)', 'Crunches (30 reps)', 'Leg Raises (25 reps)', 'Tricep Dips (15 reps)', 'Pike Push-ups (10 reps)']
        }
    };
    
    // Create preview cards for selected workouts
    selectedWorkouts.forEach(workoutId => {
        const workout = workoutData[workoutId];
        if (workout) {
            const previewCard = document.createElement('div');
            previewCard.className = 'workout-preview-card';
            
            previewCard.innerHTML = `
                <h4>${workout.title}</h4>
                <p>${workout.points}</p>
                <div class="preview-exercises">
                    <h5>Exercises:</h5>
                    <ul>
                        ${workout.exercises.map(exercise => `<li>${exercise}</li>`).join('')}
                    </ul>
                </div>
            `;
            
            previewContainer.appendChild(previewCard);
        }
    });
}

function updateWorkoutSelection() {
    const workoutCheckboxes = document.querySelectorAll('.workout-checkbox:checked');
    const selectedCountElement = document.getElementById('selected-count');
    const startButton = document.getElementById('start-selected-workouts');
    
    // Update selected workouts set
    selectedWorkouts.clear();
    workoutCheckboxes.forEach(checkbox => {
        selectedWorkouts.add(checkbox.id);
    });
    
    // Update count display
    if (selectedCountElement) {
        selectedCountElement.textContent = selectedWorkouts.size;
        
        // Change color based on selection count
        if (selectedWorkouts.size === 0) {
            selectedCountElement.style.color = '#a0aec0';
        } else if (selectedWorkouts.size <= MAX_WORKOUT_SELECTION) {
            selectedCountElement.style.color = '#38a169';
        } else {
            selectedCountElement.style.color = '#e53e3e';
        }
    }
    
    // Enable/disable start button
    if (startButton) {
        if (selectedWorkouts.size > 0 && selectedWorkouts.size <= MAX_WORKOUT_SELECTION) {
            startButton.disabled = false;
        } else {
            startButton.disabled = true;
        }
    }
    
    // Disable checkboxes if max selection reached
    const allCheckboxes = document.querySelectorAll('.workout-checkbox');
    allCheckboxes.forEach(checkbox => {
        if (!checkbox.checked && selectedWorkouts.size >= MAX_WORKOUT_SELECTION) {
            checkbox.disabled = true;
            checkbox.parentElement.style.opacity = '0.5';
        } else {
            checkbox.disabled = false;
            checkbox.parentElement.style.opacity = '1';
        }
    });
}

function startSelectedWorkouts() {
    if (selectedWorkouts.size === 0) {
        showNotification('Please select at least one workout!', 'error');
        return;
    }
    
    if (selectedWorkouts.size > MAX_WORKOUT_SELECTION) {
        showNotification(`You can only select up to ${MAX_WORKOUT_SELECTION} workouts!`, 'error');
        return;
    }
    
    // Hide workout selection and show main app
    const workoutSelection = document.getElementById('workout-selection');
    const appContent = document.getElementById('app-content');
    const workoutTabs = document.getElementById('workout-tabs');
    const workoutControlsSelection = document.getElementById('workout-controls-selection');
    
    if (workoutSelection) {
        workoutSelection.style.display = 'none';
    }
    
    if (appContent) {
        appContent.classList.remove('hidden');
        appContent.style.display = 'block';
    }
    
    if (workoutTabs) {
        workoutTabs.classList.remove('hidden');
        workoutTabs.style.display = 'flex';
    }
    
    // Show workout controls in selection area
    if (workoutControlsSelection) {
        workoutControlsSelection.style.display = 'block';
    }
    
    // Show only selected workout tabs
    showSelectedWorkoutTabs();
    
    // Show success notification
    const workoutCount = selectedWorkouts.size;
    showNotification(`🎯 ${workoutCount} workout${workoutCount > 1 ? 's' : ''} selected! Let's get started!`, 'success');
    
    // Initialize the app without requiring authentication
    const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
    currentUser = userId;
    
    if (!userData[userId]) {
        userData[userId] = {
            name: currentAuthUser ? currentAuthUser.username : 'Workout User',
            totalPoints: 0,
            todayPoints: 0,
            completedExercises: {},
            workoutHistory: [],
            selectedWorkouts: Array.from(selectedWorkouts),
            workoutDays: 1,
            lastWorkoutDate: getCurrentDate()
        };
    }
    
    // Update display
    updateDisplay();
}

function showSelectedWorkoutTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Map checkbox IDs to tab IDs
    const workoutMapping = {
        'select-main-workout': 'main-workout',
        'select-second-workout': 'second-workout',
        'select-mobility-workout': 'mobility-workout',
        'select-basic-exercises': 'basic-exercises',
        'select-elite-challenges': 'elite-challenges',
        'select-workout-quests': 'workout-quests'
    };
    
    // Always show side quests
    const alwaysShow = ['side-quests'];
    
    // Hide all tabs first
    tabButtons.forEach(button => {
        button.style.display = 'none';
    });
    
    tabContents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    
    let firstVisibleTab = null;
    
    // Show selected workout tabs
    selectedWorkouts.forEach(workoutId => {
        const tabId = workoutMapping[workoutId];
        if (tabId) {
            // Show tab button
            const tabButton = document.querySelector(`[onclick="openTab(event, '${tabId}')"]`);
            if (tabButton) {
                tabButton.style.display = 'block';
                if (!firstVisibleTab) firstVisibleTab = { button: tabButton, id: tabId };
            }
            
            // Show tab content (but keep hidden until activated)
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                // Don't set display: block here, let openTab handle it
                tabContent.style.display = 'none';
            }
        }
    });
    
    // Always show side quests tab
    alwaysShow.forEach(tabId => {
        const tabButton = document.querySelector(`[onclick="openTab(event, '${tabId}')"]`);
        if (tabButton) {
            tabButton.style.display = 'block';
        }
        
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
            // Don't set display: block here, let openTab handle it
            tabContent.style.display = 'none';
        }
    });
    
    // Activate the first selected workout tab
    if (firstVisibleTab) {
        // Simulate a click on the first tab to properly activate it
        setTimeout(() => {
            if (firstVisibleTab.button) {
                console.log('Activating first tab:', firstVisibleTab.id);
                firstVisibleTab.button.click();
                showNotification(`Starting with ${firstVisibleTab.id.replace('-', ' ')} 💪`, 'info');
            }
        }, 100);
    } else {
        console.log('No visible tabs found');
    }
}

// Timer Functions
function startTimer() {
    if (timerInterval) return; // Already running
    
    timerStartTime = Date.now() - timerElapsedTime;
    timerPaused = false;
    
    timerInterval = setInterval(updateTimerDisplay, 100);
    
    // Update UI
    document.getElementById('timer-start-btn').classList.add('hidden');
    document.getElementById('timer-pause-btn').classList.remove('hidden');
    document.getElementById('timer-stop-btn').classList.remove('hidden');
    document.getElementById('timer-display').classList.add('active');
    
    const timerInfo = document.getElementById('timer-info');
    if (timerInfo) {
        timerInfo.textContent = '⏱️ Timer running - Stay focused!';
        timerInfo.classList.add('active');
    }
    
    showNotification('⏱️ Timer started!', 'success');
}

function pauseTimer() {
    if (!timerInterval) return;
    
    clearInterval(timerInterval);
    timerInterval = null;
    timerPaused = true;
    
    // Update UI
    document.getElementById('timer-start-btn').classList.remove('hidden');
    document.getElementById('timer-pause-btn').classList.add('hidden');
    document.getElementById('timer-display').classList.remove('active');
    
    const timerInfo = document.getElementById('timer-info');
    if (timerInfo) {
        timerInfo.textContent = '⏸️ Timer paused - Click start to continue';
        timerInfo.classList.remove('active');
    }
    
    showNotification('⏸️ Timer paused', 'info');
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const finalTime = timerElapsedTime;
    timerElapsedTime = 0;
    timerPaused = false;
    timerStartTime = null;
    
    // Update UI
    document.getElementById('timer-start-btn').classList.remove('hidden');
    document.getElementById('timer-pause-btn').classList.add('hidden');
    document.getElementById('timer-stop-btn').classList.add('hidden');
    document.getElementById('timer-display').classList.remove('active');
    document.getElementById('timer-display').textContent = '00:00:00';
    
    const timerInfo = document.getElementById('timer-info');
    if (timerInfo) {
        const minutes = Math.floor(finalTime / 60000);
        const seconds = Math.floor((finalTime % 60000) / 1000);
        timerInfo.textContent = `⏹️ Session completed: ${minutes}m ${seconds}s`;
        timerInfo.classList.remove('active');
    }
    
    if (finalTime > 0) {
        const minutes = Math.floor(finalTime / 60000);
        showNotification(`⏹️ Timer stopped! Session time: ${minutes}m ${Math.floor((finalTime % 60000) / 1000)}s`, 'success');
    }
}

function updateTimerDisplay() {
    if (!timerStartTime) return;
    
    timerElapsedTime = Date.now() - timerStartTime;
    
    const hours = Math.floor(timerElapsedTime / 3600000);
    const minutes = Math.floor((timerElapsedTime % 3600000) / 60000);
    const seconds = Math.floor((timerElapsedTime % 60000) / 1000);
    
    const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        timerDisplay.textContent = display;
    }
}

// Profile Functions
function openProfileModal() {
    console.log('Opening profile modal...');
    const modal = document.getElementById('profile-modal');
    if (!modal) {
        console.error('Profile modal not found');
        showNotification('Profile modal not available', 'error');
        return;
    }
    
    const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
    
    // Ensure user data exists
    if (!userData[userId]) {
        userData[userId] = createDefaultUserData('Workout User');
    }
    
    const user = userData[userId];
    
    // Populate form with current data
    const nameInput = document.getElementById('profile-name-input');
    if (nameInput) {
        nameInput.value = user.profile?.name || user.name || 'Workout User';
    }
    
    // Set current avatar as selected
    selectedAvatarForModal = user.profile?.avatar || '👤';
    
    // Handle custom images
    if (user.profile?.customImage) {
        customAvatarImage = user.profile.customImage;
        selectedAvatarForModal = 'custom-image';
        
        // Create or update custom avatar option
        let customOption = document.querySelector('.avatar-option[data-avatar="custom-image"]');
        if (!customOption) {
            customOption = document.createElement('div');
            customOption.className = 'avatar-option custom-image';
            customOption.setAttribute('data-avatar', 'custom-image');
            customOption.onclick = () => selectAvatar('custom-image');
            
            const avatarSelector = document.querySelector('.avatar-selector');
            if (avatarSelector) {
                avatarSelector.appendChild(customOption);
            }
        }
        
        customOption.style.backgroundImage = `url(${customAvatarImage})`;
        customOption.style.backgroundSize = 'cover';
        customOption.style.backgroundPosition = 'center';
        customOption.textContent = '';
    }
    
    updateAvatarSelection();
    
    // Show modal with animation
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    // Focus name input
    setTimeout(() => {
        if (nameInput) nameInput.focus();
    }, 300);
    
    console.log('Profile modal opened successfully');
}

function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.classList.remove('active');
        // Hide the modal after animation
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    // Hide image editor if it's open
    hideImageEditor();
}

// Add click outside to close modal
document.addEventListener('click', function(event) {
    const modal = document.getElementById('profile-modal');
    const modalContent = modal?.querySelector('.profile-modal-content');
    
    if (modal && modal.classList.contains('active') && 
        !modalContent?.contains(event.target) && 
        event.target !== modal) {
        closeProfileModal();
    }
});

function selectAvatar(emoji) {
    console.log('Selecting avatar:', emoji);
    selectedAvatarForModal = emoji;
    if (emoji !== 'custom-image') {
        customAvatarImage = null; // Clear custom image when selecting emoji
    }
    updateAvatarSelection();
    console.log('Avatar selection completed. Selected:', selectedAvatarForModal);
}

function selectCustomImage() {
    const input = document.getElementById('custom-avatar-input');
    if (input) {
        input.click();
    }
}

function handleCustomImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (limit to 10MB for editing)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('Image too large! Please choose an image under 10MB.', 'error');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file.', 'error');
        return;
    }
    
    // Show loading
    showImageEditorLoading(true);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        // Load image for editing
        loadImageForEditing(e.target.result);
    };
    
    reader.readAsDataURL(file);
}

function loadImageForEditing(imageSrc) {
    const img = new Image();
    img.onload = function() {
        originalImage = img;
        currentImageData = imageSrc;
        
        // Reset all editing state
        resetImageEditingState();
        
        // Show image editor
        showImageEditor();
        
        // Draw initial image on canvas
        drawImageOnCanvas();
        
        showImageEditorLoading(false);
        showNotification('Image loaded! Start editing your profile picture.', 'success');
    };
    
    img.onerror = function() {
        showImageEditorLoading(false);
        showNotification('Failed to load image. Please try another file.', 'error');
    };
    
    img.src = imageSrc;
}

function showImageEditor() {
    console.log('Showing image editor...');
    const editorSection = document.getElementById('image-editor-section');
    if (editorSection) {
        editorSection.style.display = 'block';
        editorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log('Image editor should now be visible');
    } else {
        console.error('Image editor section not found!');
    }
}

function hideImageEditor() {
    console.log('Hiding image editor...');
    const editorSection = document.getElementById('image-editor-section');
    if (editorSection) {
        editorSection.style.display = 'none';
        console.log('Image editor hidden');
    }
}

function resetImageEditingState() {
    // Reset transformation state
    imageRotation = 0;
    imageFlipH = false;
    imageFlipV = false;
    cropMode = false;
    
    // Reset filter values
    currentFilters = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        invert: 0
    };
    
    // Reset filter UI
    updateFilterUI();
    
    // Hide crop overlay
    const cropOverlay = document.getElementById('crop-overlay');
    if (cropOverlay) {
        cropOverlay.classList.remove('active');
    }
}

function updateFilterUI() {
    // Update slider values
    const sliders = {
        'brightness-slider': currentFilters.brightness,
        'contrast-slider': currentFilters.contrast,
        'saturation-slider': currentFilters.saturation,
        'blur-slider': currentFilters.blur
    };
    
    Object.entries(sliders).forEach(([id, value]) => {
        const slider = document.getElementById(id);
        if (slider) slider.value = value;
    });
    
    // Update display values
    const displays = {
        'brightness-value': currentFilters.brightness + '%',
        'contrast-value': currentFilters.contrast + '%',
        'saturation-value': currentFilters.saturation + '%',
        'blur-value': currentFilters.blur + 'px'
    };
    
    Object.entries(displays).forEach(([id, value]) => {
        const display = document.getElementById(id);
        if (display) display.textContent = value;
    });
}

function drawImageOnCanvas() {
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    
    if (!originalImage || !ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context state
    ctx.save();
    
    // Move to center for rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Apply rotation
    ctx.rotate((imageRotation * Math.PI) / 180);
    
    // Apply flipping
    ctx.scale(imageFlipH ? -1 : 1, imageFlipV ? -1 : 1);
    
    // Calculate image dimensions to fit canvas while maintaining aspect ratio
    const { width, height, x, y } = calculateFitDimensions(originalImage, canvas);
    
    // Draw image
    ctx.drawImage(originalImage, -width / 2, -height / 2, width, height);
    
    // Restore context state
    ctx.restore();
    
    // Apply filters
    applyFilters();
}

function calculateFitDimensions(img, canvas) {
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = img.width / img.height;
    
    let width, height;
    
    if (imageAspect > canvasAspect) {
        // Image is wider than canvas aspect ratio
        width = canvas.width * 0.9; // Leave some padding
        height = width / imageAspect;
    } else {
        // Image is taller than canvas aspect ratio
        height = canvas.height * 0.9; // Leave some padding
        width = height * imageAspect;
    }
    
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;
    
    return { width, height, x, y };
}

function applyFilters() {
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return;
    
    // Build CSS filter string
    const filterString = `
        brightness(${currentFilters.brightness}%)
        contrast(${currentFilters.contrast}%)
        saturate(${currentFilters.saturation}%)
        blur(${currentFilters.blur}px)
        grayscale(${currentFilters.grayscale}%)
        sepia(${currentFilters.sepia}%)
        invert(${currentFilters.invert}%)
    `.replace(/\s+/g, ' ').trim();
    
    canvas.style.filter = filterString;
    
    // Update filter value displays
    updateFilterUI();
}

function resetImage() {
    if (!originalImage) return;
    
    resetImageEditingState();
    drawImageOnCanvas();
    showNotification('Image reset to original!', 'success');
}

function rotateImage(degrees) {
    imageRotation = (imageRotation + degrees) % 360;
    drawImageOnCanvas();
    showNotification(`Image rotated ${degrees > 0 ? 'right' : 'left'}!`, 'success');
}

function flipImage(direction) {
    if (direction === 'horizontal') {
        imageFlipH = !imageFlipH;
        showNotification('Image flipped horizontally!', 'success');
    } else if (direction === 'vertical') {
        imageFlipV = !imageFlipV;
        showNotification('Image flipped vertically!', 'success');
    }
    drawImageOnCanvas();
}

function resizeImage(newWidth, newHeight) {
    const canvas = document.getElementById('editor-canvas');
    if (!canvas || !originalImage) return;
    
    // Update canvas size
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Redraw image
    drawImageOnCanvas();
    
    showNotification(`Image resized to ${newWidth}x${newHeight}!`, 'success');
}

function enableCropMode() {
    cropMode = !cropMode;
    const canvas = document.getElementById('editor-canvas');
    const cropOverlay = document.getElementById('crop-overlay');
    
    if (cropMode) {
        canvas.classList.add('crop-mode');
        setupCropListeners();
        showNotification('Crop mode enabled! Click and drag to select area.', 'info');
    } else {
        canvas.classList.remove('crop-mode');
        removeCropListeners();
        if (cropOverlay) cropOverlay.classList.remove('active');
        showNotification('Crop mode disabled.', 'info');
    }
}

function setupCropListeners() {
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', startCrop);
    canvas.addEventListener('mousemove', updateCrop);
    canvas.addEventListener('mouseup', endCrop);
}

function removeCropListeners() {
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return;
    
    canvas.removeEventListener('mousedown', startCrop);
    canvas.removeEventListener('mousemove', updateCrop);
    canvas.removeEventListener('mouseup', endCrop);
}

function startCrop(e) {
    if (!cropMode) return;
    
    const rect = e.target.getBoundingClientRect();
    cropStartX = e.clientX - rect.left;
    cropStartY = e.clientY - rect.top;
    isDragging = true;
    
    const cropOverlay = document.getElementById('crop-overlay');
    if (cropOverlay) {
        cropOverlay.style.left = cropStartX + 'px';
        cropOverlay.style.top = cropStartY + 'px';
        cropOverlay.style.width = '0px';
        cropOverlay.style.height = '0px';
        cropOverlay.classList.add('active');
    }
}

function updateCrop(e) {
    if (!cropMode || !isDragging) return;
    
    const rect = e.target.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const width = Math.abs(currentX - cropStartX);
    const height = Math.abs(currentY - cropStartY);
    const left = Math.min(currentX, cropStartX);
    const top = Math.min(currentY, cropStartY);
    
    const cropOverlay = document.getElementById('crop-overlay');
    if (cropOverlay) {
        cropOverlay.style.left = left + 'px';
        cropOverlay.style.top = top + 'px';
        cropOverlay.style.width = width + 'px';
        cropOverlay.style.height = height + 'px';
    }
}

function endCrop(e) {
    if (!cropMode || !isDragging) return;
    
    isDragging = false;
    
    const rect = e.target.getBoundingClientRect();
    cropEndX = e.clientX - rect.left;
    cropEndY = e.clientY - rect.top;
    
    // If crop area is too small, ignore
    const width = Math.abs(cropEndX - cropStartX);
    const height = Math.abs(cropEndY - cropStartY);
    
    if (width < 20 || height < 20) {
        const cropOverlay = document.getElementById('crop-overlay');
        if (cropOverlay) cropOverlay.classList.remove('active');
        showNotification('Crop area too small. Try again.', 'warning');
        return;
    }
    
    // Perform crop
    performCrop();
}

function performCrop() {
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    
    if (!canvas || !ctx || !originalImage) return;
    
    // Calculate crop coordinates
    const left = Math.min(cropStartX, cropEndX);
    const top = Math.min(cropStartY, cropEndY);
    const width = Math.abs(cropEndX - cropStartX);
    const height = Math.abs(cropEndY - cropStartY);
    
    // Get current canvas as image data
    const imageData = ctx.getImageData(left, top, width, height);
    
    // Create new canvas with cropped dimensions
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    const croppedCtx = croppedCanvas.getContext('2d');
    
    // Draw cropped image data
    croppedCtx.putImageData(imageData, 0, 0);
    
    // Convert to image and update original
    const croppedDataUrl = croppedCanvas.toDataURL('image/png');
    const img = new Image();
    img.onload = function() {
        originalImage = img;
        
        // Update canvas size to match crop
        canvas.width = width;
        canvas.height = height;
        
        // Redraw
        drawImageOnCanvas();
        
        // Disable crop mode
        cropMode = false;
        canvas.classList.remove('crop-mode');
        removeCropListeners();
        
        const cropOverlay = document.getElementById('crop-overlay');
        if (cropOverlay) cropOverlay.classList.remove('active');
        
        showNotification('Image cropped successfully!', 'success');
    };
    img.src = croppedDataUrl;
}

function applyPresetFilter(preset) {
    // Reset filters first
    currentFilters = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        invert: 0
    };
    
    // Apply preset
    switch (preset) {
        case 'grayscale':
            currentFilters.grayscale = 100;
            break;
        case 'sepia':
            currentFilters.sepia = 100;
            break;
        case 'invert':
            currentFilters.invert = 100;
            break;
        case 'none':
            // Already reset above
            break;
    }
    
    // Update UI and apply
    updateFilterUI();
    applyFilters();
    
    // Update filter button states
    updateFilterButtonStates(preset);
    
    showNotification(`${preset.charAt(0).toUpperCase() + preset.slice(1)} filter applied!`, 'success');
}

function updateFilterButtonStates(activePreset) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(activePreset)) {
            btn.classList.add('active');
        }
    });
}

function saveEditedImage() {
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) {
        showNotification('No image to save!', 'error');
        return;
    }
    
    // Show loading
    showImageEditorLoading(true, 'Saving your profile picture...');
    
    try {
        // Convert canvas to data URL with high quality
        const editedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Update custom avatar
        customAvatarImage = editedDataUrl;
        selectedAvatarForModal = 'custom-image';
        
        // Create or update custom avatar option in selector
        let customOption = document.querySelector('.avatar-option[data-avatar="custom-image"]');
        if (!customOption) {
            customOption = document.createElement('div');
            customOption.className = 'avatar-option custom-image';
            customOption.setAttribute('data-avatar', 'custom-image');
            customOption.onclick = () => selectAvatar('custom-image');
            
            const avatarSelector = document.querySelector('.avatar-selector');
            if (avatarSelector) {
                avatarSelector.appendChild(customOption);
            }
        }
        
        // Set the background image with proper styles
        customOption.style.backgroundImage = `url(${customAvatarImage})`;
        customOption.style.backgroundSize = 'cover';
        customOption.style.backgroundPosition = 'center';
        customOption.style.backgroundRepeat = 'no-repeat';
        customOption.textContent = '';
        
        // Update avatar selection
        updateAvatarSelection();
        
        // Hide image editor
        hideImageEditor();
        
        // Reset file input
        const fileInput = document.getElementById('custom-avatar-input');
        if (fileInput) fileInput.value = '';
        
        showImageEditorLoading(false);
        showNotification('✨ Profile picture edited successfully! Click "Save Profile" to apply.', 'success');
        
    } catch (error) {
        console.error('Error saving edited image:', error);
        showImageEditorLoading(false);
        showNotification('Failed to save edited image. Please try again.', 'error');
    }
}

function cancelImageEdit() {
    if (confirm('Are you sure you want to cancel editing? All changes will be lost.')) {
        hideImageEditor();
        
        // Reset file input
        const fileInput = document.getElementById('custom-avatar-input');
        if (fileInput) fileInput.value = '';
        
        showNotification('Image editing cancelled.', 'info');
    }
}

function showImageEditorLoading(show, message = 'Processing image...') {
    let loadingDiv = document.querySelector('.editor-loading');
    
    if (show) {
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.className = 'editor-loading';
            loadingDiv.innerHTML = `
                <div class="spinner"></div>
                <p>${message}</p>
            `;
            
            const editorPreview = document.querySelector('.editor-preview');
            if (editorPreview) {
                editorPreview.appendChild(loadingDiv);
            }
        } else {
            loadingDiv.querySelector('p').textContent = message;
            loadingDiv.style.display = 'block';
        }
    } else {
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }
}

// Event listeners for filter sliders
function setupFilterEventListeners() {
    // Brightness slider
    const brightnessSlider = document.getElementById('brightness-slider');
    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', function() {
            currentFilters.brightness = parseInt(this.value);
            document.getElementById('brightness-value').textContent = this.value + '%';
            applyFilters();
        });
    }
    
    // Contrast slider
    const contrastSlider = document.getElementById('contrast-slider');
    if (contrastSlider) {
        contrastSlider.addEventListener('input', function() {
            currentFilters.contrast = parseInt(this.value);
            document.getElementById('contrast-value').textContent = this.value + '%';
            applyFilters();
        });
    }
    
    // Saturation slider
    const saturationSlider = document.getElementById('saturation-slider');
    if (saturationSlider) {
        saturationSlider.addEventListener('input', function() {
            currentFilters.saturation = parseInt(this.value);
            document.getElementById('saturation-value').textContent = this.value + '%';
            applyFilters();
        });
    }
    
    // Blur slider
    const blurSlider = document.getElementById('blur-slider');
    if (blurSlider) {
        blurSlider.addEventListener('input', function() {
            currentFilters.blur = parseInt(this.value);
            document.getElementById('blur-value').textContent = this.value + 'px';
            applyFilters();
        });
    }
}

function applyCustomNegativePoints() {
    const amountInput = document.getElementById('custom-deduction-amount');
    const reasonInput = document.getElementById('custom-deduction-reason');
    
    const amount = parseInt(amountInput.value) || 0;
    const reason = reasonInput.value.trim();
    
    if (amount <= 0) {
        showNotification('Please enter a valid point amount to deduct!', 'error');
        return;
    }
    
    if (!reason) {
        showNotification('Please enter a reason for the deduction!', 'error');
        return;
    }
    
    const confirmMessage = `Apply -${amount} points for "${reason}"?`;
    if (!confirm(confirmMessage)) return;
    
    const userId = currentAuthUser ? currentAuthUser.id : (currentUser || 'guest-user');
    
    addPoints(-amount, userId);
    
    // Add to workout history
    if (!userData[userId]) {
        userData[userId] = createDefaultUserData(currentAuthUser ? currentAuthUser.username : 'Workout User');
    }
    
    userData[userId].workoutHistory.push({
        exercise: `Custom Penalty: ${reason}`,
        points: -amount,
        date: new Date().toISOString(),
        userName: userData[userId].name
    });
    
    // Clear inputs
    amountInput.value = '';
    reasonInput.value = '';
    
    saveData();
    updateDisplay();
    updateActivityFeed();
    
    // Show points animation
    showPointsAnimation(-amount);
    
    showNotification(`Applied -${amount} points for: ${reason}`, 'success');
}

function updateAvatarSelection() {
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
        option.classList.remove('selected');
        const avatarValue = option.getAttribute('data-avatar');
        if (avatarValue === selectedAvatarForModal) {
            option.classList.add('selected');
        }
    });
    
    console.log('Avatar selection updated. Selected:', selectedAvatarForModal);
}

function saveProfile() {
    const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
    const nameInput = document.getElementById('profile-name-input');
    const newName = nameInput ? nameInput.value.trim() : '';
    
    if (!newName) {
        showNotification('Please enter a name!', 'error');
        return;
    }
    
    // Update user data
    if (!userData[userId]) {
        userData[userId] = createDefaultUserData(newName);
    }
    
    if (!userData[userId].profile) {
        userData[userId].profile = {};
    }
    
    userData[userId].profile.name = newName;
    userData[userId].profile.avatar = selectedAvatarForModal;
    userData[userId].name = newName; // Keep backward compatibility
    
    // Save custom image if selected
    if (selectedAvatarForModal === 'custom-image' && customAvatarImage) {
        userData[userId].profile.customImage = customAvatarImage;
    } else if (selectedAvatarForModal !== 'custom-image') {
        // Clear custom image if not selected
        delete userData[userId].profile.customImage;
    }
    
    // Update displays
    updateProfileDisplay();
    updateDisplay();
    
    // Save data
    saveData();
    
    // Close modal
    closeProfileModal();
    
    showNotification('Profile updated! 👤', 'success');
}

function updateProfileDisplay() {
    const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
    const user = userData[userId];
    
    if (!user) return;
    
    // Update avatar
    const avatarDisplay = document.getElementById('profile-avatar');
    if (avatarDisplay) {
        const avatar = user.profile?.avatar || '👤';
        
        if (avatar === 'custom-image' && user.profile?.customImage) {
            // Display custom image
            avatarDisplay.style.backgroundImage = `url(${user.profile.customImage})`;
            avatarDisplay.style.backgroundSize = 'cover';
            avatarDisplay.style.backgroundPosition = 'center';
            avatarDisplay.style.backgroundRepeat = 'no-repeat';
            avatarDisplay.classList.add('custom-image');
            avatarDisplay.textContent = '';
        } else {
            // Display emoji
            avatarDisplay.style.backgroundImage = '';
            avatarDisplay.style.backgroundSize = '';
            avatarDisplay.style.backgroundPosition = '';
            avatarDisplay.style.backgroundRepeat = '';
            avatarDisplay.classList.remove('custom-image');
            avatarDisplay.textContent = avatar;
        }
    }
    
    // Update name
    const nameDisplay = document.getElementById('profile-name');
    if (nameDisplay) {
        nameDisplay.textContent = user.profile?.name || user.name || 'Workout User';
    }
    
    // Update stats
    const totalPointsDisplay = document.getElementById('profile-total-points');
    if (totalPointsDisplay) {
        totalPointsDisplay.textContent = user.totalPoints || 0;
    }
    
    const workoutsCompletedDisplay = document.getElementById('profile-workouts-completed');
    if (workoutsCompletedDisplay) {
        const completedWorkouts = Object.keys(user.completedExercises || {}).length;
        workoutsCompletedDisplay.textContent = completedWorkouts;
    }
    
    const currentStreakDisplay = document.getElementById('profile-current-streak');
    if (currentStreakDisplay) {
        const streak = user.streakData?.currentStreak || calculateWorkoutStreak(userId);
        currentStreakDisplay.textContent = streak;
    }
}

// Enhanced Streak Calculation Functions
function updateStreakData() {
    try {
        const userId = currentAuthUser ? currentAuthUser.id : 'guest-user';
        
        // Ensure userData exists
        if (!userData) {
            console.warn('userData not found, initializing...');
            userData = {};
        }
        
        if (!userData[userId]) {
            console.warn('User data not found for', userId, ', creating default...');
            userData[userId] = createDefaultUserData(currentAuthUser ? currentAuthUser.username : 'Workout User');
        }
        
        const user = userData[userId];
        const today = getCurrentDate();
        
        // Initialize streak data if it doesn't exist
        if (!user.streakData) {
            console.log('Initializing streak data for user', userId);
            user.streakData = {
                currentStreak: 0,
                longestStreak: 0,
                lastWorkoutDate: null,
                workoutDates: []
            };
        }
        
        // Check if user already worked out today
        if (user.streakData.workoutDates.includes(today)) {
            console.log('Already recorded workout for today:', today);
            
            // Still update current streak calculation in case it's incorrect
            const streak = calculateCurrentStreak(user.streakData.workoutDates);
            user.streakData.currentStreak = streak;
            
            // Update displays
            updateDisplay();
            updateProfileDisplay();
            return;
        }
        
        // Add today's workout
        user.streakData.workoutDates.push(today);
        user.streakData.workoutDates.sort();
        
        // Calculate current streak
        const streak = calculateCurrentStreak(user.streakData.workoutDates);
        user.streakData.currentStreak = streak;
        
        // Update longest streak
        if (streak > user.streakData.longestStreak) {
            user.streakData.longestStreak = streak;
            console.log('New longest streak record:', streak);
        }
        
        user.streakData.lastWorkoutDate = today;
        
        // Save data immediately and ensure it persists
        saveData();
        
        // Force update displays
        updateDisplay();
        updateProfileDisplay();
        
        // Show streak notification
        if (streak === 1) {
            showNotification(`🔥 Day 1 streak started! Keep going!`, 'success');
        } else if (streak > 1) {
            showNotification(`🔥 ${streak} day streak! Keep it up!`, 'success');
        }
        
        console.log(`Streak updated: ${streak} days for user ${userId}, workout dates:`, user.streakData.workoutDates);
        
    } catch (error) {
        console.error('Error updating streak data:', error);
        showNotification('⚠️ Error updating streak data: ' + error.message, 'warning');
    }
}

function calculateCurrentStreak(workoutDates) {
    if (!workoutDates || workoutDates.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const sortedDates = [...workoutDates].sort(); // Oldest first
    
    // Convert workout dates to Date objects and normalize to start of day
    const dateObjects = sortedDates.map(dateStr => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date;
    });
    
    // Remove duplicates
    const uniqueDates = dateObjects.filter((date, index, arr) => 
        index === 0 || date.getTime() !== arr[index - 1].getTime()
    );
    
    if (uniqueDates.length === 0) return 0;
    
    // Check if the most recent workout was today or yesterday
    const mostRecent = uniqueDates[uniqueDates.length - 1];
    const daysSinceLastWorkout = Math.floor((today - mostRecent) / (1000 * 60 * 60 * 24));
    
    // If last workout was more than 1 day ago, streak is broken
    if (daysSinceLastWorkout > 1) return 0;
    
    // Count consecutive days from most recent backwards
    let streak = 1;
    let expectedDate = new Date(mostRecent);
    
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
        expectedDate.setDate(expectedDate.getDate() - 1);
        const currentDate = uniqueDates[i];
        
        if (currentDate.getTime() === expectedDate.getTime()) {
            streak++;
        } else {
            break; // Gap found, stop counting
        }
    }
    
    console.log(`Calculated streak: ${streak} for dates:`, sortedDates);
    return streak;
}

function createDefaultUserData(name = 'Workout User') {
    return {
        name: name,
        totalPoints: 0,
        todayPoints: 0,
        completedExercises: {},
        workoutHistory: [],
        workoutDays: 1,
        lastWorkoutDate: getCurrentDate(),
        profile: {
            avatar: '👤',
            name: name,
            joinDate: getCurrentDate()
        },
        streakData: {
            currentStreak: 0,
            longestStreak: 0,
            lastWorkoutDate: null,
            workoutDates: []
        }
    };
}
