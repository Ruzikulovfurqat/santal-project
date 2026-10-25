  /* ================= Омбор 2: Қолдиқ =================
     Икки хил кесим: "Цехлар бўйича" ва "Омбор бўйича". Иккаласи ҳам худди
     шу МУСТАҚИЛ (STATE.wh2Receipts / STATE.wh2Chikims) регистр устида
     ишлайди — асосий STATE.stock'га умуман алоқаси йўқ. "Ишлаш" тугмаси
     босилмагунча натижа кўрсатилмайди: танловлар пастдаги STATE.wh2Koldiq*
     майдонларига сақланиб, render() орқали шу функция қайта чақирилади
     (андоза renderReportsAct'дан олинган). "Туркум" ҳужжат даражасидаги
     белги бўлгани учун (4550-қатор атрофидаги изоҳга қаранг — Чиқимда
     умуман йўқ), маҳсулотнинг туркуми фақат Кирим ёзувларидан аниқланади.
     Цехлар бўйича ҳисоботда: Wh2Chikim ёзувлари (омбордан шу цехга НИМА
     БЕРИЛГАН бўлса) — цех учун "Кирим" ҳисобланади (цех ўз омборига эга
     бўлгандай), Wh2Receipt (isReturn:true, workshopId шу цехга тенг)
     ёзувлари — яъни шу цех асосий омборга қайтарган товар/хом ашё — эса
     "Чиқим" ҳисобланади (2026-09-24 версиясидан бошлаб, фойдаланувчининг
     аниқ кўрсатмаси бўйича — олдин бу ерда акс йўналиш ишлатилган эди).
     Ишлаб чиқаришда бевосита истеъмол қилиниб калькуляцияга боғланадиган
     чиқим воқеаси ҳали Wh2'да йўқ — форвард-совместимо: келгусида шундай
     воқеа қўшилса, шу функциянинг ичида яна битта манба қўшиш кифоя.
     Цех қолдиғи ҳеч қачон минусга тушмайди — Чиқим (Wh2Return) сақланиш
     пайтида жорий қолдиқ билан текширилади (қаранг: wh2CurrentWorkshopBalance
     ва openWh2ReturnForm'даги сақлаш ҳандлери). Бир нечта цех/омбор
     танланганда натижалар ҳар бир гуруҳда алоҳида кўрсатилади. */
  function wh2KoldiqSubnav(active){
    return '<div class="filter-row" style="margin:2px 0 18px;">'+[["tsex","Цехлар бўйича"],["omor","Омбор бўйича"]].map(function(t){
      return '<button class="pill-filter'+(active===t[0]?" active":"")+'" data-wh2koldiqsub="'+t[0]+'">'+t[1]+'</button>';
    }).join("")+'</div>';
  }
  function wireWh2KoldiqSubnav(root){
    root.querySelectorAll("[data-wh2koldiqsub]").forEach(function(b){ b.addEventListener("click", function(){ STATE.wh2KoldiqSub=b.getAttribute("data-wh2koldiqsub"); render(); }); });
  }
  function renderWh2Koldiq(){
    if(STATE.wh2KoldiqSub==="omor") return renderWh2KoldiqByWarehouse();
    return renderWh2KoldiqByWorkshop();
  }
  function wh2ItemCategorySet(itemId){
    var set = {};
    STATE.wh2Receipts.forEach(function(r){
      if(r.cancelled) return;
      if(!(r.lines||[]).some(function(ln){ return ln.itemId===itemId; })) return;
      if(r.category) set[r.category]=true;
    });
    return Object.keys(set);
  }
  function wh2KoldiqCategoryMatches(itemId, categoryIds){
    if(!categoryIds || !categoryIds.length) return true;
    var cats = wh2ItemCategorySet(itemId);
    if(!cats.length) return false;
    return cats.some(function(c){ return categoryIds.indexOf(c)>-1; });
  }
  function wh2KoldiqLineItemName(docs, itemId){
    var found = null;
    docs.some(function(doc){
      var ln = (doc.lines||[]).find(function(x){ return x.itemId===itemId; });
      if(ln){ found = ln.itemName; return true; }
      return false;
    });
    return found || "—";
  }
  /* ---- Омбор бўйича: тўлиқ икки томонлама (Кирим ва Чиқим) баланс ---- */
  function wh2KoldiqByWarehouseRows(fromDate, toDate, warehouseIds, categoryIds){
    var itemIds = {};
    STATE.wh2Receipts.forEach(function(r){
      if(r.cancelled || warehouseIds.indexOf(r.warehouseId)===-1) return;
      (r.lines||[]).forEach(function(ln){ itemIds[ln.itemId]=true; });
    });
    STATE.wh2Chikims.forEach(function(c){
      if(c.cancelled || warehouseIds.indexOf(c.warehouseId)===-1) return;
      (c.lines||[]).forEach(function(ln){ itemIds[ln.itemId]=true; });
    });
    var rows = [];
    Object.keys(itemIds).forEach(function(itemId){
      if(!wh2KoldiqCategoryMatches(itemId, categoryIds)) return;
      var it = itemById(itemId);
      var openQty=0, openSum=0, inQty=0, inSum=0, outQty=0, outSum=0;
      STATE.wh2Receipts.forEach(function(r){
        if(r.cancelled || warehouseIds.indexOf(r.warehouseId)===-1) return;
        var d = (r.date||"").slice(0,10);
        (r.lines||[]).forEach(function(ln){
          if(ln.itemId!==itemId) return;
          var q=Number(ln.qty)||0, s=Number(ln.lineTotal)||0;
          if(fromDate && d<fromDate){ openQty+=q; openSum+=s; }
          else if((!toDate || d<=toDate)){ inQty+=q; inSum+=s; }
        });
      });
      STATE.wh2Chikims.forEach(function(c){
        if(c.cancelled || warehouseIds.indexOf(c.warehouseId)===-1) return;
        var d = (c.date||"").slice(0,10);
        (c.lines||[]).forEach(function(ln){
          if(ln.itemId!==itemId) return;
          var q=Number(ln.qty)||0, s=Number(ln.lineTotal)||0;
          if(fromDate && d<fromDate){ openQty-=q; openSum-=s; }
          else if((!toDate || d<=toDate)){ outQty+=q; outSum+=s; }
        });
      });
      rows.push({itemId:itemId, name: it?it.name:wh2KoldiqLineItemName(STATE.wh2Receipts.concat(STATE.wh2Chikims), itemId), unit: it?(it.unit||""):"", openQty:openQty, openSum:openSum, inQty:inQty, inSum:inSum, outQty:outQty, outSum:outSum, closeQty:openQty+inQty-outQty, closeSum:openSum+inSum-outSum});
    });
    rows.sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    return rows;
  }
  /* ---- Цехлар бўйича: Wh2Chikim орқали шу цехга омбордан НИМА БЕРИЛГАН
     бўлса — "Кирим" устунида (цех ўз алоҳида "омбори"га эга бўлгандай),
     шу цех Wh2Return орқали асосий омборга НИМА ҚАЙТАРГАН бўлса —
     "Чиқим" устунида кўрсатилади. Ишлаб чиқаришда истеъмол қилиниб
     калькуляцияга боғланадиган алоҳида чиқим воқеаси ҳали Wh2'да йўқ —
     форвард-совместимо: келгусида шундай воқеа қўшилса, шу функциянинг
     ичида яна битта манба (outQty/outSum'га қўшиладиган) қўшиш кифоя. */
  function wh2KoldiqByWorkshopRows(fromDate, toDate, workshopIds, categoryIds){
    var itemIds = {};
    STATE.wh2Chikims.forEach(function(c){
      if(c.cancelled || workshopIds.indexOf(c.workshopId)===-1) return;
      (c.lines||[]).forEach(function(ln){ itemIds[ln.itemId]=true; });
    });
    STATE.wh2Receipts.forEach(function(r){
      if(r.cancelled || !r.isReturn || workshopIds.indexOf(r.workshopId)===-1) return;
      (r.lines||[]).forEach(function(ln){ itemIds[ln.itemId]=true; });
    });
    var rows = [];
    Object.keys(itemIds).forEach(function(itemId){
      if(!wh2KoldiqCategoryMatches(itemId, categoryIds)) return;
      var it = itemById(itemId);
      var openQty=0, openSum=0, inQty=0, inSum=0, outQty=0, outSum=0;
      STATE.wh2Chikims.forEach(function(c){
        if(c.cancelled || workshopIds.indexOf(c.workshopId)===-1) return;
        var d = (c.date||"").slice(0,10);
        (c.lines||[]).forEach(function(ln){
          if(ln.itemId!==itemId) return;
          var q=Number(ln.qty)||0, s=Number(ln.lineTotal)||0;
          if(fromDate && d<fromDate){ openQty+=q; openSum+=s; }
          else if((!toDate || d<=toDate)){ inQty+=q; inSum+=s; }
        });
      });
      STATE.wh2Receipts.forEach(function(r){
        if(r.cancelled || !r.isReturn || workshopIds.indexOf(r.workshopId)===-1) return;
        var d = (r.date||"").slice(0,10);
        (r.lines||[]).forEach(function(ln){
          if(ln.itemId!==itemId) return;
          var q=Number(ln.qty)||0, s=Number(ln.lineTotal)||0;
          if(fromDate && d<fromDate){ openQty-=q; openSum-=s; }
          else if((!toDate || d<=toDate)){ outQty+=q; outSum+=s; }
        });
      });
      rows.push({itemId:itemId, name: it?it.name:wh2KoldiqLineItemName(STATE.wh2Chikims.concat(STATE.wh2Receipts), itemId), unit: it?(it.unit||""):"", openQty:openQty, openSum:openSum, inQty:inQty, inSum:inSum, outQty:outQty, outSum:outSum, closeQty:openQty+inQty-outQty, closeSum:openSum+inSum-outSum});
    });
    rows.sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    return rows;
  }
  /* ---- Жорий (санасиз, "ҳозирги вақтдаги") қолдиқ — Чиқим (Wh2Chikim /
     Wh2Return) сақлашдан олдин "қолдиқ етарлими" текшируви учун ишлатилади.
     excludeDocId — таҳрирланаётган ёзувнинг ЎЗИ (унинг эски таъсирини
     ҳисобга олмаслик учун, шунда "ўзгартирмасдан қайта сақлаш" хато
     равишда бloklanmaydi). */
  function wh2CurrentWarehouseBalance(itemId, warehouseId, excludeDocId){
    var qty = 0;
    STATE.wh2Receipts.forEach(function(r){
      if(r.cancelled || r.warehouseId!==warehouseId || r.id===excludeDocId) return;
      (r.lines||[]).forEach(function(ln){ if(ln.itemId===itemId) qty += Number(ln.qty)||0; });
    });
    STATE.wh2Chikims.forEach(function(c){
      if(c.cancelled || c.warehouseId!==warehouseId || c.id===excludeDocId) return;
      (c.lines||[]).forEach(function(ln){ if(ln.itemId===itemId) qty -= Number(ln.qty)||0; });
    });
    return qty;
  }
  /* Худди шу мантиқ — цех учун: Кирим (Wh2Chikim, шу цехга берилган) минус
     Чиқим (Wh2Return, шу цех қайтарган). */
  function wh2CurrentWorkshopBalance(itemId, workshopId, excludeDocId){
    var qty = 0;
    STATE.wh2Chikims.forEach(function(c){
      if(c.cancelled || c.workshopId!==workshopId || c.id===excludeDocId) return;
      (c.lines||[]).forEach(function(ln){ if(ln.itemId===itemId) qty += Number(ln.qty)||0; });
    });
    STATE.wh2Receipts.forEach(function(r){
      if(r.cancelled || !r.isReturn || r.workshopId!==workshopId || r.id===excludeDocId) return;
      (r.lines||[]).forEach(function(ln){ if(ln.itemId===itemId) qty -= Number(ln.qty)||0; });
    });
    return qty;
  }
  /* Танланган цехда ҳозирда қолдиғи мусбат бўлган барча маҳсулотлар —
     Омбор 2 → Кирим → Қайтариш формасидаги "Қайси цехдан" танловидан
     кейин, шу цех АЙНАН ҳозир нимага эга эканини (яъни нимани қайтариши
     мумкинлигини) кўрсатиш учун ишлатилади. */
  function wh2WorkshopHeldItems(workshopId){
    var byItem = {};
    STATE.wh2Chikims.forEach(function(c){
      if(c.cancelled || c.workshopId!==workshopId) return;
      (c.lines||[]).forEach(function(ln){
        if(!ln.itemId) return;
        if(!byItem[ln.itemId]) byItem[ln.itemId] = {itemId:ln.itemId, itemName:ln.itemName, unit:ln.unit, qty:0};
        byItem[ln.itemId].qty += Number(ln.qty)||0;
      });
    });
    STATE.wh2Receipts.forEach(function(r){
      if(r.cancelled || !r.isReturn || r.workshopId!==workshopId) return;
      (r.lines||[]).forEach(function(ln){
        if(!ln.itemId || !byItem[ln.itemId]) return;
        byItem[ln.itemId].qty -= Number(ln.qty)||0;
      });
    });
    return Object.keys(byItem).map(function(k){ return byItem[k]; })
      .filter(function(x){ return x.qty>1e-9; })
      .sort(function(a,b){ return (a.itemName||"").localeCompare(b.itemName||""); });
  }
  /* ---- Танланган ҳар бир цех/омбор учун АЛОҲИДА гуруҳ (жадвал) —
     бир нечта цех/омбор танланганда натижалар энди биргаликда
     аралаштирилмайди, ҳар бири ўз сарлавҳаси остида кўрсатилади. ---- */
  function wh2KoldiqByWorkshopGroups(fromDate, toDate, workshopIds, categoryIds){
    return (workshopIds||[]).map(function(wsId){
      var rows = wh2KoldiqByWorkshopRows(fromDate, toDate, [wsId], categoryIds);
      return {id:wsId, name:workshopName(wsId), rows:rows, groupTotal: rows.reduce(function(s,r){ return s+r.closeSum; },0)};
    }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
  }
  function wh2KoldiqByWarehouseGroups(fromDate, toDate, warehouseIds, categoryIds){
    return (warehouseIds||[]).map(function(whId){
      var rows = wh2KoldiqByWarehouseRows(fromDate, toDate, [whId], categoryIds);
      return {id:whId, name:warehouseName(whId), rows:rows, groupTotal: rows.reduce(function(s,r){ return s+r.closeSum; },0)};
    }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
  }
  function wh2KoldiqResultTableHtml(rows){
    if(!rows.length) return emptyState("Натижа топилмади","Танланган давр ва филтрлар бўйича ёзувлар мавжуд эмас.");
    var body = rows.map(function(r,i){
      return '<tr><td class="cell-muted">'+(i+1)+'</td><td class="cell-strong">'+esc(r.name)+'</td><td>'+esc(r.unit||"—")+'</td>'+
        '<td class="num">'+fmtNum(r.openQty)+'</td><td class="num">'+fmtSum(r.openSum)+'</td>'+
        '<td class="num">'+fmtNum(r.inQty)+'</td><td class="num">'+fmtSum(r.inSum)+'</td>'+
        '<td class="num">'+fmtNum(r.outQty)+'</td><td class="num">'+fmtSum(r.outSum)+'</td>'+
        '<td class="num cell-strong">'+fmtNum(r.closeQty)+'</td><td class="num cell-strong">'+fmtSum(r.closeSum)+'</td></tr>';
    }).join("");
    return '<div class="table-wrap"><table><thead>'+
      '<tr><th rowspan="2">№</th><th rowspan="2">Маҳсулот номи</th><th rowspan="2">Ўлчов бирлиги</th>'+
      '<th colspan="2">Давр бошига қолдиқ</th><th colspan="2">Кирим</th><th colspan="2">Чиқим</th><th colspan="2">Якуний қолдиқ</th></tr>'+
      '<tr><th>Сони</th><th>Жами нархи</th><th>Сони</th><th>Жами нархи</th><th>Сони</th><th>Жами нархи</th><th>Сони</th><th>Жами суммаси</th></tr>'+
      '</thead><tbody>'+body+'</tbody></table></div>';
  }
  /* Бир нечта цех/омбор танланганда — ҳар бир гуруҳ (цех/омбор) ўз алоҳида
     сарлавҳаси ва жадвали остида, ҳар бирининг ўз кичик жамиси билан
     кўрсатилади (экранда ҳам, чоп этишда ҳам, Excelда ҳам). */
  function wh2KoldiqGroupedHtml(groups, entityLabel){
    if(!groups.length) return emptyState("Танланмаган", entityLabel+"ни танлаб, «Ишлаш» тугмасини босинг.");
    return groups.map(function(g){
      return '<div class="section-head" style="margin-top:22px;"><h2 style="font-size:13.5px;">'+esc(entityLabel)+': '+esc(g.name)+'</h2></div>'+
        wh2KoldiqResultTableHtml(g.rows)+
        '<div style="text-align:right;font-weight:700;font-size:13.5px;margin-top:6px;">Кичик жами: '+fmtSum(g.groupTotal)+'</div>';
    }).join("");
  }
  function wh2KoldiqPrint(title, subLabel, groups, grandTotal, entityLabel){
    var hasRows = groups.some(function(g){ return g.rows.length>0; });
    if(!groups.length || !hasRows){ toast("Натижа йўқ — аввал «Ишлаш» орқали натижа чиқаринг"); return; }
    var body = wh2KoldiqGroupedHtml(groups, entityLabel)+'<div class="v-total">Жами қолдиқлар суммаси: '+fmtSum(grandTotal)+'</div>';
    var html = voucherShell(title, subLabel, body, true);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  function wh2KoldiqExcel(filename, sheetTitle, groups, grandTotal, entityLabel){
    var hasRows = groups.some(function(g){ return g.rows.length>0; });
    if(!groups.length || !hasRows){ toast("Натижа йўқ — аввал «Ишлаш» орқали натижа чиқаринг"); return; }
    var headers = ["№","Маҳсулот номи","Ўлчов бирлиги","Давр бошига сони","Давр бошига жами нархи","Кирим сони","Кирим жами нархи","Чиқим сони","Чиқим жами нархи","Якуний қолдиқ сони","Якуний қолдиқ жами суммаси"];
    var rowsArr = [];
    groups.forEach(function(g){
      rowsArr.push([entityLabel+": "+g.name]);
      g.rows.forEach(function(r,i){ rowsArr.push([i+1, r.name, r.unit||"", fmtNum(r.openQty), fmtNum(r.openSum), fmtNum(r.inQty), fmtNum(r.inSum), fmtNum(r.outQty), fmtNum(r.outSum), fmtNum(r.closeQty), fmtNum(r.closeSum)]); });
      rowsArr.push(["","","","","","","","","Кичик жами:", fmtNum(g.groupTotal)]);
      rowsArr.push([]);
    });
    rowsArr.push(["","","","","","","","","","Жами:", fmtNum(grandTotal)]);
    exportHtmlTableAsExcel(filename, sheetTitle, headers, rowsArr);
  }
  function renderWh2KoldiqByWorkshop(){
    setTopbar("Омбор 2 — Қолдиқ", "Цехлар бўйича", "");
    var root = document.getElementById("content");
    var selWs = STATE.wh2KoldiqTsexWorkshopIds||[];
    var selCats = STATE.wh2KoldiqTsexCategoryIds||[];
    var html = wh2Subnav("koldiq")+wh2KoldiqSubnav("tsex");
    html += '<div class="card" style="padding:18px 20px;margin-bottom:20px;"><div class="field-row" style="align-items:flex-end;flex-wrap:wrap;">'+
      '<div class="field"><label>Санадан</label><input id="wk-from" type="date" value="'+esc(STATE.wh2KoldiqTsexFrom||"")+'"></div>'+
      '<div class="field"><label>Санагача</label><input id="wk-to" type="date" value="'+esc(STATE.wh2KoldiqTsexTo||"")+'"></div>'+
      '<div class="field"><label>&nbsp;</label><button class="btn btn-secondary" id="wk-ws-btn" type="button">'+ICONS.users+'Цехлар ('+(selWs.length||"барчаси")+')</button></div>'+
      '<div class="field"><label>&nbsp;</label><button class="btn btn-secondary" id="wk-cat-btn" type="button">'+ICONS.clipboard+'Туркум ('+(selCats.length||"барчаси")+')</button></div>'+
      '<div class="field"><label>&nbsp;</label><button class="btn btn-primary" id="wk-run-btn" type="button">'+ICONS.search+'Ишлаш</button></div>'+
      '</div></div>';

    var groups = [], grandTotal = 0;
    if(STATE.wh2KoldiqTsexRan && !selWs.length){
      html += emptyState("Цех танланмаган","Натижа кўриш учун камида битта цехни танланг.");
    } else if(STATE.wh2KoldiqTsexRan && selWs.length){
      groups = wh2KoldiqByWorkshopGroups(STATE.wh2KoldiqTsexFrom, STATE.wh2KoldiqTsexTo, selWs, selCats);
      grandTotal = groups.reduce(function(s,g){ return s+g.groupTotal; },0);
      html += wh2KoldiqGroupedHtml(groups, "Цех");
      html += '<div class="card" style="padding:16px 18px;margin-top:16px;max-width:360px;"><div style="display:flex;justify-content:space-between;"><span style="font-weight:800;">Жами қолдиқлар суммаси</span><span class="num" style="font-size:18px;font-weight:700;color:var(--accent);">'+fmtSum(grandTotal)+'</span></div></div>';
      html += '<div style="display:flex;gap:10px;margin-top:14px;">'+
        '<button class="btn btn-secondary" id="wk-excel-btn">'+ICONS.download+'Excelга юклаш</button>'+
        '<button class="btn btn-secondary" id="wk-print-btn">'+ICONS.printer+'Чоп этиш</button>'+
        '</div>';
    } else {
      html += emptyState("Натижа кўрсатилмаган","Давр ва цехларни танлаб, «Ишлаш» тугмасини босинг.");
    }

    root.innerHTML = html;
    wireWh2Subnav(root); wireWh2KoldiqSubnav(root);
    root.querySelector("#wk-ws-btn").addEventListener("click", function(){
      openMultiCheckPickerModal("Цехларни танлаш", STATE.workshops.slice().sort(function(a,b){return (a.name||"").localeCompare(b.name||"");}), selWs, function(picked){
        STATE.wh2KoldiqTsexWorkshopIds = picked; render();
      });
    });
    root.querySelector("#wk-cat-btn").addEventListener("click", function(){
      openMultiCheckPickerModal("Туркумни танлаш", wh2AllCategories(), selCats, function(picked){
        STATE.wh2KoldiqTsexCategoryIds = picked; render();
      });
    });
    root.querySelector("#wk-run-btn").addEventListener("click", function(){
      STATE.wh2KoldiqTsexFrom = document.getElementById("wk-from").value;
      STATE.wh2KoldiqTsexTo = document.getElementById("wk-to").value;
      STATE.wh2KoldiqTsexRan = true;
      render();
    });
    var excelBtn = root.querySelector("#wk-excel-btn");
    if(excelBtn) excelBtn.addEventListener("click", function(){ wh2KoldiqExcel("Wh2Koldiq_Sex.xls", "Цехлар бўйича қолдиқ", groups, grandTotal, "Цех"); });
    var printBtn = root.querySelector("#wk-print-btn");
    if(printBtn) printBtn.addEventListener("click", function(){
      var wsLabel = selWs.length===STATE.workshops.length ? "Барча цехлар" : selWs.map(function(id){ return workshopName(id); }).join(", ");
      wh2KoldiqPrint("Омбор 2 — Қолдиқ (Цехлар бўйича)", "Цех(лар): "+esc(wsLabel)+" · Давр: "+esc(fmtDateShort(STATE.wh2KoldiqTsexFrom))+" — "+esc(fmtDateShort(STATE.wh2KoldiqTsexTo)), groups, grandTotal, "Цех");
    });
  }
  function renderWh2KoldiqByWarehouse(){
    setTopbar("Омбор 2 — Қолдиқ", "Омбор бўйича", "");
    var root = document.getElementById("content");
    var selWh = STATE.wh2KoldiqOmorWarehouseIds||[];
    var selCats = STATE.wh2KoldiqOmorCategoryIds||[];
    var html = wh2Subnav("koldiq")+wh2KoldiqSubnav("omor");
    html += '<div class="card" style="padding:18px 20px;margin-bottom:20px;"><div class="field-row" style="align-items:flex-end;flex-wrap:wrap;">'+
      '<div class="field"><label>Санадан</label><input id="wk2-from" type="date" value="'+esc(STATE.wh2KoldiqOmorFrom||"")+'"></div>'+
      '<div class="field"><label>Санагача</label><input id="wk2-to" type="date" value="'+esc(STATE.wh2KoldiqOmorTo||"")+'"></div>'+
      '<div class="field"><label>&nbsp;</label><button class="btn btn-secondary" id="wk2-wh-btn" type="button">'+ICONS.box+'Омборлар ('+(selWh.length||"барчаси")+')</button></div>'+
      '<div class="field"><label>&nbsp;</label><button class="btn btn-secondary" id="wk2-cat-btn" type="button">'+ICONS.clipboard+'Туркум ('+(selCats.length||"барчаси")+')</button></div>'+
      '<div class="field"><label>&nbsp;</label><button class="btn btn-primary" id="wk2-run-btn" type="button">'+ICONS.search+'Ишлаш</button></div>'+
      '</div></div>';

    var groups = [], grandTotal = 0;
    if(STATE.wh2KoldiqOmorRan && !selWh.length){
      html += emptyState("Омбор танланмаган","Натижа кўриш учун камида битта омборни танланг.");
    } else if(STATE.wh2KoldiqOmorRan && selWh.length){
      groups = wh2KoldiqByWarehouseGroups(STATE.wh2KoldiqOmorFrom, STATE.wh2KoldiqOmorTo, selWh, selCats);
      grandTotal = groups.reduce(function(s,g){ return s+g.groupTotal; },0);
      html += wh2KoldiqGroupedHtml(groups, "Омбор");
      html += '<div class="card" style="padding:16px 18px;margin-top:16px;max-width:360px;"><div style="display:flex;justify-content:space-between;"><span style="font-weight:800;">Жами қолдиқлар суммаси</span><span class="num" style="font-size:18px;font-weight:700;color:var(--accent);">'+fmtSum(grandTotal)+'</span></div></div>';
      html += '<div style="display:flex;gap:10px;margin-top:14px;">'+
        '<button class="btn btn-secondary" id="wk2-excel-btn">'+ICONS.download+'Excelга юклаш</button>'+
        '<button class="btn btn-secondary" id="wk2-print-btn">'+ICONS.printer+'Чоп этиш</button>'+
        '</div>';
    } else {
      html += emptyState("Натижа кўрсатилмаган","Давр ва омборларни танлаб, «Ишлаш» тугмасини босинг.");
    }

    root.innerHTML = html;
    wireWh2Subnav(root); wireWh2KoldiqSubnav(root);
    root.querySelector("#wk2-wh-btn").addEventListener("click", function(){
      openMultiCheckPickerModal("Омборларни танлаш", STATE.warehouses.slice().sort(function(a,b){return (a.name||"").localeCompare(b.name||"");}), selWh, function(picked){
        STATE.wh2KoldiqOmorWarehouseIds = picked; render();
      });
    });
    root.querySelector("#wk2-cat-btn").addEventListener("click", function(){
      openMultiCheckPickerModal("Туркумни танлаш", wh2AllCategories(), selCats, function(picked){
        STATE.wh2KoldiqOmorCategoryIds = picked; render();
      });
    });
    root.querySelector("#wk2-run-btn").addEventListener("click", function(){
      STATE.wh2KoldiqOmorFrom = document.getElementById("wk2-from").value;
      STATE.wh2KoldiqOmorTo = document.getElementById("wk2-to").value;
      STATE.wh2KoldiqOmorRan = true;
      render();
    });
    var excelBtn = root.querySelector("#wk2-excel-btn");
    if(excelBtn) excelBtn.addEventListener("click", function(){ wh2KoldiqExcel("Wh2Koldiq_Omor.xls", "Омбор бўйича қолдиқ", groups, grandTotal, "Омбор"); });
    var printBtn = root.querySelector("#wk2-print-btn");
    if(printBtn) printBtn.addEventListener("click", function(){
      var whLabel = selWh.length===STATE.warehouses.length ? "Барча омборлар" : selWh.map(function(id){ return warehouseName(id); }).join(", ");
      wh2KoldiqPrint("Омбор 2 — Қолдиқ (Омбор бўйича)", "Омбор(лар): "+esc(whLabel)+" · Давр: "+esc(fmtDateShort(STATE.wh2KoldiqOmorFrom))+" — "+esc(fmtDateShort(STATE.wh2KoldiqOmorTo)), groups, grandTotal, "Омбор");
    });
  }
  function wh2OrderById(id){ return STATE.wh2Orders.find(function(x){ return x.id===id; }); }
  function wh2FreshOrderNumber(){ return "OMB2-"+new Date().getFullYear()+"-"+String(STATE.wh2Orders.length+1).padStart(3,"0"); }
  function wh2UnitOptionsHtml(selected){
    return '<option value="">— танланг —</option>'+allUnitOptions().map(function(u){
      return '<option value="'+esc(u)+'"'+(selected===u?" selected":"")+'>'+esc(u)+'</option>';
    }).join("");
  }
  /* Мижоз/таъминотчи номи бўйича мавжудини топади, топилмаса шу ерда
     дарҳол (dbAdd орқали, у синхрон равишда локал массивга қўшиб
     render() ҳам чақиради) янгисини яратади — худди "Буюртмалар"
     бўлимидаги мижоз авто-яратиш ва Лом киримидаги таъминотчи
     авто-яратиш каби. ФАҚАТ тугма босилганда (сақлашда) чақирилади. */
  function wh2ResolveOrCreate(collName, list, name){
    var trimmed = (name||"").trim();
    if(!trimmed) return {id:"", name:""};
    var existing = list.find(function(x){ return (x.name||"").trim().toLowerCase()===trimmed.toLowerCase(); });
    if(existing) return {id:existing.id, name:existing.name};
    var data = {name:trimmed, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:"", createdAt:new Date().toISOString()};
    dbAdd(collName, data, list);
    var created = list[0];
    return {id:created?created.id:"", name:trimmed};
  }
  /* <select>'ларда (омбор/цех/ходим ва ҳ.к.) сақланган id'ни "+" тезкор
     қўшиш оқимидан кейин ҳам ишончли ушлаб туриш учун: dbAdd() дастлаб
     вақтинчалик "_pending_..." id билан яратади, сервер тасдиқлагач эса
     (reconcilePendingId орқали) АСИНХРОН равишда ҳақиқий id'га алмашади
     — агар шу орада форма бошқа "+" оқими (масалан маҳсулот қўшиш)
     туфайли ёпилиб қайта очилган бўлса, эски вақтинчалик id STATE
     рўйхатида энди топилмай қолиши мумкин эди. Шунинг учун id топилмаса,
     номи бўйича (ўзгармас қолади) қайта аниқланади — худди
     wh2ResolveOrCreate'даги каби мантиқ. */
  function wh2ReresolveRef(idVal, nameVal, list, nameField){
    nameField = nameField || "name";
    if(idVal){
      var byId = list.find(function(x){ return x.id===idVal; });
      if(byId) return {id:byId.id, name:byId[nameField]||""};
    }
    if(nameVal){
      var trimmed = nameVal.trim().toLowerCase();
      var byName = list.find(function(x){ return (x[nameField]||"").trim().toLowerCase()===trimmed; });
      if(byName) return {id:byName.id, name:byName[nameField]||""};
    }
    return {id:"", name:nameVal||""};
  }

  /* Диққат: бу функция номида "Wh2" қолган бўлса-да (ва маълумотлари ҳамон
     STATE.wh2Orders'да сақланади — коллекция номи ўзгармади, токи аввалроқ
     киритилган буюртмалар йўқолмасин), фойдаланувчи сўровига кўра
     (2026-09-30) энди у "Омборлар" бўлимидан ("buyurtma" таби орқали)
     очилади, "Омбор 2"дан эмас — қаранг: viewWarehouse/whSubnav ва юқорида,
     WH2_TABS яқинидаги изоҳ. */
