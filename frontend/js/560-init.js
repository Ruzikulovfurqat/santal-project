  /* ================= init ================= */
  render();

  function boot(data){
    /* Loading the "assets" capability is independent of "db" and never
       blocks it — fetch it once, best-effort. */
    Promise.resolve(window.claude && window.claude.use ? window.claude.use("assets") : null)
      .then(function(assets){ STATE.assetsApi = assets || null; })
      .catch(function(){ STATE.assetsApi = null; });

    /* Connecting to the "db" capability is the critical path: everything
       the user enters is only durable once this succeeds. Some sessions
       have seen window.claude.use("db") resolve to null/undefined on the
       very first call (a startup race), which used to be treated as a
       permanent "Локал режим (сақланмайди)" — silently keeping all new
       records in page memory only, lost on the next reload. That is
       exactly the kind of data loss the app must never cause, so instead
       we retry indefinitely with a capped backoff until it connects, and
       tell the user plainly that saving is not yet active while we do. */
    var dbRetryDelay = 500;
    var dbConnected = false;
    var setStatus = function(text){
      var el = document.getElementById("dbStatusLabel");
      if(el) el.textContent = text;
    };
    var tryConnectDb = function(){
      if(dbConnected) return;
      Promise.resolve(window.claude && window.claude.use ? window.claude.use("db") : null).then(function(db){
        if(dbConnected) return;
        if(db){
          dbConnected = true;
          STATE.db = db;
          STATE.offline = false;
          setStatus("Синхронланган");
          attachSnapshot("orders","orders","createdAt");
          attachSnapshot("materials","materials","name");
          attachSnapshot("products","products","name");
          attachSnapshot("employees","employees","fullName");
          attachSnapshot("calculations","calculations","createdAt");
          attachSnapshot("warehouses","warehouses","name");
          attachSnapshot("categories","categories","name");
          attachSnapshot("items","items","name");
          attachSnapshot("stock","stock","itemId");
          attachSnapshot("receipts","receipts","createdAt");
          attachSnapshot("transfers","transfers","createdAt");
          attachSnapshot("writeoffs","writeoffs","createdAt");
          attachSnapshot("inventories","inventories","createdAt");
          attachSnapshot("recipes","recipes","createdAt");
          attachSnapshot("productions","productions","createdAt");
          attachSnapshot("laborCalcs","laborCalcs","name");
          attachSnapshot("equipment","equipment","name");
          attachSnapshot("settings","settingsList","createdAt");
          attachSnapshot("customers","customers","name");
          attachSnapshot("sales","sales","createdAt");
          attachSnapshot("cashAccounts","cashAccounts","name");
          attachSnapshot("cashTransactions","cashTransactions","createdAt");
          attachSnapshot("debtPayments","debtPayments","createdAt");
          attachSnapshot("suppliers","suppliers","name");
          attachSnapshot("supplierPayments","supplierPayments","createdAt");
          attachSnapshot("workshops","workshops","name");
          attachSnapshot("empCategories","empCategories","createdAt");
          attachSnapshot("cashConversions","cashConversions","createdAt");
          attachSnapshot("cashTransfers","cashTransfers","createdAt");
          attachSnapshot("employeeOps","employeeOps","createdAt");
          attachSnapshot("timesheets","timesheets","createdAt");
          attachSnapshot("salaryRuns","salaryRuns","createdAt");
          attachSnapshot("balanceEntries","balanceEntries","createdAt");
          attachSnapshot("units","units","name");
          attachSnapshot("priceLists","priceLists","createdAt");
          attachSnapshot("advanceRuns","advanceRuns","createdAt");
          attachSnapshot("payrollRuns","payrollRuns","createdAt");
          attachSnapshot("lomCalcs","lomCalcs","createdAt");
          attachSnapshot("lomReturns","lomReturns","createdAt");
          attachSnapshot("wh2Orders","wh2Orders","createdAt");
          attachSnapshot("wh2Receipts","wh2Receipts","createdAt");
          attachSnapshot("wh2Chikims","wh2Chikims","createdAt");
          attachSnapshot("wh2Categories","wh2Categories","name");
          attachSnapshot("equipmentReceipts","equipmentReceipts","createdAt");
          attachSnapshot("equipmentAssignments","equipmentAssignments","createdAt");
          attachSnapshot("users","users","createdAt");
          attachSnapshot("fxRates","fxRates","date");
          attachSnapshot("financeSplits","financeSplits","createdAt");
          attachSnapshot("financeTransfers","financeTransfers","createdAt");
          attachSnapshot("monthlyReports","monthlyReports","createdAt");
          setTimeout(maybeMigrate, 1200);
          setTimeout(maybeRenameLomKulItem, 1300);
          flushOfflineQueue();
          render();
        } else {
          STATE.offline = true;
          setStatus("Уланмоқда… (сақлаш учун кутинг)");
          render();
          setTimeout(tryConnectDb, dbRetryDelay);
          dbRetryDelay = Math.min(dbRetryDelay*1.6, 10000);
        }
      }).catch(function(e){
        console.error("db connect", e);
        STATE.offline = true;
        setStatus("Уланмоқда… (сақлаш учун кутинг)");
        render();
        setTimeout(tryConnectDb, dbRetryDelay);
        dbRetryDelay = Math.min(dbRetryDelay*1.6, 10000);
      });
    };
    tryConnectDb();
    render();
  }
  if(window.claude && window.claude.hot && window.claude.hot.ready){
    window.claude.hot.ready(boot);
  } else {
    boot({});
  }

