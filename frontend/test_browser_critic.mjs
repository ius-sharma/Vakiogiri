import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/sharm/.gemini/antigravity/brain/5ec6e21d-bf3e-4744-a429-9fc49d9ed440/scratch/screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function runBrowserCritic() {
  console.log('--- STARTING BROWSER CRITIC AUDIT ---');
  
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  const testResults = {
    pageLoad: false,
    themeToggle: false,
    navCapsule: false,
    authModalTrigger: false,
    authModalSwitch: false,
    authModalBackdropDismiss: false,
    authModalEscDismiss: false,
    durationPills: false,
    urlValidation: false,
    errorStateRecovery: false,
    mobileResponsiveness: false,
    mobileDrawerCtas: false,
    mobileBackdropDismiss: false,
    consoleCleanliness: false,
  };

  const findings = [];

  try {
    // 1. Initial Page Load
    console.log('[1/8] Navigating to http://localhost:3000...');
    const t0 = Date.now();
    const response = await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    const loadTime = Date.now() - t0;
    console.log(`Page loaded in ${loadTime}ms with HTTP ${response.status()}`);

    if (response.status() === 200) {
      testResults.pageLoad = true;
    } else {
      findings.push(`Page returned non-200 status: ${response.status()}`);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_desktop_home_light.png') });

    // Check title
    const title = await page.title();
    console.log(`Page Title: "${title}"`);

    // 2. Theme Toggle Test
    console.log('[2/8] Testing Dark/Light Theme Toggle...');
    const themeBtn = page.locator('button[aria-label="Toggle theme"]');
    await themeBtn.click();
    await page.waitForTimeout(400);

    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log(`Dark mode active: ${isDark}, Body background: ${bodyBg}`);

    if (isDark) {
      testResults.themeToggle = true;
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_desktop_home_dark.png') });
    } else {
      findings.push('Theme toggle failed to add .dark class to <html>');
    }

    // Toggle back to light
    await themeBtn.click();
    await page.waitForTimeout(300);

    // 3. Navigation & Auth Modal Testing
    console.log('[3/8] Testing Navigation and Auth Modal...');
    // Click "My Clips" to see if unauthenticated guest triggers Auth Modal
    const myClipsBtn = page.locator('button:has-text("My Clips")');
    await myClipsBtn.click();
    await page.waitForTimeout(300);

    const modalVisible = await page.locator('text=Welcome back').isVisible();
    if (modalVisible) {
      testResults.authModalTrigger = true;
      console.log('Auth Modal opened successfully on protected route click');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_auth_modal_login.png') });
    } else {
      findings.push('Auth modal failed to open when unauthenticated user clicked My Clips');
    }

    // Switch to "Sign up" in modal
    const signUpTab = page.locator('button:text-is("Sign up")');
    await signUpTab.click();
    await page.waitForTimeout(200);
    const signupHeaderVisible = await page.locator('text=Create your account').isVisible();
    if (signupHeaderVisible) {
      testResults.authModalSwitch = true;
      console.log('Auth Modal switched tabs to "Sign up"');
    }

    // Test Escape key dismiss on modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const modalClosedByEsc = !(await page.locator('text=Create your account').isVisible());
    if (modalClosedByEsc) {
      testResults.authModalEscDismiss = true;
      console.log('Auth Modal dismissed by Escape key');
    } else {
      findings.push('Auth Modal failed to dismiss on Escape key press');
    }

    // Re-open modal via "Start for free" button
    const startForFreeBtn = page.locator('button:text-is("Start for free")').first();
    await startForFreeBtn.click();
    await page.waitForTimeout(300);

    // Test backdrop click dismiss
    const backdrop = page.locator('.fixed.inset-0.z-50');
    // Click at top-left corner (away from modal card)
    await backdrop.click({ position: { x: 20, y: 20 } });
    await page.waitForTimeout(300);
    const modalClosedByBackdrop = !(await page.locator('text=Create your account').isVisible());
    if (modalClosedByBackdrop) {
      testResults.authModalBackdropDismiss = true;
      console.log('Auth Modal dismissed by Backdrop click');
    } else {
      findings.push('Auth Modal failed to dismiss on outer backdrop click');
    }

    // 4. Hero Section & Duration Selector
    console.log('[4/8] Testing Duration Selector & Hero Input...');
    const btn60s = page.locator('button:text-is("60s")');
    await btn60s.click();
    await page.waitForTimeout(200);

    const btn60sClass = await btn60s.getAttribute('class');
    if (btn60sClass && btn60sClass.includes('bg-primary')) {
      testResults.durationPills = true;
      console.log('60s Duration Pill activated successfully');
    } else {
      findings.push('Duration pill failed to update active styling');
    }

    // Test Paste Button visibility & structure
    const pasteBtn = page.locator('button[title="Paste from clipboard"]');
    const pasteVisible = await pasteBtn.isVisible();
    console.log(`Paste button visible in input: ${pasteVisible}`);

    // 5. Invalid URL Validation & Error Recovery
    console.log('[5/8] Testing Input Validation & Error State Recovery...');
    const urlInput = page.locator('input[type="url"]').first();
    await urlInput.fill('https://www.google.com');
    
    const submitBtn = page.locator('button:text-is("Detect & Clip")').first();
    await submitBtn.click();
    await page.waitForTimeout(600);

    const errorVisible = await page.locator('text=Something went wrong').isVisible();
    const errorText = await page.locator('p:has-text("not a valid YouTube video link")').textContent().catch(() => '');
    
    if (errorVisible) {
      testResults.urlValidation = true;
      console.log(`Validation caught non-YouTube URL: "${errorText.trim()}"`);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_error_state_recovery.png') });
    } else {
      findings.push('Failed to catch non-YouTube URL validation');
    }

    // Test Error Recovery: Click "Back to Studio"
    const backToStudioBtn = page.locator('button:has-text("Back to Studio")');
    const backVisible = await backToStudioBtn.isVisible();
    if (backVisible) {
      await backToStudioBtn.click();
      await page.waitForTimeout(400);

      const studioRestored = await page.locator('h1:has-text("Turn any YouTube video into shorts")').isVisible();
      if (studioRestored) {
        testResults.errorStateRecovery = true;
        console.log('"Back to Studio" restored the idle generator canvas cleanly');
      } else {
        findings.push('"Back to Studio" button failed to restore Idle state');
      }
    } else {
      findings.push('Error state is missing "Back to Studio" recovery button');
    }

    // 6. Mobile Emulation & Hamburger Drawer
    console.log('[6/8] Emulating Mobile Viewport (390 x 844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_mobile_view.png') });

    // Check if input bar is clipped or squashed
    const inputBBox = await urlInput.boundingBox();
    console.log(`Mobile input bounding box width: ${inputBBox ? inputBBox.width : 0}px`);
    if (inputBBox && inputBBox.width > 200) {
      testResults.mobileResponsiveness = true;
      console.log('Mobile input container maintains full readable width');
    } else {
      findings.push('Mobile input box is severely compressed');
    }

    // Test Mobile Hamburger menu
    const hamburgerBtn = page.locator('button[aria-label="Toggle mobile menu"]');
    await hamburgerBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_mobile_drawer_open.png') });

    // Verify "Start for free" and "Log in" exist in mobile drawer
    const mobileSignup = page.locator('.z-50 button:text-is("Start for free")');
    const mobileLogin = page.locator('.z-50 button:text-is("Log in")');

    const hasSignup = await mobileSignup.isVisible();
    const hasLogin = await mobileLogin.isVisible();
    console.log(`Mobile drawer CTAs: Signup: ${hasSignup}, Login: ${hasLogin}`);

    if (hasSignup && hasLogin) {
      testResults.mobileDrawerCtas = true;
    } else {
      findings.push('Mobile drawer is missing signup or login CTA buttons');
    }

    // Test Mobile Escape key dismiss
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const drawerClosedByEsc = !(await mobileSignup.isVisible());
    if (drawerClosedByEsc) {
      testResults.mobileBackdropDismiss = true;
      console.log('Mobile drawer closed via Escape key');
    } else {
      findings.push('Mobile drawer failed to close via Escape key');
    }

    // 7. Console & Hydration Health
    console.log('[7/8] Checking Browser Console Health...');
    const relevantErrors = consoleErrors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('Failed to load resource') &&
      !err.includes('net::ERR_')
    );

    if (relevantErrors.length === 0) {
      testResults.consoleCleanliness = true;
      console.log('Console is clean: ZERO React hydration warnings, ZERO uncaught exceptions');
    } else {
      console.log('Console errors recorded:', relevantErrors);
      findings.push(`Console errors present: ${relevantErrors.join('; ')}`);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    findings.push(`Test execution threw exception: ${err.message}`);
  } finally {
    await browser.close();
  }

  // Calculate Scores
  console.log('\n--- EVALUATION SUMMARY ---');
  console.log(JSON.stringify(testResults, null, 2));

  let passedTests = Object.values(testResults).filter(Boolean).length;
  let totalTests = Object.keys(testResults).length;
  let rawScore = (passedTests / totalTests) * 10;
  
  console.log(`\nPassed Tests: ${passedTests} / ${totalTests}`);
  console.log(`Calculated Score: ${rawScore.toFixed(2)} / 10.0`);
  
  const reportPath = 'C:/Users/sharm/.gemini/antigravity/brain/5ec6e21d-bf3e-4744-a429-9fc49d9ed440/scratch/browser_critic_report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    testResults,
    findings,
    passedTests,
    totalTests,
    rawScore: rawScore.toFixed(2),
    passedThreshold: rawScore >= 8.5
  }, null, 2));

  console.log(`Report written to ${reportPath}`);
}

runBrowserCritic();
