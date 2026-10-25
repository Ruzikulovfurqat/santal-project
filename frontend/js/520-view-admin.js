  /* ================= view: Админ панел ================= */
  /* Фойдаланувчи сўровига кўра (2026-10-01): янги фойдаланувчи яратиш,
     унга исм/логин/парол/роль ва кўринадиган менюлар рўйхатини
     белгилаш. Рўйхат "Ходимлар рўйхати" бўлимидаги операциялар
     рўйхати билан БИР ХИЛ андозада: тартиб рақами, маълумотлар ва
     ёнида Таҳрирлаш/Бекор қилиш/Тиклаш тугмалари (ҳеч қачон тўлиқ
     ўчирилмайди — фақат cancelled белгиси билан яширилади). */
  /* ---------- Базани тозалаш (танлаб ўчириш) ----------
     Фойдаланувчи сўровига кўра (2026-10-15): Админ панелда «Базани юклаб
     олиш» ёнида «Базани тозалаш» тугмаси. Ўчириш ФАҚАТ белгиланган
     гуруҳлар бўйича бажарилади — белгиланмагани жойида қолади. Амал
     қайтарилмайди, шунга кўра аввал Админ PIN, сўнг тасдиқлаш сўралади. */
  var DB_WIPE_GROUPS = [
    {key:"orders",     name:"Харидор буюртмалари",                 cols:[["orders","orders"]]},
    {key:"sales",      name:"Сотувлар, прайслар, қарз тўловлари",  cols:[["sales","sales"],["priceLists","priceLists"],["debtPayments","debtPayments"]]},
    {key:"customers",  name:"Харидорлар (мижозлар)",               cols:[["customers","customers"]]},
    {key:"whmoves",    name:"Омбор ҳаракатлари (кирим, кўчириш, ҳисобдан чиқариш, инвентаризация, лом)",
                       cols:[["receipts","receipts"],["transfers","transfers"],["writeoffs","writeoffs"],["inventories","inventories"],
                             ["lomCalcs","lomCalcs"],["lomReturns","lomReturns"],["wh2Orders","wh2Orders"],["wh2Receipts","wh2Receipts"],["wh2Chikims","wh2Chikims"]]},
    {key:"stock",      name:"Омбор қолдиқлари",                    cols:[["stock","stock"]]},
    {key:"items",      name:"Номенклатура (хомашё ва маҳсулотлар)",cols:[["items","items"]]},
    {key:"equipment",  name:"Ускуна ва жиҳозлар",                  cols:[["equipment","equipment"],["equipmentReceipts","equipmentReceipts"],["equipmentAssignments","equipmentAssignments"]]},
    {key:"suppliers",  name:"Таъминотчилар ва уларга тўловлар",    cols:[["suppliers","suppliers"],["supplierPayments","supplierPayments"]]},
    {key:"recipes",    name:"Калькуляциялар ва иш ставкалари",     cols:[["recipes","recipes"],["laborCalcs","laborCalcs"]]},
    {key:"productions",name:"Ишлаб чиқариш тарихи",                cols:[["productions","productions"]]},
    {key:"cashops",    name:"Касса ҳаракатлари (кирим, чиқим, конвертация, кўчирма)",
                       cols:[["cashTransactions","cashTransactions"],["cashConversions","cashConversions"],["cashTransfers","cashTransfers"]]},
    {key:"cashaccs",   name:"Кассалар",                            cols:[["cashAccounts","cashAccounts"]]},
    {key:"finance",    name:"Молия бўлими (курслар, тақсимот бўлимлари, ўтказмалар)",
                       cols:[["fxRates","fxRates"],["financeSplits","financeSplits"],["financeTransfers","financeTransfers"]]},
    {key:"hisobot",    name:"Ҳисобот (ёпилган ойлик ҳисоботлар)",  cols:[["monthlyReports","monthlyReports"]]},
    {key:"payroll",    name:"Табел, наряд, аванс, иш ҳақи ва қолдиқлар",
                       cols:[["timesheets","timesheets"],["salaryRuns","salaryRuns"],["advanceRuns","advanceRuns"],["payrollRuns","payrollRuns"],["balanceEntries","balanceEntries"]]},
    {key:"employees",  name:"Ходимлар ва ходим операциялари",      cols:[["employees","employees"],["employeeOps","employeeOps"]]},
    {key:"empcats",    name:"Ходим категориялари",                 cols:[["empCategories","empCategories"]]},
    {key:"workshops",  name:"Цехлар",                              cols:[["workshops","workshops"]]},
    {key:"warehouses", name:"Омборлар",                            cols:[["warehouses","warehouses"]]},
    {key:"catsunits",  name:"Категориялар ва ўлчов бирликлари",    cols:[["categories","categories"],["units","units"],["wh2Categories","wh2Categories"]]},
    {key:"legacy",     name:"Эски (ишлатилмайдиган) ёзувлар",      cols:[["materials","materials"],["products","products"],["calculations","calculations"]]},
    {key:"users",      name:"Тизим фойдаланувчилари (Админдан бошқа)", cols:[["users","users"]]}
  ];
  function dbWipeCountText(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g," "); }
  function dbWipeGroupCount(g){
    var n = 0;
    g.cols.forEach(function(c){ n += (STATE[c[1]]||[]).length; });
    return n;
  }
  function openDbWipeModal(){
    var rows = DB_WIPE_GROUPS.map(function(g){
      var n = dbWipeGroupCount(g);
      return '<tr>'+
        '<td style="width:34px;"><input type="checkbox" class="wipe-g" value="'+g.key+'"'+(n?'':' disabled')+' style="width:16px;height:16px;"></td>'+
        '<td'+(n?' class="cell-strong"':' class="cell-muted"')+'>'+esc(g.name)+'</td>'+
        '<td class="num'+(n?' cell-strong':' cell-muted')+'">'+(n?dbWipeCountText(n)+' та':'бўш')+'</td>'+
      '</tr>';
    }).join("");
    var body = '<div class="card" style="padding:12px 14px;margin-bottom:12px;border-left:4px solid var(--critical);background:rgba(220,70,50,.06);">'+
        '<div style="font-weight:800;color:var(--critical);">Эҳтиёт бўлинг!</div>'+
        '<div class="field-hint" style="margin-top:4px;">Белгиланган гуруҳлардаги маълумотлар бутунлай ўчирилади ва қайта тикланмайди. Аввал «Базани юклаб олиш» орқали заҳира нусха олиб қўйишни тавсия қиламиз.</div>'+
      '</div>'+
      '<div style="display:flex;gap:8px;margin-bottom:8px;">'+
        '<button class="btn btn-secondary btn-sm" data-wipe-all>Барчасини белгилаш</button>'+
        '<button class="btn btn-secondary btn-sm" data-wipe-none>Белгиларни олиш</button>'+
      '</div>'+
      '<div class="table-wrap"><table><thead><tr><th></th><th>Нима ўчирилади</th><th class="num">Ёзувлар</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div class="field" style="margin-top:12px;"><label>Тасдиқлаш учун «ТОЗАЛАШ» деб ёзинг</label><input id="wipe-confirm" placeholder="ТОЗАЛАШ" autocomplete="off"></div>'+
      '<div class="field-hint">Тизим созламалари (админ логин/парол/PIN) ва Админ ҳисоби ўчирилмайди.</div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save style="background:var(--critical);border-color:var(--critical);">Танланганини ўчириш</button>';
    var m = openModal("Базани тозалаш", body, foot, "wide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-wipe-all]").addEventListener("click", function(){
      m.querySelectorAll(".wipe-g").forEach(function(c){ if(!c.disabled) c.checked = true; });
    });
    m.querySelector("[data-wipe-none]").addEventListener("click", function(){
      m.querySelectorAll(".wipe-g").forEach(function(c){ c.checked = false; });
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var keys = [];
      m.querySelectorAll(".wipe-g").forEach(function(c){ if(c.checked) keys.push(c.value); });
      if(!keys.length){ toast("Ўчириш учун камида битта гуруҳни белгиланг"); return; }
      if((m.querySelector("#wipe-confirm").value||"").trim().toUpperCase()!=="ТОЗАЛАШ"){
        toast("Тасдиқлаш учун «ТОЗАЛАШ» деб ёзинг");
        return;
      }
      var groups = DB_WIPE_GROUPS.filter(function(g){ return keys.indexOf(g.key)>-1; });
      var total = groups.reduce(function(s,g){ return s+dbWipeGroupCount(g); }, 0);
      var names = groups.map(function(g){ return g.name; }).join("; ");
      closeModal();
      openConfirm("Базани тозалаш",
        "Қуйидагилар бутунлай ўчирилади ("+dbWipeCountText(total)+" та ёзув): "+names+". Бу амални қайтариб бўлмайди. Давом этамизми?",
        "Ҳа, ўчириш", function(){
          var deleted = 0;
          groups.forEach(function(g){
            g.cols.forEach(function(c){
              var collName = c[0], stateKey = c[1];
              var arr = STATE[stateKey]; if(!arr) return;
              arr.slice().forEach(function(rec){
                if(!rec || !rec.id) return;
                /* Админ ҳисоби (агар users ичида бўлса) ўчирилмайди. */
                if(collName==="users" && rec.login && rec.login===effectiveAdminLogin()) return;
                dbDelete(collName, rec.id, arr);
                deleted++;
              });
            });
          });
          STATE.recipeDraft = null;
          STATE.kassaFilter = null;
          STATE.kassaDay = "";
          toast(dbWipeCountText(deleted)+" та ёзув ўчирилди");
          render();
        }, true);
    });
  }

  function viewAdminPanel(){
    /* "Базани юклаб олиш" тугмаси — фойдаланувчи сўровига кўра (2026-10-01):
       локал тармоқ (LAN) серверида ишлаётганда "/api/export/mysql"
       манзилидан бутун базанинг MySQL форматидаги дампини юклаб олади
       (жадваллар = коллекциялар, устунлар = ёзувлардаги майдонлар
       бирлашмаси). Веб-артефакт муҳитида (app.py'сиз) бу манзил мавжуд
       эмас — тугма шунда хатолик хабарини кўрсатади. */
    setTopbar("Админ панел", STATE.users.length+" та фойдаланувчи",
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
      '<button class="btn btn-secondary" id="auExportDbBtn">'+ICONS.download+'Базани юклаб олиш</button>'+
      '<button class="btn btn-secondary" id="auWipeDbBtn" style="color:var(--critical);border-color:var(--critical);">'+ICONS.trash+'Базани тозалаш</button>'+
      '<button class="btn btn-primary" id="auCreateBtn">'+ICONS.plus+'Яратиш</button>'+
      '</div>');
    var root = document.getElementById("content");
    var list = STATE.users.slice().sort(function(a,b){ return (a.createdAt||"").localeCompare(b.createdAt||""); });
    var html = "";
    if(!list.length){
      html += emptyState("Ҳали фойдаланувчи йўқ", "«Яратиш» тугмаси орқали янги фойдаланувчи қўшинг ва унга кўринадиган менюларни белгиланг.");
    } else {
      var rows = list.map(function(u, idx){
        return '<tr'+(u.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+(idx+1)+'</td>'+
          '<td class="cell-strong">'+esc(u.name)+'</td>'+
          '<td>'+esc(u.login)+'</td>'+
          '<td class="cell-muted">'+esc(u.password)+'</td>'+
          '<td>'+(u.role?esc(u.role):'<span class="cell-muted">—</span>')+'</td>'+
          '<td>'+(u.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Фаол</span>')+'</td>'+
          '<td><div class="row-actions">'+
            (u.cancelled?'':'<button class="btn btn-ghost btn-icon" data-au-edit="'+u.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')+
            (u.cancelled?'<button class="btn btn-ghost btn-icon" data-au-restore="'+u.id+'" title="Тиклаш">'+ICONS.restore+'</button>':'<button class="btn btn-ghost btn-icon" data-au-cancel="'+u.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>№</th><th>Исми</th><th>Логин</th><th>Парол</th><th>Роли</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    root.innerHTML = html;
    document.getElementById("auExportDbBtn").addEventListener("click", function(){
      requireAdmin(function(){ window.location.href = "/api/export/mysql"; });
    });
    document.getElementById("auWipeDbBtn").addEventListener("click", function(){
      requireAdmin(function(){ openDbWipeModal(); });
    });
    document.getElementById("auCreateBtn").addEventListener("click", function(){ requireAdmin(function(){ openUserForm(null); }); });
    root.querySelectorAll("[data-au-edit]").forEach(function(b){ b.addEventListener("click", function(){
      requireAdmin(function(){ openUserForm(list.find(function(x){return x.id===b.getAttribute("data-au-edit");})); });
    }); });
    root.querySelectorAll("[data-au-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var u = list.find(function(x){return x.id===b.getAttribute("data-au-cancel");});
      if(!u) return;
      requireAdmin(function(){
        openConfirm("Фойдаланувчини бекор қилиш", "«"+u.name+"» бекор қилинсинми? У тизимга кира олмай қолади, лекин маълумотлари сақланиб қолади.", "Ҳа, бекор қилиш", function(){
          dbUpdate("users", u.id, {cancelled:true}, STATE.users);
          if(STATE.currentUserId===u.login) logoutCurrentUser();
          toast("Бекор қилинди");
        }, true);
      });
    }); });
    root.querySelectorAll("[data-au-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var u = list.find(function(x){return x.id===b.getAttribute("data-au-restore");});
      if(!u) return;
      requireAdmin(function(){
        openConfirm("Фойдаланувчини тиклаш", "«"+u.name+"» қайта фаоллаштирилсинми?", "Ҳа, тиклаш", function(){
          dbUpdate("users", u.id, {cancelled:false}, STATE.users);
          toast("Тикланди");
        });
      });
    }); });
  }
  function openUserForm(existing){
    var roleNames = []; STATE.users.forEach(function(u){ if(u.role && roleNames.indexOf(u.role)===-1) roleNames.push(u.role); });
    roleNames.sort();
    var roleOptions = roleNames.map(function(r){ return '<option value="'+esc(r)+'">'; }).join("");
    var allowed = existing ? (existing.allowedMenus||[]) : [];
    var body = '<div class="field"><label>Исми</label><input id="au-name" value="'+esc(existing?existing.name:"")+'"></div>'+
      '<div class="field-row"><div class="field"><label>Логин</label><input id="au-login" autocomplete="off" value="'+esc(existing?existing.login:"")+'"></div>'+
      '<div class="field"><label>Парол</label><input id="au-password" type="text" autocomplete="off" value="'+esc(existing?existing.password:"")+'"></div></div>'+
      '<div class="field"><label>Роли</label><input id="au-role" list="au-role-list" placeholder="Бухгалтер, Омбор мудири, Раҳбар..." value="'+esc(existing?existing.role:"")+'"><datalist id="au-role-list">'+roleOptions+'</datalist></div>'+
      '<div class="field"><label>Кўринадиган менюлар</label>'+
      '<div class="field-hint" style="margin:-2px 0 8px;">Белгиланган менюлар ушбу фойдаланувчига тизимга киргач кўринади, қолган менюларни у кўролмайди ва уларда амал бажара олмайди.</div>'+
      '<div style="display:flex;gap:8px;margin-bottom:8px;">'+
        '<button type="button" class="btn btn-secondary btn-sm" data-au-all>Барчасини белгилаш</button>'+
        '<button type="button" class="btn btn-secondary btn-sm" data-au-none>Белгиларни олиш</button>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;">'+
      NAV.map(function(n){ return '<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13.5px;cursor:pointer;"><input type="checkbox" data-au-menu="'+n.id+'" style="width:auto;flex-shrink:0;"'+(allowed.indexOf(n.id)!==-1?" checked":"")+'>'+esc(n.label)+'</label>'; }).join("")+
      '</div></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(existing?"Фойдаланувчини таҳрирлаш":"Янги фойдаланувчи яратиш", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-au-all]").addEventListener("click", function(){
      m.querySelectorAll("[data-au-menu]").forEach(function(c){ c.checked = true; });
    });
    m.querySelector("[data-au-none]").addEventListener("click", function(){
      m.querySelectorAll("[data-au-menu]").forEach(function(c){ c.checked = false; });
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#au-name").value.trim();
      var login = m.querySelector("#au-login").value.trim();
      var password = m.querySelector("#au-password").value;
      var role = m.querySelector("#au-role").value.trim();
      var menus = Array.prototype.slice.call(m.querySelectorAll("[data-au-menu]")).filter(function(c){return c.checked;}).map(function(c){return c.getAttribute("data-au-menu");});
      if(!name){ toast("Исмни киритинг"); return; }
      if(!login){ toast("Логинни киритинг"); return; }
      if(!password){ toast("Паролни киритинг"); return; }
      var dup = STATE.users.find(function(u){ return !u.cancelled && u.login===login && (!existing || u.id!==existing.id); });
      if(dup){ toast("Бу логин билан фойдаланувчи аллақачон мавжуд"); return; }
      var data = {name:name, login:login, password:password, role:role, allowedMenus:menus};
      if(existing){
        dbUpdate("users", existing.id, data, STATE.users);
        toast("Сақланди");
      } else {
        data.cancelled = false;
        data.createdAt = new Date().toISOString();
        dbAdd("users", data, STATE.users);
        toast("Фойдаланувчи яратилди");
      }
      closeModal();
    });
  }

