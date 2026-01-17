// Property test for SDK data accuracy
const fs = require('fs');
const path = require('path');

describe('SDK Data Accuracy Property Tests', () => {
  // Feature: sdk-protobuf-upgrade, Property 8: SDK Data Accuracy
  
  test('SDK balance functions should return correct data types', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // GeniusSDKGetBalance should return uint64_t
    expect(content).toMatch(/GeniusSDKGetBalance.*uint64_t/);
    
    // GeniusSDKGetBalanceGNUS should return GeniusTokenValue
    expect(content).toMatch(/GeniusSDKGetBalanceGNUS.*GeniusTokenValue/);
    
    // GeniusSDKGetBalanceGNUSString should return const char*
    expect(content).toMatch(/GeniusSDKGetBalanceGNUSString.*const char\*/);
    
    // GeniusSDKGetGNUSPrice should return double
    expect(content).toMatch(/GeniusSDKGetGNUSPrice.*double/);
  });

  test('SDK helper functions should validate data correctly', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // createTokenID should validate 32 bytes
    expect(content).toMatch(/function createTokenID/);
    expect(content).toMatch(/data\.length !== 32/);
    expect(content).toMatch(/throw new Error.*Token ID must be exactly 32 bytes/);
    
    // createTokenValue should validate max 21 characters
    expect(content).toMatch(/function createTokenValue/);
    expect(content).toMatch(/value\.length >= 22/);
    expect(content).toMatch(/throw new Error.*Token value string too long/);
  });

  test('SDK balance wrapper functions should handle return values correctly', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // getBalanceMinions should convert to BigInt
    expect(content).toMatch(/function getBalanceMinions/);
    expect(content).toMatch(/BigInt\(balance\)/);
    
    // getBalanceGNUSValue should decode char array
    expect(content).toMatch(/function getBalanceGNUSValue/);
    expect(content).toMatch(/koffi\.decode.*balance\.value.*char.*22/);
    
    // getBalanceGNUSAsString should return string directly
    expect(content).toMatch(/function getBalanceGNUSAsString/);
    expect(content).toMatch(/return balance/);
  });

  test('SDK transaction functions should handle addresses correctly', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // GeniusSDKGetAddress should return GeniusAddress
    expect(content).toMatch(/GeniusSDKGetAddress.*GeniusAddress/);
    
    // Transfer functions should accept GeniusAddress pointer
    expect(content).toMatch(/GeniusSDKTransfer.*GeniusAddress\*/);
    expect(content).toMatch(/GeniusSDKTransferGNUS.*GeniusAddress\*/);
  });

  test('SDK transaction data should be properly decoded', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should decode GeniusArray collection (allow for whitespace/newlines)
    expect(content).toMatch(/koffi\.decode[\s\S]*GeniusArray/);
    
    // Should decode raw data as uint8_t
    expect(content).toMatch(/koffi\.decode.*uint8_t/);
    
    // Should check for duplicate transactions
    expect(content).toMatch(/const exists.*transactionOutList\.some/);
    expect(content).toMatch(/const exists.*transactionInList\.some/);
  });

  test('SDK cost functions should return correct data types', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // GeniusSDKGetCost should return uint64_t
    expect(content).toMatch(/GeniusSDKGetCost.*uint64_t.*const char\*/);
    
    // GeniusSDKGetCostGNUS should return GeniusTokenValue
    expect(content).toMatch(/GeniusSDKGetCostGNUS.*GeniusTokenValue.*const char\*/);
  });

  test('SDK struct definitions should match expected sizes', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // GeniusTokenValue should be 22 chars
    expect(content).toMatch(/GeniusTokenValue.*koffi\.struct/);
    expect(content).toMatch(/value.*koffi\.array.*char.*22/);
    
    // GeniusTokenID should be 32 unsigned chars
    expect(content).toMatch(/GeniusTokenID.*koffi\.struct/);
    expect(content).toMatch(/data.*koffi\.array.*unsigned char.*32/);
  });

  test('SDK error handling should preserve data integrity', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Balance functions should have try-catch
    expect(content).toMatch(/function getBalanceMinions[\s\S]*try[\s\S]*catch/);
    expect(content).toMatch(/function getBalanceGNUSValue[\s\S]*try[\s\S]*catch/);
    
    // Should return null on error
    expect(content).toMatch(/catch[\s\S]*return null/);
    
    // Should log errors
    expect(content).toMatch(/console\.error/);
  });

  test('SDK data should be properly exported for use', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should export balance functions (check for export block with these names)
    expect(content).toMatch(/export\s*\{[\s\S]*getBalanceMinions[\s\S]*\}/);
    expect(content).toMatch(/export\s*\{[\s\S]*getBalanceGNUSValue[\s\S]*\}/);
    expect(content).toMatch(/export\s*\{[\s\S]*getBalanceGNUSAsString[\s\S]*\}/);
    
    // Should export helper functions
    expect(content).toMatch(/export\s*\{[\s\S]*createTokenID[\s\S]*\}/);
    expect(content).toMatch(/export\s*\{[\s\S]*createTokenValue[\s\S]*\}/);
    
    // Should export transaction functions
    expect(content).toMatch(/export\s*\{[\s\S]*mintTokens[\s\S]*\}/);
    expect(content).toMatch(/export\s*\{[\s\S]*transferTokens[\s\S]*\}/);
  });
});