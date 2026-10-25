  /* ================= db layer ================= */
  function col(name){
    if(!STATE.db) return null;
    return STATE.db.collection(name);
  }
  function reconcilePendingId(tempId, realId){
    var collNames = ["orders","employees","warehouses","categories","items","stock","receipts","transfers","writeoffs","inventories","recipes","productions","settingsList","customers","sales","cashAccounts","cashTransactions","debtPayments","laborCalcs","suppliers","supplierPayments","workshops","empCategories","cashConversions","cashTransfers","employeeOps","timesheets","salaryRuns","units","priceLists","advanceRuns","payrollRuns","lomCalcs","lomReturns","wh2Orders","wh2Receipts","wh2Chikims","wh2Categories","equipmentReceipts","equipmentAssignments","monthlyReports"];
    var changed = false;
    var fixValue = function(obj, key){
      var v = obj[key];
      if(v === tempId){ obj[key] = realId; changed = true; return; }
      if(Array.isArray(v)){
        for(var i=0;i<v.length;i++){
          var item = v[i];
          if(item === tempId){ v[i] = realId; changed = true; }
          else if(item && typeof item === "object"){
            Object.keys(item).forEach(function(k2){ fixValue(item, k2); });
          }
        }
      }
    };
    collNames.forEach(function(cn){
      var arr = STATE[cn];
      if(!arr) return;
      arr.forEach(function(doc){
        if(doc.id === tempId){ doc.id = realId; changed = true; }
        Object.keys(doc).forEach(function(k){ if(k!=="id") fixValue(doc, k); });
      });
    });
    if(changed) render();
  }
  function dbAdd(collName, data, localArr){
    var withMeta = Object.assign({}, data);
    if(STATE.db){
      var tempId = "_pending_"+uid();
      var optimistic = Object.assign({}, withMeta);
      optimistic.id = tempId;
      optimistic._pending = true;
      localArr.unshift(optimistic);
      render();
      col(collName).add(withMeta).then(function(ref){
        optimistic._pending = false;
        if(ref && ref.id) reconcilePendingId(tempId, ref.id);
      }).catch(function(e){
        var idx = localArr.indexOf(optimistic);
        if(idx>-1) localArr.splice(idx,1);
        toast("Хатолик: сақланмади"); console.error(e); render();
      });
    } else {
      var localId = "_pending_"+uid();
      withMeta.id = localId;
      withMeta._localOnly = true;
      localArr.unshift(withMeta);
      STATE.offlineQueue.push({collName:collName, tempId:localId, data:Object.assign({}, data), localArr:localArr, localObj:withMeta});
      toast("Диққат: сервер билан алоқа йўқ — сақлаш учун улaниш кутилмоқда");
      render();
    }
  }
  function flushOfflineQueue(){
    if(!STATE.db || !STATE.offlineQueue.length) return;
    var queue = STATE.offlineQueue;
    STATE.offlineQueue = [];
    queue.forEach(function(entry){
      col(entry.collName).add(entry.data).then(function(ref){
        entry.localObj._localOnly = false;
        if(ref && ref.id) reconcilePendingId(entry.tempId, ref.id);
      }).catch(function(e){
        console.error("offline queue flush failed", entry.collName, e);
        toast("Хатолик: олдин киритилган ёзув сақланмади ("+entry.collName+")");
      });
    });
  }
  function dbUpdate(collName, id, patch, localArr){
    var item = localArr.find(function(x){ return x.id===id; });
    if(item) Object.assign(item, patch);
    render();
    if(STATE.db){
      col(collName).doc(id).update(patch).catch(function(e){ toast("Хатолик: янгиланмади"); console.error(e); });
    }
  }
  function dbDelete(collName, id, localArr){
    var idx = localArr.findIndex(function(x){ return x.id===id; });
    var removed = idx>-1 ? localArr.splice(idx,1)[0] : null;
    render();
    if(STATE.db){
      col(collName).doc(id).delete().catch(function(e){
        if(removed) localArr.splice(idx,0,removed);
        toast("Хатолик: ўчирилмади"); console.error(e); render();
      });
    }
  }
  function dbSet(collName, id, data, localArr){
    var item = localArr.find(function(x){ return x.id===id; });
    if(item) Object.assign(item, data);
    else { var o=Object.assign({id:id}, data); localArr.unshift(o); }
    render();
    if(STATE.db){
      STATE.db.collection(collName).doc(id).set(data).catch(function(e){ toast("Хатолик: сақланмади"); console.error(e); });
    }
  }

  function attachSnapshot(collName, targetKey, orderField){
    if(!STATE.db) return;
    var retryDelay = 1500;
    var sortLocal = function(arr){
      if(!orderField) return arr;
      arr.sort(function(a,b){
        var av=a[orderField], bv=b[orderField];
        if(av===undefined||av===null) av="";
        if(bv===undefined||bv===null) bv="";
        if(av<bv) return -1; if(av>bv) return 1; return 0;
      });
      return arr;
    };
    var applySnap = function(snap){
      retryDelay = 1500;
      var arr = snap.docs.map(function(d){ var data=d.data()||{}; data.id=d.id; return data; });
      sortLocal(arr);
      STATE[targetKey] = arr;
      render();
    };
    var subscribe = function(useOrder){
      var q;
      try{
        q = col(collName);
        if(useOrder) q = q.orderBy(orderField||"name");
      }catch(e){ q = col(collName); useOrder = false; }
      try{
        q.onSnapshot(applySnap, function(err){
          console.error(collName, err);
          if(useOrder){ subscribe(false); return; }
          setTimeout(function(){ subscribe(true); }, retryDelay);
          retryDelay = Math.min(retryDelay*1.7, 20000);
        });
      }catch(e){
        console.error(collName, e);
        setTimeout(function(){ subscribe(true); }, retryDelay);
        retryDelay = Math.min(retryDelay*1.7, 20000);
      }
    };
    subscribe(true);
    /* Immediate one-shot hydration fallback: if the realtime subscription above
       is slow, errors, or silently never fires, this ensures the list still
       populates from a direct read shortly after boot instead of staying
       empty and misleading the user into re-creating records that already
       exist on the server. */
    try{
      col(collName).get().then(function(snap){
        if(STATE[targetKey] && STATE[targetKey].length) return;
        var arr = snap.docs.map(function(d){ var data=d.data()||{}; data.id=d.id; return data; });
        sortLocal(arr);
        STATE[targetKey] = arr;
        render();
      }).catch(function(e){ console.error(collName+" get() fallback", e); });
    }catch(e){}
  }

