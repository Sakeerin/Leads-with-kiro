import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Assignment as AssignmentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { format } from 'date-fns';
import { Lead, LeadStatus, ScoreBand, KanbanColumn } from '../types';

interface LeadKanbanProps {
  leads: Lead[];
  onLeadMove: (leadId: string, newStatus: LeadStatus) => void;
  onLeadEdit: (lead: Lead) => void;
  onLeadDelete: (leadId: string) => void;
  onLeadAssign: (leadId: string) => void;
  loading?: boolean;
}

const statusColumns: KanbanColumn[] = [
  { id: 'new', title: 'New', status: LeadStatus.NEW, leads: [], color: '#2196f3' },
  { id: 'contacted', title: 'Contacted', status: LeadStatus.CONTACTED, leads: [], color: '#ff9800' },
  { id: 'qualified', title: 'Qualified', status: LeadStatus.QUALIFIED, leads: [], color: '#4caf50' },
  { id: 'proposal', title: 'Proposal', status: LeadStatus.PROPOSAL, leads: [], color: '#9c27b0' },
  { id: 'negotiation', title: 'Negotiation', status: LeadStatus.NEGOTIATION, leads: [], color: '#ff5722' },
  { id: 'won', title: 'Won', status: LeadStatus.WON, leads: [], color: '#4caf50' },
  { id: 'lost', title: 'Lost', status: LeadStatus.LOST, leads: [], color: '#f44336' },
  { id: 'nurture', title: 'Nurture', status: LeadStatus.NURTURE, leads: [], color: '#607d8b' },
];

const scoreBandColors: Record<ScoreBand, string> = {
  [ScoreBand.HOT]: '#f44336',
  [ScoreBand.WARM]: '#ff9800',
  [ScoreBand.COLD]: '#2196f3',
};

interface LeadCardProps {
  lead: Lead;
  index: number;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onAssign: (leadId: string) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, index, onEdit, onDelete, onAssign }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd');
  };

  const getScoreColor = (band: ScoreBand) => scoreBandColors[band];

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{
            mb: 1,
            cursor: 'grab',
            transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
            boxShadow: snapshot.isDragging ? 4 : 1,
            '&:hover': {
              boxShadow: 2,
            },
          }}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                {lead.accountLeadId}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label={lead.score.value}
                  size="small"
                  sx={{
                    backgroundColor: getScoreColor(lead.score.band),
                    color: 'white',
                    fontWeight: 'bold',
                    minWidth: 32,
                    height: 20,
                    fontSize: '0.7rem',
                  }}
                />
                <IconButton
                  size="small"
                  onClick={handleMenuOpen}
                  sx={{ p: 0.5 }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Company and Contact */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
              {lead.company.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {lead.contact.name}
            </Typography>

            {/* Source */}
            <Chip
              label={lead.source.channel.replace('_', ' ')}
              size="small"
              variant="outlined"
              sx={{ mb: 1, fontSize: '0.7rem', height: 20 }}
            />

            {/* Assignment and Date */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              {lead.assignment.assignedTo ? (
                <Tooltip title={lead.assignment.assignedTo}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                    {lead.assignment.assignedTo.charAt(0).toUpperCase()}
                  </Avatar>
                </Tooltip>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Unassigned
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {formatDate(lead.metadata.createdAt)}
              </Typography>
            </Box>

            {/* Follow-up indicator */}
            {lead.followUp.nextDate && (
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={`Follow-up: ${formatDate(lead.followUp.nextDate)}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              </Box>
            )}
          </CardContent>

          {/* Context Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={() => {
              onEdit(lead);
              handleMenuClose();
            }}>
              <EditIcon sx={{ mr: 1, fontSize: 16 }} />
              Edit
            </MenuItem>
            <MenuItem onClick={() => {
              onAssign(lead.id);
              handleMenuClose();
            }}>
              <AssignmentIcon sx={{ mr: 1, fontSize: 16 }} />
              Assign
            </MenuItem>
            <MenuItem onClick={() => {
              if (lead.contact.email) {
                window.open(`mailto:${lead.contact.email}`);
              }
              handleMenuClose();
            }}>
              <EmailIcon sx={{ mr: 1, fontSize: 16 }} />
              Email
            </MenuItem>
            <MenuItem onClick={() => {
              if (lead.contact.phone) {
                window.open(`tel:${lead.contact.phone}`);
              }
              handleMenuClose();
            }}>
              <PhoneIcon sx={{ mr: 1, fontSize: 16 }} />
              Call
            </MenuItem>
            <MenuItem 
              onClick={() => {
                onDelete(lead.id);
                handleMenuClose();
              }}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon sx={{ mr: 1, fontSize: 16 }} />
              Delete
            </MenuItem>
          </Menu>
        </Card>
      )}
    </Draggable>
  );
};

export const LeadKanban: React.FC<LeadKanbanProps> = ({
  leads,
  onLeadMove,
  onLeadEdit,
  onLeadDelete,
  onLeadAssign,
}) => {
  // Group leads by status
  const columns = statusColumns.map(column => ({
    ...column,
    leads: leads.filter(lead => lead.status === column.status),
  }));

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the new status based on destination column
    const destinationColumn = columns.find(col => col.id === destination.droppableId);
    if (destinationColumn) {
      onLeadMove(draggableId, destinationColumn.status as LeadStatus);
    }
  };

  return (
    <Box sx={{ height: '100%', overflow: 'hidden' }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            height: '100%',
            overflowX: 'auto',
            pb: 2,
          }}
        >
          {columns.map((column) => (
            <Paper
              key={column.id}
              sx={{
                minWidth: 280,
                maxWidth: 280,
                display: 'flex',
                flexDirection: 'column',
                height: 'fit-content',
                maxHeight: '80vh',
              }}
            >
              {/* Column Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  backgroundColor: column.color,
                  color: 'white',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6" fontWeight="bold">
                    {column.title}
                  </Typography>
                  <Badge
                    badgeContent={column.leads.length}
                    color="secondary"
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: 'white',
                        color: column.color,
                        fontWeight: 'bold',
                      },
                    }}
                  />
                </Stack>
              </Box>

              {/* Column Content */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      p: 1,
                      minHeight: 200,
                      maxHeight: 'calc(80vh - 80px)',
                      overflowY: 'auto',
                      backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {column.leads.map((lead, index) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        index={index}
                        onEdit={onLeadEdit}
                        onDelete={onLeadDelete}
                        onAssign={onLeadAssign}
                      />
                    ))}
                    {provided.placeholder}
                    
                    {/* Empty state */}
                    {column.leads.length === 0 && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 100,
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 1,
                          color: 'text.secondary',
                        }}
                      >
                        <Typography variant="body2">
                          No leads
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Droppable>
            </Paper>
          ))}
        </Box>
      </DragDropContext>
    </Box>
  );
};