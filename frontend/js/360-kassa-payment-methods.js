  /* ================= kassa: payment methods & multi-bucket balances =================
     A kassa (cash account) now holds FOUR independent "buckets" at once —
     naqd (cash), karta (card), otkazma (bank transfer), dollar (USD, kept
     in its own currency, never auto-folded into so'm). Old records created
     before this change have no per-method breakdown at all (just a single
     .amount) — those are treated as plain "naqd" for balance purposes so
     no historical value is lost or reclassified silently; the record
     itself is never rewritten. */
  /* 2026-10-15 сўровига кўра тўлов усуллари: ҳисоб рақам (сўм), ҳисоб рақам ($),
     нақд, нақд ($), карта. Эски ёзувлардаги калитлар ЎЗГАРМАДИ — фақат
     "otkazma" энди "Ҳисоб рақам (сўм)", "dollar" эса "Нақд ($)" деб аталади,
     янгиси фақат "otkazma_usd" (Ҳисоб рақам $). */
  var PAYMENT_METHODS = [["otkazma","Ҳисоб рақам (сўм)"],["otkazma_usd","Ҳисоб рақам ($)"],["naqd","Нақд"],["dollar","Нақд ($)"],["karta","Карта"]];
  function isUsdMethod(m){ return m==="dollar" || m==="otkazma_usd"; }
  function paymentMethodLabel(m){ var f=PAYMENT_METHODS.find(function(x){return x[0]===m;}); return f?f[1]:m; }
  function fmtUsd(n){ return "$"+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0); }
  function methodInitialBalance(acc, method){
    if(!acc) return 0;
    if(method==="naqd") return Number(acc.initialBalance)||0;
    if(method==="karta") return Number(acc.initialBalanceKarta)||0;
    if(method==="otkazma") return Number(acc.initialBalanceOtkazma)||0;
    if(isUsdMethod(method)) return Number(acc.initialBalanceDollar)||0;
    if(method==="otkazma_usd") return Number(acc.initialBalanceOtkazmaUsd)||0;
    return 0;
  }
  /* Per-transaction helper: yields this cash transaction's contribution to
     a given method's bucket (so'm for naqd/karta/otkazma, USD for dollar). */
  function txMethodValue(t, method){
    if(t.methods && t.methods.length){
      var sum = 0;
      t.methods.forEach(function(m){
        if(m.method!==method) return;
        sum += isUsdMethod(method) ? (Number(m.usdAmount)||0) : (Number(m.amount)||0);
      });
      return sum;
    }
    return method==="naqd" ? (Number(t.amount)||0) : 0;
  }
  function cashMethodBalance(accountId, method){
    var acc = cashAccountById(accountId);
    var base = methodInitialBalance(acc, method);
    var delta = 0;
    STATE.cashTransactions.forEach(function(t){
      if(t.cashAccountId!==accountId || t.cancelled) return;
      var v = txMethodValue(t, method);
      delta += (t.direction==="kirim" ? v : -v);
    });
    STATE.cashConversions.forEach(function(c){
      if(c.cashAccountId!==accountId || c.cancelled) return;
      if(c.fromMethod===method) delta -= (isUsdMethod(method) ? (Number(c.fromUsdAmount)||0) : (Number(c.fromAmount)||0));
      if(c.toMethod===method) delta += (isUsdMethod(method) ? (Number(c.toUsdAmount)||0) : (Number(c.toAmount)||0));
    });
    STATE.cashTransfers.forEach(function(tr){
      if(tr.cancelled || tr.method!==method) return;
      var v = isUsdMethod(method) ? (Number(tr.usdAmount)||0) : (Number(tr.amount)||0);
      if(tr.fromCashAccountId===accountId) delta -= v;
      if(tr.toCashAccountId===accountId) delta += v;
    });
    return base+delta;
  }
  function cashAccountBalances(accountId){
    return {
      naqd: cashMethodBalance(accountId,"naqd"),
      karta: cashMethodBalance(accountId,"karta"),
      otkazma: cashMethodBalance(accountId,"otkazma"),
      dollar: cashMethodBalance(accountId,"dollar"),
      otkazma_usd: cashMethodBalance(accountId,"otkazma_usd")
    };
  }
  /* Backward-compatible single so'm figure (naqd+karta+otkazma — dollar is
     a different currency and is shown separately, never auto-converted at
     a made-up rate). Used by the dashboard tile and the old reports view. */
  function cashAccountBalance(accountId){
    var b = cashAccountBalances(accountId);
    return b.naqd+b.karta+b.otkazma;
  }
  function totalCashBalance(){ return STATE.cashAccounts.reduce(function(sum,a){return sum+cashAccountBalance(a.id);},0); }
  function recordCashTx(accountId, direction, amount, category, extra){
    if(!accountId || amount<=0) return;
    var data = Object.assign({cashAccountId:accountId, direction:direction, amount:amount, category:category||"", description:"", date:todayISO(), createdAt:new Date().toISOString()}, extra||{});
    dbAdd("cashTransactions", data, STATE.cashTransactions);
  }

