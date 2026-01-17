// Property test for import path resolution
const fs = require('fs');
const path = require('path');

describe('Import Path Resolution Property Tests', () => {
  // Feature: sdk-protobuf-upgrade, Property 9: Import Path Resolution
  
  test('all protobuf imports should resolve to valid files', () => {
    const sourceFiles = [
      'functions/ipfs/node.ts',
      '__tests__/functions/ipfs/node.test.js'
    ];
    
    sourceFiles.forEach(sourceFile => {
      const fullPath = path.join(__dirname, '../../', sourceFile);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Extract all protobuf import paths
        const importMatches = content.match(/require\(["']data\/protobuf\/[^"']+["']\)|from ["']data\/protobuf\/[^"']+["']/g) || [];
        
        importMatches.forEach(importStatement => {
          // Extract the path
          const pathMatch = importStatement.match(/data\/protobuf\/[^"']+/);
          if (pathMatch) {
            const importPath = pathMatch[0];
            const fullImportPath = path.join(__dirname, '../../', importPath + '.ts');
            
            // Verify the file exists
            expect(fs.existsSync(fullImportPath)).toBe(true);
          }
        });
      }
    });
  });

  test('CRDT imports should all point to crdt/ directory', () => {
    const sourceFiles = [
      'functions/ipfs/node.ts',
      '__tests__/functions/ipfs/node.test.js'
    ];
    
    sourceFiles.forEach(sourceFile => {
      const fullPath = path.join(__dirname, '../../', sourceFile);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // If file mentions Delta, it should import from crdt/
        if (content.includes('Delta')) {
          expect(content).toMatch(/data\/protobuf\/crdt\/delta/);
        }
        
        // If file mentions CRDTBroadcast, it should import from crdt/
        if (content.includes('CRDTBroadcast')) {
          expect(content).toMatch(/data\/protobuf\/crdt\/bcast/);
        }
        
        // If file mentions Head (in CRDT context), it should import from crdt/
        if (content.includes('Head') && content.includes('CRDT')) {
          expect(content).toMatch(/data\/protobuf\/crdt/);
        }
      }
    });
  });

  test('processing imports should point to processing/ directory', () => {
    const sourceFiles = [
      'functions/ipfs/node.ts',
      'functions/messages/processing.ts'
    ];
    
    sourceFiles.forEach(sourceFile => {
      const fullPath = path.join(__dirname, '../../', sourceFile);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // If file mentions SGProcessing, it should reference processing/
        if (content.includes('SGProcessing')) {
          expect(content).toMatch(/data\/protobuf\/processing\/SGProcessing/);
        }
      }
    });
  });

  test('no broken import references should exist', () => {
    const sourceFiles = [
      'functions/ipfs/node.ts',
      'functions/messages/processing.ts',
      'functions/messages/transfer.ts',
      'functions/messages/mint.ts',
      'functions/messages/escrow.ts',
      'functions/messages/block.ts'
    ];
    
    sourceFiles.forEach(sourceFile => {
      const fullPath = path.join(__dirname, '../../', sourceFile);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Should not have old delta path
        expect(content).not.toMatch(/require\(["']data\/protobuf\/delta["']\)/);
        expect(content).not.toMatch(/from ["']data\/protobuf\/delta["']/);
        
        // Should not have old bcast path
        expect(content).not.toMatch(/require\(["']data\/protobuf\/bcast["']\)/);
        expect(content).not.toMatch(/from ["']data\/protobuf\/bcast["']/);
      }
    });
  });

  test('all referenced protobuf files should exist', () => {
    const requiredFiles = [
      'data/protobuf/crdt/bcast.ts',
      'data/protobuf/crdt/delta.ts',
      'data/protobuf/crdt/heads.ts',
      'data/protobuf/processing/SGProcessing.ts',
      'data/protobuf/SGTransaction.ts',
      'data/protobuf/SGBlocks.ts'
    ];
    
    requiredFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '../../', filePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  test('protobuf directory structure should be correct', () => {
    const protobufDir = path.join(__dirname, '../../data/protobuf');
    expect(fs.existsSync(protobufDir)).toBe(true);
    
    // CRDT subdirectory should exist
    const crdtDir = path.join(protobufDir, 'crdt');
    expect(fs.existsSync(crdtDir)).toBe(true);
    expect(fs.statSync(crdtDir).isDirectory()).toBe(true);
    
    // Processing subdirectory should exist
    const processingDir = path.join(protobufDir, 'processing');
    expect(fs.existsSync(processingDir)).toBe(true);
    expect(fs.statSync(processingDir).isDirectory()).toBe(true);
  });

  test('import paths should be consistent across codebase', () => {
    const sourceFiles = [
      'functions/ipfs/node.ts',
      '__tests__/functions/ipfs/node.test.js'
    ];
    
    let deltaImportPath = null;
    let bcastImportPath = null;
    
    sourceFiles.forEach(sourceFile => {
      const fullPath = path.join(__dirname, '../../', sourceFile);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check Delta import path
        const deltaMatch = content.match(/data\/protobuf\/crdt\/delta/);
        if (deltaMatch) {
          if (deltaImportPath === null) {
            deltaImportPath = deltaMatch[0];
          } else {
            // Should be consistent
            expect(deltaMatch[0]).toBe(deltaImportPath);
          }
        }
        
        // Check bcast import path
        const bcastMatch = content.match(/data\/protobuf\/crdt\/bcast/);
        if (bcastMatch) {
          if (bcastImportPath === null) {
            bcastImportPath = bcastMatch[0];
          } else {
            // Should be consistent
            expect(bcastMatch[0]).toBe(bcastImportPath);
          }
        }
      }
    });
    
    // Verify we found the imports
    expect(deltaImportPath).toBe('data/protobuf/crdt/delta');
    expect(bcastImportPath).toBe('data/protobuf/crdt/bcast');
  });
});