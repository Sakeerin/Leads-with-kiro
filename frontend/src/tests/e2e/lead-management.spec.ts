import { test, expect } from '@playwright/test';

test.describe('Lead Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/v1/auth/verify', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'sales'
          }
        })
      });
    });

    // Navigate to the application
    await page.goto('/');
    
    // Set authentication token
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token');
    });
  });

  test.describe('Lead Creation Workflow', () => {
    test('should create a new lead successfully', async ({ page }) => {
      // Mock lead creation API
      await page.route('**/api/v1/leads', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'lead-123',
                accountLeadId: 'AL-24-01-001',
                company: { name: 'Test Company' },
                contact: { name: 'John Doe', email: 'john@test.com' },
                status: 'new'
              }
            })
          });
        }
      });

      // Navigate to lead creation
      await page.click('[data-testid="create-lead-button"]');
      
      // Fill out the lead form
      await page.fill('[data-testid="company-name-input"]', 'Test Company');
      await page.fill('[data-testid="contact-name-input"]', 'John Doe');
      await page.fill('[data-testid="contact-email-input"]', 'john@test.com');
      await page.fill('[data-testid="contact-phone-input"]', '+1234567890');
      
      // Select source channel
      await page.click('[data-testid="source-channel-select"]');
      await page.click('[data-testid="source-channel-option-web-form"]');
      
      // Submit the form
      await page.click('[data-testid="submit-lead-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Lead created successfully');
      
      // Verify redirect to lead detail page
      await expect(page).toHaveURL(/\/leads\/lead-123$/);
    });

    test('should show validation errors for invalid data', async ({ page }) => {
      await page.click('[data-testid="create-lead-button"]');
      
      // Try to submit without required fields
      await page.click('[data-testid="submit-lead-button"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="company-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-email-error"]')).toBeVisible();
      
      // Fill invalid email
      await page.fill('[data-testid="contact-email-input"]', 'invalid-email');
      await page.blur('[data-testid="contact-email-input"]');
      
      await expect(page.locator('[data-testid="contact-email-error"]')).toContainText('Invalid email format');
    });

    test('should handle duplicate detection', async ({ page }) => {
      // Mock duplicate detection API
      await page.route('**/api/v1/leads/duplicates', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'existing-lead-123',
                matchType: 'email',
                confidence: 1.0,
                lead: {
                  id: 'existing-lead-123',
                  company: { name: 'Existing Company' },
                  contact: { name: 'Jane Doe', email: 'john@test.com' }
                }
              }
            ]
          })
        });
      });

      await page.click('[data-testid="create-lead-button"]');
      
      // Fill form with duplicate email
      await page.fill('[data-testid="company-name-input"]', 'Test Company');
      await page.fill('[data-testid="contact-name-input"]', 'John Doe');
      await page.fill('[data-testid="contact-email-input"]', 'john@test.com');
      
      // Trigger duplicate check on email blur
      await page.blur('[data-testid="contact-email-input"]');
      
      // Verify duplicate warning appears
      await expect(page.locator('[data-testid="duplicate-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="duplicate-warning"]')).toContainText('Potential duplicate found');
      
      // Verify duplicate lead details are shown
      await expect(page.locator('[data-testid="duplicate-lead-existing-lead-123"]')).toBeVisible();
    });
  });

  test.describe('Lead List and Search', () => {
    test.beforeEach(async ({ page }) => {
      // Mock leads list API
      await page.route('**/api/v1/leads/search*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              leads: [
                {
                  id: 'lead-1',
                  accountLeadId: 'AL-24-01-001',
                  company: { name: 'Company A' },
                  contact: { name: 'John Doe', email: 'john@companya.com' },
                  status: 'new',
                  score: { value: 75, band: 'warm' }
                },
                {
                  id: 'lead-2',
                  accountLeadId: 'AL-24-01-002',
                  company: { name: 'Company B' },
                  contact: { name: 'Jane Smith', email: 'jane@companyb.com' },
                  status: 'contacted',
                  score: { value: 85, band: 'hot' }
                }
              ],
              pagination: {
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1
              }
            }
          })
        });
      });
    });

    test('should display leads list', async ({ page }) => {
      await page.goto('/leads');
      
      // Verify leads are displayed
      await expect(page.locator('[data-testid="lead-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="lead-item-lead-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="lead-item-lead-2"]')).toBeVisible();
      
      // Verify lead information is displayed correctly
      await expect(page.locator('[data-testid="lead-item-lead-1"] [data-testid="company-name"]')).toContainText('Company A');
      await expect(page.locator('[data-testid="lead-item-lead-1"] [data-testid="contact-name"]')).toContainText('John Doe');
      await expect(page.locator('[data-testid="lead-item-lead-1"] [data-testid="status"]')).toContainText('new');
    });

    test('should filter leads by status', async ({ page }) => {
      await page.goto('/leads');
      
      // Apply status filter
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-filter-option-contacted"]');
      
      // Verify API is called with filter
      await page.waitForRequest(request => 
        request.url().includes('/api/v1/leads/search') && 
        request.url().includes('status=contacted')
      );
    });

    test('should search leads by text', async ({ page }) => {
      await page.goto('/leads');
      
      // Enter search term
      await page.fill('[data-testid="search-input"]', 'Company A');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      // Verify API is called with search term
      await page.waitForRequest(request => 
        request.url().includes('/api/v1/leads/search') && 
        request.url().includes('q=Company%20A')
      );
    });

    test('should navigate to lead detail on click', async ({ page }) => {
      await page.goto('/leads');
      
      // Click on a lead
      await page.click('[data-testid="lead-item-lead-1"]');
      
      // Verify navigation to lead detail
      await expect(page).toHaveURL(/\/leads\/lead-1$/);
    });
  });

  test.describe('Kanban Board Workflow', () => {
    test.beforeEach(async ({ page }) => {
      // Mock Kanban data
      await page.route('**/api/v1/leads/kanban*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              columns: [
                {
                  status: 'new',
                  title: 'New',
                  leads: [
                    {
                      id: 'lead-1',
                      accountLeadId: 'AL-24-01-001',
                      company: { name: 'Company A' },
                      contact: { name: 'John Doe' },
                      status: 'new'
                    }
                  ]
                },
                {
                  status: 'contacted',
                  title: 'Contacted',
                  leads: []
                }
              ]
            }
          })
        });
      });
    });

    test('should display Kanban board', async ({ page }) => {
      await page.goto('/leads/kanban');
      
      // Verify Kanban columns are displayed
      await expect(page.locator('[data-testid="kanban-column-new"]')).toBeVisible();
      await expect(page.locator('[data-testid="kanban-column-contacted"]')).toBeVisible();
      
      // Verify lead cards are displayed
      await expect(page.locator('[data-testid="lead-card-lead-1"]')).toBeVisible();
    });

    test('should move lead between columns', async ({ page }) => {
      // Mock lead update API
      await page.route('**/api/v1/leads/lead-1', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'lead-1',
                status: 'contacted'
              }
            })
          });
        }
      });

      await page.goto('/leads/kanban');
      
      // Drag lead from 'new' to 'contacted' column
      const leadCard = page.locator('[data-testid="lead-card-lead-1"]');
      const targetColumn = page.locator('[data-testid="kanban-column-contacted"] [data-testid="drop-zone"]');
      
      await leadCard.dragTo(targetColumn);
      
      // Verify API call to update lead status
      await page.waitForRequest(request => 
        request.url().includes('/api/v1/leads/lead-1') && 
        request.method() === 'PUT'
      );
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Lead status updated');
    });
  });

  test.describe('Lead Detail Workflow', () => {
    test.beforeEach(async ({ page }) => {
      // Mock lead detail API
      await page.route('**/api/v1/leads/lead-123', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'lead-123',
                accountLeadId: 'AL-24-01-001',
                company: { name: 'Test Company', industry: 'Technology' },
                contact: { name: 'John Doe', email: 'john@test.com', phone: '+1234567890' },
                status: 'new',
                score: { value: 75, band: 'warm' },
                assignment: { assignedTo: 'user-456', assignedAt: new Date() },
                metadata: { createdAt: new Date(), updatedAt: new Date() }
              }
            })
          });
        }
      });

      // Mock activities API
      await page.route('**/api/v1/leads/lead-123/activities', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'activity-1',
                type: 'lead_created',
                subject: 'Lead created',
                performedBy: 'user-123',
                performedAt: new Date(),
                details: {}
              }
            ]
          })
        });
      });
    });

    test('should display lead details', async ({ page }) => {
      await page.goto('/leads/lead-123');
      
      // Verify lead information is displayed
      await expect(page.locator('[data-testid="lead-title"]')).toContainText('Test Company - John Doe');
      await expect(page.locator('[data-testid="account-lead-id"]')).toContainText('AL-24-01-001');
      await expect(page.locator('[data-testid="company-name"]')).toContainText('Test Company');
      await expect(page.locator('[data-testid="contact-email"]')).toContainText('john@test.com');
      await expect(page.locator('[data-testid="lead-status"]')).toContainText('new');
      await expect(page.locator('[data-testid="lead-score"]')).toContainText('75');
    });

    test('should display activity timeline', async ({ page }) => {
      await page.goto('/leads/lead-123');
      
      // Verify activity timeline is displayed
      await expect(page.locator('[data-testid="activity-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-item-activity-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-item-activity-1"]')).toContainText('Lead created');
    });

    test('should edit lead information', async ({ page }) => {
      // Mock lead update API
      await page.route('**/api/v1/leads/lead-123', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'lead-123',
                company: { name: 'Updated Company' }
              }
            })
          });
        }
      });

      await page.goto('/leads/lead-123');
      
      // Click edit button
      await page.click('[data-testid="edit-lead-button"]');
      
      // Verify edit form is displayed
      await expect(page.locator('[data-testid="edit-lead-form"]')).toBeVisible();
      
      // Update company name
      await page.fill('[data-testid="company-name-input"]', 'Updated Company');
      
      // Save changes
      await page.click('[data-testid="save-lead-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Lead updated successfully');
    });
  });

  test.describe('Bulk Operations', () => {
    test.beforeEach(async ({ page }) => {
      // Mock leads list for bulk operations
      await page.route('**/api/v1/leads/search*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              leads: [
                { id: 'lead-1', company: { name: 'Company A' }, status: 'new' },
                { id: 'lead-2', company: { name: 'Company B' }, status: 'new' },
                { id: 'lead-3', company: { name: 'Company C' }, status: 'new' }
              ],
              pagination: { total: 3, page: 1, limit: 10, totalPages: 1 }
            }
          })
        });
      });
    });

    test('should perform bulk status update', async ({ page }) => {
      // Mock bulk update API
      await page.route('**/api/v1/leads/bulk/update-status', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              successful: ['lead-1', 'lead-2'],
              failed: []
            }
          })
        });
      });

      await page.goto('/leads');
      
      // Select multiple leads
      await page.check('[data-testid="lead-checkbox-lead-1"]');
      await page.check('[data-testid="lead-checkbox-lead-2"]');
      
      // Open bulk operations menu
      await page.click('[data-testid="bulk-operations-button"]');
      await page.click('[data-testid="bulk-update-status-option"]');
      
      // Select new status
      await page.click('[data-testid="bulk-status-select"]');
      await page.click('[data-testid="bulk-status-option-contacted"]');
      
      // Confirm bulk update
      await page.click('[data-testid="confirm-bulk-update-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('2 leads updated successfully');
    });

    test('should perform bulk assignment', async ({ page }) => {
      // Mock bulk assignment API
      await page.route('**/api/v1/leads/bulk/assign', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              successful: ['lead-1', 'lead-2'],
              failed: []
            }
          })
        });
      });

      // Mock users API for assignment dropdown
      await page.route('**/api/v1/users', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { id: 'user-456', firstName: 'Jane', lastName: 'Smith', role: 'sales' }
            ]
          })
        });
      });

      await page.goto('/leads');
      
      // Select multiple leads
      await page.check('[data-testid="lead-checkbox-lead-1"]');
      await page.check('[data-testid="lead-checkbox-lead-2"]');
      
      // Open bulk operations menu
      await page.click('[data-testid="bulk-operations-button"]');
      await page.click('[data-testid="bulk-assign-option"]');
      
      // Select assignee
      await page.click('[data-testid="bulk-assignee-select"]');
      await page.click('[data-testid="bulk-assignee-option-user-456"]');
      
      // Confirm bulk assignment
      await page.click('[data-testid="confirm-bulk-assign-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('2 leads assigned successfully');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/leads');
      
      // Verify mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Verify leads list is responsive
      await expect(page.locator('[data-testid="lead-list"]')).toBeVisible();
      
      // Test lead creation on mobile
      await page.click('[data-testid="mobile-create-lead-button"]');
      await expect(page.locator('[data-testid="lead-form"]')).toBeVisible();
    });
  });
});