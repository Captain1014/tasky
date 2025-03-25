# Tasky

Tasky is a modern, offline-first task management desktop application built with Electron and React. It allows users to manage their tasks efficiently with features like due dates, recurring tasks, reminders, and offline support.

## Features

- **Task Management**: Create, edit, and delete tasks with titles, descriptions, and due dates
- **Smart Organization**: Automatically categorizes tasks into Today, Tomorrow, and All Tasks sections
- **Reminder System**: Set custom reminders for tasks with notification support
- **Recurring Tasks**: Schedule recurring tasks (daily, weekly, biweekly, monthly, yearly)
- **Offline Support**: Full offline functionality with IndexedDB data persistence
- **Responsive Design**: Clean, modern UI that adapts to different screen sizes
- **Electron Integration**: Native desktop experience with system notifications

## Installation

### Pre-built Binaries

Download the latest release for your platform:

- macOS: `tasky-0.1.0-arm64.dmg` or `tasky-0.1.0-arm64-mac.zip`
- Windows: `tasky-0.1.0-win.exe` (coming soon)
- Linux: `tasky-0.1.0-linux.AppImage` (coming soon)

### Build from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tasky.git
   cd tasky
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run electron:dev
   ```

4. Build the application:
   ```bash
   npm run electron:build
   ```

## Development

### Project Structure

```
tasky/
├── electron/         # Electron main process files
│   └── main.js       # Main entry point for Electron
├── public/           # Static assets
├── src/
│   ├── components/   # React components
│   ├── services/     # Business logic services
│   │   ├── db.js     # IndexedDB database service
│   │   └── notifications.js  # Notification service
│   ├── App.js        # Main React component
│   └── index.js      # React entry point
└── package.json      # Project configuration
```

### Scripts

- `npm start`: Run React app in development mode
- `npm run build`: Build React app for production
- `npm run electron:dev`: Run Electron app in development mode
- `npm run electron:build`: Build Electron app for production

## Technical Details

### Technologies Used

- **React**: Frontend UI library
- **Electron**: Desktop application framework
- **IndexedDB**: Client-side database for offline support
- **CSS**: Custom styling with responsive design

### Offline Support

Tasky uses IndexedDB for data persistence, allowing users to create and manage tasks even without an internet connection. Since the application is built with Electron, it directly accesses the local database without requiring service workers. All changes are saved automatically to ensure data persistence.

### Notification System

The app leverages Electron's native notification API, which provides a more integrated experience than web notifications. Scheduled notifications are managed through a queue system that persists across app restarts.

## Future Enhancements

- Cloud synchronization
- Task categories and tags
- Task priority levels
- Subtasks and checklists
- Data export/import
- Mobile application support (PWA version)

## Troubleshooting

If you encounter issues with notifications not appearing:
- Make sure you have granted notification permissions
- On macOS, check notification settings in System Preferences
- On Windows, check notification settings in the Action Center

For data persistence issues:
- Check that the app has sufficient permissions to access local storage
- Verify that your disk has enough space

## License

[MIT License](LICENSE)

## Acknowledgements

- This project was created with [Create React App](https://create-react-app.dev/)
- Electron integration based on [electron-react-boilerplate](https://electron-react-boilerplate.js.org/)