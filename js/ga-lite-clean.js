/**
 * GA4 Lite - Shared GA initialization and tracking
 * Handles PROLIFIC_ID from query string or localStorage
 */

(function() {
    'use strict';
    
    // Configuration  
    const GA_MEASUREMENT_ID = 'G-GHYPLRCS4Z'; // Feed Video study measurement ID
    const PROLIFIC_ID_KEY = 'prolific_id';
    
    // Global tracking state
    window.GALite = {
        isLoaded: false,
        userId: null,
        measurementId: GA_MEASUREMENT_ID
    };
    
    /**
     * Get PROLIFIC_ID from URL query string or mandatory prompt (no localStorage storage)
     */
    function getProlificId() {
        console.log('Getting PROLIFIC_ID...');
        
        // Check URL query string first
        const urlParams = new URLSearchParams(window.location.search);
        const prolificFromUrl = urlParams.get('PROLIFIC_ID');
        console.log('PROLIFIC_ID from URL:', prolificFromUrl);
        
        if (prolificFromUrl) {
            console.log('Using PROLIFIC_ID from URL:', prolificFromUrl);
            return prolificFromUrl;
        }
        
        // If no URL parameter, MANDATORY prompt - cannot be escaped
        console.log('No PROLIFIC_ID in URL, prompting user (mandatory)...');
        
        let prolificId = null;
        while (!prolificId || prolificId.trim() === '') {
            prolificId = prompt('⚠️ REQUIRED: Please enter your Participant ID to continue.\n\n(This cannot be skipped - press OK after entering your ID)');
            
            // If user pressed Cancel/Escape, show warning and try again
            if (prolificId === null) {
                alert('❌ Participant ID is required to participate in this study.\n\nPlease enter your ID when prompted.');
                continue;
            }
            
            // If user entered empty/whitespace, show warning and try again
            if (prolificId.trim() === '') {
                alert('❌ Please enter a valid Participant ID.\n\nEmpty entries are not allowed.');
                continue;
            }
            
            // Valid ID entered
            prolificId = prolificId.trim();
            console.log('User entered valid PROLIFIC_ID:', prolificId);
            break;
        }
        
        console.log('Using PROLIFIC_ID from mandatory prompt:', prolificId);
        return prolificId;
    }
    
    /**
     * Initialize GA4 with user identification
     */
    function initializeGA() {
        if (!window.GALite.isLoaded) {
            try {
                // Get user ID
                window.GALite.userId = getProlificId();
                
                // Load gtag.js
                const script = document.createElement('script');
                script.async = true;
                script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
                document.head.appendChild(script);
                
                // Initialize gtag
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                
                gtag('js', new Date());
                
                script.onload = function() {
                    const config = {
                        send_page_view: true,
                        debug_mode: false
                    };
                    
                    if (window.GALite.userId) {
                        config.user_id = window.GALite.userId;
                        gtag('set', 'user_properties', { participant_id: window.GALite.userId });
                    }
                    
                    gtag('config', GA_MEASUREMENT_ID, config);
                    
                    window.GALite.isLoaded = true;
                    console.log('✅ GA4 initialized successfully with user ID:', window.GALite.userId);
                };
                
            } catch (error) {
                console.error('❌ Error initializing GA4:', error);
            }
        }
    }
    
    /**
     * Track custom event with automatic user_id and participant_id inclusion
     */
    function track(eventName, parameters = {}) {
        if (!window.GALite.isLoaded || typeof window.gtag !== 'function') {
            console.warn('GA4 not loaded yet, queuing event:', eventName);
            setTimeout(() => track(eventName, parameters), 100);
            return;
        }
        
        try {
            const eventData = { ...parameters };
            
            // Always include user_id if available
            if (window.GALite.userId) {
                eventData.user_id = window.GALite.userId;
                // Add participant_id as duplicate for GA4 reporting
                eventData.participant_id = window.GALite.userId;
            }
            
            window.gtag('event', eventName, eventData);
            console.log('📊 Event tracked:', eventName, eventData);
            
        } catch (error) {
            console.error('❌ Error tracking event:', eventName, error);
        }
    }
    
    // Expose functions globally
    window.GALite.initialize = initializeGA;
    window.GALite.track = track;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeGA);
    } else {
        initializeGA();
    }
    
})();
