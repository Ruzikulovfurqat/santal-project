  /* ================= Лом (Алюмин) — партия асосида хомашё, калькуляция, ишлаб чиқариш, возврат =================
     Умумий ғоя: Алюмин лом киримлари ОДДИЙ "receipts" коллекциясига
     ёзилади (шунинг учун таъминотчи қарзи, тўлов ва Кирим тарихи бошқа
     ҳеч нарса қўшмасдан автоматик ишлайди), лекин "batchNumber"/"isLom"
     майдонлари билан белгиланади ва партия асосида алоҳида шакл орқали
     киритилади. Партиянинг қолдиғи (lomBatchAvailableKg) энди БИР НЕЧТА
     Лом калькуляциясига бўлиниб ишлатилиши мумкин — агар бир калькуляция
     партиянинг ҳаммасини ишлатмаса, қолган қисми кейинги калькуляцияда
     ҳам партия рақами ва қолдиғи билан танлаш учун кўринади (2026-09-24
     да фойдаланувчининг аниқ сўровига кўра ўзгартирилди — илгари ҳар бир
     партия lomBatchLockedByCalcId орқали БИТТА калькуляцияга тўлиқ,
     ажратиб бўлмайдиган ҳолда бириктирилар эди). */
  function ensureLomItem(fixedId, name, itemType, unit){
    /* Бу функция ФАҚАТ тугма босилганда (сақлаш пайтида) чақирилиши
       керак — render() жараёнида эмас, акс ҳолда dbSet ичидаги render()
       чақируви жорий рендерни ўртада қайта бошлаб юборади. */
    var existing = itemById(fixedId);
    if(existing) return existing;
    var data = {name:name, itemType:itemType, unit:unit, minQuantity:0, price:0, categoryId:"", location:""};
    dbSet("items", fixedId, Object.assign({createdAt:new Date().toISOString()}, data), STATE.items);
    return Object.assign({id:fixedId}, data);
  }
  function lomRawItem(){ return ensureLomItem("_lom_raw_alum", "Алюмин лом", "xomashyo", "кг"); }
  function lomFinishedItem(){ return ensureLomItem("_lom_finished_alum", "Тайёр алюмин", "mahsulot", "кг"); }
  function lomMetalItem(){ return ensureLomItem("_lom_metal", "Металл (ажратилган)", "xomashyo", "кг"); }
  function lomKulItem(){ return ensureLomItem("_lom_kul", "Чушка чиқинди кули", "xomashyo", "кг"); }
  /* Илгари яратилган ўрнатишларда "_lom_kul" маҳсулоти эски "Кул" номи
     билан сақланган бўлиши мумкин (ensureLomItem фақат маҳсулот ҳали
     мавжуд БЎЛМАГАНДА янги ном билан яратади, мавжуд ёзувни ўзгартирмайди).
     Фойдаланувчи аниқ сўраган номни бир марта, автоматик татбиқ этиш учун
     — бу функция render() ичида ЭМАС, балки render'дан кейин, DB уланиб,
     STATE.items тўлиқ юкланганидан кейин (boot() ичида setTimeout билан)
     чақирилади. */
  function maybeRenameLomKulItem(){
    if(STATE.lomKulRenameAttempted) return;
    var it = itemById("_lom_kul");
    if(!it) return; // ҳали яратилмаган — ensureLomItem кейинги фойдаланишда тўғри ном билан яратади
    STATE.lomKulRenameAttempted = true;
    if(it.name==="Кул") dbUpdate("items", it.id, {name:"Чушка чиқинди кули"}, STATE.items);
  }

  function lomBatchReceipts(){ return STATE.receipts.filter(function(r){ return r.isLom && !r.cancelled; }); }
  function lomBatchById(id){ return STATE.receipts.find(function(x){ return x.id===id && x.isLom; }); }
  /* Партиянинг қанча кг қисми аллақачон бир ёки бир нечта (бекор
     қилинмаган) Лом калькуляцияларида "kgUsed" сифатида белгиланганини
     йиғади — партия энди БИР калькуляцияга тўлиқ "банд" қилинмайди, балки
     бир нечта калькуляцияга бўлиниб ишлатилиши мумкин: тўлиқ ишлатилмай
     қолган қисми кейинги калькуляцияда партия рақами ва қолдиғи билан
     яна танлаш учун очиқ туради (қаранг: lomBatchAvailableKg,
     lomAvailableBatches). excludeCalcId — ҳозир таҳрирланаётган
     калькуляциянинг ўз улуши иккинчи марта айирилиб кетмаслиги учун. */
  function lomBatchUsedInCalcs(receiptId, excludeCalcId){
    var used = 0;
    STATE.lomCalcs.forEach(function(c){
      if(c.cancelled || c.id===excludeCalcId) return;
      lomCalcBatches(c).forEach(function(b){ if(b.batchReceiptId===receiptId) used += Number(b.kgUsed)||0; });
    });
    return used;
  }
  function lomBatchAvailableKg(r, excludeCalcId){
    return Math.max(0, Number(r.quantity||0) - Number(r.returnedKg||0) - lomBatchUsedInCalcs(r.id, excludeCalcId));
  }
  /* Кўп партияли калькуляция ёзувлари "batches":[{batchReceiptId,batchNumber,
     supplierName,kgUsed,batchPrice}, ...] массивида сақланади. Илгари
     сақланган (бир партияли) ёзувларда бу майдон йўқ — уларда эски
     "batchReceiptId/kgUsed/batchPrice" скаляр майдонлари ҳали ҳам тўлиқ
     ишлайди (ҳеч қачон ўзгартирилмайди/йўқотилмайди), фақат шу функция
     уларни ўқишда бир партияли массивга айлантириб беради. */
  function lomCalcBatches(c){
    if(c && c.batches && c.batches.length) return c.batches;
    if(c && c.batchReceiptId) return [{batchReceiptId:c.batchReceiptId, batchNumber:c.batchNumber||"", supplierName:c.supplierName||"", kgUsed:Number(c.kgUsed||0), batchPrice:Number(c.batchPrice||0)}];
    return [];
  }
  function lomCalcBatchLabel(c){
    var list = lomCalcBatches(c);
    if(!list.length) return "—";
    return list.map(function(b){ return "№"+(b.batchNumber||"—"); }).join(", ");
  }
  function lomCalcSupplierLabel(c){
    var names = [];
    lomCalcBatches(c).forEach(function(b){ if(b.supplierName && names.indexOf(b.supplierName)===-1) names.push(b.supplierName); });
    if(!names.length) return "—";
    return names.length===1 ? names[0] : ("Турли таъминотчилар ("+names.length+")");
  }
  /* Калькуляцияга кирган хом лом партиялари орқали шу калькуляциянинг
     аниқ таъминотчи(лар)ига боғланиши — партиянинг ўз "receipts"
     ёзувидаги ҳақиқий supplierId'си ЖОНЛИ (live) олинади (calc.batches
     ичида фақат supplierName сақланади, у ном ўзгарса эски бўлиб қолиши
     мумкин). Металл возврати учун — фақат БИТТА аниқ таъминотчидан
     озиқланган (аралашмаган) калькуляцияларгина шу таъминотчига мос деб
     ҳисобланади (қаранг: renderLomReturnTab → renderMetalBody). */
  function lomCalcSupplierIds(c){
    var ids = [];
    lomCalcBatches(c).forEach(function(b){
      var r = lomBatchById(b.batchReceiptId);
      if(r && r.supplierId && ids.indexOf(r.supplierId)===-1) ids.push(r.supplierId);
    });
    return ids;
  }
  /* Таъминотчига тегишли барча лом/металл возвратлари (хом лом ва металл
     иккаласи ҳам — иккаласи ҳам таъминотчи қарзидан айирилади) — сана
     бўйича энг сўнггиси олдин, ихтиёрий бошланиш/тугаш санаси билан
     чегараланиши мумкин. Таъминотчи карточкаси, Солиштирма далолатнома
     ва Ҳисобот → Акт сверка бўлимларида қайта ишлатилади. */
  function supplierLomReturns(supplierId, from, to){
    return STATE.lomReturns.filter(function(x){
      if(x.supplierId!==supplierId) return false;
      var d = x.date||(x.createdAt||"").slice(0,10);
      if(from && d<from) return false;
      if(to && d>to) return false;
      return true;
    }).sort(function(a,b){ return (b.date||b.createdAt||"").localeCompare(a.date||a.createdAt||""); });
  }
  function lomCalcKgUsedTotal(c){ return lomCalcBatches(c).reduce(function(s,b){ return s+Number(b.kgUsed||0); },0); }
  /* Ишлаб чиқаришда ажралган металлнинг қанчаси возврат қилинганини
     кузатиш учун — эски ёзувларда "metalReturnedKg" йўқ, шунга кўра 0
     деб олинади (ҳали ҳеч нарса қайтарилмаган). */
  function lomCalcMetalAvailable(c){ return Math.max(0, Number(c.metalKg||0) - Number(c.metalReturnedKg||0)); }
  function lomBatchLockedByCalcId(receiptId, excludeCalcId){
    var found = STATE.lomCalcs.find(function(c){
      if(c.cancelled || c.id===excludeCalcId) return false;
      return lomCalcBatches(c).some(function(b){ return b.batchReceiptId===receiptId; });
    });
    return found ? found.id : "";
  }
  function lomAvailableBatches(excludeCalcId){
    return lomBatchReceipts().filter(function(r){
      return lomBatchAvailableKg(r, excludeCalcId)>0;
    }).slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
  }
  function computeLomCalcCost(fs){
    var batches = fs.batches || (fs.kgUsed!=null ? [{kgUsed:fs.kgUsed, batchPrice:fs.batchPrice}] : []);
    var lomCost = batches.reduce(function(s,b){ return s+Number(b.kgUsed||0)*Number(b.batchPrice||0); },0);
    var kgUsedTotal = batches.reduce(function(s,b){ return s+Number(b.kgUsed||0); },0);
    var additivesCost = (fs.additives||[]).reduce(function(s,a){ return s+Number(a.qty||0)*Number(a.price||0); },0);
    var wagesCost = Number(fs.hourlyWage||0)*Number(fs.workersCount||0)*Number(fs.workHours||0);
    var elecCost = Number(fs.workHours||0)*Number(fs.hourlyElec||0)*Number(fs.elecPrice||0);
    var gasCost = Number(fs.workHours||0)*Number(fs.hourlyGas||0)*Number(fs.gasPrice||0);
    var totalCost = lomCost+additivesCost+wagesCost+elecCost+gasCost;
    return {lomCost:lomCost, kgUsedTotal:kgUsedTotal, additivesCost:additivesCost, wagesCost:wagesCost, elecCost:elecCost, gasCost:gasCost, totalCost:totalCost};
  }
  function lomCalcById(id){ return STATE.lomCalcs.find(function(x){ return x.id===id; }); }

  /* ---------- Омбор: Лом кирим ---------- */
  function renderLomReceiptTab(){
    setTopbar("Омборлар — Лом кирим", lomBatchReceipts().length+" та партия", whCreateBtnHtml());
    var root = document.getElementById("content");
    var html = whSubnav("lomreceipt");
    if(!STATE.warehouses.length){
      html += emptyState("Аввал омбор яратинг","Лом кирим қилиш учун «Бошқарув» бўлимида омбор яратинг.");
      root.innerHTML = html; wireWhSubnav(root); return;
    }
    var supplierOptions = STATE.suppliers.map(function(s){ return '<option value="'+esc(s.name)+'">'; }).join("");
    html += '<div id="whFormHolder" style="display:none;"><div class="card" style="padding:20px 22px;">'+
      '<div class="field-row"><div class="field"><label>Таъминотчи</label><div style="display:flex;gap:6px;"><input id="lr-supplier" list="lr-supplier-list" placeholder="Ташкилот номи" value="" style="flex:1;min-width:0;"><button type="button" class="btn btn-secondary btn-icon" id="lr-supplier-add" title="Тўлиқ реквизитлари билан янги ташкилот қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div><datalist id="lr-supplier-list">'+supplierOptions+'</datalist></div>'+
      '<div class="field"><label>Партия рақами</label><input id="lr-batch" placeholder="Масалан: №14"></div></div>'+
      '<div class="field"><label>Омбор</label><select id="lr-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'">'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field-row"><div class="field"><label>Миқдори (кг)</label><input id="lr-qty" type="number" min="0" step="any" value="0"></div>'+
      '<div class="field"><label>Нархи (1 кг)</label><input id="lr-price" type="number" min="0" step="any" value="0"></div></div>'+
      '<div class="field"><label>Сумма (жами)</label><input id="lr-sum" type="text" value="0 сўм" disabled style="font-weight:800;color:var(--accent);"></div>'+
      '<div class="field"><label>Сана</label><input id="lr-date" type="date" value="'+todayISO()+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="lr-note"></textarea></div>'+
      '<div class="field-hint">Сумма таъминотчи билан ҳисоб-китобимизда қарз сифатида қайд этилади (тўловни «Таъминотчилар» бўлимидан амалга оширинг).</div>'+
      '<div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" id="lr-submit">Кирим қилиш</button></div>'+
      '</div></div><div id="lrSide"></div>';
    root.innerHTML = html;
    wireWhSubnav(root);
    var recompute = function(){
      var qty=Number(document.getElementById("lr-qty").value)||0, price=Number(document.getElementById("lr-price").value)||0;
      document.getElementById("lr-sum").value = fmtSum(qty*price);
    };
    ["lr-qty","lr-price"].forEach(function(id){ document.getElementById(id).addEventListener("input", recompute); });
    recompute();
    renderLomReceiptSide(document.getElementById("lrSide"));
    whFormModalSetup("Янги лом кирим");
    var supAddBtn = document.getElementById("lr-supplier-add");
    if(supAddBtn) supAddBtn.addEventListener("click", function(){
      var snap = {
        batch: document.getElementById("lr-batch").value, wh: document.getElementById("lr-wh").value,
        qty: document.getElementById("lr-qty").value, price: document.getElementById("lr-price").value,
        date: document.getElementById("lr-date").value, note: document.getElementById("lr-note").value
      };
      openSupplierForm(null, function(supplierId, supplierName){
        var byId=function(id){return document.getElementById(id);};
        if(byId("lr-supplier")) byId("lr-supplier").value = supplierName||"";
        if(byId("lr-batch")) byId("lr-batch").value = snap.batch;
        if(byId("lr-wh")) byId("lr-wh").value = snap.wh;
        if(byId("lr-qty")) byId("lr-qty").value = snap.qty;
        if(byId("lr-price")) byId("lr-price").value = snap.price;
        if(byId("lr-date")) byId("lr-date").value = snap.date;
        if(byId("lr-note")) byId("lr-note").value = snap.note;
        recompute();
      });
    });
    document.getElementById("lr-submit").addEventListener("click", function(){
      var supplierNameVal = document.getElementById("lr-supplier").value.trim();
      var batchNumber = document.getElementById("lr-batch").value.trim();
      var whId = document.getElementById("lr-wh").value;
      var qty=Number(document.getElementById("lr-qty").value)||0, price=Number(document.getElementById("lr-price").value)||0;
      var date=document.getElementById("lr-date").value||todayISO(), note=document.getElementById("lr-note").value.trim();
      if(!whId){ toast("Омборни танланг"); return; }
      if(!batchNumber){ toast("Партия рақамини киритинг"); return; }
      if(qty<=0){ toast("Миқдорни киритинг"); return; }
      if(!supplierNameVal){ toast("Таъминотчини киритинг"); return; }
      var lomIt = lomRawItem();
      var sum = qty*price;
      var finishReceipt = function(supplierId, supplierNameFinal){
        adjustStockBy(lomIt.id, whId, qty);
        dbAdd("receipts", {
          warehouseId:whId, itemId:lomIt.id, itemName:lomIt.name, quantity:qty, priceNoVat:price, vatRate:0, vatSum:0, totalNoVat:sum, totalWithVat:sum,
          supplierId:supplierId||"", supplierName:supplierNameFinal||"", paidAmount:0, payableAmount:sum, cashAccountId:"", dueDate:"",
          batchNumber:batchNumber, isLom:true, returnedKg:0,
          date:date, note:note, createdAt:new Date().toISOString()
        }, STATE.receipts);
        toast("Лом кирим қилинди — омбор янгиланди");
        render();
      };
      var existingSupplier = resolveSupplierByName(supplierNameVal);
      if(existingSupplier){ finishReceipt(existingSupplier.id, existingSupplier.name); return; }
      if(STATE.db){
        var supTempId = "_pending_"+uid();
        var supData = {name:supplierNameVal, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:"", createdAt:new Date().toISOString()};
        var supOptimistic = Object.assign({}, supData); supOptimistic.id=supTempId; supOptimistic._pending=true;
        STATE.suppliers.unshift(supOptimistic);
        STATE.db.collection("suppliers").add(supData).then(function(ref){
          supOptimistic._pending=false;
          reconcilePendingId(supTempId, ref.id);
          finishReceipt(ref.id, supplierNameVal);
        }).catch(function(e){
          var idx=STATE.suppliers.indexOf(supOptimistic); if(idx>-1) STATE.suppliers.splice(idx,1);
          console.error(e); finishReceipt("", supplierNameVal); render();
        });
      } else {
        var newSup = {id:uid(), name:supplierNameVal, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:""};
        STATE.suppliers.unshift(newSup);
        finishReceipt(newSup.id, newSup.name);
      }
    });
  }
  function renderLomReceiptSide(container){
    var state = {from:STATE.recLrFrom, to:STATE.recLrTo, search:STATE.recLrSearch};
    var all = lomBatchReceipts().filter(function(r){
      if(!recMatchesDate(r.date, state.from, state.to)) return false;
      if(!recMatchesSearch((r.batchNumber||"")+" "+(r.supplierName||""), state.search)) return false;
      return true;
    }).sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
    var list = all.slice(0,12);
    var html = '<div class="card" style="padding:18px 20px;"><h2 style="font-size:14px;font-weight:800;margin:0 0 10px;">Сўнгги лом партиялари</h2>'+
      recFilterToolbar("recLr", state, "Партия рақами ёки таъминотчи бўйича…")+
      (list.length ? '<div style="display:flex;flex-direction:column;gap:8px;">'+list.map(function(r){
        var avail = lomBatchAvailableKg(r);
        var usedInCalcs = lomBatchUsedInCalcs(r.id, "");
        var status = avail<=0 ? '<span class="chip chip-neutral" style="font-size:10px;">тугаган</span>' : (usedInCalcs>0 ? '<span class="chip chip-accent" style="font-size:10px;">қолдиқ: '+fmtNum(avail)+' кг</span>' : '<span class="chip chip-good" style="font-size:10px;">мавжуд: '+fmtNum(avail)+' кг</span>');
        /* Ҳар бир партия қаторида "кўриш" (кўз) тугмаси ҳам қўшилди —
           тўғридан-тўғри таҳрирлаш формасини очмасдан, аввал тўлиқ
           тафсилотни (фойдаланувчи сўровига кўра — "ичига кириб кўриш")
           фақат ўқиш учун модалда кўрсатади (қаранг: openLomReceiptDetail),
           таҳрирлаш эса олдингидек қалам тугмаси орқали давом этади. Энди
           2026-09-30 сўровига кўра ўчириш (фақат ҳали ишлатилмаган/
           қайтарилмаган партиялар учун) ҳам қўшилди. */
        var canDelete = avail>=Number(r.quantity||0) && usedInCalcs<=0 && Number(r.returnedKg||0)<=0;
        return '<div class="alert-row" style="align-items:flex-start;"><div class="grow"><div class="t">№'+esc(r.batchNumber||"—")+' · '+esc(r.supplierName||"—")+'</div><div class="s">'+esc(warehouseName(r.warehouseId))+' · '+fmtDateShort(r.date)+' · '+status+'</div></div><div style="display:flex;align-items:center;gap:4px;"><div class="num cell-strong" style="font-size:12px;white-space:nowrap;">'+fmtSum(r.totalWithVat)+'</div><button class="btn btn-ghost btn-icon" data-view-lom-receipt="'+r.id+'" title="Кўриш" style="width:24px;height:24px;">'+ICONS.eye+'</button><button class="btn btn-ghost btn-icon" data-edit-lom-receipt="'+r.id+'" title="Таҳрирлаш" style="width:24px;height:24px;">'+ICONS.pencil+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-lomr-copy="'+r.id+'" title="Нусха олиш" style="width:24px;height:24px;">'+ICONS.copy+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-lomr-print="'+r.id+'" title="Қоғозга чоп этиш" style="width:24px;height:24px;">'+ICONS.printer+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-lomr-xls="'+r.id+'" title="Excelга юклаш" style="width:24px;height:24px;">'+ICONS.download+'</button>'+
          (canDelete?'<button class="btn btn-ghost btn-icon" data-del-lom-receipt="'+r.id+'" title="Ўчириш" style="width:24px;height:24px;">'+ICONS.trash+'</button>':'')+'</div></div>';
      }).join("")+'</div>' : '<div style="text-align:center;color:var(--ink-3);font-size:13px;padding:16px 0;">Ҳали лом кирим йўқ</div>')+
      '</div>';
    container.innerHTML = html;
    wireRecFilterToolbar(container, "recLr", state, function(){ exportLomReceiptsExcel(all); });
    STATE.recLrFrom=state.from; STATE.recLrTo=state.to; STATE.recLrSearch=state.search;
    container.querySelectorAll("[data-lomr-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.receipts, b.getAttribute("data-lomr-copy")); if(!r) return;
      STATE.whFormOpen = true; render();
      var byId=function(id){return document.getElementById(id);};
      if(byId("lr-supplier")) byId("lr-supplier").value = r.supplierName||"";
      if(byId("lr-batch")) byId("lr-batch").value = "";
      if(byId("lr-wh")) byId("lr-wh").value = r.warehouseId||"";
      if(byId("lr-qty")) byId("lr-qty").value = r.quantity||0;
      if(byId("lr-price")) byId("lr-price").value = r.priceNoVat||0;
      if(byId("lr-date")) byId("lr-date").value = todayISO();
      if(byId("lr-note")) byId("lr-note").value = r.note||"";
      if(byId("lr-qty")) byId("lr-qty").dispatchEvent(new Event("input"));
      toast("Нусха олинди — партия рақамини киритиб сақланг");
    }); });
    container.querySelectorAll("[data-lomr-print]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.receipts, b.getAttribute("data-lomr-print")); if(r) opPrintDoc(lomReceiptOpDoc(r));
    }); });
    container.querySelectorAll("[data-lomr-xls]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.receipts, b.getAttribute("data-lomr-xls")); if(r) opExcelDoc(lomReceiptOpDoc(r), "Lom_kirim");
    }); });
    container.querySelectorAll("[data-view-lom-receipt]").forEach(function(b){
      b.addEventListener("click", function(){
        var r = STATE.receipts.find(function(x){return x.id===b.getAttribute("data-view-lom-receipt");});
        if(r) openLomReceiptDetail(r);
      });
    });
    container.querySelectorAll("[data-edit-lom-receipt]").forEach(function(b){
      b.addEventListener("click", function(){
        var r = STATE.receipts.find(function(x){return x.id===b.getAttribute("data-edit-lom-receipt");});
        if(r) openLomReceiptEditForm(r);
      });
    });
    container.querySelectorAll("[data-del-lom-receipt]").forEach(function(b){
      b.addEventListener("click", function(){
        var r = STATE.receipts.find(function(x){return x.id===b.getAttribute("data-del-lom-receipt");});
        if(!r) return;
        openConfirm("Лом партиясини ўчириш", "№"+esc(r.batchNumber||"—")+" партияси бутунлай ўчирилиб, омбор қолдиғидан "+fmtNum(r.quantity)+" кг айирилсинми?", "Ҳа, ўчириш", function(){
          adjustStockBy(r.itemId, r.warehouseId, -(Number(r.quantity)||0));
          dbDelete("receipts", r.id, STATE.receipts);
          toast("Ўчирилди — омбор қолдиғи қайта ҳисобланди");
        }, true);
      });
    });
  }
  function exportLomReceiptsExcel(list){
    var headers = ["Партия №","Таъминотчи","Омбор","Сана","Миқдор (кг)","Нархи (1 кг)","Жами сумма","Қайтарилган (кг)","Тўланган","Қарз"];
    var rowsArr = list.map(function(r){ return [r.batchNumber||"", r.supplierName||"", warehouseName(r.warehouseId), fmtDateShort(r.date), fmtNum(r.quantity), fmtNum(r.priceNoVat), fmtNum(r.totalWithVat), fmtNum(r.returnedKg||0), fmtNum(r.paidAmount||0), fmtNum(r.payableAmount||0)]; });
    exportHtmlTableAsExcel("Lom_kirim.xls", "Лом партиялари", headers, rowsArr);
  }
  function printLomReceiptVoucher(r){
    if(!r) return;
    var body = '<table>'+
      '<tr><td>Партия рақами</td><td style="text-align:right;">№'+esc(r.batchNumber||"—")+'</td></tr>'+
      '<tr><td>Таъминотчи</td><td style="text-align:right;">'+esc(r.supplierName||"—")+'</td></tr>'+
      '<tr><td>Омбор</td><td style="text-align:right;">'+esc(warehouseName(r.warehouseId))+'</td></tr>'+
      '<tr><td>Миқдори</td><td style="text-align:right;">'+fmtNum(r.quantity)+' кг</td></tr>'+
      '<tr><td>Нархи (1 кг)</td><td style="text-align:right;">'+fmtSum(r.priceNoVat)+'</td></tr>'+
      '<tr><td>Қайтарилган</td><td style="text-align:right;">'+fmtNum(r.returnedKg||0)+' кг</td></tr>'+
      '<tr><td>Тўланган</td><td style="text-align:right;">'+fmtSum(r.paidAmount||0)+'</td></tr>'+
      '<tr><td>Қарз</td><td style="text-align:right;">'+fmtSum(r.payableAmount||0)+'</td></tr>'+
      '</table>'+
      '<div class="v-total">Жами: '+fmtSum(r.totalWithVat)+'</div>'+
      (r.note?'<div style="margin-top:10px;">Изоҳ: '+esc(r.note)+'</div>':'')+
      '<div class="v-sign"><div>Топширди</div><div>Қабул қилди</div></div>';
    var html = voucherShell("Лом партияси — №"+esc(r.batchNumber||"—"), "Сана: "+esc(fmtDateShort(r.date)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  /* Лом партиясининг тўлиқ тафсилоти — фақат ўқиш учун модал (қаранг:
     openLomReturnDetail'га ўхшаш, ўша ерда ишлатилган услуб такрорланди).
     Партия рақами, таъминотчи, омбор, сана, миқдор/нарх/сумма, аллақачон
     қайтарилган (агар бор бўлса) ва ҳозирги мавжуд қолдиқ, тўланган/қарз
     ҳамда изоҳ кўрсатилади. */
  function openLomReceiptDetail(r){
    if(!r) return;
    var avail = lomBatchAvailableKg(r);
    var usedInCalcs = lomBatchUsedInCalcs(r.id, "");
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Партия рақами</div><div class="dd">№'+esc(r.batchNumber||"—")+'</div></div>'+
      '<div><div class="dl">Таъминотчи</div><div class="dd">'+esc(r.supplierName||"—")+'</div></div>'+
      '<div><div class="dl">Омбор</div><div class="dd">'+esc(warehouseName(r.warehouseId))+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDate(r.date)+'</div></div>'+
      '<div><div class="dl">Тўлов муддати</div><div class="dd">'+(r.dueDate?fmtDateShort(r.dueDate):"—")+'</div></div>'+
      '<div><div class="dl">Миқдор</div><div class="dd">'+fmtNum(r.quantity)+' кг</div></div>'+
      '<div><div class="dl">Нархи (1 кг)</div><div class="dd">'+fmtSum(r.priceNoVat)+'</div></div>'+
      '<div><div class="dl">Жами сумма</div><div class="dd">'+fmtSum(r.totalWithVat)+'</div></div>'+
      '<div><div class="dl">Қайтарилган</div><div class="dd">'+(Number(r.returnedKg||0)>0?fmtNum(r.returnedKg)+" кг":"—")+'</div></div>'+
      '<div><div class="dl">Ишлаб чиқаришда банд</div><div class="dd">'+(usedInCalcs>0?fmtNum(usedInCalcs)+" кг":"—")+'</div></div>'+
      '<div><div class="dl">Мавжуд қолдиқ</div><div class="dd" style="font-weight:800;">'+fmtNum(avail)+' кг</div></div>'+
      '<div><div class="dl">Тўланган</div><div class="dd">'+fmtSum(r.paidAmount||0)+'</div></div>'+
      '<div><div class="dl">Қарз</div><div class="dd" style="color:'+(Number(r.payableAmount||0)>0?"var(--critical)":"inherit")+';font-weight:'+(Number(r.payableAmount||0)>0?"800":"400")+';">'+fmtSum(r.payableAmount||0)+'</div></div>'+
      '</div>'+
      (r.note?('<div class="field" style="margin-top:14px;margin-bottom:0;"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(r.note)+'</div></div>'):"");
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print title="Чоп этиш">'+ICONS.printer+'</button><button class="btn btn-primary" data-edit>Таҳрирлаш</button>';
    var m = openModal("Лом партияси — №"+esc(r.batchNumber||"—"), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelector("[data-print]").addEventListener("click", function(){ printLomReceiptVoucher(r); });
    m.querySelector("[data-edit]").addEventListener("click", function(){ closeModal(); openLomReceiptEditForm(r); });
  }
  function openLomReceiptEditForm(r){
    if(!r) return;
    var body = '<div class="field-row"><div class="field"><label>Таъминотчи</label><input id="lre-supplier" list="lre-supplier-list" value="'+esc(r.supplierName||"")+'"><datalist id="lre-supplier-list">'+STATE.suppliers.map(function(s){return '<option value="'+esc(s.name)+'">';}).join("")+'</datalist></div>'+
      '<div class="field"><label>Партия рақами</label><input id="lre-batch" value="'+esc(r.batchNumber||"")+'"></div></div>'+
      '<div class="field"><label>Омбор</label><select id="lre-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(r.warehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field-row"><div class="field"><label>Миқдори (кг)</label><input id="lre-qty" type="number" min="0" step="any" value="'+esc(r.quantity)+'"></div>'+
      '<div class="field"><label>Нархи (1 кг)</label><input id="lre-price" type="number" min="0" step="any" value="'+esc(r.priceNoVat)+'"></div></div>'+
      '<div class="field"><label>Сумма</label><input id="lre-sum" type="text" value="0 сўм" disabled style="font-weight:800;color:var(--accent);"></div>'+
      '<div class="field"><label>Сана</label><input id="lre-date" type="date" value="'+esc(r.date||todayISO())+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="lre-note">'+esc(r.note||"")+'</textarea></div>'+
      (lomBatchLockedByCalcId(r.id,"") ? '<div class="field-hint" style="color:var(--critical);">Диққат: бу партия бир ёки бир нечта калькуляцияда ишлатилган — миқдорни ўзгартириш ўша калькуляция(лар)нинг ҳисобини автоматик янгиламайди.</div>' : '');
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Лом киримини таҳрирлаш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var recompute = function(){
      var qty=Number(m.querySelector("#lre-qty").value)||0, price=Number(m.querySelector("#lre-price").value)||0;
      m.querySelector("#lre-sum").value = fmtSum(qty*price);
    };
    ["lre-qty","lre-price"].forEach(function(id){ m.querySelector("#"+id).addEventListener("input", recompute); });
    recompute();
    m.querySelector("[data-save]").addEventListener("click", function(){
      var supplierNameVal = m.querySelector("#lre-supplier").value.trim();
      var batchNumber = m.querySelector("#lre-batch").value.trim();
      var newWhId = m.querySelector("#lre-wh").value;
      var qty=Number(m.querySelector("#lre-qty").value)||0, price=Number(m.querySelector("#lre-price").value)||0;
      var date=m.querySelector("#lre-date").value||todayISO(), note=m.querySelector("#lre-note").value.trim();
      if(!newWhId){ toast("Омборни танланг"); return; }
      if(!batchNumber){ toast("Партия рақамини киритинг"); return; }
      if(qty<=0){ toast("Миқдорни киритинг"); return; }
      var sum = qty*price;
      var finish = function(supplierId, supplierNameFinal){
        adjustStockBy(r.itemId, r.warehouseId, -(Number(r.quantity)||0));
        adjustStockBy(r.itemId, newWhId, qty);
        dbUpdate("receipts", r.id, {
          warehouseId:newWhId, quantity:qty, priceNoVat:price, totalNoVat:sum, totalWithVat:sum, payableAmount:Math.max(0,sum-Number(r.paidAmount||0)),
          batchNumber:batchNumber, supplierId:supplierId||"", supplierName:supplierNameFinal||"", date:date, note:note
        }, STATE.receipts);
        toast("Лом кирим янгиланди — омбор қолдиғи қайта ҳисобланди");
        closeModal();
      };
      if(!supplierNameVal){ finish("", ""); return; }
      var existingSupplier = resolveSupplierByName(supplierNameVal);
      if(existingSupplier){ finish(existingSupplier.id, existingSupplier.name); return; }
      if(STATE.db){
        var supTempId = "_pending_"+uid();
        var supData = {name:supplierNameVal, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:"", createdAt:new Date().toISOString()};
        var supOptimistic = Object.assign({}, supData); supOptimistic.id=supTempId; supOptimistic._pending=true;
        STATE.suppliers.unshift(supOptimistic);
        STATE.db.collection("suppliers").add(supData).then(function(ref){
          supOptimistic._pending=false;
          reconcilePendingId(supTempId, ref.id);
          finish(ref.id, supplierNameVal);
        }).catch(function(e){
          var idx=STATE.suppliers.indexOf(supOptimistic); if(idx>-1) STATE.suppliers.splice(idx,1);
          console.error(e); finish("", supplierNameVal);
        });
      } else {
        var newSup = {id:uid(), name:supplierNameVal, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:""};
        STATE.suppliers.unshift(newSup);
        finish(newSup.id, newSup.name);
      }
    });
  }

  /* ---------- Омбор: Лом возврат ---------- */
  function renderLomReturnTab(){
    setTopbar("Омборлар — Лом возврат", STATE.lomReturns.length+" та возврат", whCreateBtnHtml());
    var root = document.getElementById("content");
    var html = whSubnav("lomreturn");
    var rawBatches = lomBatchReceipts().filter(function(r){ return lomBatchAvailableKg(r)>0; }).slice().sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
    var metalCalcs = STATE.lomCalcs.filter(function(c){ return c.produced && !c.cancelled && lomCalcMetalAvailable(c)>0; }).slice().sort(function(a,b){return (b.prodDate||"").localeCompare(a.prodDate||"");});
    html += '<div id="whFormHolder" style="display:none;"><div class="card" style="padding:20px 22px;">'+
      '<div class="field"><label>Маҳсулот тури</label><select id="lret-type">'+
        '<option value="raw">Хом лом (партиядан — таъминотчига қайтариш)</option>'+
        '<option value="metal">Металл (ишлаб чиқаришда ажралган)</option>'+
      '</select></div>'+
      '<div id="lret-body"></div>'+
      '</div></div><div id="lretSide"></div>';
    root.innerHTML = html;
    wireWhSubnav(root);
    renderLomReturnHistory(document.getElementById("lretSide"));
    whFormModalSetup("Янги лом возврат");
    var typeSel = document.getElementById("lret-type");
    var bodyEl = document.getElementById("lret-body");

    function renderRawBody(){
      if(!rawBatches.length){ bodyEl.innerHTML = emptyState("Қайтарса бўладиган лом партияси йўқ","Аввал «Лом кирим» орқали партия киритинг — ёки барча партиялар аллақачон тўлиқ ишлатилган/қайтарилган."); return; }
      var supplierIds = [];
      rawBatches.forEach(function(r){ if(r.supplierId && supplierIds.indexOf(r.supplierId)===-1) supplierIds.push(r.supplierId); });
      supplierIds.sort(function(a,b){ return supplierName(a).localeCompare(supplierName(b)); });
      bodyEl.innerHTML = '<div class="field"><label>Таъминотчи</label><select id="lret-supplier"><option value="">— барча таъминотчилар —</option>'+
          supplierIds.map(function(sid){ return '<option value="'+sid+'">'+esc(supplierName(sid))+'</option>'; }).join("")+
        '</select></div>'+
        '<div class="field"><label>Партия(лар) — бир нечтасини танлаш мумкин</label><div id="lret-batches" style="max-height:260px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:10px;"></div></div>'+
        '<div class="field" id="lret-summary-wrap"></div>'+
        '<div class="field"><label>Сана</label><input id="lret-date" type="date" value="'+todayISO()+'"></div>'+
        '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="lret-note"></textarea></div>'+
        '<div class="field-hint">Қайтариш суммаси таъминотчи билан ҳисоб-китобдан (қарзимиздан) автоматик айирилади.</div>'+
        '<div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" id="lret-submit">Возврат қилиш</button></div>';
      var selRows = {};
      var supplierSel = document.getElementById("lret-supplier");
      var batchesWrap = document.getElementById("lret-batches");
      function renderSummary(){
        var rows = Object.keys(selRows).map(function(rid){ var r=STATE.receipts.find(function(x){return x.id===rid;}); return r?{r:r,kg:Number(selRows[rid])||0}:null; }).filter(Boolean);
        var totalKg = rows.reduce(function(s,x){return s+x.kg;},0);
        var totalSum = rows.reduce(function(s,x){return s+x.kg*Number(x.r.priceNoVat||0);},0);
        document.getElementById("lret-summary-wrap").innerHTML = '<label>Жами возврат</label><div class="num cell-strong" style="font-size:15px;padding:6px 0;color:var(--critical);">'+fmtNum(totalKg)+' кг = '+fmtSum(totalSum)+' <span style="font-weight:400;color:var(--ink-3);font-size:12px;">('+rows.length+' та партия)</span></div>';
      }
      function renderBatchRows(){
        var filtered = supplierSel.value ? rawBatches.filter(function(r){ return r.supplierId===supplierSel.value; }) : rawBatches;
        if(!filtered.length){ batchesWrap.innerHTML = '<div class="field-hint">Бу таъминотчида партия йўқ</div>'; renderSummary(); return; }
        batchesWrap.innerHTML = filtered.map(function(r){
          var maxKg = Math.min(lomBatchAvailableKg(r), stockQty(r.itemId, r.warehouseId));
          var checked = selRows.hasOwnProperty(r.id);
          var kgVal = checked ? selRows[r.id] : maxKg;
          return '<div class="field-row" style="grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin-bottom:6px;">'+
            '<input type="checkbox" data-lret-check="'+r.id+'" '+(checked?"checked":"")+' style="width:18px;height:18px;">'+
            '<div style="font-size:12.5px;">№'+esc(r.batchNumber||"—")+' · '+esc(r.supplierName||"—")+' · қолдиқ <strong>'+fmtNum(maxKg)+' кг</strong> × '+fmtSum(r.priceNoVat)+'</div>'+
            '<input type="number" min="0" max="'+maxKg+'" step="any" data-lret-kg="'+r.id+'" value="'+esc(kgVal)+'" style="width:110px;" '+(checked?"":"disabled")+'>'+
            '</div>';
        }).join("");
        batchesWrap.querySelectorAll("[data-lret-check]").forEach(function(cb){
          cb.addEventListener("change", function(){
            var rid = cb.getAttribute("data-lret-check");
            var kgInp = batchesWrap.querySelector('[data-lret-kg="'+rid+'"]');
            var r = STATE.receipts.find(function(x){return x.id===rid;});
            var maxKg = r ? Math.min(lomBatchAvailableKg(r), stockQty(r.itemId, r.warehouseId)) : 0;
            if(cb.checked){ selRows[rid]=maxKg; if(kgInp){kgInp.disabled=false; kgInp.value=maxKg;} }
            else { delete selRows[rid]; if(kgInp) kgInp.disabled=true; }
            renderSummary();
          });
        });
        batchesWrap.querySelectorAll("[data-lret-kg]").forEach(function(inp){
          inp.addEventListener("input", function(){
            var rid = inp.getAttribute("data-lret-kg");
            var r = STATE.receipts.find(function(x){return x.id===rid;});
            var maxKg = r ? Math.min(lomBatchAvailableKg(r), stockQty(r.itemId, r.warehouseId)) : 0;
            var v = Number(inp.value)||0;
            if(v>maxKg){ v=maxKg; inp.value=maxKg; }
            if(v<0){ v=0; inp.value=0; }
            selRows[rid]=v;
            renderSummary();
          });
        });
        renderSummary();
      }
      renderBatchRows();
      supplierSel.addEventListener("change", function(){ selRows = {}; renderBatchRows(); });
      document.getElementById("lret-submit").addEventListener("click", function(){
        var date = document.getElementById("lret-date").value||todayISO();
        var note = document.getElementById("lret-note").value.trim();
        var rows = Object.keys(selRows).map(function(rid){ return {id:rid, kg:Number(selRows[rid])||0}; }).filter(function(x){return x.kg>0;});
        if(!rows.length){ toast("Камида битта партия ва миқдорини танланг"); return; }
        /* Бир нечта партия БИР ХИЛ омбордаги (умумий) стокни бўлишиши
           мумкин — шунга кўра ҳар бир қаторни алоҳида эмас, балки шу
           умумий "ҳовуз"дан кетма-кет айириб текширамиз, токи жами
           танланган миқдор ҳақиқий омбор қолдиғидан ошиб кетмасин. */
        var pool = {};
        function poolKey(r){ return r.itemId+"|"+r.warehouseId; }
        var errorMsg = "";
        rows.forEach(function(row){
          if(errorMsg) return;
          var r = STATE.receipts.find(function(x){return x.id===row.id;});
          if(!r) return;
          var key = poolKey(r);
          if(!(key in pool)) pool[key] = stockQty(r.itemId, r.warehouseId);
          var maxKg = Math.min(lomBatchAvailableKg(r), pool[key]);
          if(row.kg>maxKg){ errorMsg = "«№"+esc(r.batchNumber||"—")+"» учун жами омбор қолдиғи етарли эмас — қолдиқ: "+fmtNum(maxKg)+" кг (бошқа танланган партиялар билан бирга ҳисобланганда)"; return; }
          pool[key] -= row.kg;
        });
        if(errorMsg){ toast(errorMsg); return; }
        rows.forEach(function(row){
          var r = STATE.receipts.find(function(x){return x.id===row.id;});
          if(!r) return;
          var qty = row.kg;
          if(qty<=0) return;
          var price = Number(r.priceNoVat)||0;
          var sum = qty*price;
          var applyAmt = Math.min(sum, Number(r.payableAmount)||0);
          adjustStockBy(r.itemId, r.warehouseId, -qty);
          dbUpdate("receipts", r.id, {returnedKg:(Number(r.returnedKg)||0)+qty, payableAmount:Number(r.payableAmount||0)-applyAmt}, STATE.receipts);
          dbAdd("lomReturns", {
            productType:"raw", batchReceiptId:r.id, batchNumber:r.batchNumber||"", supplierId:r.supplierId||"", supplierName:r.supplierName||"",
            kg:qty, price:price, sum:sum, appliedAmt:applyAmt, date:date, note:note, cancelled:false, createdAt:new Date().toISOString()
          }, STATE.lomReturns);
        });
        toast("Возврат қилинди — омбор ва ҳисоб-китоб янгиланди");
        render();
      });
    }

    function renderMetalBody(){
      /* Фойдаланувчи сўровига кўра: металл турида АВВАЛО таъминотчи
         танланиши шарт — фақат шундан кейин шу таъминотчига тегишли
         (яъни ФАҚАТ ўша таъминотчидан келган хом лом партия(лар)идан
         ажралган — аралаш-таъминотчили калькуляциялар чиқариб
         ташланади, чунки уларда металл қайси таъминотчиники экани
         аниқ эмас) ишлаб чиқариш ёзувлари кўринади. */
      var supplierIds = [];
      metalCalcs.forEach(function(c){
        var ids = lomCalcSupplierIds(c);
        if(ids.length===1 && supplierIds.indexOf(ids[0])===-1) supplierIds.push(ids[0]);
      });
      supplierIds.sort(function(a,b){ return supplierName(a).localeCompare(supplierName(b)); });
      if(!supplierIds.length){ bodyEl.innerHTML = emptyState("Қайтарса бўладиган металл йўқ","Ишлаб чиқариш натижасида ажралган металл ҳали йўқ, барчаси аллақачон қайтарилган ёки мавжуд ёзувлар турли таъминотчилардан аралаш партиялардан иборат."); return; }
      bodyEl.innerHTML = '<div class="field"><label>Таъминотчи</label><select id="lretm-supplier"><option value="">— танланг —</option>'+
          supplierIds.map(function(sid){ return '<option value="'+sid+'">'+esc(supplierName(sid))+'</option>'; }).join("")+
        '</select></div>'+
        '<div id="lretm-body-wrap"></div>';
      var supplierSel = document.getElementById("lretm-supplier");
      var wrapEl = document.getElementById("lretm-body-wrap");
      var metalIt = lomMetalItem();

      function renderForSupplier(){
        var sid = supplierSel.value;
        if(!sid){ wrapEl.innerHTML = '<div class="field-hint">Аввал таъминотчини танланг — шундан кейин шу таъминотчига тегишли ажратилган металл партиялари кўринади.</div>'; return; }
        var calcsForSupplier = metalCalcs.filter(function(c){ var ids=lomCalcSupplierIds(c); return ids.length===1 && ids[0]===sid; });
        if(!calcsForSupplier.length){ wrapEl.innerHTML = '<div class="field-hint">Бу таъминотчи учун қайтарса бўладиган металл йўқ.</div>'; return; }
        wrapEl.innerHTML = '<div class="field"><label>Ишлаб чиқариш(лар) (партиялар бўйича) — бир нечтасини танлаш мумкин</label><div id="lret-metal-list" style="max-height:260px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:10px;"></div></div>'+
          '<div class="field" id="lret-metal-summary-wrap"></div>'+
          '<div class="field"><label>Сана</label><input id="lretm-date" type="date" value="'+todayISO()+'"></div>'+
          '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="lretm-note"></textarea></div>'+
          '<div class="field-hint">Металл возврати омбордан айирилади, тарихга ёзилади ва возврат суммаси танланган таъминотчи билан ҳисоб-китобдан (қарзимиздан) автоматик айирилади.</div>'+
          '<div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" id="lretm-submit">Возврат қилиш</button></div>';
        var selRows = {};
        var listWrap = document.getElementById("lret-metal-list");
        function renderSummary(){
          var rows = Object.keys(selRows).map(function(cid){ var c=lomCalcById(cid); return c?{c:c,kg:Number(selRows[cid])||0}:null; }).filter(Boolean);
          var totalKg = rows.reduce(function(s,x){return s+x.kg;},0);
          var totalSum = rows.reduce(function(s,x){return s+x.kg*Number(x.c.batchPrice||0);},0);
          document.getElementById("lret-metal-summary-wrap").innerHTML = '<label>Жами возврат</label><div class="num cell-strong" style="font-size:15px;padding:6px 0;color:var(--critical);">'+fmtNum(totalKg)+' кг = '+fmtSum(totalSum)+' <span style="font-weight:400;color:var(--ink-3);font-size:12px;">('+rows.length+' та)</span></div>';
        }
        function renderRows(){
          listWrap.innerHTML = calcsForSupplier.map(function(c){
            var avail = Math.min(lomCalcMetalAvailable(c), stockQty(metalIt.id, c.metalWarehouseId));
            var checked = selRows.hasOwnProperty(c.id);
            var kgVal = checked ? selRows[c.id] : avail;
            return '<div class="field-row" style="grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin-bottom:6px;">'+
              '<input type="checkbox" data-lretm-check="'+c.id+'" '+(checked?"checked":"")+' style="width:18px;height:18px;">'+
              '<div style="font-size:12.5px;">'+esc(lomCalcBatchLabel(c))+' · '+fmtDateShort(c.prodDate)+' · қолдиқ <strong>'+fmtNum(avail)+' кг</strong> × '+fmtSum(c.batchPrice)+'</div>'+
              '<input type="number" min="0" max="'+avail+'" step="any" data-lretm-kg="'+c.id+'" value="'+esc(kgVal)+'" style="width:110px;" '+(checked?"":"disabled")+'>'+
              '</div>';
          }).join("");
          listWrap.querySelectorAll("[data-lretm-check]").forEach(function(cb){
            cb.addEventListener("change", function(){
              var cid = cb.getAttribute("data-lretm-check");
              var kgInp = listWrap.querySelector('[data-lretm-kg="'+cid+'"]');
              var c = lomCalcById(cid);
              var avail = c ? Math.min(lomCalcMetalAvailable(c), stockQty(metalIt.id, c.metalWarehouseId)) : 0;
              if(cb.checked){ selRows[cid]=avail; if(kgInp){kgInp.disabled=false; kgInp.value=avail;} }
              else { delete selRows[cid]; if(kgInp) kgInp.disabled=true; }
              renderSummary();
            });
          });
          listWrap.querySelectorAll("[data-lretm-kg]").forEach(function(inp){
            inp.addEventListener("input", function(){
              var cid = inp.getAttribute("data-lretm-kg");
              var c = lomCalcById(cid);
              var avail = c ? Math.min(lomCalcMetalAvailable(c), stockQty(metalIt.id, c.metalWarehouseId)) : 0;
              var v = Number(inp.value)||0;
              if(v>avail){ v=avail; inp.value=avail; }
              if(v<0){ v=0; inp.value=0; }
              selRows[cid]=v;
              renderSummary();
            });
          });
          renderSummary();
        }
        renderRows();
        document.getElementById("lretm-submit").addEventListener("click", function(){
          var date = document.getElementById("lretm-date").value||todayISO();
          var note = document.getElementById("lretm-note").value.trim();
          var rows = Object.keys(selRows).map(function(cid){ return {id:cid, kg:Number(selRows[cid])||0}; }).filter(function(x){return x.kg>0;});
          if(!rows.length){ toast("Камида битта ишлаб чиқаришни ва миқдорини танланг"); return; }
          /* Бир нечта ишлаб чиқариш ёзуви БИР ХИЛ металл омборидаги умумий
             стокни бўлишиши мумкин — кетма-кет "ҳовуз"дан айириб текширамиз. */
          var pool = {};
          var errorMsg = "";
          rows.forEach(function(row){
            if(errorMsg) return;
            var c = lomCalcById(row.id);
            if(!c) return;
            var key = c.metalWarehouseId;
            if(!(key in pool)) pool[key] = stockQty(metalIt.id, key);
            var maxKg = Math.min(lomCalcMetalAvailable(c), pool[key]);
            if(row.kg>maxKg){ errorMsg = esc(lomCalcBatchLabel(c))+" учун жами омбор қолдиғи етарли эмас — қолдиқ: "+fmtNum(maxKg)+" кг (бошқа танланганлар билан бирга ҳисобланганда)"; return; }
            pool[key] -= row.kg;
          });
          if(errorMsg){ toast(errorMsg); return; }
          rows.forEach(function(row){
            var c = lomCalcById(row.id);
            if(!c) return;
            var kg = row.kg;
            if(kg<=0) return;
            var price = Number(c.batchPrice||0);
            var sum = kg*price;
            adjustStockBy(metalIt.id, c.metalWarehouseId, -kg);
            dbUpdate("lomCalcs", c.id, {metalReturnedKg:(Number(c.metalReturnedKg)||0)+kg}, STATE.lomCalcs);
            /* Таъминотчи қарзидан айириш: ушбу калькуляцияга кирган хом лом
               партия(лар)ининг (receipts) payableAmount'идан кетма-кет
               айирамиз — худди хом лом возвратидаги каби механизм — токи
               "Таъминотчилар" ва "Солиштирма далолатнома" бўлимларида
               таъминотчи қарзи ва партия ҳолати автоматик тўғри кўринсин. */
            var remaining = sum;
            /* appliedBreakdown — қайси партия(лар)дан аниқ қанча сумма
               айирилгани: бу лом возвратини кейинчалик "бекор қилиш"/
               "тиклаш" қилинганда ХУДДИ ШУ партия(лар)нинг payableAmount'ига
               аниқ орқага қайтарилиши учун сақланади (қаранг:
               renderLomReturnHistory'даги data-lomret-cancel/-restore). */
            var appliedBreakdown = [];
            lomCalcBatches(c).forEach(function(b){
              if(remaining<=0) return;
              var br = lomBatchById(b.batchReceiptId);
              if(!br) return;
              var applyAmt = Math.min(remaining, Number(br.payableAmount)||0);
              if(applyAmt>0){
                dbUpdate("receipts", br.id, {payableAmount:Number(br.payableAmount||0)-applyAmt}, STATE.receipts);
                appliedBreakdown.push({receiptId:br.id, amt:applyAmt});
                remaining -= applyAmt;
              }
            });
            dbAdd("lomReturns", {
              productType:"metal", lomCalcId:c.id, batchReceiptId:"", batchNumber:lomCalcBatchLabel(c), supplierId:sid, supplierName:supplierName(sid),
              kg:kg, price:price, sum:sum, appliedAmt:sum-remaining, appliedBreakdown:appliedBreakdown, date:date, note:note, cancelled:false, createdAt:new Date().toISOString()
            }, STATE.lomReturns);
          });
          toast("Металл возврати қилинди — омбор ва таъминотчи ҳисоб-китоби янгиланди");
          render();
        });
      }
      supplierSel.addEventListener("change", renderForSupplier);
      renderForSupplier();
    }

    function renderBody(){
      if(typeSel.value==="metal") renderMetalBody(); else renderRawBody();
    }
    typeSel.addEventListener("change", renderBody);
    renderBody();
  }
  function renderLomReturnHistory(container){
    if(!container) return;
    var state = {from:STATE.recLretFrom, to:STATE.recLretTo, search:STATE.recLretSearch};
    var all = STATE.lomReturns.filter(function(x){
      if(!recMatchesDate(x.date, state.from, state.to)) return false;
      if(!recMatchesSearch((x.batchNumber||"")+" "+(x.supplierName||""), state.search)) return false;
      return true;
    }).sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
    var list = all.slice(0,15);
    var html = '<div class="card" style="padding:18px 20px;"><h2 style="font-size:14px;font-weight:800;margin:0 0 10px;">Сўнгги возвратлар</h2>'+
      recFilterToolbar("recLret", state, "Партия рақами ёки таъминотчи бўйича…")+
      (list.length ? '<div style="display:flex;flex-direction:column;gap:8px;">'+list.map(function(x){
        var isMetal = x.productType==="metal";
        var subLabel = isMetal ? "Металл" : esc(x.supplierName||"—");
        /* Ҳар бир қаторда "кўриш" (кўз) тугмаси — тўлиқ тафсилотларни
           модалда очади (қаранг: openLomReturnDetail) — ва "таҳрирлаш"
           тугмаси иккала турда ҳам мавжуд (хом лом — openLomReturnEditForm,
           металл — openLomReturnEditFormMetal), фойдаланувчи сўровига
           кўра. */
        return '<div class="alert-row" style="align-items:flex-start;'+(x.cancelled?'opacity:.5;':'')+'"><div class="grow"><div class="t">'+esc(x.batchNumber||"—")+' · '+subLabel+'</div><div class="s">'+fmtDateShort(x.date)+' · '+fmtNum(x.kg)+' кг'+(x.cancelled?' · бекор қилинган':'')+'</div></div><div style="display:flex;align-items:center;gap:6px;"><div class="num cell-strong" style="font-size:12px;white-space:nowrap;">'+fmtSum(x.sum)+'</div>'+
          '<button class="btn btn-ghost btn-icon" data-lomret-view="'+x.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-lomret-print="'+x.id+'" title="Қоғозга чоп этиш">'+ICONS.printer+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-lomret-xls="'+x.id+'" title="Excelга юклаш">'+ICONS.download+'</button>'+
          (x.cancelled?'<button class="btn btn-ghost btn-icon" data-lomret-restore="'+x.id+'" title="Тиклаш">'+ICONS.restore+'</button>':('<button class="btn btn-ghost btn-icon" data-lomret-edit="'+x.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+'<button class="btn btn-ghost btn-icon" data-lomret-cancel="'+x.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>'))+'</div></div>';
      }).join("")+'</div>' : '<div style="text-align:center;color:var(--ink-3);font-size:13px;padding:16px 0;">Ҳали возврат йўқ</div>')+
      '</div>';
    container.innerHTML = html;
    wireRecFilterToolbar(container, "recLret", state, function(){ exportLomReturnsExcel(all); });
    STATE.recLretFrom=state.from; STATE.recLretTo=state.to; STATE.recLretSearch=state.search;
    container.querySelectorAll("[data-lomret-print]").forEach(function(b){ b.addEventListener("click", function(){
      var x = opByIdFrom(STATE.lomReturns, b.getAttribute("data-lomret-print")); if(x) opPrintDoc(lomReturnOpDoc(x));
    }); });
    container.querySelectorAll("[data-lomret-xls]").forEach(function(b){ b.addEventListener("click", function(){
      var x = opByIdFrom(STATE.lomReturns, b.getAttribute("data-lomret-xls")); if(x) opExcelDoc(lomReturnOpDoc(x), "Lom_vozvrat");
    }); });
    container.querySelectorAll("[data-lomret-view]").forEach(function(b){ b.addEventListener("click", function(){
      openLomReturnDetail(STATE.lomReturns.find(function(v){return v.id===b.getAttribute("data-lomret-view");}));
    }); });
    container.querySelectorAll("[data-lomret-edit]").forEach(function(b){ b.addEventListener("click", function(){
      var v = STATE.lomReturns.find(function(vv){return vv.id===b.getAttribute("data-lomret-edit");});
      if(v && v.productType==="metal") openLomReturnEditFormMetal(v); else openLomReturnEditForm(v);
    }); });
    container.querySelectorAll("[data-lomret-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var x = STATE.lomReturns.find(function(v){return v.id===b.getAttribute("data-lomret-cancel");});
      openConfirm("Возвратни бекор қилиш", "Бу возврат бекор қилинсинми? Омбор қолдиғи ва таъминотчи ҳисоб-китоби тескари қайтарилади.", "Ҳа, бекор қилиш", function(){
        if(x.productType==="metal"){
          var mc = lomCalcById(x.lomCalcId);
          if(mc){
            adjustStockBy(lomMetalItem().id, mc.metalWarehouseId, x.kg);
            dbUpdate("lomCalcs", mc.id, {metalReturnedKg:Math.max(0,(Number(mc.metalReturnedKg)||0)-x.kg)}, STATE.lomCalcs);
          }
          (x.appliedBreakdown||[]).forEach(function(ab){
            var br = STATE.receipts.find(function(rr){return rr.id===ab.receiptId;});
            if(br) dbUpdate("receipts", br.id, {payableAmount:Number(br.payableAmount||0)+Number(ab.amt||0)}, STATE.receipts);
          });
        } else {
          var r = lomBatchById(x.batchReceiptId);
          if(r){
            adjustStockBy(r.itemId, r.warehouseId, x.kg);
            dbUpdate("receipts", r.id, {returnedKg:Math.max(0,(Number(r.returnedKg)||0)-x.kg), payableAmount:Number(r.payableAmount||0)+Number(x.appliedAmt||0)}, STATE.receipts);
          }
        }
        dbUpdate("lomReturns", x.id, {cancelled:true}, STATE.lomReturns);
        toast("Бекор қилинди");
      }, true);
    }); });
    container.querySelectorAll("[data-lomret-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var x = STATE.lomReturns.find(function(v){return v.id===b.getAttribute("data-lomret-restore");});
      openConfirm("Возвратни тиклаш", "Бу возврат қайта тикланиб, омбордан яна айирилсинми?", "Ҳа, тиклаш", function(){
        if(x.productType==="metal"){
          var mc = lomCalcById(x.lomCalcId);
          if(mc){
            var avail = Math.min(lomCalcMetalAvailable(mc), stockQty(lomMetalItem().id, mc.metalWarehouseId));
            var kg = Math.min(Number(x.kg||0), avail);
            if(kg>0){
              adjustStockBy(lomMetalItem().id, mc.metalWarehouseId, -kg);
              dbUpdate("lomCalcs", mc.id, {metalReturnedKg:(Number(mc.metalReturnedKg)||0)+kg}, STATE.lomCalcs);
            } else { toast("Тикланмади — етарли металл қолдиғи йўқ"); return; }
          }
          (x.appliedBreakdown||[]).forEach(function(ab){
            var br = STATE.receipts.find(function(rr){return rr.id===ab.receiptId;});
            if(br) dbUpdate("receipts", br.id, {payableAmount:Math.max(0,Number(br.payableAmount||0)-Number(ab.amt||0))}, STATE.receipts);
          });
        } else {
          var r = lomBatchById(x.batchReceiptId);
          if(r){
            adjustStockBy(r.itemId, r.warehouseId, -x.kg);
            dbUpdate("receipts", r.id, {returnedKg:(Number(r.returnedKg)||0)+x.kg, payableAmount:Math.max(0,Number(r.payableAmount||0)-Number(x.appliedAmt||0))}, STATE.receipts);
          }
        }
        dbUpdate("lomReturns", x.id, {cancelled:false}, STATE.lomReturns);
        toast("Тикланди");
      }, true);
    }); });
  }
  /* Возвратни таҳрирлаш — партия (ва шу орқали таъминотчи)ни ҳам
     алмаштириш имконини беради. Эски партиядаги эффект (омбор қолдиғи ва
     таъминотчи ҳисоб-китоби) тўлиқ орқага қайтарилади, сўнгра янги
     партияга (ёки ўша партиянинг ўзига, агар ўзгартирилмаган бўлса) янги
     миқдор асосида қайта қўлланилади — худди Лом кирим таҳрирлашдаги
     (openLomReceiptEditForm) омбор алмаштириш логикаси каби. */
  function openLomReturnEditForm(x){
    if(!x) return;
    var oldBatch = lomBatchById(x.batchReceiptId);
    var allBatches = lomBatchReceipts();
    var supplierIds = [];
    allBatches.forEach(function(r){ if(r.supplierId && supplierIds.indexOf(r.supplierId)===-1) supplierIds.push(r.supplierId); });
    supplierIds.sort(function(a,b){ return supplierName(a).localeCompare(supplierName(b)); });
    var selectedSupplierId = x.supplierId || (oldBatch?oldBatch.supplierId:"") || "";
    /* Шу возвратнинг ўз миқдори (x.kg) ҳали ўзгартирилмаган партиянинг
       returnedKg'ига қўшилган ҳолда ҳисобланади — шунга кўра «қолдиқ»ни
       кўрсатишда ва максимал чегарани текширишда уни қайтариб қўшиб
       кўрсатамиз (партиянинг ўзи танланганида). */
    function availableForRow(r){ return lomBatchAvailableKg(r) + (r.id===x.batchReceiptId ? Number(x.kg||0) : 0); }
    function liveStockForRow(r){ return stockQty(r.itemId, r.warehouseId) + (r.id===x.batchReceiptId ? Number(x.kg||0) : 0); }
    function batchOptionsForSupplier(supId){
      var opts = allBatches.filter(function(r){
        if(supId && r.supplierId!==supId) return false;
        return availableForRow(r)>0;
      });
      if(!opts.some(function(r){return r.id===x.batchReceiptId;}) && oldBatch && (!supId || oldBatch.supplierId===supId)) opts = [oldBatch].concat(opts);
      return opts.slice().sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
    }
    var body = '<div class="field"><label>Таъминотчи</label><select id="lret-e-supplier"><option value="">— барча таъминотчилар —</option>'+
        supplierIds.map(function(sid){ return '<option value="'+sid+'"'+(selectedSupplierId===sid?" selected":"")+'>'+esc(supplierName(sid))+'</option>'; }).join("")+
      '</select></div>'+
      '<div class="field"><label>Партия</label><select id="lret-e-batch"></select></div>'+
      '<div class="field-hint" id="lret-e-product-info"></div>'+
      '<div class="field-row"><div class="field"><label>Қайтариладиган миқдор (кг)</label><input id="lret-e-qty" type="number" min="0" step="any" value="'+esc(x.kg)+'"></div>'+
      '<div class="field"><label>Нархи (1 кг, кирим нархи)</label><input id="lret-e-price" type="text" value="0 сўм" disabled></div></div>'+
      '<div class="field"><label>Сумма</label><input id="lret-e-sum" type="text" value="0 сўм" disabled style="font-weight:800;color:var(--critical);"></div>'+
      '<div class="field"><label>Сана</label><input id="lret-e-date" type="date" value="'+esc(x.date||todayISO())+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="lret-e-note">'+esc(x.note||"")+'</textarea></div>'+
      '<div class="field-hint">Қайтариш суммаси таъминотчи билан ҳисоб-китобдан (қарзимиздан) автоматик айирилади.</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Возвратни таҳрирлаш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var supplierSel = m.querySelector("#lret-e-supplier");
    var batchSel = m.querySelector("#lret-e-batch");
    function renderBatchOptions(){
      var opts = batchOptionsForSupplier(supplierSel.value);
      if(!opts.length){
        batchSel.innerHTML = '<option value="">— бу таъминотчида партия йўқ —</option>';
        return;
      }
      batchSel.innerHTML = opts.map(function(r){
        return '<option value="'+r.id+'"'+(x.batchReceiptId===r.id?" selected":"")+'>№'+esc(r.batchNumber||"—")+' · '+esc(r.supplierName||"—")+' · қолдиқ '+fmtNum(availableForRow(r))+' кг</option>';
      }).join("");
    }
    renderBatchOptions();
    var recompute = function(){
      var r = STATE.receipts.find(function(v){return v.id===batchSel.value;});
      var price = r ? Number(r.priceNoVat)||0 : 0;
      var maxKg = r ? Math.min(availableForRow(r), liveStockForRow(r)) : 0;
      var qtyInput = m.querySelector("#lret-e-qty");
      var qty = Number(qtyInput.value)||0;
      if(qty>maxKg){ qty=maxKg; qtyInput.value=maxKg; }
      m.querySelector("#lret-e-price").value = fmtSum(price);
      m.querySelector("#lret-e-sum").value = fmtSum(qty*price);
      var infoEl = m.querySelector("#lret-e-product-info");
      if(infoEl){ var it0=r?itemById(r.itemId):null; infoEl.textContent = r ? ("Маҳсулот: "+(it0?it0.name:"—")+" · Тури: "+itemTypeLabel(it0?it0.itemType:"")+" · Омбордаги қолдиқ: "+fmtNum(liveStockForRow(r))+" кг") : ""; }
    };
    supplierSel.addEventListener("change", function(){ renderBatchOptions(); recompute(); });
    batchSel.addEventListener("change", recompute);
    m.querySelector("#lret-e-qty").addEventListener("input", recompute);
    recompute();
    m.querySelector("[data-save]").addEventListener("click", function(){
      var newBatch = STATE.receipts.find(function(v){return v.id===batchSel.value;});
      if(!newBatch){ toast("Партияни танланг"); return; }
      var newKg = Number(m.querySelector("#lret-e-qty").value)||0;
      var newDate = m.querySelector("#lret-e-date").value||todayISO();
      var newNote = m.querySelector("#lret-e-note").value.trim();
      if(newKg<=0){ toast("Миқдорни киритинг"); return; }
      var maxKg = Math.min(availableForRow(newBatch), liveStockForRow(newBatch));
      if(newKg>maxKg){ toast("Омбордаги/партиядаги қолдиқдан ошиб кетди — қолдиқ: "+fmtNum(maxKg)+" кг"); return; }
      /* 1) эски партиядаги эффектни (омбор ва ҳисоб-китоб) тўлиқ орқага қайтарамиз */
      if(oldBatch){
        adjustStockBy(oldBatch.itemId, oldBatch.warehouseId, Number(x.kg||0));
        dbUpdate("receipts", oldBatch.id, {
          returnedKg: Math.max(0,(Number(oldBatch.returnedKg)||0)-Number(x.kg||0)),
          payableAmount: Number(oldBatch.payableAmount||0)+Number(x.appliedAmt||0)
        }, STATE.receipts);
      }
      /* 2) янги (ёки ўша) партияга янги миқдор асосида қайта қўллаймиз — эски
         эффект юқорида қайтарилгани сабабли STATE.receipts'дан янгидан
         ўқиймиз (агар ўша партиянинг ўзи бўлса, у аллақачон янгиланган). */
      var newBatchLive = STATE.receipts.find(function(v){return v.id===newBatch.id;}) || newBatch;
      var price = Number(newBatchLive.priceNoVat)||0;
      var sum = newKg*price;
      var applyAmt = Math.min(sum, Number(newBatchLive.payableAmount)||0);
      adjustStockBy(newBatchLive.itemId, newBatchLive.warehouseId, -newKg);
      dbUpdate("receipts", newBatchLive.id, {
        returnedKg: (Number(newBatchLive.returnedKg)||0)+newKg,
        payableAmount: Number(newBatchLive.payableAmount||0)-applyAmt
      }, STATE.receipts);
      dbUpdate("lomReturns", x.id, {
        batchReceiptId: newBatchLive.id, batchNumber: newBatchLive.batchNumber||"",
        supplierId: newBatchLive.supplierId||"", supplierName: newBatchLive.supplierName||"",
        kg: newKg, price: price, sum: sum, appliedAmt: applyAmt, date: newDate, note: newNote
      }, STATE.lomReturns);
      toast("Возврат янгиланди — омбор ва ҳисоб-китоб қайта ҳисобланди");
      closeModal();
    });
  }

  /* "Сўнгги возвратлар" рўйхатидаги кўз (кўриш) тугмаси — ҳар бир
     возвратнинг тўлиқ тафсилотини (турi, партия/калькуляция, таъминотчи,
     миқдор, нарх, сумма, қарздан қанча айирилгани, ҳолати ва қайси
     киримлардан аниқ қанча айирилгани) фақат ўқиш учун модалда кўрсатади —
     фойдаланувчи сўровига кўра ("ичига кириб кўриш"). */
  function openLomReturnDetail(x){
    if(!x) return;
    var isMetal = x.productType==="metal";
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Тури</div><div class="dd">'+(isMetal?"Металл (ишлаб чиқаришда ажралган)":"Хом лом (партиядан)")+'</div></div>'+
      '<div><div class="dl">Таъминотчи</div><div class="dd">'+esc(x.supplierName||"—")+'</div></div>'+
      '<div><div class="dl">Партия/калькуляция</div><div class="dd">'+esc(x.batchNumber||"—")+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDate(x.date)+'</div></div>'+
      '<div><div class="dl">Миқдор</div><div class="dd">'+fmtNum(x.kg)+' кг</div></div>'+
      '<div><div class="dl">Нархи (1 кг)</div><div class="dd">'+fmtSum(x.price)+'</div></div>'+
      '<div><div class="dl">Жами сумма</div><div class="dd">'+fmtSum(x.sum)+'</div></div>'+
      '<div><div class="dl">Қарздан айирилди</div><div class="dd">'+fmtSum(x.appliedAmt!=null?x.appliedAmt:x.sum)+'</div></div>'+
      '<div><div class="dl">Ҳолат</div><div class="dd">'+(x.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Амалда</span>')+'</div></div>'+
      '</div>'+
      ((x.appliedBreakdown && x.appliedBreakdown.length) ? ('<h2 style="font-size:13px;font-weight:800;margin:14px 0 8px;">Қайси кирим(лар)дан айирилди</h2>'+
        x.appliedBreakdown.map(function(ab){
          var r = STATE.receipts.find(function(rr){return rr.id===ab.receiptId;});
          return '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px;"><span>№'+esc(r?(r.batchNumber||"—"):"—")+'</span><span class="num">'+fmtSum(ab.amt)+'</span></div>';
        }).join("")) : "")+
      (x.note?('<div class="field" style="margin-top:14px;margin-bottom:0;"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(x.note)+'</div></div>'):"");
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print title="Чоп этиш">'+ICONS.printer+'</button>';
    var m = openModal("Возврат тафсилотлари", body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelector("[data-print]").addEventListener("click", function(){ printLomReturnVoucher(x); });
  }
  function printLomReturnVoucher(x){
    if(!x) return;
    var isMetal = x.productType==="metal";
    var body = '<table>'+
      '<tr><td>Тури</td><td style="text-align:right;">'+(isMetal?"Металл":"Хом лом")+'</td></tr>'+
      '<tr><td>Таъминотчи</td><td style="text-align:right;">'+esc(x.supplierName||"—")+'</td></tr>'+
      '<tr><td>Партия/калькуляция</td><td style="text-align:right;">'+esc(x.batchNumber||"—")+'</td></tr>'+
      '<tr><td>Миқдор</td><td style="text-align:right;">'+fmtNum(x.kg)+' кг</td></tr>'+
      '<tr><td>Нархи (1 кг)</td><td style="text-align:right;">'+fmtSum(x.price)+'</td></tr>'+
      '<tr><td>Қарздан айирилди</td><td style="text-align:right;">'+fmtSum(x.appliedAmt!=null?x.appliedAmt:x.sum)+'</td></tr>'+
      '</table>'+
      '<div class="v-total">Жами: '+fmtSum(x.sum)+'</div>'+
      (x.note?'<div style="margin-top:10px;">Изоҳ: '+esc(x.note)+'</div>':'')+
      '<div class="v-sign"><div>Топширди</div><div>Қабул қилди</div></div>';
    var html = voucherShell("Лом/металл возврати", "Сана: "+esc(fmtDateShort(x.date)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  function exportLomReturnsExcel(list){
    var headers = ["Тури","Таъминотчи","Партия/калькуляция","Сана","Миқдор (кг)","Нархи","Сумма","Ҳолат"];
    var rowsArr = list.map(function(x){ return [x.productType==="metal"?"Металл":"Хом лом", x.supplierName||"", x.batchNumber||"", fmtDateShort(x.date), fmtNum(x.kg), fmtNum(x.price), fmtNum(x.appliedAmt!=null?x.appliedAmt:x.sum), x.cancelled?"Бекор қилинган":"Амалда"]; });
    exportHtmlTableAsExcel("Lom_vozvrat.xls", "Лом/металл возвратлари", headers, rowsArr);
  }

  /* Металл возвратини таҳрирлаш — хом лом возвратидан фарқли ўлароқ,
     металл возврати БИТТА калькуляция (lomCalcId) ва унинг ичидаги бир
     нечта хом лом партиясига (appliedBreakdown орқали) боғлиқ бўлиши
     мумкин, шунга кўра партия/калькуляцияни алмаштиришга йўл қўймаймиз —
     фақат миқдор, сана ва изоҳни таҳрирлаш имконини берамиз. Сақлашда:
     аввал ЭСКИ эффект (омбор қолдиғи, калькуляциянинг metalReturnedKg'и
     ва appliedBreakdown орқали таъминотчи ҳисоб-китоби) тўлиқ орқага
     қайтарилади, сўнгра ЯНГИ миқдор асосида ХУДДИ create'даги каби
     (renderMetalBody'даги lretm-submit) қайта ҳисобланиб қўлланилади. */
  function openLomReturnEditFormMetal(x){
    if(!x) return;
    var c = lomCalcById(x.lomCalcId);
    if(!c){ toast("Боғлиқ калькуляция топилмади — миқдор/партия ўзгартирилган бўлиши мумкин"); return; }
    var metalIt = lomMetalItem();
    var availBase = Math.min(lomCalcMetalAvailable(c), stockQty(metalIt.id, c.metalWarehouseId)) + Number(x.kg||0);
    var body = '<div class="field-hint" style="margin-bottom:10px;">'+esc(lomCalcBatchLabel(c))+' · '+esc(x.supplierName||"—")+'</div>'+
      '<div class="field-row"><div class="field"><label>Қайтариладиган миқдор (кг)</label><input id="lretm-e-qty" type="number" min="0" max="'+availBase+'" step="any" value="'+esc(x.kg)+'"></div>'+
      '<div class="field"><label>Нархи (1 кг)</label><input id="lretm-e-price" type="text" value="'+fmtSum(x.price)+'" disabled></div></div>'+
      '<div class="field"><label>Сумма</label><input id="lretm-e-sum" type="text" value="'+fmtSum(x.sum)+'" disabled style="font-weight:800;color:var(--critical);"></div>'+
      '<div class="field"><label>Сана</label><input id="lretm-e-date" type="date" value="'+esc(x.date||todayISO())+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="lretm-e-note">'+esc(x.note||"")+'</textarea></div>'+
      '<div class="field-hint">Максимал: '+fmtNum(availBase)+' кг (жорий омбор қолдиғи ва калькуляциянинг мавжуд металлини ҳисобга олган ҳолда). Таъминотчи ва партия/калькуляция ўзгартирилмайди.</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Металл возвратини таҳрирлаш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var recompute = function(){
      var qty = Number(m.querySelector("#lretm-e-qty").value)||0;
      if(qty>availBase){ qty=availBase; m.querySelector("#lretm-e-qty").value=availBase; }
      if(qty<0){ qty=0; m.querySelector("#lretm-e-qty").value=0; }
      m.querySelector("#lretm-e-sum").value = fmtSum(qty*Number(x.price||0));
    };
    m.querySelector("#lretm-e-qty").addEventListener("input", recompute);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var newQty = Number(m.querySelector("#lretm-e-qty").value)||0;
      var newDate = m.querySelector("#lretm-e-date").value||todayISO();
      var newNote = m.querySelector("#lretm-e-note").value.trim();
      if(newQty<=0){ toast("Миқдорни киритинг"); return; }
      if(newQty>availBase){ toast("Максимал миқдордан ошиб кетди — қолдиқ: "+fmtNum(availBase)+" кг"); return; }
      /* 1) эски эффектни тўлиқ орқага қайтарамиз */
      adjustStockBy(metalIt.id, c.metalWarehouseId, Number(x.kg||0));
      dbUpdate("lomCalcs", c.id, {metalReturnedKg:Math.max(0,(Number(c.metalReturnedKg)||0)-Number(x.kg||0))}, STATE.lomCalcs);
      (x.appliedBreakdown||[]).forEach(function(ab){
        var br = STATE.receipts.find(function(rr){return rr.id===ab.receiptId;});
        if(br) dbUpdate("receipts", br.id, {payableAmount:Number(br.payableAmount||0)+Number(ab.amt||0)}, STATE.receipts);
      });
      /* 2) янги миқдор асосида қайта қўллаймиз — create'даги (renderMetalBody)
         билан айнан бир хил алгоритм: калькуляциянинг хом лом партиялари
         бўйича кетма-кет, payableAmount'дан қанча борича шунча айирамиз. */
      var price = Number(x.price||0);
      var sum = newQty*price;
      adjustStockBy(metalIt.id, c.metalWarehouseId, -newQty);
      dbUpdate("lomCalcs", c.id, {metalReturnedKg:(Number(c.metalReturnedKg)||0)+newQty}, STATE.lomCalcs);
      var remaining = sum;
      var appliedBreakdown = [];
      lomCalcBatches(c).forEach(function(b){
        if(remaining<=0) return;
        var br = lomBatchById(b.batchReceiptId);
        if(!br) return;
        var applyAmt = Math.min(remaining, Number(br.payableAmount)||0);
        if(applyAmt>0){
          dbUpdate("receipts", br.id, {payableAmount:Number(br.payableAmount||0)-applyAmt}, STATE.receipts);
          appliedBreakdown.push({receiptId:br.id, amt:applyAmt});
          remaining -= applyAmt;
        }
      });
      dbUpdate("lomReturns", x.id, {
        kg:newQty, sum:sum, appliedAmt:sum-remaining, appliedBreakdown:appliedBreakdown, date:newDate, note:newNote
      }, STATE.lomReturns);
      toast("Металл возврати янгиланди — омбор ва таъминотчи ҳисоб-китоби қайта ҳисобланди");
      closeModal();
    });
  }

  /* ---------- Ишлаб чиқариш: Лом (Алюмин) калькуляцияси ва ишлаб чиқариши ---------- */
  function renderLomTab(){
    setTopbar("Лом (Алюмин) калькуляцияси", STATE.lomCalcs.length+" та ёзув", '<button class="btn btn-primary" id="lomCalcCreateBtn">'+ICONS.plus+'Янги калькуляция</button>');
    var root = document.getElementById("content");
    var html = prodSubnav("lom") + sampleBanner();
    var list = STATE.lomCalcs.slice().sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
    if(!list.length){
      html += emptyState("Ҳали лом калькуляцияси йўқ","«Янги калькуляция» тугмаси орқали партия асосида ҳисоблашни бошланг.");
    } else {
      var rows = list.map(function(c, idx){
        var statusChip = c.cancelled ? '<span class="chip chip-neutral">Бекор қилинган</span>' : (c.produced ? '<span class="chip chip-good">Ишлаб чиқарилган</span>' : '<span class="chip chip-warning">Ишлаб чиқарилмаган</span>');
        return '<tr'+(c.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(c.date||(c.createdAt||"").slice(0,10))+'</td>'+
          '<td class="cell-strong">'+esc(lomCalcBatchLabel(c))+'</td>'+
          '<td class="cell-muted">'+esc(lomCalcSupplierLabel(c))+'</td>'+
          '<td class="cell-muted">'+esc(c.productName||"Тайёр алюмин")+'</td>'+
          '<td class="num cell-muted">'+fmtNum(c.kgUsed)+' кг</td>'+
          '<td class="num cell-strong">'+fmtSum(c.totalCost)+'</td>'+
          '<td>'+statusChip+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-lomcalc-view="'+c.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
            (!c.cancelled && !c.produced?'<button class="btn btn-ghost btn-icon" data-lomcalc-edit="'+c.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>':'')+
            (!c.cancelled && !c.produced?'<button class="btn btn-primary btn-sm" data-lomcalc-produce="'+c.id+'" title="Ишлаб чиқариш" style="padding:5px 10px;font-size:11.5px;">Ишлаб чиқариш</button>':'')+
            (!c.cancelled?'<button class="btn btn-ghost btn-icon" data-lomcalc-cancel="'+c.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>':'')+
            (c.cancelled?'<button class="btn btn-ghost btn-icon" data-lomcalc-restore="'+c.id+'" title="Тиклаш">'+ICONS.restore+'</button>':'')+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сана</th><th>Партия</th><th>Таъминотчи</th><th>Маҳсулот</th><th>Лом (кг)</th><th>Таннарх</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireProdSubnav(root);
    document.getElementById("lomCalcCreateBtn").addEventListener("click", function(){ openLomCalcForm(null); });
    root.querySelectorAll("[data-lomcalc-view]").forEach(function(b){ b.addEventListener("click", function(){ openLomCalcDetail(list.find(function(x){return x.id===b.getAttribute("data-lomcalc-view");})); }); });
    root.querySelectorAll("[data-lomcalc-edit]").forEach(function(b){ b.addEventListener("click", function(){ openLomCalcForm(list.find(function(x){return x.id===b.getAttribute("data-lomcalc-edit");})); }); });
    root.querySelectorAll("[data-lomcalc-produce]").forEach(function(b){ b.addEventListener("click", function(){ openLomProductionForm(list.find(function(x){return x.id===b.getAttribute("data-lomcalc-produce");})); }); });
    root.querySelectorAll("[data-lomcalc-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var c = list.find(function(x){return x.id===b.getAttribute("data-lomcalc-cancel");});
      var msg = c.produced ? "Бу калькуляция аллақачон ишлаб чиқарилган — бекор қилинса, натижада омборга киритилган тайёр алюмин, металл ва кул ҳамда сарфланган лом ва қўшимча махсулотлар орқага қайтарилади. Давом этасизми?" : "Бу калькуляция бекор қилинсинми? Лом партияси яна бўш қолади.";
      openConfirm("Калькуляцияни бекор қилиш", msg, "Ҳа, бекор қилиш", function(){ cancelLomCalc(c); }, true);
    }); });
    root.querySelectorAll("[data-lomcalc-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var c = list.find(function(x){return x.id===b.getAttribute("data-lomcalc-restore");});
      var conflictInfo = null;
      lomCalcBatches(c).some(function(bt){
        var r = lomBatchById(bt.batchReceiptId);
        if(!r) return false;
        var remaining = lomBatchAvailableKg(r, c.id);
        if(Number(bt.kgUsed||0) > remaining){ conflictInfo = {batchNumber:bt.batchNumber, need:Number(bt.kgUsed||0), remaining:remaining}; return true; }
        return false;
      });
      if(conflictInfo){ toast("Тикланмади — «№"+esc(conflictInfo.batchNumber||"—")+"» партиясида етарли лом қолмаган (керак: "+fmtNum(conflictInfo.need)+" кг, қолдиқ: "+fmtNum(conflictInfo.remaining)+" кг)"); return; }
      openConfirm("Калькуляцияни тиклаш", "Бу калькуляция қайта тикланиб, фаол ҳолатга қайтарилсинми?"+(c.produced?" Ишлаб чиқариш натижалари ҳам қайта тикланади (омборга яна кирим қилинади).":""), "Ҳа, тиклаш", function(){ restoreLomCalc(c); }, true);
    }); });
  }
  function cancelLomCalc(c){
    if(c.produced){
      lomCalcBatches(c).forEach(function(b){
        var batch = lomBatchById(b.batchReceiptId);
        if(batch) adjustStockBy(batch.itemId, batch.warehouseId, Number(b.kgUsed||0));
      });
      (c.additives||[]).forEach(function(a){ if(a.itemId) adjustStockBy(a.itemId, c.prodWarehouseId, Number(a.qty||0)); });
      if(c.tayyorKg) adjustStockBy(c.productItemId || lomFinishedItem().id, c.prodWarehouseId, -Number(c.tayyorKg||0));
      if(c.metalKg && c.metalWarehouseId) adjustStockBy(lomMetalItem().id, c.metalWarehouseId, -Number(c.metalKg||0));
      if(c.kulKg && c.kulWarehouseId) adjustStockBy(lomKulItem().id, c.kulWarehouseId, -Number(c.kulKg||0));
    }
    dbUpdate("lomCalcs", c.id, {cancelled:true}, STATE.lomCalcs);
    toast("Бекор қилинди");
  }
  function restoreLomCalc(c){
    if(c.produced){
      lomCalcBatches(c).forEach(function(b){
        var batch = lomBatchById(b.batchReceiptId);
        if(batch) adjustStockBy(batch.itemId, batch.warehouseId, -Number(b.kgUsed||0));
      });
      (c.additives||[]).forEach(function(a){ if(a.itemId) adjustStockBy(a.itemId, c.prodWarehouseId, -Number(a.qty||0)); });
      if(c.tayyorKg) adjustStockBy(c.productItemId || lomFinishedItem().id, c.prodWarehouseId, Number(c.tayyorKg||0));
      if(c.metalKg && c.metalWarehouseId) adjustStockBy(lomMetalItem().id, c.metalWarehouseId, Number(c.metalKg||0));
      if(c.kulKg && c.kulWarehouseId) adjustStockBy(lomKulItem().id, c.kulWarehouseId, Number(c.kulKg||0));
    }
    dbUpdate("lomCalcs", c.id, {cancelled:false}, STATE.lomCalcs);
    toast("Тикланди");
  }
  function openLomCalcDetail(c){
    if(!c) return;
    var batchRows = lomCalcBatches(c).map(function(b){
      return '<tr><td class="cell-strong">№'+esc(b.batchNumber||"—")+'</td><td class="cell-muted">'+esc(b.supplierName||"—")+'</td><td class="num">'+fmtNum(b.kgUsed)+' кг</td><td class="num">'+fmtSum(b.batchPrice)+'</td><td class="num cell-strong">'+fmtSum(Number(b.kgUsed||0)*Number(b.batchPrice||0))+'</td></tr>';
    }).join("");
    var addRows = (c.additives||[]).map(function(a){
      return '<tr><td>'+esc(a.name)+'</td><td class="num">'+fmtNum(a.qty)+'</td><td class="num">'+fmtSum(a.price)+'</td><td class="num cell-strong">'+fmtSum(a.qty*a.price)+'</td></tr>';
    }).join("");
    var body = (batchRows?'<div class="table-wrap" style="margin-bottom:14px;"><table><thead><tr><th>Партия</th><th>Таъминотчи</th><th>Лом (кг)</th><th>Нархи</th><th>Қиймати</th></tr></thead><tbody>'+batchRows+'</tbody></table></div>':'')+
      '<div class="detail-grid">'+
      '<div><div class="dl">Тайёр маҳсулот</div><div class="dd">'+esc(c.productName||"Тайёр алюмин")+'</div></div>'+
      '<div><div class="dl">Лом миқдори (жами)</div><div class="dd">'+fmtNum(lomCalcKgUsedTotal(c))+' кг</div></div>'+
      '<div><div class="dl">Козонлар сони</div><div class="dd">'+fmtNum(c.potsCount||0)+'</div></div>'+
      '</div>'+
      (addRows?'<div class="table-wrap" style="margin-bottom:14px;"><table><thead><tr><th>Қўшимча</th><th>Миқдор</th><th>Нархи</th><th>Қиймати</th></tr></thead><tbody>'+addRows+'</tbody></table></div>':'')+
      '<div class="card" style="padding:16px 18px;margin-bottom:14px;">'+
        resultLineHtml2("Лом қиймати", c.lomCost)+
        resultLineHtml2("Қўшимча махсулотлар", c.additivesCost)+
        resultLineHtml2("Иш ҳақи ("+fmtNum(c.workersCount||0)+" ишчи × "+fmtNum(c.workHours||0)+" соат)", c.wagesCost)+
        resultLineHtml2("Электр энергияси", c.elecCost)+
        resultLineHtml2("Газ", c.gasCost)+
        '<div style="border-top:1px solid var(--border-strong);margin-top:6px;padding-top:8px;display:flex;justify-content:space-between;"><span style="font-weight:800;">ТАННАРХ (жами)</span><span class="num" style="font-weight:800;">'+fmtSum(c.totalCost)+'</span></div>'+
      '</div>'+
      (c.produced ? '<div class="card" style="padding:16px 18px;"><h2 style="font-size:13px;font-weight:800;margin:0 0 8px;">Ишлаб чиқариш натижаси ('+fmtDateShort(c.prodDate)+')</h2>'+
        '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-2);margin-bottom:5px;"><span>Маҳсулот</span><span>'+esc(c.productName||"Тайёр алюмин")+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-2);margin-bottom:5px;"><span>Тайёр алюмин чиққан</span><span class="num">'+fmtNum(c.tayyorKg)+' кг — '+esc(warehouseName(c.prodWarehouseId))+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-2);margin-bottom:5px;"><span>Металл чиққан</span><span class="num">'+fmtNum(c.metalKg)+' кг — '+esc(warehouseName(c.metalWarehouseId))+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-2);margin-bottom:5px;"><span>Чушка чиқинди кули чиққан</span><span class="num">'+fmtNum(c.kulKg)+' кг — '+esc(warehouseName(c.kulWarehouseId))+'</span></div>'+
        '<div style="border-top:1px solid var(--border-strong);margin-top:6px;padding-top:8px;display:flex;justify-content:space-between;"><span style="font-weight:800;">Тайёр алюмин таннархи</span><span class="num" style="font-weight:800;">'+fmtSum(c.tayyorCost)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span style="font-weight:700;color:var(--accent);">1 кг таннархи</span><span class="num" style="font-weight:800;color:var(--accent);">'+fmtSum(c.tayyorCostPerKg)+'</span></div>'+
        '</div>' : '');
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button>';
    var m = openModal("Калькуляция — №"+esc(c.batchNumber||"—"), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
  }
  function openLomProductionForm(c, draft){
    if(!c || c.cancelled || c.produced) return;
    var settings = getSettings();
    var metalWhId = settings.lomMetalWarehouseId||"";
    var kulWhId = settings.lomKulWarehouseId||"";
    if(!metalWhId || !kulWhId){
      toast("Аввал «Омборлар → Бошқарув» бўлимида металл ва кул учун белгиланган омборларни танланг");
      return;
    }
    var fs = {
      warehouseId: (draft && draft.warehouseId) || "",
      tayyorKg: (draft && draft.tayyorKg!=null) ? draft.tayyorKg : 0,
      metalKg: (draft && draft.metalKg!=null) ? draft.metalKg : 0,
      kulKg: (draft && draft.kulKg!=null) ? draft.kulKg : 0,
      productItemId: (draft && draft.productItemId!=null) ? draft.productItemId : (c.productItemId||""),
      productName: (draft && draft.productName!=null) ? draft.productName : (c.productName||"")
    };
    var body = '<div class="field-hint" style="margin-bottom:10px;">Партия(лар) '+esc(lomCalcBatchLabel(c))+' · Лом '+fmtNum(lomCalcKgUsedTotal(c))+' кг · Калькуляция таннархи: <strong>'+fmtSum(c.totalCost)+'</strong></div>'+
      '<div class="field"><label>Тайёр алюмин омбори</label><select id="lp-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(fs.warehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Маҳсулот номи (тайёр алюмин)</label><div style="display:flex;gap:6px;">'+itemComboInputHtml("lp-product", "lp-product-datalist", fs.productItemId?itemById(fs.productItemId):null, "Тайёр маҳсулотлардан танланг ёки янгисини ёзинг…", "flex:1;min-width:0;", isSellableItem)+'<button type="button" class="btn btn-secondary btn-icon" id="lp-product-pick" title="Рўйхатдан қидириб танлаш" style="flex-shrink:0;">'+ICONS.search+'</button><button type="button" class="btn btn-secondary btn-icon" id="lp-product-add" title="Янги маҳсулот қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div><div class="field-hint" id="lp-product-info"></div></div>'+
      '<div class="field-row"><div class="field"><label>Тайёр алюмин чиққан (кг)</label><input id="lp-tayyor" type="number" min="0" step="any" value="'+esc(fs.tayyorKg)+'"></div>'+
      '<div class="field"><label>Металл чиққан (кг)</label><input id="lp-metal" type="number" min="0" step="any" value="'+esc(fs.metalKg)+'"></div></div>'+
      '<div class="field"><label>Чушка чиқинди кули чиққан (кг)</label><input id="lp-kul" type="number" min="0" step="any" value="'+esc(fs.kulKg)+'"></div>'+
      '<div class="field-hint">Металл — «'+esc(warehouseName(metalWhId))+'» омборига (лом нархида), Чушка чиқинди кули — «'+esc(warehouseName(kulWhId))+'» омборига автомат кирим бўлади.</div>'+
      '<div class="card" style="padding:14px 16px;background:var(--surface-2);margin-top:10px;">'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Металл қиймати (лом нархида)</span><span class="num" id="lp-metalval">0 сўм</span></div>'+
        '<div style="display:flex;justify-content:space-between;"><span style="font-weight:800;">Тайёр алюмин таннархи</span><span class="num" id="lp-tayyorcost" style="font-weight:800;">0 сўм</span></div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span style="font-weight:700;color:var(--accent);">1 кг таннархи</span><span class="num" id="lp-perkg" style="font-weight:800;color:var(--accent);">0 сўм</span></div>'+
      '</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Ишлаб чиқариш</button>';
    var m = openModal("Ишлаб чиқариш — "+esc(lomCalcBatchLabel(c)), body, foot, true);
    m.querySelector(".modal").classList.add("xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    function syncFromInputs(){
      var whEl=m.querySelector("#lp-wh"); if(whEl) fs.warehouseId=whEl.value;
      var tEl=m.querySelector("#lp-tayyor"); if(tEl) fs.tayyorKg=Number(tEl.value)||0;
      var mEl=m.querySelector("#lp-metal"); if(mEl) fs.metalKg=Number(mEl.value)||0;
      var kEl=m.querySelector("#lp-kul"); if(kEl) fs.kulKg=Number(kEl.value)||0;
      var pEl=m.querySelector("#lp-product");
      if(pEl){ var pit=resolveItemFromComboValue(pEl.value, isSellableItem); fs.productItemId=pit?pit.id:""; fs.productName=pit?pit.name:""; }
    }
    function updateProductInfo(){
      var it = resolveItemFromComboValue(m.querySelector("#lp-product").value, isSellableItem);
      var infoEl = m.querySelector("#lp-product-info");
      if(infoEl) infoEl.textContent = it ? ("Тури: "+itemTypeLabel(it.itemType)+" · Категория: "+categoryName(it.categoryId)) : "";
    }
    m.querySelector("#lp-product").addEventListener("input", updateProductInfo);
    m.querySelector("#lp-product").addEventListener("change", updateProductInfo);
    updateProductInfo();
    m.querySelector("#lp-product-pick").addEventListener("click", function(){
      syncFromInputs();
      var snap = Object.assign({}, fs);
      closeModal();
      openItemPickerModal("Тайёр маҳсулотни танлаш", STATE.items.filter(isSellableItem), function(item){
        if(item){ snap.productItemId=item.id; snap.productName=item.name; }
        openLomProductionForm(c, snap);
      }, function(){ openLomProductionForm(c, snap); });
    });
    m.querySelector("#lp-product-add").addEventListener("click", function(){
      syncFromInputs();
      var snap = Object.assign({}, fs);
      closeModal();
      openItemForm({name:"", itemType:"mahsulot", unit:"кг", minQuantity:0, price:0, categoryId:"", location:""}, function(newItemId, newItemName){
        snap.productItemId = newItemId||""; snap.productName = newItemName||"";
        openLomProductionForm(c, snap);
      });
    });

    var recompute = function(){
      syncFromInputs();
      var metalVal = fs.metalKg*Number(c.batchPrice||0);
      var tayyorCost = Math.max(0, Number(c.totalCost||0)-metalVal);
      var perKg = fs.tayyorKg>0 ? tayyorCost/fs.tayyorKg : 0;
      m.querySelector("#lp-metalval").textContent = fmtSum(metalVal);
      m.querySelector("#lp-tayyorcost").textContent = fmtSum(tayyorCost);
      m.querySelector("#lp-perkg").textContent = fmtSum(perKg);
    };
    m.querySelector("#lp-wh").addEventListener("change", syncFromInputs);
    ["lp-tayyor","lp-metal"].forEach(function(id){ m.querySelector("#"+id).addEventListener("input", recompute); });
    recompute();
    m.querySelector("[data-save]").addEventListener("click", function(){
      syncFromInputs();
      var whId = fs.warehouseId;
      var tayyorKg = fs.tayyorKg;
      var metalKg = fs.metalKg;
      var kulKg = fs.kulKg;
      if(!whId){ toast("Омборни танланг"); return; }
      if(tayyorKg<=0 && metalKg<=0 && kulKg<=0){ toast("Камида битта чиқим миқдорини киритинг"); return; }
      if(tayyorKg>0 && !fs.productItemId){ toast("Тайёр маҳсулот номини рўйхатдан танланг ёки «+» орқали янги қўшинг"); return; }
      var shortages = [];
      (c.additives||[]).forEach(function(a){
        if(!a.itemId) return;
        var avail = totalStockQty(a.itemId);
        if(avail < Number(a.qty||0)) shortages.push(a.name+" — керак "+fmtNum(a.qty)+", қолдиқ: "+fmtNum(avail));
      });
      if(shortages.length){ toast("Омборда етарли эмас: "+shortages.join("; ")); return; }
      lomCalcBatches(c).forEach(function(b){
        var batch = lomBatchById(b.batchReceiptId);
        if(batch) adjustStockBy(batch.itemId, batch.warehouseId, -Number(b.kgUsed||0));
      });
      (c.additives||[]).forEach(function(a){ if(a.itemId) consumeItemAcrossWarehouses(a.itemId, Number(a.qty||0), whId); });
      var metalVal = metalKg*Number(c.batchPrice||0);
      var tayyorCost = Math.max(0, Number(c.totalCost||0)-metalVal);
      var perKg = tayyorKg>0 ? tayyorCost/tayyorKg : 0;
      var prodItem = fs.productItemId ? itemById(fs.productItemId) : null;
      var prodItemId = prodItem ? prodItem.id : lomFinishedItem().id;
      var prodItemName = prodItem ? prodItem.name : lomFinishedItem().name;
      if(tayyorKg>0){
        adjustStockBy(prodItemId, whId, tayyorKg);
        dbUpdate("items", prodItemId, {price:perKg}, STATE.items);
      }
      if(metalKg>0){
        var met = lomMetalItem();
        adjustStockBy(met.id, metalWhId, metalKg);
        dbUpdate("items", met.id, {price:Number(c.batchPrice||0)}, STATE.items);
      }
      if(kulKg>0){
        var kul = lomKulItem();
        adjustStockBy(kul.id, kulWhId, kulKg);
      }
      dbUpdate("lomCalcs", c.id, {
        produced:true, prodDate:todayISO(), prodWarehouseId:whId, tayyorKg:tayyorKg, metalKg:metalKg, kulKg:kulKg,
        metalWarehouseId:metalWhId, kulWarehouseId:kulWhId, metalValue:metalVal, tayyorCost:tayyorCost, tayyorCostPerKg:perKg,
        productItemId: prodItemId, productName: prodItemName
      }, STATE.lomCalcs);
      toast("Ишлаб чиқарилди — омборлар янгиланди");
      closeModal();
    });
  }
  function openLomCalcForm(existing){
    var isEdit = !!(existing && existing.id);
    if(isEdit && (existing.cancelled || existing.produced)){ toast("Бу ёзувни таҳрирлаб бўлмайди"); return; }
    var excludeCalcId = isEdit ? existing.id : "";
    var fs = {
      date: (existing && existing.date) || todayISO(),
      batches: lomCalcBatches(existing).map(function(b){ return {batchReceiptId:b.batchReceiptId, kgUsed:Number(b.kgUsed||0)}; }),
      productItemId: (existing && existing.productItemId) || "",
      productName: (existing && existing.productName) || "",
      additives: (existing && existing.additives) ? existing.additives.map(function(a){return Object.assign({},a);}) : [],
      potsCount: (existing && existing.potsCount) || 0,
      workHours: (existing && existing.workHours) || 0,
      hourlyWage: (existing && existing.hourlyWage) || 0,
      workersCount: (existing && existing.workersCount) || 0,
      hourlyElec: (existing && existing.hourlyElec) || 0,
      elecPrice: (existing && existing.elecPrice) || 0,
      hourlyGas: (existing && existing.hourlyGas) || 0,
      gasPrice: (existing && existing.gasPrice) || 0
    };
    var head = '<div class="field"><label>Сана</label><input type="date" id="lc-date" value="'+esc(fs.date)+'"></div>'+
      '<div class="field"><label>Партия(лар) — бир нечтасини танлаш мумкин</label><div id="lc-batches" style="max-height:240px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:10px;"></div></div>'+
      '<div class="field" id="lc-kg-wrap"></div>'+
      '<div class="section-head" style="margin:14px 0 8px;"><h2 style="font-size:13px;">Ярим тайёр маҳсулот</h2></div>'+
      '<div class="field"><label>Номи</label><div style="display:flex;gap:6px;">'+itemComboInputHtml("lc-product", "lc-product-datalist", fs.productItemId?itemById(fs.productItemId):null, "Ярим тайёр маҳсулотлардан танланг…", "flex:1;min-width:0;", isSemiFinishedItem)+'<button type="button" class="btn btn-secondary btn-icon" id="lc-product-pick" title="Рўйхатдан қидириб танлаш" style="flex-shrink:0;">'+ICONS.search+'</button><button type="button" class="btn btn-secondary btn-icon" id="lc-product-add" title="Янги маҳсулот қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div><div class="field-hint" id="lc-product-info"></div></div>'+
      '<div class="section-head" style="margin:14px 0 8px;"><h2 style="font-size:13px;">Қўшимча махсулотлар</h2><button type="button" class="btn btn-secondary btn-sm" id="lc-add-additive">'+ICONS.plus+'Қатор қўшиш</button></div>'+
      '<div id="lc-additives"></div>'+
      '<div class="field-row" style="margin-top:14px;"><div class="field"><label>Козонлар сони</label><input id="lc-pots" type="number" min="0" step="any" value="'+esc(fs.potsCount)+'"></div>'+
      '<div class="field"><label>Иш соати</label><input id="lc-hours" type="number" min="0" step="any" value="'+esc(fs.workHours)+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>1 соатлик иш ҳақи</label><input id="lc-wage" type="number" min="0" step="any" value="'+esc(fs.hourlyWage)+'"></div>'+
      '<div class="field"><label>Ишчилар сони</label><input id="lc-workers" type="number" min="0" step="any" value="'+esc(fs.workersCount)+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>1 соатлик электр энергия сарфи (кВт)</label><input id="lc-elecqty" type="number" min="0" step="any" value="'+esc(fs.hourlyElec)+'"></div>'+
      '<div class="field"><label>Электр энергия нархи</label><input id="lc-elecprice" type="number" min="0" step="any" value="'+esc(fs.elecPrice)+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>1 соатлик газ сарфи</label><input id="lc-gasqty" type="number" min="0" step="any" value="'+esc(fs.hourlyGas)+'"></div>'+
      '<div class="field"><label>Газ нархи</label><input id="lc-gasprice" type="number" min="0" step="any" value="'+esc(fs.gasPrice)+'"></div></div>'+
      '<div id="lc-summary"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Лом калькуляциясини таҳрирлаш":"Янги лом калькуляцияси", head, foot, true);
    m.querySelector(".modal").classList.add("xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    function syncFromInputs(){
      var dEl=m.querySelector("#lc-date"); if(dEl) fs.date=dEl.value;
      var pEl=m.querySelector("#lc-product");
      if(pEl){ var pit=resolveItemFromComboValue(pEl.value, isSemiFinishedItem); fs.productItemId=pit?pit.id:""; fs.productName=pit?pit.name:""; }
      m.querySelectorAll("[data-add-qty]").forEach(function(inp){ var i=Number(inp.getAttribute("data-add-qty")); if(fs.additives[i]) fs.additives[i].qty=Number(inp.value)||0; });
      m.querySelectorAll("[data-add-price]").forEach(function(inp){ var i=Number(inp.getAttribute("data-add-price")); if(fs.additives[i]) fs.additives[i].price=Number(inp.value)||0; });
      var potsEl=m.querySelector("#lc-pots"); if(potsEl) fs.potsCount=Number(potsEl.value)||0;
      var hrsEl=m.querySelector("#lc-hours"); if(hrsEl) fs.workHours=Number(hrsEl.value)||0;
      var wageEl=m.querySelector("#lc-wage"); if(wageEl) fs.hourlyWage=Number(wageEl.value)||0;
      var workersEl=m.querySelector("#lc-workers"); if(workersEl) fs.workersCount=Number(workersEl.value)||0;
      var elecqEl=m.querySelector("#lc-elecqty"); if(elecqEl) fs.hourlyElec=Number(elecqEl.value)||0;
      var elecpEl=m.querySelector("#lc-elecprice"); if(elecpEl) fs.elecPrice=Number(elecpEl.value)||0;
      var gasqEl=m.querySelector("#lc-gasqty"); if(gasqEl) fs.hourlyGas=Number(gasqEl.value)||0;
      var gaspEl=m.querySelector("#lc-gasprice"); if(gaspEl) fs.gasPrice=Number(gaspEl.value)||0;
    }
    function renderKgWrap(){
      var rows = fs.batches.map(function(b){ var r=lomBatchById(b.batchReceiptId); return r?{r:r,kg:Number(b.kgUsed||0)}:null; }).filter(Boolean);
      var totalKg = rows.reduce(function(s,x){ return s+x.kg; },0);
      var totalVal = rows.reduce(function(s,x){ return s+x.kg*Number(x.r.priceNoVat||0); },0);
      m.querySelector("#lc-kg-wrap").innerHTML = '<label>Лом миқдори (жами, автомат)</label>'+
        (rows.length ? '<div class="num cell-strong" style="font-size:15px;padding:8px 0;">'+fmtNum(totalKg)+' кг = '+fmtSum(totalVal)+' <span style="font-weight:400;color:var(--ink-3);font-size:12px;">('+rows.length+' та партия)</span></div>' : '<div class="num cell-strong" style="font-size:15px;padding:8px 0;">— партия(лар) танланг —</div>');
    }
    function renderBatchChecklist(){
      var opts = lomAvailableBatches(isEdit?existing.id:"");
      fs.batches.forEach(function(b){
        if(!opts.some(function(r){return r.id===b.batchReceiptId;})){
          var cur = lomBatchById(b.batchReceiptId);
          if(cur) opts.push(cur);
        }
      });
      opts = opts.slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
      var wrap = m.querySelector("#lc-batches");
      if(!opts.length){
        wrap.innerHTML = '<div class="field-hint">Бўш партия йўқ</div>';
        fs.batches = [];
        renderKgWrap();
        return;
      }
      wrap.innerHTML = opts.map(function(r){
        var sel = fs.batches.find(function(b){return b.batchReceiptId===r.id;});
        var avail = lomBatchAvailableKg(r, excludeCalcId);
        var checked = !!sel;
        var kgVal = checked ? sel.kgUsed : avail;
        return '<div class="field-row" style="grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin-bottom:6px;">'+
          '<input type="checkbox" data-lc-batch-check="'+r.id+'" '+(checked?"checked":"")+' style="width:18px;height:18px;">'+
          '<div style="font-size:12.5px;">№'+esc(r.batchNumber||"—")+' · '+esc(r.supplierName||"—")+' · қолдиқ <strong>'+fmtNum(avail)+' кг</strong> × '+fmtSum(r.priceNoVat)+'</div>'+
          '<input type="number" min="0" max="'+avail+'" step="any" data-lc-batch-kg="'+r.id+'" value="'+esc(kgVal)+'" style="width:110px;" '+(checked?"":"disabled")+'>'+
          '</div>';
      }).join("");
      wrap.querySelectorAll("[data-lc-batch-check]").forEach(function(cb){
        cb.addEventListener("change", function(){
          var rid = cb.getAttribute("data-lc-batch-check");
          var kgInp = wrap.querySelector('[data-lc-batch-kg="'+rid+'"]');
          if(cb.checked){
            var r = lomBatchById(rid); var avail = r?lomBatchAvailableKg(r, excludeCalcId):0;
            if(!fs.batches.some(function(b){return b.batchReceiptId===rid;})) fs.batches.push({batchReceiptId:rid, kgUsed:avail});
            if(kgInp){ kgInp.disabled=false; kgInp.value=avail; }
          } else {
            fs.batches = fs.batches.filter(function(b){return b.batchReceiptId!==rid;});
            if(kgInp) kgInp.disabled=true;
          }
          renderKgWrap(); recomputeSummary();
        });
      });
      wrap.querySelectorAll("[data-lc-batch-kg]").forEach(function(inp){
        inp.addEventListener("input", function(){
          var rid = inp.getAttribute("data-lc-batch-kg");
          var r = lomBatchById(rid); var avail = r?lomBatchAvailableKg(r, excludeCalcId):0;
          var v = Number(inp.value)||0;
          if(v>avail){ v=avail; inp.value=avail; }
          if(v<0){ v=0; inp.value=0; }
          var b = fs.batches.find(function(x){return x.batchReceiptId===rid;});
          if(b) b.kgUsed=v;
          renderKgWrap(); recomputeSummary();
        });
      });
      renderKgWrap();
    }
    function additiveRowsHtml(){
      return fs.additives.map(function(a,i){
        return '<div class="field-row" style="grid-template-columns:2fr 1fr 1fr auto;align-items:end;gap:8px;margin-bottom:8px;" data-add-row="'+i+'">'+
          '<div class="field" style="margin-bottom:0;">'+itemComboInputHtml("lc-add-item-"+i, "lc-add-list-"+i, a.itemId?itemById(a.itemId):null, "Маҳсулот…", "", null, 'data-add-item="'+i+'"')+'</div>'+
          '<div class="field" style="margin-bottom:0;"><input type="number" min="0" step="any" placeholder="Миқдор" data-add-qty="'+i+'" value="'+esc(a.qty||0)+'"></div>'+
          '<div class="field" style="margin-bottom:0;"><input type="number" min="0" step="any" placeholder="Нархи" data-add-price="'+i+'" value="'+esc(a.price||0)+'"></div>'+
          '<button type="button" class="btn btn-ghost btn-icon" data-add-remove="'+i+'">'+ICONS.x+'</button>'+
          '</div>';
      }).join("") || '<div class="field-hint">Қўшимча махсулот йўқ</div>';
    }
    function wireAdditiveRows(){
      m.querySelectorAll("[data-add-item]").forEach(function(inp){
        inp.addEventListener("change", function(){
          var i=Number(inp.getAttribute("data-add-item"));
          syncFromInputs();
          var it = resolveItemFromComboValue(inp.value);
          if(it){ fs.additives[i].itemId=it.id; fs.additives[i].name=it.name; fs.additives[i].price=Number(it.price)||0; }
          renderAll();
        });
      });
      m.querySelectorAll("[data-add-qty],[data-add-price]").forEach(function(inp){
        inp.addEventListener("change", function(){ syncFromInputs(); recomputeSummary(); });
      });
      m.querySelectorAll("[data-add-remove]").forEach(function(btn){
        btn.addEventListener("click", function(){ syncFromInputs(); fs.additives.splice(Number(btn.getAttribute("data-add-remove")),1); renderAll(); });
      });
    }
    function recomputeSummary(){
      var batchesForCost = fs.batches.map(function(b){ var r=lomBatchById(b.batchReceiptId); return {kgUsed:Number(b.kgUsed||0), batchPrice:r?Number(r.priceNoVat||0):0}; });
      var costFs = {batches:batchesForCost, additives:fs.additives, hourlyWage:fs.hourlyWage, workersCount:fs.workersCount, workHours:fs.workHours, hourlyElec:fs.hourlyElec, elecPrice:fs.elecPrice, hourlyGas:fs.hourlyGas, gasPrice:fs.gasPrice};
      var res = computeLomCalcCost(costFs);
      m.querySelector("#lc-summary").innerHTML = '<div class="card" style="padding:16px 18px;margin-top:10px;">'+
        resultLineHtml2("Лом қиймати", res.lomCost)+
        resultLineHtml2("Қўшимча махсулотлар", res.additivesCost)+
        resultLineHtml2("Иш ҳақи", res.wagesCost)+
        resultLineHtml2("Электр энергияси", res.elecCost)+
        resultLineHtml2("Газ", res.gasCost)+
        '<div style="border-top:1px solid var(--border-strong);margin-top:6px;padding-top:8px;display:flex;justify-content:space-between;"><span style="font-weight:800;">ТАННАРХ (жами)</span><span class="num" style="font-weight:800;font-size:15px;">'+fmtSum(res.totalCost)+'</span></div>'+
        '</div>';
    }
    function renderAll(){
      m.querySelector("#lc-additives").innerHTML = additiveRowsHtml();
      wireAdditiveRows();
      recomputeSummary();
    }

    function updateProductInfo(){
      var it = resolveItemFromComboValue(m.querySelector("#lc-product").value, isSemiFinishedItem);
      var infoEl = m.querySelector("#lc-product-info");
      if(infoEl) infoEl.textContent = it ? ("Тури: "+itemTypeLabel(it.itemType)+" · Категория: "+categoryName(it.categoryId)) : "";
    }
    m.querySelector("#lc-product").addEventListener("input", updateProductInfo);
    m.querySelector("#lc-product").addEventListener("change", updateProductInfo);
    updateProductInfo();
    m.querySelector("#lc-product-pick").addEventListener("click", function(){
      syncFromInputs();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = existing.id;
      closeModal();
      openItemPickerModal("Ярим тайёр маҳсулотни танлаш", STATE.items.filter(isSemiFinishedItem), function(item){
        if(item){ draft.productItemId=item.id; draft.productName=item.name; }
        openLomCalcForm(draft);
      }, function(){ openLomCalcForm(draft); });
    });
    m.querySelector("#lc-product-add").addEventListener("click", function(){
      syncFromInputs();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = existing.id;
      closeModal();
      openItemForm({name:"", itemType:"yarim_tayyor", unit:"кг", minQuantity:0, price:0, categoryId:"", location:""}, function(newItemId, newItemName){
        draft.productItemId = newItemId||""; draft.productName = newItemName||"";
        openLomCalcForm(draft);
      });
    });
    m.querySelector("#lc-date").addEventListener("change", syncFromInputs);
    m.querySelector("#lc-add-additive").addEventListener("click", function(){ syncFromInputs(); fs.additives.push({itemId:"",name:"",qty:0,price:0}); renderAll(); });
    ["lc-pots","lc-hours","lc-wage","lc-workers","lc-elecqty","lc-elecprice","lc-gasqty","lc-gasprice"].forEach(function(id){
      m.querySelector("#"+id).addEventListener("change", function(){ syncFromInputs(); recomputeSummary(); });
    });

    renderBatchChecklist();
    renderAll();

    m.querySelector("[data-save]").addEventListener("click", function(){
      syncFromInputs();
      if(!fs.batches.length){ toast("Камида битта партия танланг"); return; }
      var normBatches = [];
      for(var i=0;i<fs.batches.length;i++){
        var b = fs.batches[i];
        var r = lomBatchById(b.batchReceiptId);
        if(!r) continue;
        var avail = lomBatchAvailableKg(r, excludeCalcId);
        var kg = Number(b.kgUsed)||0;
        if(kg<=0) continue;
        if(kg>avail){ toast("«№"+esc(r.batchNumber||"—")+"» партиясида шунча лом йўқ — қолдиқ: "+fmtNum(avail)+" кг"); return; }
        normBatches.push({batchReceiptId:r.id, batchNumber:r.batchNumber||"", supplierName:r.supplierName||"", kgUsed:kg, batchPrice:Number(r.priceNoVat||0)});
      }
      if(!normBatches.length){ toast("Камида битта партиядан миқдор киритинг"); return; }
      if(!fs.productItemId){ toast("Ярим тайёр маҳсулотни рўйхатдан танланг ёки «+» орқали янги қўшинг"); return; }
      var costFs = {batches:normBatches.map(function(b){return {kgUsed:b.kgUsed, batchPrice:b.batchPrice};}), additives:fs.additives, hourlyWage:fs.hourlyWage, workersCount:fs.workersCount, workHours:fs.workHours, hourlyElec:fs.hourlyElec, elecPrice:fs.elecPrice, hourlyGas:fs.hourlyGas, gasPrice:fs.gasPrice};
      var res = computeLomCalcCost(costFs);
      var supplierNames = [];
      normBatches.forEach(function(b){ if(b.supplierName && supplierNames.indexOf(b.supplierName)===-1) supplierNames.push(b.supplierName); });
      var data = {
        date: fs.date, batches: normBatches,
        batchReceiptId: normBatches[0].batchReceiptId, batchNumber: normBatches.map(function(b){return b.batchNumber;}).join(", "),
        supplierName: supplierNames.length<=1 ? (supplierNames[0]||"") : ("Турли таъминотчилар ("+supplierNames.length+")"),
        kgUsed: res.kgUsedTotal, batchPrice: res.kgUsedTotal>0 ? (res.lomCost/res.kgUsedTotal) : 0,
        productItemId: fs.productItemId, productName: fs.productName,
        additives: fs.additives.filter(function(a){return a.itemId;}),
        potsCount: fs.potsCount, workHours: fs.workHours, hourlyWage: fs.hourlyWage, workersCount: fs.workersCount,
        hourlyElec: fs.hourlyElec, elecPrice: fs.elecPrice, hourlyGas: fs.hourlyGas, gasPrice: fs.gasPrice,
        lomCost: res.lomCost, additivesCost: res.additivesCost, wagesCost: res.wagesCost, elecCost: res.elecCost, gasCost: res.gasCost, totalCost: res.totalCost,
        cancelled:false, produced:false
      };
      if(isEdit){ dbUpdate("lomCalcs", existing.id, data, STATE.lomCalcs); toast("Сақланди"); }
      else { data.createdAt = new Date().toISOString(); dbAdd("lomCalcs", data, STATE.lomCalcs); toast("Калькуляция сақланди"); }
      closeModal();
    });
  }

