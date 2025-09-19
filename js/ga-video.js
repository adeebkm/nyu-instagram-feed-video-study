/**
 * GA4 YouTube Video Tracking for NYU Feed Video Study
 * Session-based tracking with YouTube iframe API integration
 */

(function() {
    'use strict';
    
    // Configuration
    const VIDEO_ID = 'nyu_feed_youtube_ad';
    
    // Session tracking state
    let sessionState = {
        isTrackingEnabled: false, // Only true after "Tap to Start"
        totalWatchTimeSeconds: 0, // Cumulative watch time across all plays
        sessionStartTime: null,
        currentPlayStartTime: null,
        player: null,
        duration: 0,
        hasStartedOnce: false, // Track if video ever started playing
        playCount: 0, // How many times video was played
        lastReportedTime: 0, // Prevent duplicate time counting
        hasReportedFinalResults: false, // Prevent duplicate final reports
        milestonesReached: new Set(), // Track which milestones have been reached (25, 50, 75, 100)
        completionCount: 0, // Track how many times video was completed
        maxProgressReached: 0 // Track furthest point reached in video
    };
    
    // YouTube API ready flag
    let youTubeAPIReady = false;
    
    /**
     * Load YouTube iframe API
     */
    function loadYouTubeAPI() {
        if (window.YT && window.YT.Player) {
            youTubeAPIReady = true;
            initVideoPlayer();
            return;
        }
        
        // Load YouTube iframe API
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        // YouTube API calls this when ready
        window.onYouTubeIframeAPIReady = function() {
            youTubeAPIReady = true;
            initVideoPlayer();
        };
    }
    
    /**
     * Initialize YouTube player
     */
    function initVideoPlayer() {
        const iframe = document.getElementById('nyuVideo');
        if (!iframe) {
            console.log('Video iframe not found');
            return;
        }
        
        try {
            sessionState.player = new YT.Player('nyuVideo', {
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
            
            console.log('YouTube player initialized for feed video');
        } catch (error) {
            console.log('Error initializing YouTube player:', error);
        }
    }
    
    /**
     * Player ready - set up tracking but don't start yet
     */
    function onPlayerReady(event) {
        console.log('YouTube player ready');
        sessionState.duration = sessionState.player.getDuration();
        
        // IMPORTANT: Stop any autoplay immediately
        sessionState.player.pauseVideo();
        sessionState.player.mute(); // Ensure it's muted
        console.log('Video paused - waiting for Tap to Start');
        
        // Wait for "Tap to Start" before enabling tracking
        waitForTapToStart();
        
        // Set up page unload tracking
        setupUnloadTracking();
    }
    
    /**
     * Handle player state changes
     */
    function onPlayerStateChange(event) {
        if (!sessionState.isTrackingEnabled) {
            // Prevent any playback before "Tap to Start"
            if (event.data === YT.PlayerState.PLAYING) {
                sessionState.player.pauseVideo();
            }
            return;
        }
        
        const currentTime = sessionState.player.getCurrentTime();
        
        switch (event.data) {
            case YT.PlayerState.PLAYING:
                handleVideoPlay(currentTime);
                break;
            case YT.PlayerState.PAUSED:
                handleVideoPause(currentTime);
                break;
            case YT.PlayerState.ENDED:
                handleVideoEnd(currentTime);
                break;
        }
    }
    
    /**
     * Handle video play
     */
    function handleVideoPlay(currentTime) {
        console.log('▶️ Video play started at', currentTime + 's');
        
        sessionState.playCount++;
        sessionState.currentPlayStartTime = Date.now();
        
        if (!sessionState.hasStartedOnce) {
            sessionState.hasStartedOnce = true;
            sessionState.sessionStartTime = Date.now();
            
            // Track video start
            trackVideoEvent('video_start', {
                video_duration: sessionState.duration,
                play_count: sessionState.playCount
            });
            
            // Set up milestone tracking during playback
            setupMilestoneTracking();
        }
        
        // Track play event
        trackVideoEvent('video_play', {
            current_time: currentTime,
            play_count: sessionState.playCount,
            is_replay: sessionState.playCount > 1
        });
    }
    
    /**
     * Handle video pause
     */
    function handleVideoPause(currentTime) {
        if (!sessionState.currentPlayStartTime) return;
        
        console.log('⏸️ Video paused at', currentTime + 's');
        
        // Calculate watch time for this play session
        const watchTimeMs = Date.now() - sessionState.currentPlayStartTime;
        sessionState.totalWatchTimeSeconds += Math.max(0, watchTimeMs / 1000);
        sessionState.currentPlayStartTime = null;
        
        // Track pause event
        trackVideoEvent('video_pause', {
            current_time: currentTime,
            session_watch_time: Math.round(watchTimeMs / 1000),
            total_watch_time: Math.round(sessionState.totalWatchTimeSeconds)
        });
    }
    
    /**
     * Handle video end
     */
    function handleVideoEnd(currentTime) {
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
     * Set up milestone tracking during video playback
     */
    function setupMilestoneTracking() {
        if (!sessionState.player || sessionState.duration <= 0) return;
        
        // Check milestones every second during playback
        const checkMilestones = () => {
            if (!sessionState.isTrackingEnabled) return;
            
            const currentTime = sessionState.player.getCurrentTime();
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
            if (sessionState.player.getPlayerState() === YT.PlayerState.PLAYING) {
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
        
        trackVideoEvent('video_progress', {
            progress_percentage: percentage,
            current_time_seconds: Math.round(sessionState.player.getCurrentTime()),
            play_count_at_milestone: sessionState.playCount,
            total_watch_time_so_far: Math.round(sessionState.totalWatchTimeSeconds)
        });
    }
    
    /**
     * Wait for "Tap to Start" to enable tracking
     */
    function waitForTapToStart() {
        const tapOverlay = document.getElementById('tap-to-start-overlay');
        if (tapOverlay) {
            // Override the existing tap handler to enable our tracking
            tapOverlay.addEventListener('click', () => {
                console.log('Tap to Start clicked - Video tracking enabled');
                sessionState.isTrackingEnabled = true;
                
                // Start the video with browser-compliant autoplay
                setTimeout(() => {
                    startVideoWithAutoplay();
                }, 500);
            });
        }
    }
    
    /**
     * Start video with browser-compliant autoplay strategy
     */
    function startVideoWithAutoplay() {
        try {
            // Start muted (browser allows this)
            sessionState.player.mute();
            sessionState.player.playVideo();
            
            // Then unmute after a short delay (user has interacted)
            setTimeout(() => {
                sessionState.player.unMute();
                updateMuteIcon(false);
                console.log('Video started and unmuted');
            }, 1000);
            
        } catch (error) {
            console.log('Error starting video:', error);
        }
    }
    
    /**
     * Toggle mute state
     */
    function toggleMute() {
        if (!sessionState.player) return;
        
        const wasMuted = sessionState.player.isMuted();
        
        if (wasMuted) {
            sessionState.player.unMute();
        } else {
            sessionState.player.mute();
        }
        
        const isMuted = sessionState.player.isMuted();
        console.log(`🔊 Manual mute toggle: ${isMuted ? 'muted' : 'unmuted'}`);
        
        // Track mute toggle
        trackVideoEvent('video_mute_toggle', {
            is_muted: isMuted,
            current_time: sessionState.player.getCurrentTime()
        });
        
        updateMuteIcon(isMuted);
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
            
            console.log('📊 Final feed video session stats:');
            console.log(`   Total watch time: ${finalWatchTimeSeconds}s`);
            console.log(`   Play count: ${sessionState.playCount}`);
            console.log(`   Completion count: ${sessionState.completionCount}`);
            console.log(`   Milestones reached: ${Array.from(sessionState.milestonesReached).sort((a,b) => a-b).join(', ')}%`);
            console.log(`   Max progress reached: ${(sessionState.maxProgressReached / sessionState.duration * 100).toFixed(1)}%`);
            
            // Send final session complete event
            if (finalWatchTimeSeconds > 0) {
                try {
                    trackVideoEvent('video_session_complete', {
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
                        completion_rate_percent: Math.round(completionRate)
                    });
                    
                    console.log('✅ Final feed video session data sent to GA4');
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
     * Track video event using GALite
     */
    function trackVideoEvent(eventName, parameters = {}) {
        if (window.GALite && window.GALite.track) {
            const eventData = {
                video_id: VIDEO_ID,
                ...parameters,
                study_id: 'instagram_feed_video_study'
            };
            
            window.GALite.track(eventName, eventData);
        } else {
            console.log('GALite not available, event:', eventName, parameters);
        }
    }
    
    // Expose public API
    window.VideoTracker = {
        toggleMute,
        sessionState // For debugging
    };
    
    // Auto-initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🎬 Feed Video Tracker - Loading YouTube API');
        loadYouTubeAPI();
    });
    
})();