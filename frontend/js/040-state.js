  /* ================= state ================= */
  var STATE = {
    view:"dashboard",
    db:null, assetsApi:null,
    offline:false,
    orders:[], employees:[],
    materials:[], products:[], calculations:[],
    warehouses:[], categories:[], items:[], stock:[], receipts:[], transfers:[], writeoffs:[], inventories:[], recipes:[], productions:[], settingsList:[], laborCalcs:[], units:[], equipment:[], priceLists:[], advanceRuns:[], payrollRuns:[], lomCalcs:[], lomReturns:[], wh2Orders:[], wh2Receipts:[], wh2Chikims:[], wh2Categories:[], equipmentReceipts:[], equipmentAssignments:[],
    migrationAttempted:false, lomKulRenameAttempted:false,
    isAdmin:false,
    ordersFilter:"all", ordersSearch:"", ordersActiveOnly:false,
    whView:"stock", whTypeFilter:"", whWarehouseFilter:"", whCategoryFilter:"", whSearch:"", receiptKind:"product", receiptCategoryIds:[], whEquipSub:"main", whEquipEmployeeId:"",
    /* "Сўнгги ..." рўйхатлари учун сана оралиғи + қидирув + қўшимча
       филтрлар — фойдаланувчи сўровига кўра (2026-09-30 сўрови) ҳар бир
       "Омборлар" панелининг сўнгги ёзувлар рўйхатида. */
    recRcpFrom:"", recRcpTo:"", recRcpSearch:"", recRcpKind:"", recRcpCategory:"",
    recLrFrom:"", recLrTo:"", recLrSearch:"",
    recLretFrom:"", recLretTo:"", recLretSearch:"",
    recTrFrom:"", recTrTo:"", recTrSearch:"",
    recWoFrom:"", recWoTo:"", recWoSearch:"",
    recInvFrom:"", recInvTo:"", recInvSearch:"",
    /* Ишлаб чиқариш → Калькуляциялар рўйхати учун сана оралиғи + категория +
       қидирув филтрлари — фойдаланувчи сўровига кўра (2026-09-30 сўрови). */
    recCalcFrom:"", recCalcTo:"", recCalcSearch:"", recCalcCategory:"",
    supSearch:"",
    eqMainFrom:"", eqMainTo:"", eqMainSearch:"",
    eqAuxFrom:"", eqAuxTo:"", eqAuxSearch:"",
    eqCatalogSearch:"",
    /* "buyurtma" (Буюртма) фойдаланувчи сўровига кўра (2026-09-30) "Омбор 2"
       бўлимидан "Омборлар" бўлимига кўчирилди (қаранг: whSubnav/viewWarehouse
       ичидаги "buyurtma" филиали ва renderWh2Buyurtma'нинг ўзи) — шунга кўра
       "Омбор 2"нинг ўз стандарт бўлими энди "kirim". */
    wh2View:"kirim",
    wh2KoldiqSub:"tsex",
    wh2KoldiqTsexFrom:"", wh2KoldiqTsexTo:"", wh2KoldiqTsexWorkshopIds:[], wh2KoldiqTsexCategoryIds:[], wh2KoldiqTsexRan:false,
    wh2KoldiqOmorFrom:"", wh2KoldiqOmorTo:"", wh2KoldiqOmorWarehouseIds:[], wh2KoldiqOmorCategoryIds:[], wh2KoldiqOmorRan:false,
    prodView:"history", prodReportSearch:"", prodReportMachine:"",
    recipeDraft:null,
    customers:[], sales:[], cashAccounts:[], cashTransactions:[], debtPayments:[],
    cashConversions:[], cashTransfers:[], empCategories:[],
    fxRates:[], financeSplits:[], financeTransfers:[], moliyaAccountId:"",
    /* Ҳисобот бўлими (2026-10-16): ёпилган ойлик ҳисоботлар ва жорий
       танлов ҳолати. */
    monthlyReports:[],
    hisobotCatId:"", hisobotTab:"income", hisobotYear:0, hisobotMonth:0, hisobotRan:false,
    /* Ҳисобот рўйхати саҳифасидаги давр танлови (2026-10-17): йил ва
       ойдан-ойгача оралиқ — жамланмалар фақат шу оралиқдаги ЁПИЛГАН
       ойлар бўйича ҳисобланади. */
    hisobotListYear:0, hisobotListFrom:0, hisobotListTo:0,
    suppliers:[], supplierPayments:[],
    workshops:[], ordersWorkshopFilter:"", empView:"list", dashWs:"",
    employeeOps:[], timesheets:[], salaryRuns:[], balanceEntries:[],
    empActFrom:todayISO(), empActTo:todayISO(), empActEmployeeId:"", empActSelectAll:false,
    /* "Қолдиқларни киритиш" бўлими учун "Фақат бажарилганлар" галочкаси —
       стандартда ёқилган (2026-10-01 сўрови). */
    balanceEntriesOnlyActive:true,
    empReportYear:new Date().getFullYear(), empReportMonth:new Date().getMonth()+1,
    /* Ходимлар → "Ходимлар рўйхати" бўлимидаги исм бўйича қидирув катаги
       (2026-10-01 сўрови: саналар киритилган сана бўйича сараланиши ва
       юқорида исм бўйича автоматик қидирув катаги бўлиши керак). */
    empOpsSearch:"",
    /* "Фақат бажарилганлар" галочкаси — стандартда ёқилган, бекор
       қилинган операцияларни яширади (2026-10-01 сўрови). */
    empOpsOnlyActive:true,
    /* Табел/Наряд/Аванслар/Иш ҳақи — ҳар бирида давр (йил) танлаш тугмаси
       (2020–2100, бир вақтда фақат 3 та йил кўринадиган айлантма рўйхат).
       *Year — танланган йил, *YearWin — кўринаётган 3 та йилнинг энг
       биринчиси (ойна бошланиши). */
    tabelYear:new Date().getFullYear(), tabelYearWin:0, tabelOnlyActive:true,
    salaryListYear:new Date().getFullYear(), salaryListYearWin:0, salaryListOnlyActive:true,
    advanceListYear:new Date().getFullYear(), advanceListYearWin:0, advanceListOnlyActive:true,
    payrollListYear:new Date().getFullYear(), payrollListYearWin:0, payrollListOnlyActive:true,
    salesView:"list", salesSearch:"", priceListSearch:"",
    kassaView:"accounts", kassaAccountId:"", kassaTab:"main", kassaFilter:null, kassaDay:"", kassaKoldiqFrom:"", kassaKoldiqTo:"",
    kassaAnalizFrom:"", kassaAnalizTo:"", kassaActFrom:"", kassaActTo:"", kassaActWho:"", kassaActSearched:false,
    /* Касса → Кирим/Чиқим/Конвертация/Кўчирма — ҳар бир таб учун алоҳида
       сана-оралиғи филтри + қидирув + кунлик кўриниш ҳолати (2026-10-01
       сўрови). day — ҳозир кўрсатилаётган кун (ҳеч нарса танланмаган бўлса
       автоматик энг сўнгги операция санаси олинади). */
    /* onlyActive:true — фақат бажарилган (бекор қилинмаган) ёзувлар
       кўрсатилади (стандарт ҳолат); галочка олиб ташланса, бекор
       қилинганлари ҳам кўринади (2026-10-01 сўрови). */
    kassaLedgerFilters:{
      kirim:{from:"", to:"", active:false, search:"", day:"", onlyActive:true},
      chiqim:{from:"", to:"", active:false, search:"", day:"", onlyActive:true}
    },
    kassaConvFilter:{from:"", to:"", active:false, search:"", day:"", onlyActive:true},
    kassaTransferFilter:{from:"", to:"", active:false, search:"", day:"", onlyActive:true},
    lastUsdRate:0,
    reportsView:"overview",
    reportActType:"customer", reportActWho:"", reportActFrom:"", reportActTo:"",
    offlineQueue:[],
    /* "Админ панел" — кўп фойдаланувчили кириш ва менюлар бўйича
       рухсатлар (2026-10-01 сўрови). currentUserId бўш бўлса — ҳеч ким
       тизимга алоҳида кирмаган ва эгасининг олдинги тўлиқ, чекловсиз
       иши ҳеч нарсасиз ўзгармайди (бу ОПТ-ИН механизм). */
    users:[], currentUserId:"",
  };
  /* Логин қилган фойдаланувчи шу браузерда эсда қолсин (сервердаги
     умумий маълумотларга таъсир қилмайди — фақат шу қурилма/браузер
     учун "ким кирган" ҳолати). */
  try { STATE.currentUserId = localStorage.getItem("ishlabChiqarishCurrentUserId") || ""; } catch(e){}

  var NAV = [
    {id:"dashboard", label:"Бошқарув панели", icon:ICONS.grid},
    {id:"orders", label:"Харидор буюртмаси", icon:ICONS.clipboard},
    {id:"warehouse", label:"Омборлар", icon:ICONS.box},
    {id:"production", label:"Ишлаб чиқариш", icon:ICONS.calc},
    {id:"sales", label:"Савдо", icon:ICONS.clipboard},
    {id:"kassa", label:"Касса", icon:ICONS.box},
    {id:"moliya", label:"Молия бўлими", icon:ICONS.wallet},
    {id:"hisobot", label:"Ҳисобот", icon:ICONS.chart},
    {id:"reconciliation", label:"Солиштирма далолатнома", icon:ICONS.clipboard},
    {id:"employees", label:"Ходимлар", icon:ICONS.users},
    /* "Админ панел" — фойдаланувчи сўровига кўра (2026-10-01) менюлар
       қаторидан пастроқда, рўйхатнинг энг охирида жойлашади. */
    {id:"adminpanel", label:"Админ панел", icon:ICONS.gear},
  ];

