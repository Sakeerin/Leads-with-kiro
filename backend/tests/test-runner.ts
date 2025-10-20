#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

interface TestSuite {
  name: string;
  pattern: string;
  timeout?: number;
  coverage?: boolean;
}

interface TestResults {
  suite: string;
  passed: boolean;
  duration: number;
  coverage?: number;
  error?: string;
}

class TestRunner {
  private results: TestResults[] = [];

  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests',
      pattern: '**/*.test.ts',
      timeout: 30000,
      coverage: true
    },
    {
      name: 'Integration Tests',
      pattern: '**/*.integration.test.ts',
      timeout: 60000,
      coverage: true
    },
    {
      name: 'Security Tests',
      pattern: '**/security.test.ts',
      timeout: 45000,
      coverage: false
    },
    {
      name: 'Performance Tests',
      pattern: '**/performance.test.ts',
      timeout: 120000,
      coverage: false
    }
  ];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive test suite...\n');

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    this.printSummary();
    this.checkThresholds();
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running ${suite.name}...`);
    const startTime = performance.now();

    try {
      const command = this.buildJestCommand(suite);
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: suite.timeout,
        stdio: 'pipe'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Parse coverage from output if available
      let coverage: number | undefined;
      if (suite.coverage) {
        coverage = this.parseCoverage(output);
      }

      this.results.push({
        suite: suite.name,
        passed: true,
        duration,
        coverage
      });

      console.log(`✅ ${suite.name} passed (${Math.round(duration)}ms)`);
      if (coverage !== undefined) {
        console.log(`📊 Coverage: ${coverage}%`);
      }

    } catch (error: any) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.results.push({
        suite: suite.name,
        passed: false,
        duration,
        error: error.message
      });

      console.log(`❌ ${suite.name} failed (${Math.round(duration)}ms)`);
      console.log(`Error: ${error.message}`);
    }

    console.log('');
  }

  private buildJestCommand(suite: TestSuite): string {
    let command = 'npx jest';
    
    // Add test pattern
    command += ` --testPathPattern="${suite.pattern}"`;
    
    // Add coverage if requested
    if (suite.coverage) {
      command += ' --coverage --coverageReporters=text-summary';
    }
    
    // Add other options
    command += ' --verbose --passWithNoTests --detectOpenHandles --forceExit';
    
    return command;
  }

  private parseCoverage(output: string): number {
    // Parse coverage percentage from Jest output
    const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  }

  private printSummary(): void {
    console.log('📊 Test Summary');
    console.log('================');

    const totalSuites = this.results.length;
    const passedSuites = this.results.filter(r => r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Suites: ${totalSuites}`);
    console.log(`Passed: ${passedSuites}`);
    console.log(`Failed: ${totalSuites - passedSuites}`);
    console.log(`Total Duration: ${Math.round(totalDuration)}ms`);

    // Print individual results
    console.log('\nDetailed Results:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = Math.round(result.duration);
      const coverage = result.coverage ? ` (${result.coverage}% coverage)` : '';
      
      console.log(`${status} ${result.suite}: ${duration}ms${coverage}`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('');
  }

  private checkThresholds(): void {
    console.log('🎯 Checking Quality Thresholds');
    console.log('===============================');

    let allThresholdsMet = true;

    // Check coverage thresholds
    const coverageResults = this.results.filter(r => r.coverage !== undefined);
    if (coverageResults.length > 0) {
      const avgCoverage = coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length;
      const coverageThreshold = 80;
      
      if (avgCoverage >= coverageThreshold) {
        console.log(`✅ Coverage threshold met: ${avgCoverage.toFixed(1)}% >= ${coverageThreshold}%`);
      } else {
        console.log(`❌ Coverage threshold not met: ${avgCoverage.toFixed(1)}% < ${coverageThreshold}%`);
        allThresholdsMet = false;
      }
    }

    // Check performance thresholds
    const performanceResult = this.results.find(r => r.suite === 'Performance Tests');
    if (performanceResult) {
      const performanceThreshold = 120000; // 2 minutes
      
      if (performanceResult.duration <= performanceThreshold) {
        console.log(`✅ Performance threshold met: ${Math.round(performanceResult.duration)}ms <= ${performanceThreshold}ms`);
      } else {
        console.log(`❌ Performance threshold not met: ${Math.round(performanceResult.duration)}ms > ${performanceThreshold}ms`);
        allThresholdsMet = false;
      }
    }

    // Check if all tests passed
    const allTestsPassed = this.results.every(r => r.passed);
    if (!allTestsPassed) {
      console.log('❌ Not all test suites passed');
      allThresholdsMet = false;
    }

    console.log('');

    if (allThresholdsMet) {
      console.log('🎉 All quality thresholds met! Ready for deployment.');
      process.exit(0);
    } else {
      console.log('⚠️  Some quality thresholds not met. Please review and fix issues.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { TestRunner };