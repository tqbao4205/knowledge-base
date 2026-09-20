import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050', '--disable-gpu'],
        defaultViewport: { width: 1600, height: 1050, deviceScaleFactor: 2 }
    });

    const page = await browser.newPage();

    try {
        // 1. Login Page with Quick Switcher
        console.log('Navigating to login page...');
        await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
        await sleep(1000);
        await page.screenshot({ path: path.join(__dirname, '01_login_page.png') });
        console.log('Saved 01_login_page.png');

        // Click Admin quick login or fill admin credentials
        console.log('Logging in as Admin...');
        const adminBtn = await page.$('button::-p-text("System Admin")');
        if (adminBtn) {
            await adminBtn.click();
        } else {
            await page.type('input[type="email"]', 'admin@knowledgebase.com');
            await page.type('input[type="password"]', 'Admin12345');
            const submitBtn = await page.$('button[type="submit"]');
            if (submitBtn) await submitBtn.click();
        }

        await sleep(2500);

        // 2. Dashboard / Projects page
        console.log('Current URL:', page.url());
        await page.screenshot({ path: path.join(__dirname, '02_dashboard_projects.png') });
        console.log('Saved 02_dashboard_projects.png');

        // 3. Navigate into Project Detail
        console.log('Navigating into Project Detail...');
        // Look for project card
        const projectCard = await page.$('a[href^="/projects/"], div[class*="cursor-pointer"]');
        if (projectCard) {
            await projectCard.click();
            await sleep(2500);
        } else {
            // Find project ID via API or navigate directly
            await page.goto('http://localhost:5173/projects', { waitUntil: 'networkidle2' });
            await sleep(1500);
        }

        await page.screenshot({ path: path.join(__dirname, '03_project_detail.png') });
        console.log('Saved 03_project_detail.png');

        // 4. Open AI Chat Drawer
        console.log('Looking for AI Chat button...');
        const chatBtn = await page.$('button::-p-text("Hỏi đáp AI"), button::-p-text("Chat"), button[aria-label*="chat" i]');
        if (chatBtn) {
            await chatBtn.click();
            await sleep(2000);
            await page.screenshot({ path: path.join(__dirname, '04_ai_rag_chat.png') });
            console.log('Saved 04_ai_rag_chat.png');
        }

        // 5. Admin Dashboard
        console.log('Navigating to Admin Dashboard...');
        await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
        await sleep(2000);
        await page.screenshot({ path: path.join(__dirname, '05_admin_dashboard.png') });
        console.log('Saved 05_admin_dashboard.png');

        // 6. Swagger UI
        console.log('Navigating to Swagger UI...');
        await page.goto('http://localhost:8080/swagger-ui/index.html', { waitUntil: 'networkidle2' });
        await sleep(2000);
        // Expand some tags
        const opblocks = await page.$$('.opblock-tag-section');
        for (let i = 0; i < Math.min(opblocks.length, 3); i++) {
            const h4 = await opblocks[i].$('h4');
            if (h4) await h4.click();
            await sleep(300);
        }
        await page.screenshot({ path: path.join(__dirname, '06_swagger_api_expanded.png') });
        console.log('Saved 06_swagger_api_expanded.png');

    } catch (err) {
        console.error('Error during capture:', err);
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
}

run();
