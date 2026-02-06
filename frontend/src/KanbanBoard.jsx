import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './KanbanBoard.css';

const COLUMNS = [
  { id: 'todo', title: 'To Do', emoji: '📋' },
  { id: 'in-progress', title: 'In Progress', emoji: '🔨' },
  { id: 'blocked', title: 'Blocked', emoji: '🚧' },
  { id: 'done', title: 'Done', emoji: '✅' }
];

function KanbanBoard({ tasks, onTaskMove, onTaskDelete }) {
  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(task => task.status === col.id);
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a valid droppable
    if (!destination) return;

    // Dropped in same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    // Status changed
    if (destination.droppableId !== source.droppableId) {
      onTaskMove(draggableId, destination.droppableId);
    }
  };

  const getPriorityEmoji = (priority) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '';
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {COLUMNS.map(column => (
          <div key={column.id} className="kanban-column">
            <div className="column-header">
              <h3>
                <span className="column-emoji">{column.emoji}</span>
                {column.title}
                <span className="column-count">({tasksByStatus[column.id].length})</span>
              </h3>
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`column-content ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                >
                  {tasksByStatus[column.id].length === 0 ? (
                    <div className="empty-column">Drop tasks here</div>
                  ) : (
                    tasksByStatus[column.id].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`kanban-card priority-${task.priority} ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
                            <div className="card-header">
                              <div className="card-priority">
                                {getPriorityEmoji(task.priority)}
                              </div>
                              <button 
                                onClick={() => onTaskDelete(task.id)}
                                className="btn-delete"
                                title="Delete task"
                              >
                                ×
                              </button>
                            </div>
                            
                            <h4 className="card-title">{task.title}</h4>
                            
                            {task.description && (
                              <p className="card-description">{task.description}</p>
                            )}
                            
                            <div className="card-meta">
                              {task.category && (
                                <span className="category-badge">{task.category}</span>
                              )}
                              {task.tags && task.tags.length > 0 && (
                                <div className="tags">
                                  {task.tags.map(tag => (
                                    <span key={tag} className="tag">{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="card-footer">
                              <small>{new Date(task.created_at).toLocaleDateString()}</small>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

export default KanbanBoard;
