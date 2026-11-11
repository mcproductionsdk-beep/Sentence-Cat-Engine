import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium, devices } from 'playwright';

const root = new URL('../dist-preview/', import.meta.url);
const headers = await readFile(new URL('_headers', root), 'utf8');
const csp = headers.match(/Content-Security-Policy: (.+)/)[1];
const paths = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/engine/cat.js', ['engine/cat.js', 'text/javascript; charset=utf-8']],
  ['/engine/cat.css', ['engine/cat.css', 'text/css; charset=utf-8']],
]);
const server = createServer(async (request, response) => {
  const asset = paths.get(new URL(request.url, 'http://localhost').pathname);
  if (!asset) return response.writeHead(404).end();
  const [file, type] = asset;
  response.writeHead(200, { 'Content-Type': type, 'Content-Security-Policy': csp });
  response.end(await readFile(new URL(file, root)));
});
const browser = await chromium.launch({
  executablePath: process.env.CAT_CHROMIUM_PATH || undefined,
});
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const url = 'http://127.0.0.1:' + server.address().port;
  for (const [label, options] of [
    ['keyboard', { viewport: { width: 1280, height: 800 } }],
    ['touch', devices['Pixel 7']],
  ]) {
    const context = await browser.newContext(options);
    const errors = [];
    const external = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === url) return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.catSpeech = [];
      window.speechSynthesis.speak = utterance => {
        window.catSpeech.push([utterance.lang, utterance.text]);
        queueMicrotask(() => utterance.onend());
      };
    });
    const response = await page.goto(url + '/?autoplay=1#set=SABCDEFGH');
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('main').isVisible(), false);
    await page.getByRole('button', { name: 'Play sample' }).click();
    const verifyLayout = async () => {
      const layout = await page.evaluate(() => {
        const bar = document.querySelector('.actions');
        const buttons = [...bar.querySelectorAll('button')];
        const bounds = buttons.map(button => button.getBoundingClientRect());
        return {
          labels: buttons.map(button => button.innerText.replace(/[^\p{L}\s]/gu, '').trim()),
          oneRow: bounds.every(box => box.top === bounds[0].top && box.height >= 44 &&
            box.left >= 0 && box.right <= innerWidth),
          abovePrompt: bar.getBoundingClientRect().bottom <=
            document.querySelector('.panel').getBoundingClientRect().top,
          fits: document.querySelector('.game').getBoundingClientRect().height > 0 &&
            document.documentElement.scrollHeight <= innerHeight,
        };
      });
      assert.deepEqual(layout, {
        labels: ['PAUSE', 'RESTART', 'MAIN MENU', 'SOUND ON'],
        oneRow: true, abovePrompt: true, fits: true,
      });
    };
    await verifyLayout();
    if (label === 'touch') {
      for (const viewport of [{ width: 320, height: 568 }, { width: 740, height: 360 }]) {
        await page.setViewportSize(viewport);
        await verifyLayout();
      }
      await page.setViewportSize(options.viewport);
    }
    await page.getByRole('button', { name: 'Sound On' }).click();
    assert.equal(await page.getByRole('button', { name: 'Sound Off' }).getAttribute('aria-pressed'), 'false');
    await page.getByRole('button', { name: 'Sound Off' }).click();
    assert.equal(await page.getByRole('button', { name: 'Sound On' }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await page.evaluate(() => window.catSpeech), []);
    assert.equal(await page.locator('#grid .tile').count(), 9);
    assert.equal(await page.locator('#english').textContent(), 'I have many cats.');
    const move = async (word, correct = true) => {
      const [from, to] = await page.locator('#grid .tile').evaluateAll((tiles, [word, correct]) => [
        tiles.findIndex(tile => tile.classList.contains('player')),
        tiles.findIndex(tile => tile.classList.contains('reachable') &&
          (tile.querySelector('.word')?.textContent === word) === correct),
      ], [word, correct]);
      const directions = { '-3': ['ArrowUp', 0, -50], '3': ['ArrowDown', 0, 50],
        '-1': ['ArrowLeft', -50, 0], '1': ['ArrowRight', 50, 0] };
      const [key, x, y] = directions[to - from];
      if (label === 'keyboard') {
        await page.keyboard.press(key);
      } else {
        const grid = page.locator('#grid');
        await grid.evaluate((target, [x, y]) => {
          const start = new Touch({ identifier: 1, target, clientX: 100, clientY: 100 });
          const end = new Touch({ identifier: 1, target, clientX: 100 + x, clientY: 100 + y });
          target.dispatchEvent(new TouchEvent('touchstart', { touches: [start] }));
          target.dispatchEvent(new TouchEvent('touchend', { changedTouches: [end] }));
        }, [x, y]);
      }
    };
    await page.evaluate(() => {
      const overlay = document.querySelector('#overlay');
      const observer = new MutationObserver(() => {
        if (!overlay.hidden && overlay.querySelector('.nope')?.textContent === 'NOPE') {
          overlay.dataset.testSawNope = 'true';
          observer.disconnect();
        }
      });
      observer.observe(overlay, { attributes: true, attributeFilter: ['hidden'] });
    });
    await move('Yo', false);
    await page.waitForFunction(() => document.querySelector('#overlay').dataset.testSawNope === 'true');
    await page.waitForFunction(() => !busy);
    assert.match(await page.locator('#status').textContent(), /Wrong mouse/);
    for (const [index, word] of ['Yo', 'tengo', 'muchos', 'gatos'].entries()) {
      await move(word);
      await page.waitForFunction(step =>
        document.querySelectorAll('#sentence .done').length === step, index + 1);
      if (index < 3) await page.waitForFunction(() => !busy);
    }
    await page.waitForFunction(() => window.catSpeech.length === 5);
    assert.deepEqual(await page.evaluate(() => window.catSpeech), [
      ['es-ES', 'Yo'], ['es-ES', 'tengo'], ['es-ES', 'muchos'], ['es-ES', 'gatos'],
      ['es-ES', 'Yo tengo muchos gatos.'],
    ]);
    await page.getByRole('button', { name: 'Restart' }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByText('PAUSED', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Play sample' }).isVisible(), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await context.close();
    console.log(label + ' preview passed');
  }
} finally {
  await browser.close();
  server.close();
}
