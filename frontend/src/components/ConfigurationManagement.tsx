import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Container
} from '@mui/material';
import { CustomFieldsManager } from './CustomFieldsManager';
import { PicklistManager } from './PicklistManager';
import { StatusWorkflowManager } from './StatusWorkflowManager';
import { WorkingHoursManager } from './WorkingHoursManager';
import { HolidayManager } from './HolidayManager';
import { SystemConfigManager } from './SystemConfigManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`configuration-tabpanel-${index}`}
      aria-labelledby={`configuration-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `configuration-tab-${index}`,
    'aria-controls': `configuration-tabpanel-${index}`,
  };
}

export const ConfigurationManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          System Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage system settings, custom fields, picklists, workflows, and business rules
        </Typography>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="configuration tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Custom Fields" {...a11yProps(0)} />
            <Tab label="Picklists" {...a11yProps(1)} />
            <Tab label="Status Workflows" {...a11yProps(2)} />
            <Tab label="Working Hours" {...a11yProps(3)} />
            <Tab label="Holidays" {...a11yProps(4)} />
            <Tab label="System Settings" {...a11yProps(5)} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <CustomFieldsManager />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <PicklistManager />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <StatusWorkflowManager />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <WorkingHoursManager />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <HolidayManager />
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <SystemConfigManager />
        </TabPanel>
      </Paper>
    </Container>
  );
};