# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MARUDE (まるで、一緒にいるみたい - "As if we're together") is a video conferencing web application with virtual backgrounds that creates a seamless shared environment. The key feature is that when 2 participants join, their backgrounds are split left/right to create the illusion of being in the same physical space.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Tech Stack
- **Frontend**: React 19.1.0 + TypeScript
- **Build Tool**: Vite 7.0.0
- **Video Platform**: Daily.co SDK
- **Styling**: Tailwind CSS with custom cream color theme
- **AI/ML**: TensorFlow.js (body segmentation, currently unused in favor of Daily.co's processor)

### Key Components
- `App.tsx`: Main app component managing room URL and user state
- `VideoRoom.tsx`: Core video room logic, participant management, and Daily.co integration
- `CompositeVideoView.tsx`: Renders participant videos in grid layout
- `BackgroundSelector.tsx`: UI for selecting virtual backgrounds

### Virtual Background System
The app's unique feature is synchronized virtual backgrounds:
- When 1 person is in a room: Full background image
- When 2 people join: Background splits left/right, creating a continuous shared space
- Background changes are synchronized across all participants via Daily.co app messages
- Uses Daily.co's built-in background processor (`background-image` type)

### State Management
- Uses React hooks (useState, useRef, useCallback) - no external state management library
- Background state is managed through `myBackgroundSide` and `remoteBackgroundSide`
- Function refs stored in useRef to prevent re-renders

### Daily.co Integration
- Room creation via REST API with 1-hour expiration
- Event handling: `joined-meeting`, `participant-joined`, `participant-left`, `participant-updated`
- Custom app messaging for background synchronization
- Maximum 5 participants per room

### Environment Configuration
Create a `.env` file with:
```
VITE_DAILY_API_KEY=your_daily_api_key
VITE_DAILY_DOMAIN=your_daily_domain
```

## Important Implementation Details

1. **Background Processing Flow**:
   - User joins with video off
   - Background is set (defaults to living room)
   - Video is enabled after background is ready
   - Background changes are broadcast to all participants

2. **Split Background Logic**:
   - First participant gets `left` side
   - Second participant gets `right` side
   - Background image is positioned using CSS transforms to show only the assigned half

3. **Error Handling**:
   - Falls back to video without background if processing fails
   - Shows appropriate error messages for room creation/joining failures

4. **Performance Considerations**:
   - Functions stored in refs to prevent unnecessary re-renders
   - Background updates debounced to prevent excessive API calls

## Common Tasks

### Adding a New Background
1. Add image to `public/backgrounds/` (1920x1080 recommended)
2. Update background list in `src/components/BackgroundSelector.tsx`

### Debugging Video Issues
- Check browser console for Daily.co errors
- Verify camera permissions are granted
- Ensure Daily.co API credentials are correct in `.env`

### Testing Background Synchronization
- Open two browser windows/tabs
- Join the same room with different names
- Change background in one window - it should update in both