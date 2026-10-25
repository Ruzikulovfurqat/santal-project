  /* ================= lookups / stock helpers ================= */
  function itemById(id){ return STATE.items.find(function(x){return x.id===id;}); }
  function warehouseById(id){ return STATE.warehouses.find(function(x){return x.id===id;}); }
  function warehouseName(id){ var w=warehouseById(id); return w?w.name:"—"; }
  function categoryById(id){ return STATE.categories.find(function(x){return x.id===id;}); }
  function categoryName(id){ var c=categoryById(id); return c?c.name:"—"; }
  function employeeById(id){ return STATE.employees.find(function(x){return x.id===id;}); }
  function employeeName(id){ var e=employeeById(id); return e?e.fullName:"—"; }
  function workshopById(id){ return STATE.workshops.find(function(x){return x.id===id;}); }
  function workshopName(id){ var w=workshopById(id); return w?w.name:"—"; }
  function orderById(id){ return STATE.orders.find(function(x){return x.id===id;}); }
  function stockDocId(itemId, whId){ return itemId+"__"+whId; }
  function getStockDoc(itemId, whId){ return STATE.stock.find(function(s){return s.id===stockDocId(itemId,whId);}); }
  function stockQty(itemId, whId){ var s=getStockDoc(itemId,whId); return s?(Number(s.quantity)||0):0; }
  function totalStockQty(itemId){ return STATE.stock.filter(function(s){return s.itemId===itemId;}).reduce(function(sum,s){return sum+(Number(s.quantity)||0);},0); }
  /* Маҳсулот/хомашё танлаш — танлаш ва қидириш БИТТА майдонда: <input list=…>
     + <datalist> комбинацияси (браузернинг ўзи ёзилган матн бўйича вариантларни
     филтрлаб кўрсатади — алоҳида қидирув қатори керак эмас). Қиймат сифатида
     "Номи (бирлик)" матни ишлатилади, сақлашда эса шу матн орқали item'га
     аниқ мослаштирилади (resolveItemFromComboValue). */
  function itemComboOptionValue(it){ return (it&&it.name||"")+" ("+(it&&it.unit||"")+")"; }
  /* filterFn — ихтиёрий: берилса, комбо рўйхати/ечими фақат шу филтрдан
     ўтган маҳсулотлар билан чекланади (масалан Савдо'да фақат тайёр/ярим
     тайёр маҳсулотлар). Берилмаса — эски хатти-ҳаракат: барча items. */
  function itemComboDatalistHtml(listId, filterFn){
    var pool = filterFn ? STATE.items.filter(filterFn) : STATE.items;
    return '<datalist id="'+listId+'">'+pool.slice().sort(function(a,b){return (a.name||"").localeCompare(b.name||"");}).map(function(it){return '<option value="'+esc(itemComboOptionValue(it))+'">';}).join("")+'</datalist>';
  }
  function itemComboInputHtml(inputId, listId, currentItem, placeholder, extraStyle, filterFn, extraAttrs){
    return '<input type="text" id="'+inputId+'" list="'+listId+'" style="'+(extraStyle||"")+'" '+(extraAttrs||"")+' placeholder="'+esc(placeholder||"Маҳсулот номи — ёзинг ва/ёки рўйхатдан танланг")+'" autocomplete="off" value="'+(currentItem?esc(itemComboOptionValue(currentItem)):"")+'">'+itemComboDatalistHtml(listId, filterFn);
  }
  function resolveItemFromComboValue(val, filterFn){
    val = (val||"").trim();
    if(!val) return null;
    var pool = filterFn ? STATE.items.filter(filterFn) : STATE.items;
    var found = pool.find(function(it){ return itemComboOptionValue(it)===val; });
    if(found) return found;
    var lower = val.toLowerCase();
    found = pool.find(function(it){ return (it.name||"").toLowerCase()===lower; });
    return found || null;
  }
  function setItemComboInputValue(inputId, itemId){
    var elx = document.getElementById(inputId);
    if(!elx) return;
    var it = itemById(itemId);
    elx.value = it ? itemComboOptionValue(it) : "";
  }
  /* Худди шу қидирув механизми мижоз/таъминотчи ва бошқа умумий <select>лар
     учун ҳам — фақат сарлавҳа матни бошқача. */
  function personSelectSearchBoxHtml(searchId){
    return '<div class="search-box" style="margin-bottom:6px;">'+ICONS.search+'<input type="text" id="'+searchId+'" placeholder="Номи бўйича қидириш…" autocomplete="off"></div>';
  }
  function wireItemSelectSearch(searchId, selectId){
    var input = document.getElementById(searchId), select = document.getElementById(selectId);
    if(!input || !select) return;
    input.addEventListener("input", function(){
      var q = input.value.trim().toLowerCase();
      var opts = select.querySelectorAll("option");
      for(var i=0;i<opts.length;i++){
        var opt = opts[i];
        if(!opt.value){ opt.style.display=""; continue; }
        var txt = (opt.textContent||"").toLowerCase();
        opt.style.display = (!q || txt.indexOf(q)!==-1) ? "" : "none";
      }
      /* агар optgroup (масалан "Мижозлар"/"Таъминотчилар") ичидаги барча
         вариантлар яширилган бўлса, гуруҳ сарлавҳасини ҳам яшириш — акс
         ҳолда мос келмаган гуруҳ бўш ҳолда кўриниб қолади. */
      var groups = select.querySelectorAll("optgroup");
      for(var g=0; g<groups.length; g++){
        var grp = groups[g];
        var childOpts = grp.querySelectorAll("option"), anyVisible = false;
        for(var j=0;j<childOpts.length;j++){ if(childOpts[j].style.display!=="none"){ anyVisible = true; break; } }
        grp.style.display = anyVisible ? "" : "none";
      }
    });
  }
  /* Ходимни БИТТА майдонда қидириш ва танлаш (itemComboInputHtml'га ўхшаш —
     алоҳида қидирув қутиси + пастда алоҳида <select> эмас, балки ёзиш ва
     танлаш бир хил <input list=datalist> ичида). Ҳозирча фақат "Асосий
     ускуналар" кирим формасидаги "Жавобгар шахс" майдонида ишлатилади —
     бошқа жойлардаги эски (қидирув қутиси + select) андозаси ўзгаришсиз
     қолади. */
  function personComboOptionValue(e){ return (e.fullName||"")+(e.position?(" — "+e.position):""); }
  function personComboInputHtml(inputId, listId, currentEmployeeId, placeholder, extraStyle){
    var pool = STATE.employees.slice().sort(function(a,b){ return (a.fullName||"").localeCompare(b.fullName||""); });
    var cur = currentEmployeeId ? employeeById(currentEmployeeId) : null;
    return '<input type="text" id="'+inputId+'" list="'+listId+'" style="'+(extraStyle||"")+'" placeholder="'+esc(placeholder||"Исми бўйича қидириш ва танлаш")+'" autocomplete="off" value="'+(cur?esc(personComboOptionValue(cur)):"")+'">'+
      '<datalist id="'+listId+'">'+pool.map(function(e){ return '<option value="'+esc(personComboOptionValue(e))+'">'; }).join("")+'</datalist>';
  }
  function resolvePersonFromComboValue(val){
    val = (val||"").trim();
    if(!val) return null;
    var found = STATE.employees.find(function(e){ return personComboOptionValue(e)===val; });
    if(found) return found;
    var lower = val.toLowerCase();
    return STATE.employees.find(function(e){ return (e.fullName||"").toLowerCase()===lower; }) || null;
  }
  function setPersonComboInputValue(inputId, employeeId){
    var elx = document.getElementById(inputId);
    if(!elx) return;
    var e = employeeById(employeeId);
    elx.value = e ? personComboOptionValue(e) : "";
  }
  /* Номлар рўйхатини (мижозлар, таъминотчилар ва ш.к.) қидирув майдони
     билан алоҳида ойнада кўрсатиш — масалан рўйхатда "Диллер" сўзи бор
     номлар бўлса, қидирувга "ди" ёзилса, шуларгина қолади. Танланганда
     onPicked(name) чақирилади; ёпилганда (ёки танлангандан кейин) чақирувчи
     ўзи керакли асосий формани қайта очиши керак — бу ерда шунчаки
     modalRoot'ни бекор қилиб қўяди, худди "+" тезкор қўшиш тугмалари каби. */
  function openNameListPickerModal(title, list, onPicked, onClose){
    var sorted = list.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    var body = personSelectSearchBoxHtml("nlp-search")+'<div id="nlp-list" style="max-height:380px;overflow-y:auto;"></div>';
    var m = openModal(title, body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onClose) onClose(); });
    var listEl = m.querySelector("#nlp-list");
    if(!sorted.length){
      listEl.innerHTML = emptyState("Рўйхат бўш","Ҳали ёзув йўқ — «+» тугмаси орқали қўшинг.");
    } else {
      listEl.innerHTML = '<div class="table-wrap"><table><tbody>'+sorted.map(function(p){
        return '<tr class="nlp-row" data-id="'+esc(p.id)+'" style="cursor:pointer;"><td class="cell-strong">'+esc(p.name)+'</td><td style="text-align:right;width:24px;">'+ICONS.arrowRight+'</td></tr>';
      }).join("")+'</tbody></table></div>';
      listEl.querySelectorAll(".nlp-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var id = rowEl.getAttribute("data-id");
          var p = sorted.find(function(x){return x.id===id;});
          closeModal();
          onPicked(p ? p.name : "");
        });
      });
    }
    m.querySelector("#nlp-search").addEventListener("input", function(){
      var q = this.value.trim().toLowerCase();
      m.querySelectorAll(".nlp-row").forEach(function(rowEl){
        var txt = (rowEl.textContent||"").toLowerCase();
        rowEl.style.display = (!q || txt.indexOf(q)>-1) ? "" : "none";
      });
    });
  }
  /* openNameListPickerModal'нинг маҳсулотлар учун варианти — фарқи:
     танланганда onPicked(name) эмас, TO'LIQ маҳсулот объекти
     (onPicked(item)) қайтарилади, чунки чақирувчига itemId ва unit ҳам
     керак бўлади (масалан Омбор 2 → Кирим қатори). Қаторда маҳсулот
     номи ва ўлчов бирлиги кўрсатилади; қидирув шу иккисидан бирида
     топилса ҳам мос келади. */
  function openItemPickerModal(title, itemsList, onPicked, onClose){
    var sorted = itemsList.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    var body = personSelectSearchBoxHtml("ipk-search")+'<div id="ipk-list" style="max-height:380px;overflow-y:auto;"></div>';
    var m = openModal(title, body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onClose) onClose(); });
    var listEl = m.querySelector("#ipk-list");
    if(!sorted.length){
      listEl.innerHTML = emptyState("Рўйхат бўш","Ҳали маҳсулот йўқ — «+» тугмаси орқали қўшинг.");
    } else {
      listEl.innerHTML = '<div class="table-wrap"><table><tbody>'+sorted.map(function(it){
        return '<tr class="ipk-row" data-id="'+esc(it.id)+'" style="cursor:pointer;"><td class="cell-strong">'+esc(it.name)+'</td><td class="cell-muted" style="text-align:right;">'+esc(it.unit||"—")+'</td><td style="text-align:right;width:24px;">'+ICONS.arrowRight+'</td></tr>';
      }).join("")+'</tbody></table></div>';
      listEl.querySelectorAll(".ipk-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var id = rowEl.getAttribute("data-id");
          var it = sorted.find(function(x){return x.id===id;});
          closeModal();
          onPicked(it||null);
        });
      });
    }
    m.querySelector("#ipk-search").addEventListener("input", function(){
      var q = this.value.trim().toLowerCase();
      m.querySelectorAll(".ipk-row").forEach(function(rowEl){
        var txt = (rowEl.textContent||"").toLowerCase();
        rowEl.style.display = (!q || txt.indexOf(q)>-1) ? "" : "none";
      });
    });
  }
  /* Кўп танловли (checkbox) пикер — масалан бир нечта цех ёки бир нечта
     туркумни бирданига белгилаш учун (Омбор 2 → Қолдиқ ҳисоботлари).
     "Барчасини танлаш" тугмаси рўйхатдаги ҳаммасини бир зумда белгилаб
     қўяди. "Тайёр" босилганда onApply(тanlangan id'lar массиви) чақирилади
     — чақирувчи форма ёпилмайди, фақат тугма ёзуви/ҳолати янгиланади. */
  function openMultiCheckPickerModal(title, list, selectedIds, onApply){
    var working = (selectedIds||[]).slice();
    var body = personSelectSearchBoxHtml("mcp-search")+
      '<div class="field-row" style="margin:10px 0;"><label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;cursor:pointer;"><input type="checkbox" id="mcp-all" style="width:17px;height:17px;">Барчасини танлаш</label></div>'+
      '<div id="mcp-list" style="max-height:360px;overflow-y:auto;"></div>';
    var m = openModal(title, body, '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-apply>Тайёр</button>', true);
    var listEl = m.querySelector("#mcp-list");
    var allCb = m.querySelector("#mcp-all");
    function isChecked(id){ return working.indexOf(id)>-1; }
    function syncAllCb(){ allCb.checked = list.length>0 && list.every(function(x){ return isChecked(x.id); }); }
    function renderList(){
      if(!list.length){ listEl.innerHTML = emptyState("Рўйхат бўш","Ҳали ёзув йўқ."); return; }
      listEl.innerHTML = '<div class="table-wrap"><table><tbody>'+list.map(function(x){
        return '<tr class="mcp-row"><td style="width:30px;"><input type="checkbox" class="mcp-item" data-id="'+esc(x.id)+'" '+(isChecked(x.id)?"checked":"")+' style="width:17px;height:17px;"></td><td class="cell-strong">'+esc(x.name)+'</td></tr>';
      }).join("")+'</tbody></table></div>';
      listEl.querySelectorAll(".mcp-item").forEach(function(cb){
        cb.addEventListener("change", function(){
          var id = cb.getAttribute("data-id");
          if(cb.checked){ if(working.indexOf(id)===-1) working.push(id); }
          else { working = working.filter(function(x){ return x!==id; }); }
          syncAllCb();
        });
      });
      listEl.querySelectorAll(".mcp-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(e){
          if(e.target && e.target.classList && e.target.classList.contains("mcp-item")) return;
          var cb = rowEl.querySelector(".mcp-item"); if(cb){ cb.checked=!cb.checked; cb.dispatchEvent(new Event("change")); }
        });
      });
      syncAllCb();
    }
    renderList();
    allCb.addEventListener("change", function(){
      working = allCb.checked ? list.map(function(x){ return x.id; }) : [];
      renderList();
    });
    m.querySelector("#mcp-search").addEventListener("input", function(){
      var q = this.value.trim().toLowerCase();
      m.querySelectorAll(".mcp-row").forEach(function(rowEl){
        var txt = (rowEl.textContent||"").toLowerCase();
        rowEl.style.display = (!q || txt.indexOf(q)>-1) ? "" : "none";
      });
    });
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-apply]").addEventListener("click", function(){ closeModal(); onApply(working); });
  }
  function setStockQty(itemId, whId, qty){
    var id = stockDocId(itemId, whId);
    dbSet("stock", id, {itemId:itemId, warehouseId:whId, quantity:Math.max(0,Number(qty)||0), updatedAt:new Date().toISOString()}, STATE.stock);
  }
  function adjustStockBy(itemId, whId, delta){ setStockQty(itemId, whId, stockQty(itemId,whId)+delta); }
  /* Ишлаб чиқаришда хомашё сарфланганда — хомашёнинг ЖАМИ (барча
     омборлар бўйича) қолдиғидан олинади: аввал танланган (чиқарилган
     маҳсулот сақланадиган) омбордан, у етарли бўлмаса — қолганини
     хомашё мавжуд бўлган бошқа омборлардан (энг кўп қолдиғи борларидан
     бошлаб) ёзиб олади. Якуний натижада омбордаги хомашёнинг умумий
     қолдиғи тўғри камаяди, айнан қайси омборда турганидан қатъий назар. */
  function consumeItemAcrossWarehouses(itemId, qtyToConsume, preferWhId){
    var remaining = Number(qtyToConsume)||0;
    if(!itemId || remaining<=0) return;
    if(preferWhId){
      var primaryAvail = stockQty(itemId, preferWhId);
      var takePrimary = Math.min(remaining, Math.max(0, primaryAvail));
      if(takePrimary>0){ adjustStockBy(itemId, preferWhId, -takePrimary); remaining -= takePrimary; }
    }
    if(remaining<=0) return;
    var others = STATE.stock.filter(function(s){ return s.itemId===itemId && s.warehouseId!==preferWhId && (Number(s.quantity)||0)>0; })
      .slice().sort(function(a,b){ return (Number(b.quantity)||0)-(Number(a.quantity)||0); });
    for(var i=0; i<others.length && remaining>0; i++){
      var s = others[i];
      var take = Math.min(remaining, Number(s.quantity)||0);
      if(take>0){ adjustStockBy(itemId, s.warehouseId, -take); remaining -= take; }
    }
  }
  function itemTypeChip(t){
    var map = {xomashyo:["Хомашё","chip-neutral"], yarim_tayyor:["Ярим тайёр","chip-accent"], mahsulot:["Тайёр маҳсулот","chip-good"], tovar:["Товар","chip-warning"]};
    var v = map[t]||["—","chip-neutral"];
    return '<span class="chip '+v[1]+'">'+v[0]+'</span>';
  }
  /* itemTypeChip'нинг оддий матн (HTML chip'сиз) варианти — маҳсулот
     танлаш майдонлари остида "Тури: ..." каби қисқа маълумот сатрларида
     ишлатиш учун. */
  function itemTypeLabel(t){
    var map = {xomashyo:"Хомашё", yarim_tayyor:"Ярим тайёр маҳсулот", mahsulot:"Тайёр маҳсулот", tovar:"Товар"};
    return map[t]||"—";
  }
  function stockStatusChip(totalQty, minQty, maxQty){
    minQty = Number(minQty)||0;
    maxQty = Number(maxQty)||0;
    if(totalQty<=0) return '<span class="chip chip-critical">'+ICONS.alert+'Тугаган</span>';
    if(maxQty>0 && totalQty>maxQty) return '<span class="chip chip-critical">'+ICONS.alert+'Меъёридан ошди</span>';
    if(totalQty<=minQty) return '<span class="chip chip-warning">'+ICONS.alert+'Кам қолди</span>';
    return '<span class="chip chip-good">Етарли</span>';
  }

