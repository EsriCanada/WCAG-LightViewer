define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom","esri/kernel", 
    "dijit/_WidgetBase",
    "dijit/layout/_LayoutWidget", 
    "esri/layers/FeatureLayer",
    "esri/dijit/FeatureTable",
    "esri/map",
    //"dijit/_TemplatedMixin", 
    //"dojo/text!application/ShowFeatureTable/templates/ShowFeatureTable.html", 
    "dojo/on", "dojo/query", "dijit/registry", "dojo/aspect", 
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", 
    "dijit/layout/ContentPane", "dijit/layout/BorderContainer",
    "dojo/dom-construct", "dojo/_base/event", 
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, dom, esriNS,
        _WidgetBase, 
        _LayoutWidget,
        FeatureLayer, FeatureTable, 
        Map,
        //_TemplatedMixin, 
        //ShowFeatureTableTemplate, 
        on, query, registry, aspect,
        domClass, domAttr, domStyle,
        ContentPane, BorderContainer, 
        domConstruct, event
    ) {
    var Widget = declare("esri.dijit.ShowFeatureTable", [
        _WidgetBase, 
        _LayoutWidget,
        //_TemplatedMixin, 
        Evented], {

        widgetsInTemplate: true, // ?
        //templateString: ShowFeatureTableTemplate,

        options: {
            map: null,
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);

            this.map = defaults.map;
            this.domNode = srcRefNode;
            this.containerNode = srcRefNode;
            // baseClass = "ShowFeatureTable";

            dojo.create("link", {
                href : "js/ShowFeatureTable/Templates/ShowFeatureTable.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

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

            // this.contentPaneTop.startup();
            // this.contentPaneBottom.startup();
            this.borderContainer.startup();
        },

        postCreate: function() {
            this.inherited(arguments);
        },

        layout:function() {
            this.map.resize();
            this.map.reposition();
        },

        startup: function () {
            // this.contentPaneBottom.startup();
            // this.borderContainer.startup();

            aspect.after(this.contentPaneTop, "resize", lang.hitch(this, function() {
                this.resize();
            }));

            this.resize();
        },

        loadTable: function(myFeatureLayer){
            //return;

            var outFields =[];
            var fieldsMap = myFeatureLayer.layerObject.infoTemplate._fieldsMap;
            for(var p in fieldsMap) {
                if(fieldsMap.hasOwnProperty(p) && fieldsMap[p].visible)
                {
                    var pField = fieldsMap[p];
                    outFields.push(pField.fieldName);
                }
            }

            this.myFeatureTable = new FeatureTable({
                //id:"myFeatureTable0",
                "featureLayer" : myFeatureLayer.layerObject,
                "map" : this.map,
                showAttachments: true,
                syncSelection: true, 
                zoomToSelection: true, 
                gridOptions: {
                  allowSelectAll: true,
                  allowTextSelection: false,
                  //columnHider: true,
                  //selectionMode: "extended",
                },
                editable: true,
                dateOptions: {
                    datePattern: "MMMM d, y",
                    timeEnabled: false
                },
                "outFields": outFields,
                // showRelatedRecords: true,
                // showDataTypes: true,
                // showFeatureCount:true,
                // showStatistics:true,
                menuFunctions: [
                    {
                        label: "Refresh", 
                        callback: lang.hitch(this, function(evt){
                            // console.log(" Callback evt: ", evt);
                            this.myFeatureTable.refresh();
                        })
                    },
                ],
                showColumnHeaderTooltips: false,
            }, dojo.byId('featureTableNode'));

            this.myFeatureTable.startup();
            this.borderContainer.resize();
            // this.myFeatureTable.grid.resize();
            


            on(this.myFeatureTable, "load", lang.hitch(this, function(evt){
                console.log("The load event - ", evt);
            }));

            on(this.myFeatureTable, "show-statistics", function(evt){
                console.log("show-statistics avgfield - ", evt.statistics.avgField);
                console.log("show-statistics countfield - ", evt.statistics.countField);
                console.log("show-statistics maxfield - ", evt.statistics.maxField);
                console.log("show-statistics minfield - ", evt.statistics.minField);
                console.log("show-statistics stddevfield - ", evt.statistics.stddevField);
                console.log("show-statistics sumfield - ", evt.statistics.sumField);
            });

            on(this.myFeatureTable, "error", function(evt){
                console.log("error event - ", evt);
            });

            on(this.myFeatureTable, "row-select", function(evt){
                console.log("select event: ", evt.rows.length);
                evt.rows.forEach(function(row) {
                    console.log(row.data);
                });
            });

            on(this.myFeatureTable, "row-deselect", function(evt){
                console.log("deselect event: ", evt.rows.length);
                evt.rows.forEach(function(row) {
                    console.log(row.data);
                });
            });

            on(this.myFeatureTable, "refresh", function(evt){
                console.log("refresh event - ", evt);
            });

            on(this.myFeatureTable, "column-resize", lang.hitch(this, function(evt){
            //triggered by ColumnResizer extension
                console.log("column-resize event - ", evt);
                // this.myFeatureTable.selectRows([1,3], true);
                // this.myFeatureTable.centerOnSelection();
            }));

            on(this.myFeatureTable, "column-state-change", function(evt){
                // triggered by ColumnHider extension
                console.log("column-state-change event - ", evt);
            });

            on(this.myFeatureTable, "sort", function(evt){
                console.log("sort event - ", evt);
            });

            on(this.myFeatureTable, "filter", function(evt){
                console.log("filter event - ", evt);
            });

        },
    });

    if (has("extend-esri")) {
        lang.setObject("dijit.ShowFeatureTable", Widget, esriNS);
    }
    return Widget;
});