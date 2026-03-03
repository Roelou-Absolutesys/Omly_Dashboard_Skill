/* ThingsBoard CE Custom HTML widget template (production-safe baseline) */

self.onInit = function () {
  const root = self.ctx.$container && self.ctx.$container[0] ? self.ctx.$container[0] : null;
  if (!root) return;

  self._els = {
    title: root.querySelector('#title'),
    status: root.querySelector('#statusValue'),
    rpm: root.querySelector('#rpmValue'),
    note: root.querySelector('#noteArea'),
    btnRefresh: root.querySelector('#btnRefresh')
  };

  self._state = {
    latest: Object.create(null),
    destroyed: false
  };

  // Title from widget settings if available
  try {
    const t = (self.ctx.settings && self.ctx.settings.title) ? String(self.ctx.settings.title) : 'Widget';
    if (self._els.title) self._els.title.textContent = t;
  } catch (e) {}

  self._onRefreshClick = function () {
    render();
    setNote('Refreshed');
  };

  if (self._els.btnRefresh) {
    self._els.btnRefresh.addEventListener('click', self._onRefreshClick, { passive: true });
  }

  render();
};

self.onDataUpdated = function () {
  if (self._state && self._state.destroyed) return;

  // Merge latest values from datasources
  // NOTE: TB shapes vary by widget type; keep defensive.
  try {
    const latest = extractLatest(self.ctx.data);
    self._state.latest = latest;
  } catch (e) {
    // keep last known good state
  }

  render();
};

self.onResize = function () {
  if (self._state && self._state.destroyed) return;
  // If you render charts, throttle here.
  render();
};

self.onDestroy = function () {
  if (self._state) self._state.destroyed = true;

  try {
    if (self._els && self._els.btnRefresh && self._onRefreshClick) {
      self._els.btnRefresh.removeEventListener('click', self._onRefreshClick);
    }
  } catch (e) {}
};

function render() {
  const els = self._els;
  const latest = (self._state && self._state.latest) ? self._state.latest : {};

  if (els.status) els.status.textContent = asText(latest.status, '—');
  if (els.rpm) els.rpm.textContent = asNumber(latest.rpm, 2, '—'); // example: 2 decimals
}

function setNote(msg) {
  if (!self._els || !self._els.note) return;
  self._els.note.textContent = String(msg || '');
}

function asText(v, fallback) {
  if (v === null || v === undefined) return fallback;
  const s = String(v);
  return s.length ? s : fallback;
}

function asNumber(v, decimals, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  if (typeof decimals === 'number') return n.toFixed(decimals);
  return String(n);
}

/**
 * Extract latest key-value pairs from TB widget data input.
 * This is intentionally defensive and supports common shapes.
 */
function extractLatest(ctxData) {
  const out = Object.create(null);

  if (!Array.isArray(ctxData)) return out;

  // Common: [{ dataKey: { name }, data: [[ts, value], ...] }, ...]
  for (const series of ctxData) {
    const keyName =
      series && series.dataKey && series.dataKey.name ? String(series.dataKey.name) :
      series && series.dataKey && series.dataKey.label ? String(series.dataKey.label) :
      null;

    if (!keyName) continue;

    const points = Array.isArray(series.data) ? series.data : [];
    if (!points.length) continue;

    const last = points[points.length - 1];
    // last could be [ts, val] or object
    const val = Array.isArray(last) ? last[1] : (last && last.value !== undefined ? last.value : undefined);

    out[keyName] = val;
  }

  return out;
}
