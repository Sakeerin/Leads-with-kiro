import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress
} from '@mui/material';
import { SearchResult } from '../types';

interface SearchResultsProps {
  results: SearchResult;
  loading?: boolean;
  onFilterClick?: (filterType: string, value: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading = false,
  onFilterClick
}) => {
  if (loading) {
    return (
      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Searching...
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  if (!results || results.total === 0) {
    return (
      <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No results found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Try adjusting your search criteria or filters
        </Typography>
      </Paper>
    );
  }

  const handleFilterClick = (filterType: string, value: string) => {
    if (onFilterClick) {
      onFilterClick(filterType, value);
    }
  };

  return (
    <Box>
      {/* Results Summary */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Search Results ({results.total.toLocaleString()} leads found)
        </Typography>

        {/* Aggregations/Facets */}
        {results.aggregations && (
          <Grid container spacing={2}>
            {/* Status Facets */}
            {results.aggregations.status.length > 0 && (
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Status
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {results.aggregations.status.map((facet) => (
                    <Chip
                      key={facet.key}
                      label={`${facet.key} (${facet.doc_count})`}
                      size="small"
                      variant="outlined"
                      clickable
                      onClick={() => handleFilterClick('status', facet.key)}
                    />
                  ))}
                </Box>
              </Grid>
            )}

            {/* Source Facets */}
            {results.aggregations.source.length > 0 && (
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Source
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {results.aggregations.source.map((facet) => (
                    <Chip
                      key={facet.key}
                      label={`${facet.key} (${facet.doc_count})`}
                      size="small"
                      variant="outlined"
                      clickable
                      onClick={() => handleFilterClick('source', facet.key)}
                    />
                  ))}
                </Box>
              </Grid>
            )}

            {/* Score Band Facets */}
            {results.aggregations.scoreBand.length > 0 && (
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Score Band
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {results.aggregations.scoreBand.map((facet) => (
                    <Chip
                      key={facet.key}
                      label={`${facet.key} (${facet.doc_count})`}
                      size="small"
                      variant="outlined"
                      clickable
                      onClick={() => handleFilterClick('scoreBand', facet.key)}
                    />
                  ))}
                </Box>
              </Grid>
            )}

            {/* Assigned To Facets */}
            {results.aggregations.assignedTo.length > 0 && (
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Assigned To
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {results.aggregations.assignedTo.slice(0, 5).map((facet) => (
                    <Chip
                      key={facet.key}
                      label={`${facet.key} (${facet.doc_count})`}
                      size="small"
                      variant="outlined"
                      clickable
                      onClick={() => handleFilterClick('assignedTo', facet.key)}
                    />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        )}
      </Paper>

      {/* Lead Results */}
      <Grid container spacing={2}>
        {results.leads.map((lead) => (
          <Grid item xs={12} key={lead.id}>
            <Card elevation={1}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <Typography variant="h6" gutterBottom>
                      {lead.company.name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      {lead.contact.name} • {lead.contact.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {lead.accountLeadId}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                      <Chip
                        label={lead.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        color={
                          lead.status === 'won' ? 'success' :
                          lead.status === 'lost' || lead.status === 'disqualified' ? 'error' :
                          lead.status === 'qualified' || lead.status === 'proposal' ? 'warning' :
                          'default'
                        }
                      />
                      <Chip
                        label={`${lead.score.band.toUpperCase()} (${lead.score.value})`}
                        size="small"
                        variant="outlined"
                        color={
                          lead.score.band === 'hot' ? 'error' :
                          lead.score.band === 'warm' ? 'warning' :
                          'default'
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {lead.source.channel.replace('_', ' ').toUpperCase()}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Created: {new Date(lead.metadata.createdAt).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', display: 'block' }}>
                      {lead.assignment.assignedTo ? `Assigned to: ${lead.assignment.assignedTo}` : 'Unassigned'}
                    </Typography>
                  </Grid>
                </Grid>

                {lead.followUp.notes && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Notes:</strong> {lead.followUp.notes}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};