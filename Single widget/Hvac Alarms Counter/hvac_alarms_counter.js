self.onInit = function() {
    var root = self.ctx && self.ctx.$container && self
        .ctx.$container[0];
    if (!root) return;
    var titleEl = root.querySelector('#sp-title'),
        subEl = root.querySelector('#sp-sub'),
        chipEl = root.querySelector('#sp-chip'),
        grid = root.querySelector('#sp-grid');

    // Activate the alarm subscription so onDataUpdated fires.
    var pageLink = self.ctx.pageLink(1024);
    var wc = self.ctx.widgetConfig || {};
    pageLink.typeList = wc.alarmTypeList;
    pageLink.statusList = wc.alarmStatusList;
    pageLink.severityList = wc.alarmSeverityList;
    pageLink.searchPropagatedAlarms = wc.searchPropagatedAlarms;
    self.ctx.defaultSubscription.subscribeForAlarms(pageLink, null);

    function tile(cls, label, val) {
        return '<div class="sp-tile ' + cls +
            '"><div class="sp-label">' + label +
            '</div><div class="sp-val">' + val +
            '</div></div>';
    }

    function countAlarms(arr) {
        var s = {
            total: 0,
            active: 0,
            cleared: 0,
            unack: 0,
            ack: 0,
            critical: 0,
            major: 0,
            warning: 0,
            minor: 0,
            indet: 0
        };
        for (var i = 0; i < arr.length; i++) {
            var a = arr[i];
            if (!a || typeof a !== 'object') continue;
            s.total++;
            var st = String(a.status || '')
            .toUpperCase();
            var sv = String(a.severity || '')
                .toUpperCase();
            if (st.indexOf('ACTIVE') !== -1) s.active++;
            if (st.indexOf('CLEARED') !== -1) s
                .cleared++;
            // TB status values: ACTIVE_UNACK, ACTIVE_ACK, CLEARED_UNACK, CLEARED_ACK
            if (st.indexOf('UNACK') !== -1) s.unack++;
            if (st.indexOf('ACK') !== -1 && st
                .indexOf('UNACK') === -1) s.ack++;
            if (sv === 'CRITICAL') s.critical++;
            else if (sv === 'MAJOR') s.major++;
            else if (sv === 'WARNING') s.warning++;
            else if (sv === 'MINOR') s.minor++;
            else if (sv === 'INDETERMINATE') s.indet++;
        }
        return s;
    }

    function render() {
        if (!grid) return;
        var ctx = self.ctx;
        if (titleEl) titleEl.textContent = String((ctx
            .settings && ctx.settings.chartTitle
            ) || 'HVAC Alarms Counter');
        if (subEl) subEl.textContent = String((ctx
                .settings && ctx.settings
                .chartSubtitle) ||
            'Live totals for current scope');
        var alarms = ctx.defaultSubscription &&
            ctx.defaultSubscription.alarms &&
            ctx.defaultSubscription.alarms.data;
        var s = {
            total: 0,
            active: 0,
            cleared: 0,
            unack: 0,
            ack: 0,
            critical: 0,
            major: 0,
            warning: 0,
            minor: 0,
            indet: 0
        };
        if (Array.isArray(alarms) && alarms.length) {
            s = countAlarms(alarms);
        }
        if (chipEl) chipEl.textContent = s.total +
            ' records';
        grid.innerHTML = tile('active', 'Active', s
                .active) + tile('cleared', 'Cleared', s
                .cleared) + tile('unack',
                'Unacknowledged', s.unack) + tile('ack',
                'Acknowledged', s.ack) + tile(
                'critical', 'Critical', s.critical) +
            tile('major', 'Major', s.major) + tile(
                'warning', 'Warning', s.warning) + tile(
                'minor', 'Minor', s.minor) + tile(
                'indet', 'Indeterminate', s.indet);
    }
    self.__state = {
        render: render
    };
    self.onDataUpdated = function() {
        if (self.__state) self.__state.render();
    };
    self.onResize = function() {
        if (self.__state) self.__state.render();
    };
    self.onDestroy = function() {
        self.__state = null;
    };
    render();
};

self.typeParameters = function() {
    return {
        maxDatasources: 0,
        maxDataKeys: 0,
        dataKeysOptional: true,
        hasDataPageLink: true,
        singleEntity: false,
        warnOnPageDataOverflow: false
    };
};
