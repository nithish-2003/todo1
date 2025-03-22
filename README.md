# To-Do List App with Voice Assistant

A Progressive Web App (PWA) To-Do List application with voice assistant functionality. This repository contains all the necessary files for hosting on GitHub Pages and building an Android APK using online services.

## Features

- Add, edit, and delete tasks
- Filter tasks by status (All, Active, Completed)
- Voice assistant for hands-free operation
- Offline functionality with local storage
- Progressive Web App (PWA) capabilities
- Responsive design for mobile and desktop

## Hosting on GitHub Pages

1. Fork or clone this repository
2. Go to repository Settings > Pages
3. Under "Source", select "main" branch
4. Click "Save"
5. Wait a few minutes for your site to be published
6. Access your site at the provided URL (typically https://YOUR_USERNAME.github.io/REPO_NAME/)

## Building an Android APK

After hosting on GitHub Pages, you can build an Android APK using online services:

### Using PWA2APK (Recommended)

1. Go to [PWA2APK](https://pwa2apk.com/) website
2. Sign up for a free account
3. Create a new project
4. Enter the URL where your webapp is hosted (your GitHub Pages URL)
5. Configure the app settings:
   - App Name: To-Do List
   - Package ID: com.example.todoapp (or your preferred package ID)
   - Version: 1.0.0
6. Click "Build APK"
7. Download the generated APK file

## Files Included

- `index.html`: Main HTML file
- `script.js`: Main JavaScript file
- `styles.css`: Main CSS file
- `voice-assistant.js`: Voice assistant functionality
- `chat-interface.html` & `chat-interface.css`: Chat interface components
- `service-worker.js`: Service worker for offline functionality
- `manifest.json`: Web app manifest for PWA
- `icon.svg`: App icon
- `splash.svg`: Splash screen
- `config.xml`: Configuration for app building

## License

MIT License