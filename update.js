const fs = require('fs');
const https = require('https');

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
        console.log('🔄 正在連線取得最新頁面...');
        const html = await fetchPage(TARGET_URL);
        let extractedLinks = [];
        
        // 正規表達式精準抓取 <a> 標籤
        const aRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
        let match;

        while ((match = aRegex.exec(html)) !== null) {
            let href = match[1];
            let innerText = match[2].replace(/<[^>]*>/g, '').trim();

            if ((href.includes('lin.ee') || href.includes('line.me')) && (innerText.includes('抽獎') || innerText.length > 2)) {
                let cityName = "未分類";
                const cities = ['台北市', '新北市', '桃園市', '新竹市', '新竹縣', '台中市', '彰化縣', '雲林縣', '嘉義市', '台南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '基隆市', '苗栗縣', '南投縣'];
                
                // 從原始碼往前推算所屬縣市
                let contextStr = html.substring(Math.max(0, match.index - 500), match.index);
                for (let c of cities) {
                    if (contextStr.includes(c)) {
                        cityName = c;
                        break;
                    }
                }

                let productName = innerText.replace('抽獎', '').trim();
                if (!productName || productName.length > 50) productName = '抽獎項目';

                extractedLinks.push({ city: cityName, url: href, name: productName });
            }
        }

        // 去重複
        let uniqueMap = new Map();
        extractedLinks.forEach(item => uniqueMap.set(item.url, item));
        let newLinks = Array.from(uniqueMap.values());

        if (newLinks.length === 0) {
            console.log('⚠️ 沒有抓到有效連結，取消更新。');
            return;
        }

        console.log(`✅ 成功抓取 ${newLinks.length} 筆，正在寫入 index.html...`);

        let indexHtml = fs.readFileSync('index.html', 'utf8');
        let linksBody = newLinks.map(item => `            { city: "${item.city}", url: "${item.url}", name: "${item.name}" }`).join(',\n');
        let newLinksBlock = `// START_OF_LINKS\n        const links = [\n${linksBody}\n        ];\n        // END_OF_LINKS`;

        let updatedHtml = indexHtml.replace(/\/\/ START_OF_LINKS[\s\S]*?\/\/ END_OF_LINKS/, newLinksBlock);
        fs.writeFileSync('index.html', updatedHtml, 'utf8');
        console.log('🎉 自動更新完成！');

    } catch (error) {
        console.error('❌ 錯誤:', error);
        process.exit(1);
    }
}

main();
