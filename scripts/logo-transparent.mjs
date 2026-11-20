// Makes the logo's cream background transparent so it sits cleanly on any page colour.
// Usage: node scripts/logo-transparent.mjs <in.png> <out.png>
import sharp from "sharp";

const [input, output] = process.argv.slice(2);
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const BG = [255, 249, 234];
for (let i = 0; i < data.length; i += 4) {
  const d = Math.abs(data[i] - BG[0]) + Math.abs(data[i + 1] - BG[1]) + Math.abs(data[i + 2] - BG[2]);
  if (d < 18) data[i + 3] = 0; // background
  else if (d < 40) data[i + 3] = Math.round(((d - 18) / 22) * 255); // soft edge
}
await sharp(data, { raw: info }).png().toFile(output);
console.log("wrote", output);
