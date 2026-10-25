  /* ================= view: orders ================= */
  function ordersTable(list, compact){
    var rows = list.map(function(o){
      var st = orderStatus(o);
      var stageIdx = o.completed ? STAGE_NAMES.length : Math.min((o.currentStageIndex||0)+1, STAGE_NAMES.length);
      var pct = Math.round((stageIdx/STAGE_NAMES.length)*100);
      var pr = PRIORITY[o.priority] || PRIORITY.orta;
      return '<tr data-order="'+o.id+'"'+(!compact && o.cancelled?' style="opacity:.5;"':'')+'>'+
        '<td class="cell-strong num">'+esc(o.orderNumber)+'</td>'+
        (compact ? '' : '<td class="cell-muted">'+fmtDateShort(o.date||(o.createdAt||"").slice(0,10))+'</td>') +
        '<td>'+esc(o.customer)+'</td>'+
        '<td>'+orderProductSummary(o)+(compact?'':'<div class="cell-muted" style="font-size:11.5px;">'+fmtSum(o.totalAmount||0)+'</div>')+'</td>'+
        (compact ? '' : '<td><div class="cell-muted" style="font-size:11.5px;margin-bottom:3px;">'+esc(orderStageLabel(o))+'</div><div class="progress-mini"><div class="progress-track"><div class="progress-fill'+(o.completed?" is-done":"")+'" style="width:'+pct+'%"></div></div><div class="progress-text">'+stageIdx+'/'+STAGE_NAMES.length+'</div></div></td>') +
        (compact ? '' : '<td class="cell-muted">'+(o.workshopId?esc(workshopName(o.workshopId)):"—")+'</td>') +
        '<td class="cell-muted">'+fmtDateShort(o.dueDate)+'</td>'+
        (compact ? '' : '<td class="cell-muted" style="font-size:11.5px;">'+esc(orderDaysLabel(o))+'</td>') +
        (compact ? '' : '<td><span class="chip '+pr.chip+'">'+pr.label+'</span></td>') +
        '<td><span class="chip '+st.chip+'">'+st.label+'</span></td>'+
        (compact ?
          '<td><div class="row-actions"><button class="btn btn-ghost btn-icon" data-view-order="'+o.id+'" title="Кўриш">'+ICONS.eye+'</button></div></td>'
          :
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-view-order="'+o.id+'" title="Кўриш">'+ICONS.eye+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-print-order="'+o.id+'" title="Чоп этиш">'+ICONS.printer+'</button>'+
            (o.cancelled ?
              '<button class="btn btn-ghost btn-icon" data-restore-order="'+o.id+'" title="Тиклаш">'+ICONS.restore+'</button>'
              :
              '<button class="btn btn-ghost btn-icon" data-edit-order="'+o.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
              '<button class="btn btn-ghost btn-icon" data-cancel-order-row="'+o.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>'
            )+
          '</div></td>') +
        '</tr>';
    }).join("");
    return '<div class="table-wrap"><table><thead><tr><th>Рақам</th>'+(compact?'':'<th>Сана</th>')+'<th>Харидор</th><th>Маҳсулот</th>'+(compact?'':'<th>Босқич</th>')+(compact?'':'<th>Цех</th>')+'<th>Муддат</th>'+(compact?'':'<th>Муддат ҳолати</th>')+(compact?'':'<th>Муҳимлик</th>')+'<th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
  function wireOrderRowButtons(root){
    root.querySelectorAll("[data-view-order]").forEach(function(btn){
      btn.addEventListener("click", function(e){ e.stopPropagation(); openOrderDetail(btn.getAttribute("data-view-order")); });
    });
    root.querySelectorAll("[data-edit-order]").forEach(function(btn){
      btn.addEventListener("click", function(e){ e.stopPropagation(); var o=STATE.orders.find(function(x){return x.id===btn.getAttribute("data-edit-order");}); if(o) openOrderForm(o); });
    });
    root.querySelectorAll("[data-print-order]").forEach(function(btn){
      btn.addEventListener("click", function(e){ e.stopPropagation(); var o=STATE.orders.find(function(x){return x.id===btn.getAttribute("data-print-order");}); if(o) printOrderWaybill(o); });
    });
    root.querySelectorAll("[data-cancel-order-row]").forEach(function(btn){
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        var o=STATE.orders.find(function(x){return x.id===btn.getAttribute("data-cancel-order-row");}); if(!o) return;
        openConfirm("Буюртмани бекор қилиш", "«"+o.orderNumber+"» буюртмаси бекор қилинсинми? Буюртма тарихда хира кўринишда қолади, кейин \"Тиклаш\" тугмаси орқали қайта тикланиши мумкин.", "Ҳа, бекор қилиш", function(){
          dbUpdate("orders", o.id, {cancelled:true}, STATE.orders);
          toast("Буюртма бекор қилинди");
        }, true);
      });
    });
    root.querySelectorAll("[data-restore-order]").forEach(function(btn){
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        var o=STATE.orders.find(function(x){return x.id===btn.getAttribute("data-restore-order");}); if(!o) return;
        openConfirm("Буюртмани тиклаш", "«"+o.orderNumber+"» буюртмаси қайта тикланиб, амалдаги буюртмалар рўйхатига қайтарилсинми?", "Ҳа, тиклаш", function(){
          dbUpdate("orders", o.id, {cancelled:false}, STATE.orders);
          toast("Буюртма тикланди");
        }, true);
      });
    });
    root.querySelectorAll("tr[data-order]").forEach(function(tr){
      tr.style.cursor="pointer";
      tr.addEventListener("click", function(){ openOrderDetail(tr.getAttribute("data-order")); });
    });
  }

  function viewOrders(){
    setTopbar("Харидор буюртмаси", STATE.orders.length+" та буюртма", '<button class="btn btn-primary" id="addOrderBtn">'+ICONS.plus+'Янги буюртма</button>');
    var filters = [["all","Барчаси"],["progress","Жараёнда"],["overdue","Кечикди"],["completed",STAGE_NAMES[STAGE_DELIVERED_IDX]],["cancelled","Бекор қилинди"]];
    var list = STATE.orders.filter(function(o){
      /* Фақат амалдаги (жараёндаги) буюртмалар — тепадаги галочка: белги
         қўйилса бажарилган ва бекор қилинган буюртмалар рўйхатдан яшириниб,
         фақат жараёндаги буюртмалар кўринади (2026-10-03 сўровига кўра). */
      if(STATE.ordersActiveOnly && (o.completed || o.cancelled)) return false;
      if(STATE.ordersFilter!=="all" && orderStatus(o).key!==STATE.ordersFilter) return false;
      if(STATE.ordersWorkshopFilter && o.workshopId!==STATE.ordersWorkshopFilter) return false;
      if(STATE.ordersSearch){
        var q = STATE.ordersSearch.toLowerCase();
        var hay = (o.orderNumber+" "+o.customer+" "+o.product).toLowerCase();
        if(hay.indexOf(q)===-1) return false;
      }
      return true;
    }).sort(function(a,b){
      /* Тайёр омборда → Етказилди тартибида: аввал эрта босқичдаги буюртмалар,
         кейин тайёр омбордагилар, энг охирида етказиб берилганлар; бекор
         қилинганлар рўйхат охирида. Бир хил босқич ичида — янгилари олдин. */
      var ak = a.cancelled ? 999 : (a.completed ? STAGE_NAMES.length : Math.min(a.currentStageIndex||0, STAGE_NAMES.length-1));
      var bk = b.cancelled ? 999 : (b.completed ? STAGE_NAMES.length : Math.min(b.currentStageIndex||0, STAGE_NAMES.length-1));
      if(ak!==bk) return ak-bk;
      return (b.createdAt||"").localeCompare(a.createdAt||"");
    });

    var html = '';
    html += sampleBanner();
    html += '<label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-weight:700;font-size:13px;margin-bottom:12px;"><input type="checkbox" id="ordersActiveOnlyChk" style="width:17px;height:17px;"'+(STATE.ordersActiveOnly?" checked":"")+'> Фақат амалдаги (жараёндаги) буюртмалар</label>';
    html += '<div class="filter-row">'+
      filters.map(function(f){ return '<button class="pill-filter'+(STATE.ordersFilter===f[0]?" active":"")+'" data-filter="'+f[0]+'">'+f[1]+'</button>'; }).join("") +
      (STATE.workshops.length ? '<select id="ordersWorkshopSelect" style="padding:7px 10px;border-radius:999px;border:1px solid var(--border-strong);background:var(--surface);font-size:12.5px;font-weight:700;color:var(--ink-2);"><option value="">Барча цехлар</option>'+STATE.workshops.map(function(w){return '<option value="'+w.id+'"'+(STATE.ordersWorkshopFilter===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select>' : '')+
      '<div class="search-box">'+ICONS.search+'<input type="text" id="orderSearch" placeholder="Қидириш: мижоз, маҳсулот, рақам…" value="'+esc(STATE.ordersSearch)+'"></div>'+
      '</div>';
    html += list.length ? ordersTable(list,false) : emptyState("Буюртма топилмади","Филтрни ўзгартиринг ёки янги буюртма қўшинг.");

    var root = document.getElementById("content");
    root.innerHTML = html;
    wireSampleBanner(root);
    var activeOnlyChk = root.querySelector("#ordersActiveOnlyChk");
    if(activeOnlyChk) activeOnlyChk.addEventListener("change", function(){ STATE.ordersActiveOnly = activeOnlyChk.checked; render(); });
    root.querySelectorAll("[data-filter]").forEach(function(b){
      b.addEventListener("click", function(){ STATE.ordersFilter = b.getAttribute("data-filter"); render(); });
    });
    var wsSel = root.querySelector("#ordersWorkshopSelect");
    if(wsSel) wsSel.addEventListener("change", function(){ STATE.ordersWorkshopFilter = wsSel.value; render(); });
    var s = root.querySelector("#orderSearch");
    if(s){ s.addEventListener("input", function(){ STATE.ordersSearch = s.value; render(); var e2=document.getElementById("orderSearch"); if(e2){ e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); } }); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    wireOrderRowButtons(root);
    document.getElementById("addOrderBtn").addEventListener("click", function(){ openOrderForm(null); });
  }

  function openWorkshopForm(existing, onSaved, onCancel){
    var isEdit = !!(existing && existing.id);
    var w = existing || {name:"", headEmployeeId:"", note:"", categoryIds:[]};
    var wsCats = (w.categoryIds||[]).slice();
    var body = '<div class="field"><label>Цех номи</label><input id="ws-name" placeholder="Масалан: Пайвандлаш цехи" value="'+esc(w.name)+'"></div>'+
      '<div class="field"><label>Цех бошлиғи <span class="opt">(ихтиёрий)</span></label><div style="display:flex;gap:6px;"><select id="ws-head" style="flex:1;min-width:0;"><option value="">— танланмаган —</option>'+STATE.employees.map(function(e){return '<option value="'+e.id+'"'+(w.headEmployeeId===e.id?" selected":"")+'>'+esc(e.fullName)+'</option>';}).join("")+'</select><button type="button" class="btn btn-secondary btn-icon" id="ws-head-add" title="Янги ходим қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
      '<div class="field"><label>Категория <span class="opt">(бир нечтасини белгилаш мумкин)</span></label>'+
        (STATE.categories.length
          ? '<div style="display:flex;flex-wrap:wrap;gap:4px 16px;max-height:170px;overflow:auto;padding:6px 2px;">'+STATE.categories.map(function(c){
              return '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;min-width:45%;"><input type="checkbox" class="ws-cat" value="'+c.id+'"'+(wsCats.indexOf(c.id)>-1?" checked":"")+' style="width:16px;height:16px;"><span>'+esc(c.name)+'</span></label>';
            }).join("")+'</div>'
          : '<div class="field-hint">Ҳали категория яратилмаган («Омборлар → Бошқарув» бўлимида яратилади).</div>')+
      '</div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="ws-note">'+esc(w.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Қўшиш")+'</button>';
    /* onCancel берилган бўлса (масалан Буюртма шаклидан "+" орқали очилган
       бўлса) — ×, Esc ва "Бекор қилиш" БАРЧАСИ шаклни тўлиқ ёпиб
       қўймасдан, чақирган шаклга ортга қайтаради (2026-10-03 сўровига
       кўра); бошқа ўринлардан (масалан Ходимлар бўлими) чақирилганда
       onCancel узатилмайди — хулқ ўзгармайди. */
    var m = openModal(isEdit?"Цехни таҳрирлаш":"Янги цех", body, foot, false, onCancel);
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    var wsHeadAddBtn = m.querySelector("#ws-head-add");
    if(wsHeadAddBtn) wsHeadAddBtn.addEventListener("click", function(){
      var curCats = []; m.querySelectorAll(".ws-cat").forEach(function(c){ if(c.checked) curCats.push(c.value); });
      var draft = Object.assign({}, w, {name:m.querySelector("#ws-name").value, headEmployeeId:m.querySelector("#ws-head").value, note:m.querySelector("#ws-note").value, categoryIds:curCats});
      if(isEdit) draft.id = w.id;
      closeModal();
      openEmployeeForm(null, function(empId){
        draft.headEmployeeId = empId||"";
        openWorkshopForm(draft, onSaved, onCancel);
      });
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#ws-name").value.trim();
      if(!name){ toast("Цех номини киритинг"); return; }
      var headId = m.querySelector("#ws-head").value;
      var headEmp = headId ? employeeById(headId) : null;
      var pickedCats = []; m.querySelectorAll(".ws-cat").forEach(function(c){ if(c.checked) pickedCats.push(c.value); });
      var data = {categoryIds:pickedCats, name:name, headEmployeeId:headId||"", headName:headEmp?headEmp.fullName:"", note:m.querySelector("#ws-note").value.trim()};
      if(isEdit){
        dbUpdate("workshops", w.id, data, STATE.workshops);
        toast("Сақланди");
        closeModal();
        if(onSaved) onSaved(w.id, data.name);
      } else {
        data.createdAt = new Date().toISOString();
        dbAdd("workshops", data, STATE.workshops);
        toast("Сақланди");
        closeModal();
        /* dbAdd's optimistic add unshifts the new record to the front of
           STATE.workshops synchronously, so it's right there — the caller
           only needs an id to preselect this workshop in a <select>, and
           reconcilePendingId quietly swaps in the real server id later. */
        var created = STATE.workshops[0];
        if(onSaved) onSaved(created?created.id:"", data.name);
      }
    });
  }

  function orderProductOptionsHtml(selectedName){
    var pool = STATE.items.filter(function(it){ return it.itemType==="mahsulot" || it.itemType==="yarim_tayyor"; }).slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    var selNorm = (selectedName||"").trim().toLowerCase();
    var matches = pool.some(function(it){ return (it.name||"").trim().toLowerCase()===selNorm; });
    var html = '<option value="">— танланг —</option>';
    if(selectedName && !matches){
      /* Эски буюртмада киритилган маҳсулот номи рўйхатда йўқ (масалан,
         каталогдан ўчирилган ёки бошқача ёзилган) — уни йўқотиб қўймаслик
         учун алоҳида вариант сифатида кўрсатамиз ва танланган ҳолда
         қолдирамиз. */
      html += '<option value="'+esc(selectedName)+'" selected>'+esc(selectedName)+' (рўйхатда йўқ)</option>';
    }
    html += pool.map(function(it){
      return '<option value="'+esc(it.name)+'"'+((it.name||"").trim().toLowerCase()===selNorm?" selected":"")+'>'+esc(it.name)+' ('+esc(it.unit)+')</option>';
    }).join("");
    return html;
  }
  /* Буюртма муддати бўйича "неча кун қолди / неча кунга кечикди" ёрдамчиси
     (2026-10-03 Буюртмалар формаси қайта қурилиши сўровига кўра). Бажарилган
     буюртма учун — ЕТКАЗИЛГАН сана (completedAt) муддат билан солиштирилади
     ("ўз вақтида етказилди" / "N кунга кечикди"); ҳали жараёндаги буюртма
     учун — бугунги кун билан солиштирилади. */
  function orderDaysLabel(o){
    if(!o.dueDate) return "—";
    if(o.cancelled) return "—";
    if(o.completed){
      var doneDate = (o.completedAt||"").slice(0,10);
      if(!doneDate) return "—";
      var diff = Math.round((new Date(doneDate+"T00:00:00") - new Date(o.dueDate+"T00:00:00"))/86400000);
      return diff<=0 ? "Ўз вақтида етказилди" : (diff+" кунга кечикди");
    }
    var d = daysDiff(o.dueDate);
    return d>=0 ? (d+" кун қолди") : ((-d)+" кунга кечикди");
  }

  /* Буюртма шаклидаги "Харидор" танлов ойнаси — излаш катаги + харидорлар
     рўйхати, ҳар бир қатор ёнида кўзча (харидорнинг тўлиқ реквизитларини
     рўйхат ичида очиб кўрсатади, ойнани ёпмасдан). Танлангач асосий
     шаклдаги майдонга тушади (2026-10-03 сўровига кўра). */
  function openOrderCustomerPickerModal(onPicked, onCancel){
    var body = personSelectSearchBoxHtml("ocp-search")+
      '<div id="ocp-list" style="max-height:420px;overflow-y:auto;margin-top:8px;"></div>';
    /* 2026-10-03 сўровига кўра: × (ёки "Ёпиш"/Esc) босилганда бутун буюртма
       ойнаси эмас, фақат шу танлов ойнаси ёпилиб, ортга (буюртма
       қораламаси билан) қайтилади — onCancel шуни бажаради. */
    var m = openModal("Харидорни танлаш", body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', true, onCancel);
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    function renderList(){
      var pool = STATE.customers.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
      var listEl = m.querySelector("#ocp-list");
      if(!pool.length){ listEl.innerHTML = emptyState("Харидор йўқ","Ёнидаги \"+\" тугмаси орқали биринчи харидорни қўшинг."); return; }
      listEl.innerHTML = pool.map(function(c){
        return '<div class="ocp-row" data-cust="'+c.id+'" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;">'+
          '<div style="flex:1;min-width:0;font-weight:700;">'+esc(c.name)+'</div>'+
          '<button type="button" class="btn btn-ghost btn-icon" data-cust-eye="'+c.id+'" title="Маълумотларини кўриш">'+ICONS.eye+'</button>'+
          '</div>'+
          '<div class="ocp-detail" data-cust-detail="'+c.id+'" hidden style="padding:4px 12px 12px;font-size:12.5px;color:var(--ink-2);background:var(--surface-2);">'+
            '<div><b>Номи:</b> '+esc(c.name)+'</div>'+
            '<div><b>Манзили:</b> '+(c.address?esc(c.address):"—")+'</div>'+
            '<div><b>ИНН:</b> '+(c.inn?esc(c.inn):"—")+'</div>'+
            '<div><b>Телефон:</b> '+(c.phone?esc(c.phone):"—")+'</div>'+
          '</div>';
      }).join("");
      listEl.querySelectorAll(".ocp-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var cust = customerById(rowEl.getAttribute("data-cust"));
          if(!cust) return;
          closeModal();
          onPicked(cust);
        });
      });
      listEl.querySelectorAll("[data-cust-eye]").forEach(function(btn){
        btn.addEventListener("click", function(e){
          e.stopPropagation();
          var det = listEl.querySelector('[data-cust-detail="'+btn.getAttribute("data-cust-eye")+'"]');
          if(det) det.hidden = !det.hidden;
        });
      });
      var q = (m.querySelector("#ocp-search").value||"").trim().toLowerCase();
      if(q){
        listEl.querySelectorAll(".ocp-row").forEach(function(rowEl){
          var show = (rowEl.textContent||"").toLowerCase().indexOf(q)>-1;
          rowEl.style.display = show ? "" : "none";
          var det = listEl.querySelector('[data-cust-detail="'+rowEl.getAttribute("data-cust")+'"]');
          if(det && !show) det.hidden = true;
        });
      }
    }
    m.querySelector("#ocp-search").addEventListener("input", renderList);
    renderList();
  }

  /* Буюртма шаклидаги "+" тугмаси орқали тезкор харидор қўшиш — фойдаланувчи
     сўровига кўра фақат номи (мажбурий), манзил, ИНН, телефон (ҳаммаси
     ихтиёрий, шартнома ва изоҳсиз — буюртмада шартнома рақами/санаси
     алоҳида майдонлар орқали киритилади) (2026-10-03 сўровига кўра). */
  function openOrderCustomerQuickForm(onSaved, onCancel){
    var body = '<div class="field"><label>Харидор номи</label><input id="ocq-name" placeholder="Харидор номи"></div>'+
      '<div class="field"><label>Манзили <span class="opt">(ихтиёрий)</span></label><input id="ocq-address"></div>'+
      '<div class="field-row"><div class="field"><label>ИНН <span class="opt">(ихтиёрий)</span></label><input id="ocq-inn"></div>'+
      '<div class="field"><label>Телефон рақами <span class="opt">(ихтиёрий)</span></label><input id="ocq-phone"></div></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal("Янги харидор", body, foot, false, onCancel);
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onCancel) onCancel(); });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#ocq-name").value.trim();
      if(!name){ toast("Харидор номини киритинг"); return; }
      var data = {
        name:name, inn:m.querySelector("#ocq-inn").value.trim(), bankAccount:"", bankName:"", mfo:"",
        address:m.querySelector("#ocq-address").value.trim(), phone:m.querySelector("#ocq-phone").value.trim(),
        contactPerson:"", note:"", contracts:[]
      };
      var finish = function(id, cust){
        toast("Харидор қўшилди");
        closeModal();
        if(onSaved) onSaved(cust);
      };
      if(STATE.db){
        var tempId = "_pending_"+uid();
        var optimistic = Object.assign({}, data); optimistic.id=tempId; optimistic._pending=true; optimistic.createdAt=new Date().toISOString();
        STATE.customers.unshift(optimistic);
        finish(tempId, optimistic);
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
        finish(data.id, data);
      }
    });
  }

  /* Буюртма қатори (битта маҳсулот) учун ҳисоблаш ёрдамчилари — Жами сумма
     (Миқдор×Нарх) ва Якуний жами (Жами−Чегирма) ҳар доим автомат; фақат
     Чегирилган сумма майдони қўлда ҳам ёзилиши мумкин (фойдаланувчи
     сўровига кўра: фоизни 0 қилиб, суммани қўлда киритиш). */
  function orderAutoSubtotal(o){ return r2((Number(o.quantity)||0) * (Number(o.price)||0)); }
  function orderAutoDiscountAmount(o){ return r2((Number(o.subtotalAmount)||0) * (Number(o.discountPct)||0) / 100); }
  function orderAutoTotal(o){ return r2((Number(o.subtotalAmount)||0) - (Number(o.discountAmount)||0)); }
  /* ҚҚС ажратмаси (2026-10-07): нарх ҚҚС билан бирга деб олинади, шунга
     кўра «Жами сумма» (чегирмадан кейинги) ўзгармайди — у фақат ҚҚСсиз
     қисм ва ҚҚС суммасига ажратиб кўрсатилади. ҚҚС % стандарт 12, қўлда
     ўзгартириш мумкин. */
  function orderVatRateOf(o){ var v = (o.vatRate===undefined || o.vatRate===null || o.vatRate==="") ? 12 : Number(o.vatRate); return isNaN(v) ? 12 : v; }
  function orderApplyVat(o){
    var vr = orderVatRateOf(o), gross = Number(o.totalAmount)||0, qty = Number(o.quantity)||0;
    var noVat = r2(gross/(1+vr/100));
    o.vatRate = vr;
    o.noVatAmount = noVat;
    o.vatAmount = r2(gross-noVat);
    o.unitNoVat = qty>0 ? r2(noVat/qty) : 0;
  }
  function recalcOrderLine(o){
    o.subtotalAmount = orderAutoSubtotal(o);
    if(!o.discountManual) o.discountAmount = orderAutoDiscountAmount(o);
    o.totalAmount = orderAutoTotal(o);
    orderApplyVat(o);
  }
  function recalcOrderLineFromSubtotal(o){
    if(!o.discountManual) o.discountAmount = orderAutoDiscountAmount(o);
    o.totalAmount = orderAutoTotal(o);
    orderApplyVat(o);
  }
  function freshOrderRow(){
    return {itemId:"", product:"", unit:UNIT_OPTIONS[0], warehouseId:"", priceListId:"", quantity:0, price:0, subtotalAmount:0, discountPct:0, discountAmount:0, discountManual:false, totalAmount:0, categoryKey:"", vatRate:12, unitNoVat:0, noVatAmount:0, vatAmount:0};
  }
  /* 2026-10-03 буюртмалар энди бир нечта маҳсулотли (items[]) бўлиши мумкин —
     лекин шу сана(гача)ги ЭСКИ ёзувларда items[] йўқ, фақат якка
     product/quantity/price/... майдонлари бор. Бу ёрдамчи ҳар доим бир
     хил кўринишдаги МАССИВ қайтаради: агар items[] бор бўлса — ўзини,
     бўлмаса (ва якка маҳсулот киритилган бўлса) — ўша якка ёзувдан
     синтезланган БИТТА қаторли массивни. Эски ёзувнинг ўзи ҳеч қачон
     ёзиб ўзгартирилмайди (фақат шакл/кўрсатиш учун хотирада синтезланади)
     — "киритилган малумот узгармаслиги керак" талабига мувофиқ. */
  function orderItemsList(o){
    if(Array.isArray(o.items) && o.items.length) return o.items;
    if(o.product){
      return [{
        itemId:o.itemId||"", product:o.product||"", unit:o.unit||UNIT_OPTIONS[0],
        warehouseId:o.warehouseId||"", priceListId:o.priceListId||"",
        quantity:Number(o.quantity)||0, price:Number(o.price)||0,
        subtotalAmount:Number(o.subtotalAmount)||0, discountPct:Number(o.discountPct)||0,
        discountAmount:Number(o.discountAmount)||0, discountManual:!!o.discountManual,
        totalAmount:Number(o.totalAmount)||0
      }];
    }
    return [];
  }
  /* Рўйхат/танлов ойналарида қисқа кўрсатиш учун — битта маҳсулотли
     буюртмада эски кўриниш (номи + миқдори + бирлиги) сақланади, бир
     нечта маҳсулотли буюртмада эса "N та маҳсулот" деб умумлаштирилади
     (турли бирликлар бўлгани учун миқдорларни қўшиб бўлмайди). */
  function orderProductSummary(o){
    var items = orderItemsList(o);
    if(!items.length) return "—";
    if(items.length===1) return esc(items[0].product||"—")+' ('+fmtNum(items[0].quantity)+' '+esc(items[0].unit||"")+')';
    return items.length+" та маҳсулот";
  }

  function renderOrderRowsHtml(items){
    if(!items.length) return '<tr><td colspan="12" class="cell-muted" style="text-align:center;padding:14px;">Қатор йўқ — юқоридаги "+" тугмаси орқали қўшинг</td></tr>';
    return items.map(function(it,i){
      var vr = orderVatRateOf(it);
      var noVatUnit = (it.unitNoVat!==undefined) ? it.unitNoVat : 0;
      return '<tr data-orow="'+i+'">'+
        '<td><button type="button" class="btn btn-secondary btn-sm" data-pick-product="'+i+'" style="width:100%;justify-content:flex-start;font-weight:600;min-width:150px;">'+(it.product?esc(it.product):'<span class="cell-muted">— Маҳсулотни танланг —</span>')+'</button></td>'+
        '<td><select class="sr-input" data-field="categoryKey" data-row="'+i+'" style="min-width:130px;"><option value="">— танланг —</option>'+DASH_WORKSHOPS.map(function(dw){ return '<option value="'+dw.key+'"'+(it.categoryKey===dw.key?" selected":"")+'>'+esc(dw.name)+'</option>'; }).join("")+'</select></td>'+
        '<td><select class="sr-input" data-field="unit" data-row="'+i+'" style="min-width:84px;">'+allUnitOptions().map(function(u){return '<option'+(it.unit===u?" selected":"")+'>'+u+'</option>';}).join("")+'</select></td>'+
        '<td><input class="sr-input" type="number" min="0" step="any" data-field="quantity" data-row="'+i+'" value="'+esc(it.quantity)+'" style="width:72px;"></td>'+
        '<td><input class="sr-input" type="text" inputmode="decimal" data-field="price" data-row="'+i+'" value="'+formatSumInputValue(it.price)+'" style="width:104px;" title="Прайсдан автомат — қўлда ҳам ўзгартириш мумкин"></td>'+
        '<td><input class="sr-input" type="number" min="0" max="100" step="any" data-field="discountPct" data-row="'+i+'" value="'+esc(it.discountPct)+'" style="width:60px;"></td>'+
        '<td><input class="sr-input" type="text" data-field="unitNoVat" data-row="'+i+'" value="'+formatSumInputValue(r2(noVatUnit))+'" style="width:112px;" disabled title="Чегирма қилинган нархнинг ҚҚСсиз қисми (1 дона) — автомат"></td>'+
        '<td><input class="sr-input" type="text" data-field="noVatAmount" data-row="'+i+'" value="'+formatSumInputValue(r2(it.noVatAmount||0))+'" style="width:118px;" disabled title="ҚҚСсиз сумма — автомат"></td>'+
        '<td><input class="sr-input" type="number" min="0" max="100" step="any" data-field="vatRate" data-row="'+i+'" value="'+esc(vr)+'" style="width:60px;" title="ҚҚС % — стандарт 12, ўзгартириш мумкин"></td>'+
        '<td><input class="sr-input" type="text" data-field="vatAmount" data-row="'+i+'" value="'+formatSumInputValue(r2(it.vatAmount||0))+'" style="width:110px;" disabled title="ҚҚС суммаси — автомат"></td>'+
        '<td><input class="sr-input" type="text" data-field="total" data-row="'+i+'" value="'+formatSumInputValue(r2(it.totalAmount))+'" style="width:128px;font-weight:800;" disabled title="Жами сумма (чегирмадан кейин, ҚҚС билан) — автомат"></td>'+
        '<td><button type="button" class="btn btn-ghost btn-icon" data-remove-row="'+i+'" title="Қаторни ўчириш">'+ICONS.x+'</button></td>'+
      '</tr>';
    }).join("");
  }
  function computeOrderGrandTotals(items){
    var subtotal=0, discount=0, total=0, vat=0;
    items.forEach(function(it){ subtotal+=Number(it.subtotalAmount)||0; discount+=Number(it.discountAmount)||0; total+=Number(it.totalAmount)||0; vat+=Number(it.vatAmount)||0; });
    return {subtotal:r2(subtotal), discount:r2(discount), total:r2(total), vat:r2(vat)};
  }
  /* Буюртма қаторларини ҚҚС ҳисоб-китоби билан ТЎЛИҚ кўрсатиш (фақат
     ўқиш учун) — «Харидор буюртмаси»ни кўриш ойнаси ва «Савдо → Янги
     сотув»да буюртмадаги кўринишнинг ўзи. Эски буюртмаларда ҚҚС майдонлари
     йўқ бўлса — 12% бўйича хотирада ҳисобланади (ёзилмайди). opts.catSelect
     берилса — «Категория» устуни қатор бўйича ўзгартириладиган танлов. */
  function orderLineVat(it){
    var c = Object.assign({}, it);
    if(c.noVatAmount===undefined || c.vatAmount===undefined || c.unitNoVat===undefined){
      if(c.totalAmount===undefined) c.totalAmount = r2((Number(c.quantity)||0)*(Number(c.price)||0) - (Number(c.discountAmount)||0));
      orderApplyVat(c);
    }
    return c;
  }
  function orderLinesViewTable(items, opts){
    opts = opts || {};
    var f = function(x){ return fmtSum(x).replace(/\s*сўм$/,""); };
    var sumNoVat=0, sumVat=0, sumTotal=0;
    var rows = items.map(function(it0, i){
      var it = orderLineVat(it0);
      sumNoVat += Number(it.noVatAmount)||0; sumVat += Number(it.vatAmount)||0; sumTotal += Number(it.totalAmount)||0;
      var catCell;
      if(opts.catSelect){
        catCell = '<select data-sale-cat="'+i+'" style="min-width:140px;padding:6px 8px;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg);font-size:12.5px;'+(it0.categoryKey?'':'border-color:var(--critical);')+'"><option value="">— танланг —</option>'+DASH_WORKSHOPS.map(function(dw){ return '<option value="'+dw.key+'"'+(it0.categoryKey===dw.key?" selected":"")+'>'+esc(dw.name)+'</option>'; }).join("")+'</select>';
      } else {
        var dwk = it.categoryKey ? dwOf(it.categoryKey) : null;
        catCell = dwk ? esc(dwk.name) : '<span class="cell-muted">—</span>';
      }
      return '<tr><td class="cell-muted" style="text-align:center;">'+(i+1)+'</td><td class="cell-strong">'+esc(it.product||it.name||"—")+'</td><td>'+catCell+'</td>'+
        '<td class="cell-muted">'+esc(it.unit||"—")+'</td><td class="num">'+fmtNum(it.quantity)+'</td><td class="num">'+f(it.price)+'</td>'+
        '<td class="num">'+(Number(it.discountPct)||0)+'%</td><td class="num">'+f(it.unitNoVat)+'</td><td class="num">'+f(it.noVatAmount)+'</td>'+
        '<td class="num">'+(Number(it.vatRate)||0)+'%</td><td class="num">'+f(it.vatAmount)+'</td><td class="num cell-strong">'+f(it.totalAmount)+'</td></tr>';
    }).join("");
    return '<div class="table-wrap"><table class="order-lines"><thead><tr><th>№</th><th>Маҳсулот номи</th><th>Категория</th><th>Ўлчов бирлиги</th><th>Миқдор</th><th>Нарх (сўм)</th><th>Чегирма %</th><th>Чегирма қилинган нархнинг ҚҚСсиз қисми</th><th>ҚҚСсиз сумма (сўм)</th><th>ҚҚС %</th><th>ҚҚС суммаси (сўм)</th><th>Жами сумма (сўм)</th></tr></thead><tbody>'+rows+
      '<tr><td colspan="8" class="cell-strong" style="text-align:right;">Жами:</td><td class="num cell-strong">'+f(r2(sumNoVat))+'</td><td></td><td class="num cell-strong">'+f(r2(sumVat))+'</td><td class="num cell-strong">'+f(r2(sumTotal))+'</td></tr>'+
      '</tbody></table></div>';
  }
  /* Жадвалдаги жоридаги DOM қийматларини items[] массивига қайтаради —
     харидор/цех/ходим танлов ойналарига ўтишдан олдин ёки сақлашдан олдин
     чақирилади, токи фойдаланувчи аллақачон ёзган қатор маълумотлари
     йўқолмасин. items — ўзгартириладиган нусха (чақирувчи томонидан
     тайёрланган); функция уни жойида янгилаб, ўзини қайтаради. */
  function readOrderRowsFromDom(m, items){
    var tbody = m.querySelector("#orderRowsBody");
    if(!tbody) return items;
    items.forEach(function(it, i){
      var rowEl = tbody.querySelector('tr[data-orow="'+i+'"]');
      if(!rowEl) return;
      var unitSel = rowEl.querySelector('[data-field="unit"]');
      var qtyInp = rowEl.querySelector('[data-field="quantity"]');
      var priceInp = rowEl.querySelector('[data-field="price"]');
      var discPctInp = rowEl.querySelector('[data-field="discountPct"]');
      var discAmtInp = rowEl.querySelector('[data-field="discountAmount"]');
      /* "Прайс" энди қатор-даражасида эмас, бутун буюртма учун БИТТА умумий
         танлов (#f-priceList, "Харидор номи" тагида) — it.priceListId бу
         ерда DOM'дан эмас, #f-priceList'нинг change тингловчиси ва
         "Маҳсулотни танлаш" чақируви орқали аллақачон қўйилган бўлади
         (2026-10-03 сўровига кўра, қаранг: openOrderForm). */
      if(unitSel) it.unit = unitSel.value;
      if(qtyInp) it.quantity = Number(qtyInp.value)||0;
      if(priceInp) it.price = parseSumInputValue(priceInp.value);
      if(discPctInp) it.discountPct = Number(discPctInp.value)||0;
      if(discAmtInp) it.discountAmount = parseSumInputValue(discAmtInp.value);
      var catSel = rowEl.querySelector('[data-field="categoryKey"]');
      if(catSel) it.categoryKey = catSel.value;
      var vatInp = rowEl.querySelector('[data-field="vatRate"]');
      if(vatInp) it.vatRate = (vatInp.value==="" ? 12 : (Number(vatInp.value)||0));
      recalcOrderLine(it);
    });
    return items;
  }

  function openOrderForm(existing){
    /* existing may also be a re-entry draft handed back from the "+" quick
       add-customer/+ picker flows below, which never carries a real .id
       unless the original order being edited had one — check .id, not just
       truthiness, so a brand-new order reopened mid-draft doesn't get
       misread as edit mode (that exact mix-up is what silently broke order
       creation before). */
    var isEdit = !!(existing && existing.id);
    /* 2026-10-03 Буюртмалар формаси қайта қурилиши сўровига кўра: Харидор
       танлов ойнаси орқали танланади, шартнома санаси қўшилди, ва энди
       буюртмада БИР НЕЧТА маҳсулот (items[]) бўлиши мумкин — эски
       ёзувларда items[] йўқ, шунга кўра orderItemsList() орқали якка
       маҳсулотдан синтезланади (ўзи ёзилмайди, фақат шакл учун хотирада).
       Муҳимлик ва Тўланган сумма майдонлари шаклдан олиб ташланди
       (фойдаланувчи сўровига кўра) — лекин эски қийматлари сақланиб
       қолади (қуйида o.priority/o.paidAmount сифатида, кўринмас ҳолда). */
    var o = existing || {};
    if(o.orderNumber==null) o.orderNumber = "BUY-"+new Date().getFullYear()+"-"+String(STATE.orders.length+1).padStart(3,"0");
    if(o.date==null) o.date = (o.createdAt||"").slice(0,10) || todayISO();
    if(o.contractNumber==null) o.contractNumber = "";
    if(o.contractDate==null) o.contractDate = "";
    if(o.customerId==null) o.customerId = "";
    if(o.customer==null) o.customer = "";
    if(!Array.isArray(o.items)) o.items = orderItemsList(o);
    if(!o.items.length) o.items = [freshOrderRow()];
    o.items.forEach(function(it){ if(it.noVatAmount===undefined || it.vatAmount===undefined) orderApplyVat(it); });
    /* 2026-10-03 сўровига кўра: "Прайс" энди ҳар қатор учун алоҳида эмас,
       бутун буюртма учун БИТТА умумий танлов (Харидор номи тагида) —
       шунга кўра эски (items[] дан олдинги/ичидаги) қийматлардан бирини
       буюртманинг умумий прайси сифатида оламиз (мавжуд ёзувлар учун). */
    if(o.priceListId==null) o.priceListId = (o.items[0] && o.items[0].priceListId) || "";
    if(o.priority==null) o.priority = "orta";
    /* Чиқим омбори — бутун буюртма учун битта (2026-10-15 сўрови). Эски
       ёзувларда биринчи қатордан олинади. */
    if(o.outWarehouseId==null){
      o.outWarehouseId = (o.items[0] && o.items[0].warehouseId) || o.warehouseId ||
        ((STATE.warehouses.find(function(w){ return w.isFinishedGoods; }) || STATE.warehouses[0] || {}).id || "");
    }
    o.items.forEach(function(it){ if(!it.warehouseId) it.warehouseId = o.outWarehouseId; });
    if(o.dueDate==null) o.dueDate = "";
    if(o.paidAmount==null) o.paidAmount = 0;
    if(o.responsibleEmployeeId==null) o.responsibleEmployeeId = "";
    if(o.workshopId==null) o.workshopId = "";
    if(o.notes==null) o.notes = "";
    /* 2026-10-03 сўровига кўра қайта тартибланди: Харидор номи тагида —
       бутун буюртма учун умумий "Прайс" танлови (аввал ҳар қатор учун
       алоҳида эди); Шартнома рақами ва санаси энди ёнма-ён. */
    var body = ''+
      '<div class="field-row"><div class="field"><label>Буюртма рақами</label><input id="f-orderNumber" value="'+esc(o.orderNumber)+'"></div>'+
      '<div class="field"><label>Сана</label><input id="f-date" type="date" value="'+esc(o.date)+'"></div></div>'+
      '<div class="field"><label>Харидор номи</label><div style="display:flex;gap:6px;"><button type="button" class="btn btn-secondary" id="f-customer-pick" style="flex:1;min-width:0;justify-content:flex-start;font-weight:600;">'+(o.customer?esc(o.customer):'<span class="cell-muted">— Харидорни танланг —</span>')+'</button><button type="button" class="btn btn-secondary btn-icon" id="f-customer-add" title="Янги харидор қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
      '<div class="field-row"><div class="field"><label>Муҳимлилик</label><select id="f-priority">'+['orta','yuqori','past'].map(function(k){ return '<option value="'+k+'"'+(o.priority===k?' selected':'')+'>'+PRIORITY[k].label+'</option>'; }).join('')+'</select></div>'+
      '<div class="field"><label>Чиқим омбори</label><select id="f-warehouse">'+(STATE.warehouses.length?STATE.warehouses.map(function(w){ return '<option value="'+w.id+'"'+(o.outWarehouseId===w.id?' selected':'')+'>'+esc(w.name)+'</option>'; }).join(''):'<option value="">Аввал омбор яратинг</option>')+'</select><div class="field-hint">Маҳсулот шу омбордан чиқарилади; қолдиқ шу омбор бўйича текширилади.</div></div></div>'+
      '<div class="field"><label>Прайс <span class="opt">(ихтиёрий)</span></label><select id="f-priceList">'+priceListOptionsHtml(o.priceListId)+'</select><div class="field-hint">Танланса, пастда маҳсулот танлаганда нархи шу прайсдан автомат қўйилади.</div></div>'+
      '<div class="field-row"><div class="field"><label>Шартнома рақами <span class="opt">(ихтиёрий)</span></label><input id="f-contractNumber" value="'+esc(o.contractNumber)+'"></div>'+
      '<div class="field"><label>Шартнома санаси <span class="opt">(ихтиёрий)</span></label><input id="f-contractDate" type="date" value="'+esc(o.contractDate)+'"></div></div>'+
      '<div class="field"><label>Муддати</label><input id="f-dueDate" type="date" value="'+esc(o.dueDate)+'"></div>'+
      '<div class="card sr-group"><div class="table-wrap"><table class="sr-table order-lines"><thead><tr><th>Маҳсулот номи</th><th>Категория</th><th>Ўлчов бирлиги</th><th>Миқдор</th><th>Нарх</th><th>Чегирма %</th><th>Чегирма қилинган нархнинг ҚҚСсиз қисми</th><th>ҚҚСсиз сумма</th><th>ҚҚС %</th><th>ҚҚС суммаси</th><th>Жами сумма</th><th><button type="button" class="btn btn-secondary btn-icon btn-sm" id="f-add-row" title="Янги қатор қўшиш">'+ICONS.plus+'</button></th></tr></thead><tbody id="orderRowsBody">'+renderOrderRowsHtml(o.items)+'</tbody></table></div>'+
      '<div style="display:flex;justify-content:flex-end;gap:26px;margin-top:10px;font-size:13px;flex-wrap:wrap;">'+
        '<div>Жами сумма: <b id="f-grand-subtotal">0 сўм</b></div>'+
        '<div>Умумий чегирма: <b id="f-grand-discount">0 сўм</b></div>'+
        '<div>Шундан ҚҚС: <b id="f-grand-vat">0 сўм</b></div>'+
        '<div style="font-size:14.5px;">Якуний умумий сумма: <b id="f-grand-total" style="color:var(--accent);">0 сўм</b></div>'+
      '</div></div>'+
      '<div class="field-row" style="margin-top:16px;"><div class="field"><label>Бириктирилган цех <span class="opt">(ихтиёрий)</span></label><div style="display:flex;gap:6px;"><select id="f-workshop" style="flex:1;min-width:0;"><option value="">— танланмаган —</option>'+STATE.workshops.map(function(w){return '<option value="'+w.id+'"'+(o.workshopId===w.id?" selected":"")+'>'+esc(w.name)+'</option>';}).join("")+'</select><button type="button" class="btn btn-secondary btn-icon" id="f-workshop-add" title="Янги цех қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div>'+
      '<div class="field"><label>Масъул шахс <span class="opt">(ихтиёрий)</span></label><div style="display:flex;gap:6px;"><select id="f-responsible" style="flex:1;min-width:0;"><option value="">— танланмаган —</option>'+STATE.employees.map(function(e){return '<option value="'+e.id+'"'+(o.responsibleEmployeeId===e.id?" selected":"")+'>'+esc(e.fullName)+'</option>';}).join("")+'</select><button type="button" class="btn btn-secondary btn-icon" id="f-responsible-add" title="Янги ходим қўшиш" style="flex-shrink:0;">'+ICONS.plus+'</button></div></div></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="f-notes" placeholder="Қўшимча маълумот…">'+esc(o.notes||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Буюртма қўшиш")+'</button>';
    /* 2026-10-03 сўровига кўра: ойна каттароқ (xwide — 1200px) қилиб
       очиладики, барча майдонлар (янги кўп-қаторли жадвал ҳам) сиғиб
       кетсин. */
    var m = openModal(isEdit?"Буюртмани таҳрирлаш":"Янги буюртма", body, foot, "xxxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var snapshotOrderFields = function(){
      return {
        orderNumber: m.querySelector("#f-orderNumber").value,
        date: m.querySelector("#f-date").value,
        contractNumber: m.querySelector("#f-contractNumber").value,
        contractDate: m.querySelector("#f-contractDate").value,
        dueDate: m.querySelector("#f-dueDate").value,
        customerId: o.customerId, customer: o.customer,
        priceListId: m.querySelector("#f-priceList").value,
        responsibleEmployeeId: m.querySelector("#f-responsible").value,
        workshopId: m.querySelector("#f-workshop").value,
        notes: m.querySelector("#f-notes").value,
        priority: (m.querySelector("#f-priority")||{}).value || o.priority, outWarehouseId: (m.querySelector("#f-warehouse")||{}).value || o.outWarehouseId, paidAmount: o.paidAmount
      };
    };
    var snapshotOrderDraft = function(){
      var draft = Object.assign({}, o, snapshotOrderFields());
      draft.items = readOrderRowsFromDom(m, o.items.map(function(x){ return Object.assign({},x); }));
      if(isEdit) draft.id = o.id;
      return draft;
    };
    var tbody = m.querySelector("#orderRowsBody");
    var updateGrandTotals = function(){
      var g = computeOrderGrandTotals(o.items);
      var vatEl = m.querySelector("#f-grand-vat"); if(vatEl) vatEl.textContent = fmtSum(g.vat);
      m.querySelector("#f-grand-subtotal").textContent = fmtSum(g.subtotal);
      m.querySelector("#f-grand-discount").textContent = fmtSum(g.discount);
      m.querySelector("#f-grand-total").textContent = fmtSum(g.total);
    };
    var refreshRowCells = function(i){
      var it = o.items[i];
      var rowEl = tbody.querySelector('tr[data-orow="'+i+'"]');
      if(!it || !rowEl) return;
      var totalInp = rowEl.querySelector('[data-field="total"]');
      if(totalInp) totalInp.value = formatSumInputValue(r2(it.totalAmount));
      [["unitNoVat","unitNoVat"],["noVatAmount","noVatAmount"],["vatAmount","vatAmount"]].forEach(function(pair){
        var el = rowEl.querySelector('[data-field="'+pair[0]+'"]'); if(el) el.value = formatSumInputValue(r2(it[pair[1]]||0));
      });
      updateGrandTotals();
    };
    /* Қатор ичидаги майдонлар (Миқдор/Нарх/Чегирма %/Чегирилган сумма/
       Прайс/Бирлик) учун — делегация орқали БИР МАРТА улаймиз (tbody
       элементининг ўзи ҳар доим турган қолади, фақат innerHTML
       янгиланади, шунга кўра делегация янги қаторлар учун ҳам ишлайди). */
    tbody.addEventListener("input", function(e){
      var t = e.target, field = t.getAttribute("data-field");
      var rowIdx = Number(t.getAttribute("data-row"));
      if(!field || isNaN(rowIdx)) return;
      var it = o.items[rowIdx];
      if(!it) return;
      if(field==="quantity"){ it.quantity = Number(t.value)||0; recalcOrderLine(it); refreshRowCells(rowIdx); }
      else if(field==="price"){ it.price = parseSumInputValue(t.value); recalcOrderLine(it); refreshRowCells(rowIdx); }
      else if(field==="discountPct"){ it.discountPct = Number(t.value)||0; it.discountManual=false; recalcOrderLine(it); refreshRowCells(rowIdx); }
      else if(field==="discountAmount"){ it.discountAmount = parseSumInputValue(t.value); it.discountManual=true; recalcOrderLine(it); refreshRowCells(rowIdx); }
      else if(field==="vatRate"){ it.vatRate = (t.value==="" ? 12 : (Number(t.value)||0)); recalcOrderLine(it); refreshRowCells(rowIdx); }
    });
    tbody.addEventListener("change", function(e){
      var t = e.target, rowIdx = Number(t.getAttribute("data-row"));
      var it = o.items[rowIdx];
      if(!it) return;
      if(t.getAttribute("data-field")==="unit"){ it.unit = t.value; }
      else if(t.getAttribute("data-field")==="categoryKey"){ it.categoryKey = t.value; }
    });
    /* Буюртма учун умумий "Прайс" танлови (Харидор номи тагида) — бу
       ўзгарганда, ИТЕМИ бор ҳар бир қаторнинг нархи шу прайс бўйича
       автомат қайта ҳисобланади (2026-10-03 сўровига кўра — илгари ҳар
       қатор учун алоҳида эди, қаранг: openOrderForm'нинг бошидаги изоҳ). */
    var whSel = m.querySelector("#f-warehouse");
    if(whSel) whSel.addEventListener("change", function(){
      o.outWarehouseId = this.value;
      o.items.forEach(function(it){ it.warehouseId = o.outWarehouseId; });
    });
    var priceListSel = m.querySelector("#f-priceList");
    if(priceListSel) priceListSel.addEventListener("change", function(){
      o.priceListId = this.value;
      var pl = o.priceListId ? STATE.priceLists.find(function(x){return x.id===o.priceListId;}) : null;
      o.items.forEach(function(it, i){
        if(!it.itemId) return;
        it.priceListId = o.priceListId;
        if(!pl) return;
        var entry = (pl.items||[]).find(function(x){return x.itemId===it.itemId;});
        if(entry){ it.price = Number(entry.price)||0; recalcOrderLine(it); refreshRowCells(i); }
      });
    });
    /* Қатор-даражасидаги (делегация бўлмаган) тингловчилар — ҳар бир
       жадвал қайта чизилганда (қатор қўшилганда/ўчирилганда) қайта
       улаш керак, шунга кўра алоҳида функцияга ажратилди. */
    var wireRowLevelHandlers = function(){
      tbody.querySelectorAll('[data-field="price"], [data-field="discountAmount"]').forEach(function(inp){ wireSumInputFormatting(inp); });
      tbody.querySelectorAll("[data-remove-row]").forEach(function(btn){
        btn.addEventListener("click", function(){
          var idx = Number(btn.getAttribute("data-remove-row"));
          o.items.splice(idx,1);
          redrawRows();
        });
      });
      tbody.querySelectorAll("[data-pick-product]").forEach(function(btn){
        btn.addEventListener("click", function(){
          var idx = Number(btn.getAttribute("data-pick-product"));
          var draft = snapshotOrderDraft();
          closeModal();
          openSaleItemPickerModal(draft.items[idx].warehouseId, function(whId, itm){
            var it = draft.items[idx];
            it.warehouseId = whId;
            it.itemId = itm.id; it.product = itm.name; it.unit = itm.unit||it.unit;
            /* Хомашё танланса — нархи омбордаги кирим нархидан,
               ҚҚС БИЛАН автомат қўйилади (2026-10-19 сўрови) — буюртма
               қаторидаги "Нарх" катаги ҚҚСли (брутто) нархни сақлайди,
               ҚҚСсиз қисми ундан ҳисобланади. Прайс-варақада шу
               хомашё учун алоҳида нарх бўлса, қуйида у устун туради. */
            if(itm.itemType==="xomashyo"){
              var kp = warehouseKirimPriceVat(itm.id, whId);
              if(kp>0) it.price = kp;
            }
            if(!it.categoryKey) it.categoryKey = dwDefaultKeyForOrderItem({itemId:itm.id, product:itm.name}, null) || "";
            /* 2026-10-03 тузатилди: аввал маҳсулот танлангандан кейин нархи
               танланган умумий прайс-варақадан АВТОМАТ қўйилмасди (фақат
               "Прайс" ўзгартирилганда ишларди) — энди маҳсулот танланганда
               ҳам шу буюртманинг умумий прайси (draft.priceListId) бўйича
               нарх қўлланади, мавжуд бўлса. */
            it.priceListId = draft.priceListId||"";
            if(it.priceListId){
              var pl = STATE.priceLists.find(function(x){return x.id===it.priceListId;});
              var entry = pl ? (pl.items||[]).find(function(x){return x.itemId===it.itemId;}) : null;
              if(entry) it.price = Number(entry.price)||0;
            }
            recalcOrderLine(it);
            openOrderForm(draft);
          }, function(){ openOrderForm(draft); });
        });
      });
    };
    var redrawRows = function(){
      tbody.innerHTML = renderOrderRowsHtml(o.items);
      wireRowLevelHandlers();
      updateGrandTotals();
    };
    wireRowLevelHandlers();
    updateGrandTotals();
    var addRowBtn = m.querySelector("#f-add-row");
    if(addRowBtn) addRowBtn.addEventListener("click", function(){ o.items.push(freshOrderRow()); redrawRows(); });
    var custPickBtn = m.querySelector("#f-customer-pick");
    if(custPickBtn) custPickBtn.addEventListener("click", function(){
      /* single shared modalRoot — snapshot every field, close this modal,
         let the picker/add modal do its thing, then reopen the order form
         pre-filled with everything already typed plus the new selection.
         onCancel (2026-10-03 сўровига кўра): агар харидор танланмасдан ×
         (ёки Esc/"Ёпиш") босилса — буюртма ойнаси тўлиқ ёпилмайди, балки
         худди шу қоралама билан ортга қайтилади. */
      var draft = snapshotOrderDraft();
      closeModal();
      openOrderCustomerPickerModal(function(cust){
        draft.customerId = cust.id; draft.customer = cust.name;
        openOrderForm(draft);
      }, function(){ openOrderForm(draft); });
    });
    var custAddBtn = m.querySelector("#f-customer-add");
    if(custAddBtn) custAddBtn.addEventListener("click", function(){
      var draft = snapshotOrderDraft();
      closeModal();
      openOrderCustomerQuickForm(function(cust){
        draft.customerId = cust.id; draft.customer = cust.name;
        openOrderForm(draft);
      }, function(){ openOrderForm(draft); });
    });
    var wsAddBtn = m.querySelector("#f-workshop-add");
    if(wsAddBtn) wsAddBtn.addEventListener("click", function(){
      var draft = snapshotOrderDraft();
      closeModal();
      openWorkshopForm(null, function(workshopId){
        draft.workshopId = workshopId||"";
        openOrderForm(draft);
      }, function(){ openOrderForm(draft); });
    });
    var respAddBtn = m.querySelector("#f-responsible-add");
    if(respAddBtn) respAddBtn.addEventListener("click", function(){
      var draft = snapshotOrderDraft();
      closeModal();
      openEmployeeForm(null, function(empId){
        draft.responsibleEmployeeId = empId||"";
        openOrderForm(draft);
      }, null, function(){ openOrderForm(draft); });
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var customer = (o.customer||"").trim();
      if(!customer){ toast("Харидорни танланг"); return; }
      var items = readOrderRowsFromDom(m, o.items.map(function(x){ return Object.assign({},x); }));
      var cleanItems = items.filter(function(it){ return (it.product||"").trim() && Number(it.quantity)>0; });
      if(!cleanItems.length){ toast("Камида битта маҳсулот ва миқдорини киритинг"); return; }
      var g = computeOrderGrandTotals(cleanItems);
      var first = cleanItems[0];
      var paidAmount = Math.min(Number(o.paidAmount)||0, g.total);
      var data = {
        orderNumber: m.querySelector("#f-orderNumber").value.trim() || o.orderNumber,
        date: m.querySelector("#f-date").value || todayISO(),
        contractNumber: m.querySelector("#f-contractNumber").value.trim(),
        contractDate: m.querySelector("#f-contractDate").value,
        customer: customer,
        items: cleanItems,
        /* қуйидаги якка-майдонлар — эски (items[] дан олдинги) кодлар
           (Савдодаги "Боғлиқ буюртма" рўйхати, омбор тайёрлик текшируви
           ва ш.к.) учун МОСЛИК сақланиши учун биринчи қатордан олинган
           ёрдамчи нусха (aggregate); асосий маълумот endi items[] да. */
        warehouseId: first.warehouseId||"", itemId: first.itemId||"", product: first.product||"",
        quantity: first.quantity||0, unit: first.unit||"", priceListId: first.priceListId||"", price: first.price||0,
        subtotalAmount: g.subtotal, discountAmount: g.discount, totalAmount: g.total, vatAmount: g.vat,
        priority: m.querySelector("#f-priority").value || o.priority || "orta",
        outWarehouseId: o.outWarehouseId||"",
        dueDate: m.querySelector("#f-dueDate").value,
        paidAmount: paidAmount, debtAmount: Math.max(0, g.total-paidAmount),
        responsibleEmployeeId: m.querySelector("#f-responsible").value,
        workshopId: m.querySelector("#f-workshop").value,
        notes: m.querySelector("#f-notes").value.trim(),
      };
      var finishOrder = function(customerId){
        data.customerId = customerId||"";
        if(isEdit){
          dbUpdate("orders", o.id, data, STATE.orders);
          toast("Буюртма янгиланди");
        } else {
          /* 2026-10-03: буюртмада энди бир нечта маҳсулот бўлиши мумкин —
             БАРЧА маҳсулотлар омборда етарли бўлгандагина "Тайёр омборда"
             босқичига ўтади, акс ҳолда "Ишлаб чиқарилмоқда". */
          /* Қолдиқ ҚАТОРДА танланган омбор бўйича текширилади (омбор
             танланмаган бўлса — барча омборлар жами); бир хил маҳсулот
             бир нечта қаторда бўлса — миқдорлар қўшиб текширилади.
             Миқдор қолдиқдан КЎП бўлса — «Ишлаб чиқарилмоқда». */
          var needMap = {};
          cleanItems.forEach(function(it){
            var mi = it.itemId ? itemById(it.itemId) : findItemByExactName(it.product);
            var key = mi ? (mi.id+"|"+(it.warehouseId||"")) : ("?|"+it.product);
            if(!needMap[key]) needMap[key] = {mi:mi, wh:it.warehouseId||"", need:0};
            needMap[key].need += Number(it.quantity)||0;
          });
          var readyNow = Object.keys(needMap).every(function(k){
            var x = needMap[k];
            if(!x.mi || x.need<=0) return false;
            var have = x.wh ? stockQty(x.mi.id, x.wh) : totalStockQty(x.mi.id);
            return x.need <= have + 1e-9;
          });
          data.currentStageIndex = readyNow ? STAGE_READY_IDX : 1; data.completed=false; data.cancelled=false; data.createdAt = new Date().toISOString();
          dbAdd("orders", data, STATE.orders);
          toast(readyNow ? "Буюртма қўшилди — маҳсулот омборда бор, «Тайёр омборда» босқичига ўтказилди" : "Буюртма қўшилди — маҳсулот сони омбордаги қолдиқдан кўп, «Ишлаб чиқарилмоқда» ҳолатига ўтказилди");
        }
        closeModal();
      };
      /* Харидор энди танлов ойнаси/"+" орқали танланади, шунинг учун
         o.customerId деярли ҳар доим аллақачон маълум; қуйидаги номи
         бўйича қидириш/яратиш — фақат эски ёзувлар ёки чекка ҳолатлар
         учун хавфсизлик тўри сифатида сақланади. */
      if(o.customerId){ finishOrder(o.customerId); return; }
      var existingCustomer = resolveCustomerByName(customer);
      if(existingCustomer){ finishOrder(existingCustomer.id); }
      else if(STATE.db){
        var custTempId = "_pending_"+uid();
        var custData = {name:customer, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:"", createdAt:new Date().toISOString()};
        var custOptimistic = Object.assign({}, custData); custOptimistic.id=custTempId; custOptimistic._pending=true;
        STATE.customers.unshift(custOptimistic);
        col("customers").add(custData).then(function(ref){
          custOptimistic._pending=false;
          if(ref && ref.id) reconcilePendingId(custTempId, ref.id);
        }).catch(function(e){
          var idx=STATE.customers.indexOf(custOptimistic); if(idx>-1) STATE.customers.splice(idx,1);
          console.error(e);
        });
        finishOrder(custTempId);
      } else {
        var nc = {id:uid(), name:customer, inn:"", bankAccount:"", bankName:"", mfo:"", address:"", phone:"", contactPerson:"", note:""};
        STATE.customers.unshift(nc);
        finishOrder(nc.id);
      }
    });
  }

  function openOrderDetail(id){
    var o = STATE.orders.find(function(x){ return x.id===id; });
    if(!o) return;
    var st = orderStatus(o);
    var pr = PRIORITY[o.priority] || PRIORITY.orta;
    var curIdx = o.completed ? STAGE_NAMES.length : Math.min(o.currentStageIndex||0, STAGE_NAMES.length-1);
    var stepsHtml = STAGE_NAMES.map(function(name, idx){
      var cls = o.completed || idx < curIdx ? "done" : (idx===curIdx && !o.completed ? "current" : "");
      var dot = (cls==="done") ? ICONS.check : (idx+1);
      return '<div class="step '+cls+'"><div class="step-line"></div><div class="step-dot">'+dot+'</div><div class="step-label">'+esc(name)+'</div></div>';
    }).join("");

    var totalAmount = Number(o.totalAmount)||0, paidAmount = Number(o.paidAmount)||0;
    var debtAmount = o.debtAmount!=null ? Number(o.debtAmount)||0 : Math.max(0,totalAmount-paidAmount);
    var itemsForDetail = orderItemsList(o);
    var body = ''+
      '<div class="stepper">'+stepsHtml+'</div>'+
      '<div class="detail-grid">'+
        '<div><div class="dl">Харидор</div><div class="dd">'+esc(o.customer)+'</div></div>'+
        '<div><div class="dl">Сана</div><div class="dd">'+fmtDate(o.date||(o.createdAt||"").slice(0,10))+'</div></div>'+
        '<div><div class="dl">Муддати</div><div class="dd">'+fmtDateShort(o.dueDate)+'</div></div>'+
        '<div><div class="dl">Муддат ҳолати</div><div class="dd">'+esc(orderDaysLabel(o))+'</div></div>'+
        (o.contractNumber||o.contractDate?('<div><div class="dl">Шартнома</div><div class="dd">'+(o.contractNumber?esc(o.contractNumber):"—")+(o.contractDate?(" — "+fmtDateShort(o.contractDate)):"")+'</div></div>'):'')+
        '<div><div class="dl">Масъул шахс</div><div class="dd">'+(o.responsibleEmployeeId?esc(employeeName(o.responsibleEmployeeId)):"—")+'</div></div>'+
        '<div><div class="dl">Цех</div><div class="dd">'+(o.workshopId?esc(workshopName(o.workshopId)):"—")+'</div></div>'+
        '<div><div class="dl">Муҳимлик</div><div class="dd"><span class="chip '+pr.chip+'">'+pr.label+'</span></div></div>'+
        '<div><div class="dl">Ҳолат</div><div class="dd"><span class="chip '+st.chip+'">'+st.label+'</span></div></div>'+
      '</div>'+
      (itemsForDetail.length ? '<div style="margin-bottom:14px;">'+orderLinesViewTable(itemsForDetail)+'</div>' : '')+
      (totalAmount>0 ? '<div class="card" style="padding:14px 16px;margin-bottom:16px;">'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Буюртма суммаси (ҚҚС билан)</span><span class="num">'+fmtSum(totalAmount)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Шундан ҚҚС</span><span class="num">'+fmtSum(itemsForDetail.reduce(function(a,x){ return a+(Number(orderLineVat(x).vatAmount)||0); },0))+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2);margin-bottom:6px;"><span>Тўланган</span><span class="num">'+fmtSum(paidAmount)+'</span></div>'+
        '<div style="border-top:1px solid var(--border-strong);padding-top:8px;display:flex;justify-content:space-between;"><span style="font-weight:800;color:var(--critical);">Қарз</span><span class="num" style="font-size:16px;font-weight:800;color:var(--critical);">'+fmtSum(debtAmount)+'</span></div>'+
        '</div>' : '')+
      (o.notes ? '<div class="field"><label>Изоҳ</label><div style="font-size:13.5px;color:var(--ink-2);line-height:1.5;">'+esc(o.notes)+'</div></div>' : '');

    var foot = '';
    foot += '<button class="btn btn-secondary btn-sm" data-print-order>'+ICONS.printer+'Чоп этиш</button>';
    if(o.cancelled){
      foot += '<span style="flex:1"></span>';
      foot += '<button class="btn btn-secondary btn-sm" data-edit>'+ICONS.pencil+'Таҳрирлаш</button>';
      foot += '<button class="btn btn-primary btn-sm" data-restore-order>'+ICONS.restore+'Тиклаш</button>';
    } else if(!o.completed){
      if((o.currentStageIndex||0) > 0) foot += '<button class="btn btn-secondary btn-sm" data-prev>'+ICONS.arrowLeft+'Орқага</button>';
      foot += '<button class="btn btn-danger btn-sm" data-cancel-order>'+ICONS.ban+'Бекор қилиш</button>';
      foot += '<span style="flex:1"></span>';
      foot += '<button class="btn btn-secondary btn-sm" data-edit>'+ICONS.pencil+'Таҳрирлаш</button>';
      foot += '<button class="btn btn-primary btn-sm" data-next>Кейинги босқич'+ICONS.arrowRight+'</button>';
    } else {
      foot += '<button class="btn btn-danger btn-sm" data-cancel-order>'+ICONS.ban+'Бекор қилиш</button><span style="flex:1"></span><button class="btn btn-secondary btn-sm" data-edit>'+ICONS.pencil+'Таҳрирлаш</button>';
    }

    var m = openModal('<span class="num">'+esc(o.orderNumber)+'</span>', body, foot, true);
    m.querySelector(".modal").classList.add("xxwide");
    var editBtn = m.querySelector("[data-edit]");
    if(editBtn) editBtn.addEventListener("click", function(){ closeModal(); openOrderForm(o); });
    var printBtn = m.querySelector("[data-print-order]");
    if(printBtn) printBtn.addEventListener("click", function(){ printOrderWaybill(o); });
    var nextBtn = m.querySelector("[data-next]");
    if(nextBtn) nextBtn.addEventListener("click", function(){
      var idx = o.currentStageIndex||0;
      if(idx >= STAGE_NAMES.length-1){
        dbUpdate("orders", o.id, {completed:true, completedAt:new Date().toISOString(), currentStageIndex: STAGE_NAMES.length-1}, STATE.orders);
        toast("Буюртма бажарилди деб белгиланди");
      } else {
        dbUpdate("orders", o.id, {currentStageIndex: idx+1}, STATE.orders);
        toast("Кейинги босқичга ўтказилди");
      }
      closeModal();
    });
    var prevBtn = m.querySelector("[data-prev]");
    if(prevBtn) prevBtn.addEventListener("click", function(){
      var idx = Math.max(0,(o.currentStageIndex||0)-1);
      dbUpdate("orders", o.id, {currentStageIndex: idx}, STATE.orders);
      closeModal();
    });
    var cancelOrderBtn = m.querySelector("[data-cancel-order]");
    if(cancelOrderBtn) cancelOrderBtn.addEventListener("click", function(){
      closeModal();
      openConfirm("Буюртмани бекор қилиш", "«"+o.orderNumber+"» буюртмаси бекор қилинсинми? Буюртма тарихда хира кўринишда қолади, кейин \"Тиклаш\" тугмаси орқали қайта тикланиши мумкин.", "Ҳа, бекор қилиш", function(){
        dbUpdate("orders", o.id, {cancelled:true}, STATE.orders);
        toast("Буюртма бекор қилинди");
      }, true);
    });
    /* 2026-10-03 сўровига кўра: бекор қилинган буюртма бутунлай ўчирилмайди
       (фойдаланувчининг доимий "маълумот йўқотилмасин" талабига мувофиқ) —
       ўчириш тугмаси ўрнига тиклаш (restore) тугмаси қўйилди. */
    var restoreOrderBtn = m.querySelector("[data-restore-order]");
    if(restoreOrderBtn) restoreOrderBtn.addEventListener("click", function(){
      closeModal();
      openConfirm("Буюртмани тиклаш", "«"+o.orderNumber+"» буюртмаси қайта тикланиб, амалдаги буюртмалар рўйхатига қайтарилсинми?", "Ҳа, тиклаш", function(){
        dbUpdate("orders", o.id, {cancelled:false}, STATE.orders);
        toast("Буюртма тикланди");
      }, true);
    });
  }

