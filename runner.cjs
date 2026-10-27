const fs = require('fs');
const path = require('path');
const Module = require('module');
const root = process.env.UOOC_ENGINE;
let input = '';
process.stdin.on('data', b => input += b);
process.stdin.on('end', async () => {
  const options = JSON.parse(input);
  const config = require(path.join(root, 'utils/config.js'));
  for (const [key, value] of Object.entries(options.config)) if (value) config[key] = value;
  config.DATA_DIR = path.join(root, 'data', config.USERNAME);
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
  const browserModule = require(path.join(root, 'utils/browser.js'));
  const launch = browserModule.launchBrowser;
  let browser;
  browserModule.launchBrowser = async (...args) => {
    const result = await launch(...args);
    browser = result.browser;
    browser.on('disconnected', () => process.exit(0));
    return result;
  };
  process.on('SIGTERM', async () => { await browser?.close().catch(() => {}); process.exit(0); });
  const filename = path.join(root, 'utils/login.js');
  let source = fs.readFileSync(filename, 'utf8');
  source = source.replace('const MAX_CONCURRENT = 3;', `const MAX_CONCURRENT = ${options.concurrent};`);
  if (options.mode === 'scan') {
    source = source.replace('// 4. 并行学习课程', `
    const available = await page.locator('a:has-text("继续学习"), a:has-text("开始学习"), a:has-text("进入考试")').evaluateAll(links => links.map(link => {
      let card = link.parentElement;
      for (let i = 0; card && i < 6; i++, card = card.parentElement) {
        const heading = card.querySelector('h3, h4, h2, .course-name, .course-title');
        const courseLink = card.querySelector('a[href*="/home/course/"],a[href*="/home/learn/"]');
        const href = courseLink?.href || link.href;
        const match = href.match(/(?:course|learn(?:\\/new)?)\\/(\\d+)/);
        if (heading && match) return { id: match[1], name: heading.textContent.trim(), action: link.textContent.trim() };
      }
      return null;
    }).filter(Boolean));
    process.send?.({ courses: [...new Map(available.map(c => [c.id, c])).values()] });
    await browser.close(); return;
    // 4. 并行学习课程`);
  } else if (options.courses.length) {
    source = source.replace('// 4. 并行学习课程', `courseLinks = courseLinks.filter(link => ${JSON.stringify(options.courses)}.includes(link.match(/\\/course\\/(\\d+)/)?.[1]));\n    if (!courseLinks.length) { console.log('未找到指定课程，请核对课程 ID'); await browser.close(); return; }\n    // 4. 并行学习课程`);
  }
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(source, filename);
  try { await mod.exports.run(); await browser?.close(); } catch (e) { console.error(e.message); await browser?.close(); process.exitCode = 1; }
});
