# Spoiler Shield

A Chrome extension that intelligently detects and blurs potential spoiler content on social media platforms using machine learning image analysis.

## 🛡️ Features

- **Smart Image Detection**: Uses AI to analyze images for spoiler content
- **Text-based Filtering**: Detects spoiler keywords in posts and comments
- **One-click Reveal**: Click blurred content to reveal when you're ready
- **Customizable Watchlist**: Add your own shows, sports, or topics to protect
- **Multi-platform Support**: Works on Reddit, Twitter/X, Facebook, YouTube, and more

## 🚀 Installation

1. Download or clone this repository
2. Download required dependencies:
   ```bash
   curl -o tensorflow.min.js https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js
   ```
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extension folder
6. The Spoiler Shield icon should appear in your toolbar

## 📁 Project Structure

```
spoiler-shield/
├── manifest.json           # Extension configuration
├── background.js          # Service worker for extension lifecycle
├── content.js            # Main content script with ML detection
├── offscreen.html        # Offscreen document for ML processing
├── offscreen.js          # TensorFlow.js ML processor
├── tensorflow.min.js     # TensorFlow.js library (download required)
├── coco-ssd.min.js      # COCO-SSD object detection model
├── popup/
│   ├── popup.html       # Extension popup interface
│   ├── popup.js         # Popup functionality
│   └── popup.css        # Popup styling
└── icons/
    └── icon1.png        # Extension icon
```

## 🧠 How It Works

### Machine Learning Backend

The extension uses **TensorFlow.js** with the **COCO-SSD** object detection model to analyze images:

1. **Backend Selection**: Automatically chooses the best available computational backend:
   - **CPU Backend**: Most compatible, works in all environments
   - **WASM Backend**: Faster performance with WebAssembly
   - **WebGL Backend**: Fastest but blocked by Chrome extension security policies

2. **Image Analysis Pipeline**:
   ```
   Webpage Image → Canvas Extraction → TensorFlow Processing → Object Detection → Spoiler Analysis → Blur Decision
   ```

3. **Detection Logic**:
   - Identifies objects like people, vehicles, sports equipment, electronics
   - Cross-references with your watchlist terms
   - Calculates confidence scores based on context clues
   - Applies blur effects for potential spoilers

### Text Analysis

- Scans post text, image alt-text, and metadata
- Matches against your custom watchlist
- Looks for spoiler context clues (endings, results, deaths, etc.)
- Considers media context (F1 + car = racing spoiler)

## ⚙️ Configuration

### Adding Watchlist Items

1. Click the Spoiler Shield icon in your toolbar
2. Type a show, sport, or topic (e.g., "F1", "House of the Dragon")
3. Click "Add" or press Enter
4. Items are automatically synced across all tabs

### Quick Suggestions

The popup includes one-click buttons for popular items:
- **Sports**: F1, Premier League, Champions League
- **TV Shows**: House of the Dragon, Stranger Things
- **Movies**: Marvel, Star Wars
- **And more...**

## 🔧 Technical Details

### Offscreen Document Architecture

The extension uses Chrome's offscreen document API to run TensorFlow.js:

- **Why**: Main content scripts can't run heavy ML computations
- **How**: Background script creates isolated offscreen document
- **Benefits**: Doesn't block webpage performance, bypasses some CSP restrictions

### Content Security Policy (CSP) Compliance

- Uses local TensorFlow.js files instead of CDN to avoid CSP violations
- Avoids `eval()` and dynamic code generation
- All scripts loaded from extension package

### Performance Optimizations

- **Batch Processing**: Analyzes images in small batches to avoid blocking UI
- **Lazy Loading**: Only processes images as they come into view
- **Caching**: Remembers analyzed images to avoid reprocessing
- **Size Filtering**: Skips tiny images (likely icons/UI elements)

## 🌐 Supported Platforms

- **Reddit** (reddit.com)
- **Twitter/X** (twitter.com, x.com)
- **Facebook** (facebook.com)
- **YouTube** (youtube.com)
- **Instagram** (instagram.com)
- **Google** (google.com)

## 🐛 Troubleshooting

### Common Issues

**"ML not available" errors:**
- Ensure `tensorflow.min.js` is downloaded and in the root directory
- Check browser console for TensorFlow loading errors
- Try reloading the extension

**Images not being detected:**
- Check if your watchlist items are spelled correctly
- Some images may take a few seconds to process
- Try clicking the "Rescan Current Page" button in the popup

**Extension not working on a site:**
- Verify the site is in the `host_permissions` list in manifest.json
- Some sites may have additional security measures

### Debug Mode

Open Chrome DevTools and check the console for detailed logs:
- `[Visual Shield]` - Main content script activity
- `[Background]` - Service worker messages
- `[Offscreen]` - ML processing details

## 🔒 Privacy

- **No data collection**: All processing happens locally on your device
- **No external requests**: Uses only local ML models
- **No tracking**: Doesn't send any information to external servers
- **Storage**: Only saves your watchlist items locally

## 🛠️ Development

### Building from Source

1. Clone the repository
2. Download TensorFlow.js dependency
3. Load as unpacked extension in Chrome
4. Make changes and reload extension to test

### Adding New Platforms

1. Add domain to `host_permissions` in `manifest.json`
2. Add domain to `content_scripts` matches
3. Test spoiler detection on the new platform

## 📄 License

This project is open source. See LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please feel free to submit issues and pull requests.

---

**Note**: This extension requires downloading TensorFlow.js separately due to Chrome extension security policies. The download link is provided in the installation instructions.