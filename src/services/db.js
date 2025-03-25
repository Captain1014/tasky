// src/services/db.js

// IndexedDB 데이터베이스 이름 및 버전
const DB_NAME = 'tasky-db';
const DB_VERSION = 1;

// 데이터베이스 초기화
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    // 데이터베이스 스키마 생성 또는 업그레이드
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 할 일 저장소 생성
      if (!db.objectStoreNames.contains('todos')) {
        const todoStore = db.createObjectStore('todos', { keyPath: 'id' });
        todoStore.createIndex('completed', 'completed', { unique: false });
        todoStore.createIndex('dueDate', 'dueDate', { unique: false });
        todoStore.createIndex('reminderTime', 'reminderTime', { unique: false });
      }
      
      // 동기화 대기열 저장소 생성
      if (!db.objectStoreNames.contains('sync-queue')) {
        const syncStore = db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // 앱 설정 저장소 생성
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };
    
    request.onerror = (event) => {
      console.error('IndexedDB 오류:', event.target.error);
      reject(event.target.error);
    };
  });
};

// 데이터베이스 트랜잭션 생성 헬퍼
const getTransaction = (storeName, mode = 'readonly') => {
  return initDB().then(db => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return { transaction, store };
  });
};

// 할 일 관련 CRUD 함수

// 모든 할 일 가져오기
const getAllTodos = () => {
  return getTransaction('todos')
    .then(({ store }) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
};

// 할 일 추가
const addTodo = (todo) => {
  return getTransaction('todos', 'readwrite')
    .then(({ store }) => {
      return new Promise((resolve, reject) => {
        const request = store.add(todo);
        
        request.onsuccess = () => {
          resolve(todo);
          
          // 온라인 상태이면 동기화 시도
          if (navigator.onLine) {
            trySync();
          } else {
            // 오프라인이면 동기화 대기열에 추가
            addToSyncQueue({
              type: 'add',
              url: '/api/todos',
              method: 'POST',
              data: todo,
              timestamp: Date.now()
            });
          }
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
};

// 할 일 수정
const updateTodo = (todo) => {
  return getTransaction('todos', 'readwrite')
    .then(({ store }) => {
      return new Promise((resolve, reject) => {
        const request = store.put(todo);
        
        request.onsuccess = () => {
          resolve(todo);
          
          // 온라인 상태이면 동기화 시도
          if (navigator.onLine) {
            trySync();
          } else {
            // 오프라인이면 동기화 대기열에 추가
            addToSyncQueue({
              type: 'update',
              url: `/api/todos/${todo.id}`,
              method: 'PUT',
              data: todo,
              timestamp: Date.now()
            });
          }
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
};

// 할 일 삭제
const deleteTodo = (todoId) => {
  return getTransaction('todos', 'readwrite')
    .then(({ store }) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(todoId);
        
        request.onsuccess = () => {
          resolve(todoId);
          
          // 온라인 상태이면 동기화 시도
          if (navigator.onLine) {
            trySync();
          } else {
            // 오프라인이면 동기화 대기열에 추가
            addToSyncQueue({
              type: 'delete',
              url: `/api/todos/${todoId}`,
              method: 'DELETE',
              timestamp: Date.now()
            });
          }
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
};

// 특정 할 일 가져오기
const getTodo = (todoId) => {
  return getTransaction('todos')
    .then(({ store }) => {
      return new Promise((resolve, reject) => {
        const request = store.get(todoId);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
};

// 동기화 대기열 관리 함수

// 동기화 대기열에 항목 추가
const addToSyncQueue = (item) => {
  return getTransaction('sync-queue', 'readwrite')
    .then(({ store }) => {
      return new Promise((resolve, reject) => {
        const request = store.add(item);
        
        request.onsuccess = () => {
          resolve(item);
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
};

// 동기화 대기열에서 항목 제거
const removeFromSyncQueue = (id) => {
  return getTransaction('sync-queue', 'readwrite')
    .then(({ store }) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        
        request.onsuccess = () => {
          resolve(id);
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
};

// 동기화 대기열 가져오기
const getSyncQueue = () => {
  return getTransaction('sync-queue')
    .then(({ store }) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
};

// 설정 관리 함수

// 설정 가져오기
const getSetting = (id) => {
  return getTransaction('settings')
    .then(({ store }) => {
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          resolve(request.result ? request.result.value : null);
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
};

// 설정 저장
const saveSetting = (id, value) => {
  return getTransaction('settings', 'readwrite')
    .then(({ store }) => {
      return new Promise((resolve, reject) => {
        const request = store.put({ id, value });
        
        request.onsuccess = () => {
          resolve(value);
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    });
};

// 동기화 관련 함수

// 동기화 시도
const trySync = () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(registration => {
        return registration.sync.register('sync-todos')
          .catch(err => {
            console.error('백그라운드 동기화 등록 실패:', err);
            // 수동 동기화 실행
            manualSync();
          });
      });
  } else {
    // 백그라운드 동기화를 지원하지 않는 경우 수동 동기화
    manualSync();
  }
};

// 수동 동기화
const manualSync = async () => {
  if (!navigator.onLine) {
    console.log('오프라인 상태, 동기화 연기');
    return;
  }
  
  try {
    const syncQueue = await getSyncQueue();
    
    if (!syncQueue || !syncQueue.length) {
      console.log('동기화할 항목 없음');
      return;
    }
    
    console.log(`${syncQueue.length}개 항목 동기화 시작`);
    
    for (const item of syncQueue) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: item.data ? JSON.stringify(item.data) : undefined
        });
        
        // 성공 시 대기열에서 제거
        await removeFromSyncQueue(item.id);
        console.log(`항목 동기화 성공: ${item.type} ${item.url}`);
      } catch (error) {
        console.error(`항목 동기화 실패: ${item.type} ${item.url}`, error);
        // 실패한 항목은 대기열에 유지
      }
    }
  } catch (error) {
    console.error('동기화 처리 중 오류:', error);
  }
};

// 네트워크 상태 모니터링
const setupNetworkListeners = () => {
  window.addEventListener('online', () => {
    console.log('온라인 상태 감지, 동기화 시작');
    trySync();
  });
  
  window.addEventListener('offline', () => {
    console.log('오프라인 상태 감지');
  });
};

// 초기화 함수
const initDatabase = async () => {
  try {
    await initDB();
    setupNetworkListeners();
    console.log('IndexedDB 초기화 완료');
    
    // 온라인 상태이면 즉시 동기화 시도
    if (navigator.onLine) {
      trySync();
    }
    
    return true;
  } catch (error) {
    console.error('IndexedDB 초기화 실패:', error);
    return false;
  }
};

export {
  initDatabase,
  getAllTodos,
  getTodo,
  addTodo,
  updateTodo,
  deleteTodo,
  getSetting,
  saveSetting,
  trySync,
  manualSync
};