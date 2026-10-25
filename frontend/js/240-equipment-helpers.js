  /* ================= Ускуна ва жиҳозлар: умумий ёрдамчи функциялар =================
     Асосий ускуналар ва Ёрдамчи жиҳозлар — Лом (Алюмин) партия модели билан
     бир хил услубда: ҳар бир Кирим ёзуви алоҳида "партия" (STATE.equipmentReceipts,
     kind:"main"|"aux"). Улар STATE.items/STATE.stock орқали ЎТМАЙДИ — акс
     ҳолда Захира жадвали, инвентаризация ва бошқа кўп жойлар бузилиб қолар
     эди. Ёрдамчи жиҳозлар ходимларга топшириш/қайтариш эса алоҳида
     STATE.equipmentAssignments журналида юритилади. */
  function equipmentReceiptById(id){ return STATE.equipmentReceipts.find(function(x){return x.id===id;}); }
  function mainEquipmentReceipts(){ return STATE.equipmentReceipts.filter(function(x){return x.kind==="main";}); }
  function auxEquipmentReceipts(){ return STATE.equipmentReceipts.filter(function(x){return x.kind==="aux";}); }
  function auxEquipHandedOutQty(receiptId){
    var out = 0;
    STATE.equipmentAssignments.forEach(function(a){
      if(a.cancelled || a.equipmentReceiptId!==receiptId) return;
      out += (a.direction==="qaytarish") ? -Number(a.qty||0) : Number(a.qty||0);
    });
    return out;
  }
  function auxEquipAvailableQty(r){ return Math.max(0, Number(r.quantity||0) - auxEquipHandedOutQty(r.id)); }
  /* Танланган ходимда ҳозир қўлида турган ёрдамчи жиҳозлар — ҳар бир партия
     бўйича топшириш−қайтариш қолдиғи мусбат бўлганлари. */
  function employeeAssignedEquipment(employeeId){
    var map = {};
    STATE.equipmentAssignments.forEach(function(a){
      if(a.cancelled || a.employeeId!==employeeId) return;
      var d = a.direction==="qaytarish" ? -Number(a.qty||0) : Number(a.qty||0);
      map[a.equipmentReceiptId] = (map[a.equipmentReceiptId]||0) + d;
    });
    return Object.keys(map).filter(function(rid){ return map[rid]>0.0000001; }).map(function(rid){
      return {receiptId:rid, receipt:equipmentReceiptById(rid), qty:map[rid]};
    }).filter(function(x){ return x.receipt; });
  }
  function categoryChipsHtml(prefix, ids){
    if(!ids || !ids.length) return '<div class="field-hint">Ҳали танланмаган</div>';
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">'+ids.map(function(id){
      var c = categoryById(id);
      return '<span class="chip chip-neutral" data-'+prefix+'-catchip="'+esc(id)+'" style="cursor:pointer;font-size:11.5px;" title="Ўчириш учун босинг">'+esc(c?c.name:"?")+' '+ICONS.x+'</span>';
    }).join("")+'</div>';
  }
  /* Категорияни кўп танловли "chip" майдони: openMultiCheckPickerModal орқали
     бирданига бир нечта категория қўшилади, ҳар бир chip ўзининг устига
     босиб алоҳида ўчирилади. Танланганлар STATE.receiptCategoryIds'да
     сақланади — токи "+" орқали янги цех/ташкилот қўшилганда содир бўладиган
     тўлиқ рендердан кейин ҳам йўқолиб қолмасин. */
  function categoryChipsFieldHtml(prefix){
    return '<div class="field"><label>Категория <span class="opt">(ихтиёрий, бир нечта танлаш мумкин)</span></label>'+
      '<div id="'+prefix+'-cat-chips">'+categoryChipsHtml(prefix, STATE.receiptCategoryIds)+'</div>'+
      '<button type="button" class="btn btn-secondary btn-sm" id="'+prefix+'-cat-add">'+ICONS.plus+'Категория қўшиш</button></div>';
  }
  function wireCategoryChipsField(prefix){
    var chipsBox = document.getElementById(prefix+"-cat-chips");
    if(!chipsBox) return;
    var wireChips = function(){
      chipsBox.querySelectorAll("[data-"+prefix+"-catchip]").forEach(function(c){
        c.addEventListener("click", function(){
          var id = c.getAttribute("data-"+prefix+"-catchip");
          STATE.receiptCategoryIds = STATE.receiptCategoryIds.filter(function(x){return x!==id;});
          chipsBox.innerHTML = categoryChipsHtml(prefix, STATE.receiptCategoryIds);
          wireChips();
        });
      });
    };
    wireChips();
    var addBtn = document.getElementById(prefix+"-cat-add");
    if(addBtn) addBtn.addEventListener("click", function(){
      openMultiCheckPickerModal("Категорияларни танлаш", STATE.categories.slice().sort(function(a,b){return (a.name||"").localeCompare(b.name||"");}), STATE.receiptCategoryIds, function(picked){
        STATE.receiptCategoryIds = picked;
        chipsBox.innerHTML = categoryChipsHtml(prefix, STATE.receiptCategoryIds);
        wireChips();
      });
    });
  }

  var RECEIPT_KIND_TABS = [["product","Маҳсулот"],["main","Асосий ускуналар"],["aux","Ёрдамчи жиҳозлар"]];
  function receiptCalcFieldsHtml(){
    return '<div class="field-hint" style="margin:-2px 0 6px;">Сон, нарх, ККС ва сумма — фактура қаторидек:</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:10px;margin-bottom:14px;">'+
        '<div class="field" style="margin-bottom:0;"><label>Миқдори</label><input id="r-qty" type="number" min="0" step="any" value="0"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>Нархи (ККСсиз)</label><input id="r-price" type="number" min="0" step="any" value="0"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>ККС (%)</label><input id="r-vat" type="number" min="0" step="any" value="'+VAT_RATE_DEFAULT+'"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>Нархи (ККС билан)</label><input id="r-price-vat" type="text" value="0 сўм" disabled style="font-weight:700;"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>Сумма (жами)</label><input id="r-line-sum" type="text" value="0 сўм" disabled style="font-weight:800;color:var(--accent);"></div>'+
      '</div>'+
      /* 2026-10-15 сўровига кўра: «Тўланган сумма» майдони олиб ташланди
         (тўлов Касса бўлимидан қилинади), «Сана» эса шаклнинг тепасига
         кўчирилди. Эски код билан мослик учун r-paid яширин ҳолда,
         0 қиймати билан қолдирилди. */
      '<input id="r-paid" type="hidden" value="0">'+
      '<div class="field" id="r-cash-row" style="display:none;"><label>Тўлов қайси кассадан?</label><select id="r-cashaccount"><option value="">— танланмаган —</option>'+STATE.cashAccounts.map(function(a){return '<option value="'+a.id+'">'+esc(a.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Қарз тўлаш муддати <span class="opt">(ихтиёрий)</span></label><input id="r-duedate" type="date" value=""></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="r-note" placeholder="Ҳужжат рақами ва бошқа маълумот…"></textarea></div>'+
      '<div class="card" style="padding:14px 16px;background:var(--surface-2);margin-bottom:16px;">'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Жами (ККСсиз)</span><span class="num" id="r-sum-novat">0 сўм</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>ККС суммаси</span><span class="num" id="r-sum-vat">0 сўм</span></div>'+
        '<div style="border-top:1px solid var(--border-strong);padding-top:8px;display:flex;justify-content:space-between;"><span style="font-weight:800;">ЖАМИ (ККС билан)</span><span class="num" id="r-sum-total" style="font-size:17px;font-weight:700;">0 сўм</span></div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span style="font-weight:700;color:var(--critical);">Ташкилотга қарзимиз</span><span class="num" id="r-sum-payable" style="font-size:16px;font-weight:800;color:var(--critical);">0 сўм</span></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" id="r-submit">Кирим қилиш</button></div>';
  }
  function wireReceiptCalcFields(){
    var cashRow = document.getElementById("r-cash-row");
    var recompute = function(){
      var qty=Number(document.getElementById("r-qty").value)||0, price=Number(document.getElementById("r-price").value)||0, vat=Number(document.getElementById("r-vat").value)||0;
      var paid=Number(document.getElementById("r-paid").value)||0;
      var priceWithVat = price + price*vat/100;
      var totalNoVat=qty*price, vatSum=totalNoVat*vat/100, total=totalNoVat+vatSum;
      if(paid>total) paid=total;
      var payable = Math.max(0, total-paid);
      document.getElementById("r-price-vat").value = fmtSum(priceWithVat);
      document.getElementById("r-line-sum").value = fmtSum(total);
      document.getElementById("r-sum-novat").textContent=fmtSum(totalNoVat);
      document.getElementById("r-sum-vat").textContent=fmtSum(vatSum);
      document.getElementById("r-sum-total").textContent=fmtSum(total);
      document.getElementById("r-sum-payable").textContent=fmtSum(payable);
      cashRow.style.display = paid>0 ? "" : "none";
    };
    ["r-qty","r-price","r-vat","r-paid"].forEach(function(id){ document.getElementById(id).addEventListener("input", recompute); });
    recompute();
  }
  function readReceiptCalcFields(){
    var qty=Number(document.getElementById("r-qty").value)||0, price=Number(document.getElementById("r-price").value)||0, vat=Number(document.getElementById("r-vat").value)||0;
    var paid=Number(document.getElementById("r-paid").value)||0;
    var cashAccountId = document.getElementById("r-cashaccount").value;
    var dueDate = document.getElementById("r-duedate").value||"";
    var date = document.getElementById("r-date").value||todayISO(), note = document.getElementById("r-note").value.trim();
    var vatSum=qty*price*vat/100, totalNoVat=qty*price, totalWithVat=totalNoVat+vatSum;
    if(paid>totalWithVat) paid=totalWithVat;
    var payableAmount = Math.max(0, totalWithVat-paid);
    return {qty:qty, price:price, vat:vat, paid:paid, cashAccountId:cashAccountId, dueDate:dueDate, date:date, note:note, vatSum:vatSum, totalNoVat:totalNoVat, totalWithVat:totalWithVat, payableAmount:payableAmount};
  }
  /* Таъминотчини номи бўйича топади, топилмаса — авто яратиб, шу номдаги
     таъминотчининг id'сини callback'га беради (маҳсулот, асосий ускуна ва
     ёрдамчи жиҳоз киримларида бир хил ишлатилади). */
  function resolveOrCreateSupplierThen(supplierNameVal, cb){
    if(!supplierNameVal){ cb("", ""); return; }
    var existingSupplier = resolveSupplierByName(supplierNameVal);
    if(existingSupplier){ cb(existingSupplier.id, existingSupplier.name); return; }
    if(STATE.db){
      var supTempId = "_pending_"+uid();
      var supData = {name:supplierNameVal, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:"", createdAt:new Date().toISOString()};
      var supOptimistic = Object.assign({}, supData); supOptimistic.id=supTempId; supOptimistic._pending=true;
      STATE.suppliers.unshift(supOptimistic);
      STATE.db.collection("suppliers").add(supData).then(function(ref){
        supOptimistic._pending=false;
        reconcilePendingId(supTempId, ref.id);
        cb(ref.id, supplierNameVal);
      }).catch(function(e){
        var idx=STATE.suppliers.indexOf(supOptimistic); if(idx>-1) STATE.suppliers.splice(idx,1);
        console.error(e); cb("", supplierNameVal); render();
      });
    } else {
      var newSup = {id:uid(), name:supplierNameVal, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:""};
      STATE.suppliers.unshift(newSup);
      cb(newSup.id, newSup.name);
    }
  }

  /* ===== Кирим (маҳсулот) — кўп қаторли, омбор буюртмасига боғланадиган
     шакл (2026-10-19 сўрови). Ташкилот номи фақат рўйхатдан танланади,
     «Омбор буюртмаси» танланса қаторлар буюртмадаги маҳсулот номлари
     билан автомат тўлдирилади; сони ва нархи факт келган товар бўйича
     қўлда киритилади. Ҳар бир қатор учун алоҳида "receipts" ёзуви
     яратилади — яъни эски ҳисоб-китоблар шакли ўзгармайди. ===== */
  function freshWhReceiptRow(){ return {itemId:"", itemName:"", unit:"", orderQty:0, orderLineIdx:-1, qty:"", price:"", vat:VAT_RATE_DEFAULT}; }
  function freshWhReceiptDraft(){
    return {supplierId:"", supplierName:"", wh2OrderId:"", warehouseId:"", date:todayISO(), dueDate:"", note:"", rows:[freshWhReceiptRow()]};
  }
  function whrDraft(){
    if(!STATE.whReceiptDraft) STATE.whReceiptDraft = freshWhReceiptDraft();
    return STATE.whReceiptDraft;
  }
  function whrTotals(){
    var d = whrDraft(), noVat=0, vat=0;
    d.rows.forEach(function(r){
      var ln = (Number(r.qty)||0)*(Number(r.price)||0);
      noVat += ln; vat += ln*(Number(r.vat)||0)/100;
    });
    return {noVat:noVat, vat:vat, total:noVat+vat};
  }
  function productReceiptBlockHtml(){
    var d = whrDraft();
    if(!d.warehouseId && STATE.warehouses.length) d.warehouseId = STATE.warehouses[0].id;
    var ord = d.wh2OrderId ? wh2OrderById(d.wh2OrderId) : null;
    var rowsHtml = d.rows.map(function(r,i){
      var lnNoVat = (Number(r.qty)||0)*(Number(r.price)||0);
      var lnTotal = lnNoVat + lnNoVat*(Number(r.vat)||0)/100;
      return '<tr>'+
        '<td class="cell-muted">'+(i+1)+'</td>'+
        '<td><div style="display:flex;gap:4px;align-items:center;">'+
          '<button type="button" class="btn btn-secondary btn-sm" data-wr-item="'+i+'" style="flex:1;min-width:150px;justify-content:flex-start;font-weight:600;">'+(r.itemName?esc(r.itemName):'<span class="cell-muted">— Маҳсулотни танланг —</span>')+'</button>'+
          '<button type="button" class="btn btn-secondary btn-icon" data-wr-newitem="'+i+'" title="Рўйхатда йўқ бўлса, янги маҳсулот/хомашё қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></td>'+
        '<td class="num cell-muted" style="white-space:nowrap;">'+(r.orderQty>0?(fmtNum(r.orderQty)+' '+esc(r.unit||"")):'—')+'</td>'+
        '<td><input type="number" min="0" step="any" data-wr-qty="'+i+'" value="'+esc(r.qty)+'" style="width:84px;"></td>'+
        '<td><input type="number" min="0" step="any" data-wr-price="'+i+'" value="'+esc(r.price)+'" style="width:104px;"></td>'+
        '<td><input type="number" min="0" step="any" data-wr-vat="'+i+'" value="'+esc(r.vat)+'" style="width:66px;"></td>'+
        '<td class="num cell-strong" style="white-space:nowrap;">'+fmtSum(lnTotal)+'</td>'+
        '<td><button type="button" class="btn btn-ghost btn-icon" data-wr-del="'+i+'" title="Қаторни ўчириш">'+ICONS.trash+'</button></td>'+
        '</tr>';
    }).join("");
    var t = whrTotals();
    return '<div class="field-row"><div class="field"><label>Омбор</label><select id="r-wh">'+
        STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(d.warehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Омбор буюртмаси <span class="opt">(ихтиёрий)</span></label>'+
        '<button type="button" class="btn btn-secondary" id="r-wh2order" style="width:100%;justify-content:flex-start;font-weight:600;">'+
          (ord?esc(ord.orderNumber):'<span class="cell-muted">— Буюртмани танланг —</span>')+'</button>'+
        '<div class="field-hint">'+(ord
          ? ('«'+esc(ord.orderNumber)+'» буюртмаси бўйича. Тўлиқ келмаган маҳсулотлар кейин яна шу буюртмадан танланади.'+
             '<button type="button" class="btn btn-ghost btn-sm" id="r-wh2clear" style="margin-left:6px;">Боғланишни олиб ташлаш</button>')
          : 'Танланса, пастдаги маҳсулот номлари буюртмадан автомат тўлдирилади.')+'</div></div></div>'+
      '<div class="section-head" style="margin-top:4px;"><h2 style="font-size:13.5px;">Келган маҳсулотлар</h2>'+
        '<button type="button" class="btn btn-secondary btn-sm" id="r-addrow">'+ICONS.plus+'Қатор қўшиш</button></div>'+
      '<div class="table-wrap" style="margin-bottom:12px;"><table><thead><tr><th>№</th><th>Маҳсулот</th><th class="num">Буюртмада</th><th>Миқдори</th><th>Нархи (ККСсиз)</th><th>ККС %</th><th class="num">Сумма</th><th></th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>'+
      '<input id="r-paid" type="hidden" value="0">'+
      '<div class="field"><label>Қарз тўлаш муддати <span class="opt">(ихтиёрий)</span></label><input id="r-duedate" type="date" value="'+esc(d.dueDate||"")+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="r-note" placeholder="Ҳужжат рақами ва бошқа маълумот…">'+esc(d.note||"")+'</textarea></div>'+
      '<div class="card" style="padding:14px 16px;background:var(--surface-2);margin-bottom:16px;">'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Жами (ККСсиз)</span><span class="num" id="r-sum-novat">'+fmtSum(t.noVat)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>ККС суммаси</span><span class="num" id="r-sum-vat">'+fmtSum(t.vat)+'</span></div>'+
        '<div style="border-top:1px solid var(--border-strong);padding-top:8px;display:flex;justify-content:space-between;"><span style="font-weight:800;">ЖАМИ (ККС билан)</span><span class="num" id="r-sum-total" style="font-size:17px;font-weight:700;">'+fmtSum(t.total)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span style="font-weight:700;color:var(--critical);">Ташкилотга қарзимиз</span><span class="num" id="r-sum-payable" style="font-size:16px;font-weight:800;color:var(--critical);">'+fmtSum(t.total)+'</span></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" id="r-submit">Кирим қилиш</button></div>';
  }
  function productTypeFieldsHtml(){
    return '<div class="field-row"><div class="field"><label>Омбор</label><select id="r-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'">'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Маҳсулот/хомашё</label><div style="display:flex;gap:6px;">'+itemComboInputHtml("r-item", "r-item-datalist", null, null, "flex:1;min-width:0;")+'<button type="button" class="btn btn-secondary btn-icon" id="r-item-add" title="Рўйхатда йўқ бўлса, янги маҳсулот/хомашё қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div><div class="field-hint" id="r-item-location"></div></div></div>';
  }
  function mainEquipTypeFieldsHtml(){
    return '<div class="field"><label>Ускуна номи</label><div style="display:flex;gap:6px;"><select id="rm-equip" style="flex:1;min-width:0;">'+equipmentOptionsHtml("", "main")+'</select><button type="button" class="btn btn-secondary btn-icon" id="rm-equip-add" title="Рўйхатда йўқ бўлса, янги ускуна ва жиҳоз қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div>'+
      (STATE.equipment.length?'':'<div class="field-hint">Ҳали ускуна ва жиҳоз киритилмаган — «+» тугмаси орқали қўшинг.</div>')+'</div>'+
      '<div class="field-row"><div class="field"><label>Цех</label><div style="display:flex;gap:6px;"><select id="rm-workshop" style="flex:1;min-width:0;"><option value="">— танланг —</option>'+STATE.workshops.map(function(w){return '<option value="'+w.id+'">'+esc(w.name)+'</option>';}).join("")+'</select><button type="button" class="btn btn-secondary btn-icon" id="rm-workshop-add" title="Янги цех қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
      '<div class="field"><label>Жавобгар шахс</label><div style="display:flex;gap:6px;">'+personComboInputHtml("rm-resp", "rm-resp-list", null, null, "flex:1;min-width:0;")+'<button type="button" class="btn btn-secondary btn-icon" id="rm-resp-add" title="Рўйхатда йўқ бўлса, янги ходим қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div></div>'+
      categoryChipsFieldHtml("rm");
  }
  function auxEquipTypeFieldsHtml(){
    return '<div class="field"><label>Жиҳоз номи</label><div style="display:flex;gap:6px;"><select id="ra-equip" style="flex:1;min-width:0;">'+equipmentOptionsHtml("", "aux")+'</select><button type="button" class="btn btn-secondary btn-icon" id="ra-equip-add" title="Рўйхатда йўқ бўлса, янги ускуна ва жиҳоз қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div>'+
      (STATE.equipment.length?'':'<div class="field-hint">Ҳали ускуна ва жиҳоз киритилмаган — «+» тугмаси орқали қўшинг.</div>')+'</div>'+
      '<div class="field-row"><div class="field"><label>Омбор</label><select id="ra-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'">'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Омбордаги ўрни <span class="opt">(ихтиёрий)</span></label><input id="ra-location" placeholder="Масалан: 2-стеллаж"></div></div>'+
      categoryChipsFieldHtml("ra");
  }

  /* ===== Омборлар → Кирим (2026-10-21 сўрови: «Наряд» каби кўриниш) =====
     Тепада «Яратиш» тугмаси — кирим шакли АЛОҲИДА ОЙНАДА очилади;
     саҳифанинг ўзида турлар бўйича филтр (Барчаси / Маҳсулот / Асосий
     ускуна / Ёрдамчи жиҳоз) ва бажарилган операциялар жадвали туради.
     Шаклнинг ўзи ва барча амаллари ўзгармади — фақат ойна ичига
     кўчирилди. */
  function renderWhReceipts(){
    var root = document.getElementById("content");
    if(!STATE.warehouses.length){
      setTopbar("Омборлар — Кирим", "0 та кирим ёзуви", "");
      root.innerHTML = whSubnav("receipts") + emptyState("Аввал омбор яратинг","Кирим қилиш учун «Бошқарув» бўлимида омбор яратинг.");
      wireWhSubnav(root);
      return;
    }
    setTopbar("Омборлар — Кирим", STATE.receipts.length+" та кирим ёзуви",
      '<button class="btn btn-primary" id="whAddReceiptBtn">'+ICONS.plus+'Яратиш</button>');
    root.innerHTML = whSubnav("receipts") + '<div id="whReceiptsList"></div>';
    wireWhSubnav(root);
    renderReceiptsSide(document.getElementById("whReceiptsList"));
    var addBtn = document.getElementById("whAddReceiptBtn");
    if(addBtn) addBtn.addEventListener("click", function(){ openWhReceiptModal(); });
  }
  function openWhReceiptModal(){
    if(!STATE.warehouses.length){ toast("Аввал омбор яратинг"); return; }
    var kind = STATE.receiptKind||"product";
    var supplierOptions = STATE.suppliers.map(function(s){ return '<option value="'+esc(s.name)+'">'; }).join("");
    var mbody = '<div class="filter-row" style="margin-bottom:14px;">'+RECEIPT_KIND_TABS.map(function(t){return '<button class="pill-filter'+(kind===t[0]?" active":"")+'" data-rkind="'+t[0]+'">'+t[1]+'</button>';}).join("")+'</div>'+
      '<div class="field"><label>Кирим санаси</label><input id="r-date" type="date" value="'+esc(kind==="product"?(whrDraft().date||todayISO()):todayISO())+'"></div>'+
      /* 2026-10-19 сўрови: «Ташкилот номи» қўлда ёзилмайди — фақат
         рўйхатдан (қидирув билан) танланади ёки «+» орқали янгиси
         яратилади. Эски код билан мослик учун қиймат яширин
         #r-supplier майдонида сақланади. */
      '<div class="field-row"><div class="field"><label>Ташкилот (таъминотчи)</label><div style="display:flex;gap:6px;">'+
        '<button type="button" class="btn btn-secondary" id="r-supplier-pick" style="flex:1;min-width:0;justify-content:flex-start;font-weight:600;">'+
          (whrDraft().supplierName?esc(whrDraft().supplierName):'<span class="cell-muted">— Ташкилотни танланг —</span>')+'</button>'+
        '<button type="button" class="btn btn-secondary btn-icon" id="r-supplier-add" title="Тўлиқ реквизитлари билан янги ташкилот қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div>'+
        '<input type="hidden" id="r-supplier" value="'+esc(whrDraft().supplierName||"")+'">'+
        '<div class="field-hint">Рўйхатдан танланг (устига босинг — қидирув билан ойна очилади) ёки «+» орқали янги ташкилот яратинг.</div></div></div>'+
      '<div id="r-typefields">'+(kind==="product"?"":kind==="main"?mainEquipTypeFieldsHtml():auxEquipTypeFieldsHtml())+'</div>'+
      (kind==="product" ? productReceiptBlockHtml() : receiptCalcFieldsHtml());
    var m = openModal("Янги кирим", mbody, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', true);
    m.querySelector(".modal").classList.add("xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var root = m;
    /* Тур таблари — ойна ичида алмашади. */
    m.querySelectorAll("[data-rkind]").forEach(function(b){ b.addEventListener("click", function(){
      STATE.receiptKind = b.getAttribute("data-rkind");
      STATE.receiptCategoryIds = [];
      closeModal();
      openWhReceiptModal();
    }); });
    if(kind!=="product") wireReceiptCalcFields();

    /* Ташкилотни танлаш — барча турлар учун умумий. */
    var supPickBtn2 = document.getElementById("r-supplier-pick");
    if(supPickBtn2) supPickBtn2.addEventListener("click", function(){
      /* Танлов ойнаси кирим ойнасини ёпади — танлангач (ёки бекор
         қилингач) кирим ойнаси қайта очилади (2026-10-21). */
      openNameListPickerModal("Ташкилотни танлаш", STATE.suppliers, function(name){
        var sup = resolveSupplierByName(name);
        whrDraft().supplierId = sup?sup.id:"";
        whrDraft().supplierName = name||"";
        openWhReceiptModal();
      }, function(){ openWhReceiptModal(); });
    });

    if(kind==="main"){
      wireCategoryChipsField("rm");
      var wsAddBtn = document.getElementById("rm-workshop-add");
      if(wsAddBtn) wsAddBtn.addEventListener("click", function(){
        var snap = { equip: document.getElementById("rm-equip").value, resp: document.getElementById("rm-resp").value, supplier: document.getElementById("r-supplier").value,
          qty: document.getElementById("r-qty").value, price: document.getElementById("r-price").value, vat: document.getElementById("r-vat").value, paid: document.getElementById("r-paid").value,
          date: document.getElementById("r-date").value, duedate: document.getElementById("r-duedate").value, note: document.getElementById("r-note").value };
        openWorkshopForm(null, function(workshopId){
          openWhReceiptModal();
          var byId=function(id){return document.getElementById(id);};
          if(byId("r-supplier")) byId("r-supplier").value = snap.supplier;
          if(byId("rm-equip")) byId("rm-equip").value = snap.equip;
          if(byId("rm-workshop")) byId("rm-workshop").value = workshopId||"";
          if(byId("rm-resp")) byId("rm-resp").value = snap.resp;
          if(byId("r-qty")) byId("r-qty").value = snap.qty;
          if(byId("r-price")) byId("r-price").value = snap.price;
          if(byId("r-vat")) byId("r-vat").value = snap.vat;
          if(byId("r-paid")) byId("r-paid").value = snap.paid;
          if(byId("r-date")) byId("r-date").value = snap.date;
          if(byId("r-duedate")) byId("r-duedate").value = snap.duedate;
          if(byId("r-note")) byId("r-note").value = snap.note;
          if(byId("r-qty")) byId("r-qty").dispatchEvent(new Event("input"));
        });
      });
      var rmEquipAddBtn = document.getElementById("rm-equip-add");
      if(rmEquipAddBtn) rmEquipAddBtn.addEventListener("click", function(){
        var snap = { resp: document.getElementById("rm-resp").value, workshop: document.getElementById("rm-workshop").value, supplier: document.getElementById("r-supplier").value,
          qty: document.getElementById("r-qty").value, price: document.getElementById("r-price").value, vat: document.getElementById("r-vat").value, paid: document.getElementById("r-paid").value,
          date: document.getElementById("r-date").value, duedate: document.getElementById("r-duedate").value, note: document.getElementById("r-note").value };
        openEquipmentForm(null, function(newEqId){
          openWhReceiptModal();
          var byId=function(id){return document.getElementById(id);};
          if(byId("r-supplier")) byId("r-supplier").value = snap.supplier;
          if(byId("rm-equip")) byId("rm-equip").value = newEqId||"";
          if(byId("rm-workshop")) byId("rm-workshop").value = snap.workshop;
          if(byId("rm-resp")) byId("rm-resp").value = snap.resp;
          if(byId("r-qty")) byId("r-qty").value = snap.qty;
          if(byId("r-price")) byId("r-price").value = snap.price;
          if(byId("r-vat")) byId("r-vat").value = snap.vat;
          if(byId("r-paid")) byId("r-paid").value = snap.paid;
          if(byId("r-date")) byId("r-date").value = snap.date;
          if(byId("r-duedate")) byId("r-duedate").value = snap.duedate;
          if(byId("r-note")) byId("r-note").value = snap.note;
          if(byId("r-qty")) byId("r-qty").dispatchEvent(new Event("input"));
        }, "main");
      });
      var rmRespAddBtn = document.getElementById("rm-resp-add");
      if(rmRespAddBtn) rmRespAddBtn.addEventListener("click", function(){
        var snap = { equip: document.getElementById("rm-equip").value, workshop: document.getElementById("rm-workshop").value, supplier: document.getElementById("r-supplier").value,
          qty: document.getElementById("r-qty").value, price: document.getElementById("r-price").value, vat: document.getElementById("r-vat").value, paid: document.getElementById("r-paid").value,
          date: document.getElementById("r-date").value, duedate: document.getElementById("r-duedate").value, note: document.getElementById("r-note").value };
        openEmployeeForm(null, function(newEmpId){
          openWhReceiptModal();
          var byId=function(id){return document.getElementById(id);};
          if(byId("r-supplier")) byId("r-supplier").value = snap.supplier;
          if(byId("rm-equip")) byId("rm-equip").value = snap.equip;
          if(byId("rm-workshop")) byId("rm-workshop").value = snap.workshop;
          setPersonComboInputValue("rm-resp", newEmpId);
          if(byId("r-qty")) byId("r-qty").value = snap.qty;
          if(byId("r-price")) byId("r-price").value = snap.price;
          if(byId("r-vat")) byId("r-vat").value = snap.vat;
          if(byId("r-paid")) byId("r-paid").value = snap.paid;
          if(byId("r-date")) byId("r-date").value = snap.date;
          if(byId("r-duedate")) byId("r-duedate").value = snap.duedate;
          if(byId("r-note")) byId("r-note").value = snap.note;
          if(byId("r-qty")) byId("r-qty").dispatchEvent(new Event("input"));
        });
      });
    } else if(kind==="aux"){
      wireCategoryChipsField("ra");
      var raEquipAddBtn = document.getElementById("ra-equip-add");
      if(raEquipAddBtn) raEquipAddBtn.addEventListener("click", function(){
        var snap = { wh: document.getElementById("ra-wh").value, location: document.getElementById("ra-location").value, supplier: document.getElementById("r-supplier").value,
          qty: document.getElementById("r-qty").value, price: document.getElementById("r-price").value, vat: document.getElementById("r-vat").value, paid: document.getElementById("r-paid").value,
          date: document.getElementById("r-date").value, duedate: document.getElementById("r-duedate").value, note: document.getElementById("r-note").value };
        openEquipmentForm(null, function(newEqId){
          openWhReceiptModal();
          var byId=function(id){return document.getElementById(id);};
          if(byId("r-supplier")) byId("r-supplier").value = snap.supplier;
          if(byId("ra-equip")) byId("ra-equip").value = newEqId||"";
          if(byId("ra-wh")) byId("ra-wh").value = snap.wh;
          if(byId("ra-location")) byId("ra-location").value = snap.location;
          if(byId("r-qty")) byId("r-qty").value = snap.qty;
          if(byId("r-price")) byId("r-price").value = snap.price;
          if(byId("r-vat")) byId("r-vat").value = snap.vat;
          if(byId("r-paid")) byId("r-paid").value = snap.paid;
          if(byId("r-date")) byId("r-date").value = snap.date;
          if(byId("r-duedate")) byId("r-duedate").value = snap.duedate;
          if(byId("r-note")) byId("r-note").value = snap.note;
          if(byId("r-qty")) byId("r-qty").dispatchEvent(new Event("input"));
        }, "aux");
      });
    }

    var supAddBtn = document.getElementById("r-supplier-add");
    if(supAddBtn) supAddBtn.addEventListener("click", function(){
      /* opening the supplier modal triggers a full re-render behind it once
         saved (the shared db-helpers always refresh the page), and this form
         has no persistent draft object, so snapshot every field here and
         restore it after — otherwise everything the user already typed into
         this receipt would be wiped by that re-render. Танланган
         категориялар эса STATE.receiptCategoryIds'да сақланиб, ўзи
         тикланади (юқорига қаранг). */
      if(kind==="product"){
        /* Маҳсулот кирими энди STATE.whReceiptDraft'да сақланади —
           қайта чизилганда қаторлар йўқолмайди (2026-10-19). */
        var snapDateP = document.getElementById("r-date").value;
        var snapDueP = document.getElementById("r-duedate") ? document.getElementById("r-duedate").value : "";
        var snapNoteP = document.getElementById("r-note") ? document.getElementById("r-note").value : "";
        openSupplierForm(null, function(supplierId, supplierName){
          whrDraft().supplierId = supplierId||"";
          whrDraft().supplierName = supplierName||"";
          openWhReceiptModal();
          var byId = function(id){ return document.getElementById(id); };
          if(byId("r-date")) byId("r-date").value = snapDateP;
          if(byId("r-duedate")) byId("r-duedate").value = snapDueP;
          if(byId("r-note")) byId("r-note").value = snapNoteP;
        });
      } else if(kind==="main"){
        var snapM = {
          equip: document.getElementById("rm-equip").value, workshop: document.getElementById("rm-workshop").value, resp: document.getElementById("rm-resp").value,
          qty: document.getElementById("r-qty").value, price: document.getElementById("r-price").value, vat: document.getElementById("r-vat").value, paid: document.getElementById("r-paid").value,
          date: document.getElementById("r-date").value, duedate: document.getElementById("r-duedate").value, note: document.getElementById("r-note").value
        };
        openSupplierForm(null, function(supplierId, supplierName){
          openWhReceiptModal();
          var byId = function(id){ return document.getElementById(id); };
          if(byId("r-supplier")) byId("r-supplier").value = supplierName||"";
          if(byId("rm-equip")) byId("rm-equip").value = snapM.equip;
          if(byId("rm-workshop")) byId("rm-workshop").value = snapM.workshop;
          if(byId("rm-resp")) byId("rm-resp").value = snapM.resp;
          if(byId("r-qty")) byId("r-qty").value = snapM.qty;
          if(byId("r-price")) byId("r-price").value = snapM.price;
          if(byId("r-vat")) byId("r-vat").value = snapM.vat;
          if(byId("r-paid")) byId("r-paid").value = snapM.paid;
          if(byId("r-date")) byId("r-date").value = snapM.date;
          if(byId("r-duedate")) byId("r-duedate").value = snapM.duedate;
          if(byId("r-note")) byId("r-note").value = snapM.note;
          if(byId("r-qty")) byId("r-qty").dispatchEvent(new Event("input"));
        });
      } else {
        var snapA = {
          equip: document.getElementById("ra-equip").value, wh: document.getElementById("ra-wh").value, location: document.getElementById("ra-location").value,
          qty: document.getElementById("r-qty").value, price: document.getElementById("r-price").value, vat: document.getElementById("r-vat").value, paid: document.getElementById("r-paid").value,
          date: document.getElementById("r-date").value, duedate: document.getElementById("r-duedate").value, note: document.getElementById("r-note").value
        };
        openSupplierForm(null, function(supplierId, supplierName){
          openWhReceiptModal();
          var byId = function(id){ return document.getElementById(id); };
          if(byId("r-supplier")) byId("r-supplier").value = supplierName||"";
          if(byId("ra-equip")) byId("ra-equip").value = snapA.equip;
          if(byId("ra-wh")) byId("ra-wh").value = snapA.wh;
          if(byId("ra-location")) byId("ra-location").value = snapA.location;
          if(byId("r-qty")) byId("r-qty").value = snapA.qty;
          if(byId("r-price")) byId("r-price").value = snapA.price;
          if(byId("r-vat")) byId("r-vat").value = snapA.vat;
          if(byId("r-paid")) byId("r-paid").value = snapA.paid;
          if(byId("r-date")) byId("r-date").value = snapA.date;
          if(byId("r-duedate")) byId("r-duedate").value = snapA.duedate;
          if(byId("r-note")) byId("r-note").value = snapA.note;
          if(byId("r-qty")) byId("r-qty").dispatchEvent(new Event("input"));
        });
      }
    });

    if(kind==="product"){
      var dr = whrDraft();
      var rerenderRows = function(){ closeModal(); openWhReceiptModal(); };
      var whSel2 = document.getElementById("r-wh");
      if(whSel2) whSel2.addEventListener("change", function(){ dr.warehouseId = this.value; });
      var dEl = document.getElementById("r-date");
      if(dEl) dEl.addEventListener("input", function(){ dr.date = this.value; });
      var ddEl = document.getElementById("r-duedate");
      if(ddEl) ddEl.addEventListener("input", function(){ dr.dueDate = this.value; });
      var nEl = document.getElementById("r-note");
      if(nEl) nEl.addEventListener("input", function(){ dr.note = this.value; });
      /* Омбор буюртмасини танлаш — тасдиқланган, лекин ҳали тўлиқ
         етказилмаган буюртмалар. Қайта танлаш мумкин: ҳар сафар фақат
         ҚОЛГАН маҳсулотлар қаторларга тушади (2026-10-19 сўрови). */
      var ordBtn = document.getElementById("r-wh2order");
      if(ordBtn) ordBtn.addEventListener("click", function(){
        var pool = wh2OpenForReceipt();
        var body;
        if(!pool.length){
          body = emptyState("Очиқ буюртма йўқ","Бухгалтер ва раҳбар тасдиқлаган, ҳали тўлиқ келмаган буюртмалар шу ерда кўринади.");
        } else {
          body = personSelectSearchBoxHtml("wro-search")+
            '<div class="table-wrap" style="margin-top:8px;"><table><thead><tr><th>Буюртма рақами</th><th>Сана</th><th>Етказиб берувчи</th><th>Қолган маҳсулот</th><th>Ҳолат</th></tr></thead><tbody>'+
            pool.map(function(o){
              var rem = wh2RemainingLines(o);
              return '<tr class="wro-row" data-id="'+o.id+'" style="cursor:pointer;">'+
                '<td class="cell-strong">'+esc(o.orderNumber)+'</td>'+
                '<td class="cell-muted">'+fmtDateShort(o.date)+'</td>'+
                '<td>'+esc(o.supplierName||"—")+'</td>'+
                '<td class="cell-muted">'+rem.length+' та</td>'+
                '<td>'+wh2ReqChip(o)+'</td></tr>';
            }).join("")+'</tbody></table></div>';
        }
        var m2 = openModal("Омбор буюртмасини танлаш", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true, function(){ openWhReceiptModal(); });
        m2.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); openWhReceiptModal(); });
        var sEl = m2.querySelector("#wro-search");
        if(sEl) sEl.addEventListener("input", function(){
          var q=this.value.trim().toLowerCase();
          m2.querySelectorAll(".wro-row").forEach(function(r){ r.style.display = (!q||(r.textContent||"").toLowerCase().indexOf(q)>-1)?"":"none"; });
        });
        m2.querySelectorAll(".wro-row").forEach(function(rowEl){
          rowEl.addEventListener("click", function(){
            var o = wh2OrderById(rowEl.getAttribute("data-id"));
            closeModal();
            if(!o) return;
            dr.wh2OrderId = o.id;
            if(o.supplierId || o.supplierName){ dr.supplierId = o.supplierId||""; dr.supplierName = o.supplierName||""; }
            var rem = wh2RemainingLines(o);
            dr.rows = rem.length ? rem.map(function(x){
              var itm = x.ln.itemId ? itemById(x.ln.itemId) : null;
              return {itemId:x.ln.itemId||"", itemName:x.ln.itemName||(itm?itm.name:""), unit:x.ln.unit||(itm?itm.unit:""),
                orderQty:x.remain, orderLineIdx:x.idx, qty:x.remain, price:"", vat:VAT_RATE_DEFAULT};
            }) : [freshWhReceiptRow()];
            rerenderRows();
          });
        });
      });
      var clrBtn = document.getElementById("r-wh2clear");
      if(clrBtn) clrBtn.addEventListener("click", function(){
        dr.wh2OrderId = "";
        dr.rows = dr.rows.map(function(r){ var c=Object.assign({},r); c.orderLineIdx=-1; c.orderQty=0; return c; });
        rerenderRows();
      });
      var addRowBtn = document.getElementById("r-addrow");
      if(addRowBtn) addRowBtn.addEventListener("click", function(){ dr.rows.push(freshWhReceiptRow()); rerenderRows(); });
      root.querySelectorAll("[data-wr-item]").forEach(function(b){ b.addEventListener("click", function(){
        var idx = Number(b.getAttribute("data-wr-item"));
        openWh2ItemPickerModal(function(itm){
          if(itm){
            dr.rows[idx].itemId = itm.id;
            dr.rows[idx].itemName = itm.name;
            if(!dr.rows[idx].unit) dr.rows[idx].unit = itm.unit||"";
            if(!dr.rows[idx].price) dr.rows[idx].price = Number(itm.price)||"";
          }
          rerenderRows();
        }, function(){ openWhReceiptModal(); });
      }); });
      root.querySelectorAll("[data-wr-newitem]").forEach(function(b){ b.addEventListener("click", function(){
        var idx = Number(b.getAttribute("data-wr-newitem"));
        openItemForm(null, function(itemId){
          var itm = itemById(itemId);
          if(itm){
            dr.rows[idx].itemId = itm.id;
            dr.rows[idx].itemName = itm.name;
            if(!dr.rows[idx].unit) dr.rows[idx].unit = itm.unit||"";
          }
          openWhReceiptModal();
        });
      }); });
      root.querySelectorAll("[data-wr-del]").forEach(function(b){ b.addEventListener("click", function(){
        var idx = Number(b.getAttribute("data-wr-del"));
        dr.rows.splice(idx,1);
        if(!dr.rows.length) dr.rows.push(freshWhReceiptRow());
        rerenderRows();
      }); });
      var recalcTotals = function(){
        var t = whrTotals();
        var set = function(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; };
        set("r-sum-novat", fmtSum(t.noVat)); set("r-sum-vat", fmtSum(t.vat));
        set("r-sum-total", fmtSum(t.total)); set("r-sum-payable", fmtSum(t.total));
      };
      ["qty","price","vat"].forEach(function(f){
        root.querySelectorAll("[data-wr-"+f+"]").forEach(function(inp){
          inp.addEventListener("input", function(){
            var idx = Number(inp.getAttribute("data-wr-"+f));
            if(dr.rows[idx]) dr.rows[idx][f] = inp.value;
            recalcTotals();
          });
        });
      });
      recalcTotals();

      document.getElementById("r-submit").addEventListener("click", function(){
        var whId = document.getElementById("r-wh").value;
        var date = document.getElementById("r-date").value || todayISO();
        var dueDate = document.getElementById("r-duedate") ? document.getElementById("r-duedate").value : "";
        var note = document.getElementById("r-note") ? document.getElementById("r-note").value.trim() : "";
        var supName = (dr.supplierName||"").trim();
        if(!whId){ toast("Омборни танланг"); return; }
        if(!supName){ toast("Ташкилотни рўйхатдан танланг"); return; }
        var rows = dr.rows.filter(function(r){ return r.itemId && Number(r.qty)>0; });
        if(!rows.length){ toast("Камида битта маҳсулот ва келган миқдорини киритинг"); return; }
        var ord = dr.wh2OrderId ? wh2OrderById(dr.wh2OrderId) : null;
        resolveOrCreateSupplierThen(supName, function(supplierId, supplierNameFinal){
          var nowIso = new Date().toISOString();
          rows.forEach(function(r){
            var qty = Number(r.qty)||0, price = Number(r.price)||0, vat = Number(r.vat)||0;
            var totalNoVat = qty*price, vatSum = totalNoVat*vat/100, totalWithVat = totalNoVat+vatSum;
            var it = itemById(r.itemId);
            adjustStockBy(r.itemId, whId, qty);
            if(price>0) dbUpdate("items", r.itemId, {price:price, updatedAt:nowIso}, STATE.items);
            dbAdd("receipts", {
              warehouseId:whId, itemId:r.itemId, itemName:it?it.name:(r.itemName||""), quantity:qty,
              priceNoVat:price, vatRate:vat, vatSum:vatSum, totalNoVat:totalNoVat, totalWithVat:totalWithVat,
              supplierId:supplierId||"", supplierName:supplierNameFinal||"", paidAmount:0, payableAmount:totalWithVat,
              cashAccountId:"", dueDate:dueDate, date:date, note:note,
              wh2OrderId: ord?ord.id:"", wh2OrderNumber: ord?(ord.orderNumber||""):"",
              createdAt:nowIso
            }, STATE.receipts);
            if(it && (it.itemType==="mahsulot" || it.itemType==="yarim_tayyor")) advanceReadyOrdersForProductName(it.name);
          });
          /* Боғланган омбор буюртмасида ФАКТ келган миқдорлар янгиланади. */
          if(ord){
            var newLines = (ord.lines||[]).map(function(ln){ return Object.assign({}, ln); });
            rows.forEach(function(r){
              var idx = Number(r.orderLineIdx);
              if(!(idx>=0) || !newLines[idx]) return;
              newLines[idx].deliveredQty = (Number(newLines[idx].deliveredQty)||0) + (Number(r.qty)||0);
              newLines[idx].deliveryStatus = ((Number(newLines[idx].deliveredQty)||0) >= (Number(newLines[idx].qty)||0)-0.0000001) ? "done" : "partial";
            });
            var probe = Object.assign({}, ord, {lines:newLines});
            var ds = wh2DeliveryState(probe);
            var upd = {lines:newLines};
            if(ds==="done"){ upd.requestStatus="done"; upd.deliveredAt=nowIso; upd.deliveredBy=wh2ActorName(); }
            else upd.requestStatus = "dir";
            dbUpdate("wh2Orders", ord.id, upd, STATE.wh2Orders);
            toast(ds==="done"
              ? "Кирим қилинди — буюртма «Бажарилди» ҳолатига ўтди"
              : "Кирим қилинди — буюртмада ҳали келмаган маҳсулотлар бор");
          } else {
            toast("Кирим қилинди — омбор янгиланди");
          }
          STATE.whReceiptDraft = freshWhReceiptDraft();
          closeModal();
          render();
        });
      });
    } else if(kind==="main"){
      document.getElementById("r-submit").addEventListener("click", function(){
        var supplierNameVal = document.getElementById("r-supplier").value.trim();
        var equipmentId = document.getElementById("rm-equip").value;
        var eq = equipmentById(equipmentId);
        var name = eq ? eq.name : "";
        var workshopId = document.getElementById("rm-workshop").value;
        var respRaw = document.getElementById("rm-resp").value.trim();
        var respEmp = resolvePersonFromComboValue(respRaw);
        var responsibleEmployeeId = respEmp ? respEmp.id : "";
        var cf = readReceiptCalcFields();
        if(!equipmentId || !name){ toast("Ускуна ва жиҳозлар рўйхатидан ускуна номини танланг"); return; }
        if(!workshopId){ toast("Цехни танланг"); return; }
        /* "Жавобгар шахс" фақат рўйхатдаги мавжуд ходимга ёки "+" орқали
           янги қўшилган ходимга мос келиши шарт — рўйхатда йўқ, ўзи қўлда
           ёзилган (ва "+" орқали қўшилмаган) исм билан сақлашга йўл
           қўйилмайди (фойдаланувчи сўровига кўра). Майдон бўш қолдирилса
           (жавобгар шахс кўрсатилмаса), олдингидек рухсат этилади. */
        if(respRaw && !respEmp){ toast("«Жавобгар шахс» рўйхатда йўқ — мавжуд ходимни танланг ёки «+» орқали янги ходим қўшинг"); return; }
        if(cf.qty<=0){ toast("Миқдорни киритинг"); return; }
        if(cf.paid>0 && !cf.cashAccountId){ toast("Тўлов учун кассани танланг"); return; }
        if(cf.paid>0 && cf.cashAccountId){
          var availForReceipt = cashMethodBalance(cf.cashAccountId, "naqd");
          if(cf.paid>availForReceipt){ toast("Кассада пул етарли эмас — қолдиқ: "+fmtSum(availForReceipt)); return; }
        }
        var catIds = STATE.receiptCategoryIds.slice();
        resolveOrCreateSupplierThen(supplierNameVal, function(supplierId, supplierNameFinal){
          if(cf.paid>0 && cf.cashAccountId) recordCashTx(cf.cashAccountId, "chiqim", cf.paid, "xomashyo_xarid", {supplierId:supplierId||"", description:"Асосий ускуна кирими: "+name});
          dbAdd("equipmentReceipts", {
            kind:"main", name:name, equipmentId:equipmentId, quantity:cf.qty, priceNoVat:cf.price, vatRate:cf.vat, vatSum:cf.vatSum, totalNoVat:cf.totalNoVat, totalWithVat:cf.totalWithVat,
            workshopId:workshopId, responsibleEmployeeId:responsibleEmployeeId||"", categoryIds:catIds,
            supplierId:supplierId||"", supplierName:supplierNameFinal||"", paidAmount:cf.paid, payableAmount:cf.payableAmount, cashAccountId:cf.paid>0?cf.cashAccountId:"", dueDate:cf.dueDate,
            date:cf.date, note:cf.note, createdAt:new Date().toISOString()
          }, STATE.equipmentReceipts);
          STATE.receiptCategoryIds=[];
          toast("Асосий ускуна кирим қилинди");
          closeModal();
          render();
        });
      });
    } else {
      document.getElementById("r-submit").addEventListener("click", function(){
        var supplierNameVal = document.getElementById("r-supplier").value.trim();
        var equipmentId = document.getElementById("ra-equip").value;
        var eq = equipmentById(equipmentId);
        var name = eq ? eq.name : "";
        var whId = document.getElementById("ra-wh").value;
        var location = document.getElementById("ra-location").value.trim();
        var cf = readReceiptCalcFields();
        if(!equipmentId || !name){ toast("Ускуна ва жиҳозлар рўйхатидан жиҳоз номини танланг"); return; }
        if(!whId){ toast("Омборни танланг"); return; }
        if(cf.qty<=0){ toast("Миқдорни киритинг"); return; }
        if(cf.paid>0 && !cf.cashAccountId){ toast("Тўлов учун кассани танланг"); return; }
        if(cf.paid>0 && cf.cashAccountId){
          var availForReceipt = cashMethodBalance(cf.cashAccountId, "naqd");
          if(cf.paid>availForReceipt){ toast("Кассада пул етарли эмас — қолдиқ: "+fmtSum(availForReceipt)); return; }
        }
        var catIds = STATE.receiptCategoryIds.slice();
        resolveOrCreateSupplierThen(supplierNameVal, function(supplierId, supplierNameFinal){
          if(cf.paid>0 && cf.cashAccountId) recordCashTx(cf.cashAccountId, "chiqim", cf.paid, "xomashyo_xarid", {supplierId:supplierId||"", description:"Ёрдамчи жиҳоз кирими: "+name});
          dbAdd("equipmentReceipts", {
            kind:"aux", name:name, equipmentId:equipmentId, quantity:cf.qty, priceNoVat:cf.price, vatRate:cf.vat, vatSum:cf.vatSum, totalNoVat:cf.totalNoVat, totalWithVat:cf.totalWithVat,
            warehouseId:whId, location:location, categoryIds:catIds,
            supplierId:supplierId||"", supplierName:supplierNameFinal||"", paidAmount:cf.paid, payableAmount:cf.payableAmount, cashAccountId:cf.paid>0?cf.cashAccountId:"", dueDate:cf.dueDate,
            date:cf.date, note:cf.note, createdAt:new Date().toISOString()
          }, STATE.equipmentReceipts);
          STATE.receiptCategoryIds=[];
          toast("Ёрдамчи жиҳоз кирим қилинди");
          closeModal();
          render();
        });
      });
    }
  }


