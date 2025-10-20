import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
  Divider,
  Autocomplete,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { 
  Lead, 
  LeadChannel, 
  LeadStatus, 
  CompanySize, 
  ProductType,
  AdType 
} from '../types';

interface LeadFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Lead>) => void;
  initialData?: Partial<Lead>;
  mode: 'create' | 'edit';
  loading?: boolean;
}

const leadSchema = yup.object({
  company: yup.object({
    name: yup.string().required('Company name is required'),
    industry: yup.string(),
    size: yup.string(),
  }),
  contact: yup.object({
    name: yup.string().required('Contact name is required'),
    email: yup.string().email('Invalid email format').required('Email is required'),
    phone: yup.string(),
    mobile: yup.string(),
  }),
  source: yup.object({
    channel: yup.string().required('Source channel is required'),
    campaign: yup.string(),
  }),
  status: yup.string().required('Status is required'),
  product: yup.object({
    type: yup.string(),
    adType: yup.string(),
  }),
  followUp: yup.object({
    nextDate: yup.date(),
    notes: yup.string(),
  }),
});

const channelOptions = Object.values(LeadChannel).map(value => ({
  value,
  label: value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}));

const statusOptions = Object.values(LeadStatus).map(value => ({
  value,
  label: value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}));

const companySizeOptions = Object.values(CompanySize).map(value => ({
  value,
  label: value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}));



const productTypeOptions = Object.values(ProductType).map(value => ({
  value,
  label: value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}));

const adTypeOptions = Object.values(AdType).map(value => ({
  value,
  label: value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}));

export const LeadForm: React.FC<LeadFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  mode,
  loading = false,
}) => {
  const [companies] = useState<string[]>([]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(leadSchema),
    defaultValues: {
      company: {
        name: '',
        industry: '',
        size: '',
      },
      contact: {
        name: '',
        email: '',
        phone: '',
        mobile: '',
      },
      source: {
        channel: '',
        campaign: '',
      },
      status: LeadStatus.NEW,
      product: {
        type: '',
        adType: '',
      },
      followUp: {
        nextDate: undefined,
        notes: '',
      },
    },
  });

  useEffect(() => {
    if (initialData && mode === 'edit') {
      reset(initialData);
    } else if (mode === 'create') {
      reset({
        company: { name: '', industry: '', size: '' },
        contact: { name: '', email: '', phone: '', mobile: '' },
        source: { channel: '', campaign: '' },
        status: LeadStatus.NEW,

        product: { type: '', adType: '' },
        followUp: { nextDate: undefined, notes: '' },

      });
    }
  }, [initialData, mode, reset]);

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        fullScreen={window.innerWidth < 768} // Full screen on mobile
        PaperProps={{
          sx: { 
            minHeight: { xs: '100vh', md: '80vh' },
            margin: { xs: 0, md: 2 }
          }
        }}
      >
        <DialogTitle>
          {mode === 'create' ? 'Create New Lead' : 'Edit Lead'}
        </DialogTitle>
        
        <DialogContent dividers>
          <Box component="form" sx={{ mt: 1 }}>
            {/* Company Information */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
              Company Information
            </Typography>
            <Grid container spacing={{ xs: 1, md: 2 }}>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="company.name"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      {...field}
                      freeSolo
                      options={companies}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Company Name *"
                          error={!!errors.company?.name}
                          helperText={errors.company?.name?.message}
                          fullWidth
                        />
                      )}
                      onChange={(_, value) => field.onChange(value)}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="company.industry"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Industry"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="company.size"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Company Size</InputLabel>
                      <Select {...field} label="Company Size">
                        {companySizeOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Contact Information */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Contact Information
            </Typography>
            <Grid container spacing={{ xs: 1, md: 2 }}>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="contact.name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Contact Name *"
                      error={!!errors.contact?.name}
                      helperText={errors.contact?.name?.message}
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="contact.email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email *"
                      type="email"
                      error={!!errors.contact?.email}
                      helperText={errors.contact?.email?.message}
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="contact.phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone"
                      fullWidth
                      InputProps={{
                        sx: { 
                          '& input': { 
                            fontSize: { xs: '16px', md: '14px' } // Prevent zoom on iOS
                          }
                        }
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="contact.mobile"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Mobile"
                      fullWidth
                      InputProps={{
                        sx: { 
                          '& input': { 
                            fontSize: { xs: '16px', md: '14px' } // Prevent zoom on iOS
                          }
                        }
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Source Information */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Source Information
            </Typography>
            <Grid container spacing={{ xs: 1, md: 2 }}>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="source.channel"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.source?.channel}>
                      <InputLabel>Source Channel *</InputLabel>
                      <Select {...field} label="Source Channel *">
                        {channelOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="source.campaign"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Campaign"
                      fullWidth
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Lead Status and Assignment */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Status and Assignment
            </Typography>
            <Grid container spacing={{ xs: 1, md: 2 }}>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.status}>
                      <InputLabel>Status *</InputLabel>
                      <Select {...field} label="Status *">
                        {statusOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  label="Assigned To"
                  fullWidth
                  placeholder="Enter assignee name"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Qualification */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Qualification
            </Typography>
            <Grid container spacing={{ xs: 1, md: 2 }}>
              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  label="Interest Level"
                  fullWidth
                  placeholder="High, Medium, Low"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  label="Budget Status"
                  fullWidth
                  placeholder="Confirmed, Estimated, Unknown"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  label="Purchase Timeline"
                  fullWidth
                  placeholder="Immediate, Within Month, etc."
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  label="Business Type"
                  fullWidth
                  placeholder="B2B or B2C"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Product Information */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Product Information
            </Typography>
            <Grid container spacing={{ xs: 1, md: 2 }}>
              <Grid item xs={12} sm={6} md={6}>
                <Controller
                  name="product.type"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Product Type</InputLabel>
                      <Select {...field} label="Product Type">
                        {productTypeOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="product.adType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Ad Type</InputLabel>
                      <Select {...field} label="Ad Type">
                        {adTypeOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Follow-up */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Follow-up
            </Typography>
            <Grid container spacing={{ xs: 1, md: 2 }}>
              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  label="Next Follow-up Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="followUp.notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Follow-up Notes"
                      multiline
                      rows={3}
                      fullWidth
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit(handleFormSubmit)} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? 'Saving...' : (mode === 'create' ? 'Create Lead' : 'Update Lead')}
          </Button>
        </DialogActions>
      </Dialog>
  );
};