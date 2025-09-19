/**
 * GA4 Lite - Core Analytics Module for NYU Feed Video Study
 * Handles initialization, participant ID management, and basic tracking
 */

// Configuration
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Placeholder - will be updated with actual ID
const PROLIFIC_ID_KEY = 'prolific_id';

// Global state
window.GALite = {
    isInitialized: false,
    userId: null
};

/**
 * Get PROLIFIC_ID from URL, then prompt if not found
 * No localStorage storage to ensure fresh sessions for research
 */
function getProlificId() {
    console.log('Getting PROLIFIC_ID...');
    
    // First, check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlProlificId = urlParams.get('PROLIFIC_ID');
    
    console.log('PROLIFIC_ID from URL:', urlProlificId);
    
    if (urlProlificId) {
        console.log('Using PROLIFIC_ID from URL:', urlProlificId);
        return urlProlificId;
    }
    
    // If not in URL, prompt user
    const promptedId = prompt('Please enter your PROLIFIC_ID:');
    console.log('PROLIFIC_ID from prompt:', promptedId);
    
    if (promptedId) {
        return promptedId.trim();
    }
    
    // Fallback to anonymous
    console.log('No PROLIFIC_ID provided, using anonymous');
    return 'anonymous_' + Date.now();
}

/**
 * Initialize Google Analytics 4
 */
function initializeGA() {
    return new Promise((resolve, reject) => {
        try {
            // Clear any existing localStorage PROLIFIC_ID to ensure fresh session
            localStorage.removeItem(PROLIFIC_ID_KEY);
            
            // Get participant ID
            window.GALite.userId = getProlificId();
            console.log('Using participant ID:', window.GALite.userId);
            
            // Load gtag script
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
            document.head.appendChild(script);
            
            script.onload = () => {
                // Initialize dataLayer and gtag
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                
                gtag('js', new Date());
                gtag('config', GA_MEASUREMENT_ID, {
                    debug_mode: true,
                    send_page_view: true,
                    user_id: window.GALite.userId,
                    enhanced_measurement: {
                        scroll_events: false // Disable automatic scroll tracking
                    }
                });
                
                // Set user properties including participant_id as duplicate
                gtag('set', 'user_properties', {
                    participant_id: window.GALite.userId
                });
                
                window.GALite.isInitialized = true;
                console.log('GA4 initialized successfully for Feed Video Study');
                console.log('Measurement ID:', GA_MEASUREMENT_ID);
                console.log('Participant ID:', window.GALite.userId);
                
                resolve();
            };
            
            script.onerror = () => {
                console.error('Failed to load GA4 script');
                reject(new Error('Failed to load GA4 script'));
            };
            
        } catch (error) {
            console.error('Error initializing GA4:', error);
            reject(error);
        }
    });
}

/**
 * Track custom event with automatic user_id and participant_id inclusion
 */
function track(eventName, parameters = {}) {
    if (!window.GALite.isInitialized || !window.gtag) {
        console.warn('GA4 not initialized, queuing event:', eventName);
        // Could implement event queuing here if needed
        return;
    }
    
    try {
        // Always include user_id and participant_id
        const eventData = {
            ...parameters,
            user_id: window.GALite.userId,
            participant_id: window.GALite.userId, // Duplicate for easier querying
            timestamp: Date.now(),
            study_id: 'instagram_feed_video_study'
        };
        
        console.log(`📊 Tracking event: ${eventName}`, eventData);
        window.gtag('event', eventName, eventData);
        
    } catch (error) {
        console.error('Error tracking event:', eventName, error);
    }
}

// Expose public API
window.GALite.track = track;
window.GALite.initializeGA = initializeGA;

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('GA4 Lite - Initializing for Feed Video Study');
    initializeGA().catch(error => {
        console.error('Failed to initialize GA4:', error);
    });
});
