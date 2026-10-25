  /* ================= Омбор 2: Кирим =================
     МУСТАҚИЛ регистр — асосий омбор қолдиғига (STATE.stock) АСЛО таъсир
     қилмайди. "Туркум" (Хом ашё/Товар/Тайёр маҳсулот) фақат ҳужжат белгиси,
     маҳсулот танлашни филтрламайди.
     "Боғланган буюртма" майдони STATE.wh2Orders'дан (энди "Омборлар →
     Буюртма" бўлимида яратилади — қаранг: renderWh2Buyurtma яқинидаги
     изоҳ), танланган таъминотчи бўйича филтрланиб олинади — асосий
     дастурнинг Buyurtmalar модулидан эмас. */
  var WH2_RECEIPT_CATEGORIES = [["xomashyo","Хом ашё"],["tovar","Товар"],["tayyor","Тайёр маҳсулот"]];
  /* Фойдаланувчи "+" тугмаси орқали қўшган қўшимча туркумлар — асосий 3
     турдан ташқари, STATE.wh2Categories (Firestore "wh2Categories" коллекцияси)
     орқали доимий сақланади. wh2AllCategories() иккисини бирлаштириб
     қайтаради — Кирим формасидаги "Туркум" танлови, Қолдиқ ҳисоботларидаги
     "Туркум" филтри ва Кирим → Қайтариш бўлимидаги "Кимдан" туркум танлови
     барчаси ШУ БИТТА рўйхатдан фойдаланади. */
  function wh2AllCategories(){
    return WH2_RECEIPT_CATEGORIES.map(function(c){ return {id:c[0], name:c[1]}; })
      .concat((STATE.wh2Categories||[]).slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); }).map(function(c){ return {id:c.id, name:c.name}; }));
  }
  function wh2ReceiptCategoryLabel(code){
    var f = WH2_RECEIPT_CATEGORIES.find(function(c){ return c[0]===code; });
    if(f) return f[1];
    var custom = (STATE.wh2Categories||[]).find(function(c){ return c.id===code; });
    return custom ? custom.name : "—";
  }
  /* "Ўлчов бирлиги"даги openUnitForm'га ўхшаш тезкор-қўшиш ойнаси — фақат
     номи сўралади, dbSet орқали ЎЗ id'си билан (uid()) бевосита яратилади
     (dbAdd'даги "_pending_" вақтинчалик id муаммосидан қочиш учун — худди
     openUnitForm'даги units каби). onSaved(newId, newName) чақирилади. */
  function openWh2CategoryForm(onSaved){
    var body = '<div class="field"><label>Туркум номи</label><input id="wcat-name" placeholder="Масалан: Ускуналар" autofocus></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Яратиш</button>';
    var m = openModal("Янги туркум", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#wcat-name").value.trim();
      if(!name){ toast("Номини киритинг"); return; }
      var dup = wh2AllCategories().find(function(c){ return (c.name||"").trim().toLowerCase()===name.toLowerCase(); });
      if(dup){ toast("Бу номдаги туркум аллақачон мавжуд"); return; }
      var newId = uid();
      dbSet("wh2Categories", newId, {name:name, createdAt:new Date().toISOString()}, STATE.wh2Categories);
      toast("Туркум қўшилди");
      closeModal();
      if(onSaved) onSaved(newId, name);
    });
  }
  function wh2ReceiptById(id){ return STATE.wh2Receipts.find(function(x){ return x.id===id; }); }
  function wh2FreshReceiptNumber(){ return "OMB2-KIRIM-"+new Date().getFullYear()+"-"+String(STATE.wh2Receipts.length+1).padStart(3,"0"); }
  function wh2Round2(n){ return Math.round((Number(n)||0)*100)/100; }
  function wh2ReceiptTotal(r){ return (r.lines||[]).reduce(function(s,ln){ return s+(Number(ln.totalWithVat)||0); },0); }
  function wh2OrdersForSupplier(supplierId){
    if(!supplierId) return [];
    return STATE.wh2Orders.filter(function(o){ return o.supplierId===supplierId; }).sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
  }
  /* Пикер/тезкор-қўшиш орқали танланган (ёки янги яратилган) маҳсулотни
     қатор объектига жойлаштиради — фойдаланувчи қўлда нарх киритмаган
     бўлса каталог нархини таклиф қилиб, жами устунларини форвард
     каскадда ҳисоблаб қўяди (қўлда киритилган нарх бор бўлса тегмайди). */
  function wh2FillItemOnLine(ln, itm){
    if(!ln || !itm) return;
    ln.itemId = itm.id; ln.itemName = itm.name;
    if(!ln.unit) ln.unit = itm.unit||"";
    if(!Number(ln.price)){
      ln.price = Number(itm.price)||0;
      ln.lineTotal = wh2Round2((Number(ln.qty)||0)*(Number(ln.price)||0));
      ln.vatSum = wh2Round2(ln.lineTotal*(Number(ln.vatPct)||0)/100);
      ln.totalWithVat = wh2Round2(ln.lineTotal+ln.vatSum);
    }
  }

