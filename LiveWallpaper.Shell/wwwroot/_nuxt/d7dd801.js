(window.webpackJsonp=window.webpackJsonp||[]).push([[19,5],{366:function(e,t,n){"use strict";n.r(t);n(37),n(19),n(36),n(10),n(54),n(43),n(55);var r=n(1),o=n(20),l=(n(15),n(68),n(33),n(67));function c(object,e){var t=Object.keys(object);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(object);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(object,e).enumerable}))),t.push.apply(t,n)}return t}function f(e){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?c(Object(source),!0).forEach((function(t){Object(o.a)(e,t,source[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(source)):c(Object(source)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(source,t))}))}return e}var d=Object(l.a)("local"),v=d.mapState,m=d.mapGetters,h=(d.mapActions,d.mapMutations,{computed:f(f({},v(["clientVersion","serverPort"])),m(["serverHost"])),data:function(){return{isLoading:!1}},mounted:function(){var e=this;return Object(r.a)(regeneratorRuntime.mark((function t(){return regeneratorRuntime.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e.isLoading=!0,t.next=3,e.$store.dispatch("local/getClientVersion",{handleClientApiException:e.handleClientApiException});case 3:e.isLoading=!1,console.log(e.clientVersion);case 5:case"end":return t.stop()}}),t)})))()},methods:{isNewerVersion:function(e,t){for(var n=e.split("."),r=t.split("."),i=0;i<r.length;i++){var a=~~r[i],b=~~n[i];if(a>b)return!0;if(a<b)return!1}return!1},handleClientApiException:function(e){this.$local.handleClientApiException(this,e)}}}),_=n(25),component=Object(_.a)(h,(function(){var e=this,t=e.$createElement,n=e._self._c||t;return n("div",{staticClass:"container main"},[n("section",[n("b-field",{attrs:{label:e.$t("common.clientVersion",{version:this.clientVersion})}}),e._v(" "),e.clientVersion&&e.isNewerVersion(e.clientVersion,e.$config.expectedClientVersion)?n("b-field",{attrs:{label:e.$t("common.needUpgradeClient",{version:this.clientVersion,expectedVersion:e.$config.expectedClientVersion})}},[n("a",{attrs:{href:e.$config.appStoreUrl,target:"_blank"}},[n("span",[e._v(" "+e._s(e.$t("common.downloadClient"))+" ")])])]):e._e(),e._v(" "),n("client-only",[e.serverHost?n("b-field",[n("a",{attrs:{target:"_blank",href:e.serverHost+"?p="+e.serverPort}},[e._v("\n          "+e._s(e.serverHost+"?p="+e.serverPort)+"\n        ")])]):e._e()],1),e._v(" "),n("b-field",[n("a",{attrs:{target:"_blank",href:e.$config.releaseNotesUrl}},[e._v("\n        "+e._s(e.$t("common.releaseNotes"))+"\n      ")])]),e._v(" "),n("b-field",[n("a",{attrs:{target:"_blank",href:e.$config.donateUrl}},[e._v("\n        "+e._s(e.$t("common.donate"))+"\n      ")])]),e._v(" "),n("b-field",[n("b-button",{attrs:{target:"_blank",href:"#"},on:{click:function(t){e.$local.getApiInstance().openStoreReview()}}},[e._v("\n        "+e._s(e.$t("common.thumbUp"))+"\n      ")])],1)],1),e._v(" "),n("b-loading",{attrs:{closable:!1},model:{value:e.isLoading,callback:function(t){e.isLoading=t},expression:"isLoading"}})],1)}),[],!1,null,null,null);t.default=component.exports},380:function(e,t,n){"use strict";n.r(t);var r={name:"About",layout:"dashboard"},o=n(25),component=Object(o.a)(r,(function(){var e=this.$createElement;return(this._self._c||e)("AboutPanel")}),[],!1,null,null,null);t.default=component.exports;installComponents(component,{AboutPanel:n(366).default})}}]);