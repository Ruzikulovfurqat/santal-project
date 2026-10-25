  /* ================= Омбор 2: Чиқим =================
     МУСТАҚИЛ регистр — Буюртма/Кирим бўлимлари каби, асосий омбор
     қолдиғига (STATE.stock) АСЛО таъсир қилмайди. Маҳсулот танлаш
     фақат "товар" (mahsulot) ва "хом ашё" (xomashyo) турлари билан
     чекланади — ярим тайёр маҳсулотлар бу ерда танланмайди. */
  function isWh2ChikimItem(it){ return it && (it.itemType==="xomashyo" || it.itemType==="mahsulot" || it.itemType==="tovar"); }
  function wh2ChikimById(id){ return STATE.wh2Chikims.find(function(x){ return x.id===id; }); }
  function wh2FreshChikimNumber(){ return "OMB2-CHIKIM-"+new Date().getFullYear()+"-"+String(STATE.wh2Chikims.length+1).padStart(3,"0"); }
  function wh2ChikimTotal(c){ return (c.lines||[]).reduce(function(s,ln){ return s+(Number(ln.lineTotal)||0); },0); }

  function renderWh2Chikim(){
    var list = STATE.wh2Chikims.slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    setTopbar("Омбор 2 — Чиқим", list.length+" та чиқим",
      '<button class="btn btn-primary" id="wh2AddChikimBtn">'+ICONS.plus+'Яратиш</button>'+
      '<button class="btn btn-secondary" id="wh2ChikimReturnBtn" style="margin-left:8px;">'+ICONS.swap+'Қайтариш</button>');
    var root = document.getElementById("content");
    var html = wh2Subnav("chikim");
    if(!list.length){
      html += emptyState("Ҳали чиқим йўқ","«Яратиш» тугмаси орқали биринчи чиқимни киритинг.");
    } else {
      var rows = list.map(function(c){
        var st = c.cancelled ? '<span class="chip chip-critical">Бекор қилинди</span>' : '<span class="chip chip-good">Фаол</span>';
        var actions = '<div class="row-actions">'+
          '<button class="btn btn-ghost btn-icon" data-wh2c-view="'+c.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-wh2c-edit="'+c.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-wh2c-print="'+c.id+'" title="Қоғозга чиқариш">'+ICONS.printer+'</button>'+
          '<button class="btn btn-ghost btn-icon" data-wh2c-excel="'+c.id+'" title="Excelга юклаш">'+ICONS.download+'</button>'+
          (c.cancelled
            ? '<button class="btn btn-ghost btn-icon" data-wh2c-restore="'+c.id+'" title="Тиклаш">'+ICONS.restore+'</button>'
            : '<button class="btn btn-ghost btn-icon" data-wh2c-cancel="'+c.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
          '</div>';
        return '<tr>'+
          '<td class="cell-strong">'+esc(c.chikimNumber)+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(c.date)+'</td>'+
          '<td class="cell-muted">'+esc(c.warehouseName||warehouseName(c.warehouseId))+'</td>'+
          '<td>'+esc(c.workshopName||"—")+'</td>'+
          '<td>'+esc(c.takenByName||"—")+'</td>'+
          '<td class="num cell-strong">'+fmtSum(wh2ChikimTotal(c))+'</td>'+
          '<td>'+st+'</td>'+
          '<td>'+actions+'</td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Чиқим рақами</th><th>Сана</th><th>Омбор</th><th>Цех</th><th>Ким олди</th><th>Жами суммаси</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireWh2Subnav(root);
    document.getElementById("wh2AddChikimBtn").addEventListener("click", function(){ openWh2ChikimForm(null); });
    var retBtn = document.getElementById("wh2ChikimReturnBtn");
    if(retBtn) retBtn.addEventListener("click", function(){ openWh2ChikimReturnPicker(); });
    root.querySelectorAll("[data-wh2c-view]").forEach(function(b){ b.addEventListener("click", function(){ openWh2ChikimDetail(wh2ChikimById(b.getAttribute("data-wh2c-view"))); }); });
    root.querySelectorAll("[data-wh2c-edit]").forEach(function(b){ b.addEventListener("click", function(){ openWh2ChikimForm(wh2ChikimById(b.getAttribute("data-wh2c-edit"))); }); });
    root.querySelectorAll("[data-wh2c-print]").forEach(function(b){ b.addEventListener("click", function(){ printWh2Chikim(wh2ChikimById(b.getAttribute("data-wh2c-print"))); }); });
    root.querySelectorAll("[data-wh2c-excel]").forEach(function(b){ b.addEventListener("click", function(){ exportWh2ChikimExcel(wh2ChikimById(b.getAttribute("data-wh2c-excel"))); }); });
    root.querySelectorAll("[data-wh2c-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var c = wh2ChikimById(b.getAttribute("data-wh2c-cancel")); if(!c) return;
      openConfirm("Чиқимни бекор қилиш","«"+c.chikimNumber+"» чиқим бекор қилинсинми? Ёзув тарихда сақланиб қолади ва хоҳласангиз кейин қайта тиклашингиз мумкин.","Ҳа, бекор қилиш", function(){ dbUpdate("wh2Chikims", c.id, {cancelled:true}, STATE.wh2Chikims); toast("Бекор қилинди"); }, true);
    }); });
    root.querySelectorAll("[data-wh2c-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var c = wh2ChikimById(b.getAttribute("data-wh2c-restore")); if(!c) return;
      openConfirm("Чиқимни тиклаш","«"+c.chikimNumber+"» чиқим қайта тикланиб, фаол ҳолатга қайтарилсинми?","Ҳа, тиклаш", function(){ dbUpdate("wh2Chikims", c.id, {cancelled:false}, STATE.wh2Chikims); toast("Тикланди"); }, true);
    }); });
  }

  /* Тепадаги "Қайтариш" тугмаси — фаол (бекор қилинмаган) чиқимлар
     рўйхатидан бирини танлаб, уни бекор қилиш (яъни олинган материални
     "қайтариш") имконини беради. Жадвалдаги қаторнинг ўзидаги "Бекор
     қилиш" тугмаси худди шу амални аниқ битта ёзув учун такрорлайди. */
  function openWh2ChikimReturnPicker(){
    var active = STATE.wh2Chikims.filter(function(c){ return !c.cancelled; }).slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    var body = personSelectSearchBoxHtml("wcret-search")+'<div id="wcret-list" style="max-height:380px;overflow-y:auto;"></div>';
    var m = openModal("Чиқимни қайтариш", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    var listEl = m.querySelector("#wcret-list");
    if(!active.length){
      listEl.innerHTML = emptyState("Фаол чиқим йўқ","Қайтариш учун фаол (бекор қилинмаган) чиқим топилмади.");
    } else {
      listEl.innerHTML = '<div class="table-wrap"><table><tbody>'+active.map(function(c){
        return '<tr class="wcret-row" data-id="'+esc(c.id)+'" style="cursor:pointer;"><td class="cell-strong">'+esc(c.chikimNumber)+'</td><td class="cell-muted">'+fmtDateShort(c.date)+'</td><td class="cell-muted">'+esc(c.workshopName||"—")+'</td><td class="cell-muted">'+esc(c.takenByName||"—")+'</td><td class="num">'+fmtSum(wh2ChikimTotal(c))+'</td></tr>';
      }).join("")+'</tbody></table></div>';
      listEl.querySelectorAll(".wcret-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var id = rowEl.getAttribute("data-id");
          var c = active.find(function(x){ return x.id===id; });
          closeModal();
          if(!c) return;
          openConfirm("Чиқимни қайтариш","«"+c.chikimNumber+"» чиқим қайтарилиб (бекор қилиниб), тарихда сақланиб қолсинми?","Ҳа, қайтариш", function(){ dbUpdate("wh2Chikims", c.id, {cancelled:true}, STATE.wh2Chikims); toast("Қайтарилди"); }, true);
        });
      });
    }
    m.querySelector("#wcret-search").addEventListener("input", function(){
      var q = this.value.trim().toLowerCase();
      m.querySelectorAll(".wcret-row").forEach(function(rowEl){
        var txt = (rowEl.textContent||"").toLowerCase();
        rowEl.style.display = (!q || txt.indexOf(q)>-1) ? "" : "none";
      });
    });
  }

  function openWh2ChikimForm(existing){
    /* "existing" — ёки таҳрирланаётган сақланган ёзув (.id бор), ёки "+"
       тезкор-қўшиш оқимидан қайтган драфт (.id йўқ) — иккинчиси ҳеч қачон
       ташлаб юборилмаслиги керак, худди openWh2ReceiptForm'даги каби. */
    var isEdit = !!(existing && existing.id);
    var freshLine = function(){ return {itemId:"", itemName:"", unit:"", qty:0, price:0, lineTotal:0}; };
    var fs = existing
      ? {id:existing.id, chikimNumber:existing.chikimNumber||wh2FreshChikimNumber(), date:existing.date||todayISO(), warehouseId:existing.warehouseId||"", warehouseName:existing.warehouseName||"", workshopId:existing.workshopId||"", workshopName:existing.workshopName||"", takenByEmployeeId:existing.takenByEmployeeId||"", takenByName:existing.takenByName||"", note:existing.note||"", lines:(existing.lines||[]).map(function(x){ return Object.assign({}, x); })}
      : {chikimNumber:wh2FreshChikimNumber(), date:todayISO(), warehouseId:(STATE.warehouses[0]?STATE.warehouses[0].id:""), warehouseName:(STATE.warehouses[0]?STATE.warehouses[0].name:""), workshopId:"", workshopName:"", takenByEmployeeId:"", takenByName:"", note:"", lines:[freshLine()]};
    if(!fs.lines.length) fs.lines.push(freshLine());
    /* "_pending_" id реконсилация муаммосидан ҳимоя — қаранг:
       wh2ReresolveRef изоҳи (Кирим формасида ҳам худди шундай). */
    (function(){
      var whRef = wh2ReresolveRef(fs.warehouseId, fs.warehouseName, STATE.warehouses);
      fs.warehouseId = whRef.id; fs.warehouseName = whRef.name;
      var wsRef = wh2ReresolveRef(fs.workshopId, fs.workshopName, STATE.workshops);
      fs.workshopId = wsRef.id; fs.workshopName = wsRef.name;
      var empRef = wh2ReresolveRef(fs.takenByEmployeeId, fs.takenByName, STATE.employees, "fullName");
      fs.takenByEmployeeId = empRef.id; fs.takenByName = empRef.name;
    })();

    var warehouseOptionsHtml = function(){
      return '<option value="">— танланг —</option>'+STATE.warehouses.map(function(w){ return '<option value="'+esc(w.id)+'"'+(fs.warehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>'; }).join("");
    };
    var workshopOptionsHtml = function(){
      return '<option value="">— танланг —</option>'+STATE.workshops.map(function(w){ return '<option value="'+esc(w.id)+'"'+(fs.workshopId===w.id?" selected":"")+'>'+esc(w.name)+'</option>'; }).join("");
    };
    var employeeOptionsHtml = function(){
      return '<option value="">— танланг —</option>'+STATE.employees.map(function(e){ return '<option value="'+esc(e.id)+'"'+(fs.takenByEmployeeId===e.id?" selected":"")+'>'+esc(e.fullName)+'</option>'; }).join("");
    };

    /* 6-босқич (2026-09): "Бирлик" катаги маҳсулот номидан кейин ЎША ерда
       омбордаги жорий қолдиқни ҳам кўрсатади — фойдаланувчи маҳсулотни
       танлагач қанча қолгани дарҳол кўзга ташланиши учун. Танланган омбор
       ўзгарса (yoki qator qo'shilsa/o'chirilsa) rowsHtml() qayta chaqirilib
       qiymatlar yangilanadi. */
    var unitBalanceCellHtml = function(ln){
      if(!ln.itemId) return esc(ln.unit||"—");
      var bal = wh2CurrentWarehouseBalance(ln.itemId, fs.warehouseId, isEdit?fs.id:null);
      return esc(ln.unit||"—")+' <span class="cell-muted" style="font-size:11.5px;">· Қолдиқ: '+fmtNum(bal)+'</span>';
    };
    var rowsHtml = function(){
      return fs.lines.map(function(ln,i){
        return '<tr data-wh2row="'+i+'">'+
          '<td class="cell-muted">'+(i+1)+'</td>'+
          '<td><div style="display:flex;gap:4px;align-items:center;">'+itemComboInputHtml("wc-item-"+i, "wc-item-list-"+i, ln.itemId?itemById(ln.itemId):null, "Маҳсулот номи…", "flex:1;min-width:140px;", isWh2ChikimItem, 'data-field="item" data-row="'+i+'"')+'<button type="button" class="btn btn-secondary btn-icon" data-wc-item-pick="'+i+'" title="Рўйхатдан қидириб танлаш" style="flex-shrink:0;">'+ICONS.search+'</button><button type="button" class="btn btn-secondary btn-icon" data-wc-item-add="'+i+'" title="Янги маҳсулот қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></td>'+
          '<td class="cell-muted" data-unit-cell="'+i+'">'+unitBalanceCellHtml(ln)+'</td>'+
          '<td><input type="number" min="0" step="any" data-field="qty" data-row="'+i+'" value="'+esc(ln.qty)+'" style="width:90px;"></td>'+
          '<td><input type="number" min="0" step="any" data-field="price" data-row="'+i+'" value="'+esc(ln.price)+'" style="width:110px;"></td>'+
          '<td class="num cell-strong" data-total-cell="'+i+'">'+fmtSum(ln.lineTotal)+'</td>'+
          '<td><div style="display:flex;gap:4px;"><button type="button" class="btn btn-ghost btn-icon" data-wh2-addrow="'+i+'" title="Пастига қатор қўшиш">'+ICONS.plus+'</button><button type="button" class="btn btn-ghost btn-icon" data-wh2-delrow="'+i+'" title="Қаторни ўчириш">'+ICONS.trash+'</button></div></td>'+
          '</tr>';
      }).join("");
    };

    var body = ''+
      '<div class="field-row"><div class="field"><label>Тартиб рақами</label><input id="wc-number" value="'+esc(fs.chikimNumber)+'"></div>'+
      '<div class="field"><label>Сана</label><input id="wc-date" type="date" value="'+esc(fs.date)+'"></div></div>'+
      '<div class="field-row" style="grid-template-columns:1fr 1fr 1fr;">'+
        '<div class="field"><label>Омбор</label><div style="display:flex;gap:6px;"><select id="wc-warehouse" style="flex:1;min-width:0;">'+warehouseOptionsHtml()+'</select><button type="button" class="btn btn-secondary btn-icon" id="wc-warehouse-add" title="Янги омбор қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
        '<div class="field"><label>Цех</label><div style="display:flex;gap:6px;"><select id="wc-workshop" style="flex:1;min-width:0;">'+workshopOptionsHtml()+'</select><button type="button" class="btn btn-secondary btn-icon" id="wc-workshop-add" title="Янги цех қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
        '<div class="field"><label>Ким олиб кетди</label><div style="display:flex;gap:6px;"><select id="wc-takenby" style="flex:1;min-width:0;">'+employeeOptionsHtml()+'</select><button type="button" class="btn btn-secondary btn-icon" id="wc-takenby-add" title="Янги ходим қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
      '</div>'+
      '<div class="section-head" style="margin-top:4px;"><h2 style="font-size:13.5px;">Маҳсулотлар (омбордаги қолдиқ товар/хом ашё)</h2></div>'+
      '<div class="table-wrap"><table><thead><tr><th>№</th><th>Маҳсулот</th><th>Бирлик</th><th>Миқдори</th><th>Нархи</th><th>Жами</th><th></th></tr></thead><tbody id="wcRowsBody">'+rowsHtml()+'</tbody></table></div>'+
      '<div id="wcTotal" style="text-align:right;font-weight:700;font-size:15px;margin-top:10px;">Жами: '+fmtSum(0)+'</div>'+
      '<div class="field" style="margin-top:14px;"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="wc-note">'+esc(fs.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Чиқим қўшиш")+'</button>';
    var m = openModal(isEdit?"Чиқимни таҳрирлаш":"Янги чиқим", body, foot, true);
    m.querySelector(".modal").classList.add("xxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    var rowsBody = m.querySelector("#wcRowsBody");
    var warehouseSel = m.querySelector("#wc-warehouse");
    var workshopSel = m.querySelector("#wc-workshop");
    var takenBySel = m.querySelector("#wc-takenby");
    var totalEl = m.querySelector("#wcTotal");

    var snapshotFields = function(){
      fs.chikimNumber = m.querySelector("#wc-number").value;
      fs.date = m.querySelector("#wc-date").value;
      /* Бўш танланган қиймат (масалан "_pending_" id реконсилация
         туфайли рўйхатдан тушиб қолган бўлса) олдинги номни йўқотиб
         юбормайди — wh2ReresolveRef кейинроқ номи бўйича тиклайди. */
      var whNow = warehouseById(warehouseSel.value);
      fs.warehouseId = warehouseSel.value;
      if(whNow) fs.warehouseName = whNow.name;
      var wsNow = workshopById(workshopSel.value);
      fs.workshopId = workshopSel.value;
      if(wsNow) fs.workshopName = wsNow.name;
      var empNow = employeeById(takenBySel.value);
      fs.takenByEmployeeId = takenBySel.value;
      if(empNow) fs.takenByName = empNow.fullName;
      fs.note = m.querySelector("#wc-note").value;
    };
    warehouseSel.addEventListener("change", function(){
      var whNow = warehouseById(warehouseSel.value);
      fs.warehouseId = warehouseSel.value; fs.warehouseName = whNow?whNow.name:"";
      /* Омбор ўзгарса — "Қолдиқ: X" кўрсаткичи ҳам шу омборга мос
         бўлиши учун қаторларни қайта чизиб чиқамиз (fs.lines'даги
         қийматларнинг ўзи йўқолмайди, чунки rowsHtml() ҳар доим
         fs.lines'дан ўқийди). */
      rowsBody.innerHTML = rowsHtml();
    });
    workshopSel.addEventListener("change", function(){
      var wsNow = workshopById(workshopSel.value);
      fs.workshopId = workshopSel.value; fs.workshopName = wsNow?wsNow.name:"";
    });
    takenBySel.addEventListener("change", function(){
      var empNow = employeeById(takenBySel.value);
      fs.takenByEmployeeId = takenBySel.value; fs.takenByName = empNow?empNow.fullName:"";
    });

    m.querySelector("#wc-warehouse-add").addEventListener("click", function(){
      snapshotFields();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = fs.id;
      closeModal();
      openWarehouseForm(null, function(newId){
        var w = warehouseById(newId);
        draft.warehouseId = newId||""; draft.warehouseName = w?w.name:"";
        openWh2ChikimForm(draft);
      });
    });
    m.querySelector("#wc-workshop-add").addEventListener("click", function(){
      snapshotFields();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = fs.id;
      closeModal();
      openWorkshopForm(null, function(newId){
        var w = workshopById(newId);
        draft.workshopId = newId||""; draft.workshopName = w?w.name:"";
        openWh2ChikimForm(draft);
      });
    });
    m.querySelector("#wc-takenby-add").addEventListener("click", function(){
      snapshotFields();
      var draft = Object.assign({}, fs);
      if(isEdit) draft.id = fs.id;
      closeModal();
      openEmployeeForm(null, function(empId){
        var e = employeeById(empId);
        draft.takenByEmployeeId = empId||""; draft.takenByName = e?e.fullName:"";
        openWh2ChikimForm(draft);
      });
    });

    var updateWcTotal = function(){
      var sum = fs.lines.reduce(function(s,ln){ return s+(Number(ln.lineTotal)||0); },0);
      totalEl.textContent = "Жами: "+fmtSum(sum);
    };
    var recalcChikimRow = function(row){
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
      if(unitCell) unitCell.innerHTML = unitBalanceCellHtml(ln);
      if(itm && !Number(ln.price)){
        ln.price = Number(itm.price)||0;
        var priceInput = rowsBody.querySelector('input[data-field="price"][data-row="'+row+'"]');
        if(priceInput) priceInput.value = ln.price;
      }
      recalcChikimRow(row);
      updateWcTotal();
    };
    rowsBody.addEventListener("input", function(e){
      var t = e.target, field = t.getAttribute("data-field"), row = Number(t.getAttribute("data-row"));
      if(field==="item"){ resolveRowItem(t); return; }
      if(row==null||isNaN(row)) return;
      var ln = fs.lines[row]; if(!ln) return;
      if(field==="qty"){ ln.qty = Number(t.value)||0; recalcChikimRow(row); }
      else if(field==="price"){ ln.price = Number(t.value)||0; recalcChikimRow(row); }
      updateWcTotal();
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
        updateWcTotal();
        return;
      }
      var delBtn = e.target.closest("[data-wh2-delrow]");
      if(delBtn){
        var idx2 = Number(delBtn.getAttribute("data-wh2-delrow"));
        fs.lines.splice(idx2, 1);
        if(!fs.lines.length) fs.lines.push(freshLine());
        rowsBody.innerHTML = rowsHtml();
        updateWcTotal();
        return;
      }
      var itemPickBtn = e.target.closest("[data-wc-item-pick]");
      if(itemPickBtn){
        var pickRowIdx = Number(itemPickBtn.getAttribute("data-wc-item-pick"));
        snapshotFields();
        var pickDraft = Object.assign({}, fs);
        if(isEdit) pickDraft.id = fs.id;
        closeModal();
        openItemPickerModal("Маҳсулотни танлаш", STATE.items.filter(isWh2ChikimItem), function(item){
          if(item){
            var ln = pickDraft.lines[pickRowIdx];
            ln.itemId = item.id; ln.itemName = item.name; ln.unit = item.unit||"";
            if(!Number(ln.price)) ln.price = Number(item.price)||0;
            ln.lineTotal = wh2Round2((Number(ln.qty)||0)*(Number(ln.price)||0));
          }
          openWh2ChikimForm(pickDraft);
        }, function(){ openWh2ChikimForm(pickDraft); });
        return;
      }
      var itemAddBtn = e.target.closest("[data-wc-item-add]");
      if(itemAddBtn){
        var itemRowIdx = Number(itemAddBtn.getAttribute("data-wc-item-add"));
        snapshotFields();
        var itemDraft = Object.assign({}, fs);
        if(isEdit) itemDraft.id = fs.id;
        closeModal();
        openItemForm({name:"", itemType:"xomashyo", unit:UNIT_OPTIONS[0], minQuantity:0, price:0, categoryId:"", location:""}, function(newItemId, newItemName){
          var newItem = itemById(newItemId);
          var ln = itemDraft.lines[itemRowIdx];
          ln.itemId = newItemId||""; ln.itemName = newItemName||"";
          if(newItem){
            ln.unit = newItem.unit||"";
            if(!Number(ln.price)) ln.price = Number(newItem.price)||0;
            ln.lineTotal = wh2Round2((Number(ln.qty)||0)*(Number(ln.price)||0));
          }
          openWh2ChikimForm(itemDraft);
        });
        return;
      }
    });
    updateWcTotal();

    m.querySelector("[data-save]").addEventListener("click", function(){
      snapshotFields();
      var chikimNumber = fs.chikimNumber.trim() || wh2FreshChikimNumber();
      var whRef = wh2ReresolveRef(fs.warehouseId, fs.warehouseName, STATE.warehouses);
      if(!whRef.id){ toast("Омборни танланг"); return; }
      var wsRef = wh2ReresolveRef(fs.workshopId, fs.workshopName, STATE.workshops);
      if(!wsRef.id){ toast("Цехни танланг"); return; }
      var empRef = wh2ReresolveRef(fs.takenByEmployeeId, fs.takenByName, STATE.employees, "fullName");
      if(!empRef.id){ toast("Ким олиб кетганини танланг"); return; }
      var validLines = fs.lines.filter(function(ln){ return ln.itemId && Number(ln.qty)>0; }).map(function(ln){
        var itm = itemById(ln.itemId);
        return {
          itemId:ln.itemId, itemName: itm?itm.name:(ln.itemName||"—"), unit: ln.unit||(itm?itm.unit:""),
          qty: Number(ln.qty)||0, price: Number(ln.price)||0, lineTotal: Number(ln.lineTotal)||0
        };
      });
      if(!validLines.length){ toast("Камида битта маҳсулот ва миқдорини киритинг"); return; }
      /* 6-босқич (2026-09): омбор қолдиғи ҳеч қачон минусга ўтмаслиги
         керак — сақлашдан олдин ҳар бир қатор шу омбордаги ЖОРИЙ қолдиқ
         билан текширилади (таҳрирлашда ёзувнинг ўз эски таъсири
         ҳисобга олинмайди — wh2CurrentWarehouseBalance'нинг excludeDocId
         параметри). Бир нечта қатор бир хил маҳсулотга тегишли бўлса,
         уларнинг йиғиндиси текширилади. */
      var neededByItem = {};
      validLines.forEach(function(ln){ neededByItem[ln.itemId] = (neededByItem[ln.itemId]||0) + Number(ln.qty); });
      for(var chkItemId in neededByItem){
        var available = wh2CurrentWarehouseBalance(chkItemId, whRef.id, isEdit?fs.id:null);
        if(neededByItem[chkItemId] - available > 1e-6){
          var itmChk = itemById(chkItemId);
          toast("«"+(itmChk?itmChk.name:"Маҳсулот")+"» — қолдиқ етарли эмас (омборда: "+fmtNum(available)+", керак: "+fmtNum(neededByItem[chkItemId])+")");
          return;
        }
      }
      var data = {
        chikimNumber: chikimNumber, date: fs.date || todayISO(),
        warehouseId: whRef.id, warehouseName: whRef.name,
        workshopId: wsRef.id, workshopName: wsRef.name,
        takenByEmployeeId: empRef.id, takenByName: empRef.name,
        lines: validLines, note: (fs.note||"").trim()
      };
      if(isEdit){
        dbUpdate("wh2Chikims", fs.id, data, STATE.wh2Chikims);
        toast("Чиқим янгиланди");
      } else {
        data.cancelled = false;
        data.createdAt = new Date().toISOString();
        dbAdd("wh2Chikims", data, STATE.wh2Chikims);
        toast("Чиқим сақланди");
      }
      closeModal();
    });
  }

  function openWh2ChikimDetail(c){
    if(!c) return;
    var rows = (c.lines||[]).map(function(ln,i){
      return '<tr><td class="cell-muted">'+(i+1)+'</td><td>'+esc(ln.itemName)+'</td><td class="num">'+fmtNum(ln.qty)+'</td><td>'+esc(ln.unit||"—")+'</td><td class="num">'+fmtSum(ln.price)+'</td><td class="num cell-strong">'+fmtSum(ln.lineTotal)+'</td></tr>';
    }).join("");
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Чиқим рақами</div><div class="dd">'+esc(c.chikimNumber)+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDateShort(c.date)+'</div></div>'+
      '<div><div class="dl">Омбор</div><div class="dd">'+esc(c.warehouseName||warehouseName(c.warehouseId))+'</div></div>'+
      '<div><div class="dl">Цех</div><div class="dd">'+esc(c.workshopName||workshopName(c.workshopId))+'</div></div>'+
      '<div><div class="dl">Ким олиб кетди</div><div class="dd">'+esc(c.takenByName||employeeName(c.takenByEmployeeId))+'</div></div>'+
      '<div><div class="dl">Ҳолат</div><div class="dd">'+(c.cancelled?'<span class="chip chip-critical">Бекор қилинди</span>':'<span class="chip chip-good">Фаол</span>')+'</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin:14px 0;"><table><thead><tr><th>№</th><th>Маҳсулот</th><th>Миқдори</th><th>Бирлик</th><th>Нархи</th><th>Жами</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div style="text-align:right;font-weight:700;font-size:15px;margin-bottom:6px;">Жами: '+fmtSum(wh2ChikimTotal(c))+'</div>'+
      (c.note ? '<div class="field"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);line-height:1.5;">'+esc(c.note)+'</div></div>' : '');
    var foot = ''+
      '<button class="btn btn-secondary btn-sm" data-wh2cd-print>'+ICONS.printer+'Чоп этиш</button>'+
      '<button class="btn btn-secondary btn-sm" data-wh2cd-excel>'+ICONS.download+'Excel</button>'+
      '<span style="flex:1"></span>'+
      (c.cancelled
        ? '<button class="btn btn-secondary btn-sm" data-wh2cd-restore>'+ICONS.restore+'Тиклаш</button>'
        : '<button class="btn btn-secondary btn-sm" data-wh2cd-cancel>'+ICONS.ban+'Бекор қилиш</button>')+
      '<button class="btn btn-primary btn-sm" data-wh2cd-edit>'+ICONS.pencil+'Таҳрирлаш</button>';
    var m = openModal(esc(c.chikimNumber), body, foot, true);
    m.querySelector("[data-wh2cd-print]").addEventListener("click", function(){ printWh2Chikim(c); });
    m.querySelector("[data-wh2cd-excel]").addEventListener("click", function(){ exportWh2ChikimExcel(c); });
    m.querySelector("[data-wh2cd-edit]").addEventListener("click", function(){ closeModal(); openWh2ChikimForm(c); });
    var cancelBtn = m.querySelector("[data-wh2cd-cancel]");
    if(cancelBtn) cancelBtn.addEventListener("click", function(){
      closeModal();
      openConfirm("Чиқимни бекор қилиш","«"+c.chikimNumber+"» чиқим бекор қилинсинми? Ёзув тарихда сақланиб қолади.","Ҳа, бекор қилиш", function(){ dbUpdate("wh2Chikims", c.id, {cancelled:true}, STATE.wh2Chikims); toast("Бекор қилинди"); }, true);
    });
    var restoreBtn = m.querySelector("[data-wh2cd-restore]");
    if(restoreBtn) restoreBtn.addEventListener("click", function(){
      closeModal();
      openConfirm("Чиқимни тиклаш","«"+c.chikimNumber+"» чиқим қайта тикланиб, фаол ҳолатга қайтарилсинми?","Ҳа, тиклаш", function(){ dbUpdate("wh2Chikims", c.id, {cancelled:false}, STATE.wh2Chikims); toast("Тикланди"); }, true);
    });
  }

  function printWh2Chikim(c){
    if(!c) return;
    var rows = (c.lines||[]).map(function(ln,i){
      return '<tr><td>'+(i+1)+'</td><td>'+esc(ln.itemName)+'</td><td style="text-align:right;">'+fmtNum(ln.qty)+'</td><td>'+esc(ln.unit||"—")+'</td><td style="text-align:right;">'+fmtSum(ln.price)+'</td><td style="text-align:right;">'+fmtSum(ln.lineTotal)+'</td></tr>';
    }).join("");
    var body = '<table>'+
      '<tr><td>Омбор</td><td style="text-align:right;">'+esc(c.warehouseName||warehouseName(c.warehouseId))+'</td></tr>'+
      '<tr><td>Цех</td><td style="text-align:right;">'+esc(c.workshopName||workshopName(c.workshopId))+'</td></tr>'+
      '<tr><td>Ким олиб кетди</td><td style="text-align:right;">'+esc(c.takenByName||employeeName(c.takenByEmployeeId))+'</td></tr>'+
      '</table>'+
      '<table style="margin-top:10px;"><tr><th>№</th><th>Маҳсулот</th><th style="text-align:right;">Миқдори</th><th>Бирлик</th><th style="text-align:right;">Нархи</th><th style="text-align:right;">Жами</th></tr>'+rows+'</table>'+
      '<div class="v-total">Жами: '+fmtSum(wh2ChikimTotal(c))+'</div>'+
      (c.note ? '<div style="margin-top:10px;">Изоҳ: '+esc(c.note)+'</div>' : '')+
      '<div class="v-sign"><div>Берди</div><div>Олди</div></div>';
    var html = voucherShell("Омбор 2 — Чиқим "+esc(c.chikimNumber), "Сана: "+esc(fmtDateShort(c.date)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

  function exportWh2ChikimExcel(c){
    if(!c) return;
    var headers = ["№","Маҳсулот","Миқдори","Бирлик","Нархи","Жами"];
    var rowsArr = (c.lines||[]).map(function(ln,i){ return [i+1, ln.itemName, fmtNum(ln.qty), ln.unit||"", fmtNum(ln.price), fmtNum(ln.lineTotal)]; });
    rowsArr.unshift(["Чиқим рақами", c.chikimNumber, "Сана", fmtDateShort(c.date)]);
    rowsArr.unshift(["Омбор", c.warehouseName||warehouseName(c.warehouseId), "Цех", c.workshopName||workshopName(c.workshopId)]);
    rowsArr.unshift(["Ким олиб кетди", c.takenByName||employeeName(c.takenByEmployeeId)]);
    rowsArr.push([]);
    rowsArr.push(["","","","","Жами:", fmtNum(wh2ChikimTotal(c))]);
    exportHtmlTableAsExcel("Wh2Chikim_"+c.chikimNumber+".xls", "Чиқим "+c.chikimNumber, headers, rowsArr);
  }

