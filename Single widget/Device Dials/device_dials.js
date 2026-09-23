self.onInit = function() {
    var ctx = self.ctx,
        root = ctx && ctx.$container && ctx.$container[
            0];
    if (!root) return;

    function toNum(v, d) {
        var n = Number(v);
        return Number.isFinite(n) ? n : d;
    }

    function esc(v) {
        return String(v == null ? '' : v).replace(/&/g,
                '&amp;').replace(/</g, '&lt;').replace(
                />/g, '&gt;').replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function boolish(v) {
        if (v === true || v === 1) return true;
        var s = String(v == null ? '' : v).toLowerCase()
            .trim();
        return s === '1' || s === 'true' || s ===
            'yes' || s === 'on';
    }

    function iso(v) {
        if (v === undefined || v === null || v === '')
            return null;
        var n = Number(v);
        if (Number.isFinite(n)) return n;
        var d = new Date(v);
        return isNaN(d.getTime()) ? null : d.getTime();
    }

    function getEntityRef(s, idx) {
        var id = null,
            name = null,
            type = null;
        if (s && s.entityId) id = (typeof s.entityId ===
                'object' && s.entityId.id) ? s.entityId
            .id : s.entityId;
        if (!id && s && s.datasource && s.datasource
            .entity && s.datasource.entity.id) id = (
                typeof s.datasource.entity.id ===
                'object' && s.datasource.entity.id.id) ?
            s.datasource.entity.id.id : s.datasource
            .entity.id;
        if (!id && s && s.entity && s.entity.id) id = (
                typeof s.entity.id === 'object' && s
                .entity.id.id) ? s.entity.id.id : s
            .entity.id;
        if (s) name = s.entityName || (s.datasource && (
            s.datasource.entityName || s
            .datasource.name)) || (s.entity && s
            .entity.name) || null;
        if (s && s.datasource && s.datasource
            .entityType) type = s.datasource.entityType;
        if (!id && name) id = name;
        if (!id) id = 'entity_' + idx;
        if (!name) name = String(id);
        return {
            id: String(id),
            name: String(name),
            entityType: type || 'DEVICE'
        };
    }

    function normalizeKey(k) {
        return String(k || '').trim().toLowerCase();
    }

    function lastPoint(data) {
        if (!Array.isArray(data) || !data.length)
        return null;
        var p = data[data.length - 1];
        if (Array.isArray(p)) return {
            ts: p[0],
            value: p[1]
        };
        if (p && typeof p === 'object') return {
            ts: p.ts,
            value: p.value !== undefined ? p.value :
                p.v
        };
        return null;
    }

    function seriesPoints(data) {
        var arr = Array.isArray(data) ? data : [];
        var out = [];
        for (var i = 0; i < arr.length; i++) {
            var p = arr[i];
            if (Array.isArray(p) && p.length > 1) {
                var ts = toNum(p[0], NaN),
                    v = toNum(p[1], NaN);
                if (Number.isFinite(ts) && Number
                    .isFinite(v)) out.push({
                    ts: ts,
                    value: v
                });
            } else if (p && typeof p === 'object') {
                var ts2 = toNum(p.ts, NaN),
                    v2 = toNum(p.value !== undefined ? p
                        .value : p.v, NaN);
                if (Number.isFinite(ts2) && Number
                    .isFinite(v2)) out.push({
                    ts: ts2,
                    value: v2
                });
            }
        }
        out.sort(function(a, b) {
            return a.ts - b.ts;
        });
        return out;
    }

    function getStore() {
        var w = window;
        if (!w.__HVAC_V2_STATE__) {
            w.__HVAC_V2_STATE__ = {
                building: null,
                device: null
            };
        }
        return w.__HVAC_V2_STATE__;
    }

    function emit(type, payload) {
        try {
            window.dispatchEvent(new CustomEvent(
                'HVAC_V2_SYNC', {
                    detail: {
                        type: type,
                        payload: payload ||
                            null,
                        ts: Date.now()
                    }
                }));
        } catch (e) {}
    }

    function subscribe(cb) {
        var fn = function(e) {
            cb((e && e.detail) || {});
        };
        window.addEventListener('HVAC_V2_SYNC', fn);
        return fn;
    }

    function clearSub(fn) {
        try {
            if (fn) window.removeEventListener(
                'HVAC_V2_SYNC', fn);
        } catch (e) {}
    }

    function issueLevel(active, lastTs, staleHrs) {
        var staleMs = Number(staleHrs || 6) * 3600000;
        var now = Date.now();
        var activeOk = boolish(active);
        if (!activeOk) return 'critical';
        if (lastTs && now - lastTs > staleMs)
        return 'warning';
        return 'healthy';
    }

    function levelRank(l) {
        return l === 'critical' ? 0 : (l === 'warning' ?
            1 : 2);
    }

    function updateState(ctx, targetState, target) {
        try {
            if (ctx && ctx.stateController && typeof ctx
                .stateController.updateState ===
                'function') {
                var params = {};
                if (target && target.id) {
                    params.entityId = {
                        entityType: (target
                            .entityType ||
                            'ASSET'),
                        id: String(target.id)
                    };
                }
                ctx.stateController.updateState(
                    targetState, params, false);
            }
        } catch (e) {}
    }

    function collectRows(ctx) {
        var rows = (ctx && ctx.data) || [];
        var map = {};
        var list = [];
        for (var i = 0; i < rows.length; i++) {
            var s = rows[i];
            if (!s || !s.dataKey) continue;
            var ref = getEntityRef(s, i);
            var item = map[ref.id];
            if (!item) {
                item = {
                    id: ref.id,
                    name: ref.name,
                    entityType: ref.entityType,
                    attrs: {},
                    vals: {},
                    series: {}
                };
                map[ref.id] = item;
                list.push(item);
            }
            var nameKey = normalizeKey(s.dataKey.name);
            var labelKey = normalizeKey(s.dataKey.label);
            var key = (nameKey === 'value' && labelKey) ?
                labelKey : (nameKey || labelKey);
            var pt = lastPoint(s.data);
            var dataKeyType = normalizeKey(s.dataKey.type);
            if (pt) {
                var target = dataKeyType === 'attribute' ? item.attrs :
                    item.vals;
                target[key] = pt.value;
                if (labelKey && labelKey !== key) target[
                    labelKey] = pt.value;
                if (nameKey && nameKey !== key && !(nameKey ===
                        'value' && labelKey)) target[
                    nameKey] = pt.value;
            }
            if (dataKeyType !== 'attribute') {
                item.series[key] = seriesPoints(s.data);
                if (labelKey && labelKey !== key) item.series[
                    labelKey] = item.series[key];
                if (nameKey && nameKey !== key && !(nameKey ===
                        'value' && labelKey)) item.series[
                    nameKey] = item.series[key];
            }
        }
        return list;
    }
    var grid = root.querySelector('#dg-grid');
    var store = getStore();
    var settings = ctx && ctx.settings ? ctx.settings :
    {};

    function toPct(v, d) {
        var n = Number(v);
        return Number.isFinite(n) ? Math.max(0, Math
            .min(100, n)) : d;
    }
    var defaultGreen = toPct(settings.greenBandPct, 55),
        defaultWarn = toPct(settings.warnBandPct, 80);
    if (defaultWarn < defaultGreen) defaultWarn =
        defaultGreen + 10;

    function first(vals, keys) {
        for (var i = 0; i < keys.length; i++) {
            var k = String(keys[i] || '').toLowerCase();
            if (vals[k] !== undefined && vals[k] !==
                null && vals[k] !== '') return vals[k];
        }
        return undefined;
    }

    function hasAny(vals, keys) {
        return first(vals, keys) !== undefined;
    }

    function numLike(v) {
        var n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    function isBinary(v) {
        var n = numLike(v);
        return n === 0 || n === 1;
    }

    function isStatusKey(k) {
        var s = normalizeKey(k);
        return s === 'value' || /(^|[^a-z0-9])(status|state|run|running|enable|enabled|alarm|fault|trip|start|stop|active|override|occupied|flow)([^a-z0-9]|$)/.test(
            s);
    }

    function cleanName(v) {
        return normalizeKey(v).replace(/[^a-z0-9]+/g, '');
    }

    function isPresenceSensor(vals, meta) {
        var attrs = (meta && meta.attrs) || {};
        var deviceAttr = cleanName(attrs.device);
        var typeAttr = cleanName(attrs.type);
        var hasValue = numLike(vals && vals.value) !== null;
        return hasValue && deviceAttr === 'sensor' &&
            (typeAttr === 'lighting' || typeAttr === 'light' ||
                typeAttr === 'sensor' || typeAttr === '');
    }

    function detectProfile(vals, meta) {
        var deviceName = cleanName(meta && meta.name);
        if (isPresenceSensor(vals, meta)) return 'sensor';
        if (deviceName.indexOf('secchwpumps') !== -1) return 'secchwpumps';
        if (deviceName.indexOf('sechwpumps') !== -1) return 'sechwpumps';
        if (deviceName.indexOf('lifts') !== -1) return 'lifts';
        if (deviceName.indexOf('chillerplant') !== -1) return 'chillerplant';
        if (deviceName.indexOf('mainplant') !== -1) return 'mainplant';
        if (deviceName.indexOf('domesticwater') !== -1) return 'domesticwater';
        if (deviceName.indexOf('basementfans') !== -1) return 'basementfans';
        if (deviceName.indexOf('lowerlevel') !== -1) return 'lowerlevel';
        if (deviceName.indexOf('transformerroom') !== -1) return 'transformerroom';
        if (deviceName.indexOf('patchrooms') !== -1) return 'patchrooms';
        if (deviceName.indexOf('serverroom') !== -1) return 'serverroom';
        if (deviceName.indexOf('upsroom') !== -1) return 'upsroom';
        if (deviceName.indexOf('p2rooffans') !== -1) return 'p2rooffans';
        if (deviceName.indexOf('rooffans') !== -1) return 'p1rooffans';
        if (hasAny(vals, ['chw supply temp',
                'chw return temp',
                'buffer tank temp',
                'sec.chw supply  pressure',
                'sec.chw return pressure',
                'output power',
                'sec.chw pump 1 run hours',
                'delta temp',
                'chilled water outlet temp'
            ])) return 'chiller';
        if (hasAny(vals, ['north 1 temp',
                'north 2 temp', 'south 1 temp',
                'south 2 temp', '2nd override'
            ])) return 'prde';
        if (hasAny(vals, ['current a', 'current b',
                'current c'
            ])) return 'ebo';
        if (hasAny(vals, ['supply air temp',
                'return air', 'air flow status'
            ])) return 'ahu';
        if (hasAny(vals, ['ahu runtime', 'ra temp']))
            return 'rtpu1';
        if (hasAny(vals, ['carbon dioxide',
                'room temp 1', 'room temp 2',
                'ave temp'
            ])) return 'rtpu2';
        if (hasAny(vals, ['cmf-f116 airflow text',
                'faf-a1 airflow text'
            ])) return 'ventfan1';
        if (hasAny(vals, ['tef-g011/g012 airflow text',
                'cef-g01 airflow text'
            ])) return 'ventfan2';
        if (hasAny(vals, [
                'chilled water return temperature 1',
                'chilled water supply temperature'
            ])) return 'chillerroof1';
        if (hasAny(vals, ['ll fournos water meter',
                'ul ocean basket water meter'
            ])) return 'watermeter';
        // Support both lowercase and capitalized channel keys
        var channelKeys = [];
        for (var i = 1; i <= 12; i++) {
            channelKeys.push('channel' + i);
            channelKeys.push('Channel' + i);
        }
        if (hasAny(vals, channelKeys)) return 'lights';
        if (hasAny(vals, ['value'])) {
            var vn = numLike(vals['value']);
            if (vn !== null && !isBinary(vn)) return 'sensor';
        }
        return 'generic';
    }

    function profileLabel(p) {
        if (p === 'chiller') return 'Chiller profile';
        if (p === 'prde') return 'PRDE profile';
        if (p === 'ebo') return 'EBO profile';
        if (p === 'ahu') return 'AHU profile';
        if (p === 'rtpu1') return 'RTPU 1 profile';
        if (p === 'rtpu2') return 'RTPU 2 profile';
        if (p === 'ventfan1')
        return 'Vent Fan 1 profile';
        if (p === 'ventfan2')
        return 'Vent Fan 2 profile';
        if (p === 'chillerroof1')
        return 'Chiller Roof 1 profile';
        if (p === 'watermeter')
        return 'Water Meter profile';
        if (p === 'sensor') return 'Motion Sensor';
        if (p === 'lights') return 'Light Controller';
        if (p === 'secchwpumps') return 'Secondary CHW Pumps';
        if (p === 'sechwpumps') return 'Secondary HW Pumps';
        if (p === 'lifts') return 'Lifts';
        if (p === 'chillerplant') return 'Chiller Plant';
        if (p === 'mainplant') return 'Main Plant';
        if (p === 'domesticwater') return 'Domestic Water';
        if (p === 'basementfans') return 'Basement Fans';
        if (p === 'lowerlevel') return 'Lower Level Fans';
        if (p === 'transformerroom') return 'Transformer Room';
        if (p === 'patchrooms') return 'Patch Rooms';
        if (p === 'serverroom') return 'Server Room';
        if (p === 'upsroom') return 'UPS Room';
        if (p === 'p1rooffans') return 'P1 Roof Fans';
        if (p === 'p2rooffans') return 'P2 Roof Fans';
        return 'Generic telemetry';
    }

    function norm(value, min, max) {
        var n = numLike(value);
        if (n === null) return 0;
        var span = (max - min) || 1;
        return Math.max(0, Math.min(100, ((n - min) /
            span) * 100));
    }

    function gaugeTone(n) {
        if (n >= defaultWarn) return 'bad';
        if (n >= defaultGreen) return 'warn';
        return 'good';
    }

    function specsFor(vals, meta) {
        var profile = detectProfile(vals, meta);
        var gauges = [],
            cards = [];

        function g(keys, label, unit, min, max,
            decimals, greenPct, warnPct) {
            var raw = first(vals, keys);
            if (raw === undefined) return;
            gauges.push({
                label: label,
                unit: unit || '',
                min: min,
                max: max,
                decimals: decimals,
                color: '#2c6fb2',
                value: raw,
                greenPct: toPct(greenPct,
                    defaultGreen),
                warnPct: toPct(warnPct,
                    defaultWarn)
            });
        }

        function c(keys, label, unit, color, kind, min,
            max) {
            var raw = first(vals, keys);
            if (raw === undefined) return;
            cards.push({
                label: label,
                unit: unit || '',
                color: color || '#c62828',
                kind: kind || 'number',
                value: raw,
                min: min,
                max: max
            });
        }
        if (profile === 'secchwpumps') {
            g(['sec.chw pumps control pressure',
                    'sec.chw supply  pressure',
                    'sec.chw supply pressure',
                    'supply pressure'
                ], 'Control Pressure', '', 0, 550, 0,
                50, 80);
            c(['sec.chw pump 1 run status'],
                'Pump 1 Run Status', '', '#2eaf62',
                'bool');
            c(['sec.chw pump 2 run status'],
                'Pump 2 Run Status', '', '#2eaf62',
                'bool');
        } else if (profile === 'sechwpumps') {
            g(['sec.hw pumps control pressure',
                    'sec.hw supply pressure',
                    'supply pressure'
                ], 'Control Pressure', '', 0, 550, 0,
                50, 80);
            c(['sec.hw pump 1 run status'],
                'Pump 1 Run Status', '', '#2eaf62',
                'bool');
            c(['sec.hw pump 2 run status'],
                'Pump 2 Run Status', '', '#2eaf62',
                'bool');
        } else if (profile === 'lifts') {
            c(['lift 1 alarm'], 'Lift 1 Alarm', '',
                '#c62828', 'bool');
            c(['lift 2 alarm'], 'Lift 2 Alarm', '',
                '#c62828', 'bool');
            c(['lift 3 alarm'], 'Lift 3 Alarm', '',
                '#c62828', 'bool');
            c(['lift 4 alarm'], 'Lift 4 Alarm', '',
                '#c62828', 'bool');
            c(['lift 5 alarm'], 'Lift 5 Alarm', '',
                '#c62828', 'bool');
            c(['lift 6 alarm'], 'Lift 6 Alarm', '',
                '#c62828', 'bool');
        } else if (profile === 'chillerplant') {
            c(['chiller 1 alarm'], 'Chiller 1 Alarm',
                '', '#c62828', 'bool');
            c(['chiller 2 alarm'], 'Chiller 2 Alarm',
                '', '#c62828', 'bool');
            c(['chiller 3 alarm'], 'Chiller 3 Alarm',
                '', '#c62828', 'bool');
            g(['common chw return temp'],
                'Common CHW Return Temp', 'C', 0, 40,
                2, 45, 75);
            g(['common chw supply temp'],
                'Common CHW Supply Temp', 'C', 0, 40,
                2, 45, 75);
            g(['common hw return temp'],
                'Common HW Return Temp', 'C', 0, 70,
                2, 45, 75);
            g(['common hw supply temp'],
                'Common HW Supply Temp', 'C', 0, 70,
                2, 45, 75);
        } else if (profile === 'mainplant') {
            c(['chiller 1 alarm'], 'Chiller 1 Alarm',
                '', '#c62828', 'bool');
            c(['chiller 2 alarm'], 'Chiller 2 Alarm',
                '', '#c62828', 'bool');
            c(['chiller 3 alarm'], 'Chiller 3 Alarm',
                '', '#c62828', 'bool');
            c(['chiller 4 alarm'], 'Chiller 4 Alarm',
                '', '#c62828', 'bool');
            g(['common chw return temp'],
                'Common CHW Return Temp', 'C', 0, 40,
                2, 45, 75);
            g(['common chw supply temp'],
                'Common CHW Supply Temp', 'C', 0, 40,
                2, 45, 75);
            g(['common hw return temp'],
                'Common HW Return Temp', 'C', 0, 70,
                2, 45, 75);
            g(['common hw supply temp'],
                'Common HW Supply Temp', 'C', 0, 70,
                2, 45, 75);
            g(['outside air humidity'], 'Outside Air Humidity',
                '%', 0, 100, 1, 45, 75);
            g(['outside air temp'], 'Outside Air Temp',
                'C', 0, 50, 1, 45, 80);
        } else if (profile === 'domesticwater') {
            g(['domestic water tank volume'],
                'Domestic Water Tank Volume', '', 0,
                100000, 0, 55, 85);
            c(['domestic wtaer pump 2.1 trip',
                    'domestic water pump 2.1 trip'
                ], 'Pump 2.1 Trip', '', '#c62828',
                'bool');
            c(['domestic wtaer pump 2.2 trip',
                    'domestic water pump 2.2 trip'
                ], 'Pump 2.2 Trip', '', '#c62828',
                'bool');
            c(['domestic wtaer pump 2.3 trip',
                    'domestic water pump 2.3 trip'
                ], 'Pump 2.3 Trip', '', '#c62828',
                'bool');
            c(['domestic wtaer pump 2.4 trip',
                    'domestic water pump 2.4 trip'
                ], 'Pump 2.4 Trip', '', '#c62828',
                'bool');
        } else if (profile === 'basementfans') {
            c(['pef 1 - parking extraction fan run status'],
                'PEF 1 Run Status', '', '#2eaf62',
                'bool');
            c(['pef 1 - parking extraction fan trip status'],
                'PEF 1 Trip Status', '', '#c62828',
                'bool');
            c(['pef 2 - parking extraction fan run status'],
                'PEF 2 Run Status', '', '#2eaf62',
                'bool');
            c(['pef 2 - parking extraction fan trip status'],
                'PEF 2 Trip Status', '', '#c62828',
                'bool');
            c(['pef 3 - parking extraction fan run status'],
                'PEF 3 Run Status', '', '#2eaf62',
                'bool');
            c(['pef 3 - parking extraction fan trip status'],
                'PEF 3 Trip Status', '', '#c62828',
                'bool');
            c(['spf 2 - staircase pressurization fan run status'],
                'SPF 2 Run Status', '', '#2eaf62',
                'bool');
            c(['spf 2 - staircase pressurization fan trip status'],
                'SPF 2 Trip Status', '', '#c62828',
                'bool');
            c(['spf 3 - staircase pressurization fan run status'],
                'SPF 3 Run Status', '', '#2eaf62',
                'bool');
            c(['spf 3 - staircase pressurization fan trip status'],
                'SPF 3 Trip Status', '', '#c62828',
                'bool');
            c(['spf 4 - staircase pressurization fan run status'],
                'SPF 4 Run Status', '', '#2eaf62',
                'bool');
            c(['spf 4 - staircase pressurization fan trip status'],
                'SPF 4 Trip Status', '', '#c62828',
                'bool');
        } else if (profile === 'lowerlevel') {
            c(['retail fan run status'], 'Retail Fan Run Status',
                '', '#2eaf62', 'bool');
            c(['retail fan trip status'], 'Retail Fan Trip Status',
                '', '#c62828', 'bool');
            c(['spf 1 - staircase pressurization fan 1 run status',
                    'spf 1 - staircase pressurization run status',
                    'spf 1 - staircase pressurization fan run status'
                ], 'SPF 1 Run Status', '', '#2eaf62',
                'bool');
            g(['spf 1 - staircase pressurization fan 1 static pressure',
                    'spf 1 - staircase pressurization fan static pressure'
                ], 'SPF 1 Static Pressure', '', 0, 10,
                1, 50, 80);
            c(['spf 1 - staircase pressurization fan 1 trip status',
                    'spf 1 - staircase pressurization trip status'
                ], 'SPF 1 Trip Status', '', '#c62828',
                'bool');
            c(['spf 2 - staircase pressurisation fan 2 run status',
                    'spf 2 - staircase pressurization fan 2 south run status'
                ], 'SPF 2 Run Status', '', '#2eaf62',
                'bool');
            g(['spf 2 - staircase pressurisation fan 2 static pressure',
                    'spf 2 - staircase pressurization fan 2 south static pressure'
                ], 'SPF 2 Static Pressure', '', 0, 10,
                1, 50, 80);
            c(['spf 2 - staircase pressurisation fan 2 trip status',
                    'spf 2 - staircase pressurization fan 2 south trip status'
                ], 'SPF 2 Trip Status', '', '#c62828',
                'bool');
            c(['spf 3 - staircase pressurisation fan 3 run status'],
                'SPF 3 Run Status', '', '#2eaf62',
                'bool');
            g(['spf 3 - staircase pressurisation fan 3 static pressure'],
                'SPF 3 Static Pressure', '', 0, 10, 1,
                50, 80);
            c(['spf 3 - staircase pressurization fan trip status'],
                'SPF 3 Trip Status', '', '#c62828',
                'bool');
        } else if (profile === 'transformerroom') {
            c(['transformer 1 bucholtz trip'],
                'Transformer 1 Bucholtz Trip', '',
                '#c62828', 'bool');
            c(['transformer 1 temp alarm'],
                'Transformer 1 Temp Alarm', '',
                '#c62828', 'bool');
            c(['transformer 2 bucholtz trip'],
                'Transformer 2 Bucholtz Trip', '',
                '#c62828', 'bool');
            c(['transformer 2 temp alarm'],
                'Transformer 2 Temp Alarm', '',
                '#c62828', 'bool');
            c(['transformer room extraction fan run status'],
                'Extraction Fan Run Status', '',
                '#2eaf62', 'bool');
            c(['transformer room extraction fan trip status'],
                'Extraction Fan Trip Status', '',
                '#c62828', 'bool');
            g(['transformer room space temperature'],
                'Transformer Room Space Temperature', 'C',
                0, 50, 2, 45, 80);
        } else if (profile === 'patchrooms') {
            g(['ground floor patch room temperature'],
                'Ground Floor Patch Room Temperature',
                'C', 0, 50, 2, 45, 80);
            g(['1st floor patch room temperature'],
                '1st Floor Patch Room Temperature', 'C',
                0, 50, 2, 45, 80);
            g(['2nd floor patch room temperature'],
                '2nd Floor Patch Room Temperature', 'C',
                0, 50, 2, 45, 80);
            g(['3rd floor patch room temperature'],
                '3rd Floor Patch Room Temperature', 'C',
                0, 50, 2, 45, 80);
            g(['4th floor patch room temperature'],
                '4th Floor Patch Room Temperature', 'C',
                0, 50, 2, 45, 80);
            g(['5th floor patch room temperature'],
                '5th Floor Patch Room Temperature', 'C',
                0, 50, 2, 45, 80);
            g(['6th floor patch room temperature'],
                '6th Floor Patch Room Temperature', 'C',
                0, 50, 2, 45, 80);
            c(['chiller 1 alarm status',
                    'chiller 1 alarm'
                ], 'Chiller 1 Alarm Status', '',
                '#c62828', 'bool');
            g(['common chw return temperature',
                    'common chw return temp'
                ], 'Common CHW Return Temperature',
                'C', 0, 40, 2, 45, 75);
            g(['common chw supply temperature',
                    'common chw supply temp'
                ], 'Common CHW Supply Temperature',
                'C', 0, 40, 2, 45, 75);
            c(['sec.chw pump 1 run status'],
                'Sec.CHW Pump 1 Run Status', '',
                '#2eaf62', 'bool');
            c(['sec.chw pump 2 run status'],
                'Sec.CHW Pump 2 Run Status', '',
                '#2eaf62', 'bool');
        } else if (profile === 'serverroom') {
            c(['leak detection sensor 1'],
                'Leak Detection Sensor 1', '',
                '#c62828', 'bool');
            c(['leak detection sensor 2'],
                'Leak Detection Sensor 2', '',
                '#c62828', 'bool');
            g(['server room temp 1'], 'Server Room Temp 1',
                'C', 0, 50, 2, 45, 80);
            g(['server room temp 2'], 'Server Room Temp 2',
                'C', 0, 50, 2, 45, 80);
        } else if (profile === 'upsroom') {
            g(['battery room space temp sensor'],
                'Battery Room Space Temp Sensor', 'C',
                0, 50, 2, 45, 80);
            g(['ups room space temp sensor'],
                'UPS Room Space Temp Sensor', 'C',
                0, 50, 2, 45, 80);
        } else if (profile === 'p1rooffans') {
            c(['fa - 3rd floor fresh air fan run statsus'],
                'FA 3rd Floor Run Status', '',
                '#2eaf62', 'bool');
            c(['fa - 3rd floor fresh air fan trip statsus'],
                'FA 3rd Floor Trip Status', '',
                '#c62828', 'bool');
            c(['fa - fresh air fan north block run status'],
                'FA North Block Run Status', '',
                '#2eaf62', 'bool');
            c(['fa - fresh air fan north block trip status'],
                'FA North Block Trip Status', '',
                '#c62828', 'bool');
            c(['fa - fresh air fan south run status'],
                'FA South Run Status', '',
                '#2eaf62', 'bool');
            g(['fa - fresh air fan south staitc pressure',
                    'fa - fresh air fan south static pressure'
                ], 'FA South Static Pressure', '',
                0, 10, 2, 50, 80);
            c(['fa - fresh air fan south trip status'],
                'FA South Trip Status', '',
                '#c62828', 'bool');
            c(['kef - 3rd floor kitchen extraction fan run status'],
                'KEF 3rd Floor Run Status', '',
                '#2eaf62', 'bool');
            c(['kef - 3rd floor kitchen extraction fan trip status'],
                'KEF 3rd Floor Trip Status', '',
                '#c62828', 'bool');
            c(['kef 1 - grill house kitchen extraction fan run status'],
                'KEF 1 Run Status', '', '#2eaf62',
                'bool');
            c(['kef 1 - grill house kitchen extraction fan trip status'],
                'KEF 1 Trip Status', '', '#c62828',
                'bool');
            c(['kef 2 - grill house kitchen extraction fan run status'],
                'KEF 2 Run Status', '', '#2eaf62',
                'bool');
            c(['kef 2 - grill house kitchen extraction fan trip status'],
                'KEF 2 Trip Status', '', '#c62828',
                'bool');
            c(['spf 1 - staircase pressurization run status'],
                'SPF 1 Run Status', '', '#2eaf62',
                'bool');
            g(['spf 1 - staircase pressurization static pressure'],
                'SPF 1 Static Pressure', '', 0, 10,
                2, 50, 80);
            c(['spf 1 - staircase pressurization trip status'],
                'SPF 1 Trip Status', '', '#c62828',
                'bool');
            c(['spf 2 - staircase pressurization fan 2 south run status'],
                'SPF 2 South Run Status', '',
                '#2eaf62', 'bool');
            g(['spf 2 - staircase pressurization fan 2 south static pressure'],
                'SPF 2 South Static Pressure', '', 0,
                50, 2, 50, 80);
            c(['spf 2 - staircase pressurization fan 2 south trip status'],
                'SPF 2 South Trip Status', '',
                '#c62828', 'bool');
            c(['tef - toilet extraction fan north run status'],
                'TEF North Run Status', '',
                '#2eaf62', 'bool');
            c(['tef - toilet extraction fan north trip status'],
                'TEF North Trip Status', '',
                '#c62828', 'bool');
            c(['tef - toilet extraction fan south run status'],
                'TEF South Run Status', '',
                '#2eaf62', 'bool');
            c(['tef - toilet extraction fan south trip status'],
                'TEF South Trip Status', '',
                '#c62828', 'bool');
        } else if (profile === 'p2rooffans') {
            c(['6th floor fa21.1 - fresh air make up fan run status'],
                '6th Floor FA21.1 Run Status', '',
                '#2eaf62', 'bool');
            c(['6th floor fa21.1 - fresh air make up fan trip status'],
                '6th Floor FA21.1 Trip Status', '',
                '#c62828', 'bool');
            c(['6th floor kef 21.2 - kitchen extraction fan run satus'],
                '6th Floor KEF 21.2 Run Status', '',
                '#2eaf62', 'bool');
            c(['6th floor kef 21.2 - kitchen extraction fan trip satus'],
                '6th Floor KEF 21.2 Trip Status', '',
                '#c62828', 'bool');
            c(['6th floor schower extraction fan run status'],
                '6th Floor Shower EF Run Status', '',
                '#2eaf62', 'bool');
            c(['6th floor schower extraction fan trip status'],
                '6th Floor Shower EF Trip Status', '',
                '#c62828', 'bool');
            c(['fa17.1 - fresh air make up fan run status'],
                'FA17.1 Run Status', '', '#2eaf62',
                'bool');
            c(['fa17.1 - fresh air make up fan trip status'],
                'FA17.1 Trip Status', '', '#c62828',
                'bool');
            c(['fa7.1- fresh air make up fan run status'],
                'FA7.1 Run Status', '', '#2eaf62',
                'bool');
            g(['fa7.1- fresh air make up fan static pressure'],
                'FA7.1 Static Pressure', '', 0, 50,
                2, 50, 80);
            c(['fa7.1- fresh air make up fan trip status'],
                'FA7.1 Trip Status', '', '#c62828',
                'bool');
            c(['fa8 - fresh air make up fan 1 run status'],
                'FA8 Run Status', '', '#2eaf62',
                'bool');
            g(['fa8 - fresh air make up fan 1 static pressure'],
                'FA8 Static Pressure', '', 0, 10, 2,
                50, 80);
            c(['fa8 - fresh air make up fan 1 trip status'],
                'FA8 Trip Status', '', '#c62828',
                'bool');
            c(['fa9 - fresh air make up fan run status'],
                'FA9 Run Status', '', '#2eaf62',
                'bool');
            g(['fa9 - fresh air make up fan static pressure'],
                'FA9 Static Pressure', '', 0, 10, 2,
                50, 80);
            c(['fa9 - fresh air make up fan trip status'],
                'FA9 Trip Status', '', '#c62828',
                'bool');
            c(['kef 16.1 - kitchen extraction fan run status'],
                'KEF 16.1 Run Status', '', '#2eaf62',
                'bool');
            c(['kef 16.1 - kitchen extraction fan trip status'],
                'KEF 16.1 Trip Status', '', '#c62828',
                'bool');
            c(['ref ef 1 - refuse extraction fan run status'],
                'Ref EF 1 Run Status', '', '#2eaf62',
                'bool');
            c(['ref ef 1 - refuse extraction fan trip status'],
                'Ref EF 1 Trip Status', '', '#c62828',
                'bool');
            c(['ret1 ef - retail extraction fan run status'],
                'Ret1 EF Run Status', '', '#2eaf62',
                'bool');
            c(['ret1 ef - retail extraction fan trip status'],
                'Ret1 EF Trip Status', '', '#c62828',
                'bool');
            c(['se fan 1 - smoke extraction fan run status'],
                'SE Fan 1 Run Status', '', '#2eaf62',
                'bool');
            c(['se fan 1 - smoke extraction fan trip status'],
                'SE Fan 1 Trip Status', '', '#c62828',
                'bool');
            c(['sef 3- smoke extraction fan run status'],
                'SEF 3 Run Status', '', '#2eaf62',
                'bool');
            c(['sef 3- smoke extraction fan trip status'],
                'SEF 3 Trip Status', '', '#c62828',
                'bool');
            c(['sef13.2 - smoke extraction fan run status'],
                'SEF13.2 Run Status', '', '#2eaf62',
                'bool');
            c(['sef13.2 - smoke extraction fan trip status'],
                'SEF13.2 Trip Status', '', '#c62828',
                'bool');
            c(['spf 1 - staircase pressurization fan run status'],
                'SPF 1 Run Status', '', '#2eaf62',
                'bool');
            g(['spf 1 - staircase pressurization fan static pressure'],
                'SPF 1 Static Pressure', '', 0, 10,
                2, 50, 80);
            c(['spf 1 - staircase pressurization fan trip status'],
                'SPF 1 Trip Status', '', '#c62828',
                'bool');
            c(['spf 2 - staircase pressurization fan run status'],
                'SPF 2 Run Status', '', '#2eaf62',
                'bool');
            g(['spf 2 - staircase pressurization fan static pressure'],
                'SPF 2 Static Pressure', '', 0, 10,
                2, 50, 80);
            c(['spf 2 - staircase pressurization fan trip status'],
                'SPF 2 Trip Status', '', '#c62828',
                'bool');
            c(['spf 7 - staircase pressurization fan run status'],
                'SPF 7 Run Status', '', '#2eaf62',
                'bool');
            g(['spf 7 - staircase pressurization fan static pressure'],
                'SPF 7 Static Pressure', '', 0, 10,
                2, 50, 80);
            c(['spf 7 - staircase pressurization fan trip status'],
                'SPF 7 Trip Status', '', '#c62828',
                'bool');
            c(['tef 2 - toilet extraction fan run status'],
                'TEF 2 Run Status', '', '#2eaf62',
                'bool');
            c(['tef 2 - toilet extraction fan trip status'],
                'TEF 2 Trip Status', '', '#c62828',
                'bool');
            c(['tef6.1 -toilet extraction fan run status'],
                'TEF6.1 Run Status', '', '#2eaf62',
                'bool');
            c(['tef6.1 -toilet extraction fan trip status'],
                'TEF6.1 Trip Status', '', '#c62828',
                'bool');
        } else if (profile === 'chiller') {
            g(['chw supply temp', 'supply air temp',
                    'supply temp'
                ], 'Supply Temp', 'C', 0, 40, 2, 45,
                75);
            g(['chw return temp', 'return air',
                    'return temp'
                ], 'Return Temp', 'C', 0, 40, 2, 45,
                75);
            g(['buffer tank temp'], 'Buffer Temp', 'C',
                0, 60, 2, 45, 75);
            g(['ambient temp'], 'Ambient Temp', 'C', 0,
                50, 1, 45, 80);
            g(['delta temp'], 'Delta Temp', 'C', 0, 20,
                2, 45, 75);
            g(['chilled water outlet temp'],
                'Chilled Water Outlet Temp', 'C', 0,
                25, 2, 45, 75);
            g(['sec.chw supply  pressure',
                    'sec.chw supply pressure',
                    'supply pressure'
                ], 'Supply Pressure', '', 0, 550, 0,
                50, 80);
            g(['bus voltage'], 'Bus Voltage', '', 0,
                550, 0, 50, 80);
            c(['sec.chw supply  pressure',
                    'sec.chw supply pressure',
                    'supply pressure'
                ], 'Supply Pressure', 'hPa',
                '#c61f45', 'number');
            c(['sec.chw return pressure',
                    'sec.chw  return pressure',
                    'return pressure'
                ], 'Return Pressure', 'hPa',
                '#c61f45', 'number');
            c(['output power'], 'Output Power', 'W',
                '#c61f45', 'number');
            c(['sec.chw pump 1 run hours',
                    'sec.chw pump 1 runhours',
                    'run hours'
                ], 'Run Hours', 'h', '#2eaf62',
                'runhours', 0, 4000);
        } else if (profile === 'ahu') {
            g(['chw supply temp', 'supply air temp',
                    'supply temp'
                ], 'Supply Temp', 'C', 0, 40, 2, 45,
                75);
            g(['chw return temp', 'return air',
                    'return temp'
                ], 'Return Temp', 'C', 0, 40, 2, 45,
                75);
            g(['ambient temp', 'current temp'],
                'Ambient Temp', 'C', 0, 50, 1, 45,
                80);
            g(['delta temp'], 'Delta Temp', 'C', 0, 20,
                2, 45, 75);
            g(['bus voltage'], 'Bus Voltage', '', 0,
                550, 0, 50, 80);
            c(['air flow status'], 'Air Flow Status',
                '', '#2eaf62', 'bool');
            c(['run status', 'current unit status',
                    'ahu status'
                ], 'Run Status', '', '#2eaf62',
                'bool');
            c(['ohs status'], 'OHS Status', '',
                '#c62828', 'bool');
            c(['heater step 1 enable'],
                'Heater Step 1 Enable', '',
                '#2eaf62', 'bool');
        } else if (profile === 'prde') {
            g(['north 1 temp'], 'North 1 Temp', 'C', 0,
                40, 2, 45, 75);
            g(['north 2 temp'], 'North 2 Temp', 'C', 0,
                40, 2, 45, 75);
            g(['south 1 temp'], 'South 1 Temp', 'C', 0,
                40, 2, 45, 75);
            g(['south 2 temp'], 'South 2 Temp', 'C', 0,
                40, 2, 45, 75);
            c(['2nd override'], '2nd Override', '',
                '#2eaf62', 'bool');
            c(['ahu status',
                    'ahu 1 heat step 1 run status',
                    'runstatus'
                ], 'AHU Status', '', '#2eaf62',
                'text');
        } else if (profile === 'ebo') {
            g(['current a'], 'Current A', 'A', 0, 100,
                1, 55, 80);
            g(['current b'], 'Current B', 'A', 0, 100,
                1, 55, 80);
            g(['current c'], 'Current C', 'A', 0, 100,
                1, 55, 80);
            c(['start'], 'Start', '', '#2eaf62',
            'bool');
            c(['stop'], 'Stop', '', '#c62828', 'bool');
            c(['current unit status'],
                'Current Unit Status', '',
                '#2eaf62', 'text');
            g(['bus voltage'], 'Bus Voltage', '', 0,
                550, 0, 50, 80);
        } else if (profile === 'rtpu1') {
            g(['ra temp'], 'RA Temp', 'C', 0, 40, 2, 45,
                75);
            g(['sa temp'], 'SA Temp', 'C', 0, 40, 2, 45,
                75);
            c(['ahu runtime'], 'AHU Runtime', 'h',
                '#43a047', 'runhours', 0, 10000);
        } else if (profile === 'rtpu2') {
            g(['room temp 1'], 'Room Temp 1', 'C', 0,
                40, 2, 45, 75);
            g(['room temp 2'], 'Room Temp 2', 'C', 0,
                40, 2, 45, 75);
            g(['ave temp'], 'AVE Temp', 'C', 0, 40, 2,
                45, 75);
            c(['carbon dioxide'], 'Carbon Dioxide',
                'ppm', '#3949ab', 'number', 0, 2000);
            g(['comp 1 on coil temp'],
                'Comp 1 On Coil Temp', 'C', 0, 60,
                2, 45, 75);
            g(['comp 1 off coil temp'],
                'Comp 1 Off Coil Temp', 'C', 0, 60,
                2, 45, 75);
            g(['low oncoil temp'], 'Low Oncoil Temp',
                'C', 0, 60, 2, 45, 75);
            g(['economy damper'], 'Economy Damper', '%',
                0, 100, 0, 50, 80);
            c(['control temp setpoint'],
                'Control Temp Setpoint', 'C',
                '#3949ab', 'number', 0, 40);
        } else if (profile === 'ventfan1') {
            c(['cmf-f116 airflow text'],
                'CMF-F116 Airflow', '', '#2c6fb2',
                'text');
            c(['faf-a1 airflow text'], 'FAF-A1 Airflow',
                '', '#2c6fb2', 'text');
            c(['faf-f059/g069 airflow text'],
                'FAF-F059/G069 Airflow', '',
                '#2c6fb2', 'text');
            c(['faf-f082 airflow text'],
                'FAF-F082 Airflow', '', '#2c6fb2',
                'text');
            c(['faf-f086 airflow text'],
                'FAF-F086 Airflow', '', '#2c6fb2',
                'text');
            c(['faf-g088 airflow text'],
                'FAF-G088 Airflow', '', '#2c6fb2',
                'text');
            c(['faf-g152 airflow text'],
                'FAF-G152 Airflow', '', '#2c6fb2',
                'text');
            c(['tef-f airflow text'], 'TEF-F Airflow',
                '', '#2c6fb2', 'text');
        } else if (profile === 'ventfan2') {
            c(['tef-g011/g012 airflow text'],
                'TEF-G011/G012 Airflow', '',
                '#2c6fb2', 'text');
            c(['tef-g airflow text'], 'TEF-G Airflow',
                '', '#2c6fb2', 'text');
            c(['tef-f airflow text'], 'TEF-F Airflow',
                '', '#2c6fb2', 'text');
            c(['tef f014/f018 airflow text'],
                'TEF F014/F018 Airflow', '',
                '#2c6fb2', 'text');
            c(['faf-g122 airflow text'],
                'FAF-G122 Airflow', '', '#2c6fb2',
                'text');
            c(['faf-f106 airflow text'],
                'FAF-F106 Airflow', '', '#2c6fb2',
                'text');
            c(['faf-f090 airflow text'],
                'FAF-F090 Airflow', '', '#2c6fb2',
                'text');
            c(['faf g01/f01 airflow text'],
                'FAF G01/F01 Airflow', '',
                '#2c6fb2', 'text');
            c(['exf g01/f01 airflow text'],
                'EXF G01/F01 Airflow', '',
                '#2c6fb2', 'text');
            c(['cmf-g01 airflow text'],
                'CMF-G01 Airflow', '', '#2c6fb2',
                'text');
            c(['cef-g01 airflow text'],
                'CEF-G01 Airflow', '', '#2c6fb2',
                'text');
        } else if (profile === 'chillerroof1') {
            g(['chilled water return temperature 1'],
                'CHW Return Temp 1', 'C', 0, 40, 2,
                45, 75);
            g(['chilled water return temperature 2'],
                'CHW Return Temp 2', 'C', 0, 40, 2,
                45, 75);
            g(['chilled water supply temperature'],
                'CHW Supply Temp', 'C', 0, 40, 2,
                45, 75);
            g(['chilled water supply temperature 1'],
                'CHW Supply Temp 1', 'C', 0, 40, 2,
                45, 75);
            g(['chilled water supply temperature 2'],
                'CHW Supply Temp 2', 'C', 0, 40, 2,
                45, 75);
            g(['delta pressure'], 'Delta Pressure',
                'Pa', 0, 200, 1, 45, 80);
            c(['delta pressure setpoint'],
                'Delta Pressure Setpoint', 'Pa',
                '#3949ab', 'number', 0, 200);
            c(['oa humid'], 'OA Humidity', '%',
                '#3949ab', 'number', 0, 100);
            g(['oa temp'], 'OA Temp', 'C', 0, 50, 1, 45,
                80);
            c(['pump 1 vfd frequency'],
                'Pump 1 VFD Frequency', 'Hz',
                '#3949ab', 'number', 0, 60);
            g(['pump 1 vfd output'],
                'Pump 1 VFD Output', '%', 0, 100, 1,
                50, 80);
            c(['pump 2 vfd frequency'],
                'Pump 2 VFD Frequency', 'Hz',
                '#3949ab', 'number', 0, 60);
            g(['pump 2 vfd output'],
                'Pump 2 VFD Output', '%', 0, 100, 1,
                50, 80);
        } else if (profile === 'watermeter') {
            g(['ll fournos water meter'], 'LL Fournos',
                'm3', 0, 1000, 0, 60, 85);
            g(['ll mug and bean water meter'],
                'LL Mug and Bean', 'm3', 0, 1000, 0,
                60, 85);
            g(['ul h and m water meter'], 'UL H and M',
                'm3', 0, 1000, 0, 60, 85);
            g(['ul ocean basket water meter'],
                'UL Ocean Basket', 'm3', 0, 1000, 0,
                60, 85);
            g(['ul roco mama water meter'],
                'UL Roco Mama', 'm3', 0, 1000, 0,
                60, 85);
        }
        if (!gauges.length && !cards.length &&
            profile !== 'sensor') {
            var keys = Object.keys(vals || {});
            for (var i = 0; i < keys.length && gauges
                .length < 6; i++) {
                var n = numLike(vals[keys[i]]);
                if (n === null) continue;
                if (isBinary(n) && isStatusKey(keys[i])) {
                    cards.push({
                        label: keys[i],
                        unit: '',
                        color: '#2eaf62',
                        kind: 'bool',
                        value: n
                    });
                    continue;
                }
                gauges.push({
                    label: keys[i],
                    unit: '',
                    min: 0,
                    max: Math.max(100, Math.abs(
                        n) * 1.3 || 100),
                    decimals: 1,
                    color: '#2c6fb2',
                    value: n,
                    greenPct: defaultGreen,
                    warnPct: defaultWarn
                });
            }
        }
        return {
            profile: profile,
            gauges: gauges,
            cards: cards
        };
    }

    function polar(cx, cy, r, deg) {
        var rad = (deg - 90) * Math.PI / 180;
        return {
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad)
        };
    }

    function arc(cx, cy, r, a0, a1) {
        var p0 = polar(cx, cy, r, a0),
            p1 = polar(cx, cy, r, a1);
        var laf = (a1 - a0) > 180 ? 1 : 0;
        return 'M ' + p0.x + ' ' + p0.y + ' A ' + r +
            ' ' + r + ' 0 ' + laf + ' 1 ' + p1.x + ' ' +
            p1.y;
    }

    function gaugeSvg(spec) {
        var min = Number(spec.min) || 0,
            max = Number(spec.max) || 100;
        if (max <= min) max = min + 1;
        var n = numLike(spec.value);
        if (n === null) n = min;
        var pct = norm(n, min, max);
        var gEnd = Math.max(5, Math.min(95, toPct(spec
            .greenPct, defaultGreen)));
        var wEnd = Math.max(gEnd + 2, Math.min(98,
            toPct(spec.warnPct, defaultWarn)));
        var start = -140,
            end = 140;

        function ang(p) {
            return start + ((end - start) * (p / 100));
        }
        var cx = 80,
            cy = 72,
            r = 52,
            needleR = 42;
        var dGreen = arc(cx, cy, r, ang(0), ang(gEnd));
        var dWarn = arc(cx, cy, r, ang(gEnd), ang(
        wEnd));
        var dBad = arc(cx, cy, r, ang(wEnd), ang(100));
        var needle = polar(cx, cy, needleR, ang(pct));
        var dec = Number.isFinite(spec.decimals) ? spec
            .decimals : (spec.unit === 'C' ? 1 : 0);
        var display = n.toFixed(dec) + (spec.unit ||
        '');
        return '<svg class="dg-gauge" viewBox="0 0 160 96" xmlns="http://www.w3.org/2000/svg"><path d="' +
            dGreen +
            '" stroke="#2eaf62" stroke-width="10" fill="none" stroke-linecap="round"/><path d="' +
            dWarn +
            '" stroke="#efb125" stroke-width="10" fill="none" stroke-linecap="round"/><path d="' +
            dBad +
            '" stroke="#e04848" stroke-width="10" fill="none" stroke-linecap="round"/><path d="' +
            arc(cx, cy, r, start, end) +
            '" stroke="#dbe5ef" stroke-width="2" fill="none"/><line x1="' +
            cx + '" y1="' + cy + '" x2="' + needle.x +
            '" y2="' + needle.y +
            '" stroke="#3f5872" stroke-width="2.4" stroke-linecap="round"/><circle cx="' +
            cx + '" cy="' + cy +
            '" r="4.2" fill="#3f5872"/></svg><div class="dg-value-main">' +
            esc(display) + '</div>';
    }

    function indicator(spec) {
        var n = numLike(spec.value);
        if (spec.kind === 'bool') {
            var on = boolish(spec.value);
            return '<div class="dg-ind-label">' + esc(
                    spec.label) +
                '</div><div class="dg-ind-value ' + (
                    on ? 'green' : '') + '">' + (on ?
                    'On' : 'Off') +
                '</div><div class="dg-value-sub">Status</div>';
        }
        if (spec.kind === 'runhours') {
            var v = n === null ? 0 : n;
            var max = Number.isFinite(spec.max) ? spec
                .max : 4000;
            var pct = Math.max(0, Math.min(100, (v /
                Math.max(1, max)) * 100));
            var dec = v < 100 ? 1 : 0;
            return '<div class="dg-ind-label">' + esc(
                    spec.label) +
                '</div><div class="dg-ind-value green">' +
                esc(v.toFixed(dec)) + ' ' + esc(spec
                    .unit || '') +
                '</div><div class="dg-ind-bar"><div class="dg-ind-fill" style="width:' +
                pct +
                '%"></div></div><div class="dg-ind-range"><span>0</span><span>' +
                esc(String(max)) + '</span></div>';
        }
        if (n === null) {
            return '<div class="dg-ind-label">' + esc(
                    spec.label) +
                '</div><div class="dg-ind-value">--</div>';
        }
        var dec = Math.abs(n) >= 100 ? 0 : 2;
        return '<div class="dg-ind-label">' + esc(spec
                .label) +
            '</div><div class="dg-ind-value">' + esc(n
                .toFixed(dec)) + ' ' + esc(spec.unit ||
                '') +
            '</div><div class="dg-value-sub">Last update just now</div>';
    }

    function sensorColor(v) {
        var n = Math.max(1, Math.min(15, Number
            .isFinite(v) ? v : 1));
        var t = (n - 1) / 14;
        var r = Math.round(34 + (t * (228 - 34))),
            g = Math.round(175 + (t * (48 - 175))),
            b = Math.round(98 + (t * (43 - 98)));
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function renderSensor(vals, deviceName) {
        if (!grid) return;
        var raw = numLike(vals['value']);
        var v = raw !== null ? Math.max(1, Math.min(15,
            raw)) : 1;
        var t = (v - 1) / 14;
        var col = sensorColor(v);
        var personX = Math.round(20 + t * 56);
        var label = v <= 4 ? 'No presence' : (v <= 8 ?
            'Nearby' : (v <= 12 ? 'Close' :
                'Right beside sensor'));
        var html =
            '<div class="sg-wrap"><div class="sg-device-info"><span class="sg-device-name">' +
            esc(deviceName || 'Motion Sensor') +
            '</span><span class="sg-device-val" style="color:' +
            col + '">' + v +
            '</span></div><div class="sg-scene"><svg class="sg-svg" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sg-floor-g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#e6edf4" stop-opacity="0"/><stop offset="100%" stop-color="#d0dce8"/></linearGradient></defs><rect x="0" y="95" width="200" height="6" rx="3" fill="url(#sg-floor-g)"/><circle cx="180" cy="72" r="14" fill="' +
            col +
            '" opacity="0.18"/><circle cx="180" cy="72" r="10" fill="' +
            col +
            '" opacity="0.35"/><rect x="174" y="58" width="12" height="16" rx="3" fill="' +
            col +
            '"/><circle cx="180" cy="54" r="5" fill="' +
            col + '"/><g transform="translate(' +
            personX +
            ',57)"><circle cx="0" cy="0" r="6" fill="' +
            col +
            '"/><rect x="-5" y="6" width="10" height="18" rx="3" fill="' +
            col +
            '"/><line x1="-5" y1="10" x2="-12" y2="22" stroke="' +
            col +
            '" stroke-width="3" stroke-linecap="round"/><line x1="5" y1="10" x2="12" y2="22" stroke="' +
            col +
            '" stroke-width="3" stroke-linecap="round"/><line x1="-3" y1="24" x2="-7" y2="38" stroke="' +
            col +
            '" stroke-width="3" stroke-linecap="round"/><line x1="3" y1="24" x2="7" y2="38" stroke="' +
            col +
            '" stroke-width="3" stroke-linecap="round"/></g></svg></div><div class="sg-footer"><div class="sg-bar-wrap"><div class="sg-bar-track"><div class="sg-bar-fill" style="width:' +
            Math.round(t * 100) + '%;background:' +
            col +
            '"/></div><span class="sg-bar-num" style="color:' +
            col + '">' + v +
            ' / 15</span></div><div class="sg-status" style="color:' +
            col + '">' + label + '</div></div></div>';
        grid.innerHTML = html;
    }

    function bulbSvg(on) {
        var col = on ? '#ffd600' : '#b0bec5';
        var glow = on ? 'rgba(255,214,0,0.25)' : 'none';
        return '<svg class="lt-bulb-svg" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">' +
            (on ?
                '<circle cx="24" cy="22" r="18" fill="' +
                glow + '"/>' : '') +
            '<circle cx="24" cy="22" r="13" fill="' +
            col + '"/>' + (on ?
                '<ellipse cx="19" cy="18" rx="4" ry="5" fill="rgba(255,255,255,0.3)" transform="rotate(-20,19,18)"/>' :
                '') +
            '<rect x="18" y="35" width="12" height="4" rx="2" fill="' +
            col +
            '"/><rect x="19" y="39" width="10" height="4" rx="2" fill="' +
            col +
            '"/><rect x="20" y="43" width="8" height="3" rx="1.5" fill="' +
            col + '"/></svg>';
    }

    function renderLights(vals, deviceName) {
        if (!grid) return;
        // Support both lowercase and capitalized channel keys
        var channels = [];
        for (var i = 1; i <= 12; i++) {
            var k1 = 'channel' + i, k2 = 'Channel' + i;
            var v = vals[k1];
            if (v === undefined) v = vals[k2];
            if (v !== undefined) {
                channels.push({
                    label: 'Channel ' + i,
                    on: Number(v) !== 0
                });
            }
        }
        // Support both lowercase and capitalized brightness
        var brt = vals['brightness'];
        if (brt === undefined) brt = vals['Brightness'];
        var html = '<div class="lt-wrap">';
        if (brt !== undefined) {
            var bv = numLike(brt);
            html +=
                '<div class="lt-brt-card"><span class="lt-brt-label">Brightness</span><span class="lt-brt-value">' +
                (bv !== null ? Math.round(bv) : '--') +
                '</span></div>';
        }
        html += '<div class="lt-channels">';
        for (var j = 0; j < channels.length; j++) {
            var ch = channels[j];
            html += '<div class="lt-ch' + (ch.on ?
                    ' lt-on' : '') +
                '"><div class="lt-ch-name">' + esc(ch
                    .label) + '</div>' + bulbSvg(ch
                .on) + '<div class="lt-ch-state">' + (ch
                    .on ? 'On' : 'Off') +
                '</div></div>';
        }
        html += '</div></div>';
        grid.innerHTML = html;
    }

    function render() {
        if (!grid) return;
        var rows = collectRows(ctx);
        var r = rows.length ? rows[0] : {
            name: (store.device && store.device
                .name) || 'No device selected',
            vals: {}
        };
        var vals = r.vals || {};
        var built = specsFor(vals, {
            name: (store.device && store.device.name) || r.name,
            attrs: r.attrs || {}
        });
        if (built.profile === 'sensor') {
            renderSensor(vals, (store.device && store
                .device.name) || r.name);
            return;
        }
        if (built.profile === 'lights') {
            renderLights(vals, (store.device && store
                .device.name) || r.name);
            return;
        }
        if (!built.gauges.length && !built.cards
            .length) {
            grid.innerHTML =
                '<div class="dg-empty">No telemetry values are available for this device yet.</div>';
            return;
        }
        var html = '';
        for (var i = 0; i < built.gauges.length; i++) {
            var gSpec = built.gauges[i];
            var p = norm(gSpec.value, gSpec.min, gSpec
                .max);
            var tone = gaugeTone(p);
            html += '<div class="dg-card-item ' + tone +
                '"><div class="dg-name"><span>' + esc(
                    gSpec.label) +
                '</span><span class="dg-expand"></span></div><div class="dg-gauge-wrap">' +
                gaugeSvg(gSpec) + '</div></div>';
        }
        for (var c = 0; c < built.cards.length; c++) {
            var card = built.cards[c];
            html +=
                '<div class="dg-card-item value"><div>' +
                indicator(card) + '</div></div>';
        }
        grid.innerHTML = html;
    }
    self.__state = {
        render: render
    };
    self.__listener = subscribe(function(d) {
        if (d && d.type === 'device' && d
            .payload) {
            store.device = d.payload;
        }
        render();
    });
    render();
};
self.onDataUpdated = function() {
    if (self.__state && self.__state.render) self
        .__state.render();
};
self.onDestroy = function() {
    try {
        if (self.__listener) window.removeEventListener(
            'HVAC_V2_SYNC', self.__listener);
    } catch (e) {}
    self.__state = null;
};
