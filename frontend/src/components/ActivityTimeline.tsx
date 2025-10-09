import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Event as EventIcon,
  Note as NoteIcon,
  Task as TaskIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Send as SendIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';

// Types
interface TimelineUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface TimelineActivity {
  id: string;
  leadId: string;
  type: string;
  subject: string;
  details: Record<string, any>;
  performedBy: string;
  performedAt: string;
  user?: TimelineUser;
  mentions?: string[];
  relatedEntities?: Array<{ type: string; id: string; name?: string }>;
}

interface ActivityTimelineProps {
  leadId: string;
  limit?: number;
  showAddNote?: boolean;
  onActivityAdded?: () => void;
}

// Activity type icons mapping
const getActivityIcon = (type: string) => {
  const iconMap: Record<string, React.ReactElement> = {
    email_sent: <EmailIcon />,
    email_received: <EmailIcon />,
    email_opened: <EmailIcon />,
    email_replied: <EmailIcon />,
    call_made: <PhoneIcon />,
    call_answered: <PhoneIcon />,
    meeting_scheduled: <EventIcon />,
    meeting_attended: <EventIcon />,
    note_added: <NoteIcon />,
    task_created: <TaskIcon />,
    task_updated: <TaskIcon />,
    task_completed: <TaskIcon />,
    task_cancelled: <TaskIcon />,
    lead_created: <PersonIcon />,
    lead_updated: <PersonIcon />,
    lead_assigned: <AssignmentIcon />,
    lead_reassigned: <AssignmentIcon />,
    status_changed: <TrendingUpIcon />,
    score_updated: <TrendingUpIcon />
  };
  
  return iconMap[type] || <NoteIcon />;
};

// Activity type colors
const getActivityColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    email_sent: '#1976d2',
    email_received: '#1976d2',
    email_opened: '#4caf50',
    email_replied: '#4caf50',
    call_made: '#ff9800',
    call_answered: '#ff9800',
    meeting_scheduled: '#9c27b0',
    meeting_attended: '#9c27b0',
    note_added: '#607d8b',
    task_created: '#2196f3',
    task_updated: '#2196f3',
    task_completed: '#4caf50',
    task_cancelled: '#f44336',
    lead_created: '#795548',
    lead_updated: '#795548',
    lead_assigned: '#3f51b5',
    lead_reassigned: '#3f51b5',
    status_changed: '#ff5722',
    score_updated: '#ff5722'
  };
  
  return colorMap[type] || '#757575';
};

// Format activity type for display
const formatActivityType = (type: string): string => {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  leadId,
  limit = 50,
  showAddNote = true,
  onActivityAdded
}) => {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch timeline data
  const fetchTimeline = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/v1/activities/lead/${leadId}/timeline?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timeline');
      }

      const data = await response.json();
      setActivities(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Add note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setAddingNote(true);
      const response = await fetch(`/api/v1/activities/lead/${leadId}/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ note: newNote })
      });

      if (!response.ok) {
        throw new Error('Failed to add note');
      }

      setNewNote('');
      await fetchTimeline();
      onActivityAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  // Refresh timeline
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTimeline();
  };

  // Toggle activity details
  const toggleActivityDetails = (activityId: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivities(newExpanded);
  };

  // Format activity details for display
  const formatActivityDetails = (activity: TimelineActivity) => {
    const { details } = activity;
    const formatted: Array<{ label: string; value: any }> = [];

    Object.entries(details).forEach(([key, value]) => {
      if (key === 'note' && typeof value === 'string') {
        formatted.push({ label: 'Note', value });
      } else if (key === 'duration' && typeof value === 'number') {
        formatted.push({ label: 'Duration', value: `${Math.floor(value / 60)} minutes` });
      } else if (key === 'outcome' && typeof value === 'string') {
        formatted.push({ label: 'Outcome', value });
      } else if (key === 'to' && typeof value === 'string') {
        formatted.push({ label: 'To', value });
      } else if (key === 'from' && typeof value === 'string') {
        formatted.push({ label: 'From', value });
      } else if (key === 'subject' && typeof value === 'string') {
        formatted.push({ label: 'Subject', value });
      } else if (key === 'title' && typeof value === 'string') {
        formatted.push({ label: 'Title', value });
      } else if (key === 'attendees' && Array.isArray(value)) {
        formatted.push({ label: 'Attendees', value: value.join(', ') });
      } else if (typeof value === 'string' || typeof value === 'number') {
        formatted.push({ 
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'), 
          value 
        });
      }
    });

    return formatted;
  };

  // Render mentions in text
  const renderTextWithMentions = (text: string, mentions?: string[]) => {
    if (!mentions || mentions.length === 0) {
      return text;
    }

    let result = text;
    mentions.forEach(userId => {
      const mentionRegex = new RegExp(`@${userId}`, 'g');
      result = result.replace(mentionRegex, `@User(${userId.slice(0, 8)}...)`);
    });

    return result;
  };

  useEffect(() => {
    fetchTimeline();
  }, [leadId, limit]);

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
          Activity Timeline
        </Typography>
        <Tooltip title="Refresh timeline">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Add Note Section */}
      {showAddNote && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Add Note
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add a note... Use @userId to mention users"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleAddNote}
              disabled={!newNote.trim() || addingNote}
            >
              {addingNote ? 'Adding...' : 'Add Note'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <List>
        {activities.map((activity, index) => (
          <React.Fragment key={activity.id}>
            <ListItem alignItems="flex-start">
              <ListItemAvatar>
                <Avatar 
                  sx={{ 
                    bgcolor: getActivityColor(activity.type),
                    width: 40,
                    height: 40
                  }}
                >
                  {getActivityIcon(activity.type)}
                </Avatar>
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="subtitle2" component="span">
                      {activity.subject}
                    </Typography>
                    <Chip 
                      label={formatActivityType(activity.type)}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        borderColor: getActivityColor(activity.type),
                        color: getActivityColor(activity.type)
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {activity.user ? 
                        `${activity.user.firstName} ${activity.user.lastName}` : 
                        'Unknown User'
                      } • {formatDistanceToNow(new Date(activity.performedAt), { addSuffix: true })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(activity.performedAt), 'MMM dd, yyyy HH:mm')}
                    </Typography>
                    
                    {/* Show brief details */}
                    {activity.details.note && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {renderTextWithMentions(
                          activity.details.note.length > 100 
                            ? `${activity.details.note.substring(0, 100)}...`
                            : activity.details.note,
                          activity.mentions
                        )}
                      </Typography>
                    )}
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => toggleActivityDetails(activity.id)}
                  size="small"
                >
                  {expandedActivities.has(activity.id) ? 
                    <ExpandLessIcon /> : <ExpandMoreIcon />
                  }
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>

            {/* Expanded Details */}
            <Collapse in={expandedActivities.has(activity.id)}>
              <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Activity Details
                    </Typography>
                    
                    {formatActivityDetails(activity).map((detail, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {detail.label}:
                        </Typography>
                        <Typography variant="body2">
                          {typeof detail.value === 'string' && detail.label === 'Note' ?
                            renderTextWithMentions(detail.value, activity.mentions) :
                            String(detail.value)
                          }
                        </Typography>
                      </Box>
                    ))}

                    {/* Related Entities */}
                    {activity.relatedEntities && activity.relatedEntities.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Related:
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                          {activity.relatedEntities.map((entity, idx) => (
                            <Chip
                              key={idx}
                              label={`${entity.type}: ${entity.name || entity.id.slice(0, 8)}...`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Collapse>

            {index < activities.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>

      {/* Empty State */}
      {activities.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No activities found for this lead.
          </Typography>
        </Box>
      )}

      {/* Load More */}
      {activities.length >= limit && (
        <Box textAlign="center" mt={2}>
          <Button variant="outlined" onClick={() => fetchTimeline()}>
            Load More Activities
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ActivityTimeline;