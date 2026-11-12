/* Конструктор букета с чеком заказа (идея «чека визита»): выбор -> строки чека -> итог -> сообщение в WhatsApp */
(function () {
  var root = document.querySelector('[data-k]'); if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var PHONE = '79000000000'; // демо-номер, на боевом сайте заменить
  var OCC = ['День рождения', 'Юбилей', 'Свидание', 'Годовщина', 'Выписка', 'Извинение', 'Просто так'];
  var SIZES = [{ n: 'В руку', p: 2900, d: '9 стеблей' }, { n: 'На стол', p: 4500, d: '19 стеблей' }, { n: 'Большой', p: 7900, d: '35 стеблей' }];
  var FLW = [{ n: 'Пионы', m: 25, img: 'peony' }, { n: 'Розы', m: 15, img: 'ranunculus' }, { n: 'Тюльпаны', m: -10, img: 'tulip' }, { n: 'Эустома', m: 20, img: 'eustoma' }, { n: 'Гвоздики', m: -15, img: 'carnation' }, { n: 'Нежный микс', m: 0, img: 'mix' }];
  var PACK = [{ n: 'Крафт', p: 0 }, { n: 'Прозрачная плёнка', p: 0 }, { n: 'Шляпная коробка', p: 900 }];
  var ADD = [{ n: 'Открытка', p: 150 }, { n: 'Стеклянная ваза', p: 600 }, { n: 'Конфеты', p: 450 }, { n: 'Бутоньерка', p: 350 }];
  var COMBO = { name: 'Комбо: ваза + открытка', off: 200 };
  var WAY = [{ n: 'Курьером', p: 350, d: 'интервал 2 часа' }, { n: 'Срочно за 90 минут', p: 650, d: 'сегодня' }, { n: 'Самовывоз', p: 0, d: 'ул. Кооперативная, 8' }];
  var st = { occ: 0, size: 1, flw: 0, pack: 0, add: { 0: false, 1: false, 2: false, 3: false }, day: 1, hour: 14, way: 0 };
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var MON = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
  function dayLabel(i) { var d = new Date(); d.setDate(d.getDate() + i); return [['Сегодня', 'Завтра', 'Послезавтра'][i], d.getDate() + ' ' + MON[d.getMonth()]]; }

  function chips(host, list, kind, multi) {
    var el = $(host); if (!el) return;
    list.forEach(function (it, i) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.dataset.i = i; b.dataset.kind = kind;
      var extra = it.d ? it.d : (it.p ? '+' + fmt(it.p) + ' ₽' : (typeof it.m === 'number' ? (it.m > 0 ? '+' + it.m + '%' : it.m < 0 ? it.m + '%' : '') : ''));
      if (kind === 'size') b.innerHTML = '<b>' + it.n + '</b><span>' + it.d + ' · ' + fmt(it.p) + ' ₽</span>';
      else b.innerHTML = '<span class="tick" aria-hidden="true"></span>' + (typeof it === 'string' ? it : it.n) + (extra ? ' <small>' + extra + '</small>' : '');
      b.addEventListener('click', function () {
        if (kind === 'add') st.add[i] = !st.add[i];
        else if (kind === 'occ') st.occ = i; else if (kind === 'size') st.size = i; else if (kind === 'flw') st.flw = i;
        else if (kind === 'pack') st.pack = i; else if (kind === 'way') { st.way = i; if (i === 1) st.day = 0; } else if (kind === 'day') st.day = i;
        render();
      });
      el.appendChild(b);
    });
  }
  chips('[data-k-occ]', OCC, 'occ'); chips('[data-k-size]', SIZES, 'size'); chips('[data-k-flw]', FLW, 'flw'); chips('[data-k-pack]', PACK, 'pack');
  chips('[data-k-add]', ADD, 'add'); chips('[data-k-way]', WAY, 'way');
  var dayEl = $('[data-k-day]');
  [0, 1, 2].forEach(function (i) {
    var l = dayLabel(i), b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.dataset.kind = 'day'; b.dataset.i = i;
    b.innerHTML = '<span class="tick" aria-hidden="true"></span>' + l[0] + ' <small>' + l[1] + '</small>';
    b.addEventListener('click', function () { st.day = i; if (st.way === 1 && i !== 0) st.way = 0; render(); }); dayEl.appendChild(b);
  });
  var hourEl = $('[data-k-hour]');
  for (var h = 9; h <= 21; h++) { var o = document.createElement('option'); o.value = h; o.textContent = 'к ' + h + ':00'; if (h === st.hour) o.selected = true; hourEl.appendChild(o); }
  hourEl.addEventListener('change', function () { st.hour = +hourEl.value; render(); });
  var card = $('[data-k-card]');
  card.addEventListener('input', function () { if (card.value.trim() && !st.add[0]) st.add[0] = true; render(); });

  var linesEl = $('[data-k-lines]'), totalEl = $('[data-k-total]'), photoEl = $('[data-k-photo]'), sendEl = $('[data-k-send]'), copyEl = $('[data-k-copy]'), capEl = $('[data-k-cap]');
  var shown = 0, raf = null, text = '';
  function tween(to) {
    if (raf) cancelAnimationFrame(raf);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { shown = to; totalEl.textContent = fmt(to) + ' ₽'; return; }
    var from = shown, t0 = null;
    (function step(ts) { if (!t0) t0 = ts; var k = Math.min((ts - t0) / 450, 1), e = 1 - Math.pow(1 - k, 3); shown = from + (to - from) * e; totalEl.textContent = fmt(shown) + ' ₽'; if (k < 1) raf = requestAnimationFrame(step); else { shown = to; totalEl.textContent = fmt(to) + ' ₽'; } })(performance.now());
  }
  function render() {
    root.querySelectorAll('button[data-kind]').forEach(function (b) {
      var k = b.dataset.kind, i = +b.dataset.i, on = k === 'add' ? st.add[i] : st[k] === i; b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var sz = SIZES[st.size], fl = FLW[st.flw], pk = PACK[st.pack], wy = WAY[st.way];
    var base = Math.round(sz.p * (100 + fl.m) / 100 / 10) * 10, sum = base, html = '', adds = [];
    html += '<li><span>Букет «' + sz.n + '» · ' + fl.n.toLowerCase() + '</span><span>' + fmt(base) + ' ₽</span></li>';
    if (pk.p) { sum += pk.p; html += '<li><span>' + pk.n + '</span><span>' + fmt(pk.p) + ' ₽</span></li>'; }
    ADD.forEach(function (a, i) { if (st.add[i]) { sum += a.p; adds.push(a.n.toLowerCase()); html += '<li><span>' + a.n + '</span><span>' + fmt(a.p) + ' ₽</span></li>'; } });
    if (st.add[0] && st.add[1]) { sum -= COMBO.off; html += '<li class="is-combo"><span>' + COMBO.name + '</span><span>−' + fmt(COMBO.off) + ' ₽</span></li>'; }
    if (wy.p) { sum += wy.p; html += '<li><span>Доставка · ' + wy.n.toLowerCase() + '</span><span>' + fmt(wy.p) + ' ₽</span></li>'; }
    else html += '<li><span>Самовывоз из мастерской</span><span>0 ₽</span></li>';
    linesEl.innerHTML = html; tween(sum);
    // картинка букета
    root.querySelectorAll('[data-k-img]').forEach(function (im) { im.classList.toggle('is-on', im.dataset.kImg === fl.img); });
    capEl.textContent = fl.n;
    // время
    var dl = dayLabel(st.day), when, photo;
    hourEl.disabled = st.way === 1; if (st.way === 1) { when = 'сегодня, в течение 90 минут'; photo = 'через 30 минут'; }
    else { when = dl[0].toLowerCase() + ', ' + dl[1] + ', к ' + st.hour + ':00'; photo = dl[0].toLowerCase() === 'сегодня' ? 'в ' + Math.max(st.hour - 1, 8) + ':00' : dl[1] + ', ' + (st.hour - 1) + ':00'; }
    photoEl.textContent = photo;
    // сообщение
    var msg = card.value.trim();
    text = 'Здравствуйте! Хочу заказать букет в «Амелии».\n' +
      'Повод: ' + OCC[st.occ] + '\n' +
      'Букет: «' + sz.n + '» (' + sz.d + '), ' + fl.n.toLowerCase() + ', упаковка: ' + pk.n.toLowerCase() + '\n' +
      (adds.length ? 'Добавить: ' + adds.join(', ') + '\n' : '') +
      (msg ? 'Текст открытки: «' + msg + '»\n' : '') +
      (st.way === 2 ? 'Самовывоз, ' : 'Доставка: ') + when + '\n' +
      'Сумма по чеку: ' + fmt(sum) + ' ₽';
    sendEl.href = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text);
  }
  copyEl.addEventListener('click', function () {
    var done = function () { copyEl.textContent = 'Скопировано'; setTimeout(function () { copyEl.textContent = 'Скопировать текст заказа'; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
  });
  render();
})();

/* меню: бургер на телефоне и подсветка текущего раздела */
(function () {
  var bar = document.querySelector('.bar'), burger = document.querySelector('.bar__burger'), links = [].slice.call(document.querySelectorAll('.bar__nav a'));
  if (!bar) return;
  function close() { bar.classList.remove('is-open'); if (burger) burger.setAttribute('aria-expanded', 'false'); }
  if (burger) burger.addEventListener('click', function () { var o = bar.classList.toggle('is-open'); burger.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  links.forEach(function (a) { a.addEventListener('click', close); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  document.addEventListener('click', function (e) { if (!bar.contains(e.target)) close(); });
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  function mark() {
    var y = window.innerHeight * 0.35, cur = -1;
    secs.forEach(function (s, i) { if (!s) return; var r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('is-active', i === cur); if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  window.addEventListener('scroll', mark, { passive: true }); window.addEventListener('resize', mark); mark();
})();