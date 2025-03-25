// App.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

// 기본적인 기능 모킹
jest.mock('../services/db', () => ({
  initDatabase: jest.fn().mockResolvedValue(true),
  getAllTodos: jest.fn().mockResolvedValue([]),
  addTodo: jest.fn().mockImplementation(todo => Promise.resolve(todo)),
  updateTodo: jest.fn().mockImplementation(todo => Promise.resolve(todo)),
  deleteTodo: jest.fn().mockResolvedValue(true)
}));

jest.mock('../services/notifications', () => ({
  initializeNotifications: jest.fn().mockResolvedValue(true),
  scheduleNotification: jest.fn()
}));

describe('Tasky 앱', () => {
  test('앱이 로드되고 주요 컴포넌트가 표시되는지 확인', async () => {
    render(<App />);
    
    // 앱 타이틀 확인
    expect(await screen.findByText('Tasky')).toBeInTheDocument();
    
    // 새 할 일 버튼 확인
    expect(screen.getByText('+')).toBeInTheDocument();
  });
});