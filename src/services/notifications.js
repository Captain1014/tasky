// 알림 관리를 위한 서비스 (contextIsolation 모드용)

// 예약된 알림의 ID를 저장하는 맵
const scheduledNotifications = new Map();

// Electron 환경인지 확인하는 함수
const isElectron = () => {
  return window && window.electron && window.electron.notifications;
};

// 알림 권한 요청 (Electron에서는 항상 허용됨)
const requestNotificationPermission = async () => {
  // Electron 환경에서는 권한 요청이 필요 없음
  if (isElectron()) {
    console.log('Electron 환경 알림 권한: 항상 허용');
    return true;
  }
  
  // 웹 환경일 경우 기존 로직 사용
  if (!('Notification' in window)) {
    console.log('이 브라우저는 알림을 지원하지 않습니다.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// 알림 표시
const showNotification = async (title, options = {}) => {
  console.log('알림 표시 요청:', title, options);
  
  // Electron 환경
  if (isElectron()) {
    try {
      console.log('Electron 알림 사용');
      
      // IPC에서는 함수를 전송할 수 없으므로 onClick 함수는 제외
      // 대신 main.js에서 일관된 방식으로 창 포커스 처리
      const notificationOptions = {
        body: options.body || '',
        silent: options.silent || false
      };
      
      // IPC를 통해 메인 프로세스에 알림 요청
      const result = await window.electron.notifications.show(title, notificationOptions);
      
      // 알림이 클릭되면 window.electron.window.focus()가 자동으로 호출됨
      return result;
    } catch (error) {
      console.error('Electron 알림 오류:', error);
      return null;
    }
  } 
  // 웹 환경
  else if (Notification.permission === 'granted') {
    console.log('웹 알림 사용');
    const notification = new Notification(title, {
      body: options.body || '',
      icon: options.icon || '',
      silent: options.silent || false
    });

    if (options.onClick) {
      notification.onclick = options.onClick;
    }
    
    return notification;
  }
  
  console.log('알림 권한 없음');
  return null;
};

// 다음 반복 알림 시간 계산
const calculateNextReminderTime = (todo) => {
  if (!todo.reminderTime || !todo.recurrence || todo.recurrence === 'none') {
    return null;
  }
  
  // 원래 알림 시간
  const currentReminder = new Date(todo.reminderTime);
  const now = new Date();
  
  // 종료일이 지났는지 확인
  if (todo.recurrenceEndDate && new Date(todo.recurrenceEndDate) < now) {
    return null;
  }
  
  // 다음 알림 시간 계산
  let nextReminder = new Date(currentReminder);
  
  switch (todo.recurrence) {
    case 'daily':
      // 하루 추가
      nextReminder.setDate(nextReminder.getDate() + 1);
      break;
      
    case 'weekly':
      // 7일 추가
      nextReminder.setDate(nextReminder.getDate() + 7);
      break;
      
    case 'biweekly':
      // 14일 추가
      nextReminder.setDate(nextReminder.getDate() + 14);
      break;
      
    case 'monthly':
      // 한 달 추가
      nextReminder.setMonth(nextReminder.getMonth() + 1);
      break;
      
    case 'yearly':
      // 1년 추가
      nextReminder.setFullYear(nextReminder.getFullYear() + 1);
      break;
      
    default:
      return null;
  }
  
  // 다음 알림이 종료일을 넘기지 않는지 확인
  if (todo.recurrenceEndDate && nextReminder > new Date(todo.recurrenceEndDate)) {
    return null;
  }
  
  return nextReminder.toISOString();
};

// 반복 일정 생성
const createRecurringTodo = (todo, newReminderTime) => {
  // 다음 할 일 생성 (id는 유지, 완료 상태 리셋)
  const nextTodo = {
    ...todo,
    reminderTime: newReminderTime,
    completed: false
  };
  
  // 마감일도 같은 간격으로 이동
  if (todo.dueDate) {
    const oldDueDate = new Date(todo.dueDate);
    const oldReminderTime = new Date(todo.reminderTime);
    const newReminderDate = new Date(newReminderTime);
    
    // 원래 알림과 마감일의 시간 차이 계산
    const timeDiff = oldDueDate.getTime() - oldReminderTime.getTime();
    
    // 새 마감일 = 새 알림 시간 + 차이
    const newDueDate = new Date(newReminderDate.getTime() + timeDiff);
    nextTodo.dueDate = newDueDate.toISOString();
  }
  
  return nextTodo;
};

// 할 일 알림 예약
const scheduleNotification = (todo, updateTodoCallback = null) => {
  if (!todo.reminderTime || !todo.id) {
    console.log('알림 예약 실패: reminderTime 또는 id가 없음', todo);
    return null;
  }
  
  // 기존 예약된 알림이 있으면 취소
  cancelScheduledNotification(todo.id);
  
  try {
    const reminderTime = new Date(todo.reminderTime).getTime();
    const now = Date.now();
    
    console.log(`알림 예약: ${todo.title}, 시간: ${new Date(reminderTime).toLocaleString()}, 남은 시간: ${Math.round((reminderTime - now)/1000/60)}분`);
    
    if (reminderTime > now) {
      const timeoutId = setTimeout(async () => {
        console.log(`알림 실행: ${todo.title}`);
        
        await showNotification(`Tasky Reminder: ${todo.title}`, {
          body: todo.description || "Let's get the work done!"
          // onClick 함수는 더 이상 전달하지 않음
        });
        
        // 알림 표시 후 저장소에서 제거
        scheduledNotifications.delete(todo.id);

        // 반복 알림 처리
        if (todo.recurrence && todo.recurrence !== 'none') {
          const nextReminderTime = calculateNextReminderTime(todo);
          
          if (nextReminderTime) {
            console.log(`다음 반복 알림 예약: ${todo.title}, 시간: ${new Date(nextReminderTime).toLocaleString()}`);
            
            // 새로운 반복 할 일 생성
            const nextTodo = createRecurringTodo(todo, nextReminderTime);
            
            // 콜백이 제공되었다면 호출하여 할 일 목록 업데이트
            if (typeof updateTodoCallback === 'function') {
              updateTodoCallback(nextTodo);
            }
            
            // 다음 알림 예약
            scheduleNotification(nextTodo, updateTodoCallback);
          } else {
            console.log(`반복 종료: ${todo.title}`);
          }
        }

        
        // 완료되지 않은 작업에 대해 추가 알림 예약 (5분 후 재알림)
        else if (!todo.completed) {
          const reminderIntervalId = setTimeout(async () => {
            await showNotification(`Remaining Task: ${todo.title}`, {
              body: 'Still not completed!'
            });
          }, 5 * 60 * 1000); // 5분 후 재알림
          
          // 재알림 ID 저장 (todo.id에 '-reminder' 접미사 추가)
          scheduledNotifications.set(`${todo.id}-reminder`, reminderIntervalId);
        }
      }, reminderTime - now);
      
      // 알림 ID 저장
      scheduledNotifications.set(todo.id, timeoutId);
      
      return timeoutId;
    } else {
      console.log(`지난 알림 무시: ${todo.title}, 시간: ${new Date(reminderTime).toLocaleString()}`);

      // 지난 알림이지만 반복 일정이 있다면 다음 알림 예약
      if (todo.recurrence && todo.recurrence !== 'none') {
        const nextReminderTime = calculateNextReminderTime(todo);
        
        if (nextReminderTime) {
          console.log(`다음 반복 알림 예약(지난 알림): ${todo.title}, 시간: ${new Date(nextReminderTime).toLocaleString()}`);
          
          // 새로운 반복 할 일 생성
          const nextTodo = createRecurringTodo(todo, nextReminderTime);
          
          // 콜백이 제공되었다면 호출하여 할 일 목록 업데이트
          if (typeof updateTodoCallback === 'function') {
            updateTodoCallback(nextTodo);
          }
          
          // 다음 알림 예약
          return scheduleNotification(nextTodo, updateTodoCallback);
        }
      }
    }
  } catch (error) {
    console.error('알림 예약 오류:', error);
  }
  
  return null;
};

// 예약된 알림 취소
const cancelScheduledNotification = (todoId) => {
  if (!todoId) return;
  
  // 기본 알림 취소
  if (scheduledNotifications.has(todoId)) {
    clearTimeout(scheduledNotifications.get(todoId));
    scheduledNotifications.delete(todoId);
    console.log(`알림 취소: ${todoId}`);
  }
  
  // 재알림 취소
  const reminderId = `${todoId}-reminder`;
  if (scheduledNotifications.has(reminderId)) {
    clearTimeout(scheduledNotifications.get(reminderId));
    scheduledNotifications.delete(reminderId);
    console.log(`재알림 취소: ${reminderId}`);
  }
};

// 할 일 완료 처리 시 알림 취소
const markTodoCompleted = (todoId) => {
  cancelScheduledNotification(todoId);
  cancelScheduledNotification(`${todoId}-reminder`);
};

// 모든 할 일의 알림 일괄 예약 (앱 시작 시 호출)
const scheduleAllNotifications = (todos) => {
  console.log('모든 알림 예약 시작', todos.length);
  
  // 먼저, 모든 예약된 알림 취소
  clearAllScheduledNotifications();
  
  // 각 할 일에 대해 알림 예약
  todos.forEach(todo => {
    if (!todo.completed && todo.reminderTime) {
      scheduleNotification(todo);
    }
  });
  
  console.log('알림 예약 완료');
};

// 모든 예약된 알림 취소 (앱 종료 시 또는 재설정 시 호출)
const clearAllScheduledNotifications = () => {
  console.log(`모든 알림 취소 (${scheduledNotifications.size}개)`);
  
  scheduledNotifications.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  scheduledNotifications.clear();
};

// 알림 권한 체크 및 요청 (앱 시작 시 호출)
const initializeNotifications = async () => {
  console.log('알림 초기화 시작');
  const hasPermission = await requestNotificationPermission();
  console.log('알림 권한:', hasPermission);
  return hasPermission;
};

// 테스트 알림 보내기 (디버깅용)
const sendTestNotification = async () => {
  console.log('테스트 알림 발송');
  return await showNotification('테스트 알림', {
    body: '이것은 테스트 알림입니다.'
  });
};

export {
  requestNotificationPermission,
  showNotification,
  scheduleNotification,
  cancelScheduledNotification,
  markTodoCompleted,
  scheduleAllNotifications,
  clearAllScheduledNotifications,
  initializeNotifications,
  sendTestNotification,
  calculateNextReminderTime,
  createRecurringTodo
};