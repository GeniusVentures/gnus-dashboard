import koffi from "koffi";

// Ensure the global registry exists
if (!globalThis.structRegistry) {
  globalThis.structRegistry = new Map<string, any>();
}

// Use the global registry
const structRegistry = globalThis.structRegistry;

export function getStruct(structName: string, definitionCallback: () => any) {
  console.log("Current registry:", Array.from(structRegistry.keys()));
  if (!structRegistry.has(structName)) {
    console.log(`Defining new struct: ${structName}`);
    const struct = definitionCallback();
    structRegistry.set(structName, struct);
  } else {
    console.log(`Using existing struct: ${structName}`);
  }
  return structRegistry.get(structName);
}

// GeniusArray definition
export const GeniusArray = getStruct("GeniusArray", () =>
  koffi.struct("GeniusArray", {
    size: "uint64_t",
    ptr: koffi.pointer("uint8_t"),
  })
);

// GeniusMatrix definition
export const GeniusMatrix = getStruct("GeniusMatrix", () =>
  koffi.struct("GeniusMatrix", {
    size: "uint64_t",
    ptr: koffi.pointer(GeniusArray), // Use GeniusArray
  })
);

// GeniusAddress definition
export const GeniusAddress = getStruct("GeniusAddress", () =>
  koffi.struct("GeniusAddress", {
    address: koffi.array("char", 32),
  })
);
