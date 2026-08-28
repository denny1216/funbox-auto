const fs = require('fs');
const puppeteer = require('puppeteer');

const TARGET_URL = 'https://uxux11.github.io/funbox-line/';

async function main() {
    let browser;
    try {
        console.log('🔄 正在啟動雲端無頭瀏覽器...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        console.log('🌐 正在連線至目標網頁...');
        await page.goto(TARGET_URL, { waitUntil: 'networkidle0', timeout: 60000 });

        console.log('🔍 正在執行精準抓取邏輯...');
        
        // 這段就是你親自驗證、最完美的 F12 抓取邏輯
        const uniqueList = await page.evaluate(() => {
            let allData = [];

            document.querySelectorAll('a').forEach(a => {
                let textContext = a.textContent + (a.parentElement ? a.parentElement.textContent : "");
                let href = a.getAttribute('href');

                if (textContext.includes('抽獎') && href && !href.includes('addFriend')) {
                    let url = href;
                    
                    let productName = a.closest('tr')?.querySelector('td')?.innerText || 
                                      a.parentElement.querySelector('div, span')?.innerText || 
                                      '抽獎項目';
                    productName = productName.split('\n')[0].replace('抽獎', '').trim();
                    if (productName === '' || productName.length > 40) productName = '抽獎項目';

                    let currentCity = "未分類";
                    let parent = a.parentElement;
                    const targetCities = ['台北市', '新北市', '桃園市', '新竹市', '新竹縣', '台中市', '彰化縣', '雲林縣', '嘉義市', '台南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '基隆市', '苗栗縣', '南投縣'];
                    
                    for (let i = 0; i < 6; i++) {
                        if (!parent) break;
                        let text = parent.innerText || "";
                        let found = targetCities.find(c => text.includes(c));
                        if (found) {
                            let lines = text.split('\n');
                            let matchedLine = lines.find(l => l.includes(found) && l.length < 10);
                            if (matchedLine) {
                                currentCity = found;
                                break;
                            }
                        }
                        parent = parent.parentElement;
                    }

                    allData.push({ city: currentCity, url: url, name: productName });
                }
            });

            // 去除重複
            let uniqueMap = new Map();
            allData.forEach(item => uniqueMap.set(item.url, item));
            return Array.from(uniqueMap.values());
        });

        if (!uniqueList || uniqueList.length === 0) {
            console.log('⚠️ 沒有抓到任何資料，取消更新以保護舊檔案。');
            return;
        }

        console.log(`✅ 成功抓取 ${uniqueList.length} 筆正確資料！正在寫入 index.html...`);

        // 讀取並寫入 index.html
        let indexHtml = fs.readFileSync('index.html', 'utf8');
        let linksBody = uniqueList.map(item => `            { city: "${item.city}", url: "${item.url}", name: "${item.name}" }`).join(',\n');
        let newLinksBlock = `// START_OF_LINKS\n        const links = [\n${linksBody}\n        ];\n        // END_OF_LINKS`;

        let updatedHtml = indexHtml.replace(/\/\/ START_OF_LINKS[\s\S]*?\/\/ END_OF_LINKS/, newLinksBlock);
        fs.writeFileSync('index.html', updatedHtml, 'utf8');
        console.log('🎉 網頁更新完畢！');

    } catch (error) {
        console.error('❌ 執行發生錯誤:', error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

main();
