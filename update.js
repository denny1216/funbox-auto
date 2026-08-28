const fs = require('fs');
const https = require('https');
const cheerio = require('cheerio'); // 引入瀏覽器 DOM 模擬器

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

        // 使用 cheerio 載入 HTML，完美支援類似瀏覽器的 DOM 操作
        const $ = cheerio.load(html);
        let allData = [];

        // 對應你在 F12 執行的邏輯
        $('a').each((i, el) => {
            let $a = $(el);
            let text = $a.text() + ($a.parent().text() || "");
            let href = $a.attr('href');

            if (text.includes('抽獎') && href) {
                let url = href;
                
                // 商品名稱抓取
                let productName = $a.closest('tr').find('td').text() || 
                                  $a.parent().find('div, span').text() || 
                                  '抽獎項目';
                productName = productName.split('\n')[0].replace('抽獎', '').trim();
                if (productName === '' || productName.length > 40) productName = '抽獎項目';

                // 暴力往上尋找最近的「縣市」名稱
                let currentCity = "未分類";
                let $parent = $a.parent();
                const targetCities = ['台北市', '新北市', '桃園市', '新竹市', '新竹縣', '台中市', '彰化縣', '雲林縣', '嘉義市', '台南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '基隆市', '苗栗縣', '南投縣'];

                for (let i = 0; i < 6; i++) {
                    if ($parent.length === 0) break;
                    let parentText = $parent.text() || "";
                    
                    let found = targetCities.find(c => parentText.includes(c));
                    if (found) {
                        let lines = parentText.split('\n');
                        let matchedLine = lines.find(l => l.includes(found) && l.length < 10);
                        if (matchedLine) {
                            currentCity = found;
                            break;
                        }
                    }
                    $parent = $parent.parent();
                }

                allData.push({ city: currentCity, url: url, name: productName });
            }
        });

        // 去除重複
        let uniqueMap = new Map();
        allData.forEach(item => uniqueMap.set(item.url, item));
        let uniqueList = Array.from(uniqueMap.values());

        if (uniqueList.length === 0) {
            console.log('⚠️ 沒有抓到任何資料，取消更新以保護舊檔案。');
            return;
        }

        console.log(`✅ 成功抓取 ${uniqueList.length} 筆資料！正在寫入 index.html...`);

        // 讀取並寫入 index.html
        let indexHtml = fs.readFileSync('index.html', 'utf8');
        let linksBody = uniqueList.map(item => `            { city: "${item.city}", url: "${item.url}", name: "${item.name}" }`).join(',\n');
        let newLinksBlock = `// START_OF_LINKS\n        const links = [\n${linksBody}\n        ];\n        // END_OF_LINKS`;

        let updatedHtml = indexHtml.replace(/\/\/ START_OF_LINKS[\s\S]*?\/\/ END_OF_LINKS/, newLinksBlock);
        fs.writeFileSync('index.html', updatedHtml, 'utf8');
        console.log('🎉 自動更新完成！');

    } catch (error) {
        console.error('❌ 執行發生錯誤:', error);
        process.exit(1);
    }
}

main();
