// Builds the Astarte logo from the supplied artwork: keeps the flower tree and the red
// stars, replaces the "Art · S · Art" lettering in the central band with "Astarte".
// Usage: node scripts/make-logo.mjs <source.png> <out.png>
import sharp from "sharp";

const [src = "C:/Users/oussa/Desktop/artsart/sources/logo/logo of artsart.png", out = "astarte-logo.png"] = process.argv.slice(2);
const BAND = "#FFF9EA";
const W = 2000;

// The red eight-point star from the original lettering (left star), reused as-is.
const star = await sharp(src).extract({ left: 856, top: 964, width: 68, height: 70 }).png().toBuffer();

// Cover the old lettering with the band colour, then set the new name.
const text = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}">
  <rect x="470" y="905" width="1060" height="190" fill="${BAND}"/>
  <text x="1000" y="1058" text-anchor="middle" font-family="Palatino Linotype, Book Antiqua, Georgia, serif"
        font-size="178" letter-spacing="10" fill="#0D0D0D">Astarte</text>
</svg>`);

await sharp(src)
  .composite([
    { input: text, left: 0, top: 0 },
    { input: star, left: 560, top: 965 },
    { input: star, left: 1372, top: 965 },
  ])
  .png()
  .toFile(out);
console.log("wrote", out);
