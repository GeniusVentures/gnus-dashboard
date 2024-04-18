/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, message } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface SGTransaction {}

export namespace SGTransaction {
  export interface DAGStruct {
    type: string
    previousHash: Uint8Array
    sourceAddr: Uint8Array
    nonce: bigint
    timestamp: bigint
    uncleHash: Uint8Array
    dataHash: Uint8Array
  }

  export namespace DAGStruct {
    let _codec: Codec<DAGStruct>

    export const codec = (): Codec<DAGStruct> => {
      if (_codec == null) {
        _codec = message<DAGStruct>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.type != null && obj.type !== '')) {
            w.uint32(10)
            w.string(obj.type)
          }

          if ((obj.previousHash != null && obj.previousHash.byteLength > 0)) {
            w.uint32(18)
            w.bytes(obj.previousHash)
          }

          if ((obj.sourceAddr != null && obj.sourceAddr.byteLength > 0)) {
            w.uint32(26)
            w.bytes(obj.sourceAddr)
          }

          if ((obj.nonce != null && obj.nonce !== 0n)) {
            w.uint32(32)
            w.uint64(obj.nonce)
          }

          if ((obj.timestamp != null && obj.timestamp !== 0n)) {
            w.uint32(40)
            w.int64(obj.timestamp)
          }

          if ((obj.uncleHash != null && obj.uncleHash.byteLength > 0)) {
            w.uint32(50)
            w.bytes(obj.uncleHash)
          }

          if ((obj.dataHash != null && obj.dataHash.byteLength > 0)) {
            w.uint32(58)
            w.bytes(obj.dataHash)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            type: '',
            previousHash: uint8ArrayAlloc(0),
            sourceAddr: uint8ArrayAlloc(0),
            nonce: 0n,
            timestamp: 0n,
            uncleHash: uint8ArrayAlloc(0),
            dataHash: uint8ArrayAlloc(0)
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.type = reader.string()
                break
              }
              case 2: {
                obj.previousHash = reader.bytes()
                break
              }
              case 3: {
                obj.sourceAddr = reader.bytes()
                break
              }
              case 4: {
                obj.nonce = reader.uint64()
                break
              }
              case 5: {
                obj.timestamp = reader.int64()
                break
              }
              case 6: {
                obj.uncleHash = reader.bytes()
                break
              }
              case 7: {
                obj.dataHash = reader.bytes()
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

    export const encode = (obj: Partial<DAGStruct>): Uint8Array => {
      return encodeMessage(obj, DAGStruct.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DAGStruct>): DAGStruct => {
      return decodeMessage(buf, DAGStruct.codec(), opts)
    }
  }

  export interface DAGWrapper {
    dagStruct?: SGTransaction.DAGStruct
  }

  export namespace DAGWrapper {
    let _codec: Codec<DAGWrapper>

    export const codec = (): Codec<DAGWrapper> => {
      if (_codec == null) {
        _codec = message<DAGWrapper>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.dagStruct != null) {
            w.uint32(10)
            SGTransaction.DAGStruct.codec().encode(obj.dagStruct, w)
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
              case 1: {
                obj.dagStruct = SGTransaction.DAGStruct.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.dagStruct
                })
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

    export const encode = (obj: Partial<DAGWrapper>): Uint8Array => {
      return encodeMessage(obj, DAGWrapper.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DAGWrapper>): DAGWrapper => {
      return decodeMessage(buf, DAGWrapper.codec(), opts)
    }
  }

  export interface TransferTx {
    dagStruct?: SGTransaction.DAGStruct
    tokenId: bigint
    encryptedAmount: Uint8Array
    destAddr: Uint8Array
  }

  export namespace TransferTx {
    let _codec: Codec<TransferTx>

    export const codec = (): Codec<TransferTx> => {
      if (_codec == null) {
        _codec = message<TransferTx>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.dagStruct != null) {
            w.uint32(10)
            SGTransaction.DAGStruct.codec().encode(obj.dagStruct, w)
          }

          if ((obj.tokenId != null && obj.tokenId !== 0n)) {
            w.uint32(16)
            w.uint64(obj.tokenId)
          }

          if ((obj.encryptedAmount != null && obj.encryptedAmount.byteLength > 0)) {
            w.uint32(26)
            w.bytes(obj.encryptedAmount)
          }

          if ((obj.destAddr != null && obj.destAddr.byteLength > 0)) {
            w.uint32(34)
            w.bytes(obj.destAddr)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            tokenId: 0n,
            encryptedAmount: uint8ArrayAlloc(0),
            destAddr: uint8ArrayAlloc(0)
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.dagStruct = SGTransaction.DAGStruct.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.dagStruct
                })
                break
              }
              case 2: {
                obj.tokenId = reader.uint64()
                break
              }
              case 3: {
                obj.encryptedAmount = reader.bytes()
                break
              }
              case 4: {
                obj.destAddr = reader.bytes()
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

    export const encode = (obj: Partial<TransferTx>): Uint8Array => {
      return encodeMessage(obj, TransferTx.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<TransferTx>): TransferTx => {
      return decodeMessage(buf, TransferTx.codec(), opts)
    }
  }

  export interface ProcessingTx {
    dagStruct?: SGTransaction.DAGStruct
    mpcMagicKey: bigint
    offset: bigint
    jobCid: string
    subtaskCid: string
  }

  export namespace ProcessingTx {
    let _codec: Codec<ProcessingTx>

    export const codec = (): Codec<ProcessingTx> => {
      if (_codec == null) {
        _codec = message<ProcessingTx>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.dagStruct != null) {
            w.uint32(10)
            SGTransaction.DAGStruct.codec().encode(obj.dagStruct, w)
          }

          if ((obj.mpcMagicKey != null && obj.mpcMagicKey !== 0n)) {
            w.uint32(16)
            w.uint64(obj.mpcMagicKey)
          }

          if ((obj.offset != null && obj.offset !== 0n)) {
            w.uint32(24)
            w.uint64(obj.offset)
          }

          if ((obj.jobCid != null && obj.jobCid !== '')) {
            w.uint32(34)
            w.string(obj.jobCid)
          }

          if ((obj.subtaskCid != null && obj.subtaskCid !== '')) {
            w.uint32(42)
            w.string(obj.subtaskCid)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            mpcMagicKey: 0n,
            offset: 0n,
            jobCid: '',
            subtaskCid: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.dagStruct = SGTransaction.DAGStruct.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.dagStruct
                })
                break
              }
              case 2: {
                obj.mpcMagicKey = reader.uint64()
                break
              }
              case 3: {
                obj.offset = reader.uint64()
                break
              }
              case 4: {
                obj.jobCid = reader.string()
                break
              }
              case 5: {
                obj.subtaskCid = reader.string()
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

    export const encode = (obj: Partial<ProcessingTx>): Uint8Array => {
      return encodeMessage(obj, ProcessingTx.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProcessingTx>): ProcessingTx => {
      return decodeMessage(buf, ProcessingTx.codec(), opts)
    }
  }

  export interface MintTx {
    dagStruct?: SGTransaction.DAGStruct
    amount: bigint
  }

  export namespace MintTx {
    let _codec: Codec<MintTx>

    export const codec = (): Codec<MintTx> => {
      if (_codec == null) {
        _codec = message<MintTx>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.dagStruct != null) {
            w.uint32(10)
            SGTransaction.DAGStruct.codec().encode(obj.dagStruct, w)
          }

          if ((obj.amount != null && obj.amount !== 0n)) {
            w.uint32(16)
            w.uint64(obj.amount)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            amount: 0n
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.dagStruct = SGTransaction.DAGStruct.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.dagStruct
                })
                break
              }
              case 2: {
                obj.amount = reader.uint64()
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

    export const encode = (obj: Partial<MintTx>): Uint8Array => {
      return encodeMessage(obj, MintTx.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<MintTx>): MintTx => {
      return decodeMessage(buf, MintTx.codec(), opts)
    }
  }

  let _codec: Codec<SGTransaction>

  export const codec = (): Codec<SGTransaction> => {
    if (_codec == null) {
      _codec = message<SGTransaction>((obj, w, opts = {}) => {
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

  export const encode = (obj: Partial<SGTransaction>): Uint8Array => {
    return encodeMessage(obj, SGTransaction.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SGTransaction>): SGTransaction => {
    return decodeMessage(buf, SGTransaction.codec(), opts)
  }
}
