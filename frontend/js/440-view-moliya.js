  /* ================= view: moliya (Молия бўлими) =================
     Фойдаланувчи сўровига кўра (2026-10-14/15): кассага тушган ҳар қандай
     пул аввал «Тақсимланмаган пул»га тушади, сўнг харидорга ёзилган
     фактура (сотув) бўйича — сотилган маҳсулотнинг КАТЕГОРИЯСИ ва
     калькуляцияси асосида — харажат турларига тақсимланади.
     Бу бўлим мавжуд маълумотни ЎЗГАРТИРМАЙДИ: фақат касса ҳаракатлари,
     сотувлар ва калькуляциялардан ҳисоблаб кўрсатади. Қўлда
     киритиладигани: доллар курслари (fxRates), тақсимот бўлимлари
     (financeSplits) ва ўтказмалар (financeTransfers). */
  /* Тартиб фойдаланувчи сўровига кўра (2026-10-16): калькуляциядаги
     «Натижа» кетма-кетлиги билан бир хил. */
  var FIN_BUCKETS = [
    {key:"raw",         name:"Хом-ашё"},
    /* Товар ва товар бўйича бошқа харажатлар (2026-10-19 сўрови):
       сотилган товарнинг сотиб олинган қиймати «Товар» турига, сотув
       нархидан ортган қисми эса «Товар бўйича бошқа харажатлар» турига
       тушади. Иккинчисининг ичида — фоизли тақсимот. */
    {key:"tovar",       name:"Товар"},
    {key:"tovar_extra", name:"Товар бўйича бошқа харажатлар"},
    {key:"extra",   name:"Қўшимча харажатлар"},
    {key:"wage",    name:"Иш ҳақи"},
    {key:"elec",    name:"Электр энергия"},
    {key:"gas",     name:"Табиий газ"},
    {key:"amort",   name:"Амортизация"},
    {key:"other",   name:"Бошқа харажатлар жами"},
    {key:"vat",     name:"ҚҚС"},
    {key:"profit",  name:"Фойда"}
  ];
  /* Харидордан сотув суммасидан КАМ пул тушганда тақсимлаш тартиби:
     аввал ҳар бир категория бўйича 1-босқич, сўнг категориялар
     тартибида 2-босқич (иш ҳақи, фойда). */
  var FIN_PASS1 = ["raw","tovar","tovar_extra","extra","vat","elec","gas","amort","other"];
  var FIN_PASS2 = ["wage_base","wage_yiit","wage_tax","profit"];
  var FIN_WAGE_PARTS = [["wage_base","Иш ҳақи"],["wage_yiit","Иш ҳақидан ЯИТ"],["wage_tax","Иш ҳақидан даромад солиғи"]];
  var FIN_NEED_KEYS = ["raw","tovar","tovar_extra","extra","vat","elec","gas","amort","other","wage_base","wage_yiit","wage_tax","profit"];
  var FIN_NO_CAT = "__nocat__";
  /* Фойдаланувчи сўровига кўра (2026-10-15): ҳар бир категориянинг
     «Бошқа харажатлар» турига тушган пулнинг 10% и автоматик
     «Бошқарув бўлими» категориясига ўтказилади. Ўтказма манба
     категориянинг «Бошқа харажатлар» ҳисоботида чиқим сифатида,
     «Бошқарув бўлими» ичида эса кирим сифатида — қаердан келгани
     билан кўринади. */
  var FIN_ADMIN_CAT = "__admin__";
  var FIN_ADMIN_NAME = "Бошқарув бўлими";
  /* Фойдаланувчи сўровига кўра (2026-10-16): «Бошқарув бўлими»
     категориясида оддий харажат турлари ЎРНИГА фақат иккита тур бўлади —
     «Администрация» ва «Маркетинг ва реклама». Бошқа категориялардан
     келиб тушган пул АВВАЛО «Администрация»га тушади, ундан «Маркетинг
     ва реклама»га — киритилган фоиз бўйича ажратилади. */
  var FIN_ADMIN_BUCKETS = [
    {key:"admin_main", name:"Администрация"},
    {key:"admin_mkt",  name:"Маркетинг ва реклама"}
  ];
  function finBucketsFor(catKey){ return catKey===FIN_ADMIN_CAT ? FIN_ADMIN_BUCKETS : FIN_BUCKETS; }
  /* «Бошқа харажатлар»дан «Бошқарув бўлими»га ўтадиган фоиз — энди қаттиқ
     10% эмас, «Бошқа харажатлар → Тақсимот» бўлимидаги «Бошқарув
     бўлимига» қаторидан киритилади (ёзув бўлмаса — стандарт 10%).
     «Маркетинг ва реклама» фоизи эса «Бошқарув бўлими → Администрация →
     Тақсимот» бўлимидан киритилади (стандарт 0%). */
  var FIN_ADMIN_PCT_DEFAULT = 10;
  var FIN_ADMIN_SHARE_NAME = "Бошқарув бўлимига";
  var FIN_ADMIN_MKT_NAME = "Маркетинг ва рекламага";
  function finAdminShareSplit(){
    return STATE.financeSplits.find(function(x){ return !x.cancelled && x.bucket==="other" && x.adminShare===true; }) || null;
  }
  function finAdminMktSplit(){
    return STATE.financeSplits.find(function(x){ return !x.cancelled && x.bucket==="admin_main" && x.adminMkt===true; }) || null;
  }
  function finAdminPct(){
    var x = finAdminShareSplit();
    return x ? (Number(x.pct)||0) : FIN_ADMIN_PCT_DEFAULT;
  }
  function finAdminMktPct(){
    var x = finAdminMktSplit();
    return x ? (Number(x.pct)||0) : 0;
  }
  function finEnsureAdminShareSplit(){
    if(finAdminShareSplit()) return;
    dbSet("financeSplits", uid(), {bucket:"other", name:FIN_ADMIN_SHARE_NAME, pct:FIN_ADMIN_PCT_DEFAULT,
      order:-1, builtin:true, adminShare:true, cancelled:false, createdAt:new Date().toISOString()}, STATE.financeSplits);
  }
  /* «Товар бўйича бошқа харажатлар» ичидаги тақсимот қаторлари:
     ҳар бири — бошқа харажат турига фоизда ўтказма (2026-10-19). */
  function finTovarSplits(){
    return STATE.financeSplits.filter(function(x){
      return !x.cancelled && x.bucket==="tovar_extra" && x.toBucket;
    }).sort(function(a,b){ return (Number(a.order)||0)-(Number(b.order)||0) || String(a.createdAt||"").localeCompare(String(b.createdAt||"")); });
  }
  function finEnsureAdminMktSplit(){
    if(finAdminMktSplit()) return;
    dbSet("financeSplits", uid(), {bucket:"admin_main", name:FIN_ADMIN_MKT_NAME, pct:0,
      order:0, builtin:true, adminMkt:true, cancelled:false, createdAt:new Date().toISOString()}, STATE.financeSplits);
  }
  var FIN_ALL_ACC = "__all__";
  var FIN_NO_ACC = FIN_NO_CAT;
  var FIN_PROFIT_DEFAULTS = ["Дивидент","Захира","Эҳсон"];
  var FIN_RESERVE_NAME = "Захира";

  function finBucketName(k){
    if(k==="unalloc") return "Тақсимланмаган пул";
    var a = FIN_ADMIN_BUCKETS.find(function(b){ return b.key===k; });
    if(a) return a.name;
    var f = FIN_BUCKETS.find(function(b){ return b.key===k; });
    if(f) return f.name;
    var w = FIN_WAGE_PARTS.find(function(x){ return x[0]===k; });
    return w ? w[1] : k;
  }
  function finBucketOfNeed(k){ return k.indexOf("wage_")===0 ? "wage" : k; }
  function finCatName(key){
    if(key===FIN_ADMIN_CAT) return FIN_ADMIN_NAME;
    if(key===FIN_NO_CAT) return "Категориясиз";
    var c = STATE.categories.find(function(x){ return x.id===key; });
    return c ? c.name : "Категориясиз";
  }

  /* ---------- доллар курслари жадвали ---------- */
  function finRateList(){
    return STATE.fxRates.slice().sort(function(a,b){ return (a.date||"").localeCompare(b.date||""); });
  }
  function finRateOn(date){
    var list = finRateList(), r = 0;
    for(var i=0;i<list.length;i++){
      if(!date || (list[i].date||"") <= date) r = Number(list[i].rate)||r;
    }
    if(!r && list.length) r = Number(list[list.length-1].rate)||0;
    return r || Number(STATE.lastUsdRate) || 12700;
  }
  function finDateOf(x){ return x.date || (x.createdAt||"").slice(0,10) || ""; }
  function finTxSom(t){
    var d = finDateOf(t);
    if(t.methods && t.methods.length){
      var rate = finRateOn(d), s = 0;
      t.methods.forEach(function(m){
        if(isUsdMethod(m.method)) s += (Number(m.usdAmount)||0)*rate;
        else s += Number(m.amount)||0;
      });
      return s;
    }
    return Number(t.amount)||0;
  }

  /* ---------- касса ↔ маҳсулот категорияси ---------- */
  function finAccCategoryIds(acc){ return (acc && acc.categoryIds) ? acc.categoryIds : []; }
  /* Тақсимлаш навбати: аввал 1-касса категориялари, кейин 2-касса… */
  function finCatOrder(){
    var out = [];
    STATE.cashAccounts.forEach(function(a){
      finAccCategoryIds(a).forEach(function(cid){ if(out.indexOf(cid)===-1) out.push(cid); });
    });
    STATE.categories.forEach(function(c){ if(out.indexOf(c.id)===-1) out.push(c.id); });
    out.push(FIN_NO_CAT);
    out.push(FIN_ADMIN_CAT);
    return out;
  }
  function finCatKeyForItem(item){ return (item && item.categoryId) ? item.categoryId : FIN_NO_CAT; }

  /* ---------- калькуляциядан 1 бирлик учун харажат таркиби ---------- */
  var FIN_UNIT_CACHE = {};
  function finIsGasExpenseRow(x){
    if(x && x.locked===true) return true;
    var n = String((x&&x.name)||"").toLowerCase().replace(/ё/g,"е");
    return n.indexOf("табиий газ")>-1 || n.indexOf("tabiiy gaz")>-1;
  }
  function finRecipeForItem(item, fallbackName){
    var list = STATE.recipes.filter(function(r){
      if(r.cancelled) return false;
      if(item && r.productItemId && r.productItemId===item.id) return true;
      var nm = String(r.productName||"").trim().toLowerCase();
      var target = String((item&&item.name)||fallbackName||"").trim().toLowerCase();
      return !!target && nm===target;
    });
    if(!list.length) return null;
    list.sort(function(a,b){
      return String(b.recipeDate||b.createdAt||"").localeCompare(String(a.recipeDate||a.createdAt||""));
    });
    return list[0];
  }
  function finUnitCostOf(rec){
    if(!rec) return null;
    if(rec.id && FIN_UNIT_CACHE[rec.id]) return FIN_UNIT_CACHE[rec.id];
    var n = normalizeRecipe(rec);
    var res = computeRecipeCost(n, [], 0);
    var batch = Number(n.quantity)>0 ? Number(n.quantity) : 1;
    var gasSum = 0;
    (n.expenses||[]).forEach(function(x){
      if(!finIsGasExpenseRow(x)) return;
      if(x.type==="percent") gasSum += res.materialTotal*(Number(x.value)||0)/100;
      else if(x.type==="qp") gasSum += (Number(x.qty)||0)*(Number(x.price)||0);
      else gasSum += Number(x.value)||0;
    });
    var out = {
      raw: res.materialTotal/batch,
      gas: (res.gasTotal + gasSum)/batch,
      extra: Math.max(0, res.expenseSum-gasSum)/batch,
      wage_base: res.wageTotal/batch,
      wage_yiit: res.yiitAmount/batch,
      wage_tax: res.taxAmount/batch,
      elec: res.electricityTotal/batch,
      amort: res.amort/batch,
      other: res.admin/batch
    };
    if(rec.id) FIN_UNIT_CACHE[rec.id] = out;
    return out;
  }

  /* ---------- сотувдан келиб чиқадиган "талаб" ---------- */
  function finBlankNeed(){
    var o = {};
    FIN_NEED_KEYS.forEach(function(k){ o[k]=0; });
    o.total = 0;
    return o;
  }
  function finSaleNeedGroups(s){
    var groups = {};
    (s.items||[]).forEach(function(it){
      var item = it.itemId ? itemById(it.itemId) : findItemByExactName(it.name||it.product);
      var key = finCatKeyForItem(item);
      var g = groups[key] || (groups[key] = finBlankNeed());
      var lineTotal = Number(it.lineTotal!==undefined ? it.lineTotal : (it.totalAmount!==undefined ? it.totalAmount : 0))||0;
      if(!lineTotal) lineTotal = (Number(it.qty)||Number(it.quantity)||0) * (Number(it.price)||0);
      var vr = Number(it.vatRate)>0 ? Number(it.vatRate) : 12;
      var vat = Number(it.vatSum)>0 ? Number(it.vatSum) : (lineTotal - lineTotal/(1+vr/100));
      var qty = Number(it.qty!==undefined ? it.qty : it.quantity)||0;
      var u = finUnitCostOf(finRecipeForItem(item, it.name||it.product));
      var c = {raw:0, tovar:0, tovar_extra:0, extra:0, elec:0, gas:0, amort:0, other:0, wage_base:0, wage_yiit:0, wage_tax:0};
      if(u) Object.keys(c).forEach(function(k){ c[k] = (Number(u[k])||0)*qty; });
      else if(item && (item.itemType==="tovar" || item.itemType==="xomashyo")){
        /* Товар ва калькуляцияси бўлмаган хомашё (2026-10-19 сўрови):
           сотиб олинган қиймати «Товар» турига, сотув нархидан ортган
           қисми эса «Товар бўйича бошқа харажатлар» турига тушади. */
        var noVatLine = Math.max(0, lineTotal - vat);
        var buyCost = Math.max(0, (Number(item.price)||0)*qty);
        c.tovar = Math.min(buyCost, noVatLine);
        c.tovar_extra = Math.max(0, noVatLine - c.tovar);
      }
      var costSum = vat; Object.keys(c).forEach(function(k){ costSum += c[k]; });
      if(costSum > lineTotal && costSum > 0){
        var f = lineTotal/costSum;
        Object.keys(c).forEach(function(k){ c[k] *= f; });
        vat *= f;
        costSum = lineTotal;
      }
      Object.keys(c).forEach(function(k){ g[k] += c[k]; });
      g.vat += vat;
      g.profit += Math.max(0, lineTotal-costSum);
      g.total += lineTotal;
    });
    return groups;
  }
  function finBuildNeeds(){
    var byCust = {};
    STATE.sales.slice().sort(function(a,b){
      return String(a.date||a.createdAt||"").localeCompare(String(b.date||b.createdAt||""));
    }).forEach(function(s){
      if(s.cancelled) return;
      var cid = s.customerId || ("name:"+(s.customerName||"—"));
      if(!byCust[cid]) byCust[cid] = {sales:[]};
      byCust[cid].sales.push({
        id:s.id, no:s.saleNumber||"", date:finDateOf(s),
        customerName:s.customerName||"", groups:finSaleNeedGroups(s)
      });
    });
    return byCust;
  }
  function finAllocatePayment(needs, custKey, amount, catOrder){
    var out = [], rest = amount;
    var cust = needs[custKey];
    if(!cust) return {alloc:out, rest:rest};
    var passes = [FIN_PASS1, FIN_PASS2];
    for(var p=0;p<passes.length;p++){
      for(var ki=0;ki<catOrder.length;ki++){
        for(var bi=0;bi<passes[p].length;bi++){
          var b = passes[p][bi];
          for(var si=0; si<cust.sales.length; si++){
            if(rest<=0.004) break;
            var g = cust.sales[si].groups[catOrder[ki]];
            if(!g || !(g[b]>0.004)) continue;
            var take = Math.min(rest, g[b]);
            g[b] -= take; rest -= take;
            out.push({cat:catOrder[ki], need:b, amount:take, saleNo:cust.sales[si].no, saleDate:cust.sales[si].date});
          }
        }
      }
    }
    return {alloc:out, rest:rest};
  }

  /* ---------- ҳисоблаш ўзаги ---------- */
  function finBlankCat(){
    var o = {buckets:{}, wage:{}, moves:{}, reserve:0};
    FIN_BUCKETS.forEach(function(b){ o.buckets[b.key]=0; o.moves[b.key]=[]; });
    FIN_ADMIN_BUCKETS.forEach(function(b){ o.buckets[b.key]=0; o.moves[b.key]=[]; });
    FIN_WAGE_PARTS.forEach(function(w){ o.wage[w[0]]=0; o.moves[w[0]]=[]; });
    return o;
  }
  function finBlankAcc(){
    return {unalloc:0, unallocMoves:[], cats:{}, deficit:0};
  }
  function finCat(ac, key){
    if(!ac.cats[key]) ac.cats[key] = finBlankCat();
    return ac.cats[key];
  }
  function finUnallocIn(ac, amount, row){
    ac.unalloc += amount;
    ac.unallocMoves.push(Object.assign({}, row, {in:amount, out:0}));
  }
  function finUnallocOut(ac, amount, row){
    ac.unalloc -= amount;
    ac.unallocMoves.push(Object.assign({}, row, {in:0, out:amount}));
  }
  function finAddCat(ac, catKey, needKey, amount, row){
    var cat = finCat(ac, catKey);
    var b = finBucketOfNeed(needKey);
    cat.buckets[b] = (cat.buckets[b]||0) + amount;
    if(b==="wage") cat.wage[needKey] = (cat.wage[needKey]||0) + amount;
    var r = Object.assign({}, row, {in:amount, out:0});
    cat.moves[b].push(r);
    if(b==="wage") cat.moves[needKey].push(r);
    /* «Бошқа харажатлар»дан белгиланган фоиз — «Бошқарув бўлими»нинг
       «Администрация» турига (фоиз «Бошқа харажатлар → Тақсимот»даги
       «Бошқарув бўлимига» қаторидан олинади). */
    var aPct = finAdminPct();
    if(b==="other" && catKey!==FIN_ADMIN_CAT && aPct>0){
      var share = amount*aPct/100;
      if(share>0.0009){
        cat.buckets.other -= share;
        cat.moves.other.push(Object.assign({}, row, {
          in:0, out:share, adminShare:true,
          who: FIN_ADMIN_NAME+"га "+aPct+"%",
          note: (row&&row.note) ? row.note : ""
        }));
        finAddCat(ac, FIN_ADMIN_CAT, "admin_main", share, Object.assign({}, row, {
          who: finCatName(catKey)+" — «"+finBucketName("other")+"»дан "+aPct+"%",
          note: (row&&row.note) ? row.note : ""
        }));
      }
    }
    /* «Товар бўйича бошқа харажатлар»га тушган пулдан — тақсимотда
       белгиланган фоизлар бошқа харажат турларига ўтказилади
       (2026-10-19 сўрови). */
    if(b==="tovar_extra"){
      finTovarSplits().forEach(function(sp){
        var tb = String(sp.toBucket||"");
        if(!tb || tb==="tovar_extra") return;
        var p = Number(sp.pct)||0;
        if(p<=0) return;
        var sh = amount*p/100;
        if(sh<=0.0009) return;
        cat.buckets.tovar_extra -= sh;
        cat.moves.tovar_extra.push(Object.assign({}, row, {
          in:0, out:sh, tovarSplit:true,
          who: finBucketName(tb)+"га "+p+"%",
          note: (row&&row.note) ? row.note : ""
        }));
        finAddCat(ac, catKey, tb, sh, Object.assign({}, row, {
          who: "«"+finBucketName("tovar_extra")+"»дан "+p+"%",
          note: (row&&row.note) ? row.note : ""
        }));
      });
    }
    /* «Администрация»га тушган пулдан белгиланган фоиз — «Маркетинг ва
       реклама» турига (фоиз Администрация → Тақсимот бўлимидан). */
    var mPct = finAdminMktPct();
    if(b==="admin_main" && catKey===FIN_ADMIN_CAT && mPct>0){
      var mShare = amount*mPct/100;
      if(mShare>0.0009){
        cat.buckets.admin_main -= mShare;
        cat.moves.admin_main.push(Object.assign({}, row, {
          in:0, out:mShare, adminMkt:true,
          who: "Маркетинг ва рекламага "+mPct+"%",
          note: (row&&row.note) ? row.note : ""
        }));
        finAddCat(ac, FIN_ADMIN_CAT, "admin_mkt", mShare, Object.assign({}, row, {
          who: "Администрациядан "+mPct+"%",
          note: (row&&row.note) ? row.note : ""
        }));
      }
    }
  }
  /* Чиқим: кўрсатилган категория+харажат туридан, сўнг шу категориянинг
     бошқа турларидан, сўнг "Тақсимланмаган пул"дан, сўнг қолганларидан. */
  function finTakeFrom(ac, catKey, bucket, amount, row){
    var rest = amount;
    var tryCat = function(ck, bk){
      if(rest<=0.004) return;
      var cat = ac.cats[ck]; if(!cat) return;
      var have = cat.buckets[bk]||0; if(have<=0.004) return;
      var take = Math.min(rest, have);
      cat.buckets[bk] = have-take; rest -= take;
      cat.moves[bk].push(Object.assign({}, row, {in:0, out:take}));
      if(bk==="wage"){
        var left = take;
        FIN_WAGE_PARTS.forEach(function(w){
          if(left<=0.004) return;
          var h2 = cat.wage[w[0]]||0; if(h2<=0.004) return;
          var t2 = Math.min(left, h2);
          cat.wage[w[0]] = h2-t2; left -= t2;
          cat.moves[w[0]].push(Object.assign({}, row, {in:0, out:t2}));
        });
      }
    };
    if(catKey && bucket) tryCat(catKey, bucket);
    if(rest>0.004 && catKey){ finBucketsFor(catKey).forEach(function(b){ tryCat(catKey, b.key); }); }
    if(rest>0.004 && ac.unalloc>0.004){
      var take2 = Math.min(rest, ac.unalloc);
      finUnallocOut(ac, take2, row); rest -= take2;
    }
    if(rest>0.004){
      Object.keys(ac.cats).forEach(function(ck){
        finBucketsFor(ck).forEach(function(b){ tryCat(ck, b.key); });
      });
    }
    if(rest>0.004) ac.deficit += rest;
  }
  var FIN_CHIQIM_CAT_MAP = {
    xomashyo_xarid:"raw", taminotchi_tolovi:"raw", ish_haqi:"wage",
    qolga_chiqim:"other", boshqa:"other"
  };

  function finCompute(){
    FIN_UNIT_CACHE = {};
    /* Касса энди БИТТА умумий касса (2026-10-15) — шунга кўра тақсимот
       ҳам барча касса ёзувлари бўйича биргаликда ҳисобланади. */
    var catOrder = finCatOrder();
    var res = {order:[FIN_ALL_ACC], catOrder:catOrder, accs:{}, rateToday:finRateOn(todayISO())};
    var acAll = finBlankAcc();
    res.accs[FIN_ALL_ACC] = acAll;
    STATE.cashAccounts.forEach(function(a){
      var init = (Number(a.initialBalance)||0)+(Number(a.initialBalanceKarta)||0)+
                 (Number(a.initialBalanceOtkazma)||0)+
                 ((Number(a.initialBalanceDollar)||0)+(Number(a.initialBalanceOtkazmaUsd)||0))*res.rateToday;
      if(init) finUnallocIn(acAll, init, {date:"", who:"Бошланғич қолдиқ — "+a.name, note:""});
    });
    var needs = finBuildNeeds();

    var events = [];
    STATE.cashTransactions.forEach(function(t){ if(!t.cancelled) events.push({kind:"tx", date:finDateOf(t), seq:t.createdAt||"", t:t}); });
    STATE.cashTransfers.forEach(function(x){ if(!x.cancelled) events.push({kind:"transfer", date:finDateOf(x), seq:x.createdAt||"", t:x}); });
    STATE.cashConversions.forEach(function(x){ if(!x.cancelled) events.push({kind:"conv", date:finDateOf(x), seq:x.createdAt||"", t:x}); });
    STATE.financeTransfers.forEach(function(x){ if(!x.cancelled) events.push({kind:"fin", date:finDateOf(x), seq:x.createdAt||"", t:x}); });
    events.sort(function(a,b){
      return String(a.date).localeCompare(String(b.date)) || String(a.seq).localeCompare(String(b.seq));
    });

    events.forEach(function(ev){
      var t = ev.t;
      if(ev.kind==="tx"){
        var ac = acAll;
        var som = finTxSom(t); if(som<=0) return;
        var who = t.counterpartyName || (t.counterpartyId ? customerName(t.counterpartyId) : "") || kassaPayTypeLabel(t.payType||t.category);
        var row = {date:ev.date, who:who, note:t.description||""};
        if(t.direction==="kirim"){
          finUnallocIn(ac, som, row);
          var custKey = (t.counterpartyType==="customer" && t.counterpartyId) ? t.counterpartyId
                      : (t.counterpartyType==="customer" ? ("name:"+(t.counterpartyName||"—")) : "");
          if(custKey){
            var r = finAllocatePayment(needs, custKey, som, catOrder);
            r.alloc.forEach(function(a){
              var note = "Сотув №"+(a.saleNo||"—");
              finUnallocOut(ac, a.amount, Object.assign({}, row, {note:note, target:finCatName(a.cat)+" / "+finBucketName(a.need)}));
              finAddCat(ac, a.cat, a.need, a.amount, Object.assign({}, row, {note:(row.note?row.note+" · ":"")+note}));
            });
          }
        } else {
          finTakeFrom(ac, t.categoryId||"", t.bucket||FIN_CHIQIM_CAT_MAP[t.payType||t.category]||"", som, row);
        }
      } else if(ev.kind==="transfer"){
        var rate = finRateOn(ev.date);
        var v = isUsdMethod(t.method) ? (Number(t.usdAmount)||0)*rate : (Number(t.amount)||0);
        if(v<=0) return;
        /* Битта умумий касса ичида кўчирма жами суммани ўзгартирмайди. */
        if(!t.fromCashAccountId || !t.toCashAccountId) {
          if(t.toCashAccountId) finUnallocIn(acAll, v, {date:ev.date, who:"Кассага кўчирма", note:t.note||""});
          else finTakeFrom(acAll, "", "", v, {date:ev.date, who:"Кассадан кўчирма", note:t.note||""});
        }
      } else if(ev.kind==="conv"){
        var ac2 = acAll;
        var rate2 = finRateOn(ev.date);
        var fromV = isUsdMethod(t.fromMethod) ? (Number(t.fromUsdAmount)||0)*rate2 : (Number(t.fromAmount)||0);
        var toV = isUsdMethod(t.toMethod) ? (Number(t.toUsdAmount)||0)*rate2 : (Number(t.toAmount)||0);
        var delta = toV-fromV;
        if(Math.abs(delta)<0.004) return;
        var row2 = {date:ev.date, who:"Конвертация", note:t.note||""};
        if(delta>0) finUnallocIn(ac2, delta, row2);
        else finTakeFrom(ac2, "", "", -delta, row2);
      } else if(ev.kind==="fin"){
        var ac3 = acAll;
        var amt = Number(t.amount)||0; if(amt<=0) return;
        var ck = t.categoryId || FIN_NO_CAT;
        var bk = t.bucket || "raw";
        if(t.direction==="alloc"){
          finUnallocOut(ac3, amt, {date:ev.date, who:"Ўтказма", note:t.note||"", target:finCatName(ck)+" / "+finBucketName(bk)});
          finAddCat(ac3, ck, bk, amt, {date:ev.date, who:"Тақсимланмаган пулдан ўтказма", note:t.note||""});
        } else if(t.direction==="to_reserve"){
          finTakeFrom(ac3, ck, bk, amt, {date:ev.date, who:"Ўтказма → Фойда / "+FIN_RESERVE_NAME, note:t.note||""});
          finAddCat(ac3, ck, "profit", amt, {date:ev.date, who:"Ўтказма: "+finBucketName(bk), note:t.note||""});
          finCat(ac3, ck).reserve += amt;
        } else {
          finTakeFrom(ac3, ck, "profit", amt, {date:ev.date, who:"Ўтказма → "+finBucketName(bk), note:t.note||""});
          finAddCat(ac3, ck, bk, amt, {date:ev.date, who:"Ўтказма: Фойда / "+FIN_RESERVE_NAME, note:t.note||""});
          finCat(ac3, ck).reserve -= amt;
        }
      }
    });
    return res;
  }
  function cashAccountName(id){ var a=cashAccountById(id); return a?a.name:""; }

  /* Категория + харажат тури бўйича Молия бўлимида ажратилган сумма —
     Кассадаги чиқимларни чеклаш учун (2026-10-15). */
  function finBucketAvailFor(categoryId, bucket){
    if(!bucket) return 0;
    var res = finCompute();
    var ac = res.accs[FIN_ALL_ACC];
    var cat = (ac && ac.cats) ? ac.cats[categoryId||FIN_NO_CAT] : null;
    return cat ? (Number(cat.buckets[bucket])||0) : 0;
  }
  function finAccTotalSom(accId, rateToday){
    var b = (accId===FIN_ALL_ACC || !accId) ? kassaAllBalances() : cashAccountBalances(accId);
    return b.naqd + b.karta + b.otkazma + (b.dollar+(b.otkazma_usd||0))*rateToday;
  }
  function finCatTotal(cat){
    /* Барча мавжуд харажат турлари бўйича — «Бошқарув бўлими»нинг
       Администрация/Маркетинг турлари ҳам шу ерга киради. */
    var s = 0; Object.keys(cat.buckets||{}).forEach(function(k){ s += Number(cat.buckets[k])||0; });
    return s;
  }
  function finAllocTotal(ac){
    var s = ac.unalloc;
    Object.keys(ac.cats).forEach(function(k){ s += finCatTotal(ac.cats[k]); });
    return s;
  }
  function finSumAll(res){
    var all = finBlankAcc();
    res.order.forEach(function(id){
      var ac = res.accs[id]; if(!ac) return;
      all.unalloc += ac.unalloc;
      all.unallocMoves = all.unallocMoves.concat(ac.unallocMoves.map(function(r){ return Object.assign({acc:cashAccountName(id)}, r); }));
      Object.keys(ac.cats).forEach(function(ck){
        var src = ac.cats[ck], dst = finCat(all, ck);
        FIN_BUCKETS.concat(FIN_ADMIN_BUCKETS).forEach(function(b){
          dst.buckets[b.key] += src.buckets[b.key]||0;
          dst.moves[b.key] = dst.moves[b.key].concat((src.moves[b.key]||[]).map(function(r){ return Object.assign({acc:cashAccountName(id)}, r); }));
        });
        FIN_WAGE_PARTS.forEach(function(w){
          dst.wage[w[0]] += src.wage[w[0]]||0;
          dst.moves[w[0]] = dst.moves[w[0]].concat(src.moves[w[0]].map(function(r){ return Object.assign({acc:cashAccountName(id)}, r); }));
        });
        dst.reserve += src.reserve;
      });
      all.deficit += ac.deficit;
    });
    return all;
  }

  /* ---------- тақсимот бўлимлари (financeSplits) ---------- */
  function finSplits(bucket){
    /* Админ фоизи қаторлари (adminShare / adminMkt) оддий тақсимот
       рўйхатига кирмайди — улар алоҳида кўрсатилади. */
    return STATE.financeSplits.filter(function(x){ return !x.cancelled && x.bucket===bucket && !x.adminShare && !x.adminMkt && !x.toBucket; })
      .sort(function(a,b){ return (Number(a.order)||0)-(Number(b.order)||0) || String(a.createdAt||"").localeCompare(String(b.createdAt||"")); });
  }
  function finEnsureProfitSplits(){
    if(finSplits("profit").length) return;
    FIN_PROFIT_DEFAULTS.forEach(function(nm, i){
      dbSet("financeSplits", uid(), {bucket:"profit", name:nm, pct:0, order:i, builtin:true, cancelled:false, createdAt:new Date().toISOString()}, STATE.financeSplits);
    });
  }

