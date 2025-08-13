#!/usr/bin/env node

/**
 * Test Runner for GNUS Dashboard
 * 
 * Provides comprehensive test execution with reporting, parallel execution,
 * and intelligent test selection based on changed files.
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class TestRunner {
  constructor() {
    this.config = {
      jest: {
        unit: ['__tests__/functions', '__tests__/hooks', '__tests__/context', '__tests__/basic.test.js'],
        integration: ['__tests__/components', '__tests__/pages', '__tests__/integration'],
        e2e: ['__tests__/e2e']
      }
    };
    
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0
    };
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const options = {
      type: 'all',
      watch: false,
      coverage: false,
      parallel: false,
      changed: false,
      verbose: false,
      bail: false,
      pattern: null,
      maxWorkers: 4
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--type':
        case '-t':
          const validTypes = ['all', 'unit', 'integration', 'e2e'];
          const type = args[++i];
          if (validTypes.includes(type)) {
            options.type = type;
          } else {
            console.error(`Invalid test type: ${type}. Valid types: ${validTypes.join(', ')}`);
            process.exit(1);
          }
          break;
        case '--watch':
        case '-w':
          options.watch = true;
          break;
        case '--coverage':
        case '-c':
          options.coverage = true;
          break;
        case '--parallel':
        case '-p':
          options.parallel = true;
          break;
        case '--changed':
          options.changed = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--bail':
        case '-b':
          options.bail = true;
          break;
        case '--pattern':
          options.pattern = args[++i];
          break;
        case '--max-workers':
          options.maxWorkers = parseInt(args[++i]) || 4;
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
      }
    }

    return options;
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(chalk.blue.bold('\n🧪 GNUS Dashboard Test Runner\n'));
    console.log('Usage: node scripts/test-runner.js [options]\n');
    console.log('Options:');
    console.log('  -t, --type <type>      Test type: all, unit, integration, e2e');
    console.log('  -w, --watch            Run tests in watch mode');
    console.log('  -c, --coverage         Generate coverage report');
    console.log('  -p, --parallel         Run tests in parallel');
    console.log('  --changed              Run tests for changed files only');
    console.log('  -v, --verbose          Verbose output');
    console.log('  -b, --bail             Stop on first test failure');
    console.log('  --pattern <pattern>    Run tests matching pattern');
    console.log('  --max-workers <num>    Maximum number of worker processes');
    console.log('  -h, --help             Show this help message\n');
    console.log('Examples:');
    console.log('  node scripts/test-runner.js --type unit --coverage');
    console.log('  node scripts/test-runner.js --type e2e --parallel');
    console.log('  node scripts/test-runner.js --changed --watch');
  }

  /**
   * Get changed files using git
   */
  async getChangedFiles() {
    return new Promise((resolve, reject) => {
      exec('git diff --name-only HEAD~1', (error, stdout, stderr) => {
        if (error) {
          console.warn(chalk.yellow('Warning: Could not get changed files, running all tests'));
          resolve([]);
          return;
        }
        
        const files = stdout.trim().split('\n').filter(file => 
          file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')
        );
        
        resolve(files);
      });
    });
  }

  /**
   * Build Jest command
   */
  buildJestCommand(type, options) {
    const baseCmd = 'npx jest';
    const args = [];

    // Add test paths
    if (type !== 'all' && this.config.jest[type]) {
      args.push(...this.config.jest[type]);
    }

    // Add options
    if (options.watch) args.push('--watch');
    if (options.coverage) args.push('--coverage');
    if (options.verbose) args.push('--verbose');
    if (options.bail) args.push('--bail');
    if (options.parallel) args.push(`--maxWorkers=${options.maxWorkers}`);
    if (options.pattern) args.push(`--testNamePattern="${options.pattern}"`);
    
    args.push('--passWithNoTests');

    return `${baseCmd} ${args.join(' ')}`;
  }



  /**
   * Execute command and capture results
   */
  async executeCommand(command, label) {
    console.log(chalk.blue(`\n🚀 Running ${label}...`));
    console.log(chalk.gray(`Command: ${command}\n`));

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const child = spawn(command, { shell: true, stdio: 'inherit' });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          console.log(chalk.green(`\n✅ ${label} passed (${duration}ms)`));
          this.results.passed++;
        } else {
          console.log(chalk.red(`\n❌ ${label} failed (${duration}ms)`));
          this.results.failed++;
        }
        
        this.results.total++;
        this.results.duration += duration;
        
        resolve(code === 0);
      });

      child.on('error', (error) => {
        console.error(chalk.red(`Error running ${label}:`, error));
        reject(error);
      });
    });
  }

  /**
   * Run specific test type
   */
  async runTestType(type, options) {
    const testTypes = {
      unit: () => this.executeCommand(this.buildJestCommand('unit', options), 'Unit Tests'),
      integration: () => this.executeCommand(this.buildJestCommand('integration', options), 'Integration Tests'),
      e2e: () => this.executeCommand(this.buildJestCommand('e2e', options), 'E2E Tests')
    };

    if (testTypes[type]) {
      return await testTypes[type]();
    } else {
      console.error(chalk.red(`Unknown test type: ${type}`));
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(options) {
    const testOrder = ['unit', 'integration', 'e2e'];

    for (const type of testOrder) {
      const success = await this.runTestType(type, options);

      if (!success && options.bail) {
        console.log(chalk.red('\n🛑 Stopping due to test failure (--bail option)'));
        break;
      }
    }
  }

  /**
   * Print final results
   */
  printResults() {
    console.log(chalk.blue.bold('\n📊 Test Results Summary'));
    console.log('═'.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(chalk.green(`Passed: ${this.results.passed}`));
    console.log(chalk.red(`Failed: ${this.results.failed}`));
    console.log(`Duration: ${(this.results.duration / 1000).toFixed(2)}s`);
    
    if (this.results.failed === 0) {
      console.log(chalk.green.bold('\n🎉 All tests passed!'));
    } else {
      console.log(chalk.red.bold(`\n💥 ${this.results.failed} test suite(s) failed`));
    }
  }

  /**
   * Main execution method
   */
  async run() {
    const options = this.parseArgs();
    
    console.log(chalk.blue.bold('🧪 GNUS Dashboard Test Runner'));
    console.log(chalk.gray(`Running ${options.type} tests with options:`, JSON.stringify(options, null, 2)));

    try {
      if (options.changed) {
        const changedFiles = await this.getChangedFiles();
        console.log(chalk.yellow(`Found ${changedFiles.length} changed files`));
        
        if (changedFiles.length === 0) {
          console.log(chalk.green('No changes detected, skipping tests'));
          return;
        }
      }

      const startTime = Date.now();

      if (options.type === 'all') {
        await this.runAllTests(options);
      } else {
        await this.runTestType(options.type, options);
      }

      this.printResults();
      
      // Exit with appropriate code
      process.exit(this.results.failed > 0 ? 1 : 0);
      
    } catch (error) {
      console.error(chalk.red('Test runner error:', error));
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner;
