// @generated by protobuf-ts 2.9.4
// @generated from protobuf file "SGBlocks.proto" (package "SGBlocks", syntax proto3)
// tslint:disable
import type { BinaryWriteOptions } from "@protobuf-ts/runtime";
import type { IBinaryWriter } from "@protobuf-ts/runtime";
import { WireType } from "@protobuf-ts/runtime";
import type { BinaryReadOptions } from "@protobuf-ts/runtime";
import type { IBinaryReader } from "@protobuf-ts/runtime";
import { UnknownFieldHandler } from "@protobuf-ts/runtime";
import type { PartialMessage } from "@protobuf-ts/runtime";
import { reflectionMergePartial } from "@protobuf-ts/runtime";
import { MessageType } from "@protobuf-ts/runtime";
/**
 * @generated from protobuf message SGBlocks.BlockHashData
 */
export interface BlockHashData {
    /**
     * @generated from protobuf field: bytes hash = 1;
     */
    hash: Uint8Array; // 
}
/**
 * @generated from protobuf message SGBlocks.BlockHeaderData
 */
export interface BlockHeaderData {
    /**
     * @generated from protobuf field: bytes parent_hash = 1;
     */
    parentHash: Uint8Array; // 
    /**
     * @generated from protobuf field: uint64 block_number = 2;
     */
    blockNumber: bigint; // 
    /**
     * @generated from protobuf field: bytes state_root = 3;
     */
    stateRoot: Uint8Array;
    /**
     * @generated from protobuf field: bytes extrinsics_root = 4;
     */
    extrinsicsRoot: Uint8Array;
    /**
     * @generated from protobuf field: bytes digest = 5;
     */
    digest: Uint8Array;
}
/**
 * @generated from protobuf message SGBlocks.BlockPayloadData
 */
export interface BlockPayloadData {
    /**
     * @generated from protobuf field: bytes hash = 1;
     */
    hash: Uint8Array; // 
    /**
     * @generated from protobuf field: SGBlocks.BlockHeaderData header = 2;
     */
    header?: BlockHeaderData; // 
    /**
     * @generated from protobuf field: repeated bytes block_body = 3;
     */
    blockBody: Uint8Array[]; // 
}
// @generated message type with reflection information, may provide speed optimized methods
class BlockHashData$Type extends MessageType<BlockHashData> {
    constructor() {
        super("SGBlocks.BlockHashData", [
            { no: 1, name: "hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value?: PartialMessage<BlockHashData>): BlockHashData {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.hash = new Uint8Array(0);
        if (value !== undefined)
            reflectionMergePartial<BlockHashData>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: BlockHashData): BlockHashData {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes hash */ 1:
                    message.hash = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: BlockHashData, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* bytes hash = 1; */
        if (message.hash.length)
            writer.tag(1, WireType.LengthDelimited).bytes(message.hash);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message SGBlocks.BlockHashData
 */
export const BlockHashData = new BlockHashData$Type();
// @generated message type with reflection information, may provide speed optimized methods
class BlockHeaderData$Type extends MessageType<BlockHeaderData> {
    constructor() {
        super("SGBlocks.BlockHeaderData", [
            { no: 1, name: "parent_hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "block_number", kind: "scalar", T: 4 /*ScalarType.UINT64*/, L: 0 /*LongType.BIGINT*/ },
            { no: 3, name: "state_root", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 4, name: "extrinsics_root", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 5, name: "digest", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value?: PartialMessage<BlockHeaderData>): BlockHeaderData {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.parentHash = new Uint8Array(0);
        message.blockNumber = 0n;
        message.stateRoot = new Uint8Array(0);
        message.extrinsicsRoot = new Uint8Array(0);
        message.digest = new Uint8Array(0);
        if (value !== undefined)
            reflectionMergePartial<BlockHeaderData>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: BlockHeaderData): BlockHeaderData {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes parent_hash */ 1:
                    message.parentHash = reader.bytes();
                    break;
                case /* uint64 block_number */ 2:
                    message.blockNumber = reader.uint64().toBigInt();
                    break;
                case /* bytes state_root */ 3:
                    message.stateRoot = reader.bytes();
                    break;
                case /* bytes extrinsics_root */ 4:
                    message.extrinsicsRoot = reader.bytes();
                    break;
                case /* bytes digest */ 5:
                    message.digest = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: BlockHeaderData, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* bytes parent_hash = 1; */
        if (message.parentHash.length)
            writer.tag(1, WireType.LengthDelimited).bytes(message.parentHash);
        /* uint64 block_number = 2; */
        if (message.blockNumber !== 0n)
            writer.tag(2, WireType.Varint).uint64(message.blockNumber);
        /* bytes state_root = 3; */
        if (message.stateRoot.length)
            writer.tag(3, WireType.LengthDelimited).bytes(message.stateRoot);
        /* bytes extrinsics_root = 4; */
        if (message.extrinsicsRoot.length)
            writer.tag(4, WireType.LengthDelimited).bytes(message.extrinsicsRoot);
        /* bytes digest = 5; */
        if (message.digest.length)
            writer.tag(5, WireType.LengthDelimited).bytes(message.digest);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message SGBlocks.BlockHeaderData
 */
export const BlockHeaderData = new BlockHeaderData$Type();
// @generated message type with reflection information, may provide speed optimized methods
class BlockPayloadData$Type extends MessageType<BlockPayloadData> {
    constructor() {
        super("SGBlocks.BlockPayloadData", [
            { no: 1, name: "hash", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "header", kind: "message", T: () => BlockHeaderData },
            { no: 3, name: "block_body", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value?: PartialMessage<BlockPayloadData>): BlockPayloadData {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.hash = new Uint8Array(0);
        message.blockBody = [];
        if (value !== undefined)
            reflectionMergePartial<BlockPayloadData>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: BlockPayloadData): BlockPayloadData {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* bytes hash */ 1:
                    message.hash = reader.bytes();
                    break;
                case /* SGBlocks.BlockHeaderData header */ 2:
                    message.header = BlockHeaderData.internalBinaryRead(reader, reader.uint32(), options, message.header);
                    break;
                case /* repeated bytes block_body */ 3:
                    message.blockBody.push(reader.bytes());
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: BlockPayloadData, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* bytes hash = 1; */
        if (message.hash.length)
            writer.tag(1, WireType.LengthDelimited).bytes(message.hash);
        /* SGBlocks.BlockHeaderData header = 2; */
        if (message.header)
            BlockHeaderData.internalBinaryWrite(message.header, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
        /* repeated bytes block_body = 3; */
        for (let i = 0; i < message.blockBody.length; i++)
            writer.tag(3, WireType.LengthDelimited).bytes(message.blockBody[i]);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message SGBlocks.BlockPayloadData
 */
export const BlockPayloadData = new BlockPayloadData$Type();