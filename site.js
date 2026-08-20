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
     تبديل الدورة الشهرية والسنوية في صفحة الأسعار
     ---------------------------------------------------------- */

  var cycle = document.querySelector('[data-cycle]');
  if (cycle) {
    cycle.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-period]');
      if (!b) return;
      var period = b.getAttribute('data-period');
      cycle.querySelectorAll('button').forEach(function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      // العنصر معلَّم بـ‎data-price‎ والقيمتان في ‎data-monthly‎
      // و‎data-yearly‎. استعمال إحداهما علامةً وقيمةً في آن واحد
      // كان يعيد نصًا فارغًا فيمحو السعر بدل أن يبدّله.
      document.querySelectorAll('[data-price]').forEach(function (el) {
        var v = el.getAttribute('data-' + period);
        if (v !== null) el.textContent = v;
      });
      document.body.setAttribute('data-billing', period);
    });
  }

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
