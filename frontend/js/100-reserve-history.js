  /* ================= Захира — кирим/чиқим тарихи (мавжуд ёзувлардан
     ҳисобланади, янги коллекция сақланмайди — эски маълумотлар учун ҳам
     ишлайди ва "киритилган маълумот ўзгармаслиги керак" талабига мос).
     "Кўчирилди" (омбордан-омборга кўчириш) фойдаланувчининг аниқ
     кўрсатмасига кўра Кирим/Чиқим жамига қўшилмайди, лекин маҳсулот
     тарихида (openItemLedgerModal) алоҳида кўрсатилади. */
  function stockLedgerAggregate(whFilter){
    var agg = {};
    function ensure(id){ if(!agg[id]) agg[id]={kirimQty:0,kirimSum:0,chikimQty:0,chikimSum:0}; return agg[id]; }
    function addKirim(id, wh, qty, price){
      qty = Number(qty)||0;
      if(!id || qty<=0) return;
      if(whFilter && wh!==whFilter) return;
      var a=ensure(id); a.kirimQty+=qty; a.kirimSum+=qty*(Number(price)||0);
    }
    function addChikim(id, wh, qty, price){
      qty = Number(qty)||0;
      if(!id || qty<=0) return;
      if(whFilter && wh!==whFilter) return;
      var a=ensure(id); a.chikimQty+=qty; a.chikimSum+=qty*(Number(price)||0);
    }
    /* Бекор қилинган ёзувлар ҳисобга олинмайди (2026-10-21 сўрови) —
       улар базада қолади, лекин қолдиқ/нарх ҳисобига таъсир қилмайди. */
    STATE.receipts.forEach(function(r){ if(r.cancelled) return; addKirim(r.itemId, r.warehouseId, r.quantity, r.priceNoVat); });
    STATE.writeoffs.forEach(function(w){ if(w.cancelled) return; var wit=itemById(w.itemId); addChikim(w.itemId, w.warehouseId, w.quantity, wit?wit.price:0); });
    STATE.inventories.forEach(function(v){
      if(v.cancelled) return;
      var d = Number(v.delta||0);
      if(d>0) addKirim(v.itemId, v.warehouseId, d, v.price);
      else if(d<0) addChikim(v.itemId, v.warehouseId, -d, v.price);
    });
    STATE.productions.forEach(function(p){
      if(p.cancelled) return;
      if(p.productItemId) addKirim(p.productItemId, p.warehouseId, p.quantity, p.costPerUnit);
      (p.items||[]).forEach(function(c){ addChikim(c.itemId, p.warehouseId, c.qty, c.price); });
      /* Чиқинди — нол қийматдаги кирим (2026-10-19). */
      (p.wastes||[]).forEach(function(w){ addKirim(w.itemId, w.warehouseId||p.warehouseId, w.qty, 0); });
    });
    STATE.sales.forEach(function(s){ if(s.cancelled) return; (s.items||[]).forEach(function(it2){ addChikim(it2.itemId, s.warehouseId, it2.qty, it2.price); }); });
    STATE.lomCalcs.forEach(function(c){
      if(!c.produced || c.cancelled) return;
      lomCalcBatches(c).forEach(function(b){
        var batch = lomBatchById(b.batchReceiptId);
        if(batch) addChikim(batch.itemId, batch.warehouseId, b.kgUsed, b.batchPrice);
      });
      (c.additives||[]).forEach(function(a){ if(a.itemId) addChikim(a.itemId, c.prodWarehouseId, a.qty, a.price); });
      var prodId = c.productItemId || "_lom_finished_alum";
      if(c.tayyorKg) addKirim(prodId, c.prodWarehouseId, c.tayyorKg, c.tayyorCostPerKg);
      if(c.metalKg && c.metalWarehouseId) addKirim("_lom_metal", c.metalWarehouseId, c.metalKg, c.batchPrice);
      if(c.kulKg && c.kulWarehouseId) addKirim("_lom_kul", c.kulWarehouseId, c.kulKg, 0);
    });
    STATE.lomReturns.forEach(function(x){
      if(x.cancelled) return;
      if(x.productType==="metal"){
        var mc = lomCalcById(x.lomCalcId);
        if(mc) addChikim("_lom_metal", mc.metalWarehouseId, x.kg, x.price);
        return;
      }
      var batch = lomBatchById(x.batchReceiptId);
      if(batch) addChikim(batch.itemId, batch.warehouseId, x.kg, x.price);
    });
    return agg;
  }
  /* Маҳсулотнинг қолдиғи учун "ўртача нархи" — renderWhStock'даги "Нархи"
     устунида ишлатиладиган ХУДДИ ШУ формула: шу омбордаги (ёки whFilter
     бўш бўлса — барча омборлардаги) барча кирим ёзувлари бўйича ўртача
     кирим нархи; агар ҳали кирим бўлмаган бўлса — маҳсулот карточкасидаги
     қўлда киритилган it.price'га тушади. Инвентаризацияда "янги нарх"
     майдонини автомат тўлдириш учун ишлатилади (қаранг: renderWhInventory). */
  function itemAveragePrice(itemId, whFilter){
    var lg = stockLedgerAggregate(whFilter||"")[itemId];
    if(lg && lg.kirimQty>0) return lg.kirimSum/lg.kirimQty;
    var it = itemById(itemId);
    return it ? (Number(it.price)||0) : 0;
  }
  function itemLedgerHistory(itemId){
    var events = [];
    STATE.receipts.forEach(function(r){
      if(r.cancelled || r.itemId!==itemId) return;
      events.push({date:r.date||(r.createdAt||"").slice(0,10), type:"kirim", qty:Number(r.quantity||0), price:Number(r.priceNoVat||0), warehouseId:r.warehouseId,
        label: r.isLom ? ("Лом кирим — №"+esc(r.batchNumber||"—")+(r.supplierName?(" · "+esc(r.supplierName)):"")) : ("Кирим"+(r.supplierName?(" — "+esc(r.supplierName)):""))});
    });
    STATE.transfers.forEach(function(t){
      if(t.cancelled || t.itemId!==itemId) return;
      var d = t.date||(t.createdAt||"").slice(0,10);
      events.push({date:d, type:"transfer_out", qty:Number(t.quantity||0), price:0, warehouseId:t.fromWarehouseId, label:"Кўчирилди → "+esc(warehouseName(t.toWarehouseId))});
      events.push({date:d, type:"transfer_in", qty:Number(t.quantity||0), price:0, warehouseId:t.toWarehouseId, label:"Кўчирилди ← "+esc(warehouseName(t.fromWarehouseId))});
    });
    STATE.writeoffs.forEach(function(w){
      if(w.cancelled || w.itemId!==itemId) return;
      events.push({date:w.actDate||(w.createdAt||"").slice(0,10), type:"chikim", qty:Number(w.quantity||0), price:0, warehouseId:w.warehouseId, label:"Ҳисобдан чиқариш — "+esc(w.reason||"—")});
    });
    STATE.inventories.forEach(function(v){
      if(v.cancelled || v.itemId!==itemId) return;
      var d = Number(v.delta||0);
      if(d===0) return;
      events.push({date:v.date||(v.createdAt||"").slice(0,10), type:d>0?"kirim":"chikim", qty:Math.abs(d), price:Number(v.price||0), warehouseId:v.warehouseId, label:"Инвентаризация"});
    });
    STATE.productions.forEach(function(p){
      if(p.cancelled) return;
      if(p.productItemId===itemId){
        events.push({date:(p.createdAt||"").slice(0,10), type:"kirim", qty:Number(p.quantity||0), price:Number(p.costPerUnit||0), warehouseId:p.warehouseId, label:"Ишлаб чиқарилди"});
      }
      (p.items||[]).forEach(function(c){
        if(c.itemId!==itemId) return;
        events.push({date:(p.createdAt||"").slice(0,10), type:"chikim", qty:Number(c.qty||0), price:Number(c.price||0), warehouseId:p.warehouseId, label:"Ишлаб чиқаришда сарфланди — "+esc(p.productName||"")});
      });
      (p.wastes||[]).forEach(function(w){
        if(w.itemId!==itemId) return;
        events.push({date:(p.createdAt||"").slice(0,10), type:"kirim", qty:Number(w.qty||0), price:0, warehouseId:w.warehouseId||p.warehouseId, label:"Чиқинди ("+fmtNum(w.pct||0)+"%) — "+esc(w.fromName||p.productName||"")});
      });
    });
    STATE.sales.forEach(function(s){
      if(s.cancelled) return;
      (s.items||[]).forEach(function(it2){
        if(it2.itemId!==itemId) return;
        events.push({date:(s.createdAt||"").slice(0,10), type:"chikim", qty:Number(it2.qty||0), price:Number(it2.price||0), warehouseId:s.warehouseId, label:"Сотилди — "+esc(s.customerName||"")});
      });
    });
    STATE.lomCalcs.forEach(function(c){
      if(!c.produced || c.cancelled) return;
      var d2 = c.prodDate||(c.createdAt||"").slice(0,10);
      lomCalcBatches(c).forEach(function(b){
        var batch = lomBatchById(b.batchReceiptId);
        if(batch && batch.itemId===itemId){
          events.push({date:d2, type:"chikim", qty:Number(b.kgUsed||0), price:Number(b.batchPrice||0), warehouseId:batch.warehouseId, label:"Лом ишлаб чиқаришда сарфланди — партия №"+esc(b.batchNumber||"—")});
        }
      });
      (c.additives||[]).forEach(function(a){
        if(a.itemId!==itemId) return;
        events.push({date:d2, type:"chikim", qty:Number(a.qty||0), price:Number(a.price||0), warehouseId:c.prodWarehouseId, label:"Лом — қўшимча махсулот сифатида сарфланди"});
      });
      var prodId = c.productItemId || "_lom_finished_alum";
      if(prodId===itemId && c.tayyorKg){
        events.push({date:d2, type:"kirim", qty:Number(c.tayyorKg||0), price:Number(c.tayyorCostPerKg||0), warehouseId:c.prodWarehouseId, label:"Лом ишлаб чиқарилди — "+esc(lomCalcBatchLabel(c))});
      }
      if(c.metalKg && c.metalWarehouseId && itemId==="_lom_metal"){
        events.push({date:d2, type:"kirim", qty:Number(c.metalKg||0), price:Number(c.batchPrice||0), warehouseId:c.metalWarehouseId, label:"Лом — металл чиқди"});
      }
      if(c.kulKg && c.kulWarehouseId && itemId==="_lom_kul"){
        events.push({date:d2, type:"kirim", qty:Number(c.kulKg||0), price:0, warehouseId:c.kulWarehouseId, label:"Лом — кул чиқди"});
      }
    });
    STATE.lomReturns.forEach(function(x){
      if(x.cancelled) return;
      if(x.productType==="metal"){
        if(itemId!=="_lom_metal") return;
        var mc = lomCalcById(x.lomCalcId);
        events.push({date:x.date||(x.createdAt||"").slice(0,10), type:"chikim", qty:Number(x.kg||0), price:Number(x.price||0), warehouseId: mc?mc.metalWarehouseId:"", label:"Металл возврат қилинди"+(mc?(" — "+esc(lomCalcBatchLabel(mc))):"")});
        return;
      }
      var batch = lomBatchById(x.batchReceiptId);
      if(batch && batch.itemId===itemId){
        events.push({date:x.date||(x.createdAt||"").slice(0,10), type:"chikim", qty:Number(x.kg||0), price:Number(x.price||0), warehouseId:batch.warehouseId, label:"Таъминотчига қайтарилди — "+esc(x.supplierName||"")});
      }
    });
    events.sort(function(a,b){ return (b.date||"").localeCompare(a.date||""); });
    return events;
  }
  function openItemLedgerModal(item){
    if(!item) return;
    var events = itemLedgerHistory(item.id);
    var rows = events.map(function(ev){
      var typeChip = ev.type==="kirim" ? '<span class="chip chip-good">Кирим</span>' : (ev.type==="chikim" ? '<span class="chip chip-critical">Чиқим</span>' : '<span class="chip chip-neutral">Кўчирилди</span>');
      return '<tr>'+
        '<td class="cell-muted">'+fmtDateShort(ev.date)+'</td>'+
        '<td>'+typeChip+'</td>'+
        '<td class="cell-muted">'+esc(warehouseName(ev.warehouseId))+'</td>'+
        '<td class="num">'+fmtNum(ev.qty)+' '+esc(item.unit||"")+'</td>'+
        '<td class="num cell-muted">'+(ev.price?fmtSum(ev.price):"—")+'</td>'+
        '<td class="cell-muted">'+(ev.label||"")+'</td>'+
      '</tr>';
    }).join("");
    var body = '<div class="field-hint" style="margin-bottom:10px;">«'+esc(item.name)+'» — жами қолдиқ: <strong>'+fmtNum(totalStockQty(item.id))+' '+esc(item.unit||"")+'</strong> (барча омборлар бўйича)</div>'+
      (events.length ? '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Тури</th><th>Омбор</th><th>Миқдор</th><th>Нархи</th><th>Изоҳ</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
        : emptyState("Ҳали тарих йўқ","Бу маҳсулот бўйича ҳали кирим/чиқим ёзуви йўқ."));
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button>';
    var m = openModal("Тарих — "+esc(item.name), body, foot, true);
    m.querySelector(".modal").classList.add("xwide");
    m.querySelector("[data-close]").addEventListener("click", closeModal);
  }

