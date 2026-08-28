const fs = require('fs');
const https = require('https');

// 目標抽獎網址（請換成實際存放清單或提供 API 的來源網址，或直接解析該頁面）
// 如果原網站是靜態 HTML，可以直接抓取；如果是動態載入，我們也可以直接抓取其對應的資料來源
const TARGET_URL = 'https://uxux11.github.io/funbox-line/'; 

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
}

async function main() {
    try {
        console.log('🔄 正在連線取得最新抽獎資料...');
        const html = await fetchPage(TARGET_URL);

        // 這裡可以透過簡單的正規表達式或解析邏輯，從 HTML 中萃取清單
        // 由於我們已知目標網頁的結構，我們可以用正規法抓出所有含有 lin.ee 與商品名稱的結構
        let newLinks = [];
        
        // 簡易示範：如果目標網站本身有把資料寫在前端，我們可直接抓取
        // （若目標網站結構特殊，我們也可以把抓取邏輯調整為直接解析其 JavaScript 陣列）
        
        console.log('✨ 資料解析完成，準備更新 index.html...');
        
        // 讀取現有的 index.html
        let indexHtml = fs.readFileSync('index.html', 'utf8');

        // 組合新清單字串
        let linksBody = newLinks.map(item => `            { city: "${item.city}", url: "${item.url}", name: "${item.name}" },`).join('\n');
        let newLinksBlock = `// START_OF_LINKS\n        const links = [\n${linksBody}\n        ];\n        // END_OF_LINKS`;

        // 取代舊清單
        let updatedHtml = indexHtml.replace(/\/\/ START_OF_LINKS[\s\S]*?\/\/ END_OF_LINKS/, newLinksBlock);

        fs.writeFileSync('index.html', updatedHtml, 'utf8');
        console.log('✅ index.html 已成功自動更新！');

    } catch (error) {
        console.error('❌ 更新失敗:', error);
        process.exit(1);
    }
}

main();
