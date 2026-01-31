# Video Block Feature - YouTube & Google Drive Support

## Overview

The Mattermost Boards video block now supports embedding videos from YouTube and Google Drive, in addition to uploading video files directly. This feature provides a seamless way to share and view videos within boards.

## Features

### ✅ Supported Video Sources

1. **YouTube Videos**
   - Standard URLs: `https://youtube.com/watch?v=VIDEO_ID`
   - Short URLs: `https://youtu.be/VIDEO_ID`
   - Embed URLs: `https://youtube.com/embed/VIDEO_ID`

2. **Google Drive Videos**
   - File URLs: `https://drive.google.com/file/d/FILE_ID/view`

3. **File Uploads**
   - Any video format supported by HTML5 video (mp4, webm, ogg, etc.)
   - Maximum file size: 500 MB (configurable)

### ✅ User Interface

#### Preview Display
- **YouTube**: Shows high-quality thumbnail from YouTube's CDN
- **Google Drive**: Shows branded placeholder with video icon
- **File Upload**: Shows first frame of the video as preview
- **Play Button Overlay**: Appears on hover with smooth animation
- **Metadata**: Displays video source (YouTube, Google Drive, or filename)

#### Fullscreen Viewer
- **Modal overlay** with dark backdrop
- **Close button** in top-right corner
- **Keyboard shortcuts**:
  - `ESC` - Close viewer
  - `Enter` or `Space` - Open viewer from preview
- **Click outside** to close
- **Responsive design** for mobile devices

#### Video Controls
- **YouTube**: Full YouTube player with native controls
- **Google Drive**: Google Drive preview player with controls
- **File Upload**: HTML5 video player with standard controls
- **Autoplay**: Videos start playing automatically when opened in fullscreen

## Implementation Details

### File Structure

```
webapp/src/
├── blocks/
│   └── videoBlock.ts                    # Video block type definition
├── components/
│   ├── blocksEditor/blocks/video/
│   │   ├── index.tsx                    # Video block component
│   │   ├── video.scss                   # Styling
│   │   └── video.test.tsx              # Unit tests
│   ├── content/
│   │   └── videoElement.tsx            # Content registry integration
│   └── videoViewer/
│       ├── videoViewer.tsx             # Fullscreen viewer component
│       └── videoViewer.scss            # Viewer styling
```

### URL Detection

The system automatically detects video URLs using regex patterns:

```typescript
// YouTube patterns
/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/

// Google Drive pattern
/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
```

### Data Structure

```typescript
type VideoBlock = {
  type: 'video'
  fields: {
    sourceType: 'file' | 'youtube' | 'gdrive'
    fileId?: string          // For uploaded files
    videoUrl?: string        // Original URL
    videoId?: string         // Extracted YouTube/GDrive ID
    thumbnailUrl?: string    // Optional custom thumbnail
  }
}
```

## Usage

### Adding a Video Block

1. **Using Slash Command**: Type `/video` in a card
2. **From Content Menu**: Click the "+" button and select "Video"

### Embedding YouTube Video

1. Add a video block
2. Paste YouTube URL (e.g., `https://youtube.com/watch?v=dQw4w9WgXcQ`)
3. Click "Add" or press Enter
4. Preview appears with YouTube thumbnail
5. Click to play in fullscreen

### Embedding Google Drive Video

1. Add a video block
2. Paste Google Drive URL (e.g., `https://drive.google.com/file/d/1ABC123/view`)
3. Click "Add" or press Enter
4. Preview appears with Google Drive icon
5. Click to play in fullscreen

### Uploading Video File

1. Add a video block
2. Click "Upload File" button
3. Select video file from your computer
4. Video uploads and preview appears
5. Click to play in fullscreen

## Testing

All features are covered by comprehensive unit tests:

```bash
cd webapp
npm test -- --testPathPattern=video.test.tsx
```

### Test Coverage

- ✅ File upload display
- ✅ YouTube embed display
- ✅ Google Drive embed display
- ✅ URL input and submission
- ✅ File upload mode switching
- ✅ Snapshot testing for UI consistency

## Browser Compatibility

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Security Considerations

1. **URL Validation**: Only YouTube and Google Drive URLs are accepted
2. **Iframe Sandboxing**: Embedded videos use secure iframe attributes
3. **File Upload**: Server-side validation for file types and sizes
4. **XSS Protection**: All user inputs are sanitized

## Performance

- **Lazy Loading**: Videos only load when viewer is opened
- **Thumbnail Caching**: YouTube thumbnails are cached by CDN
- **Optimized Rendering**: React.memo prevents unnecessary re-renders

## Future Enhancements

Potential improvements for future releases:

- [ ] Support for Vimeo, Loom, and other platforms
- [ ] Server-side thumbnail generation for uploaded videos
- [ ] Video duration display
- [ ] Playback speed controls
- [ ] Picture-in-picture mode
- [ ] Playlist support for multiple videos
- [ ] Timestamp linking (jump to specific time)

