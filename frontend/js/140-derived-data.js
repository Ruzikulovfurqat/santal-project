  /* ================= derived data ================= */
  function orderStatus(o){
    if(o.cancelled) return {key:"cancelled", label:"Бекор қилинди", chip:"chip-neutral"};
    if(o.completed) return {key:"completed", label:STAGE_NAMES[STAGE_DELIVERED_IDX], chip:"chip-good"};
    if(o.dueDate && daysDiff(o.dueDate) < 0) return {key:"overdue", label:"Кечикди", chip:"chip-critical"};
    if((o.currentStageIndex||0) >= STAGE_READY_IDX) return {key:"progress", label:STAGE_NAMES[STAGE_READY_IDX], chip:"chip-accent"};
    return {key:"progress", label:"Жараёнда", chip:"chip-accent"};
  }
  function orderStageLabel(o){
    if(o.completed) return STAGE_NAMES[STAGE_NAMES.length-1];
    var idx = Math.min(o.currentStageIndex||0, STAGE_NAMES.length-1);
    return STAGE_NAMES[idx];
  }
  /* ---- item <-> order matching (by exact product name) used to auto-advance
     an order to "Тайёр омборда" the moment stock covers it, whether that
     stock appeared via production output or a warehouse receipt. ---- */
  function findItemByExactName(name){
    name = (name||"").trim().toLowerCase();
    if(!name) return null;
    return STATE.items.find(function(it){ return (it.name||"").trim().toLowerCase()===name; }) || null;
  }
  function advanceReadyOrdersForProductName(productName){
    /* 2026-10-03 буюртма бир нечта маҳсулотли (items[]) бўлиши мумкин бўлгани
       учун — энди фақат НОМИ мос келган биттаси эмас, бутун буюртмадаги
       БАРЧА маҳсулотлар омборда етарли бўлгандагина "Тайёр омборда"
       босқичига ўтказилади. Бир вақтда бир неча буюртма ўша тақчил
       маҳсулотни кутаётган бўлса — эскиси олдин (яратилган санаси бўйича)
       "банд қилиб олади", шунга кўра кейингилари учун қолдиқ камайтирилган
       ҳолда текширилади (эски бир-маҳсулотли мантиқнинг кўп-маҳсулотли
       умумлашмаси). */
    var pName = (productName||"").trim().toLowerCase();
    if(!pName) return;
    var waiting = STATE.orders.filter(function(o){
      if(o.completed || o.cancelled) return false;
      if((o.currentStageIndex||0) >= STAGE_READY_IDX) return false;
      return orderItemsList(o).some(function(it){ return (it.product||"").trim().toLowerCase()===pName; });
    }).sort(function(a,b){ return (a.createdAt||"").localeCompare(b.createdAt||""); });
    if(!waiting.length) return;
    var availableByItem = {};
    function availFor(itemId){
      if(!(itemId in availableByItem)) availableByItem[itemId] = totalStockQty(itemId);
      return availableByItem[itemId];
    }
    waiting.forEach(function(o){
      var resolved = orderItemsList(o).map(function(it){
        var matchedItem = it.itemId ? itemById(it.itemId) : findItemByExactName(it.product);
        return { itemId: matchedItem?matchedItem.id:null, need: Number(it.quantity)||0 };
      });
      var allOk = resolved.length>0 && resolved.every(function(r){ return r.itemId && (r.need<=0 || availFor(r.itemId)>=r.need); });
      if(allOk){
        resolved.forEach(function(r){ if(r.itemId && r.need>0) availableByItem[r.itemId] = availFor(r.itemId) - r.need; });
        dbUpdate("orders", o.id, {currentStageIndex:STAGE_READY_IDX}, STATE.orders);
      }
    });
  }
  function computeStats(){
    var orders = STATE.orders, employees = STATE.employees;
    var total = orders.length, completed=0, overdue=0, progress=0, cancelled=0;
    orders.forEach(function(o){
      var s = orderStatus(o);
      if(s.key==="completed") completed++;
      else if(s.key==="overdue") overdue++;
      else if(s.key==="cancelled") cancelled++;
      else progress++;
    });
    var now = new Date();
    var buckets = [];
    for(var i=5;i>=0;i--){
      var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      buckets.push({y:d.getFullYear(), m:d.getMonth(), label:MONTHS_SHORT[d.getMonth()], count:0});
    }
    orders.forEach(function(o){
      if(!o.createdAt) return;
      var d = new Date(o.createdAt);
      if(isNaN(d)) return;
      buckets.forEach(function(b){ if(b.y===d.getFullYear() && b.m===d.getMonth()) b.count++; });
    });
    var byStage = STAGE_NAMES.map(function(name){ return {stage:name, count:0}; });
    orders.forEach(function(o){
      if(o.cancelled || o.completed) return;
      var idx = Math.min(o.currentStageIndex||0, STAGE_NAMES.length-1);
      byStage[idx].count++;
    });
    var lowStock = STATE.items.filter(function(it){ return totalStockQty(it.id) <= Number(it.minQuantity||0); }).map(function(it){
      return { name:it.name, unit:it.unit, quantity:totalStockQty(it.id), minQuantity:it.minQuantity };
    });
    /* Меъёридан ортиб кетган захиралар — масалан, чиқинди/кул тўпланиб
       кетган бўлса. Фақат maxQuantity>0 (яъни чегара аниқ белгиланган)
       маҳсулотлар текширилади — 0 "чекланмаган" дегани. */
    var overStock = STATE.items.filter(function(it){ return Number(it.maxQuantity||0)>0 && totalStockQty(it.id) > Number(it.maxQuantity||0); }).map(function(it){
      return { name:it.name, unit:it.unit, quantity:totalStockQty(it.id), maxQuantity:it.maxQuantity };
    });
    var posMap = {};
    employees.forEach(function(e){
      var p = (e.position||"Номаълум").trim() || "Номаълум";
      posMap[p] = (posMap[p]||0)+1;
    });
    var byPosition = Object.keys(posMap).map(function(k){ return {position:k, count:posMap[k]}; }).sort(function(a,b){ return b.count-a.count; });
    return {
      total:total, completed:completed, overdue:overdue, progress:progress, cancelled:cancelled,
      byMonth:buckets, byStage:byStage, lowStock:lowStock, overStock:overStock, byPosition:byPosition,
      totalEmployees:employees.length, activeEmployees:employees.filter(function(e){ return e.status!=="bo'shagan"; }).length
    };
  }
  function hasSampleData(){
    return STATE.orders.some(function(o){return o.sample;}) || STATE.employees.some(function(o){return o.sample;}) ||
           STATE.items.some(function(o){return o.sample;}) || STATE.recipes.some(function(o){return o.sample;}) ||
           STATE.productions.some(function(o){return o.sample;});
  }
  function clearSampleData(){
    var sampleItemIds = STATE.items.filter(function(x){return x.sample;}).map(function(x){return x.id;});
    ["orders","employees","items","recipes","productions"].forEach(function(collName){
      STATE[collName].filter(function(x){return x.sample;}).forEach(function(x){
        dbDelete(collName, x.id, STATE[collName]);
      });
    });
    STATE.stock.filter(function(s){ return sampleItemIds.indexOf(s.itemId)!==-1; }).forEach(function(s){
      dbDelete("stock", s.id, STATE.stock);
    });
    toast("Намунавий маълумотлар ўчирилди");
  }

