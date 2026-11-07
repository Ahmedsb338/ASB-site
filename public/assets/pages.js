/* Page controller for /app, /reset-password, /auth/callback, /download. No inline script, no third-party code. */
(function () {
  'use strict';
  var A = window.ASBAuth, CFG = window.ASB_CONFIG || {};
  var page = document.body.getAttribute('data-page');
  var APP_SCHEME = 'asbworkforce://';
  var T = {
    en: {
      appH: 'ASB Workforce app', appP: 'Check in and out, see your schedule and manage your team in the ASB Workforce mobile app.',
      open: 'Open the app', get: 'Download the app', noApp: 'Nothing happens? Install the app first.',
      rH: 'Set your password', rP: 'Choose a new password for your ASB Workforce account.', checking: 'Checking your link…',
      pw: 'New password', pw2: 'Confirm password', save: 'Save password', hint: 'At least 8 characters, with a letter and a number.',
      weak: 'Password must be at least 8 characters and include a letter and a number.', mismatch: 'Passwords do not match.',
      expired: 'This link has expired. Request a new one from the app.', invalid: 'This link is invalid or was already used.',
      done: 'Your password has been updated. You can now sign in to the app.', failed: 'Could not update the password. Request a new link and try again.',
      net: 'No connection. Check your internet and try again.', cfg: 'This page is not configured yet.',
      inApp: 'Continue in the app', code: 'Open this link in the ASB Workforce app to finish.',
      cH: 'Link received', confirmed: 'Your email has been confirmed. You can return to the app.', pending: 'Link accepted. Confirm the link sent to your other email address to finish the change.',
      dH: 'Download ASB Workforce', dAndroid: 'Android', dMeta: 'Version {v}, built {d}. Allow installs from this source when Android asks.',
      dNone: 'The Android download is being prepared. Please check back soon.', dIos: 'An iPhone version is not available yet.', dBtn: 'Download for Android',
      home: 'ASB Workforce home'
    },
    ar: {
      appH: 'تطبيق ASB Workforce', appP: 'سجّل الحضور والانصراف، واطّلع على جدولك وأدِر فريقك من تطبيق ASB Workforce.',
      open: 'فتح التطبيق', get: 'تحميل التطبيق', noApp: 'لم يحدث شيء؟ ثبّت التطبيق أولاً.',
      rH: 'تعيين كلمة المرور', rP: 'اختر كلمة مرور جديدة لحسابك في ASB Workforce.', checking: 'جارٍ التحقق من الرابط…',
      pw: 'كلمة المرور الجديدة', pw2: 'تأكيد كلمة المرور', save: 'حفظ كلمة المرور', hint: '٨ أحرف على الأقل، مع حرف ورقم.',
      weak: 'يجب ألا تقل كلمة المرور عن 8 أحرف وأن تتضمن حرفاً ورقماً.', mismatch: 'كلمتا المرور غير متطابقتين.',
      expired: 'انتهت صلاحية الرابط. اطلب رابطاً جديداً من التطبيق.', invalid: 'الرابط غير صالح أو تم استخدامه من قبل.',
      done: 'تم تحديث كلمة المرور. يمكنك الآن تسجيل الدخول إلى التطبيق.', failed: 'تعذّر تحديث كلمة المرور. اطلب رابطاً جديداً وحاول مجدداً.',
      net: 'لا يوجد اتصال. تحقق من الإنترنت وحاول مرة أخرى.', cfg: 'هذه الصفحة غير مهيأة بعد.',
      inApp: 'المتابعة في التطبيق', code: 'افتح هذا الرابط في تطبيق ASB Workforce لإكمال العملية.',
      cH: 'تم استلام الرابط', confirmed: 'تم تأكيد بريدك الإلكتروني. يمكنك العودة إلى التطبيق.', pending: 'تم قبول الرابط. أكّد الرابط المرسل إلى البريد الآخر لإكمال التغيير.',
      dH: 'تحميل ASB Workforce', dAndroid: 'أندرويد', dMeta: 'الإصدار {v}، تاريخ البناء {d}. اسمح بالتثبيت من هذا المصدر عندما يطلب أندرويد.',
      dNone: 'جارٍ تجهيز نسخة أندرويد. يرجى المحاولة لاحقاً.', dIos: 'نسخة آيفون غير متاحة بعد.', dBtn: 'تحميل لأندرويد',
      home: 'الصفحة الرئيسية'
    }
  };
  var lang = 'en';
  try { var s = localStorage.getItem('asb-landing-lang'); lang = (s === 'ar' || s === 'en') ? s : ((navigator.language || '').indexOf('ar') === 0 ? 'ar' : 'en'); } catch (e) { /* storage unavailable */ }

  var $ = function (id) { return document.getElementById(id); };
  var t = function (k) { return T[lang][k]; };
  var state = {}; // per-page runtime state (never persisted, never logged)

  function show(id, msgKey, kind) { var el = $(id); el.hidden = false; el.className = 'msg' + (kind ? ' ' + kind : ''); el.textContent = t(msgKey); }
  function setText() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
    var l = $('lang'); if (l) l.textContent = lang === 'ar' ? 'English' : 'العربية';
    if (state.render) state.render();
  }
  function appLink() { // custom-scheme link carrying the same fragment/query so the app can finish the flow on this device
    var path = page === 'reset' ? 'reset-password' : 'auth/callback';
    return APP_SCHEME + path + (state.search || '') + (state.hash || '');
  }

  var sbReady = function () { return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(CFG.supabaseUrl || '') && !!CFG.publishableKey && CFG.publishableKey.indexOf('PASTE') !== 0; };
  function sb(method, body) {
    return fetch(CFG.supabaseUrl + '/auth/v1/user', {
      method: method, cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { apikey: CFG.publishableKey, Authorization: 'Bearer ' + state.access, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
  }

  function initReset() {
    var cls = A.classify(A.parseParams(location.search, location.hash));
    state.search = location.search; state.hash = location.hash;
    if (cls.kind === 'session') state.access = cls.access;
    history.replaceState(null, '', location.pathname); // tokens must not linger in the address bar / history
    var form = $('form'); form.hidden = true;
    var status = 'checking';
    state.render = function () {
      if (status === 'checking') show('status', 'checking');
      else if (status === 'expired' || status === 'invalid' || status === 'net' || status === 'cfg') show('status', status, 'err');
      else if (status === 'done') show('status', 'done', 'ok');
      var a = $('inapp'); a.hidden = !(status === 'code'); a.href = appLink();
      if (status === 'code') show('status', 'code');
    };
    if (cls.kind === 'error') status = cls.reason;
    else if (cls.kind === 'code') status = 'code';                 // PKCE verifier lives on the device that asked for the reset -> hand over to the app
    else if (cls.kind !== 'session' || cls.type === 'signup' || cls.type === 'email_change' || cls.type === 'magiclink') status = 'invalid';
    else if (!sbReady()) status = 'cfg';
    if (status === 'checking') {
      sb('GET').then(function (r) { status = r.ok ? 'ready' : (r.status === 401 || r.status === 403 ? 'expired' : 'net'); finish(); }).catch(function () { status = 'net'; finish(); });
    } else finish();
    function finish() { form.hidden = status !== 'ready'; if (status === 'ready') $('status').hidden = true; state.render(); }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var p1 = $('pw').value, p2 = $('pw2').value, problem = A.passwordProblem(p1, p2);
      if (problem) { show('status', problem, 'err'); return; }
      $('go').disabled = true;
      sb('PUT', { password: p1 }).then(function (r) {
        if (r.ok) { status = 'done'; state.access = null; $('pw').value = ''; $('pw2').value = ''; form.hidden = true; $('inapp').hidden = false; $('inapp').href = APP_SCHEME; state.render(); }
        else { show('status', r.status === 401 ? 'expired' : 'failed', 'err'); $('go').disabled = false; }
      }).catch(function () { show('status', 'net', 'err'); $('go').disabled = false; });
    });
    setText();
  }

  function initCallback() {
    var cls = A.classify(A.parseParams(location.search, location.hash));
    state.search = location.search; state.hash = location.hash;
    if (cls.kind === 'session' && (cls.type === 'recovery' || cls.type === 'invite')) { // set/reset password happens on the dedicated page
      location.replace('/reset-password' + location.search + location.hash); return;
    }
    history.replaceState(null, '', location.pathname);
    state.render = function () {
      var a = $('inapp');
      if (cls.kind === 'error') { show('status', cls.reason, 'err'); a.hidden = true; }
      else if (cls.kind === 'session') { show('status', 'confirmed', 'ok'); a.hidden = false; a.href = APP_SCHEME; }  // tokens deliberately discarded: the website has no web session
      else if (cls.kind === 'pending') { show('status', 'pending', 'ok'); a.hidden = false; a.href = APP_SCHEME; }
      else if (cls.kind === 'code') { show('status', 'code'); a.hidden = false; a.href = appLink(); }
      else { show('status', 'invalid', 'err'); a.hidden = true; }
    };
    setText();
  }

  function initDownload() {
    var build = null;
    state.render = function () {
      var a = $('apk'), m = $('meta');
      if (!build) { a.hidden = true; m.textContent = t('dNone'); return; }
      a.hidden = false; a.href = build.url; a.rel = 'noopener';
      var d = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium' }).format(new Date(build.createdAt));
      m.textContent = t('dMeta').replace('{v}', build.version).replace('{d}', d);
    };
    setText();
    fetch('/latest.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (A.usableBuild(j)) build = j.android || j; state.render(); }).catch(function () { state.render(); });
  }

  if ($('lang')) $('lang').addEventListener('click', function () { lang = lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('asb-landing-lang', lang); } catch (e) { /* ignore */ } setText(); });
  if (page === 'reset') initReset(); else if (page === 'callback') initCallback(); else if (page === 'download') initDownload(); else setText();
})();
