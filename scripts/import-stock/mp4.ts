// Length and size of an MP4 or MOV from its header (the mvhd box inside moov), so the dry run can
// check the 60-second limit and estimate Cloudinary's per-second video credits before any upload.
// Only reads. Returns null when the file isn't an MP4/MOV it can read (WebM, damaged files).

type Box = { type: string; start: number; end: number };

function* boxes(buf: Buffer, start: number, end: number): Generator<Box> {
  let at = start;
  while (at + 8 <= end) {
    let size = buf.readUInt32BE(at);
    const type = buf.toString('latin1', at + 4, at + 8);
    let header = 8;
    if (size === 1) {
      if (at + 16 > end) return;
      size = Number(buf.readBigUInt64BE(at + 8));
      header = 16;
    } else if (size === 0) {
      size = end - at;
    }
    if (size < header || at + size > end) return;
    yield { type, start: at + header, end: at + size };
    at += size;
  }
}

const find = (buf: Buffer, type: string, start = 0, end = buf.length) => {
  for (const box of boxes(buf, start, end)) if (box.type === type) return box;
  return null;
};

export function mp4Seconds(buf: Buffer): number | null {
  const moov = find(buf, 'moov');
  const mvhd = moov && find(buf, 'mvhd', moov.start, moov.end);
  if (!mvhd) return null;
  const version = buf[mvhd.start];
  // version + flags (4), then creation and modification times (4 or 8 bytes each).
  const timescaleAt = mvhd.start + (version === 1 ? 20 : 12);
  if (timescaleAt + (version === 1 ? 12 : 8) > mvhd.end) return null;
  const timescale = buf.readUInt32BE(timescaleAt);
  const duration =
    version === 1
      ? Number(buf.readBigUInt64BE(timescaleAt + 4))
      : buf.readUInt32BE(timescaleAt + 4);
  return timescale > 0 ? duration / timescale : null;
}

// A minimal valid header with the given length, for tests.
export function fakeMp4(seconds: number, padding = 0): Buffer {
  const box = (type: string, body: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(8 + body.length);
    head.write(type, 4, 'latin1');
    return Buffer.concat([head, body]);
  };
  const mvhd = Buffer.alloc(100);
  mvhd.writeUInt32BE(1000, 12);
  mvhd.writeUInt32BE(Math.round(seconds * 1000), 16);
  return Buffer.concat([
    box('ftyp', Buffer.from('isom\0\0\0\0isom', 'latin1')),
    box('moov', box('mvhd', mvhd)),
    box('mdat', Buffer.alloc(padding)),
  ]);
}
