const { app, BrowserWindow, Tray, Menu, Notification, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { initialize, enable } = require('@electron/remote/main');

// @electron/remote 모듈 초기화
initialize();

// 개발 모드일 때만 electron-reload 활성화
if (isDev) {
  console.log('개발 모드: 파일 변경 감지 활성화');
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

let mainWindow;
let tray = null;

function createWindow() {
  // 모바일 앱 형태의 창 생성 (iPhone 크기)
  mainWindow = new BrowserWindow({
    width: 400,
    height: 812,
    resizable: false,
    fullscreenable: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // remote 모듈 활성화
  enable(mainWindow.webContents);

  // 앱 로드
  mainWindow.loadURL(
    isDev
      ? 'http://192.168.12.249:3000/' 
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // 개발자 도구 (개발 모드일 때만)
  // if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  // }

  

  mainWindow.on('closed', () => (mainWindow = null));
  
  // 트레이 아이콘 생성
  try {
    createTray();
  } catch (error) {
    console.error('트레이 생성 중 오류 발생:', error);
  }
}

function createTray() {
  try {
    // 기본 아이콘 사용 (트레이 아이콘 문제 방지)
    const { nativeImage } = require('electron');
    const icon = nativeImage.createEmpty();
    
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
      { label: '열기', click: () => mainWindow.show() },
      { label: '종료', click: () => app.quit() }
    ]);
    tray.setToolTip('할 일 관리 앱');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
  } catch (error) {
    console.error('트레이 아이콘 생성 실패:', error);
  }
}

// 알림 표시 IPC 핸들러 추가
ipcMain.handle('show-notification', (event, title, options) => {
  console.log('알림 요청 받음:', title, options);
  
  try {
    // Electron Notification 객체 생성
    const notification = new Notification({
      title: title,
      body: options.body || '',
      silent: options.silent || false,
      // 앱 아이콘이 있다면 추가
      icon: options.icon || path.join(__dirname, '../build/icon.png')
    });
    
    // 알림 표시
    notification.show();
    
    // 클릭 이벤트 처리
    notification.on('click', () => {
      console.log('알림 클릭됨');
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    
    return true;
  } catch (error) {
    console.error('알림 생성 오류:', error);
    return false;
  }
});

// 창 포커스 IPC 핸들러
ipcMain.on('focus-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 알림 권한 체크 (macOS)
if (process.platform === 'darwin') {
  app.whenReady().then(() => {
    // macOS에서 알림 권한 확인
    if (!Notification.isSupported()) {
      console.log('알림이 지원되지 않습니다.');
    }
  });
}