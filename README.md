# NYU Feed Video Ad - Instagram Study

A standalone HTML page displaying NYU video advertisements in an Instagram feed format for research purposes.

## Features

### 🎬 Instagram Feed UI
- Authentic Instagram feed interface
- NYU sponsored video ad post
- Realistic post interactions (like, comment, share, bookmark)

### 📊 Comprehensive Video Analytics
- **GA4 Integration** with placeholder measurement ID
- **Participant ID Tracking** via PROLIFIC_ID (URL parameter or prompt)
- **Session-based Video Tracking**:
  - Total watch time across replays
  - Play count and completion count
  - Progress milestones (25%, 50%, 75%, 100%)
  - Mute/unmute interactions
  - Anti-pause logic for research control

### 🎯 Tracking Events
- `video_start` - First play of the video
- `video_play` - Each play event (including replays)
- `video_pause` - When video is paused
- `video_progress` - Milestone achievements (25%, 50%, 75%, 100%)
- `video_mute_toggle` - Mute state changes
- `video_session_complete` - Final session summary on page unload
- `cta_click` - Post interaction tracking (like, comment, share, bookmark)

### 🔧 Research Features
- **"Tap to Start" overlay** - Ensures consistent session start
- **Participant ID management** - No localStorage storage for fresh sessions
- **Return to Survey button** - Simple navigation back to referrer
- **Browser-compliant autoplay** - Starts muted, then auto-unmutes
- **Anti-pause functionality** - Prevents user from pausing video

## File Structure

```
nyu-feed-video-repo/
├── index.html              # Main feed video page
├── js/
│   ├── ga-lite.js          # Core GA4 initialization & participant tracking
│   └── ga-video.js         # Comprehensive video tracking logic
├── assets/
│   ├── videos/
│   │   └── nyu ad 1.mp4    # NYU video advertisement
│   └── images/
│       └── nyupfp.png      # NYU profile picture
└── README.md               # This file
```

## Setup Instructions

### 1. Update Measurement ID
Replace the placeholder in `js/ga-lite.js`:
```javascript
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with actual GA4 ID
```

### 2. Set Up Custom Dimensions in GA4
In GA4 Admin → Custom Definitions → Custom Dimensions, create:
- `milestone_25_reached` (Event scope)
- `milestone_50_reached` (Event scope)
- `milestone_75_reached` (Event scope)
- `milestone_100_reached` (Event scope)
- `participant_id` (User scope)

### 3. Deploy
- Upload to web server or use local development server
- Ensure video file is accessible at the correct path

## Usage

1. **Access the page** - Open `index.html` in a web browser
2. **Participant ID** - Will prompt for PROLIFIC_ID or use URL parameter: `?PROLIFIC_ID=12345`
3. **Start experience** - Click "Tap to Start" to begin video tracking
4. **Return to survey** - Use the "Return to Survey" button to go back

## Analytics Data

### Video Session Metrics
- **Total watch time** - Cumulative seconds watched (including replays)
- **Play count** - Number of times video was started
- **Completion count** - Number of times video reached 100%
- **Milestone flags** - Which progress points were reached
- **Maximum progress** - Furthest point reached in video

### Export Data
After 24-48 hours, export data from GA4:
- **Reports → Explore → Free Form**
- **Dimensions**: `participant_id`, milestone dimensions
- **Metrics**: `Event count`, `Total users`
- **Filter**: Event name = `video_session_complete`

## Technical Notes

### Video Tracking Logic
- **Session-based**: Accumulates data across replays, reports once on unload
- **Milestone tracking**: 25%, 50%, 75%, 100% progress points
- **Anti-skip**: Prevents users from pausing video during playback
- **Autoplay strategy**: Muted autoplay → auto-unmute after user interaction

### Browser Compatibility
- Modern browsers with HTML5 video support
- Requires user interaction for unmuted autoplay
- Mobile responsive design

## Study Information
- **Study ID**: `instagram_feed_video_study`
- **Content Type**: Sponsored video advertisement  
- **Target**: NYU Stern MBA program
- **Format**: Instagram feed post layout
