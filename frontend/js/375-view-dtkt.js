  /* ================= view: sales → ДТ-КТ ================= */
  /* Мижозлар ёнидаги «ДТ-КТ» бўлими: тепадаги «Яратиш» тугмаси ойна очади —
     сана, «Дебиторлар» ва/ёки «Кредиторлар» белгиси. Белги қўйилса, шу
     гуруҳ учун жадвал чиқади: тартиб рақами, исм катаги (босилса харидорлар /
     етказиб берувчилар рўйхати қидирув билан очилади, ёнидаги «+» янгисини
     қўшади), пул бирлиги (сўм / доллар), сумма ва қаторни қўшиш / ўчириш.
     Доллар танланса сумма 3 катакка ажралади: доллар, курс, сўмдаги
     кўпайтма (автоматик). Ёзувлар «dtkt» коллекциясида сақланади. */
  function dtktRowSom(r){
    return r.cur==="USD" ? r2((Number(r.usd)||0)*(Number(r.rate)||0)) : (Number(r.sum)||0);
  }
  function dtktTotal(rows){ return rows.reduce(function(s,r){ return s+dtktRowSom(r); }, 0); }
  function dtktBlankRow(date){ return {name:"", type:"", refId:"", cur:"UZS", sum:0, usd:0, rate:finRateOn(date)}; }
  /* Қатор кимга тегишли: "customer" (харидор) ёки "supplier" (етказиб
     берувчи). Эски ёзувларда тур сақланмаган — у ҳолда Дебиторлар қатори
     харидор, Кредиторлар қатори етказиб берувчи деб олинади. */
  function dtktRowType(r, kind){
    return r.type==="customer" || r.type==="supplier" ? r.type : (kind==="deb" ? "customer" : "supplier");
  }
  function dtktNewDraft(){
    var d = {id:"", date:todayISO(), deb:false, cred:false, debtors:[], creditors:[]};
    d.debtors.push(dtktBlankRow(d.date)); d.creditors.push(dtktBlankRow(d.date));
    return d;
  }
  function dtktDraftFromDoc(doc){
    var copyRows = function(rows, kind){
      return (rows||[]).map(function(x){
        return {name:x.name||"", type:dtktRowType(x, kind), refId:x.refId||"", cur:x.cur==="USD"?"USD":"UZS", sum:x.cur==="USD"?0:(Number(x.amount)||0), usd:Number(x.usd)||0, rate:Number(x.rate)||0};
      });
    };
    var d = {id:doc.id, date:doc.date||todayISO(), deb:(doc.debtors||[]).length>0, cred:(doc.creditors||[]).length>0,
      debtors:copyRows(doc.debtors, "deb"), creditors:copyRows(doc.creditors, "cred")};
    if(!d.debtors.length) d.debtors.push(dtktBlankRow(d.date));
    if(!d.creditors.length) d.creditors.push(dtktBlankRow(d.date));
    return d;
  }

  /* Солиштирма далолатнома тарихи учун: танланган харидор (type="customer")
     ёки етказиб берувчи (type="supplier") бўйича ДТ-КТ қаторлари. Дебиторлар
     ҳам, Кредиторлар ҳам харидор ёки етказиб берувчи бўлиши мумкин, шунинг
     учун иккала рўйхат текширилади. Кимга тегишлилиги турига қараб id
     бўйича, id топилмаса (ёки исм ўзгармаган бўлса) исм бўйича аниқланади. */
  function dtktLedgerEntries(type, who){
    var whoRec = type==="customer" ? customerById(who) : supplierById(who);
    var whoName = whoRec ? (whoRec.name||"").trim().toLowerCase() : "";
    var entries = [];
    STATE.dtkt.forEach(function(doc){
      [["deb", doc.debtors], ["cred", doc.creditors]].forEach(function(grp){
        var kind = grp[0];
        (grp[1]||[]).forEach(function(r){
          if(dtktRowType(r, kind)!==type) return;
          var mine = (r.refId && r.refId===who) || (!!whoName && (r.name||"").trim().toLowerCase()===whoName);
          var amt = Number(r.amount)||0;
          if(!mine || !amt) return;
          var desc = "Бошланғич қолдиқ (ДТ-КТ)"+(r.cur==="USD" ? " — $"+fmtNum(r.usd)+" × "+fmtNum(r.rate) : "");
          /* Дебиторлар: мусбат — улар бизга қарздор (чиким), манфий — ортиқча
             пули бор (кирим). Кредиторлар: мусбат — биз қарздормиз (кирим),
             манфий — биз ортиқча тўлаганмиз (чиким). Бу ҳам харидорга, ҳам
             етказиб берувчига бир хил қўлланади. */
          var asKirim = kind==="deb" ? amt<0 : amt>0;
          entries.push({date:doc.date||(doc.createdAt||"").slice(0,10), createdAt:doc.createdAt||"", desc:desc,
            kirim:asKirim?Math.abs(amt):0, chiqim:asKirim?0:Math.abs(amt), _kind:"dtkt", _ref:doc});
        });
      });
    });
    return entries;
  }

  /* Харидор ёки етказиб берувчини танлаш ойнаси: тепада икки тугма — босилган
     гуруҳнинг рўйхати чиқади; қидирувга ёзилса иккала рўйхатдан қидирилади.
     onPicked(type, id, name). Ойна ёпилса onClose чақирилади. */
  function openDtktPartyPicker(onPicked, onClose){
    var pickType = "";
    var body = '<div class="seg" style="margin-bottom:12px;">'+
        '<button type="button" class="dtp-type" data-type="customer">Харидор</button>'+
        '<button type="button" class="dtp-type" data-type="supplier">Етказиб берувчи</button>'+
      '</div>'+
      personSelectSearchBoxHtml("dtp-search")+
      '<div id="dtp-list" style="max-height:380px;overflow-y:auto;"></div>';
    var m = openModal("Харидор ёки етказиб берувчини танлаш", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>', true);
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onClose) onClose(); });
    var listEl = m.querySelector("#dtp-list");
    var label = {customer:"Харидор", supplier:"Етказиб берувчи"};
    function renderList(){
      var q = m.querySelector("#dtp-search").value.trim().toLowerCase();
      var items = [];
      ["customer","supplier"].forEach(function(t){
        if(!q && pickType!==t) return;
        (t==="customer" ? STATE.customers : STATE.suppliers).forEach(function(p){
          if(q && (p.name||"").toLowerCase().indexOf(q)<0) return;
          items.push({type:t, p:p});
        });
      });
      if(!q && !pickType){
        listEl.innerHTML = '<div class="field-hint">Юқоридаги «Харидор» ёки «Етказиб берувчи» тугмасини босинг ёки номини ёзиб қидиринг.</div>';
        return;
      }
      items.sort(function(a,b){ return (a.p.name||"").localeCompare(b.p.name||""); });
      if(!items.length){ listEl.innerHTML = emptyState("Топилмади", q ? "Бундай ном харидорлар ҳам, етказиб берувчилар орасида ҳам йўқ." : "Рўйхат бўш."); return; }
      listEl.innerHTML = '<div class="table-wrap"><table><tbody>'+items.map(function(x){
        return '<tr class="dtp-row" data-type="'+x.type+'" data-id="'+esc(x.p.id)+'" style="cursor:pointer;"><td class="cell-strong">'+esc(x.p.name)+'</td>'+
          '<td><span class="chip chip-neutral">'+label[x.type]+'</span></td><td style="text-align:right;width:24px;">'+ICONS.arrowRight+'</td></tr>';
      }).join("")+'</tbody></table></div>';
      listEl.querySelectorAll(".dtp-row").forEach(function(rowEl){
        rowEl.addEventListener("click", function(){
          var t = rowEl.getAttribute("data-type"), id = rowEl.getAttribute("data-id");
          var rec = t==="customer" ? customerById(id) : supplierById(id);
          closeModal();
          onPicked(t, id, rec ? rec.name : "");
        });
      });
    }
    m.querySelectorAll(".dtp-type").forEach(function(b){
      b.addEventListener("click", function(){
        pickType = b.getAttribute("data-type");
        m.querySelectorAll(".dtp-type").forEach(function(b2){ b2.classList.toggle("active", b2===b); });
        m.querySelector("#dtp-search").value = "";
        renderList();
      });
    });
    m.querySelector("#dtp-search").addEventListener("input", renderList);
    renderList();
  }

  /* «+» тугмаси: янги ким қўшилади — аввал тур сўралади, сўнг тегишли шакл очилади. */
  function openDtktNewPartyChoice(onType, onClose){
    var body = '<div style="display:flex;gap:10px;flex-wrap:wrap;">'+
      '<button type="button" class="btn btn-secondary" data-t="customer" style="flex:1;min-height:44px;">Янги харидор</button>'+
      '<button type="button" class="btn btn-secondary" data-t="supplier" style="flex:1;min-height:44px;">Янги етказиб берувчи</button></div>';
    var m = openModal("Ким қўшилади?", body, '<button class="btn btn-secondary" data-close>Ёпиш</button>');
    m.querySelector("[data-close]").addEventListener("click", function(){ closeModal(); if(onClose) onClose(); });
    m.querySelectorAll("[data-t]").forEach(function(b){
      b.addEventListener("click", function(){ var t = b.getAttribute("data-t"); closeModal(); onType(t); });
    });
  }

  /* Минус белгисини ҳам қабул қиладиган сумма майдони — wireSumInputFormatting
     ёлғиз «-»ни дарҳол ўчириб юборади, шунинг учун «-500 000» ёзиш мумкин
     эмас эди. Қолгани (мингликлар, 2 хонали вергул) ўша мантиқ. */
  function dtktWireAmount(inputEl, onChange){
    inputEl.setAttribute("inputmode","decimal");
    inputEl.addEventListener("input", function(){
      var raw = inputEl.value;
      var caret = inputEl.selectionStart==null ? raw.length : inputEl.selectionStart;
      var digitsBefore = raw.slice(0, caret).replace(/[^\d]/g,"").length;
      var neg = /^\s*[-−–]/.test(raw);
      var cleaned = raw.replace(/[^\d,]/g,"");
      var commaIdx = cleaned.indexOf(",");
      var intPart = (commaIdx>-1 ? cleaned.slice(0,commaIdx) : cleaned).replace(/^0+(?=\d)/,"");
      var decPart = commaIdx>-1 ? cleaned.slice(commaIdx+1).replace(/,/g,"").slice(0,2) : null;
      var newVal = (neg?"-":"") + groupThousandsStr(intPart) + (decPart!=null ? ","+decPart : "");
      inputEl.value = newVal;
      var pos = neg ? 1 : 0, seen = 0;
      while(pos<newVal.length && seen<digitsBefore){ if(/\d/.test(newVal[pos])) seen++; pos++; }
      inputEl.setSelectionRange(pos,pos);
      if(onChange) onChange(parseSumInputValue(newVal));
    });
  }

  function renderCustomersDtKt(){
    var list = STATE.dtkt.slice().sort(function(a,b){
      return (b.date||"").localeCompare(a.date||"") || (b.createdAt||"").localeCompare(a.createdAt||"");
    });
    setTopbar("ДТ-КТ", list.length+" та ёзув", '<button class="btn btn-primary" id="dtktCreateBtn">'+ICONS.plus+'Яратиш</button>');
    var root = document.getElementById("content");
    var html = salesSubnav("dtkt");
    if(!list.length){
      html += emptyState("ДТ-КТ ёзуви йўқ","Тепадаги «Яратиш» тугмаси орқали дебиторлар ва кредиторлар рўйхатини киритинг.");
    } else {
      var rows = list.map(function(x, idx){
        var deb = x.debtors||[], cred = x.creditors||[];
        var cell = function(arr, total){ return arr.length ? '<span class="cell-muted">'+arr.length+' та · </span>'+fmtSum(total) : '<span class="cell-muted">—</span>'; };
        return '<tr>'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-strong">'+fmtDateShort(x.date)+'</td>'+
          '<td class="num">'+cell(deb, x.debtorsTotal)+'</td>'+
          '<td class="num">'+cell(cred, x.creditorsTotal)+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-dtkt-edit="'+x.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-dtkt-del="'+x.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сана</th><th>Дебиторлар</th><th>Кредиторлар</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    wireSalesSubnav(root);
    document.getElementById("dtktCreateBtn").addEventListener("click", function(){ openDtKtForm(dtktNewDraft()); });
    root.querySelectorAll("[data-dtkt-edit]").forEach(function(b){ b.addEventListener("click", function(){
      var doc = STATE.dtkt.find(function(x){ return x.id===b.getAttribute("data-dtkt-edit"); });
      if(doc) openDtKtForm(dtktDraftFromDoc(doc));
    }); });
    root.querySelectorAll("[data-dtkt-del]").forEach(function(b){ b.addEventListener("click", function(){
      var id = b.getAttribute("data-dtkt-del");
      openConfirm("ДТ-КТ ёзувини ўчириш","Бу ёзув ўчирилсинми?","Ҳа, ўчириш", function(){ dbDelete("dtkt", id, STATE.dtkt); toast("Ўчирилди"); }, true);
    }); });
  }

  var DTKT_INPUT_STYLE = "padding:8px 10px;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg);";
  function dtktSectionHtml(d, kind){
    var rows = kind==="deb" ? d.debtors : d.creditors;
    var title = kind==="deb" ? "Дебиторлар" : "Кредиторлар";
    var newTitle = "Янги харидор ёки етказиб берувчи қўшиш";
    var body = rows.map(function(r, i){
      var amt;
      if(r.cur==="USD"){
        amt = '<div style="display:flex;gap:6px;">'+
          '<input data-f="usd" placeholder="Доллар" style="'+DTKT_INPUT_STYLE+'min-width:90px;flex:1;width:0;" value="'+(r.usd?esc(formatSumInputValue(r.usd)):"")+'">'+
          '<input data-f="rate" placeholder="Курс" style="'+DTKT_INPUT_STYLE+'min-width:90px;flex:1;width:0;" value="'+(r.rate?esc(formatSumInputValue(r.rate)):"")+'">'+
          '<input data-f="som" readonly tabindex="-1" placeholder="Сўм" style="'+DTKT_INPUT_STYLE+'min-width:110px;flex:1.2;width:0;font-weight:600;" value="'+(dtktRowSom(r)?esc(formatSumInputValue(dtktRowSom(r))):"")+'">'+
          '</div>';
      } else {
        amt = '<input data-f="sum" placeholder="Сумма" style="'+DTKT_INPUT_STYLE+'width:100%;min-width:160px;" value="'+(r.sum?esc(formatSumInputValue(r.sum)):"")+'">';
      }
      return '<tr data-i="'+i+'">'+
        '<td class="cell-muted" style="width:36px;">'+(i+1)+'</td>'+
        '<td><div style="display:flex;gap:6px;align-items:center;">'+
          '<button type="button" class="btn btn-secondary" data-act="pick" style="flex:1;justify-content:flex-start;text-align:left;min-height:38px;">'+(r.name?(esc(r.name)+' <span class="chip chip-neutral" style="margin-left:6px;">'+(dtktRowType(r, kind)==="supplier"?"Етказиб берувчи":"Харидор")+'</span>'):'<span class="cell-muted">Танланг…</span>')+'</button>'+
          '<button type="button" class="btn btn-ghost btn-icon" data-act="new" title="'+newTitle+'">'+ICONS.plus+'</button>'+
        '</div></td>'+
        '<td style="width:120px;"><select data-f="cur" style="'+DTKT_INPUT_STYLE+'width:100%;"><option value="UZS"'+(r.cur==="UZS"?" selected":"")+'>Сўм</option><option value="USD"'+(r.cur==="USD"?" selected":"")+'>Доллар</option></select></td>'+
        '<td>'+amt+'</td>'+
        '<td style="width:84px;"><div class="row-actions">'+
          '<button type="button" class="btn btn-ghost btn-icon" data-act="add" title="Пастдан қатор қўшиш" style="font-size:18px;">+</button>'+
          '<button type="button" class="btn btn-ghost btn-icon" data-act="del" title="Қаторни олиб ташлаш" style="font-size:18px;">−</button>'+
        '</div></td></tr>';
    }).join("");
    var hint = kind==="deb"
      ? "Мусбат сумма — шу шахс бизга қарздор. «−» қўйилса — унинг ортиқча тўлаган пули (биз қарздормиз)."
      : "Мусбат сумма — биз шу шахсга қарздормиз. «−» қўйилса — биз унга ортиқча тўлаганмиз.";
    return '<div class="section-head" style="margin-top:14px;"><h2 style="font-size:14.5px;">'+title+'</h2><div class="hint">'+hint+'</div></div>'+
      '<div class="table-wrap"><table><thead><tr><th>№</th><th>Харидор ёки етказиб берувчи</th><th>Пул бирлиги</th><th>Сумма</th><th></th></tr></thead>'+
      '<tbody>'+body+
      '<tr><td></td><td class="cell-strong">Жами</td><td></td><td class="cell-strong" data-total style="text-align:right;">'+fmtSum(dtktTotal(rows))+'</td><td></td></tr>'+
      '</tbody></table></div>';
  }

  function openDtKtForm(d){
    var isEdit = !!d.id;
    var body = '<div class="field" style="max-width:220px;"><label>Сана</label><input type="date" id="dtkt-date" value="'+esc(d.date)+'"></div>'+
      '<div style="display:flex;gap:28px;flex-wrap:wrap;margin:6px 0 2px;">'+
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="dtkt-deb"'+(d.deb?" checked":"")+'> Дебиторлар</label>'+
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="dtkt-cred"'+(d.cred?" checked":"")+'> Кредиторлар</label>'+
      '</div>'+
      '<div id="dtkt-sec-deb"></div><div id="dtkt-sec-cred"></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Яратиш")+'</button>';
    var m = openModal(isEdit?"ДТ-КТ ни таҳрирлаш":"ДТ-КТ яратиш", body, foot, "xwide");
    var dateEl = m.querySelector("#dtkt-date");
    dateEl.addEventListener("input", function(){ d.date = dateEl.value; });

    var secEl = { deb:m.querySelector("#dtkt-sec-deb"), cred:m.querySelector("#dtkt-sec-cred") };
    function reopen(){ openDtKtForm(d); }

    function paintSection(kind){
      var on = kind==="deb" ? d.deb : d.cred;
      var el = secEl[kind];
      if(!on){ el.innerHTML = ""; return; }
      var rows = kind==="deb" ? d.debtors : d.creditors;
      el.innerHTML = dtktSectionHtml(d, kind);
      var updTotal = function(){ el.querySelector("[data-total]").textContent = fmtSum(dtktTotal(rows)); };
      el.querySelectorAll("tbody tr[data-i]").forEach(function(tr){
        var r = rows[Number(tr.getAttribute("data-i"))];
        var field = function(f){ return tr.querySelector('[data-f="'+f+'"]'); };
        var somEl = field("som");
        var updSom = function(){ if(somEl){ var v = dtktRowSom(r); somEl.value = v ? formatSumInputValue(v) : ""; } updTotal(); };
        /* сўм ва доллар суммаси манфий бўлиши мумкин (ортиқча пул); курс — йўқ */
        ["sum","usd"].forEach(function(f){
          var inp = field(f);
          if(inp) dtktWireAmount(inp, function(v){ r[f] = v; updSom(); });
        });
        var rateInp = field("rate");
        if(rateInp) wireSumInputFormatting(rateInp, function(v){ r.rate = v; updSom(); });
        field("cur").addEventListener("change", function(){
          r.cur = this.value;
          if(r.cur==="USD" && !r.rate) r.rate = finRateOn(d.date);
          paintSection(kind);
        });
        tr.querySelector('[data-act="pick"]').addEventListener("click", function(){
          closeModal();
          openDtktPartyPicker(function(t, id, name){ r.type = t; r.refId = id; r.name = name||""; reopen(); }, reopen);
        });
        tr.querySelector('[data-act="new"]').addEventListener("click", function(){
          closeModal();
          openDtktNewPartyChoice(function(t){
            var saved = function(id, name){ r.type = t; r.refId = id||""; r.name = name||""; reopen(); };
            if(t==="customer") openCustomerForm(null, saved, reopen);
            else openSupplierForm(null, saved, reopen);
          }, reopen);
        });
        tr.querySelector('[data-act="add"]').addEventListener("click", function(){
          rows.push(dtktBlankRow(d.date)); paintSection(kind);
        });
        tr.querySelector('[data-act="del"]').addEventListener("click", function(){
          rows.splice(Number(tr.getAttribute("data-i")), 1);
          if(!rows.length) rows.push(dtktBlankRow(d.date));
          paintSection(kind);
        });
      });
    }
    paintSection("deb"); paintSection("cred");
    m.querySelector("#dtkt-deb").addEventListener("change", function(){ d.deb = this.checked; paintSection("deb"); });
    m.querySelector("#dtkt-cred").addEventListener("change", function(){ d.cred = this.checked; paintSection("cred"); });

    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      if(!d.date){ toast("Санани киритинг"); return; }
      if(!d.deb && !d.cred){ toast("Дебиторлар ёки Кредиторлар белгисини қўйинг"); return; }
      var failed = "";
      var build = function(rows, kind, label){
        var out = [];
        rows.forEach(function(r, i){
          var som = dtktRowSom(r);
          var blank = !r.name && !som && !Number(r.usd);
          if(blank) return;
          if(!r.name){ failed = failed || (label+": "+(i+1)+"-қатор — исмни танланг"); return; }
          if(r.cur==="USD"){
            if(!Number(r.usd) || !(Number(r.rate)>0)){ failed = failed || (label+": "+(i+1)+"-қатор — доллар ва курсни киритинг"); return; }
          } else if(!som){ failed = failed || (label+": "+(i+1)+"-қатор — суммани киритинг"); return; }
          var type = dtktRowType(r, kind);
          var pool = type==="supplier" ? STATE.suppliers : STATE.customers;
          var found = pool.find(function(x){ return x.id===r.refId; }) ||
            pool.find(function(x){ return (x.name||"").trim().toLowerCase()===r.name.trim().toLowerCase(); });
          out.push({name:r.name, type:type, refId:found?found.id:"", cur:r.cur, amount:som,
            usd:r.cur==="USD"?Number(r.usd):0, rate:r.cur==="USD"?Number(r.rate):0});
        });
        return out;
      };
      var debtors = d.deb ? build(d.debtors, "deb", "Дебиторлар") : [];
      var creditors = d.cred ? build(d.creditors, "cred", "Кредиторлар") : [];
      if(failed){ toast(failed); return; }
      if(!debtors.length && !creditors.length){ toast("Камида битта қатор тўлдиринг"); return; }
      var sum = function(a){ return a.reduce(function(s,x){ return s+x.amount; }, 0); };
      var data = {date:d.date, debtors:debtors, creditors:creditors, debtorsTotal:sum(debtors), creditorsTotal:sum(creditors)};
      closeModal();
      if(isEdit){ data.updatedAt = new Date().toISOString(); dbUpdate("dtkt", d.id, data, STATE.dtkt); }
      else { data.createdAt = new Date().toISOString(); dbAdd("dtkt", data, STATE.dtkt); }
      toast("Сақланди");
    });
  }

