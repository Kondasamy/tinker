// Real gzip, measured here (KTD6): the platform's own compressor (CompressionStream, in browsers and Node 22) on the
// same bytes. Its size is shown beside ours and tested within a tolerance, never pinned exactly: zlib builds differ.

/** gzip's size in bytes for these bytes, from the platform's CompressionStream. */
export async function gzipSize(bytes: Uint8Array): Promise<number> {
  const s = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new CompressionStream('gzip'));
  return (await new Response(s).arrayBuffer()).byteLength;
}
