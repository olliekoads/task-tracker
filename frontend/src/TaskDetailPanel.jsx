import { useEffect } from 'react';
import './TaskDetailPanel.css';

function TaskDetailPanel({ task, onClose, onUpdate, onDelete }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!task) return null;

  const getPriorityEmoji = (priority) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '';
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'todo': return '📋';
      case 'in-progress': return '🔨';
      case 'blocked': return '🚧';
      case 'done': return '✅';
      default: return '';
    }
  };

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <div className="task-detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>{task.title}</h2>
          <button className="btn-close" onClick={onClose} title="Close (Esc)">
            ×
          </button>
        </div>

        <div className="panel-content">
          <div className="detail-section">
            <label>Status</label>
            <select
              value={task.status}
              onChange={(e) => onUpdate(task.id, { status: e.target.value })}
              className="detail-select"
            >
              <option value="todo">📋 To Do</option>
              <option value="in-progress">🔨 In Progress</option>
              <option value="blocked">🚧 Blocked</option>
              <option value="done">✅ Done</option>
            </select>
          </div>

          <div className="detail-section">
            <label>Priority</label>
            <div className={`priority-display priority-${task.priority}`}>
              {getPriorityEmoji(task.priority)} {task.priority}
            </div>
          </div>

          {task.description && (
            <div className="detail-section">
              <label>Description</label>
              <p className="detail-description">{task.description}</p>
            </div>
          )}

          {task.category && (
            <div className="detail-section">
              <label>Category</label>
              <span className="detail-category">{task.category}</span>
            </div>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="detail-section">
              <label>Tags</label>
              <div className="detail-tags">
                {task.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <label>Created</label>
            <div className="detail-date">
              {new Date(task.created_at).toLocaleString()}
            </div>
          </div>

          {task.updated_at !== task.created_at && (
            <div className="detail-section">
              <label>Last Updated</label>
              <div className="detail-date">
                {new Date(task.updated_at).toLocaleString()}
              </div>
            </div>
          )}

          {task.created_by && (
            <div className="detail-section">
              <label>Created By</label>
              <div className="detail-info">{task.created_by}</div>
            </div>
          )}
        </div>

        <div className="panel-footer">
          <button 
            onClick={() => {
              if (confirm('Are you sure you want to delete this task?')) {
                onDelete(task.id);
                onClose();
              }
            }}
            className="btn-delete-full"
          >
            🗑️ Delete Task
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailPanel;
