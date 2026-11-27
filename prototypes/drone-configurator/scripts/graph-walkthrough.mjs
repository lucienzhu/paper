import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const origin = process.argv[2];
if (!origin) throw new Error('Supply the local workspace URL.');
const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true});
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('http') && (url.origin !== new URL(origin).origin || url.pathname.startsWith('/api/'))) {
      errors.push('Unexpected network request: ' + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  const card = title => page.locator('.react-flow__node').filter({has: page.getByRole('heading', {name: title, exact: true})});
  const design = page.locator('[data-step-kind=design]');
  const button = name => page.getByRole('button', {name, exact: true});
  const inspector = page.getByTestId('graph-inspector');
  const width = page.locator('[data-field="fuselage.fuselage_dimensions_mm.width"] input[type="number"]');
  const fit = () => button('适应全图').click();
  // 选中造型卡片，点它上方的「存为版本」。
  async function saveVersion(title) {
    await fit();
    await design.locator('.cv-head').click();
    await page.locator('[data-step-action=version]').click();
    await page.getByLabel('版本名称').fill(title);
    await button('保存版本').click();
    await card(title).waitFor({state: 'attached'});
  }
  // 从一张卡片右侧的加号拖一条线到另一张卡片。
  async function connect(from, to) {
    await fit();
    const a = await from.locator('.react-flow__handle.source').boundingBox(), b = await to.locator('.react-flow__handle.target').boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 - 20, b.y + b.height / 2, {steps: 6});
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {steps: 3});
    await page.mouse.up();
  }
  await page.goto(origin + '/#v=3');
  // 4.5.1 起没有 B2 案例画板（旧数据已移出）。
  assert.equal(await page.getByTestId('workflow-workspace').getAttribute('data-board-id'), 'project');

  const imagePath = fileURLToPath(new URL('../src/data/history/quad-guide.png', import.meta.url));
  await page.getByLabel('导入参考图片').setInputFiles(imagePath);
  await inspector.getByRole('heading', {name: 'quad-guide.png', exact: true}).waitFor();
  await connect(card('quad-guide.png'), design);
  await page.getByRole('status').filter({hasText: '已添加参考关系'}).waitFor();
  await page.locator('.gb-wire-label', {hasText: '手动引用'}).waitFor({state: 'attached'});
  assert.equal(await page.locator('.gb-wire-label', {hasText: '手动引用'}).count(), 1);
  await saveVersion('原始宽度');
  await design.locator('.cv-head').click();
  await page.locator('[data-tab="fuselage"]').click();
  const initialWidth = Number(await width.inputValue());
  const changedWidth = initialWidth < 195 ? initialWidth + 10 : initialWidth - 10;
  await width.fill(String(changedWidth));
  await width.blur();
  await saveVersion('改宽机身');
  await page.reload();
  await card('改宽机身').waitFor({state: 'attached'});
  await fit();
  await card('原始宽度').click();
  await inspector.getByText('改宽机身', {exact: true}).waitFor();
  await button('从此版本继续编辑').click();
  await page.locator('[data-testid=step-panel][data-panel-mode=design]').waitFor();
  await page.locator('[data-tab="fuselage"]').click();
  assert.equal(Number(await width.inputValue()), initialWidth);
  assert.equal(await card('改宽机身').count(), 1);
  // 研究详情里冻结一轮；回到画布，这一轮接在造型后面。展开留档后能看到它沿用的版本。
  await page.getByTestId('open-research').click();
  await page.locator('[data-handoff-tab=candidates]').click();
  await page.locator('[data-attempt-goal]').fill('软件检查 · 从原始宽度冻结');
  await page.locator('[data-freeze-attempt]').click();
  await page.locator('[data-attempt] option').first().waitFor({state: 'attached'});
  await page.locator('[data-step=canvas]').click();
  await card('软件检查 · 从原始宽度冻结').waitFor({state: 'attached'});
  assert.equal(await page.locator('.cv-card.is-research').count(), 0);
  await page.getByTestId('research-layer').click();
  await page.locator('.cv-card.is-research').first().waitFor({state: 'attached'});
  await page.locator('.gb-wire-label', {hasText: '沿用分支编辑'}).waitFor({state: 'attached'});
  assert.equal(await page.locator('.gb-wire-label', {hasText: '沿用分支编辑'}).count(), 1);
  assert.equal(await page.locator('.gb-wire-label', {hasText: '手动引用'}).count(), 1);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({projectImageImport: true,
    referencePersisted: true, restoredWidth: initialWidth, preservedWidthVersion: changedWidth, frozeFromRestoredVersion: true, modelCalls: 0}));
} finally {
  await browser.close();
}
