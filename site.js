/* ============================================================
   فكترة — موقع التسويق
   السلوك المشترك

   لا توجد مكتبات خارجية. الصفحة تُحمَّل على هاتف داخل الإمارات
   عبر شبكة عادية، وكل كيلوبايت من الشيفرة يُحمَّل قبل أن يرى
   الزائر السعر هو كيلوبايت يقلّل احتمال وصوله إليه.

   تبديل اللغة صار رابطًا إلى عنوان آخر (‎/ar/‎ و‎/en/‎) وليس
   إظهارًا وإخفاءً داخل الصفحة. النسختان في ملف واحد تعنيان أن
   محرك البحث يقرأ لغتين مختلطتين في مستند واحد، فلا يعرف أيهما
   يفهرس ولا يجد ‎hreflang‎ نظيفًا يربط بينهما.
   ============================================================ */

(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduced = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     الظهور عند التمرير

     يظهر العنصر مرة واحدة ثم تتوقف مراقبته. العناصر مخفية عبر
     الشيفرة لا عبر التنسيق، حتى إذا تعطّلت الشيفرة تبقى الصفحة
     مقروءة بالكامل بدلًا من أن تظهر بيضاء.
     ---------------------------------------------------------- */

  var reveals = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------
     عدّادات الأرقام

     تبدأ العدّ حين يظهر الرقم على الشاشة. القيمة النهائية مكتوبة
     في النص أصلًا، فإن تعطّلت الشيفرة رأى الزائر الرقم الصحيح لا
     صفرًا.
     ---------------------------------------------------------- */

  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && !reduced && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        co.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count'));
        var dur = 1100, t0 = performance.now();
        (function tick(now) {
          var p = Math.min(1, (now - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased).toLocaleString('en-US');
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------------------------------------------------------- */

  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ----------------------------------------------------------
     قائمة الهاتف

     كانت تُفتح ولا تُغلق إلا باختيار رابط منها: الضغط خارجها لا
     يفعل شيئًا، ومفتاح الهروب لا يفعل شيئًا، والصفحة تنزلق خلفها
     وهي مفتوحة فيبدو الأمر عطلًا لا قائمة. وإذا دار الجهاز إلى
     الوضع الأفقي بقيت الصفة `open` على عنصر عاد إلى شكل سطح
     المكتب.
     ---------------------------------------------------------- */

  var burger = document.querySelector('.burger');
  var links = document.querySelector('.nav-links');
  if (burger && links) {
    var setMenu = function (open) {
      links.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      // تثبيت الصفحة خلف القائمة، وإلا انزلق ما تحتها تحت الإصبع
      document.body.style.overflow = open ? 'hidden' : '';
    };

    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(!links.classList.contains('open'));
    });

    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });

    document.addEventListener('click', function (e) {
      if (!links.classList.contains('open')) return;
      if (!links.contains(e.target) && e.target !== burger) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });

    // العودة إلى عرض سطح المكتب تُنهي حالة القائمة، ومعها قفل التمرير
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 721px)');
      var onWide = function (m) { if (m.matches) setMenu(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide);
      else if (wide.addListener) wide.addListener(onWide);
    }
  }

  /* ----------------------------------------------------------
     البلد والدورة — مبدّلان، ودالة واحدة

     السعر تحدده حالتان: البلد (درهم أو جنيه) والدورة (شهري أو
     سنوي). لو كتب كل مبدّل السعر بنفسه، صار لدينا موضعان
     يحسبان الشيء نفسه — ويكفي أن ينسى أحدهما الآخر ليعرض
     المبدّلان حالتين مختلفتين على شاشة واحدة، فيرى الزائر
     «جنيه» فوق رقم بالدرهم. لا شيء في الصفحة كان سيشكو.

     فالمبدّلان يغيّران الحالة فقط، و‎apply‎ وحدها تكتب.
     ---------------------------------------------------------- */

  var body = document.body;
  var PRICED = document.querySelectorAll('[data-price]');

  var apply = function () {
    var c = body.getAttribute('data-country') || 'AE';
    var p = body.getAttribute('data-billing') || 'monthly';

    PRICED.forEach(function (el) {
      // العنصر معلَّم بـ‎data-price‎ والقيم في ‎data-ae-monthly‎
      // وأخواتها. استعمال العلامة نفسها قيمةً كان يعيد نصًا
      // فارغًا فيمحو السعر بدل أن يبدّله.
      var v = el.getAttribute('data-' + c.toLowerCase() + '-' + p);
      // ‎null‎ تعني أن السمة ناقصة على هذا العنصر. لا نكتب شيئًا:
      // محو السعر أسوأ من إبقائه قديمًا، و‎verify-site‎ هو ما
      // يمنع النقص من الوصول إلى النشر أصلًا.
      if (v !== null) el.textContent = v;
    });

    document.querySelectorAll('[data-cur]').forEach(function (el) {
      var v = el.getAttribute('data-' + c.toLowerCase());
      if (v !== null) el.textContent = v;
    });
  };

  var cycle = document.querySelector('[data-cycle]');
  if (cycle) {
    cycle.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-period]');
      if (!b) return;
      cycle.querySelectorAll('button').forEach(function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      body.setAttribute('data-billing', b.getAttribute('data-period'));
      apply();
    });
  }

  /* اختيار البلد يتبع الزائر بين الصفحات. من يختار مصر على صفحة
     الأسعار ثم يفتح الوثائق فيجدها تتحدث عن الإمارات يستنتج أن
     الاختيار لم يُسجَّل — أو أسوأ، أن الوثائق إماراتية فقط. */
  var KEY = 'faktra.country';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (err) { /* وضع خاص */ }
  if (stored === 'AE' || stored === 'EG') body.setAttribute('data-country', stored);

  var ctry = document.querySelector('[data-country-switch]');
  if (ctry) {
    var mark = function () {
      var c = body.getAttribute('data-country') || 'AE';
      ctry.querySelectorAll('button').forEach(function (x) {
        x.setAttribute('aria-pressed', String(x.getAttribute('data-country-to') === c));
      });
    };
    mark();

    ctry.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-country-to]');
      if (!b) return;
      var to = b.getAttribute('data-country-to');
      body.setAttribute('data-country', to);
      try { localStorage.setItem(KEY, to); } catch (err) { /* وضع خاص */ }
      mark();
      apply();
    });
  }

  // البلد المحفوظ قد يخالف ما هو مكتوب في الصفحة، فتُكتب القيم مرة
  // عند التحميل لا عند أول ضغطة.
  apply();

  /* ----------------------------------------------------------
     قائمة الوثائق الجانبية: إبراز القسم المعروض
     ---------------------------------------------------------- */

  var docLinks = document.querySelectorAll('[data-doc-nav] a');
  if (docLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    docLinks.forEach(function (a) {
      var id = a.getAttribute('href');
      if (id && id.charAt(0) === '#') map[id.slice(1)] = a;
    });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (!a || !en.isIntersecting) return;
        docLinks.forEach(function (x) { x.classList.remove('on'); });
        a.classList.add('on');
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) so.observe(s);
    });
  }
})();
