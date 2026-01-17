// Property test for SDK function signature compliance
const fs = require('fs');
const path = require('path');

describe('SDK Function Signature Compliance Property Tests', () => {
  // Feature: sdk-protobuf-upgrade, Property 4: SDK Function Signature Compliance
  
  const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
  const nodeContent = fs.readFileSync(nodePath, 'utf8');

  test('SDK initialization functions should have correct signatures', () => {
    // Verify GeniusSDKInit signature
    expect(nodeContent).toMatch(
      /GeniusSDKInit.*const char\*.*const char\*.*bool.*bool.*uint16_t.*bool/
    );
    
    // Verify GeniusSDKInitSecure signature
    expect(nodeContent).toMatch(
      /GeniusSDKInitSecure.*const char\*.*const char\*.*const char\*.*bool.*bool.*uint16_t.*bool/
    );
    
    // Verify GeniusSDKInitMinimal signature
    expect(nodeContent).toMatch(
      /GeniusSDKInitMinimal.*const char\*.*const char\*.*uint16_t/
    );
    
    // Verify GeniusSDKShutdown signature
    expect(nodeContent).toMatch(/GeniusSDKShutdown.*void/);
  });

  test('SDK balance functions should have correct return types', () => {
    // Verify GeniusSDKGetBalance returns uint64_t
    expect(nodeContent).toMatch(/GeniusSDKGetBalance.*uint64_t.*GeniusTokenID/);
    
    // Verify GeniusSDKGetBalanceGNUS returns GeniusTokenValue
    expect(nodeContent).toMatch(/GeniusSDKGetBalanceGNUS.*GeniusTokenValue/);
    
    // Verify GeniusSDKGetBalanceGNUSString returns const char*
    expect(nodeContent).toMatch(/GeniusSDKGetBalanceGNUSString.*const char\*/);
    
    // Verify GeniusSDKGetGNUSPrice returns double
    expect(nodeContent).toMatch(/GeniusSDKGetGNUSPrice.*double/);
  });

  test('SDK transaction functions should have correct parameter types', () => {
    // Verify GeniusSDKTransfer signature
    expect(nodeContent).toMatch(/GeniusSDKTransfer/);
    expect(nodeContent).toMatch(/bool.*GeniusSDKTransfer|GeniusSDKTransfer.*bool/);
    expect(nodeContent).toMatch(/uint64_t/);
    expect(nodeContent).toMatch(/GeniusAddress\*/);
    expect(nodeContent).toMatch(/GeniusTokenID/);
    
    // Verify GeniusSDKTransferGNUS signature
    expect(nodeContent).toMatch(/GeniusSDKTransferGNUS/);
    expect(nodeContent).toMatch(/bool.*GeniusSDKTransferGNUS|GeniusSDKTransferGNUS.*bool/);
    expect(nodeContent).toMatch(/GeniusTokenValue\*/);
    
    // Verify GeniusSDKGetInTransactions returns GeniusMatrix
    expect(nodeContent).toMatch(/GeniusSDKGetInTransactions.*GeniusMatrix/);
    
    // Verify GeniusSDKGetOutTransactions returns GeniusMatrix
    expect(nodeContent).toMatch(/GeniusSDKGetOutTransactions.*GeniusMatrix/);
  });

  test('SDK mint functions should have correct parameter types', () => {
    // Verify GeniusSDKMint signature
    expect(nodeContent).toMatch(/GeniusSDKMint/);
    expect(nodeContent).toMatch(/void.*GeniusSDKMint|GeniusSDKMint.*void/);
    expect(nodeContent).toMatch(/uint64_t/);
    expect(nodeContent).toMatch(/const char\*/);
    expect(nodeContent).toMatch(/GeniusTokenID/);
    
    // Verify GeniusSDKMintGNUS signature
    expect(nodeContent).toMatch(/GeniusSDKMintGNUS/);
    expect(nodeContent).toMatch(/void.*GeniusSDKMintGNUS|GeniusSDKMintGNUS.*void/);
    expect(nodeContent).toMatch(/GeniusTokenValue\*/);
  });

  test('SDK helper functions should create correct parameter types', () => {
    // Verify createTokenID function exists and creates proper structure
    expect(nodeContent).toMatch(/function createTokenID/);
    expect(nodeContent).toMatch(/data\.length !== 32/); // Validates 32 bytes
    
    // Verify createTokenValue function exists and creates proper structure
    expect(nodeContent).toMatch(/function createTokenValue/);
    expect(nodeContent).toMatch(/value\.length >= 22/); // Validates max 21 chars
  });

  test('SDK address and cost functions should have correct signatures', () => {
    // Verify GeniusSDKGetAddress returns GeniusAddress
    expect(nodeContent).toMatch(/GeniusSDKGetAddress.*GeniusAddress/);
    
    // Verify GeniusSDKGetCost signature
    expect(nodeContent).toMatch(/GeniusSDKGetCost.*uint64_t.*const char\*/);
    
    // Verify GeniusSDKGetCostGNUS signature
    expect(nodeContent).toMatch(/GeniusSDKGetCostGNUS.*GeniusTokenValue.*const char\*/);
    
    // Verify GeniusSDKProcess signature
    expect(nodeContent).toMatch(/GeniusSDKProcess.*void.*const char\*/);
  });

  test('SDK struct types should be properly defined', () => {
    // Verify GeniusTokenValue struct
    expect(nodeContent).toMatch(/GeniusTokenValue.*koffi\.struct/);
    expect(nodeContent).toMatch(/value.*koffi\.array.*char.*22/);
    
    // Verify GeniusTokenID struct
    expect(nodeContent).toMatch(/GeniusTokenID.*koffi\.struct/);
    expect(nodeContent).toMatch(/data.*koffi\.array.*unsigned char.*32/);
  });

  test('SDK initialization should use correct parameter order', () => {
    // Verify GeniusSDKInit is called with correct parameters
    const initCallMatch = nodeContent.match(/GeniusSDKInit\s*\([^)]+\)/);
    expect(initCallMatch).toBeTruthy();
    
    // Should have basePath, ethPrivateKey, autodht, process, baseport, is_full_node
    if (initCallMatch) {
      const initCall = initCallMatch[0];
      // Check that it has 6 parameters
      const paramCount = (initCall.match(/,/g) || []).length + 1;
      expect(paramCount).toBe(6);
    }
  });
});