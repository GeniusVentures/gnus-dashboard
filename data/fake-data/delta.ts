/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, CodeError, decodeMessage, type DecodeOptions, encodeMessage, message } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface sgns {}

export namespace sgns {
  export interface crdt {}

  export namespace crdt {
    export interface pb {}

    export namespace pb {
      export interface Delta {
        elements: sgns.crdt.pb.Element[]
        tombstones: sgns.crdt.pb.Element[]
        priority: bigint
      }

      export namespace Delta {
        let _codec: Codec<Delta>

        export const codec = (): Codec<Delta> => {
          if (_codec == null) {
            _codec = message<Delta>((obj, w, opts = {}) => {
              if (opts.lengthDelimited !== false) {
                w.fork()
              }

              if (obj.elements != null) {
                for (const value of obj.elements) {
                  w.uint32(10)
                  sgns.crdt.pb.Element.codec().encode(value, w)
                }
              }

              if (obj.tombstones != null) {
                for (const value of obj.tombstones) {
                  w.uint32(18)
                  sgns.crdt.pb.Element.codec().encode(value, w)
                }
              }

              if ((obj.priority != null && obj.priority !== BigInt(0))) {
                w.uint32(24)
                w.uint64(obj.priority)
              }

              if (opts.lengthDelimited !== false) {
                w.ldelim()
              }
            }, (reader, length, opts = {}) => {
              const obj: any = {
                elements: [],
                tombstones: [],
                priority: BigInt(0)
              }

              const end = length == null ? reader.len : reader.pos + length

              while (reader.pos < end) {
                const tag = reader.uint32()

                switch (tag >>> 3) {
                  case 1: {
                    if (opts.limits?.elements != null && obj.elements.length === opts.limits.elements) {
                      throw new CodeError('decode error - map field "elements" had too many elements', 'ERR_MAX_LENGTH')
                    }

                    obj.elements.push(sgns.crdt.pb.Element.codec().decode(reader, reader.uint32(), {
                      limits: opts.limits?.elements$
                    }))
                    break
                  }
                  case 2: {
                    if (opts.limits?.tombstones != null && obj.tombstones.length === opts.limits.tombstones) {
                      throw new CodeError('decode error - map field "tombstones" had too many elements', 'ERR_MAX_LENGTH')
                    }

                    obj.tombstones.push(sgns.crdt.pb.Element.codec().decode(reader, reader.uint32(), {
                      limits: opts.limits?.tombstones$
                    }))
                    break
                  }
                  case 3: {
                    obj.priority = reader.uint64()
                    break
                  }
                  default: {
                    reader.skipType(tag & 7)
                    break
                  }
                }
              }

              return obj
            })
          }

          return _codec
        }

        export const encode = (obj: Partial<Delta>): Uint8Array => {
          return encodeMessage(obj, Delta.codec())
        }

        export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Delta>): Delta => {
          return decodeMessage(buf, Delta.codec(), opts)
        }
      }

      export interface Element {
        key: string
        id: string
        value: Uint8Array
      }

      export namespace Element {
        let _codec: Codec<Element>

        export const codec = (): Codec<Element> => {
          if (_codec == null) {
            _codec = message<Element>((obj, w, opts = {}) => {
              if (opts.lengthDelimited !== false) {
                w.fork()
              }

              if ((obj.key != null && obj.key !== '')) {
                w.uint32(10)
                w.string(obj.key)
              }

              if ((obj.id != null && obj.id !== '')) {
                w.uint32(18)
                w.string(obj.id)
              }

              if ((obj.value != null && obj.value.byteLength > 0)) {
                w.uint32(26)
                w.bytes(obj.value)
              }

              if (opts.lengthDelimited !== false) {
                w.ldelim()
              }
            }, (reader, length, opts = {}) => {
              const obj: any = {
                key: '',
                id: '',
                value: uint8ArrayAlloc(0)
              }

              const end = length == null ? reader.len : reader.pos + length

              while (reader.pos < end) {
                const tag = reader.uint32()

                switch (tag >>> 3) {
                  case 1: {
                    obj.key = reader.string()
                    break
                  }
                  case 2: {
                    obj.id = reader.string()
                    break
                  }
                  case 3: {
                    obj.value = reader.bytes()
                    break
                  }
                  default: {
                    reader.skipType(tag & 7)
                    break
                  }
                }
              }

              return obj
            })
          }

          return _codec
        }

        export const encode = (obj: Partial<Element>): Uint8Array => {
          return encodeMessage(obj, Element.codec())
        }

        export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Element>): Element => {
          return decodeMessage(buf, Element.codec(), opts)
        }
      }

      let _codec: Codec<pb>

      export const codec = (): Codec<pb> => {
        if (_codec == null) {
          _codec = message<pb>((obj, w, opts = {}) => {
            if (opts.lengthDelimited !== false) {
              w.fork()
            }

            if (opts.lengthDelimited !== false) {
              w.ldelim()
            }
          }, (reader, length, opts = {}) => {
            const obj: any = {}

            const end = length == null ? reader.len : reader.pos + length

            while (reader.pos < end) {
              const tag = reader.uint32()

              switch (tag >>> 3) {
                default: {
                  reader.skipType(tag & 7)
                  break
                }
              }
            }

            return obj
          })
        }

        return _codec
      }

      export const encode = (obj: Partial<pb>): Uint8Array => {
        return encodeMessage(obj, pb.codec())
      }

      export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<pb>): pb => {
        return decodeMessage(buf, pb.codec(), opts)
      }
    }

    let _codec: Codec<crdt>

    export const codec = (): Codec<crdt> => {
      if (_codec == null) {
        _codec = message<crdt>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {}

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              default: {
                reader.skipType(tag & 7)
                break
              }
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<crdt>): Uint8Array => {
      return encodeMessage(obj, crdt.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<crdt>): crdt => {
      return decodeMessage(buf, crdt.codec(), opts)
    }
  }

  let _codec: Codec<sgns>

  export const codec = (): Codec<sgns> => {
    if (_codec == null) {
      _codec = message<sgns>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<sgns>): Uint8Array => {
    return encodeMessage(obj, sgns.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<sgns>): sgns => {
    return decodeMessage(buf, sgns.codec(), opts)
  }
}
