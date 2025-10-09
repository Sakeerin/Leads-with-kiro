import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Avatar,
  Button,
  IconButton,
  Card,
  CardContent,
  Stack,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Task as TaskIcon,
  Note as NoteIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Lead, Activity, Task, LeadStatus, ScoreBand } from '../types';

interface LeadDetailProps {
  lead: Lead;
  activities: Activity[];
  tasks: Task[];
  onLeadEdit: (lead: Lead) => void;
  onLeadAssign: (leadId: string) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onAddNote: (leadId: string, note: string) => void;
  onCreateTask: (leadId: string, taskData: Partial<Task>) => void;
}

const statusColors: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: '#2196f3',
  [LeadStatus.CONTACTED]: '#ff9800',
  [LeadStatus.QUALIFIED]: '#4caf50',
  [LeadStatus.PROPOSAL]: '#9c27b0',
  [LeadStatus.NEGOTIATION]: '#ff5722',
  [LeadStatus.WON]: '#4caf50',
  [LeadStatus.LOST]: '#f44336',
  [LeadStatus.DISQUALIFIED]: '#757575',
  [LeadStatus.NURTURE]: '#607d8b',
};

const scoreBandColors: Record<ScoreBand, string> = {
  [ScoreBand.HOT]: '#f44336',
  [ScoreBand.WARM]: '#ff9800',
  [ScoreBand.COLD]: '#2196f3',
};

export const LeadDetail: React.FC<LeadDetailProps> = ({
  lead,
  activities,
  tasks,
  onLeadEdit,
  onLeadAssign,
  onAddNote,
  onCreateTask,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'tasks'>('overview');
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddNote = () => {
    if (noteText.trim()) {
      onAddNote(lead.id, noteText.trim());
      setNoteText('');
      setNoteDialog(false);
    }
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  };

  const getStatusChip = (status: LeadStatus) => (
    <Chip
      label={status.replace('_', ' ').toUpperCase()}
      sx={{
        backgroundColor: statusColors[status],
        color: 'white',
        fontWeight: 'bold',
      }}
    />
  );

  const getScoreChip = (score: number, band: ScoreBand) => (
    <Chip
      label={`${score} (${band.toUpperCase()})`}
      sx={{
        backgroundColor: scoreBandColors[band],
        color: 'white',
        fontWeight: 'bold',
      }}
    />
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight="bold">
                {lead.company.name}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {lead.contact.name} • {lead.accountLeadId}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {getStatusChip(lead.status)}
                {getScoreChip(lead.score.value, lead.score.band)}
                <Chip
                  label={lead.source.channel.replace('_', ' ')}
                  variant="outlined"
                  size="small"
                />
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                onClick={() => window.open(`mailto:${lead.contact.email}`)}
              >
                Email
              </Button>
              <Button
                variant="outlined"
                startIcon={<PhoneIcon />}
                onClick={() => window.open(`tel:${lead.contact.phone || lead.contact.mobile}`)}
                disabled={!lead.contact.phone && !lead.contact.mobile}
              >
                Call
              </Button>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => onLeadEdit(lead)}
              >
                Edit
              </Button>
              <IconButton onClick={handleMenuOpen}>
                <MoreVertIcon />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 2 }}>
        <Stack direction="row" spacing={0}>
          <Button
            variant={activeTab === 'overview' ? 'contained' : 'text'}
            onClick={() => setActiveTab('overview')}
            sx={{ borderRadius: 0 }}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'activities' ? 'contained' : 'text'}
            onClick={() => setActiveTab('activities')}
            startIcon={<HistoryIcon />}
            sx={{ borderRadius: 0 }}
          >
            Activities ({activities.length})
          </Button>
          <Button
            variant={activeTab === 'tasks' ? 'contained' : 'text'}
            onClick={() => setActiveTab('tasks')}
            startIcon={<TaskIcon />}
            sx={{ borderRadius: 0 }}
          >
            Tasks ({tasks.length})
          </Button>
        </Stack>
      </Paper>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {activeTab === 'overview' && (
          <Grid container spacing={3}>
            {/* Contact Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Contact Information
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography variant="body1">
                        {lead.contact.name}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1">
                        {lead.contact.email}
                      </Typography>
                    </Box>
                    {lead.contact.phone && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography variant="body1">
                          {lead.contact.phone}
                        </Typography>
                      </Box>
                    )}
                    {lead.contact.mobile && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Mobile
                        </Typography>
                        <Typography variant="body1">
                          {lead.contact.mobile}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Company Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Company Information
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Company Name
                      </Typography>
                      <Typography variant="body1">
                        {lead.company.name}
                      </Typography>
                    </Box>
                    {lead.company.industry && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Industry
                        </Typography>
                        <Typography variant="body1">
                          {lead.company.industry}
                        </Typography>
                      </Box>
                    )}
                    {lead.company.size && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Company Size
                        </Typography>
                        <Typography variant="body1">
                          {lead.company.size.replace('_', ' ').toUpperCase()}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Assignment Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Assignment
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Assigned To
                      </Typography>
                      {lead.assignment.assignedTo ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {lead.assignment.assignedTo.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body1">
                            {lead.assignment.assignedTo}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body1" color="text.secondary">
                          Unassigned
                        </Typography>
                      )}
                    </Box>
                    {lead.assignment.assignedAt && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Assigned At
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(lead.assignment.assignedAt)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Qualification */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Qualification
                  </Typography>
                  <Stack spacing={2}>
                    {lead.qualification.interest && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Interest Level
                        </Typography>
                        <Typography variant="body1">
                          {lead.qualification.interest.toUpperCase()}
                        </Typography>
                      </Box>
                    )}
                    {lead.qualification.budget && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Budget Status
                        </Typography>
                        <Typography variant="body1">
                          {lead.qualification.budget.replace('_', ' ').toUpperCase()}
                        </Typography>
                      </Box>
                    )}
                    {lead.qualification.timeline && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Purchase Timeline
                        </Typography>
                        <Typography variant="body1">
                          {lead.qualification.timeline.replace('_', ' ').toUpperCase()}
                        </Typography>
                      </Box>
                    )}
                    {lead.qualification.businessType && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Business Type
                        </Typography>
                        <Typography variant="body1">
                          {lead.qualification.businessType.toUpperCase()}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Follow-up */}
            {(lead.followUp.nextDate || lead.followUp.notes) && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Follow-up
                    </Typography>
                    <Stack spacing={2}>
                      {lead.followUp.nextDate && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Next Follow-up Date
                          </Typography>
                          <Typography variant="body1">
                            {formatDate(lead.followUp.nextDate)}
                          </Typography>
                        </Box>
                      )}
                      {lead.followUp.notes && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Notes
                          </Typography>
                          <Typography variant="body1">
                            {lead.followUp.notes}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        {activeTab === 'activities' && (
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Activity Timeline
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setNoteDialog(true)}
              >
                Add Note
              </Button>
            </Stack>
            <Box sx={{ p: 2 }}>
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <Card key={activity.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2">{activity.subject}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(activity.performedAt), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No activities yet
                </Typography>
              )}
            </Box>
          </Paper>
        )}

        {activeTab === 'tasks' && (
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Tasks
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => onCreateTask(lead.id, { subject: 'New Task', type: 'call' as any, priority: 'medium' as any, assignedTo: lead.assignment.assignedTo || '', dueDate: new Date(), status: 'pending' as any, reminders: [], createdBy: 'current-user' })}
              >
                Add Task
              </Button>
            </Stack>
            <Box sx={{ p: 2 }}>
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <Card key={task.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2">{task.subject}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tasks yet
                </Typography>
              )}
            </Box>
          </Paper>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          onLeadAssign(lead.id);
          handleMenuClose();
        }}>
          <AssignmentIcon sx={{ mr: 1 }} />
          Reassign
        </MenuItem>
        <MenuItem onClick={() => {
          setNoteDialog(true);
          handleMenuClose();
        }}>
          <NoteIcon sx={{ mr: 1 }} />
          Add Note
        </MenuItem>
      </Menu>

      {/* Add Note Dialog */}
      <Dialog open={noteDialog} onClose={() => setNoteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            placeholder="Enter your note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(false)}>Cancel</Button>
          <Button onClick={handleAddNote} variant="contained" disabled={!noteText.trim()}>
            Add Note
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};