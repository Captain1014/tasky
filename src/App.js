import React, { useState, useEffect } from 'react';
import TodoList from './components/TodoList';
import TodoForm from './components/TodoForm';
import StatusBar from './components/StatusBar'; // 새 컴포넌트
import { 
  initializeNotifications,
  scheduleNotification,
  cancelScheduledNotification,
  scheduleAllNotifications,
  clearAllScheduledNotifications,
  sendTestNotification
} from './services/notifications';
import {
  initDatabase,
  getAllTodos,
  addTodo as dbAddTodo,
  updateTodo as dbUpdateTodo,
  deleteTodo as dbDeleteTodo,
  trySync
} from './services/db';
import './App.css';

// 서비스 워커 등록 함수
const registerServiceWorker = async () => {

  if (window.navigator.userAgent.indexOf('Electron') !== -1 || window.location.protocol === 'file:') {
    console.log('Electron 환경 또는 file:// 프로토콜에서는 서비스 워커를 등록하지 않습니다.');
    return null;
  }
  
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('서비스 워커 등록 성공:', registration.scope);
      
      // 서비스 워커로부터 메시지 수신
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type } = event.data;
        
        if (type === 'sync-todos') {
          console.log('서비스 워커로부터 동기화 메시지 수신');
          // 필요한 경우 UI 업데이트
        }
      });
      
      return registration;
    } catch (error) {
      console.error('서비스 워커 등록 실패:', error);
      return null;
    }
  }
  return null;
};

function App() {
  const [todos, setTodos] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  
  // 폼 모달 표시 여부
  const [showTodoForm, setShowTodoForm] = useState(false);
  // 수정할 할 일 정보
  const [editingTodo, setEditingTodo] = useState(null);

  // 앱 초기화
  useEffect(() => {
    const initApp = async () => {
      try {
        // IndexedDB 초기화
        const dbSuccess = await initDatabase();
        setDbInitialized(dbSuccess);
        
        // 서비스 워커 등록
        const swRegistration = await registerServiceWorker();
        setSwRegistered(!!swRegistration);
        
        // 네트워크 상태 모니터링
        window.addEventListener('online', handleOnlineStatusChange);
        window.addEventListener('offline', handleOnlineStatusChange);
        
        // 알림 초기화
        const hasPermission = await initializeNotifications();
        
        // 할 일 데이터 로드
        await loadTodos();
        
        setIsLoading(false);
      } catch (error) {
        console.error('앱 초기화 오류:', error);
        setIsLoading(false);
      }
    };
    
    initApp();
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      clearAllScheduledNotifications();
    };
  }, []);

  // 할 일 데이터 로드
  const loadTodos = async () => {
    try {
      const todosFromDb = await getAllTodos();
      setTodos(todosFromDb || []);
      
      // 알림 예약
      if (todosFromDb && todosFromDb.length > 0) {
        scheduleAllNotifications(todosFromDb, handleUpdateRecurringTodo);
      }
    } catch (error) {
      console.error('할 일 데이터 로드 오류:', error);
    }
  };

  // 네트워크 상태 변경 처리
  const handleOnlineStatusChange = () => {
    const online = navigator.onLine;
    setIsOnline(online);
    
    if (online) {
      console.log('온라인 상태 변경: 동기화 시도');
      trySync();
    } else {
      console.log('오프라인 상태 변경: 로컬 데이터 사용');
    }
  };

  // 반복 할 일 업데이트 처리 함수 (알림 서비스에서 호출됨)
  const handleUpdateRecurringTodo = async (recurringTodo) => {
    try {
      // IndexedDB에 업데이트
      await dbUpdateTodo(recurringTodo);
      
      // UI 상태 업데이트
      setTodos(prevTodos => {
        // ID로 기존 할 일 찾기
        const todoIndex = prevTodos.findIndex(todo => todo.id === recurringTodo.id);
        
        if (todoIndex !== -1) {
          // 할 일 복제 및 업데이트
          const updatedTodos = [...prevTodos];
          updatedTodos[todoIndex] = recurringTodo;
          return updatedTodos;
        }
        
        return prevTodos;
      });
    } catch (error) {
      console.error('반복 할 일 업데이트 오류:', error);
    }
  };

  // 새 할 일 추가
  const handleAddTodo = async (todoData) => {
    try {
      console.log('할 일 추가 시도:', todoData);
      const newTodo = {
        ...todoData,
        id: Date.now(),
        createdAt: new Date().toISOString()
      };
      
      // IndexedDB에 저장 시도
    try {
      await dbAddTodo(newTodo);
    } catch (dbError) {
      console.error('IndexedDB 저장 실패, localStorage 사용:', dbError);
      // localStorage 폴백
      const currentTodos = JSON.parse(localStorage.getItem('todos') || '[]');
      currentTodos.push(newTodo);
      localStorage.setItem('todos', JSON.stringify(currentTodos));
    }
      
      // UI 상태 업데이트
      setTodos(prevTodos => [...prevTodos, newTodo]);
      setShowTodoForm(false); // 폼 닫기
      
      // 알림 설정이 있다면 알림 예약
      if (newTodo.reminderTime) {
        scheduleNotification(newTodo, handleUpdateRecurringTodo);
      }
    } catch (error) {
      console.error('할 일 추가 오류:', error);
      alert('할 일을 추가하는 중 오류가 발생했습니다.');
    }
  };

  // 할 일 완료 상태 토글
  const handleToggleTodo = async (todoId) => {
    try {
      // 현재 할 일 찾기
      const todo = todos.find(t => t.id === todoId);
      if (!todo) return;
      
      const updated = { ...todo, completed: !todo.completed };
      
      // IndexedDB 업데이트
      await dbUpdateTodo(updated);
      
      // UI 상태 업데이트
      setTodos(
        todos.map(todo => {
          if (todo.id === todoId) {
            // 완료로 변경되었다면 알림 취소
            if (updated.completed) {
              cancelScheduledNotification(todoId);
            }
            // 미완료로 변경되었고 알림 시간이 미래라면 다시 알림 설정
            else if (!updated.completed && updated.reminderTime) {
              const reminderTime = new Date(updated.reminderTime).getTime();
              if (reminderTime > Date.now() || updated.recurrence !== 'none') {
                scheduleNotification(updated, handleUpdateRecurringTodo);
              }
            }
            
            return updated;
          }
          return todo;
        })
      );
    } catch (error) {
      console.error('할 일 완료 상태 토글 오류:', error);
      alert('할 일 상태를 변경하는 중 오류가 발생했습니다.');
    }
  };

  // 할 일 삭제
  const handleDeleteTodo = async (todoId) => {
    try {
      // IndexedDB에서 삭제
      await dbDeleteTodo(todoId);
      
      // 알림 취소
      cancelScheduledNotification(todoId);
      
      // UI 상태 업데이트
      setTodos(todos.filter(todo => todo.id !== todoId));
    } catch (error) {
      console.error('할 일 삭제 오류:', error);
      alert('할 일을 삭제하는 중 오류가 발생했습니다.');
    }
  };

  // 할 일 수정 폼 열기
  const handleEditClick = (todo) => {
    setEditingTodo(todo);
    setShowTodoForm(true);
  };

  // 할 일 수정
  const handleEditTodo = async (updatedTodo) => {
    try {
      // IndexedDB 업데이트
      await dbUpdateTodo(updatedTodo);
      
      // UI 상태 업데이트
      setTodos(
        todos.map(todo => {
          if (todo.id === updatedTodo.id) {
            // 알림 시간이나 반복 설정이 변경되었다면 알림 재설정
            if (todo.reminderTime !== updatedTodo.reminderTime || 
                todo.recurrence !== updatedTodo.recurrence ||
                todo.recurrenceEndDate !== updatedTodo.recurrenceEndDate) {
              
              // 기존 알림 취소
              cancelScheduledNotification(todo.id);
              
              // 새 알림 설정 (완료되지 않은 경우에만)
              if (!updatedTodo.completed && updatedTodo.reminderTime) {
                scheduleNotification(updatedTodo, handleUpdateRecurringTodo);
              }
            }
            
            return updatedTodo;
          }
          return todo;
        })
      );
      
      setShowTodoForm(false); // 폼 닫기
      setEditingTodo(null); // 수정 데이터 초기화
    } catch (error) {
      console.error('할 일 수정 오류:', error);
      alert('할 일을 수정하는 중 오류가 발생했습니다.');
    }
  };

  // 폼 제출 핸들러
  const handleFormSubmit = (todoData) => {
    if (editingTodo) {
      handleEditTodo({ ...editingTodo, ...todoData });
    } else {
      handleAddTodo(todoData);
    }
  };

  // 폼 모달 닫기
  const handleCloseForm = () => {
    setShowTodoForm(false);
    setEditingTodo(null);
  };

  // 수동 동기화 요청
  const handleManualSync = () => {
    if (navigator.onLine) {
      trySync();
    } else {
      alert('오프라인 상태입니다. 인터넷 연결을 확인해주세요.');
    }
  };

  // 테스트 알림 발송 (개발용)
  const handleTestNotification = () => {
    sendTestNotification();
  };

  // 로딩 중 화면
  if (isLoading) {
    return (
      <div className="App loading">
        <div className="loader">
          <h2>Loading...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <StatusBar 
        isOnline={isOnline} 
        onManualSync={handleManualSync} 
      />
      
      <header className="App-header">
        <h1>Tasky</h1>
        {/* {process.env.NODE_ENV === 'development' && (
          <button onClick={handleTestNotification} className="test-btn">
            Test Notification
          </button>
        )} */}
      </header>
      
      <main className="App-main">
        <div className="date-header">
          <h2>Today</h2>
          <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>

         {/* Floating Action Button */}
         <button 
          className="fab"
          onClick={() => setShowTodoForm(true)}
        >
          +
        </button>
        

        <TodoList
          todos={todos}
          onAddTodo={handleAddTodo}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
          onEdit={handleEditClick}
        />
        
       
        {/* TodoForm Modal */}
        {showTodoForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button 
                className="modal-close-btn"
                onClick={handleCloseForm}
              >
                &times;
              </button>
              <TodoForm 
                onSubmit={handleFormSubmit}
                initialData={editingTodo}
              />
            </div>
          </div>
        )}
        
        {/* 오프라인 모드 알림 */}
        {!isOnline && (
          <div className="offline-badge">
            Offline Mode
          </div>
        )}
      </main>
    </div>
  );
}

export default App;