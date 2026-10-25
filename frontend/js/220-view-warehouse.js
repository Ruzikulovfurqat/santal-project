  /* ================= view: warehouse ================= */
  function whSubnav(active){
    var tabs = [["stock","Ҳисобот"],["buyurtma","Омбор буюртмаси"],["receipts","Кирим"],["lomreceipt","Лом кирим"],["lomreturn","Лом возврат"],["suppliers","Таъминотчилар"],["transfers","Ички кўчириш"],["writeoffs","Хисобдан чиқариш"],["inventory","Инвентаризация"],["equipment","Ускуна ва жиҳозлар"],["manage","Бошқарув"],["sales","Сотув"]];
    return '<div class="filter-row" style="margin-bottom:18px;">'+tabs.map(function(t){
      return '<button class="pill-filter'+(active===t[0]?" active":"")+'" data-whview="'+t[0]+'">'+t[1]+'</button>';
    }).join("")+'</div>';
  }
  /* ===== Омбор бўлимлари учун умумий «Яратиш» ойнаси (2026-10-21 сўрови)
     Кирим бўлимидагидек кўриниш: тепада «Яратиш» тугмаси, саҳифада
     фақат бажарилган операциялар рўйхати, шакл эса ойнада очилади.
     МУҲИМ: шаклнинг HTML'и ва барча амаллари ЎЗГАРМАЙДИ — у яширин
     "whFormHolder" ичида одатдагидек чизилади ва тингловчилар уланади,
     ойна очилганда эса ўша ДОМ бўлаги ойнага КЎЧИРИЛАДИ (шунинг учун
     ҳамма тингловчилар ва киритилган қийматлар жойида қолади). */
  /* ===== Бажарилган операциялар устидаги умумий амаллар (2026-10-21 сўрови)
     кўриш · таҳрирлаш · нусха олиш · чоп этиш · Excel · бекор қилиш/тиклаш.
     Бекор қилинган ёзув базадан ЎЧМАЙДИ — хира бўлиб туради, таъсири
     (омбор қолдиғи ва ҳ.к.) орқага қайтарилади, истаганда тикланади. */
  function opActionsHtml(pfx, id, cancelled, extraAttr){
    var ex = extraAttr ? (" "+extraAttr) : "";
    return '<div class="row-actions">'+
      '<button class="btn btn-ghost btn-icon" data-'+pfx+'-view="'+id+'"'+ex+' title="Кўриш">'+ICONS.eye+'</button>'+
      (cancelled?'':'<button class="btn btn-ghost btn-icon" data-'+pfx+'-edit="'+id+'"'+ex+' title="Таҳрирлаш">'+ICONS.pencil+'</button>')+
      '<button class="btn btn-ghost btn-icon" data-'+pfx+'-copy="'+id+'"'+ex+' title="Нусха олиш">'+ICONS.copy+'</button>'+
      '<button class="btn btn-ghost btn-icon" data-'+pfx+'-print="'+id+'"'+ex+' title="Қоғозга чоп этиш">'+ICONS.printer+'</button>'+
      '<button class="btn btn-ghost btn-icon" data-'+pfx+'-xls="'+id+'"'+ex+' title="Excelга юклаш">'+ICONS.download+'</button>'+
      (cancelled
        ? '<button class="btn btn-ghost btn-icon" data-'+pfx+'-restore="'+id+'"'+ex+' title="Тиклаш">'+ICONS.restore+'</button>'
        : '<button class="btn btn-ghost btn-icon" data-'+pfx+'-cancel="'+id+'"'+ex+' title="Бекор қилиш">'+ICONS.ban+'</button>')+
      '</div>';
  }
  /* --- Кирим ёзувлари учун ҳужжат тавсифи --- */
  function receiptOpDoc(r){
    var it = itemById(r.itemId);
    return {title:"Кирим — "+(r.itemName||(it?it.name:"—")), sub:"Сана: "+fmtDateShort(r.date), cancelled:!!r.cancelled, note:r.note||"",
      pairs:[["Маҳсулот/хомашё", r.itemName||(it?it.name:"—")], ["Омбор", warehouseName(r.warehouseId)],
             ["Ташкилот (таъминотчи)", r.supplierName||"—"], ["Сана", fmtDate(r.date)],
             ["Миқдори", fmtNum(r.quantity)+" "+(it?it.unit:"")], ["Нархи (ККСсиз)", fmtSum(r.priceNoVat)],
             ["ККС", fmtNum(r.vatRate||0)+"% ("+fmtSum(r.vatSum||0)+")"], ["Жами сумма", fmtSum(r.totalWithVat)],
             ["Тўлов муддати", r.dueDate?fmtDateShort(r.dueDate):"—"],
             ["Омбор буюртмаси", r.wh2OrderNumber||"—"]]};
  }
  function equipReceiptOpDoc(r){
    return {title:(r.kind==="main"?"Асосий ускуна кирими — ":"Ёрдамчи жиҳоз кирими — ")+(r.name||"—"), sub:"Сана: "+fmtDateShort(r.date), cancelled:!!r.cancelled, note:r.note||"",
      pairs:[["Номи", r.name||"—"], [(r.kind==="main"?"Цех":"Омбор"), (r.kind==="main"?workshopName(r.workshopId):warehouseName(r.warehouseId))],
             ["Ташкилот (таъминотчи)", r.supplierName||"—"], ["Сана", fmtDate(r.date)],
             ["Миқдори", fmtNum(r.quantity)], ["Нархи (ККСсиз)", fmtSum(r.priceNoVat)],
             ["ККС", fmtNum(r.vatRate||0)+"% ("+fmtSum(r.vatSum||0)+")"], ["Жами сумма", fmtSum(r.totalWithVat)]]};
  }
  function transferOpDoc(r){
    var it = itemById(r.itemId);
    return {title:"Ички кўчириш — "+(r.itemName||""), sub:"Сана: "+fmtDateShort(r.date), cancelled:!!r.cancelled, note:r.note||"",
      pairs:[["Маҳсулот/хомашё", r.itemName||""], ["Қаердан", warehouseName(r.fromWarehouseId)],
             ["Қаерга", warehouseName(r.toWarehouseId)], ["Миқдори", fmtNum(r.quantity)+" "+(it?it.unit:"")],
             ["Сана", fmtDate(r.date)]]};
  }
  function writeoffOpDoc(r){
    var it = itemById(r.itemId);
    return {title:"Хисобдан чиқариш акти №"+(r.actNumber||"—"), sub:"Сана: "+fmtDateShort(r.actDate), cancelled:!!r.cancelled, note:r.reason||"",
      pairs:[["Маҳсулот/хомашё", r.itemName||""], ["Омбор", warehouseName(r.warehouseId)],
             ["Миқдори", fmtNum(r.quantity)+" "+(it?it.unit:"")], ["Акт рақами", r.actNumber||"—"],
             ["Акт санаси", fmtDate(r.actDate)], ["Масъул ходим", employeeName(r.employeeId)],
             ["Сабаби", r.reason||"—"]]};
  }
  function inventoryOpDoc(r){
    var it = itemById(r.itemId);
    return {title:"Инвентаризация — "+(r.itemName||""), sub:"Сана: "+fmtDateShort(r.date), cancelled:!!r.cancelled, note:r.note||"",
      pairs:[["Маҳсулот/жиҳоз", r.itemName||""], ["Омбор", r.warehouseId?warehouseName(r.warehouseId):"—"],
             ["Тизимдаги сон", fmtNum(r.systemQty)], ["Саналган сон", fmtNum(r.countedQty)],
             ["Фарқ", fmtNum(r.delta)+" "+(it?it.unit:"")], ["Нархи", fmtSum(r.price||0)], ["Сана", fmtDate(r.date)]]};
  }
  /* Бекор қилиш/тиклаш — умумий (таъсирни орқага қайтарувчи функция
     чақирувчидан келади). */
  function saleOpDoc(sl){
    var items = (sl.items||[]);
    return {title:"Сотув №"+(sl.saleNumber!=null?sl.saleNumber:"—"), sub:"Сана: "+fmtDateShort(sl.date||(sl.createdAt||"").slice(0,10)),
      cancelled:!!sl.cancelled, note:sl.note||"",
      pairs:[["Мижоз", sl.customerName||"—"], ["Омбор", warehouseName(sl.warehouseId)],
             ["Сана", fmtDate(sl.date||(sl.createdAt||"").slice(0,10))],
             ["Якуний жами сумма", fmtSum(sl.totalWithVat)], ["Тўланган", fmtSum(sl.paidAmount||0)],
             ["Қарз", fmtSum(sl.debtAmount||0)]],
      head:["№","Маҳсулот","Миқдор","Нарх","Жами"],
      rows:items.map(function(it,i){ return [String(i+1), it.name||"—", fmtNum(it.qty)+" "+(it.unit||""), fmtSum(it.price), fmtSum(it.lineTotal)]; })};
  }
  function kassaOpDoc(t){
    return {title:(t.direction==="kirim"?"Касса кирими":"Касса чиқими")+" №"+(t.docNumber||"—"),
      sub:"Сана: "+fmtDateShort(t.date||(t.createdAt||"").slice(0,10)), cancelled:!!t.cancelled, note:t.description||"",
      pairs:[["Ҳужжат рақами", String(t.docNumber||"—")], ["Сана", fmtDate(t.date||(t.createdAt||"").slice(0,10))],
             ["Категория", t.categoryId?kassaCategoryName(t.categoryId):"—"],
             ["Харажат тури", t.bucket?finBucketName(t.bucket):"—"],
             ["Тўлов усули", kassaTxMethodText(t)], ["Суммаси", kassaTxAmountText(t)],
             ["Ташкилот/шахс", t.counterpartyName||"—"], ["Кассир", t.cashier||"—"]]};
  }
  function productionOpDoc(pr){
    return {title:"Ишлаб чиқариш — "+(pr.productName||"—"), sub:"Сана: "+fmtDateShort((pr.createdAt||"").slice(0,10)),
      cancelled:!!pr.cancelled, note:pr.note||"",
      pairs:[["Маҳсулот", pr.productName||"—"], ["Миқдори", fmtNum(pr.quantity)+" "+(pr.unit||"")],
             ["Омбор", warehouseName(pr.warehouseId)], ["Хомашё омбори", pr.rawWarehouseId?warehouseName(pr.rawWarehouseId):"—"],
             ["Станок", pr.machineName||"—"], ["Ишлаб чиқарувчи", pr.producerEmployeeId?employeeName(pr.producerEmployeeId):"—"],
             ["Таннарх жами", fmtSum(pr.totalCost)], ["1 бирлик таннархи", fmtSum(pr.costPerUnit)]],
      head:["Сарфланган хомашё","Миқдор","Нарх","Қиймат"],
      rows:(pr.items||[]).map(function(c){ return [c.name||"—", fmtNum(c.qty), fmtSum(c.price), fmtSum(c.cost)]; })};
  }
  function lomReceiptOpDoc(r){
    return {title:"Лом кирим — партия №"+(r.batchNumber||"—"), sub:"Сана: "+fmtDateShort(r.date), cancelled:!!r.cancelled, note:r.note||"",
      pairs:[["Партия рақами", r.batchNumber||"—"], ["Таъминотчи", r.supplierName||"—"],
             ["Омбор", warehouseName(r.warehouseId)], ["Миқдори (кг)", fmtNum(r.quantity)],
             ["Нархи (1 кг)", fmtSum(r.priceNoVat)], ["Жами сумма", fmtSum(r.totalWithVat)],
             ["Қайтарилган (кг)", fmtNum(r.returnedKg||0)], ["Сана", fmtDate(r.date)]]};
  }
  function lomReturnOpDoc(x){
    return {title:"Лом возврат", sub:"Сана: "+fmtDateShort(x.date), cancelled:!!x.cancelled, note:x.note||"",
      pairs:[["Тури", x.productType==="metal"?"Металл":"Хом лом"], ["Миқдори (кг)", fmtNum(x.kg)],
             ["Нархи (1 кг)", fmtSum(x.price)], ["Жами сумма", fmtSum((Number(x.kg)||0)*(Number(x.price)||0))],
             ["Сана", fmtDate(x.date)]]};
  }
  function advanceOpDoc(r){
    return {title:"Аванс — "+(r.periodLabel||""), sub:"Сана: "+fmtDateShort(r.date||(r.createdAt||"").slice(0,10)),
      cancelled:!!r.cancelled, note:r.note||"",
      pairs:[["Давр", r.periodLabel||"—"], ["Сана", fmtDate(r.date||(r.createdAt||"").slice(0,10))],
             ["Ходимлар сони", String((r.items||[]).length)], ["Жами сумма", fmtSum(r.totalAmount||0)]],
      head:["Ходим","Сумма"],
      rows:(r.items||[]).map(function(it){ return [employeeName(it.employeeId), fmtNum(it.amount||0)]; })};
  }
  function opCancelConfirm(title, text, onYes){
    openConfirm(title, text, "Ҳа, бекор қилиш", onYes, true);
  }
  function opCancelledRowStyle(cancelled){
    return cancelled ? ' style="opacity:.45;"' : '';
  }
  function opCancelledChip(cancelled){
    return cancelled ? ' <span class="chip chip-critical" style="font-size:10px;padding:1px 6px;">Бекор қилинган</span>' : '';
  }
  /* Операция ҳужжати — чоп этиш ва Excel учун умумий тавсиф:
     {title, sub, pairs:[[номи, қиймати]...], head:[...], rows:[[...]]} */
  function opPrintDoc(d){
    var pairsHtml = (d.pairs||[]).map(function(p){
      return '<tr><td style="width:38%;">'+esc(p[0])+'</td><td style="text-align:right;">'+esc(p[1])+'</td></tr>';
    }).join("");
    var tableHtml = "";
    if(d.head && d.head.length){
      tableHtml = '<table style="margin-top:10px;"><thead><tr>'+d.head.map(function(h){ return '<th>'+esc(h)+'</th>'; }).join("")+'</tr></thead><tbody>'+
        (d.rows||[]).map(function(r){ return '<tr>'+r.map(function(c){ return '<td>'+esc(c)+'</td>'; }).join("")+'</tr>'; }).join("")+'</tbody></table>';
    }
    var body = (pairsHtml?('<table>'+pairsHtml+'</table>'):'')+tableHtml+
      (d.note?('<div style="margin-top:10px;font-size:11.5px;">Изоҳ: '+esc(d.note)+'</div>'):'')+
      (d.cancelled?('<div style="margin-top:10px;font-weight:800;color:#b00;">БЕКОР ҚИЛИНГАН</div>'):'')+
      '<div class="v-sign"><div>Топширди</div><div>Қабул қилди</div></div>';
    document.getElementById("printArea").innerHTML = voucherShell(d.title, d.sub||"", body, "wh2-print");
    setTimeout(function(){ window.print(); }, 60);
  }
  function opExcelDoc(d, fileName){
    var head = (d.head && d.head.length) ? d.head : ["Кўрсаткич","Қиймати"];
    var rows = [];
    (d.pairs||[]).forEach(function(p){ rows.push([p[0], p[1]]); });
    if(d.head && d.head.length){ rows.push([]); (d.rows||[]).forEach(function(r){ rows.push(r); }); }
    exportHtmlTableAsExcel((fileName||"Operatsiya")+".xls", d.title, head, rows);
  }
  function opByIdFrom(list, id){ return (list||[]).find(function(x){ return x.id===id; }) || null; }
  function whFormModalSetup(title){
    /* Саҳифа қайта чизилган бўлса — эски (узилиб қолган) шакл ойнаси
       ёпилади, шунда бир хил id'лар такрорланмайди. */
    var mr = document.getElementById("modalRoot");
    if(mr && mr.querySelector("[data-whform-modal]")) closeModal();
    var holder = document.getElementById("whFormHolder");
    if(!holder) return;
    var createBtn = document.getElementById("whFormCreateBtn");
    if(createBtn) createBtn.addEventListener("click", function(){ STATE.whFormOpen = true; render(); });
    var card = holder.firstElementChild;
    if(card){
      /* Шаклдаги асосий (кўк) тугма — сақлаш/бажариш тугмаси: босилгач
         саҳифа қайта чизилса, ойна ёпилиши керак. */
      card.addEventListener("click", function(e){
        if(e.target.closest && e.target.closest("button.btn-primary")){
          STATE.whFormSubmitting = true;
          setTimeout(function(){ STATE.whFormSubmitting = false; }, 1200);
        }
      }, true);
    }
    if(STATE.whFormSubmitting){ STATE.whFormSubmitting = false; STATE.whFormOpen = false; }
    if(!STATE.whFormOpen || !card) return;
    var m = openModal(title, '<div data-whform-modal></div>',
      '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xwide",
      function(){ STATE.whFormOpen = false; });
    m.querySelector("[data-whform-modal]").appendChild(card);
    m.querySelector("[data-cancel]").addEventListener("click", function(){ STATE.whFormOpen = false; closeModal(); });
  }
  function whCreateBtnHtml(){ return '<button class="btn btn-primary" id="whFormCreateBtn">'+ICONS.plus+'Яратиш</button>'; }
  function wireWhSubnav(root){
    root.querySelectorAll("[data-whview]").forEach(function(b){ b.addEventListener("click", function(){
      STATE.whView=b.getAttribute("data-whview");
      /* Кирим формасидаги вақтинчалик "тур" (маҳсулот/асосий ускуна/ёрдамчи
         жиҳоз) ва танланган категориялар — бошқа бўлимга ўтилса тозаланади,
         токи кейинги гал Киримга қайтилганда эски танловлар қолиб кетмасин. */
      STATE.receiptKind="product"; STATE.receiptCategoryIds=[];
      /* Бошқа бўлимга ўтилганда «Яратиш» ойнаси ёпиқ ҳолатда очилсин. */
      STATE.whFormOpen=false; STATE.whFormSubmitting=false;
      render();
    }); });
  }
  /* Эски ягона renderWhSidePanel(container,kind) фойдаланувчи сўровига кўра
     (2026-09-30) ҳар бир "Сўнгги ..." рўйхатига сана оралиғи + қидирув +
     кўриш/таҳрирлаш/ўчириш/чоп этиш/Excel имконини қўшиш учун 4 та алоҳида,
     бойроқ функцияга ажратилди — худди "Лом кирим"/"Лом возврат"
     панелларидаги (renderLomReceiptSide/renderLomReturnHistory) андозадек. */

  /* ---- Кирим (Сўнгги киримлар) — маҳсулот/хомашё киримлари ВА асосий
     ускуна/ёрдамчи жиҳоз киримлари БИРГАЛИКДА, тур+категория+сана
     оралиғи+қидирув филтрлари билан (фойдаланувчи сўровига кўра). ---- */
  function receiptsSideCombinedList(){
    var out = [];
    STATE.receipts.forEach(function(r){
      if(r.isLom) return; /* лом партиялари — алоҳида "Лом кирим" бўлимида */
      var it = itemById(r.itemId);
      out.push({kind:"product", id:r.id, name:r.itemName||(it?it.name:"—"), date:r.date, categoryId: it?it.categoryId:"", sum:r.totalWithVat, sub:warehouseName(r.warehouseId), raw:r});
    });
    STATE.equipmentReceipts.forEach(function(r){
      out.push({kind:r.kind, id:r.id, name:r.name, date:r.date, categoryIds:r.categoryIds||[], sum:r.totalWithVat, sub:(r.kind==="main"?workshopName(r.workshopId):warehouseName(r.warehouseId)), raw:r});
    });
    return out;
  }
  function renderReceiptsSide(container){
    var state = {from:STATE.recRcpFrom, to:STATE.recRcpTo, search:STATE.recRcpSearch};
    var kindFilter = STATE.recRcpKind||"";
    var catFilter = STATE.recRcpCategory||"";
    var all = receiptsSideCombinedList();
    var list = all.filter(function(x){
      if(kindFilter && x.kind!==kindFilter) return false;
      if(catFilter){
        var cats = x.kind==="product" ? [x.categoryId] : (x.categoryIds||[]);
        if(cats.indexOf(catFilter)===-1) return false;
      }
      if(!recMatchesDate(x.date, state.from, state.to)) return false;
      if(!recMatchesSearch(x.name+" "+x.sub, state.search)) return false;
      return true;
    }).sort(function(a,b){return ((b.raw.createdAt)||"").localeCompare((a.raw.createdAt)||"");});
    var shown = list.slice(0,300);
    var KIND_LABELS = {product:"Маҳсулот", main:"Асосий ускуна", aux:"Ёрдамчи жиҳоз"};
    var kindTabsHtml = '<div class="filter-row" style="margin-bottom:10px;">'+
      [["","Барчаси"],["product","Маҳсулот"],["main","Асосий ускуна"],["aux","Ёрдамчи жиҳоз"]].map(function(t){
        return '<button class="pill-filter'+(kindFilter===t[0]?" active":"")+'" data-recrcp-kind="'+t[0]+'">'+t[1]+'</button>';
      }).join("")+'</div>';
    var catSelectHtml = '<select id="recRcp-cat" style="min-width:120px;padding:9px 10px;border-radius:10px;border:1px solid var(--border-strong);background:var(--bg);font-size:12.5px;">'+
      '<option value="">Барча категориялар</option>'+STATE.categories.map(function(c){return '<option value="'+c.id+'"'+(catFilter===c.id?" selected":"")+'>'+esc(c.name)+'</option>';}).join("")+'</select>';
    /* 2026-10-21 сўрови: Кирим бўлими энди «Наряд» каби — тепада
       «Яратиш» тугмаси (шакл алоҳида ойнада), пастда турлар бўйича
       филтр ва БАЖАРИЛГАН ОПЕРАЦИЯЛАР жадвали. */
    var html = kindTabsHtml+recFilterToolbar("recRcp", state, "Номи бўйича қидириш…", catSelectHtml)+
      '<div class="card" style="padding:16px 18px;">'+
      '<div class="section-head" style="align-items:center;"><h2 style="font-size:13.5px;">Бажарилган операциялар</h2>'+
        '<span class="field-hint">'+list.length+' та ёзув</span></div>'+
      (shown.length
        ? '<div class="table-wrap table-frozen"><table><thead><tr><th>№</th><th>Сана</th><th>Тури</th><th>Номи</th><th>Омбор / цех</th><th>Ташкилот</th><th class="num">Миқдори</th><th class="num">Сумма</th><th></th></tr></thead><tbody>'+
            shown.map(function(x,i){
              var raw = x.raw||{};
              var cx = !!raw.cancelled;
              return '<tr'+opCancelledRowStyle(cx)+'>'+
                '<td class="cell-muted">'+(i+1)+'</td>'+
                '<td class="cell-muted" style="white-space:nowrap;">'+fmtDateShort(x.date)+'</td>'+
                '<td><span class="chip chip-neutral">'+esc(KIND_LABELS[x.kind]||x.kind)+'</span></td>'+
                '<td class="cell-strong">'+esc(x.name)+opCancelledChip(cx)+(raw.wh2OrderNumber?('<div class="cell-muted" style="font-size:11px;">'+esc(raw.wh2OrderNumber)+'</div>'):'')+'</td>'+
                '<td class="cell-muted">'+esc(x.sub||"—")+'</td>'+
                '<td class="cell-muted">'+esc(raw.supplierName||"—")+'</td>'+
                '<td class="num">'+fmtNum(raw.quantity||0)+'</td>'+
                '<td class="num cell-strong">'+fmtSum(x.sum)+'</td>'+
                '<td>'+opActionsHtml("recrcp", x.id, cx, 'data-recrcp-kind2="'+x.kind+'"')+'</td></tr>';
            }).join("")+'</tbody></table></div>'
        : '<div class="field-hint">Ҳали кирим қилинмаган — тепадаги «Яратиш» тугмаси орқали кирим қилинг.</div>')+
      '</div>';
    container.innerHTML = html;
    container.querySelectorAll("[data-recrcp-kind]").forEach(function(b){ b.addEventListener("click", function(){ STATE.recRcpKind=b.getAttribute("data-recrcp-kind"); render(); }); });
    var catSel = container.querySelector("#recRcp-cat");
    if(catSel) catSel.addEventListener("change", function(){ STATE.recRcpCategory=this.value; render(); });
    wireRecFilterToolbar(container, "recRcp", state, function(){ exportReceiptsSideExcel(list); });
    STATE.recRcpFrom=state.from; STATE.recRcpTo=state.to; STATE.recRcpSearch=state.search;
    function findRaw(id, k){
      if(k==="product") return STATE.receipts.find(function(x){return x.id===id;});
      return STATE.equipmentReceipts.find(function(x){return x.id===id;});
    }
    container.querySelectorAll("[data-recrcp-view]").forEach(function(b){ b.addEventListener("click", function(){
      var r = findRaw(b.getAttribute("data-recrcp-view"), b.getAttribute("data-recrcp-kind2"));
      if(!r) return;
      if(b.getAttribute("data-recrcp-kind2")==="product") openReceiptSideDetail(r); else openEquipmentReceiptDetail(r);
    }); });
    container.querySelectorAll("[data-recrcp-edit]").forEach(function(b){ b.addEventListener("click", function(){
      var r = findRaw(b.getAttribute("data-recrcp-edit"), b.getAttribute("data-recrcp-kind2"));
      if(!r) return;
      if(b.getAttribute("data-recrcp-kind2")==="product") openReceiptEditForm(r); else openEquipmentReceiptEditForm(r);
    }); });
    container.querySelectorAll("[data-recrcp-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var k = b.getAttribute("data-recrcp-kind2");
      var r = findRaw(b.getAttribute("data-recrcp-copy"), k);
      if(!r) return;
      /* Нусха — янги кирим шакли шу ёзувдан тўлдирилади, эски ёзувга
         ҳеч қандай таъсир қилмайди (2026-10-21 сўрови). */
      if(k==="product"){
        STATE.receiptKind = "product";
        STATE.whReceiptDraft = {supplierId:r.supplierId||"", supplierName:r.supplierName||"", wh2OrderId:"",
          warehouseId:r.warehouseId||"", date:todayISO(), dueDate:"", note:r.note||"",
          rows:[{itemId:r.itemId||"", itemName:r.itemName||"", unit:"", orderQty:0, orderLineIdx:-1,
                 qty:Number(r.quantity)||0, price:Number(r.priceNoVat)||0, vat:Number(r.vatRate)||VAT_RATE_DEFAULT}]};
        render();
        openWhReceiptModal();
      } else {
        STATE.receiptKind = k;
        STATE.receiptCategoryIds = (r.categoryIds||[]).slice();
        render();
        openWhReceiptModal();
        var byId=function(id){return document.getElementById(id);};
        if(byId("r-supplier")) byId("r-supplier").value = r.supplierName||"";
        var sp = byId("r-supplier-pick"); if(sp && r.supplierName) sp.innerHTML = esc(r.supplierName);
        if(k==="main"){
          if(byId("rm-equip")) byId("rm-equip").value = r.equipmentId||"";
          if(byId("rm-workshop")) byId("rm-workshop").value = r.workshopId||"";
        } else {
          if(byId("ra-equip")) byId("ra-equip").value = r.equipmentId||"";
          if(byId("ra-wh")) byId("ra-wh").value = r.warehouseId||"";
          if(byId("ra-location")) byId("ra-location").value = r.location||"";
        }
        if(byId("r-qty")) byId("r-qty").value = r.quantity||0;
        if(byId("r-price")) byId("r-price").value = r.priceNoVat||0;
        if(byId("r-vat")) byId("r-vat").value = r.vatRate||0;
        if(byId("r-qty")) byId("r-qty").dispatchEvent(new Event("input"));
      }
      toast("Нусха олинди — текшириб, «Кирим қилиш» тугмасини босинг");
    }); });
    container.querySelectorAll("[data-recrcp-print]").forEach(function(b){ b.addEventListener("click", function(){
      var k = b.getAttribute("data-recrcp-kind2");
      var r = findRaw(b.getAttribute("data-recrcp-print"), k);
      if(r) opPrintDoc(k==="product" ? receiptOpDoc(r) : equipReceiptOpDoc(r));
    }); });
    container.querySelectorAll("[data-recrcp-xls]").forEach(function(b){ b.addEventListener("click", function(){
      var k = b.getAttribute("data-recrcp-kind2");
      var r = findRaw(b.getAttribute("data-recrcp-xls"), k);
      if(r) opExcelDoc(k==="product" ? receiptOpDoc(r) : equipReceiptOpDoc(r), "Kirim");
    }); });
    container.querySelectorAll("[data-recrcp-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var k = b.getAttribute("data-recrcp-kind2");
      var r = findRaw(b.getAttribute("data-recrcp-cancel"), k);
      if(!r) return;
      if(k==="product"){
        opCancelConfirm("Киримни бекор қилиш", "«"+esc(r.itemName)+"» кирими бекор қилинсинми? Омбор қолдиғидан "+fmtNum(r.quantity)+" айирилади. Ёзув базада қолади ва истаганда тикланади.", function(){
          adjustStockBy(r.itemId, r.warehouseId, -(Number(r.quantity)||0));
          dbUpdate("receipts", r.id, {cancelled:true, cancelledAt:new Date().toISOString()}, STATE.receipts);
          toast("Бекор қилинди — омбор қолдиғи қайта ҳисобланди");
        });
      } else {
        opCancelConfirm("Киримни бекор қилиш", "«"+esc(r.name)+"» кирими бекор қилинсинми? Ёзув базада қолади ва истаганда тикланади.", function(){
          dbUpdate("equipmentReceipts", r.id, {cancelled:true, cancelledAt:new Date().toISOString()}, STATE.equipmentReceipts);
          toast("Бекор қилинди");
        });
      }
    }); });
    container.querySelectorAll("[data-recrcp-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var k = b.getAttribute("data-recrcp-kind2");
      var r = findRaw(b.getAttribute("data-recrcp-restore"), k);
      if(!r) return;
      openConfirm("Киримни тиклаш", "Бу кирим қайта тикланиб, омбор қолдиғига яна қўшилсинми?", "Ҳа, тиклаш", function(){
        if(k==="product"){
          adjustStockBy(r.itemId, r.warehouseId, (Number(r.quantity)||0));
          dbUpdate("receipts", r.id, {cancelled:false, cancelledAt:""}, STATE.receipts);
        } else {
          dbUpdate("equipmentReceipts", r.id, {cancelled:false, cancelledAt:""}, STATE.equipmentReceipts);
        }
        toast("Тикланди");
      }, true);
    }); });
  }
  function exportReceiptsSideExcel(list){
    var headers = ["Тури","Номи","Жой/Цех","Сана","Сумма"];
    var kindLabel = {product:"Маҳсулот", main:"Асосий ускуна", aux:"Ёрдамчи жиҳоз"};
    var rowsArr = list.map(function(x){ return [kindLabel[x.kind]||x.kind, x.name, x.sub, fmtDateShort(x.date), fmtNum(x.sum)]; });
    exportHtmlTableAsExcel("Kirimlar.xls", "Сўнгги киримлар", headers, rowsArr);
  }
  /* Диққат: бу функция "openReceiptDetail" эмас — шу номда бошқа (эски,
     фақат кўриш учун, "Солиштирма далолатнома" бўлимида ишлатиладиган)
     функция аллақачон мавжуд эди (қаранг: пастроқда, openActWhoPickerModal
     яқинида) — шунга кўра тўқнашмаслик учун бу янги, тўлиқроқ (чоп этиш +
     таҳрирлаш тугмалари билан) версия "Сўнгги киримлар" рўйхати учун
     атайлаб бошқа ном (openReceiptSideDetail) билан аталди. */
  function openReceiptSideDetail(r){
    if(!r) return;
    var it = itemById(r.itemId);
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Маҳсулот/хомашё</div><div class="dd">'+esc(r.itemName||(it?it.name:"—"))+'</div></div>'+
      '<div><div class="dl">Омбор</div><div class="dd">'+esc(warehouseName(r.warehouseId))+'</div></div>'+
      '<div><div class="dl">Ташкилот (таъминотчи)</div><div class="dd">'+esc(r.supplierName||"—")+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDate(r.date)+'</div></div>'+
      '<div><div class="dl">Тўлов муддати</div><div class="dd">'+(r.dueDate?fmtDateShort(r.dueDate):"—")+'</div></div>'+
      '<div><div class="dl">Миқдори</div><div class="dd">'+fmtNum(r.quantity)+' '+esc(it?it.unit:"")+'</div></div>'+
      '<div><div class="dl">Нархи (ККСсиз)</div><div class="dd">'+fmtSum(r.priceNoVat)+'</div></div>'+
      '<div><div class="dl">ККС</div><div class="dd">'+fmtNum(r.vatRate||0)+'% ('+fmtSum(r.vatSum||0)+')</div></div>'+
      '<div><div class="dl">Жами сумма</div><div class="dd">'+fmtSum(r.totalWithVat)+'</div></div>'+
      '<div><div class="dl">Тўланган</div><div class="dd">'+fmtSum(r.paidAmount||0)+'</div></div>'+
      '<div><div class="dl">Қарз</div><div class="dd" style="color:'+(Number(r.payableAmount||0)>0?"var(--critical)":"inherit")+';font-weight:'+(Number(r.payableAmount||0)>0?"800":"400")+';">'+fmtSum(r.payableAmount||0)+'</div></div>'+
      '</div>'+
      (r.note?('<div class="field" style="margin-top:14px;margin-bottom:0;"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(r.note)+'</div></div>'):"");
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print title="Чоп этиш">'+ICONS.printer+'</button><button class="btn btn-primary" data-edit>Таҳрирлаш</button>';
    var m = openModal("Кирим — "+esc(r.itemName||"—"), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelector("[data-print]").addEventListener("click", function(){ printReceiptVoucher(r); });
    m.querySelector("[data-edit]").addEventListener("click", function(){ closeModal(); openReceiptEditForm(r); });
  }
  function printReceiptVoucher(r){
    if(!r) return;
    var it = itemById(r.itemId);
    var body = '<table>'+
      '<tr><td>Маҳсулот/хомашё</td><td style="text-align:right;">'+esc(r.itemName||(it?it.name:"—"))+'</td></tr>'+
      '<tr><td>Омбор</td><td style="text-align:right;">'+esc(warehouseName(r.warehouseId))+'</td></tr>'+
      '<tr><td>Ташкилот</td><td style="text-align:right;">'+esc(r.supplierName||"—")+'</td></tr>'+
      '<tr><td>Миқдори</td><td style="text-align:right;">'+fmtNum(r.quantity)+' '+esc(it?it.unit:"")+'</td></tr>'+
      '<tr><td>Нархи (ККСсиз)</td><td style="text-align:right;">'+fmtSum(r.priceNoVat)+'</td></tr>'+
      '<tr><td>ККС</td><td style="text-align:right;">'+fmtNum(r.vatRate||0)+'% ('+fmtSum(r.vatSum||0)+')</td></tr>'+
      '<tr><td>Тўланган</td><td style="text-align:right;">'+fmtSum(r.paidAmount||0)+'</td></tr>'+
      '<tr><td>Қарз</td><td style="text-align:right;">'+fmtSum(r.payableAmount||0)+'</td></tr>'+
      '</table>'+
      '<div class="v-total">Жами: '+fmtSum(r.totalWithVat)+'</div>'+
      (r.note?'<div style="margin-top:10px;">Изоҳ: '+esc(r.note)+'</div>':'')+
      '<div class="v-sign"><div>Топширди</div><div>Қабул қилди</div></div>';
    var html = voucherShell("Кирим — "+esc(r.itemName||"—"), "Сана: "+esc(fmtDateShort(r.date)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  function printEquipmentReceiptVoucher(r){
    if(!r) return;
    var isMain = r.kind==="main";
    var body = '<table>'+
      (isMain
        ? ('<tr><td>Цех</td><td style="text-align:right;">'+esc(workshopName(r.workshopId))+'</td></tr><tr><td>Жавобгар</td><td style="text-align:right;">'+esc(r.responsibleEmployeeId?employeeName(r.responsibleEmployeeId):"—")+'</td></tr>')
        : ('<tr><td>Омбор</td><td style="text-align:right;">'+esc(warehouseName(r.warehouseId))+'</td></tr><tr><td>Ўрни</td><td style="text-align:right;">'+esc(r.location||"—")+'</td></tr>'))+
      '<tr><td>Категория</td><td style="text-align:right;">'+esc(equipCategoryNames(r.categoryIds))+'</td></tr>'+
      '<tr><td>Ташкилот</td><td style="text-align:right;">'+esc(r.supplierName||"—")+'</td></tr>'+
      '<tr><td>Миқдори</td><td style="text-align:right;">'+fmtNum(r.quantity)+'</td></tr>'+
      '<tr><td>Нархи (ККСсиз)</td><td style="text-align:right;">'+fmtSum(r.priceNoVat)+'</td></tr>'+
      '</table>'+
      '<div class="v-total">Жами: '+fmtSum(r.totalWithVat)+'</div>'+
      (r.note?'<div style="margin-top:10px;">Изоҳ: '+esc(r.note)+'</div>':'')+
      '<div class="v-sign"><div>Топширди</div><div>Қабул қилди</div></div>';
    var html = voucherShell((isMain?"Асосий ускуна":"Ёрдамчи жиҳоз")+" — "+esc(r.name), "Сана: "+esc(fmtDateShort(r.date)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  function openEquipmentReceiptEditForm(r){
    if(!r) return;
    var isMain = r.kind==="main";
    var localCatIds = (r.categoryIds||[]).slice();
    function catChipsHtml2(){
      if(!localCatIds.length) return '<div class="field-hint">Танланмаган</div>';
      return '<div style="display:flex;flex-wrap:wrap;gap:6px;">'+localCatIds.map(function(id){
        return '<span class="chip chip-accent" data-eqe-catchip="'+id+'" style="cursor:pointer;">'+esc(categoryName(id))+' '+ICONS.x+'</span>';
      }).join("")+'</div>';
    }
    var body = '<div class="field"><label>'+(isMain?"Ускуна номи":"Жиҳоз номи")+'</label><select id="eqe-equip">'+equipmentOptionsHtml(r.equipmentId, isMain?"main":"aux")+'</select></div>'+
      (isMain
        ? '<div class="field-row"><div class="field"><label>Цех</label><select id="eqe-workshop"><option value="">— танланг —</option>'+STATE.workshops.map(function(w){return '<option value="'+w.id+'"'+(r.workshopId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
          '<div class="field"><label>Жавобгар шахс <span class="opt">(ихтиёрий)</span></label>'+personComboInputHtml("eqe-resp", "eqe-resp-list", r.responsibleEmployeeId||null)+'</div></div>'
        : '<div class="field-row"><div class="field"><label>Омбор</label><select id="eqe-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(r.warehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
          '<div class="field"><label>Омбордаги ўрни <span class="opt">(ихтиёрий)</span></label><input id="eqe-location" value="'+esc(r.location||"")+'"></div></div>')+
      '<div class="field"><label>Категория <span class="opt">(ихтиёрий)</span></label><div id="eqe-cat-chips">'+catChipsHtml2()+'</div><button type="button" class="btn btn-secondary btn-sm" id="eqe-cat-add" style="margin-top:6px;">'+ICONS.plus+'Категория қўшиш</button></div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:10px;margin-bottom:14px;">'+
        '<div class="field" style="margin-bottom:0;"><label>Миқдори</label><input id="eqe-qty" type="number" min="0" step="any" value="'+esc(r.quantity)+'"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>Нархи (ККСсиз)</label><input id="eqe-price" type="number" min="0" step="any" value="'+esc(r.priceNoVat)+'"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>ККС (%)</label><input id="eqe-vat" type="number" min="0" step="any" value="'+esc(r.vatRate||0)+'"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>Сумма (жами)</label><input id="eqe-sum" type="text" value="0 сўм" disabled style="font-weight:800;color:var(--accent);"></div>'+
      '</div>'+
      '<div class="field"><label>Сана</label><input id="eqe-date" type="date" value="'+esc(r.date||todayISO())+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="eqe-note">'+esc(r.note||"")+'</textarea></div>'+
      '<div class="field-hint">Тўланган сумма ва касса ёзуви бу ерда ўзгартирилмайди — уларни тўғридан-тўғри «Таъминотчилар» ёки «Касса» бўлимида тўғриланг.</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal((isMain?"Асосий ускуна кирими":"Ёрдамчи жиҳоз кирими")+"ни таҳрирлаш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var recompute = function(){
      var qty=Number(m.querySelector("#eqe-qty").value)||0, price=Number(m.querySelector("#eqe-price").value)||0, vat=Number(m.querySelector("#eqe-vat").value)||0;
      m.querySelector("#eqe-sum").value = fmtSum(qty*price*(1+vat/100));
    };
    ["eqe-qty","eqe-price","eqe-vat"].forEach(function(id){ m.querySelector("#"+id).addEventListener("input", recompute); });
    recompute();
    function wireCatChips2(){
      m.querySelectorAll("[data-eqe-catchip]").forEach(function(c){
        c.addEventListener("click", function(){
          var id = c.getAttribute("data-eqe-catchip");
          localCatIds = localCatIds.filter(function(x){return x!==id;});
          m.querySelector("#eqe-cat-chips").innerHTML = catChipsHtml2();
          wireCatChips2();
        });
      });
    }
    wireCatChips2();
    m.querySelector("#eqe-cat-add").addEventListener("click", function(){
      openMultiCheckPickerModal("Категорияларни танлаш", STATE.categories.slice().sort(function(a,b){return (a.name||"").localeCompare(b.name||"");}), localCatIds, function(picked){
        localCatIds = picked;
        m.querySelector("#eqe-cat-chips").innerHTML = catChipsHtml2();
        wireCatChips2();
      });
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var equipmentId = m.querySelector("#eqe-equip").value;
      var eq = equipmentById(equipmentId);
      if(!equipmentId || !eq){ toast("Ускуна/жиҳозни танланг"); return; }
      var qty=Number(m.querySelector("#eqe-qty").value)||0, price=Number(m.querySelector("#eqe-price").value)||0, vat=Number(m.querySelector("#eqe-vat").value)||0;
      if(qty<=0){ toast("Миқдорни киритинг"); return; }
      var date=m.querySelector("#eqe-date").value||todayISO(), note=m.querySelector("#eqe-note").value.trim();
      var vatSum=qty*price*vat/100, totalNoVat=qty*price, totalWithVat=totalNoVat+vatSum;
      var patch = {
        name:eq.name, equipmentId:equipmentId, quantity:qty, priceNoVat:price, vatRate:vat, vatSum:vatSum, totalNoVat:totalNoVat, totalWithVat:totalWithVat,
        payableAmount:Math.max(0, totalWithVat-Number(r.paidAmount||0)), categoryIds:localCatIds, date:date, note:note
      };
      if(isMain){
        var workshopId = m.querySelector("#eqe-workshop").value;
        if(!workshopId){ toast("Цехни танланг"); return; }
        var respRaw = m.querySelector("#eqe-resp").value.trim();
        var respEmp = resolvePersonFromComboValue(respRaw);
        if(respRaw && !respEmp){ toast("«Жавобгар шахс» рўйхатда йўқ — мавжуд ходимни танланг"); return; }
        patch.workshopId = workshopId;
        patch.responsibleEmployeeId = respEmp?respEmp.id:"";
      } else {
        var whId = m.querySelector("#eqe-wh").value;
        if(!whId){ toast("Омборни танланг"); return; }
        patch.warehouseId = whId;
        patch.location = m.querySelector("#eqe-location").value.trim();
      }
      dbUpdate("equipmentReceipts", r.id, patch, STATE.equipmentReceipts);
      toast("Кирим янгиланди");
      closeModal();
    });
  }

  /* ---- Ички кўчириш (Сўнгги ички кўчиришлар) ---- */
  function renderTransfersSide(container){
    var state = {from:STATE.recTrFrom, to:STATE.recTrTo, search:STATE.recTrSearch};
    var list = STATE.transfers.filter(function(r){
      if(!recMatchesDate(r.date, state.from, state.to)) return false;
      if(!recMatchesSearch(r.itemName, state.search)) return false;
      return true;
    }).sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
    var shown = list.slice(0,12);
    var html = '<div class="card" style="padding:18px 20px;"><h2 style="font-size:14px;font-weight:800;margin:0 0 10px;">Сўнгги ички кўчиришлар</h2>'+
      recFilterToolbar("recTr", state, "Номи бўйича қидириш…")+
      (shown.length ? '<div style="display:flex;flex-direction:column;gap:8px;">'+shown.map(function(r){
        return '<div class="alert-row" style="align-items:flex-start;"'+opCancelledRowStyle(r.cancelled)+'><div class="grow"><div class="t">'+esc(r.itemName)+opCancelledChip(r.cancelled)+'</div><div class="s">'+esc(warehouseName(r.fromWarehouseId))+' → '+esc(warehouseName(r.toWarehouseId))+' · '+fmtDateShort(r.date)+'</div></div><div style="display:flex;align-items:center;gap:4px;"><div class="num cell-strong" style="font-size:12px;white-space:nowrap;">'+fmtNum(r.quantity)+'</div>'+
          opActionsHtml("tr", r.id, r.cancelled)+
          '</div></div>';
      }).join("")+'</div>' : '<div style="text-align:center;color:var(--ink-3);font-size:13px;padding:16px 0;">Ҳали кўчириш йўқ</div>')+
      '</div>';
    container.innerHTML = html;
    wireRecFilterToolbar(container, "recTr", state, function(){ exportTransfersExcel(list); });
    STATE.recTrFrom=state.from; STATE.recTrTo=state.to; STATE.recTrSearch=state.search;
    container.querySelectorAll("[data-tr-view]").forEach(function(b){ b.addEventListener("click", function(){ openTransferDetail(STATE.transfers.find(function(x){return x.id===b.getAttribute("data-tr-view");})); }); });
    container.querySelectorAll("[data-tr-edit]").forEach(function(b){ b.addEventListener("click", function(){ openTransferEditForm(STATE.transfers.find(function(x){return x.id===b.getAttribute("data-tr-edit");})); }); });
    container.querySelectorAll("[data-tr-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.transfers, b.getAttribute("data-tr-copy")); if(!r) return;
      STATE.whFormOpen = true; render();
      var byId=function(id){return document.getElementById(id);};
      setItemComboInputValue("tr-item", r.itemId||"");
      if(byId("tr-from")) byId("tr-from").value = r.fromWarehouseId||"";
      if(byId("tr-to")) byId("tr-to").value = r.toWarehouseId||"";
      if(byId("tr-qty")) byId("tr-qty").value = r.quantity||0;
      if(byId("tr-date")) byId("tr-date").value = todayISO();
      if(byId("tr-note")) byId("tr-note").value = r.note||"";
      toast("Нусха олинди — текшириб, амалга оширинг");
    }); });
    container.querySelectorAll("[data-tr-print]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.transfers, b.getAttribute("data-tr-print")); if(r) opPrintDoc(transferOpDoc(r));
    }); });
    container.querySelectorAll("[data-tr-xls]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.transfers, b.getAttribute("data-tr-xls")); if(r) opExcelDoc(transferOpDoc(r), "Kuchirish");
    }); });
    container.querySelectorAll("[data-tr-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.transfers, b.getAttribute("data-tr-cancel")); if(!r) return;
      opCancelConfirm("Кўчиришни бекор қилиш", "«"+esc(r.itemName)+"» кўчириши бекор қилиниб, миқдор орқага қайтарилсинми? Ёзув базада қолади ва истаганда тикланади.", function(){
        adjustStockBy(r.itemId, r.fromWarehouseId, Number(r.quantity)||0);
        adjustStockBy(r.itemId, r.toWarehouseId, -(Number(r.quantity)||0));
        dbUpdate("transfers", r.id, {cancelled:true, cancelledAt:new Date().toISOString()}, STATE.transfers);
        toast("Бекор қилинди — омбор қолдиқлари қайта ҳисобланди");
      });
    }); });
    container.querySelectorAll("[data-tr-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.transfers, b.getAttribute("data-tr-restore")); if(!r) return;
      openConfirm("Кўчиришни тиклаш", "Бу кўчириш қайта тикланиб, миқдор яна кўчирилсинми?", "Ҳа, тиклаш", function(){
        adjustStockBy(r.itemId, r.fromWarehouseId, -(Number(r.quantity)||0));
        adjustStockBy(r.itemId, r.toWarehouseId, Number(r.quantity)||0);
        dbUpdate("transfers", r.id, {cancelled:false, cancelledAt:""}, STATE.transfers);
        toast("Тикланди");
      }, true);
    }); });
  }
  function exportTransfersExcel(list){
    var headers = ["Маҳсулот/хомашё","Қаердан","Қаерга","Миқдор","Сана","Изоҳ"];
    var rowsArr = list.map(function(r){ return [r.itemName, warehouseName(r.fromWarehouseId), warehouseName(r.toWarehouseId), fmtNum(r.quantity), fmtDateShort(r.date), r.note||""]; });
    exportHtmlTableAsExcel("Ichki_kuchirish.xls", "Ички кўчиришлар", headers, rowsArr);
  }
  function openTransferDetail(r){
    if(!r) return;
    var it = itemById(r.itemId);
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Маҳсулот/хомашё</div><div class="dd">'+esc(r.itemName||(it?it.name:"—"))+'</div></div>'+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDate(r.date)+'</div></div>'+
      '<div><div class="dl">Қаердан</div><div class="dd">'+esc(warehouseName(r.fromWarehouseId))+'</div></div>'+
      '<div><div class="dl">Қаерга</div><div class="dd">'+esc(warehouseName(r.toWarehouseId))+'</div></div>'+
      '<div><div class="dl">Миқдори</div><div class="dd">'+fmtNum(r.quantity)+' '+esc(it?it.unit:"")+'</div></div>'+
      '</div>'+
      (r.note?('<div class="field" style="margin-top:14px;margin-bottom:0;"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(r.note)+'</div></div>'):"");
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print title="Чоп этиш">'+ICONS.printer+'</button><button class="btn btn-primary" data-edit>Таҳрирлаш</button>';
    var m = openModal("Ички кўчириш — "+esc(r.itemName||"—"), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelector("[data-print]").addEventListener("click", function(){ printTransferVoucher(r); });
    m.querySelector("[data-edit]").addEventListener("click", function(){ closeModal(); openTransferEditForm(r); });
  }
  function printTransferVoucher(r){
    if(!r) return;
    var it = itemById(r.itemId);
    var body = '<table>'+
      '<tr><td>Маҳсулот/хомашё</td><td style="text-align:right;">'+esc(r.itemName||(it?it.name:"—"))+'</td></tr>'+
      '<tr><td>Қаердан</td><td style="text-align:right;">'+esc(warehouseName(r.fromWarehouseId))+'</td></tr>'+
      '<tr><td>Қаерга</td><td style="text-align:right;">'+esc(warehouseName(r.toWarehouseId))+'</td></tr>'+
      '<tr><td>Миқдори</td><td style="text-align:right;">'+fmtNum(r.quantity)+' '+esc(it?it.unit:"")+'</td></tr>'+
      '</table>'+
      (r.note?'<div style="margin-top:10px;">Изоҳ: '+esc(r.note)+'</div>':'')+
      '<div class="v-sign"><div>Топширди</div><div>Қабул қилди</div></div>';
    var html = voucherShell("Ички кўчириш — "+esc(r.itemName||"—"), "Сана: "+esc(fmtDateShort(r.date)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  function openTransferEditForm(r){
    if(!r) return;
    var body = '<div class="field"><label>Маҳсулот/хомашё</label>'+itemComboInputHtml("tre-item", "tre-item-datalist", itemById(r.itemId))+'</div>'+
      '<div class="field-row"><div class="field"><label>Қаердан</label><select id="tre-from">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(r.fromWarehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Қаерга</label><select id="tre-to">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(r.toWarehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div></div>'+
      '<div class="field"><label>Миқдори</label><input id="tre-qty" type="number" min="0" step="any" value="'+esc(r.quantity)+'"></div>'+
      '<div class="field"><label>Сана</label><input id="tre-date" type="date" value="'+esc(r.date||todayISO())+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="tre-note">'+esc(r.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Ички кўчиришни таҳрирлаш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var resolved = resolveItemFromComboValue(m.querySelector("#tre-item").value);
      var newItemId = resolved?resolved.id:"";
      var newFrom = m.querySelector("#tre-from").value, newTo = m.querySelector("#tre-to").value;
      var qty = Number(m.querySelector("#tre-qty").value)||0;
      var date = m.querySelector("#tre-date").value||todayISO(), note = m.querySelector("#tre-note").value.trim();
      if(!newItemId){ toast("Рўйхатдан тўғри маҳсулотни танланг"); return; }
      if(newFrom===newTo){ toast("Омборлар турлича бўлиши керак"); return; }
      if(qty<=0){ toast("Миқдорни киритинг"); return; }
      var it = itemById(newItemId);
      /* эски эффект тўлиқ орқага қайтарилади, сўнгра янги қийматлар билан қайта қўлланилади */
      adjustStockBy(r.itemId, r.fromWarehouseId, Number(r.quantity)||0);
      adjustStockBy(r.itemId, r.toWarehouseId, -(Number(r.quantity)||0));
      adjustStockBy(newItemId, newFrom, -qty);
      adjustStockBy(newItemId, newTo, qty);
      dbUpdate("transfers", r.id, {itemId:newItemId, itemName:it?it.name:"", fromWarehouseId:newFrom, toWarehouseId:newTo, quantity:qty, date:date, note:note}, STATE.transfers);
      toast("Кўчириш янгиланди — омбор қолдиқлари қайта ҳисобланди");
      closeModal();
    });
  }

  /* ---- Хисобдан чиқариш (Сўнгги хисобдан чиқаришлар) ---- */
  function renderWriteoffsSide(container){
    var state = {from:STATE.recWoFrom, to:STATE.recWoTo, search:STATE.recWoSearch};
    var list = STATE.writeoffs.filter(function(r){
      if(!recMatchesDate(r.actDate||r.createdAt, state.from, state.to)) return false;
      if(!recMatchesSearch(r.itemName+" "+(r.actNumber||""), state.search)) return false;
      return true;
    }).sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
    var shown = list.slice(0,12);
    var html = '<div class="card" style="padding:18px 20px;"><h2 style="font-size:14px;font-weight:800;margin:0 0 10px;">Сўнгги хисобдан чиқаришлар</h2>'+
      recFilterToolbar("recWo", state, "Номи ёки акт рақами бўйича қидириш…")+
      (shown.length ? '<div style="display:flex;flex-direction:column;gap:8px;">'+shown.map(function(r){
        return '<div class="alert-row" style="align-items:flex-start;"'+opCancelledRowStyle(r.cancelled)+'><div class="grow"><div class="t">'+esc(r.itemName)+opCancelledChip(r.cancelled)+'</div><div class="s">Акт №'+esc(r.actNumber||"—")+' · '+fmtDateShort(r.actDate)+'</div></div><div style="display:flex;align-items:center;gap:4px;"><div class="num cell-strong" style="font-size:12px;white-space:nowrap;">'+fmtNum(r.quantity)+'</div>'+
          opActionsHtml("wo", r.id, r.cancelled)+
          '</div></div>';
      }).join("")+'</div>' : '<div style="text-align:center;color:var(--ink-3);font-size:13px;padding:16px 0;">Ҳали ёзув йўқ</div>')+
      '</div>';
    container.innerHTML = html;
    wireRecFilterToolbar(container, "recWo", state, function(){ exportWriteoffsExcel(list); });
    STATE.recWoFrom=state.from; STATE.recWoTo=state.to; STATE.recWoSearch=state.search;
    container.querySelectorAll("[data-wo-view]").forEach(function(b){ b.addEventListener("click", function(){ openWriteoffDetail(STATE.writeoffs.find(function(x){return x.id===b.getAttribute("data-wo-view");})); }); });
    container.querySelectorAll("[data-wo-edit]").forEach(function(b){ b.addEventListener("click", function(){ openWriteoffEditForm(STATE.writeoffs.find(function(x){return x.id===b.getAttribute("data-wo-edit");})); }); });
    container.querySelectorAll("[data-wo-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.writeoffs, b.getAttribute("data-wo-copy")); if(!r) return;
      STATE.whFormOpen = true; render();
      var byId=function(id){return document.getElementById(id);};
      if(byId("wo-wh")) byId("wo-wh").value = r.warehouseId||"";
      setItemComboInputValue("wo-item", r.itemId||"");
      if(byId("wo-qty")) byId("wo-qty").value = r.quantity||0;
      if(byId("wo-reason")) byId("wo-reason").value = r.reason||"";
      if(byId("wo-actnum")) byId("wo-actnum").value = "";
      if(byId("wo-actdate")) byId("wo-actdate").value = todayISO();
      if(byId("wo-emp")) byId("wo-emp").value = r.responsibleEmployeeId||"";
      toast("Нусха олинди — акт рақамини киритиб сақланг");
    }); });
    container.querySelectorAll("[data-wo-print]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.writeoffs, b.getAttribute("data-wo-print")); if(r) opPrintDoc(writeoffOpDoc(r));
    }); });
    container.querySelectorAll("[data-wo-xls]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.writeoffs, b.getAttribute("data-wo-xls")); if(r) opExcelDoc(writeoffOpDoc(r), "Hisobdan_chiqarish");
    }); });
    container.querySelectorAll("[data-wo-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.writeoffs, b.getAttribute("data-wo-cancel")); if(!r) return;
      opCancelConfirm("Актни бекор қилиш", "«"+esc(r.itemName)+"» акти («№"+esc(r.actNumber||"—")+"») бекор қилиниб, "+fmtNum(r.quantity)+" омборга қайтарилсинми? Ёзув базада қолади.", function(){
        adjustStockBy(r.itemId, r.warehouseId, Number(r.quantity)||0);
        dbUpdate("writeoffs", r.id, {cancelled:true, cancelledAt:new Date().toISOString()}, STATE.writeoffs);
        toast("Бекор қилинди — омбор қолдиғи қайта ҳисобланди");
      });
    }); });
    container.querySelectorAll("[data-wo-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.writeoffs, b.getAttribute("data-wo-restore")); if(!r) return;
      openConfirm("Актни тиклаш", "Бу акт қайта тикланиб, "+fmtNum(r.quantity)+" омбордан яна чиқарилсинми?", "Ҳа, тиклаш", function(){
        adjustStockBy(r.itemId, r.warehouseId, -(Number(r.quantity)||0));
        dbUpdate("writeoffs", r.id, {cancelled:false, cancelledAt:""}, STATE.writeoffs);
        toast("Тикланди");
      }, true);
    }); });
  }
  function exportWriteoffsExcel(list){
    var headers = ["Маҳсулот/хомашё","Омбор","Миқдор","Сабаби","Акт №","Акт санаси","Масъул ходим"];
    var rowsArr = list.map(function(r){ return [r.itemName, warehouseName(r.warehouseId), fmtNum(r.quantity), r.reason||"", r.actNumber||"", fmtDateShort(r.actDate), r.responsibleEmployeeId?employeeName(r.responsibleEmployeeId):""]; });
    exportHtmlTableAsExcel("Hisobdan_chiqarish.xls", "Хисобдан чиқаришлар", headers, rowsArr);
  }
  function openWriteoffDetail(r){
    if(!r) return;
    var it = itemById(r.itemId);
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Маҳсулот/хомашё</div><div class="dd">'+esc(r.itemName||(it?it.name:"—"))+'</div></div>'+
      '<div><div class="dl">Омбор</div><div class="dd">'+esc(warehouseName(r.warehouseId))+'</div></div>'+
      '<div><div class="dl">Миқдори</div><div class="dd">'+fmtNum(r.quantity)+' '+esc(it?it.unit:"")+'</div></div>'+
      '<div><div class="dl">Акт рақами</div><div class="dd">№'+esc(r.actNumber||"—")+'</div></div>'+
      '<div><div class="dl">Акт санаси</div><div class="dd">'+fmtDate(r.actDate)+'</div></div>'+
      '<div><div class="dl">Масъул ходим</div><div class="dd">'+esc(r.responsibleEmployeeId?employeeName(r.responsibleEmployeeId):"—")+'</div></div>'+
      '<div><div class="dl">Акт файли</div><div class="dd">'+(r.fileUrl?('<a href="'+esc(r.fileUrl)+'" target="_blank">'+esc(r.fileName||"файл")+'</a>'):esc(r.fileName||"—"))+'</div></div>'+
      '</div>'+
      '<div class="field" style="margin-top:14px;margin-bottom:0;"><label>Сабаби</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(r.reason||"—")+'</div></div>';
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print title="Чоп этиш">'+ICONS.printer+'</button><button class="btn btn-primary" data-edit>Таҳрирлаш</button>';
    var m = openModal("Хисобдан чиқариш — №"+esc(r.actNumber||"—"), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelector("[data-print]").addEventListener("click", function(){ printWriteoffVoucher(r); });
    m.querySelector("[data-edit]").addEventListener("click", function(){ closeModal(); openWriteoffEditForm(r); });
  }
  function printWriteoffVoucher(r){
    if(!r) return;
    var it = itemById(r.itemId);
    var body = '<table>'+
      '<tr><td>Маҳсулот/хомашё</td><td style="text-align:right;">'+esc(r.itemName||(it?it.name:"—"))+'</td></tr>'+
      '<tr><td>Омбор</td><td style="text-align:right;">'+esc(warehouseName(r.warehouseId))+'</td></tr>'+
      '<tr><td>Миқдори</td><td style="text-align:right;">'+fmtNum(r.quantity)+' '+esc(it?it.unit:"")+'</td></tr>'+
      '<tr><td>Масъул ходим</td><td style="text-align:right;">'+esc(r.responsibleEmployeeId?employeeName(r.responsibleEmployeeId):"—")+'</td></tr>'+
      '</table>'+
      '<div style="margin-top:10px;">Сабаби: '+esc(r.reason||"—")+'</div>'+
      '<div class="v-sign"><div>Топширди</div><div>Қабул қилди</div></div>';
    var html = voucherShell("Хисобдан чиқариш — №"+esc(r.actNumber||"—"), "Сана: "+esc(fmtDateShort(r.actDate)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }
  function openWriteoffEditForm(r){
    if(!r) return;
    var body = '<div class="field-row"><div class="field"><label>Омбор</label><select id="woe-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(r.warehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Маҳсулот/хомашё</label>'+itemComboInputHtml("woe-item", "woe-item-datalist", itemById(r.itemId))+'</div></div>'+
      '<div class="field"><label>Миқдори</label><input id="woe-qty" type="number" min="0" step="any" value="'+esc(r.quantity)+'"></div>'+
      '<div class="field"><label>Сабаби</label><textarea id="woe-reason">'+esc(r.reason||"")+'</textarea></div>'+
      '<div class="field-row"><div class="field"><label>Акт рақами</label><input id="woe-actnum" value="'+esc(r.actNumber||"")+'"></div>'+
      '<div class="field"><label>Акт санаси</label><input id="woe-actdate" type="date" value="'+esc(r.actDate||todayISO())+'"></div></div>'+
      '<div class="field"><label>Масъул ходим</label><select id="woe-emp"><option value="">— танланг —</option>'+STATE.employees.map(function(e){return '<option value="'+e.id+'"'+(r.responsibleEmployeeId===e.id?" selected":"")+'>'+esc(e.fullName)+'</option>';}).join("")+'</select></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Хисобдан чиқаришни таҳрирлаш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var newWhId = m.querySelector("#woe-wh").value;
      var resolved = resolveItemFromComboValue(m.querySelector("#woe-item").value);
      var newItemId = resolved?resolved.id:"";
      var qty = Number(m.querySelector("#woe-qty").value)||0;
      var reason = m.querySelector("#woe-reason").value.trim();
      var actNumber = m.querySelector("#woe-actnum").value.trim();
      var actDate = m.querySelector("#woe-actdate").value||todayISO();
      var empId = m.querySelector("#woe-emp").value;
      if(!newWhId||!newItemId){ toast("Омбор ва маҳсулотни танланг"); return; }
      if(qty<=0){ toast("Миқдорни киритинг"); return; }
      if(!reason){ toast("Сабабини киритинг"); return; }
      if(!actNumber){ toast("Акт рақамини киритинг"); return; }
      var it = itemById(newItemId);
      /* эски эффект (омборга қайтариш) орқага қайтарилади, сўнгра янги қиймат билан қайта чиқарилади */
      adjustStockBy(r.itemId, r.warehouseId, Number(r.quantity)||0);
      adjustStockBy(newItemId, newWhId, -qty);
      dbUpdate("writeoffs", r.id, {warehouseId:newWhId, itemId:newItemId, itemName:it?it.name:"", quantity:qty, reason:reason, actNumber:actNumber, actDate:actDate, responsibleEmployeeId:empId}, STATE.writeoffs);
      toast("Хисобдан чиқариш янгиланди — омбор қолдиғи қайта ҳисобланди");
      closeModal();
    });
  }

  /* ---- Инвентаризация (Сўнгги инвентаризациялар) ---- */
  function renderInventorySide(container){
    var state = {from:STATE.recInvFrom, to:STATE.recInvTo, search:STATE.recInvSearch};
    var list = STATE.inventories.filter(function(r){
      if(!recMatchesDate(r.date, state.from, state.to)) return false;
      if(!recMatchesSearch(r.itemName, state.search)) return false;
      return true;
    }).sort(function(a,b){return (b.createdAt||"").localeCompare(a.createdAt||"");});
    var shown = list.slice(0,12);
    var html = '<div class="card" style="padding:18px 20px;"><h2 style="font-size:14px;font-weight:800;margin:0 0 10px;">Сўнгги инвентаризациялар</h2>'+
      recFilterToolbar("recInv", state, "Номи бўйича қидириш…")+
      (shown.length ? '<div style="display:flex;flex-direction:column;gap:8px;">'+shown.map(function(r){
        return '<div class="alert-row" style="align-items:flex-start;"'+opCancelledRowStyle(r.cancelled)+'><div class="grow"><div class="t">'+esc(r.itemName)+opCancelledChip(r.cancelled)+'</div><div class="s">'+esc(r.entityType==="equipment"?"Ускуна/жиҳоз":warehouseName(r.warehouseId))+' · '+fmtDateShort(r.date)+'</div></div><div style="display:flex;align-items:center;gap:4px;"><div class="num cell-strong" style="font-size:12px;white-space:nowrap;">'+(r.delta>=0?"+":"")+fmtNum(r.delta)+'</div>'+
          opActionsHtml("inv", r.id, r.cancelled)+
          '</div></div>';
      }).join("")+'</div>' : '<div style="text-align:center;color:var(--ink-3);font-size:13px;padding:16px 0;">Ҳали ёзув йўқ</div>')+
      '</div>';
    container.innerHTML = html;
    wireRecFilterToolbar(container, "recInv", state, function(){ exportInventoryExcel(list); });
    STATE.recInvFrom=state.from; STATE.recInvTo=state.to; STATE.recInvSearch=state.search;
    container.querySelectorAll("[data-inv-view]").forEach(function(b){ b.addEventListener("click", function(){ openInventoryDetail(STATE.inventories.find(function(x){return x.id===b.getAttribute("data-inv-view");})); }); });
    container.querySelectorAll("[data-inv-edit]").forEach(function(b){ b.addEventListener("click", function(){ openInventoryEditForm(STATE.inventories.find(function(x){return x.id===b.getAttribute("data-inv-edit");})); }); });
    container.querySelectorAll("[data-inv-copy]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.inventories, b.getAttribute("data-inv-copy")); if(!r) return;
      if(r.entityType==="equipment"){
        STATE.invKind = "equipment";
        STATE.invEqRows = [{equipmentId:r.equipmentId||"", counted:r.countedQty, price:(r.price!=null?r.price:"")}];
      } else {
        STATE.invKind = "item";
        STATE.invWh = r.warehouseId||"";
        STATE.invItemRows = [{itemId:r.itemId||"", counted:r.countedQty, price:(r.price!=null?r.price:""), priceAuto:false}];
      }
      STATE.whFormOpen = true; render();
      toast("Нусха олинди — текшириб, сақланг");
    }); });
    container.querySelectorAll("[data-inv-print]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.inventories, b.getAttribute("data-inv-print")); if(r) opPrintDoc(inventoryOpDoc(r));
    }); });
    container.querySelectorAll("[data-inv-xls]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.inventories, b.getAttribute("data-inv-xls")); if(r) opExcelDoc(inventoryOpDoc(r), "Inventarizatsiya");
    }); });
    container.querySelectorAll("[data-inv-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.inventories, b.getAttribute("data-inv-cancel")); if(!r) return;
      opCancelConfirm("Инвентаризацияни бекор қилиш", "«"+esc(r.itemName)+"» инвентаризация ёзуви бекор қилиниб, тизимдаги сон/қолдиқ аввалги ҳолатига ("+fmtNum(r.systemQty)+") қайтарилсинми? Ёзув базада қолади.", function(){
        if(r.entityType==="equipment"){
          if(r.equipmentId) dbUpdate("equipment", r.equipmentId, {qty:r.systemQty}, STATE.equipment);
        } else {
          setStockQty(r.itemId, r.warehouseId, r.systemQty);
        }
        dbUpdate("inventories", r.id, {cancelled:true, cancelledAt:new Date().toISOString()}, STATE.inventories);
        toast("Бекор қилинди — аввалги ҳолатга қайтарилди");
      });
    }); });
    container.querySelectorAll("[data-inv-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var r = opByIdFrom(STATE.inventories, b.getAttribute("data-inv-restore")); if(!r) return;
      openConfirm("Инвентаризацияни тиклаш", "Бу инвентаризация қайта тикланиб, сон/қолдиқ саналган қийматга ("+fmtNum(r.countedQty)+") қўйилсинми?", "Ҳа, тиклаш", function(){
        if(r.entityType==="equipment"){
          if(r.equipmentId) dbUpdate("equipment", r.equipmentId, {qty:r.countedQty}, STATE.equipment);
        } else {
          setStockQty(r.itemId, r.warehouseId, r.countedQty);
        }
        dbUpdate("inventories", r.id, {cancelled:false, cancelledAt:""}, STATE.inventories);
        toast("Тикланди");
      }, true);
    }); });
  }
  function exportInventoryExcel(list){
    var headers = ["Тури","Номи","Омбор","Тизимдаги (эски)","Саналган","Фарқ","Нархи","Жами сумма","Сана"];
    var rowsArr = list.map(function(r){ return [r.entityType==="equipment"?"Ускуна/жиҳоз":"Маҳсулот/хомашё", r.itemName, r.entityType==="equipment"?"—":warehouseName(r.warehouseId), fmtNum(r.systemQty), fmtNum(r.countedQty), (r.delta>=0?"+":"")+fmtNum(r.delta), fmtNum(r.price||0), fmtNum((Number(r.countedQty)||0)*(Number(r.price)||0)), fmtDateShort(r.date)]; });
    exportHtmlTableAsExcel("Inventarizatsiya.xls", "Инвентаризациялар", headers, rowsArr);
  }
  function openInventoryDetail(r){
    if(!r) return;
    var body = '<div class="detail-grid">'+
      '<div><div class="dl">Номи</div><div class="dd">'+esc(r.itemName)+'</div></div>'+
      '<div><div class="dl">Тури</div><div class="dd">'+(r.entityType==="equipment"?"Ускуна/жиҳоз":"Маҳсулот/хомашё")+'</div></div>'+
      (r.entityType==="equipment"?"":('<div><div class="dl">Омбор</div><div class="dd">'+esc(warehouseName(r.warehouseId))+'</div></div>'))+
      '<div><div class="dl">Сана</div><div class="dd">'+fmtDate(r.date)+'</div></div>'+
      '<div><div class="dl">Тизимдаги (эски) сон</div><div class="dd">'+fmtNum(r.systemQty)+'</div></div>'+
      '<div><div class="dl">Саналган сон</div><div class="dd">'+fmtNum(r.countedQty)+'</div></div>'+
      '<div><div class="dl">Фарқ</div><div class="dd" style="font-weight:800;color:'+(r.delta<0?"var(--critical)":(r.delta>0?"var(--good)":"inherit"))+';">'+(r.delta>=0?"+":"")+fmtNum(r.delta)+'</div></div>'+
      '<div><div class="dl">Нархи (1 дона)</div><div class="dd">'+fmtSum(r.price||0)+'</div></div>'+
      '<div><div class="dl">Жами сумма</div><div class="dd">'+fmtSum((Number(r.countedQty)||0)*(Number(r.price)||0))+'</div></div>'+
      '</div>'+
      (r.note?('<div class="field" style="margin-top:14px;margin-bottom:0;"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);">'+esc(r.note)+'</div></div>'):"");
    var foot = '<button class="btn btn-secondary" data-close>Ёпиш</button><button class="btn btn-secondary btn-icon" data-print title="Чоп этиш">'+ICONS.printer+'</button><button class="btn btn-primary" data-edit>Таҳрирлаш</button>';
    var m = openModal("Инвентаризация — "+esc(r.itemName), body, foot, true);
    m.querySelector("[data-close]").addEventListener("click", closeModal);
    m.querySelector("[data-print]").addEventListener("click", function(){ printInventoryVoucher(r); });
    m.querySelector("[data-edit]").addEventListener("click", function(){ closeModal(); openInventoryEditForm(r); });
  }
  /* Инвентаризацияни таҳрирлаш — фақат САНАЛГАН (countedQty) миқдорни,
     нархини (маҳсулот/хомашё учун) ва изоҳни ўзгартиришга рухсат беради
     (тизимдаги "эски" қолдиқ, омбор ва маҳсулотнинг ўзи ўзгартирилмайди —
     булар ёзув яратилган пайтдаги ҳақиқий ҳолат). Сақлашда: аввал ЭСКИ
     таъсир (countedQty) орқага қайтарилиб, тизим "эски" (systemQty)
     ҳолатига қайтарилади, сўнгра ЯНГИ саналган миқдор қўлланилади — худди
     бошқа таҳрирлаш формаларидаги (Кирим, Лом кирим) "орқага қайтариш +
     қайта қўллаш" андозаси каби. */
  function openInventoryEditForm(r){
    if(!r) return;
    var isEquip = r.entityType==="equipment";
    var body = '<div class="field-hint" style="margin-bottom:10px;">'+esc(r.itemName)+(isEquip?"":(" · "+warehouseName(r.warehouseId)))+' · Тизимдаги (эски) сон: <strong>'+fmtNum(r.systemQty)+'</strong></div>'+
      '<div class="field"><label>Саналган (ҳақиқий) сон</label><input id="inve-counted" type="number" min="0" step="any" value="'+esc(r.countedQty)+'"></div>'+
      (isEquip?"":'<div class="field"><label>Нархи</label><input id="inve-price" type="number" min="0" step="any" value="'+esc(r.price||0)+'"></div>')+
      '<div class="field"><label>Сана</label><input id="inve-date" type="date" value="'+esc(r.date||todayISO())+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="inve-note">'+esc(r.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Инвентаризацияни таҳрирлаш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var counted = Number(m.querySelector("#inve-counted").value)||0;
      var date = m.querySelector("#inve-date").value||todayISO(), note = m.querySelector("#inve-note").value.trim();
      var priceEl = m.querySelector("#inve-price");
      var price = priceEl ? (Number(priceEl.value)||0) : 0;
      if(isEquip){
        if(r.equipmentId) dbUpdate("equipment", r.equipmentId, {qty:counted}, STATE.equipment);
      } else {
        setStockQty(r.itemId, r.warehouseId, counted);
        if(priceEl) dbUpdate("items", r.itemId, {price:price, updatedAt:new Date().toISOString()}, STATE.items);
      }
      dbUpdate("inventories", r.id, {countedQty:counted, delta:counted-Number(r.systemQty||0), price:priceEl?price:r.price, date:date, note:note}, STATE.inventories);
      toast("Инвентаризация янгиланди");
      closeModal();
    });
  }
  function printInventoryVoucher(r){
    if(!r) return;
    var body = '<table>'+
      '<tr><td>Номи</td><td style="text-align:right;">'+esc(r.itemName)+'</td></tr>'+
      (r.entityType==="equipment"?"":('<tr><td>Омбор</td><td style="text-align:right;">'+esc(warehouseName(r.warehouseId))+'</td></tr>'))+
      '<tr><td>Тизимдаги (эски) сон</td><td style="text-align:right;">'+fmtNum(r.systemQty)+'</td></tr>'+
      '<tr><td>Саналган сон</td><td style="text-align:right;">'+fmtNum(r.countedQty)+'</td></tr>'+
      '<tr><td>Фарқ</td><td style="text-align:right;">'+(r.delta>=0?"+":"")+fmtNum(r.delta)+'</td></tr>'+
      '<tr><td>Нархи (1 дона)</td><td style="text-align:right;">'+fmtSum(r.price||0)+'</td></tr>'+
      '<tr><td>Жами сумма</td><td style="text-align:right;">'+fmtSum((Number(r.countedQty)||0)*(Number(r.price)||0))+'</td></tr>'+
      '</table>'+
      (r.note?'<div style="margin-top:10px;">Изоҳ: '+esc(r.note)+'</div>':'')+
      '<div class="v-sign"><div>Ҳисобловчи</div><div>Тасдиқловчи</div></div>';
    var html = voucherShell("Инвентаризация — "+esc(r.itemName), "Сана: "+esc(fmtDateShort(r.date)), body);
    document.getElementById("printArea").innerHTML = html;
    setTimeout(function(){ window.print(); }, 60);
  }

  function openReceiptEditForm(r){
    if(!r) return;
    var body = ''+
      '<div class="field-row"><div class="field"><label>Омбор</label><select id="re-wh">'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(r.warehouseId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Маҳсулот/хомашё</label>'+itemComboInputHtml("re-item", "re-item-datalist", itemById(r.itemId))+'</div></div>'+
      '<div class="field"><label>Ташкилот (таъминотчи) <span class="opt">(ихтиёрий)</span></label><div style="display:flex;gap:6px;"><input id="re-supplier" list="re-supplier-list" value="'+esc(r.supplierName||"")+'" style="flex:1;min-width:0;"><button type="button" class="btn btn-secondary btn-icon" id="re-supplier-add" title="Тўлиқ реквизитлари билан янги ташкилот қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div><datalist id="re-supplier-list">'+STATE.suppliers.map(function(s){return '<option value="'+esc(s.name)+'">';}).join("")+'</datalist></div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:10px;margin-bottom:14px;">'+
        '<div class="field" style="margin-bottom:0;"><label>Миқдори</label><input id="re-qty" type="number" min="0" step="any" value="'+esc(r.quantity)+'"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>Нархи (ККСсиз)</label><input id="re-price" type="number" min="0" step="any" value="'+esc(r.priceNoVat)+'"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>ККС (%)</label><input id="re-vat" type="number" min="0" step="any" value="'+esc(r.vatRate)+'"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>Нархи (ККС билан)</label><input id="re-price-vat" type="text" value="0 сўм" disabled style="font-weight:700;"></div>'+
        '<div class="field" style="margin-bottom:0;"><label>Сумма (жами)</label><input id="re-line-sum" type="text" value="0 сўм" disabled style="font-weight:800;color:var(--accent);"></div>'+
      '</div>'+
      '<div class="field"><label>Сана</label><input id="re-date" type="date" value="'+esc(r.date||todayISO())+'"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="re-note">'+esc(r.note||"")+'</textarea></div>'+
      '<div class="field-hint">Тўланган сумма ва касса ёзуви бу ерда ўзгартирилмайди — уларни тўғридан-тўғри «Касса» бўлимида тўғриланг.</div>'+
      '<div class="card" style="padding:14px 16px;background:var(--surface-2);">'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Жами (ККСсиз)</span><span class="num" id="re-sum-novat">0 сўм</span></div>'+
        '<div style="display:flex;justify-content:space-between;"><span style="font-weight:800;">ЖАМИ (ККС билан)</span><span class="num" id="re-sum-total" style="font-size:16px;font-weight:700;">0 сўм</span></div>'+
      '</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Киримни таҳрирлаш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var recompute = function(){
      var qty=Number(m.querySelector("#re-qty").value)||0, price=Number(m.querySelector("#re-price").value)||0, vat=Number(m.querySelector("#re-vat").value)||0;
      var priceWithVat = price + price*vat/100;
      var totalNoVat=qty*price, vatSum=totalNoVat*vat/100, total=totalNoVat+vatSum;
      m.querySelector("#re-price-vat").value = fmtSum(priceWithVat);
      m.querySelector("#re-line-sum").value = fmtSum(total);
      m.querySelector("#re-sum-novat").textContent=fmtSum(totalNoVat);
      m.querySelector("#re-sum-total").textContent=fmtSum(total);
    };
    ["re-qty","re-price","re-vat"].forEach(function(id){ m.querySelector("#"+id).addEventListener("input", recompute); });
    recompute();
    var reSupAddBtn = m.querySelector("#re-supplier-add");
    if(reSupAddBtn) reSupAddBtn.addEventListener("click", function(){
      /* the app only supports one open modal at a time (a single shared
         modalRoot), so the supplier-add modal can't simply stack on top of
         this edit modal — it would silently replace it. Snapshot every
         field, close this modal, let the supplier modal do its thing, then
         reopen the receipt editor pre-filled with everything the user had
         already typed plus the newly created supplier's name. */
      var reItemResolved0 = resolveItemFromComboValue(m.querySelector("#re-item").value);
      var draft = Object.assign({}, r, {
        warehouseId: m.querySelector("#re-wh").value,
        itemId: reItemResolved0 ? reItemResolved0.id : r.itemId,
        quantity: m.querySelector("#re-qty").value,
        priceNoVat: m.querySelector("#re-price").value,
        vatRate: m.querySelector("#re-vat").value,
        date: m.querySelector("#re-date").value,
        note: m.querySelector("#re-note").value,
        supplierName: m.querySelector("#re-supplier").value
      });
      closeModal();
      openSupplierForm(null, function(supplierId, supplierName){
        draft.supplierName = supplierName||"";
        openReceiptEditForm(draft);
      });
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var supplierNameVal = m.querySelector("#re-supplier").value.trim();
      var newWhId = m.querySelector("#re-wh").value;
      var reItemResolved = resolveItemFromComboValue(m.querySelector("#re-item").value);
      var newItemId = reItemResolved ? reItemResolved.id : "";
      var qty=Number(m.querySelector("#re-qty").value)||0, price=Number(m.querySelector("#re-price").value)||0, vat=Number(m.querySelector("#re-vat").value)||0;
      var date=m.querySelector("#re-date").value||todayISO(), note=m.querySelector("#re-note").value.trim();
      if(!newWhId||!newItemId){ toast("Омбор ва рўйхатдан тўғри маҳсулотни танланг"); return; }
      if(qty<=0){ toast("Миқдорни киритинг"); return; }
      var it = itemById(newItemId);
      var vatSum=qty*price*vat/100, totalNoVat=qty*price, totalWithVat=totalNoVat+vatSum;
      var paid = Number(r.paidAmount)||0;
      if(paid>totalWithVat) paid=totalWithVat;
      var payableAmount = Math.max(0, totalWithVat-paid);
      var finish = function(supplierId, supplierNameFinal){
        /* undo the old stock effect, then apply the new one — never lose the physical quantity difference */
        adjustStockBy(r.itemId, r.warehouseId, -(Number(r.quantity)||0));
        adjustStockBy(newItemId, newWhId, qty);
        dbUpdate("items", newItemId, {price:price, updatedAt:new Date().toISOString()}, STATE.items);
        dbUpdate("receipts", r.id, {
          warehouseId:newWhId, itemId:newItemId, itemName:it?it.name:"", quantity:qty, priceNoVat:price, vatRate:vat,
          vatSum:vatSum, totalNoVat:totalNoVat, totalWithVat:totalWithVat, payableAmount:payableAmount,
          supplierId:supplierId||"", supplierName:supplierNameFinal||"", date:date, note:note
        }, STATE.receipts);
        toast("Кирим янгиланди — омбор қолдиғи қайта ҳисобланди");
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

  function viewWarehouse(){
    /* "buyurtma" (Буюртма) фойдаланувчи сўровига кўра (2026-09-30) "Омбор 2"
       бўлимидан бу ерга кўчирилди — функциянинг ўзи (renderWh2Buyurtma) ва
       унинг маълумотлари (STATE.wh2Orders) ўша номи билан қолди, фақат
       қайси бўлимдан очилиши ўзгарди (қаранг: renderWh2Buyurtma ичидаги
       изоҳ). */
    if(STATE.whView==="buyurtma") return renderWh2Buyurtma();
    if(STATE.whView==="receipts") return renderWhReceipts();
    if(STATE.whView==="lomreceipt") return renderLomReceiptTab();
    if(STATE.whView==="lomreturn") return renderLomReturnTab();
    if(STATE.whView==="suppliers") return renderSuppliers();
    if(STATE.whView==="transfers") return renderWhTransfers();
    if(STATE.whView==="writeoffs") return renderWhWriteoffs();
    if(STATE.whView==="inventory") return renderWhInventory();
    if(STATE.whView==="equipment") return renderWhEquipmentPanel();
    if(STATE.whView==="manage") return renderWhManage();
    if(STATE.whView==="sales") return renderWhSalesView();
    return renderWhStock();
  }

  /* 2026-10-03 сўровига кўра: "Омборлар" бўлимига янги "Сотув" таби
     қўшилди — унда "Савдо" менюсидаги операциялар кўринади, лекин фақат
     қисқача (Тартиб рақами, Санаси, Мижоз номи ва "Когозга чиқариш"
     тугмаси) — бошқа ҳеч қандай маълумот (сумма, ҳолат, таҳрирлаш/бекор
     қилиш тугмалари) кўринмайди. Сотувнинг ўзи (STATE.sales) ва уни чоп
     этиш (printSaleWaybill) "Савдо" бўлими билан бир хил — фақат шу ерда
     соддалаштирилган рўйхат кўринишида кўрсатилади. */
  function renderWhSalesView(){
    setTopbar("Омборлар — Сотув", STATE.sales.length+" та сотув", "");
    var root = document.getElementById("content");
    var list = STATE.sales.slice().sort(function(a,b){
      var an=Number(a.saleNumber)||0, bn=Number(b.saleNumber)||0;
      if(an!==bn) return bn-an;
      return (b.createdAt||"").localeCompare(a.createdAt||"");
    });
    var html = whSubnav("sales");
    if(!list.length){
      html += emptyState("Ҳали сотув йўқ","«Савдо» бўлимида биринчи сотувни киритинг.");
    } else {
      var rows = list.map(function(s){
        return '<tr'+(s.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted num">'+(s.saleNumber!=null?esc(s.saleNumber):"—")+'</td>'+
          '<td class="cell-muted">'+fmtDateShort(s.date||(s.createdAt||"").slice(0,10))+'</td>'+
          '<td class="cell-strong">'+esc(s.customerName||"—")+'</td>'+
          '<td><div class="row-actions"><button class="btn btn-ghost btn-icon" data-whsale-print="'+s.id+'" title="Когозга чиқариш">'+ICONS.printer+'</button></div></td>'+
          '</tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Тартиб рақами</th><th>Санаси</th><th>Мижоз номи</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireWhSubnav(root);
    root.querySelectorAll("[data-whsale-print]").forEach(function(b){ b.addEventListener("click", function(){ printSaleWaybill(list.find(function(x){return x.id===b.getAttribute("data-whsale-print");})); }); });
  }

  function renderWhStock(){
    setTopbar("Омборлар — Ҳисобот", STATE.items.length+" та маҳсулот тури", '<button class="btn btn-primary" id="addItemBtn">'+ICONS.plus+'Янги яратиш</button>');
    var typeFilter = STATE.whTypeFilter, whFilter = STATE.whWarehouseFilter, catFilter = STATE.whCategoryFilter, search=(STATE.whSearch||"").trim().toLowerCase();
    /* категория рўйхати танланган тур бўйича торайтирилади: фақат шу турдаги
       маҳсулотларда ҳақиқатан ишлатилаётган категориялар кўрсатилади. */
    var catsInUse = {};
    STATE.items.forEach(function(it){
      if(typeFilter && it.itemType!==typeFilter) return;
      if(it.categoryId) catsInUse[it.categoryId]=true;
    });
    var catsForType = STATE.categories.filter(function(c){ return catsInUse[c.id]; });
    var list = STATE.items.filter(function(it){
      if(typeFilter && it.itemType!==typeFilter) return false;
      if(catFilter && it.categoryId!==catFilter) return false;
      if(search && (it.name||"").toLowerCase().indexOf(search)===-1) return false;
      return true;
    }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });

    var html = whSubnav("stock") + sampleBanner();
    html += '<div class="filter-row">'+
      '<button class="pill-filter'+(!typeFilter?" active":"")+'" data-type="">Барчаси</button>'+
      ITEM_TYPES.map(function(t){ return '<button class="pill-filter'+(typeFilter===t[0]?" active":"")+'" data-type="'+t[0]+'">'+t[1]+'</button>'; }).join("")+
      '<select id="whFilterSelect" style="padding:7px 10px;border-radius:999px;border:1px solid var(--border-strong);background:var(--surface);font-size:12.5px;font-weight:700;color:var(--ink-2);">'+
        '<option value="">Барча омборлар</option>'+STATE.warehouses.map(function(w){return '<option value="'+w.id+'"'+(whFilter===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+
      '</select>'+
      '<select id="whCatFilterSelect" style="padding:7px 10px;border-radius:999px;border:1px solid var(--border-strong);background:var(--surface);font-size:12.5px;font-weight:700;color:var(--ink-2);">'+
        '<option value="">Барча категориялар</option>'+catsForType.map(function(c){return '<option value="'+c.id+'"'+(catFilter===c.id?" selected":"")+'>'+esc(c.name)+'</option>';}).join("")+
      '</select>'+
      '<div class="search-box">'+ICONS.search+'<input type="text" id="whSearchInput" placeholder="Номи бўйича қидириш…" value="'+esc(STATE.whSearch||"")+'"></div>'+
      '</div>';

    if(!list.length){
      html += emptyState("Ҳали маҳсулот/хомашё йўқ","Ҳисоботни кузатиш учун юқоридаги тугма орқали яратинг.");
    } else {
      var ledgerAgg = stockLedgerAggregate(whFilter||"");
      var rows = list.map(function(it){
        var qty = whFilter ? stockQty(it.id, whFilter) : totalStockQty(it.id);
        var minQty = Number(it.minQuantity||0);
        var isLow = qty<=0 || qty<=minQty;
        var lg = ledgerAgg[it.id] || {kirimQty:0,kirimSum:0,chikimQty:0,chikimSum:0};
        var kirimPrice = lg.kirimQty>0 ? lg.kirimSum/lg.kirimQty : 0;
        var chikimPrice = lg.chikimQty>0 ? lg.chikimSum/lg.chikimQty : 0;
        /* "Нархи" устуни — қўлда киритилган it.price эмас, балки қолдиқ
           маҳсулотнинг БИР БИРЛИГИНИ ўртача нархи: барча (шу филтрдаги)
           кирим ёзувлари бўйича ўртача кирим нархи (kirimPrice) — агар
           ҳали кирим бўлмаган бўлса, қўлда киритилган it.price'га
           тушади. Бу ФАҚАТ шу жадвалдаги кўрсатиш учун — it.price'нинг
           ўзи (маҳсулот карточкасидаги "Нархи" майдони) ҳеч қачон бу
           ерда автоматик қайта ёзилмайди. */
        var maxQty = Number(it.maxQuantity||0);
        var isHigh = maxQty>0 && qty>maxQty;
        var avgPrice = lg.kirimQty>0 ? kirimPrice : (Number(it.price)||0);
        var totalValue = qty*avgPrice;
        var lowStyle = (isLow||isHigh) ? 'style="color:var(--critical);font-weight:800;"' : "";
        return '<tr>'+
          '<td class="cell-strong">'+esc(it.name)+'</td>'+
          '<td>'+itemTypeChip(it.itemType)+'</td>'+
          '<td class="cell-muted">'+esc(categoryName(it.categoryId))+'</td>'+
          '<td class="cell-muted">'+esc(it.location||"—")+'</td>'+
          '<td class="num" style="color:var(--good);">'+fmtNum(lg.kirimQty)+' '+esc(it.unit)+'</td>'+
          '<td class="num cell-muted">'+(lg.kirimQty>0?fmtSum(kirimPrice):"—")+'</td>'+
          '<td class="num" style="color:var(--critical);">'+fmtNum(lg.chikimQty)+' '+esc(it.unit)+'</td>'+
          '<td class="num cell-muted">'+(lg.chikimQty>0?fmtSum(chikimPrice):"—")+'</td>'+
          '<td class="num" '+lowStyle+'>'+fmtNum(qty)+' '+esc(it.unit)+'</td>'+
          '<td class="num" '+lowStyle+'>'+fmtSum(totalValue)+'</td>'+
          '<td class="cell-muted num">'+fmtNum(minQty)+' '+esc(it.unit)+'</td>'+
          '<td class="cell-muted num" '+(isHigh?'style="color:var(--critical);font-weight:800;"':'')+'>'+(maxQty>0?fmtNum(maxQty)+' '+esc(it.unit):"—")+'</td>'+
          '<td class="num cell-strong">'+fmtSum(avgPrice)+'</td>'+
          '<td>'+stockStatusChip(qty, it.minQuantity, it.maxQuantity)+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-view-ledger="'+it.id+'" title="Тарихни кўриш">'+ICONS.eye+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-edit-item="'+it.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-del-item="'+it.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
          '</div></td>'+
        '</tr>';
      }).join("");
      html += '<div class="table-wrap table-frozen"><table><thead><tr><th>Номи</th><th>Тури</th><th>Категория</th><th>Омбордаги ўрни</th><th>Кирим</th><th>Кирим нарх</th><th>Чиқим</th><th>Чиқим нарх</th><th>'+(whFilter?"Омбордаги":"Жами")+' қолдиқ</th><th>Жами қолдиқ нархи</th><th>Минимал</th><th>Максимал</th><th>Нархи (ўртача)</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    var root = document.getElementById("content");
    root.innerHTML = html;
    wireSampleBanner(root);
    wireWhSubnav(root);
    document.getElementById("addItemBtn").addEventListener("click", function(){ openItemForm(null); });
    root.querySelectorAll("[data-type]").forEach(function(b){ b.addEventListener("click", function(){
      STATE.whTypeFilter=b.getAttribute("data-type");
      /* тур ўзгарса, олдин танланган категория янги турга мос келмаслиги
         мумкин — шунга кўра категория филтри ҳам тозаланади */
      STATE.whCategoryFilter="";
      render();
    }); });
    document.getElementById("whFilterSelect").addEventListener("change", function(){ STATE.whWarehouseFilter=this.value; render(); });
    document.getElementById("whCatFilterSelect").addEventListener("change", function(){ STATE.whCategoryFilter=this.value; render(); });
    var s = document.getElementById("whSearchInput");
    s.addEventListener("input", function(){
      STATE.whSearch = s.value; render();
      var e2 = document.getElementById("whSearchInput");
      if(e2){ e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); }
    });
    root.querySelectorAll("[data-view-ledger]").forEach(function(b){ b.addEventListener("click", function(){ openItemLedgerModal(list.find(function(x){return x.id===b.getAttribute("data-view-ledger");})); }); });
    root.querySelectorAll("[data-edit-item]").forEach(function(b){ b.addEventListener("click", function(){ requireAdmin(function(){ openItemForm(list.find(function(x){return x.id===b.getAttribute("data-edit-item");})); }); }); });
    root.querySelectorAll("[data-del-item]").forEach(function(b){ b.addEventListener("click", function(){
      var it = list.find(function(x){return x.id===b.getAttribute("data-del-item");});
      requireAdmin(function(){
        openConfirm("Ўчириш", "«"+it.name+"» рўйхатдан бутунлай ўчирилсинми? Барча омборлардаги қолдиқ маълумоти ҳам йўқолади.", "Ҳа, ўчириш", function(){
          STATE.stock.filter(function(s2){return s2.itemId===it.id;}).forEach(function(s2){ dbDelete("stock", s2.id, STATE.stock); });
          dbDelete("items", it.id, STATE.items);
          toast("Ўчирилди");
        }, true);
      });
    }); });
  }

  function openItemForm(existing, onSaved){
    var isEdit = !!(existing && existing.id);
    var it = existing || {name:"", itemType:"xomashyo", unit:UNIT_OPTIONS[0], minQuantity:0, maxQuantity:0, price:0, categoryId:"", location:""};
    var body = '<div class="field"><label>Номи</label><input id="i-name" placeholder="Масалан: Лист металл 2мм" value="'+esc(it.name)+'"></div>'+
      '<div class="field-row"><div class="field"><label>Тури</label><select id="i-type">'+ITEM_TYPES.map(function(t){return '<option value="'+t[0]+'"'+(it.itemType===t[0]?" selected":"")+'>'+t[1]+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Ўлчов бирлиги</label><select id="i-unit">'+allUnitOptions().map(function(u){return '<option'+(it.unit===u?" selected":"")+'>'+u+'</option>';}).join("")+'</select></div></div>'+
      '<div class="field-row"><div class="field"><label>Категория</label><select id="i-cat"><option value="">— танланмаган —</option>'+STATE.categories.map(function(c){return '<option value="'+c.id+'"'+(it.categoryId===c.id?" selected":"")+'>'+esc(c.name)+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Минимал захира <span class="opt">(ихтиёрий)</span></label><input id="i-min" type="number" min="0" step="any" value="'+esc(it.minQuantity||0)+'"><div class="field-hint">Қолдиқ шундан кам бўлса — огоҳлантиради.</div></div></div>'+
      '<div class="field-row"><div class="field"><label>Максимал захира <span class="opt">(ихтиёрий)</span></label><input id="i-max" type="number" min="0" step="any" value="'+esc(it.maxQuantity||0)+'"><div class="field-hint">Қолдиқ шундан ошиб кетса — огоҳлантиради (масалан: чиқинди/кул тўпланиб кетмаслиги учун). 0 — чекланмаган.</div></div>'+
      '<div class="field"><label>Нархи (сўм, 1 бирлик)</label><input id="i-price" type="number" min="0" step="any" value="'+esc(it.price||0)+'"><div class="field-hint">Кирим ёки калькуляция киритилганда автоматик янгиланиб боради.</div></div></div>'+
      '<div class="field"><label>Омбордаги ўрни <span class="opt">(ихтиёрий)</span></label><input id="i-location" placeholder="Масалан: 3-стеллаж, B қатор" value="'+esc(it.location||"")+'"></div>'+
      '<div class="field"><label>Қайси цехга тегишли <span class="opt">(ихтиёрий, бир нечтасини белгилаш мумкин)</span></label><div style="display:flex;flex-wrap:wrap;gap:6px 0;">'+dwCheckboxesHtml("i-dw", isEdit?dwItemKeys(it):[])+'</div><div class="field-hint">Бошқарув панелида цех ҳисоботига шу орқали киради.</div></div>'+
      (isEdit ? '' : '<div class="field-row"><div class="field"><label>Бошланғич қолдиқ</label><input id="i-startQty" type="number" min="0" step="any" placeholder="0" value="0"></div>'+
        '<div class="field"><label>Омбор</label><select id="i-startWh">'+(STATE.warehouses.length?STATE.warehouses.map(function(w){return '<option value="'+w.id+'">'+esc(w.name)+'</option>';}).join(""):'<option value="">Аввал омбор яратинг</option>')+'</select></div></div>');
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Яратиш")+'</button>';
    var m = openModal(isEdit?"Таҳрирлаш":"Янги яратиш", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#i-name").value.trim();
      if(!name){ toast("Номини киритинг"); return; }
      var data = {
        name:name, itemType:m.querySelector("#i-type").value, unit:m.querySelector("#i-unit").value,
        categoryId:m.querySelector("#i-cat").value, minQuantity:Number(m.querySelector("#i-min").value)||0,
        maxQuantity:Number(m.querySelector("#i-max").value)||0,
        price:Number(m.querySelector("#i-price").value)||0, location:m.querySelector("#i-location").value.trim(), updatedAt:new Date().toISOString()
      };
      var dwKeys = dwReadCheckboxes(m, "i-dw");
      if(isEdit){
        data.workshopIds = dwMergeItemIds(dwItemIds(it), dwKeys);
        dbUpdate("items", it.id, data, STATE.items);
        toast("Сақланди");
        closeModal();
        if(onSaved) onSaved(it.id, data.name);
      } else {
        data.createdAt = new Date().toISOString();
        if(dwKeys.length) data.workshopIds = dwMergeItemIds([], dwKeys);
        var qtyInput = m.querySelector("#i-startQty"), whInput = m.querySelector("#i-startWh");
        var qty = qtyInput ? (Number(qtyInput.value)||0) : 0;
        var whSel = whInput ? whInput.value : "";
        /* Use a deterministic id up front (instead of the old async
           tempId-then-reconcile pattern) so any code that immediately
           references this item's id — e.g. setStockQty here, or a caller
           like the Receipt form's inline "add new item" flow — always gets
           the FINAL id. The old pattern could hand out a temporary
           "_pending_..." id that got baked into a stock document's own
           composite id (itemId+"__"+warehouseId), which reconcilePendingId
           can only fix on value fields, not on a document's own composite
           id, permanently orphaning that stock record. */
        var newId = uid();
        dbSet("items", newId, data, STATE.items);
        if(qty>0 && whSel) setStockQty(newId, whSel, qty);
        toast("Яратилди");
        closeModal();
        if(onSaved) onSaved(newId, data.name);
      }
    });
  }

