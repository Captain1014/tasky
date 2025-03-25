// public/service-worker.js

// 캐시 이름 정의
const CACHE_NAME = 'tasky-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

// 서비스 워커 설치 시 정적 자산 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('정적 자산 캐싱 중...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 서비스 워커 활성화 시 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('이전 캐시 삭제:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  // API 요청은 네트워크 우선, 실패 시 캐시 사용
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 응답 복사본 캐싱
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
          
          return response;
        })
        .catch(() => {
          console.log('API 요청 실패, 캐시에서 가져오기 시도:', event.request.url);
          return caches.match(event.request);
        })
    );
  } 
  // 정적 자산은 캐시 우선, 실패 시 네트워크 사용
  else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // 캐시에서 찾으면 반환
          if (response) {
            return response;
          }
          
          // 캐시에 없으면 네트워크 요청
          return fetch(event.request).then(
            (response) => {
              // 유효한 응답인지 확인
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // 응답 복사본 캐싱
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
                
              return response;
            }
          );
        })
    );
  }
});

// 백그라운드 동기화 처리
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-todos') {
    event.waitUntil(syncTodos());
  }
});

// 할 일 데이터 동기화 함수
function syncTodos() {
  return self.clients.matchAll().then((clients) => {
    return clients.map(client => {
      // 클라이언트에 동기화 메시지 전송
      return client.postMessage({
        type: 'sync-todos',
        timestamp: Date.now()
      });
    });
  }).then(() => {
    return getLocalData('sync-queue')
      .then(syncQueue => {
        if (!syncQueue || !syncQueue.length) {
          return Promise.resolve();
        }
        
        // 동기화 대기열의 각 항목에 대해 API 요청 수행
        let syncPromises = syncQueue.map(item => {
          let { url, method, data, id } = item;
          
          return fetch(url, {
            method: method,
            headers: {
              'Content-Type': 'application/json'
            },
            body: data ? JSON.stringify(data) : undefined
          })
          .then(response => {
            // 성공 시 대기열에서 제거
            return removeFromSyncQueue(id);
          })
          .catch(error => {
            // 오류 발생 시 대기열 유지
            console.error('동기화 실패:', error);
            return Promise.resolve();
          });
        });
        
        return Promise.all(syncPromises);
      });
  });
}

// IndexedDB 접근 함수
function getLocalData(storeName) {
  return self.indexedDB.open('tasky-db', 1).then(db => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    return store.getAll();
  });
}

// 동기화 대기열에서 항목 제거
function removeFromSyncQueue(id) {
  return self.indexedDB.open('tasky-db', 1).then(db => {
    const transaction = db.transaction('sync-queue', 'readwrite');
    const store = transaction.objectStore('sync-queue');
    return store.delete(id);
  });
}

// 푸시 알림 처리
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || '할 일을 확인하세요!',
      icon: '/icon-192.png',
      badge: '/badge.png',
      data: data
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '할 일 알림', options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window'
    }).then((clientList) => {
      // 이미 열린 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 열린 창이 없으면 새 창 열기
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});