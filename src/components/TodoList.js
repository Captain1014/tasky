import React, { useState } from 'react';
import TodoItem from './TodoItem';
import TodoFilter from './TodoFilter';
import './TodoList.css';

function TodoList({ todos, onToggleTodo, onDeleteTodo, onEdit }) {
  const [filter, setFilter] = useState({
    status: 'all',
    sortBy: 'date',
    sortDirection: 'desc',
    searchTerm: ''
  });
  
  // 오늘 날짜 가져오기
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 오늘 마감인 할 일 필터링
  const todayTodos = todos.filter(todo => {

    // 상태 필터 적용
  if (filter.status === 'active' && todo.completed) return false;
  if (filter.status === 'completed' && !todo.completed) return false;
  
  // 검색어 필터 적용
  if (filter.searchTerm && !todo.title.toLowerCase().includes(filter.searchTerm.toLowerCase())) {
    return false;
  }

    if (!todo.dueDate) return false;
    const dueDate = new Date(todo.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }).sort((a, b) => {
    // 미완료 항목 우선, 그 다음 알림 시간순
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const timeA = a.reminderTime ? new Date(a.reminderTime).getTime() : Infinity;
    const timeB = b.reminderTime ? new Date(b.reminderTime).getTime() : Infinity;
    return timeA - timeB;
  });
  
  // 내일 마감인 할 일 필터링
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTodos = todos.filter(todo => {
      // 상태 필터 적용
  if (filter.status === 'active' && todo.completed) return false;
  if (filter.status === 'completed' && !todo.completed) return false;
  
  // 검색어 필터 적용
  if (filter.searchTerm && !todo.title.toLowerCase().includes(filter.searchTerm.toLowerCase())) {
    return false;
  }

    if (!todo.dueDate) return false;
    const dueDate = new Date(todo.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === tomorrow.getTime();
  }).sort((a, b) => a.completed ? 1 : -1);
  
  // 필터링 및 정렬 로직
  const filteredTodos = todos.filter(todo => {
    // 상태 필터
    if (filter.status === 'active' && todo.completed) return false;
    if (filter.status === 'completed' && !todo.completed) return false;
    
    // 검색어 필터
    if (filter.searchTerm && !todo.title.toLowerCase().includes(filter.searchTerm.toLowerCase())) {
      return false;
    }
    
    if (!todo.dueDate) return true;
      
      const dueDate = new Date(todo.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      // 오늘이나 내일 마감인 항목은 제외
      if (dueDate.getTime() === today.getTime() || dueDate.getTime() === tomorrow.getTime()) {
        return false;
      }
    
    
    return true;
  }).sort((a, b) => {
    // 정렬 로직
    let valueA, valueB;
    
    switch (filter.sortBy) {
      case 'title':
        valueA = a.title.toLowerCase();
        valueB = b.title.toLowerCase();
        break;
      case 'dueDate':
        valueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        valueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        break;
      case 'date':
      default:
        valueA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valueB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
    }
    
    // 정렬 방향
    return filter.sortDirection === 'asc'
      ? valueA > valueB ? 1 : -1
      : valueA < valueB ? 1 : -1;
  });

  // 임박한 할 일이 있는지 확인
  const hasUrgentTodos = todayTodos.some(todo => !todo.completed);

  return (
    <div className="todo-list-container">
      <TodoFilter filter={filter} setFilter={setFilter} />
      
      <div className="todo-list">
        {/* 오늘 마감 섹션 (있을 경우에만 표시) */}
        {todayTodos.length > 0 && (
          <div className="todo-section today-section">
            <h2 className={`section-title ${hasUrgentTodos ? 'urgent' : ''}`}>
              {hasUrgentTodos ? '🔥 Due Today' : '✓ Today\'s Tasks'} ({todayTodos.length})
            </h2>
            <div className="section-items">
              {todayTodos.map(todo => (
                <TodoItem
                  key={`today-${todo.id}`}
                  todo={todo}
                  onToggle={onToggleTodo}
                  onDelete={onDeleteTodo}
                  onEdit={onEdit}
                  highlight={true}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* 내일 마감 섹션 (있을 경우에만 표시) */}
        {tomorrowTodos.length > 0 && (
          <div className="todo-section tomorrow-section">
            <h2 className="section-title">📌 Due Tomorrow ({tomorrowTodos.length})</h2>
            <div className="section-items">
              {tomorrowTodos.map(todo => (
                <TodoItem
                  key={`tomorrow-${todo.id}`}
                  todo={todo}
                  onToggle={onToggleTodo}
                  onDelete={onDeleteTodo}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* 기타 할 일 섹션 */}
        <div className="todo-section other-section">
          <h2 className="section-title">📋 All Tasks ({filteredTodos.length})</h2>
          {filteredTodos.length === 0 ? (
            <div className="empty-list">
              {filter.searchTerm || filter.status !== 'all'
                ? 'No matching tasks found.'
                : 'No other tasks.'}
            </div>
          ) : (
            <div className="section-items">
              {filteredTodos.map(todo => (
                <TodoItem
                  key={`other-${todo.id}`}
                  todo={todo}
                  onToggle={onToggleTodo}
                  onDelete={onDeleteTodo}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TodoList;