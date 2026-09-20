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

    // Login as Admin
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    const adminBtn = await page.$('button::-p-text("System Admin")');
    if (adminBtn) await adminBtn.click();
    await sleep(2000);

    // Go to project detail with Speaking.docx
    console.log('Going to Test Project with Speaking.docx...');
    await page.goto('http://localhost:5173/projects/eda21886-7f0c-4830-bd0c-2bd70585ad0b', { waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.screenshot({ path: path.join(__dirname, '03_project_detail_speaking.png') });
    console.log('Saved 03_project_detail_speaking.png');

    // Click the sparkling AI button in bottom right
    console.log('Opening AI Chat Drawer...');
    // Look for button with svg or aria or class
    const aiBtn = await page.$('button.rounded-full, button[class*="fixed bottom-"]');
    if (aiBtn) {
        await aiBtn.click();
        await sleep(1500);

        // Click on conversation "Hỏi về W7 Sport"
        const convItem = await page.$('div::-p-text("Hỏi về W7 Sport"), button::-p-text("Hỏi về W7 Sport")');
        if (convItem) {
            await convItem.click();
            await sleep(1500);
        }

        await page.screenshot({ path: path.join(__dirname, '04_ai_rag_chat_drawer.png') });
        console.log('Saved 04_ai_rag_chat_drawer.png');
    }

    // MinIO Console login and bucket view
    console.log('Navigating to MinIO...');
    try {
        await page.goto('http://localhost:9001/login', { waitUntil: 'networkidle2', timeout: 5000 });
        await sleep(1000);
        const userInp = await page.$('input[name="accessKey"], input#accessKey, input[type="text"]');
        const passInp = await page.$('input[name="secretKey"], input#secretKey, input[type="password"]');
        if (userInp && passInp) {
            await userInp.type('admin');
            await passInp.type('password123');
            const submitBtn = await page.$('button[type="submit"]');
            if (submitBtn) await submitBtn.click();
            await sleep(2500);
            await page.goto('http://localhost:9001/buckets/knowledge-base/browse', { waitUntil: 'networkidle2', timeout: 5000 });
            await sleep(1500);
            await page.screenshot({ path: path.join(__dirname, '07_minio_s3_storage.png') });
            console.log('Saved 07_minio_s3_storage.png');
        }
    } catch (e) {
        console.warn('MinIO screenshot skipped:', e.message);
    }

    await browser.close();
}

run();
