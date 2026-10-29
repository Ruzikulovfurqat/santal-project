  /* ================= view: sales ================= */
  function salesSubnav(active){
    var tabs=[["list","Сотувлар"],["new","+ Янги сотув"],["pricelist","Прайс"],["customers","Мижозлар"]];
    return '<div class="filter-row" style="margin-bottom:18px;">'+tabs.map(function(t){return '<button class="pill-filter'+(active===t[0]?" active":"")+'" data-salesview="'+t[0]+'">'+t[1]+'</button>';}).join("")+'</div>';
  }
  function wireSalesSubnav(root){
    root.querySelectorAll("[data-salesview]").forEach(function(b){ b.addEventListener("click", function(){ STATE.salesView=b.getAttribute("data-salesview"); render(); }); });
  }
  function viewSales(){
    if(STATE.salesView==="new") return renderSalesNew();
    if(STATE.salesView==="pricelist") return renderPriceList();
    if(STATE.salesView==="customers") return renderCustomers();
    return renderSalesList();
  }
  function isSellableItem(it){ return it && (it.itemType==="mahsulot" || it.itemType==="yarim_tayyor"); }
  /* Сотувга чиқариладиганлар — тайёр, ярим тайёр, ТОВАР (2026-10-19) ва
     ХОМАШЁ (2026-10-19 сўрови: хомашё учун буюртма яратилса,
     у Савдо бўлимида хам кўринсин — Прайс, танлов рўйхатларида).
     Калькуляция майдонлари учун эса олдингидек isSellableItem ишлатилади
     (товар/хомашёга калькуляция тузилмайди). */
  function isSaleItem(it){ return isSellableItem(it) || (it && (it.itemType==="tovar" || it.itemType==="xomashyo")); }
  /* Лом (Алюмин) калькуляциясидан чиқадигани — фақат ярим тайёр маҳсулот (2026-10-15). */
  function isSemiFinishedItem(it){ return !!(it && it.itemType==="yarim_tayyor"); }

  function priceListOptionsHtml(selectedId){
    var pool = STATE.priceLists.slice().sort(function(a,b){ return (b.date||"").localeCompare(a.date||""); });
    return '<option value="">— танланмаган —</option>'+pool.map(function(pl){
      return '<option value="'+pl.id+'"'+(selectedId===pl.id?" selected":"")+'>'+esc(pl.name)+' ('+fmtDateShort(pl.date)+')</option>';
    }).join("");
  }

  function renderPriceList(){
    /* 2026-10-19 сўрови: Савдо бўлимида фақат тайёр маҳсулот эмас,
       сотувга чиқариладиган ҳамма тур (тайёр, ярим тайёр, товар,
       хомашё) кўринади — хомашё учун буюртма ва сотув ҳам
       қилинадиган бўлгани учун. */
    var pool = STATE.items.filter(isSaleItem).slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    setTopbar("Прайс", STATE.priceLists.length+" та прайс-варақа", '<button class="btn btn-primary" id="plCreateBtn">'+ICONS.plus+'Янги прайс</button>');
    var root = document.getElementById("content");
    var q = (STATE.priceListSearch||"").trim().toLowerCase();
    var filtered = q ? pool.filter(function(it){ return (it.name||"").toLowerCase().indexOf(q)>-1; }) : pool;

    var html = salesSubnav("pricelist");

    /* ---- Прайс-варақалар: номи, санаси ва танланган маҳсулотлар нархи
       билан яратиладиган, таҳрирлаш мумкин бўлган прайслар рўйхати. ---- */
    html += '<div class="section-head" style="margin-top:2px;"><h2 style="font-size:14.5px;">Прайс-варақалар</h2></div>';
    var plList = STATE.priceLists.slice().sort(function(a,b){ return (b.date||b.createdAt||"").localeCompare(a.date||a.createdAt||""); });
    if(!plList.length){
      html += emptyState("Ҳали прайс-варақа йўқ", "«Янги прайс» тугмаси орқали номи, санаси ва маҳсулотлар нархлари билан прайс-варақа яратинг.");
    } else {
      var plRows = plList.map(function(pl, idx){
        return '<tr>'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-strong">'+esc(pl.name)+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(pl.date)+'</td>'+
          '<td class="num cell-muted">'+(pl.items||[]).length+' та маҳсулот</td>'+
          '<td><div class="row-actions"><button class="btn btn-ghost btn-icon" data-pl-edit="'+pl.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button></div></td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap" style="margin-bottom:24px;"><table><thead><tr><th>№</th><th>Номи</th><th>Санаси</th><th>Маҳсулотлар</th><th></th></tr></thead><tbody>'+plRows+'</tbody></table></div>';
    }

    /* ---- Базавий сотув нархи: прайс-варақа танланмаган ҳолатда «Янги
       сотув»да автоматик қўйиладиган default нарх (олдин ҳам бор эди,
       ўзгармасдан сақланиб қолди). ---- */
    html += '<div class="section-head" style="margin-top:6px;"><h2 style="font-size:14.5px;">Базавий сотув нархи</h2><div class="hint">Прайс-варақа танланмаган ҳолатда шу нарх автоматик қўйилади</div></div>'+
      '<div class="search-box" style="max-width:340px;margin-bottom:14px;">'+ICONS.search+'<input type="text" id="priceListSearch" placeholder="Маҳсулот номи бўйича қидириш…" value="'+esc(STATE.priceListSearch||"")+'"></div>';
    if(!pool.length){
      html += emptyState("Сотувга маҳсулот йўқ","Аввал «Омборлар» бўлимида маҳсулот (тайёр, ярим тайёр, товар ёки хомашё) яратинг, ёки ишлаб чиқариш орқали қўшинг.");
    } else if(!filtered.length){
      html += emptyState("Топилмади","Қидирув бўйича маҳсулот топилмади.");
    } else {
      var rows = filtered.map(function(it){
        return '<tr>'+
          '<td class="cell-strong">'+esc(it.name)+'</td>'+
          '<td>'+itemTypeChip(it.itemType)+'</td>'+
          '<td class="cell-muted">'+esc(it.unit)+'</td>'+
          '<td class="num cell-muted">'+fmtNum(totalStockQty(it.id))+'</td>'+
          '<td><input type="number" min="0" step="any" class="num" data-price-item="'+it.id+'" value="'+esc(it.salePrice||0)+'" style="width:140px;padding:8px 10px;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg);"></td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Маҳсулот</th><th>Тури</th><th>Бирлик</th><th>Омборда қолдиқ</th><th>Сотув нархи (сўм)</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
        '<div class="field-hint" style="margin-top:10px;">Бу ерда белгиланган сотув нархи — прайс-варақа танланмаган ҳолатда «Янги сотув» формасида маҳсулот танлангач автоматик қўйилади (керак бўлса, у ерда қўлда ҳам ўзгартириш мумкин).</div>';
    }
    root.innerHTML = html;
    wireSalesSubnav(root);
    var plCreateBtn = document.getElementById("plCreateBtn");
    if(plCreateBtn) plCreateBtn.addEventListener("click", function(){ openPriceListForm(null); });
    root.querySelectorAll("[data-pl-edit]").forEach(function(b){ b.addEventListener("click", function(){
      openPriceListForm(STATE.priceLists.find(function(x){return x.id===b.getAttribute("data-pl-edit");}));
    }); });
    var searchInput = document.getElementById("priceListSearch");
    if(searchInput) searchInput.addEventListener("input", function(){
      STATE.priceListSearch = this.value;
      renderPriceList();
      var el2 = document.getElementById("priceListSearch");
      if(el2){ el2.focus(); el2.setSelectionRange(el2.value.length, el2.value.length); }
    });
    root.querySelectorAll("[data-price-item]").forEach(function(inp){
      inp.addEventListener("change", function(){
        var itemId = inp.getAttribute("data-price-item");
        dbUpdate("items", itemId, {salePrice:Number(inp.value)||0}, STATE.items);
      });
    });
  }

  function openPriceListForm(existing){
    var isEdit = !!(existing && existing.id);
    var pl = isEdit
      ? { id:existing.id, name:existing.name||"", date:existing.date||todayISO(), items:(existing.items||[]).map(function(x){ return Object.assign({}, x); }) }
      : { name:"", date:todayISO(), items:[] };
    if(!pl.items.length) pl.items.push({itemId:"", itemName:"", calcPrice:0, price:0});

    var rowsHtml = function(){
      return pl.items.map(function(it,i){
        var calcVal = it.itemId ? calcSellingPriceForItem(it.itemId) : null;
        return '<tr data-plrow="'+i+'">'+
          '<td>'+itemComboInputHtml("pl-item-"+i, "pl-item-datalist-"+i, it.itemId?itemById(it.itemId):null, "Қидириш…", "min-width:180px;", isSaleItem, 'data-field="item" data-row="'+i+'"')+'</td>'+
          '<td class="num cell-muted" data-pl-calc="'+i+'" style="white-space:nowrap;">'+(calcVal!=null?fmtSum(calcVal):"—")+'</td>'+
          '<td><input type="number" min="0" step="any" data-field="price" data-row="'+i+'" value="'+esc(it.price)+'" style="width:130px;"></td>'+
          '<td><button class="btn btn-ghost btn-icon" data-remove-plrow="'+i+'">'+ICONS.x+'</button></td>'+
          '</tr>';
      }).join("");
    };

    var body = '<div class="field-row"><div class="field"><label>Прайс номи</label><input id="pl-name" value="'+esc(pl.name)+'" placeholder="Масалан: Асосий прайс"></div>'+
      '<div class="field"><label>Сана</label><input id="pl-date" type="date" value="'+esc(pl.date)+'"></div></div>'+
      '<div class="section-head" style="margin-top:4px;"><h2 style="font-size:13.5px;">Маҳсулотлар</h2><button type="button" class="btn btn-secondary btn-sm" id="pl-add-row">'+ICONS.plus+'Қатор қўшиш</button></div>'+
      '<div class="table-wrap"><table><thead><tr><th>Маҳсулот</th><th>Калькуляция бўйича сотиш нархи</th><th>Прайс нархи</th><th></th></tr></thead><tbody id="plRowsBody">'+rowsHtml()+'</tbody></table></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Прайсни таҳрирлаш":"Янги прайс", body, foot, true);
    m.querySelector(".modal").classList.add("xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);

    var rowsBody = m.querySelector("#plRowsBody");
    var resolvePlItemField = function(t){
      var row=Number(t.getAttribute("data-row"));
      if(row==null||isNaN(row)) return;
      var it = pl.items[row]; if(!it) return;
      var itm = resolveItemFromComboValue(t.value, isSaleItem);
      it.itemId = itm ? itm.id : "";
      it.itemName = itm ? itm.name : "";
      var calcVal = it.itemId ? calcSellingPriceForItem(it.itemId) : null;
      it.calcPrice = calcVal!=null ? calcVal : 0;
      var calcCell = rowsBody.querySelector('[data-pl-calc="'+row+'"]');
      if(calcCell) calcCell.textContent = calcVal!=null ? fmtSum(calcVal) : "—";
    };
    rowsBody.addEventListener("input", function(e){
      var t=e.target, row=Number(t.getAttribute("data-row")), field=t.getAttribute("data-field");
      if(field==="item"){ resolvePlItemField(t); return; }
      if(row==null||isNaN(row)||!field) return;
      var it = pl.items[row]; if(!it) return;
      if(field==="price") it.price = Number(t.value)||0;
    });
    rowsBody.addEventListener("change", function(e){
      var t=e.target, field=t.getAttribute("data-field");
      if(field==="item") resolvePlItemField(t);
    });
    rowsBody.addEventListener("click", function(e){
      var b=e.target.closest("[data-remove-plrow]"); if(!b) return;
      var row=Number(b.getAttribute("data-remove-plrow"));
      pl.items.splice(row,1);
      if(!pl.items.length) pl.items.push({itemId:"", itemName:"", calcPrice:0, price:0});
      rowsBody.innerHTML = rowsHtml();
    });
    m.querySelector("#pl-add-row").addEventListener("click", function(){
      pl.items.push({itemId:"", itemName:"", calcPrice:0, price:0});
      rowsBody.innerHTML = rowsHtml();
    });

    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#pl-name").value.trim();
      var date = m.querySelector("#pl-date").value || todayISO();
      if(!name){ toast("Прайс номини киритинг"); return; }
      var items = pl.items.filter(function(it){ return it.itemId; }).map(function(it){
        var itm = itemById(it.itemId);
        return { itemId:it.itemId, itemName:itm?itm.name:(it.itemName||"—"), calcPrice:Number(it.calcPrice)||0, price:Number(it.price)||0 };
      });
      if(!items.length){ toast("Камида битта маҳсулот қўшинг"); return; }
      var data = { name:name, date:date, items:items };
      if(isEdit){ dbUpdate("priceLists", pl.id, data, STATE.priceLists); toast("Прайс янгиланди"); }
      else { data.createdAt=new Date().toISOString(); dbAdd("priceLists", data, STATE.priceLists); toast("Прайс сақланди"); }
      closeModal();
    });
  }

  function renderSalesList(){
    setTopbar("Савдо", STATE.sales.length+" та сотув", "");
    var root = document.getElementById("content");
    /* Рақами бўйича кетма-кет (янгиси юқорида) — тартиб рақами бўлмаган
       эски ёзувлар (2026-10-03 гача киритилган) createdAt бўйича четга
       чиқарилади, лекин ҳеч нарса ўчирилмайди (2026-10-03 сўровига
       кўра). */
    var list = STATE.sales.slice().sort(function(a,b){
      var an=Number(a.saleNumber)||0, bn=Number(b.saleNumber)||0;
      if(an!==bn) return bn-an;
      return (b.createdAt||"").localeCompare(a.createdAt||"");
    });
    var html = salesSubnav("list") + sampleBanner();
    if(!list.length){
      html += emptyState("Ҳали сотув йўқ","«+ Янги сотув» орқали биринчи сотувни киритинг.");
    } else {
      /* 2026-10-03 Савдо формаси қайта қурилиши сўровига кўра: рўйхат
         устунлари соддалаштирилди — тартиб рақами, сана, Мижоз номи,
         Якуний Жами суммаси, Ҳолати (ҳолат матни — қаранг: saleStatusInfo).
         Тўлиқ таркиб/ККС/тўланган-қарз сумма кўзча орқали (openSaleDetail)
         ҳамон кўринади — ҳеч нарса ўчирилмайди, фақат рўйхат кўриниши
         соддалашди. */
      var rows = list.map(function(s){
        var stInfo = saleStatusInfo(s);
        var st = '<span class="chip '+stInfo.chip+'">'+esc(stInfo.label)+'</span>';
        return '<tr data-sale="'+s.id+'"'+(s.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted num">'+(s.saleNumber!=null?esc(s.saleNumber):"—")+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(s.date||(s.createdAt||"").slice(0,10))+'</td>'+
          '<td class="cell-strong">'+esc(s.customerName)+'</td>'+
          '<td class="num cell-strong">'+fmtSum(s.totalWithVat)+'</td>'+
          '<td>'+st+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-sale-view="'+s.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-sale-copy="'+s.id+'" title="Нусха олиш">'+ICONS.copy+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-sale-print="'+s.id+'" title="Юк хати — чоп этиш">'+ICONS.printer+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-sale-xls="'+s.id+'" title="Excelга юклаш">'+ICONS.download+'</button>'+
            (s.cancelled?
              '<button class="btn btn-ghost btn-icon" data-sale-restore="'+s.id+'" title="Тиклаш">'+ICONS.restore+'</button>'
              :
              '<button class="btn btn-ghost btn-icon" data-sale-edit="'+s.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-sale-cancel="'+s.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>'
            )+
          '</div></td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сана</th><th>Мижоз номи</th><th>Якуний жами сумма</th><th>Ҳолати</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSampleBanner(root);
    wireSalesSubnav(root);
    root.querySelectorAll("[data-sale-view]").forEach(function(b){ b.addEventListener("click", function(){ openSaleDetail(list.find(function(x){return x.id===b.getAttribute("data-sale-view");})); }); });
    root.querySelectorAll("[data-sale-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var sl = STATE.sales.find(function(x){ return x.id===b.getAttribute("data-sale-copy"); });
      if(!sl) return;
      /* Нусха — янги сотув қораламаси, эски ёзувга тегмайди (2026-10-21). */
      var d = freshSaleDraft();
      d.customerId = sl.customerId||""; d.customerName = sl.customerName||"";
      d.orderId = sl.orderId||""; d.warehouseId = sl.warehouseId||""; d.workshopId = sl.workshopId||"";
      d.note = sl.note||"";
      d.items = (sl.items||[]).map(function(it){
        return {itemId:it.itemId||"", product:it.name||"", unit:it.unit||"", quantity:Number(it.qty)||0,
          price:Number(it.price)||0, discountPct:Number(it.discountPct)||0, discountAmount:Number(it.discountAmount)||0,
          subtotalAmount:Number(it.lineSubtotal)||0, totalAmount:Number(it.lineTotal)||0,
          noVatAmount:Number(it.noVatAmount)||0, vatRate:Number(it.noVatRate)||12, vatAmount:Number(it.noVatTax)||0,
          categoryKey:it.categoryKey||""};
      });
      STATE.saleDraft = d; STATE.salesView = "new"; render();
      toast("Нусха олинди — текшириб, «Сотувни сақлаш» тугмасини босинг");
    }); });
    root.querySelectorAll("[data-sale-xls]").forEach(function(b){ b.addEventListener("click", function(){
      var sl = STATE.sales.find(function(x){ return x.id===b.getAttribute("data-sale-xls"); });
      if(sl) opExcelDoc(saleOpDoc(sl), "Sotuv_"+(sl.saleNumber||""));
    }); });
    root.querySelectorAll("[data-sale-print]").forEach(function(b){ b.addEventListener("click", function(){ printSaleWaybill(list.find(function(x){return x.id===b.getAttribute("data-sale-print");})); }); });
    root.querySelectorAll("[data-sale-edit]").forEach(function(b){ b.addEventListener("click", function(){ openSaleEditForm(list.find(function(x){return x.id===b.getAttribute("data-sale-edit");})); }); });
    root.querySelectorAll("[data-sale-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var s = list.find(function(x){return x.id===b.getAttribute("data-sale-cancel");});
      openConfirm("Сотувни бекор қилиш","«"+s.customerName+"» бўйича бу сотув бекор қилинса, сотилган маҳсулот омборга қайтарилади ва боғлиқ касса ёзуви(лари) бекор қилинади. Давом этасизми?","Ҳа, бекор қилиш", function(){ cancelSale(s); }, true);
    }); });
    root.querySelectorAll("[data-sale-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var s = list.find(function(x){return x.id===b.getAttribute("data-sale-restore");});
      openConfirm("Сотувни тиклаш","Бу сотув қайта тикланиб, омбордан яна айирилсин ва боғлиқ касса ёзуви(лари) қайта тикланадими?","Ҳа, тиклаш", function(){ restoreSale(s); }, true);
    }); });
  }

  function cancelSale(s){
    (s.items||[]).forEach(function(it){ if(it.itemId) adjustStockBy(it.itemId, s.warehouseId, it.qty); });
    STATE.cashTransactions.filter(function(t){return t.saleId===s.id && !t.cancelled;}).forEach(function(t){ dbUpdate("cashTransactions", t.id, {cancelled:true}, STATE.cashTransactions); });
    /* Агар бу сотув яратилганда мижознинг "бўнак" (advanceBalance)
       ҳисобидан бир қисми автоматик ҳисобга олинган бўлса — сотув бекор
       қилинганда шу сумма мижозга бўнак сифатида қайтарилади. */
    if(Number(s.advanceApplied||0)>0 && s.customerId){
      var custCS = customerById(s.customerId);
      if(custCS) dbUpdate("customers", custCS.id, {advanceBalance: (Number(custCS.advanceBalance)||0)+Number(s.advanceApplied||0)}, STATE.customers);
    }
    dbUpdate("sales", s.id, {cancelled:true}, STATE.sales);
    /* Боғлиқ буюртма ҳолати олдинги ҳолатига қайтади (бошқа фаол сотув
       шу буюртмага боғланмаган бўлсагина). Олдинги ҳолат сақланмаган эски
       сотувларда — «Тайёр омборда» босқичи. */
    if(s.orderId){
      var ordRC = orderById(s.orderId);
      var otherActive = STATE.sales.some(function(x){ return x.id!==s.id && x.orderId===s.orderId && !x.cancelled; });
      if(ordRC && !otherActive && !ordRC.cancelled){
        var pv = s.orderPrev || {stage:STAGE_READY_IDX, completed:false, completedAt:""};
        dbUpdate("orders", ordRC.id, {currentStageIndex:pv.stage, completed:!!pv.completed, completedAt:pv.completedAt||""}, STATE.orders);
      }
    }
    toast("Сотув бекор қилинди — омбор, касса ва буюртма ҳолати қайтарилди");
  }
  function restoreSale(s){
    var insufficient = (s.items||[]).filter(function(it){ return it.itemId && Number(it.qty)>stockQty(it.itemId, s.warehouseId); });
    var doRestore = function(){
      (s.items||[]).forEach(function(it){ if(it.itemId) adjustStockBy(it.itemId, s.warehouseId, -it.qty); });
      STATE.cashTransactions.filter(function(t){return t.saleId===s.id && t.cancelled;}).forEach(function(t){ dbUpdate("cashTransactions", t.id, {cancelled:false}, STATE.cashTransactions); });
      /* Тикланганда — бекор қилишда қайтарилган бўнак қисми яна сотувга
         қўлланади (аниқ ўша сумма, қайтадан ФИФО ҳисоблашсиз). */
      if(Number(s.advanceApplied||0)>0 && s.customerId){
        var custRS = customerById(s.customerId);
        if(custRS) dbUpdate("customers", custRS.id, {advanceBalance: Math.max(0, (Number(custRS.advanceBalance)||0)-Number(s.advanceApplied||0))}, STATE.customers);
      }
      dbUpdate("sales", s.id, {cancelled:false}, STATE.sales);
      if(s.orderId){
        var ordRR = orderById(s.orderId);
        if(ordRR && !ordRR.cancelled) dbUpdate("orders", ordRR.id, {currentStageIndex:STAGE_DELIVERED_IDX, completed:true, completedAt:new Date().toISOString()}, STATE.orders);
      }
      toast("Сотув тикланди — омбор, касса ва буюртма ҳолати қайта қўлланди");
    };
    if(insufficient.length){
      openConfirm("Омборда етарли эмас","Баъзи маҳсулотлар омборда етарли эмас ("+insufficient.map(function(it){return it.name;}).join(", ")+"). Барибир тиклаб, қолдиқни 0 гача туширайми?", "Ҳа, давом этиш", doRestore, true);
    } else { doRestore(); }
  }

  /* Омборда етарли бўлмаса сотув ТЎХТАТИЛАДИ (2026-10-07 сўровига кўра;
     аввал «барибир давом этиш» таклиф қилинарди). */
  /* Буюртма қаторлари айнан қайси омбордан сотилишини аниқлайди
     (2026-10-19 сўрови). Аввал жорий омбор, сўнгра буюртмада
     кўрсатилган омбор, сўнгра қолдиқ хақиқатан турган биринчи
     омбор текширилади. Шунда хомашё (ёки товар) бошқа омборда
     турган бўлса хам, буюртма Савдода «Омборда етарли эмас»
     деган тўсиққа учрамайди. */
  function saleWarehouseForOrderItems(items, preferredWhId){
    var list = items||[];
    function fits(whId){
      if(!whId) return false;
      var needByItem = {};
      var ok = true;
      list.forEach(function(it){
        var id = it.itemId || ((findItemByExactName(it.product||it.name)||{}).id) || "";
        if(!id) return;
        var need = Number(it.quantity!==undefined ? it.quantity : it.qty)||0;
        needByItem[id] = (needByItem[id]||0) + need;
      });
      Object.keys(needByItem).forEach(function(id){
        if(needByItem[id] > stockQty(id, whId) + 1e-9) ok = false;
      });
      return ok;
    }
    if(fits(preferredWhId)) return preferredWhId;
    var fromLine = "";
    list.some(function(it){ if(it.warehouseId){ fromLine = it.warehouseId; return true; } return false; });
    if(fits(fromLine)) return fromLine;
    var found = "";
    (STATE.warehouses||[]).some(function(w){ if(fits(w.id)){ found = w.id; return true; } return false; });
    if(found) return found;
    return fromLine || preferredWhId || "";
  }
  /* Шу маҳсулот қайси омборларда бор — «Омборда етарли эмас»
     ойнасида йўл кўрсатиш учун (2026-10-19). */
  function warehousesHavingItem(itemId){
    if(!itemId) return [];
    return (STATE.warehouses||[]).map(function(w){
      return {name:w.name, qty:stockQty(itemId, w.id)};
    }).filter(function(x){ return x.qty > 0.0000001; });
  }
  function saleStockShortages(items, warehouseId, oldQtyFor){
    var out = [];
    items.forEach(function(it){
      var id = it.itemId || ((findItemByExactName(it.name||it.product)||{}).id) || "";
      if(!id) return;
      var need = Number(it.qty!==undefined ? it.qty : it.quantity)||0;
      var have = stockQty(id, warehouseId) + (oldQtyFor ? oldQtyFor(id) : 0);
      if(need > have + 1e-9) out.push({name:it.name||it.product||"—", unit:it.unit||"", need:need, have:Math.max(0,have), itemId:id});
    });
    return out;
  }
  function showSaleStockBlock(list, warehouseId){
    var rows = list.map(function(x){
      var other = warehousesHavingItem(x.itemId).filter(function(w){ return w.name!==warehouseName(warehouseId); });
      var whereTxt = other.length ? other.map(function(w){ return esc(w.name)+" ("+fmtNum(w.qty)+" "+esc(x.unit)+")"; }).join(", ") : "—";
      return '<tr><td class="cell-strong">'+esc(x.name)+'</td><td class="num">'+fmtNum(x.need)+' '+esc(x.unit)+'</td><td class="num" style="color:var(--critical);font-weight:700;">'+fmtNum(x.have)+' '+esc(x.unit)+'</td><td class="cell-muted">'+whereTxt+'</td></tr>';
    }).join("");
    var m = openModal("Омборда етарли эмас — сотув қилиб бўлмайди",
      '<p style="font-size:13.5px;color:var(--ink-2);line-height:1.5;margin:0 0 12px;">«'+esc(warehouseName(warehouseId))+'» омборида қуйидаги маҳсулотлар етарли эмас. Миқдорни камайтиринг, бошқа омборни танланг ёки аввал омборга кирим қилинг.</p>'+
      '<div class="table-wrap"><table><thead><tr><th>Маҳсулот</th><th>Керак</th><th>Омборда бор</th><th>Қайси омборда бор</th></tr></thead><tbody>'+rows+'</tbody></table></div>',
      '<button class="btn btn-primary" data-ok>Тушунарли</button>');
    m.querySelector("[data-ok]").addEventListener("click", closeModal);
  }

  function freshSaleRow(){
    return {itemId:"", name:"", unit:"", priceListId:"", qty:0, price:0, lineSubtotal:0, vatRate:VAT_RATE_DEFAULT, vatSum:0, lineTotal:0, totalManual:false, twvManual:false};
  }
  /* 2026-10-03: Янги сотув энди ҳар доим бир буюртмага боғланади (харидор
     сўровига кўра — "Олиб ташлансин": қўлда маҳсулот танлаш усули янги
     сотувлар учун бутунлай олиб ташланди). newStyle:true — шу янги,
     буюртмага боғланган шакл ишлатилади (қаранг: renderSalesNewStyleForm);
     items ҳар доим танланган буюртманинг ўз қаторларидан (orderItemsList)
     АВТОМАТ (фақат кўриш учун) тўлдирилади, қўлда ўзгартирилмайди.
     ЭСКИ (бу қайта қурилишдан олдин яратилган, буюртмасиз) сотувларни
     таҳрирлашда эса (қаранг: openSaleEditForm) newStyle:false бўлган
     бутунлай бошқа чизма (renderSalesLegacyForm) ишлатилади — токи аввал
     киритилган маълумотлар ва уларни таҳрирлаш усули ҳеч қачон
     бузилмасин ("киритилган малумот узгармаслиги керак" талабига кўра). */
  function freshSaleDraft(){
    return {
      editingId:null, newStyle:true, saleNumber:nextSaleNumber(), date:todayISO(),
      customerId:"", customerName:"", contractNumber:"", contractDate:"",
      warehouseId:"", workshopId:"", orderId:"",
      items:[], dueDate:"", note:""
    };
  }
  function saleDraft(){ if(!STATE.saleDraft) STATE.saleDraft = freshSaleDraft(); return STATE.saleDraft; }
  /* "Таҳрирлаш" тугмаси орқали чақирилади. Агар сотув буюртмага боғланган
     бўлса (s.orderId — демак янги, 2026-10-03дан кейинги шаклда
     яратилган) — янги (буюртмага боғланган, ўқиш учун) шакл очилади
     (қаранг: openSaleEditFormNewStyle). Акс ҳолда (эски, буюртмасиз
     сотув) — пастдаги ЭСКИ қўлда-таҳрирлаш шакли ўзгаришсиз ишлатилади —
     токи бу қайта қурилишдан олдин киритилган сотувлар ҳеч қачон
     бузилмасин. */
  function openSaleEditForm(s){
    if(!s) return;
    if(s.orderId) return openSaleEditFormNewStyle(s);
    var items = (s.items||[]).map(function(it){
      var itm = itemById(it.itemId);
      var price = Number(it.price!=null?it.price:it.listPrice)||0;
      var qty = Number(it.qty)||0;
      var lineSubtotal = it.lineSubtotal!=null ? Number(it.lineSubtotal) : qty*price;
      var vatRate = Number(it.vatRate)!=null ? Number(it.vatRate) : VAT_RATE_DEFAULT;
      var vatSum = it.vatSum!=null ? Number(it.vatSum) : lineSubtotal*vatRate/100;
      var lineTotal = it.lineTotal!=null ? Number(it.lineTotal) : lineSubtotal+vatSum;
      var autoSubtotal = qty*price;
      var autoTotal = lineSubtotal+vatSum;
      return {
        itemId: it.itemId||"", name: it.name||(itm?itm.name:"—"), unit: it.unit||(itm?itm.unit:"")||"",
        priceListId: it.priceListId||"", qty: qty, price: price,
        lineSubtotal: lineSubtotal, vatRate: vatRate, vatSum: vatSum, lineTotal: lineTotal,
        totalManual: Math.abs(lineSubtotal-autoSubtotal)>0.01,
        twvManual: Math.abs(lineTotal-autoTotal)>0.01
      };
    });
    if(!items.length) items.push(freshSaleRow());
    STATE.saleDraft = {
      editingId: s.id, newStyle:false, saleNumber: (s.saleNumber!=null?Number(s.saleNumber):nextSaleNumber()), date: s.date||(s.createdAt||"").slice(0,10)||todayISO(),
      customerId: s.customerId||"", customerName: s.customerName||"", contractNumber: s.contractNumber||"", contractDate: s.contractDate||"",
      warehouseId: s.warehouseId||"", orderId: s.orderId||"",
      items: items, paidAmount: Number(s.paidAmount)||0, cashAccountId: "", dueDate: s.dueDate||"", note: s.note||""
    };
    STATE.salesView = "new";
    render();
  }
  /* Буюртмага боғланган (2026-10-03дан кейинги, "янги") сотувни таҳрирлаш —
     асосий майдонлар (харидор/буюртма/омбор/цех/муддат/изоҳ) ўзгартирилиши
     мумкин, лекин маҳсулотлар жадвали ҳамон ўқиш учун (сақланган сотувнинг
     ўзидаги items — буюртманинг ЖОРИЙ ҳолатидан эмас, токи буюртма кейин
     таҳрирланган/ўчирилган бўлса ҳам, бу сотувда киритилган маълумот
     ўзгармасин). Тўланган сумма бу шаклда кўринмайди/ўзгартирилмайди —
     у фақат "Тўлов қабул қилиш" (openDebtPaymentModal) орқали янгиланади,
     шунга кўра бу ерда сақланганда эски paidAmount сақлаб қолинади
     (қаранг: submitSaleNewStyle). */
  function openSaleEditFormNewStyle(s){
    /* Сақланган сотувдаги қаторлар СОТУВ схемасида ётади (name/qty/
       lineSubtotal/lineTotal — қаранг: submitSaleNewStyle, бу схема
       openSaleDetail/printSaleWaybill/cancelSale каби умумий
       функциялар билан мос келади учун ўзгартирилмайди). Бу шакл эса
       (renderSalesNewStyleForm) БУЮРТМА схемасида (product/quantity/
       subtotalAmount/totalAmount — қаранг: orderItemsList) кўрсатади —
       шунга кўра таҳрирлашда қаторлар шу ерда схемалараро ўгирилади. */
    STATE.saleDraft = {
      editingId: s.id, newStyle:true, saleNumber: (s.saleNumber!=null?Number(s.saleNumber):nextSaleNumber()), date: s.date||(s.createdAt||"").slice(0,10)||todayISO(),
      customerId: s.customerId||"", customerName: s.customerName||"", contractNumber: s.contractNumber||"", contractDate: s.contractDate||"",
      warehouseId: s.warehouseId||"", workshopId: s.workshopId||"", orderId: s.orderId||"",
      items: (s.items||[]).map(function(it){
        return {
          itemId: it.itemId||"", product: it.name||"—", unit: it.unit||"",
          quantity: Number(it.qty)||0, price: Number(it.price)||0,
          subtotalAmount: Number(it.lineSubtotal)||0, discountPct: Number(it.discountPct)||0,
          discountAmount: Number(it.discountAmount)||0, totalAmount: Number(it.lineTotal)||0,
          categoryKey: it.categoryKey || dwDefaultKeyForOrderItem({itemId:it.itemId, product:it.name}, s.orderId?orderById(s.orderId):null)
        };
      }),
      dueDate: s.dueDate||"", note: s.note||"",
      paidAmount: Number(s.paidAmount)||0, debtAmount: Number(s.debtAmount)||0
    };
    STATE.salesView = "new";
    render();
  }

  /* ---- сотув қатори ҳисоблаш ёрдамчилари (2026-10-03 қайта қурилди:
     "Скидка %" олиб ташланди; "Жами" ва "Жами ҚҚС билан" энди қўлда ҳам
     ўзгартириш мумкин — totalManual/twvManual белгиси қайси майдон
     қўлда киритилганини эслаб қолади, шунга кўра миқдор/нарх/ҚҚС%
     ўзгарганда фақат АВТОМАТ (белгиланмаган) майдонлар қайта
     ҳисобланади). ---- */
  function r2(n){ return Math.round((Number(n)||0)*100)/100; }
  function saleAutoSubtotal(it){ return r2((Number(it.qty)||0) * (Number(it.price)||0)); }
  function saleAutoVatSum(it){ return r2((Number(it.lineSubtotal)||0) * (Number(it.vatRate)||0) / 100); }
  function saleAutoTotalWithVat(it){ return r2((Number(it.lineSubtotal)||0) + (Number(it.vatSum)||0)); }
  function recalcSaleRow(it){
    if(!it.totalManual) it.lineSubtotal = saleAutoSubtotal(it);
    it.vatSum = saleAutoVatSum(it);
    if(!it.twvManual) it.lineTotal = saleAutoTotalWithVat(it);
  }
  function recalcSaleRowFromSubtotal(it){
    it.vatSum = saleAutoVatSum(it);
    if(!it.twvManual) it.lineTotal = saleAutoTotalWithVat(it);
  }

  /* Савдо қаторида "Маҳсулот" катагини босганда очиладиган танлов ойнаси:
     1-қадам — омборлар рўйхати, 2-қадам — танланган омбордаги сотиладиган
     (тайёр/ярим тайёр) маҳсулотлар рўйхати ва қолдиғи. Танлангач, номи ва
     ўлчов бирлиги (unit) автомат асосий қаторга тушади; танланган омбор
     бутун сотув учун умумий омбор сифатида қўлланади (2026-10-03 Савдо
     формаси қайта қурилиши сўровига кўра). */
  /* Шу омбордаги ўртача кирим нархи: омборга келган суммалар йиғиндиси
     миқдорга бўлинади. Кирим топилмаса — маҳсулотнинг сўнгги кирим
     нархи (items.price) олинади (2026-10-19 сўрови). */
  function warehouseKirimPrice(itemId, whId){
    if(!itemId) return 0;
    try{
      var agg = stockLedgerAggregate(whId||"")[itemId];
      if(agg && agg.kirimQty>0) return agg.kirimSum/agg.kirimQty;
    }catch(e){}
    var it = itemById(itemId);
    return it ? (Number(it.price)||0) : 0;
  }
  /* Шу омбордаги ўртача кирим нархи — ҚҚС БИЛАН (2026-10-19
     сўрови). Кирим ёзувларидаги "Жами (ҚҚС билан)" суммалари
     миқдорга бўлинади; эски ёзувда у сақланмаган бўлса — ҚҚСсиз
     нарх ва ҚҚС фоизидан ҳисобланади. Кирим ёзуви умуман бўлмаса
     (масалан ишлаб чиқаришдан келган тайёр маҳсулот) — олдингидек
     ўртача кирим нархи қайтарилади. */
  function warehouseKirimPriceVat(itemId, whId){
    if(!itemId) return 0;
    var qty = 0, sum = 0;
    (STATE.receipts||[]).forEach(function(r){
      if(r.itemId!==itemId) return;
      if(whId && r.warehouseId!==whId) return;
      var q = Number(r.quantity)||0;
      if(q<=0) return;
      var withVat = Number(r.totalWithVat)||0;
      if(!(withVat>0)){
        var pn = Number(r.priceNoVat)||0;
        var vr = Number(r.vatRate)||0;
        withVat = q*pn*(1+vr/100);
      }
      qty += q; sum += withVat;
    });
    if(qty>0.0000001) return sum/qty;
    return warehouseKirimPrice(itemId, whId);
  }
  function openSaleItemPickerModal(currentWarehouseId, onPicked, onCancel){
    var whId = currentWarehouseId || (STATE.warehouses[0] && STATE.warehouses[0].id) || "";
    /* Фойдаланувчи сўровига кўра (2026-10-19): омбор танланганда АЙНАН
       шу омбордаги маҳсулот ёки хомашё кўрсатилади (қолдиғи бор
       бўлганлар), ҳар бирининг ёнида омбордаги кирим нархи ҳам
       чиқарилади. Галочка олиб ташланса — барча сотувга яроқли
       маҳсулотлар кўринади. */
    var onlyInStock = true;
    var body = '<div class="field"><label>Омбор</label><select id="sip-wh">'+
      STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(whId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+
      '</select></div>'+
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12.5px;font-weight:700;margin-bottom:8px;">'+
        '<input type="checkbox" id="sip-instock" checked style="width:auto;flex-shrink:0;">Фақат шу омбордаги қолдиқлар</label>'+
      personSelectSearchBoxHtml("sip-search")+
      '<div id="sip-list" style="max-height:380px;overflow-y:auto;margin-top:10px;"></div>';
    /* onCancel (ихтиёрий) — Буюртма шаклидаги маҳсулот танлов қатори учун
       берилади: ×/Esc/"Ёпиш" БОСИЛСА БУТУН буюртма ойнаси эмас, фақат шу
       танлов ойнаси ёпилиб, чақирган шаклга ортга қайтилади. */
    var m = openModal("Маҳсулотни танлаш", body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', true, onCancel);
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    function renderList(){
      var listEl = m.querySelector("#sip-list");
      var pool;
      if(onlyInStock){
        pool = STATE.items.filter(function(it){ return stockQty(it.id, whId) > 0.0000001; });
      } else {
        pool = STATE.items.filter(isSaleItem);
      }
      pool = pool.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
      if(!pool.length){
        listEl.innerHTML = emptyState(onlyInStock?"Бу омборда қолдиқ йўқ":"Маҳсулот йўқ",
          onlyInStock?"Бошқа омборни танланг ёки «Фақат шу омбордаги қолдиқлар» белгисини олиб ташланг.":"Аввал маҳсулот яратинг.");
        return;
      }
      listEl.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Маҳсулот</th><th>Тури</th><th>Бирлик</th><th class="num">Қолдиқ</th><th class="num">Кирим нархи (ҚҚС билан)</th></tr></thead><tbody>'+
        pool.map(function(it){
          return '<tr class="sip-row" data-item="'+it.id+'" style="cursor:pointer;">'+
            '<td class="cell-strong">'+esc(it.name)+'</td>'+
            '<td>'+itemTypeChip(it.itemType)+'</td>'+
            '<td class="cell-muted">'+esc(it.unit||"—")+'</td>'+
            '<td class="num">'+fmtNum(stockQty(it.id, whId))+'</td>'+
            '<td class="num cell-muted">'+fmtSum(warehouseKirimPriceVat(it.id, whId))+'</td></tr>';
        }).join("")+'</tbody></table></div>';
      listEl.querySelectorAll(".sip-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var itm = itemById(rowEl.getAttribute("data-item"));
          if(!itm) return;
          closeModal();
          onPicked(whId, itm);
        });
      });
      var q = (m.querySelector("#sip-search").value||"").trim().toLowerCase();
      if(q){
        listEl.querySelectorAll(".sip-row").forEach(function(rowEl){
          rowEl.style.display = (rowEl.textContent||"").toLowerCase().indexOf(q)>-1 ? "" : "none";
        });
      }
    }
    m.querySelector("#sip-wh").addEventListener("change", function(){ whId=this.value; renderList(); });
    m.querySelector("#sip-instock").addEventListener("change", function(){ onlyInStock=this.checked; renderList(); });
    m.querySelector("#sip-search").addEventListener("input", function(){
      var q = this.value.trim().toLowerCase();
      m.querySelectorAll(".sip-row").forEach(function(rowEl){
        rowEl.style.display = (!q || (rowEl.textContent||"").toLowerCase().indexOf(q)>-1) ? "" : "none";
      });
    });
    renderList();
  }

  /* Савдо шаклидаги "+" тугмаси орқали тезкор мижоз қўшиш — фойдаланувчи
     сўровига кўра фақат номи (мажбурий), манзил, ИНН, телефон, шартнома
     рақами ва санаси, изоҳ (барчаси ихтиёрий). Тўлиқ реквизитли мижоз
     шакли («Мижозлар» бўлимидаги openCustomerForm) ўзгаришсиз қолади —
     бу фақат Савдо шаклидаги тезкор қўшиш учун (2026-10-03 сўровига
     кўра). */
  function openSaleCustomerQuickForm(onSaved){
    var body = '<div class="field"><label>Номи</label><input id="scq-name" placeholder="Мижоз номи"></div>'+
      '<div class="field"><label>Манзил <span class="opt">(ихтиёрий)</span></label><input id="scq-address"></div>'+
      '<div class="field-row"><div class="field"><label>ИНН <span class="opt">(ихтиёрий)</span></label><input id="scq-inn"></div>'+
      '<div class="field"><label>Телефон <span class="opt">(ихтиёрий)</span></label><input id="scq-phone"></div></div>'+
      '<div class="field-row"><div class="field"><label>Шартнома рақами <span class="opt">(ихтиёрий)</span></label><input id="scq-contract-num"></div>'+
      '<div class="field"><label>Шартнома санаси <span class="opt">(ихтиёрий)</span></label><input id="scq-contract-date" type="date"></div></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="scq-note"></textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Қўшиш</button>';
    var m = openModal("Янги мижоз", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#scq-name").value.trim();
      if(!name){ toast("Мижоз номини киритинг"); return; }
      var contractNum = m.querySelector("#scq-contract-num").value.trim();
      var contractDate = m.querySelector("#scq-contract-date").value;
      var data = {
        name:name, inn:m.querySelector("#scq-inn").value.trim(), bankAccount:"", bankName:"", mfo:"",
        address:m.querySelector("#scq-address").value.trim(), phone:m.querySelector("#scq-phone").value.trim(),
        contactPerson:"", note:m.querySelector("#scq-note").value.trim(),
        contracts: contractNum ? [{number:contractNum, date:contractDate||""}] : []
      };
      var finish = function(id){
        toast("Мижоз қўшилди");
        closeModal();
        if(onSaved) onSaved(id, name, contractNum, contractDate);
      };
      if(STATE.db){
        var tempId = "_pending_"+uid();
        var optimistic = Object.assign({}, data); optimistic.id=tempId; optimistic._pending=true; optimistic.createdAt=new Date().toISOString();
        STATE.customers.unshift(optimistic);
        finish(tempId);
        col("customers").add(Object.assign({}, data, {createdAt:optimistic.createdAt})).then(function(ref){
          optimistic._pending=false;
          if(ref && ref.id) reconcilePendingId(tempId, ref.id);
        }).catch(function(e){
          var idx=STATE.customers.indexOf(optimistic); if(idx>-1) STATE.customers.splice(idx,1);
          console.error(e); toast("Хатолик: сақланмади"); render();
        });
      } else {
        data.id = uid(); data.createdAt = new Date().toISOString();
        STATE.customers.unshift(data);
        finish(data.id);
      }
    });
  }

  /* Мижоз танлангандан кейин ёнида чиқадиган "Шартнома" майдонидаги "+"
     тугмаси — янги шартнома рақами ва санасини киритиб, шу мижозга
     сақлайди (2026-10-03 сўровига кўра). */
  function openSaleContractAddModal(onSaved){
    var body = '<div class="field"><label>Шартнома рақами</label><input id="sca-num" placeholder="Масалан: 145"></div>'+
      '<div class="field"><label>Шартнома санаси</label><input id="sca-date" type="date" value="'+todayISO()+'"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Янги шартнома", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var num = m.querySelector("#sca-num").value.trim();
      var date = m.querySelector("#sca-date").value;
      if(!num && !date){ toast("Шартнома рақами ёки санасини киритинг"); return; }
      closeModal();
      if(onSaved) onSaved(num, date);
    });
  }

  function renderSaleRowsHtml(){
    var d = saleDraft();
    return d.items.map(function(it,i){
      var stockQtyVal = it.itemId ? stockQty(it.itemId, d.warehouseId) : 0;
      return '<tr data-srow="'+i+'">'+
        '<td class="cell-muted">'+(i+1)+'</td>'+
        '<td><button type="button" class="btn btn-secondary btn-sm" data-pick-item="'+i+'" style="width:100%;justify-content:flex-start;font-weight:600;min-width:160px;">'+(it.name?esc(it.name):'<span class="cell-muted">— Маҳсулотни танланг —</span>')+'</button></td>'+
        '<td class="cell-muted" style="white-space:nowrap;">'+(it.unit?esc(it.unit):"—")+'</td>'+
        '<td class="num cell-muted" data-stock-cell="'+i+'" style="white-space:nowrap;">'+(it.itemId?fmtNum(stockQtyVal):"—")+'</td>'+
        '<td><select data-field="pricelist" data-row="'+i+'" style="min-width:120px;">'+priceListOptionsHtml(it.priceListId)+'</select></td>'+
        '<td><input type="number" min="0" step="any" data-field="qty" data-row="'+i+'" value="'+esc(it.qty)+'" style="width:72px;"></td>'+
        '<td><input type="number" min="0" step="any" data-field="price" data-row="'+i+'" value="'+esc(it.price)+'" style="width:105px;" title="Прайсдан автомат — қўлда ҳам ўзгартириш мумкин"></td>'+
        '<td><input type="number" min="0" step="any" data-field="subtotal" data-row="'+i+'" value="'+esc(r2(it.lineSubtotal))+'" style="width:115px;font-weight:700;" title="Миқдор×Нарх — қўлда ҳам ўзгартириш мумкин"></td>'+
        '<td><input type="number" min="0" max="100" step="any" data-field="vat" data-row="'+i+'" value="'+esc(it.vatRate)+'" style="width:56px;"></td>'+
        '<td class="num cell-muted" data-vatsum-cell="'+i+'">'+fmtSum(it.vatSum)+'</td>'+
        '<td><input type="number" min="0" step="any" data-field="twv" data-row="'+i+'" value="'+esc(r2(it.lineTotal))+'" style="width:120px;font-weight:700;" title="Жами+ҚҚС — қўлда ҳам ўзгартириш мумкин"></td>'+
        '<td><button class="btn btn-ghost btn-icon" data-remove-row="'+i+'">'+ICONS.x+'</button></td>'+
        '</tr>';
    }).join("");
  }
  function recomputeSale(){
    var d = saleDraft();
    var root = document.getElementById("saleMain");
    if(!root) return;
    var subtotal=0, vatTotal=0, total=0;
    d.items.forEach(function(it,i){
      subtotal += Number(it.lineSubtotal)||0;
      vatTotal += Number(it.vatSum)||0;
      total += Number(it.lineTotal)||0;
      var vsCell = root.querySelector('[data-vatsum-cell="'+i+'"]');
      if(vsCell) vsCell.textContent = fmtSum(it.vatSum);
    });
    var paidEl = root.querySelector("#sale-paid");
    var paid = paidEl ? (Number(paidEl.value)||0) : (d.paidAmount||0);
    d.paidAmount = paid;
    var debt = Math.max(0, total-paid);
    var setText=function(id,val){ var e=root.querySelector(id); if(e) e.textContent=val; };
    setText("#sale-sum-subtotal", fmtSum(subtotal));
    setText("#sale-sum-vat", fmtSum(vatTotal));
    setText("#sale-sum-total", fmtSum(total));
    setText("#sale-sum-debt", fmtSum(debt));
    var cashRow = root.querySelector("#sale-cash-row");
    if(cashRow) cashRow.style.display = paid>0 ? "" : "none";
  }

  /* Диспетчер: буюртмага боғланган "янги" шакл (2026-10-03дан кейин
     яратилган/таҳрирланаётган сотувлар) — пастдаги renderSalesNewStyleForm;
     эски (буюртмасиз) сотувни таҳрирлаш эса ўзгаришсиз renderSalesLegacyForm
     орқали ишлайди ("киритилган малумот узгармаслиги керак"). */
  function renderSalesNew(){
    var d0 = saleDraft();
    if(d0.newStyle===false) return renderSalesLegacyForm();
    return renderSalesNewStyleForm();
  }
  function renderSalesLegacyForm(){
    var dEarly = saleDraft();
    setTopbar(dEarly.editingId?"Сотувни таҳрирлаш":"Янги сотув", dEarly.editingId?"Мавжуд сотувни ўзгартириш":"Мижозга маҳсулот сотиш", "");
    var root = document.getElementById("content");
    if(!STATE.warehouses.length){
      root.innerHTML = salesSubnav("new") + emptyState("Аввал омбор яратинг","Сотув учун «Омборлар → Бошқарув» бўлимида омбор яратинг.");
      wireSalesSubnav(root);
      return;
    }
    var d = saleDraft();
    if(!d.warehouseId) d.warehouseId = STATE.warehouses[0].id;
    var customerOptions = STATE.customers.map(function(c){ return '<option value="'+esc(c.name)+'">'; }).join("");
    /* Мижоз/Шартнома/Буюртма блоки — мижоз номи ёзилган/танланган сари
       қайта чизилади (шартномалар рўйхати ва шу мижозга тегишли
       буюртмалар мижозга боғлиқ бўлгани учун). */
    function custBlockHtml(){
      var cust = resolveCustomerByName(d.customerName);
      d.customerId = cust ? cust.id : "";
      var contracts = cust ? customerContracts(cust.id) : [];
      var contractsHtml = '<option value="">— танланмаган —</option>'+contracts.map(function(ct,ci){
        return '<option value="'+ci+'"'+(d.contractNumber===(ct.number||"") && d.contractDate===(ct.date||"")?" selected":"")+'>'+esc(ct.number||"(рақамсиз)")+' — '+(ct.date?fmtDateShort(ct.date):"санасиз")+'</option>';
      }).join("");
      var ordersForCust = cust ? STATE.orders.filter(function(o){
        return !o.completed && !o.cancelled && (o.customer||"").trim().toLowerCase()===cust.name.trim().toLowerCase();
      }).slice().sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");}) : [];
      var ordersHtml = '<option value="">— танланмаган —</option>'+ordersForCust.map(function(o){
        return '<option value="'+o.id+'"'+(d.orderId===o.id?" selected":"")+'>'+esc(o.orderNumber)+' — '+orderProductSummary(o)+'</option>';
      }).join("");
      return (cust ? ('<div class="field"><label>Шартнома <span class="opt">(ихтиёрий)</span></label><div style="display:flex;gap:6px;"><select id="sale-contract-select" style="flex:1;min-width:0;">'+contractsHtml+'</select><button type="button" class="btn btn-secondary btn-icon" id="sale-contract-add" title="Янги шартнома">'+ICONS.plus+'</button></div></div>') : '')+
        '<div class="field"><label>Боғлиқ буюртма <span class="opt">(ихтиёрий)</span></label><select id="sale-order"'+(cust?'':' disabled')+'>'+ordersHtml+'</select>'+
        '<div class="field-hint">'+(cust?'Танланса, сотув сақлангач ушбу буюртма автоматик «Етказилди» босқичига ўтказилади.':'Аввал мижозни танланг — шунда шу мижознинг буюртмалари шу ерда кўринади.')+'</div></div>';
    }
    var html = salesSubnav("new") +
      (d.editingId ? '<div class="banner" style="margin-bottom:14px;">'+ICONS.pencil+'<div class="banner-body"><div class="banner-title">Таҳрирланмоқда</div>Мавжуд сотувни ўзгартиряпсиз.</div><button class="btn btn-secondary btn-sm" id="sale-stop-edit">Тўхтатиш</button></div>' : '')+
      '<div class="card" style="padding:20px 22px;">'+
      '<div class="field-row"><div class="field"><label>Тартиб рақами</label><input id="sale-number" type="number" value="'+esc(d.saleNumber)+'"></div>'+
      '<div class="field"><label>Сана</label><input id="sale-date" type="date" value="'+esc(d.date||todayISO())+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>Мижоз</label><div style="display:flex;gap:6px;"><input id="sale-customer" list="sale-customer-list" placeholder="Мижоз номи" value="'+esc(d.customerName)+'" style="flex:1;min-width:0;"><button type="button" class="btn btn-secondary btn-icon" id="sale-customer-add" title="Янги мижоз қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div><datalist id="sale-customer-list">'+customerOptions+'</datalist></div>'+
      '<div class="field"><label>Омбор (қаердан сотилади)</label><select id="sale-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(d.warehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div></div>'+
      '<div id="sale-cust-block">'+custBlockHtml()+'</div>'+
      '<div class="section-head" style="margin-top:6px;"><h2 style="font-size:13.5px;">Сотиладиган маҳсулотлар</h2><button class="btn btn-secondary btn-sm" id="sale-add-row">'+ICONS.plus+'Қатор қўшиш</button></div>'+
      '<div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>№</th><th>Маҳсулот</th><th>Бирлик</th><th>Омборда</th><th>Прайс</th><th>Миқдор</th><th>Нарх</th><th>Жами</th><th>ҚҚС %</th><th>ҚҚС сумма</th><th>Жами ҚҚС билан</th><th></th></tr></thead><tbody id="saleRowsBody">'+renderSaleRowsHtml()+'</tbody></table></div>'+
      '<div class="field-row"><div class="field"><label>Тўланган сумма (сўм)</label><input id="sale-paid" type="number" min="0" step="any" value="'+esc(d.paidAmount)+'"></div>'+
      '<div class="field"><label>Қарз муддати <span class="opt">(ихтиёрий)</span></label><input id="sale-due" type="date" value="'+esc(d.dueDate||"")+'"></div></div>'+
      '<div class="field" id="sale-cash-row" style="display:none;"><label>Тушган пул қайси кассага?</label><select id="sale-cashaccount"><option value="">— танланмаган —</option>'+STATE.cashAccounts.map(function(a){return '<option value="'+a.id+'"'+(d.cashAccountId===a.id?" selected":"")+'>'+esc(a.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="sale-note">'+esc(d.note||"")+'</textarea></div>'+
      '<div class="card" style="padding:16px 18px;background:var(--surface-2);">'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Жами (ККСсиз)</span><span class="num" id="sale-sum-subtotal">0 сўм</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:10px;"><span>ККС</span><span class="num" id="sale-sum-vat">0 сўм</span></div>'+
        '<div style="border-top:1px solid var(--border-strong);padding-top:10px;display:flex;justify-content:space-between;"><span style="font-weight:800;">ЖАМИ</span><span class="num" id="sale-sum-total" style="font-size:19px;font-weight:700;">0 сўм</span></div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span style="font-weight:700;color:var(--critical);">Қарз</span><span class="num" id="sale-sum-debt" style="font-size:18px;font-weight:800;color:var(--critical);">0 сўм</span></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;"><button class="btn btn-secondary" id="sale-clear">Тозалаш</button><button class="btn btn-primary" id="sale-submit">'+(d.editingId?"Ўзгаришни сақлаш":"Сотувни сақлаш")+'</button></div>'+
      '</div>';
    root.innerHTML = '<div id="saleMain">'+html+'</div>';
    wireSalesSubnav(root);

    var rowsBody = document.getElementById("saleRowsBody");
    var applyPriceListToRow = function(row){
      var it = d.items[row]; if(!it || !it.itemId || !it.priceListId) return;
      var pl = STATE.priceLists.find(function(x){return x.id===it.priceListId;});
      if(!pl) return;
      var entry = (pl.items||[]).find(function(x){return x.itemId===it.itemId;});
      if(!entry) return;
      it.price = Number(entry.price)||0;
    };
    function refreshRowCalc(row){
      var it = d.items[row]; if(!it) return;
      var subEl = rowsBody.querySelector('input[data-field="subtotal"][data-row="'+row+'"]');
      if(subEl && document.activeElement!==subEl) subEl.value = r2(it.lineSubtotal);
      var twvEl = rowsBody.querySelector('input[data-field="twv"][data-row="'+row+'"]');
      if(twvEl && document.activeElement!==twvEl) twvEl.value = r2(it.lineTotal);
      var vsCell = rowsBody.querySelector('[data-vatsum-cell="'+row+'"]');
      if(vsCell) vsCell.textContent = fmtSum(it.vatSum);
    }
    rowsBody.addEventListener("input", function(e){
      var t=e.target, row=Number(t.getAttribute("data-row")), field=t.getAttribute("data-field");
      if(row==null||isNaN(row)||!field) return;
      var it = d.items[row]; if(!it) return;
      if(field==="qty"){ it.qty=Number(t.value)||0; recalcSaleRow(it); refreshRowCalc(row); }
      else if(field==="price"){ it.price=Number(t.value)||0; recalcSaleRow(it); refreshRowCalc(row); }
      else if(field==="subtotal"){ it.lineSubtotal=Number(t.value)||0; it.totalManual=true; recalcSaleRowFromSubtotal(it); refreshRowCalc(row); }
      else if(field==="vat"){ it.vatRate=Number(t.value)||0; recalcSaleRowFromSubtotal(it); refreshRowCalc(row); }
      else if(field==="twv"){ it.lineTotal=Number(t.value)||0; it.twvManual=true; }
      recomputeSale();
    });
    rowsBody.addEventListener("change", function(e){
      var t=e.target, row=Number(t.getAttribute("data-row")), field=t.getAttribute("data-field");
      if(field==="pricelist"){
        if(row==null||isNaN(row)) return;
        var it = d.items[row]; if(!it) return;
        it.priceListId = t.value;
        applyPriceListToRow(row);
        recalcSaleRow(it);
        var priceInput = rowsBody.querySelector('input[data-field="price"][data-row="'+row+'"]');
        if(priceInput) priceInput.value = it.price;
        refreshRowCalc(row);
        recomputeSale();
      }
    });
    rowsBody.addEventListener("click", function(e){
      var pickBtn = e.target.closest("[data-pick-item]");
      if(pickBtn){
        var prow = Number(pickBtn.getAttribute("data-pick-item"));
        openSaleItemPickerModal(d.warehouseId, function(whId, itm){
          var it = d.items[prow]; if(!it) return;
          if(whId && whId!==d.warehouseId){
            d.warehouseId = whId;
            var whSel = document.getElementById("sale-wh");
            if(whSel) whSel.value = whId;
          }
          it.itemId = itm.id; it.name = itm.name; it.unit = itm.unit||"";
          if(it.priceListId) applyPriceListToRow(prow);
          else if(!it.price && Number(itm.salePrice)) it.price = Number(itm.salePrice)||0;
          recalcSaleRow(it);
          rowsBody.innerHTML = renderSaleRowsHtml();
          recomputeSale();
        });
        return;
      }
      var rmBtn = e.target.closest("[data-remove-row]");
      if(rmBtn){
        var rrow = Number(rmBtn.getAttribute("data-remove-row"));
        d.items.splice(rrow,1);
        if(!d.items.length) d.items.push(freshSaleRow());
        rowsBody.innerHTML = renderSaleRowsHtml();
        recomputeSale();
      }
    });
    document.getElementById("sale-add-row").addEventListener("click", function(){
      d.items.push(freshSaleRow());
      rowsBody.innerHTML = renderSaleRowsHtml();
      recomputeSale();
    });
    document.getElementById("sale-number").addEventListener("input", function(){ d.saleNumber=Number(this.value)||0; });
    document.getElementById("sale-date").addEventListener("input", function(){ d.date=this.value; });
    document.getElementById("sale-wh").addEventListener("change", function(){ d.warehouseId=this.value; rowsBody.innerHTML=renderSaleRowsHtml(); recomputeSale(); });
    document.getElementById("sale-paid").addEventListener("input", recomputeSale);
    document.getElementById("sale-due").addEventListener("input", function(){ d.dueDate=this.value; });
    document.getElementById("sale-note").addEventListener("input", function(){ d.note=this.value; });
    var saleCashSel = document.getElementById("sale-cashaccount");
    if(saleCashSel) saleCashSel.addEventListener("change", function(){ d.cashAccountId=this.value; });
    document.getElementById("sale-clear").addEventListener("click", function(){ STATE.saleDraft=freshSaleDraft(); render(); });
    document.getElementById("sale-submit").addEventListener("click", submitSale);
    var saleStopEditBtn = document.getElementById("sale-stop-edit");
    if(saleStopEditBtn) saleStopEditBtn.addEventListener("click", function(){ STATE.saleDraft=freshSaleDraft(); render(); });

    function refreshCustBlock(){
      var block = document.getElementById("sale-cust-block");
      if(block){ block.innerHTML = custBlockHtml(); wireCustBlock(); }
    }
    function wireCustBlock(){
      var contractSel = document.getElementById("sale-contract-select");
      if(contractSel) contractSel.addEventListener("change", function(){
        var cust = resolveCustomerByName(d.customerName);
        var idx = this.value;
        if(idx===""){ d.contractNumber=""; d.contractDate=""; return; }
        var ct = cust ? customerContracts(cust.id)[Number(idx)] : null;
        if(ct){ d.contractNumber=ct.number||""; d.contractDate=ct.date||""; }
      });
      var contractAddBtn = document.getElementById("sale-contract-add");
      if(contractAddBtn) contractAddBtn.addEventListener("click", function(){
        var cust = resolveCustomerByName(d.customerName);
        if(!cust){ toast("Аввал мижозни танланг"); return; }
        openSaleContractAddModal(function(number, date){
          addCustomerContract(cust.id, number, date);
          d.contractNumber = number; d.contractDate = date;
          refreshCustBlock();
        });
      });
      var orderSel = document.getElementById("sale-order");
      if(orderSel) orderSel.addEventListener("change", function(){ d.orderId=this.value; });
    }
    document.getElementById("sale-customer").addEventListener("input", function(){ d.customerName=this.value; });
    document.getElementById("sale-customer").addEventListener("change", function(){ d.customerName=this.value; refreshCustBlock(); });
    var custAddBtn = document.getElementById("sale-customer-add");
    if(custAddBtn) custAddBtn.addEventListener("click", function(){
      openSaleCustomerQuickForm(function(customerId, name, contractNumber, contractDate){
        d.customerName = name||""; d.customerId = customerId||"";
        d.contractNumber = contractNumber||""; d.contractDate = contractDate||"";
        var custInput = document.getElementById("sale-customer");
        if(custInput) custInput.value = d.customerName;
        refreshCustBlock();
      });
    });
    wireCustBlock();
    recomputeSale();
  }

  function submitSale(){
    var d = saleDraft();
    var root = document.getElementById("saleMain");
    var saleNumber = Number(root.querySelector("#sale-number").value)||d.saleNumber||nextSaleNumber();
    var saleDate = root.querySelector("#sale-date").value || todayISO();
    var customerName = root.querySelector("#sale-customer").value.trim();
    var warehouseId = root.querySelector("#sale-wh").value;
    var paidAmount = Number(root.querySelector("#sale-paid").value)||0;
    var dueDate = root.querySelector("#sale-due").value;
    var cashAccountSel = root.querySelector("#sale-cashaccount");
    var cashAccountId = cashAccountSel ? cashAccountSel.value : "";
    var orderSel = root.querySelector("#sale-order");
    var orderId = orderSel ? orderSel.value : "";
    var note = root.querySelector("#sale-note").value.trim();
    var contractNumber = d.contractNumber||"", contractDate = d.contractDate||"";
    var items = d.items.filter(function(it){ return it.itemId && Number(it.qty)>0; }).map(function(it){
      return {
        itemId:it.itemId, name: it.name||(itemById(it.itemId)?itemById(it.itemId).name:"—"), unit: it.unit||"",
        priceListId:it.priceListId||"", qty:Number(it.qty), price:Number(it.price)||0, listPrice:Number(it.price)||0, discountPct:0,
        lineSubtotal:Number(it.lineSubtotal)||0, vatRate:Number(it.vatRate)||0, vatSum:Number(it.vatSum)||0, lineTotal:Number(it.lineTotal)||0
      };
    });
    if(!saleNumber || saleNumber<=0){ toast("Тартиб рақамини киритинг"); return; }
    if(!customerName){ toast("Мижоз номини киритинг"); return; }
    if(!warehouseId){ toast("Омборни танланг"); return; }
    if(!items.length){ toast("Камида битта маҳсулот қатори тўлдиринг"); return; }

    var subtotal = items.reduce(function(s,it){return s+it.lineSubtotal;},0);
    var vatSum = items.reduce(function(s,it){return s+it.vatSum;},0);
    var total = items.reduce(function(s,it){return s+it.lineTotal;},0);
    if(paidAmount>total) paidAmount=total;
    var debtAmount = Math.max(0, total-paidAmount);

    /* Таҳрирлаш режимида (d.editingId) — эски сотувнинг омбор эффектини
       hisobga olib, "етарли эмас" текширувини тўғри ўтказиш учун: шу
       маҳсулот бўйича эски сотувда (АГАР омбор ўзгармаган бўлса) банд
       қилинган миқдорни қайтадан "мавжуд" деб ҳисоблаймиз — худди Лом
       возврат таҳрирлашдаги availableForRow/liveStockForRow каби. */
    var oldSale = d.editingId ? STATE.sales.find(function(x){return x.id===d.editingId;}) : null;
    function oldQtyFor(itemId){
      if(!oldSale || oldSale.warehouseId!==warehouseId) return 0;
      return (oldSale.items||[]).filter(function(x){return x.itemId===itemId;}).reduce(function(s,x){return s+Number(x.qty||0);},0);
    }
    var insufficient = saleStockShortages(items, warehouseId, oldQtyFor);
    if(insufficient.length){ showSaleStockBlock(insufficient, warehouseId); return; }
    var doFinal = function(customerId){
      if(oldSale){
        /* 1) эски сотувнинг омбор эффектини тўлиқ орқага қайтарамиз (эски
           омборга, эски миқдорлар бўйича), сўнгра янги маълумотлар асосида
           янгидан айирамиз — омбор ўзгарган бўлса ҳам тўғри ишлайди. */
        (oldSale.items||[]).forEach(function(it){ if(it.itemId) adjustStockBy(it.itemId, oldSale.warehouseId, it.qty); });
      }
      items.forEach(function(it){ adjustStockBy(it.itemId, warehouseId, -it.qty); });
      var saleData = {
        saleNumber: saleNumber, date: saleDate,
        customerId:customerId||"", customerName:customerName, contractNumber:contractNumber, contractDate:contractDate,
        warehouseId:warehouseId, items:items,
        subtotalNoVat:subtotal, vatSum:vatSum, totalWithVat:total, paidAmount:paidAmount, debtAmount:debtAmount,
        orderId:orderId||"", dueDate:dueDate||"", note:note,
        createdAt: oldSale ? (oldSale.createdAt||new Date().toISOString()) : new Date().toISOString(),
        cancelled: oldSale ? !!oldSale.cancelled : false
      };
      if(orderId){
        var ordForPrev2 = orderById(orderId);
        if(!oldSale) saleData.orderPrev = ordForPrev2 ? {stage:ordForPrev2.currentStageIndex||0, completed:!!ordForPrev2.completed, completedAt:ordForPrev2.completedAt||""} : null;
        else if(oldSale.orderPrev) saleData.orderPrev = oldSale.orderPrev;
        dbUpdate("orders", orderId, {currentStageIndex:STAGE_DELIVERED_IDX, completed:true, completedAt:new Date().toISOString()}, STATE.orders);
      }
      if(oldSale){
        /* Боғлиқ касса ёзуви(лари): эскисини ўчирмасдан БЕКОР ҚИЛАМИЗ (касса
           тарихи йўқолмасин учун), тўланган сумма >0 бўлса — янги ёзув
           яратамиз — худди сотувни бекор қилиш/тиклашдаги мантиқ каби. */
        STATE.cashTransactions.filter(function(t){return t.saleId===oldSale.id && !t.cancelled;}).forEach(function(t){ dbUpdate("cashTransactions", t.id, {cancelled:true}, STATE.cashTransactions); });
        dbUpdate("sales", oldSale.id, saleData, STATE.sales);
        if(paidAmount>0 && cashAccountId) recordCashTx(cashAccountId, "kirim", paidAmount, "sotuv", {saleId:oldSale.id, customerId:customerId||"", description:"Сотув: "+customerName});
      } else if(STATE.db){
        var saleTempId = "_pending_"+uid();
        var saleOptimistic = Object.assign({}, saleData);
        saleOptimistic.id = saleTempId;
        saleOptimistic._pending = true;
        STATE.sales.unshift(saleOptimistic);
        STATE.db.collection("sales").add(saleData).then(function(ref){
          saleOptimistic._pending = false;
          reconcilePendingId(saleTempId, ref.id);
          if(paidAmount>0 && cashAccountId) recordCashTx(cashAccountId, "kirim", paidAmount, "sotuv", {saleId:ref.id, customerId:customerId||"", description:"Сотув: "+customerName});
        }).catch(function(e){
          var idx = STATE.sales.indexOf(saleOptimistic);
          if(idx>-1) STATE.sales.splice(idx,1);
          console.error(e); render();
        });
      } else {
        saleData.id = uid();
        STATE.sales.unshift(saleData);
        if(paidAmount>0 && cashAccountId) recordCashTx(cashAccountId, "kirim", paidAmount, "sotuv", {saleId:saleData.id, customerId:customerId||"", description:"Сотув: "+customerName});
      }
      toast(oldSale ? "Сотув янгиланди — омбор ва касса қайта ҳисобланди" : "Сотув сақланди — омбор янгиланди");
      STATE.saleDraft = freshSaleDraft();
      STATE.salesView = "list";
      render();
    };
    var proceed = function(){
      var existingCustomer = STATE.customers.find(function(c){ return (c.name||"").trim().toLowerCase()===customerName.trim().toLowerCase(); });
      if(existingCustomer){ doFinal(existingCustomer.id); }
      else if(STATE.db){
        var custData = {name:customerName, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:"", createdAt:new Date().toISOString()};
        var custTempId = "_pending_"+uid();
        var custOptimistic = Object.assign({}, custData);
        custOptimistic.id = custTempId;
        custOptimistic._pending = true;
        STATE.customers.unshift(custOptimistic);
        STATE.db.collection("customers").add(custData).then(function(ref){
          custOptimistic._pending = false;
          reconcilePendingId(custTempId, ref.id);
          doFinal(ref.id);
        }).catch(function(e){
          var idx = STATE.customers.indexOf(custOptimistic);
          if(idx>-1) STATE.customers.splice(idx,1);
          console.error(e); doFinal("");
        });
      } else {
        var nc = {id:uid(), name:customerName, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:""};
        STATE.customers.unshift(nc);
        doFinal(nc.id);
      }
    };
    if(insufficient.length){
      openConfirm("Омборда етарли эмас","Баъзи маҳсулотлар омборда етарли эмас ("+insufficient.map(function(it){return it.name;}).join(", ")+"). Барибир давом этиб, қолдиқни 0 гача туширайми?", "Ҳа, давом этиш", proceed, true);
    } else { proceed(); }
  }

  /* ---- Янги сотув шакли (2026-10-03 қайта қурилган, буюртмага боғланган) ----
     Харидор → Буюртма рақами → (автомат, ўқиш учун) буюртма маҳсулотлари
     → Омбор (+ агар "Тайёр маҳсулот омбори" бўлса — Цех) → Қарз муддати
     → Изоҳ → Якуний жамлар → Сақлаш/Бекор қилиш. Қаранг: openSaleEditForm
     (эски сотувлар учун эски шакл ўзгаришсиз қолди), freshSaleDraft. */
  function renderSalesNewStyleForm(){
    var d = saleDraft();
    setTopbar(d.editingId?"Сотувни таҳрирлаш":"Янги сотув", d.editingId?"Мавжуд сотувни ўзгартириш":"Буюртма асосида мижозга маҳсулот сотиш", "");
    var root = document.getElementById("content");
    if(!STATE.warehouses.length){
      root.innerHTML = salesSubnav("new") + emptyState("Аввал омбор яратинг","Сотув учун «Омборлар → Бошқарув» бўлимида омбор яратинг.");
      wireSalesSubnav(root);
      return;
    }
    if(!d.warehouseId) d.warehouseId = STATE.warehouses[0].id;
    var order = d.orderId ? orderById(d.orderId) : null;

    var totals = {subtotal:0, discount:0, total:0};
    d.items.forEach(function(it){ totals.subtotal+=Number(it.subtotalAmount)||0; totals.discount+=Number(it.discountAmount)||0; totals.total+=Number(it.totalAmount)||0; });
    /* Категория (цех) — ҳар бир қатор учун алоҳида: Бошқарув панелида
       даромад шу категорияга қараб цехларга ажратилади (2026-10-06).
       Буюртма танланганда (ва эски сотув таҳрирланганда) қаторларга
       маҳсулот/буюртма бўйича мос цех автоматик тахмин қилиб қўйилади —
       фойдаланувчи ўзгартира олади; тозаланса, сақлашда талаб қилинади. */
    var wh = warehouseById(d.warehouseId);
    var whLabel = wh ? (esc(wh.name)+(d.workshopId?(' — '+esc(workshopName(d.workshopId))):'')) : '<span class="cell-muted">— Омборни танланг —</span>';

    var html = salesSubnav("new") +
      (d.editingId ? '<div class="banner" style="margin-bottom:14px;">'+ICONS.pencil+'<div class="banner-body"><div class="banner-title">Таҳрирланмоқда</div>Мавжуд сотувни ўзгартиряпсиз.</div><button class="btn btn-secondary btn-sm" id="sale-stop-edit">Тўхтатиш</button></div>' : '')+
      '<div class="card" style="padding:20px 22px;">'+
      '<div class="field-row"><div class="field"><label>Тартиб рақами</label><input id="sale-number" type="number" value="'+esc(d.saleNumber)+'"></div>'+
      '<div class="field"><label>Сана</label><input id="sale-date" type="date" value="'+esc(d.date||todayISO())+'"></div></div>'+
      '<div class="field"><label>Харидор</label><button type="button" class="btn btn-secondary" id="sale-customer-pick" style="width:100%;justify-content:flex-start;font-weight:600;">'+(d.customerName?esc(d.customerName):'<span class="cell-muted">— Харидорни танланг —</span>')+'</button></div>'+
      (d.customerId ? ('<div class="field"><label>Буюртма рақами</label><button type="button" class="btn btn-secondary" id="sale-order-pick" style="width:100%;justify-content:flex-start;font-weight:600;">'+(order?esc(order.orderNumber):'<span class="cell-muted">— Буюртмани танланг —</span>')+'</button></div>') : '')+
      (d.orderId ? (
        '<div class="section-head" style="margin-top:10px;"><h2 style="font-size:13.5px;">Буюртмадаги маҳсулотлар</h2></div>'+
        '<div style="margin-bottom:16px;">'+orderLinesViewTable(d.items, {catSelect:true})+'</div>'+
        '<div class="field"><label>Омбор (қаердан сотилади)</label><button type="button" class="btn btn-secondary" id="sale-wh-pick" style="width:100%;justify-content:flex-start;font-weight:600;">'+whLabel+'</button></div>'+
        '<div class="field-row"><div class="field"><label>Қарз муддати <span class="opt">(ихтиёрий)</span></label><input id="sale-due" type="date" value="'+esc(d.dueDate||"")+'"></div></div>'+
        '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="sale-note">'+esc(d.note||"")+'</textarea></div>'+
        '<div class="card" style="padding:16px 18px;background:var(--surface-2);">'+
          '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Жами нархи</span><span class="num">'+fmtSum(totals.subtotal)+'</span></div>'+
          '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Чегирма суммаси</span><span class="num">'+fmtSum(totals.discount)+'</span></div>'+
          '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:10px;"><span>Шундан ҚҚС</span><span class="num">'+fmtSum(d.items.reduce(function(a,x){ return a+(Number(orderLineVat(x).vatAmount)||0); },0))+'</span></div>'+
          '<div style="border-top:1px solid var(--border-strong);padding-top:10px;display:flex;justify-content:space-between;"><span style="font-weight:800;">ЯКУНИЙ ЖАМИ СУММА</span><span class="num" style="font-size:19px;font-weight:700;">'+fmtSum(totals.total)+'</span></div>'+
        '</div>'+
        '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;"><button class="btn btn-secondary" id="sale-cancel-btn">Бекор қилиш</button><button class="btn btn-primary" id="sale-submit">'+(d.editingId?"Ўзгаришни сақлаш":"Сотувни сақлаш")+'</button></div>'
      ) : '<div class="field-hint" style="margin-top:4px;">Аввал харидор ва буюртмани танланг — шунда маҳсулотлар, омбор ва якуний сумма шу ерда кўринади.</div>')+
      '</div>';
    root.innerHTML = '<div id="saleMain">'+html+'</div>';
    wireSalesSubnav(root);

    document.getElementById("sale-number").addEventListener("input", function(){ d.saleNumber=Number(this.value)||0; });
    document.getElementById("sale-date").addEventListener("input", function(){ d.date=this.value; });

    document.getElementById("sale-customer-pick").addEventListener("click", function(){
      openOrderCustomerPickerModal(function(cust){
        if(d.customerId!==cust.id){
          /* Харидор ўзгарса, аввалги буюртма/маҳсулотлар энди шу харидорга
             тегишли бўлмай қолади — тозаланади (2026-10-03 сўровига кўра,
             ҳар бир сотув албатта бир буюртмага боғланиши керак). */
          d.customerId=cust.id; d.customerName=cust.name; d.orderId=""; d.items=[];
        }
        render();
      });
    });

    var orderPickBtn = document.getElementById("sale-order-pick");
    if(orderPickBtn) orderPickBtn.addEventListener("click", function(){
      openSaleOrderPickerModal(d.customerId, function(o){
        d.orderId = o.id;
        d.items = orderItemsList(o).map(function(it){ var c=Object.assign({}, it); c.categoryKey = (c.categoryKey && dwOf(c.categoryKey)) ? c.categoryKey : dwDefaultKeyForOrderItem(c, o); return c; });
        /* Буюртма қайси омбордан қилинган бўлса — сотув ҳам шу
           омбордан бошланади (2026-10-19 сўрови: хомашё учун
           буюртма Савдода ҳам кўринсин ва сотиб бўлсин). Фойдаланувчи
           кейин қўлда бошқа омборни танлай олади. */
        var autoWh = saleWarehouseForOrderItems(d.items, d.warehouseId);
        if(autoWh && autoWh!==d.warehouseId){
          d.warehouseId = autoWh;
          var aw = warehouseById(autoWh);
          if(!(aw && aw.isFinishedGoods)) d.workshopId = "";
        }
        render();
      });
    });

    var whPickBtn = document.getElementById("sale-wh-pick");
    if(whPickBtn) whPickBtn.addEventListener("click", function(){
      openSaleWarehousePickerModal(d.warehouseId, function(w, ws){
        d.warehouseId = w.id;
        d.workshopId = ws ? ws.id : "";
        render();
      });
    });

    var dueEl = document.getElementById("sale-due");
    if(dueEl) dueEl.addEventListener("input", function(){ d.dueDate=this.value; });
    var noteEl = document.getElementById("sale-note");
    if(noteEl) noteEl.addEventListener("input", function(){ d.note=this.value; });
    root.querySelectorAll("[data-sale-cat]").forEach(function(sel){
      sel.addEventListener("change", function(){
        var row = d.items[Number(sel.getAttribute("data-sale-cat"))];
        if(row) row.categoryKey = sel.value;
        sel.style.borderColor = sel.value ? "" : "var(--critical)";
      });
    });

    var submitBtn = document.getElementById("sale-submit");
    if(submitBtn) submitBtn.addEventListener("click", submitSaleNewStyle);
    var cancelBtn = document.getElementById("sale-cancel-btn");
    if(cancelBtn) cancelBtn.addEventListener("click", function(){ STATE.saleDraft=freshSaleDraft(); STATE.salesView="list"; render(); });
    var saleStopEditBtn = document.getElementById("sale-stop-edit");
    if(saleStopEditBtn) saleStopEditBtn.addEventListener("click", function(){ STATE.saleDraft=freshSaleDraft(); STATE.salesView="list"; render(); });
  }

  /* Буюртмага боғланган "янги" сотувни сақлаш. Тўланган сумма бу ерда
     киритилмайди/ўзгартирилмайди — яратишда ҳар доим 0дан бошланади,
     таҳрирлашда эса (oldSale орқали) ЭСКИ paidAmount сақлаб қолинади
     (чунки тўловлар фақат openDebtPaymentModal орқали қабул қилинади,
     2026-10-03 сўровига кўра "Тўланган сумма" майдони олиб ташланди). */
  function submitSaleNewStyle(){
    var d = saleDraft();
    var root = document.getElementById("saleMain");
    var saleNumber = Number(root.querySelector("#sale-number").value)||d.saleNumber||nextSaleNumber();
    var saleDate = root.querySelector("#sale-date").value || todayISO();
    var dueEl = root.querySelector("#sale-due");
    var dueDate = dueEl ? dueEl.value : (d.dueDate||"");
    var noteEl = root.querySelector("#sale-note");
    var note = noteEl ? noteEl.value.trim() : (d.note||"");

    if(!saleNumber || saleNumber<=0){ toast("Тартиб рақамини киритинг"); return; }
    if(!d.customerId){ toast("Харидорни танланг"); return; }
    if(!d.orderId){ toast("Буюртмани танланг"); return; }
    if(!d.warehouseId){ toast("Омборни танланг"); return; }
    if(!d.items.length){ toast("Танланган буюртмада маҳсулот топилмади"); return; }
    if(d.items.some(function(it){ return !it.categoryKey; })){ toast("Ҳар бир маҳсулот учун категорияни (цехни) танланг"); return; }

    var items = d.items.map(function(it){
      return {
        itemId:it.itemId||"", name:it.product||it.name||"—", unit:it.unit||"",
        qty:Number(it.quantity)||0, price:Number(it.price)||0, listPrice:Number(it.price)||0,
        lineSubtotal:Number(it.subtotalAmount)||0, discountPct:Number(it.discountPct)||0,
        discountAmount:Number(it.discountAmount)||0, lineTotal:Number(it.totalAmount)||0,
        /* Буюртма қаторидаги «ҚҚСсиз сумма (сўм)» ва «ҚҚС суммаси» —
           ҳисоботда айнан шу қиймат ишлатилиши учун сақлаб қўйилади
           (2026-10-16). Мавжуд vatRate/vatSum майдонлари ўзгаришсиз
           қолдирилди, токи эски ҳисоб-китоблар бузилмасин. */
        noVatAmount:Number(it.noVatAmount)||0, noVatRate:orderVatRateOf(it), noVatTax:Number(it.vatAmount)||0,
        vatRate:0, vatSum:0, categoryKey:it.categoryKey||""
      };
    });
    var subtotal = items.reduce(function(s,it){return s+it.lineSubtotal;},0);
    var discountTotal = items.reduce(function(s,it){return s+it.discountAmount;},0);
    var total = items.reduce(function(s,it){return s+it.lineTotal;},0);

    var oldSale = d.editingId ? STATE.sales.find(function(x){return x.id===d.editingId;}) : null;
    /* Янги сотув яратилаётганда (таҳрирлашда ЭМАС) — мижознинг олдин
       ортиқча тўлаб қолдирган "бўнак" (advanceBalance) борлигини текшириб,
       шунча қисмини автоматик ҳисобга оламиз: тўлиқ қопласа "Тўланди",
       қисман қопласа "Қисман қарздор" (қолган қарз билан), бўнак йўқ бўлса
       одатдагидай "Қарздор" бўлиб қолади. */
    var advanceCustomer = (!oldSale) ? customerById(d.customerId) : null;
    var advanceAvail = advanceCustomer ? Math.max(0, Number(advanceCustomer.advanceBalance)||0) : 0;
    var advanceApplied = Math.min(advanceAvail, total);
    var paidAmount = oldSale ? Math.min(Number(oldSale.paidAmount)||0, total) : advanceApplied;
    var debtAmount = Math.max(0, total-paidAmount);

    function oldQtyFor(itemId){
      if(!oldSale || oldSale.warehouseId!==d.warehouseId) return 0;
      return (oldSale.items||[]).filter(function(x){return x.itemId===itemId;}).reduce(function(s,x){return s+Number(x.qty||0);},0);
    }
    var insufficient = saleStockShortages(items, d.warehouseId, oldQtyFor);
    if(insufficient.length){ showSaleStockBlock(insufficient, d.warehouseId); return; }

    var doFinal = function(){
      if(oldSale){
        (oldSale.items||[]).forEach(function(it){ if(it.itemId) adjustStockBy(it.itemId, oldSale.warehouseId, it.qty); });
      }
      items.forEach(function(it){ if(it.itemId) adjustStockBy(it.itemId, d.warehouseId, -it.qty); });
      var saleData = {
        saleNumber:saleNumber, date:saleDate,
        customerId:d.customerId, customerName:d.customerName, contractNumber:d.contractNumber||"", contractDate:d.contractDate||"",
        warehouseId:d.warehouseId, workshopId:d.workshopId||"", items:items,
        subtotalNoVat:subtotal, vatSum:0, discountAmount:discountTotal, totalWithVat:total,
        paidAmount:paidAmount, debtAmount:debtAmount,
        advanceApplied: oldSale ? (Number(oldSale.advanceApplied)||0) : advanceApplied,
        orderId:d.orderId, dueDate:dueDate||"", note:note,
        createdAt: oldSale ? (oldSale.createdAt||new Date().toISOString()) : new Date().toISOString(),
        cancelled: oldSale ? !!oldSale.cancelled : false
      };
      if(!oldSale && advanceApplied>0 && advanceCustomer){
        dbUpdate("customers", advanceCustomer.id, {advanceBalance: Math.max(0, (Number(advanceCustomer.advanceBalance)||0)-advanceApplied)}, STATE.customers);
      }
      /* Буюртманинг сотувдан ОЛДИНГИ ҳолати сақланади — сотув бекор
         қилинса буюртма шу ҳолатга қайтарилади (2026-10-07). */
      var ordForPrev = orderById(d.orderId);
      saleData.orderPrev = oldSale ? (oldSale.orderPrev || null)
        : (ordForPrev ? {stage:ordForPrev.currentStageIndex||0, completed:!!ordForPrev.completed, completedAt:ordForPrev.completedAt||""} : null);
      if(oldSale && !saleData.orderPrev) delete saleData.orderPrev;
      dbUpdate("orders", d.orderId, {currentStageIndex:STAGE_DELIVERED_IDX, completed:true, completedAt:new Date().toISOString()}, STATE.orders);
      if(oldSale){
        dbUpdate("sales", oldSale.id, saleData, STATE.sales);
      } else if(STATE.db){
        var tempId = "_pending_"+uid();
        var optimistic = Object.assign({}, saleData);
        optimistic.id = tempId; optimistic._pending = true;
        STATE.sales.unshift(optimistic);
        STATE.db.collection("sales").add(saleData).then(function(ref){
          optimistic._pending = false;
          reconcilePendingId(tempId, ref.id);
        }).catch(function(e){
          var idx = STATE.sales.indexOf(optimistic);
          if(idx>-1) STATE.sales.splice(idx,1);
          console.error(e); render();
        });
      } else {
        saleData.id = uid();
        STATE.sales.unshift(saleData);
      }
      toast(oldSale ? "Сотув янгиланди — омбор қайта ҳисобланди" : "Сотув сақланди — омбор янгиланди");
      STATE.saleDraft = freshSaleDraft();
      STATE.salesView = "list";
      render();
    };
    if(insufficient.length){
      openConfirm("Омборда етарли эмас","Баъзи маҳсулотлар омборда етарли эмас ("+insufficient.map(function(it){return it.name;}).join(", ")+"). Барибир давом этиб, қолдиқни 0 гача туширайми?", "Ҳа, давом этиш", doFinal, true);
    } else { doFinal(); }
  }

  function renderCustomers(){
    setTopbar("Мижозлар", STATE.customers.length+" та мижоз", '<button class="btn btn-primary" id="addCustomerBtn">'+ICONS.plus+'Мижоз қўшиш</button>');
    var root = document.getElementById("content");
    var list = STATE.customers.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    var html = salesSubnav("customers");
    if(!list.length){
      html += emptyState("Мижозлар йўқ","Сотув киритилганда мижоз автоматик қўшилади, ёки юқоридаги тугма орқали қўшинг.");
    } else {
      var rows = list.map(function(c){
        var debt = customerDebt(c.id), overdue = customerOverdueDebt(c.id);
        var advBal = Math.max(customerAdvanceLive(c.id), Number(c.advanceBalance)||0);
        var chip = overdue>0 ? '<span class="chip chip-critical">'+ICONS.alert+'Муддати ўтган: '+fmtSum(overdue)+'</span>' : (debt>0 ? '<span class="chip chip-warning">Қарздор</span>' : '<span class="chip chip-good">Қарзи йўқ</span>');
        if(advBal>0) chip += ' <span class="chip chip-good" title="Ортиқча тўланган — кейинги сотувга автоматик ҳисобга олинади">Бўнак: '+fmtSum(advBal)+'</span>';
        return '<tr>'+
          '<td class="cell-strong">'+esc(c.name)+'</td>'+
          '<td class="cell-muted">'+esc(c.phone||"—")+'</td>'+
          '<td class="num cell-strong">'+fmtSum(debt)+'</td>'+
          '<td>'+chip+'</td>'+
          '<td><div class="row-actions">'+
            (debt>0?'<button class="btn btn-ghost btn-icon" data-pay="'+c.id+'" title="Тўлов қабул қилиш">'+ICONS.check+'</button>':'')+
            '<button class="btn btn-ghost btn-icon" data-edit-cust="'+c.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-del-cust="'+c.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
          '</div></td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Мижоз</th><th>Телефон</th><th>Жами қарз</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSalesSubnav(root);
    document.getElementById("addCustomerBtn").addEventListener("click", function(){ openCustomerForm(null); });
    root.querySelectorAll("[data-pay]").forEach(function(b){ b.addEventListener("click", function(){ openDebtPaymentModal(customerById(b.getAttribute("data-pay"))); }); });
    root.querySelectorAll("[data-edit-cust]").forEach(function(b){ b.addEventListener("click", function(){ openCustomerForm(customerById(b.getAttribute("data-edit-cust"))); }); });
    root.querySelectorAll("[data-del-cust]").forEach(function(b){ b.addEventListener("click", function(){
      var c = customerById(b.getAttribute("data-del-cust"));
      openConfirm("Мижозни ўчириш","«"+c.name+"» ўчирилсинми? Унинг сотув тарихи сақланиб қолади.","Ҳа, ўчириш", function(){ dbDelete("customers", c.id, STATE.customers); toast("Ўчирилди"); }, true);
    }); });
  }

  function openCustomerForm(existing, onSaved, onCancel){
    var isEdit = !!existing;
    var c = existing || {name:"", inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:""};
    var body = '<div class="field"><label>Номи</label><input id="cu-name" placeholder="Мижоз номи" value="'+esc(c.name)+'"></div>'+
      '<div class="field-row"><div class="field"><label>СТИР (ИНН) <span class="opt">(ихтиёрий)</span></label><input id="cu-inn" value="'+esc(c.inn||"")+'"></div>'+
      '<div class="field"><label>МФО <span class="opt">(ихтиёрий)</span></label><input id="cu-mfo" value="'+esc(c.mfo||"")+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>Ҳисоб рақами <span class="opt">(ихтиёрий)</span></label><input id="cu-account" value="'+esc(c.bankAccount||"")+'"></div>'+
      '<div class="field"><label>Банк номи <span class="opt">(ихтиёрий)</span></label><input id="cu-bank" value="'+esc(c.bankName||"")+'"></div></div>'+
      '<div class="field-row"><div class="field"><label>Телефон <span class="opt">(ихтиёрий)</span></label><input id="cu-phone" value="'+esc(c.phone||"")+'"></div>'+
      '<div class="field"><label>Масъул шахс <span class="opt">(ихтиёрий)</span></label><input id="cu-contact" value="'+esc(c.contactPerson||"")+'"></div></div>'+
      '<div class="field"><label>Манзил <span class="opt">(ихтиёрий)</span></label><input id="cu-address" value="'+esc(c.address||"")+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="cu-note">'+esc(c.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Қўшиш")+'</button>';
    var m = openModal(isEdit?"Мижозни таҳрирлаш":"Янги мижоз", body, foot, true);
    /* onCancel — қаранг: openSupplierForm'даги худди шундай изоҳ. */
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#cu-name").value.trim();
      if(!name){ toast("Номини киритинг"); return; }
      var data = {
        name:name, inn:m.querySelector("#cu-inn").value.trim(), mfo:m.querySelector("#cu-mfo").value.trim(),
        bankAccount:m.querySelector("#cu-account").value.trim(), bankName:m.querySelector("#cu-bank").value.trim(),
        phone:m.querySelector("#cu-phone").value.trim(), contactPerson:m.querySelector("#cu-contact").value.trim(),
        address:m.querySelector("#cu-address").value.trim(), note:m.querySelector("#cu-note").value.trim()
      };
      if(isEdit){
        dbUpdate("customers", c.id, data, STATE.customers);
        toast("Сақланди");
        closeModal();
        if(onSaved) onSaved(c.id, data.name);
      } else if(STATE.db){
        var tempId = "_pending_"+uid();
        var optimistic = Object.assign({}, data); optimistic.id=tempId; optimistic._pending=true; optimistic.createdAt=new Date().toISOString();
        STATE.customers.unshift(optimistic);
        render();
        toast("Сақланди");
        closeModal();
        /* fire onSaved synchronously (by name) rather than waiting on the
           network round-trip — the sale/receipt forms resolve counterparties
           by name at submit time, so the real server id isn't needed yet,
           and waiting would leave whatever form opened this modal frozen. */
        if(onSaved) onSaved(tempId, data.name);
        col("customers").add(Object.assign({}, data, {createdAt:optimistic.createdAt})).then(function(ref){
          optimistic._pending=false;
          if(ref && ref.id) reconcilePendingId(tempId, ref.id);
        }).catch(function(e){
          var idx=STATE.customers.indexOf(optimistic); if(idx>-1) STATE.customers.splice(idx,1);
          console.error(e); toast("Хатолик: сақланмади"); render();
        });
      } else {
        data.id = uid(); data.createdAt = new Date().toISOString();
        STATE.customers.unshift(data);
        toast("Сақланди");
        closeModal();
        if(onSaved) onSaved(data.id, data.name);
      }
    });
  }

  /* Мижоз қарзини ФИФО тартибида (энг аввал яратилган, ҳали тўланмаган
     сотувдан бошлаб, кейингисига ошиб тушган қолдиғи билан) қоплаш —
     2026-10-03 сўровига кўра: "Тўлов қабул қилиш" (Мижозлар бўйича,
     пастда) ва Касса ичидаги умумий "Кирим" (openKassaLedgerForm, мижоз
     танланганда) ИККИСИ ҳам шу бир хил функциядан фойдаланади, натижа
     ҳар икки жойда бир хил бўлиши учун. Қайтарган массив — қайси
     сотувга қанча сумма қўлланганини сақлайди (кейинчалик ёзувни бекор
     қилиш/таҳрирлаш/тиклашда АНИҒ орқага қайтариш учун). */
  function applyCustomerDebtPayment(customerId, amount){
    var allocations = [];
    var remaining = Number(amount)||0;
    if(remaining<=0 || !customerId) return allocations;
    var unpaidSales = STATE.sales.filter(function(s){return s.customerId===customerId && !s.cancelled && Number(s.debtAmount||0)>0;}).sort(function(a,b){return (a.createdAt||"").localeCompare(b.createdAt||"");});
    unpaidSales.forEach(function(s){
      if(remaining<=0) return;
      var owed = Number(s.debtAmount||0);
      var apply = Math.min(owed, remaining);
      if(apply<=0) return;
      dbUpdate("sales", s.id, {debtAmount:owed-apply, paidAmount:Number(s.paidAmount||0)+apply}, STATE.sales);
      allocations.push({saleId:s.id, amount:apply});
      remaining -= apply;
    });
    /* Қолган (ортиқча) сумма — мижознинг барча қарзидан ошиб кетган қисми —
       йўқотилмайди, балки мижознинг "бўнак" (advanceBalance) ҳисобига
       қўшилади, кейинги янги сотувда автоматик ҳисобга олиниши учун. Бу ҳам
       allocations'га {advance:true,...} сифатида қайд этилади — кейинчалик
       АНИҒ орқага қайтариш/қайта қўллаш учун. */
    if(remaining>0){
      var custAdv = customerById(customerId);
      if(custAdv){
        dbUpdate("customers", custAdv.id, {advanceBalance: Math.max(0, Number(custAdv.advanceBalance)||0)+remaining}, STATE.customers);
        allocations.push({advance:true, customerId:customerId, amount:remaining});
      }
    }
    return allocations;
  }
  /* Юқоридаги функция орқали қўлланган тўловни АНИҒ орқага қайтариш —
     бекор қилиш (cancel) ёки таҳрирлашдан олдин эски қийматни олиб
     ташлаш учун (ҳар доим сақланган allocations'даги худди шу
     сумма билан, бошқа сотувларга тегмасдан). */
  function reverseCustomerDebtPayment(allocations){
    (allocations||[]).forEach(function(a){
      var amt = Number(a.amount)||0;
      if(amt<=0) return;
      if(a.advance){
        var custR = customerById(a.customerId);
        if(custR) dbUpdate("customers", custR.id, {advanceBalance: Math.max(0, (Number(custR.advanceBalance)||0)-amt)}, STATE.customers);
        return;
      }
      var s = STATE.sales.find(function(x){return x.id===a.saleId;});
      if(!s) return;
      dbUpdate("sales", s.id, {debtAmount:Number(s.debtAmount||0)+amt, paidAmount:Math.max(0, Number(s.paidAmount||0)-amt)}, STATE.sales);
    });
  }
  /* reverseCustomerDebtPayment'нинг тескариси — тиклаш (restore) учун:
     сақланган allocations'даги худди шу суммаларни яна қўллайди (янги
     ФИФО ҳисоблаш ЭМАС — шунда бошқа тўловлар орасида ўзгариш бўлган
     бўлса ҳам, аниқ ўша ҳолат қайтарилади). */
  function reapplyCustomerDebtPayment(allocations){
    (allocations||[]).forEach(function(a){
      var amt = Number(a.amount)||0;
      if(amt<=0) return;
      if(a.advance){
        var custP = customerById(a.customerId);
        if(custP) dbUpdate("customers", custP.id, {advanceBalance: (Number(custP.advanceBalance)||0)+amt}, STATE.customers);
        return;
      }
      var s = STATE.sales.find(function(x){return x.id===a.saleId;});
      if(!s) return;
      dbUpdate("sales", s.id, {debtAmount:Math.max(0, Number(s.debtAmount||0)-amt), paidAmount:Number(s.paidAmount||0)+amt}, STATE.sales);
    });
  }

  function openDebtPaymentModal(customer){
    if(!customer) return;
    var debt = customerDebt(customer.id);
    var body = '<div class="field"><label>Жами қарз</label><div class="num" style="font-size:20px;font-weight:700;color:var(--critical);">'+fmtSum(debt)+'</div></div>'+
      '<div class="field"><label>Тўлов суммаси</label><input id="pay-amount" type="number" min="0" step="any" value="'+debt+'"></div>'+
      '<div class="field"><label>Қайси кассага</label><select id="pay-account">'+(STATE.cashAccounts.length?STATE.cashAccounts.map(function(a){return '<option value="'+a.id+'">'+esc(a.name)+'</option>';}).join(""):'<option value="">Аввал касса яратинг</option>')+'</select></div>'+
      '<div class="field"><label>Сана</label><input id="pay-date" type="date" value="'+todayISO()+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><input id="pay-note"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Тўловни сақлаш</button>';
    var m = openModal("Тўлов қабул қилиш — "+esc(customer.name), body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var amount = Number(m.querySelector("#pay-amount").value)||0;
      var accountId = m.querySelector("#pay-account").value;
      var date = m.querySelector("#pay-date").value||todayISO();
      var note = m.querySelector("#pay-note").value.trim();
      if(amount<=0){ toast("Суммани киритинг"); return; }
      if(!accountId){ toast("Кассани танланг"); return; }
      var allocations = applyCustomerDebtPayment(customer.id, amount);
      recordCashTx(accountId, "kirim", amount, "qarz_tolovi", {customerId:customer.id, description:"Қарз тўлови: "+customer.name});
      dbAdd("debtPayments", {customerId:customer.id, customerName:customer.name, amount:amount, cashAccountId:accountId, date:date, note:note, debtAllocations:allocations, createdAt:new Date().toISOString()}, STATE.debtPayments);
      toast("Тўлов қабул қилинди");
      closeModal();
    });
  }

  function openSaleDetail(s){
    if(!s) return;
    var rows = (s.items||[]).map(function(it){
      return '<tr><td>'+esc(it.name)+'</td><td class="num">'+fmtNum(it.qty)+'</td><td class="num">'+(it.listPrice?fmtSum(it.listPrice):"—")+'</td><td class="num">'+(Number(it.discountPct)||0)+'%</td><td class="num">'+fmtSum(it.price)+'</td><td class="num">'+it.vatRate+'%</td><td class="num cell-strong">'+fmtSum(it.lineTotal)+'</td></tr>';
    }).join("");
    var body = '<div class="detail-grid">'+
      (s.saleNumber!=null?('<div><div class="dl">Тартиб рақами</div><div class="dd">№'+esc(s.saleNumber)+'</div></div>'):'')+
      '<div><div class="dl">Мижоз</div><div class="dd">'+esc(s.customerName)+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDate(s.date||(s.createdAt||"").slice(0,10))+'</div></div>'+
      '<div><div class="dl">Омбор</div><div class="dd">'+esc(warehouseName(s.warehouseId))+'</div></div>'+
      (s.contractNumber||s.contractDate?('<div><div class="dl">Шартнома</div><div class="dd">'+esc(s.contractNumber||"—")+(s.contractDate?(" — "+fmtDateShort(s.contractDate)):"")+'</div></div>'):'')+
      '<div><div class="dl">Қарз муддати</div><div class="dd">'+(s.dueDate?fmtDateShort(s.dueDate):"—")+'</div></div>'+
      '<div><div class="dl">Ҳолат</div><div class="dd">'+(s.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Амалда</span>')+'</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>Маҳсулот</th><th>Миқдор</th><th>Прайс</th><th>Скидка</th><th>Нархи</th><th>ККС</th><th>Қиймати</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div class="card" style="padding:16px 18px;">'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Жами (ККСсиз)</span><span class="num">'+fmtSum(s.subtotalNoVat)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:10px;"><span>ККС</span><span class="num">'+fmtSum(s.vatSum)+'</span></div>'+
        '<div style="border-top:1px solid var(--border);padding-top:10px;display:flex;justify-content:space-between;"><span style="font-weight:800;">ЖАМИ</span><span class="num" style="font-size:18px;font-weight:700;">'+fmtSum(s.totalWithVat)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span>Тўланган</span><span class="num">'+fmtSum(salePayInfo(s).paid)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span style="font-weight:700;color:var(--critical);">Қарз</span><span class="num" style="font-weight:800;color:var(--critical);">'+fmtSum(salePayInfo(s).remaining)+'</span></div>'+
        (salePayInfo(s).over>0.009?'<div style="display:flex;justify-content:space-between;margin-top:4px;"><span style="font-weight:700;color:var(--accent);">Ортиқча тўланди</span><span class="num" style="font-weight:800;color:var(--accent);">'+fmtSum(salePayInfo(s).over)+'</span></div>':'')+
        '<div style="display:flex;justify-content:space-between;margin-top:8px;border-top:1px solid var(--border);padding-top:8px;"><span>Тўлов ҳолати</span><span class="chip '+saleStatusInfo(s).chip+'">'+esc(saleStatusInfo(s).label)+'</span></div>'+
      '</div>'+
      (s.note?'<div class="field" style="margin-top:14px;"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(s.note)+'</div></div>':'');
    var foot = '<button class="btn btn-secondary" data-close4>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print title="Юк хати — чоп этиш">'+ICONS.printer+'</button>';
    var m = openModal(esc(s.customerName), body, foot, true);
    m.querySelector("[data-close4]").addEventListener("click", closeModal);
    m.querySelector("[data-print]").addEventListener("click", function(){ printSaleWaybill(s); });
  }

  /* "Юк хати" — расмдаги намунага мос ҳолда чоп этиш ҳужжати: сарлавҳа ва
     сана қаторлари қўлда тўлдириш учун бўш чизиқ сифатида қолдирилади
     (фойдаланувчи аниқ шуни сўради — фақат "Кимга" майдони мижоз номи
     билан АВТОМАТ тўлдирилиши керак), маҳсулотлар жадвали эса ушбу
     сотувнинг ҳақиқий таркиби (номи, ўлчов бирлиги — itemById орқали,
     миқдори) асосида шаклланади. */
  /* 2026-10-03 сўровига кўра: Сотув юк хати расмдаги андоза (шаблон)
     бўйича қайта қурилди — Юк хати рақами ва санаси автоматик (сотув
     тартиб рақами/санаси орқали) тўлдирилади, Етказиб берувчи (бизнинг
     компания) маълумотлари доимий/қотирилган, Харидор маълумотлари эса
     танланган мижоз карточкасидан (Манзил/ИНН/Телефон) автоматик олинади
     — Манзил ва ИНН киритилмаган бўлса очиқ (бўш) қолади, Телефон рақами
     эса киритилмаган бўлса умуман кўрсатилмайди. Жадвалда нарх/сумма
     устунлари йўқ — фақат №, Маҳсулот номи, Ўлчов бирлиги, Миқдори
     (расмдаги каби). Бир варақга сиғиши учун voucherShell'нинг қўшимча
     сарлавҳа/изоҳ қатламисиз, тўғридан-тўғри .voucher классидан
     фойдаланилади. */
  function waybillInfoBoxRows(rows){
    return rows.map(function(r,i){
      return '<div style="padding:6px 10px;font-size:12.5px;'+(i<rows.length-1?'border-bottom:1px solid #22242a;':'')+'">'+r+'</div>';
    }).join("");
  }
  function printSaleWaybill(s){
    if(!s) return;
    var rows = (s.items||[]).map(function(it,i){
      var itm = itemById(it.itemId);
      return '<tr><td style="text-align:center;">'+(i+1)+'</td><td>'+esc(it.name||(itm?itm.name:"—"))+'</td><td style="text-align:center;">'+esc(it.unit||(itm?(itm.unit||"—"):"—"))+'</td><td style="text-align:center;">'+fmtNum(it.qty)+'</td></tr>';
    }).join("");

    var dateIso = s.date || (s.createdAt||"").slice(0,10) || todayISO();
    var dp = dateIso.split("-");
    var dateLabel = (dp.length===3) ? ('"'+dp[2]+'" '+(MONTHS_FULL[Number(dp[1])-1]||"")+' '+dp[0]+' йил') : '"____" ____________________ йил';

    var cust = s.customerId ? customerById(s.customerId) : null;
    var supplierRows = [
      '<strong>Етказиб берувчи:</strong> "HEATING RADIATORS" МЧЖ',
      'Манзил: Навоий вилояти, Навоий шаҳар, Спутник қўрғони',
      'ИНН: 301 491 884',
      'Телефон рақам: +998 78-777-77-72'
    ];
    var customerRows = [
      '<strong>Харидор:</strong> '+esc(s.customerName||"—"),
      'Манзил: '+esc((cust&&cust.address)||"")
    ];
    customerRows.push('ИНН: '+esc((cust&&cust.inn)||""));
    if(cust && cust.phone){ customerRows.push('Телефон рақам: '+esc(cust.phone)); }

    var body = '<div style="text-align:center;font-weight:800;font-size:17px;margin-bottom:6px;">Юк хати № '+(s.saleNumber!=null?esc(s.saleNumber):"—")+'</div>'+
      '<div style="text-align:center;font-size:12.5px;margin-bottom:16px;">'+dateLabel+'</div>'+
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><tr>'+
        '<td style="width:50%;vertical-align:top;border:1px solid #22242a;padding:0;">'+waybillInfoBoxRows(supplierRows)+'</td>'+
        '<td style="width:50%;vertical-align:top;border:1px solid #22242a;border-left:none;padding:0;">'+waybillInfoBoxRows(customerRows)+'</td>'+
      '</tr></table>'+
      '<table><thead><tr><th style="width:34px;text-align:center;">№</th><th>Маҳсулот номи</th><th style="width:130px;text-align:center;">Ўлчов бирлиги</th><th style="width:90px;text-align:center;">Миқдори</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<div style="display:flex;justify-content:space-between;margin-top:46px;font-size:13px;">'+
        '<div style="display:flex;flex-direction:column;gap:26px;min-width:46%;">'+
          '<div style="border-bottom:1px solid #444;padding-bottom:3px;">Раҳбар: _____________________</div>'+
          '<div style="border-bottom:1px solid #444;padding-bottom:3px;">Бухгалтер: _____________________</div>'+
          '<div style="border-bottom:1px solid #444;padding-bottom:3px;">Омборчи: _____________________</div>'+
        '</div>'+
        '<div style="display:flex;flex-direction:column;gap:26px;min-width:46%;">'+
          '<div style="border-bottom:1px solid #444;padding-bottom:3px;">Қабул қилувчи: _____________________</div>'+
          '<div style="border-bottom:1px solid #444;padding-bottom:3px;">Машина рақами: _____________________</div>'+
        '</div>'+
      '</div>';
    var html = '<div class="voucher wide" style="border:1.5px solid #22242a;"><div class="voucher-body" style="padding:22px 26px 26px;">'+body+'</div></div>';
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

