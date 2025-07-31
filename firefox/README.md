# Spoiler Shield - Firefox Version

This Firefox-compatible version of Spoiler Shield has been adapted from the Chrome extension to work with Firefox's WebExtensions API.

## Key Changes for Firefox Compatibility

### 1. Manifest Version
- **Chrome**: Uses Manifest V3
- **Firefox**: Uses Manifest V2 (more stable and widely supported)

### 2. API Changes
- **Chrome**: Uses `chrome.*` APIs
- **Firefox**: Uses `browser.*` APIs (WebExtensions standard)

### 3. Background Script
- **Chrome**: Service Worker (`background.js` with `"type": "module"`)
- **Firefox**: Event Page (`background.js` with `"persistent": false`)

### 4. Permissions
- **Chrome**: Separate `"permissions"` and `"host_permissions"`
- **Firefox**: Combined in `"permissions"` array

### 5. Browser Action
- **Chrome**: Uses `"action"`
- **Firefox**: Uses `"browser_action"`

## Installation Instructions

### Method 1: Temporary Installation (Development)
1. **Open Firefox** and navigate to `about:debugging`
2. **Click "This Firefox"** in the left sidebar
3. **Click "Load Temporary Add-on"**
4. **Navigate to the extension folder** and select `manifest.json`
5. **The extension will be loaded** until Firefox is restarted

### Method 2: Permanent Installation (Advanced Users)
1. **Enable Developer Mode**:
   - Go to `about:config`
   - Search for `xpinstall.signatures.required`
   - Set it to `false` (NOT recommended for regular use)
   
2. **Create XPI Package**:
   ```bash
   # In the extension directory
   zip -r spoiler-shield-firefox.xpi * -x "*.git*" "*node_modules*" "*.DS_Store*"
   ```
   
3. **Install XPI**:
   - Drag the `.xpi` file to Firefox
   - Or go to `about:addons` → Settings → Install Add-on From File

### Method 3: Firefox Developer Edition
Firefox Developer Edition allows unsigned extensions:
1. Download **Firefox Developer Edition**
2. In `about:config`, set `xpinstall.signatures.required` to `false`
3. Install the extension normally

## File Structure for Firefox

Replace the Chrome files with these Firefox-compatible versions:

```
spoiler-shield-firefox/
├── manifest.json          # Firefox Manifest V2
├── background.js           # Firefox background script
├── content.js             # Firefox content script
├── popup/
│   ├── popup.html         # Same as Chrome version
│   ├── popup.js           # Firefox popup script
│   └── popup.css          # Same as Chrome version
├── offscreen.html         # Optional (future ML features)
├── offscreen.js           # Optional (future ML features)
└── icons/                 # Extension icons (same as Chrome)
```

## Key Code Changes Made

### Background Script (`background.js`)
- Changed `chrome.*` to `browser.*`
- Removed service worker keep-alive code
- Updated manifest references
- Changed `chrome.action` to `browser.browserAction`
- Used promises instead of callbacks for storage

### Content Script (`content.js`)
- Changed `chrome.runtime.onMessage` to `browser.runtime.onMessage`
- Changed `chrome.storage` to `browser.storage`
- All other functionality remains identical

### Popup Script (`popup.js`)
- Changed `chrome.storage` to `browser.storage`
- Changed `chrome.tabs` to `browser.tabs`
- Updated async patterns to use promises

### Manifest (`manifest.json`)
- Changed from Manifest V3 to V2
- Combined permissions into single array
- Changed `action` to `browser_action`
- Added `applications.gecko` section for Firefox ID
- Updated background script definition

## Testing the Extension

1. **Load the extension** using one of the installation methods above
2. **Visit supported sites** (Reddit, Twitter, YouTube, etc.)
3. **Add test keywords** like "test", "spoiler", or "Formula 1"
4. **Verify content gets blurred** appropriately
5. **Test the reveal buttons** work correctly
6. **Check the toggle functionality** in the popup

## Supported Sites

The extension works on all the same sites as the Chrome version:
- Reddit (`*.reddit.com`)
- Twitter/X (`*.twitter.com`, `*.x.com`)
- Facebook (`*.facebook.com`)
- YouTube (`*.youtube.com`)
- Instagram (`*.instagram.com`)
- TikTok (`*.tiktok.com`)
- LinkedIn (`*.linkedin.com`)
- Discord (`*.discord.com`)

## Troubleshooting

### Common Issues

1. **Extension not loading**:
   - Check Firefox console for errors
   - Ensure all files are in correct locations
   - Verify manifest.json syntax

2. **Content not being detected**:
   - Open browser console on the webpage
   - Look for Spoiler Shield log messages
   - Check if the site is in the supported list

3. **Storage issues**:
   - Firefox might have stricter storage policies
   - Check `about:preferences#privacy` settings
   - Ensure cookies/storage are enabled

4. **Permission errors**:
   - Some sites might block extension access
   - Check if Enhanced Tracking Protection is interfering
   - Try disabling other extensions temporarily

### Debug Mode

To enable debug logging:
1. Open `about:config`
2. Search for `devtools.console.stdout.chrome`
3. Set to `true`
4. Restart Firefox
5. Check browser console for detailed logs

## Differences from Chrome Version

### Performance
- Firefox generally handles WebExtensions slightly differently
- Some CSS properties might behave differently
- Intersection Observer performance may vary

### Security
- Firefox has stricter CSP policies
- Some dynamic code execution is more restricted
- Extension signatures are required for production

### Storage
- Firefox sync storage has same API but different limits
- Local storage behavior is consistent
- Cross-device sync works differently

## Building for Production

To prepare for Firefox Add-ons store submission:

1. **Create clean build**:
   ```bash
   # Remove development files
   rm -rf .git node_modules *.log
   
   # Create XPI package
   zip -r spoiler-shield-firefox.xpi * -x "*.DS_Store*"
   ```

2. **Test thoroughly**:
   - Test on multiple Firefox versions
   - Check all supported websites
   - Verify all features work correctly

3. **Submit to Mozilla**:
   - Create account at https://addons.mozilla.org
   - Upload XPI file
   - Fill out store listing information
   - Wait for review (usually 1-7 days)

## Development Notes

- Firefox extensions are generally easier to debug
- Use Firefox's built-in extension debugger
- Console logs are more verbose than Chrome
- Hot reload is not available - manual reload needed
- Use Firefox DevTools for extension debugging

## License

Same MIT license as the Chrome version.