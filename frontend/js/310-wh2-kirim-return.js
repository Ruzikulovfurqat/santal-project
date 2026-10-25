  /* ================= Омбор 2: Кирим → Қайтариш =================
     "Қайтариш" — аввал Чиқим қилинган (цех/ходимга берилган) товар/хом
     ашёни қайтадан омборга КИРИМ қилиш. Техник жиҳатдан бу ОДДИЙ
     Wh2Receipt ёзуви сифатида сақланади (isReturn:true билан белгиланиб)
     — шунинг учун ҳеч қандай қўшимча ҳисоблаш логикасисиз, автоматик
     равишда Омбор 2 → Қолдиқ ҳисоботидаги танланган омборнинг "Кирим"
     устунига қўшилади (wh2KoldiqByWarehouseRows аллақачон STATE.wh2Receipts
     орқали ишлайди). "Кимдан" майдони икки босқичли танловчи: аввал
     туркум (wh2AllCategories() — худди Кирим формасидаги "Туркум" рўйхати,
     "+" орқали кенгайтирилади), сўнг шу туркумга мос аввалги Чиқим
     қаторларидан бири танланади — танланган қатор "Кимдан" матнига ва
     маҳсулотлар жадвалига (нарх — маҳсулотнинг каталогдаги кирим нархи
     билан) автоматик қўшилади. */
  function wh2FreshReturnNumber(){ return "OMB2-QAYT-"+new Date().getFullYear()+"-"+String(STATE.wh2Receipts.filter(function(r){ return r.isReturn; }).length+1).padStart(3,"0"); }
  /* Танланган туркумга мос — аввал Чиқим қилинган (бекор қилинмаган)
     барча қаторларни, энг янгиси олдин бўлиб, ясси рўйхат кўринишида
     қайтаради — ҳар бир қатор ўзининг цехи/ким олгани/санаси билан. */
  function wh2ChikimIssuedLines(categoryId){
    var out = [];
    STATE.wh2Chikims.filter(function(c){ return !c.cancelled; })
      .sort(function(a,b){ return (b.date||"").localeCompare(a.date||"")||(b.createdAt||"").localeCompare(a.createdAt||""); })
      .forEach(function(c){
        (c.lines||[]).forEach(function(ln){
          if(!ln.itemId || !(Number(ln.qty)>0)) return;
          if(!wh2KoldiqCategoryMatches(ln.itemId, [categoryId])) return;
          out.push({chikimId:c.id, chikimNumber:c.chikimNumber, date:c.date, workshopName:c.workshopName, takenByName:c.takenByName, itemId:ln.itemId, itemName:ln.itemName, unit:ln.unit, qty:ln.qty});
        });
      });
    return out;
  }
  /* 6-босқич (2026-09-24, фойдаланувчининг аниқ кўрсатмаси бўйича):
     "Кимдан" (туркум асосидаги) танловчи "Қайси цехдан" (ЦЕХ асосидаги)
     танловчига алмаштирилди — эски openWh2ReturnCategoryPicker/
     openWh2ReturnItemPicker/wh2ChikimIssuedLines функциялари ўзгартирилмай
     қолдирилди (эски маълумотлар билан мослик учун, лекин энди чақирилмайди).
     Икки босқичли: 1-босқич — цех рўйхати (STATE.workshops — худди
     Чиқим формасидаги "Цех" рўйхати), "+" орқали янги цех қўшиш ва ҳар бир
     қатор ёнида "ўчириш" (trash) тугмаси ҳам бор (фойдаланувчининг аниқ
     сўровига кўра). 2-босқич — шу цехда ҳозир (жорий вақтда) қолдиғи
     мусбат бўлган маҳсулотлар рўйхати (wh2WorkshopHeldItems — Чиқим
     орқали берилган минус олдинги Қайтаришлар). Танлангандан кейин
     onPicked(workshopId, workshopName, heldItem) чақирилади (heldItem —
     null бўлиши мумкин, агар цех танланиб лекин рўйхат бўш бўлса). */
  function openWh2ReturnWorkshopPicker(onPicked, onClose){
    var wsList = STATE.workshops.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    var body = '<div id="wrwp-list" style="max-height:380px;overflow-y:auto;"></div>';
    var m = openModal("Қайси цехдан — цехни танланг", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onClose) onClose(); });
    var listEl = m.querySelector("#wrwp-list");
    var renderList = function(){
      var rowsHtml = wsList.map(function(w){
        return '<tr class="wrwp-row" data-id="'+esc(w.id)+'"><td class="cell-strong" style="cursor:pointer;">'+esc(w.name)+'</td>'+
          '<td style="text-align:right;width:24px;"><button type="button" class="btn btn-ghost btn-icon" data-wrwp-del="'+esc(w.id)+'" title="Цехни ўчириш">'+ICONS.trash+'</button></td>'+
          '<td style="text-align:right;width:24px;cursor:pointer;" class="wrwp-arrow" data-id2="'+esc(w.id)+'">'+ICONS.arrowRight+'</td></tr>';
      }).join("");
      listEl.innerHTML = '<div class="table-wrap"><table><tbody>'+rowsHtml+
        '<tr class="wrwp-addrow" style="cursor:pointer;color:var(--accent);"><td class="cell-strong" colspan="3">'+ICONS.plus+' Янги цех қўшиш</td></tr>'+
        '</tbody></table></div>';
      var pick = function(id){
        var w = wsList.find(function(x){ return x.id===id; });
        closeModal();
        if(!w){ if(onClose) onClose(); return; }
        openWh2ReturnWorkshopItemPicker(w.id, w.name, function(item){ onPicked(w.id, w.name, item); }, function(){ onPicked(w.id, w.name, null); });
      };
      listEl.querySelectorAll(".wrwp-row .cell-strong").forEach(function(cellEl){
        cellEl.addEventListener("click", function(){ pick(cellEl.closest(".wrwp-row").getAttribute("data-id")); });
      });
      listEl.querySelectorAll(".wrwp-arrow").forEach(function(arrEl){
        arrEl.addEventListener("click", function(){ pick(arrEl.getAttribute("data-id2")); });
      });
      listEl.querySelectorAll("[data-wrwp-del]").forEach(function(delBtn){
        delBtn.addEventListener("click", function(e){
          e.stopPropagation();
          var id = delBtn.getAttribute("data-wrwp-del");
          var w = wsList.find(function(x){ return x.id===id; });
          if(!w) return;
          /* openModal/closeModal бу тизимда БИТТА modalRoot'ни тўлиқ
             алмаштиради — иккита модал бир вақтда "устма-уст" тура
             олмайди. Шунинг учун стандарт openConfirm() ўрнига ўзимизнинг
             мини-тасдиқлашни очамиз — ХОҲ "Ҳа", ХОҲ "Бекор қилиш"
             босилса ҳам, пикер модали (янгиланган рўйхат билан) қайта
             очилади, фойдаланувчи ҳеч қачон "ёпиқ экран"да қолмайди. */
          var cm = openModal("Цехни ўчириш", '<p style="font-size:13.5px;color:var(--ink-2);line-height:1.5;margin:0;">«'+esc(w.name)+'» ўчирилсинми? Унга бириктирилган чиқим/буюртмалар тарихда сақланиб қолади, лекин цех рўйхатдан йўқолади.</p>',
            '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-danger" style="background:var(--critical);color:#fff;" data-ok>Ҳа, ўчириш</button>');
          cm.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); openWh2ReturnWorkshopPicker(onPicked, onClose); });
          cm.querySelector("[data-ok]").addEventListener("click", function(){
            closeModal();
            dbDelete("workshops", w.id, STATE.workshops);
            toast("Ўчирилди");
            openWh2ReturnWorkshopPicker(onPicked, onClose);
          });
        });
      });
      listEl.querySelector(".wrwp-addrow").addEventListener("click", function(){
        closeModal();
        openWorkshopForm(null, function(newId, newName){
          openWh2ReturnWorkshopItemPicker(newId, newName, function(item){ onPicked(newId, newName, item); }, function(){ onPicked(newId, newName, null); });
        });
      });
    };
    renderList();
  }
  function openWh2ReturnWorkshopItemPicker(workshopId, workshopName, onPicked, onClose){
    var items = wh2WorkshopHeldItems(workshopId);
    var body = personSelectSearchBoxHtml("wrwip-search")+'<div id="wrwip-list" style="max-height:380px;overflow-y:auto;"></div>';
    var m = openModal(esc(workshopName)+" — жорий қолдиғидан танланг", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onClose) onClose(); });
    var listEl = m.querySelector("#wrwip-list");
    if(!items.length){
      listEl.innerHTML = emptyState("Бу цехда қолдиқ йўқ","«"+esc(workshopName)+"» цехида ҳозирда қайтариш мумкин бўлган маҳсулот топилмади.");
    } else {
      listEl.innerHTML = '<div class="table-wrap"><table><tbody>'+items.map(function(it,i){
        return '<tr class="wrwip-row" data-idx="'+i+'" style="cursor:pointer;"><td class="cell-strong">'+esc(it.itemName)+'</td><td class="num">'+fmtNum(it.qty)+' '+esc(it.unit||"")+'</td><td style="text-align:right;width:24px;">'+ICONS.arrowRight+'</td></tr>';
      }).join("")+'</tbody></table></div>';
      listEl.querySelectorAll(".wrwip-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var idx = Number(rowEl.getAttribute("data-idx"));
          var it = items[idx];
          closeModal();
          onPicked(it||null);
        });
      });
    }
    m.querySelector("#wrwip-search").addEventListener("input", function(){
      var q = this.value.trim().toLowerCase();
      m.querySelectorAll(".wrwip-row").forEach(function(rowEl){
        var txt = (rowEl.textContent||"").toLowerCase();
        rowEl.style.display = (!q || txt.indexOf(q)>-1) ? "" : "none";
      });
    });
  }
  /* ЭСКИ (2026-09-24'гача ишлатилган) туркум-асосидаги танловчи — энди
     чақирилмайди, лекин мослик учун ўзгартирилмай сақланиб қолди.
     Икки босқичли: 1-босқич — туркум (Тайёр маҳсулот/Хом ашё/
     Товар + "+" орқали қўшилган туркумлар), "+" тугмаси ҳам шу ерда.
     2-босқич — шу туркумга мос Чиқим қилинган қаторлар рўйхати.
     Танлангандан кейин onPicked(categoryId, categoryName, line) чақирилади
     (line — null бўлиши мумкин, агар туркум танланиб лекин рўйхат бўш
     бўлса ва фойдаланувчи ортга қайтган бўлса). onClose — модал ҳеч нарса
     танланмасдан ёпилганда (чақирувчи драфтни қайта очиши учун). */
  function openWh2ReturnCategoryPicker(onPicked, onClose){
    var cats = wh2AllCategories();
    var body = '<div id="wrcp-list" style="max-height:380px;overflow-y:auto;"></div>';
    var m = openModal("Кимдан — туркумни танланг", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onClose) onClose(); });
    var listEl = m.querySelector("#wrcp-list");
    var rowsHtml = cats.map(function(c){
      return '<tr class="wrcp-row" data-id="'+esc(c.id)+'" style="cursor:pointer;"><td class="cell-strong">'+esc(c.name)+'</td><td style="text-align:right;width:24px;">'+ICONS.arrowRight+'</td></tr>';
    }).join("");
    listEl.innerHTML = '<div class="table-wrap"><table><tbody>'+rowsHtml+
      '<tr class="wrcp-addrow" style="cursor:pointer;color:var(--accent);"><td class="cell-strong" colspan="2">'+ICONS.plus+' Янги туркум қўшиш</td></tr>'+
      '</tbody></table></div>';
    listEl.querySelectorAll(".wrcp-row").forEach(function(rowEl){
      rowEl.addEventListener("click", function(){
        var id = rowEl.getAttribute("data-id");
        var c = cats.find(function(x){ return x.id===id; });
        closeModal();
        if(!c) { if(onClose) onClose(); return; }
        openWh2ReturnItemPicker(c.id, c.name, function(line){ onPicked(c.id, c.name, line); }, function(){ onPicked(c.id, c.name, null); });
      });
    });
    listEl.querySelector(".wrcp-addrow").addEventListener("click", function(){
      closeModal();
      openWh2CategoryForm(function(newId, newName){
        openWh2ReturnItemPicker(newId, newName, function(line){ onPicked(newId, newName, line); }, function(){ onPicked(newId, newName, null); });
      });
    });
  }
  function openWh2ReturnItemPicker(categoryId, categoryName, onPicked, onClose){
    var lines = wh2ChikimIssuedLines(categoryId);
    var body = personSelectSearchBoxHtml("wrip-search")+'<div id="wrip-list" style="max-height:380px;overflow-y:auto;"></div>';
    var m = openModal(esc(categoryName)+" — чиқим қилинганлардан танланг", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onClose) onClose(); });
    var listEl = m.querySelector("#wrip-list");
    if(!lines.length){
      listEl.innerHTML = emptyState("Бу туркумда чиқим топилмади","«"+esc(categoryName)+"» туркумида ҳали Чиқим қилинган ёзув йўқ.");
    } else {
      listEl.innerHTML = '<div class="table-wrap"><table><tbody>'+lines.map(function(ln,i){
        return '<tr class="wrip-row" data-idx="'+i+'" style="cursor:pointer;"><td class="cell-strong">'+esc(ln.itemName)+'</td><td class="cell-muted">'+esc(ln.workshopName||ln.takenByName||"—")+'</td><td class="cell-muted">'+fmtDateShort(ln.date)+'</td><td class="num">'+fmtNum(ln.qty)+' '+esc(ln.unit||"")+'</td><td style="text-align:right;width:24px;">'+ICONS.arrowRight+'</td></tr>';
      }).join("")+'</tbody></table></div>';
      listEl.querySelectorAll(".wrip-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var idx = Number(rowEl.getAttribute("data-idx"));
          var ln = lines[idx];
          closeModal();
          onPicked(ln||null);
        });
      });
    }
    m.querySelector("#wrip-search").addEventListener("input", function(){
      var q = this.value.trim().toLowerCase();
      m.querySelectorAll(".wrip-row").forEach(function(rowEl){
        var txt = (rowEl.textContent||"").toLowerCase();
        rowEl.style.display = (!q || txt.indexOf(q)>-1) ? "" : "none";
      });
    });
  }
  function openWh2ReturnForm(draft){
    var freshLine = function(){ return {itemId:"", itemName:"", unit:"", qty:0, price:0, lineTotal:0}; };
    var fs = draft
      ? {returnNumber:draft.returnNumber||wh2FreshReturnNumber(), date:draft.date||todayISO(), workshopId:draft.workshopId||"", workshopName:draft.workshopName||"", warehouseId:draft.warehouseId||"", warehouseName:draft.warehouseName||"", note:draft.note||"", lines:(draft.lines&&draft.lines.length)?draft.lines:[freshLine()]}
      : {returnNumber:wh2FreshReturnNumber(), date:todayISO(), workshopId:"", workshopName:"", warehouseId:(STATE.warehouses[0]?STATE.warehouses[0].id:""), warehouseName:(STATE.warehouses[0]?STATE.warehouses[0].name:""), note:"", lines:[freshLine()]};
    (function(){
      var whRef = wh2ReresolveRef(fs.warehouseId, fs.warehouseName, STATE.warehouses);
      fs.warehouseId = whRef.id; fs.warehouseName = whRef.name;
      var wsRef = wh2ReresolveRef(fs.workshopId, fs.workshopName, STATE.workshops);
      fs.workshopId = wsRef.id; fs.workshopName = wsRef.name;
    })();

    var warehouseOptionsHtml = function(){
      return '<option value="">— танланг —</option>'+STATE.warehouses.map(function(w){ return '<option value="'+esc(w.id)+'"'+(fs.warehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>'; }).join("");
    };
    /* 6-босқич: "Бирлик" катагида ҳам, шу цехда шу маҳсулотдан ҳозир
       қанча қолгани (энг кўп қайтариш мумкин бўлган миқдор) кўрсатилади. */
    var returnUnitCellHtml = function(ln){
      if(!ln.itemId) return esc(ln.unit||"—");
      var bal = wh2CurrentWorkshopBalance(ln.itemId, fs.workshopId, null);
      return esc(ln.unit||"—")+' <span class="cell-muted" style="font-size:11.5px;">· Цехда: '+fmtNum(bal)+'</span>';
    };
    var rowsHtml = function(){
      return fs.lines.map(function(ln,i){
        return '<tr data-wh2row="'+i+'">'+
          '<td class="cell-muted">'+(i+1)+'</td>'+
          '<td><div style="display:flex;gap:4px;align-items:center;">'+itemComboInputHtml("wret-item-"+i, "wret-item-list-"+i, ln.itemId?itemById(ln.itemId):null, "Маҳсулот номи…", "flex:1;min-width:140px;", isWh2ChikimItem, 'data-field="item" data-row="'+i+'"')+'<button type="button" class="btn btn-secondary btn-icon" data-wret-item-pick="'+i+'" title="Рўйхатдан қидириб танлаш" style="flex-shrink:0;">'+ICONS.search+'</button></div></td>'+
          '<td class="cell-muted" data-unit-cell="'+i+'">'+returnUnitCellHtml(ln)+'</td>'+
          '<td><input type="number" min="0" step="any" data-field="qty" data-row="'+i+'" value="'+esc(ln.qty)+'" style="width:90px;"></td>'+
          '<td><input type="number" min="0" step="any" data-field="price" data-row="'+i+'" value="'+esc(ln.price)+'" style="width:110px;"></td>'+
          '<td class="num cell-strong" data-total-cell="'+i+'">'+fmtSum(ln.lineTotal)+'</td>'+
          '<td><div style="display:flex;gap:4px;"><button type="button" class="btn btn-ghost btn-icon" data-wh2-addrow="'+i+'" title="Пастига қатор қўшиш">'+ICONS.plus+'</button><button type="button" class="btn btn-ghost btn-icon" data-wh2-delrow="'+i+'" title="Қаторни ўчириш">'+ICONS.trash+'</button></div></td>'+
          '</tr>';
      }).join("");
    };

    var body = ''+
      '<div class="field-row"><div class="field"><label>Қайтариш рақами</label><input id="wret-number" value="'+esc(fs.returnNumber)+'"></div>'+
      '<div class="field"><label>Қайтариш санаси</label><input id="wret-date" type="date" value="'+esc(fs.date)+'"></div></div>'+
      '<div class="field-row"><div class="field" style="flex:1;"><label>Қайси цехдан</label><button type="button" class="btn btn-secondary" id="wret-kimdan-btn" style="width:100%;justify-content:flex-start;text-align:left;">'+(fs.workshopName?esc(fs.workshopName):"— танлаш учун босинг —")+'</button></div>'+
      '<div class="field"><label>Қайси омборга қайтарилади</label><div style="display:flex;gap:6px;"><select id="wret-warehouse" style="flex:1;min-width:0;">'+warehouseOptionsHtml()+'</select><button type="button" class="btn btn-secondary btn-icon" id="wret-warehouse-add" title="Янги омбор қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div></div>'+
      '<div class="section-head" style="margin-top:4px;"><h2 style="font-size:13.5px;">Маҳсулотлар</h2></div>'+
      '<div class="table-wrap"><table><thead><tr><th>№</th><th>Маҳсулот номи</th><th>Ўлчов бирлиги</th><th>Сони</th><th>Нархи</th><th>Жами нархи</th><th></th></tr></thead><tbody id="wretRowsBody">'+rowsHtml()+'</tbody></table></div>'+
      '<div id="wretTotal" style="text-align:right;font-weight:700;font-size:15px;margin-top:10px;">Жами: '+fmtSum(0)+'</div>'+
      '<div class="field" style="margin-top:14px;"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="wret-note">'+esc(fs.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Қайтаришни сақлаш</button>';
    var m = openModal("Кирим — Қайтариш", body, foot, true);
    m.querySelector(".modal").classList.add("xxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    var rowsBody = m.querySelector("#wretRowsBody");
    var warehouseSel = m.querySelector("#wret-warehouse");
    var totalEl = m.querySelector("#wretTotal");

    var snapshotFields = function(){
      fs.returnNumber = m.querySelector("#wret-number").value;
      fs.date = m.querySelector("#wret-date").value;
      var whNow = warehouseById(warehouseSel.value);
      fs.warehouseId = warehouseSel.value;
      if(whNow) fs.warehouseName = whNow.name;
      fs.note = m.querySelector("#wret-note").value;
    };
    warehouseSel.addEventListener("change", function(){
      var whNow = warehouseById(warehouseSel.value);
      fs.warehouseId = warehouseSel.value; fs.warehouseName = whNow?whNow.name:"";
    });
    m.querySelector("#wret-warehouse-add").addEventListener("click", function(){
      snapshotFields();
      var draft2 = Object.assign({}, fs);
      closeModal();
      openWarehouseForm(null, function(newId){
        var w = warehouseById(newId);
        draft2.warehouseId = newId||""; draft2.warehouseName = w?w.name:"";
        openWh2ReturnForm(draft2);
      });
    });
    m.querySelector("#wret-kimdan-btn").addEventListener("click", function(){
      snapshotFields();
      var draft2 = Object.assign({}, fs);
      closeModal();
      openWh2ReturnWorkshopPicker(function(workshopId, workshopName, heldItem){
        draft2.workshopId = workshopId;
        draft2.workshopName = workshopName;
        if(heldItem){
          var itm = itemById(heldItem.itemId);
          var newLine = {itemId:heldItem.itemId, itemName:heldItem.itemName, unit:heldItem.unit, qty:heldItem.qty, price:(itm?Number(itm.price)||0:0), lineTotal:0};
          newLine.lineTotal = wh2Round2((Number(newLine.qty)||0)*(Number(newLine.price)||0));
          var emptyIdx = draft2.lines.findIndex(function(l){ return !l.itemId; });
          if(emptyIdx>-1) draft2.lines[emptyIdx] = newLine; else draft2.lines.push(newLine);
        }
        openWh2ReturnForm(draft2);
      }, function(){ openWh2ReturnForm(draft2); });
    });

    var updateWretTotal = function(){
      var sum = fs.lines.reduce(function(s,ln){ return s+(Number(ln.lineTotal)||0); },0);
      totalEl.textContent = "Жами: "+fmtSum(sum);
    };
    var recalcRow = function(row){
      var ln = fs.lines[row]; if(!ln) return;
      ln.lineTotal = wh2Round2((Number(ln.qty)||0)*(Number(ln.price)||0));
      var totalCell = rowsBody.querySelector('[data-total-cell="'+row+'"]');
      if(totalCell) totalCell.textContent = fmtSum(ln.lineTotal);
    };
    var resolveRowItem = function(t){
      var row = Number(t.getAttribute("data-row"));
      if(row==null||isNaN(row)) return;
      var ln = fs.lines[row]; if(!ln) return;
      var itm = resolveItemFromComboValue(t.value, isWh2ChikimItem);
      ln.itemId = itm ? itm.id : "";
      ln.itemName = itm ? itm.name : "";
      ln.unit = itm ? (itm.unit||"") : "";
      var unitCell = rowsBody.querySelector('[data-unit-cell="'+row+'"]');
      if(unitCell) unitCell.innerHTML = returnUnitCellHtml(ln);
      if(itm && !Number(ln.price)){
        ln.price = Number(itm.price)||0;
        var priceInput = rowsBody.querySelector('input[data-field="price"][data-row="'+row+'"]');
        if(priceInput) priceInput.value = ln.price;
      }
      recalcRow(row);
      updateWretTotal();
    };
    rowsBody.addEventListener("input", function(e){
      var t = e.target, field = t.getAttribute("data-field"), row = Number(t.getAttribute("data-row"));
      if(field==="item"){ resolveRowItem(t); return; }
      if(row==null||isNaN(row)) return;
      var ln = fs.lines[row]; if(!ln) return;
      if(field==="qty"){ ln.qty = Number(t.value)||0; recalcRow(row); }
      else if(field==="price"){ ln.price = Number(t.value)||0; recalcRow(row); }
      updateWretTotal();
    });
    rowsBody.addEventListener("change", function(e){
      var t = e.target, field = t.getAttribute("data-field");
      if(field==="item") resolveRowItem(t);
    });
    rowsBody.addEventListener("click", function(e){
      var addBtn = e.target.closest("[data-wh2-addrow]");
      if(addBtn){
        var idx = Number(addBtn.getAttribute("data-wh2-addrow"));
        fs.lines.splice(idx+1, 0, freshLine());
        rowsBody.innerHTML = rowsHtml();
        updateWretTotal();
        return;
      }
      var delBtn = e.target.closest("[data-wh2-delrow]");
      if(delBtn){
        var idx2 = Number(delBtn.getAttribute("data-wh2-delrow"));
        fs.lines.splice(idx2, 1);
        if(!fs.lines.length) fs.lines.push(freshLine());
        rowsBody.innerHTML = rowsHtml();
        updateWretTotal();
        return;
      }
      var itemPickBtn = e.target.closest("[data-wret-item-pick]");
      if(itemPickBtn){
        var pickRowIdx = Number(itemPickBtn.getAttribute("data-wret-item-pick"));
        snapshotFields();
        var pickDraft = Object.assign({}, fs);
        closeModal();
        /* Цех танланган бўлса — фақат шу цехда ҳозир қолдиғи бор
           маҳсулотлар кўрсатилади (уларгина қайтарилиши мумкин);
           цех ҳали танланмаган бўлса — эски umumiy рўйхат (fallback). */
        var heldPool = fs.workshopId ? wh2WorkshopHeldItems(fs.workshopId).map(function(h){ return itemById(h.itemId); }).filter(Boolean) : null;
        openItemPickerModal("Маҳсулотни танлаш", heldPool && heldPool.length ? heldPool : STATE.items.filter(isWh2ChikimItem), function(item){
          if(item){
            var ln = pickDraft.lines[pickRowIdx];
            ln.itemId = item.id; ln.itemName = item.name; ln.unit = item.unit||"";
            if(!Number(ln.price)) ln.price = Number(item.price)||0;
            ln.lineTotal = wh2Round2((Number(ln.qty)||0)*(Number(ln.price)||0));
          }
          openWh2ReturnForm(pickDraft);
        }, function(){ openWh2ReturnForm(pickDraft); });
        return;
      }
    });
    updateWretTotal();

    m.querySelector("[data-save]").addEventListener("click", function(){
      snapshotFields();
      var returnNumber = fs.returnNumber.trim() || wh2FreshReturnNumber();
      var whRef = wh2ReresolveRef(fs.warehouseId, fs.warehouseName, STATE.warehouses);
      if(!whRef.id){ toast("Қайси омборга қайтарилаётганини танланг"); return; }
      var wsRef = wh2ReresolveRef(fs.workshopId, fs.workshopName, STATE.workshops);
      if(!wsRef.id){ toast("Қайси цехдан қайтарилаётганини танланг"); return; }
      var validLines = fs.lines.filter(function(ln){ return ln.itemId && Number(ln.qty)>0; }).map(function(ln){
        var itm = itemById(ln.itemId);
        return {
          itemId:ln.itemId, itemName: itm?itm.name:(ln.itemName||"—"), unit: ln.unit||(itm?itm.unit:""),
          qty: Number(ln.qty)||0, price: Number(ln.price)||0, lineTotal: Number(ln.lineTotal)||0,
          vatPct:0, vatSum:0, totalWithVat: Number(ln.lineTotal)||0
        };
      });
      if(!validLines.length){ toast("Камида битта маҳсулот ва миқдорини киритинг"); return; }
      /* 6-босқич: цех қолдиғи ҳеч қачон минусга ўтмасин — цехда шу
         маҳсулотдан ҳозир борича (wh2CurrentWorkshopBalance) текширилади
         (таҳрирлашда ёзувнинг ўз эски таъсири ҳисобга олинмайди). */
      var neededByItem = {};
      validLines.forEach(function(ln){ neededByItem[ln.itemId] = (neededByItem[ln.itemId]||0) + Number(ln.qty); });
      for(var chkItemId in neededByItem){
        /* openWh2ReturnForm ҳар доим ЯНГИ ёзув яратади (dbAdd) — таҳрирлаш
           умумий openWh2ReceiptForm орқали амалга оширилади (пастга
           қаранг), шунинг учун бу ерда excludeDocId керак эмас. */
        var available = wh2CurrentWorkshopBalance(chkItemId, wsRef.id, null);
        if(neededByItem[chkItemId] - available > 1e-6){
          var itmChk = itemById(chkItemId);
          toast("«"+(itmChk?itmChk.name:"Маҳсулот")+"» — цехда қолдиқ етарли эмас (цехда: "+fmtNum(available)+", керак: "+fmtNum(neededByItem[chkItemId])+")");
          return;
        }
      }
      var data = {
        receiptNumber: returnNumber, date: fs.date || todayISO(), category: "",
        warehouseId: whRef.id, warehouseName: whRef.name,
        workshopId: wsRef.id, workshopName: wsRef.name,
        supplierId: "", supplierName: "Цех: "+wsRef.name,
        linkedOrderId: "", linkedOrderLabel: "",
        isReturn: true,
        lines: validLines, note: (fs.note||"").trim(),
        cancelled:false, createdAt:new Date().toISOString()
      };
      dbAdd("wh2Receipts", data, STATE.wh2Receipts);
      toast("Қайтариш сақланди");
      closeModal();
    });
  }

  function renderWh2Kirim(){
    var list = STATE.wh2Receipts.slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    setTopbar("Омбор 2 — Кирим", list.length+" та кирим",
      '<button class="btn btn-primary" id="wh2AddReceiptBtn">'+ICONS.plus+'Яратиш</button>'+
      '<button class="btn btn-secondary" id="wh2ReturnBtn" style="margin-left:8px;">'+ICONS.swap+'Қайтариш</button>');
    var root = document.getElementById("content");
    var html = wh2Subnav("kirim");
    if(!list.length){
      html += emptyState("Ҳали кирим йўқ","«Яратиш» тугмаси орқали биринчи киримни киритинг.");
    } else {
      var rows = list.map(function(r){
        var st = r.cancelled ? '<span class="chip chip-critical">Бекор қилинди</span>' : '<span class="chip chip-good">Фаол</span>';
        if(r.isReturn) st = '<span class="chip chip-accent">Қайтариш</span> '+st;
        var actions = '<div class="row-actions">'+
          '<button class="btn btn-ghost btn-icon" data-wh2r-view="'+r.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-wh2r-edit="'+r.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-wh2r-print="'+r.id+'" title="Қоғозга чиқариш">'+ICONS.printer+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-wh2r-excel="'+r.id+'" title="Excelга юклаш">'+ICONS.download+'</button>'+
          (r.cancelled
            ? '<button class="btn btn-ghost btn-icon" data-wh2r-restore="'+r.id+'" title="Тиклаш">'+ICONS.restore+'</button>'
            : '<button class="btn btn-ghost btn-icon" data-wh2r-cancel="'+r.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
          '</div>';
        return '<tr>'+
          '<td class="cell-strong">'+esc(r.receiptNumber)+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(r.date)+'</td>'+
          '<td class="cell-muted">'+esc(r.warehouseName||warehouseName(r.warehouseId))+'</td>'+
          '<td>'+esc(r.supplierName||"—")+'</td>'+
          '<td class="num cell-strong">'+fmtSum(wh2ReceiptTotal(r))+'</td>'+
          '<td>'+st+'</td>'+
          '<td>'+actions+'</td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Кирим рақами</th><th>Сана</th><th>Омбор</th><th>Таъминотчи</th><th>Жами сумма</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireWh2Subnav(root);
    document.getElementById("wh2AddReceiptBtn").addEventListener("click", function(){ openWh2ReceiptForm(null); });
    var retBtn = document.getElementById("wh2ReturnBtn");
    if(retBtn) retBtn.addEventListener("click", function(){ openWh2ReturnForm(null); });
    root.querySelectorAll("[data-wh2r-view]").forEach(function(b){ b.addEventListener("click", function(){ openWh2ReceiptDetail(wh2ReceiptById(b.getAttribute("data-wh2r-view"))); }); });
    root.querySelectorAll("[data-wh2r-edit]").forEach(function(b){ b.addEventListener("click", function(){ openWh2ReceiptForm(wh2ReceiptById(b.getAttribute("data-wh2r-edit"))); }); });
    root.querySelectorAll("[data-wh2r-print]").forEach(function(b){ b.addEventListener("click", function(){ printWh2Receipt(wh2ReceiptById(b.getAttribute("data-wh2r-print"))); }); });
    root.querySelectorAll("[data-wh2r-excel]").forEach(function(b){ b.addEventListener("click", function(){ exportWh2ReceiptExcel(wh2ReceiptById(b.getAttribute("data-wh2r-excel"))); }); });
    root.querySelectorAll("[data-wh2r-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var r = wh2ReceiptById(b.getAttribute("data-wh2r-cancel")); if(!r) return;
      openConfirm("Киримни бекор қилиш","«"+r.receiptNumber+"» кирим бекор қилинсинми? Ёзув тарихда сақланиб қолади ва хоҳласангиз кейин қайта тиклашингиз мумкин.","Ҳа, бекор қилиш", function(){ dbUpdate("wh2Receipts", r.id, {cancelled:true}, STATE.wh2Receipts); toast("Бекор қилинди"); }, true);
    }); });
    root.querySelectorAll("[data-wh2r-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var r = wh2ReceiptById(b.getAttribute("data-wh2r-restore")); if(!r) return;
      openConfirm("Киримни тиклаш","«"+r.receiptNumber+"» кирим қайта тикланиб, фаол ҳолатга қайтарилсинми?","Ҳа, тиклаш", function(){ dbUpdate("wh2Receipts", r.id, {cancelled:false}, STATE.wh2Receipts); toast("Тикланди"); }, true);
    }); });
  }

  function openWh2ReceiptForm(existing){
    /* "existing" — ёки таҳрирланаётган сақланган ёзув (.id бор), ёки "+"
       тезкор-қўшиш оқимидан қайтган драфт (.id йўқ) — иккинчиси ҳеч қачон
       ташлаб юборилмаслиги керак, худди openWh2OrderForm'даги каби. */
    var isEdit = !!(existing && existing.id);
    var freshLine = function(){ return {itemId:"", itemName:"", unit:"", qty:0, price:0, lineTotal:0, vatPct:12, vatSum:0, totalWithVat:0}; };
    var fs = existing
      ? {id:existing.id, receiptNumber:existing.receiptNumber||wh2FreshReceiptNumber(), date:existing.date||todayISO(), category:existing.category||"xomashyo", warehouseId:existing.warehouseId||"", warehouseName:existing.warehouseName||"", supplierName:existing.supplierName||"", linkedOrderId:existing.linkedOrderId||"", note:existing.note||"", lines:(existing.lines||[]).map(function(x){ return Object.assign({}, x); })}
      : {receiptNumber:wh2FreshReceiptNumber(), date:todayISO(), category:"xomashyo", warehouseId:(STATE.warehouses[0]?STATE.warehouses[0].id:""), warehouseName:(STATE.warehouses[0]?STATE.warehouses[0].name:""), supplierName:"", linkedOrderId:"", note:"", lines:[freshLine()]};
    if(!fs.lines.length) fs.lines.push(freshLine());
    /* Пастда тавсифланган "_pending_" id муаммосидан ҳимояланиш учун —
       қаранг: wh2ReresolveRef изоҳи. */
    (function(){ var whRef = wh2ReresolveRef(fs.warehouseId, fs.warehouseName, STATE.warehouses); fs.warehouseId = whRef.id; fs.warehouseName = whRef.name; })();

    var supplierOptions = STATE.suppliers.map(function(s){ return '<option value="'+esc(s.name)+'">'; }).join("");

    var rowsHtml = function(){
      return fs.lines.map(function(ln,i){
        return '<tr data-wh2row="'+i+'">'+
          '<td class="cell-muted">'+(i+1)+'</td>'+
          '<td><div style="display:flex;gap:4px;align-items:center;">'+itemComboInputHtml("wr-item-"+i, "wr-item-list-"+i, ln.itemId?itemById(ln.itemId):null, "Маҳсулот номи…", "flex:1;min-width:140px;", null, 'data-field="item" data-row="'+i+'"')+'<button type="button" class="btn btn-secondary btn-icon" data-wr-item-pick="'+i+'" title="Рўйхатдан қидириб танлаш" style="flex-shrink:0;">'+ICONS.search+'</button><button type="button" class="btn btn-secondary btn-icon" data-wr-item-add="'+i+'" title="Янги маҳсулот қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></td>'+
          '<td><div style="display:flex;gap:4px;align-items:center;"><select data-field="unit" data-row="'+i+'" style="min-width:88px;">'+wh2UnitOptionsHtml(ln.unit)+'</select><button type="button" class="btn btn-secondary btn-icon" data-wr-unit-add="'+i+'" title="Янги ўлчов бирлиги қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></td>'+
          '<td><input type="number" min="0" step="any" data-field="qty" data-row="'+i+'" value="'+esc(ln.qty)+'" style="width:76px;"></td>'+
          '<td><input type="number" min="0" step="any" data-field="price" data-row="'+i+'" value="'+esc(ln.price)+'" style="width:100px;"></td>'+
          '<td><input type="number" min="0" step="any" data-field="lineTotal" data-row="'+i+'" value="'+esc(ln.lineTotal)+'" style="width:108px;"></td>'+
          '<td><input type="number" min="0" step="any" data-field="vatPct" data-row="'+i+'" value="'+esc(ln.vatPct)+'" style="width:60px;"></td>'+
          '<td><input type="number" min="0" step="any" data-field="vatSum" data-row="'+i+'" value="'+esc(ln.vatSum)+'" style="width:100px;"></td>'+
          '<td><input type="number" min="0" step="any" data-field="totalWithVat" data-row="'+i+'" value="'+esc(ln.totalWithVat)+'" style="width:110px;"></td>'+
          '<td><div style="display:flex;gap:4px;"><button type="button" class="btn btn-ghost btn-icon" data-wh2-addrow="'+i+'" title="Пастига қатор қўшиш">'+ICONS.plus+'</button><button type="button" class="btn btn-ghost btn-icon" data-wh2-delrow="'+i+'" title="Қаторни ўчириш">'+ICONS.trash+'</button></div></td>'+
          '</tr>';
      }).join("");
    };

    var warehouseOptionsHtml = function(){
      return '<option value="">— танланг —</option>'+STATE.warehouses.map(function(w){ return '<option value="'+esc(w.id)+'"'+(fs.warehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>'; }).join("");
    };
    var body = ''+
      '<div class="field-row"><div class="field"><label>Кирим рақами</label><input id="wr-receiptNumber" value="'+esc(fs.receiptNumber)+'"></div>'+
      '<div class="field"><label>Сана</label><input id="wr-date" type="date" value="'+esc(fs.date)+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>Туркум</label><div style="display:flex;gap:6px;"><select id="wr-category" style="flex:1;min-width:0;">'+wh2AllCategories().map(function(c){ return '<option value="'+esc(c.id)+'"'+(fs.category===c.id?" selected":"")+'>'+esc(c.name)+'</option>'; }).join("")+'</select><button type="button" class="btn btn-secondary btn-icon" id="wr-category-add" title="Янги туркум қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
      '<div class="field"><label>Қайси омборга кирим</label><div style="display:flex;gap:6px;"><select id="wr-warehouse" style="flex:1;min-width:0;">'+warehouseOptionsHtml()+'</select><button type="button" class="btn btn-secondary btn-icon" id="wr-warehouse-add" title="Янги омбор қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div></div>'+
      '<div class="field-row"><div class="field"><label>Етказиб берувчи</label><div style="display:flex;gap:6px;"><input id="wr-supplier" list="wr-supplier-list" placeholder="Ташкилот номи" value="'+esc(fs.supplierName)+'" style="flex:1;min-width:0;"><button type="button" class="btn btn-secondary btn-icon" id="wr-supplier-pick" title="Рўйхатдан қидириб танлаш" style="flex-shrink:0;">'+ICONS.search+'</button><button type="button" class="btn btn-secondary btn-icon" id="wr-supplier-add" title="Янги етказиб берувчи қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div><datalist id="wr-supplier-list">'+supplierOptions+'</datalist></div>'+
      '<div class="field"><label>Боғланган буюртма <span class="opt">(ихтиёрий)</span></label><select id="wr-order"><option value="">— танланмаган —</option></select><div class="field-hint">Танланган таъминотчининг Омборлар → Буюртма бўлимидаги буюртмалари.</div></div></div>'+
      '<div class="section-head" style="margin-top:4px;"><h2 style="font-size:13.5px;">Маҳсулотлар</h2></div>'+
      '<div class="table-wrap"><table><thead><tr><th>№</th><th>Маҳсулот</th><th>Бирлик</th><th>Миқдори</th><th>1 тасини нархи</th><th>Жами нархи</th><th>НДС %</th><th>НДС суммаси</th><th>Жами (НДС билан)</th><th></th></tr></thead><tbody id="wrRowsBody">'+rowsHtml()+'</tbody></table></div>'+
      '<div id="wrSummary" style="margin-top:14px;"></div>'+
      '<div class="field" style="margin-top:14px;"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="wr-note">'+esc(fs.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Кирим қўшиш")+'</button>';
    var m = openModal(isEdit?"Киримни таҳрирлаш":"Янги кирим", body, foot, true);
    m.querySelector(".modal").classList.add("xxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    var rowsBody = m.querySelector("#wrRowsBody");
    var orderSel = m.querySelector("#wr-order");
    var supplierInput = m.querySelector("#wr-supplier");

    var currentSupplierMatch = function(){
      var typed = (supplierInput.value||"").trim().toLowerCase();
      if(!typed) return null;
      return STATE.suppliers.find(function(s){ return (s.name||"").trim().toLowerCase()===typed; }) || null;
    };
    var refreshOrderOptions = function(){
      var sup = currentSupplierMatch();
      var orders = sup ? wh2OrdersForSupplier(sup.id) : [];
      var keepVal = fs.linkedOrderId;
      orderSel.innerHTML = '<option value="">— танланмаган —</option>'+orders.map(function(o){
        return '<option value="'+esc(o.id)+'">'+esc(o.orderNumber)+' · '+fmtDateShort(o.date)+'</option>';
      }).join("");
      if(orders.find(function(o){ return o.id===keepVal; })) orderSel.value = keepVal;
      else { fs.linkedOrderId=""; orderSel.value=""; }
    };
    refreshOrderOptions();
    supplierInput.addEventListener("input", refreshOrderOptions);
    supplierInput.addEventListener("change", refreshOrderOptions);
    orderSel.addEventListener("change", function(){ fs.linkedOrderId = orderSel.value; });

    var warehouseSel = m.querySelector("#wr-warehouse");
    var snapshotFields = function(){
      fs.receiptNumber = m.querySelector("#wr-receiptNumber").value;
      fs.date = m.querySelector("#wr-date").value;
      fs.category = m.querySelector("#wr-category").value;
      /* Танланган қиймат бўш бўлса (масалан "_pending_" id реконсилация
         туфайли рўйхатдан тушиб қолган бўлса), олдинги номни йўқотиб
         қўймаймиз — wh2ReresolveRef кейинроқ номи бўйича тиклайди. */
      var whNow = warehouseById(warehouseSel.value);
      fs.warehouseId = warehouseSel.value;
      if(whNow) fs.warehouseName = whNow.name;
      fs.supplierName = supplierInput.value;
      fs.linkedOrderId = orderSel.value;
      fs.note = m.querySelector("#wr-note").value;
    };
    warehouseSel.addEventListener("change", function(){
      var whNow = warehouseById(warehouseSel.value);
      fs.warehouseId = warehouseSel.value;
      fs.warehouseName = whNow ? whNow.name : "";
    });
    var warehouseAddBtn = m.querySelector("#wr-warehouse-add");
    warehouseAddBtn.addEventListener("click", function(){
      snapshotFields();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = fs.id;
      closeModal();
      openWarehouseForm(null, function(newWhId){
        var w = warehouseById(newWhId);
        draft.warehouseId = newWhId||"";
        draft.warehouseName = w?w.name:"";
        openWh2ReceiptForm(draft);
      });
    });
    var categoryAddBtn = m.querySelector("#wr-category-add");
    categoryAddBtn.addEventListener("click", function(){
      snapshotFields();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = fs.id;
      closeModal();
      openWh2CategoryForm(function(newCatId){
        draft.category = newCatId;
        openWh2ReceiptForm(draft);
      });
    });

    /* Жами нархи / НДС суммаси / Жами сумма (НДС билан) — барча
       қаторлар бўйича умумлашма, жадвал остида, Изоҳдан юқорида.
       Ҳар бир қатор ўзгарганда (recalcRow) қайта чизилади. */
    var summaryEl = m.querySelector("#wrSummary");
    var updateWrSummary = function(){
      var totalNoVat=0, totalVat=0, totalWithVat=0;
      fs.lines.forEach(function(ln){ totalNoVat+=Number(ln.lineTotal)||0; totalVat+=Number(ln.vatSum)||0; totalWithVat+=Number(ln.totalWithVat)||0; });
      summaryEl.innerHTML = '<div class="kpi-grid">'+
        '<div class="kpi"><div class="kpi-label">Жами нархи</div><div class="kpi-value" style="font-size:17px;">'+fmtSum(totalNoVat)+'</div></div>'+
        '<div class="kpi"><div class="kpi-label">НДС суммаси</div><div class="kpi-value" style="font-size:17px;">'+fmtSum(totalVat)+'</div></div>'+
        '<div class="kpi tone-accent"><div class="kpi-label">Жами сумма (НДС билан)</div><div class="kpi-value" style="font-size:17px;">'+fmtSum(totalWithVat)+'</div></div>'+
        '</div>';
    };
    updateWrSummary();

    /* Форвард каскад: qty/price → lineTotal → (+vatPct) → vatSum →
       → totalWithVat. Ҳар бир майдон қўлда ҳам ўзгартирилиши мумкин —
       унда фақат ШУ майдондан КЕЙИНГИ (пастроқ) майдонлар қайта
       ҳисобланади, олдинги майдонларга ҳеч қачон орқага қайтиб
       тегилмайди (масалан vatSum қўлда ўзгартирилса, vatPct ёки
       lineTotal ўзгармайди — фақат totalWithVat қайта ҳисобланади). */
    var recalcRow = function(row, changedField){
      var ln = fs.lines[row]; if(!ln) return;
      if(changedField==="qty"||changedField==="price"){
        ln.lineTotal = wh2Round2((Number(ln.qty)||0)*(Number(ln.price)||0));
      }
      if(changedField==="qty"||changedField==="price"||changedField==="lineTotal"||changedField==="vatPct"){
        ln.vatSum = wh2Round2((Number(ln.lineTotal)||0)*(Number(ln.vatPct)||0)/100);
      }
      if(changedField==="qty"||changedField==="price"||changedField==="lineTotal"||changedField==="vatPct"||changedField==="vatSum"){
        ln.totalWithVat = wh2Round2((Number(ln.lineTotal)||0)+(Number(ln.vatSum)||0));
      }
      ["lineTotal","vatSum","totalWithVat"].forEach(function(f){
        if(f===changedField) return;
        var el = rowsBody.querySelector('input[data-field="'+f+'"][data-row="'+row+'"]');
        if(el) el.value = ln[f];
      });
    };
    var resolveRowItem = function(t){
      var row = Number(t.getAttribute("data-row"));
      if(row==null||isNaN(row)) return;
      var ln = fs.lines[row]; if(!ln) return;
      var itm = resolveItemFromComboValue(t.value);
      ln.itemId = itm ? itm.id : "";
      ln.itemName = itm ? itm.name : "";
      if(itm && !ln.unit){
        ln.unit = itm.unit || "";
        var unitSel = rowsBody.querySelector('select[data-field="unit"][data-row="'+row+'"]');
        if(unitSel) unitSel.value = ln.unit;
      }
      if(itm && !Number(ln.price)){
        ln.price = Number(itm.price)||0;
        var priceInput = rowsBody.querySelector('input[data-field="price"][data-row="'+row+'"]');
        if(priceInput) priceInput.value = ln.price;
        recalcRow(row, "price");
      }
    };
    rowsBody.addEventListener("input", function(e){
      var t = e.target, field = t.getAttribute("data-field"), row = Number(t.getAttribute("data-row"));
      if(field==="item"){ resolveRowItem(t); updateWrSummary(); return; }
      if(row==null||isNaN(row)) return;
      var ln = fs.lines[row]; if(!ln) return;
      if(field==="qty"){ ln.qty = Number(t.value)||0; recalcRow(row,"qty"); }
      else if(field==="price"){ ln.price = Number(t.value)||0; recalcRow(row,"price"); }
      else if(field==="lineTotal"){ ln.lineTotal = Number(t.value)||0; recalcRow(row,"lineTotal"); }
      else if(field==="vatPct"){ ln.vatPct = Number(t.value)||0; recalcRow(row,"vatPct"); }
      else if(field==="vatSum"){ ln.vatSum = Number(t.value)||0; recalcRow(row,"vatSum"); }
      else if(field==="totalWithVat"){ ln.totalWithVat = Number(t.value)||0; }
      updateWrSummary();
    });
    rowsBody.addEventListener("change", function(e){
      var t = e.target, field = t.getAttribute("data-field"), row = Number(t.getAttribute("data-row"));
      if(field==="item"){ resolveRowItem(t); updateWrSummary(); return; }
      if(field==="unit" && row!=null && !isNaN(row)){ var ln=fs.lines[row]; if(ln) ln.unit = t.value; }
    });
    rowsBody.addEventListener("click", function(e){
      var addBtn = e.target.closest("[data-wh2-addrow]");
      if(addBtn){
        var idx = Number(addBtn.getAttribute("data-wh2-addrow"));
        fs.lines.splice(idx+1, 0, freshLine());
        rowsBody.innerHTML = rowsHtml();
        updateWrSummary();
        return;
      }
      var delBtn = e.target.closest("[data-wh2-delrow]");
      if(delBtn){
        var idx2 = Number(delBtn.getAttribute("data-wh2-delrow"));
        fs.lines.splice(idx2, 1);
        if(!fs.lines.length) fs.lines.push(freshLine());
        rowsBody.innerHTML = rowsHtml();
        updateWrSummary();
        return;
      }
      var unitAddBtn = e.target.closest("[data-wr-unit-add]");
      if(unitAddBtn){
        var rowIdx = Number(unitAddBtn.getAttribute("data-wr-unit-add"));
        snapshotFields();
        var draft = Object.assign({}, fs);
        if(isEdit) draft.id = fs.id;
        closeModal();
        openUnitForm(null, function(newUnitName){
          draft.lines[rowIdx].unit = newUnitName||"";
          openWh2ReceiptForm(draft);
        });
        return;
      }
      var itemPickBtn = e.target.closest("[data-wr-item-pick]");
      if(itemPickBtn){
        var pickRowIdx = Number(itemPickBtn.getAttribute("data-wr-item-pick"));
        snapshotFields();
        var pickDraft = Object.assign({}, fs);
        if(isEdit) pickDraft.id = fs.id;
        closeModal();
        openItemPickerModal("Маҳсулотни танлаш", STATE.items, function(item){
          if(item) wh2FillItemOnLine(pickDraft.lines[pickRowIdx], item);
          openWh2ReceiptForm(pickDraft);
        }, function(){ openWh2ReceiptForm(pickDraft); });
        return;
      }
      var itemAddBtn = e.target.closest("[data-wr-item-add]");
      if(itemAddBtn){
        var itemRowIdx = Number(itemAddBtn.getAttribute("data-wr-item-add"));
        snapshotFields();
        var itemDraft = Object.assign({}, fs);
        if(isEdit) itemDraft.id = fs.id;
        closeModal();
        openItemForm({name:"", itemType:"xomashyo", unit:UNIT_OPTIONS[0], minQuantity:0, price:0, categoryId:"", location:""}, function(newItemId, newItemName){
          var newItem = itemById(newItemId);
          if(newItem) wh2FillItemOnLine(itemDraft.lines[itemRowIdx], newItem);
          else { itemDraft.lines[itemRowIdx].itemId = newItemId||""; itemDraft.lines[itemRowIdx].itemName = newItemName||""; }
          openWh2ReceiptForm(itemDraft);
        });
        return;
      }
    });

    var supPickBtn = m.querySelector("#wr-supplier-pick");
    if(supPickBtn) supPickBtn.addEventListener("click", function(){
      snapshotFields();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = fs.id;
      closeModal();
      openNameListPickerModal("Етказиб берувчини танлаш", STATE.suppliers, function(name){
        draft.supplierName = name||"";
        draft.linkedOrderId = "";
        openWh2ReceiptForm(draft);
      }, function(){ openWh2ReceiptForm(draft); });
    });
    var supAddBtn = m.querySelector("#wr-supplier-add");
    if(supAddBtn) supAddBtn.addEventListener("click", function(){
      snapshotFields();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = fs.id;
      closeModal();
      /* openSupplierForm янги ташкилот учун id'ни null қайтаради (фақат
         номи кафолатланган) — шунинг учун бу ерда ҳам, худди Буюртма
         формасидаги каби, фақат номи сақланади ва supplierId ҳар доим
         номи бўйича (currentSupplierMatch/wh2ResolveOrCreate) қайта
         аниқланади — null id билан ишлашга ҳеч қандай эҳтиёж қолмайди. */
      openSupplierForm(null, function(supplierId, supplierName){
        draft.supplierName = supplierName||"";
        draft.linkedOrderId = "";
        openWh2ReceiptForm(draft);
      }, function(){ openWh2ReceiptForm(draft); });
    });

    m.querySelector("[data-save]").addEventListener("click", function(){
      snapshotFields();
      var receiptNumber = fs.receiptNumber.trim() || wh2FreshReceiptNumber();
      var supplierNameTrim = fs.supplierName.trim();
      if(!supplierNameTrim){ toast("Етказиб берувчини киритинг"); return; }
      var whRef = wh2ReresolveRef(fs.warehouseId, fs.warehouseName, STATE.warehouses);
      if(!whRef.id){ toast("Қайси омборга кирим қилинаётганини танланг"); return; }
      var validLines = fs.lines.filter(function(ln){ return ln.itemId && Number(ln.qty)>0; }).map(function(ln){
        var itm = itemById(ln.itemId);
        return {
          itemId:ln.itemId, itemName: itm?itm.name:(ln.itemName||"—"), unit: ln.unit||(itm?itm.unit:""),
          qty: Number(ln.qty)||0, price: Number(ln.price)||0, lineTotal: Number(ln.lineTotal)||0,
          vatPct: Number(ln.vatPct)||0, vatSum: Number(ln.vatSum)||0, totalWithVat: Number(ln.totalWithVat)||0
        };
      });
      if(!validLines.length){ toast("Камида битта маҳсулот ва миқдорини киритинг"); return; }
      var supplier = wh2ResolveOrCreate("suppliers", STATE.suppliers, supplierNameTrim);
      var linkedOrder = fs.linkedOrderId ? wh2OrderById(fs.linkedOrderId) : null;
      var data = {
        receiptNumber: receiptNumber, date: fs.date || todayISO(), category: fs.category || "xomashyo",
        warehouseId: whRef.id, warehouseName: whRef.name,
        supplierId: supplier.id, supplierName: supplier.name,
        linkedOrderId: linkedOrder ? linkedOrder.id : "", linkedOrderLabel: linkedOrder ? (linkedOrder.orderNumber+" · "+fmtDateShort(linkedOrder.date)) : "",
        lines: validLines, note: (fs.note||"").trim()
      };
      if(isEdit){
        dbUpdate("wh2Receipts", fs.id, data, STATE.wh2Receipts);
        toast("Кирим янгиланди");
      } else {
        data.cancelled = false;
        data.createdAt = new Date().toISOString();
        dbAdd("wh2Receipts", data, STATE.wh2Receipts);
        toast("Кирим сақланди");
      }
      closeModal();
    });
  }

  function openWh2ReceiptDetail(r){
    if(!r) return;
    var rows = (r.lines||[]).map(function(ln,i){
      return '<tr><td class="cell-muted">'+(i+1)+'</td><td>'+esc(ln.itemName)+'</td><td class="num">'+fmtNum(ln.qty)+'</td><td>'+esc(ln.unit||"—")+'</td><td class="num">'+fmtSum(ln.price)+'</td><td class="num">'+fmtSum(ln.lineTotal)+'</td><td class="num">'+fmtNum(ln.vatPct)+'%</td><td class="num">'+fmtSum(ln.vatSum)+'</td><td class="num cell-strong">'+fmtSum(ln.totalWithVat)+'</td></tr>';
    }).join("");
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Кирим рақами</div><div class="dd">'+esc(r.receiptNumber)+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDateShort(r.date)+'</div></div>'+
      '<div><div class="dl">Туркум</div><div class="dd">'+esc(wh2ReceiptCategoryLabel(r.category))+'</div></div>'+
      '<div><div class="dl">Омбор</div><div class="dd">'+esc(r.warehouseName||warehouseName(r.warehouseId))+'</div></div>'+
      '<div><div class="dl">Етказиб берувчи</div><div class="dd">'+esc(r.supplierName||"—")+'</div></div>'+
      '<div><div class="dl">Боғланган буюртма</div><div class="dd">'+esc(r.linkedOrderLabel||"—")+'</div></div>'+
      '<div><div class="dl">Ҳолат</div><div class="dd">'+(r.cancelled?'<span class="chip chip-critical">Бекор қилинди</span>':'<span class="chip chip-good">Фаол</span>')+(r.isReturn?' <span class="chip chip-accent">Қайтариш</span>':'')+'</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin:14px 0;"><table><thead><tr><th>№</th><th>Маҳсулот</th><th>Миқдори</th><th>Бирлик</th><th>Нархи</th><th>Жами нархи</th><th>НДС %</th><th>НДС суммаси</th><th>Жами (НДС билан)</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div style="text-align:right;font-weight:700;font-size:15px;margin-bottom:6px;">Жами: '+fmtSum(wh2ReceiptTotal(r))+'</div>'+
      (r.note ? '<div class="field"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);line-height:1.5;">'+esc(r.note)+'</div></div>' : '');
    var foot = ''+
      '<button class="btn btn-secondary btn-sm" data-wh2rd-print>'+ICONS.printer+'Чоп этиш</button>'+
      '<button class="btn btn-secondary btn-sm" data-wh2rd-excel>'+ICONS.download+'Excel</button>'+
      '<span style="flex:1"></span>'+
      (r.cancelled
        ? '<button class="btn btn-secondary btn-sm" data-wh2rd-restore>'+ICONS.restore+'Тиклаш</button>'
        : '<button class="btn btn-secondary btn-sm" data-wh2rd-cancel>'+ICONS.ban+'Бекор қилиш</button>')+
      '<button class="btn btn-primary btn-sm" data-wh2rd-edit>'+ICONS.pencil+'Таҳрирлаш</button>';
    var m = openModal(esc(r.receiptNumber), body, foot, true);
    m.querySelector("[data-wh2rd-print]").addEventListener("click", function(){ printWh2Receipt(r); });
    m.querySelector("[data-wh2rd-excel]").addEventListener("click", function(){ exportWh2ReceiptExcel(r); });
    m.querySelector("[data-wh2rd-edit]").addEventListener("click", function(){ closeModal(); openWh2ReceiptForm(r); });
    var cancelBtn = m.querySelector("[data-wh2rd-cancel]");
    if(cancelBtn) cancelBtn.addEventListener("click", function(){
      closeModal();
      openConfirm("Киримни бекор қилиш","«"+r.receiptNumber+"» кирим бекор қилинсинми? Ёзув тарихда сақланиб қолади.","Ҳа, бекор қилиш", function(){ dbUpdate("wh2Receipts", r.id, {cancelled:true}, STATE.wh2Receipts); toast("Бекор қилинди"); }, true);
    });
    var restoreBtn = m.querySelector("[data-wh2rd-restore]");
    if(restoreBtn) restoreBtn.addEventListener("click", function(){
      closeModal();
      openConfirm("Киримни тиклаш","«"+r.receiptNumber+"» кирим қайта тикланиб, фаол ҳолатга қайтарилсинми?","Ҳа, тиклаш", function(){ dbUpdate("wh2Receipts", r.id, {cancelled:false}, STATE.wh2Receipts); toast("Тикланди"); }, true);
    });
  }

  function printWh2Receipt(r){
    if(!r) return;
    var rows = (r.lines||[]).map(function(ln,i){
      return '<tr><td>'+(i+1)+'</td><td>'+esc(ln.itemName)+'</td><td style="text-align:right;">'+fmtNum(ln.qty)+'</td><td>'+esc(ln.unit||"—")+'</td><td style="text-align:right;">'+fmtSum(ln.price)+'</td><td style="text-align:right;">'+fmtSum(ln.lineTotal)+'</td><td style="text-align:right;">'+fmtNum(ln.vatPct)+'%</td><td style="text-align:right;">'+fmtSum(ln.vatSum)+'</td><td style="text-align:right;">'+fmtSum(ln.totalWithVat)+'</td></tr>';
    }).join("");
    var body = '<table>'+
      '<tr><td>Туркум</td><td style="text-align:right;">'+esc(wh2ReceiptCategoryLabel(r.category))+'</td></tr>'+
      '<tr><td>Омбор</td><td style="text-align:right;">'+esc(r.warehouseName||warehouseName(r.warehouseId))+'</td></tr>'+
      '<tr><td>Етказиб берувчи</td><td style="text-align:right;">'+esc(r.supplierName||"—")+'</td></tr>'+
      (r.linkedOrderLabel ? '<tr><td>Боғланган буюртма</td><td style="text-align:right;">'+esc(r.linkedOrderLabel)+'</td></tr>' : '')+
      '</table>'+
      '<table style="margin-top:10px;"><tr><th>№</th><th>Маҳсулот</th><th style="text-align:right;">Миқдори</th><th>Бирлик</th><th style="text-align:right;">Нархи</th><th style="text-align:right;">Жами нархи</th><th style="text-align:right;">НДС %</th><th style="text-align:right;">НДС суммаси</th><th style="text-align:right;">Жами</th></tr>'+rows+'</table>'+
      '<div class="v-total">Жами: '+fmtSum(wh2ReceiptTotal(r))+'</div>'+
      (r.note ? '<div style="margin-top:10px;">Изоҳ: '+esc(r.note)+'</div>' : '')+
      '<div class="v-sign"><div>Топширди</div><div>Қабул қилди</div></div>';
    var html = voucherShell("Омбор 2 — Кирим "+esc(r.receiptNumber), "Сана: "+esc(fmtDateShort(r.date)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

  function exportWh2ReceiptExcel(r){
    if(!r) return;
    var headers = ["№","Маҳсулот","Миқдори","Бирлик","Нархи","Жами нархи","НДС %","НДС суммаси","Жами"];
    var rowsArr = (r.lines||[]).map(function(ln,i){ return [i+1, ln.itemName, fmtNum(ln.qty), ln.unit||"", fmtNum(ln.price), fmtNum(ln.lineTotal), fmtNum(ln.vatPct)+"%", fmtNum(ln.vatSum), fmtNum(ln.totalWithVat)]; });
    rowsArr.unshift(["Кирим рақами", r.receiptNumber, "Сана", fmtDateShort(r.date)]);
    rowsArr.unshift(["Туркум", wh2ReceiptCategoryLabel(r.category), "Омбор", r.warehouseName||warehouseName(r.warehouseId)]);
    rowsArr.unshift(["Етказиб берувчи", r.supplierName||"—"]);
    rowsArr.push([]);
    rowsArr.push(["","","","","","","","Жами:", fmtNum(wh2ReceiptTotal(r))]);
    exportHtmlTableAsExcel("Wh2Kirim_"+r.receiptNumber+".xls", "Кирим "+r.receiptNumber, headers, rowsArr);
  }

