self.onInit = function () {
  var ctx = self.ctx;
  var root = ctx && ctx.$container && ctx.$container[0];
  if (!root) return;

  var grid = root.querySelector('#pg-grid');
  var titleEl = root.querySelector('#pg-title');
  var subEl = root.querySelector('#pg-sub');
  var gateCountEl = root.querySelector('#pg-count-boomgates');
  var payCountEl = root.querySelector('#pg-count-paystations');
  var tabs = root.querySelectorAll('.pg-tab');
  var backBtn = root.querySelector('#pg-back');
  var activeView = 'boomgates';
  var tabHandlers = [];

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toNum(v, d) {
    var n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  function iso(v) {
    if (v === undefined || v === null || v === '') return null;
    var n = Number(v);
    if (Number.isFinite(n)) return n;
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  function boolish(v) {
    if (v === true || v === 1) return true;
    if (v === false || v === 0) return false;
    var s = String(v == null ? '' : v).toLowerCase().trim();
    if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
    if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
    return null;
  }

  function norm(v) {
    return String(v == null ? '' : v).trim().toLowerCase();
  }

  function compact(v) {
    return norm(v).replace(/[^a-z0-9]+/g, '');
  }

  function key(n) {
    return norm(n);
  }

  function getEntityRef(s, idx) {
    var id = null;
    var name = null;
    if (s && s.entityId) id = (typeof s.entityId === 'object' && s.entityId.id) ? s.entityId.id : s.entityId;
    if (!id && s && s.datasource && s.datasource.entity && s.datasource.entity.id) {
      id = (typeof s.datasource.entity.id === 'object' && s.datasource.entity.id.id) ? s.datasource.entity.id.id : s.datasource.entity.id;
    }
    if (!id && s && s.entity && s.entity.id) id = (typeof s.entity.id === 'object' && s.entity.id.id) ? s.entity.id.id : s.entity.id;
    if (s) name = s.entityName || (s.datasource && (s.datasource.entityName || s.datasource.name)) || (s.entity && s.entity.name) || null;
    if (!id && name) id = name;
    if (!id) id = 'entity_' + idx;
    if (!name) name = String(id);
    return { id: String(id), name: String(name) };
  }

  function lastPoint(data) {
    if (!Array.isArray(data) || !data.length) return null;
    var p = data[data.length - 1];
    if (Array.isArray(p)) return { ts: toNum(p[0], NaN), value: p[1] };
    if (p && typeof p === 'object') return { ts: toNum(p.ts, NaN), value: p.value !== undefined ? p.value : p.v };
    return null;
  }

  function value(v) {
    return v === undefined || v === null || v === '' ? '-' : String(v);
  }

  function displayTime(v, fallback) {
    var ms = iso(v);
    if (!ms) ms = fallback;
    if (!Number.isFinite(ms)) return '-';
    var d = new Date(ms);
    if (isNaN(d.getTime())) return '-';
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function statusText(d) {
    if (!d.recentTs) return 'Offline: no recent activity detected';
    var mins = Math.floor(Math.max(0, Date.now() - d.recentTs) / 60000);
    if (d.isOnline) return mins < 1 ? 'Online: active in the last minute' : 'Online: active ' + mins + ' min ago';
    if (mins < 120) return 'Offline: last active ' + mins + ' min ago';
    return 'Offline: last active ' + Math.floor(mins / 60) + ' hr ago';
  }

  function gateIcon() {
    return '<svg viewBox="0 0 64 40" width="30" height="20" aria-hidden="true"><rect x="6" y="27" width="10" height="9" rx="2" fill="#3f5872"/><rect x="48" y="27" width="10" height="9" rx="2" fill="#3f5872"/><rect x="10" y="14" width="44" height="6" rx="3" fill="#2c6fb2"/><rect x="13" y="20" width="4" height="11" fill="#2c6fb2"/><rect x="47" y="20" width="4" height="11" fill="#2c6fb2"/></svg>';
  }

  function paymentIcon() {
    return '<svg viewBox="0 0 64 40" width="30" height="20" aria-hidden="true"><rect x="12" y="6" width="40" height="28" rx="6" fill="#2c6fb2"/><rect x="18" y="12" width="28" height="5" rx="2" fill="#dff0ff"/><circle cx="23" cy="25" r="3" fill="#ffffff"/><circle cx="32" cy="25" r="3" fill="#ffffff"/><circle cx="41" cy="25" r="3" fill="#ffffff"/></svg>';
  }

  function detail(label, v, wide) {
    return '<div class="pg-detail' + (wide ? ' pg-detail-wide' : '') + '"><span class="pg-detail-label">' + esc(label) + '</span><span class="pg-detail-value" title="' + esc(value(v)) + '">' + esc(value(v)) + '</span></div>';
  }

  function setValue(target, k, v) {
    if (!k || v === null || v === undefined) return;
    target[k] = v;
  }

  function collect() {
    var rows = (ctx && ctx.data) || [];
    var map = {};
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var s = rows[i];
      if (!s || !s.dataKey) continue;
      var ref = getEntityRef(s, i);
      var item = map[ref.id];
      if (!item) {
        item = { id: ref.id, entityName: ref.name, fields: {}, attrs: {}, ts: {}, latestTs: null };
        map[ref.id] = item;
        out.push(item);
      }
      var dk = s.dataKey || {};
      var k = key(dk.name || dk.label);
      var t = key(dk.type);
      var pt = lastPoint(s.data);
      if (!pt) continue;
      if (Number.isFinite(pt.ts)) item.latestTs = item.latestTs === null ? pt.ts : Math.max(item.latestTs, pt.ts);
      if (t === 'entityfield') {
        setValue(item.fields, k, pt.value);
        if (k === 'name') item.entityName = value(pt.value);
      } else if (t === 'attribute') {
        setValue(item.attrs, k, pt.value);
      } else {
        setValue(item.ts, k, pt.value);
      }
    }

    var result = { boomgates: [], paystations: [] };
    for (var j = 0; j < out.length; j++) {
      var d = out[j];
      var attrDevice = compact(d.attrs.device);
      var attrType = norm(d.attrs.type);
      var tsType = norm(d.ts.type);
      var nameText = norm((d.attrs.name || d.fields.name || d.entityName || ''));
      var hasPaymentTelemetry = d.ts.amount !== undefined || d.ts.method !== undefined || d.ts.minutes !== undefined || d.ts.tid !== undefined;
      var group = '';
      if (attrDevice === 'boomgate' || attrDevice === 'boomgates') group = 'boomgates';
      else if (attrDevice === 'paystation' || attrDevice === 'paystations') group = 'paystations';
      else if (attrType.indexOf('paystation') !== -1 || attrType.indexOf('payment') !== -1) group = 'paystations';
      else if (attrType.indexOf('boomgate') !== -1 || attrType.indexOf('gate') !== -1) group = 'boomgates';
      else if (hasPaymentTelemetry || tsType.indexOf('paystation') !== -1 || tsType.indexOf('payment') !== -1) group = 'paystations';
      else if (nameText.indexOf('boomgate') !== -1 || nameText.indexOf(' gate') !== -1 || nameText.indexOf('gate ') !== -1) group = 'boomgates';

      if (group === 'paystations') {
        var payRecentTs = iso(d.attrs.lastactivitytime);
        if (!payRecentTs) payRecentTs = d.latestTs;
        var payActive = boolish(d.attrs.active);
        result.paystations.push({
          name: value(d.attrs.name || d.fields.name || d.entityName || 'Payment Paystation'),
          type: 'paystation',
          amount: d.ts.amount,
          method: d.ts.method,
          minutes: d.ts.minutes,
          transactionName: d.ts.name,
          tid: d.ts.tid,
          transactionTs: d.ts.ts,
          latestTs: d.latestTs,
          recentTs: payRecentTs,
          isOnline: payActive !== false && Number.isFinite(payRecentTs) && (Date.now() - payRecentTs) < 3600000
        });
      } else if (group === 'boomgates') {
        var recentTs = iso(d.attrs.lastactivitytime);
        if (!recentTs) recentTs = d.latestTs;
        var active = boolish(d.attrs.active);
        result.boomgates.push({
          name: value(d.attrs.name || d.fields.name || d.entityName || 'Unnamed Boomgate'),
          type: 'boomgate',
          recentTs: recentTs,
          isOnline: active !== false && Number.isFinite(recentTs) && (Date.now() - recentTs) < 3600000
        });
      }
    }
    result.boomgates.sort(function (a, b) { return a.name.localeCompare(b.name); });
    result.paystations.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return result;
  }

  function updateTabs(data) {
    if (gateCountEl) gateCountEl.textContent = String(data.boomgates.length);
    if (payCountEl) payCountEl.textContent = String(data.paystations.length);
    for (var i = 0; i < tabs.length; i++) {
      var selected = tabs[i].getAttribute('data-view') === activeView;
      tabs[i].classList.toggle('active', selected);
      tabs[i].setAttribute('aria-selected', selected ? 'true' : 'false');
    }
    if (titleEl) titleEl.textContent = activeView === 'boomgates' ? 'Parking Boomgates' : 'Parking Paystations';
    if (subEl) subEl.textContent = activeView === 'boomgates' ? 'Live boomgates in the selected building' : 'Latest paystation transactions in the selected building';
  }

  function render() {
    if (!grid) return;
    var data = collect();
    updateTabs(data);
    var items = data[activeView] || [];
    if (!items.length) {
      grid.innerHTML = '<div class="pg-empty">No ' + (activeView === 'boomgates' ? 'boomgates' : 'paystations') + ' found for this building.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var d = items[i];
      if (activeView === 'paystations') {
        var payDotClass = d.isOnline ? 'ok' : 'bad';
        html += '<div class="pg-item pg-payment"><div class="pg-icon">' + paymentIcon() + '</div><div class="pg-meta"><div class="pg-name-row"><div class="pg-name">' + esc(d.name) + '</div><span class="pg-dot ' + payDotClass + '" title="' + esc(statusText(d)) + '"></span></div><div class="pg-type">' + esc(d.type) + '</div><div class="pg-details">' + detail('Amount', d.amount, false) + detail('Method', d.method, false) + detail('Minutes', d.minutes, false) + detail('TID', d.tid, false) + detail('Name', d.transactionName, true) + detail('Transaction time', displayTime(d.transactionTs, d.latestTs), true) + '</div></div></div>';
      } else {
        var dotClass = d.isOnline ? 'ok' : 'bad';
        html += '<div class="pg-item"><div class="pg-icon">' + gateIcon() + '</div><div class="pg-meta"><div class="pg-name-row"><div class="pg-name">' + esc(d.name) + '</div><span class="pg-dot ' + dotClass + '" title="' + esc(statusText(d)) + '"></span></div><div class="pg-type">' + esc(d.type) + '</div></div></div>';
      }
    }
    grid.innerHTML = html;
  }

  function goBack() {
    try {
      if (!ctx || !ctx.stateController || typeof ctx.stateController.updateState !== 'function') return;
      var params = {};
      var store = window.__HVAC_V2_STATE__;
      if (store && store.building && store.building.id) {
        params.entityId = { entityType: store.building.entityType || 'ASSET', id: String(store.building.id) };
      }
      ctx.stateController.updateState('default', params, false);
    } catch (e) {}
  }

  if (backBtn) backBtn.addEventListener('click', goBack);
  for (var i = 0; i < tabs.length; i++) {
    (function (tab) {
      var handler = function () {
        var view = tab.getAttribute('data-view');
        if (view !== 'boomgates' && view !== 'paystations') return;
        activeView = view;
        render();
      };
      tab.addEventListener('click', handler);
      tabHandlers.push({ tab: tab, handler: handler });
    })(tabs[i]);
  }

  self.__state = { render: render };
  self.onDataUpdated = function () {
    if (self.__state && self.__state.render) self.__state.render();
  };
  self.onResize = function () {
    if (self.__state && self.__state.render) self.__state.render();
  };
  self.onDestroy = function () {
    if (backBtn) backBtn.removeEventListener('click', goBack);
    for (var i = 0; i < tabHandlers.length; i++) {
      tabHandlers[i].tab.removeEventListener('click', tabHandlers[i].handler);
    }
    tabHandlers = [];
    self.__state = null;
  };

  render();
};
