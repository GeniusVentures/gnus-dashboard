/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, message } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface sgns {}

export namespace sgns {
  export interface crdt {}

  export namespace crdt {
    export interface broadcasting {}

    export namespace broadcasting {
      export interface BroadcastMessage {
        multiaddress: string
        data: Uint8Array
      }

      export namespace BroadcastMessage {
        let _codec: Codec<BroadcastMessage>

        export const codec = (): Codec<BroadcastMessage> => {
          if (_codec == null) {
            _codec = message<BroadcastMessage>((obj, w, opts = {}) => {
              if (opts.lengthDelimited !== false) {
                w.fork()
              }

              if ((obj.multiaddress != null && obj.multiaddress !== '')) {
                w.uint32(10)
                w.string(obj.multiaddress)
              }

              if ((obj.data != null && obj.data.byteLength > 0)) {
                w.uint32(18)
                w.bytes(obj.data)
              }

              if (opts.lengthDelimited !== false) {
                w.ldelim()
              }
            }, (reader, length, opts = {}) => {
              const obj: any = {
                multiaddress: '',
                data: uint8ArrayAlloc(0)
              }

              const end = length == null ? reader.len : reader.pos + length

              while (reader.pos < end) {
                const tag = reader.uint32()

                switch (tag >>> 3) {
                  case 1: {
                    obj.multiaddress = reader.string()
                    break
                  }
                  case 2: {
                    obj.data = reader.bytes()
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

        export const encode = (obj: Partial<BroadcastMessage>): Uint8Array => {
          return encodeMessage(obj, BroadcastMessage.codec())
        }

        export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<BroadcastMessage>): BroadcastMessage => {
          return decodeMessage(buf, BroadcastMessage.codec(), opts)
        }
      }

      let _codec: Codec<broadcasting>

      export const codec = (): Codec<broadcasting> => {
        if (_codec == null) {
          _codec = message<broadcasting>((obj, w, opts = {}) => {
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

      export const encode = (obj: Partial<broadcasting>): Uint8Array => {
        return encodeMessage(obj, broadcasting.codec())
      }

      export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<broadcasting>): broadcasting => {
        return decodeMessage(buf, broadcasting.codec(), opts)
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
