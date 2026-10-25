  /* ================= Касса рўйхатлари учун: филтр + қидирув + кунлик кўриниш ================= */
  /* Касса → Кирим/Чиқим/Конвертация/Кўчирма рўйхатлари учун умумий мотор
     (2026-10-01 сўрови): рўйхат сана бўйича (ЎСИШ эмас, КАМАЙИШ тартибида,
     киритилган санага кўра — яратилган вақтига эмас) сараланади, сўнг:
       1) агар қидирув матни бор бўлса — ШУ матн бўйича ФИЛТРЛАНГАН натижа
          (барча кунлар бўйлаб, кунлик чегарасиз) қайтарилади;
       2) акс ҳолда, агар сана-оралиғи филтри ёқилган бўлса — ШУ оралиқдаги
          барча ёзувлар (кунлик чегарасиз) қайтарилади;
       3) акс ҳолда — фақат БИТТА кунлик (ҳозир танланган, йўқ бўлса энг
          сўнгги) ёзувлар қайтарилади, ва пастда кун алмаштириш тугмалари
          чиқади (day pager). */
  function computeFilteredDayList(list, filterState, matchFn){
    var sorted = list.slice().sort(function(a,b){
      var ad = a.date||"", bd = b.date||"";
      if(ad!==bd) return bd.localeCompare(ad);
      return (b.createdAt||"").localeCompare(a.createdAt||"");
    });
    var q = (filterState.search||"").trim().toLowerCase();
    if(q){
      return { mode:"search", rows: sorted.filter(function(it){ return matchFn(it, q); }) };
    }
    if(filterState.active && (filterState.from||filterState.to)){
      return { mode:"filtered", rows: sorted.filter(function(it){
        if(filterState.from && (it.date||"") < filterState.from) return false;
        if(filterState.to && (it.date||"") > filterState.to) return false;
        return true;
      }) };
    }
    var dates = [];
    sorted.forEach(function(it){ if(dates.indexOf(it.date)===-1) dates.push(it.date); });
    if(!dates.length) return { mode:"day", dates:[], currentDate:"", rows:[] };
    if(!filterState.day || dates.indexOf(filterState.day)===-1) filterState.day = dates[0];
    return { mode:"day", dates:dates, currentDate:filterState.day, rows: sorted.filter(function(it){ return it.date===filterState.day; }) };
  }
  function listToolbarHtml(prefix, filterState){
    var active = filterState.active && (filterState.from||filterState.to);
    var chip = active ? ('<div class="pill-filter active" style="display:inline-flex;align-items:center;gap:7px;cursor:default;">'+
        'Филтр: '+(filterState.from?fmtDateShort(filterState.from):"…")+' — '+(filterState.to?fmtDateShort(filterState.to):"…")+
        '<button type="button" class="btn-ghost btn-icon" data-clr-filter="'+prefix+'" style="padding:0;width:16px;height:16px;display:inline-flex;" title="Филтрни олиб ташлаш">'+ICONS.x+'</button>'+
      '</div>') : '';
    return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'+
      '<button type="button" class="btn btn-secondary btn-icon" data-open-filter="'+prefix+'" title="Сана оралиғи бўйича филтр">'+ICONS.filter+'</button>'+
      chip+
      '<div class="search-box" style="max-width:280px;">'+ICONS.search+'<input type="text" id="'+prefix+'-search" placeholder="Излаш: контрагент, изоҳ, сумма…" value="'+esc(filterState.search||"")+'"></div>'+
      onlyActiveCheckboxHtml(prefix+"-onlyactive", filterState.onlyActive)+
    '</div>';
  }
  /* Фойдаланувчи сўровига кўра (2026-10-01): турли рўйхатларда "Фақат
     бажарилганлар" галочкаси — стандарт ҳолатда ёқилган, шунда бекор
     қилинган ёзувлар яширилади; ўчирилса, бекор қилинганлар ҳам кўринади. */
  function onlyActiveCheckboxHtml(id, checked){
    return '<label for="'+id+'" style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink-2);cursor:pointer;white-space:nowrap;user-select:none;">'+
      '<input type="checkbox" id="'+id+'" style="width:auto;flex-shrink:0;"'+(checked!==false?' checked':'')+'>Фақат бажарилганлар</label>';
  }
  function daySwitcherHtml(info){
    if(info.mode!=="day" || !info.dates || info.dates.length<1) return "";
    var idx = info.dates.indexOf(info.currentDate), total = info.dates.length;
    return '<div class="day-switcher">'+
      '<button type="button" class="btn btn-ghost btn-icon" data-day-prev="1"'+(idx>=total-1?' disabled':'')+' title="Олдинги кун">'+ICONS.arrowLeft+'</button>'+
      '<span class="day-switcher-label">'+fmtDateShort(info.currentDate)+' <span class="cell-muted" style="font-weight:600;">('+(idx+1)+' / '+total+' кун)</span></span>'+
      '<button type="button" class="btn btn-ghost btn-icon" data-day-next="1"'+(idx<=0?' disabled':'')+' title="Кейинги кун">'+ICONS.arrowRight+'</button>'+
    '</div>';
  }
  function openDateRangeFilterModal(filterState, rerender){
    var body = '<div class="field-row">'+
      '<div class="field"><label>Санадан</label><input type="date" id="drf-from" value="'+esc(filterState.from||"")+'"></div>'+
      '<div class="field"><label>Санагача</label><input type="date" id="drf-to" value="'+esc(filterState.to||"")+'"></div>'+
    '</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-ok>'+ICONS.search+'Излаш</button>';
    var m = openModal("Сана бўйича филтр", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", function(){
      closeModal();
      /* Фойдаланувчи сўровига кўра (2026-10-01): филтр ойнаси қайта
         очилганда "Бекор қилиш" тугмаси босилса, аввал қўлланган филтр
         ҳам олиб ташланиши керак (олдин фақат ойна ёпилиб, эски филтр
         ўзгармасдан қолаверарди). */
      if(filterState.active && (filterState.from||filterState.to)){
        filterState.active = false; filterState.from = ""; filterState.to = "";
        rerender();
      }
    });
    m.querySelector("[data-ok]").addEventListener("click", function(){
      var f = m.querySelector("#drf-from").value, t = m.querySelector("#drf-to").value;
      if(!f && !t){ toast("Камида битта санани киритинг"); return; }
      if(f && t && f>t){ toast("«Санадан» «Санагача»дан кейин бўлмаслиги керак"); return; }
      filterState.from = f; filterState.to = t; filterState.active = true;
      closeModal();
      rerender();
    });
  }
  function wireListToolbarAndDayPager(container, prefix, filterState, info, rerender){
    var searchEl = container.querySelector("#"+prefix+"-search");
    if(searchEl){
      searchEl.addEventListener("input", function(){ filterState.search = searchEl.value; rerender(); var e2=container.querySelector("#"+prefix+"-search"); if(e2){ e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); } });
    }
    var onlyActiveEl = container.querySelector("#"+prefix+"-onlyactive");
    if(onlyActiveEl){
      onlyActiveEl.addEventListener("change", function(){ filterState.onlyActive = onlyActiveEl.checked; rerender(); });
    }
    var openBtn = container.querySelector('[data-open-filter="'+prefix+'"]');
    if(openBtn) openBtn.addEventListener("click", function(){ openDateRangeFilterModal(filterState, rerender); });
    var clrBtn = container.querySelector('[data-clr-filter="'+prefix+'"]');
    if(clrBtn) clrBtn.addEventListener("click", function(e){ e.stopPropagation(); filterState.active=false; filterState.from=""; filterState.to=""; rerender(); });
    var dayPrev = container.querySelector('[data-day-prev="1"]');
    if(dayPrev) dayPrev.addEventListener("click", function(){
      var idx = info.dates.indexOf(info.currentDate);
      if(idx<info.dates.length-1){ filterState.day = info.dates[idx+1]; rerender(); }
    });
    var dayNext = container.querySelector('[data-day-next="1"]');
    if(dayNext) dayNext.addEventListener("click", function(){
      var idx = info.dates.indexOf(info.currentDate);
      if(idx>0){ filterState.day = info.dates[idx-1]; rerender(); }
    });
  }

