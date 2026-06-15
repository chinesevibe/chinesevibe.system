import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'DEMO_HR_WORKFLOW_print.html');
const outputPrimary = path.join(__dirname, '../public/docs/DEMO_HR_WORKFLOW.pdf');
const outputCopy = path.join(__dirname, '../docs/DEMO_HR_WORKFLOW.pdf');

async function main() {
  if (!fs.existsSync(htmlPath)) {
    console.error('HTML not found:', htmlPath);
    process.exit(1);
  }

  for (const dir of [path.dirname(outputPrimary), path.dirname(outputCopy)]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  // Wait for Google Fonts (Sarabun) to load
  await page.waitForTimeout(2000);

  await page.pdf({
    path: outputPrimary,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '16mm', right: '16mm' },
    preferCSSPageSize: true,
  });

  fs.copyFileSync(outputPrimary, outputCopy);

  const stat = fs.statSync(outputPrimary);
  console.log('PDF created:', outputPrimary);
  console.log('PDF copy:', outputCopy);
  console.log('Size bytes:', stat.size);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
