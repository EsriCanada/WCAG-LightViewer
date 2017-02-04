define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom","esri/kernel", 
    //"dijit/_WidgetBase",
    "dijit/layout/_LayoutWidget", 
    "esri/layers/FeatureLayer",
    "esri/dijit/FeatureTable", "dstore/RequestMemory",
    "esri/map", 
    //"dijit/_TemplatedMixin", 
    //"dojo/text!application/ShowFeatureTable/templates/ShowFeatureTable.html", 
    "dojo/i18n!application/nls/ShowFeatureTable",
    "dojo/on", "dojo/query", 
    "esri/tasks/query", "esri/tasks/QueryTask",
    "dijit/registry", "dojo/aspect", 
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", 
    "dijit/layout/ContentPane", "dijit/layout/BorderContainer",
    "dojo/dom-construct", "dojo/_base/event", 
    "esri/symbols/SimpleMarkerSymbol", "esri/symbols/PictureMarkerSymbol", 
    "esri/symbols/CartographicLineSymbol", 
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol",
    "esri/graphic", "esri/Color", 
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, dom, esriNS,
        //_WidgetBase, 
        _LayoutWidget,
        FeatureLayer, FeatureTable, RequestMemory,
        Map,
        //_TemplatedMixin, 
        //ShowFeatureTableTemplate, 
        i18n,
        on, query, 
        Query, QueryTask,
        registry, aspect,
        domClass, domAttr, domStyle,
        ContentPane, BorderContainer, 
        domConstruct, event,
        SimpleMarkerSymbol, PictureMarkerSymbol, 
        CartographicLineSymbol, 
        SimpleFillSymbol, SimpleLineSymbol,
        Graphic, Color
    ) {
    var Widget = declare("esri.dijit.ShowFeatureTable", [
        //_WidgetBase, 
        _LayoutWidget,
        //_TemplatedMixin, 
        Evented], {

        widgetsInTemplate: true, // ?
        //templateString: ShowFeatureTableTemplate,

        options: {
            map: null,
        },

        status: {
            get show() {
                if (!dojo.byId('featureTableContainer_splitter')) return false;
                return domStyle.get(dojo.byId('featureTableContainer_splitter'), "display") !== "none";
            },
            set show(visible) {
                switch(visible){
                    case true:
                        domStyle.set(dojo.byId('featureTableContainer'), "height","50%");
                        domStyle.set(dojo.byId('featureTableContainer_splitter'), "display", "initial");
                        this._this.borderContainer.resize();
                        break;
                    case false:
                        domStyle.set(dojo.byId('featureTableContainer'), "height",0);
                        domStyle.set(dojo.byId('featureTableContainer_splitter'), "display", "none");
                        this._this.borderContainer.resize();
                        break;
                }
            },
            Layer : null,
            get layer() {
                return this.Layer;
            },
            set layer(_layer) {
                if(this.Layer) {
                    this.Layer.layerObject._map.graphics.clear();
                    this._this.destroy();
                }
                this._this.loadTable(_layer);
            }
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);

            this.map = defaults.map;
            this.domNode = srcRefNode;
            this.containerNode = srcRefNode;

            dojo.create("link", {
                href : "js/ShowFeatureTable/Templates/ShowFeatureTable.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

            //if(options.animatedMarker) {
                this.markerSymbol = new esri.symbol.PictureMarkerSymbol({
                    "angle": 0,
                    "xoffset": 0,
                    "yoffset": 0,
                    "type": "esriPMS",
                    "url": require.toUrl("./images/SelectPointMarker.gif"),
                    "contentType": "image/gif",
                    "width": 33,
                    "height": 33
                });
            // } else {
            //     this.markerSymbol = new SimpleMarkerSymbol({
            //           "color": [3,126,175,20],
            //           "size": options.markerSize,
            //           "xoffset": 0,
            //           "yoffset": 0,
            //           "type": "esriSMS",
            //           "style": "esriSMSCircle",
            //           "outline": {
            //             "color": [3,26,255,220],
            //             "width": 2,
            //             "type": "esriSLS",
            //             "style": "esriSLSSolid"
            //           }
            //         });
            // }


            this.borderContainer = new BorderContainer({
                design:'headline',
                gutters:'false', 
                liveSplitters:'true',
                class:"myBorderContainer",
                id:'bc',
                widgetsInTemplate: true
            });
             
            this.contentPaneTop = new ContentPane({
                region: "center",
                gutters:'false', 
                splitter: 'true',
                style: "height:50%; padding:0; overflow: none;",
                content: dojo.byId("mapDiv"), 
                id: 'contentPaneTop',
                class: "splitterContent",
            });
            this.borderContainer.addChild(this.contentPaneTop);

            this.contentPaneBottom = new ContentPane({
                region: "bottom",
                gutters:'false', 
                splitter: 'true',
                class: "bg",
                style: "height:50%;",
                id: 'featureTableContainer',
                content: domConstruct.create("div", { id: 'featureTableNode'}),
            });
            this.borderContainer.addChild(this.contentPaneBottom);
            this.borderContainer.placeAt(dojo.byId('mapPlace'));

            this.borderContainer.startup();
        },

        postCreate: function() {
            this.inherited(arguments);
            this.status._this = this;
            this.status.show = false;
        },

        layout:function() {
            this.map.resize();
            this.map.reposition();
        },

        startup: function () {

            aspect.after(this.contentPaneTop, "resize", lang.hitch(this, function() {
                this.resize();
            }));

            this.resize();
        },

        // show: function() {
        //     domStyle.set(dojo.byId('featureTableContainer'), "height","50%");
        //     domStyle.set(dojo.byId('featureTableContainer_splitter'), "display", "initial");
        //     this.borderContainer.resize();
        // },

        // hide: function() {
        //     domStyle.set(dojo.byId('featureTableContainer'), "height",0);
        //     domStyle.set(dojo.byId('featureTableContainer_splitter'), "display", "none");
        //     this.borderContainer.resize();
        // },

        destroy: function() {
            if(this.status.Layer) {
                this.status.Layer.layerObject._map.graphics.clear();
            }
            if(this.myFeatureTable)
                this.myFeatureTable.destroy();
            //this.hide();
            this.status.show = false;
        },

        loadTable: function(myFeatureLayer){
            //return;
            this.status.Layer = myFeatureLayer;

            var outFields =[];
            var fieldsMap = myFeatureLayer.layerObject.infoTemplate._fieldsMap;
            for(var p in fieldsMap) {
                if(fieldsMap.hasOwnProperty(p) && fieldsMap[p].visible)
                {
                    var pField = fieldsMap[p];
                    outFields.push(pField.fieldName);
                }
            }

            this.layer = myFeatureLayer;
            this.myFeatureTable = new FeatureTable({
                //id:"myFeatureTable0",
                "featureLayer" : myFeatureLayer.layerObject,
                "map" : this.map,
                showAttachments: true,
                syncSelection: true, 
                zoomToSelection: true, 
                gridOptions: {
                    allowSelectAll: false,
                    allowTextSelection: true,
                    // pagination: true,
                    // pagingDelay: 1000,
                    // pageSizeOptions: [50, 100, 500],
                },
                editable: true,
                dateOptions: {
                    datePattern: i18n.widgets.showFeatureTable.datePattern,
                    timeEnabled: false
                },
                // timeOptions: {
                //     datePattern: i18n.widgets.showFeatureTable.datePattern,
                //     timeEnabled: true
                // },
                "outFields": outFields,
                // showRelatedRecords: true,
                showDataTypes: true,
                // showFeatureCount:true,
                // showStatistics:true,
                menuFunctions: [
                    {
                        label: i18n.widgets.showFeatureTable.showTypes, 
                        callback: lang.hitch(this, function(evt){
                            // console.log(" Callback evt: ", evt);
                            var typeLabels = query('.esri-feature-table-column-header-type');
                            if(typeLabels && typeLabels.length>0) {
                                var show = domStyle.get(typeLabels[0], 'display') === 'none';
                                var l = evt.toElement.innerText;
                                if(show) {
                                    typeLabels.forEach( function(label) { domStyle.set(label, 'display', '');});
                                    evt.toElement.innerText = i18n.widgets.showFeatureTable.hideTypes;
                                }
                                else {
                                    typeLabels.forEach( function(label) { domStyle.set(label, 'display', 'none');});
                                    evt.toElement.innerText = i18n.widgets.showFeatureTable.showTypes;
                                }
                                this.myFeatureTable.resize();
                            }
                        })
                    },
                    {
                        label: i18n.widgets.showFeatureTable.refresh, 
                        callback: lang.hitch(this, function(evt){
                            // console.log(" Callback evt: ", evt);
                            this.myFeatureTable.refresh();
                        })
                    },
                    {
                        label: i18n.widgets.showFeatureTable.close, 
                        callback: lang.hitch(this, function(evt){
                            this.destroy();
                        })
                    },
                ],
                showColumnHeaderTooltips: false,
            }, dojo.byId('featureTableNode'));

            this.myFeatureTable.startup();

            this.status.show = true;

            dojo.create('img', {
                src:'images/reload1.gif',
                alt: 'Refresh',
                title: 'Refresh',
                style:'width:30px; height:30px;'
            }, query('.esri-feature-table-menu-item.esri-feature-table-loading-indicator')[0]);

            var typeLabels = query('.esri-feature-table-column-header-type');
            if(typeLabels && typeLabels.length>0) {
                //evt.toElement.innerText = i18n.widgets.showFeatureTable.showTypes;
                typeLabels.forEach( function(label) { domStyle.set(label, 'display', 'none');});
            }

            var dgridRowTable = query('.dgrid-row-table');
            if(dgridRowTable && dgridRowTable.length>0) {
                dgridRowTable.forEach(function(table) {
                    domAttr.remove(table, 'role');
                });
            }

            //this.borderContainer.resize();

            // on(this.myFeatureTable, "load", lang.hitch(this, function(evt){
            //     console.log("The load event - ", evt);
            // }));

            // on(this.myFeatureTable, "show-statistics", function(evt){
            //     console.log("show-statistics avgfield - ", evt.statistics.avgField);
            //     console.log("show-statistics countfield - ", evt.statistics.countField);
            //     console.log("show-statistics maxfield - ", evt.statistics.maxField);
            //     console.log("show-statistics minfield - ", evt.statistics.minField);
            //     console.log("show-statistics stddevfield - ", evt.statistics.stddevField);
            //     console.log("show-statistics sumfield - ", evt.statistics.sumField);
            // });

            on(this.myFeatureTable, "error", function(evt){
                console.log("error event - ", evt);
            });

            on(this.myFeatureTable, "row-select", lang.hitch(this, function(evt){
                //console.log("select event: ", evt.rows.length);
                evt.rows.forEach(lang.hitch(this, function(row) {

                    var objectIdFieldName = this.layer.layerObject.objectIdField;
                    q = new Query();
                    q.where = objectIdFieldName+"="+row.id;
                    q.outFields = [objectIdFieldName];
                    q.returnGeometry = true;
                    new QueryTask(this.layer.layerObject.url).execute(q).then(lang.hitch(this,function(ev) {
                        var graphic = ev.features[0];
                        //console.log(ev, graphic);
                        var markerGeometry;
                        var marker;

                    //     switch (graphic.geometry.type) {
                    //         case "point":
                                markerGeometry = graphic.geometry;
                                marker = this.markerSymbol;
                    //            break;
                    //     case "extent":
                    //         markerGeometry = graphic.getCenter();
                    //         // marker = new SimpleMarkerSymbol
                    //         break;
                    //     case "polyline" :
                    //         markerGeometry = graphic.geometry;
                    //         marker = new CartographicLineSymbol(
                    //             CartographicLineSymbol.STYLE_SOLID, new Color([0, 127, 255]), 10, 
                    //             CartographicLineSymbol.CAP_ROUND,
                    //             CartographicLineSymbol.JOIN_ROUND, 5);
                    //         break;
                    //     default:
                    //         // if the graphic is a polygon
                    //         markerGeometry = graphic.geometry;
                    //         marker = new SimpleFillSymbol(
                    //             SimpleFillSymbol.STYLE_SOLID, 
                    //             new SimpleLineSymbol(
                    //                 SimpleLineSymbol.STYLE_SOLID,
                    //                 new Color([0, 127, 255]), 3),
                    //                 new Color([0, 127, 255, 0.25]));
                    //         break;
                    //     }

                         var gr = new Graphic(markerGeometry, marker);
                         gr.tag = row.id;
                         this.layer.layerObject._map.graphics.add(gr);
                    }));
                }));
            }));

            on(this.myFeatureTable, "row-deselect", lang.hitch(this, function(evt){
                console.log("deselect event: ", evt.rows.length);
                evt.rows.forEach(lang.hitch(this, function(row) {
                    this.layer.layerObject._map.graphics.graphics.forEach(lang.hitch(this, function(gr) { 
                        if(gr.tag && gr.tag === row.id) {
                            this.layer.layerObject._map.graphics.remove(gr);
                        }
                    }));
                }));
            }));

            on(this.myFeatureTable, "refresh", lang.hitch(this, function(evt){
                //console.log("refresh event - ", evt);
                this.layer.layerObject._map.graphics.clear();
            }));

            // on(this.myFeatureTable, "column-resize", lang.hitch(this, function(evt){
            // //triggered by ColumnResizer extension
            //     console.log("column-resize event - ", evt);
            // }));

            // on(this.myFeatureTable, "column-state-change", function(evt){
            //     // triggered by ColumnHider extension
            //     console.log("column-state-change event - ", evt);
            // });

            // on(this.myFeatureTable, "sort", function(evt){
            //     console.log("sort event - ", evt);
            // });

            // on(this.myFeatureTable, "filter", function(evt){
            //     console.log("filter event - ", evt);
            // });

        },
    });

    if (has("extend-esri")) {
        lang.setObject("dijit.ShowFeatureTable", Widget, esriNS);
    }
    return Widget;
});