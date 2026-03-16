const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const TMP = path.join(process.cwd(), '.tmp');
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const logs = { console: [], errors: [], network: [] };
  page.on('console', msg => logs.console.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => logs.errors.push({ message: err.message, stack: err.stack }));

  try {
    const url = `file://${process.cwd()}/view_video.html`;
    console.log(`Navigating to ${url}`);
    await page.goto(url);

    const video = await page.$('#vid');

    // Ensure video is playing
    await page.evaluate(() => {
        const v = document.getElementById('vid');
        v.play();
    });

    // Capture screenshots at intervals
    const intervals = [0, 1, 2, 3, 4, 5];
    for (const t of intervals) {
        await page.evaluate((time) => {
            const v = document.getElementById('vid');
            v.currentTime = time;
        }, t);

        // Wait a bit for the frame to render
        await new Promise(r => setTimeout(r, 500));

        const screenshotPath = path.join(TMP, `frame_${t}s.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`Captured screenshot at ${t}s: ${screenshotPath}`);
    }

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(TMP, 'browser-logs.json'), JSON.stringify(logs, null, 2));
  }
}

run();
