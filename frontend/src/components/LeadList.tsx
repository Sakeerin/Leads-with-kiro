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
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  CardActions,
  Collapse,
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
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    // Note: searchTerm is handled separately from filters in this component
    onFilterChange(filters);
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

  const handleCardExpand = (leadId: string) => {
    setExpandedCard(expandedCard === leadId ? null : leadId);
  };

  const MobileLeadCard: React.FC<{ lead: Lead }> = ({ lead }) => (
    <Card 
      sx={{ 
        mb: 1, 
        border: isSelected(lead.id) ? 2 : 1,
        borderColor: isSelected(lead.id) ? 'primary.main' : 'divider'
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox
              checked={isSelected(lead.id)}
              onChange={() => handleSelectLead(lead.id)}
              size="small"
            />
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              {lead.accountLeadId}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getScoreChip(lead.score.value, lead.score.band)}
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, lead)}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
          {lead.company.name}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {lead.contact.name}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          {getStatusChip(lead.status)}
          <Chip
            label={lead.source.channel.replace('_', ' ')}
            size="small"
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {lead.assignment.assignedTo ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                {lead.assignment.assignedTo.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="caption">
                {lead.assignment.assignedTo}
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Unassigned
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {formatDate(lead.metadata.createdAt)}
          </Typography>
        </Box>

        <Collapse in={expandedCard === lead.id}>
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Email:</strong> {lead.contact.email}
            </Typography>
            {lead.contact.phone && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Phone:</strong> 
                <Button
                  size="small"
                  href={`tel:${lead.contact.phone}`}
                  sx={{ ml: 1, minHeight: 32 }}
                >
                  {lead.contact.phone}
                </Button>
              </Typography>
            )}
            {lead.contact.mobile && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Mobile:</strong>
                <Button
                  size="small"
                  href={`tel:${lead.contact.mobile}`}
                  sx={{ ml: 1, minHeight: 32 }}
                >
                  {lead.contact.mobile}
                </Button>
              </Typography>
            )}
            {lead.company.industry && (
              <Typography variant="body2">
                <strong>Industry:</strong> {lead.company.industry}
              </Typography>
            )}
          </Box>
        </Collapse>
      </CardContent>
      
      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
        <Button
          size="small"
          onClick={() => handleCardExpand(lead.id)}
        >
          {expandedCard === lead.id ? 'Show Less' : 'Show More'}
        </Button>
        <Box>
          <IconButton
            size="small"
            onClick={() => onLeadEdit(lead)}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <EditIcon />
          </IconButton>
          {lead.contact.email && (
            <IconButton
              size="small"
              href={`mailto:${lead.contact.email}`}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <EmailIcon />
            </IconButton>
          )}
          {(lead.contact.phone || lead.contact.mobile) && (
            <IconButton
              size="small"
              href={`tel:${lead.contact.mobile || lead.contact.phone}`}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <PhoneIcon />
            </IconButton>
          )}
        </Box>
      </CardActions>
    </Card>
  );

  return (
    <Box>
      {/* Search and Filters */}
      <Paper sx={{ p: { xs: 1, md: 2 }, mb: 2 }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          alignItems="center" 
          sx={{ mb: 2 }}
        >
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
              sx: {
                '& input': {
                  fontSize: { xs: '16px', md: '14px' } // Prevent zoom on iOS
                }
              }
            }}
            sx={{ 
              flexGrow: 1,
              width: { xs: '100%', sm: 'auto' }
            }}
          />
          <Stack direction="row" spacing={1}>
            <Button
              startIcon={!isMobile ? <FilterIcon /> : undefined}
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'contained' : 'outlined'}
              size={isMobile ? 'small' : 'medium'}
            >
              {isMobile ? 'Filter' : 'Filters'}
            </Button>
            {Object.keys(filters).length > 0 && (
              <Button
                startIcon={!isMobile ? <ClearIcon /> : undefined}
                onClick={clearFilters}
                variant="outlined"
                color="secondary"
                size={isMobile ? 'small' : 'medium'}
              >
                Clear
              </Button>
            )}
          </Stack>
        </Stack>

        {showFilters && (
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            sx={{ mt: 2 }}
          >
            <FormControl 
              size="small" 
              sx={{ 
                minWidth: { xs: '100%', sm: 120 },
                width: { xs: '100%', sm: 'auto' }
              }}
            >
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

            <FormControl 
              size="small" 
              sx={{ 
                minWidth: { xs: '100%', sm: 120 },
                width: { xs: '100%', sm: 'auto' }
              }}
            >
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

      {/* Mobile Card View / Desktop Table */}
      {isMobile ? (
        <Box sx={{ px: 1 }}>
          {leads.map((lead) => (
            <MobileLeadCard key={lead.id} lead={lead} />
          ))}
        </Box>
      ) : (
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
      )}

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