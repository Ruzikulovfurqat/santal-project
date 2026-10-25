  /* ================= view: kassa ================= */
  var CASH_ACCOUNT_TYPES = [["naqd","Нақд"],["hisob_raqam","Ҳисоб рақам"],["karta","Карта"],["boshqa","Бошқа"]];
  function cashAccountTypeLabel(t){ var f=CASH_ACCOUNT_TYPES.find(function(x){return x[0]===t;}); return f?f[1]:"Бошқа"; }
  var CASH_CATEGORIES = [["sotuv","Сотув"],["qarz_tolovi","Қарз тўлови"],["xomashyo_xarid","Хомашё харид"],["taminotchi_tolovi","Таъминотчига тўлов"],["ish_haqi","Иш ҳақи"],["qolga_kirim","Қўлда кирим"],["qolga_chiqim","Қўлда чиқим"],["boshqa","Бошқа"]];
  function cashCategoryLabel(c){ var f=CASH_CATEGORIES.find(function(x){return x[0]===c;}); return f?f[1]:(c||"Бошқа"); }


  function renderKassaAccounts(){
    setTopbar("Умумий Касса", STATE.cashAccounts.length+" та касса", '<button class="btn btn-primary" id="addCashAccBtn">'+ICONS.plus+'Касса яратиш</button>');
    var root = document.getElementById("content");
    var html = "";
    if(!STATE.cashAccounts.length){
      html += emptyState("Ҳали касса йўқ","«Касса яратиш» тугмаси орқали биринчи кассангизни қўшинг.");
    } else {
      /* Фойдаланувчи сўровига кўра (2026-10-01): ҳар бир кассада қанча
         нақд, карта, пул ўтказмаси ва доллар борлиги кассанинг ичига
         кирмасдан, умумий рўйхатда БИР ҚАРАШДА таққослаш мумкин бўлган
         тартибли жадвал кўринишида кўрсатилади (аввал шу маълумотлар
         ҳар бир карточка ичида алоҳида-алоҳида кўринар, таққослаш учун
         қулай эмасди). Босилганда кассанинг ичига кириш, Таҳрирлаш ва
         Ўчириш тугмалари олдингидек ишлайверади. */
      var totNaqd=0, totKarta=0, totOtkazma=0, totDollar=0;
      var rows = STATE.cashAccounts.map(function(a, idx){
        var b = cashAccountBalances(a.id);
        totNaqd += b.naqd; totKarta += b.karta; totOtkazma += b.otkazma; totDollar += b.dollar;
        return '<tr class="kassa-row" data-open-kassa="'+a.id+'">'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-strong" style="display:flex;align-items:center;gap:8px;white-space:nowrap;">'+ICONS.wallet+'<span>'+esc(a.name)+'</span></td>'+
          '<td class="num cell-strong">'+fmtSum(b.naqd)+'</td>'+
          '<td class="num cell-strong">'+fmtSum(b.karta)+'</td>'+
          '<td class="num cell-strong">'+fmtSum(b.otkazma)+'</td>'+
          '<td class="num cell-strong">'+fmtUsd(b.dollar)+'</td>'+
          '<td><div class="row-actions">'+
            '<button class="btn btn-ghost btn-icon" data-edit-cash="'+a.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-exp-cash="'+a.id+'" title="Excel’га юклаш">'+ICONS.download+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-del-cash="'+a.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
          '</div></td></tr>';
      }).join("");
      var totalsRow = STATE.cashAccounts.length>1 ? ('<tr style="font-weight:800;background:var(--surface-2);">'+
        '<td></td><td>Жами</td>'+
        '<td class="num">'+fmtSum(totNaqd)+'</td>'+
        '<td class="num">'+fmtSum(totKarta)+'</td>'+
        '<td class="num">'+fmtSum(totOtkazma)+'</td>'+
        '<td class="num">'+fmtUsd(totDollar)+'</td>'+
        '<td></td></tr>') : '';
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Касса номи</th><th>Нақд</th><th>Карта</th><th>Пул ўтказмаси</th><th>Доллар</th><th></th></tr></thead><tbody>'+rows+totalsRow+'</tbody></table></div>';
    }
    root.innerHTML = html;
    document.getElementById("addCashAccBtn").addEventListener("click", function(){ openCashAccountForm(null); });
    root.querySelectorAll("[data-open-kassa]").forEach(function(card){
      card.addEventListener("click", function(){
        STATE.kassaAccountId = card.getAttribute("data-open-kassa");
        STATE.kassaView = "detail";
        STATE.kassaTab = "main";
        render();
      });
    });
    root.querySelectorAll("[data-edit-cash]").forEach(function(b){ b.addEventListener("click", function(e){ e.stopPropagation(); openCashAccountForm(cashAccountById(b.getAttribute("data-edit-cash"))); }); });
    root.querySelectorAll("[data-exp-cash]").forEach(function(b){ b.addEventListener("click", function(e){ e.stopPropagation(); exportKassaAccountDetail(cashAccountById(b.getAttribute("data-exp-cash"))); }); });
    root.querySelectorAll("[data-del-cash]").forEach(function(b){ b.addEventListener("click", function(e){
      e.stopPropagation();
      var a = cashAccountById(b.getAttribute("data-del-cash"));
      openConfirm("Кассани ўчириш","«"+a.name+"» ўчирилсинми? Боғлиқ ҳаракатлар тарихда қолади.","Ҳа, ўчириш", function(){ dbDelete("cashAccounts", a.id, STATE.cashAccounts); toast("Ўчирилди"); }, true);
    }); });
  }

  function openCashAccountForm(existing){
    var isEdit = !!existing;
    var a = existing || {name:"", initialBalance:0, initialBalanceKarta:0, initialBalanceOtkazma:0, initialBalanceDollar:0, initialBalanceOtkazmaUsd:0};
    var body = '<div class="field"><label>Номи</label><input id="ca-name" placeholder="Масалан: Асосий касса" value="'+esc(a.name)+'"></div>'+
      '<div class="field"><label>Қайси цехга тегишли <span class="opt">(ихтиёрий)</span></label><select id="ca-ws"><option value="">— бириктирилмаган —</option>'+DASH_WORKSHOPS.map(function(d){ return '<option value="'+d.key+'"'+((isEdit&&dwAccKey(a)===d.key)?" selected":"")+'>'+esc(d.name)+'</option>'; }).join("")+'</select><div class="field-hint">Бошқарув панелида цех ҳисоботига шу орқали киради.</div></div>'+
      (isEdit?'':(
        '<div class="field-hint" style="margin:-4px 0 4px;">Бошланғич қолдиқлар (ихтиёрий)</div>'+
        '<div class="field-row"><div class="field"><label>Нақд (сўм)</label><input id="ca-initial" type="number" min="0" step="any" value="0"></div>'+
        '<div class="field"><label>Карта (сўм)</label><input id="ca-initial-karta" type="number" min="0" step="any" value="0"></div></div>'+
        '<div class="field-row"><div class="field"><label>Ҳисоб рақам (сўм)</label><input id="ca-initial-otkazma" type="number" min="0" step="any" value="0"></div>'+
        '<div class="field"><label>Ҳисоб рақам ($)</label><input id="ca-initial-otkazma-usd" type="number" min="0" step="any" value="0"></div></div>'+
        '<div class="field"><label>Нақд ($)</label><input id="ca-initial-dollar" type="number" min="0" step="any" value="0"></div>'
      ));
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>'+(isEdit?"Сақлаш":"Яратиш")+'</button>';
    var m = openModal(isEdit?"Кассани таҳрирлаш":"Янги касса", body, foot);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#ca-name").value.trim();
      if(!name){ toast("Номини киритинг"); return; }
      var data = {name:name};
      var caWsKey = m.querySelector("#ca-ws").value;
      if(isEdit){
        /* Цех майдони фақат ўзгартирилган бўлсагина ёзилади (аввалги қиймат сақланади). */
        if(caWsKey!==dwAccKey(a)) data.workshopId = caWsKey ? dwEnsure(caWsKey) : "";
        dbUpdate("cashAccounts", a.id, data, STATE.cashAccounts);
      } else {
        data.initialBalance = Number(m.querySelector("#ca-initial").value)||0;
        data.initialBalanceKarta = Number(m.querySelector("#ca-initial-karta").value)||0;
        data.initialBalanceOtkazma = Number(m.querySelector("#ca-initial-otkazma").value)||0;
        data.initialBalanceDollar = Number(m.querySelector("#ca-initial-dollar").value)||0;
        data.initialBalanceOtkazmaUsd = Number(m.querySelector("#ca-initial-otkazma-usd").value)||0;
        if(caWsKey) data.workshopId = dwEnsure(caWsKey);
        data.createdAt = new Date().toISOString();
        dbAdd("cashAccounts", data, STATE.cashAccounts);
      }
      toast("Сақланди");
      closeModal();
    });
  }

  var KASSA_TABS = [["kirim","Кирим"],["chiqim","Чиқим"],["konvert","Конвертация"],["kuchirma","Кўчирма"],["koldiq","Қолдиқ"]];
  function kassaDetailSubnav(active){
    return '<div class="filter-row" style="margin-bottom:18px;">'+KASSA_TABS.map(function(t){return '<button class="pill-filter'+(active===t[0]?" active":"")+'" data-kassatab="'+t[0]+'">'+t[1]+'</button>';}).join("")+'</div>';
  }
