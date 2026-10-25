  /* ================= Ускуна ва жиҳозлар рўйхати (умумий каталог) =================
     Бу рўйхат (STATE.equipment) — Омборлар → «Ускуна ва жиҳозлар» бўлимидаги
     "Ускуна ва жиҳозлар рўйхати" ичида юритилади (бошқарилади) ва бир нечта
     жойда танлаш учун ишлатилади: Ишлаб чиқаришдаги калькулятор (Иш
     ставкалари) яратишда, Омборлар → Кирим (Асосий ускуналар/Ёрдамчи
     жиҳозлар) ва Омборлар → Инвентаризацияда. Аввал бу рўйхат Ишлаб
     чиқариш бўлимидаги алоҳида "Асосий ускуналар" панелида эди — энди у
     ерда кўринмайди, лекин маълумотнинг ўзи (STATE.equipment, "equipment"
     коллекцияси) ва уни ишлатувчи барча эски калькуляторлар ўзгаришсиз
     қолади. */
  function equipmentById(id){ return STATE.equipment.find(function(x){return x.id===id;}); }
  function freshEquipmentDraft(presetType){ return {name:"", model:"", qty:0, kw:0, price:0, type:presetType||"main"}; }
  /* Ускуна/жиҳознинг 1 донаси нархи: картада киритилгани, бўлмаса —
     охирги кирим ҳужжатидаги (ККСсиз) нархи (2026-10-15 сўрови). */
  function equipmentUnitPrice(eq){
    if(!eq) return 0;
    if(Number(eq.price)>0) return Number(eq.price);
    var recs = STATE.equipmentReceipts.filter(function(r){ return r.equipmentId===eq.id && !r.cancelled; })
      .sort(function(a,b){ return String(b.date||b.createdAt||"").localeCompare(String(a.date||a.createdAt||"")); });
    return recs.length ? (Number(recs[0].priceNoVat)||0) : 0;
  }
  function equipmentTotalValue(eq){ return (Number(eq&&eq.qty)||0)*equipmentUnitPrice(eq); }
  function equipmentTypeLabel(t){ return t==="aux" ? "Ёрдамчи жиҳоз" : (t==="main" ? "Асосий ускуна" : "—"); }
  function openEquipmentForm(existing, onSaved, presetType){
    var eq = existing ? Object.assign({}, existing) : freshEquipmentDraft(presetType);
    if(!eq.type) eq.type = presetType || "main";
    var body = ''+
      '<div class="field"><label>Тури</label><div class="seg" id="eq-type-seg">'+
        '<button type="button" class="method-toggle'+(eq.type==="main"?" active":"")+'" data-eqtype="main">Асосий ускуна</button>'+
        '<button type="button" class="method-toggle'+(eq.type==="aux"?" active":"")+'" data-eqtype="aux">Ёрдамчи жиҳоз</button>'+
      '</div></div>'+
      '<div class="field"><label>Ускуна ёки жиҳоз номи</label><input id="eq-name" value="'+esc(eq.name)+'" placeholder="Масалан: Пресс станок №1"></div>'+
      '<div class="field"><label>Маркаси</label><input id="eq-model" value="'+esc(eq.model||"")+'" placeholder="Масалан: JH21-100"></div>'+
      '<div class="field-row"><div class="field"><label>Сони</label><input id="eq-qty" type="number" min="0" step="any" value="'+esc(eq.qty||0)+'"></div>'+
      '<div class="field"><label>Электр ишлаш қуввати (кВт)</label><input id="eq-kw" type="number" min="0" step="any" value="'+esc(eq.kw||0)+'"></div></div>'+
      '<div class="field"><label>Нархи (1 дона, сўм)</label><input id="eq-price" type="number" min="0" step="any" value="'+esc(eq.price||equipmentUnitPrice(existing||eq)||0)+'"><div class="field-hint">Рўйхатда «Жами сумма» = сони × нарх кўринишида ҳисобланади.</div></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-ok>Сақлаш</button>';
    var m = openModal(existing?"Ускуна/жиҳозни таҳрирлаш":"Янги ускуна ёки жиҳоз", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var currentEqType = eq.type;
    m.querySelectorAll("#eq-type-seg .method-toggle").forEach(function(btn){
      btn.addEventListener("click", function(){
        currentEqType = btn.getAttribute("data-eqtype");
        m.querySelectorAll("#eq-type-seg .method-toggle").forEach(function(b2){ b2.classList.toggle("active", b2===btn); });
      });
    });
    m.querySelector("[data-ok]").addEventListener("click", function(){
      var name = m.querySelector("#eq-name").value.trim();
      if(!name){ toast("Ускуна ёки жиҳоз номини киритинг"); return; }
      var patch = {name:name, model:m.querySelector("#eq-model").value.trim(), qty:Number(m.querySelector("#eq-qty").value)||0, kw:Number(m.querySelector("#eq-kw").value)||0, price:Number(m.querySelector("#eq-price").value)||0, type:currentEqType};
      if(existing){
        dbUpdate("equipment", existing.id, patch, STATE.equipment);
        closeModal();
        toast("Сақланди");
        if(onSaved) onSaved(existing.id);
      } else {
        patch.createdAt=new Date().toISOString();
        /* Аввал бу ерда dbAdd() ишлатилиб, сўнгра STATE.equipment[0].id
           ўқилар эди — лекин dbAdd() вақтинчалик "_pending_..." id билан
           қўшади ва ҳақиқий id серверда тайёр бўлгач АСИНХРОН равишда
           reconcilePendingId орқали алмаштирилади (фақат STATE'даги
           "коллекция" массивлари ичида — бу форманинг чақирувчиси ўзида
           сақлаб қолган id эмас). Шунга кўра, agar onSaved(savedId) орқали
           олинган (вақтинчалик) id бошқа бир жойда (масалан, Инвентаризация
           қаторида) сақлаб қўйилса — reconcile бўлгач ўша сақланган id
           ЭСКИРИБ қолар ва equipmentById(...) уни топа олмай қолар эди.
           itemForm'даги худди шу муаммо аввалроқ ХУДДИ ШУ усул билан —
           олдиндан деterministik id билан dbSet() ишлатиб — тузатилган
           эди; шу ерда ҳам айнан шу тузатишни қўллаймиз. */
        var newId = uid();
        dbSet("equipment", newId, patch, STATE.equipment);
        closeModal();
        toast("Сақланди");
        if(onSaved) onSaved(newId);
      }
    });
  }

  function prodMachineGroups(){
    var map={};
    STATE.productions.forEach(function(p){
      var mn=(p.machineName||"").trim()||"Кўрсатилмаган";
      if(!map[mn]) map[mn]={machine:mn,count:0};
      map[mn].count++;
    });
    return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.count-a.count;});
  }
  function renderMachineReportPanel(container){
    var groups = prodMachineGroups();
    var search=(STATE.prodReportSearch||"").trim().toLowerCase();
    var machineFilter = STATE.prodReportMachine||"";
    var filtered = STATE.productions.filter(function(p){
      var mn=(p.machineName||"").trim()||"Кўрсатилмаган";
      if(machineFilter && mn!==machineFilter) return false;
      if(search && (p.productName||"").toLowerCase().indexOf(search)===-1) return false;
      return true;
    }).sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });

    var html = '<div class="card" style="padding:18px 20px;">'+
      '<h2 style="font-size:14px;font-weight:800;margin:0 0 4px;">Станоклар бўйича ҳисобот</h2>'+
      '<div style="font-size:12px;color:var(--ink-3);margin-bottom:14px;">Барча ишлаб чиқариш ёзувлари станоклар кесимида</div>'+
      '<div class="search-box" style="max-width:none;margin-bottom:14px;">'+ICONS.search+'<input type="text" id="prodReportSearch" placeholder="Маҳсулот номи бўйича қидириш…" value="'+esc(STATE.prodReportSearch||"")+'"></div>'+
      (groups.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">'+
        '<button class="pill-filter'+(!machineFilter?" active":"")+'" data-machine="" style="font-size:11.5px;padding:5px 10px;">Барчаси</button>'+
        groups.map(function(g){ return '<button class="pill-filter'+(machineFilter===g.machine?" active":"")+'" data-machine="'+esc(g.machine)+'" style="font-size:11.5px;padding:5px 10px;">'+esc(g.machine)+' <span class="num" style="opacity:.65;">'+g.count+'</span></button>'; }).join("")+'</div>' : '')+
      (filtered.length ? '<div style="display:flex;flex-direction:column;gap:8px;">'+
        filtered.map(function(p){
          return '<div class="alert-row" data-prod-jump="'+p.id+'" style="cursor:pointer;align-items:flex-start;">'+
            '<div class="grow"><div class="t">'+esc(p.productName)+'</div><div class="s">'+esc(p.machineName||"Станок кўрсатилмаган")+' · '+fmtDateShort((p.createdAt||"").slice(0,10))+'</div></div>'+
            '<div class="num cell-strong" style="font-size:12.5px;white-space:nowrap;">'+fmtSum(p.costPerUnit)+'</div></div>';
        }).join("")+'</div>' :
        '<div style="text-align:center;color:var(--ink-3);font-size:13px;padding:20px 0;">'+(STATE.productions.length ? "Ҳеч нарса топилмади" : "Ҳали ишлаб чиқариш йўқ")+'</div>')+
      '</div>';
    container.innerHTML = html;
    var s = container.querySelector("#prodReportSearch");
    if(s){
      s.addEventListener("input", function(){
        STATE.prodReportSearch=s.value; renderMachineReportPanel(container);
        var el2=container.querySelector("#prodReportSearch");
        if(el2){ el2.focus(); el2.setSelectionRange(el2.value.length, el2.value.length); }
      });
    }
    container.querySelectorAll("[data-machine]").forEach(function(b){ b.addEventListener("click", function(){ STATE.prodReportMachine=b.getAttribute("data-machine"); renderMachineReportPanel(container); }); });
    container.querySelectorAll("[data-prod-jump]").forEach(function(row){ row.addEventListener("click", function(){ openProductionDetail(STATE.productions.find(function(x){return x.id===row.getAttribute("data-prod-jump");})); }); });
  }

  function renderProdHistory(){
    setTopbar("Ишлаб чиқариш", STATE.productions.length+" та ёзув", "");
    var root = document.getElementById("content");
    root.innerHTML = prodSubnav("history") + sampleBanner() + '<div class="two-col"><div id="prodMain"></div><div id="prodSide"></div></div>';
    wireSampleBanner(root);
    wireProdSubnav(root);
    renderProdHistoryTable();
    renderMachineReportPanel(document.getElementById("prodSide"));
  }
  function renderProdHistoryTable(){
    var list = STATE.productions.slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    var html="";
    if(!list.length){
      html += emptyState("Ҳали ишлаб чиқариш йўқ","Юқоридаги «Ишлаб чиқариш» тугмаси орқали калькуляция асосида маҳсулот ишлаб чиқаринг.");
    } else {
      var rows = list.map(function(p){
        return '<tr'+opCancelledRowStyle(p.cancelled)+'>'+
          '<td class="cell-muted">'+fmtDateShort((p.createdAt||"").slice(0,10))+'</td>'+
          '<td>'+esc(p.machineName||"—")+'</td>'+
          '<td class="cell-strong">'+esc(p.productName)+opCancelledChip(p.cancelled)+'</td>'+
          '<td class="num">'+fmtNum(p.quantity)+' '+esc(p.unit)+'</td>'+
          '<td class="cell-muted">'+esc(warehouseName(p.warehouseId))+'</td>'+
          '<td class="cell-muted">'+esc(employeeName(p.producerEmployeeId))+'</td>'+
          '<td class="num">'+fmtSum(p.totalCost)+'</td>'+
          '<td class="num cell-strong">'+fmtSum(p.costPerUnit)+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-prod-view="'+p.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-prod-copy="'+p.id+'" title="Нусха олиш">'+ICONS.copy+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-prod-print="'+p.id+'" title="Қоғозга чоп этиш">'+ICONS.printer+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-prod-xls="'+p.id+'" title="Excelга юклаш">'+ICONS.download+'</button>'+
            (p.cancelled
              ? '<button class="btn btn-ghost btn-icon" data-prod-restore="'+p.id+'" title="Тиклаш">'+ICONS.restore+'</button>'
              : '<button class="btn btn-ghost btn-icon" data-prod-cancel="'+p.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
          '</div></td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Станок</th><th>Маҳсулот</th><th>Миқдор</th><th>Омбор</th><th>Ишлаб чиқарувчи</th><th>Жами таннарх</th><th>Таннарх/дона</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    var root = document.getElementById("prodMain");
    root.innerHTML = html;
    root.querySelectorAll("[data-prod-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var p = list.find(function(x){return x.id===b.getAttribute("data-prod-copy");}); if(!p) return;
      var rec = STATE.recipes.find(function(x){ return x.id===p.recipeId; });
      if(!rec){ toast("Бу ёзувнинг калькуляцияси топилмади — янги ишлаб чиқаришни қўлда киритинг"); return; }
      openProduceModal(rec);
      toast("Нусха олинди — миқдор ва омборни текшириб, амалга оширинг");
    }); });
    root.querySelectorAll("[data-prod-print]").forEach(function(b){ b.addEventListener("click", function(){
      var p = list.find(function(x){return x.id===b.getAttribute("data-prod-print");}); if(p) opPrintDoc(productionOpDoc(p));
    }); });
    root.querySelectorAll("[data-prod-xls]").forEach(function(b){ b.addEventListener("click", function(){
      var p = list.find(function(x){return x.id===b.getAttribute("data-prod-xls");}); if(p) opExcelDoc(productionOpDoc(p), "Ishlab_chiqarish");
    }); });
    root.querySelectorAll("[data-prod-view]").forEach(function(b){ b.addEventListener("click", function(){ openProductionDetail(list.find(function(x){return x.id===b.getAttribute("data-prod-view");})); }); });
    root.querySelectorAll("[data-prod-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var p = list.find(function(x){return x.id===b.getAttribute("data-prod-cancel");}); if(!p) return;
      opCancelConfirm("Ёзувни бекор қилиш","«"+p.productName+"» бўйича бу ишлаб чиқариш бекор қилинса, сарфланган хомашё омборга қайтарилади ва тайёр маҳсулот миқдоридан айирилади. Ёзув базада қолади ва истаганда тикланади.", function(){
        (p.items||[]).forEach(function(it){ if(it.itemId) adjustStockBy(it.itemId, p.rawWarehouseId||p.warehouseId, it.qty); });
        if(p.productItemId) adjustStockBy(p.productItemId, p.warehouseId, -Number(p.quantity||0));
        (p.wastes||[]).forEach(function(w){ if(w.itemId) adjustStockBy(w.itemId, w.warehouseId||p.warehouseId, -(Number(w.qty)||0)); });
        dbUpdate("productions", p.id, {cancelled:true, cancelledAt:new Date().toISOString()}, STATE.productions);
        toast("Бекор қилинди — омбор тескари қайтарилди");
      });
    }); });
    root.querySelectorAll("[data-prod-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var p = list.find(function(x){return x.id===b.getAttribute("data-prod-restore");}); if(!p) return;
      openConfirm("Ёзувни тиклаш","Бу ишлаб чиқариш қайта тикланиб, хомашё яна сарфлансинми?","Ҳа, тиклаш", function(){
        (p.items||[]).forEach(function(it){ if(it.itemId) adjustStockBy(it.itemId, p.rawWarehouseId||p.warehouseId, -(Number(it.qty)||0)); });
        if(p.productItemId) adjustStockBy(p.productItemId, p.warehouseId, Number(p.quantity||0));
        (p.wastes||[]).forEach(function(w){ if(w.itemId) adjustStockBy(w.itemId, w.warehouseId||p.warehouseId, Number(w.qty)||0); });
        dbUpdate("productions", p.id, {cancelled:false, cancelledAt:""}, STATE.productions);
        toast("Тикланди");
      }, true);
    }); });
  }
  function deleteProduction(p){
    (p.items||[]).forEach(function(it){ if(it.itemId) adjustStockBy(it.itemId, p.rawWarehouseId||p.warehouseId, it.qty); });
    if(p.productItemId) adjustStockBy(p.productItemId, p.warehouseId, -Number(p.quantity||0));
    dbDelete("productions", p.id, STATE.productions);
    toast("Ёзув ўчирилди, омбор тескари қайтарилди");
  }

  /* Калькуляциялар рўйхати — сана оралиғи, категория ва қидирув филтрлари
     билан (фойдаланувчи сўровига кўра, 2026-09-30), ҳар бир қатор учун чоп
     этиш ва рўйхат учун Excel экспорт имконияти билан. Филтрлар умумий
     recFilterToolbar/wireRecFilterToolbar/recMatchesDate/recMatchesSearch
     ёрдамчиларидан фойдаланади (қаранг: шу файлдаги "умумий: сўнгги
     рўйхатлар" бўлими) — бошқа "Омборлар" панелларида қўлланган андоза. */
  function renderProdRecipes(){
    var state = {from:STATE.recCalcFrom, to:STATE.recCalcTo, search:STATE.recCalcSearch};
    var catFilter = STATE.recCalcCategory||"";
    var catNames = []; STATE.recipes.forEach(function(r){ if(r.category && catNames.indexOf(r.category)===-1) catNames.push(r.category); }); catNames.sort();
    var catSelectHtml = '<select id="recCalc-cat" style="min-width:130px;padding:9px 10px;border-radius:10px;border:1px solid var(--border-strong);background:var(--bg);font-size:12.5px;">'+
      '<option value="">Барча категориялар</option>'+catNames.map(function(c){return '<option value="'+esc(c)+'"'+(catFilter===c?" selected":"")+'>'+esc(c)+'</option>';}).join("")+'</select>';
    setTopbar("Калькуляциялар", STATE.recipes.length+" та калькуляция", "");
    var root = document.getElementById("content");
    var all = STATE.recipes.slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    var list = all.filter(function(r){
      if(catFilter && (r.category||"")!==catFilter) return false;
      if(!recMatchesDate(r.recipeDate||r.createdAt, state.from, state.to)) return false;
      if(!recMatchesSearch((r.productName||"")+" "+(r.category||"")+" "+(r.recipeNumber||""), state.search)) return false;
      return true;
    });
    var html = prodSubnav("recipes") + sampleBanner() + recFilterToolbar("recCalc", state, "Маҳсулот ёки категория бўйича қидириш…", catSelectHtml);
    if(!list.length){
      html += all.length ? emptyState("Мос калькуляция топилмади","Филтрни ўзгартириб кўринг.") : emptyState("Ҳали калькуляция йўқ","«+ Янги калькуляция» орқали рецепт яратинг.");
    } else {
      var rows = list.map(function(r){
        var n = normalizeRecipe(r);
        var res = computeRecipeCost(n, [], 0);
        return '<tr>'+
          '<td class="cell-strong num">'+(n.recipeNumber>0?esc(n.recipeNumber):"—")+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(n.recipeDate||(n.createdAt||"").slice(0,10))+'</td>'+
          '<td class="cell-strong">'+esc(n.productName)+'</td>'+
          '<td class="cell-muted">'+esc(n.category||"—")+'</td>'+
          '<td class="num">'+fmtNum(n.quantity)+' '+esc(n.unit)+'</td>'+
          '<td class="cell-muted">'+n.materials.length+' та қатор</td>'+
          '<td class="num cell-strong">'+fmtSum(res.subtotal1b)+'</td>'+
          '<td class="num">'+fmtSum(res.finalUzs)+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-recipe-produce="'+r.id+'" title="Ишлаб чиқариш">'+ICONS.plus+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-recipe-print="'+r.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-recipe-edit="'+r.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-recipe-view="'+r.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-recipe-copy="'+r.id+'" title="Нусха олиш">'+ICONS.copy+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-recipe-xls="'+r.id+'" title="Excelга юклаш">'+ICONS.download+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-recipe-del="'+r.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
          '</div></td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сана</th><th>Маҳсулот</th><th>Категория</th><th>Партия</th><th>Таркиб</th><th>Таннарх</th><th>Якуний нарх</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireProdSubnav(root);
    var catSel = root.querySelector("#recCalc-cat");
    if(catSel) catSel.addEventListener("change", function(){ STATE.recCalcCategory=this.value; render(); });
    wireRecFilterToolbar(root, "recCalc", state, function(){ exportRecipesExcel(list); });
    STATE.recCalcFrom=state.from; STATE.recCalcTo=state.to; STATE.recCalcSearch=state.search;
    root.querySelectorAll("[data-recipe-produce]").forEach(function(b){ b.addEventListener("click", function(){ openProduceModal(list.find(function(x){return x.id===b.getAttribute("data-recipe-produce");})); }); });
    root.querySelectorAll("[data-recipe-print]").forEach(function(b){ b.addEventListener("click", function(){ printRecipeVoucher(list.find(function(x){return x.id===b.getAttribute("data-recipe-print");})); }); });
    root.querySelectorAll("[data-recipe-edit]").forEach(function(b){ b.addEventListener("click", function(){ editRecipe(list.find(function(x){return x.id===b.getAttribute("data-recipe-edit");})); }); });
    root.querySelectorAll("[data-recipe-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-recipe-copy");}); if(!r) return;
      /* Нусха — янги калькуляция қораламаси; эски калькуляцияга тегмайди. */
      editRecipe(r);
      var d = recipeDraft();
      d.editingId = null;
      d.recipeNumber = nextRecipeNumber(); d.recipeNumberManual = false;
      d.recipeDate = todayISO();
      render();
      toast("Нусха олинди — текшириб, «Калькуляцияни сақлаш» тугмасини босинг");
    }); });
    root.querySelectorAll("[data-recipe-xls]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-recipe-xls");}); if(!r) return;
      var n = normalizeRecipe(r), res = computeRecipeCost(n, [], 0);
      opExcelDoc({title:"Калькуляция — "+(n.productName||""),
        pairs:[["Тартиб рақами", String(n.recipeNumber||"—")], ["Санаси", fmtDateShort(n.recipeDate||(n.createdAt||"").slice(0,10))],
               ["Маҳсулот", n.productName||"—"], ["Категория", n.category||"—"],
               ["Партия миқдори", fmtNum(n.quantity)+" "+(n.unit||"")],
               ["Таннарх", fmtNum(res.subtotal1b)], ["Сотиш нархи", fmtNum(res.finalUzs)]],
        head:["Таркиб","Миқдор","Нархи","Қиймати"],
        rows:n.materials.map(function(it){ return [it.materialName||"", fmtNum(it.qty)+" "+(it.unit||""), fmtNum(it.price), fmtNum(it.qty*it.price)]; })
      }, "Kalkulyatsiya_"+(n.recipeNumber||""));
    }); });
    root.querySelectorAll("[data-recipe-view]").forEach(function(b){ b.addEventListener("click", function(){ openRecipeDetail(list.find(function(x){return x.id===b.getAttribute("data-recipe-view");})); }); });
    root.querySelectorAll("[data-recipe-del]").forEach(function(b){ b.addEventListener("click", function(){
      var r = list.find(function(x){return x.id===b.getAttribute("data-recipe-del");});
      openConfirm("Калькуляцияни ўчириш","«"+r.productName+"» калькуляцияси ўчирилсинми? Бу фақат рецептни ўчиради, олдинги ишлаб чиқариш тарихига таъсир қилмайди.","Ҳа, ўчириш", function(){ dbDelete("recipes", r.id, STATE.recipes); toast("Ўчирилди"); }, true);
    }); });
  }
  /* Калькуляцияни чоп этиш — таркиб (хомашё) қаторлари ва таннарх/якуний
     нарх хулосаси билан, умумий voucherShell қобиғида (бошқа чоп этиш
     ҳужжатлари каби). */
  function printRecipeVoucher(r){
    if(!r) return;
    var n = normalizeRecipe(r);
    var res = computeRecipeCost(n, [], 0);
    var matRows = n.materials.map(function(it){
      return '<tr><td>'+esc(it.materialName)+'</td><td style="text-align:right;">'+fmtNum(it.qty)+' '+esc(it.unit||"")+'</td><td style="text-align:right;">'+fmtSum(it.price)+'</td><td style="text-align:right;">'+fmtSum(it.qty*it.price)+'</td></tr>';
    }).join("");
    var body = '<table>'+
      '<tr><td>Тартиб рақами</td><td style="text-align:right;">'+(n.recipeNumber>0?esc(n.recipeNumber):"—")+'</td></tr>'+
      '<tr><td>Санаси</td><td style="text-align:right;">'+fmtDateShort(n.recipeDate||(n.createdAt||"").slice(0,10))+'</td></tr>'+
      '<tr><td>Маҳсулот</td><td style="text-align:right;">'+esc(n.productName)+'</td></tr>'+
      '<tr><td>Категория</td><td style="text-align:right;">'+esc(n.category||"—")+'</td></tr>'+
      '<tr><td>Партия миқдори</td><td style="text-align:right;">'+fmtNum(n.quantity)+' '+esc(n.unit)+'</td></tr>'+
      '<tr><td colspan="2" style="font-weight:700;background:#f4f5f7;">Таркиб</td></tr>'+
      '<tr><td>Номи</td><td style="text-align:right;">Миқдор / Нархи / Қиймати</td></tr>'+
      matRows+
      '</table>'+
      '<div class="v-total">Таннарх: '+fmtSum(res.subtotal1b)+'</div>'+
      '<div class="v-total">Якуний нарх: '+fmtSum(res.finalUzs)+'</div>'+
      '<div class="v-sign"><div>Ҳисобловчи</div><div>Тасдиқловчи</div></div>';
    var html = voucherShell("Калькуляция — "+esc(n.productName), "Сана: "+esc(fmtDateShort((n.createdAt||"").slice(0,10))), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  function exportRecipesExcel(list){
    var headers = ["№","Сана","Маҳсулот","Категория","Партия","Бирлик","Таркиб қаторлари","Таннарх","Якуний нарх"];
    var rowsArr = list.map(function(r){
      var n = normalizeRecipe(r);
      var res = computeRecipeCost(n, [], 0);
      return [n.recipeNumber>0?n.recipeNumber:"—", fmtDateShort(n.recipeDate||(n.createdAt||"").slice(0,10)), n.productName, n.category||"—", fmtNum(n.quantity), n.unit, n.materials.length, fmtNum(res.subtotal1b), fmtNum(res.finalUzs)];
    });
    exportHtmlTableAsExcel("Kalkulyatsiyalar.xls", "Калькуляциялар", headers, rowsArr);
  }

  function renderLaborCalcsList(){
    setTopbar("Иш ставкаси калькуляторлари", STATE.laborCalcs.length+" та калькулятор", '<button class="btn btn-primary" id="addLaborCalcBtn">'+ICONS.plus+'Янги калькулятор</button>');
    var root = document.getElementById("content");
    var list = STATE.laborCalcs.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    var html = prodSubnav("labor") + sampleBanner();
    if(!list.length){
      html += emptyState("Ҳали калькулятор йўқ","Станок/иш жойи учун иш ҳақи ва электр харажатини ҳисобловчи калькулятор яратинг.");
    } else {
      var rows = list.map(function(lc){
        var eq = lc.equipmentId ? equipmentById(lc.equipmentId) : null;
        return '<tr>'+
          '<td class="cell-strong">'+esc(eq?eq.name:(lc.name||"—"))+'</td>'+
          '<td class="cell-muted">'+esc(lc.productName||lc.partName||"—")+'</td>'+
          '<td class="num">'+fmtNum(lc.machineCount||1)+'</td>'+
          '<td class="num">'+fmtNum(lc.totalHours||0)+'</td>'+
          '<td class="num">'+fmtSum(laborCalcWage(lc))+'</td>'+
          '<td class="num">'+fmtSum(laborCalcElec(lc))+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-lc-list-dup="'+lc.id+'" title="Нусха">'+ICONS.swap+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-lc-list-edit="'+lc.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-lc-list-del="'+lc.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
          '</div></td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Ускуна</th><th>Маҳсулот</th><th>Сони</th><th>Соат</th><th>Иш ҳақи жами</th><th>Электр жами</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireProdSubnav(root);
    var addBtn = document.getElementById("addLaborCalcBtn");
    if(addBtn) addBtn.addEventListener("click", function(){ openLaborCalcForm(null); });
    root.querySelectorAll("[data-lc-list-dup]").forEach(function(b){ b.addEventListener("click", function(){ var lc=laborCalcById(b.getAttribute("data-lc-list-dup")); if(lc) duplicateLaborCalc(lc); }); });
    root.querySelectorAll("[data-lc-list-edit]").forEach(function(b){ b.addEventListener("click", function(){ var lc=laborCalcById(b.getAttribute("data-lc-list-edit")); if(lc) openLaborCalcForm(lc); }); });
    root.querySelectorAll("[data-lc-list-del]").forEach(function(b){ b.addEventListener("click", function(){ var lc=laborCalcById(b.getAttribute("data-lc-list-del")); if(lc) deleteLaborCalc(lc); }); });
  }

  function freshLaborCalcDraft(){ return {equipmentId:"", name:"", productName:"", productQty:1, partName:"", machineCount:1, totalHours:0, hourlyWage:0, kw:0, elecPrice:0, secondsPerPart:0}; }
  function laborCalcById(id){ return STATE.laborCalcs.find(function(x){return x.id===id;}); }
  function laborCalcWage(lc){ return Number(lc.hourlyWage||0)*Number(lc.totalHours||0)*Math.max(1,Number(lc.machineCount||1)); }
  function laborCalcElec(lc){ return Number(lc.kw||0)*Number(lc.elecPrice||0)*Number(lc.totalHours||0)*Math.max(1,Number(lc.machineCount||1)); }
  function equipmentOptionsHtml(selectedId, typeFilter){
    var pool = STATE.equipment.slice().filter(function(eq){ return !typeFilter || !eq.type || eq.type===typeFilter; }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    return '<option value="">— танланг —</option>'+pool.map(function(eq){
      return '<option value="'+eq.id+'"'+(selectedId===eq.id?" selected":"")+'>'+esc(eq.name)+(eq.model?" ("+esc(eq.model)+")":"")+'</option>';
    }).join("");
  }

  /* Калькулятор энди аввало "ускуна"дан бошланади — ускуна номи, модели ва
     электр қуввати "Ускуналар" панелидан танланади (қўлда ёзилмайди), станок
     электр қуввати шу ускунадан автомат олинади. "1 дона учун сония" ва
     "маҳсулот сони" киритилса — "Жами иш соати" автомат ҳисобланади
     (сония × сон / 3600); акс ҳолда (эски ёзувларда бўлгани каби) уни қўлда
     киритиш мумкин — бунда олдин киритилган қиймат ўзгартирилмайди. */
  function openLaborCalcForm(existing, resumeDraft){
    var isEdit = !!(existing && existing.id);
    var lc = existing ? Object.assign({}, existing) : freshLaborCalcDraft();
    if(resumeDraft) Object.assign(lc, resumeDraft);
    var productQtyStart = (lc.productQty!==undefined && lc.productQty!==null && lc.productQty!=="") ? lc.productQty : (isEdit?0:1);
    var eqStart = equipmentById(lc.equipmentId);
    var kwStart = eqStart ? Number(eqStart.kw)||0 : Number(lc.kw)||0;
    var body = ''+
      '<div class="field"><label>Ускуна номи</label><div style="display:flex;gap:6px;"><select id="lc-equipment" style="flex:1;min-width:0;">'+equipmentOptionsHtml(lc.equipmentId)+'</select><button type="button" class="btn btn-secondary btn-icon" id="lc-equipment-add" title="Янги ускуна қўшиш">'+ICONS.plus+'</button></div>'+
        (STATE.equipment.length?'':'<div class="field-hint">Ҳали ускуна киритилмаган — «+» тугмаси орқали қўшинг.</div>')+'</div>'+
      '<div class="field-row"><div class="field"><label>Маҳсулот номи</label><input id="lc-product" value="'+esc(lc.productName||lc.partName||"")+'" placeholder="Масалан: Болт М10"></div>'+
      '<div class="field"><label>Маҳсулот сони</label><input id="lc-qty" type="number" min="0" step="any" value="'+esc(productQtyStart)+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>Жами иш соати</label><input id="lc-hours" type="number" min="0" step="any" value="'+esc(lc.totalHours||0)+'"><div class="field-hint" id="lc-hours-hint"></div></div>'+
      '<div class="field"><label>Соатлик иш ҳақи (сўм)</label><input id="lc-wage" type="number" min="0" step="any" value="'+esc(lc.hourlyWage||0)+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>Станок электр қуввати (кВт)</label><input id="lc-kw" type="number" value="'+esc(kwStart)+'" readonly style="background:var(--bg-2,#f4f5f7);color:var(--ink-2);"></div>'+
      '<div class="field"><label>Электр нархи (сўм/кВт)</label><input id="lc-elecprice" type="number" min="0" step="any" value="'+esc(lc.elecPrice||0)+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>1 дона учун сония <span class="opt">(ихтиёрий)</span></label><input id="lc-sec" type="number" min="0" step="any" value="'+esc(lc.secondsPerPart||0)+'"></div>'+
      '<div class="field"><label>Станоклар сони</label><input id="lc-count" type="number" min="1" step="1" value="'+esc(lc.machineCount||1)+'"></div></div>'+
      '<div id="lc-preview" class="field-hint"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-ok>Сақлаш</button>';
    var m = openModal(existing?"Калькуляторни таҳрирлаш":"Янги калькулятор", body, foot, true);
    var updatePrev = function(){
      var wage = (Number(m.querySelector("#lc-wage").value)||0)*(Number(m.querySelector("#lc-hours").value)||0)*Math.max(1,Number(m.querySelector("#lc-count").value)||1);
      var elec = (Number(m.querySelector("#lc-kw").value)||0)*(Number(m.querySelector("#lc-elecprice").value)||0)*(Number(m.querySelector("#lc-hours").value)||0)*Math.max(1,Number(m.querySelector("#lc-count").value)||1);
      m.querySelector("#lc-preview").innerHTML = "Иш ҳақи жами: <b>"+fmtSum(wage)+"</b> · Электр жами: <b>"+fmtSum(elec)+"</b>";
    };
    var updateHoursAuto = function(){
      var qty = Number(m.querySelector("#lc-qty").value)||0;
      var sec = Number(m.querySelector("#lc-sec").value)||0;
      var hoursInput = m.querySelector("#lc-hours");
      var hint = m.querySelector("#lc-hours-hint");
      if(qty>0 && sec>0){
        hoursInput.value = Math.round((qty*sec/3600)*1000)/1000;
        hoursInput.setAttribute("readonly","readonly");
        hoursInput.style.background = "var(--bg-2,#f4f5f7)"; hoursInput.style.color="var(--ink-2)";
        hint.textContent = "Автоматик: "+fmtNum(qty)+" дона × "+fmtNum(sec)+" сония / 3600";
      } else {
        hoursInput.removeAttribute("readonly");
        hoursInput.style.background = ""; hoursInput.style.color="";
        hint.textContent = "";
      }
      updatePrev();
    };
    m.querySelectorAll("#lc-wage,#lc-hours,#lc-count,#lc-elecprice").forEach(function(inp){ inp.addEventListener("input", updatePrev); });
    m.querySelectorAll("#lc-qty,#lc-sec").forEach(function(inp){ inp.addEventListener("input", updateHoursAuto); });
    m.querySelector("#lc-equipment").addEventListener("change", function(){
      var eq = equipmentById(this.value);
      m.querySelector("#lc-kw").value = eq ? (Number(eq.kw)||0) : 0;
      updatePrev();
    });
    m.querySelector("#lc-equipment-add").addEventListener("click", function(){
      var snapshot = {
        equipmentId: m.querySelector("#lc-equipment").value,
        productName: m.querySelector("#lc-product").value,
        productQty: Number(m.querySelector("#lc-qty").value)||0,
        totalHours: Number(m.querySelector("#lc-hours").value)||0,
        hourlyWage: Number(m.querySelector("#lc-wage").value)||0,
        elecPrice: Number(m.querySelector("#lc-elecprice").value)||0,
        secondsPerPart: Number(m.querySelector("#lc-sec").value)||0,
        machineCount: Number(m.querySelector("#lc-count").value)||1
      };
      closeModal();
      openEquipmentForm(null, function(newEqId){
        snapshot.equipmentId = newEqId;
        openLaborCalcForm(existing, snapshot);
      });
    });
    updateHoursAuto();
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-ok]").addEventListener("click", function(){
      var equipmentId = m.querySelector("#lc-equipment").value;
      if(!equipmentId){ toast("Ускунани танланг"); return; }
      var eq = equipmentById(equipmentId);
      var productName = m.querySelector("#lc-product").value.trim();
      if(!productName){ toast("Маҳсулот номини киритинг"); return; }
      var patch = {
        equipmentId:equipmentId, name:(eq?eq.name:"")+(productName?" — "+productName:""),
        productName:productName, productQty:Number(m.querySelector("#lc-qty").value)||0,
        machineCount:Number(m.querySelector("#lc-count").value)||1, totalHours:Number(m.querySelector("#lc-hours").value)||0,
        hourlyWage:Number(m.querySelector("#lc-wage").value)||0, kw:eq?(Number(eq.kw)||0):(Number(m.querySelector("#lc-kw").value)||0),
        elecPrice:Number(m.querySelector("#lc-elecprice").value)||0, secondsPerPart:Number(m.querySelector("#lc-sec").value)||0
      };
      if(existing){ dbUpdate("laborCalcs", existing.id, patch, STATE.laborCalcs); }
      else { patch.createdAt=new Date().toISOString(); dbAdd("laborCalcs", patch, STATE.laborCalcs); }
      closeModal();
      toast("Сақланди");
      if(document.getElementById("recipeMain")){ renderLaborChipsArea(); renderRecipeForm(); }
      if(STATE.prodView==="labor" && document.getElementById("content")){ renderLaborCalcsList(); }
    });
  }
  function duplicateLaborCalc(lc){
    var copy = Object.assign({}, lc); delete copy.id; copy.name = copy.name + " (нусха)"; copy.createdAt=new Date().toISOString();
    dbAdd("laborCalcs", copy, STATE.laborCalcs);
    toast("Нусха яратилди");
  }
  function deleteLaborCalc(lc){
    openConfirm("Калькуляторни ўчириш", "«"+lc.name+"» ўчирилсинми? У боғланган калькуляцияларда ишчи ҳақи ҳисобидан олиб ташланади.", "Ҳа, ўчириш", function(){
      dbDelete("laborCalcs", lc.id, STATE.laborCalcs);
      toast("Ўчирилди");
    }, true);
  }

  /* Фойдаланувчи сўровига кўра (2026-10-16): «Табиий газ» энди
     «Қўшимча харажатлар» жадвалидаги қатор эмас, АЛОҲИДА панел
     (миқдор м3 × нарх). Эски ёзувларда у харажатлар ичида турган —
     қуйидаги иккита ёрдамчи ўша эски қаторни автоматик равишда янги
     майдонларга кўчиради (маълумот йўқолмайди). */
  function recipeGasRowIndex(list){
    for(var i=0;i<list.length;i++){
      var x = list[i];
      if(x && (x.locked===true || (x.type==="qp" && finIsGasExpenseRow(x)))) return i;
    }
    return -1;
  }
  function recipeGasOf(r){
    if(r && (r.gasQty!==undefined || r.gasPrice!==undefined)){
      return {qty:Number(r.gasQty)||0, price:Number(r.gasPrice)||0};
    }
    var list = (r && r.expenses) ? r.expenses : [];
    var i = recipeGasRowIndex(list);
    if(i<0) return {qty:0, price:0};
    return {qty:Number(list[i].qty)||0, price:Number(list[i].price)||0};
  }
  function recipeExpensesWithoutGas(r){
    var list = ((r && r.expenses) || []).map(function(x){ return Object.assign({name:"",type:"sum",value:0,qty:0,price:0}, x); });
    if(r && (r.gasQty!==undefined || r.gasPrice!==undefined)) return list;
    var i = recipeGasRowIndex(list);
    if(i>-1) list.splice(i,1);
    return list;
  }
  function normalizeRecipe(r){
    if(!r) return null;
    if(r.materials){
      return {
        id:r.id, productItemId:r.productItemId||"", productName:r.productName||"", productType:r.productType||"mahsulot",
        unit:r.unit||UNIT_OPTIONS[0], quantity:Number(r.quantity)||0, category:r.category||"", machineName:r.machineName||"",
        materials:(r.materials||[]).map(function(m){ return Object.assign({kind:"raw",materialItemId:"",materialName:"",qty:0,unit:"",price:0,altMaterialItemId:"",altMaterialName:"",refRecipeId:"",wasteMode:"none",wastePct:0,wasteWarehouseId:"",wasteItemId:"",wasteItemName:""}, m); }),
        expenses:recipeExpensesWithoutGas(r),
        gasQty:recipeGasOf(r).qty, gasPrice:recipeGasOf(r).price,
        amortPct:Number(r.amortPct)||0,
        adminPct:Number(r.adminPct)||0, profitPct:r.profitPct!=null?Number(r.profitPct):0, vatPct:r.vatPct!=null?Number(r.vatPct):0, usdRate:Number(r.usdRate)||12700,
        laborMode:r.laborMode||"manual", laborCalcIds:r.laborCalcIds||[], laborWageManual:Number(r.laborWageManual)||0, laborElecManual:Number(r.laborElecManual)||0,
        laborTaxPct:Number(r.laborTaxPct)||0, laborYiitPct:Number(r.laborYiitPct)||0,
        note:r.note||"", createdAt:r.createdAt||"",
        recipeNumber:(r.recipeNumber!=null&&r.recipeNumber!=="")?Number(r.recipeNumber):0, recipeDate:r.recipeDate||"", workshopKey:r.workshopKey||""
      };
    }
    var materials = (r.items||[]).map(function(it){
      return {kind:"raw", materialItemId:it.materialItemId||"", materialName:it.materialName||"", qty:Number(it.qty)||0, unit:r.unit||"", price:Number(it.price)||0, altMaterialItemId:it.altMaterialItemId||"", altMaterialName:it.altMaterialName||"", refRecipeId:"", wasteMode:"none", wastePct:0, wasteWarehouseId:"", wasteItemId:"", wasteItemName:""};
    });
    var expenses = Number(r.overhead)>0 ? [{name:"Бошқа харажатлар", type:"sum", value:Number(r.overhead)||0}] : [];
    return {
      id:r.id, productItemId:r.productItemId||"", productName:r.productName||"", productType:r.productType||"mahsulot",
      unit:r.unit||UNIT_OPTIONS[0], quantity:Number(r.quantity)||0, category:r.category||"", machineName:r.machineName||"",
      materials:materials, expenses:expenses,
      gasQty:0, gasPrice:0, amortPct:0,
      adminPct:0, profitPct:0, vatPct:0, usdRate:Number(r.usdRate)||12700,
      laborMode:"manual", laborCalcIds:[], laborWageManual:Number(r.labor)||0, laborElecManual:0, laborTaxPct:0, laborYiitPct:0,
      note:r.note||"", createdAt:r.createdAt||"",
      recipeNumber:(r.recipeNumber!=null&&r.recipeNumber!=="")?Number(r.recipeNumber):0, recipeDate:r.recipeDate||"", workshopKey:r.workshopKey||""
    };
  }
  /* Калькуляциянинг кейинги тартиб рақами (мавжудларининг энг каттаси + 1). */
  function nextRecipeNumber(){
    var max = 0;
    STATE.recipes.forEach(function(r){ var n=Number(r.recipeNumber)||0; if(n>max) max=n; });
    return max+1;
  }

  function computeRecipeCost(ref, visited, depth){
    visited = visited || []; depth = depth || 0;
    var zero = function(errCode){ return {error:errCode||"", materialTotal:0, expenseTotal:0, expenseSum:0, gasTotal:0, wageTotal:0, electricityTotal:0, taxAmount:0, yiitAmount:0, amort:0, laborBlockTotal:0, subtotal1:0, admin:0, subtotal1b:0, subtotal1c:0, profit:0, subtotal2:0, vat:0, finalUzs:0, finalUsd:0, costPerUnit:0, rollup:{}}; };
    var r = (typeof ref === "string") ? normalizeRecipe(STATE.recipes.find(function(x){return x.id===ref;})) : ref;
    if(!r) return zero("notfound");
    if(depth>12 || (r.id && visited.indexOf(r.id)>-1)) return zero("cycle");
    var nextVisited = r.id ? visited.concat([r.id]) : visited;
    var materialTotal = 0, rollup = {};
    r.materials.forEach(function(m){
      if(m.kind==="semi" && m.refRecipeId){
        var childRaw = STATE.recipes.find(function(x){return x.id===m.refRecipeId;});
        var child = normalizeRecipe(childRaw);
        var sub = child ? computeRecipeCost(child, nextVisited, depth+1) : zero("notfound");
        var lineTotal = Number(m.qty||0) * sub.costPerUnit;
        materialTotal += lineTotal;
        var childYield = child ? Number(child.quantity)||0 : 0;
        var ratio = childYield>0 ? Number(m.qty||0)/childYield : 0;
        Object.keys(sub.rollup).forEach(function(k){ rollup[k] = (rollup[k]||0) + sub.rollup[k]*ratio; });
      } else {
        materialTotal += Number(m.qty||0)*Number(m.price||0);
      }
    });
    var expenseSum = 0;
    r.expenses.forEach(function(x){
      var amt = x.type==="percent" ? materialTotal*Number(x.value||0)/100 : (x.type==="qp" ? Number(x.qty||0)*Number(x.price||0) : Number(x.value||0));
      expenseSum += amt;
      if(amt) rollup[x.name||"Харажат"] = (rollup[x.name||"Харажат"]||0) + amt;
    });
    var wageTotal=0, electricityTotal=0;
    if(r.laborMode==="calc"){
      (r.laborCalcIds||[]).forEach(function(id){ var lc=laborCalcById(id); if(lc){ wageTotal+=laborCalcWage(lc); electricityTotal+=laborCalcElec(lc); } });
    } else {
      wageTotal = Number(r.laborWageManual||0); electricityTotal = Number(r.laborElecManual||0);
    }
    var taxAmount = wageTotal*Number(r.laborTaxPct||0)/100;
    var yiitAmount = (wageTotal+taxAmount)*Number(r.laborYiitPct||0)/100;
    var laborBlockTotal = wageTotal+electricityTotal+taxAmount+yiitAmount;
    if(wageTotal) rollup["Ишчи ҳақи"]=(rollup["Ишчи ҳақи"]||0)+wageTotal;
    if(electricityTotal) rollup["Электр энергияси"]=(rollup["Электр энергияси"]||0)+electricityTotal;
    if(taxAmount) rollup["Солиқ"]=(rollup["Солиқ"]||0)+taxAmount;
    if(yiitAmount) rollup["ИЧП"]=(rollup["ИЧП"]||0)+yiitAmount;
    /* Табиий газ — алоҳида панел (миқдор м3 × нарх). */
    var gasTotal = Number(r.gasQty||0)*Number(r.gasPrice||0);
    if(gasTotal) rollup["Табиий газ"]=(rollup["Табиий газ"]||0)+gasTotal;
    var expenseTotal = expenseSum + gasTotal + laborBlockTotal;
    var subtotal1 = materialTotal + expenseTotal;
    /* Амортизация — юқоридаги барча харажатлар йиғиндисидан фоизда;
       ТАННАРХга киради (2026-10-16 сўрови). */
    var amort = subtotal1 * Number(r.amortPct||0)/100;
    if(amort) rollup["Амортизация"]=(rollup["Амортизация"]||0)+amort;
    var subtotal1b = subtotal1 + amort;
    /* «Бошқа харажатлар» энди ТАННАРХдан КЕЙИН — таннархдан фоизда. */
    var admin = subtotal1b * Number(r.adminPct||0)/100;
    var subtotal1c = subtotal1b + admin;
    var profit = subtotal1c * Number(r.profitPct||0)/100;
    var subtotal2 = subtotal1c + profit;
    var vat = subtotal2 * Number(r.vatPct||0)/100;
    var finalUzs = subtotal2 + vat;
    var finalUsd = Number(r.usdRate||0)>0 ? finalUzs/Number(r.usdRate) : 0;
    var costPerUnit = Number(r.quantity||0)>0 ? subtotal1b/Number(r.quantity) : 0;
    return {materialTotal:materialTotal, expenseTotal:expenseTotal, expenseSum:expenseSum, gasTotal:gasTotal, wageTotal:wageTotal, electricityTotal:electricityTotal, taxAmount:taxAmount, yiitAmount:yiitAmount, amort:amort, laborBlockTotal:laborBlockTotal, subtotal1:subtotal1, admin:admin, subtotal1b:subtotal1b, subtotal1c:subtotal1c, profit:profit, subtotal2:subtotal2, vat:vat, finalUzs:finalUzs, finalUsd:finalUsd, costPerUnit:costPerUnit, rollup:rollup};
  }

  function freshRecipeDraft(){
    return {
      editingId:null,
      productName:"", productItemId:"", productType:"mahsulot", unit:UNIT_OPTIONS[0], quantity:1,
      category:"", machineName:"",
      recipeNumber:nextRecipeNumber(), recipeNumberManual:false, recipeDate:todayISO(), workshopKey:"",
      materials:[{kind:"raw",materialItemId:"",materialName:"",qty:0,unit:"",price:0,altMaterialItemId:"",altMaterialName:"",refRecipeId:"",wasteMode:"none",wastePct:0,wasteWarehouseId:"",wasteItemId:"",wasteItemName:""}],
      expenses:[],
      gasQty:0, gasPrice:0, amortPct:0,
      adminPct:0, profitPct:20, vatPct:12, usdRate:12700,
      laborMode:"manual", laborCalcIds:[], laborWageManual:0, laborElecManual:0, laborTaxPct:0, laborYiitPct:0,
      note:""
    };
  }
  function recipeDraft(){ if(!STATE.recipeDraft) STATE.recipeDraft = freshRecipeDraft(); return STATE.recipeDraft; }

  function editRecipe(r){
    var n = normalizeRecipe(r);
    STATE.recipeDraft = {
      editingId:r.id, productName:n.productName, productItemId:n.productItemId||"", productType:n.productType, unit:n.unit, quantity:n.quantity,
      category:n.category, machineName:n.machineName,
      recipeNumber:(n.recipeNumber>0 ? n.recipeNumber : nextRecipeNumber()), recipeNumberManual:true,
      recipeDate:(n.recipeDate || (n.createdAt||"").slice(0,10) || todayISO()), workshopKey:n.workshopKey||"",
      materials:n.materials.map(function(m){ return Object.assign({},m); }),
      expenses:n.expenses.map(function(x){ return Object.assign({},x); }),
      gasQty:n.gasQty||0, gasPrice:n.gasPrice||0, amortPct:n.amortPct||0,
      adminPct:n.adminPct, profitPct:n.profitPct, vatPct:n.vatPct, usdRate:n.usdRate,
      laborMode:n.laborMode, laborCalcIds:(n.laborCalcIds||[]).slice(), laborWageManual:n.laborWageManual, laborElecManual:n.laborElecManual,
      laborTaxPct:n.laborTaxPct, laborYiitPct:n.laborYiitPct, note:n.note
    };
    STATE.prodView = "new-recipe";
    render();
  }

  function renderRecipeNew(){
    var d = recipeDraft();
    setTopbar(d.editingId?"Калькуляцияни таҳрирлаш":"Янги калькуляция", "Маҳсулот таннархи ва рецептини яратиш", "");
    var root = document.getElementById("content");
    root.innerHTML = prodSubnav("new-recipe") + '<div id="recipeMain"></div>';
    wireProdSubnav(root);
    renderRecipeForm();
  }

  function materialItemOptions(selectedId){
    var pool = STATE.items.filter(function(it){ return it.itemType==="xomashyo" || it.itemType==="yarim_tayyor"; }).slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    return '<option value="">— танланг —</option>' + pool.map(function(it){
      return '<option value="'+it.id+'"'+(selectedId===it.id?" selected":"")+'>'+esc(it.name)+' ('+esc(it.unit)+', мавжуд: '+fmtNum(totalStockQty(it.id))+')</option>';
    }).join("");
  }

  function otherRecipesForSemiPicker(excludeId){
    return STATE.recipes.filter(function(r){ return r.id!==excludeId; }).map(function(r){
      var n = normalizeRecipe(r);
      var c = computeRecipeCost(n, [], 0);
      return {id:r.id, name:n.productName, unit:n.unit, costPerUnit:c.costPerUnit};
    }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
  }
  /* "Ярим тайёр" қатори учун танлов рўйхати — фойдаланувчи сўровига кўра
     (2026-10-15) ОМБОРдаги ярим тайёр маҳсулотлар. Агар маҳсулотнинг ўз
     калькуляцияси бўлса — нарх сифатида ўша калькуляциядан ҳисобланган
     1 бирлик таннархи олинади (ва боғланиш сақланади), бўлмаса —
     маҳсулот картасидаги нарх. */
  function semiFinishedPickerList(excludeRecipeId){
    return STATE.items.filter(isSemiFinishedItem).map(function(it){
      var recs = STATE.recipes.filter(function(r){ return r.productItemId===it.id && r.id!==excludeRecipeId && !r.cancelled; })
        .sort(function(a,b){ return String(b.recipeDate||b.createdAt||"").localeCompare(String(a.recipeDate||a.createdAt||"")); });
      var rec = recs[0] || null;
      var cost = 0;
      if(rec){
        var n = normalizeRecipe(rec);
        cost = computeRecipeCost(n, [], 0).costPerUnit;
      }
      if(!cost) cost = Number(it.price)||0;
      return {itemId:it.id, recipeId:rec?rec.id:"", name:it.name, unit:it.unit||"", costPerUnit:cost, stock:totalStockQty(it.id), hasRecipe:!!rec};
    }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
  }
  /* Маҳсулотнинг калькуляция (рецепт) бўйича ҳисобланган сотиш нархи —
     Прайс-варақа тузишда маълумот учун кўрсатилади (Прайс нархини ўзи
     эса қўлда, алоҳида киритилади). Битта маҳсулот учун бир нечта
     калькуляция бўлса — энг сўнгги яратилгани олинади. */
  function calcSellingPriceForItem(itemId){
    if(!itemId) return null;
    var matches = STATE.recipes.filter(function(r){ return r.productItemId===itemId; });
    if(!matches.length) return null;
    matches = matches.slice().sort(function(a,b){ return (b.createdAt||"").localeCompare(a.createdAt||""); });
    var rec = normalizeRecipe(matches[0]);
    var res = computeRecipeCost(rec, [], 0);
    return res.finalUzs;
  }

  /* Калькуляция учун категория танлови — «Омборлар → Бошқарув» рўйхати. */
  function recipeCategoryOptionsHtml(cur){
    var names = STATE.categories.map(function(c){ return c.name; });
    if(cur && names.indexOf(cur)===-1) names = names.concat([cur]);
    names.sort(function(a,b){ return String(a).localeCompare(String(b)); });
    return '<option value="">— танланмаган —</option>'+names.map(function(n){
      return '<option value="'+esc(n)+'"'+(cur===n?" selected":"")+'>'+esc(n)+'</option>';
    }).join("");
  }
  /* —— Хомашё чиқиндиси (2026-10-19 сўрови) ——
     Калькуляциянинг хомашё қаторида "Чиқинди" танланса, ишлаб
     чиқариш вақтида сарфланган хомашёнинг шу фоизи алоҳида
     "<хомашё номи> чиқиндиси" маҳсулоти сифатида танланган омборга
     НОЛ қийматда кирим қилинади (таннархга таъсир қилмайди). */
  function wasteItemNameFor(it){
    var base = (it && (it.materialName||"")).trim();
    if(!base && it && it.materialItemId){ var mi=itemById(it.materialItemId); if(mi) base=mi.name||""; }
    return (base||"Хомашё")+" чиқиндиси";
  }
  function ensureWasteItemId(it){
    var nm = wasteItemNameFor(it);
    var low = nm.trim().toLowerCase();
    var found = STATE.items.find(function(x){ return (x.name||"").trim().toLowerCase()===low; });
    if(found) return found.id;
    var src = it && it.materialItemId ? itemById(it.materialItemId) : null;
    var nid = uid();
    dbSet("items", nid, {
      name:nm, itemType:"xomashyo", unit:(it&&it.unit)||(src?src.unit:"")||UNIT_OPTIONS[0],
      price:0, categoryId:src?(src.categoryId||""):"", minQuantity:0, maxQuantity:0, location:"",
      note:"Ишлаб чиқариш чиқиндиси (автоматик яратилган)", createdAt:new Date().toISOString()
    }, STATE.items);
    return nid;
  }
  function renderRecipeRowsHtml(){
    var d = recipeDraft();
    return d.materials.map(function(it,i){
      var kindSel = '<select data-field="kind" data-row="'+i+'" style="width:86px;"><option value="raw"'+(it.kind!=="semi"?" selected":"")+'>Хомашё</option><option value="semi"'+(it.kind==="semi"?" selected":"")+'>Ярим тайёр</option></select>';
      if(it.kind==="semi"){
        return '<tr data-rrow="'+i+'">'+
          '<td>'+kindSel+'</td>'+
          '<td><button type="button" class="btn btn-secondary btn-sm" data-pick-semi="'+i+'" style="width:100%;text-align:left;">'+(it.materialName?esc(it.materialName):"— омбордаги ярим тайёрдан танланг —")+'</button></td>'+
          '<td class="num cell-strong" data-stock-cell="'+i+'" style="white-space:nowrap;'+(it.materialItemId && totalStockQty(it.materialItemId)<Number(it.qty) ? 'color:var(--critical);' : 'color:var(--ink-2);')+'">'+(it.materialItemId ? (fmtNum(totalStockQty(it.materialItemId))+' '+esc(it.unit||"")) : '<span class="cell-muted">—</span>')+'</td>'+
          '<td><input type="number" min="0" step="any" data-field="qty" data-row="'+i+'" value="'+esc(it.qty)+'" style="width:68px;"></td>'+
          '<td class="cell-muted" style="font-size:11.5px;white-space:nowrap;">'+fmtSum(it.price)+'/'+esc(it.unit||"")+'</td>'+
          '<td class="num cell-strong" data-line-cost="'+i+'">'+fmtSum(Number(it.qty)*Number(it.price))+'</td>'+
          '<td class="cell-muted" style="font-size:11px;">—</td>'+
          '<td class="cell-muted" style="font-size:11px;">—</td>'+
          '<td><button class="btn btn-ghost btn-icon" data-remove-row="'+i+'">'+ICONS.x+'</button></td>'+
          '</tr>';
      }
      return '<tr data-rrow="'+i+'">'+
        '<td>'+kindSel+'</td>'+
        '<td>'+itemComboInputHtml("rc-mat-"+i, "rc-mat-list-"+i, it.materialItemId?itemById(it.materialItemId):null, "Қидириш…", "min-width:120px;", function(x){return x.itemType==="xomashyo"||x.itemType==="yarim_tayyor";}, 'data-field="material" data-row="'+i+'"')+'</td>'+
        '<td class="num cell-strong" data-stock-cell="'+i+'" style="white-space:nowrap;'+(it.materialItemId && totalStockQty(it.materialItemId)<Number(it.qty) ? 'color:var(--critical);' : 'color:var(--ink-2);')+'">'+(it.materialItemId ? (fmtNum(totalStockQty(it.materialItemId))+' '+esc(it.unit||(itemById(it.materialItemId)?itemById(it.materialItemId).unit:""))) : '—')+'</td>'+
        '<td><input type="number" min="0" step="any" data-field="qty" data-row="'+i+'" value="'+esc(it.qty)+'" style="width:68px;"></td>'+
        '<td><input type="number" min="0" step="any" data-field="price" data-row="'+i+'" value="'+esc(it.price)+'" style="width:84px;"></td>'+
        '<td class="num cell-strong" data-line-cost="'+i+'">'+fmtSum(Number(it.qty)*Number(it.price))+'</td>'+
        '<td><select data-field="alt" data-row="'+i+'" style="min-width:110px;max-width:150px;"><option value="">— йўқ —</option>'+
          STATE.items.filter(function(x){ return (x.itemType==="xomashyo"||x.itemType==="yarim_tayyor") && x.id!==it.materialItemId; }).slice().sort(function(a,b){return (a.name||"").localeCompare(b.name||"");}).map(function(x){
            return '<option value="'+x.id+'"'+(it.altMaterialItemId===x.id?" selected":"")+'>'+esc(x.name)+'</option>';
          }).join("")+'</select></td>'+
        '<td style="min-width:150px;">'+
          '<select data-field="wasteMode" data-row="'+i+'" style="width:118px;"><option value="none"'+(it.wasteMode!=="chiqindi"?" selected":"")+'>Чиқиндисиз</option><option value="chiqindi"'+(it.wasteMode==="chiqindi"?" selected":"")+'>Чиқинди</option></select>'+
          (it.wasteMode==="chiqindi" ? (
            '<div style="display:flex;align-items:center;gap:4px;margin-top:5px;">'+
              '<input type="number" min="0" max="100" step="any" data-field="wastePct" data-row="'+i+'" value="'+esc(it.wastePct||0)+'" style="width:64px;" title="Чиқинди фоизи">'+
              '<span class="cell-muted" style="font-size:11.5px;font-weight:700;">%</span>'+
            '</div>'+
            '<select data-field="wasteWh" data-row="'+i+'" style="margin-top:5px;width:118px;"><option value="">— омбор —</option>'+
              STATE.warehouses.map(function(w){ return '<option value="'+w.id+'"'+(it.wasteWarehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>'; }).join("")+'</select>'+
            '<div class="cell-muted" style="font-size:10.5px;margin-top:4px;line-height:1.35;">'+esc(wasteItemNameFor(it))+' · 0 сўм</div>'
          ) : "")+
        '</td>'+
        '<td><button class="btn btn-ghost btn-icon" data-remove-row="'+i+'">'+ICONS.x+'</button></td>'+
        '</tr>';
    }).join("");
  }

  function expRowAmount(x){
    return x.type==="percent" ? null : (x.type==="qp" ? Number(x.qty||0)*Number(x.price||0) : Number(x.value||0));
  }
  function renderExpenseRowsHtml(){
    var d = recipeDraft();
    return d.expenses.map(function(x,i){
      var qp = x.type==="qp";
      var amt = expRowAmount(x);
      return '<tr data-erow="'+i+'">'+
        '<td><input type="text" data-efield="name" data-erow="'+i+'" value="'+esc(x.name)+'" placeholder="Харажат номи" style="min-width:160px;"></td>'+
        '<td><select data-efield="type" data-erow="'+i+'"><option value="qp"'+(qp?" selected":"")+'>Миқдор × нарх</option><option value="sum"'+(x.type==="sum"||(!qp&&x.type!=="percent")?" selected":"")+'>Сумма</option><option value="percent"'+(x.type==="percent"?" selected":"")+'>% (хомашёдан)</option></select></td>'+
        '<td>'+(qp?'<input type="number" min="0" step="any" data-efield="qty" data-erow="'+i+'" value="'+esc(x.qty||0)+'" style="width:100px;">':'<span class="field-hint">—</span>')+'</td>'+
        '<td>'+(qp?'<input type="number" min="0" step="any" data-efield="price" data-erow="'+i+'" value="'+esc(x.price||0)+'" style="width:110px;">':'<input type="number" min="0" step="any" data-efield="value" data-erow="'+i+'" value="'+esc(x.value)+'" style="width:110px;">')+'</td>'+
        '<td class="num" data-erow-total="'+i+'">'+(amt==null?'—':fmtSum(amt))+'</td>'+
        '<td><button class="btn btn-ghost btn-icon" data-remove-erow="'+i+'">'+ICONS.x+'</button></td>'+
        '</tr>';
    }).join("");
  }

  function resultLineHtml(id, label){
    return '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-2);margin-bottom:5px;"><span>'+label+'</span><span class="num" id="'+id+'">0 сўм</span></div>';
  }
  function resultLineBoldHtml(id, label){
    return '<div style="display:flex;justify-content:space-between;"><span style="font-weight:800;">'+label+'</span><span class="num" id="'+id+'" style="font-weight:800;">0 сўм</span></div>';
  }
  function resultLineHtml2(label, val){
    return '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-2);margin-bottom:5px;"><span>'+esc(label)+'</span><span class="num">'+fmtSum(val)+'</span></div>';
  }
  function laborChipsHtml(){
    var d = recipeDraft();
    if(!d.laborCalcIds.length) return '<div class="field-hint">Ҳали танланмаган</div>';
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;">'+d.laborCalcIds.map(function(id){
      var lc = laborCalcById(id);
      if(!lc) return '<span class="chip chip-neutral" data-lc-chip="'+id+'" style="cursor:pointer;">? '+ICONS.x+'</span>';
      var eq = lc.equipmentId ? equipmentById(lc.equipmentId) : null;
      var label = esc(eq?eq.name:(lc.name||"?"))+(lc.productName?' ('+esc(lc.productName)+')':'');
      return '<span class="chip chip-neutral" data-lc-chip="'+id+'" style="cursor:pointer;" title="Ўчириш учун босинг">'+label+' — '+fmtSum(laborCalcWage(lc))+' + '+fmtSum(laborCalcElec(lc))+' эл. '+ICONS.x+'</span>';
    }).join("")+'</div>';
  }
  function renderLaborChipsArea(){
    var el2 = document.getElementById("rc-labor-chips");
    if(el2){
      el2.innerHTML = laborChipsHtml();
      el2.querySelectorAll("[data-lc-chip]").forEach(function(c){ c.addEventListener("click", function(){
        var d=recipeDraft(); var id=c.getAttribute("data-lc-chip"); var idx=d.laborCalcIds.indexOf(id); if(idx>-1) d.laborCalcIds.splice(idx,1); renderLaborChipsArea(); recomputeRecipeDraft();
      }); });
    }
  }

  function recomputeRecipeDraft(){
    var d = recipeDraft();
    var root = document.getElementById("recipeMain");
    if(!root) return;
    d.materials.forEach(function(it,i){
      if(it.kind==="semi" && it.refRecipeId){
        var child = normalizeRecipe(STATE.recipes.find(function(x){return x.id===it.refRecipeId;}));
        if(child){
          var sub = computeRecipeCost(child, d.editingId?[d.editingId]:[], 0);
          it.price = sub.costPerUnit; it.unit = child.unit;
        }
      }
      var cell = root.querySelector('[data-line-cost="'+i+'"]');
      if(cell) cell.textContent = fmtSum(Number(it.qty||0)*Number(it.price||0));
      if(it.kind!=="semi"){
        var stockCell = root.querySelector('[data-stock-cell="'+i+'"]');
        if(stockCell && it.materialItemId){
          var notEnough = totalStockQty(it.materialItemId) < Number(it.qty||0);
          stockCell.style.color = notEnough ? "var(--critical)" : "var(--ink-2)";
        }
      }
      if(it.kind==="semi"){
        var priceCell = root.querySelector('tr[data-rrow="'+i+'"] td.cell-muted');
        if(priceCell) priceCell.textContent = fmtSum(it.price)+'/'+(it.unit||"");
      }
    });
    var res = computeRecipeCost(d, d.editingId?[d.editingId]:[], 0);
    var setText=function(id,val){ var e=root.querySelector(id); if(e) e.textContent=val; };
    setText("#rc-mat-total", fmtSum(res.materialTotal));
    setText("#rc-exp-total", fmtSum(res.expenseSum));
    setText("#rc-gas-total", fmtSum(res.gasTotal));
    setText("#rc-amort-total", fmtSum(res.amort));
    setText("#rc-labor-wage-total", fmtSum(res.wageTotal));
    setText("#rc-r-material", fmtSum(res.materialTotal));
    setText("#rc-r-expense", fmtSum(res.expenseSum));
    setText("#rc-r-wage", fmtSum(res.wageTotal));
    setText("#rc-r-elec", fmtSum(res.electricityTotal));
    setText("#rc-r-gas", fmtSum(res.gasTotal));
    setText("#rc-r-amort", fmtSum(res.amort));
    setText("#rc-r-admin", fmtSum(res.admin));
    setText("#rc-r-tax", fmtSum(res.taxAmount));
    setText("#rc-r-yiit", fmtSum(res.yiitAmount));
    setText("#rc-r-subtotal1b", fmtSum(res.subtotal1b));
    setText("#rc-r-profit", fmtSum(res.profit));
    setText("#rc-r-vat", fmtSum(res.vat));
    setText("#rc-r-final-uzs", fmtSum(res.finalUzs));
    setText("#rc-r-final-usd", "$"+fmtNum(Number(res.finalUsd.toFixed(2))));
    setText("#rc-r-agg-wage", fmtSum(res.wageTotal));
    setText("#rc-r-agg-elec", fmtSum(res.electricityTotal));
    setText("#rc-r-agg-tax", fmtSum(res.taxAmount));
    setText("#rc-r-agg-yiit", fmtSum(res.yiitAmount));
  }

  function renderRecipeForm(){
    var d = recipeDraft();
    var catNames = []; STATE.recipes.forEach(function(r){ if(r.category && catNames.indexOf(r.category)===-1) catNames.push(r.category); }); catNames.sort();
    DASH_WORKSHOPS.forEach(function(dw){ if(catNames.indexOf(dw.name)===-1) catNames.push(dw.name); }); catNames.sort();
    var catOptions = catNames.map(function(c){ return '<option value="'+esc(c)+'">'; }).join("");
    if(!d.editingId && !d.recipeNumberManual) d.recipeNumber = nextRecipeNumber();
    var html = '<div class="recipe-wrap">'+
      '<div class="card" style="padding:20px 22px;margin-bottom:16px;">'+
        (d.editingId ? '<div class="banner" style="margin-bottom:14px;">'+ICONS.pencil+'<div class="banner-body"><div class="banner-title">Таҳрирланмоқда</div>Мавжуд калькуляцияни ўзгартиряпсиз.</div><button class="btn btn-secondary btn-sm" id="rc-stop-edit">Тўхтатиш</button></div>' : '')+
        '<div class="field-row"><div class="field"><label>Тартиб рақами</label><input id="rc-number" type="number" min="1" step="1" value="'+esc(d.recipeNumber)+'"></div>'+
        '<div class="field"><label>Санаси</label><input id="rc-date" type="date" value="'+esc(d.recipeDate||todayISO())+'"></div></div>'+
        '<div class="field-row"><div class="field"><label>Маҳсулот номи</label><div style="display:flex;gap:6px;">'+itemComboInputHtml("rc-product", "rc-product-list", d.productItemId?itemById(d.productItemId):null, "Қидиринг ёки рўйхатдан танланг", "flex:1;min-width:0;", isSellableItem)+'<button type="button" class="btn btn-secondary btn-icon" id="rc-product-add" title="Рўйхатда йўқ бўлса, янги тайёр маҳсулот яратиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div><div class="field-hint">Мавжуд тайёр/ярим тайёр маҳсулот рўйхатидан танланг ёки + орқали янгисини яратинг.</div></div>'+
        /* 2026-10-15 сўровига кўра: Категория эркин матн эмас, «Омборлар →
           Бошқарув» бўлимидаги категориялар рўйхатидан танланади. Эски
           ёзувлардаги (рўйхатда йўқ) қиймат ҳам сақланиб, рўйхатга
           қўшилади. */
        '<div class="field"><label>Категория</label><select id="rc-category">'+recipeCategoryOptionsHtml(d.category||"")+'</select>'+
          (STATE.categories.length?'':'<div class="field-hint">Ҳали категория яратилмаган («Омборлар → Бошқарув» бўлимида яратилади).</div>')+'</div></div>'+
        '<div class="field-row"><div class="field"><label>Маҳсулот тури (янги бўлса)</label><select id="rc-ptype"><option value="mahsulot"'+(d.productType==="mahsulot"?" selected":"")+'>Тайёр маҳсулот</option><option value="yarim_tayyor"'+(d.productType==="yarim_tayyor"?" selected":"")+'>Ярим тайёр маҳсулот</option></select></div>'+
        '<div class="field"><label>Қайси цехга тегишли <span class="opt">(харажат шу цех ҳисобига киради)</span></label><select id="rc-ws"><option value="">— автоматик (категория/маҳсулот бўйича) —</option>'+DASH_WORKSHOPS.map(function(dw){ return '<option value="'+dw.key+'"'+(d.workshopKey===dw.key?" selected":"")+'>'+esc(dw.name)+'</option>'; }).join("")+'</select></div></div>'+
        '<div class="field-row"><div class="field"><label>Партия/чиқим миқдори</label><input id="rc-qty" type="number" min="0" step="any" value="'+esc(d.quantity)+'"></div>'+
        '<div class="field"><label>Ўлчов бирлиги</label><select id="rc-unit">'+allUnitOptions().map(function(u){return '<option'+(d.unit===u?" selected":"")+'>'+u+'</option>';}).join("")+'</select></div></div>'+
      '</div>'+

      '<div class="card" style="padding:20px 22px;margin-bottom:16px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">Хомашё / таркиб</h2><button class="btn btn-secondary btn-sm" id="rc-add-row">'+ICONS.plus+'Қатор қўшиш</button></div>'+
        '<div class="table-wrap" style="margin-bottom:8px;"><table><thead><tr><th>Тури</th><th>Ном</th><th>Омборда қолдиқ</th><th>Миқдор</th><th>Нархи</th><th>Қиймати</th><th>Алтернатив</th><th>Чиқинди</th><th></th></tr></thead><tbody id="rcRowsBody">'+renderRecipeRowsHtml()+'</tbody></table></div>'+
        '<div style="display:flex;justify-content:flex-end;gap:10px;font-size:13px;font-weight:800;margin-bottom:8px;"><span>Жами хомашёлар суммаси:</span><span class="num" id="rc-mat-total">0 сўм</span></div>'+
        '<div class="field-hint">«Ярим тайёр» — бошқа калькуляциядан ҳисобланган таннарх автоматик олинади. Алтернатив хомашё — асосийси тугаганда ишлаб чиқаришда автоматик ундан фойдаланилади.</div>'+
      '</div>'+

      '<div class="card" style="padding:20px 22px;margin-bottom:16px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">Қўшимча харажатлар</h2><button class="btn btn-secondary btn-sm" id="rc-add-erow">'+ICONS.plus+'Қатор қўшиш</button></div>'+
        (d.expenses.length ? '<div class="table-wrap" style="margin-bottom:8px;"><table><thead><tr><th>Номи</th><th>Тури</th><th>Миқдор</th><th>Нарх / қиймат</th><th>Жами</th><th></th></tr></thead><tbody id="rcExpBody">'+renderExpenseRowsHtml()+'</tbody></table></div>' : '<div class="field-hint">Ҳали харажат йўқ.</div><table style="display:none;"><tbody id="rcExpBody"></tbody></table>')+
        '<div style="display:flex;justify-content:flex-end;gap:10px;font-size:13px;font-weight:800;">Жами қўшимча харажатлар суммаси: <span class="num" id="rc-exp-total">0 сўм</span></div>'+
      '</div>'+

      /* Табиий газ — алоҳида панел (2026-10-16 сўрови). */
      '<div class="card" style="padding:20px 22px;margin-bottom:16px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">Табиий газ</h2></div>'+
        '<div class="field-row"><div class="field"><label>Миқдори (м3)</label><input id="rc-gas-qty" type="number" min="0" step="any" value="'+esc(d.gasQty||0)+'"></div>'+
        '<div class="field"><label>1 м3 нархи (сўм)</label><input id="rc-gas-price" type="number" min="0" step="any" value="'+esc(d.gasPrice||0)+'"></div></div>'+
        '<div style="display:flex;justify-content:flex-end;gap:10px;font-size:13px;font-weight:800;">Табиий газ жами: <span class="num" id="rc-gas-total">0 сўм</span></div>'+
      '</div>'+

      '<div class="card" style="padding:20px 22px;margin-bottom:16px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">Ишчи ҳақи / электр</h2>'+
          '<div class="filter-row" style="margin:0;"><button class="pill-filter'+(d.laborMode==="manual"?" active":"")+'" data-labor-mode="manual">Қўлда</button><button class="pill-filter'+(d.laborMode==="calc"?" active":"")+'" data-labor-mode="calc">Калькулятор</button></div>'+
        '</div>'+
        '<div id="rc-labor-manual" style="'+(d.laborMode==="calc"?"display:none;":"")+'">'+
          '<div class="field-row"><div class="field"><label>Иш ҳақи (сўм)</label><input id="rc-wage-manual" type="number" min="0" step="1000" value="'+esc(d.laborWageManual)+'"></div>'+
          '<div class="field"><label>Электр (сўм)</label><input id="rc-elec-manual" type="number" min="0" step="1000" value="'+esc(d.laborElecManual)+'"></div></div>'+
        '</div>'+
        '<div id="rc-labor-calc" style="'+(d.laborMode==="manual"?"display:none;":"")+'">'+
          '<div id="rc-labor-chips" style="margin-bottom:8px;">'+laborChipsHtml()+'</div>'+
          '<button class="btn btn-secondary btn-sm" id="rc-labor-pick">'+ICONS.plus+'Калькулятор танлаш</button>'+
        '</div>'+
        '<div class="field-row" style="margin-top:12px;"><div class="field"><label>Иш ҳақидан даромат солиғи %</label><input id="rc-labor-tax" type="number" min="0" step="any" value="'+esc(d.laborTaxPct)+'"></div>'+
        '<div class="field"><label>Иш ҳақидан ЯИТ %</label><input id="rc-labor-yiit" type="number" min="0" step="any" value="'+esc(d.laborYiitPct)+'"></div></div>'+
        '<div style="display:flex;justify-content:flex-end;gap:10px;font-size:13px;font-weight:800;margin-top:10px;border-top:1px solid var(--border);padding-top:10px;">Жами иш ҳақилар суммаси: <span class="num" id="rc-labor-wage-total">0 сўм</span></div>'+
      '</div>'+

      /* Амортизация — Бошқа харажатлар панелидан юқорида, фоизда
         киритилади ва ТАННАРХга киради (2026-10-16 сўрови). */
      '<div class="card" style="padding:20px 22px;margin-bottom:16px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">Амортизация</h2></div>'+
        '<div class="field-row"><div class="field"><label>Амортизация %</label><input id="rc-amort-pct" type="number" min="0" step="any" value="'+esc(d.amortPct||0)+'"></div>'+
        '<div class="field" style="display:flex;align-items:flex-end;"><div class="field-hint" style="margin:0;">Фоиз юқоридаги барча харажатлар (хомашё, қўшимча харажатлар, иш ҳақи, электр, табиий газ, солиқ, ЯИТ) йиғиндисидан ҳисобланади.</div></div></div>'+
        '<div style="display:flex;justify-content:flex-end;gap:10px;font-size:13px;font-weight:800;">Амортизация жами: <span class="num" id="rc-amort-total">0 сўм</span></div>'+
      '</div>'+

      '<div class="card" style="padding:20px 22px;margin-bottom:16px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">Устама / фойда / солиқ</h2></div>'+
        '<div class="field-row"><div class="field"><label>Бошқа харажатлар</label><input id="rc-admin-pct" type="number" min="0" step="any" value="'+esc(d.adminPct)+'"></div>'+
        '<div class="field"><label>Фойда %</label><input id="rc-profit-pct" type="number" min="0" step="any" value="'+esc(d.profitPct)+'"></div></div>'+
        '<div class="field-row"><div class="field"><label>ҚҚС %</label><input id="rc-vat-pct" type="number" min="0" step="any" value="'+esc(d.vatPct)+'"></div>'+
        '<div class="field"><label>Доллар курси (сўм)</label><input id="rc-usd-rate" type="number" min="0" step="10" value="'+esc(d.usdRate)+'"></div></div>'+
      '</div>'+

      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="rc-note">'+esc(d.note||"")+'</textarea></div>'+
      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;"><button class="btn btn-secondary" id="rc-clear">Тозалаш</button><button class="btn btn-primary" id="rc-submit">'+(d.editingId?"Ўзгаришни сақлаш":"Калькуляцияни сақлаш")+'</button></div>'+

      '<div class="recipe-results-row">'+
      '<div class="card" style="padding:16px 18px;">'+
        '<h2 style="font-size:13.5px;font-weight:800;margin:0 0 12px;">НАТИЖА</h2>'+
        resultLineHtml("rc-r-material","Хомашё жами")+
        resultLineHtml("rc-r-expense","Қўшимча харажатлар жами")+
        resultLineHtml("rc-r-wage","Иш ҳақи жами")+
        resultLineHtml("rc-r-elec","Электр энергия жами")+
        resultLineHtml("rc-r-gas","Табиий газ")+
        resultLineHtml("rc-r-tax","Иш ҳақидан даромад солиғи жами")+
        resultLineHtml("rc-r-yiit","Иш ҳақидан ЯИТ жами")+
        resultLineHtml("rc-r-amort","Амортизация жами")+
        '<div style="border-top:1px solid var(--border-strong);margin:8px 0;padding-top:8px;">'+resultLineBoldHtml("rc-r-subtotal1b","ТАННАРХ")+'</div>'+
        resultLineHtml("rc-r-admin","Бошқа харажатлар жами")+
        resultLineHtml("rc-r-profit","Фойда")+
        resultLineHtml("rc-r-vat","ҚҚС")+
        '<div style="border-top:1px solid var(--border-strong);margin:8px 0;padding-top:10px;">'+
        resultLineHtml("rc-r-final-uzs","Сотиш нархи (сўм)")+
        resultLineHtml("rc-r-final-usd","Сотиш нархи (доллар)")+
        '</div>'+
      '</div>'+
      '<div class="card" style="padding:16px 18px;">'+
        '<h2 style="font-size:13.5px;font-weight:800;margin:0 0 10px;">ЖАМЛАНГАН ХАРАЖАТЛАР</h2>'+
        resultLineHtml("rc-r-agg-wage","Жами иш ҳақи (бириктирилган калькулятордагилар билан бирга)")+
        resultLineHtml("rc-r-agg-elec","Жами электр энергия (бириктирилган калькулятордагилар билан бирга)")+
        resultLineHtml("rc-r-agg-tax","Жами иш ҳақидан даромад солиғи")+
        resultLineHtml("rc-r-agg-yiit","Жами иш ҳақидан ЯИТ")+
      '</div>'+
      '</div>'+
    '</div>';
    var root = document.getElementById("recipeMain");
    root.innerHTML = html;
    wireRecipeForm(root, d);
    recomputeRecipeDraft();
  }

  function wireRecipeForm(root, d){
    var rowsBody = document.getElementById("rcRowsBody");
    var rcMaterialFilter = function(x){ return x.itemType==="xomashyo"||x.itemType==="yarim_tayyor"; };
    /* Хомашё номи энди қидириладиган комбо майдон (<input list=…>) — узун
       рўйхатда ёзиб қидириш учун. Танлов ФОКУСНИ САҚЛАШ учун бутун қатор
       HTML'ини қайта чизмасдан, фақат "Омборда қолдиқ" катагини ва (агар
       нарх ҳали киритилмаган бўлса) нарх майдонини нуқтали янгилайди —
       худди Савдо формасидаги маҳсулот комбоси каби. */
    var resolveRecipeMaterialField = function(t){
      var row=Number(t.getAttribute("data-row"));
      if(row==null||isNaN(row)) return;
      var it = d.materials[row]; if(!it || it.kind==="semi") return;
      var itm = resolveItemFromComboValue(t.value, rcMaterialFilter);
      it.materialItemId = itm ? itm.id : "";
      if(itm){ it.materialName = itm.name; it.unit = itm.unit; if(!it.price) it.price = Number(itm.price)||0; }
      var stockCell = rowsBody.querySelector('[data-stock-cell="'+row+'"]');
      if(stockCell) stockCell.textContent = it.materialItemId ? (fmtNum(totalStockQty(it.materialItemId))+' '+(it.unit||"")) : "—";
      var priceInput = rowsBody.querySelector('input[data-field="price"][data-row="'+row+'"]');
      if(priceInput && itm) priceInput.value = it.price;
      recomputeRecipeDraft();
    };
    rowsBody.addEventListener("input", function(e){
      var t=e.target, row=Number(t.getAttribute("data-row")), field=t.getAttribute("data-field");
      if(field==="material"){ resolveRecipeMaterialField(t); return; }
      if(row==null||isNaN(row)||!field) return;
      var it = d.materials[row]; if(!it) return;
      if(field==="qty") it.qty = Number(t.value)||0;
      if(field==="price") it.price = Number(t.value)||0;
      if(field==="wastePct") it.wastePct = Math.max(0, Math.min(100, Number(t.value)||0));
      recomputeRecipeDraft();
    });
    rowsBody.addEventListener("change", function(e){
      var t=e.target, row=Number(t.getAttribute("data-row")), field=t.getAttribute("data-field");
      if(row==null||isNaN(row)||!field) return;
      var it = d.materials[row]; if(!it) return;
      if(field==="kind"){
        it.kind = t.value;
        if(it.kind==="semi"){ it.materialItemId=""; it.altMaterialItemId=""; it.altMaterialName=""; }
        else { it.refRecipeId=""; it.materialName=""; it.price=0; }
        rowsBody.innerHTML = renderRecipeRowsHtml();
        recomputeRecipeDraft();
      }
      if(field==="material"){ resolveRecipeMaterialField(t); }
      if(field==="alt"){ it.altMaterialItemId = t.value; var a=itemById(t.value); it.altMaterialName = a?a.name:""; }
      /* Чиқинди танланса — фоиз ва омбор майдонлари очилади. */
      if(field==="wasteMode"){
        it.wasteMode = (t.value==="chiqindi") ? "chiqindi" : "none";
        if(it.wasteMode!=="chiqindi"){ it.wastePct=0; it.wasteWarehouseId=""; }
        else if(!it.wasteWarehouseId && STATE.warehouses.length===1) it.wasteWarehouseId = STATE.warehouses[0].id;
        rowsBody.innerHTML = renderRecipeRowsHtml();
        recomputeRecipeDraft();
      }
      if(field==="wasteWh"){ it.wasteWarehouseId = t.value; }
    });
    rowsBody.addEventListener("click", function(e){
      var pick = e.target.closest("[data-pick-semi]");
      if(pick){ openSemiPickerModal(Number(pick.getAttribute("data-pick-semi"))); return; }
      var b=e.target.closest("[data-remove-row]"); if(!b) return;
      var row=Number(b.getAttribute("data-remove-row"));
      d.materials.splice(row,1);
      if(!d.materials.length) d.materials.push({kind:"raw",materialItemId:"",materialName:"",qty:0,unit:"",price:0,altMaterialItemId:"",altMaterialName:"",refRecipeId:"",wasteMode:"none",wastePct:0,wasteWarehouseId:"",wasteItemId:"",wasteItemName:""});
      rowsBody.innerHTML = renderRecipeRowsHtml();
      recomputeRecipeDraft();
    });
    document.getElementById("rc-add-row").addEventListener("click", function(){
      d.materials.push({kind:"raw",materialItemId:"",materialName:"",qty:0,unit:"",price:0,altMaterialItemId:"",altMaterialName:"",refRecipeId:"",wasteMode:"none",wastePct:0,wasteWarehouseId:"",wasteItemId:"",wasteItemName:""});
      rowsBody.innerHTML = renderRecipeRowsHtml();
      recomputeRecipeDraft();
    });

    var expBody = document.getElementById("rcExpBody");
    if(expBody){
      expBody.addEventListener("input", function(e){
        var t=e.target, row=Number(t.getAttribute("data-erow")), field=t.getAttribute("data-efield");
        if(row==null||isNaN(row)||!field) return;
        var x=d.expenses[row]; if(!x) return;
        if(field==="name") x.name=t.value;
        if(field==="value") x.value=Number(t.value)||0;
        if(field==="qty"){ x.qty=Number(t.value)||0; x.value=x.qty*(Number(x.price)||0); }
        if(field==="price"){ x.price=Number(t.value)||0; x.value=(Number(x.qty)||0)*x.price; }
        var tc=expBody.querySelector('[data-erow-total="'+row+'"]'); if(tc){ var am=expRowAmount(x); tc.textContent = am==null?"—":fmtSum(am); }
        recomputeRecipeDraft();
      });
      expBody.addEventListener("change", function(e){
        var t=e.target, row=Number(t.getAttribute("data-erow")), field=t.getAttribute("data-efield");
        if(row==null||isNaN(row)||!field) return;
        var x=d.expenses[row]; if(!x) return;
        if(field==="type"){
          if(t.value==="qp" && x.type!=="qp"){ x.qty = Number(x.qty)||0; x.price = Number(x.price)||0; x.value = x.qty*x.price; }
          x.type=t.value;
          renderRecipeForm(); return;
        }
        recomputeRecipeDraft();
      });
      expBody.addEventListener("click", function(e){
        var b=e.target.closest("[data-remove-erow]"); if(!b) return;
        d.expenses.splice(Number(b.getAttribute("data-remove-erow")),1);
        renderRecipeForm();
      });
    }
    document.getElementById("rc-add-erow").addEventListener("click", function(){
      d.expenses.push({name:"", type:"qp", qty:0, price:0, value:0});
      renderRecipeForm();
    });

    document.getElementById("rc-product").addEventListener("input", function(){
      d.productName = this.value;
      /* Комбо-катакдан рўйхатдан аниқ танланганда (ёки мос ном ёзилганда)
         маҳсулотни аниқ itemId'сига боғлаймиз — сақлашда шу id ишлатилади,
         мос келмаса — фойдаланувчи + орқали янгисини яратиши керак. */
      var matched = resolveItemFromComboValue(this.value, isSellableItem);
      d.productItemId = matched ? matched.id : "";
    });
    document.getElementById("rc-product-add").addEventListener("click", function(){
      /* Рецепт формаси модал эмас — тўлиқ саҳифа — шунга "+" тугмаси
         модални очиб-ёпиш пайтида рецепт қораламасини (d) йўқотмайди,
         фақат янги маҳсулот яратилгач комбо-катакни тўлдириб, шаклни
         қайта чизамиз. */
      openItemForm({name:"", itemType:d.productType||"mahsulot", unit:UNIT_OPTIONS[0], minQuantity:0, price:0, categoryId:"", location:""}, function(itemId, itemName){
        d.productItemId = itemId||"";
        d.productName = itemName||"";
        renderRecipeForm();
      });
    });
    document.getElementById("rc-number").addEventListener("input", function(){ d.recipeNumber=Number(this.value)||0; d.recipeNumberManual=true; });
    document.getElementById("rc-date").addEventListener("input", function(){ d.recipeDate=this.value; });
    document.getElementById("rc-ws").addEventListener("change", function(){ d.workshopKey=this.value; });
    document.getElementById("rc-category").addEventListener("change", function(){ d.category=this.value; });
    document.getElementById("rc-ptype").addEventListener("change", function(){ d.productType=this.value; });
    document.getElementById("rc-qty").addEventListener("input", function(){ d.quantity=Number(this.value)||0; recomputeRecipeDraft(); });
    document.getElementById("rc-unit").addEventListener("change", function(){ d.unit=this.value; });
    document.getElementById("rc-note").addEventListener("input", function(){ d.note=this.value; });

    root.querySelectorAll("[data-labor-mode]").forEach(function(b){ b.addEventListener("click", function(){
      d.laborMode = b.getAttribute("data-labor-mode");
      var manEl=document.getElementById("rc-labor-manual"), calcEl=document.getElementById("rc-labor-calc");
      if(manEl) manEl.style.display = d.laborMode==="manual"?"":"none";
      if(calcEl) calcEl.style.display = d.laborMode==="calc"?"":"none";
      root.querySelectorAll("[data-labor-mode]").forEach(function(x){ x.classList.toggle("active", x===b); });
      recomputeRecipeDraft();
    }); });
    var wm=document.getElementById("rc-wage-manual"), em=document.getElementById("rc-elec-manual");
    if(wm) wm.addEventListener("input", function(){ d.laborWageManual=Number(this.value)||0; recomputeRecipeDraft(); });
    if(em) em.addEventListener("input", function(){ d.laborElecManual=Number(this.value)||0; recomputeRecipeDraft(); });
    document.getElementById("rc-labor-tax").addEventListener("input", function(){ d.laborTaxPct=Number(this.value)||0; recomputeRecipeDraft(); });
    document.getElementById("rc-labor-yiit").addEventListener("input", function(){ d.laborYiitPct=Number(this.value)||0; recomputeRecipeDraft(); });
    var lp=document.getElementById("rc-labor-pick"); if(lp) lp.addEventListener("click", openLaborPickerModal);

    document.getElementById("rc-gas-qty").addEventListener("input", function(){ d.gasQty=Number(this.value)||0; recomputeRecipeDraft(); });
    document.getElementById("rc-gas-price").addEventListener("input", function(){ d.gasPrice=Number(this.value)||0; recomputeRecipeDraft(); });
    document.getElementById("rc-amort-pct").addEventListener("input", function(){ d.amortPct=Number(this.value)||0; recomputeRecipeDraft(); });
    document.getElementById("rc-admin-pct").addEventListener("input", function(){ d.adminPct=Number(this.value)||0; recomputeRecipeDraft(); });
    document.getElementById("rc-profit-pct").addEventListener("input", function(){ d.profitPct=Number(this.value)||0; recomputeRecipeDraft(); });
    document.getElementById("rc-vat-pct").addEventListener("input", function(){ d.vatPct=Number(this.value)||0; recomputeRecipeDraft(); });
    document.getElementById("rc-usd-rate").addEventListener("input", function(){ d.usdRate=Number(this.value)||0; recomputeRecipeDraft(); });

    document.getElementById("rc-clear").addEventListener("click", function(){ STATE.recipeDraft=freshRecipeDraft(); render(); });
    document.getElementById("rc-submit").addEventListener("click", submitRecipe);
    var stopBtn = document.getElementById("rc-stop-edit");
    if(stopBtn) stopBtn.addEventListener("click", function(){ STATE.recipeDraft=freshRecipeDraft(); render(); });
  }

  function openSemiPickerModal(rowIndex){
    var d = recipeDraft();
    var it = d.materials[rowIndex];
    if(!it) return;
    var candidates = semiFinishedPickerList(d.editingId);
    var search = "";
    var renderRows = function(container){
      var q = search.trim().toLowerCase();
      var list = candidates.filter(function(c){ return !q || (c.name||"").toLowerCase().indexOf(q)>-1; });
      container.innerHTML = list.length ? list.map(function(c){
        return '<div class="alert-row" data-semi-pick="'+c.itemId+'" style="cursor:pointer;">'+
          '<div class="grow"><div class="t">'+esc(c.name)+'</div><div class="s">1 '+esc(c.unit)+' = '+fmtSum(c.costPerUnit)+
            (c.hasRecipe?' · калькуляция бўйича':' · маҳсулот нархи')+' · омборда: '+fmtNum(c.stock)+' '+esc(c.unit)+'</div></div>'+
          (it.materialItemId===c.itemId ? '<span class="chip chip-good">'+ICONS.check+'</span>' : '')+
          '</div>';
      }).join("") : '<div style="text-align:center;color:var(--ink-3);font-size:13px;padding:16px 0;">Омборда ярим тайёр маҳсулот топилмади. «Омборлар → Бошқарув» бўлимида маҳсулотни «Ярим тайёр маҳсулот» тури билан яратинг.</div>';
      container.querySelectorAll("[data-semi-pick]").forEach(function(row){ row.addEventListener("click", function(){
        var id = row.getAttribute("data-semi-pick");
        var chosen = candidates.find(function(c){return c.itemId===id;});
        if(!chosen) return;
        it.materialItemId = chosen.itemId; it.refRecipeId = chosen.recipeId||"";
        it.materialName = chosen.name; it.unit = chosen.unit; it.price = chosen.costPerUnit;
        closeModal();
        var rowsBody = document.getElementById("rcRowsBody");
        if(rowsBody) rowsBody.innerHTML = renderRecipeRowsHtml();
        recomputeRecipeDraft();
      }); });
    };
    var body = '<div class="search-box" style="max-width:none;margin-bottom:12px;">'+ICONS.search+'<input type="text" id="semi-picker-search" placeholder="Қидириш…"></div><div id="semi-picker-list"></div>';
    var m = openModal("Ярим тайёр маҳсулот танлаш", body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', true);
    renderRows(m.querySelector("#semi-picker-list"));
    m.querySelector("#semi-picker-search").addEventListener("input", function(){ search=this.value; renderRows(m.querySelector("#semi-picker-list")); });
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
  }

  function openLaborPickerModal(){
    var d = recipeDraft();
    var search = "";
    var renderList = function(container){
      var q = search.trim().toLowerCase();
      var list = STATE.laborCalcs.filter(function(lc){ return !q || (lc.name||"").toLowerCase().indexOf(q)>-1 || (lc.partName||"").toLowerCase().indexOf(q)>-1 || (lc.productName||"").toLowerCase().indexOf(q)>-1; });
      container.innerHTML = list.length ? list.map(function(lc){
        var checked = d.laborCalcIds.indexOf(lc.id)>-1;
        var eq = lc.equipmentId ? equipmentById(lc.equipmentId) : null;
        return '<div class="alert-row" style="align-items:center;">'+
          '<input type="checkbox" data-lc-check="'+lc.id+'" '+(checked?"checked":"")+' style="margin-right:8px;">'+
          '<div class="grow"><div class="t">'+esc(eq?eq.name:(lc.name||"?"))+'</div><div class="s">'+esc(lc.productName||lc.partName||"")+' · '+fmtSum(laborCalcWage(lc))+' + '+fmtSum(laborCalcElec(lc))+' эл.</div></div>'+
          '<button class="btn btn-ghost btn-icon picker-mini-btn" data-lc-dup="'+lc.id+'" title="Нусха">'+ICONS.swap+'</button>'+
          '<button class="btn btn-ghost btn-icon picker-mini-btn" data-lc-edit="'+lc.id+'" title="Таҳрир">'+ICONS.pencil+'</button>'+
          '</div>';
      }).join("") : '<div style="text-align:center;color:var(--ink-3);font-size:13px;padding:16px 0;">Калькулятор топилмади</div>';
      container.querySelectorAll("[data-lc-check]").forEach(function(cb){ cb.addEventListener("change", function(){
        var id = cb.getAttribute("data-lc-check");
        var idx = d.laborCalcIds.indexOf(id);
        if(cb.checked && idx===-1) d.laborCalcIds.push(id);
        if(!cb.checked && idx>-1) d.laborCalcIds.splice(idx,1);
      }); });
      container.querySelectorAll("[data-lc-dup]").forEach(function(b){ b.addEventListener("click", function(e){ e.stopPropagation(); var lc=laborCalcById(b.getAttribute("data-lc-dup")); if(lc) duplicateLaborCalc(lc); setTimeout(function(){ renderList(container); },50); }); });
      container.querySelectorAll("[data-lc-edit]").forEach(function(b){ b.addEventListener("click", function(e){ e.stopPropagation(); var lc=laborCalcById(b.getAttribute("data-lc-edit")); if(lc) openLaborCalcForm(lc); }); });
    };
    var body = '<div class="search-box" style="max-width:none;margin-bottom:12px;">'+ICONS.search+'<input type="text" id="lc-picker-search" placeholder="Қидириш…"></div>'+
      '<button class="btn btn-secondary btn-sm" id="lc-picker-new" style="margin-bottom:10px;">'+ICONS.plus+'Янги калькулятор</button>'+
      '<div id="lc-picker-list"></div>';
    var foot = '<button class="btn btn-primary" data-ok>Танлаш</button>';
    var m = openModal("Иш ставкаси калькуляторларини танлаш", body, foot, true);
    renderList(m.querySelector("#lc-picker-list"));
    m.querySelector("#lc-picker-search").addEventListener("input", function(){ search=this.value; renderList(m.querySelector("#lc-picker-list")); });
    m.querySelector("#lc-picker-new").addEventListener("click", function(){ openLaborCalcForm(null); });
    m.querySelector("[data-ok]").addEventListener("click", function(){ closeModal(); renderLaborChipsArea(); recomputeRecipeDraft(); });
  }

  function submitRecipe(){
    var d = recipeDraft();
    var root = document.getElementById("recipeMain");
    var productName = root.querySelector("#rc-product").value.trim();
    var category = root.querySelector("#rc-category").value.trim();
    var productType = root.querySelector("#rc-ptype").value;
    var quantity = Number(root.querySelector("#rc-qty").value)||0;
    var unit = root.querySelector("#rc-unit").value;
    var note = root.querySelector("#rc-note").value.trim();
    var recipeNumber = Number(root.querySelector("#rc-number").value)||0;
    var recipeDate = root.querySelector("#rc-date").value;
    var workshopKey = root.querySelector("#rc-ws").value;
    if(recipeNumber<=0){ toast("Калькуляциянинг тартиб рақамини киритинг"); return; }
    if(!recipeDate){ toast("Калькуляциянинг санасини киритинг"); return; }
    if(!productName){ toast("Маҳсулот номини киритинг"); return; }
    if(!category){ toast("Категорияни танланг"); return; }
    if(quantity<=0){ toast("Партия миқдорини киритинг"); return; }
    var materials = d.materials.filter(function(it){
      if(it.kind==="semi") return it.refRecipeId && Number(it.qty)>0;
      return it.materialItemId && Number(it.qty)>0;
    }).map(function(it){
      if(it.kind==="semi"){
        return {kind:"semi", refRecipeId:it.refRecipeId, materialName:it.materialName||"", qty:Number(it.qty), unit:it.unit||"", price:Number(it.price)||0, materialItemId:"", altMaterialItemId:"", altMaterialName:""};
      }
      var mat = itemById(it.materialItemId);
      var alt = it.altMaterialItemId ? itemById(it.altMaterialItemId) : null;
      var isWaste = it.wasteMode==="chiqindi" && Number(it.wastePct)>0;
      var wRow = {kind:"raw", materialItemId:it.materialItemId, materialName:mat?mat.name:(it.materialName||"—"), qty:Number(it.qty), unit:mat?mat.unit:(it.unit||""), price:Number(it.price)||0, altMaterialItemId:it.altMaterialItemId||"", altMaterialName:alt?alt.name:"", refRecipeId:"",
        wasteMode:isWaste?"chiqindi":"none", wastePct:isWaste?(Number(it.wastePct)||0):0, wasteWarehouseId:isWaste?(it.wasteWarehouseId||""):"", wasteItemId:"", wasteItemName:""};
      if(isWaste){
        /* Чиқинди маҳсулоти бир марта яратилади (нархи 0) ва кейинги
           калькуляцияларда шу маҳсулот қайта ишлатилади. */
        wRow.wasteItemName = wasteItemNameFor(wRow);
        wRow.wasteItemId = ensureWasteItemId(wRow);
      }
      return wRow;
    });
    if(!materials.length){ toast("Камида битта хомашё қатори тўлдиринг"); return; }
    /* «Чиқинди» танланган қаторда фоиз ва омбор шарт (2026-10-19). */
    var badWaste = null;
    d.materials.forEach(function(it){
      if(it.kind==="semi" || it.wasteMode!=="chiqindi") return;
      if(!(Number(it.wastePct)>0)) badWaste = badWaste || "Чиқинди фоизини киритинг «"+(it.materialName||"хомашё")+"»";
      else if(!it.wasteWarehouseId) badWaste = badWaste || "Чиқинди тушадиган омборни танланг «"+(it.materialName||"хомашё")+"»";
    });
    if(badWaste){ toast(badWaste); return; }
    var expenses = d.expenses.filter(function(x){ return (x.name||"").trim(); }).map(function(x){ if(x.type==="qp"){ var q=Number(x.qty)||0, pr=Number(x.price)||0; return {name:x.name.trim(), type:"qp", qty:q, price:pr, value:q*pr}; } return {name:x.name.trim(), type:x.type==="percent"?"percent":"sum", value:Number(x.value)||0}; });

    /* Фойдаланувчи сўровига кўра: маҳсулот номи энди рўйхатдан
       танланиши (ёки + орқали аниқ яратилиши) керак — номи мос
       келмаса, олдингидек жимгина янги маҳсулот АВТОМАТИК
       яратилмайди, балки фойдаланувчидан рўйхатдан танлаш ёки +
       орқали яратиш сўралади. */
    var matchedProduct = resolveItemFromComboValue(productName, isSellableItem) || (d.productItemId ? itemById(d.productItemId) : null);
    if(!matchedProduct){
      toast("Маҳсулотни рўйхатдан танланг ёки + тугмаси орқали янгисини яратинг");
      return;
    }
    productName = matchedProduct.name;

    var payload = {
      productName:productName, productItemId:matchedProduct.id, productType:productType, unit:unit, quantity:quantity, category:category, machineName:d.machineName||"",
      recipeNumber:recipeNumber, recipeDate:recipeDate, workshopKey:workshopKey,
      materials:materials, expenses:expenses,
      gasQty:Number(d.gasQty)||0, gasPrice:Number(d.gasPrice)||0, amortPct:Number(d.amortPct)||0,
      adminPct:d.adminPct, profitPct:d.profitPct, vatPct:d.vatPct, usdRate:d.usdRate,
      laborMode:d.laborMode, laborCalcIds:d.laborMode==="calc"?d.laborCalcIds.slice():[],
      laborWageManual:d.laborMode==="manual"?d.laborWageManual:0, laborElecManual:d.laborMode==="manual"?d.laborElecManual:0,
      laborTaxPct:d.laborTaxPct, laborYiitPct:d.laborYiitPct, note:note
    };

    if(d.editingId){
      dbUpdate("recipes", d.editingId, payload, STATE.recipes);
      toast("Калькуляция янгиланди");
    } else {
      payload.createdAt = new Date().toISOString();
      dbAdd("recipes", payload, STATE.recipes);
      toast("Калькуляция сақланди");
    }
    STATE.recipeDraft = freshRecipeDraft();
    STATE.prodView = "recipes";
    render();
  }

  function produceMaterialItemId(it){
    if(it.kind==="semi"){
      /* Аввал қаторда танланган маҳсулотнинг ўзи (омбордаги ярим тайёр),
         бўлмаса — боғланган калькуляциянинг маҳсулоти. */
      if(it.materialItemId) return it.materialItemId;
      if(!it.refRecipeId) return "";
      var refRec = STATE.recipes.find(function(x){return x.id===it.refRecipeId;});
      return refRec ? (refRec.productItemId||"") : "";
    }
    return it.materialItemId||"";
  }

  function recipeCategoryOptions(){
    var cats = [];
    STATE.recipes.forEach(function(r){ var c=(r.category||"").trim(); if(c && cats.indexOf(c)===-1) cats.push(c); });
    cats.sort();
    return cats;
  }
  function recipeOptionsForCategory(cat){
    return STATE.recipes.filter(function(x){ return !cat || (x.category||"").trim()===cat; }).slice().sort(function(a,b){ return (a.productName||"").localeCompare(b.productName||""); });
  }
  function openProduceModal(recipe){
    if(!STATE.recipes.length){ toast("Аввал калькуляция яратинг"); return; }
    if(!STATE.warehouses.length){ toast("Аввал омбор яратинг"); return; }
    var r = recipe;
    var cats = recipeCategoryOptions();
    var initialCat = r ? (r.category||"").trim() : "";
    var recipePool = recipeOptionsForCategory(initialCat);
    var body = ''+
      '<div class="field"><label>Категория</label><select id="pm-recipecat"><option value="">— барча категориялар —</option>'+cats.map(function(c){ return '<option value="'+esc(c)+'"'+(initialCat===c?" selected":"")+'>'+esc(c)+'</option>'; }).join("")+'</select></div>'+
      '<div class="field"><label>Калькуляция</label><select id="pm-recipe">'+recipePool.map(function(x){ return '<option value="'+x.id+'"'+(r&&r.id===x.id?" selected":"")+'>'+esc(x.productName)+(x.machineName?" — "+esc(x.machineName):"")+'</option>'; }).join("")+'</select></div>'+
      '<div class="field-row"><div class="field"><label>Ишлаб чиқариладиган миқдор</label><input id="pm-qty" type="number" min="0" step="any" value="'+(r?esc(r.quantity):1)+'"></div>'+
      '<div class="field"><label>Тайёр маҳсулот сақланадиган омбор</label><select id="pm-wh">'+STATE.warehouses.map(function(w){ return '<option value="'+w.id+'">'+esc(w.name)+'</option>'; }).join("")+'</select></div></div>'+
      '<div class="field"><label>Хомашё ҳисобдан чиқариладиган омбор <span style="color:var(--critical);">*</span></label><select id="pm-rawwh"><option value="">— омборни танланг —</option>'+STATE.warehouses.map(function(w){ return '<option value="'+w.id+'">'+esc(w.name)+'</option>'; }).join("")+'</select><div class="field-hint">Хомашё қолдиғи фақат шу омбордан текширилади ва шу омбордан ҳисобдан чиқарилади.</div></div>'+
      '<div class="field-row"><div class="field"><label>Ишлаб чиқарувчи</label><div style="display:flex;gap:6px;"><select id="pm-emp" style="flex:1;min-width:0;"><option value="">— танланмаган —</option>'+STATE.employees.map(function(e){ return '<option value="'+e.id+'">'+esc(e.fullName)+'</option>'; }).join("")+'</select><button type="button" class="btn btn-secondary btn-icon" id="pm-emp-add" title="Янги ходим қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
      '<div class="field"><label>Захира категорияси <span class="opt">(ихтиёрий, ҳисобот учун)</span></label><select id="pm-cat"><option value="">— танланмаган —</option>'+STATE.categories.map(function(c){ return '<option value="'+c.id+'">'+esc(c.name)+'</option>'; }).join("")+'</select></div></div>'+
      '<div class="field"><label>Станок номи</label><input id="pm-machine" value="'+(r?esc(r.machineName||""):"")+'"></div>'+
      '<div id="pm-preview" class="field-hint"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-ok>Ишлаб чиқаришни амалга ошириш</button>';
    var m = openModal("Ишлаб чиқариш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var okBtn = m.querySelector("[data-ok]");
    var recipeCatSel = m.querySelector("#pm-recipecat"), recipeSel = m.querySelector("#pm-recipe"), qtyInput=m.querySelector("#pm-qty"), whSel=m.querySelector("#pm-wh"), rawWhSel=m.querySelector("#pm-rawwh"), machineInput=m.querySelector("#pm-machine");
    var empAddBtn = m.querySelector("#pm-emp-add");
    if(empAddBtn) empAddBtn.addEventListener("click", function(){
      var snap = { recipecat: recipeCatSel.value, recipe: recipeSel.value, qty: qtyInput.value, wh: whSel.value, rawwh: rawWhSel.value, cat: m.querySelector("#pm-cat").value, machine: machineInput.value };
      closeModal();
      openEmployeeForm(null, function(empId){
        openProduceModal(STATE.recipes.find(function(x){return x.id===snap.recipe;}) || null);
        var byId=function(id){return document.getElementById(id);};
        if(byId("pm-recipecat")) byId("pm-recipecat").value = snap.recipecat;
        if(byId("pm-recipe")) byId("pm-recipe").value = snap.recipe;
        if(byId("pm-qty")) byId("pm-qty").value = snap.qty;
        if(byId("pm-wh")) byId("pm-wh").value = snap.wh;
        if(byId("pm-rawwh")) { byId("pm-rawwh").value = snap.rawwh; byId("pm-rawwh").dispatchEvent(new Event("change")); }
        if(byId("pm-emp")) byId("pm-emp").value = empId||"";
        if(byId("pm-cat")) byId("pm-cat").value = snap.cat;
        if(byId("pm-machine")) byId("pm-machine").value = snap.machine;
      });
    });
    var updatePreview = function(){
      var rawRec = STATE.recipes.find(function(x){return x.id===recipeSel.value;});
      var rec = normalizeRecipe(rawRec);
      var qty = Number(qtyInput.value)||0;
      var whId = whSel.value;
      var rawWhId = rawWhSel.value;
      if(!rec){ m.querySelector("#pm-preview").textContent=""; return; }
      if(!rawWhId){
        var pv0 = m.querySelector("#pm-preview");
        pv0.innerHTML = '<span style="color:var(--critical);font-weight:700;">Аввал хомашё ҳисобдан чиқариладиган омборни танланг.</span>';
        if(okBtn) okBtn.disabled = true;
        return;
      }
      var scale = rec.quantity>0 ? qty/rec.quantity : 0;
      var hasShortage = false;
      var lines = rec.materials.map(function(it){
        var itemId = produceMaterialItemId(it);
        var need = it.qty*scale;
        /* Хомашё қолдиғи ФАҚАТ танланган омбордан эмас, балки хомашёнинг
           барча омборлар бўйича ЖАМИ қолдиғидан текширилади — хомашё
           бошқа омборда турган бўлса ҳам, ишлаб чиқариш учун "етарли эмас"
           деб нотўғри тўхтатиб қўймаслик учун (stockQty 0 qaytarsa — stock
           yozuvi umuman yo'q yoki chindan ham tugagan, ikkalasida ham
           foydalanuvchiga aynan shu — "Қолдиқ: 0" — ko'rsatiladi). */
        var avail = itemId ? stockQty(itemId, rawWhId) : 0;
        var altAvail = (it.kind==="raw" && it.altMaterialItemId) ? stockQty(it.altMaterialItemId, rawWhId) : 0;
        var short = need>(avail+altAvail)+1e-9;
        if(short) hasShortage = true;
        var label = it.kind==="semi" ? (it.materialName+" (ярим тайёр)") : it.materialName;
        var line = esc(label)+": керак "+fmtNum(need)+" "+esc(it.unit||"")+" — омборда: "+fmtNum(avail)+" "+esc(it.unit||"");
        if(it.kind==="raw" && it.altMaterialItemId) line += " (алтернатив «"+esc(it.altMaterialName)+"»: "+fmtNum(altAvail)+")";
        if(short) line += ' <b style="color:var(--critical);">— етишмайди: '+fmtNum(need-avail-altAvail)+' '+esc(it.unit||"")+'</b>';
        return line;
      });
      var preview = m.querySelector("#pm-preview");
      preview.innerHTML = "Сарфланадиган хомашё (тахминий): <br>"+lines.join("<br>")+
        (hasShortage ? '<div style="color:var(--critical);font-weight:700;margin-top:8px;">Танланган омборда хомашё етарли эмас — ишлаб чиқаришни амалга ошириб бўлмайди. Аввал омборга кирим қилинг, миқдорни камайтиринг ёки бошқа омборни танланг.</div>' : '');
      preview.style.color = hasShortage ? "var(--critical)" : "";
      if(okBtn) okBtn.disabled = hasShortage;
    };
    var refillRecipeOptions = function(preferId){
      var pool = recipeOptionsForCategory(recipeCatSel.value);
      if(!pool.length){
        recipeSel.innerHTML = '<option value="">— бу категорияда калькуляция йўқ —</option>';
        m.querySelector("#pm-preview").textContent = "";
        return;
      }
      recipeSel.innerHTML = pool.map(function(x){ return '<option value="'+x.id+'"'+(preferId===x.id?" selected":"")+'>'+esc(x.productName)+(x.machineName?" — "+esc(x.machineName):"")+'</option>'; }).join("");
      var rec = pool.find(function(x){return x.id===recipeSel.value;}) || pool[0];
      if(rec){ recipeSel.value=rec.id; qtyInput.value=rec.quantity; machineInput.value=rec.machineName||""; }
      updatePreview();
    };
    recipeCatSel.addEventListener("change", function(){ refillRecipeOptions(""); });
    recipeSel.addEventListener("change", function(){ var rec=STATE.recipes.find(function(x){return x.id===recipeSel.value;}); if(rec){ qtyInput.value=rec.quantity; machineInput.value=rec.machineName||""; } updatePreview(); });
    qtyInput.addEventListener("input", updatePreview);
    whSel.addEventListener("change", updatePreview);
    rawWhSel.addEventListener("change", updatePreview);
    updatePreview();
    m.querySelector("[data-ok]").addEventListener("click", function(){
      var rawRec = STATE.recipes.find(function(x){return x.id===recipeSel.value;});
      if(!rawRec){ toast("Калькуляцияни танланг"); return; }
      var qty = Number(qtyInput.value)||0;
      if(qty<=0){ toast("Миқдорни киритинг"); return; }
      var whId = whSel.value;
      var rawWhId2 = rawWhSel.value;
      if(!rawWhId2){ toast("Хомашё ҳисобдан чиқариладиган омборни танланг"); return; }
      var empId = m.querySelector("#pm-emp").value;
      var catId = m.querySelector("#pm-cat").value;
      var machineName = machineInput.value.trim();
      doProduce(rawRec, qty, whId, empId, catId, machineName, rawWhId2);
    });
  }

  function doProduce(rawRec, qty, whId, empId, catId, machineName, rawWhId){
    var rec = normalizeRecipe(rawRec);
    var res = computeRecipeCost(rec, [], 0);
    var scale = rec.quantity>0 ? qty/rec.quantity : 0;
    var consumed = [];
    var materialsCost = 0;
    var shortages = [];
    rec.materials.forEach(function(it){
      var itemId = produceMaterialItemId(it);
      var price = Number(it.price)||0;
      var need = it.qty*scale;
      /* Хомашё танланган ЯККА омбордан эмас, балки шу хомашёнинг барча
         омборлар бўйича ЖАМИ қолдиғидан ҳисобга олинади ва сарфланади
         (пастда consumeItemAcrossWarehouses аввал шу омбордан, керак
         бўлса бошқа омборлардан ҳам ёзиб олади). */
      var avail = itemId ? stockQty(itemId, rawWhId) : 0;
      var usePrimary = Math.min(need, Math.max(0,avail));
      var remaining = need - usePrimary;
      var altAvail = 0;
      if(usePrimary>0 && itemId){ consumed.push({itemId:itemId, name:it.materialName, qty:usePrimary, price:price, cost:usePrimary*price, isAlt:false}); materialsCost += usePrimary*price; }
      if(remaining>0 && it.kind==="raw" && it.altMaterialItemId){
        var altItem = itemById(it.altMaterialItemId);
        altAvail = stockQty(it.altMaterialItemId, rawWhId);
        var useAlt = Math.min(remaining, Math.max(0,altAvail));
        var altPrice = altItem ? (Number(altItem.price)||price) : price;
        if(useAlt>0){ consumed.push({itemId:it.altMaterialItemId, name:it.altMaterialName, qty:useAlt, price:altPrice, cost:useAlt*altPrice, isAlt:true}); materialsCost += useAlt*altPrice; }
        remaining -= useAlt;
      }
      if(remaining>0){
        /* Омборда нечта хом ашё (ва бор бўлса, алтернативи) қолганини аниқ
           кўрсатамиз — "0" ёки етмаган сон, аслида нима бор эканини
           яширмасдан. */
        var shortMsg = it.materialName+" — керак "+fmtNum(need)+" "+(it.unit||"")+", омборда: "+fmtNum(avail)+" "+(it.unit||"");
        if(it.kind==="raw" && it.altMaterialItemId) shortMsg += " (алтернатив «"+esc(it.altMaterialName||"")+"»: Қолдиқ "+fmtNum(altAvail)+")";
        shortMsg += " — "+fmtNum(remaining)+" "+(it.unit||"")+" етишмайди";
        shortages.push(shortMsg);
      }
    });
    /* Чиқинди — сарфланган хомашё миқдорининг фоизи; таннархга
       таъсир қилмайди (нархи 0), фақат кўрсатилган омборга кирим
       бўлади (2026-10-19 сўрови). */
    var wastes = [];
    rec.materials.forEach(function(it){
      if(it.kind==="semi" || it.wasteMode!=="chiqindi") return;
      var pct = Number(it.wastePct)||0;
      if(pct<=0) return;
      var wq = (Number(it.qty)||0)*scale*pct/100;
      if(!(wq>0)) return;
      var wItemId = it.wasteItemId || ensureWasteItemId(it);
      if(!wItemId) return;
      wastes.push({itemId:wItemId, name:it.wasteItemName||wasteItemNameFor(it), qty:wq,
        warehouseId:it.wasteWarehouseId||whId, price:0, pct:pct,
        fromItemId:it.materialItemId||"", fromName:it.materialName||""});
    });
    var laborCost = res.laborBlockTotal*scale;
    var totalCost = res.subtotal1b*scale;
    var overheadCost = Math.max(0, totalCost-materialsCost-laborCost);
    var costPerUnit = qty>0 ? totalCost/qty : 0;

    var doFinal = function(){
      /* Хомашё ФАҚАТ танланган хомашё омборидан ҳисобдан чиқарилади. */
      consumed.forEach(function(c){ adjustStockBy(c.itemId, rawWhId, -c.qty); });
      if(rec.productItemId) adjustStockBy(rec.productItemId, whId, qty);
      wastes.forEach(function(w){ adjustStockBy(w.itemId, w.warehouseId, w.qty); });
      dbAdd("productions", {
        recipeId:rawRec.id, productItemId:rec.productItemId||"", productName:rec.productName, quantity:qty, unit:rec.unit,
        warehouseId:whId, rawWarehouseId:rawWhId||"", producerEmployeeId:empId||"", categoryId:catId||"", machineName:machineName||rec.machineName||"",
        items:consumed, wastes:wastes, materialsCost:materialsCost, laborCost:laborCost, overheadCost:overheadCost, totalCost:totalCost, costPerUnit:costPerUnit,
        note:"", createdAt:new Date().toISOString()
      }, STATE.productions);
      advanceReadyOrdersForProductName(rec.productName);
      toast(wastes.length ? ("Ишлаб чиқарилди — омбор янгиланди, чиқинди ҳам кирим қилинди") : "Ишлаб чиқарилди — омбор янгиланди");
      closeModal();
      STATE.prodView="history";
      render();
    };
    if(shortages.length){
      /* Хомашё калькуляция бўйича етарли бўлмаса, ишлаб чиқаришни амалга
         ошириб бўлмайди — фақат билдиришнома, "барибир давом этиш" йўқ. */
      var shortM = openModal("Ишлаб чиқариш мумкин эмас",
        '<p style="font-size:13.5px;color:var(--ink-2);line-height:1.5;margin:0;">Қуйидаги хомашёлар (ва алтернативлари) омборда етарли эмас, шунинг учун ишлаб чиқаришни амалга ошириб бўлмайди:</p>'+
        '<p style="font-size:13.5px;color:var(--critical);font-weight:700;line-height:1.6;margin:10px 0 0;">'+esc(shortages.join("; "))+'</p>'+
        '<p style="font-size:12.5px;color:var(--ink-3);margin-top:10px;">Аввал омборга кирим қилинг ёки миқдорни камайтиринг.</p>',
        '<button class="btn btn-primary" data-ok3>Тушунарли</button>');
      shortM.querySelector("[data-ok3]").addEventListener("click", closeModal);
    } else {
      doFinal();
    }
  }

  function openRecipeDetail(r){
    if(!r) return;
    var n = normalizeRecipe(r);
    var res = computeRecipeCost(n, [], 0);
    var matRows = n.materials.map(function(it){
      var label = it.kind==="semi" ? (esc(it.materialName)+' <span class="chip chip-neutral" style="font-size:10px;padding:2px 6px;">ярим тайёр</span>') : esc(it.materialName)+(it.altMaterialName?'<div class="cell-muted" style="font-size:11px;">алт: '+esc(it.altMaterialName)+'</div>':'');
      if(it.wasteMode==="chiqindi" && Number(it.wastePct)>0){
        label += '<div class="cell-muted" style="font-size:11px;">чиқинди: '+fmtNum(it.wastePct)+'% → '+esc(warehouseName(it.wasteWarehouseId)||"—")+' (0 сўм)</div>';
      }
      return '<tr><td>'+label+'</td><td class="num">'+fmtNum(it.qty)+' '+esc(it.unit||"")+'</td><td class="num">'+fmtSum(it.price)+'</td><td class="num cell-strong">'+fmtSum(it.qty*it.price)+'</td></tr>';
    }).join("");
    var rollupEntries = Object.keys(res.rollup).map(function(k){return [k,res.rollup[k]];}).sort(function(a,b){return b[1]-a[1];});
    var rollupHtml = rollupEntries.length ? rollupEntries.map(function(e){ return '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px;"><span>'+esc(e[0])+'</span><span class="num">'+fmtSum(e[1])+'</span></div>'; }).join("") : '<div class="field-hint">Харажат йўқ</div>';
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Тартиб рақами</div><div class="dd">'+(n.recipeNumber>0?esc(n.recipeNumber):"—")+'</div></div>'+
      '<div><div class="dl">Санаси</div><div class="dd">'+fmtDateShort(n.recipeDate||(n.createdAt||"").slice(0,10))+'</div></div>'+
      '<div><div class="dl">Маҳсулот</div><div class="dd">'+esc(n.productName)+'</div></div>'+
      '<div><div class="dl">Категория</div><div class="dd">'+esc(n.category||"—")+'</div></div>'+
      '<div><div class="dl">Партия миқдори</div><div class="dd">'+fmtNum(n.quantity)+' '+esc(n.unit)+'</div></div>'+
      '<div><div class="dl">Станок</div><div class="dd">'+esc(n.machineName||"—")+'</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>Таркиб</th><th>Миқдор</th><th>Нархи</th><th>Қиймати</th></tr></thead><tbody>'+matRows+'</tbody></table></div>'+
      '<div class="card" style="padding:16px 18px;margin-bottom:14px;">'+
        resultLineHtml2("Хомашё жами", res.materialTotal)+
        resultLineHtml2("Қўшимча харажатлар жами", res.expenseSum)+
        resultLineHtml2("Иш ҳақи жами", res.wageTotal)+
        resultLineHtml2("Электр энергия жами", res.electricityTotal)+
        resultLineHtml2("Табиий газ", res.gasTotal)+
        resultLineHtml2("Иш ҳақидан даромад солиғи жами", res.taxAmount)+
        resultLineHtml2("Иш ҳақидан ЯИТ жами", res.yiitAmount)+
        resultLineHtml2("Амортизация жами ("+(n.amortPct||0)+"%)", res.amort)+
        '<div style="border-top:1px solid var(--border-strong);margin:6px 0;padding-top:8px;display:flex;justify-content:space-between;"><span style="font-weight:800;">ТАННАРХ</span><span class="num" style="font-weight:800;">'+fmtSum(res.subtotal1b)+'</span></div>'+
        resultLineHtml2("+ Бошқа харажатлар ("+n.adminPct+"%)", res.admin)+
        resultLineHtml2("+ Фойда ("+n.profitPct+"%)", res.profit)+
        resultLineHtml2("+ ҚҚС ("+n.vatPct+"%)", res.vat)+
        '<div style="border-top:1px solid var(--border-strong);margin:6px 0;padding-top:10px;display:flex;justify-content:space-between;"><span style="font-weight:800;">ЯКУНИЙ НАРХ</span><span class="num" style="font-size:18px;font-weight:800;color:var(--accent);">'+fmtSum(res.finalUzs)+'</span></div>'+
        '<div style="display:flex;justify-content:flex-end;font-size:12px;color:var(--ink-3);">$'+fmtNum(Number(res.finalUsd.toFixed(2)))+'</div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:6px;"><span style="font-weight:700;color:var(--accent);">Бирлик таннархи</span><span class="num" style="font-weight:800;color:var(--accent);">'+fmtSum(res.costPerUnit)+'</span></div>'+
      '</div>'+
      '<div class="card" style="padding:16px 18px;">'+
        '<h2 style="font-size:13px;font-weight:800;margin:0 0 8px;">Жамланган харажатлар</h2>'+rollupHtml+
      '</div>'+
      (n.note?'<div class="field" style="margin-top:14px;"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(n.note)+'</div></div>':'');
    var foot = '<button class="btn btn-secondary" data-close2>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print2 title="Чоп этиш">'+ICONS.printer+'</button><button class="btn btn-secondary" data-edit2>Таҳрирлаш</button><button class="btn btn-primary" data-produce2>Ишлаб чиқариш</button>';
    var m = openModal(esc(n.productName), body, foot, true);
    m.querySelector("[data-close2]").addEventListener("click", closeModal);
    m.querySelector("[data-print2]").addEventListener("click", function(){ printRecipeVoucher(r); });
    m.querySelector("[data-edit2]").addEventListener("click", function(){ closeModal(); editRecipe(r); });
    m.querySelector("[data-produce2]").addEventListener("click", function(){ closeModal(); openProduceModal(r); });
  }

  function openProductionDetail(p){
    if(!p) return;
    var rows = (p.items||[]).map(function(it){
      return '<tr><td>'+esc(it.name)+(it.isAlt?' <span class="chip chip-warning" style="font-size:10px;padding:2px 6px;">алтернатив</span>':'')+'</td><td class="num">'+fmtNum(it.qty)+'</td><td class="num">'+fmtSum(it.price)+'</td><td class="num cell-strong">'+fmtSum(it.cost)+'</td></tr>';
    }).join("");
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Станок</div><div class="dd">'+esc(p.machineName||"—")+'</div></div>'+
      '<div><div class="dl">Маҳсулот</div><div class="dd">'+esc(p.productName)+'</div></div>'+
      '<div><div class="dl">Миқдор</div><div class="dd">'+fmtNum(p.quantity)+' '+esc(p.unit)+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDate((p.createdAt||"").slice(0,10))+'</div></div>'+
      '<div><div class="dl">Тайёр маҳсулот омбори</div><div class="dd">'+esc(warehouseName(p.warehouseId))+'</div></div>'+
      (p.rawWarehouseId?'<div><div class="dl">Хомашё чиқарилган омбор</div><div class="dd">'+esc(warehouseName(p.rawWarehouseId))+'</div></div>':'')+
      '<div><div class="dl">Ишлаб чиқарувчи</div><div class="dd">'+esc(employeeName(p.producerEmployeeId))+'</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>Хомашё</th><th>Миқдор</th><th>Нархи</th><th>Қиймати</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div class="card" style="padding:16px 18px;">'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Хомашё қиймати</span><span class="num">'+fmtSum(p.materialsCost)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Ишчи ҳақи</span><span class="num">'+fmtSum(p.laborCost)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:10px;"><span>Бошқа харажатлар</span><span class="num">'+fmtSum(p.overheadCost)+'</span></div>'+
        '<div style="border-top:1px solid var(--border);padding-top:10px;display:flex;justify-content:space-between;"><span style="font-weight:800;">ЖАМИ ТАННАРХ</span><span class="num" style="font-size:18px;font-weight:700;">'+fmtSum(p.totalCost)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span style="font-weight:700;color:var(--accent);">Таннарх/дона</span><span class="num" style="font-size:20px;font-weight:800;color:var(--accent);">'+fmtSum(p.costPerUnit)+'</span></div>'+
      '</div>';
    var m = openModal(esc(p.productName), body, '<button class="btn btn-secondary" data-close3>Ёпиш</button>', true);
    m.querySelector("[data-close3]").addEventListener("click", closeModal);
  }


