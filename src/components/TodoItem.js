import React from 'react';
import './TodoItem.css';

function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  // 시간 형식을 보기 좋게 변환하는 함수
  // const formatTime = (dateString) => {
  //   const date = new Date(dateString);
  //   {todo.dueDate && <p className="todo-due-date">Due Date: {new Date(todo.dueDate).toLocaleDateString()}</p>}
  //   return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  // };

  return (
    <div className={`todo-item ${todo.completed ? 'completed' : ''} ${todo.priority ? 'priority' : ''}`}>
      <div 
        className="todo-checkbox"
        onClick={() => onToggle(todo.id)}
      />
      
      <div className="todo-content">
        <h3 className="todo-title">
          {todo.title}
          {todo.priority && <span className="priority-tag">Priority</span>}
        </h3>
        
        {todo.description && <p className="todo-description">{todo.description}</p>}
        
        {/* {todo.dueDate && (
          <div className="todo-time">
            
          </div>
        )} */}
        
        {todo.reminderTime && (
          <div className="todo-reminder-time">
            🕰️
            {todo.dueDate && <p className="todo-due-date">Due: {new Date(todo.dueDate).toLocaleDateString()}</p>}
          </div>
        )}
      </div>
      
      <div className="todo-actions">
        <button onClick={() => onEdit(todo)} className="edit-btn">Edit</button>
        <button onClick={() => onDelete(todo.id)} className="delete-btn">Delete</button>
      </div>
    </div>
  );
}

export default TodoItem;