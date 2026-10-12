import fs from 'node:fs';
import { fromArrayBuffer } from 'geotiff';

const tmpdir = process.env.TEMP || 'C:/Users/sichen/AppData/Local/Temp';

const files = [
  'hk-4326.tif',
  'hk-2326.tif',
  'mo-4326.tif',
];

for (const name of files) {
  const p = `${tmpdir}\\${name}`;
  console.log(`=== ${p} ===`);
  const buf = fs.readFileSync(p);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const t = await fromArrayBuffer(ab);
  const img = await t.getImage();
  const fd = img.getFileDirectory();
  console.log('w/h:', img.getWidth(), 'x', img.getHeight());
  console.log('tiepoint:', fd.ModelTiepoint);
  console.log('scale:', fd.ModelPixelScale);
  console.log('GeoKeys:', img.getGeoKeys());
  const r = await img.readRasters({ interleave: true });
  let validCount = 0;
  let sum = 0;
  let max = 0;
  for (let i = 0; i < r.length; i += 1) {
    const v = r[i];
    if (Number.isFinite(v) && v > -9990 && v < 10000) {
      validCount += 1;
      sum += v;
      if (v > max) max = v;
    }
  }
  console.log(
    'valid pixels:',
    validCount,
    'mean:',
    validCount ? (sum / validCount).toFixed(4) : 'n/a',
    'max:',
    max.toFixed(4),
  );
}