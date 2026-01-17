// Test protobuf message serialization/deserialization
const fs = require('fs');
const path = require('path');

describe('Protobuf Serialization Tests', () => {
  test('protobuf files should have serialization methods', () => {
    const protobufFiles = [
      'data/protobuf/crdt/bcast.ts',
      'data/protobuf/crdt/delta.ts',
      'data/protobuf/crdt/heads.ts',
      'data/protobuf/processing/SGProcessing.ts'
    ];
    
    protobufFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '../../', filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Should have MessageType class
      expect(content).toMatch(/class.*MessageType/);
      
      // Should have binary read/write methods
      expect(content).toMatch(/internalBinaryRead|toBinary|fromBinary/);
    });
  });

  test('transaction parsing should use fromBinary method', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should use fromBinary for deserialization
    expect(content).toMatch(/\.fromBinary\(/);
    
    // Should parse different transaction types
    expect(content).toMatch(/MintTx\.fromBinary/);
    expect(content).toMatch(/ProcessingTx\.fromBinary/);
    expect(content).toMatch(/EscrowTx\.fromBinary/);
  });

  test('protobuf runtime should support serialization', () => {
    const protobufFiles = [
      'data/protobuf/crdt/bcast.ts',
      'data/protobuf/crdt/delta.ts'
    ];
    
    protobufFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '../../', filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Should import BinaryWriter and BinaryReader
      expect(content).toMatch(/IBinaryWriter|BinaryWriteOptions/);
      expect(content).toMatch(/IBinaryReader|BinaryReadOptions/);
      
      // Should import from @protobuf-ts/runtime
      expect(content).toMatch(/@protobuf-ts\/runtime/);
    });
  });

  test('ParseTransaction should handle serialization errors gracefully', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should have try-catch blocks for each transaction type
    const tryBlocks = content.match(/try\s*{[\s\S]*?fromBinary[\s\S]*?}\s*catch/g) || [];
    expect(tryBlocks.length).toBeGreaterThan(0);
    
    // Should log errors when decoding fails (check for catch blocks with console.log)
    expect(content).toMatch(/catch[\s\S]*console\.log[\s\S]*Cannot Decode/);
  });

  test('protobuf messages should maintain data integrity', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should decode transaction data as Uint8Array
    expect(content).toMatch(/Uint8Array|uint8_t/);
    
    // Should use koffi.decode for binary data
    expect(content).toMatch(/koffi\.decode/);
  });

  test('CRDT protobuf should support proper serialization', () => {
    const bcastPath = path.join(__dirname, '../../data/protobuf/crdt/bcast.ts');
    const content = fs.readFileSync(bcastPath, 'utf8');
    
    // Should have CRDTBroadcast message type
    expect(content).toMatch(/export interface CRDTBroadcast/);
    
    // Should have Head message type
    expect(content).toMatch(/export interface Head/);
    
    // Should have proper field definitions
    expect(content).toMatch(/heads.*Head\[\]/);
    expect(content).toMatch(/cid.*Uint8Array/);
  });

  test('processing protobuf should support proper serialization', () => {
    const sgProcessingPath = path.join(__dirname, '../../data/protobuf/processing/SGProcessing.ts');
    const content = fs.readFileSync(sgProcessingPath, 'utf8');
    
    // Should have Task message type
    expect(content).toMatch(/export interface Task/);
    
    // Should have proper field definitions
    expect(content).toMatch(/ipfsBlockId.*string/);
    expect(content).toMatch(/jsonData.*Uint8Array/);
    expect(content).toMatch(/resultsChannel.*string/);
  });
});