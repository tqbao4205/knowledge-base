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

    // 1. Login
    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@knowledgebase.com');
    await page.type('input[type="password"]', 'Admin12345');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await sleep(1500);

    // 2. Go to Test Project (has Speaking.docx now active)
    console.log('Opening Test Project...');
    // Click on the project card for Test Project
    const testProjectCard = await page.$('div::-p-text("Test Project")');
    if (testProjectCard) {
        await testProjectCard.click();
    } else {
        await page.goto('http://localhost:5173/projects/eda21886-7f0c-4830-bd0c-2bd70585ad0b', { waitUntil: 'networkidle2' });
    }
    await sleep(2000);
    await page.screenshot({ path: path.join(__dirname, '03_project_detail_documents.png') });
    console.log('Saved 03_project_detail_documents.png');

    // 3. Open AI Chat Drawer
    console.log('Opening AI Chat Drawer...');
    const floatingBtn = await page.$('button[class*="fixed bottom-6 right-6"]');
    if (floatingBtn) {
        await floatingBtn.click();
        await sleep(1500);

        // Click conversation "Hỏi về W7 Sport"
        const conv = await page.$('div::-p-text("Hỏi về W7 Sport"), span::-p-text("Hỏi về W7 Sport"), p::-p-text("Hỏi về W7 Sport")');
        if (conv) {
            await conv.click();
            await sleep(2000);
        }
        await page.screenshot({ path: path.join(__dirname, '04_ai_rag_chat_active.png') });
        console.log('Saved 04_ai_rag_chat_active.png');
    }

    // 4. MinIO
    console.log('Capturing MinIO...');
    try {
        await page.goto('http://localhost:9001/login', { waitUntil: 'networkidle2', timeout: 5000 });
        await page.type('input#accessKey, input[type="text"]', 'admin');
        await page.type('input#secretKey, input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await sleep(2000);
        
        // Click Acknowledge if modal exists
        const ackBtn = await page.$('button::-p-text("Acknowledge")');
        if (ackBtn) {
            await ackBtn.click();
            await sleep(1000);
        }

        // Navigate to bucket browse
        await page.goto('http://localhost:9001/buckets/knowledge-base/browse', { waitUntil: 'networkidle2', timeout: 5000 });
        await sleep(1500);
        await page.screenshot({ path: path.join(__dirname, '07_minio_bucket_files.png') });
        console.log('Saved 07_minio_bucket_files.png');
    } catch (e) {
        console.warn('MinIO error:', e.message);
    }

    await browser.close();
}

run();
