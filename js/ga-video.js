/**
 * GA4 Video Tracking Module for NYU Feed Video Study
 * Comprehensive video tracking with milestones, session reporting, and anti-pause logic
 */

// Video tracking configuration
const VIDEO_ID = 'nyu_feed_video_ad';
const MIN_WATCH_TIME_MS = 1000; // Minimum watch time to count as engagement

// Session state management
const sessionState = {
    isInitialized: false,
    isTrackingEnabled: false,
    hasStartedOnce: false,
    hasReportedFinalResults: false,
    
    // Video player reference
    videoElement: null,
    
    // Timing tracking
    totalWatchTimeSeconds: 0,
    currentPlayStartTime: null,
    duration: 0,
    maxWatched: 0,
    
    // Engagement tracking
    playCount: 0,
    completionCount: 0,
    milestonesReached: new Set(), // Track which milestones have been reached (25, 50, 75, 100)
    maxProgressReached: 0,
    
    // Mute state
    isMuted: true
};

/**
 * Initialize video tracking
 */
function initializeVideo() {
    console.log('🎬 Initializing video tracking for Feed Video Study');
    
    const videoElement = document.getElementById('nyuVideo');
    if (!videoElement) {
        console.error('❌ Video element not found');
        return;
    }
    
    sessionState.videoElement = videoElement;
    sessionState.isInitialized = true;
    
    // Wait for video metadata to load
    if (videoElement.readyState >= 1) {
        setupVideoTracking();
    } else {
        videoElement.addEventListener('loadedmetadata', setupVideoTracking);
    }
    
    // Setup page unload tracking
    setupUnloadTracking();
    
    console.log('✅ Video tracking initialized');
}

/**
 * Setup video event listeners and initial state
 */
function setupVideoTracking() {
    const video = sessionState.videoElement;
    if (!video) return;
    
    sessionState.duration = video.duration || 0;
    console.log(`📹 Video duration: ${sessionState.duration}s`);
    
    // Pause video initially (prevent autoplay until "Tap to Start")
    video.pause();
    video.muted = true;
    sessionState.isMuted = true;
    updateMuteIcon(true);
    
    // Video event listeners
    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);
    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('volumechange', handleVolumeChange);
    
    console.log('🎯 Video event listeners attached');
}

/**
 * Handle video play event
 */
function handleVideoPlay() {
    if (!sessionState.isTrackingEnabled) {
        // Prevent play before "Tap to Start"
        sessionState.videoElement.pause();
        return;
    }
    
    console.log('▶️ Video play started');
    
    sessionState.playCount++;
    sessionState.currentPlayStartTime = Date.now();
    
    if (!sessionState.hasStartedOnce) {
        sessionState.hasStartedOnce = true;
        
        // Track video start
        if (window.GALite && window.GALite.track) {
            window.GALite.track('video_start', {
                video_id: VIDEO_ID,
                video_duration: sessionState.duration,
                play_count: sessionState.playCount,
                study_id: 'instagram_feed_video_study'
            });
        }
        
        // Start milestone tracking
        setupMilestoneTracking();
    }
    
    // Track play event
    if (window.GALite && window.GALite.track) {
        window.GALite.track('video_play', {
            video_id: VIDEO_ID,
            current_time: sessionState.videoElement.currentTime,
            play_count: sessionState.playCount,
            is_replay: sessionState.playCount > 1,
            study_id: 'instagram_feed_video_study'
        });
    }
}

/**
 * Handle video pause event
 */
function handleVideoPause() {
    if (!sessionState.isTrackingEnabled || !sessionState.currentPlayStartTime) return;
    
    console.log('⏸️ Video paused');
    
    // Calculate watch time for this play session
    const watchTimeMs = Date.now() - sessionState.currentPlayStartTime;
    sessionState.totalWatchTimeSeconds += Math.max(0, watchTimeMs / 1000);
    sessionState.currentPlayStartTime = null;
    
    // Track pause event
    if (window.GALite && window.GALite.track) {
        window.GALite.track('video_pause', {
            video_id: VIDEO_ID,
            current_time: sessionState.videoElement.currentTime,
            session_watch_time: Math.round(watchTimeMs / 1000),
            total_watch_time: Math.round(sessionState.totalWatchTimeSeconds),
            study_id: 'instagram_feed_video_study'
        });
    }
}

/**
 * Handle video end event
 */
function handleVideoEnd() {
    if (!sessionState.isTrackingEnabled) return;
    
    console.log('🏁 Video ended');
    
    sessionState.completionCount++;
    
    // Send 100% milestone if not already sent
    if (!sessionState.milestonesReached.has(100)) {
        sessionState.milestonesReached.add(100);
        sendMilestoneEvent(100);
    }
    
    console.log(`Video completion #${sessionState.completionCount}`);
    
    // Video completed - could restart, so reset for next play
    sessionState.currentPlayStartTime = null;
}

/**
 * Handle time update event
 */
function handleTimeUpdate() {
    if (!sessionState.isTrackingEnabled) return;
    
    const currentTime = sessionState.videoElement.currentTime;
    
    // Update max watched position
    if (currentTime > sessionState.maxWatched) {
        sessionState.maxWatched = currentTime;
        sessionState.maxProgressReached = Math.max(sessionState.maxProgressReached, currentTime);
    }
}

/**
 * Handle volume change event
 */
function handleVolumeChange() {
    const video = sessionState.videoElement;
    if (!video) return;
    
    const wasMuted = sessionState.isMuted;
    sessionState.isMuted = video.muted;
    
    if (wasMuted !== sessionState.isMuted) {
        console.log(`🔊 Mute toggled: ${sessionState.isMuted ? 'muted' : 'unmuted'}`);
        
        if (window.GALite && window.GALite.track) {
            window.GALite.track('video_mute_toggle', {
                video_id: VIDEO_ID,
                is_muted: sessionState.isMuted,
                current_time: video.currentTime,
                study_id: 'instagram_feed_video_study'
            });
        }
        
        updateMuteIcon(sessionState.isMuted);
    }
}

/**
 * Set up milestone tracking during video playback
 */
function setupMilestoneTracking() {
    if (!sessionState.videoElement || sessionState.duration <= 0) return;
    
    // Check milestones every second during playback
    const checkMilestones = () => {
        if (!sessionState.isTrackingEnabled) return;
        
        const currentTime = sessionState.videoElement.currentTime;
        const progressPercent = (currentTime / sessionState.duration) * 100;
        
        // Update max progress
        if (progressPercent > sessionState.maxProgressReached) {
            sessionState.maxProgressReached = progressPercent;
        }
        
        // Check for milestone achievements
        [25, 50, 75].forEach(milestone => {
            if (progressPercent >= milestone && !sessionState.milestonesReached.has(milestone)) {
                sessionState.milestonesReached.add(milestone);
                sendMilestoneEvent(milestone);
            }
        });
        
        // Continue checking if video is still playing
        if (sessionState.videoElement.paused === false) {
            setTimeout(checkMilestones, 1000);
        }
    };
    
    // Start milestone checking
    setTimeout(checkMilestones, 1000);
}

/**
 * Send milestone event to GA4
 */
function sendMilestoneEvent(percentage) {
    console.log(`🎯 Milestone reached: ${percentage}%`);
    
    if (window.GALite && window.GALite.track) {
        window.GALite.track('video_progress', {
            video_id: VIDEO_ID,
            progress_percentage: percentage,
            current_time_seconds: Math.round(sessionState.videoElement.currentTime),
            play_count_at_milestone: sessionState.playCount,
            total_watch_time_so_far: Math.round(sessionState.totalWatchTimeSeconds),
            study_id: 'instagram_feed_video_study'
        });
    }
}

/**
 * Start video with browser-compliant autoplay strategy
 */
function startVideoWithAutoplay() {
    if (!sessionState.videoElement || !sessionState.isTrackingEnabled) return;
    
    try {
        const video = sessionState.videoElement;
        
        // Start muted (browser allows this)
        video.muted = true;
        sessionState.isMuted = true;
        updateMuteIcon(true);
        
        // Play video
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('🎬 Video started successfully (muted)');
                
                // Unmute after a short delay (user has interacted)
                setTimeout(() => {
                    video.muted = false;
                    sessionState.isMuted = false;
                    updateMuteIcon(false);
                    console.log('🔊 Video unmuted');
                }, 1000);
                
            }).catch(error => {
                console.log('❌ Video play failed:', error);
                // Keep video muted if autoplay fails
            });
        }
        
    } catch (error) {
        console.log('❌ Error starting video:', error);
    }
}

/**
 * Toggle mute state
 */
function toggleMute() {
    if (!sessionState.videoElement) return;
    
    const video = sessionState.videoElement;
    video.muted = !video.muted;
    sessionState.isMuted = video.muted;
    
    console.log(`🔊 Manual mute toggle: ${sessionState.isMuted ? 'muted' : 'unmuted'}`);
    updateMuteIcon(sessionState.isMuted);
}

/**
 * Update mute icon
 */
function updateMuteIcon(isMuted) {
    const muteIcon = document.querySelector('#mute-toggle svg');
    if (muteIcon) {
        if (isMuted) {
            muteIcon.innerHTML = '<path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-2 2-2-2-2 2 2 2-2 2 2 2 2-2 2 2 2-2-2-2 2-2z"/>';
        } else {
            muteIcon.innerHTML = '<path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93l-1.41 1.41C19.1 7.79 20 9.79 20 12s-.9 4.21-2.34 5.66l1.41 1.41C20.88 17.26 22 14.76 22 12s-1.12-5.26-2.93-7.07zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
        }
    }
}

/**
 * Setup page unload tracking to report final results
 */
function setupUnloadTracking() {
    // Handle page unload - report total watch time
    const reportFinalResults = () => {
        if (!sessionState.isTrackingEnabled || !sessionState.hasStartedOnce || sessionState.hasReportedFinalResults) {
            if (sessionState.hasReportedFinalResults) {
                console.log('🚫 Final results already reported');
            }
            return;
        }
        
        // Mark as reported to prevent duplicates
        sessionState.hasReportedFinalResults = true;
        
        // Calculate final watch time if currently playing
        if (sessionState.currentPlayStartTime) {
            const finalWatchTime = Date.now() - sessionState.currentPlayStartTime;
            sessionState.totalWatchTimeSeconds += Math.max(0, finalWatchTime / 1000);
        }
        
        const finalWatchTimeSeconds = Math.round(sessionState.totalWatchTimeSeconds);
        const completionRate = sessionState.duration > 0 ? 
            Math.min(100, (sessionState.maxProgressReached / sessionState.duration) * 100) : 0;
        
        console.log('📊 Final video session stats:');
        console.log(`   Total watch time: ${finalWatchTimeSeconds}s`);
        console.log(`   Play count: ${sessionState.playCount}`);
        console.log(`   Completion count: ${sessionState.completionCount}`);
        console.log(`   Milestones reached: ${Array.from(sessionState.milestonesReached).sort((a,b) => a-b).join(', ')}%`);
        console.log(`   Max progress reached: ${(sessionState.maxProgressReached / sessionState.duration * 100).toFixed(1)}%`);
        
        // Send final session complete event
        if (window.GALite && window.GALite.track && finalWatchTimeSeconds > 0) {
            try {
                window.GALite.track('video_session_complete', {
                    video_id: VIDEO_ID,
                    total_watch_time_seconds: finalWatchTimeSeconds,
                    play_count: sessionState.playCount,
                    completion_count: sessionState.completionCount,
                    milestones_reached: Array.from(sessionState.milestonesReached).sort((a,b) => a-b).join(','),
                    milestone_25_reached: sessionState.milestonesReached.has(25),
                    milestone_50_reached: sessionState.milestonesReached.has(50),
                    milestone_75_reached: sessionState.milestonesReached.has(75),
                    milestone_100_reached: sessionState.milestonesReached.has(100),
                    max_progress_percent: Math.round((sessionState.maxProgressReached / sessionState.duration) * 100),
                    video_duration: sessionState.duration,
                    completion_rate_percent: Math.round(completionRate),
                    study_id: 'instagram_feed_video_study'
                });
                
                console.log('✅ Final session data sent to GA4');
            } catch (error) {
                console.error('❌ Error sending final session data:', error);
            }
        }
    };
    
    // Multiple event listeners to catch different unload scenarios
    window.addEventListener('beforeunload', reportFinalResults);
    window.addEventListener('pagehide', reportFinalResults);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            reportFinalResults();
        }
    });
}

/**
 * Enable tracking after "Tap to Start"
 */
function enableTracking() {
    console.log('🎬 Video tracking enabled - starting video');
    sessionState.isTrackingEnabled = true;
    
    // Start video with autoplay strategy
    startVideoWithAutoplay();
}

// Expose public API
window.VideoTracker = {
    initializeVideo,
    enableTracking,
    toggleMute,
    sessionState // For debugging
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 Video Tracker - Ready for Feed Video Study');
    
    // Wait for "Tap to Start" to enable tracking
    const tapOverlay = document.getElementById('tap-to-start-overlay');
    if (tapOverlay) {
        tapOverlay.addEventListener('click', () => {
            setTimeout(() => {
                enableTracking();
            }, 500);
        });
    }
});
