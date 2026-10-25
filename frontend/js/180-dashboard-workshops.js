  /* ================= Бошқарув панели: цехлар кесимида =================
     2026-10-05 сўровига кўра: Бошқарув панелига кирганда 4 та катта карточка
     (Радиатор цех, Токар цех, Газ қозон цех, Кўмир қозон цех); ҳар бирининг
     ичида ЎША цехга тегишли касса қолдиғи, тайёр маҳсулот, кам қолган
     хомашё, сўнгги буюртмалар, қарздорликлар ва ойлик савдо/харажат/фойда.
     Фақат янги кўриниш/ҳисоб — мавжуд ёзувлар ЎЗГАРМАЙДИ. Цехга боғлиқлик:
       • буюртма — o.workshopId (аввалдан бор);
       • сотув — s.workshopId, бўлмаса буюртмасининг цехи;
       • касса — cashAccounts[].workshopId (янги, ихтиёрий майдон);
       • маҳсулот/хомашё — items[].workshopIds (янги, ихтиёрий, бир нечта
         цех бўлиши мумкин — масалан умумий хомашё);
       • таъминотчи қарзи — кирим (receipt) маҳсулотининг цехи, асосий
         ускуна киримида эса унинг ўз цехи.
     4 та цех "Цехлар" рўйхатидаги ёзув билан НОМ орқали боғланади (масалан
     "Радиатор цехи 1" ҳам Радиатор цехига тушади); агар мос ёзув йўқ бўлса,
     цех ичига кириб бириктириш пайтида автоматик янги ёзув яратилади. */
  var DASH_WORKSHOPS = [
    {key:"radiator", name:"Радиатор цех", kw:["радиатор","radiator"], tone:"accent"},
    {key:"tokar", name:"Токар цех", kw:["токар","tokar"], tone:"good"},
    {key:"gaz", name:"Газ катёл цех", kw:["газ","gaz"], tone:"warning"},
    {key:"kumir", name:"Кўмир катёл цех", kw:["кумир","комир","кумур","kumir","komir"], tone:"critical"}
  ];
  function dwNorm(s){
    return String(s||"").toLowerCase().replace(/[ʻʼ'`’‘]/g,"").replace(/ў/g,"у").replace(/қ/g,"к").replace(/ғ/g,"г").replace(/ҳ/g,"х").replace(/ё/g,"е");
  }
  function dwOf(key){ return DASH_WORKSHOPS.find(function(d){ return d.key===key; }); }
  function dwKeyOfRecord(w){
    if(w.dashKey && dwOf(w.dashKey)) return w.dashKey;
    var n = dwNorm(w.name);
    for(var i=0;i<DASH_WORKSHOPS.length;i++){
      if(DASH_WORKSHOPS[i].kw.some(function(k){ return n.indexOf(dwNorm(k))>-1; })) return DASH_WORKSHOPS[i].key;
    }
    return "";
  }
  function dwIds(key){
    return STATE.workshops.filter(function(w){ return dwKeyOfRecord(w)===key; }).map(function(w){ return w.id; });
  }
  /* Цехнинг асосий ёзуви id'си; йўқ бўлса — янги цех ёзуви яратилади. */
  function dwEnsure(key){
    var ids = dwIds(key);
    if(ids.length) return ids[0];
    var d = dwOf(key), newId = uid();
    dbSet("workshops", newId, {name:d.name, headEmployeeId:"", headName:"", note:"", dashKey:key, createdAt:new Date().toISOString()}, STATE.workshops);
    return newId;
  }
  function dwItemIds(it){ return Array.isArray(it.workshopIds) ? it.workshopIds.slice() : []; }
  function dwItemIn(it, ids){ return dwItemIds(it).some(function(x){ return ids.indexOf(x)>-1; }); }
  function dwItemKeys(it){
    return DASH_WORKSHOPS.filter(function(d){ var ids=dwIds(d.key); return dwItemIn(it, ids); }).map(function(d){ return d.key; });
  }
  function dwAccKey(a){
    if(!a.workshopId) return "";
    var w = workshopById(a.workshopId);
    return w ? dwKeyOfRecord(w) : "";
  }
  function dwSaleWorkshopId(s){
    if(s.workshopId) return s.workshopId;
    var o = s.orderId ? STATE.orders.find(function(x){ return x.id===s.orderId; }) : null;
    return o ? (o.workshopId||"") : "";
  }
  /* Маҳсулот/хомашё формасидаги "цех" белгилари билан ишлаш учун. */
  function dwCheckboxesHtml(prefix, selectedKeys){
    return DASH_WORKSHOPS.map(function(d){
      return '<label style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-weight:600;font-size:13px;cursor:pointer;"><input type="checkbox" data-'+prefix+'="'+d.key+'" style="width:auto;"'+(selectedKeys.indexOf(d.key)>-1?" checked":"")+'>'+esc(d.name)+'</label>';
    }).join("");
  }
  function dwReadCheckboxes(root, prefix){
    return Array.prototype.slice.call(root.querySelectorAll("[data-"+prefix+"]")).filter(function(c){ return c.checked; }).map(function(c){ return c.getAttribute("data-"+prefix); });
  }
  function dwMergeItemIds(cur, keys){
    var out = cur.filter(function(id){ var w=workshopById(id); return !(w && dwKeyOfRecord(w)); });
    DASH_WORKSHOPS.forEach(function(d){
      var present = cur.filter(function(id){ return dwIds(d.key).indexOf(id)>-1; });
      if(keys.indexOf(d.key)===-1) return;
      if(present.length) out = out.concat(present); else out.push(dwEnsure(d.key));
    });
    return out;
  }

  /* ---- Цех категориясини аниқлаш ёрдамчилари (2026-10-06) ---- */
  function dwKeyFromText(text){
    var n = dwNorm(text);
    if(!n) return "";
    for(var i=0;i<DASH_WORKSHOPS.length;i++){
      if(DASH_WORKSHOPS[i].kw.some(function(k){ return n.indexOf(dwNorm(k))>-1; })) return DASH_WORKSHOPS[i].key;
    }
    return "";
  }
  /* Буюртма қатори учун цехни тахмин қилиш: маҳсулотнинг ўзи бириктирилган
     цех (фақат биттаси бўлса) → маҳсулот номидаги калит сўз → буюртманинг цехи. */
  function dwDefaultKeyForOrderItem(it, order){
    var itm = it.itemId ? itemById(it.itemId) : null;
    if(!itm && (it.product||it.name)){
      var nm = String(it.product||it.name).trim().toLowerCase();
      itm = STATE.items.find(function(x){ return (x.name||"").trim().toLowerCase()===nm; });
    }
    if(itm){ var ks = dwItemKeys(itm); if(ks.length===1) return ks[0]; }
    var k = dwKeyFromText(it.product||it.name||""); if(k) return k;
    if(order && order.workshopId){ var w = workshopById(order.workshopId); var kk = w ? dwKeyOfRecord(w) : ""; if(kk) return kk; }
    return "";
  }
  /* Сотув қаторларини цехлар бўйича ажратиш: ҳар бир қаторнинг ўз категорияси
     (categoryKey); эски сотувларда (категория йўқ) — тахмин қилинади. Қаторлар
     бўлмаса, бутун сотув суммаси сотувнинг цехига ёзилади. */
  function dwSaleParts(s){
    var order = s.orderId ? orderById(s.orderId) : null;
    var saleW = s.workshopId || (order ? order.workshopId : "");
    var saleKey = ""; if(saleW){ var sw = workshopById(saleW); saleKey = sw ? dwKeyOfRecord(sw) : ""; }
    var parts = (s.items||[]).map(function(it){
      var key = (it.categoryKey && dwOf(it.categoryKey)) ? it.categoryKey : (dwDefaultKeyForOrderItem({itemId:it.itemId, product:it.name}, order) || saleKey);
      return {key:key, name:it.name||"—", unit:it.unit||"", qty:Number(it.qty)||0, amount:Number(it.lineTotal)||0};
    });
    var sum = parts.reduce(function(a,x){ return a+x.amount; },0);
    if(!parts.length || sum<=0){
      return [{key:saleKey, name:(parts.length?parts[0].name:"Сотув №"+(s.saleNumber!=null?s.saleNumber:"")), unit:"", qty:0, amount:Number(s.totalWithVat||0)}];
    }
    return parts;
  }
  function dwRecipeKey(r){
    if(r.workshopKey && dwOf(r.workshopKey)) return r.workshopKey;
    var k = dwKeyFromText(r.category); if(k) return k;
    var itm = r.productItemId ? itemById(r.productItemId) : null;
    if(itm){ var ks = dwItemKeys(itm); if(ks.length===1) return ks[0]; }
    return dwKeyFromText(r.productName);
  }
  /* Бир маҳсулот учун бир нечта калькуляция бўлса — энг сўнггиси олинади
     (акс ҳолда шу маҳсулот қолдиғи икки марта ҳисобланиб кетарди). */
  function dwLatestRecipes(){
    var map = {};
    STATE.recipes.forEach(function(r){
      var k = r.productItemId || ("n:"+(r.productName||r.id));
      var stamp = (r.recipeDate||"")+"|"+(r.createdAt||"");
      if(!map[k] || stamp>map[k].stamp) map[k] = {r:r, stamp:stamp};
    });
    return Object.keys(map).map(function(k){ return map[k].r; });
  }
  /* Тайёр маҳсулот КИРИМИ сони (2026-10-06 сўровига кўра): омбордаги жорий
     қолдиқ эмас, балки «Омборлар → Кирим»да шу маҳсулотга киритилган
     жами миқдор (бекор қилинганлари ва цехдан қайтарилганлари ҳисобга
     олинмайди). Агар Омборлар кирим регистрида йўқ бўлса — асосий «Кирим»
     (маҳсулот киримлари) дан олинади. */
  function dwFinishedIncomeQty(itemId){
    if(!itemId) return 0;
    var q = 0;
    STATE.wh2Receipts.forEach(function(r){
      if(r.cancelled || r.isReturn) return;
      (r.lines||[]).forEach(function(ln){ if(ln.itemId===itemId) q += Number(ln.qty)||0; });
    });
    if(q>0) return q;
    STATE.receipts.forEach(function(r){
      if(r.cancelled || r.itemId!==itemId) return;
      q += Number(r.quantity)||0;
    });
    return q;
  }
  var DW_EXP_LABELS = [["material","Хомашё жами"],["expense","Қўшимча харажатлар жами"],["wage","Иш ҳақи жами"],["elec","Электр энергия жами"],["gas","Табиий газ жами"],["tax","Иш ҳақидан даромад солиғи жами"],["yiit","Иш ҳақидан ЯИТ жами"],["amort","Амортизация жами"],["admin","Маъмурий харажатлар жами"],["kassa","Кассадан корхона харажатига олинган чиқимлар"]];

  function dwStats(key){
    var ids = dwIds(key);
    var today = todayISO();
    var accounts = STATE.cashAccounts.filter(function(a){ return a.workshopId && ids.indexOf(a.workshopId)>-1; });
    var cash = {naqd:0, karta:0, otkazma:0, dollar:0, otkazma_usd:0};
    var accRows = accounts.map(function(a){
      var b = cashAccountBalances(a.id);
      cash.naqd+=b.naqd; cash.karta+=b.karta; cash.otkazma+=b.otkazma; cash.dollar+=b.dollar; cash.otkazma_usd+=(b.otkazma_usd||0);
      return {name:a.name, b:b};
    });
    var finished = STATE.items.filter(function(it){ return (it.itemType==="mahsulot"||it.itemType==="yarim_tayyor") && dwItemIn(it, ids); })
      .map(function(it){ return {name:it.name, unit:it.unit, qty:totalStockQty(it.id)}; })
      .sort(function(a,b){ return b.qty-a.qty || (a.name||"").localeCompare(b.name||""); });
    var lowMaterials = STATE.items.filter(function(it){ return it.itemType==="xomashyo" && dwItemIn(it, ids) && totalStockQty(it.id) <= Number(it.minQuantity||0); })
      .map(function(it){ return {name:it.name, unit:it.unit, qty:totalStockQty(it.id)}; });
    var unfinishedOrders = STATE.orders.filter(function(o){ return o.workshopId && ids.indexOf(o.workshopId)>-1 && !o.completed && !o.cancelled; })
      .sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });

    /* ДАРОМАД — сотув қаторларининг категорияси бўйича. Қарздорлик эса
       сотувнинг шу цехга тегишли улушига пропорционал бўлинади. */
    var revenue = 0, revMap = {}, custMap = {};
    STATE.sales.forEach(function(s){
      if(s.cancelled) return;
      var parts = dwSaleParts(s);
      var total = parts.reduce(function(a,x){ return a+x.amount; },0);
      var mine = parts.filter(function(x){ return x.key===key; });
      var mineAmt = mine.reduce(function(a,x){ return a+x.amount; },0);
      if(!mine.length) return;
      revenue += mineAmt;
      mine.forEach(function(x){
        var r = revMap[x.name] || (revMap[x.name] = {name:x.name, unit:x.unit, qty:0, amount:0});
        r.qty += x.qty; r.amount += x.amount;
      });
      if(Number(s.debtAmount||0)>0 && s.dueDate && s.dueDate<today && total>0){
        var k = s.customerId || s.customerName || "—";
        if(!custMap[k]) custMap[k] = {name:s.customerName||"—", overdue:0, dueDate:s.dueDate};
        custMap[k].overdue += Number(s.debtAmount||0)*mineAmt/total;
        if(s.dueDate<custMap[k].dueDate) custMap[k].dueDate = s.dueDate;
      }
    });
    var revRows = Object.keys(revMap).map(function(k){ return revMap[k]; }).sort(function(a,b){ return b.amount-a.amount; });
    var debtors = Object.keys(custMap).map(function(k){ var c=custMap[k]; c.days=-daysDiff(c.dueDate); return c; }).sort(function(a,b){ return b.overdue-a.overdue; });

    /* ХАРАЖАТ — калькуляция "Натижа"сидаги 7 та жами сумма (1 дона учун:
       партия миқдорига бўлинади) × омбордаги тайёр маҳсулот сони. */
    var expTotals = {material:0, expense:0, wage:0, elec:0, gas:0, amort:0, admin:0, tax:0, yiit:0};
    var expRows = [];
    dwLatestRecipes().filter(function(r){ return dwRecipeKey(r)===key; }).forEach(function(r){
      var n = normalizeRecipe(r), res = computeRecipeCost(n, [], 0);
      var batch = Number(n.quantity)>0 ? Number(n.quantity) : 1;
      var qty = n.productItemId ? dwFinishedIncomeQty(n.productItemId) : 0;
      var f = qty/batch;
      var c = {material:res.materialTotal*f, expense:res.expenseSum*f, wage:res.wageTotal*f, elec:res.electricityTotal*f, gas:res.gasTotal*f, amort:res.amort*f, admin:res.admin*f, tax:res.taxAmount*f, yiit:res.yiitAmount*f};
      var tot = 0; Object.keys(c).forEach(function(k){ expTotals[k]+=c[k]; tot+=c[k]; });
      expRows.push({name:n.productName, unit:n.unit, qty:qty, perUnit:(batch>0?res.subtotal1b/batch:0), total:tot});
    });
    /* Кассадан «Корхона харажатига олинсин» белгиси қўйилган чиқимлар —
       фақат шу касса бириктирилган цехнинг харажатига тушади. */
    expTotals.kassa = 0;
    var kassaRows = [];
    var accIdMap = {}; accounts.forEach(function(a){ accIdMap[a.id]=a.name; });
    STATE.cashTransactions.forEach(function(t){
      if(t.cancelled || t.direction!=="chiqim" || !t.bizCount || !accIdMap.hasOwnProperty(t.cashAccountId)) return;
      var amt = Number(t.amount)||0;
      expTotals.kassa += amt;
      kassaRows.push({date:t.date, account:accIdMap[t.cashAccountId], note:t.description||t.counterpartyName||"", amount:amt});
    });
    kassaRows.sort(function(a,b){ return (b.date||"").localeCompare(a.date||""); });
    var expensesTotal = 0; Object.keys(expTotals).forEach(function(k){ expensesTotal+=expTotals[k]; });
    var profit = revenue - expensesTotal;
    var dist = profit>0 ? {plant:profit*0.7, dividend:profit*0.1, future:profit*0.2} : {plant:0, dividend:0, future:0};
    return {
      ids:ids, cash:cash, accRows:accRows, finished:finished, lowMaterials:lowMaterials,
      unfinishedOrders:unfinishedOrders, activeOrderCount:unfinishedOrders.length,
      revenue:revenue, revRows:revRows, expTotals:expTotals, expRows:expRows, kassaRows:kassaRows, expensesTotal:expensesTotal,
      profit:profit, dist:dist, debtors:debtors, creditors:dwCreditors(ids, today)
    };
  }
  /* Биз қарздор таъминотчилар (муддати ўтган) — кирим маҳсулотининг цехи
     бўйича (бир нечта цехга бириктирилган хомашёда сумма тенг бўлинади),
     асосий ускуна киримида эса унинг ўз цехи бўйича. */
  function dwCreditors(ids, today){
    var supMap = {};
    function addSup(r, amount){
      var k = r.supplierId || r.supplierName || "—";
      if(!supMap[k]) supMap[k] = {name:r.supplierName||(r.supplierId?supplierName(r.supplierId):"—"), overdue:0, dueDate:r.dueDate};
      supMap[k].overdue += amount;
      if(r.dueDate<supMap[k].dueDate) supMap[k].dueDate = r.dueDate;
    }
    STATE.receipts.forEach(function(r){
      if(r.cancelled || !(Number(r.payableAmount||0)>0) || !r.dueDate || !(r.dueDate<today)) return;
      var it = itemById(r.itemId); if(!it) return;
      var wids = dwItemIds(it); if(!wids.length) return;
      var mine = wids.filter(function(x){ return ids.indexOf(x)>-1; }).length;
      if(!mine) return;
      addSup(r, Number(r.payableAmount||0)*mine/wids.length);
    });
    STATE.equipmentReceipts.forEach(function(r){
      if(r.cancelled || !(Number(r.payableAmount||0)>0) || !r.dueDate || !(r.dueDate<today)) return;
      if(!r.workshopId || ids.indexOf(r.workshopId)===-1) return;
      addSup(r, Number(r.payableAmount||0));
    });
    return Object.keys(supMap).map(function(k){ var c=supMap[k]; c.days=-daysDiff(c.dueDate); return c; }).sort(function(a,b){ return b.overdue-a.overdue; });
  }

