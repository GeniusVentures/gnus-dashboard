// Property test for CRDT import path correctness
const fs = require('fs');
const path = require('path');

describe('CRDT Import Path Correctness Property Tests', () => {
  // Feature: sdk-protobuf-upgrade, Property 3: CRDT Import Path Correctness
  test('all CRDT functionality should import from data/protobuf/crdt/ directory', () => {
    const sourceFiles = [
      'functions/ipfs/node.ts',
      '__tests__/functions/ipfs/node.test.js'
    ];
    
    sourceFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '../../', filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check that any Delta imports come from the CRDT directory
        if (content.includes('Delta')) {
          expect(content).toMatch(/data\/protobuf\/crdt\/delta/);
          expect(content).not.toMatch(/data\/protobuf\/delta[^/]/); // Should not use old path
        }
        
        // Check that any CRDTBroadcast imports come from the CRDT directory
        if (content.includes('CRDTBroadcast')) {
          expect(content).toMatch(/data\/protobuf\/crdt\/bcast/);
        }
        
        // Check that any Head imports come from the CRDT directory
        if (content.includes('Head')) {
          expect(content).toMatch(/data\/protobuf\/crdt/);
        }
      }
    });
  });

  test('CRDT protobuf files should be accessible from their new locations', () => {
    const crdtFiles = [
      'data/protobuf/crdt/bcast.ts',
      'data/protobuf/crdt/delta.ts', 
      'data/protobuf/crdt/heads.ts'
    ];
    
    crdtFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '../../', filePath);
      expect(fs.existsSync(fullPath)).toBe(true);
      
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Verify each file exports the expected interfaces
      expect(content).toMatch(/export interface/);
      expect(content).toMatch(/@protobuf-ts\/runtime/);
    });
  });

  test('old protobuf paths should not be used in active code', () => {
    const sourceFiles = [
      'functions/ipfs/node.ts'
    ];
    
    sourceFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '../../', filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Should not use old delta path
        expect(content).not.toMatch(/require\(["']data\/protobuf\/delta["']\)/);
        expect(content).not.toMatch(/from ["']data\/protobuf\/delta["']/);
        
        // Should not use old bcast path (if it existed)
        expect(content).not.toMatch(/require\(["']data\/protobuf\/bcast["']\)/);
        expect(content).not.toMatch(/from ["']data\/protobuf\/bcast["']/);
      }
    });
  });

  test('CRDT interfaces should be properly exported from new files', () => {
    // Test Delta interface from crdt/delta.ts
    const deltaPath = path.join(__dirname, '../../data/protobuf/crdt/delta.ts');
    const deltaContent = fs.readFileSync(deltaPath, 'utf8');
    
    // Should export Delta interface
    expect(deltaContent).toMatch(/export interface.*Delta/);
    
    // Test CRDTBroadcast interface from crdt/bcast.ts
    const bcastPath = path.join(__dirname, '../../data/protobuf/crdt/bcast.ts');
    const bcastContent = fs.readFileSync(bcastPath, 'utf8');
    
    // Should export CRDTBroadcast and Head interfaces
    expect(bcastContent).toMatch(/export interface.*CRDTBroadcast/);
    expect(bcastContent).toMatch(/export interface.*Head/);
    
    // Test heads.ts exists and exports properly
    const headsPath = path.join(__dirname, '../../data/protobuf/crdt/heads.ts');
    const headsContent = fs.readFileSync(headsPath, 'utf8');
    
    expect(headsContent).toMatch(/export interface/);
  });
});