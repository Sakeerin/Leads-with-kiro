import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  IconButton,
  Chip,
  Avatar,
  Typography,
  Menu,
  MenuItem,

  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Lead, LeadStatus, ScoreBand, SearchFilters, PaginationParams, TableColumn } from '../types';

interface LeadListProps {
  leads: Lead[];
  loading?: boolean;
  totalCount: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onFilterChange: (filters: SearchFilters) => void;
  onLeadSelect: (leadIds: string[]) => void;
  onLeadEdit: (lead: Lead) => void;
  onLeadDelete: (leadId: string) => void;
  onLeadAssign: (leadId: string) => void;
  onBulkAction: (action: string, leadIds: string[]) => void;
  pagination: PaginationParams;
  selectedLeads: string[];
}

const columns: TableColumn[] = [
  { id: 'accountLeadId', label: 'Lead ID', sortable: true, width: 120 },
  { id: 'company.name', label: 'Company', sortable: true, width: 200 },
  { id: 'contact.name', label: 'Contact', sortable: true, width: 180 },
  { id: 'contact.email', label: 'Email', sortable: false, width: 200 },
  { id: 'source.channel', label: 'Source', sortable: true, width: 120 },
  { id: 'status', label: 'Status', sortable: true, width: 120 },
  { id: 'score.value', label: 'Score', sortable: true, width: 80 },
  { id: 'assignment.assignedTo', label: 'Assigned To', sortable: false, width: 140 },
  { id: 'metadata.createdAt', label: 'Created', sortable: true, width: 120 },
  { id: 'actions', label: 'Actions', sortable: false, width: 80 },
];

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

export const LeadList: React.FC<LeadListProps> = ({
  leads,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onSortChange,
  onFilterChange,
  onLeadSelect,
  onLeadEdit,
  onLeadDelete,
  onLeadAssign,
  onBulkAction,
  pagination,
  selectedLeads,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    setAnchorEl(event.currentTarget);
    setSelectedLead(lead);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLead(null);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onLeadSelect(leads.map(lead => lead.id));
    } else {
      onLeadSelect([]);
    }
  };

  const handleSelectLead = (leadId: string) => {
    const newSelected = selectedLeads.includes(leadId)
      ? selectedLeads.filter(id => id !== leadId)
      : [...selectedLeads, leadId];
    onLeadSelect(newSelected);
  };

  const handleSort = (columnId: string) => {
    const isAsc = pagination.sortBy === columnId && pagination.sortOrder === 'asc';
    onSortChange(columnId, isAsc ? 'desc' : 'asc');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    onFilterChange({ ...filters, searchTerm: value });
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    onFilterChange({});
  };

  const getStatusChip = (status: LeadStatus) => (
    <Chip
      label={status.replace('_', ' ').toUpperCase()}
      size="small"
      sx={{
        backgroundColor: statusColors[status],
        color: 'white',
        fontWeight: 'bold',
      }}
    />
  );

  const getScoreChip = (score: number, band: ScoreBand) => (
    <Chip
      label={score}
      size="small"
      sx={{
        backgroundColor: scoreBandColors[band],
        color: 'white',
        fontWeight: 'bold',
      }}
    />
  );

  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const isSelected = (leadId: string) => selectedLeads.includes(leadId);
  const numSelected = selectedLeads.length;

  return (
    <Box>
      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            placeholder="Search leads..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? 'contained' : 'outlined'}
          >
            Filters
          </Button>
          {Object.keys(filters).length > 0 && (
            <Button
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              variant="outlined"
              color="secondary"
            >
              Clear
            </Button>
          )}
        </Stack>

        {showFilters && (
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                multiple
                value={filters.status || []}
                onChange={(e) => handleFilterChange({ status: e.target.value as string[] })}
                input={<OutlinedInput label="Status" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {Object.values(LeadStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.replace('_', ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Score Band</InputLabel>
              <Select
                multiple
                value={filters.scoreBand || []}
                onChange={(e) => handleFilterChange({ scoreBand: e.target.value as string[] })}
                input={<OutlinedInput label="Score Band" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {Object.values(ScoreBand).map((band) => (
                  <MenuItem key={band} value={band}>
                    {band.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        )}
      </Paper>

      {/* Bulk Actions */}
      {numSelected > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1">
              {numSelected} lead{numSelected > 1 ? 's' : ''} selected
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                onClick={() => onBulkAction('assign', selectedLeads)}
              >
                Assign
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => onBulkAction('status_change', selectedLeads)}
              >
                Change Status
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => onBulkAction('delete', selectedLeads)}
              >
                Delete
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={numSelected > 0 && numSelected < leads.length}
                  checked={leads.length > 0 && numSelected === leads.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  sortDirection={pagination.sortBy === column.id ? pagination.sortOrder : false}
                  sx={{ width: column.width }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={pagination.sortBy === column.id}
                      direction={pagination.sortBy === column.id ? pagination.sortOrder : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                hover
                selected={isSelected(lead.id)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected(lead.id)}
                    onChange={() => handleSelectLead(lead.id)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {lead.accountLeadId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {lead.company.name}
                  </Typography>
                  {lead.company.industry && (
                    <Typography variant="caption" color="text.secondary">
                      {lead.company.industry}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {lead.contact.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {lead.contact.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={lead.source.channel.replace('_', ' ')}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {getStatusChip(lead.status)}
                </TableCell>
                <TableCell>
                  {getScoreChip(lead.score.value, lead.score.band)}
                </TableCell>
                <TableCell>
                  {lead.assignment.assignedTo ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                        {lead.assignment.assignedTo.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2">
                        {lead.assignment.assignedTo}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Unassigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(lead.metadata.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, lead)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalCount}
        page={pagination.page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={pagination.limit}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedLead) onLeadEdit(selectedLead);
          handleMenuClose();
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedLead) onLeadAssign(selectedLead.id);
          handleMenuClose();
        }}>
          <AssignmentIcon sx={{ mr: 1 }} />
          Assign
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedLead?.contact.email) {
            window.open(`mailto:${selectedLead.contact.email}`);
          }
          handleMenuClose();
        }}>
          <EmailIcon sx={{ mr: 1 }} />
          Email
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedLead?.contact.phone) {
            window.open(`tel:${selectedLead.contact.phone}`);
          }
          handleMenuClose();
        }}>
          <PhoneIcon sx={{ mr: 1 }} />
          Call
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (selectedLead) onLeadDelete(selectedLead.id);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};