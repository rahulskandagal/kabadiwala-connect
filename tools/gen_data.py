"""Generate seed datasets for the Kabadiwala Connect prototype.

prices.json     – 12 e-waste material categories, ₹/kg fair-price band + 60-day history
recyclers.json  – authorized recycler / aggregator directory (demo entries, Maharashtra)
categories.json – category metadata (names in en/hi/mr, icon, hazard notes, ImageNet label hints)
safety.json     – safety guidance cards (en/hi/mr)

Prices are indicative demo values seeded from public market surveys; the platform replaces
them with live recycler quotes once deployed.
"""
import json
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(26229)
OUT = Path(__file__).resolve().parents[1] / "data"
OUT.mkdir(exist_ok=True)

# id, en, hi, mr, icon, base ₹/kg, volatility, hazard, imagenet hints
CATS = [
    ("mobile_phone", "Mobile phones", "मोबाइल फ़ोन", "मोबाईल फोन", "📱", 460, 0.012, "battery",
     ["cellular telephone", "cellphone", "hand-held computer", "iPod", "pay-phone", "dial telephone"]),
    ("laptop", "Laptops / desktops", "लैपटॉप / कंप्यूटर", "लॅपटॉप / संगणक", "💻", 190, 0.010, "battery",
     ["laptop", "notebook", "desktop computer", "computer keyboard", "mouse", "space bar", "typewriter keyboard"]),
    ("pcb", "Circuit boards (PCB)", "सर्किट बोर्ड (PCB)", "सर्किट बोर्ड (PCB)", "🔌", 310, 0.015, "leach",
     ["modem", "radio", "oscilloscope", "cassette player", "tape player", "CD player", "digital clock", "joystick", "remote control", "switch", "hard disc", "solar dish", "circuit"]),
    ("cable_copper", "Copper cables", "तांबे के तार", "तांब्याच्या तारा", "🧵", 520, 0.014, "burn",
     ["coil", "chain", "whistle", "plug", "hook"]),
    ("li_ion_battery", "Li-ion batteries", "लिथियम बैटरी", "लिथियम बॅटरी", "🔋", 118, 0.020, "fire",
     ["lighter", "power drill"]),
    ("lead_acid_battery", "Lead-acid batteries", "लेड-एसिड बैटरी", "लेड-अ‍ॅसिड बॅटरी", "🪫", 108, 0.008, "acid",
     ["car battery"]),
    ("led_tv", "LED / LCD TVs & monitors", "LED / LCD टीवी, मॉनिटर", "LED / LCD टीव्ही, मॉनिटर", "📺", 62, 0.010, "mercury",
     ["television", "monitor", "screen", "home theater", "projector", "entertainment center"]),
    ("crt", "CRT TVs / monitors", "CRT टीवी", "CRT टीव्ही", "🖥️", 11, 0.006, "lead",
     ["desktop computer", "television"]),
    ("compressor", "AC / fridge compressors", "AC / फ्रिज कंप्रेसर", "AC / फ्रीज कॉम्प्रेसर", "❄️", 74, 0.009, "gas",
     ["refrigerator", "icebox", "air conditioner", "space heater"]),
    ("small_appliance", "Small appliances", "छोटे उपकरण", "लहान उपकरणे", "🔧", 38, 0.008, "none",
     ["microwave", "toaster", "espresso maker", "vacuum", "hair drier", "iron", "electric fan", "sewing machine", "washer", "dishwasher", "blender", "mixer", "waffle iron", "loudspeaker", "table lamp", "lampshade", "spotlight"]),
    ("printer", "Printers / copiers", "प्रिंटर", "प्रिंटर", "🖨️", 32, 0.007, "toner",
     ["printer", "photocopier", "scanner"]),
    ("ewaste_plastic", "E-waste plastics", "ई-कचरा प्लास्टिक", "ई-कचरा प्लास्टिक", "♻️", 16, 0.006, "none",
     ["plastic bag", "packet", "carton", "crate"]),
]

today = date(2026, 9, 21)
prices = {"generated": today.isoformat(), "unit": "INR/kg", "days": 60,
          "note": "Demo dataset seeded from public market surveys; replaced by live recycler quotes in deployment.",
          "categories": {}}
categories = []
for cid, en, hi, mr, icon, base, vol, hazard, hints in CATS:
    hist, p = [], base * random.uniform(0.9, 0.97)
    for i in range(60):
        d = today - timedelta(days=59 - i)
        p = max(1, p * (1 + random.gauss(0.0012, vol)))
        hist.append([d.isoformat(), round(p, 1)])
    cur = hist[-1][1]
    prices["categories"][cid] = {
        "today": round(cur, 1), "low": round(cur * 0.9, 1), "high": round(cur * 1.09, 1),
        "change_30d_pct": round((cur / hist[-31][1] - 1) * 100, 1), "history": hist,
        "sources": ["recycler quotes (demo)", "LME/MCX Cu-Al index (demo)", "field survey (demo)"],
    }
    categories.append({"id": cid, "name": {"en": en, "hi": hi, "mr": mr}, "icon": icon, "hazard": hazard, "hints": hints})

json.dump(prices, open(OUT / "prices.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump(categories, open(OUT / "categories.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# Authorized recyclers / aggregators (demo entries; EPR IDs illustrative)
REC = [
    ("r1", "GreenCycle E-Waste Pvt Ltd", "recycler", "EPR-R/MH/1024", 21.0955, 79.1210, "Hingna MIDC, Nagpur", 4.7, True, ["pcb", "mobile_phone", "laptop", "cable_copper", "led_tv", "printer"], 1.03),
    ("r2", "Nagpur Metal Recovery", "recycler", "EPR-R/MH/0871", 21.1702, 79.0410, "Butibori, Nagpur", 4.4, False, ["cable_copper", "compressor", "pcb", "small_appliance", "crt"], 0.98),
    ("r3", "Saathi Aggregator Hub", "aggregator", "AGG-MH-NGP-017", 21.1520, 79.0790, "Sitabuldi, Nagpur", 4.9, True, ["mobile_phone", "pcb", "laptop", "li_ion_battery", "small_appliance", "ewaste_plastic", "printer", "led_tv"], 0.99),
    ("r4", "Vidarbha Battery Recyclers", "recycler", "EPR-R/MH/1310", 21.2000, 79.1500, "Kamptee Road, Nagpur", 4.2, True, ["li_ion_battery", "lead_acid_battery"], 1.06),
    ("r5", "EcoReturn Recyclers", "recycler", "EPR-R/MH/0442", 21.0650, 79.0500, "Wadi, Nagpur", 4.5, False, ["led_tv", "crt", "printer", "small_appliance", "ewaste_plastic"], 1.0),
    ("r6", "Orange City Scrap Collective", "aggregator", "AGG-MH-NGP-031", 21.1350, 79.1100, "Sadar, Nagpur", 4.6, True, ["cable_copper", "compressor", "small_appliance", "ewaste_plastic", "crt"], 0.96),
    ("r7", "Pune E-Recyclers Ltd", "recycler", "EPR-R/MH/0208", 18.5900, 73.7400, "Hinjewadi, Pune", 4.6, True, ["pcb", "mobile_phone", "laptop", "led_tv", "li_ion_battery"], 1.04),
    ("r8", "Mumbai Urban Mining Co", "recycler", "EPR-R/MH/0115", 19.1100, 72.9000, "Bhandup, Mumbai", 4.3, True, ["pcb", "mobile_phone", "laptop", "cable_copper", "led_tv", "printer", "compressor"], 1.02),
    ("r9", "Aurangabad Green Metals", "recycler", "EPR-R/MH/0967", 19.8760, 75.3430, "Waluj MIDC, Chh. Sambhajinagar", 4.1, False, ["cable_copper", "compressor", "lead_acid_battery", "crt"], 0.97),
    ("r10", "Nashik Circuit Recyclers", "recycler", "EPR-R/MH/1188", 19.9975, 73.7898, "Ambad MIDC, Nashik", 4.4, True, ["pcb", "laptop", "mobile_phone", "printer"], 1.01),
]
recyclers = []
for rid, name, typ, epr, lat, lon, addr, rating, pickup, mats, pf in REC:
    recyclers.append({"id": rid, "name": name, "type": typ, "epr_id": epr, "lat": lat, "lon": lon, "address": addr, "rating": rating,
                      "pickup": pickup, "materials": mats, "price_factor": pf, "capacity_kg_day": random.choice([500, 1000, 2000, 5000]),
                      "hours": "09:00–18:00", "phone": "+91 98xxx xxxxx", "pays": ["cash", "upi"] if typ == "aggregator" else ["upi", "cash"]})
json.dump(recyclers, open(OUT / "recyclers.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

SAFETY = [
    {"id": "battery", "icon": "🔋", "for": ["li_ion_battery", "mobile_phone", "laptop"],
     "en": ["Keep batteries separate from metal scrap — short circuits start fires.", "Never puncture or crush swollen batteries.", "Store in a dry bucket with sand; tape the terminals."],
     "hi": ["बैटरी को धातु के कबाड़ से अलग रखें — शॉर्ट सर्किट से आग लगती है।", "फूली हुई बैटरी को कभी न दबाएँ, न छेदें।", "सूखी बाल्टी में रेत के साथ रखें; टर्मिनल पर टेप लगाएँ।"],
     "mr": ["बॅटरी धातूच्या भंगारापासून वेगळ्या ठेवा — शॉर्ट सर्किटमुळे आग लागते.", "फुगलेली बॅटरी कधीही दाबू नका किंवा छिद्र पाडू नका.", "कोरड्या बादलीत वाळूसोबत ठेवा; टर्मिनलवर टेप लावा."]},
    {"id": "burn", "icon": "🔥", "for": ["cable_copper"],
     "en": ["Do not burn cables to strip copper — the smoke contains dioxins that damage lungs.", "Use a wire stripper or sell insulated cable; recyclers pay for it.", "Burning is illegal under the E-Waste Rules and pollutes your own neighbourhood."],
     "hi": ["तांबा निकालने के लिए तार न जलाएँ — धुएँ में डायोक्सिन होता है जो फेफड़े खराब करता है।", "वायर स्ट्रिपर उपयोग करें या तार बिना जलाए बेचें; रीसाइक्लर इसका दाम देते हैं।", "जलाना ई-कचरा नियमों के तहत गैरकानूनी है और आपके मोहल्ले को प्रदूषित करता है।"],
     "mr": ["तांबे काढण्यासाठी तारा जाळू नका — धुरात डायऑक्सिन असते जे फुफ्फुसे खराब करते.", "वायर स्ट्रिपर वापरा किंवा तार न जाळता विका; रीसायकलर त्याचे पैसे देतात.", "जाळणे ई-कचरा नियमांनुसार बेकायदेशीर आहे आणि तुमच्याच वस्तीत प्रदूषण करते."]},
    {"id": "leach", "icon": "🧪", "for": ["pcb"],
     "en": ["Never use acid to pull gold from circuit boards — fumes burn skin and lungs.", "Whole boards fetch a better price from authorized recyclers than home-extracted metal.", "Wear gloves; wash hands before eating."],
     "hi": ["सर्किट बोर्ड से सोना निकालने के लिए तेज़ाब न डालें — भाप त्वचा और फेफड़े जला देती है।", "पूरा बोर्ड अधिकृत रीसाइक्लर को बेचने पर घर पर निकाली धातु से ज़्यादा दाम मिलता है।", "दस्ताने पहनें; खाने से पहले हाथ धोएँ।"],
     "mr": ["सर्किट बोर्डमधून सोने काढण्यासाठी आम्ल वापरू नका — वाफेने त्वचा व फुफ्फुसे भाजतात.", "संपूर्ण बोर्ड अधिकृत रीसायकलरला विकल्यास घरी काढलेल्या धातूपेक्षा जास्त भाव मिळतो.", "हातमोजे घाला; जेवण्यापूर्वी हात धुवा."]},
    {"id": "crt", "icon": "🖥️", "for": ["crt", "led_tv"],
     "en": ["CRT glass contains lead; do not break the tube. Carry it upright.", "LCD backlights contain mercury — do not smash panels.", "Handover whole units; the recycler dismantles them safely."],
     "hi": ["CRT के काँच में सीसा होता है; ट्यूब न तोड़ें, सीधा उठाएँ।", "LCD की बैकलाइट में पारा होता है — पैनल न तोड़ें।", "पूरी यूनिट सौंपें; रीसाइक्लर उसे सुरक्षित तरीके से खोलता है।"],
     "mr": ["CRT च्या काचेत शिसे असते; ट्यूब फोडू नका, सरळ उचला.", "LCD बॅकलाइटमध्ये पारा असतो — पॅनेल फोडू नका.", "संपूर्ण युनिट सुपूर्द करा; रीसायकलर ते सुरक्षितपणे उघडतो."]},
    {"id": "acid", "icon": "⚠️", "for": ["lead_acid_battery"],
     "en": ["Lead-acid batteries leak sulphuric acid — keep upright, never open them.", "Sell only to a registered battery recycler (Battery Waste Rules 2022).", "If acid touches skin, rinse with plenty of water."],
     "hi": ["लेड-एसिड बैटरी से तेज़ाब रिसता है — सीधी रखें, कभी न खोलें।", "केवल पंजीकृत बैटरी रीसाइक्लर को बेचें (बैटरी अपशिष्ट नियम 2022)।", "तेज़ाब त्वचा पर लगे तो खूब पानी से धोएँ।"],
     "mr": ["लेड-अ‍ॅसिड बॅटरीतून आम्ल गळते — सरळ ठेवा, कधीही उघडू नका.", "फक्त नोंदणीकृत बॅटरी रीसायकलरला विका (बॅटरी कचरा नियम 2022).", "आम्ल त्वचेवर लागल्यास भरपूर पाण्याने धुवा."]},
    {"id": "gas", "icon": "❄️", "for": ["compressor"],
     "en": ["Do not cut compressors open — refrigerant gas is harmful and oil spills.", "Authorized recyclers recover the gas; you still get paid for the copper and steel."],
     "hi": ["कंप्रेसर को काटकर न खोलें — गैस हानिकारक है और तेल फैलता है।", "अधिकृत रीसाइक्लर गैस निकालते हैं; तांबे और लोहे का दाम आपको फिर भी मिलता है।"],
     "mr": ["कॉम्प्रेसर कापून उघडू नका — वायू हानिकारक असतो आणि तेल सांडते.", "अधिकृत रीसायकलर वायू काढतात; तांबे आणि लोखंडाचे पैसे तुम्हाला तरीही मिळतात."]},
]
json.dump(SAFETY, open(OUT / "safety.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote", [p.name for p in OUT.iterdir()])
