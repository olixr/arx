/**
 * Growable binary writer/reader for the high-frequency wire format.
 * WebSocket text frames carry JSON control messages; binary frames carry
 * these — first byte is a BinaryMsgType discriminator.
 */

export enum BinaryMsgType {
  Snapshot = 1,
  Chunk = 2,
  TilePatch = 3,
}

export class ByteWriter {
  private buf: ArrayBuffer;
  private view: DataView;
  private pos = 0;

  constructor(initialSize = 1024) {
    this.buf = new ArrayBuffer(initialSize);
    this.view = new DataView(this.buf);
  }

  private ensure(bytes: number): void {
    if (this.pos + bytes <= this.buf.byteLength) return;
    let size = this.buf.byteLength * 2;
    while (size < this.pos + bytes) size *= 2;
    const next = new ArrayBuffer(size);
    new Uint8Array(next).set(new Uint8Array(this.buf, 0, this.pos));
    this.buf = next;
    this.view = new DataView(next);
  }

  u8(v: number): void {
    this.ensure(1);
    this.view.setUint8(this.pos, v);
    this.pos += 1;
  }

  u16(v: number): void {
    this.ensure(2);
    this.view.setUint16(this.pos, v);
    this.pos += 2;
  }

  u32(v: number): void {
    this.ensure(4);
    this.view.setUint32(this.pos, v);
    this.pos += 4;
  }

  i8(v: number): void {
    this.ensure(1);
    this.view.setInt8(this.pos, v);
    this.pos += 1;
  }

  i16(v: number): void {
    this.ensure(2);
    this.view.setInt16(this.pos, v);
    this.pos += 2;
  }

  i32(v: number): void {
    this.ensure(4);
    this.view.setInt32(this.pos, v);
    this.pos += 4;
  }

  f32(v: number): void {
    this.ensure(4);
    this.view.setFloat32(this.pos, v);
    this.pos += 4;
  }

  /** Finished message as a tightly-sized ArrayBuffer. */
  finish(): ArrayBuffer {
    return this.buf.slice(0, this.pos);
  }
}

export class ByteReader {
  private view: DataView;
  private pos = 0;

  constructor(buf: ArrayBuffer | ArrayBufferView) {
    this.view = ArrayBuffer.isView(buf)
      ? new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
      : new DataView(buf);
  }

  get remaining(): number {
    return this.view.byteLength - this.pos;
  }

  u8(): number {
    const v = this.view.getUint8(this.pos);
    this.pos += 1;
    return v;
  }

  u16(): number {
    const v = this.view.getUint16(this.pos);
    this.pos += 2;
    return v;
  }

  u32(): number {
    const v = this.view.getUint32(this.pos);
    this.pos += 4;
    return v;
  }

  i8(): number {
    const v = this.view.getInt8(this.pos);
    this.pos += 1;
    return v;
  }

  i16(): number {
    const v = this.view.getInt16(this.pos);
    this.pos += 2;
    return v;
  }

  i32(): number {
    const v = this.view.getInt32(this.pos);
    this.pos += 4;
    return v;
  }

  f32(): number {
    const v = this.view.getFloat32(this.pos);
    this.pos += 4;
    return v;
  }
}
