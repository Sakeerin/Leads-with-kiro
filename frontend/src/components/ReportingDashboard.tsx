import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { reportingService } from '../services/reportingService';

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
      id={`reporting-tabpanel-${index}`}
      aria-labelledby={`reporting-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const ReportingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [slaHours, setSlaHours] = useState(24);
  
  // Report data states
  const [funnelMetrics, setFunnelMetrics] = useState<any[]>([]);
  const [timeToFirstTouch, setTimeToFirstTouch] = useState<any>(null);
  const [slaCompliance, setSlaCompliance] = useState<any>(null);
  const [sourceEffectiveness, setSourceEffectiveness] = useState<any[]>([]);
  const [salesPerformance, setSalesPerformance] = useState<any[]>([]);
  const [dataQuality, setDataQuality] = useState<any>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const dateRange = startDate && endDate ? {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      } : undefined;

      const [
        funnelData,
        timeToFirstTouchData,
        slaData,
        sourceData,
        salesData,
        qualityData
      ] = await Promise.all([
        reportingService.getFunnelMetrics(dateRange),
        reportingService.getTimeToFirstTouchReport(dateRange),
        reportingService.getSLAComplianceReport(slaHours, dateRange),
        reportingService.getSourceEffectivenessReport(dateRange),
        reportingService.getSalesRepPerformanceReport(dateRange),
        reportingService.getDataQualityReport(dateRange)
      ]);

      setFunnelMetrics(funnelData.data.metrics);
      setTimeToFirstTouch(timeToFirstTouchData.data);
      setSlaCompliance(slaData.data);
      setSourceEffectiveness(sourceData.data.sources);
      setSalesPerformance(salesData.data.representatives);
      setDataQuality(qualityData.data);
    } catch (err) {
      setError('Failed to load reports. Please try again.');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleRefresh = () => {
    loadReports();
  };

  const exportReport = async (reportType: string, format: 'json' | 'csv' = 'csv') => {
    try {
      const dateRange = startDate && endDate ? {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      } : undefined;

      await reportingService.exportReport(reportType, format, dateRange, slaHours);
    } catch (err) {
      setError('Failed to export report. Please try again.');
      console.error('Error exporting report:', err);
    }
  };

  if (loading && !funnelMetrics.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        {/* Header with filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small"
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small"
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>SLA Hours</InputLabel>
                <Select
                  value={slaHours}
                  label="SLA Hours"
                  onChange={(e) => setSlaHours(Number(e.target.value))}
                >
                  <MenuItem value={4}>4 hours</MenuItem>
                  <MenuItem value={8}>8 hours</MenuItem>
                  <MenuItem value={24}>24 hours</MenuItem>
                  <MenuItem value={48}>48 hours</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                onClick={handleRefresh}
                disabled={loading}
                fullWidth
              >
                {loading ? <CircularProgress size={20} /> : 'Refresh'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="reporting tabs">
            <Tab label="Funnel Metrics" />
            <Tab label="Response Times" />
            <Tab label="SLA Compliance" />
            <Tab label="Source Effectiveness" />
            <Tab label="Sales Performance" />
            <Tab label="Data Quality" />
          </Tabs>
        </Box>

        {/* Funnel Metrics Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Lead Conversion Funnel
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={funnelMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Lead Count" />
                      <Bar dataKey="conversionRate" fill="#82ca9d" name="Conversion Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Average Time in Stage (Days)
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={funnelMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="averageTimeInStage" stroke="#8884d8" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Stage Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={funnelMetrics}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ stage, count }) => `${stage}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {funnelMetrics.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => exportReport('funnel', 'csv')}
              sx={{ mr: 1 }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              onClick={() => exportReport('funnel', 'json')}
            >
              Export JSON
            </Button>
          </Box>
        </TabPanel>

        {/* Response Times Tab */}
        <TabPanel value={activeTab} index={1}>
          {timeToFirstTouch && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Overall Metrics
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {timeToFirstTouch.averageTimeToFirstTouch?.toFixed(1) || 0}h
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Average Time to First Touch
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 2 }}>
                      {timeToFirstTouch.medianTimeToFirstTouch?.toFixed(1) || 0}h
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Median Time to First Touch
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Response Time by Source
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={timeToFirstTouch.bySource || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="source" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="averageTime" fill="#8884d8" name="Average Time (hours)" />
                        <Bar dataKey="medianTime" fill="#82ca9d" name="Median Time (hours)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Response Time by Sales Rep
                    </Typography>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={timeToFirstTouch.byAssignee || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="assigneeName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="averageTime" fill="#8884d8" name="Average Time (hours)" />
                        <Bar dataKey="medianTime" fill="#82ca9d" name="Median Time (hours)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => exportReport('time-to-first-touch', 'csv')}
              sx={{ mr: 1 }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              onClick={() => exportReport('time-to-first-touch', 'json')}
            >
              Export JSON
            </Button>
          </Box>
        </TabPanel>

        {/* SLA Compliance Tab */}
        <TabPanel value={activeTab} index={2}>
          {slaCompliance && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Overall SLA Compliance
                    </Typography>
                    <Typography variant="h3" color={slaCompliance.overallCompliance >= 80 ? "success.main" : "error.main"}>
                      {slaCompliance.overallCompliance?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {slaCompliance.compliantLeads || 0} of {slaCompliance.totalLeads || 0} leads
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      Average Response: {slaCompliance.averageResponseTime?.toFixed(1) || 0}h
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      SLA Compliance by Sales Rep
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={slaCompliance.byAssignee || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="assigneeName" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="compliance" fill="#8884d8" name="Compliance %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      SLA Compliance by Source
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={slaCompliance.bySource || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="source" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="compliance" fill="#8884d8" name="Compliance %" />
                        <Bar dataKey="averageResponseTime" fill="#82ca9d" name="Avg Response Time (hours)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => exportReport('sla-compliance', 'csv')}
              sx={{ mr: 1 }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              onClick={() => exportReport('sla-compliance', 'json')}
            >
              Export JSON
            </Button>
          </Box>
        </TabPanel>

        {/* Source Effectiveness Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Source Effectiveness Overview
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={sourceEffectiveness}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="source" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalLeads" fill="#8884d8" name="Total Leads" />
                      <Bar dataKey="qualifiedLeads" fill="#82ca9d" name="Qualified Leads" />
                      <Bar dataKey="convertedLeads" fill="#ffc658" name="Converted Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Qualification Rates by Source
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sourceEffectiveness}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="source" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="qualificationRate" fill="#8884d8" name="Qualification Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Conversion Rates by Source
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sourceEffectiveness}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="source" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="conversionRate" fill="#82ca9d" name="Conversion Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => exportReport('source-effectiveness', 'csv')}
              sx={{ mr: 1 }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              onClick={() => exportReport('source-effectiveness', 'json')}
            >
              Export JSON
            </Button>
          </Box>
        </TabPanel>

        {/* Sales Performance Tab */}
        <TabPanel value={activeTab} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Sales Representative Performance
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={salesPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="assigneeName" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalLeads" fill="#8884d8" name="Total Leads" />
                      <Bar dataKey="qualifiedLeads" fill="#82ca9d" name="Qualified Leads" />
                      <Bar dataKey="convertedLeads" fill="#ffc658" name="Converted Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Conversion Rates by Rep
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="assigneeName" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="conversionRate" fill="#8884d8" name="Conversion Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Task Completion by Rep
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="assigneeName" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tasksCompleted" fill="#82ca9d" name="Completed Tasks" />
                      <Bar dataKey="tasksOverdue" fill="#ff7c7c" name="Overdue Tasks" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => exportReport('sales-performance', 'csv')}
              sx={{ mr: 1 }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              onClick={() => exportReport('sales-performance', 'json')}
            >
              Export JSON
            </Button>
          </Box>
        </TabPanel>

        {/* Data Quality Tab */}
        <TabPanel value={activeTab} index={5}>
          {dataQuality && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Data Quality Overview
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {dataQuality.dataCompletenessScore?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Data Completeness Score
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 2 }} color={dataQuality.duplicateRate > 5 ? "error.main" : "success.main"}>
                      {dataQuality.duplicateRate?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Duplicate Rate ({dataQuality.duplicateLeads || 0} leads)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Missing Fields Analysis
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dataQuality.missingFields || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="field" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="missingCount" fill="#ff7c7c" name="Missing Count" />
                        <Bar dataKey="missingRate" fill="#8884d8" name="Missing Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Data Validation Issues
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body1">Invalid Emails:</Typography>
                      <Typography variant="h6" color="error.main">
                        {dataQuality.invalidEmails || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body1">Invalid Phones:</Typography>
                      <Typography variant="h6" color="error.main">
                        {dataQuality.invalidPhones || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1">Total Leads:</Typography>
                      <Typography variant="h6">
                        {dataQuality.totalLeads || 0}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Data Quality Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Complete Data', value: dataQuality.dataCompletenessScore || 0 },
                            { name: 'Missing Data', value: 100 - (dataQuality.dataCompletenessScore || 0) }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#82ca9d" />
                          <Cell fill="#ff7c7c" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => exportReport('data-quality', 'csv')}
              sx={{ mr: 1 }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              onClick={() => exportReport('data-quality', 'json')}
            >
              Export JSON
            </Button>
          </Box>
        </TabPanel>
      </Box>
    </LocalizationProvider>
  );
};