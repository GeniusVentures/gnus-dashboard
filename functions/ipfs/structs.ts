import koffi from "koffi";

// Local registry for defined structs
const structRegistry = new Map<string, any>();

export function getStruct(structName: string, definitionCallback: () => any) {
  if (!structRegistry.has(structName)) {
    const struct = definitionCallback();
    structRegistry.set(structName, struct);
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
