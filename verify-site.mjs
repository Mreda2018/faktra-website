/**
 * يشغّل صفحات الموقع في jsdom ويتحقق مما لا تراه العين.
 *
 * الغرض ليس «هل يُقرأ الملف» — المتصفح يجيب عن ذلك. الغرض هو ما
 * يمر بصمت ويظهر أمام الزائر أو أمام محرك البحث: رابط لا يصل،
 * صفحة بلا canonical، بيانات منظّمة لا تُحلَّل، لغة تسرّبت إلى
 * نسخة اللغة الأخرى، أو زر أسعار يمحو السعر بدل أن يبدّله.
 */
import { JSDOM } from 'jsdom';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pages = [
  ['ar', 'index.html'], ['ar', 'docs.html'], ['ar', 'pricing.html'],
  ['en', 'index.html'], ['en', 'docs.html'], ['en', 'pricing.html'],
];

let failures = 0;
const check = (name, cond, detail) => {
  if (cond) { console.log(`  ok    ${name}`); return; }
  failures += 1;
  console.error(`  FAIL  ${name}`);
  if (detail) console.error(`        ${detail}`);
};

/** حروف عربية — للتأكد أن نسخة الإنجليزية لم يتسرب إليها نص عربي */
const ARABIC = /[ء-ي]/;

/** بقايا العامية المصرية ككلمات مستقلة، لا كأجزاء من كلمات */
const DIALECT = ['مش', 'دلوقتي', 'عشان', 'علشان', 'بتاع', 'اللي', 'كده',
  'مفيش', 'إزاي', 'عايز', 'عاوز', 'لسه', 'كتير', 'أوي', 'بردو', 'محدش',
  'حاجة', 'خالص', 'دي', 'ده', 'أكتر', 'تلات', 'التاني', 'اتنين', 'الاتنين',
  'فلوس', 'بالظبط', 'أنهي', 'فين', 'يوريك', 'معاه', 'قوللي', 'كفاية'];

/**
 * قائمة الكلمات وحدها لا تكفي، وقد أثبتت ذلك: مرّت صفحتان فيهما
 * ١٦٤ موضعاً عامياً لأن العامية فيهما كانت في تصريف الأفعال لا في
 * مفرداتها. العلامة الفارقة هي باء المضارعة — «بيقول» و«بتشتغل»
 * و«بنحسب» — وهي بنية لا وجود لها في الفصحى إطلاقاً.
 *
 * فيما يلي كلمات فصيحة تبدأ بالحروف نفسها صدفةً، مثل «بيانات»
 * (باء الجر + اسم) و«بنسبة»، فتُستثنى صراحةً.
 */
const PRESENT_B = /(?<![ء-ي])ب[يتن][ء-ي]{2,}/g;
const B_OK = new Set(['بينما', 'بيانات', 'بياناتك', 'بياناتها', 'بياناتي',
  'بيان', 'بيئة', 'بينهما', 'بينهم', 'بيت', 'بيوت', 'بيّن', 'بيعة', 'بيعك',
  'بيعت', 'بنسبة', 'بنكية', 'بنكي', 'بنود', 'بند', 'بناء', 'بنفسها',
  'بنسخة', 'بتكلفته', 'بتقويم', 'بتاريخ', 'بتوفير', 'بتطبيق', 'بتحديد',
  'بتعيين', 'بتقديم', 'بتنسيق', 'بتسجيل', 'بتغيير', 'بتحويل', 'بتسليم',
  'بتوريد', 'بتصدير', 'بتحصيل', 'بنشاط', 'بنسب', 'بتوقيت']);

/**
 * أخطاء وُلدت من محاولة تحويل آلية سابقة استبدلت كلمة بكلمة دون
 * نظر في الجملة: «بس» صارت «غير أن» حيث لا تصلح، و«اللي» صارت
 * «الذي» مع مؤنث. النتيجة عربية مكسورة، وهي أسوأ من العامية.
 */
const BROKEN = [
  [/الذي\s+بت/, 'الذي + فعل مضارع مؤنث'],
  [/الذي\s+بي/, 'الذي + فعل بصيغة عامية'],
  [/شيء\s+أخرى/, 'شيء أخرى — عدم تطابق في التذكير'],
  [/غير أن\.\s*<\/strong>/, 'غير أن في نهاية جملة'],
  [/ليس\s+متأكد/, 'ليس متأكد — الصواب لست متأكداً'],
  [/كان\s+هي[ء-ي]/, 'كان + هيفعل — مستقبل عامي'],
];

for (const [lang, file] of pages) {
  const rel = join(lang, file);
  console.log(`\n${rel}`);

  const html = readFileSync(resolve(here, rel), 'utf8')
    .replace(/<link rel="stylesheet" href="\.\.\/site\.css">/,
      `<style>${readFileSync(resolve(here, 'site.css'), 'utf8')}</style>`)
    .replace(/<script src="\.\.\/site\.js"><\/script>/,
      `<script>${readFileSync(resolve(here, 'site.js'), 'utf8')}</script>`);

  const errors = [];
  const dom = new JSDOM(html, {
    url: `http://localhost/${rel}`, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.addEventListener('error', (e) => errors.push(String(e.error ?? e.message)));
      w.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
    },
  });
  const { document } = dom.window;

  check('تعمل دون أخطاء', errors.length === 0, errors.slice(0, 2).join(' · '));

  // ---- اللغة والاتجاه ----
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  check(`lang="${lang}" و dir="${dir}"`,
    document.documentElement.getAttribute('lang') === lang
    && document.documentElement.getAttribute('dir') === dir);

  // النص المرئي فقط
  const body = document.body.cloneNode(true);
  body.querySelectorAll('script,style').forEach((n) => n.remove());
  const text = body.textContent;

  if (lang === 'en') {
    // زر اللغة يحمل كلمة «ع» عمدًا، فيُستثنى
    const stray = text.replace(/ع/g, '');
    check('لا نص عربي تسرّب إلى النسخة الإنجليزية', !ARABIC.test(stray),
      (stray.match(/[ء-ي]{2,}/g) || []).slice(0, 4).join(' · '));
  } else {
    const found = DIALECT.filter((w) =>
      new RegExp(`(?<![\\u0621-\\u064A])${w}(?![\\u0621-\\u064A])`).test(text));
    check('لا مفردات عامية', found.length === 0, found.join(' · '));

    const bPrefix = [...new Set((text.match(PRESENT_B) || []).filter((w) => !B_OK.has(w)))];
    check('لا باء مضارعة عامية (بيقول، بتشتغل)', bPrefix.length === 0,
      bPrefix.slice(0, 12).join(' · '));

    const broken = BROKEN.filter(([re]) => re.test(text)).map(([, why]) => why);
    check('لا تراكيب مكسورة من تحويل آلي', broken.length === 0, broken.join(' · '));
  }

  // ---- بنية SEO ----
  const canonical = document.querySelector('link[rel=canonical]');
  check('يوجد canonical', Boolean(canonical),
    canonical ? '' : 'مفقود');

  const alts = [...document.querySelectorAll('link[rel=alternate][hreflang]')]
    .map((l) => l.getAttribute('hreflang'));
  check('hreflang يغطي ar و en و x-default',
    ['ar', 'en', 'x-default'].every((h) => alts.includes(h)), alts.join(','));

  const desc = document.querySelector('meta[name=description]');
  const dl = desc ? desc.getAttribute('content').length : 0;
  check(`وصف الصفحة بطول مناسب (${dl})`, dl >= 70 && dl <= 320, String(dl));

  check('عنوان الصفحة موجود وغير فارغ',
    Boolean(document.title && document.title.trim().length > 10), document.title);

  check('يوجد og:title و og:url',
    Boolean(document.querySelector('meta[property="og:title"]'))
    && Boolean(document.querySelector('meta[property="og:url"]')));

  // ---- البيانات المنظّمة ----
  const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
  check('يوجد JSON-LD', blocks.length > 0);
  for (const b of blocks) {
    let parsed = null;
    try { parsed = JSON.parse(b.textContent); } catch (e) { /* يظل null */ }
    check('JSON-LD صالح للتحليل', parsed !== null,
      parsed === null ? b.textContent.slice(0, 90) : '');
  }

  // ---- بنية دلالية ----
  const h1s = document.querySelectorAll('h1').length;
  check(`عنوان h1 واحد بالضبط (${h1s})`, h1s === 1, String(h1s));

  // ---- الروابط ----
  const bad = [];
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || /^(https?:|mailto:|tel:)/.test(href)) return;
    const [path, hash] = href.split('#');
    if (path) {
      const target = resolve(here, lang, path);
      if (!existsSync(target)) { bad.push(href); return; }
    }
    if (hash && !path && !document.getElementById(hash)) bad.push(href);
  });
  check('كل الروابط الداخلية تصل', bad.length === 0, bad.join(' · '));

  /* ---- التجاوب ----
   *
   * الخطأ الذي جعل الهاتف يعرض عمودين متلاصقين لم يكن في استعلام
   * الوسائط: الاستعلام كان مكتوبًا وصحيحًا، لكن الشبكة كانت
   * معرّفة داخل السمة `style` على العنصر نفسه، والسمة تسبق كل
   * قاعدة في ملف التنسيق. فالفحص هنا على المصدر لا على القاعدة.
   */
  const inlineGrid = [...document.querySelectorAll('[style*="grid-template-columns"]')]
    .map((el) => el.getAttribute('style'));
  check('لا شبكة أعمدة داخل سمة style', inlineGrid.length === 0,
    inlineGrid.slice(0, 2).join(' · '));

  // ‎max-width‎ هي الشكل المتجاوب لا المشكلة؛ المقصود ‎width‎ وحدها
  const inlineWidth = [...document.querySelectorAll('[style*="width:"]')]
    .map((el) => el.getAttribute('style'))
    .filter((s) => /(^|[;\s])width:\s*\d{3,}px/.test(s));
  check('لا عرض ثابت بالبكسل داخل سمة style', inlineWidth.length === 0,
    inlineWidth.slice(0, 2).join(' · '));

  check('يوجد زر قائمة للهاتف', Boolean(document.querySelector('.burger')));

  // ---- الظهور دون IntersectionObserver ----
  const hidden = [...document.querySelectorAll('.reveal')]
    .filter((el) => !el.classList.contains('in')).length;
  check('المحتوى يظهر حتى دون IntersectionObserver', hidden === 0, String(hidden));

  // ---- صفحة الأسعار ----
  if (file === 'pricing.html') {
    const amounts = () => [...document.querySelectorAll('[data-price]')]
      .map((el) => el.textContent.trim()).join(',');
    check('الأسعار الشهرية ظاهرة', amounts() === '199,499,899', amounts());
    document.querySelector('button[data-period="yearly"]')
      .dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    check('التبديل السنوي يبدّل الأرقام لا يمحوها',
      amounts() === '1,990,4,990,8,990', amounts());
    document.querySelector('button[data-period="monthly"]')
      .dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    check('والعودة للشهري تعيدها', amounts() === '199,499,899', amounts());
  }

  // ---- صفحة الوثائق ----
  if (file === 'docs.html') {
    const navLinks = document.querySelectorAll('[data-doc-nav] a').length;
    const sections = document.querySelectorAll('main.art section[id]').length;
    check(`لكل بند في القائمة قسم (${navLinks}/${sections})`, navLinks <= sections);
    check('أمثلة رقمية كافية',
      document.querySelectorAll('.ex').length >= 10,
      String(document.querySelectorAll('.ex').length));
  }

  dom.window.close();
}

// ---- ملفات الجذر ----
console.log('\nملفات الجذر');
for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt', 'pricing.md', 'index.html']) {
  check(`${f} موجود`, existsSync(resolve(here, f)));
}
const robots = readFileSync(resolve(here, 'robots.txt'), 'utf8');
for (const bot of ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Bingbot']) {
  const allowed = new RegExp(`User-agent: ${bot}\\s*\\nAllow: /`).test(robots);
  check(`${bot} مسموح له`, allowed);
}
check('robots يشير إلى sitemap', robots.includes('Sitemap: https://faktra.ae/sitemap.xml'));

/* ---- طبقة الهاتف في ملف التنسيق ---- */
const css = readFileSync(resolve(here, 'site.css'), 'utf8');
for (const [what, re] of [
  ['نقطة كسر للهاتف', /@media \(max-width: 720px\)/],
  ['الأعمدة تنهار على الشاشة الضيقة', /\.split[^{]*\{[^}]*grid-template-columns: 1fr/],
  ['الطفو يتوقف على الهاتف', /\.float \{ animation: none/],
  ['الجداول العريضة تُمرَّر لا تدفع الصفحة', /overflow-x: auto/],
  ['احترام تقليل الحركة', /prefers-reduced-motion/],
]) check(what, re.test(css));

const js = readFileSync(resolve(here, 'site.js'), 'utf8');
for (const [what, re] of [
  ['القائمة تُغلق بمفتاح الهروب', /Escape/],
  ['والضغط خارجها', /links\.contains\(e\.target\)/],
  ['والصفحة لا تنزلق خلفها', /body\.style\.overflow/],
]) check(what, re.test(js));

const sm = readFileSync(resolve(here, 'sitemap.xml'), 'utf8');
const locs = (sm.match(/<loc>/g) || []).length;
check(`sitemap يسرد الصفحات الست وملف الأسعار (${locs})`, locs === 7, String(locs));
check('sitemap يحمل hreflang', sm.includes('xhtml:link'));

console.log(failures === 0
  ? '\nكل فحوصات الموقع اجتازت'
  : `\n${failures} فحص أخفق`);
process.exit(failures === 0 ? 0 : 1);
