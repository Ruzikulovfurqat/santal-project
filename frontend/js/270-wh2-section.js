  /* ================= Омбор 2 — алоҳида, мустақил бўлим =================
     Асосий "Омборлар" бўлимига ҳеч қандай алоқаси йўқ — фойдаланувчининг
     аниқ топшириғи бўйича бутунлай янги, мустақил маълумотлар тўплами
     (STATE.wh2Orders / STATE.wh2Receipts / STATE.wh2Chikims) устида
     ишлайди. "Кирим" ва "Чиқим" бўлимлари тўлиқ спецификация билан
     берилган; "Қолдиқ","Тарих" бўлимлари навигацияда тайёр турибди, лекин
     ичи фойдаланувчи кейинги хабарларда аниқ талабларини берганда
     тўлдирилади (ҳозирча "тез орада" ҳолатида — бирон нарсани ўзбошимча
     ўйлаб топиб хато қурилма қурмаслик учун).
     Диққат: "Буюртма" бўлими фойдаланувчи сўровига кўра (2026-09-30) шу
     ердан "Омборлар" бўлимига кўчирилди (қаранг: renderWh2Buyurtma ва
     viewWarehouse/whSubnav ичидаги "buyurtma" филиали) — STATE.wh2Orders
     маълумотлари ва барча ёрдамчи функциялари (wh2OrderById,
     wh2OrdersForSupplier ва ҳ.к.) ўша номлари билан ўзгармай қолди, фақат
     навигация жойи ўзгарди, шунга кўра бу ерда энди "Буюртма" йўқ. */
  var WH2_TABS = [["kirim","Кирим"],["chikim","Чиқим"],["koldiq","Қолдиқ"],["tarix","Тарих"]];
  function wh2Subnav(active){
    return '<div class="filter-row" style="margin-bottom:18px;">'+WH2_TABS.map(function(t){
      return '<button class="pill-filter'+(active===t[0]?" active":"")+'" data-wh2view="'+t[0]+'">'+t[1]+'</button>';
    }).join("")+'</div>';
  }
  function wireWh2Subnav(root){
    root.querySelectorAll("[data-wh2view]").forEach(function(b){ b.addEventListener("click", function(){ STATE.wh2View=b.getAttribute("data-wh2view"); render(); }); });
  }
  function viewWh2(){
    if(STATE.wh2View==="chikim") return renderWh2Chikim();
    if(STATE.wh2View==="koldiq") return renderWh2Koldiq();
    if(STATE.wh2View==="tarix") return renderWh2Placeholder("tarix","Тарих");
    return renderWh2Kirim();
  }
  function renderWh2Placeholder(tabId, label){
    setTopbar("Омбор 2 — "+label, "", "");
    var root = document.getElementById("content");
    root.innerHTML = wh2Subnav(tabId) + emptyState("«"+label+"» бўлими тез орада", "Бу бўлимнинг тартиби ва майдонлари сиз аниқ кўрсатмалар берганингиздан кейин қўшилади.");
    wireWh2Subnav(root);
  }

