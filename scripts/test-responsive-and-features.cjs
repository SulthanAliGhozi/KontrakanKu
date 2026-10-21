const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = path.join(__dirname, '../test-screenshots');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('🚀 Starting Automated Responsive & Feature Testing with Brave...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/brave',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`⚠️ HTTP ${res.status()}:`, res.url());
    }
  });

  async function closeModal() {
    await page.evaluate(() => {
      const closeBtns = Array.from(document.querySelectorAll('button'));
      const xBtn = closeBtns.find(b => b.querySelector('svg.lucide-x') || b.getAttribute('aria-label') === 'close');
      if (xBtn) xBtn.click();
    });
    await page.keyboard.press('Escape');
    await sleep(500);
  }

  // Helper to log in as Super Admin
  async function performLogin() {
    console.log('Navigating to http://localhost:3000/login ...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    await page.waitForSelector('button', { timeout: 10000 });
    await sleep(500);

    // Find and click "Isi Otomatis"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const autoBtn = btns.find(b => b.innerText && b.innerText.includes('Isi Otomatis'));
      if (autoBtn) autoBtn.click();
    });
    console.log('Clicked "Isi Otomatis"');
    await sleep(500);

    // Click "Masuk ke Akun" submit button
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.click();
      } else {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText && b.innerText.includes('Masuk ke Akun'));
        if (btn) btn.click();
      }
    });
    console.log('Submitted login form');

    // Wait until URL is /dashboard and state is loaded
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 10000 });
    await sleep(2000); // let initial fetch finish
    console.log('Successfully navigated to Dashboard: ', page.url());
  }

  // 1. DESKTOP TEST (1440x900)
  console.log('\n--- 1. Testing DESKTOP Mode (1440x900) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await performLogin();

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'desktop-dashboard.png') });
  console.log('✅ Captured desktop-dashboard.png');

  // Open QRIS Modal from Header
  console.log('Testing QRIS Modal on Desktop...');
  const qrisClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => (b.innerText && b.innerText.includes('QRIS')) || (b.title && b.title.includes('QRIS')));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  if (qrisClicked) {
    await sleep(800);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'desktop-qris-modal.png') });
    console.log('✅ Captured desktop-qris-modal.png');
    await closeModal();
  } else {
    console.log('❌ Could not find QRIS button on Desktop Header');
  }

  // Open House Manager Modal (House switcher)
  console.log('Testing House Manager Modal on Desktop...');
  const houseClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => b.innerText && (b.innerText.includes('PILIH') || b.innerText.includes('MARKAS WARUNG')));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  if (houseClicked) {
    await sleep(800);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'desktop-house-manager.png') });
    console.log('✅ Captured desktop-house-manager.png');
    await closeModal();
  } else {
    console.log('❌ Could not find House Manager button on Desktop Header');
  }

  // Test Desktop Sidebar Navigation
  console.log('Testing Desktop Sidebar Navigation tabs...');
  const desktopTabs = [
    { name: 'Kebutuhan', id: 'kebutuhan' },
    { name: 'Keuangan', id: 'keuangan' },
    { name: 'Kalender', id: 'kalender' },
    { name: 'Pemeliharaan', id: 'pemeliharaan' },
    { name: 'Aktivitas & Rekap', id: 'aktivitas' },
    { name: 'Profil Akun', id: 'profil' },
    { name: 'Pengaturan Rumah', id: 'pengaturan' },
  ];

  for (const tab of desktopTabs) {
    const clicked = await page.evaluate((tabName) => {
      const btns = Array.from(document.querySelectorAll('aside button'));
      const btn = btns.find(b => b.innerText && b.innerText.includes(tabName));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, tab.name);

    if (clicked) {
      await sleep(600);
      const url = page.url();
      console.log(`  👉 Navigated to ${tab.name}: ${url}`);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, `desktop-${tab.id}.png`) });
    } else {
      console.log(`  ❌ Could not find sidebar button for ${tab.name}`);
    }
  }

  // 2. TABLET TEST (820x1180) - iPad Air Viewport
  console.log('\n--- 2. Testing TABLET Mode (820x1180) ---');
  await page.setViewport({ width: 820, height: 1180 });
  await sleep(600);

  // Navigate to Dashboard
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button, button'));
    const homeBtn = btns.find(b => b.innerText && (b.innerText.includes('Beranda') || b.innerText.includes('Dashboard')));
    if (homeBtn) homeBtn.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'tablet-dashboard.png') });
  console.log('✅ Captured tablet-dashboard.png');

  // Test Keuangan on Tablet
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const finBtn = btns.find(b => b.innerText && b.innerText.includes('Keuangan'));
    if (finBtn) finBtn.click();
  });
  await sleep(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'tablet-keuangan.png') });
  console.log('✅ Captured tablet-keuangan.png');

  // Check Tablet Horizontal Overflow
  const tabletOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }));
  console.log('Tablet horizontal overflow check:', tabletOverflow);

  // 3. MOBILE TEST (390x844) - iPhone 14 / modern phone
  console.log('\n--- 3. Testing MOBILE Mode (390x844) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await sleep(600);

  // Return to Dashboard on mobile
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const b = btns.find(b => b.innerText && (b.innerText.includes('Dashboard') || b.innerText.includes('Beranda')));
    if (b) b.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile-dashboard.png') });
  console.log('✅ Captured mobile-dashboard.png');

  // Test Mobile QRIS Modal
  console.log('Testing QRIS Modal on Mobile...');
  const mobileQrisClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => (b.title && b.title.includes('QRIS')) || (b.innerText && b.innerText.includes('QRIS')));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  if (mobileQrisClicked) {
    await sleep(800);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile-qris-modal.png') });
    console.log('✅ Captured mobile-qris-modal.png');
    await closeModal();
  }

  // Test Mobile House Manager Modal
  console.log('Testing House Manager Modal on Mobile...');
  const mobileHouseClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => b.innerText && (b.innerText.includes('PILIH') || b.innerText.includes('MARKAS WARUNG') || b.innerText.includes('MW')));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  if (mobileHouseClicked) {
    await sleep(800);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile-house-manager.png') });
    console.log('✅ Captured mobile-house-manager.png');
    await closeModal();
  }

  // Navigate to Kebutuhan on Mobile
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const b = btns.find(b => b.innerText && b.innerText.includes('Kebutuhan'));
    if (b) b.click();
  });
  await sleep(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile-kebutuhan.png') });
  console.log('✅ Captured mobile-kebutuhan.png');

  // Navigate to Kalender on Mobile
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const b = btns.find(b => b.innerText && b.innerText.includes('Kalender'));
    if (b) b.click();
  });
  await sleep(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile-kalender.png') });
  console.log('✅ Captured mobile-kalender.png');

  // Navigate to Keuangan on Mobile
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const b = btns.find(b => b.innerText && b.innerText.includes('Keuangan'));
    if (b) b.click();
  });
  await sleep(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile-keuangan.png') });
  console.log('✅ Captured mobile-keuangan.png');

  // Test Mobile "Lainnya" menu / drawer
  console.log('Testing Mobile "Lainnya" menu...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const b = btns.find(b => b.innerText && b.innerText.includes('Lainnya'));
    if (b) b.click();
  });
  await sleep(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile-lainnya-menu.png') });
  console.log('✅ Captured mobile-lainnya-menu.png');

  // Check horizontal overflow on mobile
  const mobileOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }));
  console.log('Mobile horizontal overflow check:', mobileOverflow);

  // Check overflowing elements
  const overflowingElements = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 2) {
        overflowing.push({
          tag: el.tagName,
          className: (el.className && typeof el.className === 'string') ? el.className.slice(0, 50) : '',
          id: el.id,
          right: Math.round(rect.right),
          width: Math.round(rect.width)
        });
      }
    });
    return overflowing.slice(0, 5);
  });
  if (overflowingElements.length > 0) {
    console.log('⚠️ Elements causing overflow on mobile:', overflowingElements);
  } else {
    console.log('✅ No overflowing elements detected on mobile!');
  }

  console.log('\nConsole Errors during entire session:');
  if (consoleErrors.length === 0) {
    console.log('None (0 errors) 🎉');
  } else {
    console.log(consoleErrors);
  }

  await browser.close();
  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
})();
