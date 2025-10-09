import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { formatDistanceToNow, format, isBefore } from 'date-fns';

// Types
interface Task {
  id: string;
  leadId: string;
  subject: string;
  description?: string;
  type: 'call' | 'email' | 'meeting' | 'follow_up' | 'research' | 'proposal';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  reminders: Array<{
    id: string;
    type: 'email' | 'notification';
    scheduledAt: string;
    sent: boolean;
    sentAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  createdBy: string;
}

interface TaskStatistics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

interface TaskManagerProps {
  leadId?: string;
  assigneeId?: string;
  showStatistics?: boolean;
  onTaskUpdated?: () => void;
}

const taskTypeLabels = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  follow_up: 'Follow Up',
  research: 'Research',
  proposal: 'Proposal'
};

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
};

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const getPriorityColor = (priority: string): string => {
  const colors = {
    low: '#4caf50',
    medium: '#ff9800',
    high: '#f44336',
    urgent: '#9c27b0'
  };
  return colors[priority as keyof typeof colors] || '#757575';
};

const getStatusColor = (status: string): string => {
  const colors = {
    pending: '#ff9800',
    in_progress: '#2196f3',
    completed: '#4caf50',
    cancelled: '#757575'
  };
  return colors[status as keyof typeof colors] || '#757575';
};

export const TaskManager: React.FC<TaskManagerProps> = ({
  leadId,
  assigneeId,
  showStatistics = true,
  onTaskUpdated
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    type: 'call' as Task['type'],
    priority: 'medium' as Task['priority'],
    assignedTo: assigneeId || '',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    reminders: [] as Task['reminders']
  });

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setError(null);
      let url = '/api/v1/tasks';
      
      if (leadId) {
        url = `/api/v1/tasks/lead/${leadId}`;
      } else if (assigneeId) {
        url = `/api/v1/tasks/assignee/${assigneeId}`;
      } else {
        url = '/api/v1/tasks/my-tasks';
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    if (!showStatistics) return;

    try {
      const params = new URLSearchParams();
      if (assigneeId) params.append('assigneeId', assigneeId);

      const response = await fetch(`/api/v1/tasks/statistics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStatistics(data.data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  // Create task
  const handleCreateTask = async () => {
    try {
      const response = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          leadId: leadId || 'default-lead-id', // This should be provided
          dueDate: formData.dueDate.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      setCreateDialogOpen(false);
      resetForm();
      await fetchTasks();
      await fetchStatistics();
      onTaskUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  // Update task
  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      const response = await fetch(`/api/v1/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          dueDate: formData.dueDate.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      setEditingTask(null);
      resetForm();
      await fetchTasks();
      await fetchStatistics();
      onTaskUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  // Complete task
  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to complete task');
      }

      await fetchTasks();
      await fetchStatistics();
      onTaskUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      await fetchTasks();
      await fetchStatistics();
      onTaskUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      subject: '',
      description: '',
      type: 'call',
      priority: 'medium',
      assignedTo: assigneeId || '',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      reminders: []
    });
  };

  // Open edit dialog
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      subject: task.subject,
      description: task.description || '',
      type: task.type,
      priority: task.priority,
      assignedTo: task.assignedTo,
      dueDate: new Date(task.dueDate),
      reminders: task.reminders
    });
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    return true;
  });

  // Check if task is overdue
  const isOverdue = (task: Task) => {
    return task.status !== 'completed' && isBefore(new Date(task.dueDate), new Date());
  };

  useEffect(() => {
    fetchTasks();
    fetchStatistics();
  }, [leadId, assigneeId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Task Management
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh tasks">
              <IconButton onClick={fetchTasks}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Add Task
            </Button>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Statistics */}
        {showStatistics && statistics && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {statistics.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Tasks
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {statistics.pending}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {statistics.inProgress}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Progress
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {statistics.completed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {statistics.overdue}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overdue
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Box display="flex" gap={2} mb={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={filterPriority}
              label="Priority"
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Task List */}
        <List>
          {filteredTasks.map((task) => (
            <Card key={task.id} sx={{ mb: 2 }}>
              <ListItem>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="subtitle1" component="span">
                        {task.subject}
                      </Typography>
                      <Chip
                        label={taskTypeLabels[task.type]}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={priorityLabels[task.priority]}
                        size="small"
                        sx={{
                          bgcolor: getPriorityColor(task.priority),
                          color: 'white'
                        }}
                      />
                      <Chip
                        label={statusLabels[task.status]}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(task.status),
                          color: 'white'
                        }}
                      />
                      {isOverdue(task) && (
                        <Chip
                          label="OVERDUE"
                          size="small"
                          color="error"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {task.description && (
                        <Typography variant="body2" color="text.secondary">
                          {task.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Due: {format(new Date(task.dueDate), 'MMM dd, yyyy HH:mm')} 
                        ({formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })})
                      </Typography>
                      {task.completedAt && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Completed: {format(new Date(task.completedAt), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  <Box display="flex" gap={1}>
                    {task.status !== 'completed' && (
                      <Tooltip title="Complete task">
                        <IconButton
                          edge="end"
                          onClick={() => handleCompleteTask(task.id)}
                          color="success"
                        >
                          <CheckIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    <Tooltip title="Edit task">
                      <IconButton
                        edge="end"
                        onClick={() => handleEditTask(task)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Delete task">
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteTask(task.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            </Card>
          ))}
        </List>

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              No tasks found.
            </Typography>
          </Box>
        )}

        {/* Create/Edit Task Dialog */}
        <Dialog
          open={createDialogOpen || editingTask !== null}
          onClose={() => {
            setCreateDialogOpen(false);
            setEditingTask(null);
            resetForm();
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                label="Subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                fullWidth
                required
              />
              
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
              
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Task['type'] })}
                >
                  {Object.entries(taskTypeLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                >
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Due Date"
                type="datetime-local"
                value={formData.dueDate ? formData.dueDate.toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, dueDate: new Date(e.target.value) })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingTask(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingTask ? handleUpdateTask : handleCreateTask}
              variant="contained"
              disabled={!formData.subject.trim()}
            >
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

  );
};

export default TaskManager;