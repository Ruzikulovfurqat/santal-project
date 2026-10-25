  /* ================= кўринишлар ================= */
  /* ================= Ҳисобот бўлими =================
     Фойдаланувчи сўровига кўра (2026-10-16): категориялар кесимида ойлик
     Даромад / Харажат / Фойда ёки Зарар ҳисоботи.
       • Даромад — «Савдо» бўлимидаги сотувлардан, танланган ой ва
         категория бўйича: маҳсулот номи, жами сони, жами ҚҚСсиз суммаси
         (кўзча орқали — сотув рақами, санаси, харидор, сони, ҚҚСсиз
         суммаси).
       • Харажат — ўша маҳсулотларнинг калькуляциясидаги ТАННАРХ
         таркиби (сотилган сонга кўпайтирилган ҳолда) ва пастида
         «Бошқа харажатлар» — Кассадан шу категория + «Бошқа харажатлар»
         харажат тури билан қилинган чиқимлар.
       • Фойда ёки зарар — даромаддан харажат айирилади; «Ойни ёпиш»
         тугмаси орқали танланган ой ҳисоботи ёпилиб сақланади. */
  var HISOBOT_TABS = [["income","Даромад"],["expense","Харажат"],["profit","Фойда ёки зарар"]];
  function hbPrefix(year, month){ return year+"-"+String(month).padStart(2,"0"); }
  function hbPeriodLabel(year, month){ return (MONTHS_FULL[(month||1)-1]||"")+" "+year+" йил"; }
  /* «ҚҚСсиз сумма (сўм)» — Савдо/Буюртма қаторидаги АЙНАН ўша қиймат.
     Тартиб: 1) сотув қаторида сақланган noVatAmount; 2) ҚҚС суммаси
     ёзилган бўлса — жами минус ҚҚС; 3) боғланган буюртма қаторидаги
     «ҚҚСсиз сумма» (миқдор нисбатида); 4) ҚҚС фоизи бўйича ажратма;
     5) энг охирида — эски ёзувлардаги lineSubtotal (2026-10-16). */
  function hbSaleNoVat(sale, it){
    var v = Number(it.noVatAmount);
    if(it.noVatAmount!==undefined && it.noVatAmount!==null && it.noVatAmount!=="" && v>0) return v;
    var total = Number(it.lineTotal)||0;
    var vs = Number(it.vatSum)||0;
    if(vs>0 && total>0) return Math.max(0, total-vs);
    var fromOrder = hbOrderNoVat(sale, it);
    if(fromOrder!==null) return fromOrder;
    var vr = Number(it.noVatRate);
    if(!(vr>0)) vr = Number(it.vatRate);
    if(!(vr>0)) vr = 12;
    if(total>0) return r2(total/(1+vr/100));
    return Number(it.lineSubtotal)||0;
  }
  function hbOrderNoVat(sale, it){
    if(!sale || !sale.orderId) return null;
    var o = orderById(sale.orderId);
    if(!o) return null;
    var list = orderItemsList(o);
    var m = list.filter(function(x){
      if(it.itemId && x.itemId) return x.itemId===it.itemId;
      return String(x.product||"").trim()===String(it.name||"").trim();
    })[0];
    if(!m) return null;
    var nv = Number(m.noVatAmount)||0;
    if(!nv) return null;
    var oq = Number(m.quantity)||0, sq = Number(it.qty)||0;
    if(oq>0 && sq>0 && Math.abs(oq-sq)>0.0001) return r2(nv/oq*sq);
    return nv;
  }
  function hbItemCatId(it){
    var item = it.itemId ? itemById(it.itemId) : findItemByExactName(it.name||it.product||"");
    return item ? (item.categoryId||"") : "";
  }
  /* ===== Товар таннархи (2026-10-19 сўрови) =====
     Савдода ТОВАР ёки ХОМАШЁ сотилса, унинг сотиб олинган қиймати
     («Ҳисобот → Харажат» даги «Товар таннархи» панели) харажатга ёзилади;
     сотув нархидан таннарх айирилган фарқ эса «Даромад» панелида товар
     номи ёнида кўрсатилади. Калькуляцияси бор маҳсулотлар бунга кирмайди —
     уларнинг таннархи «Маҳсулотлар таннархи» панелида ҳисобланади.
     Таннарх — ўша омбордаги ЎРТАЧА КИРИМ нархи (кирим бўлмаса, маҳсулот
     карточкасидаги нарх). */
  function hbIsTovarLike(item){ return !!(item && (item.itemType==="tovar" || item.itemType==="xomashyo")); }
  function hbTovarUnitCost(itemId, whId){
    if(!itemId) return 0;
    var p = itemAveragePrice(itemId, whId||"");
    if(p>0) return p;
    var it = itemById(itemId);
    return it ? (Number(it.price)||0) : 0;
  }
  function hbSaleLineTovarCost(sale, it){
    var item = it.itemId ? itemById(it.itemId) : findItemByExactName(it.name||"");
    if(!hbIsTovarLike(item)) return null;
    if(finRecipeForItem(item, it.name||"")) return null;
    var q = Number(it.qty)||0;
    if(!(q>0)) return null;
    var unitCost = hbTovarUnitCost(item.id, sale ? sale.warehouseId : "");
    return {item:item, qty:q, unitCost:unitCost, cost:unitCost*q};
  }
  /* Даромад: сотувлардан категория бўйича маҳсулотлар кесимида. */
  function hisobotIncome(catId, year, month){
    var prefix = hbPrefix(year, month);
    var map = {}, order = [], totalQty = 0, totalSum = 0, totalCost = 0;
    STATE.sales.forEach(function(s){
      if(s.cancelled) return;
      var d = s.date || (s.createdAt||"").slice(0,10);
      if(String(d).slice(0,7)!==prefix) return;
      (s.items||[]).forEach(function(it){
        if(hbItemCatId(it)!==catId) return;
        var key = it.itemId || ("name:"+String(it.name||""));
        if(!map[key]){
          var itm = it.itemId ? itemById(it.itemId) : null;
          map[key] = {key:key, itemId:it.itemId||"", name:it.name||(itm?itm.name:"—"), unit:it.unit||(itm?itm.unit:""), qty:0, sum:0, cost:0, isTovar:false, rows:[]};
          order.push(key);
        }
        var sub = hbSaleNoVat(s, it);
        var q = Number(it.qty)||0;
        var tc = hbSaleLineTovarCost(s, it);
        var lineCost = tc ? tc.cost : 0;
        if(tc) map[key].isTovar = true;
        map[key].qty += q; map[key].sum += sub; map[key].cost += lineCost;
        map[key].rows.push({saleId:s.id, saleNumber:s.saleNumber||0, date:d,
          customer:s.customerName||customerName(s.customerId)||"—", qty:q, sum:sub, cost:lineCost});
        totalQty += q; totalSum += sub; totalCost += lineCost;
      });
    });
    var rows = order.map(function(k){ return map[k]; });
    rows.forEach(function(r){ r.rows.sort(function(a,b){ return String(a.date).localeCompare(String(b.date)); }); r.profit = r.sum - r.cost; });
    rows.sort(function(a,b){ return b.sum-a.sum; });
    return {rows:rows, totalQty:totalQty, totalSum:totalSum, totalCost:totalCost, totalProfit:totalSum-totalCost};
  }
  /* «Товар таннархи» панели — сотилган товар/хомашё кесимида. */
  function hisobotTovarCost(catId, year, month){
    var prefix = hbPrefix(year, month);
    var map = {}, order = [], total = 0, totalSale = 0;
    STATE.sales.forEach(function(s){
      if(s.cancelled) return;
      var d = s.date || (s.createdAt||"").slice(0,10);
      if(String(d).slice(0,7)!==prefix) return;
      (s.items||[]).forEach(function(it){
        if(hbItemCatId(it)!==catId) return;
        var tc = hbSaleLineTovarCost(s, it);
        if(!tc) return;
        var key = tc.item.id;
        if(!map[key]){
          map[key] = {key:key, itemId:tc.item.id, name:tc.item.name, typeLabel:itemTypeLabel(tc.item.itemType),
            unit:it.unit||tc.item.unit||"", qty:0, cost:0, sale:0, rows:[]};
          order.push(key);
        }
        var sub = hbSaleNoVat(s, it);
        map[key].qty += tc.qty; map[key].cost += tc.cost; map[key].sale += sub;
        map[key].rows.push({date:d, saleNumber:s.saleNumber||0, customer:s.customerName||customerName(s.customerId)||"—",
          qty:tc.qty, unitCost:tc.unitCost, cost:tc.cost, sale:sub});
        total += tc.cost; totalSale += sub;
      });
    });
    var rows = order.map(function(k){ return map[k]; });
    rows.forEach(function(r){ r.profit = r.sale - r.cost; r.rows.sort(function(a,b){ return String(a.date).localeCompare(String(b.date)); }); });
    rows.sort(function(a,b){ return b.cost-a.cost; });
    return {rows:rows, total:total, totalSale:totalSale, totalProfit:totalSale-total};
  }
  /* Калькуляциянинг ТАННАРХ таркиби (1 бирлик учун эмас, партия бўйича).
     Фойдаланувчи сўровига кўра (2026-10-17): «Иш ҳақи жами», «Иш ҳақидан
     даромад солиғи жами» ва «Иш ҳақидан ЯИТ жами» энди калькуляциядан
     ЭМАС, Ходимлар бўлимидан (Наряд ва Иш ҳақи ҳисоблаш) олинади —
     шунинг учун улар маҳсулот карточкаларида кўрсатилмайди (қуйидаги
     skipInProducts белгиси). */
  function hbCostParts(res){
    return [
      {key:"material", name:"Хомашё жами",                     amount:res.materialTotal},
      {key:"extra",    name:"Қўшимча харажатлар жами",          amount:res.expenseSum},
      {key:"wage",     name:"Иш ҳақи жами",                     amount:res.wageTotal,       skipInProducts:true},
      {key:"elec",     name:"Электр энергия жами",              amount:res.electricityTotal},
      {key:"gas",      name:"Табиий газ",                       amount:res.gasTotal},
      {key:"tax",      name:"Иш ҳақидан даромад солиғи жами",   amount:res.taxAmount,       skipInProducts:true},
      {key:"yiit",     name:"Иш ҳақидан ЯИТ жами",              amount:res.yiitAmount,      skipInProducts:true},
      {key:"amort",    name:"Амортизация жами",                 amount:res.amort}
    ];
  }
  function hbCatNameOf(catId){
    if(String(catId)===FIN_ADMIN_CAT) return FIN_ADMIN_NAME;
    var c = STATE.categories.find(function(x){ return x.id===catId; });
    return c ? String(c.name||"") : "";
  }
  /* Ҳисоботдаги категориялар рўйхати. «Бошқарув бўлими» — Молия
     бўлимидаги алоҳида категория; агар у ҳақиқий категория сифатида
     яратилмаган бўлса ҳам, рўйхатда кўринади (харажатлари бошқа
     категорияларга бўлиб бериладиган манба бўлгани учун). */
  function hbCategoryList(){
    var list = STATE.categories.slice().sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
    var hasAdmin = list.some(function(c){ return hbSameCat(c.name, FIN_ADMIN_NAME); });
    if(!hasAdmin) list.push({id:FIN_ADMIN_CAT, name:FIN_ADMIN_NAME, _virtual:true});
    return list;
  }
  function hbSameCat(a, b){
    return String(a||"").trim().toLowerCase() === String(b||"").trim().toLowerCase();
  }
  /* Ходимнинг категорияси — АЙНАН ШУ ой учун (категорияга ўтказиш
     тарихи ҳисобга олинган ҳолда, 2026-10-17). */
  function hbEmpCatName(empId, year, month){
    return employeeCategoryOn(empId, year, month);
  }
  /* Шу категория «Бошқарув бўлими»ми? (ҳақиқий категория ҳам, Молия
     бўлимидаги виртуал категория ҳам шундай ҳисобланади.) */
  function hbIsAdminCat(catId){
    return String(catId)===FIN_ADMIN_CAT || hbSameCat(hbCatNameOf(catId), FIN_ADMIN_NAME);
  }
  function hbAdminCatId(){
    var c = STATE.categories.find(function(x){ return hbSameCat(x.name, FIN_ADMIN_NAME); });
    return c ? c.id : FIN_ADMIN_CAT;
  }
  /* Табел бўйича ишланган иш кунлари: категориялар кесимида ва жами.
     Фойдаланувчи сўровига кўра (2026-10-17) «Бошқарув бўлими»
     категориясининг ходимлари бу ҳисобга УМУМАН кирмайди — чунки шу
     бўлимнинг харажати қолган категориялар ўртасида бўлинади. */
  function hbTabelDays(year, month){
    var byCat = {}, total = 0;
    STATE.timesheets.forEach(function(t){
      if(t.cancelled) return;
      if(Number(t.year)!==Number(year) || Number(t.month)!==Number(month)) return;
      (t.entries||[]).forEach(function(en){
        var d = Number(en.days)||0;
        if(!d) return;
        var c = hbEmpCatName(en.employeeId, year, month) || (en.workshopId ? workshopName(en.workshopId) : "");
        if(hbSameCat(c, FIN_ADMIN_NAME)) return;
        var k = String(c||"").trim().toLowerCase();
        byCat[k] = (byCat[k]||0) + d;
        total += d;
      });
    });
    return {byCat:byCat, total:total};
  }
  /* Наряд (salaryRuns) — шу ой ва шу категория ходимлари бўйича
     «Қолдиқ» устуни йиғиндиси = «Иш ҳақи жами». */
  function hbNaryadWage(catName, year, month){
    var total = 0, rows = [];
    if(!String(catName||"").trim()) return {total:0, rows:[]};
    STATE.salaryRuns.forEach(function(run){
      if(run.cancelled) return;
      if(Number(run.year)!==Number(year) || Number(run.month)!==Number(month)) return;
      computeSalaryGroups(run).forEach(function(g){
        g.rows.forEach(function(rr){
          var c = hbEmpCatName(rr.employeeId, year, month) || g.workshopName;
          if(!hbSameCat(c, catName)) return;
          var amt = Number(rr.net)||0;
          total += amt;
          rows.push({fullName:rr.fullName, workshop:g.workshopName, date:run.date||(run.createdAt||"").slice(0,10), amount:amt});
        });
      });
    });
    rows.sort(function(a,b){ return String(a.fullName||"").localeCompare(String(b.fullName||"")); });
    return {total:total, rows:rows};
  }
  /* Иш ҳақи ҳисоблаш (payrollRuns) — шу ой ва шу категория ходимлари
     бўйича солиқлар. МУҲИМ: жадвал сарлавҳалари атайин алмаштирилган —
     «ЯИТ» устуни taxAmount, «Даромад солиғи» устуни socAmount, «0,1%»
     устуни эса pensionAmount. Шунга кўра:
       • Иш ҳақидан даромад солиғи жами = socAmount + pensionAmount
       • Иш ҳақидан ЯИТ жами            = taxAmount */
  function hbPayrollTaxes(catName, year, month){
    var yiit = 0, incomeTax = 0, pension = 0, rows = [];
    if(!String(catName||"").trim()) return {yiit:0, taxOnly:0, pension:0, incomeTax:0, rows:[]};
    STATE.payrollRuns.forEach(function(run){
      if(run.cancelled) return;
      if(Number(run.year)!==Number(year) || Number(run.month)!==Number(month)) return;
      computePayrollRows(run).forEach(function(rr){
        var c = hbEmpCatName(rr.employeeId, year, month) || rr.workshopName;
        if(!hbSameCat(c, catName)) return;
        var y = Number(rr.taxAmount)||0, t1 = Number(rr.socAmount)||0, p1 = Number(rr.pensionAmount)||0;
        yiit += y; incomeTax += t1; pension += p1;
        rows.push({fullName:rr.fullName, yiit:y, tax:t1, pension:p1});
      });
    });
    rows.sort(function(a,b){ return String(a.fullName||"").localeCompare(String(b.fullName||"")); });
    return {yiit:yiit, taxOnly:incomeTax, pension:pension, incomeTax:incomeTax+pension, rows:rows};
  }
  /* Харажат: маҳсулотлар таннархи + Ходимлар бўлимидан иш ҳақи/солиқлар +
     Кассадаги «Бошқа харажатлар» + «Бошқарув бўлими» улуши. */
  function hisobotExpense(catId, year, month, incomeRes){
    var prefix = hbPrefix(year, month);
    var catName = hbCatNameOf(catId);
    var isAdminCat = hbIsAdminCat(catId);
    var inc = incomeRes || hisobotIncome(catId, year, month);
    var productsTotal = 0;
    var products = inc.rows.filter(function(r){
      /* Товар ва калькуляцияси бўлмаган хомашё энди алоҳида «Товар
         таннархи» панелида ҳисобланади — бу ерда такрорланмайди
         (2026-10-19 сўрови). */
      var itm = r.itemId ? itemById(r.itemId) : null;
      return !(hbIsTovarLike(itm) && !finRecipeForItem(itm, r.name));
    }).map(function(r){
      var item = r.itemId ? itemById(r.itemId) : null;
      var rec = finRecipeForItem(item, r.name);
      var parts = [], total = 0;
      if(rec){
        var n = normalizeRecipe(rec);
        var res = computeRecipeCost(n, [], 0);
        var batch = Number(n.quantity)>0 ? Number(n.quantity) : 1;
        hbCostParts(res).forEach(function(pp){
          if(pp.skipInProducts) return;
          var amt = (Number(pp.amount)||0)/batch*r.qty;
          if(Math.abs(amt)>0.004){ parts.push({name:pp.name, perUnit:(Number(pp.amount)||0)/batch, amount:amt}); total += amt; }
        });
      }
      productsTotal += total;
      return {name:r.name, unit:r.unit, qty:r.qty, hasRecipe:!!rec, parts:parts, total:total};
    });
    /* Товар/хомашё таннархи (2026-10-19 сўрови). */
    var tovar = hisobotTovarCost(catId, year, month);
    /* Ходимлар бўлимидан (2026-10-17 сўрови). */
    var naryad = hbNaryadWage(catName, year, month);
    var taxes = hbPayrollTaxes(catName, year, month);
    var laborTotal = naryad.total + taxes.incomeTax + taxes.yiit;
    var costTotal = productsTotal + tovar.total + laborTotal;

    /* Касса чиқимлари. Оддий категорияда — фақат «Бошқа харажатлар»
       харажат тури; «Бошқарув бўлими» категориясида эса — унинг БАРЧА
       чиқимлари (у ердаги харажат турлари Администрация ва Маркетинг
       бўлгани учун), шунингдек Молия бўлимидаги виртуал категорияга
       ёзилганлари ҳам (2026-10-17). */
    var otherRows = [], otherTotal = 0;
    STATE.cashTransactions.forEach(function(t){
      if(t.cancelled || t.direction!=="chiqim") return;
      var tc = String(t.categoryId||"");
      var catOk = isAdminCat ? (tc===String(catId) || tc===FIN_ADMIN_CAT) : (tc===String(catId));
      if(!catOk) return;
      if(!isAdminCat && String(t.bucket||"")!=="other") return;
      var d = t.date || (t.createdAt||"").slice(0,10);
      if(String(d).slice(0,7)!==prefix) return;
      var amt = finTxSom(t);
      if(!amt) return;
      otherTotal += amt;
      otherRows.push({date:d, docNumber:t.docNumber||"", who:t.counterpartyName||"—",
                      note:t.description||"", bucket:t.bucket?finBucketName(t.bucket):"—", amount:amt});
    });
    otherRows.sort(function(a,b){ return String(a.date).localeCompare(String(b.date)); });

    var ownTotal = costTotal + otherTotal;

    /* «Бошқарув бўлими» категориясининг ЖАМИ харажати қолган
       категориялар ўртасида Табелдаги иш кунлари нисбатида бўлинади.
       «Бошқарув бўлими»нинг ўзида бу панел кўрсатилмайди (2026-10-17). */
    var admin = null;
    if(!isAdminCat){
      var tab = hbTabelDays(year, month);
      var admExp = hisobotExpense(hbAdminCatId(), year, month);
      var catDays = tab.byCat[String(catName||"").trim().toLowerCase()] || 0;
      var ratio = tab.total>0 ? catDays/tab.total : 0;
      admin = {
        allTotal: admExp.total,
        parts: {products: admExp.productsTotal, tovar: admExp.tovarTotal, labor: admExp.laborTotal, cash: admExp.otherTotal},
        rows: admExp.otherRows,
        catDays: catDays, allDays: tab.total, pct: ratio*100, amount: admExp.total*ratio
      };
    }

    return {
      isAdminCat:isAdminCat,
      products:products, productsTotal:productsTotal,
      tovarRows:tovar.rows, tovarTotal:tovar.total, tovarSale:tovar.totalSale, tovarProfit:tovar.totalProfit,
      naryad:naryad, taxes:taxes, laborTotal:laborTotal, costTotal:costTotal,
      otherRows:otherRows, otherTotal:otherTotal, ownTotal:ownTotal,
      admin:admin,
      total: ownTotal + (admin ? admin.amount : 0)
    };
  }
  /* Танланган оралиқдаги ЁПИЛГАН ойлар бўйича жамланма (2026-10-17). */
  function hbClosedTotals(catId, year, fromM, toM){
    var income = 0, expense = 0, months = 0;
    STATE.monthlyReports.forEach(function(r){
      if(r.cancelled) return;
      if(String(r.categoryId)!==String(catId)) return;
      if(Number(r.year)!==Number(year)) return;
      var m = Number(r.month)||0;
      if(m<Number(fromM) || m>Number(toM)) return;
      income += Number(r.income)||0;
      expense += Number(r.expense)||0;
      months++;
    });
    return {income:income, expense:expense, profit:income-expense, months:months};
  }
  function hisobotClosed(catId, year, month){
    return STATE.monthlyReports.find(function(x){
      return !x.cancelled && String(x.categoryId)===String(catId) && Number(x.year)===Number(year) && Number(x.month)===Number(month);
    }) || null;
  }

  function viewHisobot(){
    if(!STATE.hisobotCatId) return renderHisobotCats();
    var cat = hbCategoryList().filter(function(c){ return c.id===STATE.hisobotCatId; })[0];
    if(!cat){ STATE.hisobotCatId = ""; return renderHisobotCats(); }
    return renderHisobotCat(cat);
  }
  function renderHisobotCats(){
    var curY = new Date().getFullYear();
    if(!STATE.hisobotListYear) STATE.hisobotListYear = curY;
    if(!STATE.hisobotListFrom) STATE.hisobotListFrom = 1;
    if(!STATE.hisobotListTo) STATE.hisobotListTo = 12;
    var y = STATE.hisobotListYear, f = STATE.hisobotListFrom, t = STATE.hisobotListTo;
    if(f>t){ var tmp=f; f=t; t=tmp; STATE.hisobotListFrom=f; STATE.hisobotListTo=t; }
    var periodTxt = (f===t) ? ((MONTHS_FULL[f-1]||"")+" "+y+" йил")
                            : ((MONTHS_FULL[f-1]||"")+" — "+(MONTHS_FULL[t-1]||"")+" "+y+" йил");
    setTopbar("Ҳисобот", "Категориялар кесимида даромад, харажат ва фойда · "+periodTxt, "");
    var root = document.getElementById("content");
    var list = hbCategoryList();
    if(!list.length){
      root.innerHTML = emptyState("Ҳали категория яратилмаган", "Категориялар «Омборлар → Бошқарув» бўлимида яратилади.");
      return;
    }
    var monthOpts = function(cur){
      return MONTHS_FULL.map(function(mn,i){ return '<option value="'+(i+1)+'"'+(Number(cur)===(i+1)?" selected":"")+'>'+mn+'</option>'; }).join("");
    };
    /* Йил, даврдан, давргача ва Излаш — битта ихчам қаторда (2026-10-17). */
    var inpS = 'padding:5px 8px;font-size:12.5px;height:auto;';
    var lblS = 'font-size:11px;margin-bottom:3px;';
    var html = '<div class="card" style="padding:10px 12px;margin-bottom:12px;">'+
      '<div style="display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;">'+
        '<div class="field" style="margin-bottom:0;width:110px;"><label style="'+lblS+'">Йил</label><input id="hbl-year" type="number" min="2000" step="1" value="'+esc(y)+'" style="'+inpS+'"></div>'+
        '<div class="field" style="margin-bottom:0;width:150px;"><label style="'+lblS+'">Даврдан</label><select id="hbl-from" style="'+inpS+'">'+monthOpts(f)+'</select></div>'+
        '<div class="field" style="margin-bottom:0;width:150px;"><label style="'+lblS+'">Давргача</label><select id="hbl-to" style="'+inpS+'">'+monthOpts(t)+'</select></div>'+
        '<button class="btn btn-primary btn-sm" id="hbl-run">'+ICONS.search+'Излаш</button>'+
        '<span class="field-hint" style="margin:0 0 4px;flex:1;min-width:200px;">Жамланмалар фақат ЁПИЛГАН ойлар бўйича. Битта ойни кўриш учун иккала катакка бир хил ойни танланг.</span>'+
      '</div>'+
    '</div>';

    var gInc = 0, gExp = 0, gMonths = 0;
    var rows = list.map(function(c){
      var tot = hbClosedTotals(c.id, y, f, t);
      var isAdm = hbIsAdminCat(c.id);
      if(!isAdm){ gInc += tot.income; gExp += tot.expense; gMonths += tot.months; }
      var prof = tot.profit;
      return '<tr>'+
        '<td class="cell-strong">'+esc(c.name)+
          (isAdm ? '<div class="field-hint" style="margin:2px 0 0;">Харажатлари бошқа категорияларга бўлинади — жамига кирмайди</div>' : '')+'</td>'+
        '<td class="num">'+(tot.months ? (tot.months+" та ой") : '<span class="cell-muted">ёпилмаган</span>')+'</td>'+
        '<td class="num" style="color:var(--good);font-weight:700;">'+fmtSum(tot.income)+'</td>'+
        '<td class="num" style="color:var(--critical);font-weight:700;">'+fmtSum(tot.expense)+'</td>'+
        '<td class="num" style="font-weight:800;color:'+(prof>=0?"var(--good)":"var(--critical)")+';">'+
          (tot.months ? ((prof>=0?"Фойда ":"Зарар ")+fmtSum(Math.abs(prof))) : "—")+'</td>'+
        '<td style="width:150px;"><button class="btn btn-secondary btn-sm" data-hb-cat="'+esc(c.id)+'">Ичига кириш'+ICONS.arrowRight+'</button></td>'+
      '</tr>';
    }).join("");
    var gProf = gInc-gExp;
    html += '<div class="card" style="padding:16px 18px;margin-bottom:14px;">'+
      '<div class="table-wrap"><table><thead><tr><th>Категория</th><th class="num">Ёпилган</th>'+
        '<th class="num">Жами даромад</th><th class="num">Жами харажат</th><th class="num">Фойда ёки зарар</th><th></th></tr></thead>'+
        '<tbody>'+rows+'</tbody></table></div>'+
    '</div>'+
    '<div class="card" style="padding:18px 20px;border-left:4px solid var(--accent);">'+
      '<div class="section-head"><h2 style="font-size:13.5px;">Барча категориялар бўйича жами</h2>'+
        '<span class="field-hint">'+esc(periodTxt)+' · ёпилган '+gMonths+' та ой ҳисоботи</span></div>'+
      '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px;"><span>Жами даромад</span><span class="num" style="font-weight:700;color:var(--good);">'+fmtSum(gInc)+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:10px;"><span>Жами харажат</span><span class="num" style="font-weight:700;color:var(--critical);">'+fmtSum(gExp)+'</span></div>'+
      '<div style="border-top:1px solid var(--border-strong);padding-top:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">'+
        '<span style="font-weight:800;font-size:15px;">'+(gProf>=0?"ЖАМИ ФОЙДА":"ЖАМИ ЗАРАР")+'</span>'+
        '<span class="num" style="font-weight:800;font-size:20px;color:'+(gProf>=0?"var(--good)":"var(--critical)")+';">'+fmtSum(Math.abs(gProf))+'</span>'+
      '</div>'+
      (gMonths ? '' : '<div class="field-hint" style="margin-top:8px;">Бу оралиқда ҳали бирорта ой ёпилмаган — категория ичига кириб «Ойни ёпиш» тугмаси орқали ёпинг.</div>')+
    '</div>';

    root.innerHTML = html;
    var yEl = root.querySelector("#hbl-year"), fEl = root.querySelector("#hbl-from"), tEl = root.querySelector("#hbl-to");
    root.querySelector("#hbl-run").addEventListener("click", function(){
      STATE.hisobotListYear = Number(yEl.value)||curY;
      STATE.hisobotListFrom = Number(fEl.value)||1;
      STATE.hisobotListTo = Number(tEl.value)||12;
      render();
    });
    root.querySelectorAll("[data-hb-cat]").forEach(function(b){ b.addEventListener("click", function(){
      STATE.hisobotCatId = b.getAttribute("data-hb-cat");
      STATE.hisobotTab = "income";
      STATE.hisobotRan = false;
      if(!STATE.hisobotYear) STATE.hisobotYear = STATE.hisobotListYear || curY;
      if(!STATE.hisobotMonth) STATE.hisobotMonth = new Date().getMonth()+1;
      render();
    }); });
  }

  function renderHisobotCat(cat){
    var curY = new Date().getFullYear();
    if(!STATE.hisobotYear) STATE.hisobotYear = curY;
    if(!STATE.hisobotMonth) STATE.hisobotMonth = new Date().getMonth()+1;
    var y = STATE.hisobotYear, mo = STATE.hisobotMonth;
    var tab = STATE.hisobotTab || "income";
    setTopbar("Ҳисобот — "+cat.name, hbPeriodLabel(y, mo),
      '<button class="btn btn-secondary" id="hbBack">'+ICONS.arrowLeft+'Категориялар</button>');
    var root = document.getElementById("content");
    var closed = hisobotClosed(cat.id, y, mo);
    var html = '<div class="filter-row" style="margin-bottom:14px;">'+
      HISOBOT_TABS.map(function(t){ return '<button class="pill-filter'+(tab===t[0]?" active":"")+'" data-hbtab="'+t[0]+'">'+t[1]+'</button>'; }).join("")+
    '</div>'+
    '<div class="card" style="padding:14px 16px;margin-bottom:14px;"><div class="field-row" style="margin-bottom:0;">'+
      '<div class="field" style="margin-bottom:0;"><label>Йил</label><input id="hb-year" type="number" min="2000" step="1" value="'+esc(y)+'"></div>'+
      '<div class="field" style="margin-bottom:0;"><label>Ой</label><select id="hb-month">'+MONTHS_FULL.map(function(mn,i){ return '<option value="'+(i+1)+'"'+(mo===(i+1)?" selected":"")+'>'+mn+'</option>'; }).join("")+'</select></div>'+
      '<div class="field" style="margin-bottom:0;display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;">'+
        '<button class="btn btn-primary" id="hb-run">'+ICONS.search+'Излаш</button>'+
        (closed ? '<span class="chip chip-good">Ой ёпилган · '+esc(fmtDateShort((closed.closedAt||"").slice(0,10)))+'</span>' : '')+
      '</div>'+
    '</div></div>';

    if(!STATE.hisobotRan){
      html += '<div class="card" style="padding:16px 18px;"><div class="field-hint">Йил ва ойни танлаб «Излаш» тугмасини босинг.</div></div>';
      root.innerHTML = html;
      wireHisobotCat(root, cat);
      return;
    }

    var inc = hisobotIncome(cat.id, y, mo);
    if(tab==="income"){
      if(!inc.rows.length){
        html += emptyState("Бу ойда сотув йўқ", "«"+cat.name+"» категориясидаги маҳсулотлар "+hbPeriodLabel(y,mo)+" даврида сотилмаган.");
      } else {
        html += '<div class="card" style="padding:16px 18px;">'+
          '<div class="section-head"><h2 style="font-size:13.5px;">Даромад — '+esc(hbPeriodLabel(y,mo))+'</h2>'+
            (inc.totalCost>0.004?('<span class="field-hint">Товар/хомашё бўйича фарқ: <b>'+fmtSum(inc.totalProfit)+'</b></span>'):'')+'</div>'+
          /* Товар ёки хомашё сотилганда — таннархи ва «сотув − таннарх»
             фарқи ҳам шу ерда, маҳсулот номи ёнида кўринади (2026-10-19). */
          '<div class="table-wrap"><table><thead><tr><th>№</th><th>Маҳсулот</th><th class="num">Жами сони</th><th class="num">Жами сумма (ҚҚСсиз)</th><th class="num">Товар таннархи</th><th class="num">Фарқ (сотув − таннарх)</th><th></th></tr></thead><tbody>'+
            inc.rows.map(function(r,i){
              return '<tr><td>'+(i+1)+'</td><td class="cell-strong">'+esc(r.name)+'</td>'+
                '<td class="num">'+fmtNum(r.qty)+' '+esc(r.unit||"")+'</td>'+
                '<td class="num cell-strong">'+fmtSum(r.sum)+'</td>'+
                '<td class="num cell-muted">'+(r.isTovar?fmtSum(r.cost):"—")+'</td>'+
                '<td class="num cell-strong" style="'+(r.isTovar?("color:"+((r.profit>=0)?"var(--good)":"var(--critical)")+";"):"")+'">'+(r.isTovar?fmtSum(r.profit):"—")+'</td>'+
                '<td style="width:44px;"><button class="btn btn-ghost btn-icon" data-hb-eye="'+esc(r.key)+'" title="Сотувлар тафсилоти">'+ICONS.eye+'</button></td></tr>';
            }).join("")+
          '</tbody><tfoot><tr><th colspan="2">ЖАМИ</th><th class="num">'+fmtNum(inc.totalQty)+'</th><th class="num">'+fmtSum(inc.totalSum)+'</th><th class="num">'+(inc.totalCost>0.004?fmtSum(inc.totalCost):"—")+'</th><th class="num">'+(inc.totalCost>0.004?fmtSum(inc.totalProfit):"—")+'</th><th></th></tr></tfoot></table></div>'+
        '</div>';
      }
    } else if(tab==="expense"){
      var exp = hisobotExpense(cat.id, y, mo, inc);
      html += '<div class="card" style="padding:16px 18px;margin-bottom:14px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">Маҳсулотлар таннархи — '+esc(hbPeriodLabel(y,mo))+'</h2>'+
          '<span class="field-hint">Жами: <b>'+fmtSum(exp.productsTotal+exp.laborTotal)+'</b></span></div>'+
        (exp.products.length ? exp.products.map(function(pr){
          return '<div class="card" style="padding:12px 14px;margin-bottom:10px;background:var(--surface-2);">'+
            '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">'+
              '<div style="font-weight:800;">'+esc(pr.name)+' <span class="cell-muted" style="font-weight:600;">· '+fmtNum(pr.qty)+' '+esc(pr.unit||"")+'</span></div>'+
              '<div class="num" style="font-weight:800;">'+fmtSum(pr.total)+'</div>'+
            '</div>'+
            (pr.hasRecipe
              ? '<div class="table-wrap"><table><thead><tr><th>Таннарх таркиби</th><th class="num">1 бирлик учун</th><th class="num">Сумма</th></tr></thead><tbody>'+
                  (pr.parts.length ? pr.parts.map(function(pt){
                    return '<tr><td>'+esc(pt.name)+'</td><td class="num cell-muted">'+fmtSum(pt.perUnit)+'</td><td class="num cell-strong">'+fmtSum(pt.amount)+'</td></tr>';
                  }).join("") : '<tr><td colspan="3" class="cell-muted">Калькуляцияда харажат киритилмаган</td></tr>')+
                '</tbody></table></div>'
              : '<div class="field-hint" style="color:var(--critical);font-weight:700;">Бу маҳсулот учун калькуляция топилмади — таннарх ҳисобланмади.</div>')+
          '</div>';
        }).join("") : '<div class="field-hint" style="margin-bottom:10px;">Бу ойда сотув бўлмагани учун маҳсулот таннархи йўқ.</div>')+
        /* Иш ҳақи ва солиқлар — Ходимлар бўлимидан (2026-10-17). */
        '<div class="card" style="padding:12px 14px;background:var(--surface-2);">'+
          '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">'+
            '<div style="font-weight:800;">Иш ҳақи ва солиқлар <span class="cell-muted" style="font-weight:600;">· Ходимлар бўлимидан</span></div>'+
            '<div class="num" style="font-weight:800;">'+fmtSum(exp.laborTotal)+'</div>'+
          '</div>'+
          '<div class="table-wrap"><table><thead><tr><th>Номи</th><th>Манба</th><th class="num">Сумма</th><th></th></tr></thead><tbody>'+
            '<tr><td class="cell-strong">Иш ҳақи жами</td><td class="cell-muted">Наряд — «Қолдиқ» устуни</td>'+
              '<td class="num cell-strong">'+fmtSum(exp.naryad.total)+'</td>'+
              '<td style="width:44px;"><button class="btn btn-ghost btn-icon" data-hb-lab="naryad" title="Тафсилот">'+ICONS.eye+'</button></td></tr>'+
            '<tr><td class="cell-strong">Иш ҳақидан даромад солиғи жами</td><td class="cell-muted">Иш ҳақи ҳисоблаш — «Даромад солиғи» + «0,1%»</td>'+
              '<td class="num cell-strong">'+fmtSum(exp.taxes.incomeTax)+'</td>'+
              '<td><button class="btn btn-ghost btn-icon" data-hb-lab="tax" title="Тафсилот">'+ICONS.eye+'</button></td></tr>'+
            '<tr><td class="cell-strong">Иш ҳақидан ЯИТ жами</td><td class="cell-muted">Иш ҳақи ҳисоблаш — «ЯИТ» устуни</td>'+
              '<td class="num cell-strong">'+fmtSum(exp.taxes.yiit)+'</td>'+
              '<td><button class="btn btn-ghost btn-icon" data-hb-lab="yiit" title="Тафсилот">'+ICONS.eye+'</button></td></tr>'+
          '</tbody></table></div>'+
        '</div>'+
      '</div>'+
      /* Товар таннархи — сотилган товар/хомашёнинг сотиб олинган қиймати
         (2026-10-19 сўрови). */
      '<div class="card" style="padding:16px 18px;margin-bottom:14px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">Товар таннархи</h2>'+
          '<span class="field-hint">Жами: <b>'+fmtSum(exp.tovarTotal)+'</b></span></div>'+
        (exp.tovarRows.length
          ? '<div class="table-wrap"><table><thead><tr><th>№</th><th>Товар / хомашё</th><th>Тури</th><th class="num">Сотилган сони</th><th class="num">1 бирлик таннархи</th><th class="num">Таннарх жами</th><th class="num">Сотув (ҚҚСсиз)</th><th class="num">Фарқ</th></tr></thead><tbody>'+
              exp.tovarRows.map(function(tr,i){
                return '<tr><td>'+(i+1)+'</td><td class="cell-strong">'+esc(tr.name)+'</td>'+
                  '<td class="cell-muted">'+esc(tr.typeLabel)+'</td>'+
                  '<td class="num">'+fmtNum(tr.qty)+' '+esc(tr.unit||"")+'</td>'+
                  '<td class="num cell-muted">'+fmtSum(tr.qty>0?tr.cost/tr.qty:0)+'</td>'+
                  '<td class="num cell-strong">'+fmtSum(tr.cost)+'</td>'+
                  '<td class="num cell-muted">'+fmtSum(tr.sale)+'</td>'+
                  '<td class="num cell-strong" style="color:'+((tr.profit>=0)?"var(--good)":"var(--critical)")+';">'+fmtSum(tr.profit)+'</td></tr>';
              }).join("")+
            '</tbody><tfoot><tr><th colspan="5">ЖАМИ</th><th class="num">'+fmtSum(exp.tovarTotal)+'</th><th class="num">'+fmtSum(exp.tovarSale)+'</th><th class="num">'+fmtSum(exp.tovarProfit)+'</th></tr></tfoot></table></div>'
          : '<div class="field-hint">Бу ойда товар ёки хомашё сотилмаган.</div>')+
      '</div>'+
      '<div class="card" style="padding:16px 18px;margin-bottom:14px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">'+(exp.isAdminCat?"Касса харажатлари":"Бошқа харажатлар (Касса)")+'</h2>'+
          '<span class="field-hint">Жами: <b>'+fmtSum(exp.otherTotal)+'</b></span></div>'+
        (exp.otherRows.length
          ? '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сана</th><th>Ҳужжат</th><th>Кимга</th><th>Харажат тури</th><th>Изоҳ</th><th class="num">Сумма</th></tr></thead><tbody>'+
              exp.otherRows.map(function(o,i){
                return '<tr><td>'+(i+1)+'</td><td>'+esc(fmtDateShort(o.date))+'</td><td>'+esc(o.docNumber||"—")+'</td>'+
                  '<td>'+esc(o.who)+'</td><td class="cell-muted">'+esc(o.bucket||"—")+'</td><td class="cell-muted">'+esc(o.note||"—")+'</td>'+
                  '<td class="num cell-strong">'+fmtSum(o.amount)+'</td></tr>';
              }).join("")+
            '</tbody><tfoot><tr><th colspan="6">ЖАМИ</th><th class="num">'+fmtSum(exp.otherTotal)+'</th></tr></tfoot></table></div>'
          : '<div class="field-hint">Бу ойда шу категория бўйича касса чиқими йўқ.</div>')+
      '</div>'+
      /* «Бошқарув бўлими» улуши — Табелдаги иш кунлари нисбатида. Бу
         панел «Бошқарув бўлими» категориясининг ЎЗИДА кўрсатилмайди
         (2026-10-17 сўрови). */
      (exp.admin ?
      ('<div class="card" style="padding:16px 18px;margin-bottom:14px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">Бошқарув бўлими</h2>'+
          '<span class="field-hint">Шу категорияга тушадиган улуш: <b>'+fmtSum(exp.admin.amount)+'</b></span></div>'+
        '<div class="field-hint" style="margin-bottom:10px;">«'+esc(FIN_ADMIN_NAME)+'» категориясининг харажатлари жами <b>'+fmtSum(exp.admin.allTotal)+'</b> — Табел бўйича '+
          'шу категория ходимларининг иш кунлари <b>'+fmtNum(exp.admin.catDays)+'</b> кун, қолган барча категориялар бўйича жами <b>'+fmtNum(exp.admin.allDays)+'</b> кун, '+
          'улуш <b>'+fmtNum(Math.round(exp.admin.pct*100)/100)+'%</b>. («Бошқарув бўлими» ходимларининг иш кунлари бу ҳисобга кирмайди.)</div>'+
        '<div class="table-wrap"><table><thead><tr><th>Таркиби</th><th class="num">Сумма</th></tr></thead><tbody>'+
          '<tr><td>Маҳсулотлар таннархи</td><td class="num">'+fmtSum(exp.admin.parts.products)+'</td></tr>'+
          '<tr><td>Товар таннархи</td><td class="num">'+fmtSum(exp.admin.parts.tovar||0)+'</td></tr>'+
          '<tr><td>Иш ҳақи ва солиқлар</td><td class="num">'+fmtSum(exp.admin.parts.labor)+'</td></tr>'+
          '<tr><td>Касса харажатлари</td><td class="num">'+fmtSum(exp.admin.parts.cash)+'</td></tr>'+
        '</tbody><tfoot><tr><th>ХАРАЖАТЛАР ЖАМИ (барча категорияларга)</th><th class="num">'+fmtSum(exp.admin.allTotal)+'</th></tr>'+
          '<tr><th>Шу категория улуши ('+fmtNum(Math.round(exp.admin.pct*100)/100)+'%)</th><th class="num">'+fmtSum(exp.admin.amount)+'</th></tr></tfoot></table></div>'+
      '</div>') : '')+
      '<div class="card" style="padding:16px 18px;border-left:4px solid var(--accent);">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">'+
          '<div style="font-weight:800;font-size:14px;">ХАРАЖАТЛАР ЖАМИ</div>'+
          '<div class="num" style="font-weight:800;font-size:17px;">'+fmtSum(exp.total)+'</div>'+
        '</div></div>';
    } else {
      var exp2 = hisobotExpense(cat.id, y, mo, inc);
      var profit = inc.totalSum - exp2.total;
      var isProfit = profit >= 0;
      html += '<div class="card" style="padding:18px 20px;margin-bottom:14px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">Фойда ёки зарар — '+esc(hbPeriodLabel(y,mo))+'</h2></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:8px;"><span>Даромад (ҚҚСсиз)</span><span class="num" style="font-weight:700;color:var(--good);">'+fmtSum(inc.totalSum)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px;"><span>Маҳсулотлар таннархи</span><span class="num">'+fmtSum(exp2.productsTotal)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px;"><span>Товар таннархи</span><span class="num">'+fmtSum(exp2.tovarTotal)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px;"><span>Иш ҳақи ва солиқлар (Ходимлар бўлимидан)</span><span class="num">'+fmtSum(exp2.laborTotal)+'</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:'+(exp2.admin?"4px":"8px")+';"><span>'+(exp2.isAdminCat?"Касса харажатлари":"Бошқа харажатлар (Касса)")+'</span><span class="num">'+fmtSum(exp2.otherTotal)+'</span></div>'+
        (exp2.admin ? ('<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:8px;"><span>Бошқарув бўлими улуши ('+fmtNum(Math.round(exp2.admin.pct*100)/100)+'%)</span><span class="num">'+fmtSum(exp2.admin.amount)+'</span></div>') : '')+
        '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:10px;border-top:1px solid var(--border);padding-top:8px;"><span>Харажатлар жами</span><span class="num" style="font-weight:700;color:var(--critical);">'+fmtSum(exp2.total)+'</span></div>'+
        '<div style="border-top:1px solid var(--border-strong);padding-top:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">'+
          '<span style="font-weight:800;font-size:15px;">'+(isProfit?"ФОЙДА":"ЗАРАР")+'</span>'+
          '<span class="num" style="font-weight:800;font-size:20px;color:'+(isProfit?"var(--good)":"var(--critical)")+';">'+fmtSum(Math.abs(profit))+'</span>'+
        '</div>'+
      '</div>';
      if(closed){
        html += '<div class="card" style="padding:16px 18px;border-left:4px solid var(--good);">'+
          '<div style="font-weight:800;color:var(--good);">Ой ёпилган</div>'+
          '<div class="field-hint" style="margin-top:4px;">'+esc(hbPeriodLabel(y,mo))+' ҳисоботи '+esc(fmtDate((closed.closedAt||"").slice(0,10)))+' куни ёпилган. Сақланган қийматлар: даромад '+fmtSum(closed.income)+', харажат '+fmtSum(closed.expense)+', '+(Number(closed.profit)>=0?"фойда":"зарар")+' '+fmtSum(Math.abs(Number(closed.profit)||0))+'.</div>'+
          '<div style="margin-top:10px;"><button class="btn btn-secondary btn-sm" id="hb-reopen">Ёпишни бекор қилиш</button></div>'+
        '</div>';
      } else {
        html += '<div class="card" style="padding:16px 18px;">'+
          '<div class="field-hint" style="margin-bottom:10px;">Ой ёпилганда шу ҳисобот (даромад, харажат, фойда/зарар) сақланади ва рўйхатда «ёпилган» деб белгиланади.</div>'+
          '<button class="btn btn-primary" id="hb-close">'+ICONS.lock+'Ойни ёпиш</button>'+
        '</div>';
      }
    }
    root.innerHTML = html;
    wireHisobotCat(root, cat, inc);
  }

  function wireHisobotCat(root, cat, inc){
    var y = STATE.hisobotYear, mo = STATE.hisobotMonth;
    var backBtn = document.getElementById("hbBack");
    if(backBtn) backBtn.addEventListener("click", function(){ STATE.hisobotCatId = ""; STATE.hisobotRan = false; render(); });
    root.querySelectorAll("[data-hbtab]").forEach(function(b){ b.addEventListener("click", function(){
      STATE.hisobotTab = b.getAttribute("data-hbtab"); render();
    }); });
    var yEl = root.querySelector("#hb-year"), mEl = root.querySelector("#hb-month");
    if(yEl) yEl.addEventListener("change", function(){ STATE.hisobotYear = Number(yEl.value)||y; });
    if(mEl) mEl.addEventListener("change", function(){ STATE.hisobotMonth = Number(mEl.value)||mo; });
    var runBtn = root.querySelector("#hb-run");
    if(runBtn) runBtn.addEventListener("click", function(){
      if(yEl) STATE.hisobotYear = Number(yEl.value)||y;
      if(mEl) STATE.hisobotMonth = Number(mEl.value)||mo;
      STATE.hisobotRan = true;
      render();
    });
    root.querySelectorAll("[data-hb-eye]").forEach(function(b){ b.addEventListener("click", function(){
      var key = b.getAttribute("data-hb-eye");
      var data = inc || hisobotIncome(cat.id, STATE.hisobotYear, STATE.hisobotMonth);
      var r = data.rows.filter(function(x){ return x.key===key; })[0];
      if(r) openHisobotIncomeDetail(cat, r);
    }); });
    root.querySelectorAll("[data-hb-lab]").forEach(function(b){ b.addEventListener("click", function(){
      openHisobotLaborDetail(cat, b.getAttribute("data-hb-lab"));
    }); });
    var closeBtn = root.querySelector("#hb-close");
    if(closeBtn) closeBtn.addEventListener("click", function(){
      var data = inc || hisobotIncome(cat.id, STATE.hisobotYear, STATE.hisobotMonth);
      var exp = hisobotExpense(cat.id, STATE.hisobotYear, STATE.hisobotMonth, data);
      var profit = data.totalSum - exp.total;
      openConfirm("Ойни ёпиш",
        hbPeriodLabel(STATE.hisobotYear, STATE.hisobotMonth)+" ҳисоботи ёпилсинми?<br><br>"+
        "Даромад: <b>"+fmtSum(data.totalSum)+"</b><br>Харажат: <b>"+fmtSum(exp.total)+"</b><br>"+
        (profit>=0?"Фойда":"Зарар")+": <b>"+fmtSum(Math.abs(profit))+"</b>",
        "Ҳа, ёпиш", function(){
          dbAdd("monthlyReports", {
            categoryId: cat.id, categoryName: cat.name,
            year: STATE.hisobotYear, month: STATE.hisobotMonth,
            income: data.totalSum, expense: exp.total,
            productsCost: exp.productsTotal, laborCost: exp.laborTotal,
            otherCost: exp.otherTotal, adminCost: exp.admin ? exp.admin.amount : 0,
            profit: profit,
            items: data.rows.map(function(x){ return {name:x.name, qty:x.qty, sum:x.sum}; }),
            closedAt: new Date().toISOString(), cancelled:false, createdAt: new Date().toISOString()
          }, STATE.monthlyReports);
          toast("Ой ёпилди ва сақланди");
          render();
        });
    });
    var reopenBtn = root.querySelector("#hb-reopen");
    if(reopenBtn) reopenBtn.addEventListener("click", function(){
      var cl = hisobotClosed(cat.id, STATE.hisobotYear, STATE.hisobotMonth);
      if(!cl) return;
      openConfirm("Ёпишни бекор қилиш", "Бу ойнинг ёпилган ҳисоботи бекор қилинсинми? Ёзув тарихда сақланиб қолади.",
        "Ҳа, бекор қилиш", function(){
          dbUpdate("monthlyReports", cl.id, {cancelled:true}, STATE.monthlyReports);
          toast("Ёпиш бекор қилинди");
          render();
        }, true);
    });
  }

  /* Ходимлар бўлимидан олинган иш ҳақи/солиқлар тафсилоти. */
  function openHisobotLaborDetail(cat, kind){
    var y = STATE.hisobotYear, mo = STATE.hisobotMonth;
    var head = '<div class="card" style="padding:12px 14px;margin-bottom:12px;background:var(--surface-2);">'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;">'+
        '<span>Категория: <b>'+esc(cat.name)+'</b></span>'+
        '<span>Давр: <b>'+esc(hbPeriodLabel(y, mo))+'</b></span>'+
      '</div></div>';
    var body, title;
    if(kind==="naryad"){
      var nr = hbNaryadWage(cat.name, y, mo);
      title = "Иш ҳақи жами — Наряд («Қолдиқ» устуни)";
      body = head+'<div class="table-wrap"><table><thead><tr><th>№</th><th>Ф.И.Ш.</th><th>Цех</th><th>Наряд санаси</th><th class="num">Қолдиқ</th></tr></thead><tbody>'+
        (nr.rows.length ? nr.rows.map(function(x,i){
          return '<tr><td>'+(i+1)+'</td><td class="cell-strong">'+esc(x.fullName)+'</td><td class="cell-muted">'+esc(x.workshop||"—")+'</td>'+
            '<td>'+esc(fmtDateShort(x.date))+'</td><td class="num cell-strong">'+fmtSum(x.amount)+'</td></tr>';
        }).join("") : '<tr><td colspan="5" class="cell-muted">Бу ойда шу категория бўйича наряд йўқ</td></tr>')+
        '</tbody><tfoot><tr><th colspan="4">ЖАМИ</th><th class="num">'+fmtSum(nr.total)+'</th></tr></tfoot></table></div>';
    } else {
      var tx = hbPayrollTaxes(cat.name, y, mo);
      var isTax = kind==="tax";
      title = isTax ? "Иш ҳақидан даромад солиғи жами — Иш ҳақи ҳисоблаш" : "Иш ҳақидан ЯИТ жами — Иш ҳақи ҳисоблаш";
      body = head+'<div class="table-wrap"><table><thead><tr><th>№</th><th>Ф.И.Ш.</th>'+
        (isTax ? '<th class="num">Даромад солиғи</th><th class="num">0,1%</th><th class="num">Жами</th>' : '<th class="num">ЯИТ</th>')+
        '</tr></thead><tbody>'+
        (tx.rows.length ? tx.rows.map(function(x,i){
          return '<tr><td>'+(i+1)+'</td><td class="cell-strong">'+esc(x.fullName)+'</td>'+
            (isTax ? ('<td class="num">'+fmtSum(x.tax)+'</td><td class="num">'+fmtSum(x.pension)+'</td><td class="num cell-strong">'+fmtSum(x.tax+x.pension)+'</td>')
                   : ('<td class="num cell-strong">'+fmtSum(x.yiit)+'</td>'))+
          '</tr>';
        }).join("") : '<tr><td colspan="'+(isTax?5:3)+'" class="cell-muted">Бу ойда шу категория бўйича иш ҳақи ҳисоблаши йўқ</td></tr>')+
        '</tbody><tfoot><tr><th colspan="2">ЖАМИ</th>'+
          (isTax ? ('<th class="num">'+fmtSum(tx.taxOnly)+'</th><th class="num">'+fmtSum(tx.pension)+'</th><th class="num">'+fmtSum(tx.incomeTax)+'</th>')
                 : ('<th class="num">'+fmtSum(tx.yiit)+'</th>'))+
        '</tr></tfoot></table></div>';
    }
    var m = openModal(title, body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
  }
  function openHisobotIncomeDetail(cat, r){
    var body = '<div class="card" style="padding:12px 14px;margin-bottom:12px;background:var(--surface-2);">'+
        '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;">'+
          '<span>Категория: <b>'+esc(cat.name)+'</b></span>'+
          '<span>Давр: <b>'+esc(hbPeriodLabel(STATE.hisobotYear, STATE.hisobotMonth))+'</b></span>'+
          '<span>Жами сони: <b>'+fmtNum(r.qty)+' '+esc(r.unit||"")+'</b></span>'+
          '<span>Жами сумма (ҚҚСсиз): <b>'+fmtSum(r.sum)+'</b></span>'+
        '</div>'+
      '</div>';
    var rows = r.rows.map(function(x,i){
      return '<tr><td>'+(i+1)+'</td><td class="cell-strong">'+(x.saleNumber>0?esc(x.saleNumber):"—")+'</td>'+
        '<td>'+esc(fmtDateShort(x.date))+'</td><td>'+esc(x.customer)+'</td>'+
        '<td class="num">'+fmtNum(x.qty)+' '+esc(r.unit||"")+'</td>'+
        '<td class="num cell-strong">'+fmtSum(x.sum)+'</td></tr>';
    }).join("");
    var m = openModal(r.name+" — сотувлар", body+
      '<div class="table-wrap"><table><thead><tr><th>№</th><th>Сотув рақами</th><th>Сана</th><th>Харидор</th><th class="num">Сони</th><th class="num">Сумма (ҚҚСсиз)</th></tr></thead><tbody>'+rows+
      '</tbody><tfoot><tr><th colspan="4">ЖАМИ</th><th class="num">'+fmtNum(r.qty)+'</th><th class="num">'+fmtSum(r.sum)+'</th></tr></tfoot></table></div>',
      '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
  }

  function viewMoliya(){ return renderMoliyaAll(); }

  function finCatCardsHtml(ac){
    var keys = Object.keys(ac.cats).filter(function(k){ return finCatTotal(ac.cats[k])>0.004 || ac.cats[k].moves.raw.length; });
    if(!keys.length) return '<div class="card" style="padding:16px 18px;"><div class="field-hint">Ҳали тақсимланган пул йўқ — харидордан пул тушиб, унга сотув (фактура) ёзилганда бу ерда категориялар бўйича тақсимот пайдо бўлади.</div></div>';
    var order = finCatOrder();
    keys.sort(function(a,b){ return order.indexOf(a)-order.indexOf(b); });
    return keys.map(function(ck){
      var cat = ac.cats[ck];
      var rows = finBucketsFor(ck).map(function(b){
        return '<tr class="fin-row" data-fin-cat="'+esc(ck)+'" data-fin-bucket="'+b.key+'" style="cursor:pointer;">'+
          '<td class="cell-strong">'+esc(b.name)+'</td>'+
          '<td class="num cell-strong">'+fmtSum(cat.buckets[b.key]||0)+'</td>'+
          '<td style="width:34px;color:var(--ink-3);">'+ICONS.arrowRight+'</td></tr>';
      }).join("");
      return '<div class="card" style="padding:16px 18px;margin-bottom:14px;">'+
        '<div class="section-head"><h2 style="font-size:13.5px;">'+esc(finCatName(ck))+'</h2><span class="field-hint">Жами: '+fmtSum(finCatTotal(cat))+'</span></div>'+
        '<div class="table-wrap"><table><thead><tr><th>Харажат тури</th><th class="num">Сумма</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '</div>';
    }).join("");
  }
  function finBalanceNoteHtml(ac, totalSom){
    var alloc = finAllocTotal(ac);
    var diff = totalSom - alloc;
    if(Math.abs(diff) <= 1){
      return '<div class="field-hint" style="margin-top:4px;color:var(--good);font-weight:700;">Баланс тўғри: кассадаги жами сумма ('+fmtSum(totalSom)+') харажат турларига тўлиқ тақсимланган.</div>';
    }
    return '<div class="card" style="padding:12px 14px;margin-top:4px;border-left:4px solid var(--critical);background:rgba(220,70,50,.06);">'+
      '<div style="font-weight:800;color:var(--critical);">Баланс мос келмаяпти!</div>'+
      '<div class="field-hint" style="margin-top:4px;">Кассадаги жами сумма: <b>'+fmtSum(totalSom)+'</b>, тақсимланган: <b>'+fmtSum(alloc)+'</b>. Фарқ: <b>'+fmtSum(diff)+'</b>.'+
      (ac.deficit>0.004 ? ' Чиқимларнинг '+fmtSum(ac.deficit)+' қисмини қоплашга пул етмади.' : '')+
      ' Доллар курси ёки сотув калькуляциялари тўлиқ эмаслигини текширинг.</div></div>';
  }
  function finUnallocCardHtml(ac){
    return '<div class="card" style="padding:16px 18px;margin-bottom:14px;border-left:4px solid var(--accent);">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">'+
        '<div><div style="font-weight:800;font-size:14px;">Тақсимланмаган пул</div>'+
        '<div class="field-hint">Фактура ёпилмаган ёки фактурадан ортиқча тушган пул</div></div>'+
        '<div style="display:flex;align-items:center;gap:12px;">'+
          '<div class="num" style="font-weight:800;font-size:17px;">'+fmtSum(ac.unalloc)+'</div>'+
          '<button class="btn btn-secondary btn-sm" id="finUnallocOpen">Ичига кириш</button>'+
        '</div>'+
      '</div></div>';
  }

  function renderMoliyaAll(){
    var res = finCompute();
    var ac = res.accs[FIN_ALL_ACC] || finBlankAcc();
    var totalSom = finAccTotalSom(FIN_ALL_ACC, res.rateToday);
    setTopbar("Молия бўлими", "Умумий кассадаги пулнинг тақсимоти",
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">'+
      '<button class="btn btn-secondary" id="finCatsBtn">'+ICONS.gear+'Категориялар тартиби</button>'+
      '<button class="btn btn-secondary" id="finRatesBtn">'+ICONS.calc+'Курслар</button>'+
      '<button class="btn btn-primary" id="finTransferBtn">'+ICONS.plus+'Ўтказма</button>'+
      '</div>');
    var root = document.getElementById("content");
    root.innerHTML =
      '<div class="field-hint" style="margin-bottom:10px;">Жорий доллар курси: '+fmtNum(res.rateToday)+' сўм · Кассадаги жами сумма: <b>'+fmtSum(totalSom)+'</b> · Ҳар бир категориянинг «Бошқа харажатлар»идан '+finAdminPct()+'% автоматик «'+esc(FIN_ADMIN_NAME)+' / Администрация»га ўтади'+
        (finAdminMktPct()>0 ? (' · Администрациядан '+finAdminMktPct()+'% «Маркетинг ва реклама»га') : '')+'</div>'+
      finUnallocCardHtml(ac)+
      finCatCardsHtml(ac)+
      finBalanceNoteHtml(ac, totalSom);
    document.getElementById("finRatesBtn").addEventListener("click", openFinRatesModal);
    document.getElementById("finCatsBtn").addEventListener("click", function(){ openFinCategoriesModal(cashAccountById(kassaMainAccountId())); });
    document.getElementById("finTransferBtn").addEventListener("click", function(){ openFinTransferModal(null, ac); });
    document.getElementById("finUnallocOpen").addEventListener("click", function(){ openFinUnallocModal(null, ac); });
    root.querySelectorAll("[data-fin-bucket]").forEach(function(tr){ tr.addEventListener("click", function(){
      openFinBucketModal(null, tr.getAttribute("data-fin-cat"), tr.getAttribute("data-fin-bucket"), ac);
    }); });
  }

  function finMovesTableHtml(moves, showAcc, showTarget){
    if(!moves || !moves.length) return '<div class="field-hint">Ҳали ҳаракат йўқ.</div>';
    var sorted = moves.slice().sort(function(a,b){ return String(b.date||"").localeCompare(String(a.date||"")); });
    var inSum = 0, outSum = 0;
    var rows = sorted.map(function(r){
      inSum += Number(r.in)||0; outSum += Number(r.out)||0;
      return '<tr>'+
        '<td>'+(r.date?esc(fmtDate(r.date)):'<span class="cell-muted">—</span>')+'</td>'+
        (showAcc?'<td>'+esc(r.acc||"—")+'</td>':'')+
        '<td>'+esc(r.who||"—")+'</td>'+
        (showTarget?'<td>'+(r.target?esc(r.target):'<span class="cell-muted">—</span>')+'</td>':'')+
        '<td class="num" style="color:var(--good);">'+(r.in>0?fmtSum(r.in):"—")+'</td>'+
        '<td class="num" style="color:var(--critical);">'+(r.out>0?fmtSum(r.out):"—")+'</td>'+
        '<td>'+(r.note?esc(r.note):'<span class="cell-muted">—</span>')+'</td>'+
      '</tr>';
    }).join("");
    var lead = 2+(showAcc?1:0)+(showTarget?1:0);
    return '<div class="table-wrap"><table><thead><tr><th>Сана</th>'+(showAcc?'<th>Касса</th>':'')+'<th>Кимдан / кимга</th>'+(showTarget?'<th>Қайси харажат турига</th>':'')+'<th class="num">Кирим</th><th class="num">Чиқим</th><th>Изоҳ</th></tr></thead><tbody>'+rows+
      '<tr><td colspan="'+lead+'" class="cell-strong">ЖАМИ</td><td class="num cell-strong">'+fmtSum(inSum)+'</td><td class="num cell-strong">'+fmtSum(outSum)+'</td><td class="cell-strong">Қолдиқ: '+fmtSum(inSum-outSum)+'</td></tr>'+
      '</tbody></table></div>';
  }

  /* ---------- Тақсимланмаган пул ойнаси ---------- */
  function openFinUnallocModal(acc, ac){
    var body = '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">'+
        '<div style="font-weight:800;font-size:15px;">Қолдиқ: '+fmtSum(ac.unalloc)+'</div>'+
        '<button class="btn btn-secondary btn-sm" data-unalloc-transfer>'+ICONS.swap+'Ўтказма</button>'+
      '</div>'+
      finMovesTableHtml(ac.unallocMoves, false, true);
    var m = openModal("Тақсимланмаган пул", body,
      '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    var tb = m.querySelector("[data-unalloc-transfer]");
    if(tb) tb.addEventListener("click", function(){ closeModal(); openFinAllocTransferModal(acc, ac); });
  }

  /* Тақсимланмаган пулдан категория + харажат турига ўтказиш */
  function openFinAllocTransferModal(acc, ac){
    var catOptions = STATE.categories.map(function(c){ return '<option value="'+c.id+'">'+esc(c.name)+'</option>'; }).join("")+
      '<option value="'+FIN_ADMIN_CAT+'">'+esc(FIN_ADMIN_NAME)+'</option>'+
      '<option value="'+FIN_NO_CAT+'">Категориясиз</option>';
    var bucketOptsFor = function(ck){
      return finBucketsFor(ck).map(function(b){ return '<option value="'+b.key+'">'+esc(b.name)+'</option>'; }).join("");
    };
    var bucketOptions = bucketOptsFor(STATE.categories.length ? STATE.categories[0].id : FIN_NO_CAT);
    var body = '<div class="field-row"><div class="field"><label>Сана</label><input id="fa-date" type="date" value="'+todayISO()+'"></div>'+
        '<div class="field"><label>Сумма (сўм)</label><input id="fa-amount" type="number" min="0" step="any" value="0"></div></div>'+
      '<div class="field-row"><div class="field"><label>Категория</label><select id="fa-cat">'+catOptions+'</select></div>'+
        '<div class="field"><label>Харажат тури</label><select id="fa-bucket">'+bucketOptions+'</select></div></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><input id="fa-note"></div>'+
      '<div class="field-hint">Тақсимланмаган пулдаги мавжуд сумма: '+fmtSum(ac.unalloc)+'</div>';
    var m = openModal("Тақсимланмаган пулдан ўтказма", body,
      '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>');
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); openFinUnallocModal(acc, ac); });
    /* «Бошқарув бўлими» танланса — харажат турлари Администрация /
       Маркетинг ва рекламага алмашади. */
    m.querySelector("#fa-cat").addEventListener("change", function(){
      m.querySelector("#fa-bucket").innerHTML = bucketOptsFor(this.value);
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var amount = Number(m.querySelector("#fa-amount").value)||0;
      if(amount<=0){ toast("Суммани киритинг"); return; }
      if(amount > ac.unalloc+0.004){ toast("Тақсимланмаган пул етарли эмас: "+fmtSum(ac.unalloc)); return; }
      dbAdd("financeTransfers", {
        cashAccountId:kassaMainAccountId(), date:m.querySelector("#fa-date").value||todayISO(), direction:"alloc",
        categoryId:m.querySelector("#fa-cat").value, bucket:m.querySelector("#fa-bucket").value,
        amount:amount, note:m.querySelector("#fa-note").value.trim(), cancelled:false, createdAt:new Date().toISOString()
      }, STATE.financeTransfers);
      toast("Ўтказма сақланди");
      closeModal(); render();
    });
  }

  /* ---------- челак ичидаги ҳисобот ---------- */
  function openFinBucketModal(acc, catKey, bucket, ac){
    var cat = ac.cats[catKey] || finBlankCat();
    var showAcc = false;
    var title = finCatName(catKey)+" / "+finBucketName(bucket);
    if(bucket==="wage") return openFinWageModal(acc, catKey, ac);
    if(bucket==="admin_main") return openFinAdminMainModal(acc, catKey, ac);
    if(bucket==="tovar_extra") return openFinTovarExtraModal(acc, catKey, ac);
    if(bucket==="other" || bucket==="profit") return openFinSplitModal(acc, catKey, bucket, ac);
    var body = '<div style="font-weight:800;font-size:15px;margin-bottom:10px;">Қолдиқ: '+fmtSum(cat.buckets[bucket]||0)+'</div>'+
      finMovesTableHtml(cat.moves[bucket], showAcc, false);
    var m = openModal(title, body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
  }

  function openFinWageModal(acc, catKey, ac){
    var cat = ac.cats[catKey] || finBlankCat();
    var showAcc = false;
    var rows = FIN_WAGE_PARTS.map(function(w){
      return '<tr class="fin-row" data-wage-part="'+w[0]+'" style="cursor:pointer;">'+
        '<td class="cell-strong">'+esc(w[1])+'</td>'+
        '<td class="num cell-strong">'+fmtSum(cat.wage[w[0]]||0)+'</td>'+
        '<td style="width:34px;color:var(--ink-3);">'+ICONS.arrowRight+'</td></tr>';
    }).join("");
    var body = '<div style="font-weight:800;font-size:15px;margin-bottom:10px;">Жами иш ҳақи: '+fmtSum(cat.buckets.wage||0)+'</div>'+
      '<div class="table-wrap" style="margin-bottom:12px;"><table><thead><tr><th>Тури</th><th class="num">Сумма</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div class="field-hint">Қаторга босиб, ҳар бири бўйича кимдан, қачон, қанча пул келгани ва кетганини кўриш мумкин.</div>';
    var m = openModal(finCatName(catKey)+" / Иш ҳақи", body,
      '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelectorAll("[data-wage-part]").forEach(function(tr){ tr.addEventListener("click", function(){
      var part = tr.getAttribute("data-wage-part");
      closeModal();
      var body2 = '<div style="font-weight:800;font-size:15px;margin-bottom:10px;">Қолдиқ: '+fmtSum(cat.wage[part]||0)+'</div>'+
        finMovesTableHtml(cat.moves[part], showAcc, false);
      var m2 = openModal(finCatName(catKey)+" / "+finBucketName(part), body2,
        '<button class="btn btn-secondary" data-back>Орқага</button><button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xxwide");
      m2.querySelector("[data-cancel]").addEventListener("click", closeModal);
      m2.querySelector("[data-back]").addEventListener("click", function(){ closeModal(); openFinWageModal(acc, catKey, ac); });
    }); });
  }

  /* «Товар бўйича бошқа харажатлар» — Ҳисобот ва Тақсимот. Тақсимотда
     бошқа харажат турини танлаб, фоиз киритилади — шу фоиз бу турга
     тушган ҳар бир суммадан автомат ўтказилади (2026-10-19 сўрови). */
  function openFinTovarExtraModal(acc, catKey, ac, tab){
    tab = tab || "report";
    var cat = ac.cats[catKey] || finBlankCat();
    var splits = finTovarSplits();
    var moved = (cat.moves.tovar_extra||[]).reduce(function(sm,r){ return sm + (r.tovarSplit ? (Number(r.out)||0) : 0); }, 0);
    var head = '<div class="filter-row" style="margin-bottom:14px;">'+
      '<button class="pill-filter'+(tab==="report"?" active":"")+'" data-tvtab="report">Ҳисобот</button>'+
      '<button class="pill-filter'+(tab==="split"?" active":"")+'" data-tvtab="split">Тақсимот</button></div>';
    var body;
    if(tab==="report"){
      body = head+'<div style="font-weight:800;font-size:15px;margin-bottom:10px;">Қолдиқ: '+fmtSum(cat.buckets.tovar_extra||0)+'</div>'+
        '<div class="field-hint" style="margin-bottom:10px;">Сотилган товар (ёки калькуляциясиз хомашё) нархидан сотиб олинган қиймати айрилгандан кейин қолган қисм шу ерга тушади.</div>'+
        finMovesTableHtml(cat.moves.tovar_extra, false, false);
    } else {
      var pctSum = splits.reduce(function(sm,x){ return sm+(Number(x.pct)||0); }, 0);
      var rows = splits.map(function(x,i){
        return '<tr><td class="num">'+(i+1)+'</td>'+
          '<td class="cell-strong">'+esc(finBucketName(x.toBucket))+'</td>'+
          '<td class="num cell-strong">'+(Number(x.pct)||0)+'%</td>'+
          '<td style="white-space:nowrap;">'+
            '<button class="btn btn-ghost btn-icon" data-tv-edit="'+x.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-tv-del="'+x.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
          '</td></tr>';
      }).join("");
      body = head+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap;">'+
          '<div style="font-weight:800;font-size:15px;">Тақсимланадиган сумма: '+fmtSum(cat.buckets.tovar_extra||0)+' · ўтказилган: '+fmtSum(moved)+'</div>'+
          '<button class="btn btn-secondary btn-sm" data-tv-add>'+ICONS.plus+'Қатор қўшиш</button>'+
        '</div>'+
        (splits.length
          ? '<div class="table-wrap"><table><thead><tr><th>№</th><th>Қайси харажат турига</th><th class="num">Фоиз</th><th></th></tr></thead><tbody>'+rows+
            '<tr><td></td><td class="cell-strong">ЖАМИ</td><td class="num cell-strong">'+pctSum+'%</td><td></td></tr>'+
            '</tbody></table></div>'+
            (pctSum>100 ? '<div class="field-hint" style="color:var(--critical);font-weight:700;margin-top:8px;">Фоизлар йиғиндиси 100% дан ошиб кетди.</div>' : '')
          : '<div class="field-hint">Ҳали тақсимот қатори йўқ. «Қатор қўшиш» орқали харажат турини танлаб, фоизини киритинг.</div>')+
        '<div class="field-hint" style="margin-top:8px;">Киритилган фоиз шу турга тушган ҳар бир суммадан автомат равишда танланган харажат турига ўтказилади.</div>';
    }
    var m = openModal(finCatName(catKey)+" / "+finBucketName("tovar_extra"), body,
      '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelectorAll("[data-tvtab]").forEach(function(b){ b.addEventListener("click", function(){
      closeModal(); openFinTovarExtraModal(acc, catKey, ac, b.getAttribute("data-tvtab"));
    }); });
    var addB = m.querySelector("[data-tv-add]");
    if(addB) addB.addEventListener("click", function(){ closeModal(); openFinTovarSplitForm(null, acc, catKey); });
    m.querySelectorAll("[data-tv-edit]").forEach(function(b){ b.addEventListener("click", function(){
      var x = STATE.financeSplits.find(function(y){ return y.id===b.getAttribute("data-tv-edit"); });
      closeModal(); openFinTovarSplitForm(x, acc, catKey);
    }); });
    m.querySelectorAll("[data-tv-del]").forEach(function(b){ b.addEventListener("click", function(){
      var x = STATE.financeSplits.find(function(y){ return y.id===b.getAttribute("data-tv-del"); });
      if(!x) return;
      openConfirm("Ўчириш", "«"+finBucketName(x.toBucket)+"» қатори ўчирилсинми?", "Ҳа, ўчириш", function(){
        dbUpdate("financeSplits", x.id, {cancelled:true}, STATE.financeSplits);
        toast("Ўчирилди");
        openFinTovarExtraModal(acc, catKey, finFreshAc(), "split");
      }, true);
    }); });
  }
  function openFinTovarSplitForm(existing, acc, catKey){
    var isEdit = !!existing;
    var opts = FIN_BUCKETS.filter(function(b){ return b.key!=="tovar_extra"; })
      .map(function(b){ return '<option value="'+b.key+'"'+((isEdit&&existing.toBucket===b.key)?" selected":"")+'>'+esc(b.name)+'</option>'; }).join("");
    var body = '<div class="field"><label>Қайси харажат турига ўтказилсин</label><select id="tv-bucket">'+opts+'</select></div>'+
      '<div class="field"><label>Фоиз (%)</label><input id="tv-pct" type="number" min="0" max="100" step="any" value="'+esc(isEdit?(Number(existing.pct)||0):0)+'"></div>'+
      '<div class="field-hint">«Товар бўйича бошқа харажатлар»га тушган ҳар бир сумманинг шу фоизи танланган турга ўтказилади.</div>';
    var m = openModal(isEdit?"Тақсимот қаторини таҳрирлаш":"Янги тақсимот қатори", body,
      '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>');
    var back = function(){ openFinTovarExtraModal(acc, catKey, finFreshAc(), "split"); };
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); back(); });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var tb = m.querySelector("#tv-bucket").value;
      var pct = Number(m.querySelector("#tv-pct").value)||0;
      if(!tb){ toast("Харажат турини танланг"); return; }
      if(pct<0 || pct>100){ toast("Фоиз 0 дан 100 гача бўлиши керак"); return; }
      if(isEdit) dbUpdate("financeSplits", existing.id, {toBucket:tb, pct:pct}, STATE.financeSplits);
      else dbSet("financeSplits", uid(), {bucket:"tovar_extra", toBucket:tb, name:finBucketName(tb), pct:pct,
        order:finTovarSplits().length, cancelled:false, createdAt:new Date().toISOString()}, STATE.financeSplits);
      toast("Сақланди");
      closeModal();
      back();
    });
  }

  /* «Бошқарув бўлими → Администрация» — Ҳисобот ва Тақсимот.
     Тақсимот бўлимида «Маркетинг ва рекламага» қатори: фоиз шу ердан
     киритилади, ундан кейин Администрацияга тушган ҳар бир сумманинг
     шунча фоизи автомат «Маркетинг ва реклама» турига ўтади. */
  function openFinAdminMainModal(acc, catKey, ac, tab){
    finEnsureAdminMktSplit();
    tab = tab || "report";
    var cat = ac.cats[catKey] || finBlankCat();
    var pct = finAdminMktPct();
    var moved = (cat.moves.admin_main||[]).reduce(function(sm,r){ return sm + (r.adminMkt ? (Number(r.out)||0) : 0); }, 0);
    var head = '<div class="filter-row" style="margin-bottom:14px;">'+
      '<button class="pill-filter'+(tab==="report"?" active":"")+'" data-admtab="report">Ҳисобот</button>'+
      '<button class="pill-filter'+(tab==="split"?" active":"")+'" data-admtab="split">Тақсимот</button></div>';
    var body;
    if(tab==="report"){
      body = head+'<div style="font-weight:800;font-size:15px;margin-bottom:10px;">Қолдиқ: '+fmtSum(cat.buckets.admin_main||0)+'</div>'+
        '<div class="field-hint" style="margin-bottom:10px;">Бошқа категорияларнинг «Бошқа харажатлар»идан келиб тушган пул шу ерга тушади.</div>'+
        finMovesTableHtml(cat.moves.admin_main, false, false);
    } else {
      body = head+
        '<div style="font-weight:800;font-size:15px;margin-bottom:10px;">Администрациядаги қолдиқ: '+fmtSum(cat.buckets.admin_main||0)+'</div>'+
        '<div class="table-wrap"><table><thead><tr><th>Қайси турга</th><th class="num">Фоиз</th><th class="num">Ўтказилган сумма</th><th></th></tr></thead><tbody>'+
          '<tr><td class="cell-strong">Маркетинг ва реклама</td>'+
            '<td class="num cell-strong">'+pct+'%</td>'+
            '<td class="num cell-strong">'+fmtSum(moved)+'</td>'+
            '<td style="width:44px;"><button class="btn btn-ghost btn-icon" data-adm-mkt-edit title="Фоизни киритиш">'+ICONS.pencil+'</button></td></tr>'+
        '</tbody></table></div>'+
        '<div class="field-hint" style="margin-top:8px;">Администрацияга тушган ҳар бир сумманинг шу фоизи автомат «Маркетинг ва реклама» турига ўтказилади. 0% қўйилса — ўтказма бўлмайди.</div>';
    }
    var m = openModal(finCatName(catKey)+" / Администрация", body,
      '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelectorAll("[data-admtab]").forEach(function(b){ b.addEventListener("click", function(){
      closeModal(); openFinAdminMainModal(acc, catKey, ac, b.getAttribute("data-admtab"));
    }); });
    var eb = m.querySelector("[data-adm-mkt-edit]");
    if(eb) eb.addEventListener("click", function(){
      closeModal();
      openFinPctForm(finAdminMktSplit(), "Маркетинг ва рекламага ўтадиган фоиз",
        "Администрацияга тушган пулнинг шунча фоизи «Маркетинг ва реклама» турига ўтказилади.",
        function(){ openFinAdminMainModal(acc, catKey, finFreshAc(), "split"); });
    });
  }
  /* Фоиз ўзгарганидан кейин тақсимот бутунлай қайта ҳисобланиши керак —
     шунинг учун эски (кэшланган) ac эмас, ЯНГИ ҳисоб ишлатилади. */
  function finFreshAc(){
    var res = finCompute();
    return res.accs[FIN_ALL_ACC] || finBlankAcc();
  }
  /* Фақат фоизни киритиш учун кичик шакл (номи ўзгартирилмайди). */
  function openFinPctForm(split, title, hint, onDone){
    var cur = split ? (Number(split.pct)||0) : 0;
    var body = '<div class="field"><label>Фоиз (%)</label><input id="fp-pct" type="number" min="0" max="100" step="any" value="'+esc(cur)+'"></div>'+
      '<div class="field-hint">'+esc(hint||"")+'</div>';
    var m = openModal(title, body,
      '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>');
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); if(onDone) onDone(); });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var pct = Number(m.querySelector("#fp-pct").value)||0;
      if(pct<0 || pct>100){ toast("Фоиз 0 дан 100 гача бўлиши керак"); return; }
      if(split) dbUpdate("financeSplits", split.id, {pct:pct}, STATE.financeSplits);
      toast("Сақланди");
      closeModal();
      if(onDone) onDone();
    });
  }

  function openFinSplitModal(acc, catKey, bucket, ac, tab){
    if(bucket==="profit") finEnsureProfitSplits();
    if(bucket==="other") finEnsureAdminShareSplit();
    tab = tab || "report";
    var cat = ac.cats[catKey] || finBlankCat();
    var showAcc = false;
    /* "Бошқа харажатлар" ичидаги тақсимот — фойдаланувчи сўровига кўра —
       "Қўшимча харажатлар" суммасини фоизларга бўлади. */
    var base = bucket==="profit" ? (cat.buckets.profit||0) : (cat.buckets.extra||0);
    var baseLabel = bucket==="profit" ? "Фойда" : "Қўшимча харажатлар";
    var head = '<div class="filter-row" style="margin-bottom:14px;">'+
      '<button class="pill-filter'+(tab==="report"?" active":"")+'" data-fintab="report">Ҳисобот</button>'+
      '<button class="pill-filter'+(tab==="split"?" active":"")+'" data-fintab="split">Тақсимот</button></div>';
    var body;
    if(tab==="report"){
      body = head+'<div style="font-weight:800;font-size:15px;margin-bottom:10px;">Қолдиқ: '+fmtSum(cat.buckets[bucket]||0)+'</div>'+
        finMovesTableHtml(cat.moves[bucket], showAcc, false);
    } else {
      var splits = finSplits(bucket);
      var reserveExtra = bucket==="profit" ? (cat.reserve||0) : 0;
      var distBase = Math.max(0, base-reserveExtra);
      var pctSum = splits.reduce(function(s,x){ return s+(Number(x.pct)||0); }, 0);
      var rows = splits.map(function(x, i){
        var amt = distBase*(Number(x.pct)||0)/100;
        var extra = (bucket==="profit" && x.name===FIN_RESERVE_NAME) ? reserveExtra : 0;
        return '<tr>'+
          '<td class="num">'+(i+1)+'</td>'+
          '<td class="cell-strong">'+esc(x.name)+'</td>'+
          '<td class="num">'+(Number(x.pct)||0)+'%</td>'+
          '<td class="num cell-strong">'+fmtSum(amt+extra)+'</td>'+
          '<td>'+(extra?('<span class="field-hint">шундан ўтказмалардан: '+fmtSum(extra)+'</span>'):'')+'</td>'+
          '<td style="white-space:nowrap;">'+
            '<button class="btn btn-ghost btn-icon" data-split-edit="'+x.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>'+
            '<button class="btn btn-ghost btn-icon" data-split-del="'+x.id+'" title="Ўчириш">'+ICONS.trash+'</button>'+
          '</td></tr>';
      }).join("");
      /* Фойдаланувчи сўровига кўра (2026-10-16): «Бошқа харажатлар»дан
         «Бошқарув бўлими»га ўтадиган фоиз АЙНАН шу ерда — Тақсимот
         бўлимидаги «Бошқарув бўлимига» қаторида — киритилади. Бу қатор
         қуйидаги фоизлар жадвалидан АЛОҲИДА: у «Қўшимча харажатлар»ни
         эмас, «Бошқа харажатлар»га тушган пулни ўтказади. */
      var adminBlock = "";
      if(bucket==="other"){
        var aPct = finAdminPct();
        var aMoved = (cat.moves.other||[]).reduce(function(sm,r){ return sm + (r.adminShare ? (Number(r.out)||0) : 0); }, 0);
        adminBlock = '<div class="table-wrap" style="margin-bottom:14px;"><table><thead><tr>'+
            '<th>Қаерга ўтказилади</th><th class="num">Фоиз</th><th class="num">Ўтказилган сумма</th><th></th></tr></thead><tbody>'+
            '<tr><td class="cell-strong">'+esc(FIN_ADMIN_SHARE_NAME)+'</td>'+
              '<td class="num cell-strong">'+aPct+'%</td>'+
              '<td class="num cell-strong">'+fmtSum(aMoved)+'</td>'+
              '<td style="width:44px;"><button class="btn btn-ghost btn-icon" data-admin-share-edit title="Фоизни киритиш">'+ICONS.pencil+'</button></td></tr>'+
          '</tbody></table></div>'+
          '<div class="field-hint" style="margin:-8px 0 14px;">«Бошқа харажатлар»га тушган ҳар бир сумманинг шу фоизи автомат «'+esc(FIN_ADMIN_NAME)+' / Администрация»га ўтказилади. 0% қўйилса — ўтказма бўлмайди.</div>';
      }
      body = head+adminBlock+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap;">'+
          '<div style="font-weight:800;font-size:15px;">Тақсимланадиган сумма ('+esc(baseLabel)+'): '+fmtSum(base)+'</div>'+
          '<button class="btn btn-secondary btn-sm" data-split-add>'+ICONS.plus+'Яратиш</button>'+
        '</div>'+
        (splits.length
          ? '<div class="table-wrap"><table><thead><tr><th>№</th><th>Бўлим</th><th class="num">Фоиз</th><th class="num">Сумма</th><th></th><th></th></tr></thead><tbody>'+rows+
            '<tr><td></td><td class="cell-strong">ЖАМИ</td><td class="num cell-strong">'+pctSum+'%</td><td class="num cell-strong">'+fmtSum(distBase*pctSum/100+reserveExtra)+'</td><td></td><td></td></tr>'+
            '</tbody></table></div>'+
            (pctSum>100 ? '<div class="field-hint" style="color:var(--critical);font-weight:700;margin-top:8px;">Фоизлар йиғиндиси 100% дан ошиб кетди.</div>'
                        : (pctSum<100 ? '<div class="field-hint" style="margin-top:8px;">Тақсимланмай қолган: '+(100-pctSum)+'% — '+fmtSum(distBase*(100-pctSum)/100)+'</div>' : ''))
          : '<div class="field-hint">Ҳали бўлим яратилмаган. «Яратиш» тугмаси орқали бўлим номи ва фоизини киритинг.</div>');
    }
    var title = finCatName(catKey)+" / "+finBucketName(bucket);
    var m = openModal(title, body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "xxwide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelectorAll("[data-fintab]").forEach(function(b){ b.addEventListener("click", function(){
      closeModal(); openFinSplitModal(acc, catKey, bucket, ac, b.getAttribute("data-fintab"));
    }); });
    var asBtn = m.querySelector("[data-admin-share-edit]");
    if(asBtn) asBtn.addEventListener("click", function(){
      closeModal();
      openFinPctForm(finAdminShareSplit(), FIN_ADMIN_SHARE_NAME+" ўтадиган фоиз",
        "«Бошқа харажатлар»га тушган пулнинг шунча фоизи «"+FIN_ADMIN_NAME+" / Администрация»га ўтказилади.",
        function(){ openFinSplitModal(acc, catKey, bucket, finFreshAc(), "split"); });
    });
    var addBtn = m.querySelector("[data-split-add]");
    if(addBtn) addBtn.addEventListener("click", function(){ closeModal(); openFinSplitForm(null, bucket, acc, catKey, ac); });
    m.querySelectorAll("[data-split-edit]").forEach(function(b){ b.addEventListener("click", function(){
      var x = STATE.financeSplits.find(function(y){ return y.id===b.getAttribute("data-split-edit"); });
      closeModal(); openFinSplitForm(x, bucket, acc, catKey, ac);
    }); });
    m.querySelectorAll("[data-split-del]").forEach(function(b){ b.addEventListener("click", function(){
      var x = STATE.financeSplits.find(function(y){ return y.id===b.getAttribute("data-split-del"); });
      if(!x) return;
      openConfirm("Ўчириш", "«"+x.name+"» бўлими ўчирилсинми?", "Ҳа, ўчириш", function(){
        dbUpdate("financeSplits", x.id, {cancelled:true}, STATE.financeSplits);
        toast("Ўчирилди");
        openFinSplitModal(acc, catKey, bucket, ac, "split");
      }, true);
    }); });
  }

  function openFinSplitForm(existing, bucket, acc, catKey, ac){
    var isEdit = !!existing;
    var body = '<div class="field"><label>Бўлим номи</label><input id="fs-name" value="'+esc(isEdit?existing.name:"")+'" placeholder="Масалан: Дивидент"></div>'+
      '<div class="field"><label>Фоиз (%)</label><input id="fs-pct" type="number" min="0" step="any" value="'+esc(isEdit?(Number(existing.pct)||0):0)+'"></div>';
    var m = openModal(isEdit?"Бўлимни таҳрирлаш":"Янги бўлим", body,
      '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>');
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); openFinSplitModal(acc, catKey, bucket, ac, "split"); });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var name = m.querySelector("#fs-name").value.trim();
      var pct = Number(m.querySelector("#fs-pct").value)||0;
      if(!name){ toast("Бўлим номини киритинг"); return; }
      if(isEdit) dbUpdate("financeSplits", existing.id, {name:name, pct:pct}, STATE.financeSplits);
      else dbSet("financeSplits", uid(), {bucket:bucket, name:name, pct:pct, order:finSplits(bucket).length, cancelled:false, createdAt:new Date().toISOString()}, STATE.financeSplits);
      toast("Сақланди");
      closeModal();
      openFinSplitModal(acc, catKey, bucket, ac, "split");
    });
  }

  /* ---------- Ўтказма: харажат туридан Фойда/Захирага ва аксинча ---------- */
  function openFinTransferModal(acc, ac){
    var dir = "to_reserve";
    /* «Бошқарув бўлими»да «Фойда» тури йўқ — шунга кўра бу ўтказмада
       қатнашмайди (2026-10-16). */
    var catKeys = Object.keys(ac.cats).filter(function(k){ return k!==FIN_ADMIN_CAT; });
    if(!catKeys.length) catKeys = [FIN_NO_CAT];
    var catOptions = catKeys.map(function(k){ return '<option value="'+esc(k)+'">'+esc(finCatName(k))+'</option>'; }).join("");
    var bucketOptions = FIN_BUCKETS.filter(function(b){ return b.key!=="profit"; })
      .map(function(b){ return '<option value="'+b.key+'">'+esc(b.name)+'</option>'; }).join("");
    var body = '<div class="field-row"><div class="field"><label>Сана</label><input id="ft-date" type="date" value="'+todayISO()+'"></div>'+
      '<div class="field"><label>Йўналиш</label><select id="ft-dir">'+
        '<option value="to_reserve">Харажат туридан → Фойда / Захирага</option>'+
        '<option value="from_reserve">Фойда / Захирадан → харажат турига</option>'+
      '</select></div></div>'+
      '<div class="field-row"><div class="field"><label>Категория</label><select id="ft-cat">'+catOptions+'</select></div>'+
      '<div class="field"><label>Харажат тури</label><select id="ft-bucket">'+bucketOptions+'</select></div></div>'+
      '<div class="field-hint" id="ft-hint">Харажат тури танланганда пул фақат «Фойда» бўлимидаги «Захира»га ўтказилади.</div>'+
      '<div class="field"><label>Сумма (сўм)</label><input id="ft-amount" type="number" min="0" step="any" value="0"></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><input id="ft-note"></div>';
    var m = openModal("Ўтказма", body,
      '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>');
    var dirEl = m.querySelector("#ft-dir"), hintEl = m.querySelector("#ft-hint");
    dirEl.addEventListener("change", function(){
      dir = dirEl.value;
      hintEl.textContent = dir==="to_reserve"
        ? "Харажат тури танланганда пул фақат «Фойда» бўлимидаги «Захира»га ўтказилади."
        : "«Захира» танланганда пулни исталган харажат турига ўтказиш мумкин.";
    });
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var amount = Number(m.querySelector("#ft-amount").value)||0;
      var bucket = m.querySelector("#ft-bucket").value;
      var catKey = m.querySelector("#ft-cat").value;
      var cat = ac.cats[catKey] || finBlankCat();
      if(amount<=0){ toast("Суммани киритинг"); return; }
      var have = dir==="to_reserve" ? (cat.buckets[bucket]||0) : (cat.buckets.profit||0);
      if(amount > have+0.004){ toast("Етарли маблағ йўқ: "+fmtSum(have)); return; }
      dbAdd("financeTransfers", {
        cashAccountId:kassaMainAccountId(), date:m.querySelector("#ft-date").value||todayISO(), direction:dir,
        categoryId:catKey, bucket:bucket, amount:amount, note:m.querySelector("#ft-note").value.trim(),
        cancelled:false, createdAt:new Date().toISOString()
      }, STATE.financeTransfers);
      toast("Ўтказма сақланди");
      closeModal(); render();
    });
  }

  /* ---------- доллар курслари ---------- */
  function openFinRatesModal(){
    var list = finRateList().slice().reverse();
    var rows = list.length ? list.map(function(x){
      return '<tr><td>'+esc(fmtDate(x.date))+'</td><td class="num cell-strong">'+fmtNum(x.rate)+' сўм</td>'+
        '<td style="white-space:nowrap;"><button class="btn btn-ghost btn-icon" data-rate-edit="'+x.id+'">'+ICONS.pencil+'</button>'+
        '<button class="btn btn-ghost btn-icon" data-rate-del="'+x.id+'">'+ICONS.trash+'</button></td></tr>';
    }).join("") : '';
    var body = '<div style="display:flex;justify-content:flex-end;margin-bottom:10px;"><button class="btn btn-secondary btn-sm" data-rate-add>'+ICONS.plus+'Курс қўшиш</button></div>'+
      (rows ? '<div class="table-wrap"><table><thead><tr><th>Сана</th><th class="num">1 доллар курси</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'
            : '<div class="field-hint">Ҳали курс киритилмаган. Киритилмаса, охирги ишлатилган курс (ёки 12 700 сўм) олинади.</div>')+
      '<div class="field-hint" style="margin-top:10px;">Доллардаги тушум шу жадвалдаги — тўлов санасига мос (ўша санадаги ёки ундан олдинги энг сўнгги) курс бўйича сўмга ўгирилади.</div>';
    var m = openModal("Доллар курслари", body, '<button class="btn btn-secondary" data-cancel>Ёпиш</button>', "wide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-rate-add]").addEventListener("click", function(){ closeModal(); openFinRateForm(null); });
    m.querySelectorAll("[data-rate-edit]").forEach(function(b){ b.addEventListener("click", function(){
      closeModal(); openFinRateForm(STATE.fxRates.find(function(x){ return x.id===b.getAttribute("data-rate-edit"); }));
    }); });
    m.querySelectorAll("[data-rate-del]").forEach(function(b){ b.addEventListener("click", function(){
      var x = STATE.fxRates.find(function(y){ return y.id===b.getAttribute("data-rate-del"); });
      if(!x) return;
      openConfirm("Ўчириш", fmtDate(x.date)+" кунги курс ўчирилсинми?", "Ҳа, ўчириш", function(){
        dbDelete("fxRates", x.id, STATE.fxRates); toast("Ўчирилди"); openFinRatesModal();
      }, true);
    }); });
  }
  function openFinRateForm(existing){
    var isEdit = !!existing;
    var body = '<div class="field"><label>Сана</label><input id="fr-date" type="date" value="'+esc(isEdit?existing.date:todayISO())+'"></div>'+
      '<div class="field"><label>1 доллар курси (сўм)</label><input id="fr-rate" type="number" min="0" step="any" value="'+esc(isEdit?(Number(existing.rate)||0):(STATE.lastUsdRate||12700))+'"></div>';
    var m = openModal(isEdit?"Курсни таҳрирлаш":"Янги курс", body,
      '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>');
    m.querySelector("[data-cancel]").addEventListener("click", function(){ closeModal(); openFinRatesModal(); });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var date = m.querySelector("#fr-date").value||todayISO();
      var rate = Number(m.querySelector("#fr-rate").value)||0;
      if(rate<=0){ toast("Курсни киритинг"); return; }
      if(isEdit) dbUpdate("fxRates", existing.id, {date:date, rate:rate}, STATE.fxRates);
      else {
        var same = STATE.fxRates.find(function(x){ return x.date===date; });
        if(same) dbUpdate("fxRates", same.id, {rate:rate}, STATE.fxRates);
        else dbSet("fxRates", uid(), {date:date, rate:rate, createdAt:new Date().toISOString()}, STATE.fxRates);
      }
      toast("Сақланди"); closeModal(); openFinRatesModal();
    });
  }

  /* ---------- касса ↔ категория созламаси ---------- */
  function openFinCategoriesModal(acc){
    if(!acc){ toast("Аввал кассада биринчи амални бажаринг"); return; }
    var cur = finAccCategoryIds(acc);
    if(!STATE.categories.length){
      var m0 = openModal("Категориялар", '<div class="field-hint">Ҳали категория яратилмаган. «Омборлар → Бошқарув» бўлимида категория яратинг.</div>',
        '<button class="btn btn-secondary" data-cancel>Ёпиш</button>');
      m0.querySelector("[data-cancel]").addEventListener("click", closeModal);
      return;
    }
    var boxes = STATE.categories.map(function(c){
      var taken = STATE.cashAccounts.find(function(a){ return a.id!==acc.id && finAccCategoryIds(a).indexOf(c.id)>-1; });
      return '<label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;">'+
        '<input type="checkbox" class="fin-cat" value="'+c.id+'"'+(cur.indexOf(c.id)>-1?" checked":"")+' style="width:16px;height:16px;">'+
        '<span>'+esc(c.name)+'</span>'+
        (taken?'<span class="chip chip-neutral">'+esc(taken.name)+' да бор</span>':'')+
      '</label>';
    }).join("");
    var m = openModal("Маҳсулот категориялари — тақсимот навбати", boxes+
      '<div class="field-hint" style="margin-top:10px;">Шу категориядаги маҳсулотлар сотилганда, пул тақсимоти навбатида шу касса биринчи ҳисобга олинади.</div>',
      '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>', "wide");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("[data-save]").addEventListener("click", function(){
      var ids = [];
      m.querySelectorAll(".fin-cat").forEach(function(c){ if(c.checked) ids.push(c.value); });
      dbUpdate("cashAccounts", acc.id, {categoryIds:ids}, STATE.cashAccounts);
      toast("Сақланди"); closeModal(); render();
    });
  }

  function viewReconciliation(){
    setTopbar("Солиштирма далолатнома", "Харидор ёки етказиб берувчи билан ҳисоб-китобни солиштириш", "");
    /* Фойдаланувчи сўровига кўра (2026-10-01): сана майдонлари очилганда
       автомат бугунги сана турсин — ручной ёки календарча орқали
       ўзгартириш мумкин. */
    if(!STATE.kassaActFrom) STATE.kassaActFrom = todayISO();
    if(!STATE.kassaActTo) STATE.kassaActTo = todayISO();
    var parts = (STATE.kassaActWho||"").split(":");
    var selType = parts[0], selId = parts[1];
    var selName = selType==="customer" ? customerName(selId) : (selType==="supplier" ? supplierName(selId) : "");
    var html = '<div class="card" style="padding:18px 20px;margin-bottom:16px;">'+
      '<div class="field-row"><div class="field"><label>Харидор ёки етказиб берувчи</label>'+
        '<div style="display:flex;gap:8px;">'+
        '<button type="button" class="btn btn-secondary" id="act-who-pick-btn" style="flex:1;min-width:0;justify-content:flex-start;gap:8px;">'+ICONS.search+(selName?(esc(selName)+' <span class="chip chip-neutral" style="margin-left:6px;">'+(selType==="customer"?"Харидор":"Етказиб берувчи")+'</span>'):'— Танланг —')+'</button>'+
        (selName?('<button type="button" class="btn btn-ghost btn-icon" id="act-who-clear-btn" title="Танловни бекор қилиш, бошқасини танлаш">'+ICONS.x+'</button>'):'')+
        '</div>'+
      '</div></div>'+
      '<div class="field-row"><div class="field"><label>Санадан</label><input id="act-from" type="date" value="'+esc(STATE.kassaActFrom||"")+'"></div>'+
      '<div class="field"><label>Санагача</label><input id="act-to" type="date" value="'+esc(STATE.kassaActTo||"")+'"></div></div>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">'+
        '<button class="btn btn-primary" id="act-search">'+ICONS.search+'Излаш</button>'+
        '<button class="btn btn-secondary" id="act-print" disabled>'+ICONS.printer+'Қоғозга чоп этиш</button>'+
      '</div>'+
      '</div><div id="act-results"></div>';
    var container = document.getElementById("content");
    container.innerHTML = html;

    /* Харидор/таъминотчини танлаш — ҳар доим ЯНГИ (бўш қидирув билан)
       ойна очилади, шунда олдинги танловдан қолган матн тўсқинлик
       қилмайди; танлангандан кейин эски натижалар дарҳол яширилиб,
       фақат «Излаш» босилгандагина янги контрагент бўйича кўрсатилади
       (2026-10-01 сўрови). */
    container.querySelector("#act-who-pick-btn").addEventListener("click", function(){
      STATE.kassaActFrom = container.querySelector("#act-from").value;
      STATE.kassaActTo = container.querySelector("#act-to").value;
      openActWhoPickerModal(function(type, id){
        STATE.kassaActWho = type+":"+id;
        STATE.kassaActSearched = false;
        render();
      });
    });
    var clearBtn = container.querySelector("#act-who-clear-btn");
    if(clearBtn) clearBtn.addEventListener("click", function(){
      STATE.kassaActWho = "";
      STATE.kassaActSearched = false;
      render();
    });

    function renderActResults(){
      var resultsEl = container.querySelector("#act-results");
      var printBtn = container.querySelector("#act-print");
      if(!STATE.kassaActWho){
        resultsEl.innerHTML = emptyState("Танланмаган","Юқоридаги тугма орқали харидор ёки етказиб берувчини танланг.");
        if(printBtn) printBtn.setAttribute("disabled","disabled");
        return;
      }
      if(!STATE.kassaActSearched){
        resultsEl.innerHTML = emptyState("Излаш керак","Сана оралиғини текшириб, юқорида «Излаш» тугмасини босинг.");
        if(printBtn) printBtn.setAttribute("disabled","disabled");
        return;
      }
      var parts2 = STATE.kassaActWho.split(":");
      var type = parts2[0], who = parts2[1];
      var from = STATE.kassaActFrom, to = STATE.kassaActTo;
      var name = type==="customer" ? customerName(who) : supplierName(who);

      var allEntries = buildActLedgerEntries(type, who);
      var opening = allEntries.filter(function(e){ return from && e.date<from; }).reduce(function(s,e){ return s+e.kirim-e.chiqim; }, 0);
      var periodEntries = allEntries.filter(function(e){
        if(from && e.date<from) return false;
        if(to && e.date>to) return false;
        return true;
      });
      var periodKirim = periodEntries.reduce(function(s,e){return s+e.kirim;},0);
      var periodChiqim = periodEntries.reduce(function(s,e){return s+e.chiqim;},0);
      var closing = opening + periodKirim - periodChiqim;

      var html2 = '<div class="kpi-grid" style="margin-bottom:16px;">'+
        kpiTileFmt("Давр бошига қолдиқ", fmtSignedSum(opening), "", "critical")+
        kpiTileFmt("Давр охирига қолдиқ", fmtSignedSum(closing), "", "critical")+
        '</div>';

      if(!periodEntries.length){
        html2 += emptyState("Бу даврда ёзув йўқ","Танланган давр ичида ҳаракат топилмади.");
      } else {
        var rows = periodEntries.map(function(e, idx){
          return '<tr><td class="cell-muted">'+fmtDateShort(e.date)+'</td>'+
            '<td>'+esc(e.desc)+'</td>'+
            '<td class="num" style="color:var(--good);">'+(e.kirim?('+'+fmtNum(e.kirim)):"")+'</td>'+
            '<td class="num" style="color:var(--critical);">'+(e.chiqim?('−'+fmtNum(e.chiqim)):"")+'</td>'+
            '<td><button class="btn btn-ghost btn-icon" data-act-view="'+idx+'" title="Кўриш">'+ICONS.eye+'</button></td></tr>';
        }).join("");
        var totalsRow = '<tr style="font-weight:800;background:var(--surface-2);"><td></td><td>Жами</td>'+
          '<td class="num" style="color:var(--good);">+'+fmtNum(periodKirim)+'</td>'+
          '<td class="num" style="color:var(--critical);">−'+fmtNum(periodChiqim)+'</td><td></td></tr>';
        html2 += '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Изоҳ</th><th>Кирим</th><th>Чиким</th><th></th></tr></thead><tbody>'+rows+totalsRow+'</tbody></table></div>';
      }

      resultsEl.innerHTML = html2;
      resultsEl.querySelectorAll("[data-act-view]").forEach(function(b){
        b.addEventListener("click", function(){ openActEntryDetail(periodEntries[Number(b.getAttribute("data-act-view"))]); });
      });
      if(printBtn){
        printBtn.removeAttribute("disabled");
        printBtn.onclick = function(){ printActStatement(type, name, from, to, periodEntries, opening, closing, periodKirim, periodChiqim); };
      }
    }
    container.querySelector("#act-search").addEventListener("click", function(){
      STATE.kassaActFrom = container.querySelector("#act-from").value;
      STATE.kassaActTo = container.querySelector("#act-to").value;
      if(!STATE.kassaActWho){ toast("Аввал харидор ёки етказиб берувчини танланг"); return; }
      STATE.kassaActSearched = true;
      renderActResults();
    });
    renderActResults();
  }

  /* ---- 5) Кўчирма ---- */
  function openKassaTransferForm(accountId, existing){
    var isEdit = !!(existing && existing.id);
    var t = existing || {date:todayISO(), method:"naqd", amount:0, usdAmount:0, usdRate:STATE.lastUsdRate||0, toCashAccountId:"", note:""};
    var otherAccounts = STATE.cashAccounts.filter(function(a){ return a.id!==accountId; });
    var body = '<div class="field"><label>Сана</label><input id="kt2-date" type="date" value="'+esc(t.date||todayISO())+'"></div>'+
      '<div class="field"><label>Тўлов усули</label>'+methodTogglesHtml("kt2",[t.method])+'</div>'+
      '<div id="kt2-rows">'+methodAmountRowHtml("kt2", t.method, {amount:t.amount, usdAmount:t.usdAmount, usdRate:t.usdRate})+'</div>'+
      '<div class="field"><label>Қайси кассага кўчирилсин</label><select id="kt2-target">'+(otherAccounts.length?otherAccounts.map(function(a){return '<option value="'+a.id+'"'+(t.toCashAccountId===a.id?" selected":"")+'>'+esc(a.name)+'</option>';}).join(""):'<option value="">Бошқа касса йўқ</option>')+'</select></div>'+
      '<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:700;"><input type="checkbox" id="kt2-bizflag" style="width:17px;height:17px;"'+(t.bizCount?" checked":"")+'> Корхона даромад/харажат ҳисобида ҳисобга олинсин</label></div>'+
      '<div class="field"><label>Изоҳ <span class="opt">(ихтиёрий)</span></label><textarea id="kt2-note">'+esc(t.note||"")+'</textarea></div>';
    var foot = '<button class="btn btn-secondary" data-cancel>Бекор қилиш</button><button class="btn btn-primary" data-save>Сақлаш</button>';
    var m = openModal(isEdit?"Кўчирмани таҳрирлаш":"Янги кўчирма", body, foot, true);
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    if(!otherAccounts.length) toast("Кўчириш учун камида яна битта касса яратинг");
    var method = t.method;
    if(isUsdMethod(method)) wireDollarAutoCalc("kt2", method);
    m.querySelectorAll('[data-methodgroup="kt2"] .method-toggle').forEach(function(btn){
      btn.addEventListener("click", function(){
        method = btn.getAttribute("data-method");
        m.querySelectorAll('[data-methodgroup="kt2"] .method-toggle').forEach(function(b2){ b2.classList.toggle("active", b2===btn); });
        m.querySelector("#kt2-rows").innerHTML = methodAmountRowHtml("kt2", method, {});
        if(isUsdMethod(method)) wireDollarAutoCalc("kt2", method);
      });
    });
    m.querySelector("[data-save]").addEventListener("click", function(){
      var targetId = m.querySelector("#kt2-target").value;
      if(!targetId){ toast("Қайси кассага кўчиришни танланг"); return; }
      var amount=0, usdAmount=0, usdRate=0;
      if(isUsdMethod(method)){
        usdAmount = Number(m.querySelector("#kt2-usd-"+method).value)||0;
        usdRate = Number(m.querySelector("#kt2-rate-"+method).value)||0;
        amount = Number(m.querySelector("#kt2-amt-"+method).value)||0;
        if(usdRate>0) STATE.lastUsdRate = usdRate;
      } else {
        amount = Number(m.querySelector("#kt2-amt-"+method).value)||0;
      }
      var qty = isUsdMethod(method) ? usdAmount : amount;
      if(qty<=0){ toast("Суммани киритинг"); return; }
      var data = {
        fromCashAccountId: accountId, toCashAccountId: targetId, method: method,
        amount: amount, usdAmount: usdAmount, usdRate: usdRate,
        bizCount: m.querySelector("#kt2-bizflag").checked,
        date: m.querySelector("#kt2-date").value||todayISO(), note: m.querySelector("#kt2-note").value.trim(), cancelled:false
      };
      if(isEdit){ dbUpdate("cashTransfers", t.id, data, STATE.cashTransfers); toast("Сақланди"); }
      else { data.createdAt=new Date().toISOString(); dbAdd("cashTransfers", data, STATE.cashTransfers); toast("Кўчирма сақланди"); }
      closeModal();
    });
  }

  function renderKassaTransferTab(accountId){
    var allList = STATE.cashTransfers.filter(function(t){ return t.fromCashAccountId===accountId || t.toCashAccountId===accountId; });
    var filterState = STATE.kassaTransferFilter;
    function matches(t, q){
      var otherId = t.fromCashAccountId===accountId ? t.toCashAccountId : t.fromCashAccountId;
      if((t.note||"").toLowerCase().indexOf(q)>-1) return true;
      if(String(t.amount||"").indexOf(q)>-1 || fmtNum(t.amount).toLowerCase().indexOf(q)>-1) return true;
      if((cashAccountName(otherId)||"").toLowerCase().indexOf(q)>-1) return true;
      if(paymentMethodLabel(t.method).toLowerCase().indexOf(q)>-1) return true;
      return false;
    }
    var baseList = filterState.onlyActive!==false ? allList.filter(function(t){ return !t.cancelled; }) : allList;
    var info = computeFilteredDayList(baseList, filterState, matches);
    var list = info.rows;
    var html = '<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:14px;flex-wrap:wrap;">'+
      listToolbarHtml("kt2", filterState)+
      '<button class="btn btn-primary" id="kt2-create-btn">'+ICONS.plus+'Яратиш</button></div>';
    if(!allList.length){
      html += emptyState("Ҳали кўчирма йўқ","«Яратиш» тугмаси орқали биринчи кўчирмани киритинг.");
    } else if(!list.length){
      html += emptyState("Ҳеч нарса топилмади", "Бошқа сана/матн билан қидириб кўринг ёки филтрни олиб ташланг.");
    } else {
      var rows = list.map(function(t){
        var out = t.fromCashAccountId===accountId;
        var otherId = out ? t.toCashAccountId : t.fromCashAccountId;
        var qtyTxt = isUsdMethod(t.method) ? fmtUsd(t.usdAmount) : fmtSum(t.amount);
        return '<tr'+(t.cancelled?' style="opacity:.5;"':'')+'>'+
          '<td class="cell-muted">'+fmtDateShort(t.date)+'</td>'+
          '<td>'+esc(paymentMethodLabel(t.method))+'</td>'+
          '<td class="cell-muted">'+(out?"→ ":"← ")+esc(cashAccountName(otherId))+'</td>'+
          '<td class="num cell-strong" style="color:'+(out?"var(--critical)":"var(--good)")+';">'+(out?"−":"+")+qtyTxt+'</td>'+
          '<td class="cell-muted">'+esc(t.note||"—")+'</td>'+
          '<td>'+(t.cancelled?'<span class="chip chip-neutral">Бекор қилинган</span>':'<span class="chip chip-good">Бажарилди</span>')+'</td>'+
          '<td><div class="row-actions">'+
            (t.cancelled||!out?'':'<button class="btn btn-ghost btn-icon" data-kt2-edit="'+t.id+'" title="Таҳрирлаш">'+ICONS.pencil+'</button>')+
            (t.cancelled?'':'<button class="btn btn-ghost btn-icon" data-kt2-cancel="'+t.id+'" title="Бекор қилиш">'+ICONS.ban+'</button>')+
            (t.cancelled?'<button class="btn btn-ghost btn-icon" data-kt2-restore="'+t.id+'" title="Тиклаш">'+ICONS.restore+'</button>':'')+
          '</div></td></tr>';
      }).join("");
      html += '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Усул</th><th>Йўналиш</th><th>Сумма</th><th>Изоҳ</th><th>Ҳолат</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      html += daySwitcherHtml(info);
    }
    var container = document.getElementById("kassaTabContent");
    container.innerHTML = html;
    wireListToolbarAndDayPager(container, "kt2", filterState, info, function(){ renderKassaTransferTab(accountId); });
    container.querySelector("#kt2-create-btn").addEventListener("click", function(){ openKassaTransferForm(accountId, null); });
    container.querySelectorAll("[data-kt2-edit]").forEach(function(b){ b.addEventListener("click", function(){ openKassaTransferForm(accountId, list.find(function(x){return x.id===b.getAttribute("data-kt2-edit");})); }); });
    container.querySelectorAll("[data-kt2-cancel]").forEach(function(b){ b.addEventListener("click", function(){
      var t = list.find(function(x){return x.id===b.getAttribute("data-kt2-cancel");});
      openConfirm("Кўчирмани бекор қилиш","Бу кўчирма бекор қилинсинми? Ёзув тарихда қолади.","Ҳа, бекор қилиш", function(){ dbUpdate("cashTransfers", t.id, {cancelled:true}, STATE.cashTransfers); toast("Бекор қилинди"); }, true);
    }); });
    container.querySelectorAll("[data-kt2-restore]").forEach(function(b){ b.addEventListener("click", function(){
      var t = list.find(function(x){return x.id===b.getAttribute("data-kt2-restore");});
      openConfirm("Кўчирмани тиклаш","Бу кўчирма қайта тикланиб, касса қолдиғига таъсир қила бошласинми?","Ҳа, тиклаш", function(){ dbUpdate("cashTransfers", t.id, {cancelled:false}, STATE.cashTransfers); toast("Тикланди"); }, true);
    }); });
  }

  /* ---- 6) Қолдиқ ---- */
  function renderKassaBalanceTab(accountId){
    var bal = cashAccountBalances(accountId);
    var html = '<div class="kpi-grid" style="margin-bottom:20px;">'+
      kpiTileFmt("Нақд", fmtSum(bal.naqd), "", "good")+
      kpiTileFmt("Карта", fmtSum(bal.karta), "", "accent")+
      kpiTileFmt("Пул ўтказмаси", fmtSum(bal.otkazma), "", "accent")+
      kpiTileFmt("Доллар", fmtUsd(bal.dollar), "", "warning")+
      '</div>';
    html += '<div class="card" style="padding:18px 20px;margin-bottom:16px;"><div class="field-row">'+
      '<div class="field"><label>Санадан</label><input id="kd-from" type="date" value="'+esc(STATE.kassaKoldiqFrom||"")+'"></div>'+
      '<div class="field"><label>Санагача</label><input id="kd-to" type="date" value="'+esc(STATE.kassaKoldiqTo||"")+'"></div>'+
      '<div class="field" style="display:flex;align-items:flex-end;"><button class="btn btn-primary" id="kd-search">'+ICONS.search+'Излаш</button></div>'+
      '</div></div><div id="kd-results"></div>';
    var container = document.getElementById("kassaTabContent");
    container.innerHTML = html;
    function dayTotals(dateStr){
      var kirimSum=0, chiqimSum=0, kirimUsd=0, chiqimUsd=0;
      STATE.cashTransactions.forEach(function(t){
        if(t.cashAccountId!==accountId || t.cancelled || t.date!==dateStr) return;
        PAYMENT_METHODS.forEach(function(pm){
          if(pm[0]==="dollar") return;
          var v = txMethodValue(t, pm[0]);
          if(t.direction==="kirim") kirimSum+=v; else chiqimSum+=v;
        });
        var vUsd = txMethodValue(t,"dollar");
        if(t.direction==="kirim") kirimUsd+=vUsd; else chiqimUsd+=vUsd;
      });
      STATE.cashConversions.forEach(function(c){
        if(c.cashAccountId!==accountId || c.cancelled || c.date!==dateStr) return;
        if(c.fromMethod!=="dollar") chiqimSum += Number(c.fromAmount)||0; else chiqimUsd += Number(c.fromUsdAmount)||0;
        if(c.toMethod!=="dollar") kirimSum += Number(c.toAmount)||0; else kirimUsd += Number(c.toUsdAmount)||0;
      });
      STATE.cashTransfers.forEach(function(tr){
        if(tr.cancelled || tr.date!==dateStr) return;
        var isUsd = isUsdMethod(tr.method);
        var v = isUsd ? (Number(tr.usdAmount)||0) : (Number(tr.amount)||0);
        if(tr.fromCashAccountId===accountId){ if(isUsd) chiqimUsd+=v; else chiqimSum+=v; }
        if(tr.toCashAccountId===accountId){ if(isUsd) kirimUsd+=v; else kirimSum+=v; }
      });
      return {kirimSum:kirimSum, chiqimSum:chiqimSum, kirimUsd:kirimUsd, chiqimUsd:chiqimUsd};
    }
    function renderKdResults(){
      var resultsEl = container.querySelector("#kd-results");
      var from = STATE.kassaKoldiqFrom, to = STATE.kassaKoldiqTo;
      if(!from || !to){ resultsEl.innerHTML = emptyState("Сана оралиғини танланг","Кунлар кесимида кўриш учун икки санани ҳам киритинг."); return; }
      var d = new Date(from+"T00:00:00"), end = new Date(to+"T00:00:00");
      if(isNaN(d)||isNaN(end)||d>end){ resultsEl.innerHTML = emptyState("Нотўғри сана оралиғи","«Санадан» «Санагача»дан кичик ёки тенг бўлиши керак."); return; }
      var days = [];
      while(d<=end){ days.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
      var runningSom = bal.naqd+bal.karta+bal.otkazma, runningUsd = bal.dollar;
      var rowsData = [];
      for(var i=days.length-1;i>=0;i--){
        var dt = dayTotals(days[i]);
        var endSom = runningSom, endUsd = runningUsd;
        rowsData.unshift({date:days[i], kirim:dt.kirimSum, chiqim:dt.chiqimSum, kirimUsd:dt.kirimUsd, chiqimUsd:dt.chiqimUsd, qoldiq:endSom, qoldiqUsd:endUsd});
        runningSom = endSom - dt.kirimSum + dt.chiqimSum;
        runningUsd = endUsd - dt.kirimUsd + dt.chiqimUsd;
      }
      var rows = rowsData.map(function(r){
        return '<tr><td class="cell-muted">'+fmtDateShort(r.date)+'</td><td class="num" style="color:var(--good);">+'+fmtSum(r.kirim)+'</td><td class="num" style="color:var(--critical);">−'+fmtSum(r.chiqim)+'</td><td class="num cell-strong">'+fmtSum(r.qoldiq)+'</td><td class="num" style="color:var(--good);">'+(r.kirimUsd?("+"+fmtUsd(r.kirimUsd)):"—")+'</td><td class="num" style="color:var(--critical);">'+(r.chiqimUsd?("−"+fmtUsd(r.chiqimUsd)):"—")+'</td><td class="num cell-strong">'+fmtUsd(r.qoldiqUsd)+'</td></tr>';
      }).join("");
      resultsEl.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Сана</th><th>Кирим (сўм)</th><th>Чиқим (сўм)</th><th>Қолдиқ (сўм)</th><th>Кирим ($)</th><th>Чиқим ($)</th><th>Қолдиқ ($)</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    container.querySelector("#kd-search").addEventListener("click", function(){
      STATE.kassaKoldiqFrom = container.querySelector("#kd-from").value;
      STATE.kassaKoldiqTo = container.querySelector("#kd-to").value;
      renderKdResults();
    });
    if(STATE.kassaKoldiqFrom && STATE.kassaKoldiqTo) renderKdResults(); else container.querySelector("#kd-results").innerHTML = emptyState("Сана оралиғини танланг","Кунлар кесимида кўриш учун икки санани ҳам киритинг ва «Излаш»ни босинг.");
  }

