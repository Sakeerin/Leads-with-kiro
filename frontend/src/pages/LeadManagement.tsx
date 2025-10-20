import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,

  Snackbar,
  Alert,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LeadService } from '../services/leadService';
import { SearchService } from '../services/searchService';
import { LeadForm } from '../components/LeadForm';
import { LeadList } from '../components/LeadList';
import { LeadKanban } from '../components/LeadKanban';
import { LeadDetail } from '../components/LeadDetail';
import { AdvancedSearch } from '../components/AdvancedSearch';
import { SearchResults } from '../components/SearchResults';
import { 
  Lead, 
  LeadStatus, 
  SearchFilters, 
  PaginationParams, 
  BulkOperation,
  Task,
  SearchQuery,
  SearchResult,
} from '../types';

type ViewMode = 'list' | 'kanban' | 'detail' | 'search';

export const LeadManagement: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkAssignee, setBulkAssignee] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [pagination, setPagination] = useState<PaginationParams>({
    page: 0,
    limit: 25,
    sortBy: 'metadata.createdAt',
    sortOrder: 'desc',
  });

  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({});
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const queryClient = useQueryClient();

  // Fetch leads
  const { data: leadsResponse, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', pagination, filters],
    queryFn: () => LeadService.getLeads({ ...pagination, ...filters }),
  });

  // Fetch lead activities
  const { data: activitiesResponse } = useQuery({
    queryKey: ['lead-activities', selectedLead?.id],
    queryFn: () => selectedLead ? LeadService.getLeadActivities(selectedLead.id) : null,
    enabled: !!selectedLead,
  });

  // Fetch lead tasks
  const { data: tasksResponse } = useQuery({
    queryKey: ['lead-tasks', selectedLead?.id],
    queryFn: () => selectedLead ? LeadService.getLeadTasks(selectedLead.id) : null,
    enabled: !!selectedLead,
  });

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: LeadService.createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowLeadForm(false);
      showSnackbar('Lead created successfully', 'success');
    },
    onError: () => {
      showSnackbar('Failed to create lead', 'error');
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => 
      LeadService.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowLeadForm(false);
      setEditingLead(null);
      showSnackbar('Lead updated successfully', 'success');
    },
    onError: () => {
      showSnackbar('Failed to update lead', 'error');
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: LeadService.deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showSnackbar('Lead deleted successfully', 'success');
    },
    onError: () => {
      showSnackbar('Failed to delete lead', 'error');
    },
  });

  const bulkOperationMutation = useMutation({
    mutationFn: LeadService.bulkOperation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLeads([]);
      setShowBulkDialog(false);
      showSnackbar('Bulk operation completed successfully', 'success');
    },
    onError: () => {
      showSnackbar('Failed to complete bulk operation', 'error');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) =>
      LeadService.updateLeadStatus(leadId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showSnackbar('Lead status updated successfully', 'success');
    },
    onError: () => {
      showSnackbar('Failed to update lead status', 'error');
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ leadId, note }: { leadId: string; note: string }) =>
      LeadService.addLeadNote(leadId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities'] });
      showSnackbar('Note added successfully', 'success');
    },
    onError: () => {
      showSnackbar('Failed to add note', 'error');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ leadId, taskData }: { leadId: string; taskData: Partial<Task> }) =>
      LeadService.createLeadTask(leadId, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks'] });
      showSnackbar('Task created successfully', 'success');
    },
    onError: () => {
      showSnackbar('Failed to create task', 'error');
    },
  });

  const leads = leadsResponse?.data || [];
  const totalCount = leadsResponse?.pagination?.total || 0;
  const activities = activitiesResponse?.data || [];
  const tasks = tasksResponse?.data || [];

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    setSelectedLead(null);
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleRowsPerPageChange = (rowsPerPage: number) => {
    setPagination(prev => ({ ...prev, limit: rowsPerPage, page: 0 }));
  };

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setPagination(prev => ({ ...prev, sortBy, sortOrder }));
  };

  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const handleLeadCreate = (leadData: Partial<Lead>) => {
    createLeadMutation.mutate(leadData);
  };

  const handleLeadEdit = (lead: Lead) => {
    setEditingLead(lead);
    setShowLeadForm(true);
  };

  const handleLeadUpdate = (leadData: Partial<Lead>) => {
    if (editingLead) {
      updateLeadMutation.mutate({ id: editingLead.id, data: leadData });
    }
  };

  const handleLeadDelete = (leadId: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      deleteLeadMutation.mutate(leadId);
    }
  };

  const handleLeadMove = (leadId: string, newStatus: LeadStatus) => {
    updateStatusMutation.mutate({ leadId, status: newStatus });
  };

  const handleLeadAssign = (leadId: string) => {
    // TODO: Implement assignment dialog
    console.log('Assign lead:', leadId);
  };

  const handleBulkAction = (action: string, leadIds: string[]) => {
    setBulkAction(action);
    setSelectedLeads(leadIds);
    setShowBulkDialog(true);
  };

  const handleBulkSubmit = () => {
    const operation: BulkOperation = {
      type: bulkAction as any,
      leadIds: selectedLeads,
      parameters: {},
    };

    if (bulkAction === 'assign' && bulkAssignee) {
      operation.parameters.assigneeId = bulkAssignee;
    } else if (bulkAction === 'status_change' && bulkStatus) {
      operation.parameters.status = bulkStatus;
    }

    bulkOperationMutation.mutate(operation);
  };



  const handleAddNote = (leadId: string, note: string) => {
    addNoteMutation.mutate({ leadId, note });
  };

  const handleCreateTask = (leadId: string, taskData: Partial<Task>) => {
    createTaskMutation.mutate({ leadId, taskData });
  };

  const handleSearch = async (query: SearchQuery) => {
    setSearchLoading(true);
    setSearchQuery(query);
    
    try {
      const response = await SearchService.search(query);
      setSearchResults(response.data);
      
      // Switch to search view if not already there
      if (viewMode !== 'search') {
        setViewMode('search');
      }
    } catch (error) {
      console.error('Search failed:', error);
      showSnackbar('Search failed', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchFilterClick = (filterType: string, value: string) => {
    const newQuery = { ...searchQuery };
    
    if (!newQuery.filters) {
      newQuery.filters = {};
    }

    const currentValues = newQuery.filters[filterType as keyof SearchFilters] as string[] || [];
    
    if (currentValues.includes(value)) {
      // Remove filter
      newQuery.filters[filterType as keyof SearchFilters] = currentValues.filter(v => v !== value) as any;
    } else {
      // Add filter
      newQuery.filters[filterType as keyof SearchFilters] = [...currentValues, value] as any;
    }

    handleSearch(newQuery);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: { xs: 1, md: 2 }, mb: 2 }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={{ xs: 2, sm: 0 }}
        >
          <Typography 
            variant="h4"
            fontWeight="bold"
            sx={{ 
              textAlign: { xs: 'center', sm: 'left' },
              fontSize: { xs: '1.5rem', md: '2rem' }
            }}
          >
            Lead Management
          </Typography>
          <Stack 
            direction="row" 
            spacing={2} 
            alignItems="center"
            justifyContent={{ xs: 'center', sm: 'flex-end' }}
          >
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && handleViewModeChange(newMode)}
              size="small"
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              <ToggleButton value="list">
                <ViewListIcon />
              </ToggleButton>
              <ToggleButton value="kanban">
                <ViewModuleIcon />
              </ToggleButton>
              <ToggleButton value="search">
                <SearchIcon />
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingLead(null);
                setShowLeadForm(true);
              }}
              sx={{ display: { xs: 'none', md: 'flex' } }}
            >
              New Lead
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setEditingLead(null);
                setShowLeadForm(true);
              }}
              sx={{ display: { xs: 'flex', md: 'none' } }}
            >
              Add
            </Button>
          </Stack>
        </Stack>
        
        {/* Mobile View Mode Selector */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', mt: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && handleViewModeChange(newMode)}
            size="small"
            fullWidth
          >
            <ToggleButton value="list">
              <ViewListIcon sx={{ mr: 1 }} />
              List
            </ToggleButton>
            <ToggleButton value="kanban">
              <ViewModuleIcon sx={{ mr: 1 }} />
              Board
            </ToggleButton>
            <ToggleButton value="search">
              <SearchIcon sx={{ mr: 1 }} />
              Search
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {viewMode === 'search' && (
          <Box sx={{ p: 2 }}>
            <AdvancedSearch
              onSearch={handleSearch}
              initialQuery={searchQuery}
              loading={searchLoading}
            />
            <SearchResults
              results={searchResults!}
              loading={searchLoading}
              onFilterClick={handleSearchFilterClick}
            />
          </Box>
        )}

        {viewMode === 'list' && (
          <LeadList
            leads={leads}
            loading={leadsLoading}
            totalCount={totalCount}
            pagination={pagination}
            selectedLeads={selectedLeads}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            onSortChange={handleSortChange}
            onFilterChange={handleFilterChange}
            onLeadSelect={setSelectedLeads}
            onLeadEdit={handleLeadEdit}
            onLeadDelete={handleLeadDelete}
            onLeadAssign={handleLeadAssign}
            onBulkAction={handleBulkAction}
          />
        )}

        {viewMode === 'kanban' && (
          <LeadKanban
            leads={leads}
            loading={leadsLoading}
            onLeadMove={handleLeadMove}
            onLeadEdit={handleLeadEdit}
            onLeadDelete={handleLeadDelete}
            onLeadAssign={handleLeadAssign}
          />
        )}

        {viewMode === 'detail' && selectedLead && (
          <LeadDetail
            lead={selectedLead}
            activities={activities}
            tasks={tasks}
            onLeadEdit={handleLeadEdit}
            onLeadAssign={handleLeadAssign}
            onStatusChange={(leadId, status) => updateStatusMutation.mutate({ leadId, status })}
            onAddNote={handleAddNote}
            onCreateTask={handleCreateTask}
          />
        )}
      </Box>

      {/* Lead Form Dialog */}
      <LeadForm
        open={showLeadForm}
        onClose={() => {
          setShowLeadForm(false);
          setEditingLead(null);
        }}
        onSubmit={editingLead ? handleLeadUpdate : handleLeadCreate}
        initialData={editingLead || undefined}
        mode={editingLead ? 'edit' : 'create'}
        loading={createLeadMutation.isPending || updateLeadMutation.isPending}
      />

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onClose={() => setShowBulkDialog(false)}>
        <DialogTitle>Bulk Action</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
          </Typography>
          
          {bulkAction === 'assign' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={bulkAssignee}
                onChange={(e) => setBulkAssignee(e.target.value)}
                label="Assign To"
              >
                <MenuItem value="user1">User 1</MenuItem>
                <MenuItem value="user2">User 2</MenuItem>
              </Select>
            </FormControl>
          )}

          {bulkAction === 'status_change' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>New Status</InputLabel>
              <Select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                label="New Status"
              >
                {Object.values(LeadStatus).map(status => (
                  <MenuItem key={status} value={status}>
                    {status.replace('_', ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkSubmit} 
            variant="contained"
            disabled={
              bulkOperationMutation.isPending ||
              (bulkAction === 'assign' && !bulkAssignee) ||
              (bulkAction === 'status_change' && !bulkStatus)
            }
          >
            {bulkOperationMutation.isPending ? 'Processing...' : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
        }}
        onClick={() => {
          setEditingLead(null);
          setShowLeadForm(true);
        }}
      >
        <AddIcon />
      </Fab>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};