import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Button,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  SearchQuery, 
  SearchSuggestion, 
  SavedSearch, 
  LeadStatus, 
  LeadChannel, 
  ScoreBand 
} from '../types';
import { SearchService } from '../services/searchService';
import { useDebounce } from '../hooks/useDebounce';

interface AdvancedSearchProps {
  onSearch: (query: SearchQuery) => void;
  initialQuery?: SearchQuery;
  loading?: boolean;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  initialQuery,
  loading = false
}) => {
  const [query, setQuery] = useState<SearchQuery>(initialQuery || {});
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [publicSavedSearches, setPublicSavedSearches] = useState<SavedSearch[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedSearchesDialogOpen, setSavedSearchesDialogOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchPublic, setSaveSearchPublic] = useState(false);

  const debouncedSearchTerm = useDebounce(query.searchTerm || '', 300);

  // Load saved searches on component mount
  useEffect(() => {
    loadSavedSearches();
  }, []);

  // Get suggestions when search term changes
  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
      getSuggestions(debouncedSearchTerm);
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearchTerm]);

  const loadSavedSearches = async () => {
    try {
      const [userSearches, publicSearches] = await Promise.all([
        SearchService.getSavedSearches(),
        SearchService.getPublicSavedSearches()
      ]);
      setSavedSearches(userSearches.data);
      setPublicSavedSearches(publicSearches.data);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const getSuggestions = async (term: string) => {
    setLoadingSuggestions(true);
    try {
      const response = await SearchService.getSuggestions(term);
      setSuggestions(response.data);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSearch = () => {
    onSearch(query);
  };

  const handleClear = () => {
    const clearedQuery: SearchQuery = {};
    setQuery(clearedQuery);
    onSearch(clearedQuery);
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) return;

    try {
      await SearchService.createSavedSearch({
        name: saveSearchName.trim(),
        query,
        isPublic: saveSearchPublic
      });
      
      setSaveDialogOpen(false);
      setSaveSearchName('');
      setSaveSearchPublic(false);
      loadSavedSearches();
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  const handleLoadSavedSearch = (savedSearch: SavedSearch) => {
    setQuery(savedSearch.query);
    onSearch(savedSearch.query);
    setSavedSearchesDialogOpen(false);
  };

  const handleDeleteSavedSearch = async (id: string) => {
    try {
      await SearchService.deleteSavedSearch(id);
      loadSavedSearches();
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  };

  const handleShareSavedSearch = async (id: string) => {
    try {
      const response = await SearchService.generateShareableUrl(id);
      navigator.clipboard.writeText(response.data.url);
      // You could show a toast notification here
    } catch (error) {
      console.error('Failed to generate shareable URL:', error);
    }
  };

  const updateFilters = (key: keyof SearchQuery['filters'], value: any) => {
    setQuery(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }));
  };

  const statusOptions = Object.values(LeadStatus).map(status => ({
    value: status,
    label: status.replace('_', ' ').toUpperCase()
  }));

  const sourceOptions = Object.values(LeadChannel).map(channel => ({
    value: channel,
    label: channel.replace('_', ' ').toUpperCase()
  }));

  const scoreBandOptions = Object.values(ScoreBand).map(band => ({
    value: band,
    label: band.toUpperCase()
  }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Autocomplete
            freeSolo
            fullWidth
            options={suggestions.map(s => s.text)}
            value={query.searchTerm || ''}
            onInputChange={(_, value) => {
              setQuery(prev => ({ ...prev, searchTerm: value }));
            }}
            loading={loadingSuggestions}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search leads, companies, contacts..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  endAdornment: (
                    <>
                      {loadingSuggestions && <CircularProgress size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
            renderOption={(props, option) => {
              const suggestion = suggestions.find(s => s.text === option);
              return (
                <li {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{option}</Typography>
                    {suggestion && (
                      <Chip 
                        size="small" 
                        label={suggestion.type} 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </li>
              );
            }}
          />
          
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
          >
            Search
          </Button>

          <IconButton
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Autocomplete
                  multiple
                  options={statusOptions}
                  getOptionLabel={(option) => option.label}
                  value={statusOptions.filter(opt => query.filters?.status?.includes(opt.value)) || []}
                  onChange={(_, value) => updateFilters('status', value.map(v => v.value))}
                  renderInput={(params) => (
                    <TextField {...params} label="Status" placeholder="Select status" />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.label}
                        size="small"
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Autocomplete
                  multiple
                  options={sourceOptions}
                  getOptionLabel={(option) => option.label}
                  value={sourceOptions.filter(opt => query.filters?.source?.includes(opt.value)) || []}
                  onChange={(_, value) => updateFilters('source', value.map(v => v.value))}
                  renderInput={(params) => (
                    <TextField {...params} label="Source" placeholder="Select source" />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.label}
                        size="small"
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Autocomplete
                  multiple
                  options={scoreBandOptions}
                  getOptionLabel={(option) => option.label}
                  value={scoreBandOptions.filter(opt => query.filters?.scoreBand?.includes(opt.value)) || []}
                  onChange={(_, value) => updateFilters('scoreBand', value.map(v => v.value))}
                  renderInput={(params) => (
                    <TextField {...params} label="Score Band" placeholder="Select score band" />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.label}
                        size="small"
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range Field</InputLabel>
                <Select
                  value={query.filters?.dateRange?.field || ''}
                  onChange={(e) => updateFilters('dateRange', {
                    ...query.filters?.dateRange,
                    field: e.target.value
                  })}
                  label="Date Range Field"
                >
                  <MenuItem value="created_at">Created Date</MenuItem>
                  <MenuItem value="updated_at">Updated Date</MenuItem>
                  <MenuItem value="follow_up_date">Follow-up Date</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {query.filters?.dateRange?.field && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="From Date"
                    value={query.filters.dateRange.from || null}
                    onChange={(date) => updateFilters('dateRange', {
                      ...query.filters?.dateRange,
                      from: date
                    })}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="To Date"
                    value={query.filters.dateRange.to || null}
                    onChange={(date) => updateFilters('dateRange', {
                      ...query.filters?.dateRange,
                      to: date
                    })}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
              </>
            )}
          </Grid>

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClear}
              startIcon={<ClearIcon />}
            >
              Clear All
            </Button>
            
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSaveDialogOpen(true)}
              startIcon={<SaveIcon />}
              disabled={!query.searchTerm && !query.filters}
            >
              Save Search
            </Button>
            
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSavedSearchesDialogOpen(true)}
            >
              Saved Searches
            </Button>
          </Box>
        </Collapse>

        {/* Save Search Dialog */}
        <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
          <DialogTitle>Save Search</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Search Name"
              fullWidth
              variant="outlined"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Visibility</InputLabel>
              <Select
                value={saveSearchPublic ? 'public' : 'private'}
                onChange={(e) => setSaveSearchPublic(e.target.value === 'public')}
                label="Visibility"
              >
                <MenuItem value="private">Private</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSearch} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>

        {/* Saved Searches Dialog */}
        <Dialog 
          open={savedSearchesDialogOpen} 
          onClose={() => setSavedSearchesDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Saved Searches</DialogTitle>
          <DialogContent>
            <Typography variant="h6" gutterBottom>My Searches</Typography>
            <List>
              {savedSearches.map((search) => (
                <ListItem key={search.id} button onClick={() => handleLoadSavedSearch(search)}>
                  <ListItemText
                    primary={search.name}
                    secondary={`Created: ${new Date(search.createdAt).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title={search.isPublic ? 'Public' : 'Private'}>
                      <IconButton size="small">
                        {search.isPublic ? <PublicIcon /> : <LockIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Share">
                      <IconButton 
                        size="small" 
                        onClick={() => handleShareSavedSearch(search.id)}
                      >
                        <ShareIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteSavedSearch(search.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            {publicSavedSearches.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Public Searches
                </Typography>
                <List>
                  {publicSavedSearches.map((search) => (
                    <ListItem key={search.id} button onClick={() => handleLoadSavedSearch(search)}>
                      <ListItemText
                        primary={search.name}
                        secondary={`Created: ${new Date(search.createdAt).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Share">
                          <IconButton 
                            size="small" 
                            onClick={() => handleShareSavedSearch(search.id)}
                          >
                            <ShareIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSavedSearchesDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </LocalizationProvider>
  );
};