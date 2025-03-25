import React from 'react';
import './TodoFilter.css';

function TodoFilter({ filter, setFilter }) {
  return (
    <div className="todo-filter">
      <div className="filter-group">
       
        <div className="filter-buttons">
          <button
            className={filter.status === 'all' ? 'active' : ''}
            onClick={() => setFilter({ ...filter, status: 'all' })}
          >
            All
          </button>
          <button
            className={filter.status === 'active' ? 'active' : ''}
            onClick={() => setFilter({ ...filter, status: 'active' })}
          >
            In Progress
          </button>
          <button
            className={filter.status === 'completed' ? 'active' : ''}
            onClick={() => setFilter({ ...filter, status: 'completed' })}
          >
            Completed
          </button>
        </div>
      </div>
      
      {/* <div className="filter-group">
        
        <select
          value={filter.sortBy}
          onChange={(e) => setFilter({ ...filter, sortBy: e.target.value })}
        >
          <option value="date">Created At</option>
          <option value="dueDate">Due Date</option>
        </select>
        <button
          className="sort-direction"
          onClick={() => setFilter({ ...filter, sortDirection: filter.sortDirection === 'asc' ? 'desc' : 'asc' })}
        >
          {filter.sortDirection === 'asc' ? '▲' : '▼'}
        </button>
      </div> */}
      
      {/* <div className="filter-group">
        <input
          type="text"
          placeholder="Search..."
          value={filter.searchTerm}
          onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
          className="search-input"
        />
      </div> */}
    </div>
  );
}

export default TodoFilter;