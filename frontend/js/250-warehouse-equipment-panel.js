  /* ================= Омборлар — Ускуна ва жиҳозлар панели ================= */
  function equipCategoryNames(ids){
    var names = (ids||[]).map(function(id){ return categoryName(id); }).filter(function(n){ return n && n!=="—"; });
    return names.length ? names.join(", ") : "—";
  }
  function openEquipmentReceiptDetail(r){
    var isMain = r.kind==="main";
    var body = '<div class="field-hint" style="margin-bottom:10px;">'+
        (isMain ? ('Цех: <strong>'+esc(workshopName(r.workshopId))+'</strong> · Жавобгар: <strong>'+esc(r.responsibleEmployeeId?employeeName(r.responsibleEmployeeId):"—")+'</strong>')
                : ('Омбор: <strong>'+esc(warehouseName(r.warehouseId))+'</strong>'+(r.location?(' · Ўрни: '+esc(r.location)):'')))+
        ' · Категория: '+esc(equipCategoryNames(r.categoryIds))+
      '</div>'+
      '<div class="kpi-grid" style="margin-bottom:14px;">'+
        kpiTileFmt("Жами сони", fmtNum(r.quantity), "", "accent")+
        (isMain?'':kpiTileFmt("Ҳозир қўлда", fmtNum(auxEquipHandedOutQty(r.id)), "", "critical"))+
        (isMain?'':kpiTileFmt("Омборда қолдиқ", fmtNum(auxEquipAvailableQty(r)), "", "good"))+
        kpiTileFmt("Нархи (жами)", fmtSum(r.totalWithVat), "", "")+
      '</div>';
    if(!isMain){
      var moves = STATE.equipmentAssignments.filter(function(a){ return a.equipmentReceiptId===r.id && !a.cancelled; })
        .sort(function(a,b){ return ((b.date||"")+" "+(b.createdAt||"")).localeCompare((a.date||"")+" "+(a.createdAt||"")); });
      if(!moves.length){ body += emptyState("Ҳаракат йўқ","Ҳали бу жиҳоз ходимга топширилмаган."); }
      else {
        var rows = moves.map(function(a){
          return '<tr><td class="cell-muted">'+fmtDateShort(a.date)+'</td>'+
            '<td>'+(a.direction==="qaytarish"?'<span class="chip chip-good">Қайтарилди</span>':'<span class="chip chip-accent">Топширилди</span>')+'</td>'+
            '<td class="cell-strong">'+esc(employeeName(a.employeeId))+'</td>'+
            '<td class="cell-muted">'+esc(a.workshopId?workshopName(a.workshopId):"—")+'</td>'+
            '<td class="num">'+fmtNum(a.qty)+'</td>'+
            '<td class="cell-muted">'+esc(a.note||"—")+'</td></tr>';
        }).join("");
        body += '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Тури</th><th>Ходим</th><th>Цех</th><th>Сони</th><th>Изоҳ</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      }
    } else {
      body += '<div class="field-hint">Таъминотчи: '+esc(r.supplierName||"—")+' · Сана: '+fmtDateShort(r.date)+(r.note?(' · Изоҳ: '+esc(r.note)):'')+'</div>';
    }
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print title="Чоп этиш">'+ICONS.printer+'</button><button class="btn btn-primary" data-edit>Таҳрирлаш</button>';
    var m = openModal((isMain?"Асосий ускуна":"Ёрдамчи жиҳоз")+" — "+esc(r.name), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelector("[data-print]").addEventListener("click", function(){ printEquipmentReceiptVoucher(r); });
    m.querySelector("[data-edit]").addEventListener("click", function(){ closeModal(); openEquipmentReceiptEditForm(r); });
  }
  /* Танланган ходимнинг қўлидаги жиҳозлар рўйхатини кўрсатувчи модал —
     Ходимлар рўйхатидаги "жиҳозлар" тугмасидан ҳам, Қайтариш формасидан
     ҳам фойдаланилади. */
  function openEmployeeEquipmentModal(employeeId){
    var emp = employeeById(employeeId);
    var held = employeeAssignedEquipment(employeeId);
    var body = "";
    if(!held.length){ body = emptyState("Жиҳоз йўқ", "Бу ходимда ҳозир бириктирилган ёрдамчи жиҳоз йўқ."); }
    else {
      var rows = held.map(function(x){
        return '<tr><td class="cell-strong">'+esc(x.receipt.name)+'</td><td class="cell-muted">'+esc(equipCategoryNames(x.receipt.categoryIds))+'</td><td class="num">'+fmtNum(x.qty)+'</td></tr>';
      }).join("");
      body = '<div class="table-wrap"><table><thead><tr><th>Жиҳоз</th><th>Категория</th><th>Сони</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    var m = openModal("Бириктирилган жиҳозлар — "+esc(emp?emp.fullName:"—"), body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
  }
  function openEquipHandoutForm(){
    var body = '<div class="field"><label>Ходим</label>'+personComboInputHtml("eh-emp", "eh-emp-list", null)+'</div>'+
      '<div class="field-row"><div class="field"><label>Цех</label><select id="eh-workshop"><option value="">— танланмаган —</option>'+STATE.workshops.map(function(w){return '<option value="'+w.id+'">'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Сана</label><input id="eh-date" type="date" value="'+todayISO()+'"></div></div>'+
      '<div id="eh-equip-wrap"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="eh-note"></textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Топшириш</button>';
    var m = openModal("Ёрдамчи жиҳоз — ходимга топшириш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    function renderEquipWrap(){
      var avail = auxEquipmentReceipts().map(function(r){ return {r:r, avail:auxEquipAvailableQty(r)}; }).filter(function(x){ return x.avail>0; });
      var wrap = m.querySelector("#eh-equip-wrap");
      if(!avail.length){ wrap.innerHTML = '<div class="field-hint">Омборда бўш ёрдамчи жиҳоз йўқ</div>'; return; }
      wrap.innerHTML = '<div class="field"><label>Жиҳоз</label><select id="eh-equip">'+avail.map(function(x){return '<option value="'+x.r.id+'">'+esc(x.r.name)+' — қолдиқ '+fmtNum(x.avail)+'</option>';}).join("")+'</select></div>'+
        '<div class="field"><label>Сони</label><input id="eh-qty" type="number" min="0" step="any" value="1"></div>';
      var eqSel = wrap.querySelector("#eh-equip"), qtyInp = wrap.querySelector("#eh-qty");
      var syncMax = function(){ var r=equipmentReceiptById(eqSel.value); var av=r?auxEquipAvailableQty(r):0; qtyInp.max=av; if(Number(qtyInp.value)>av) qtyInp.value=av; };
      eqSel.addEventListener("change", syncMax);
      syncMax();
    }
    renderEquipWrap();
    var ehEmpInput = m.querySelector("#eh-emp");
    var syncWorkshopFromEmp = function(){
      var emp = resolvePersonFromComboValue(ehEmpInput.value);
      if(emp && emp.workshopId) m.querySelector("#eh-workshop").value = emp.workshopId;
    };
    ehEmpInput.addEventListener("change", syncWorkshopFromEmp);
    ehEmpInput.addEventListener("input", syncWorkshopFromEmp);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var emp = resolvePersonFromComboValue(m.querySelector("#eh-emp").value);
      var workshopId = m.querySelector("#eh-workshop").value;
      var date = m.querySelector("#eh-date").value||todayISO();
      var note = m.querySelector("#eh-note").value.trim();
      var eqSel = m.querySelector("#eh-equip"), qtyInp = m.querySelector("#eh-qty");
      if(!emp){ toast("Ходимни танланг"); return; }
      if(!eqSel || !eqSel.value){ toast("Жиҳозни танланг"); return; }
      var receiptId = eqSel.value;
      var qty = Number(qtyInp.value)||0;
      var r = equipmentReceiptById(receiptId);
      var avail = r?auxEquipAvailableQty(r):0;
      if(qty<=0){ toast("Сонини киритинг"); return; }
      if(qty>avail){ toast("Омборда етарли эмас — қолдиқ: "+fmtNum(avail)); return; }
      dbAdd("equipmentAssignments", {
        equipmentReceiptId:receiptId, employeeId:emp.id, workshopId:workshopId||"", date:date, qty:qty, note:note,
        direction:"topshirish", cancelled:false, createdAt:new Date().toISOString()
      }, STATE.equipmentAssignments);
      toast("Жиҳоз ходимга топширилди");
      closeModal();
    });
  }
  function openEquipReturnForm(){
    var body = '<div class="field"><label>Ходим</label>'+personComboInputHtml("er-emp", "er-emp-list", null)+'</div>'+
      '<div id="er-equip-wrap"><div class="field-hint">Аввал ходимни танланг</div></div>'+
      '<div class="field"><label>Сана</label><input id="er-date" type="date" value="'+todayISO()+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="er-note"></textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Қайтариш</button>';
    var m = openModal("Ёрдамчи жиҳоз — омборга қайтариш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    function renderEquipWrap(){
      var emp = resolvePersonFromComboValue(m.querySelector("#er-emp").value);
      var wrap = m.querySelector("#er-equip-wrap");
      if(!emp){ wrap.innerHTML = '<div class="field-hint">Аввал ходимни танланг</div>'; return; }
      var held = employeeAssignedEquipment(emp.id);
      if(!held.length){ wrap.innerHTML = '<div class="field-hint">Бу ходимда ҳозир жиҳоз йўқ</div>'; return; }
      wrap.innerHTML = '<div class="field"><label>Жиҳоз</label><select id="er-equip">'+held.map(function(x){return '<option value="'+x.receiptId+'">'+esc(x.receipt.name)+' — қўлда '+fmtNum(x.qty)+'</option>';}).join("")+'</select></div>'+
        '<div class="field"><label>Сони</label><input id="er-qty" type="number" min="0" step="any" value="'+esc(held[0].qty)+'"></div>';
      var eqSel = wrap.querySelector("#er-equip"), qtyInp = wrap.querySelector("#er-qty");
      var syncMax = function(){ var h=held.find(function(x){return x.receiptId===eqSel.value;}); var mx=h?h.qty:0; qtyInp.max=mx; if(Number(qtyInp.value)>mx) qtyInp.value=mx; };
      eqSel.addEventListener("change", syncMax);
      syncMax();
    }
    m.querySelector("#er-emp").addEventListener("change", renderEquipWrap);
    m.querySelector("#er-emp").addEventListener("input", renderEquipWrap);
    renderEquipWrap();
    m.querySelector("[data-save]").addEventListener("click", function(){
      var emp = resolvePersonFromComboValue(m.querySelector("#er-emp").value);
      var date = m.querySelector("#er-date").value||todayISO();
      var note = m.querySelector("#er-note").value.trim();
      var eqSel = m.querySelector("#er-equip"), qtyInp = m.querySelector("#er-qty");
      if(!emp){ toast("Ходимни танланг"); return; }
      if(!eqSel || !eqSel.value){ toast("Жиҳозни танланг"); return; }
      var receiptId = eqSel.value;
      var qty = Number(qtyInp.value)||0;
      var held = employeeAssignedEquipment(emp.id).find(function(x){return x.receiptId===receiptId;});
      var maxQty = held?held.qty:0;
      if(qty<=0){ toast("Сонини киритинг"); return; }
      if(qty>maxQty){ toast("Ходимда шунча йўқ — қўлда: "+fmtNum(maxQty)); return; }
      dbAdd("equipmentAssignments", {
        equipmentReceiptId:receiptId, employeeId:emp.id, workshopId:"", date:date, qty:qty, note:note,
        direction:"qaytarish", cancelled:false, createdAt:new Date().toISOString()
      }, STATE.equipmentAssignments);
      toast("Жиҳоз омборга қайтарилди");
      closeModal();
    });
  }
  function renderWhEquipmentPanel(){
    var sub = STATE.whEquipSub||"main";
    var topbarActions = sub==="catalog"
      ? '<button class="btn btn-primary" id="weqCatalogAddBtn">'+ICONS.plus+'Янги яратиш</button>'
      : '<div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-secondary" id="weqReturnBtn">'+ICONS.swap+'Омборга қайтариш</button><button class="btn btn-primary" id="weqHandoutBtn">'+ICONS.plus+'Ходимга топшириш</button></div>';
    setTopbar("Ускуна ва жиҳозлар", sub==="catalog" ? (STATE.equipment.length+" та ёзув") : (STATE.equipmentReceipts.length+" та ёзув"), topbarActions);
    var root = document.getElementById("content");
    var html = whSubnav("equipment") + sampleBanner();
    html += '<div class="filter-row" style="margin-bottom:16px;">'+
      '<button class="pill-filter'+(sub==="main"?" active":"")+'" data-weqsub="main">Асосий ускуналар</button>'+
      '<button class="pill-filter'+(sub==="aux"?" active":"")+'" data-weqsub="aux">Ёрдамчи жиҳозлар</button>'+
      '<button class="pill-filter'+(sub==="catalog"?" active":"")+'" data-weqsub="catalog">Ускуна ва жиҳозлар рўйхати</button>'+
      '</div>';
    if(sub==="catalog"){
      var catSearch = (STATE.eqCatalogSearch||"").trim();
      var listC = STATE.equipment.slice().filter(function(eq){ return recMatchesSearch(eq.name+" "+(eq.model||""), catSearch); }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
      html += '<div class="filter-row" style="margin-bottom:14px;"><div class="search-box">'+ICONS.search+'<input type="text" id="eqcat-search" placeholder="Номи, маркаси бўйича қидириш…" value="'+esc(STATE.eqCatalogSearch||"")+'"></div>'+
        '<button class="btn btn-secondary btn-sm" id="eqcat-export" title="Excelга юклаб олиш">'+ICONS.download+'Excel</button></div>';
      if(!listC.length){
        html += emptyState("Ҳали ускуна ёки жиҳоз йўқ","«Янги яратиш» орқали қўшинг — кейин уни Кирим, Инвентаризация ва Иш ставкалари калькуляторларида танлайсиз.");
      } else {
        var grandTotalEq = listC.reduce(function(sum,eq){ return sum+equipmentTotalValue(eq); }, 0);
        html += '<div class="card" style="padding:14px 16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">'+
          '<div style="font-weight:800;font-size:13.5px;">Барча ускуна ва жиҳозлар жами суммаси</div>'+
          '<div class="num" style="font-weight:800;font-size:18px;color:var(--accent);">'+fmtSum(grandTotalEq)+'</div>'+
        '</div>';
        var rowsC = listC.map(function(eq){
          return '<tr>'+
            '<td class="cell-strong">'+esc(eq.name)+'</td>'+
            '<td class="cell-muted">'+esc(eq.model||"—")+'</td>'+
            '<td class="cell-muted">'+equipmentTypeLabel(eq.type)+'</td>'+
            '<td class="num">'+fmtNum(eq.qty||0)+'</td>'+
            '<td class="num">'+fmtSum(equipmentUnitPrice(eq))+'</td>'+
            '<td class="num cell-strong">'+fmtSum(equipmentTotalValue(eq))+'</td>'+
            '<td class="num">'+fmtNum(eq.kw||0)+' кВт</td>'+
            '<td><div class="row-actions">'+
              '<button class="btn btn-ghost btn-icon" data-eq-view="'+eq.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-eq-edit="'+eq.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-eq-print="'+eq.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-eq-del="'+eq.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
            '</div></td>'+
            '</tr>';
        }).join("");
        html += '<div class="table-wrap"><table><thead><tr><th>Номи</th><th>Маркаси</th><th>Тури</th><th>Сони</th><th>Нархи</th><th>Жами сумма</th><th>Электр қуввати</th><th></th></tr></thead><tbody>'+rowsC+
          '<tr style="font-weight:800;background:var(--surface-2);"><td colspan="5">ЖАМИ</td><td class="num">'+fmtSum(grandTotalEq)+'</td><td></td><td></td></tr>'+
          '</tbody></table></div>';
      }
      root.innerHTML = html;
      wireSampleBanner(root);
      wireWhSubnav(root);
      root.querySelectorAll("[data-weqsub]").forEach(function(b){ b.addEventListener("click", function(){ STATE.whEquipSub=b.getAttribute("data-weqsub"); render(); }); });
      var catAddBtn = document.getElementById("weqCatalogAddBtn");
      if(catAddBtn) catAddBtn.addEventListener("click", function(){ openEquipmentForm(null, null); });
      var eqCatSearchEl = document.getElementById("eqcat-search");
      eqCatSearchEl.addEventListener("input", function(){
        STATE.eqCatalogSearch = eqCatSearchEl.value; render();
        var e2 = document.getElementById("eqcat-search");
        if(e2){ e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); }
      });
      document.getElementById("eqcat-export").addEventListener("click", function(){ exportEquipmentCatalogExcel(listC); });
      root.querySelectorAll("[data-eq-view]").forEach(function(b){ b.addEventListener("click", function(){ openEquipmentCatalogDetail(equipmentById(b.getAttribute("data-eq-view"))); }); });
      root.querySelectorAll("[data-eq-print]").forEach(function(b){ b.addEventListener("click", function(){ printEquipmentCatalogVoucher(equipmentById(b.getAttribute("data-eq-print"))); }); });
      root.querySelectorAll("[data-eq-edit]").forEach(function(b){ b.addEventListener("click", function(){ openEquipmentForm(equipmentById(b.getAttribute("data-eq-edit")), null); }); });
      root.querySelectorAll("[data-eq-del]").forEach(function(b){ b.addEventListener("click", function(){
        var eq = equipmentById(b.getAttribute("data-eq-del"));
        if(!eq) return;
        var used = STATE.laborCalcs.filter(function(lc){ return lc.equipmentId===eq.id; }).length;
        openConfirm("Ускуна/жиҳозни ўчириш", "«"+eq.name+"» ўчирилсинми?"+(used?" Бу ускунадан "+used+" та калькуляторда фойдаланилган — улар ўз қийматларини сақлаб қолади, лекин ускунага энди боғланмайди.":""), "Ҳа, ўчириш", function(){
          dbDelete("equipment", eq.id, STATE.equipment);
          toast("Ўчирилди");
        }, true);
      }); });
      return;
    }
    var eqState = sub==="main" ? {from:STATE.eqMainFrom, to:STATE.eqMainTo, search:STATE.eqMainSearch} : {from:STATE.eqAuxFrom, to:STATE.eqAuxTo, search:STATE.eqAuxSearch};
    var eqPrefix = sub==="main" ? "eqMain" : "eqAux";
    if(sub==="main"){
      var allMain = mainEquipmentReceipts().filter(function(r){
        if(!recMatchesDate(r.date, eqState.from, eqState.to)) return false;
        if(!recMatchesSearch(r.name, eqState.search)) return false;
        return true;
      }).sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
      html += recFilterToolbar(eqPrefix, eqState, "Номи бўйича қидириш…");
      if(!allMain.length){ html += emptyState("Ҳали асосий ускуна йўқ","«Омборлар → Кирим» бўлимида «Асосий ускуналар» турини танлаб кирим қилинг."); }
      else {
        var rows = allMain.map(function(r){
          return '<tr>'+
            '<td class="cell-strong">'+esc(r.name)+'</td>'+
            '<td class="cell-muted">'+esc(workshopName(r.workshopId))+'</td>'+
            '<td class="cell-muted">'+esc(r.responsibleEmployeeId?employeeName(r.responsibleEmployeeId):"—")+'</td>'+
            '<td class="cell-muted">'+esc(equipCategoryNames(r.categoryIds))+'</td>'+
            '<td class="num">'+fmtNum(r.quantity)+'</td>'+
            '<td class="cell-muted">'+fmtDateShort(r.date)+'</td>'+
            '<td class="num">'+fmtSum(r.totalWithVat)+'</td>'+
            '<td><div class="row-actions">'+
              '<button class="btn btn-ghost btn-icon" data-weq-view="'+r.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-weq-edit="'+r.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-weq-print="'+r.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-weq-del="'+r.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
            '</div></td>'+
            '</tr>';
        }).join("");
        html += '<div class="table-wrap"><table><thead><tr><th>Номи</th><th>Цех</th><th>Жавобгар шахс</th><th>Категория</th><th>Сони</th><th>Сана</th><th>Нархи (жами)</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      }
    } else {
      var allAux = auxEquipmentReceipts().filter(function(r){
        if(!recMatchesDate(r.date, eqState.from, eqState.to)) return false;
        if(!recMatchesSearch(r.name, eqState.search)) return false;
        return true;
      }).sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
      html += recFilterToolbar(eqPrefix, eqState, "Номи бўйича қидириш…");
      if(!allAux.length){ html += emptyState("Ҳали ёрдамчи жиҳоз йўқ","«Омборлар → Кирим» бўлимида «Ёрдамчи жиҳозлар» турини танлаб кирим қилинг."); }
      else {
        var rows2 = allAux.map(function(r){
          var out = auxEquipHandedOutQty(r.id), avail = auxEquipAvailableQty(r);
          return '<tr>'+
            '<td class="cell-strong">'+esc(r.name)+'</td>'+
            '<td class="cell-muted">'+esc(warehouseName(r.warehouseId))+'</td>'+
            '<td class="cell-muted">'+esc(r.location||"—")+'</td>'+
            '<td class="cell-muted">'+esc(equipCategoryNames(r.categoryIds))+'</td>'+
            '<td class="num">'+fmtNum(r.quantity)+'</td>'+
            '<td class="num" style="color:var(--critical);">'+fmtNum(out)+'</td>'+
            '<td class="num" style="color:var(--good);">'+fmtNum(avail)+'</td>'+
            '<td class="cell-muted">'+fmtDateShort(r.date)+'</td>'+
            '<td><div class="row-actions">'+
              '<button class="btn btn-ghost btn-icon" data-weq-view="'+r.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-weq-edit="'+r.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-weq-print="'+r.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-weq-del="'+r.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
            '</div></td>'+
            '</tr>';
        }).join("");
        html += '<div class="table-wrap"><table><thead><tr><th>Номи</th><th>Омбор</th><th>Ўрни</th><th>Категория</th><th>Жами</th><th>Қўлда</th><th>Омборда қолдиқ</th><th>Сана</th><th></th></tr></thead><tbody>'+rows2+'</tbody></table></div>';
      }
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireWhSubnav(root);
    root.querySelectorAll("[data-weqsub]").forEach(function(b){ b.addEventListener("click", function(){ STATE.whEquipSub=b.getAttribute("data-weqsub"); render(); }); });
    wireRecFilterToolbar(root, eqPrefix, eqState, function(){ exportEquipmentReceiptsExcel(sub==="main"?allMain:allAux, sub); });
    if(sub==="main"){ STATE.eqMainFrom=eqState.from; STATE.eqMainTo=eqState.to; STATE.eqMainSearch=eqState.search; }
    else { STATE.eqAuxFrom=eqState.from; STATE.eqAuxTo=eqState.to; STATE.eqAuxSearch=eqState.search; }
    root.querySelectorAll("[data-weq-view]").forEach(function(b){ b.addEventListener("click", function(){
      var r = equipmentReceiptById(b.getAttribute("data-weq-view"));
      if(r) openEquipmentReceiptDetail(r);
    }); });
    root.querySelectorAll("[data-weq-edit]").forEach(function(b){ b.addEventListener("click", function(){
      var r = equipmentReceiptById(b.getAttribute("data-weq-edit"));
      if(r) openEquipmentReceiptEditForm(r);
    }); });
    root.querySelectorAll("[data-weq-print]").forEach(function(b){ b.addEventListener("click", function(){
      var r = equipmentReceiptById(b.getAttribute("data-weq-print"));
      if(r) printEquipmentReceiptVoucher(r);
    }); });
    root.querySelectorAll("[data-weq-del]").forEach(function(b){ b.addEventListener("click", function(){
      var r = equipmentReceiptById(b.getAttribute("data-weq-del"));
      if(!r) return;
      if(r.kind==="aux" && STATE.equipmentAssignments.some(function(a){return a.equipmentReceiptId===r.id;})){
        toast("Бу жиҳоз бўйича ходимларга топшириш/қайтариш тарихи мавжуд — ўчириб бўлмайди");
        return;
      }
      openConfirm("Киримни ўчириш", "«"+esc(r.name)+"» кирими бутунлай ўчирилсинми?", "Ҳа, ўчириш", function(){
        dbDelete("equipmentReceipts", r.id, STATE.equipmentReceipts);
        toast("Ўчирилди");
      }, true);
    }); });
    document.getElementById("weqHandoutBtn").addEventListener("click", function(){ openEquipHandoutForm(); });
    document.getElementById("weqReturnBtn").addEventListener("click", function(){ openEquipReturnForm(); });
  }
  function exportEquipmentReceiptsExcel(list, sub){
    var headers = sub==="main"
      ? ["Номи","Цех","Жавобгар шахс","Категория","Сони","Сана","Нархи (жами)"]
      : ["Номи","Омбор","Ўрни","Категория","Жами","Қўлда","Омборда қолдиқ","Сана"];
    var rowsArr = list.map(function(r){
      return sub==="main"
        ? [r.name, workshopName(r.workshopId), r.responsibleEmployeeId?employeeName(r.responsibleEmployeeId):"", equipCategoryNames(r.categoryIds), fmtNum(r.quantity), fmtDateShort(r.date), fmtNum(r.totalWithVat)]
        : [r.name, warehouseName(r.warehouseId), r.location||"", equipCategoryNames(r.categoryIds), fmtNum(r.quantity), fmtNum(auxEquipHandedOutQty(r.id)), fmtNum(auxEquipAvailableQty(r)), fmtDateShort(r.date)];
    });
    exportHtmlTableAsExcel((sub==="main"?"Asosiy_uskuna.xls":"Yordamchi_jihoz.xls"), sub==="main"?"Асосий ускуналар":"Ёрдамчи жиҳозлар", headers, rowsArr);
  }
  function exportEquipmentCatalogExcel(list){
    var headers = ["Номи","Маркаси","Тури","Сони","Нархи","Жами сумма","Электр қуввати (кВт)"];
    var rowsArr = list.map(function(eq){ return [eq.name, eq.model||"", equipmentTypeLabel(eq.type), fmtNum(eq.qty||0), fmtNum(equipmentUnitPrice(eq)), fmtNum(equipmentTotalValue(eq)), fmtNum(eq.kw||0)]; });
    exportHtmlTableAsExcel("Uskuna_royxati.xls", "Ускуна ва жиҳозлар рўйхати", headers, rowsArr);
  }
  function openEquipmentCatalogDetail(eq){
    if(!eq) return;
    var used = STATE.laborCalcs.filter(function(lc){ return lc.equipmentId===eq.id; }).length;
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Номи</div><div class="dd">'+esc(eq.name)+'</div></div>'+
      '<div><div class="dl">Маркаси</div><div class="dd">'+esc(eq.model||"—")+'</div></div>'+
      '<div><div class="dl">Тури</div><div class="dd">'+equipmentTypeLabel(eq.type)+'</div></div>'+
      '<div><div class="dl">Сони</div><div class="dd">'+fmtNum(eq.qty||0)+'</div></div>'+
      '<div><div class="dl">Нархи (1 дона)</div><div class="dd">'+fmtSum(equipmentUnitPrice(eq))+'</div></div>'+
      '<div><div class="dl">Жами сумма</div><div class="dd">'+fmtSum(equipmentTotalValue(eq))+'</div></div>'+
      '<div><div class="dl">Электр қуввати</div><div class="dd">'+fmtNum(eq.kw||0)+' кВт</div></div>'+
      '<div><div class="dl">Иш ставкалари калькуляторида фойдаланилган</div><div class="dd">'+(used?used+" та":"—")+'</div></div>'+
      '</div>';
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print title="Чоп этиш">'+ICONS.printer+'</button><button class="btn btn-primary" data-edit>Таҳрирлаш</button>';
    var m = openModal(esc(eq.name), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelector("[data-print]").addEventListener("click", function(){ printEquipmentCatalogVoucher(eq); });
    m.querySelector("[data-edit]").addEventListener("click", function(){ closeModal(); openEquipmentForm(eq, null); });
  }
  function printEquipmentCatalogVoucher(eq){
    if(!eq) return;
    var body = '<table>'+
      '<tr><td>Номи</td><td style="text-align:right;">'+esc(eq.name)+'</td></tr>'+
      '<tr><td>Маркаси</td><td style="text-align:right;">'+esc(eq.model||"—")+'</td></tr>'+
      '<tr><td>Тури</td><td style="text-align:right;">'+equipmentTypeLabel(eq.type)+'</td></tr>'+
      '<tr><td>Сони</td><td style="text-align:right;">'+fmtNum(eq.qty||0)+'</td></tr>'+
      '<tr><td>Электр қуввати</td><td style="text-align:right;">'+fmtNum(eq.kw||0)+' кВт</td></tr>'+
      '</table>';
    var html = voucherShell("Ускуна/жиҳоз — "+esc(eq.name), "", body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

  function renderSuppliers(){
    setTopbar("Таъминотчилар", STATE.suppliers.length+" та ташкилот", '<button class="btn btn-primary" id="addSupplierBtn">'+ICONS.plus+'Ташкилот қўшиш</button>');
    var root = document.getElementById("content");
    var search = (STATE.supSearch||"").trim().toLowerCase();
    var list = STATE.suppliers.slice().filter(function(s){
      if(!search) return true;
      return recMatchesSearch((s.name||"")+" "+(s.phone||"")+" "+(s.inn||""), search);
    }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    var html = whSubnav("suppliers");
    html += '<div class="filter-row" style="margin-bottom:14px;"><div class="search-box">'+ICONS.search+'<input type="text" id="sup-search" placeholder="Номи, телефон, СТИР бўйича қидириш…" value="'+esc(STATE.supSearch||"")+'"></div>'+
      '<button class="btn btn-secondary btn-sm" id="sup-export" title="Excelга юклаб олиш">'+ICONS.download+'Excel</button></div>';
    if(!list.length){
      html += emptyState("Ташкилотлар йўқ","Кирим киритилганда ташкилот автоматик қўшилади, ёки юқоридаги тугма орқали қўшинг.");
    } else {
      var rows = list.map(function(s){
        var payable = supplierPayable(s.id), overdue = supplierOverduePayable(s.id);
        var chip = overdue>0 ? '<span class="chip chip-critical">'+ICONS.alert+'Муддати ўтган: '+fmtSum(overdue)+'</span>' : (payable>0 ? '<span class="chip chip-warning">Қарздормиз</span>' : '<span class="chip chip-good">Қарз йўқ</span>');
        return '<tr>'+
          '<td class="cell-strong">'+esc(s.name)+'</td>'+
          '<td class="cell-muted">'+esc(s.phone||"—")+'</td>'+
          '<td class="cell-muted">'+esc(s.inn||"—")+'</td>'+
          '<td class="num cell-strong">'+fmtSum(payable)+'</td>'+
          '<td>'+chip+'</td>'+
          '<td><div class="row-actions">'+
            (payable>0?'<button class="btn btn-ghost btn-icon" data-supplier-pay="'+s.id+'" title="Тўлов қилиш">'+ICONS.check+'</button>':'')+
            '<button class="btn btn-ghost btn-icon" data-supplier-view="'+s.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-edit-supplier="'+s.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-print-supplier="'+s.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-del-supplier="'+s.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
          '</div></td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Ташкилот</th><th>Телефон</th><th>СТИР</th><th>Бизнинг қарзимиз</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireWhSubnav(root);
    document.getElementById("addSupplierBtn").addEventListener("click", function(){ openSupplierForm(null); });
    var supSearchEl = document.getElementById("sup-search");
    supSearchEl.addEventListener("input", function(){
      STATE.supSearch = supSearchEl.value; render();
      var e2 = document.getElementById("sup-search");
      if(e2){ e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); }
    });
    document.getElementById("sup-export").addEventListener("click", function(){ exportSuppliersExcel(list); });
    root.querySelectorAll("[data-supplier-pay]").forEach(function(b){ b.addEventListener("click", function(){ openSupplierPaymentModal(supplierById(b.getAttribute("data-supplier-pay"))); }); });
    root.querySelectorAll("[data-supplier-view]").forEach(function(b){ b.addEventListener("click", function(){ openSupplierDetail(supplierById(b.getAttribute("data-supplier-view"))); }); });
    root.querySelectorAll("[data-edit-supplier]").forEach(function(b){ b.addEventListener("click", function(){ openSupplierForm(supplierById(b.getAttribute("data-edit-supplier"))); }); });
    root.querySelectorAll("[data-print-supplier]").forEach(function(b){ b.addEventListener("click", function(){ printSupplierStatement(supplierById(b.getAttribute("data-print-supplier"))); }); });
    root.querySelectorAll("[data-del-supplier]").forEach(function(b){ b.addEventListener("click", function(){
      var s = supplierById(b.getAttribute("data-del-supplier"));
      openConfirm("Ташкилотни ўчириш","«"+s.name+"» ўчирилсинми? Унинг кирим тарихи сақланиб қолади.","Ҳа, ўчириш", function(){ dbDelete("suppliers", s.id, STATE.suppliers); toast("Ўчирилди"); }, true);
    }); });
  }
  /* Таъминотчи бўйича тўлиқ ҳисоб-китоб — чоп этиш (voucherShell) ва
     Excel'га экспорт (фойдаланувчи сўровига кўра «Таъминотчилар» ва
     «Лом кирим/возврат/Кирим» бўлимларининг барчасида шу имконият бор). */
  function supplierStatementRows(supplier){
    var receipts = STATE.receipts.filter(function(r){return r.supplierId===supplier.id;}).sort(function(a,b){return (a.date||a.createdAt||"").localeCompare(b.date||b.createdAt||"");});
    var payments = STATE.supplierPayments.filter(function(p){return p.supplierId===supplier.id;});
    var returns = supplierLomReturns(supplier.id).filter(function(x){return !x.cancelled;});
    return {receipts:receipts, payments:payments, returns:returns};
  }
  function printSupplierStatement(s){
    if(!s) return;
    var data = supplierStatementRows(s);
    var rows = data.receipts.map(function(r){
      return '<tr><td>'+fmtDateShort((r.date||r.createdAt||"").slice(0,10))+'</td><td>Кирим</td><td>'+esc(r.itemName)+'</td><td style="text-align:right;">'+fmtNum(r.quantity)+'</td><td style="text-align:right;">'+fmtSum(r.totalWithVat)+'</td><td style="text-align:right;">'+fmtSum(r.paidAmount||0)+'</td></tr>';
    }).join("")+data.returns.map(function(x){
      return '<tr><td>'+fmtDateShort(x.date)+'</td><td>Возврат ('+(x.productType==="metal"?"металл":"хом лом")+')</td><td>№'+esc(x.batchNumber||"—")+'</td><td style="text-align:right;">'+fmtNum(x.kg)+' кг</td><td style="text-align:right;">−'+fmtSum(x.appliedAmt!=null?x.appliedAmt:x.sum)+'</td><td style="text-align:right;">—</td></tr>';
    }).join("")+data.payments.map(function(p){
      return '<tr><td>'+fmtDateShort((p.date||"").slice(0,10))+'</td><td>Тўлов</td><td>'+esc(cashAccountName(p.cashAccountId))+'</td><td>—</td><td>—</td><td style="text-align:right;">'+fmtSum(p.amount)+'</td></tr>';
    }).join("");
    var body = '<table><tr><th>Сана</th><th>Тури</th><th>Тафсилот</th><th style="text-align:right;">Миқдор</th><th style="text-align:right;">Сумма</th><th style="text-align:right;">Тўланган</th></tr>'+rows+'</table>'+
      '<div class="v-total">Жами қарзимиз: '+fmtSum(supplierPayable(s.id))+'</div>';
    var html = voucherShell("Таъминотчи — "+esc(s.name), "СТИР: "+esc(s.inn||"—")+" · Телефон: "+esc(s.phone||"—"), body, true);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  function exportSupplierStatementExcel(s){
    if(!s) return;
    var data = supplierStatementRows(s);
    var headers = ["Сана","Тури","Тафсилот","Миқдор","Сумма","Тўланган"];
    var rowsArr = data.receipts.map(function(r){ return [fmtDateShort((r.date||r.createdAt||"").slice(0,10)), "Кирим", r.itemName, fmtNum(r.quantity), fmtNum(r.totalWithVat), fmtNum(r.paidAmount||0)]; })
      .concat(data.returns.map(function(x){ return [fmtDateShort(x.date), "Возврат", "№"+(x.batchNumber||"—"), fmtNum(x.kg)+" кг", "-"+fmtNum(x.appliedAmt!=null?x.appliedAmt:x.sum), ""]; }))
      .concat(data.payments.map(function(p){ return [fmtDateShort((p.date||"").slice(0,10)), "Тўлов", cashAccountName(p.cashAccountId), "", "", fmtNum(p.amount)]; }));
    rowsArr.push(["","","","","Жами қарз:", fmtNum(supplierPayable(s.id))]);
    exportHtmlTableAsExcel("Taminotchi_"+s.name.replace(/[^a-zA-Zа-яА-ЯёЁ0-9_-]+/g,"_")+".xls", "Таъминотчи — "+s.name, headers, rowsArr);
  }
  function exportSuppliersExcel(list){
    var headers = ["Ташкилот","Телефон","СТИР","Бизнинг қарзимиз","Ҳолат"];
    var rowsArr = list.map(function(s){
      var payable = supplierPayable(s.id), overdue = supplierOverduePayable(s.id);
      var status = overdue>0 ? "Муддати ўтган: "+fmtNum(overdue) : (payable>0?"Қарздормиз":"Қарз йўқ");
      return [s.name, s.phone||"", s.inn||"", fmtNum(payable), status];
    });
    exportHtmlTableAsExcel("Taminotchilar.xls", "Таъминотчилар", headers, rowsArr);
  }

  function openSupplierForm(existing, onSaved, onCancel){
    var isEdit = !!existing;
    var s = existing || {name:"", inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:""};
    var body = '<div class="field"><label>Ташкилот номи</label><input id="sp-name" placeholder="Масалан: «Металл-Сервис» МЧЖ" value="'+esc(s.name)+'"></div>'+
      '<div class="field-row"><div class="field"><label>СТИР (ИНН)</label><input id="sp-inn" value="'+esc(s.inn||"")+'"></div>'+
      '<div class="field"><label>МФО</label><input id="sp-mfo" value="'+esc(s.mfo||"")+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>Ҳисоб рақами</label><input id="sp-account" value="'+esc(s.bankAccount||"")+'"></div>'+
      '<div class="field"><label>Банк номи</label><input id="sp-bank" value="'+esc(s.bankName||"")+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>Телефон <span class="opt">(ихтиёрий)</span></label><input id="sp-phone" value="'+esc(s.phone||"")+'"></div>'+
      '<div class="field"><label>Масъул шахс <span class="opt">(ихтиёрий)</span></label><input id="sp-contact" value="'+esc(s.contactPerson||"")+'"></div></div>'+
      '<div class="field"><label>Манзил <span class="opt">(ихтиёрий)</span></label><input id="sp-address" value="'+esc(s.address||"")+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="sp-note">'+esc(s.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Қўшиш")+'</button>';
    var m = openModal(isEdit?"Ташкилотни таҳрирлаш":"Янги ташкилот", body, foot, true);
    /* onCancel — агар чақирувчи бошқа (масалан Омбор 2 буюртма) форма
       очиқ турганда шу ойнани фақат тезкор қўшиш учун очган бўлса,
       "Бекор қилиш" босилганда шу тезкор-қўшиш ойнасигина ёпилиши, лекин
       остидаги асосий форма (унда аллақачон киритилган маълумотлар билан)
       йўқолмасдан қайта очилиши учун. onCancel берилмаса — олдингидек,
       оддий closeModal(). */
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#sp-name").value.trim();
      if(!name){ toast("Номини киритинг"); return; }
      var data = {
        name:name, inn:m.querySelector("#sp-inn").value.trim(), mfo:m.querySelector("#sp-mfo").value.trim(),
        bankAccount:m.querySelector("#sp-account").value.trim(), bankName:m.querySelector("#sp-bank").value.trim(),
        phone:m.querySelector("#sp-phone").value.trim(), contactPerson:m.querySelector("#sp-contact").value.trim(),
        address:m.querySelector("#sp-address").value.trim(), note:m.querySelector("#sp-note").value.trim()
      };
      if(isEdit) dbUpdate("suppliers", s.id, data, STATE.suppliers);
      else { data.createdAt=new Date().toISOString(); dbAdd("suppliers", data, STATE.suppliers); }
      toast("Сақланди");
      closeModal();
      /* the receipt form resolves suppliers by name at submit time, so the
         new name is all a caller-supplied onSaved needs — no need to wait
         for the real server id to come back. */
      if(onSaved) onSaved(isEdit?s.id:null, data.name);
    });
  }

  function openSupplierPaymentModal(supplier){
    if(!supplier) return;
    var payable = supplierPayable(supplier.id);
    var body = '<div class="field"><label>Жами қарзимиз</label><div class="num" style="font-size:20px;font-weight:700;color:var(--critical);">'+fmtSum(payable)+'</div></div>'+
      '<div class="field"><label>Тўлов суммаси</label><input id="sppay-amount" type="number" min="0" step="any" value="'+payable+'"></div>'+
      '<div class="field"><label>Қайси кассадан</label><select id="sppay-account">'+(STATE.cashAccounts.length?STATE.cashAccounts.map(function(a){return '<option value="'+a.id+'">'+esc(a.name)+'</option>';}).join(""):'<option value="">Аввал касса яратинг</option>')+'</select></div>'+
      '<div class="field"><label>Сана</label><input id="sppay-date" type="date" value="'+todayISO()+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><input id="sppay-note"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Тўловни сақлаш</button>';
    var m = openModal("Тўлов қилиш — "+esc(supplier.name), body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var amount = Number(m.querySelector("#sppay-amount").value)||0;
      var accountId = m.querySelector("#sppay-account").value;
      var date = m.querySelector("#sppay-date").value||todayISO();
      var note = m.querySelector("#sppay-note").value.trim();
      if(amount<=0){ toast("Суммани киритинг"); return; }
      if(!accountId){ toast("Кассани танланг"); return; }
      var availForPay = cashMethodBalance(accountId, "naqd");
      if(amount>availForPay){ toast("Кассада пул етарли эмас — қолдиқ: "+fmtSum(availForPay)); return; }
      var remaining = amount;
      var unpaidReceipts = STATE.receipts.filter(function(r){return r.supplierId===supplier.id && Number(r.payableAmount||0)>0;}).sort(function(a,b){return (a.createdAt||"").localeCompare(b.createdAt||"");});
      unpaidReceipts.forEach(function(r){
        if(remaining<=0) return;
        var owed = Number(r.payableAmount||0);
        var apply = Math.min(owed, remaining);
        dbUpdate("receipts", r.id, {payableAmount:owed-apply, paidAmount:Number(r.paidAmount||0)+apply}, STATE.receipts);
        remaining -= apply;
      });
      recordCashTx(accountId, "chiqim", amount, "taminotchi_tolovi", {supplierId:supplier.id, description:"Ташкилотга тўлов: "+supplier.name});
      dbAdd("supplierPayments", {supplierId:supplier.id, supplierName:supplier.name, amount:amount, cashAccountId:accountId, date:date, note:note, createdAt:new Date().toISOString()}, STATE.supplierPayments);
      toast("Тўлов сақланди");
      closeModal();
    });
  }

  function openSupplierDetail(supplier){
    if(!supplier) return;
    var receipts = STATE.receipts.filter(function(r){return r.supplierId===supplier.id;}).sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
    var payments = STATE.supplierPayments.filter(function(p){return p.supplierId===supplier.id;});
    var rows = receipts.map(function(r){
      var st = Number(r.payableAmount||0)>0 ? '<span class="chip chip-warning">Қарз: '+fmtSum(r.payableAmount)+'</span>' : '<span class="chip chip-good">Тўланган</span>';
      return '<tr><td class="cell-muted">'+fmtDateShort((r.date||r.createdAt||"").slice(0,10))+'</td><td>'+esc(r.itemName)+'</td><td class="num">'+fmtNum(r.quantity)+'</td><td class="num cell-strong">'+fmtSum(r.totalWithVat)+'</td><td class="num">'+fmtSum(r.paidAmount||0)+'</td><td>'+st+'</td></tr>';
    }).join("");
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">СТИР</div><div class="dd">'+esc(supplier.inn||"—")+'</div></div>'+
      '<div><div class="dl">Ҳисоб рақами</div><div class="dd">'+esc(supplier.bankAccount||"—")+'</div></div>'+
      '<div><div class="dl">Банк</div><div class="dd">'+esc(supplier.bankName||"—")+' '+(supplier.mfo?("(МФО "+esc(supplier.mfo)+")"):"")+'</div></div>'+
      '<div><div class="dl">Телефон</div><div class="dd">'+esc(supplier.phone||"—")+'</div></div>'+
      '<div><div class="dl">Масъул шахс</div><div class="dd">'+esc(supplier.contactPerson||"—")+'</div></div>'+
      '<div><div class="dl">Манзил</div><div class="dd">'+esc(supplier.address||"—")+'</div></div>'+
      '</div>'+
      '<div class="card" style="padding:14px 16px;margin-bottom:14px;"><div style="display:flex;justify-content:space-between;"><span style="font-weight:800;">Жами қарзимиз</span><span class="num" style="font-size:18px;font-weight:800;color:var(--critical);">'+fmtSum(supplierPayable(supplier.id))+'</span></div></div>'+
      '<h2 style="font-size:13px;font-weight:800;margin:0 0 8px;">Кирим тарихи</h2>'+
      (rows?'<div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>Сана</th><th>Маҳсулот</th><th>Миқдор</th><th>Жами</th><th>Тўланган</th><th>Ҳолат</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="field-hint">Ҳали кирим йўқ</div>')+
      /* Фойдаланувчи сўровига кўра: таъминотчи карточкасида қайтарилган
         лом/металл ҳам кўриниши, ва улар ҳисоб-китобдан (қарздан)
         айирилгани аниқ бўлиши керак — шунга кўра алоҳида "Возврат
         тарихи" бўлими қўшилди (қаранг: supplierLomReturns). Бекор
         қилинган возватлар ҳам кўринади, лекин хиралаштирилган ҳолда —
         улар қарзга ҳеч қандай таъсир қилмайди. */
      (function(){
        var returns = supplierLomReturns(supplier.id);
        if(!returns.length) return "";
        return '<h2 style="font-size:13px;font-weight:800;margin:0 0 8px;">Возврат тарихи (лом/металл)</h2>'+
          returns.map(function(x){
            var typeLabel = x.productType==="metal" ? "Металл" : "Хом лом";
            return '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px;'+(x.cancelled?'opacity:.5;':'')+'"><span>'+fmtDateShort(x.date)+' · '+typeLabel+' · '+esc(x.batchNumber||"—")+(x.cancelled?' · бекор қилинган':'')+'</span><span class="num" style="color:'+(x.cancelled?'inherit':'var(--good)')+';">−'+fmtSum(x.appliedAmt!=null?x.appliedAmt:x.sum)+'</span></div>';
          }).join("")+
          '<div style="margin-bottom:14px;"></div>';
      })()+
      (payments.length?('<h2 style="font-size:13px;font-weight:800;margin:0 0 8px;">Тўловлар тарихи</h2>'+payments.map(function(p){return '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px;"><span>'+fmtDateShort((p.date||"").slice(0,10))+' · '+esc(cashAccountName(p.cashAccountId))+'</span><span class="num">'+fmtSum(p.amount)+'</span></div>';}).join(""))
        :"");
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print title="Чоп этиш">'+ICONS.printer+'</button><button class="btn btn-secondary btn-icon" data-excel title="Excelга юклаб олиш">'+ICONS.download+'</button><button class="btn btn-secondary" data-edit>Таҳрирлаш</button>'+(supplierPayable(supplier.id)>0?'<button class="btn btn-primary" data-pay>Тўлов қилиш</button>':"");
    var m = openModal(esc(supplier.name), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelector("[data-edit]").addEventListener("click", function(){ closeModal(); openSupplierForm(supplier); });
    m.querySelector("[data-print]").addEventListener("click", function(){ printSupplierStatement(supplier); });
    m.querySelector("[data-excel]").addEventListener("click", function(){ exportSupplierStatementExcel(supplier); });
    var payBtn = m.querySelector("[data-pay]");
    if(payBtn) payBtn.addEventListener("click", function(){ closeModal(); openSupplierPaymentModal(supplier); });
  }

  function renderWhTransfers(){
    setTopbar("Омборлар — Ички кўчириш", STATE.transfers.length+" та кўчириш", whCreateBtnHtml());
    var root = document.getElementById("content");
    var html = whSubnav("transfers");
    if(!STATE.warehouses.length){
      html += emptyState("Аввал омбор яратинг","Ички кўчириш учун «Бошқарув» бўлимида камида битта омбор яратинг.");
      root.innerHTML = html; wireWhSubnav(root); return;
    }
    html += '<div id="whFormHolder" style="display:none;"><div class="card" style="padding:20px 22px;">'+
      '<div class="field"><label>Маҳсулот/хомашё</label>'+itemComboInputHtml("tr-item", "tr-item-datalist", null)+'</div>'+
      '<div class="field-row"><div class="field"><label>Қаердан</label><select id="tr-from">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'">'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Қаерга</label><select id="tr-to">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'">'+esc(w.name)+'</option>';}).join("")+'</select></div></div>'+
      '<div class="field"><label>Миқдори</label><input id="tr-qty" type="number" min="0" step="any" value="0"></div>'+
      '<div class="field"><label>Сана</label><input id="tr-date" type="date" value="'+todayISO()+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="tr-note"></textarea></div>'+
      '<div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" id="tr-submit">'+ICONS.swap+'Ички кўчиришни амалга ошириш</button></div>'+
      '</div></div><div id="whSide"></div>';
    root.innerHTML = html;
    wireWhSubnav(root);
    renderTransfersSide(document.getElementById("whSide"));
    whFormModalSetup("Янги ички кўчириш");
    document.getElementById("tr-submit").addEventListener("click", function(){
      var trItemResolved = resolveItemFromComboValue(document.getElementById("tr-item").value);
      var itemId=trItemResolved?trItemResolved.id:"", from=document.getElementById("tr-from").value, to=document.getElementById("tr-to").value;
      var qty=Number(document.getElementById("tr-qty").value)||0, date=document.getElementById("tr-date").value||todayISO(), note=document.getElementById("tr-note").value.trim();
      if(!itemId){ toast("Рўйхатдан тўғри маҳсулотни танланг"); return; }
      if(from===to){ toast("Омборлар турлича бўлиши керак"); return; }
      if(qty<=0){ toast("Миқдорни киритинг"); return; }
      var it=itemById(itemId);
      var cur = stockQty(itemId, from);
      var proceed = function(){
        adjustStockBy(itemId, from, -qty);
        adjustStockBy(itemId, to, qty);
        dbAdd("transfers", {itemId:itemId, itemName:it?it.name:"", fromWarehouseId:from, toWarehouseId:to, quantity:qty, date:date, note:note, createdAt:new Date().toISOString()}, STATE.transfers);
        toast("Кўчирилди");
        render();
      };
      if(qty>cur){
        openConfirm("Омборда етарли эмас","«"+warehouseName(from)+"» омборида етарли миқдор йўқ (қолди: "+fmtNum(cur)+" "+(it?it.unit:"")+"). Барибир давом этайми?", "Ҳа, давом этиш", proceed, true);
      } else proceed();
    });
  }

  function renderWhWriteoffs(){
    setTopbar("Омборлар — Хисобдан чиқариш", STATE.writeoffs.length+" та акт", whCreateBtnHtml());
    var root = document.getElementById("content");
    var html = whSubnav("writeoffs");
    if(!STATE.warehouses.length){
      html += emptyState("Аввал омбор яратинг","Хисобдан чиқариш учун «Бошқарув» бўлимида омбор яратинг.");
      root.innerHTML = html; wireWhSubnav(root); return;
    }
    html += '<div id="whFormHolder" style="display:none;"><div class="card" style="padding:20px 22px;">'+
      '<div class="field-row"><div class="field"><label>Омбор</label><select id="wo-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'">'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Маҳсулот/хомашё</label>'+itemComboInputHtml("wo-item", "wo-item-datalist", null)+'</div></div>'+
      '<div class="field"><label>Миқдори</label><input id="wo-qty" type="number" min="0" step="any" value="0"></div>'+
      '<div class="field"><label>Сабаби</label><textarea id="wo-reason" placeholder="Хисобдан чиқариш сабаби…"></textarea></div>'+
      '<div class="field-row"><div class="field"><label>Акт рақами</label><input id="wo-actnum" placeholder="№"></div>'+
      '<div class="field"><label>Акт санаси</label><input id="wo-actdate" type="date" value="'+todayISO()+'"></div></div>'+
      '<div class="field"><label>Масъул ходим</label><div style="display:flex;gap:6px;"><select id="wo-emp" style="flex:1;min-width:0;"><option value="">— танланг —</option>'+STATE.employees.map(function(e){return '<option value="'+e.id+'">'+esc(e.fullName)+'</option>';}).join("")+'</select><button type="button" class="btn btn-secondary btn-icon" id="wo-emp-add" title="Янги ходим қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
      '<div class="field"><label>Акт файли (скан)</label><input id="wo-file" type="file" accept="image/*,.pdf">'+
      '<div class="field-hint">'+(STATE.assetsApi ? "Файл юкланади ва тизимда сақланади." : "Файл юклаш имконияти ҳозир йўқ — фақат файл номи эслатма сифатида сақланади, асл ҳужжатни қоғозда сақланг.")+'</div></div>'+
      '<div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" id="wo-submit">Хисобдан чиқариш</button></div>'+
      '</div></div><div id="whSide"></div>';
    root.innerHTML = html;
    wireWhSubnav(root);
    renderWriteoffsSide(document.getElementById("whSide"));
    whFormModalSetup("Янги хисобдан чиқариш акти");
    var woEmpAddBtn = document.getElementById("wo-emp-add");
    if(woEmpAddBtn) woEmpAddBtn.addEventListener("click", function(){
      var woSnapItem = resolveItemFromComboValue(document.getElementById("wo-item").value);
      var snap = {
        wh: document.getElementById("wo-wh").value, item: woSnapItem?woSnapItem.id:"",
        qty: document.getElementById("wo-qty").value, reason: document.getElementById("wo-reason").value,
        actnum: document.getElementById("wo-actnum").value, actdate: document.getElementById("wo-actdate").value
      };
      openEmployeeForm(null, function(empId){
        var byId = function(id){ return document.getElementById(id); };
        if(byId("wo-wh")) byId("wo-wh").value = snap.wh;
        setItemComboInputValue("wo-item", snap.item);
        if(byId("wo-qty")) byId("wo-qty").value = snap.qty;
        if(byId("wo-reason")) byId("wo-reason").value = snap.reason;
        if(byId("wo-actnum")) byId("wo-actnum").value = snap.actnum;
        if(byId("wo-actdate")) byId("wo-actdate").value = snap.actdate;
        if(byId("wo-emp")) byId("wo-emp").value = empId||"";
        toast("Акт файлини қайта танланг — саҳифа янгиланганда файл танлови сақланмайди");
      });
    });
    document.getElementById("wo-submit").addEventListener("click", function(){
      var btn=this;
      var whId=document.getElementById("wo-wh").value;
      var woResolved = resolveItemFromComboValue(document.getElementById("wo-item").value);
      var itemId = woResolved ? woResolved.id : "";
      var qty=Number(document.getElementById("wo-qty").value)||0;
      var reason=document.getElementById("wo-reason").value.trim();
      var actNumber=document.getElementById("wo-actnum").value.trim();
      var actDate=document.getElementById("wo-actdate").value||todayISO();
      var empId=document.getElementById("wo-emp").value;
      if(!whId||!itemId){ toast("Омбор ва маҳсулотни танланг"); return; }
      if(qty<=0){ toast("Миқдорни киритинг"); return; }
      if(!reason){ toast("Сабабини киритинг"); return; }
      if(!actNumber){ toast("Акт рақамини киритинг"); return; }
      if(!empId){ toast("Масъул ходимни танланг"); return; }
      var cur = stockQty(itemId, whId);
      var fileInput = document.getElementById("wo-file");
      var file = fileInput.files[0];
      if(!file){ toast("Акт файлини бириктиринг"); return; }
      var it = itemById(itemId);
      var doWrite = function(fileMeta){
        adjustStockBy(itemId, whId, -qty);
        dbAdd("writeoffs", {
          warehouseId:whId, itemId:itemId, itemName:it?it.name:"", quantity:qty, reason:reason,
          actNumber:actNumber, actDate:actDate, responsibleEmployeeId:empId,
          fileAssetId:fileMeta?fileMeta.id:"", fileUrl:fileMeta?fileMeta.url:"", fileName:file.name,
          createdAt:new Date().toISOString()
        }, STATE.writeoffs);
        toast("Хисобдан чиқарилди — омбор янгиланди");
        render();
      };
      var proceed = function(){
        btn.disabled=true; btn.textContent="Юкланмоқда…";
        if(STATE.assetsApi){
          STATE.assetsApi.upload(file).then(function(res){ doWrite(res); }).catch(function(e){
            console.error(e); toast("Файл юкланмади — фақат номи сақланди"); doWrite(null);
          });
        } else { doWrite(null); }
      };
      if(qty>cur){
        openConfirm("Омборда етарли эмас","Танланган миқдор омбордаги қолдиқдан кўп (қолди: "+fmtNum(cur)+" "+(it?it.unit:"")+"). Барибир давом этиб, қолдиқни 0 гача туширайми?", "Ҳа, давом этиш", proceed, true);
      } else { proceed(); }
    });
  }

  /* Инвентаризацияда бир нечта маҳсулот/хомашё ёки ускуна-жиҳоз қаторини
     БИР СЕССИЯДА қўшиш имкони (фойдаланувчи сўровига кўра) — ҳар сафар
     биттадан киритиб, сақлаб, қайтадан очишга ҳожат қолмайди. Қаторлар
     STATE'да сақланади (recipeDraft каби), токи "+" орқали янги
     маҳсулот/ускуна яратиш модали очилиб-ёпилганда қаторлар йўқолмасин. */
  function freshInvItemRows(){ return [{itemId:"", counted:"", price:"", priceAuto:false}]; }
  function invItemRows(){ if(!STATE.invItemRows || !STATE.invItemRows.length) STATE.invItemRows = freshInvItemRows(); return STATE.invItemRows; }
  function freshInvEqRows(){ return [{equipmentId:"", counted:"", price:""}]; }
  function invEqRows(){ if(!STATE.invEqRows || !STATE.invEqRows.length) STATE.invEqRows = freshInvEqRows(); return STATE.invEqRows; }

  function renderWhInventory(){
    var invKind = STATE.invKind||"item";
    setTopbar("Инвентаризация", STATE.inventories.length+" та ёзув", whCreateBtnHtml());
    var root = document.getElementById("content");
    var html = whSubnav("inventory");
    if(!STATE.warehouses.length){
      html += emptyState("Аввал омбор яратинг","Инвентаризация учун «Бошқарув» бўлимида омбор яратинг.");
      root.innerHTML = html; wireWhSubnav(root); return;
    }
    html += '<div id="whFormHolder" style="display:none;"><div class="card" style="padding:20px 22px;">'+
      '<div class="filter-row" style="margin-bottom:16px;">'+
      '<button class="pill-filter'+(invKind==="item"?" active":"")+'" data-invkind="item">Маҳсулот/хомашё</button>'+
      '<button class="pill-filter'+(invKind==="equipment"?" active":"")+'" data-invkind="equipment">Ускуна ва жиҳозлар</button>'+
      '</div>';
    if(invKind==="equipment"){
      var eqRows = invEqRows();
      html += '<div class="section-head" style="margin-bottom:8px;"><h2 style="font-size:13.5px;">Ускуна/жиҳозлар</h2><button type="button" class="btn btn-secondary btn-sm" id="inv-eq-add-row">'+ICONS.plus+'Қатор қўшиш</button></div>'+
        (STATE.equipment.length?'':'<div class="field-hint" style="margin-bottom:10px;">Ҳали ускуна ва жиҳоз киритилмаган — қатордаги «+» тугмаси орқали қўшинг.</div>')+
        '<div id="inv-eq-rows">'+eqRows.map(function(row,i){
          var eq = equipmentById(row.equipmentId);
          return '<div class="card" style="padding:12px 14px;margin-bottom:10px;background:var(--surface-2);" data-inv-eq-row="'+i+'">'+
            '<div class="field-row"><div class="field" style="margin-bottom:0;"><label>Ускуна ёки жиҳоз</label><div style="display:flex;gap:6px;"><select data-inv-eq-select="'+i+'" style="flex:1;min-width:0;">'+equipmentOptionsHtml(row.equipmentId)+'</select><button type="button" class="btn btn-secondary btn-icon" data-inv-eq-add="'+i+'" title="Рўйхатда йўқ бўлса, янги ускуна ва жиҳоз қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button>'+(eqRows.length>1?'<button type="button" class="btn btn-ghost btn-icon" data-inv-eq-remove="'+i+'" title="Қаторни ўчириш" style="flex-shrink:0;">'+ICONS.x+'</button>':'')+'</div></div></div>'+
            '<div class="field-row"><div class="field" style="margin-bottom:0;"><label>Тизимдаги жорий сони</label><div class="num" data-inv-eq-current="'+i+'" style="font-size:16px;font-weight:700;padding-top:6px;">'+(eq?fmtNum(eq.qty||0):"—")+'</div></div>'+
            '<div class="field" style="margin-bottom:0;"><label>Саналган (ҳақиқий) сони</label><input type="number" min="0" step="any" data-inv-eq-counted="'+i+'" value="'+esc(row.counted)+'"></div></div>'+
            '<div class="field" style="margin-bottom:0;"><label>Нархи (1 дона, сўм) <span class="opt">(картадаги нарх автомат — керак бўлса ўзгартиринг)</span></label><input type="number" min="0" step="any" data-inv-eq-price="'+i+'" value="'+esc(row.price!==""&&row.price!=null?row.price:(eq?equipmentUnitPrice(eq):""))+'"></div>'+
            '</div>';
        }).join("")+'</div>'+
        '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий, барча қаторларга умумий)</span></label><textarea id="inv-note"></textarea></div>'+
        '<div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" id="inv-submit">Инвентаризацияни сақлаш</button></div>';
    } else {
      var itRows = invItemRows();
      html += '<div class="field"><label>Омбор</label><select id="inv-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(STATE.invWh===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
        '<div class="section-head" style="margin-bottom:8px;"><h2 style="font-size:13.5px;">Маҳсулот/хомашёлар</h2><button type="button" class="btn btn-secondary btn-sm" id="inv-item-add-row">'+ICONS.plus+'Қатор қўшиш</button></div>'+
        '<div id="inv-item-rows">'+itRows.map(function(row,i){
          return '<div class="card" style="padding:12px 14px;margin-bottom:10px;background:var(--surface-2);" data-inv-item-row="'+i+'">'+
            '<div class="field" style="margin-bottom:8px;"><label>Маҳсулот/хомашё</label><div style="display:flex;gap:6px;">'+itemComboInputHtml("inv-item-"+i, "inv-item-datalist-"+i, row.itemId?itemById(row.itemId):null, null, "flex:1;min-width:0;", null, 'data-inv-item-input="'+i+'"')+'<button type="button" class="btn btn-secondary btn-icon" data-inv-item-add="'+i+'" title="Рўйхатда йўқ бўлса, янги маҳсулот/хомашё қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button>'+(itRows.length>1?'<button type="button" class="btn btn-ghost btn-icon" data-inv-item-remove="'+i+'" title="Қаторни ўчириш" style="flex-shrink:0;">'+ICONS.x+'</button>':'')+'</div></div>'+
            '<div class="field-row"><div class="field" style="margin-bottom:0;"><label>Тизимдаги жорий қолдиқ</label><div class="num" data-inv-item-current="'+i+'" style="font-size:16px;font-weight:700;padding-top:6px;">—</div></div>'+
            '<div class="field" style="margin-bottom:0;"><label>Саналган (ҳақиқий) миқдор</label><input type="number" min="0" step="any" data-inv-item-counted="'+i+'" value="'+esc(row.counted)+'"></div>'+
            '<div class="field" style="margin-bottom:0;"><label>Янги нархи <span class="opt">(қолдиқнинг ўртача нархи автомат — керак бўлса ўзгартиринг)</span></label><input type="number" min="0" step="any" data-inv-item-price="'+i+'" value="'+esc(row.price)+'"></div></div>'+
            '</div>';
        }).join("")+'</div>'+
        '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий, барча қаторларга умумий)</span></label><textarea id="inv-note"></textarea></div>'+
        '<div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" id="inv-submit">Инвентаризацияни сақлаш</button></div>';
    }
    html += '</div></div><div id="whSide"></div>';
    root.innerHTML = html;
    wireWhSubnav(root);
    renderInventorySide(document.getElementById("whSide"));
    root.querySelectorAll("[data-invkind]").forEach(function(b){ b.addEventListener("click", function(){ STATE.invKind=b.getAttribute("data-invkind"); render(); }); });
    whFormModalSetup("Янги инвентаризация");

    if(invKind==="equipment"){
      var eqRowsState = invEqRows();
      function updateEqCurrent(i){
        var row = eqRowsState[i]; if(!row) return;
        var eq = equipmentById(row.equipmentId);
        var cell = document.querySelector('[data-inv-eq-current="'+i+'"]');
        if(cell) cell.textContent = eq ? fmtNum(eq.qty||0) : "—";
      }
      document.querySelectorAll("[data-inv-eq-select]").forEach(function(sel){
        sel.addEventListener("change", function(){
          var i = Number(this.getAttribute("data-inv-eq-select"));
          eqRowsState[i].equipmentId = this.value;
          updateEqCurrent(i);
          /* Ускуна танланганда нарх катаги картадаги нарх билан автомат
             тўлдирилади (фойдаланувчи ўзи ёзган бўлса — тегилмайди). */
          var eqSel = equipmentById(this.value);
          var priceEl = document.querySelector('[data-inv-eq-price="'+i+'"]');
          if(priceEl && !eqRowsState[i].priceManual){
            var pv = eqSel ? equipmentUnitPrice(eqSel) : 0;
            priceEl.value = pv ? pv : "";
            eqRowsState[i].price = priceEl.value;
          }
        });
      });
      document.querySelectorAll("[data-inv-eq-counted]").forEach(function(inp){
        inp.addEventListener("input", function(){
          var i = Number(this.getAttribute("data-inv-eq-counted"));
          eqRowsState[i].counted = this.value;
        });
      });
      document.querySelectorAll("[data-inv-eq-price]").forEach(function(inp){
        inp.addEventListener("input", function(){
          var i = Number(this.getAttribute("data-inv-eq-price"));
          eqRowsState[i].price = this.value;
          eqRowsState[i].priceManual = true;
        });
      });
      document.getElementById("inv-eq-add-row").addEventListener("click", function(){
        eqRowsState.push({equipmentId:"", counted:"", price:""});
        render();
      });
      document.querySelectorAll("[data-inv-eq-remove]").forEach(function(b){
        b.addEventListener("click", function(){
          eqRowsState.splice(Number(this.getAttribute("data-inv-eq-remove")),1);
          render();
        });
      });
      document.querySelectorAll("[data-inv-eq-add]").forEach(function(b){
        b.addEventListener("click", function(){
          var i = Number(this.getAttribute("data-inv-eq-add"));
          var noteVal = document.getElementById("inv-note").value;
          openEquipmentForm(null, function(newEqId){
            eqRowsState[i].equipmentId = newEqId||"";
            STATE.invNoteDraft = noteVal;
            render();
          });
        });
      });
      var noteElEq = document.getElementById("inv-note");
      if(STATE.invNoteDraft!=null){ noteElEq.value = STATE.invNoteDraft; STATE.invNoteDraft = null; }
      document.getElementById("inv-submit").addEventListener("click", function(){
        var note = document.getElementById("inv-note").value.trim();
        var validRows = [];
        for(var i=0;i<eqRowsState.length;i++){
          var row = eqRowsState[i];
          var eq = equipmentById(row.equipmentId);
          if(!row.equipmentId && row.counted===""){ continue; }
          if(!eq){ toast(((i+1))+"-қаторда рўйхатдан ускуна ёки жиҳозни танланг"); return; }
          if(row.counted===""){ toast(((i+1))+"-қаторда саналган сонини киритинг"); return; }
          var rowPrice = (row.price!=="" && row.price!=null) ? (Number(row.price)||0) : equipmentUnitPrice(eq);
          validRows.push({eq:eq, counted:Number(row.counted)||0, price:rowPrice});
        }
        if(!validRows.length){ toast("Камида битта қаторни тўлдиринг"); return; }
        validRows.forEach(function(row){
          var cur = row.eq.qty||0;
          /* Инвентаризацияда киритилган нарх ускуна картасига ҳам ёзилади —
             рўйхатдаги "Жами сумма" шу нарх бўйича ҳисобланади. */
          dbUpdate("equipment", row.eq.id, {qty:row.counted, price:row.price}, STATE.equipment);
          dbAdd("inventories", {
            entityType:"equipment", equipmentId:row.eq.id, itemId:"", itemName:row.eq.name, warehouseId:"", systemQty:cur, countedQty:row.counted, delta:row.counted-cur,
            price:row.price, note:note, date:todayISO(), createdAt:new Date().toISOString()
          }, STATE.inventories);
        });
        toast("Инвентаризация сақланди — сони янгиланди ("+validRows.length+" та қатор)");
        STATE.invEqRows = freshInvEqRows();
        render();
      });
    } else {
      var itRowsState = invItemRows();
      var whSelEl = document.getElementById("inv-wh");
      whSelEl.addEventListener("change", function(){ STATE.invWh = this.value; updateAllItemCurrents(); });
      function currentWh(){ return whSelEl.value; }
      function updateItemCurrent(i){
        var row = itRowsState[i]; if(!row) return;
        var it = itemById(row.itemId);
        var cur = (currentWh()&&row.itemId) ? stockQty(row.itemId, currentWh()) : 0;
        var cell = document.querySelector('[data-inv-item-current="'+i+'"]');
        if(cell) cell.textContent = fmtNum(cur)+(it?" "+it.unit:"");
      }
      function updateAllItemCurrents(){ itRowsState.forEach(function(row,i){ updateItemCurrent(i); }); }
      document.querySelectorAll("[data-inv-item-input]").forEach(function(inp){
        var handler = function(){
          var i = Number(inp.getAttribute("data-inv-item-input"));
          var resolved = resolveItemFromComboValue(this.value);
          itRowsState[i].itemId = resolved ? resolved.id : "";
          /* Янги нархи майдони — фақат ФОЙДАЛАНУВЧИ ҳали ўзгартирмаган
             бўлса (яъни ҳали бўш ёки аввалги авто-қиймат билан бир хил
             бўлса) — қолдиқнинг жорий ўртача нархига автомат янгиланади,
             токи фойдаланувчининг ўз қўлда киритган нархини босиб
             кетмасин. */
          var priceInput = document.querySelector('[data-inv-item-price="'+i+'"]');
          var rowRef = itRowsState[i];
          if(resolved && priceInput && (rowRef.price==="" || rowRef.priceAuto)){
            var avg = itemAveragePrice(resolved.id, currentWh());
            priceInput.value = avg ? Number(avg.toFixed(2)) : "";
            rowRef.price = priceInput.value;
            rowRef.priceAuto = true;
          }
          updateItemCurrent(i);
        };
        inp.addEventListener("input", handler);
        inp.addEventListener("change", handler);
      });
      document.querySelectorAll("[data-inv-item-counted]").forEach(function(inp){
        inp.addEventListener("input", function(){
          var i = Number(this.getAttribute("data-inv-item-counted"));
          itRowsState[i].counted = this.value;
        });
      });
      document.querySelectorAll("[data-inv-item-price]").forEach(function(inp){
        inp.addEventListener("input", function(){
          var i = Number(this.getAttribute("data-inv-item-price"));
          itRowsState[i].price = this.value;
          itRowsState[i].priceAuto = false;
        });
      });
      updateAllItemCurrents();
      document.getElementById("inv-item-add-row").addEventListener("click", function(){
        itRowsState.push({itemId:"", counted:"", price:"", priceAuto:false});
        render();
      });
      document.querySelectorAll("[data-inv-item-remove]").forEach(function(b){
        b.addEventListener("click", function(){
          itRowsState.splice(Number(this.getAttribute("data-inv-item-remove")),1);
          render();
        });
      });
      document.querySelectorAll("[data-inv-item-add]").forEach(function(b){
        b.addEventListener("click", function(){
          var i = Number(this.getAttribute("data-inv-item-add"));
          var noteVal = document.getElementById("inv-note").value;
          openItemForm(null, function(newItemId){
            itRowsState[i].itemId = newItemId||"";
            if(newItemId){ itRowsState[i].price = Number((itemAveragePrice(newItemId, currentWh())||0).toFixed(2)); itRowsState[i].priceAuto = true; }
            STATE.invNoteDraft = noteVal;
            render();
          });
        });
      });
      var noteElIt = document.getElementById("inv-note");
      if(STATE.invNoteDraft!=null){ noteElIt.value = STATE.invNoteDraft; STATE.invNoteDraft = null; }
      document.getElementById("inv-submit").addEventListener("click", function(){
        var whId = currentWh();
        var note = document.getElementById("inv-note").value.trim();
        if(!whId){ toast("Омборни танланг"); return; }
        var validRows = [];
        for(var i=0;i<itRowsState.length;i++){
          var row = itRowsState[i];
          if(!row.itemId && row.counted===""){ continue; }
          if(!row.itemId){ toast(((i+1))+"-қаторда рўйхатдан тўғри маҳсулотни танланг"); return; }
          if(row.counted===""){ toast(((i+1))+"-қаторда саналган миқдорни киритинг"); return; }
          validRows.push({itemId:row.itemId, counted:Number(row.counted)||0, price:row.price});
        }
        if(!validRows.length){ toast("Камида битта қаторни тўлдиринг"); return; }
        validRows.forEach(function(row){
          var it = itemById(row.itemId);
          var cur = stockQty(row.itemId, whId);
          var priceStr = row.price;
          setStockQty(row.itemId, whId, row.counted);
          if(priceStr!==""){ dbUpdate("items", row.itemId, {price:Number(priceStr)||0, updatedAt:new Date().toISOString()}, STATE.items); }
          dbAdd("inventories", {
            entityType:"item", warehouseId:whId, itemId:row.itemId, itemName:it?it.name:"", systemQty:cur, countedQty:row.counted, delta:row.counted-cur,
            price: priceStr!==""?Number(priceStr):(it?it.price:0), note:note, date:todayISO(), createdAt:new Date().toISOString()
          }, STATE.inventories);
        });
        toast("Инвентаризация сақланди — қолдиқ янгиланди ("+validRows.length+" та қатор)");
        STATE.invItemRows = freshInvItemRows();
        render();
      });
    }
  }

  function renderWhManage(){
    setTopbar("Омборлар — Бошқарув", "Омборлар, категориялар ва админ созламалари", "");
    var html = whSubnav("manage");
    html += '<div style="margin-bottom:16px;">'+(STATE.isAdmin ? '<span class="chip chip-good">'+ICONS.unlock+'Админ ҳуқуқи очиқ</span>' : '<button class="btn btn-secondary btn-sm" id="unlockAdminBtn">'+ICONS.lock+'Админ ҳуқуқини очиш</button>')+'</div>';
    html += '<div class="two-col">';
    html += '<div class="section" style="margin-bottom:0;"><div class="section-head"><h2>Омборлар</h2><button class="btn btn-secondary btn-sm" id="addWhBtn">'+ICONS.plus+'Омбор қўшиш</button></div>'+
      (STATE.warehouses.length ? '<div class="card" style="padding:6px 14px;"><div class="alert-list" style="padding:6px 0;">'+STATE.warehouses.map(function(w){
        return '<div class="alert-row"><div class="grow"><div class="t">'+esc(w.name)+'</div>'+(w.note?'<div class="s">'+esc(w.note)+'</div>':'')+'</div>'+
          '<div class="row-actions"><button class="btn btn-ghost btn-icon" data-edit-wh="'+w.id+'">'+ICONS.pencil+'</button><button class="btn btn-ghost btn-icon" data-del-wh="'+w.id+'">'+ICONS.trash+'</button></div></div>';
      }).join("")+'</div></div>' : '<div class="card" style="padding:20px;text-align:center;color:var(--ink-3);font-size:13px;">Омборлар йўқ</div>')+
      '</div>';
    html += '<div class="section" style="margin-bottom:0;"><div class="section-head"><h2>Категориялар</h2><button class="btn btn-secondary btn-sm" id="addCatBtn">'+ICONS.plus+'Категория қўшиш</button></div>'+
      (STATE.categories.length ? '<div class="card" style="padding:6px 14px;"><div class="alert-list" style="padding:6px 0;">'+STATE.categories.map(function(c){
        return '<div class="alert-row"><div class="grow"><div class="t">'+esc(c.name)+'</div></div>'+
          '<div class="row-actions"><button class="btn btn-ghost btn-icon" data-edit-cat="'+c.id+'">'+ICONS.pencil+'</button><button class="btn btn-ghost btn-icon" data-del-cat="'+c.id+'">'+ICONS.trash+'</button></div></div>';
      }).join("")+'</div></div>' : '<div class="card" style="padding:20px;text-align:center;color:var(--ink-3);font-size:13px;">Категориялар йўқ</div>')+
      '</div>';
    html += '</div>';
    html += '<div class="section"><div class="section-head"><h2>Ўлчов бирликлари</h2><button class="btn btn-secondary btn-sm" id="addUnitBtn">'+ICONS.plus+'Ўлчов бирлиги қўшиш</button></div>'+
      '<div class="field-hint" style="margin:-4px 0 10px;">Бу ерда қўшилган бирликлар барча жойда (маҳсулот, калькуляция ва бошқа) танлаш рўйхатига қўшилади. Стандарт бирликлар ('+esc(UNIT_OPTIONS.join(", "))+') ҳар доим мавжуд бўлиб қолади.</div>'+
      (STATE.units.length ? '<div class="card" style="padding:6px 14px;"><div class="alert-list" style="padding:6px 0;">'+STATE.units.map(function(u){
        return '<div class="alert-row"><div class="grow"><div class="t">'+esc(u.name)+'</div></div>'+
          '<div class="row-actions"><button class="btn btn-ghost btn-icon" data-edit-unit="'+u.id+'">'+ICONS.pencil+'</button><button class="btn btn-ghost btn-icon" data-del-unit="'+u.id+'">'+ICONS.trash+'</button></div></div>';
      }).join("")+'</div></div>' : '<div class="card" style="padding:20px;text-align:center;color:var(--ink-3);font-size:13px;">Қўшимча ўлчов бирликлари йўқ</div>')+
      '</div>';
    html += '<div class="section"><div class="section-head"><h2>Лом (Алюмин) созламалари</h2></div><div class="card" style="padding:16px 18px;max-width:420px;">'+
      '<div class="field-hint" style="margin:-2px 0 10px;">Ишлаб чиқаришда ажратилган металл ва чиқинди кули автоматик шу омборларга кирим қилинади.</div>'+
      '<div class="field"><label>Металл учун белгиланган омбор</label><select id="lomMetalWhSelect"><option value="">— танланмаган —</option>'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(getSettings().lomMetalWarehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Чушка чиқинди кули учун белгиланган омбор</label><select id="lomKulWhSelect"><option value="">— танланмаган —</option>'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(getSettings().lomKulWarehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<button class="btn btn-primary btn-sm" id="saveLomSettingsBtn">Сақлаш</button></div></div>';
    if(STATE.isAdmin){
      html += '<div class="section"><div class="section-head"><h2>Админ PIN-кодини ўзгартириш</h2></div><div class="card" style="padding:16px 18px;max-width:340px;">'+
        '<div class="field"><label>Янги PIN</label><input id="newPinInput" type="password" placeholder="Янги PIN-код"></div>'+
        '<button class="btn btn-primary btn-sm" id="savePinBtn">Сақлаш</button></div></div>';
      /* Тизимга киришда ишлатиладиган Админ логин/паролини ўзгартириш —
         2026-10-01 сўровига кўра (иккинчи сўров): бутун дастур энди
         мажбурий логин девори ортида, шунга кўра админ ўз логин/паролини
         шу ердан кўриши ва ўзгартириши керак (стандарт: admin/admin0000). */
      html += '<div class="section"><div class="section-head"><h2>Админ логин ва паролини ўзгартириш</h2></div><div class="card" style="padding:16px 18px;max-width:340px;">'+
        '<div class="field-hint" style="margin:-2px 0 10px;">Тизимга кириш саҳифасида «Админ» сифатида кириш учун ишлатилади. Стандарт: логин <strong>admin</strong>, парол <strong>admin0000</strong>.</div>'+
        '<div class="field"><label>Логин</label><input id="adminLoginInput" value="'+esc(effectiveAdminLogin())+'"></div>'+
        '<div class="field"><label>Парол</label><input id="adminPasswordInput" value="'+esc(effectiveAdminPassword())+'"></div>'+
        '<button class="btn btn-primary btn-sm" id="saveAdminCredBtn">Сақлаш</button></div></div>';
    }
    var root = document.getElementById("content");
    root.innerHTML = html;
    wireWhSubnav(root);
    var unlockBtn = document.getElementById("unlockAdminBtn");
    if(unlockBtn) unlockBtn.addEventListener("click", function(){ openAdminPinModal(function(){ render(); }); });
    document.getElementById("addWhBtn").addEventListener("click", function(){ requireAdmin(function(){ openWarehouseForm(null); }); });
    document.getElementById("addCatBtn").addEventListener("click", function(){ requireAdmin(function(){ openCategoryForm(null); }); });
    root.querySelectorAll("[data-edit-wh]").forEach(function(b){ b.addEventListener("click", function(){ requireAdmin(function(){ openWarehouseForm(STATE.warehouses.find(function(x){return x.id===b.getAttribute("data-edit-wh");})); }); }); });
    root.querySelectorAll("[data-del-wh]").forEach(function(b){ b.addEventListener("click", function(){
      var w = STATE.warehouses.find(function(x){return x.id===b.getAttribute("data-del-wh");});
      requireAdmin(function(){
        openConfirm("Омборни ўчириш","«"+w.name+"» омбори ўчирилсинми? Бу омбордаги қолдиқ ёзувлари сақланиб қолади, лекин омбор рўйхатдан йўқолади.","Ҳа, ўчириш", function(){ dbDelete("warehouses", w.id, STATE.warehouses); toast("Ўчирилди"); }, true);
      });
    }); });
    root.querySelectorAll("[data-edit-cat]").forEach(function(b){ b.addEventListener("click", function(){ requireAdmin(function(){ openCategoryForm(STATE.categories.find(function(x){return x.id===b.getAttribute("data-edit-cat");})); }); }); });
    root.querySelectorAll("[data-del-cat]").forEach(function(b){ b.addEventListener("click", function(){
      var c = STATE.categories.find(function(x){return x.id===b.getAttribute("data-del-cat");});
      requireAdmin(function(){ openConfirm("Категорияни ўчириш","«"+c.name+"» ўчирилсинми?","Ҳа, ўчириш", function(){ dbDelete("categories", c.id, STATE.categories); toast("Ўчирилди"); }, true); });
    }); });
    document.getElementById("addUnitBtn").addEventListener("click", function(){ requireAdmin(function(){ openUnitForm(null); }); });
    root.querySelectorAll("[data-edit-unit]").forEach(function(b){ b.addEventListener("click", function(){ requireAdmin(function(){ openUnitForm(STATE.units.find(function(x){return x.id===b.getAttribute("data-edit-unit");})); }); }); });
    root.querySelectorAll("[data-del-unit]").forEach(function(b){ b.addEventListener("click", function(){
      var u = STATE.units.find(function(x){return x.id===b.getAttribute("data-del-unit");});
      requireAdmin(function(){ openConfirm("Ўлчов бирлигини ўчириш","«"+u.name+"» ўчирилсинми? Аввал бу бирлик билан киритилган маълумотлар ўзгармайди.","Ҳа, ўчириш", function(){ dbDelete("units", u.id, STATE.units); toast("Ўчирилди"); }, true); });
    }); });
    var saveLomBtn = document.getElementById("saveLomSettingsBtn");
    if(saveLomBtn) saveLomBtn.addEventListener("click", function(){
      requireAdmin(function(){
        var metalWh = document.getElementById("lomMetalWhSelect").value;
        var kulWh = document.getElementById("lomKulWhSelect").value;
        var s = getSettings();
        var patch = {lomMetalWarehouseId:metalWh, lomKulWarehouseId:kulWh};
        if(s.id) dbUpdate("settings", s.id, patch, STATE.settingsList);
        else dbAdd("settings", patch, STATE.settingsList);
        toast("Сақланди");
      });
    });
    var savePinBtn = document.getElementById("savePinBtn");
    if(savePinBtn) savePinBtn.addEventListener("click", function(){
      var v = document.getElementById("newPinInput").value.trim();
      if(!v){ toast("PIN киритинг"); return; }
      var s = getSettings();
      if(s.id) dbUpdate("settings", s.id, {adminPin:v}, STATE.settingsList);
      else dbAdd("settings", {adminPin:v}, STATE.settingsList);
      toast("PIN янгиланди");
    });
    var saveAdminCredBtn = document.getElementById("saveAdminCredBtn");
    if(saveAdminCredBtn) saveAdminCredBtn.addEventListener("click", function(){
      var newLogin = document.getElementById("adminLoginInput").value.trim();
      var newPassword = document.getElementById("adminPasswordInput").value.trim();
      if(!newLogin || !newPassword){ toast("Логин ва паролни киритинг"); return; }
      var s = getSettings();
      if(s.id) dbUpdate("settings", s.id, {adminLogin:newLogin, adminPassword:newPassword}, STATE.settingsList);
      else dbAdd("settings", {adminLogin:newLogin, adminPassword:newPassword}, STATE.settingsList);
      toast("Админ логин/пароли янгиланди");
    });
  }

  function openWarehouseForm(existing, onSaved){
    var isEdit = !!existing;
    var w = existing || {name:"", note:"", isFinishedGoods:false};
    var body = '<div class="field"><label>Номи</label><input id="w-name" placeholder="Масалан: Асосий омбор" value="'+esc(w.name)+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><input id="w-note" value="'+esc(w.note||"")+'"></div>'+
      /* 2026-10-03 Савдо формаси қайта қурилиши сўровига кўра: омбор
         "Тайёр маҳсулот омбори" деб белгилансин — шунда Савдо шаклида
         шу омбор танланганда қўшимча равишда қайси цехдан сотилаётгани
         сўралади (даромад тегишли цехга ёзилиши учун). Эски омборларда
         бу майдон йўқ — демак изкор false бўлиб, хулқ ўзгармайди. */
      '<div class="field" style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="w-finished" style="width:auto;" '+(w.isFinishedGoods?"checked":"")+'><label for="w-finished" style="margin:0;cursor:pointer;">Тайёр маҳсулот омбори (сотувда цех танланади)</label></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Яратиш")+'</button>';
    var m = openModal(isEdit?"Омборни таҳрирлаш":"Янги омбор", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#w-name").value.trim();
      if(!name){ toast("Номини киритинг"); return; }
      var data = {name:name, note:m.querySelector("#w-note").value.trim(), isFinishedGoods:m.querySelector("#w-finished").checked};
      if(isEdit){
        dbUpdate("warehouses", w.id, data, STATE.warehouses);
        toast("Сақланди");
        closeModal();
        if(onSaved) onSaved(w.id, name);
      } else {
        data.createdAt=new Date().toISOString();
        dbAdd("warehouses", data, STATE.warehouses);
        toast("Сақланди");
        closeModal();
        /* dbAdd синхрон равишда янги ёзувни STATE.warehouses'нинг олдига
           қўшади — чақирувчи (масалан Омбор 2 → Кирим/Чиқим тезкор
           қўшиш) id'ни дарҳол ўқий олади, худди openCategoryForm/
           openWorkshopForm'даги каби. */
        var created = STATE.warehouses[0];
        if(onSaved) onSaved(created?created.id:"", name);
      }
    });
  }
  function openCategoryForm(existing, onSaved){
    var isEdit = !!existing;
    var c = existing || {name:""};
    var body = '<div class="field"><label>Номи</label><input id="c-name" placeholder="Масалан: Металл маҳсулотлар" value="'+esc(c.name)+'"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Яратиш")+'</button>';
    var m = openModal(isEdit?"Категорияни таҳрирлаш":"Янги категория", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#c-name").value.trim();
      if(!name){ toast("Номини киритинг"); return; }
      var data = {name:name};
      if(isEdit){
        dbUpdate("categories", c.id, data, STATE.categories);
        toast("Сақланди");
        closeModal();
        if(onSaved) onSaved(c.id, name);
      } else {
        data.createdAt=new Date().toISOString();
        dbAdd("categories", data, STATE.categories);
        /* dbAdd синхрон равишда янги ёзувни STATE.categories'нинг олдига
           қўшади (гарчи серверга сақлаш ҳали давом этаётган бўлса ҳам) —
           шунга кўра чақирувчи "+" тезкор қўшиш формаси id'ни дарҳол
           ўқий олади, худди openCashCounterpartyQuickForm'даги каби. */
        var newId = STATE.categories[0] ? STATE.categories[0].id : "";
        toast("Сақланди");
        closeModal();
        if(onSaved) onSaved(newId, name);
      }
    });
  }
  function openUnitForm(existing, onSaved){
    var isEdit = !!existing;
    var u = existing || {name:""};
    var body = '<div class="field"><label>Номи</label><input id="u-name" placeholder="Масалан: пачка" value="'+esc(u.name)+'"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Яратиш")+'</button>';
    var m = openModal(isEdit?"Ўлчов бирлигини таҳрирлаш":"Янги ўлчов бирлиги", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#u-name").value.trim();
      if(!name){ toast("Номини киритинг"); return; }
      var dup = STATE.units.find(function(x){ return x.name===name && (!isEdit || x.id!==u.id); }) || (UNIT_OPTIONS.indexOf(name)>-1 && !isEdit ? {name:name} : null);
      if(dup){ toast("Бу номдаги ўлчов бирлиги аллақачон мавжуд"); return; }
      var data = {name:name};
      if(isEdit) dbUpdate("units", u.id, data, STATE.units);
      else { data.createdAt=new Date().toISOString(); dbSet("units", uid(), data, STATE.units); }
      toast("Сақланди");
      closeModal();
      if(onSaved) onSaved(name);
    });
  }

