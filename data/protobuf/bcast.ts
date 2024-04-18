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
      export interface CRDTBroadcast {
        heads: sgns.crdt.pb.Head[]
      }

      export namespace CRDTBroadcast {
        let _codec: Codec<CRDTBroadcast>

        export const codec = (): Codec<CRDTBroadcast> => {
          if (_codec == null) {
            _codec = message<CRDTBroadcast>((obj, w, opts = {}) => {
              if (opts.lengthDelimited !== false) {
                w.fork()
              }

              if (obj.heads != null) {
                for (const value of obj.heads) {
                  w.uint32(10)
                  sgns.crdt.pb.Head.codec().encode(value, w)
                }
              }

              if (opts.lengthDelimited !== false) {
                w.ldelim()
              }
            }, (reader, length, opts = {}) => {
              const obj: any = {
                heads: []
              }

              const end = length == null ? reader.len : reader.pos + length

              while (reader.pos < end) {
                const tag = reader.uint32()

                switch (tag >>> 3) {
                  case 1: {
                    if (opts.limits?.heads != null && obj.heads.length === opts.limits.heads) {
                      throw new CodeError('decode error - map field "heads" had too many elements', 'ERR_MAX_LENGTH')
                    }

                    obj.heads.push(sgns.crdt.pb.Head.codec().decode(reader, reader.uint32(), {
                      limits: opts.limits?.heads$
                    }))
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

        export const encode = (obj: Partial<CRDTBroadcast>): Uint8Array => {
          return encodeMessage(obj, CRDTBroadcast.codec())
        }

        export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CRDTBroadcast>): CRDTBroadcast => {
          return decodeMessage(buf, CRDTBroadcast.codec(), opts)
        }
      }

      export interface Head {
        cid: Uint8Array
      }

      export namespace Head {
        let _codec: Codec<Head>

        export const codec = (): Codec<Head> => {
          if (_codec == null) {
            _codec = message<Head>((obj, w, opts = {}) => {
              if (opts.lengthDelimited !== false) {
                w.fork()
              }

              if ((obj.cid != null && obj.cid.byteLength > 0)) {
                w.uint32(10)
                w.bytes(obj.cid)
              }

              if (opts.lengthDelimited !== false) {
                w.ldelim()
              }
            }, (reader, length, opts = {}) => {
              const obj: any = {
                cid: uint8ArrayAlloc(0)
              }

              const end = length == null ? reader.len : reader.pos + length

              while (reader.pos < end) {
                const tag = reader.uint32()

                switch (tag >>> 3) {
                  case 1: {
                    obj.cid = reader.bytes()
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

        export const encode = (obj: Partial<Head>): Uint8Array => {
          return encodeMessage(obj, Head.codec())
        }

        export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Head>): Head => {
          return decodeMessage(buf, Head.codec(), opts)
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
