import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repositoryRoot, "public", "brand-logo.png");
const iconsDirectory = path.join(repositoryRoot, "public", "icons");

await sharp(source).resize(192, 192).png().toFile(path.join(iconsDirectory, "icon-192.png"));
await sharp(source).resize(512, 512).png().toFile(path.join(iconsDirectory, "icon-512.png"));

const maskableLogo = await sharp(source)
  .resize(384, 384, { fit: "contain" })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: "#000000",
  },
})
  .composite([{ input: maskableLogo, gravity: "centre" }])
  .png()
  .toFile(path.join(iconsDirectory, "icon-maskable-512.png"));

await sharp(source).resize(512, 512).png().toFile(path.join(repositoryRoot, "app", "icon.png"));
await sharp(source).resize(180, 180).png().toFile(path.join(repositoryRoot, "app", "apple-icon.png"));
