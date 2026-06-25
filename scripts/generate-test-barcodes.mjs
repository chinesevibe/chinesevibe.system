#!/usr/bin/env node
/**
 * Generate QR + Code128 test labels for inventory inbound scan UAT.
 *
 * Usage: node scripts/generate-test-barcodes.mjs
 * Output: public/test-barcodes/*.png + index.html
 */
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import bwipjs from "bwip-js"
import QRCode from "qrcode"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, "../public/test-barcodes")

const DEMO_SKUS = [
  { code: "SKU-DEMO-001", name: "Demo น้ำจิ้ม", barcode: "8850000000001" },
  { code: "SKU-DEMO-002", name: "Demo หมูสับ", barcode: "8850000000002" },
  { code: "SKU-DEMO-003", name: "Demo ผักรวม", barcode: "8850000000003" },
  { code: "SKU-DEMO-004", name: "Demo กล่องใส่อาหาร", barcode: "8850000000004" },
  { code: "SKU-DEMO-005", name: "Demo น้ำดื่ม", barcode: "8850000000005" },
]

async function main() {
  await mkdir(outDir, { recursive: true })

  for (const sku of DEMO_SKUS) {
    const qrFile = path.join(outDir, `${sku.barcode}.png`)
    await QRCode.toFile(qrFile, sku.barcode, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
    })
    console.log(`✓ ${qrFile}`)

    const code128File = path.join(outDir, `${sku.barcode}-code128.png`)
    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: sku.barcode,
      scale: 4,
      height: 22,
      includetext: true,
      textxalign: "center",
      backgroundcolor: "FFFFFF",
      paddingwidth: 12,
      paddingheight: 10,
    })
    await writeFile(code128File, png)
    console.log(`✓ ${code128File}`)
  }

  const cards = DEMO_SKUS.map(
    (sku) => `
    <article class="card">
      <img class="linear" src="./${sku.barcode}-code128.png" alt="Code128 ${sku.barcode}" />
      <p class="code">${sku.barcode}</p>
      <p class="sku">${sku.code}</p>
      <p class="name">${sku.name}</p>
      <details>
        <summary>QR fallback</summary>
        <img class="qr" src="./${sku.barcode}.png" alt="QR ${sku.barcode}" width="160" height="160" />
      </details>
    </article>`
  ).join("")

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Test Barcodes — Inbound Scan UAT</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, "Prompt", sans-serif;
      margin: 0;
      padding: 24px;
      background: #f4f4f5;
      color: #18181b;
    }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    .hint {
      margin: 0 0 20px;
      font-size: 0.9rem;
      color: #52525b;
      max-width: 52rem;
      line-height: 1.5;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }
    .card {
      background: #fff;
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      break-inside: avoid;
    }
    .card img { display: block; margin: 0 auto 12px; }
    .linear {
      width: min(100%, 280px);
      height: auto;
      background: #fff;
    }
    .qr { margin-top: 12px; }
    details { margin-top: 10px; font-size: 0.8rem; color: #71717a; }
    summary { cursor: pointer; }
    .code {
      font-family: ui-monospace, monospace;
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 4px;
      letter-spacing: 0.04em;
    }
    .sku { margin: 0; font-size: 0.75rem; color: #71717a; }
    .name { margin: 4px 0 0; font-size: 0.85rem; }
    @media print {
      body { background: #fff; padding: 12px; }
      .hint { font-size: 0.8rem; }
      .grid { gap: 12px; }
    }
  </style>
</head>
<body>
  <h1>Barcode ทดสอบ — สแกนรับเข้าคลัง</h1>
  <p class="hint">
    ใช้ภาพ Code128 เป็นหลัก เพราะเลข demo ไม่ใช่ EAN-13 checksum ถูกต้อง
    (QR อยู่ใน fallback ของแต่ละสินค้า)
  </p>
  <div class="grid">${cards}</div>
</body>
</html>
`

  const indexPath = path.join(outDir, "index.html")
  await writeFile(indexPath, html, "utf8")
  console.log(`✓ ${indexPath}`)
  console.log("\nOpen: /test-barcodes/  (local) or https://hr-app-rho-blush.vercel.app/test-barcodes/")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
