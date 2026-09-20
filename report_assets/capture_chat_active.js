import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050', '--disable-gpu'],
        defaultViewport: { width: 1600, height: 1050, deviceScaleFactor: 2 }
    });

    const page = await browser.newPage();

    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@knowledgebase.com');
    await page.type('input[type="password"]', 'Admin12345');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await sleep(1000);

    // Go to project detail
    await page.goto('http://localhost:5173/projects/eda21886-7f0c-4830-bd0c-2bd70585ad0b', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Click on floating FAB
    const fab = await page.$('.fixed.bottom-6.right-6 button');
    if (fab) {
        console.log('Clicking FAB...');
        await fab.click();
        await sleep(1500);

        // Click history button (MessageSquare icon)
        const histBtn = await page.$('button[title*="Lịch sử"], button[title*="hội thoại"]');
        if (histBtn) {
            console.log('Clicking History button...');
            await histBtn.click();
            await sleep(1000);
        }

        // Click conversation "Hỏi về W7 Sport"
        const conv = await page.$('div::-p-text("Hỏi về W7 Sport"), p::-p-text("Hỏi về W7 Sport"), span::-p-text("Hỏi về W7 Sport")');
        if (conv) {
            console.log('Selecting conversation...');
            await conv.click();
            await sleep(2000);
        }

        await page.screenshot({ path: path.join(__dirname, '04_ai_rag_chat_active.png') });
        console.log('Saved 04_ai_rag_chat_active.png');
    }

    await browser.close();
}

run();
