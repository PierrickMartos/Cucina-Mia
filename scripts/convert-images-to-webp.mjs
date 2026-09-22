#!/usr/bin/env node
// Convert JPG/PNG images under public/images to WebP and update references in
// public/data JSON files. Original source files (source*) are left untouched.
//
// Usage:
//   node scripts/convert-images-to-webp.mjs               # whole public/images
//   node scripts/convert-images-to-webp.mjs <dir|file>... # only these paths

import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs"
import path from "path"
import sharp from "sharp"

const ROOT = path.resolve(import.meta.dirname, "..")
const PUBLIC_DIR = path.join(ROOT, "public")
const DATA_DIR = path.join(PUBLIC_DIR, "data")
const CONVERTIBLE = /\.(jpe?g|png)$/i

// Max width per image role; larger images are downscaled, smaller ones kept as is.
const MAX_WIDTH = { cover: 1600, web: 800, default: 1600 }
const QUALITY = 80

function walk(target) {
  const stat = statSync(target)
  if (stat.isFile()) return [target]
  return readdirSync(target).flatMap((name) => walk(path.join(target, name)))
}

function isSource(file) {
  return path.basename(file).toLowerCase().startsWith("source")
}

async function convert(file) {
  const role = path.basename(file).replace(CONVERTIBLE, "")
  const maxWidth = MAX_WIDTH[role] ?? MAX_WIDTH.default
  const out = file.replace(CONVERTIBLE, ".webp")
  await sharp(file)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out)
  const before = statSync(file).size
  const after = statSync(out).size
  unlinkSync(file)
  console.log(`${path.relative(ROOT, file)} → .webp (${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB)`)
  return [path.relative(PUBLIC_DIR, file), path.relative(PUBLIC_DIR, out)]
}

function updateJsonReferences(renames) {
  for (const file of walk(DATA_DIR).filter((f) => f.endsWith(".json"))) {
    const content = readFileSync(file, "utf8")
    let next = content
    for (const [from, to] of renames) {
      next = next.split(`"${from}"`).join(`"${to}"`)
    }
    if (next !== content) {
      writeFileSync(file, next)
      console.log(`updated ${path.relative(ROOT, file)}`)
    }
  }
}

const targets = process.argv.slice(2).map((p) => path.resolve(p))
const files = (targets.length ? targets : [path.join(PUBLIC_DIR, "images")])
  .flatMap(walk)
  .filter((f) => CONVERTIBLE.test(f) && !isSource(f))

const renames = []
for (const file of files) {
  renames.push(await convert(file))
}
updateJsonReferences(renames)
console.log(`Converted ${renames.length} image(s).`)
