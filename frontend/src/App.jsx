import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import KanbanBoard from './KanbanBoard';
import TaskDetailPanel from './TaskDetailPanel';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  }, [token]);

  // Auto-refresh tasks every 60 seconds (only when tab is visible)
  useEffect(() => {
    if (!token) return;

    let interval = null;

    const startPolling = () => {
      interval = setInterval(() => {
        fetchTasks(true); // Pass true to indicate background refresh
      }, 60000); // 60 seconds
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - stop polling
        stopPolling();
      } else {
        // Tab is visible - fetch immediately and resume polling
        fetchTasks(true);
        startPolling();
      }
    };

    // Start polling initially if tab is visible
    if (!document.hidden) {
      startPolling();
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  const fetchTasks = async (isBackgroundRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setIsRefreshing(true);
      }
      
      const response = await axios.get(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
      
      if (isBackgroundRefresh) {
        // Show refresh indicator briefly
        setTimeout(() => setIsRefreshing(false), 1000);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      setIsRefreshing(false);
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

  const handleTaskMove = async (taskId, newStatus) => {
    try {
      await axios.patch(`${API_URL}/api/tasks/${taskId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to move task');
    }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      await axios.patch(`${API_URL}/api/tasks/${taskId}`, 
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
      // Update selected task if it's the one being updated
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, ...updates });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
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

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(t => t.status !== 'done').length;

  return (
    <div className="app">
      <header>
        <div className="header-left">
          <h1>🦉 Ollie's Tasks</h1>
          <span className="task-stats">
            {activeTasks} active · {totalTasks} total
            {isRefreshing && <span className="refresh-indicator"> ↻</span>}
          </span>
        </div>
        <div className="header-right">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? 'Cancel' : '+ New Task'}
          </button>
          <span className="user-info">
            {user?.picture && <img src={user.picture} alt={user.name} className="user-avatar" />}
            {user?.name}
          </span>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </header>

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

      <KanbanBoard 
        tasks={tasks}
        onTaskMove={handleTaskMove}
        onTaskDelete={deleteTask}
        onTaskSelect={setSelectedTask}
      />

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}

export default App;
