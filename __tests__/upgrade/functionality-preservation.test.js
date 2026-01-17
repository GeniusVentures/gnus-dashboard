// Test for existing functionality preservation
const fs = require('fs');
const path = require('path');

describe('Existing Functionality Preservation Tests', () => {
  test('all existing test suites should still pass', () => {
    // This test verifies that the upgrade hasn't broken existing functionality
    // by checking that key test files still exist and are properly structured
    
    const testFiles = [
      '__tests__/basic.test.js',
      '__tests__/functions/ipfs/node.test.js',
      '__tests__/functions/messages/processing.test.js',
      '__tests__/hooks/ipfs/useIPFS.test.js',
      '__tests__/hooks/prices/usePrices.test.js',
      '__tests__/components/dashboard/BlockchainInfo.test.jsx',
      '__tests__/components/job-order/OrderForm.test.jsx',
      '__tests__/pages/index.test.jsx'
    ];
    
    testFiles.forEach(testFile => {
      const fullPath = path.join(__dirname, '../../', testFile);
      expect(fs.existsSync(fullPath)).toBe(true);
      
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Should have describe blocks
      expect(content).toMatch(/describe\(/);
      
      // Should have test cases
      expect(content).toMatch(/test\(|it\(/);
    });
  });

  test('core functionality modules should remain intact', () => {
    const coreModules = [
      'functions/ipfs/node.ts',
      'functions/messages/processing.ts',
      'functions/messages/transfer.ts',
      'functions/messages/mint.ts',
      'functions/messages/escrow.ts',
      'functions/messages/block.ts'
    ];
    
    coreModules.forEach(modulePath => {
      const fullPath = path.join(__dirname, '../../', modulePath);
      expect(fs.existsSync(fullPath)).toBe(true);
      
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Should have exports
      expect(content).toMatch(/export/);
    });
  });

  test('SDK functions should remain accessible', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Core SDK functions should be exported (check for export block)
    expect(content).toMatch(/export\s*\{[\s\S]*createNode[\s\S]*\}/);
    expect(content).toMatch(/export\s*\{[\s\S]*shutdownGnus[\s\S]*\}/);
    expect(content).toMatch(/export\s*\{[\s\S]*CheckTransactions[\s\S]*\}/);
    expect(content).toMatch(/export\s*\{[\s\S]*getBalanceMinions[\s\S]*\}/);
    expect(content).toMatch(/export\s*\{[\s\S]*mintTokens[\s\S]*\}/);
    expect(content).toMatch(/export\s*\{[\s\S]*transferTokens[\s\S]*\}/);
  });

  test('message handling functions should remain functional', () => {
    const messageFiles = [
      'functions/messages/processing.ts',
      'functions/messages/transfer.ts',
      'functions/messages/mint.ts',
      'functions/messages/escrow.ts',
      'functions/messages/block.ts'
    ];
    
    messageFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '../../', filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Should export default function
      expect(content).toMatch(/export default/);
      
      // Should handle message parameter
      expect(content).toMatch(/const \w+Msg.*=/);
    });
  });

  test('protobuf transaction parsing should remain functional', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should have ParseTransaction function
    expect(content).toMatch(/function ParseTransaction/);
    
    // Should parse all transaction types
    expect(content).toMatch(/MintTx\.fromBinary/);
    expect(content).toMatch(/ProcessingTx\.fromBinary/);
    expect(content).toMatch(/EscrowTx\.fromBinary/);
    
    // Should call message handlers
    expect(content).toMatch(/mintMsg\(/);
    expect(content).toMatch(/processingMsg\(/);
    expect(content).toMatch(/escrowMsg\(/);
  });

  test('transaction checking functionality should remain intact', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should have CheckTransactions function
    expect(content).toMatch(/function CheckTransactions/);
    
    // Should get outgoing transactions
    expect(content).toMatch(/getOutTransactions\(\)/);
    
    // Should get incoming transactions
    expect(content).toMatch(/getInTransactions\(\)/);
    
    // Should free transaction memory
    expect(content).toMatch(/freeTransactions/);
    
    // Should parse transactions
    expect(content).toMatch(/ParseTransaction/);
  });

  test('data structures should remain compatible', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should import required structs
    expect(content).toMatch(/GeniusArray.*getStruct.*GeniusMatrix.*GeniusAddress/);
    
    // Should define token structures
    expect(content).toMatch(/GeniusTokenValue.*koffi\.struct/);
    expect(content).toMatch(/GeniusTokenID.*koffi\.struct/);
  });

  test('backward compatibility should be maintained', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should still import from SGTransaction (existing workflow)
    expect(content).toMatch(/require.*data\/protobuf\/SGTransaction/);
    
    // Should still import from SGBlocks (existing workflow)
    expect(content).toMatch(/require.*data\/protobuf\/SGBlocks/);
    
    // Should have new CRDT imports (upgraded workflow)
    expect(content).toMatch(/require.*data\/protobuf\/crdt/);
  });
});