import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0d1117;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, monospace;
    padding: 32px;
    color: #e6edf3;
  }
  .window {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    overflow: hidden;
    margin-bottom: 24px;
  }
  .titlebar {
    background: #21262d;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #30363d;
  }
  .dots {
    display: flex;
    gap: 8px;
    margin-right: 16px;
  }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .dot.red { background: #ff5f56; }
  .dot.yellow { background: #ffbd2e; }
  .dot.green { background: #27c93f; }
  .title { font-size: 13px; color: #8b949e; font-weight: 500; }
  .content {
    padding: 20px;
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    font-size: 12.5px;
    line-height: 1.6;
    color: #c9d1d9;
    white-space: pre-wrap;
  }
  .cmd { color: #58a6ff; font-weight: 600; }
  .header { color: #7ee787; font-weight: 600; }
  .highlight { color: #f0883e; }
  .success { color: #3fb950; font-weight: 600; }
</style>
</head>
<body>

<div class="window">
  <div class="titlebar">
    <div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div>
    <div class="title">PostgreSQL 16 + pgvector — Enterprise Knowledge Base Database Relations (\dt+)</div>
  </div>
  <div class="content"><span class="cmd">knowledge_base=# \dt+</span>
                                           <span class="header">List of relations</span>
 Schema |        Name        | Type  |  Owner  | Persistence | Access method |    Size    | Description 
--------+--------------------+-------+---------+-------------+---------------+------------+-------------
 public | <span class="highlight">chat_conversations</span> | table | kb_user | permanent   | heap          | 8192 bytes | Contextual RAG Chat Sessions
 public | <span class="highlight">chat_messages</span>      | table | kb_user | permanent   | heap          | 64 kB      | Messages with Citations JSON
 public | <span class="highlight">document_chunks</span>    | table | kb_user | permanent   | heap          | 112 kB     | <span class="success">Vector Store: 768d + HNSW Cosine Index</span>
 public | <span class="highlight">documents</span>          | table | kb_user | permanent   | heap          | 16 kB      | MinIO Object Storage Metadata
 public | <span class="highlight">permissions</span>        | table | kb_user | permanent   | heap          | 16 kB      | Granular Privileges (DOC_CREATE...)
 public | <span class="highlight">project_members</span>    | table | kb_user | permanent   | heap          | 8192 bytes | Multi-tenant Project Membership
 public | <span class="highlight">projects</span>           | table | kb_user | permanent   | heap          | 16 kB      | Project Workspaces (Isolated)
 public | <span class="highlight">role_permissions</span>   | table | kb_user | permanent   | heap          | 8192 bytes | Role-to-Permission Mapping
 public | <span class="highlight">roles</span>              | table | kb_user | permanent   | heap          | 8192 bytes | System & Project Roles
 public | <span class="highlight">user_roles</span>         | table | kb_user | permanent   | heap          | 8192 bytes | User Assigned Roles
 public | <span class="highlight">users</span>              | table | kb_user | permanent   | heap          | 16 kB      | User Accounts & Passwords (BCrypt)
(11 rows)</div>
</div>

<div class="window">
  <div class="titlebar">
    <div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div>
    <div class="title">pgvector Schema & HNSW Index Definition (\d document_chunks)</div>
  </div>
  <div class="content"><span class="cmd">knowledge_base=# \d document_chunks</span>
                               <span class="header">Table "public.document_chunks"</span>
   Column    |            Type             | Collation | Nullable | Default 
-------------+-----------------------------+-----------+----------+---------
 id          | uuid                        |           | not null | 
 project_id  | uuid                        |           | not null | 
 document_id | uuid                        |           | not null | 
 chunk_index | integer                     |           | not null | 
 content     | text                        |           | not null | 
 page_number | integer                     |           |          | 
 <span class="success">embedding   | vector(768)                 |           |          |  <-- Nomic Embed Text 768-dim Vector</span>
 created_at  | timestamp without time zone |           | not null | now()
Indexes:
    "document_chunks_pkey" PRIMARY KEY, btree (id)
    <span class="success">"idx_document_chunks_embedding" hnsw (embedding vector_cosine_ops)</span>
    "idx_document_chunks_project_id" btree (project_id)
Foreign-key constraints:
    "document_chunks_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE</div>
</div>

</body>
</html>
`;

async function run() {
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        defaultViewport: { width: 1400, height: 900, deviceScaleFactor: 2 }
    });

    const page = await browser.newPage();
    await page.setContent(html);
    await page.screenshot({ path: path.join(__dirname, '08_database_postgres.png'), fullPage: true });
    console.log('Saved 08_database_postgres.png');
    await browser.close();
}

run();
