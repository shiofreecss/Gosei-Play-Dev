# Deploying Audio Features to Netlify

This document outlines the steps to ensure the audio features (stone sounds and music player) work correctly when deploying to Netlify.

## Pre-deployment Checklist

1. Ensure all audio files are included in the correct directories:
   - Stone sound: `/public/sounds/stone-sound.mp3`
   - Music tracks: 
     - `/public/music/traditional-go.mp3`
     - `/public/music/zen-music-1.mp3`
     - `/public/music/zen-music-2.mp3`

2. Verify audio file sizes (important for Netlify deployment):
   - Audio files should ideally be compressed to reduce load times
   - MP3 format is recommended for best compatibility
   - Consider keeping music files under 5MB each for faster initial load

## Netlify Deployment Steps

### Option 1: Deploy through Git Repository

1. Connect your repository to Netlify as described in NETLIFY_SETUP.md
2. Ensure the build command includes copying static assets:
   ```
   npm run build:netlify
   ```
   This should include the `public/sounds` and `public/music` directories in the build output.

3. Configure the build settings in netlify.toml (should already be set up):
   ```toml
   [build]
     command = "npm run build:netlify"
     publish = "build"
   ```

### Option 2: Manual Deployment

If you're deploying manually:

1. Build the project locally:
   ```
   npm run build:netlify
   ```

2. Verify that the `build/sounds` and `build/music` directories contain all audio files

3. Deploy using Netlify CLI:
   ```
   netlify deploy --prod
   ```

## Handling Large Media Files

If your music files are large (>10MB), consider using Netlify Large Media:

1. Install Netlify Large Media:
   ```
   netlify plugins:install netlify-lm-plugin
   netlify lm:setup
   ```

2. Track your music files with Git LFS:
   ```
   git lfs track "public/music/*.mp3"
   git add .gitattributes
   git add public/music
   git commit -m "Add music files with Git LFS"
   ```

3. Push to your repository and deploy

## Testing Audio Features Post-Deployment

After deployment, test the following:

1. **Stone sounds**:
   - Create or join a game
   - Place stones on the board
   - Verify sound plays correctly
   - Test toggling sound on/off in game settings

2. **Music player**:
   - Verify the music player appears during active gameplay only
   - Test play/pause functionality
   - Try changing tracks
   - Adjust volume
   - Navigate between pages to ensure music continues playing

## Troubleshooting

If audio doesn't work after deployment:

1. **Stone sounds not playing**:
   - Check browser console for file loading errors
   - Verify file paths are correct
   - Make sure `/sounds/stone-sound.mp3` is accessible at the site URL

2. **Music player issues**:
   - Check browser console for network errors when loading music files
   - Some browsers require user interaction before playing audio; ensure buttons work after clicking
   - Verify music files are being served correctly using Network tab in DevTools

3. **File not found errors**:
   - Check Netlify's deployment log to ensure audio files were uploaded
   - Verify that file paths are correct in the code
   - Make sure you're not using absolute paths with localhost

## Performance Optimization

To improve performance with audio files:

1. **Lazy loading music**:
   - Our current implementation already loads music only when the player becomes visible
   - This helps reduce initial page load time

2. **Audio compression**:
   - Consider using compressed MP3 files (128kbps is often sufficient for background music)
   - Tools like `ffmpeg` can be used to reduce file size

3. **Cache headers**:
   - Add cache headers for audio files in `netlify.toml`:
   ```toml
   [[headers]]
     for = "/music/*"
     [headers.values]
       Cache-Control = "public, max-age=31536000"
   
   [[headers]]
     for = "/sounds/*"
     [headers.values]
       Cache-Control = "public, max-age=31536000"
   ```

## Resources

- [Netlify Large Media Documentation](https://docs.netlify.com/large-media/overview/)
- [Netlify Cache Control Headers](https://docs.netlify.com/routing/headers/)
- [Web Audio Performance Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) 