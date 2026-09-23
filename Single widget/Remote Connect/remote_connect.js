(function() {
  var frame, statusEl, openBtn, closeBtn, rootEl;
  var guacBase = "";
  var dataSource = "";
  var connectionId = "";
  var username = "";
  var password = "";
  var currentBuildingId = "";
  var currentBuildingName = "";
  var syncListener = null;

  function status(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function getStore() {
    var w = window;
    if (!w.__HVAC_V2_STATE__) {
      w.__HVAC_V2_STATE__ = { building: null, device: null };
    }
    return w.__HVAC_V2_STATE__;
  }

  function subscribe(cb) {
    var fn = function(e) {
      cb((e && e.detail) || {});
    };
    window.addEventListener("HVAC_V2_SYNC", fn);
    return fn;
  }

  function selectedBuildingFromState() {
    var ctx = self.ctx;
    try {
      if (ctx && ctx.stateController && typeof ctx.stateController.getStateParams === "function") {
        var params = ctx.stateController.getStateParams() || {};
        var entity = params.entityId || params.selectedEntity || params.entity;
        var id = entity && typeof entity === "object" ? entity.id : entity;
        var type = entity && typeof entity === "object" ? entity.entityType : params.entityType;
        if (id) {
          return {
            entityType: type || "ASSET",
            id: String(id),
            name: params.entityName || params.name || ""
          };
        }
      }
    } catch (e) {}
    return null;
  }

  function selectedBuilding() {
    var store = getStore();
    var building = (store && store.building) || selectedBuildingFromState();
    if (!building || !building.id) return null;
    return {
      entityType: building.entityType || "ASSET",
      id: String(building.id),
      name: building.name || ""
    };
  }

  function loadSettings() {
    var s = (self.ctx && self.ctx.settings) || {};
    guacBase = String(s.guacBase || "").trim();
    dataSource = String(s.dataSource || "").trim();
  }

  function getAttributeService() {
    try {
      var ctx = self.ctx;
      var injector = ctx && ctx.$scope && ctx.$scope.$injector;
      var serviceName = ctx && ctx.servicesMap && ctx.servicesMap.get("attributeService");
      return injector && serviceName ? injector.get(serviceName) : null;
    } catch (e) {
      return null;
    }
  }

  function readServerAttributes(entity, keys) {
    return new Promise(function(resolve, reject) {
      var service = getAttributeService();
      if (!service || typeof service.getEntityAttributes !== "function") {
        reject(new Error("attribute service unavailable"));
        return;
      }

      var obs;
      try {
        obs = service.getEntityAttributes(entity, "SERVER_SCOPE", keys);
      } catch (e) {
        reject(e);
        return;
      }

      if (!obs || typeof obs.subscribe !== "function") {
        reject(new Error("attribute request unavailable"));
        return;
      }

      obs.subscribe(function(attrs) {
        var values = {};
        var list = Array.isArray(attrs) ? attrs : [];
        for (var i = 0; i < list.length; i++) {
          if (list[i] && list[i].key !== undefined) {
            values[String(list[i].key)] = list[i].value;
          }
        }
        resolve(values);
      }, function(err) {
        reject(err || new Error("attribute request failed"));
      });
    });
  }

  function attrString(attrs, key) {
    var value = attrs ? attrs[key] : "";
    return String(value == null ? "" : value).trim();
  }

  async function loadBuildingCredentials() {
    var building = selectedBuilding();
    if (!building) {
      throw new Error("select a building first");
    }

    status("loading building attributes");
    var attrs = await readServerAttributes(building, ["UUID", "G-Username", "G-Password"]);
    connectionId = attrString(attrs, "UUID");
    username = attrString(attrs, "G-Username");
    password = attrString(attrs, "G-Password");

    var missing = [];
    if (!connectionId) missing.push("UUID");
    if (!username) missing.push("G-Username");
    if (!password) missing.push("G-Password");
    if (missing.length) {
      throw new Error("missing building attribute(s): " + missing.join(", "));
    }

    currentBuildingId = building.id;
    currentBuildingName = building.name || "";
  }

  async function fetchToken() {
    var url = joinUrl(guacBase, "/api/tokens");
    var body = new URLSearchParams({ username: username, password: password });
    var res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body,
      credentials: "include",
      mode: "cors"
    });
    if (!res.ok) {
      var txt = await res.text().catch(function() { return ""; });
      throw new Error("Guacamole auth failed: " + res.status + (txt ? " " + txt : ""));
    }
    var json = await res.json();
    if (!json || !json.authToken) throw new Error("No authToken returned");
    return { token: json.authToken, ds: dataSource || json.dataSource || "" };
  }

  function buildClientUrl(token, ds) {
    var baseHash = "#/client/" + encodeURIComponent(connectionId) + "?token=" + encodeURIComponent(token);
    var withDs = ds ? baseHash + "&datasource=" + encodeURIComponent(ds) : baseHash;
    return joinUrl(guacBase, withDs);
  }

  function joinUrl(base, pathOrHash) {
    if (pathOrHash.indexOf("#") === 0) {
      return base.replace(/\/+$/, "") + "/" + pathOrHash.replace(/^\/+/, "");
    }
    if (pathOrHash.indexOf("/") === 0) {
      return base.replace(/\/+$/, "") + pathOrHash;
    }
    return base.replace(/\/+$/, "") + "/" + pathOrHash;
  }

  async function openGuac() {
    if (!frame) return;
    if (!guacBase) {
      status("configure Guacamole base URL");
      return;
    }

    try {
      await loadBuildingCredentials();
      status("authenticating");
      var auth = await fetchToken();
      var url = buildClientUrl(auth.token, auth.ds);
      frame.style.display = "block";
      frame.src = "about:blank";
      setTimeout(function() {
        if (frame) frame.src = url;
      }, 0);
      status(currentBuildingName ? "session opened: " + currentBuildingName : "session opened");
    } catch (err) {
      status(String((err && err.message) || err));
      closeGuac(true);
    }
  }

  function closeGuac(keepStatus) {
    if (frame) {
      frame.src = "about:blank";
      frame.style.display = "none";
    }
    connectionId = "";
    username = "";
    password = "";
    if (!keepStatus) status("session closed");
  }

  function refreshReadyStatus() {
    if (!guacBase) {
      status("configure Guacamole base URL");
      return;
    }
    var building = selectedBuilding();
    status(building ? "ready" : "select a building");
  }

  function onBuildingChanged(detail) {
    if (detail && detail.type === "building" && detail.payload && detail.payload.id) {
      var nextId = String(detail.payload.id);
      if (currentBuildingId && currentBuildingId !== nextId) {
        closeGuac(true);
      }
      currentBuildingId = nextId;
      currentBuildingName = detail.payload.name || "";
      refreshReadyStatus();
    }
  }

  self.onInit = function() {
    var ctx = self.ctx;
    rootEl = ctx && ctx.$container && ctx.$container[0] ? ctx.$container[0].querySelector("#tbGuacRoot") : null;
    if (!rootEl) return;

    frame = rootEl.querySelector("#tbGuacFrame");
    statusEl = rootEl.querySelector("#tbGuacStatus");
    openBtn = rootEl.querySelector("#tbGuacOpenBtn");
    closeBtn = rootEl.querySelector("#tbGuacCloseBtn");

    loadSettings();

    if (openBtn) openBtn.addEventListener("click", openGuac);
    if (closeBtn) closeBtn.addEventListener("click", function() { closeGuac(false); });
    if (frame) {
      frame.onload = function() {
        try {
          frame.focus();
          if (frame.contentWindow) frame.contentWindow.focus();
        } catch (e) {}
      };
    }
    if (rootEl && frame) {
      rootEl.addEventListener("click", function() {
        try {
          frame.focus();
          if (frame.contentWindow) frame.contentWindow.focus();
        } catch (e) {}
      });
    }

    var initial = selectedBuilding();
    if (initial) {
      currentBuildingId = initial.id;
      currentBuildingName = initial.name || "";
    }
    syncListener = subscribe(onBuildingChanged);
    refreshReadyStatus();
  };

  self.onResize = function() {};

  self.onSettingsChanged = function() {
    var prevBase = guacBase;
    var prevDs = dataSource;
    loadSettings();
    if ((prevBase !== guacBase || prevDs !== dataSource) && frame && frame.style.display !== "none") {
      closeGuac(true);
    }
    refreshReadyStatus();
  };

  self.onDestroy = function() {
    try {
      closeGuac(true);
      if (syncListener) window.removeEventListener("HVAC_V2_SYNC", syncListener);
    } catch (e) {}
    syncListener = null;
  };
})();
