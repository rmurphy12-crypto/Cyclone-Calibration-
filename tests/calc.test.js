/* Zero-dependency test suite for calc.js — run with: node tests/calc.test.js */
"use strict";
var C=require("../calc.js");

var passed=0,failed=0;
function ok(cond,label){
  if(cond){passed++;}
  else{failed++;console.error("  FAIL: "+label);}
}
function eq(actual,expected,label){
  ok(Object.is(actual,expected)||actual===expected,label+" — expected "+expected+", got "+actual);
}
function close(actual,expected,label,eps){
  eps=eps==null?1e-9:eps;
  ok(typeof actual==="number"&&Math.abs(actual-expected)<=eps,label+" — expected ≈"+expected+", got "+actual);
}

/* ---- constants ---- */
close(C.PER_ACRE_TO_PER_1000,43.56,"acre→1k conversion");
close(C.SQFT_PER_128_PLOT,340.3125,"1/128-acre plot size derived from 43560/128");

/* ---- num ---- */
eq(C.num("1,000"),1000,"num strips thousands separators");
eq(C.num("2.5"),2.5,"num plain decimal");
eq(C.num(" 12,345.6 "),12345.6,"num comma + spaces");
ok(isNaN(C.num("abc")),"num non-numeric → NaN");
ok(isNaN(C.num("")),"num empty → NaN");
ok(isNaN(C.num(null)),"num null → NaN");

/* ---- fmtTime ---- */
eq(C.fmtTime(90),"1:30","fmtTime 90s");
eq(C.fmtTime(45),"45s","fmtTime 45s");
eq(C.fmtTime(600),"10:00","fmtTime 600s");
eq(C.fmtTime(NaN),"—","fmtTime NaN");
eq(C.fmtTime(0),"—","fmtTime 0");

/* ---- bandFor boundaries ---- */
eq(C.bandFor(0.5).key,"light","band <0.75 light");
eq(C.bandFor(0.75).key,"std","band 0.75 std");
eq(C.bandFor(1.0).key,"std","band 1.0 std");
eq(C.bandFor(1.5).key,"heavy","band 1.5 heavy");
eq(C.bandFor(4).key,"heavy","band 4 heavy");
eq(C.bandFor(4.01).key,"vheavy","band >4 very heavy");
eq(C.bandFor(NaN).key,"none","band NaN none");

/* ---- estPsiFromFlow ---- */
close(C.estPsiFromFlow(0.4,0.4,40),40,"est PSI at rated flow");
close(C.estPsiFromFlow(0.2,0.4,40),10,"est PSI at half flow (quarter pressure)");
ok(isNaN(C.estPsiFromFlow(0.4,0,40)),"est PSI zero rated GPM → NaN");

/* ---- computeFlowTime ---- */
var ft=C.computeFlowTime({bucketOz:"32",bucketSec:"60",coverArea:"1000",coverSec:"240"});
close(ft.gpm,0.25,"flowtime GPM 32oz/60s = 0.25");
close(ft.timePer1000Sec,240,"flowtime time/1k");
close(ft.gpk,1.0,"flowtime gpk 0.25 GPM × 4 min");
ok(C.computeFlowTime({bucketOz:"32",bucketSec:"0",coverArea:"1000",coverSec:"240"})===null,"flowtime zero bucket sec → null");
var ftComma=C.computeFlowTime({bucketOz:"32",bucketSec:"60",coverArea:"1,000",coverSec:"240"});
close(ftComma.gpk,1.0,"flowtime accepts 1,000 with comma");

/* ---- computeArea ---- */
var ar=C.computeArea({areaSqFt:"1000",volume:"1",volumeUnit:"gal",timeSec:"240"});
close(ar.gpk,1.0,"area gpk 1 gal per 1000 ft²");
close(ar.gpm,0.25,"area GPM 1 gal / 4 min");
close(ar.timePer1000Sec,240,"area time/1k");
var arOz=C.computeArea({areaSqFt:"500",volume:"128",volumeUnit:"oz",timeSec:""});
close(arOz.gpk,2.0,"area oz→gal conversion (128 oz over 500 ft²)");
ok(isNaN(arOz.gpm),"area GPM NaN without time");
ok(C.computeArea({areaSqFt:"0",volume:"1",volumeUnit:"gal"})===null,"area zero area → null");

/* ---- compute128 ---- */
var p=C.compute128({plotSqFt:"340.3125",plotSec:"120",collectedOz:"1"});
close(p.gpa,1.0,"1/128 exact plot: 1 oz = 1 gal/acre");
close(p.gpk,1/43.56,"1/128 gpk from gpa");
close(p.timePer1000Sec,(120/340.3125)*1000,"1/128 time/1k");
var p2=C.compute128({plotSqFt:"340",plotSec:"120",collectedOz:"10"});
close(p2.gpa,10*340.3125/340,"1/128 scales for off-size plot");
ok(C.compute128({plotSqFt:"340",plotSec:"0",collectedOz:"10"})===null,"1/128 zero time → null");

/* ---- sanitizeBackup ---- */
ok(C.sanitizeBackup(null)===null,"sanitize null → null");
ok(C.sanitizeBackup("hi")===null,"sanitize string → null");
ok(C.sanitizeBackup({a:1})===null,"sanitize wrong shape → null");

var good={
  customNozzles:[{id:"cust-x",name:"TeeJet 8004",ratedGpm:"0.4",ratedPsi:"40"}],
  calibrations:{
    "cone-mist|3":{nozzleId:"cone-mist",nozzleName:"Cone Mist",speed:3,method:"flowtime",gpk:1.2,timePer1000Sec:240,gpm:0.3,inputs:{},notes:"",date:"x",ts:1},
    "cone-mist|4":{nozzleId:"cone-mist",speed:4,gpk:"1.5"},          // string gpk → coerced
    "bad|1":{nozzleId:"bad",speed:1,gpk:"not-a-number"},             // dropped
    "bad|2":{nozzleId:"bad",speed:9,gpk:1},                          // bad speed → dropped
    "bad|3":"garbage"                                                // dropped
  }
};
var s=C.sanitizeBackup(good);
eq(Object.keys(s.calibrations).length,2,"sanitize keeps valid records");
eq(s.dropped,3,"sanitize counts dropped records");
eq(s.calibrations["cone-mist|4"].gpk,1.5,"sanitize coerces string gpk to number");
eq(s.customNozzles.length,1,"sanitize keeps valid nozzle");
eq(s.customNozzles[0].builtin,false,"sanitize forces builtin:false");
ok((1.5).toFixed&&s.calibrations["cone-mist|4"].gpk.toFixed(2)==="1.50","sanitized gpk safe for toFixed");

var nozOnly=C.sanitizeBackup({customNozzles:[{id:1,name:"no string id"}]});
eq(nozOnly.customNozzles.length,0,"sanitize drops nozzle with non-string id");
eq(nozOnly.dropped,1,"sanitize counts dropped nozzle");

/* ---- report ---- */
console.log(passed+" passed, "+failed+" failed");
if(failed>0) process.exit(1);
