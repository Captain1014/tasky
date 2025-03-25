import React, { useState, useEffect } from 'react';
import './TodoForm.css';

function TodoForm({ onSubmit, initialData = null }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    reminderTime:'',
    completed: false,
    recurrence: 'none',
    recurrenceEndDate: '',
  });

  useEffect(() => {
    if (initialData) {
      // 수정 모드인 경우 초기 데이터 설정
      // datetime-local 입력 필드는 "YYYY-MM-DDThh:mm" 형식의 문자열이 필요합니다
      const formattedDueDate = initialData.dueDate ? formatDateTimeForInput(new Date(initialData.dueDate)) : '';
      const formattedReminderTime = initialData.reminderTime ? formatDateTimeForInput(new Date(initialData.reminderTime)) : '';
      const formattedRecurrenceEndDate = initialData.recurrenceEndDate ? formatDateTimeForInput(new Date(initialData.recurrenceEndDate)) : '';
      
      setFormData({
        ...initialData,
        dueDate: formattedDueDate,
        reminderTime: formattedReminderTime,
        recurrence: initialData.recurrence || 'none',
        recurrenceEndDate: formattedRecurrenceEndDate
      });
    }
  }, [initialData]);

  // datetime-local 입력 필드를 위한 날짜 형식 함수
  const formatDateTimeForInput = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // 반복 설정이 없음인 경우 반복 종료일 초기화
    if (name === 'recurrence' && value === 'none') {
      setFormData(prev => ({
        ...prev,
        recurrenceEndDate: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 기본 유효성 검사
    if (!formData.title.trim()) {
      alert('Enter your task!');
      return;
    }

     // 반복 설정이 있을 경우 알림 시간이 필요함
     if (formData.recurrence !== 'none' && !formData.reminderTime) {
      alert('Recurring tasks need a reminder time');
      return;
    }

    // ISO 형식의 날짜로 변환
    const todoData = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      reminderTime: formData.reminderTime ? new Date(formData.reminderTime).toISOString() : null,
      recurrenceEndDate: formData.recurrenceEndDate ? new Date(formData.recurrenceEndDate).toISOString() : null
    };

    onSubmit(todoData);
    
    // 폼 초기화 (수정 모드가 아닌 경우)
    if (!initialData) {
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        reminderTime: '',
        completed: false,
        recurrence: 'none',
        recurrenceEndDate: ''
      });
    }
  };

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <h2>{initialData ? `Editing: ${formData.title}` : 'New Task'}</h2>

      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Complete Weekly Report"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g. Summarize progress and next steps"
          rows="3"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="dueDate">Due Date</label>
        <input
          type="datetime-local"
          id="dueDate"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="reminderTime">Reminder Time</label>
        <input
          type="datetime-local"
          id="reminderTime"
          name="reminderTime"
          value={formData.reminderTime}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="recurrence">Repeat</label>
        <select
          id="recurrence"
          name="recurrence"
          value={formData.recurrence}
          onChange={handleChange}
        >
          <option value="none">Don't repeat</option>
          <option value="daily">Every day</option>
          <option value="weekly">Every week</option>
          <option value="biweekly">Every 2 weeks</option>
          <option value="monthly">Every month</option>
          <option value="yearly">Every year</option>
        </select>
      </div>
      
      {formData.recurrence !== 'none' && (
        <div className="form-group">
          <label htmlFor="recurrenceEndDate">Repeat Until (Optional)</label>
          <input
            type="date"
            id="recurrenceEndDate"
            name="recurrenceEndDate"
            value={formData.recurrenceEndDate}
            onChange={handleChange}
          />
        </div>
      )}

      
      {initialData && (
        <div className="form-group checkbox-group">
          <label htmlFor="completed">Done</label>
          <input
            type="checkbox"
            id="completed"
            name="completed"
            checked={formData.completed}
            onChange={handleChange}
          />
        </div>
      )}
      
      <button type="submit" className="submit-btn">
        {initialData ? 'Save' : 'Add'}
      </button>
    </form>
  );
}

export default TodoForm;