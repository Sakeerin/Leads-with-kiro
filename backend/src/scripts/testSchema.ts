#!/usr/bin/env ts-node

import { validateSchema } from '../utils/validateSchema';

async function main() {
  console.log('Lead Management System - Schema Validation\n');
  
  try {
    const isValid = await validateSchema();
    
    if (isValid) {
      console.log('\n✅ Schema validation completed successfully!');
      console.log('The database models and TypeScript types are ready for use.');
      process.exit(0);
    } else {
      console.log('\n❌ Schema validation failed!');
      console.log('Please fix the issues above before proceeding.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Validation error:', error);
    process.exit(1);
  }
}

main();