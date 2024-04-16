/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, CodeError, decodeMessage, type DecodeOptions, encodeMessage, enumeration, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface SGProcessing {}

export namespace SGProcessing {
  export interface Task {
    ipfsBlockId: string
    blockLen: number
    blockStride: number
    blockLineStride: number
    randomSeed: number
    resultsChannel: string
  }

  export namespace Task {
    let _codec: Codec<Task>

    export const codec = (): Codec<Task> => {
      if (_codec == null) {
        _codec = message<Task>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.ipfsBlockId != null && obj.ipfsBlockId !== '')) {
            w.uint32(10)
            w.string(obj.ipfsBlockId)
          }

          if ((obj.blockLen != null && obj.blockLen !== 0)) {
            w.uint32(16)
            w.uint32(obj.blockLen)
          }

          if ((obj.blockStride != null && obj.blockStride !== 0)) {
            w.uint32(24)
            w.uint32(obj.blockStride)
          }

          if ((obj.blockLineStride != null && obj.blockLineStride !== 0)) {
            w.uint32(32)
            w.uint32(obj.blockLineStride)
          }

          if ((obj.randomSeed != null && obj.randomSeed !== 0)) {
            w.uint32(45)
            w.float(obj.randomSeed)
          }

          if ((obj.resultsChannel != null && obj.resultsChannel !== '')) {
            w.uint32(50)
            w.string(obj.resultsChannel)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            ipfsBlockId: '',
            blockLen: 0,
            blockStride: 0,
            blockLineStride: 0,
            randomSeed: 0,
            resultsChannel: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.ipfsBlockId = reader.string()
                break
              }
              case 2: {
                obj.blockLen = reader.uint32()
                break
              }
              case 3: {
                obj.blockStride = reader.uint32()
                break
              }
              case 4: {
                obj.blockLineStride = reader.uint32()
                break
              }
              case 5: {
                obj.randomSeed = reader.float()
                break
              }
              case 6: {
                obj.resultsChannel = reader.string()
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

    export const encode = (obj: Partial<Task>): Uint8Array => {
      return encodeMessage(obj, Task.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Task>): Task => {
      return decodeMessage(buf, Task.codec(), opts)
    }
  }

  export interface TaskLock {
    taskId: string
    lockTimestamp: bigint
  }

  export namespace TaskLock {
    let _codec: Codec<TaskLock>

    export const codec = (): Codec<TaskLock> => {
      if (_codec == null) {
        _codec = message<TaskLock>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.taskId != null && obj.taskId !== '')) {
            w.uint32(10)
            w.string(obj.taskId)
          }

          if ((obj.lockTimestamp != null && obj.lockTimestamp !== 0n)) {
            w.uint32(16)
            w.int64(obj.lockTimestamp)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            taskId: '',
            lockTimestamp: 0n
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.taskId = reader.string()
                break
              }
              case 2: {
                obj.lockTimestamp = reader.int64()
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

    export const encode = (obj: Partial<TaskLock>): Uint8Array => {
      return encodeMessage(obj, TaskLock.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<TaskLock>): TaskLock => {
      return decodeMessage(buf, TaskLock.codec(), opts)
    }
  }

  export interface SubTask {
    ipfsblock: string
    chunksToProcess: SGProcessing.ProcessingChunk[]
    datalen: number
    subtaskid: string
  }

  export namespace SubTask {
    let _codec: Codec<SubTask>

    export const codec = (): Codec<SubTask> => {
      if (_codec == null) {
        _codec = message<SubTask>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.ipfsblock != null && obj.ipfsblock !== '')) {
            w.uint32(10)
            w.string(obj.ipfsblock)
          }

          if (obj.chunksToProcess != null) {
            for (const value of obj.chunksToProcess) {
              w.uint32(18)
              SGProcessing.ProcessingChunk.codec().encode(value, w)
            }
          }

          if ((obj.datalen != null && obj.datalen !== 0)) {
            w.uint32(24)
            w.uint32(obj.datalen)
          }

          if ((obj.subtaskid != null && obj.subtaskid !== '')) {
            w.uint32(34)
            w.string(obj.subtaskid)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            ipfsblock: '',
            chunksToProcess: [],
            datalen: 0,
            subtaskid: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.ipfsblock = reader.string()
                break
              }
              case 2: {
                if (opts.limits?.chunksToProcess != null && obj.chunksToProcess.length === opts.limits.chunksToProcess) {
                  throw new CodeError('decode error - map field "chunksToProcess" had too many elements', 'ERR_MAX_LENGTH')
                }

                obj.chunksToProcess.push(SGProcessing.ProcessingChunk.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.chunksToProcess$
                }))
                break
              }
              case 3: {
                obj.datalen = reader.uint32()
                break
              }
              case 4: {
                obj.subtaskid = reader.string()
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

    export const encode = (obj: Partial<SubTask>): Uint8Array => {
      return encodeMessage(obj, SubTask.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubTask>): SubTask => {
      return decodeMessage(buf, SubTask.codec(), opts)
    }
  }

  export interface ProcessingChunk {
    chunkid: string
    offset: number
    subchunkWidth: number
    subchunkHeight: number
    stride: number
    lineStride: number
    nSubchunks: number
  }

  export namespace ProcessingChunk {
    let _codec: Codec<ProcessingChunk>

    export const codec = (): Codec<ProcessingChunk> => {
      if (_codec == null) {
        _codec = message<ProcessingChunk>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.chunkid != null && obj.chunkid !== '')) {
            w.uint32(10)
            w.string(obj.chunkid)
          }

          if ((obj.offset != null && obj.offset !== 0)) {
            w.uint32(16)
            w.uint32(obj.offset)
          }

          if ((obj.subchunkWidth != null && obj.subchunkWidth !== 0)) {
            w.uint32(24)
            w.uint32(obj.subchunkWidth)
          }

          if ((obj.subchunkHeight != null && obj.subchunkHeight !== 0)) {
            w.uint32(32)
            w.uint32(obj.subchunkHeight)
          }

          if ((obj.stride != null && obj.stride !== 0)) {
            w.uint32(40)
            w.uint32(obj.stride)
          }

          if ((obj.lineStride != null && obj.lineStride !== 0)) {
            w.uint32(48)
            w.uint32(obj.lineStride)
          }

          if ((obj.nSubchunks != null && obj.nSubchunks !== 0)) {
            w.uint32(56)
            w.uint32(obj.nSubchunks)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            chunkid: '',
            offset: 0,
            subchunkWidth: 0,
            subchunkHeight: 0,
            stride: 0,
            lineStride: 0,
            nSubchunks: 0
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.chunkid = reader.string()
                break
              }
              case 2: {
                obj.offset = reader.uint32()
                break
              }
              case 3: {
                obj.subchunkWidth = reader.uint32()
                break
              }
              case 4: {
                obj.subchunkHeight = reader.uint32()
                break
              }
              case 5: {
                obj.stride = reader.uint32()
                break
              }
              case 6: {
                obj.lineStride = reader.uint32()
                break
              }
              case 7: {
                obj.nSubchunks = reader.uint32()
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

    export const encode = (obj: Partial<ProcessingChunk>): Uint8Array => {
      return encodeMessage(obj, ProcessingChunk.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProcessingChunk>): ProcessingChunk => {
      return decodeMessage(buf, ProcessingChunk.codec(), opts)
    }
  }

  export interface ProcessingQueueItem {
    lockTimestamp: bigint
    lockNodeId: string
  }

  export namespace ProcessingQueueItem {
    let _codec: Codec<ProcessingQueueItem>

    export const codec = (): Codec<ProcessingQueueItem> => {
      if (_codec == null) {
        _codec = message<ProcessingQueueItem>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.lockTimestamp != null && obj.lockTimestamp !== 0n)) {
            w.uint32(8)
            w.int64(obj.lockTimestamp)
          }

          if ((obj.lockNodeId != null && obj.lockNodeId !== '')) {
            w.uint32(18)
            w.string(obj.lockNodeId)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            lockTimestamp: 0n,
            lockNodeId: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.lockTimestamp = reader.int64()
                break
              }
              case 2: {
                obj.lockNodeId = reader.string()
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

    export const encode = (obj: Partial<ProcessingQueueItem>): Uint8Array => {
      return encodeMessage(obj, ProcessingQueueItem.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProcessingQueueItem>): ProcessingQueueItem => {
      return decodeMessage(buf, ProcessingQueueItem.codec(), opts)
    }
  }

  export interface ProcessingQueue {
    items: SGProcessing.ProcessingQueueItem[]
    lastUpdateTimestamp: bigint
    ownerNodeId: string
  }

  export namespace ProcessingQueue {
    let _codec: Codec<ProcessingQueue>

    export const codec = (): Codec<ProcessingQueue> => {
      if (_codec == null) {
        _codec = message<ProcessingQueue>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.items != null) {
            for (const value of obj.items) {
              w.uint32(10)
              SGProcessing.ProcessingQueueItem.codec().encode(value, w)
            }
          }

          if ((obj.lastUpdateTimestamp != null && obj.lastUpdateTimestamp !== 0n)) {
            w.uint32(16)
            w.int64(obj.lastUpdateTimestamp)
          }

          if ((obj.ownerNodeId != null && obj.ownerNodeId !== '')) {
            w.uint32(26)
            w.string(obj.ownerNodeId)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            items: [],
            lastUpdateTimestamp: 0n,
            ownerNodeId: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.items != null && obj.items.length === opts.limits.items) {
                  throw new CodeError('decode error - map field "items" had too many elements', 'ERR_MAX_LENGTH')
                }

                obj.items.push(SGProcessing.ProcessingQueueItem.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.items$
                }))
                break
              }
              case 2: {
                obj.lastUpdateTimestamp = reader.int64()
                break
              }
              case 3: {
                obj.ownerNodeId = reader.string()
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

    export const encode = (obj: Partial<ProcessingQueue>): Uint8Array => {
      return encodeMessage(obj, ProcessingQueue.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProcessingQueue>): ProcessingQueue => {
      return decodeMessage(buf, ProcessingQueue.codec(), opts)
    }
  }

  export interface SubTaskCollection {
    items: SGProcessing.SubTask[]
  }

  export namespace SubTaskCollection {
    let _codec: Codec<SubTaskCollection>

    export const codec = (): Codec<SubTaskCollection> => {
      if (_codec == null) {
        _codec = message<SubTaskCollection>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.items != null) {
            for (const value of obj.items) {
              w.uint32(10)
              SGProcessing.SubTask.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            items: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.items != null && obj.items.length === opts.limits.items) {
                  throw new CodeError('decode error - map field "items" had too many elements', 'ERR_MAX_LENGTH')
                }

                obj.items.push(SGProcessing.SubTask.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.items$
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

    export const encode = (obj: Partial<SubTaskCollection>): Uint8Array => {
      return encodeMessage(obj, SubTaskCollection.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubTaskCollection>): SubTaskCollection => {
      return decodeMessage(buf, SubTaskCollection.codec(), opts)
    }
  }

  export interface SubTaskQueue {
    processingQueue?: SGProcessing.ProcessingQueue
    subtasks?: SGProcessing.SubTaskCollection
  }

  export namespace SubTaskQueue {
    let _codec: Codec<SubTaskQueue>

    export const codec = (): Codec<SubTaskQueue> => {
      if (_codec == null) {
        _codec = message<SubTaskQueue>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.processingQueue != null) {
            w.uint32(10)
            SGProcessing.ProcessingQueue.codec().encode(obj.processingQueue, w)
          }

          if (obj.subtasks != null) {
            w.uint32(18)
            SGProcessing.SubTaskCollection.codec().encode(obj.subtasks, w)
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
                obj.processingQueue = SGProcessing.ProcessingQueue.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.processingQueue
                })
                break
              }
              case 2: {
                obj.subtasks = SGProcessing.SubTaskCollection.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.subtasks
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

    export const encode = (obj: Partial<SubTaskQueue>): Uint8Array => {
      return encodeMessage(obj, SubTaskQueue.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubTaskQueue>): SubTaskQueue => {
      return decodeMessage(buf, SubTaskQueue.codec(), opts)
    }
  }

  export interface SubTaskQueueRequest {
    nodeId: string
  }

  export namespace SubTaskQueueRequest {
    let _codec: Codec<SubTaskQueueRequest>

    export const codec = (): Codec<SubTaskQueueRequest> => {
      if (_codec == null) {
        _codec = message<SubTaskQueueRequest>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.nodeId != null && obj.nodeId !== '')) {
            w.uint32(10)
            w.string(obj.nodeId)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            nodeId: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.nodeId = reader.string()
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

    export const encode = (obj: Partial<SubTaskQueueRequest>): Uint8Array => {
      return encodeMessage(obj, SubTaskQueueRequest.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubTaskQueueRequest>): SubTaskQueueRequest => {
      return decodeMessage(buf, SubTaskQueueRequest.codec(), opts)
    }
  }

  export interface SubTaskResult {
    resultHash: number
    chunkHashes: number[]
    ipfsResultsDataId: string
    subtaskid: string
  }

  export namespace SubTaskResult {
    let _codec: Codec<SubTaskResult>

    export const codec = (): Codec<SubTaskResult> => {
      if (_codec == null) {
        _codec = message<SubTaskResult>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.resultHash != null && obj.resultHash !== 0)) {
            w.uint32(8)
            w.uint32(obj.resultHash)
          }

          if (obj.chunkHashes != null) {
            for (const value of obj.chunkHashes) {
              w.uint32(16)
              w.uint32(value)
            }
          }

          if ((obj.ipfsResultsDataId != null && obj.ipfsResultsDataId !== '')) {
            w.uint32(26)
            w.string(obj.ipfsResultsDataId)
          }

          if ((obj.subtaskid != null && obj.subtaskid !== '')) {
            w.uint32(34)
            w.string(obj.subtaskid)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            resultHash: 0,
            chunkHashes: [],
            ipfsResultsDataId: '',
            subtaskid: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.resultHash = reader.uint32()
                break
              }
              case 2: {
                if (opts.limits?.chunkHashes != null && obj.chunkHashes.length === opts.limits.chunkHashes) {
                  throw new CodeError('decode error - map field "chunkHashes" had too many elements', 'ERR_MAX_LENGTH')
                }

                obj.chunkHashes.push(reader.uint32())
                break
              }
              case 3: {
                obj.ipfsResultsDataId = reader.string()
                break
              }
              case 4: {
                obj.subtaskid = reader.string()
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

    export const encode = (obj: Partial<SubTaskResult>): Uint8Array => {
      return encodeMessage(obj, SubTaskResult.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubTaskResult>): SubTaskResult => {
      return decodeMessage(buf, SubTaskResult.codec(), opts)
    }
  }

  export interface SubTaskState {
    state: SGProcessing.SubTaskState.Type
    timestamp: bigint
  }

  export namespace SubTaskState {
    export enum Type {
      NONE = 'NONE',
      ENQUEUED = 'ENQUEUED',
      PROCESSING = 'PROCESSING',
      PROCESSED = 'PROCESSED',
      COMPLETE = 'COMPLETE'
    }

    enum __TypeValues {
      NONE = 0,
      ENQUEUED = 1,
      PROCESSING = 2,
      PROCESSED = 3,
      COMPLETE = 4
    }

    export namespace Type {
      export const codec = (): Codec<Type> => {
        return enumeration<Type>(__TypeValues)
      }
    }

    let _codec: Codec<SubTaskState>

    export const codec = (): Codec<SubTaskState> => {
      if (_codec == null) {
        _codec = message<SubTaskState>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.state != null && __TypeValues[obj.state] !== 0) {
            w.uint32(8)
            SGProcessing.SubTaskState.Type.codec().encode(obj.state, w)
          }

          if ((obj.timestamp != null && obj.timestamp !== 0n)) {
            w.uint32(16)
            w.int64(obj.timestamp)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            state: Type.NONE,
            timestamp: 0n
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.state = SGProcessing.SubTaskState.Type.codec().decode(reader)
                break
              }
              case 2: {
                obj.timestamp = reader.int64()
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

    export const encode = (obj: Partial<SubTaskState>): Uint8Array => {
      return encodeMessage(obj, SubTaskState.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubTaskState>): SubTaskState => {
      return decodeMessage(buf, SubTaskState.codec(), opts)
    }
  }

  export interface TaskResult {
    subtaskResults: SGProcessing.SubTaskResult[]
  }

  export namespace TaskResult {
    let _codec: Codec<TaskResult>

    export const codec = (): Codec<TaskResult> => {
      if (_codec == null) {
        _codec = message<TaskResult>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.subtaskResults != null) {
            for (const value of obj.subtaskResults) {
              w.uint32(10)
              SGProcessing.SubTaskResult.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            subtaskResults: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.subtaskResults != null && obj.subtaskResults.length === opts.limits.subtaskResults) {
                  throw new CodeError('decode error - map field "subtaskResults" had too many elements', 'ERR_MAX_LENGTH')
                }

                obj.subtaskResults.push(SGProcessing.SubTaskResult.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.subtaskResults$
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

    export const encode = (obj: Partial<TaskResult>): Uint8Array => {
      return encodeMessage(obj, TaskResult.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<TaskResult>): TaskResult => {
      return decodeMessage(buf, TaskResult.codec(), opts)
    }
  }

  export interface ProcessingChannelRequest {
    environment: string
  }

  export namespace ProcessingChannelRequest {
    let _codec: Codec<ProcessingChannelRequest>

    export const codec = (): Codec<ProcessingChannelRequest> => {
      if (_codec == null) {
        _codec = message<ProcessingChannelRequest>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.environment != null && obj.environment !== '')) {
            w.uint32(10)
            w.string(obj.environment)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            environment: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.environment = reader.string()
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

    export const encode = (obj: Partial<ProcessingChannelRequest>): Uint8Array => {
      return encodeMessage(obj, ProcessingChannelRequest.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProcessingChannelRequest>): ProcessingChannelRequest => {
      return decodeMessage(buf, ProcessingChannelRequest.codec(), opts)
    }
  }

  export interface ProcessingChannelResponse {
    channelId: string
  }

  export namespace ProcessingChannelResponse {
    let _codec: Codec<ProcessingChannelResponse>

    export const codec = (): Codec<ProcessingChannelResponse> => {
      if (_codec == null) {
        _codec = message<ProcessingChannelResponse>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.channelId != null && obj.channelId !== '')) {
            w.uint32(10)
            w.string(obj.channelId)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            channelId: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.channelId = reader.string()
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

    export const encode = (obj: Partial<ProcessingChannelResponse>): Uint8Array => {
      return encodeMessage(obj, ProcessingChannelResponse.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProcessingChannelResponse>): ProcessingChannelResponse => {
      return decodeMessage(buf, ProcessingChannelResponse.codec(), opts)
    }
  }

  export interface GridChannelMessage {
    processingChannelRequest?: SGProcessing.ProcessingChannelRequest
    processingChannelResponse?: SGProcessing.ProcessingChannelResponse
  }

  export namespace GridChannelMessage {
    let _codec: Codec<GridChannelMessage>

    export const codec = (): Codec<GridChannelMessage> => {
      if (_codec == null) {
        _codec = message<GridChannelMessage>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.processingChannelRequest != null) {
            w.uint32(10)
            SGProcessing.ProcessingChannelRequest.codec().encode(obj.processingChannelRequest, w)
          }

          if (obj.processingChannelResponse != null) {
            w.uint32(18)
            SGProcessing.ProcessingChannelResponse.codec().encode(obj.processingChannelResponse, w)
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
                obj.processingChannelRequest = SGProcessing.ProcessingChannelRequest.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.processingChannelRequest
                })
                break
              }
              case 2: {
                obj.processingChannelResponse = SGProcessing.ProcessingChannelResponse.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.processingChannelResponse
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

    export const encode = (obj: Partial<GridChannelMessage>): Uint8Array => {
      return encodeMessage(obj, GridChannelMessage.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<GridChannelMessage>): GridChannelMessage => {
      return decodeMessage(buf, GridChannelMessage.codec(), opts)
    }
  }

  export interface ProcessingNode {
    nodeId: string
    timestamp: bigint
  }

  export namespace ProcessingNode {
    let _codec: Codec<ProcessingNode>

    export const codec = (): Codec<ProcessingNode> => {
      if (_codec == null) {
        _codec = message<ProcessingNode>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.nodeId != null && obj.nodeId !== '')) {
            w.uint32(10)
            w.string(obj.nodeId)
          }

          if ((obj.timestamp != null && obj.timestamp !== 0n)) {
            w.uint32(16)
            w.uint64(obj.timestamp)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            nodeId: '',
            timestamp: 0n
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.nodeId = reader.string()
                break
              }
              case 2: {
                obj.timestamp = reader.uint64()
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

    export const encode = (obj: Partial<ProcessingNode>): Uint8Array => {
      return encodeMessage(obj, ProcessingNode.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProcessingNode>): ProcessingNode => {
      return decodeMessage(buf, ProcessingNode.codec(), opts)
    }
  }

  export interface ProcessingChannelMessage {
    subtaskQueue?: SGProcessing.SubTaskQueue
    subtaskQueueRequest?: SGProcessing.SubTaskQueueRequest
  }

  export namespace ProcessingChannelMessage {
    let _codec: Codec<ProcessingChannelMessage>

    export const codec = (): Codec<ProcessingChannelMessage> => {
      if (_codec == null) {
        _codec = message<ProcessingChannelMessage>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.subtaskQueue != null) {
            w.uint32(10)
            SGProcessing.SubTaskQueue.codec().encode(obj.subtaskQueue, w)
          }

          if (obj.subtaskQueueRequest != null) {
            w.uint32(18)
            SGProcessing.SubTaskQueueRequest.codec().encode(obj.subtaskQueueRequest, w)
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
                obj.subtaskQueue = SGProcessing.SubTaskQueue.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.subtaskQueue
                })
                break
              }
              case 2: {
                obj.subtaskQueueRequest = SGProcessing.SubTaskQueueRequest.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.subtaskQueueRequest
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

    export const encode = (obj: Partial<ProcessingChannelMessage>): Uint8Array => {
      return encodeMessage(obj, ProcessingChannelMessage.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProcessingChannelMessage>): ProcessingChannelMessage => {
      return decodeMessage(buf, ProcessingChannelMessage.codec(), opts)
    }
  }

  let _codec: Codec<SGProcessing>

  export const codec = (): Codec<SGProcessing> => {
    if (_codec == null) {
      _codec = message<SGProcessing>((obj, w, opts = {}) => {
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

  export const encode = (obj: Partial<SGProcessing>): Uint8Array => {
    return encodeMessage(obj, SGProcessing.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SGProcessing>): SGProcessing => {
    return decodeMessage(buf, SGProcessing.codec(), opts)
  }
}
