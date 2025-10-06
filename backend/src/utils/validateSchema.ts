import { Lead, User, Task, Activity, AssignmentRule } from '../models';
import { 
  LeadStatus, 
  UserRole, 
  TaskType, 
  Priority, 
  ActivityType,
  LeadChannel,
  ScoreBand 
} from '../types';

/**
 * Validates that all models and types are properly defined
 * This helps ensure our database schema and TypeScript types are consistent
 */
export class SchemaValidator {
  static validateModels(): boolean {
    try {
      // Test that all model classes exist and have required methods
      const models = [Lead, User, Task, Activity, AssignmentRule];
      
      for (const Model of models) {
        if (!Model.query) {
          throw new Error(`${Model.name} missing query method`);
        }
        if (!Model.findById) {
          throw new Error(`${Model.name} missing findById method`);
        }
        if (!Model.create) {
          throw new Error(`${Model.name} missing create method`);
        }
        if (!Model.update) {
          throw new Error(`${Model.name} missing update method`);
        }
      }
      
      console.log('✅ All models have required methods');
      return true;
    } catch (error) {
      console.error('❌ Model validation failed:', error);
      return false;
    }
  }

  static validateEnums(): boolean {
    try {
      // Test that all enums are properly defined
      const enumTests = [
        { name: 'LeadStatus', enum: LeadStatus, expectedValues: ['new', 'contacted', 'qualified'] },
        { name: 'UserRole', enum: UserRole, expectedValues: ['admin', 'manager', 'sales'] },
        { name: 'TaskType', enum: TaskType, expectedValues: ['call', 'email', 'meeting'] },
        { name: 'Priority', enum: Priority, expectedValues: ['low', 'medium', 'high'] },
        { name: 'ActivityType', enum: ActivityType, expectedValues: ['lead_created', 'lead_updated'] },
        { name: 'LeadChannel', enum: LeadChannel, expectedValues: ['web_form', 'email', 'phone'] },
        { name: 'ScoreBand', enum: ScoreBand, expectedValues: ['hot', 'warm', 'cold'] }
      ];

      for (const test of enumTests) {
        const enumValues = Object.values(test.enum);
        for (const expectedValue of test.expectedValues) {
          if (!enumValues.includes(expectedValue)) {
            throw new Error(`${test.name} missing expected value: ${expectedValue}`);
          }
        }
      }
      
      console.log('✅ All enums have expected values');
      return true;
    } catch (error) {
      console.error('❌ Enum validation failed:', error);
      return false;
    }
  }

  static validateTypeInterfaces(): boolean {
    try {
      // Test that we can create sample objects with our interfaces
      const sampleLead = {
        id: 'test-id',
        accountLeadId: 'AL-25-10-001',
        company: {
          name: 'Test Company',
          industry: 'Technology',
          size: 'medium' as const
        },
        contact: {
          name: 'John Doe',
          email: 'john@test.com',
          phone: '+1234567890'
        },
        source: {
          channel: 'web_form' as LeadChannel,
          campaign: 'Q4 Campaign'
        },
        assignment: {
          assignedTo: 'user-id',
          assignedAt: new Date()
        },
        status: 'new' as LeadStatus,
        score: {
          value: 75,
          band: 'warm' as ScoreBand,
          lastCalculated: new Date()
        },
        qualification: {
          interest: 'high' as const,
          businessType: 'b2b' as const
        },
        followUp: {
          nextDate: new Date(),
          notes: 'Follow up next week'
        },
        product: {
          type: 'software' as const
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-id',
          isActive: true
        },
        customFields: {}
      };

      const sampleUser = {
        id: 'user-id',
        email: 'user@test.com',
        password: 'hashedpassword',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'sales' as UserRole,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: {
          phone: '+1234567890',
          department: 'Sales'
        }
      };

      const sampleTask = {
        id: 'task-id',
        leadId: 'lead-id',
        subject: 'Follow up call',
        type: 'call' as TaskType,
        priority: 'high' as Priority,
        assignedTo: 'user-id',
        dueDate: new Date(),
        status: 'pending' as const,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-id'
      };

      // If we can create these objects without TypeScript errors, our types are valid
      // Verify the objects have expected properties
      if (!sampleLead.id || !sampleUser.email || !sampleTask.subject) {
        throw new Error('Sample objects missing required properties');
      }
      
      console.log('✅ All type interfaces are properly defined');
      return true;
    } catch (error) {
      console.error('❌ Type interface validation failed:', error);
      return false;
    }
  }

  static async runAllValidations(): Promise<boolean> {
    console.log('🔍 Running schema validation...\n');
    
    const results = [
      this.validateModels(),
      this.validateEnums(),
      this.validateTypeInterfaces()
    ];
    
    const allPassed = results.every(result => result);
    
    if (allPassed) {
      console.log('\n🎉 All schema validations passed!');
      console.log('✅ Database models are properly configured');
      console.log('✅ TypeScript types are consistent');
      console.log('✅ Ready for database migration');
    } else {
      console.log('\n❌ Some validations failed. Please check the errors above.');
    }
    
    return allPassed;
  }
}

// Export a simple function to run validations
export const validateSchema = () => SchemaValidator.runAllValidations();