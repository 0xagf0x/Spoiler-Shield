# Spoiler Shield

**Block spoilers from social media and news sites. Add keywords to your watchlist and browse worry-free until you're ready to see spoilers.**

A Chrome extension that automatically detects and blurs content containing spoilers based on your personalized watchlist. Perfect for avoiding F1 race results, TV show spoilers, sports scores, and any other content you want to see on your own terms.

## Features

### Smart Content Detection
- **Real-time scanning** of all major social media platforms
- **Intelligent text matching** with fuzzy search capabilities
- **Multi-word term support** (e.g., "Formula 1", "House of the Dragon")
- **Auto-rescan** as you scroll and when new content loads

### Platform Support
- **Reddit** - Posts, titles, and comments
- **Twitter/X** - Tweets and threads
- **Facebook** - Posts and stories
- **YouTube** - Video titles and descriptions
- **Instagram** - Posts and captions
- **Other sites** - Generic content detection

### User-Friendly Controls
- **One-click toggle** to enable/disable the extension
- **Quick-add suggestions** for popular terms
- **Context menu integration** - Right-click to add selected text
- **Keyboard shortcuts** for quick access
- **Visual indicators** showing protection status

### Advanced Features
- **Automatic background scanning** every 2 seconds
- **Scroll-triggered detection** for new content
- **Intersection observer** monitoring for performance
- **Smart caching** to avoid re-processing elements
- **Graceful reveal** with smooth blur removal

## Installation

### From Chrome Web Store (Recommended)
*[Extension not yet published to Chrome Web Store]*

### Manual Installation (Developer Mode)
1. **Download** or clone this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

## How to Use

### Basic Setup
1. **Click the Spoiler Shield icon** in your browser toolbar
2. **Add keywords** you want to avoid (e.g., "F1", "Stranger Things", "Marvel")
3. **Browse normally** - spoilers will be automatically blurred
4. **Click "SHOW SPOILER"** buttons when you're ready to see content

### Managing Your Watchlist
- **Add terms**: Type in the input field and click "Add" or press Enter
- **Remove terms**: Click the "×" button next to any watchlist item
- **Quick suggestions**: Use the pre-populated buttons for common spoiler topics
- **Bulk management**: Add multiple terms separated by commas

### Extension Controls
- **Toggle on/off**: Click the main toggle button to disable/enable protection
- **Rescan page**: Force a manual scan of the current page
- **Keyboard shortcuts**:
  - `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac): Toggle extension
  - `Alt+S`: Open popup

### Context Menu Features
- **Right-click any selected text** → "Add to Spoiler Shield"
- **Right-click anywhere** → "Toggle Spoiler Shield"

## Technical Details

### Architecture
- **Manifest V3** Chrome extension
- **Service Worker** background script for persistent functionality
- **Content Script** injection for real-time page scanning
- **Offscreen Document** prepared for future ML integration

### Performance Optimizations
- **Throttled scanning** to prevent excessive CPU usage
- **WeakSet caching** to avoid re-processing elements
- **Intersection Observer** for efficient viewport monitoring
- **Debounced scroll handling** for smooth performance

### Privacy & Security
- **Local storage only** - your watchlist never leaves your device
- **No external API calls** - all processing happens locally
- **No user tracking** or analytics
- **Minimal permissions** - only accesses specified social media sites

## Configuration

### Supported Sites
The extension works on these domains by default:
- `*.reddit.com`
- `*.twitter.com` / `*.x.com`
- `*.facebook.com`
- `*.youtube.com`
- `*.instagram.com`
- `*.tiktok.com`
- `*.linkedin.com`
- `*.discord.com`
- And more...

### Customization
- **Keywords are case-insensitive** and support partial matching
- **Multi-word terms** are fully supported (e.g., "Game of Thrones")
- **Fuzzy matching** catches variations and plural forms
- **Individual word matching** for compound terms

## Development

### Project Structure
```
spoiler-shield/
├── manifest.json          # Extension configuration
├── background.js           # Service worker
├── content.js             # Main content script
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Popup functionality
│   └── popup.css          # Popup styling
├── offscreen.html         # Future ML processing
├── offscreen.js           # ML processor (heuristic fallback)
└── icons/                 # Extension icons
```

### Building & Testing
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spoiler-shield
   ```

2. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked" and select the project folder

3. **Test functionality**
   - Add test keywords to your watchlist
   - Visit supported sites (Reddit, Twitter, etc.)
   - Verify content gets blurred appropriately

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly on multiple sites
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

### Common Issues
- **Extension not working**: Try disabling and re-enabling it
- **Content not being detected**: Check if the site is supported and add more specific keywords
- **Performance issues**: Reduce the number of watchlist terms or disable on heavy sites

