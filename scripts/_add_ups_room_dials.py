import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUNDLE_PATH = ROOT / "hvac-v4-widget-bundle.json"
DASHBOARD_PATH = ROOT / "hvac_v4_dashboard.json"


def patch_bundle() -> None:
    bundle = json.loads(BUNDLE_PATH.read_text(encoding="utf-8-sig"))
    widget = next(
        w for w in bundle["widgetTypes"]
        if w.get("fqn") == "hvac_v4_widgets.device_dials"
    )
    js = widget["descriptor"]["controllerScript"]

    old_detect = "if(hasAny(vals,['sec.hw pumps control pressure']))return 'sechwpumps';if(hasAny(vals,['sec.chw pumps control pressure']))return 'secchwpumps';if(hasAny(vals,['server room temp 1','server room temp 2','leak detection sensor 1','leak detection sensor 2']))return 'serverroom';if(hasAny(vals,['chw supply temp','chw return temp','buffer tank temp','sec.chw supply  pressure','sec.chw return pressure','output power','sec.chw pump 1 run hours','delta temp','chilled water outlet temp']))return 'chiller';"
    new_detect = "if(hasAny(vals,['sec.hw pumps control pressure']))return 'sechwpumps';if(hasAny(vals,['sec.chw pumps control pressure']))return 'secchwpumps';if(hasAny(vals,['server room temp 1','server room temp 2','leak detection sensor 1','leak detection sensor 2']))return 'serverroom';if(hasAny(vals,['battery room space temp sensor','ups room space temp sensor']))return 'upsroom';if(hasAny(vals,['chw supply temp','chw return temp','buffer tank temp','sec.chw supply  pressure','sec.chw return pressure','output power','sec.chw pump 1 run hours','delta temp','chilled water outlet temp']))return 'chiller';"

    old_label = "if(p==='fans')return 'Roof Fans profile';if(p==='wet')return 'Domestic Water profile';if(p==='chillerplant')return 'Chiller Plant profile';if(p==='patchrooms')return 'Patch Rooms profile';if(p==='sechwpumps')return 'Sec.HW.Pumps profile';if(p==='secchwpumps')return 'Sec.CHW.Pumps profile';if(p==='serverroom')return 'Server Room profile';return 'Generic telemetry';"
    new_label = "if(p==='fans')return 'Roof Fans profile';if(p==='wet')return 'Domestic Water profile';if(p==='chillerplant')return 'Chiller Plant profile';if(p==='patchrooms')return 'Patch Rooms profile';if(p==='sechwpumps')return 'Sec.HW.Pumps profile';if(p==='secchwpumps')return 'Sec.CHW.Pumps profile';if(p==='serverroom')return 'Server Room profile';if(p==='upsroom')return 'UPS Room profile';return 'Generic telemetry';"

    old_specs = "if(profile==='chiller'){push(['supply air temp'],'Supply Temp','C',0,40,'number','#2eaf62',1);push(['return air'],'Return Temp','C',0,40,'number','#f5b42b',1);push(['buffer tank temp'],'Buffer Temp','C',0,60,'number','#e04848',1);push(['ambient temp'],'Ambient Temp','C',0,50,'number','#2eaf62',1);push(['delta temp'],'Delta Temp','C',0,20,'number','#f5b42b',2);push(['chilled water outlet temp'],'Chilled Water Outlet Temp','C',0,25,'number','#ef6c00',1);push(['sec.chw supply  pressure'],'Supply Pressure','hPa',0,500,'number','#ef6c00',0);push(['sec.chw return pressure'],'Return Pressure','hPa',0,500,'number','#ef6c00',0);push(['bus voltage'],'Bus Voltage','V',0,600,'number','#6d4c41',0);push(['output power'],'Output Power','W',0,2000,'number','#c62828',0);push(['sec.chw pump 1 run hours'],'Run Hours','h',0,5000,'number','#43a047',0);}else if(profile==='serverroom'){"
    new_specs = "if(profile==='chiller'){push(['supply air temp'],'Supply Temp','C',0,40,'number','#2eaf62',1);push(['return air'],'Return Temp','C',0,40,'number','#f5b42b',1);push(['buffer tank temp'],'Buffer Temp','C',0,60,'number','#e04848',1);push(['ambient temp'],'Ambient Temp','C',0,50,'number','#2eaf62',1);push(['delta temp'],'Delta Temp','C',0,20,'number','#f5b42b',2);push(['chilled water outlet temp'],'Chilled Water Outlet Temp','C',0,25,'number','#ef6c00',1);push(['sec.chw supply  pressure'],'Supply Pressure','hPa',0,500,'number','#ef6c00',0);push(['sec.chw return pressure'],'Return Pressure','hPa',0,500,'number','#ef6c00',0);push(['bus voltage'],'Bus Voltage','V',0,600,'number','#6d4c41',0);push(['output power'],'Output Power','W',0,2000,'number','#c62828',0);push(['sec.chw pump 1 run hours'],'Run Hours','h',0,5000,'number','#43a047',0);}else if(profile==='upsroom'){push(['battery room space temp sensor'],'Battery Room Space Temp Sensor','C',0,40,'number','#8e24aa',1);push(['ups room space temp sensor'],'UPS Room Space Temp Sensor','C',0,40,'number','#3949ab',1);}else if(profile==='serverroom'){"

    if old_detect not in js:
        raise SystemExit("Expected detectProfile block not found")
    if old_label not in js:
        raise SystemExit("Expected profileLabel block not found")
    if old_specs not in js:
        raise SystemExit("Expected specsFor block not found")

    js = js.replace(old_detect, new_detect, 1)
    js = js.replace(old_label, new_label, 1)
    js = js.replace(old_specs, new_specs, 1)
    widget["descriptor"]["controllerScript"] = js
    BUNDLE_PATH.write_text(json.dumps(bundle, ensure_ascii=False, indent=4), encoding="utf-8")


def patch_dashboard() -> None:
    dashboard = json.loads(DASHBOARD_PATH.read_text(encoding="utf-8-sig"))
    data_keys = dashboard["configuration"]["widgets"]["w-device-dials"]["config"]["datasources"][0]["dataKeys"]
    existing = {item.get("name") for item in data_keys}
    additions = [
        {"name": "Battery Room Space Temp Sensor", "type": "timeseries", "label": "Battery Room Space Temp Sensor", "color": "#8e24aa", "settings": {}, "_hash": 0.4517006609511143},
        {"name": "UPS Room Space Temp Sensor", "type": "timeseries", "label": "UPS Room Space Temp Sensor", "color": "#3949ab", "settings": {}, "_hash": 0.6783411897302022},
    ]
    for item in additions:
        if item["name"] not in existing:
            data_keys.append(item)
    DASHBOARD_PATH.write_text(json.dumps(dashboard, ensure_ascii=False, indent=4), encoding="utf-8")


if __name__ == "__main__":
    patch_bundle()
    patch_dashboard()
