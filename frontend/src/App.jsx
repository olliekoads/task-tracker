import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    tags: ''
  });

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token, filter]);

  const fetchTasks = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleLoginSuccess = async (credentialResponse) => {
    const idToken = credentialResponse.credential;
    setToken(idToken);
    localStorage.setItem('token', idToken);
    
    // Decode JWT to get user info
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const userData = JSON.parse(jsonPayload);
    setUser({ email: userData.email, name: userData.name, picture: userData.picture });
    localStorage.setItem('user', JSON.stringify({ email: userData.email, name: userData.name, picture: userData.picture }));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/tasks`, {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFormData({ title: '', description: '', priority: 'medium', category: '', tags: '' });
      setShowForm(false);
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.patch(`${API_URL}/api/tasks/${taskId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  if (!token) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div className="login-container">
          <h1>🦉 Ollie's Task Tracker</h1>
          <p>Sign in to view and manage tasks</p>
          <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={() => console.error('Login failed')}
          />
        </div>
      </GoogleOAuthProvider>
    );
  }

  const statusCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    done: tasks.filter(t => t.status === 'done').length
  };

  return (
    <div className="app">
      <header>
        <div className="header-left">
          <h1>🦉 Ollie's Tasks</h1>
        </div>
        <div className="header-right">
          <span>{user?.name}</span>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <div className="filters">
        {['all', 'todo', 'in-progress', 'blocked', 'done'].map(status => (
          <button
            key={status}
            className={filter === status ? 'active' : ''}
            onClick={() => setFilter(status)}
          >
            {status.replace('-', ' ')} ({statusCounts[status]})
          </button>
        ))}
      </div>

      <div className="actions">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTask} className="task-form">
          <input
            type="text"
            placeholder="Task title"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            rows="3"
          />
          <select
            value={formData.priority}
            onChange={e => setFormData({...formData, priority: e.target.value})}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">🚨 Urgent</option>
          </select>
          <input
            type="text"
            placeholder="Category (optional)"
            value={formData.category}
            onChange={e => setFormData({...formData, category: e.target.value})}
          />
          <input
            type="text"
            placeholder="Tags (comma-separated, optional)"
            value={formData.tags}
            onChange={e => setFormData({...formData, tags: e.target.value})}
          />
          <button type="submit" className="btn-primary">Create Task</button>
        </form>
      )}

      <div className="tasks-list">
        {tasks.length === 0 ? (
          <p className="empty-state">No tasks found. Create one to get started!</p>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`task-card priority-${task.priority}`}>
              <div className="task-header">
                <h3>{task.title}</h3>
                <div className="task-actions">
                  <select
                    value={task.status}
                    onChange={e => updateTaskStatus(task.id, e.target.value)}
                    className="status-select"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                  <button onClick={() => deleteTask(task.id)} className="btn-delete">×</button>
                </div>
              </div>
              
              {task.description && <p className="task-description">{task.description}</p>}
              
              <div className="task-meta">
                <span className={`priority-badge priority-${task.priority}`}>
                  {task.priority === 'urgent' ? '🚨' : ''} {task.priority}
                </span>
                {task.category && <span className="category-badge">{task.category}</span>}
                {task.tags && task.tags.length > 0 && (
                  <div className="tags">
                    {task.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                )}
              </div>
              
              <div className="task-footer">
                <small>Created {new Date(task.created_at).toLocaleDateString()}</small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
