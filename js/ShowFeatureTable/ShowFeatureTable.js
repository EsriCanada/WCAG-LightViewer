define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom","esri/kernel", 
    "dijit/_WidgetBase", 
    "esri/layers/FeatureLayer",
    "esri/dijit/FeatureTable",
    "esri/geometry/webMercatorUtils",
    "esri/map",
    "dijit/_TemplatedMixin", 
    "dojo/on", "dojo/query", "dijit/registry", "dojo/aspect", 
    "dojo/text!application/ShowFeatureTable/templates/ShowFeatureTable.html", 
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", 
    "dijit/layout/ContentPane", "dijit/layout/BorderContainer",
    "dojo/dom-construct", "dojo/_base/event", 
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, dom, esriNS,
        _WidgetBase, 
        FeatureLayer, FeatureTable, webMercatorUtils, Map,
        _TemplatedMixin, 
        on, query, registry, aspect,
        ShowFeatureTableTemplate, 
        domClass, domAttr, domStyle,
        ContentPane, BorderContainer, 
        domConstruct, event
    ) {
    var Widget = declare("esri.dijit.ShowFeatureTable", [
        _WidgetBase, 
        //_TemplatedMixin, 
        Evented], {

        //widgetsInTemplate: true, // ?
        //templateString: ShowFeatureTableTemplate,

        options: {
            map: null,
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);

            this.domNode = srcRefNode;

            var link = document.createElement("link");
            link.href = "js/ShowFeatureTable/Templates/ShowFeatureTable.css";
            link.type = "text/css";
            link.rel = "stylesheet";
            document.getElementsByTagName("head")[0].appendChild(link);

        },

        startup: function () {
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }

        },
        
        _init: function () {

            this.mapDiv = document.querySelector("#mapDiv");
            dojo.declare("MySplitterContainer",
                [dijit._Widget, dijit._Templated, Evented], {
                    widgetsInTemplate: true,
                    templateString: ShowFeatureTableTemplate,
                    //style: "height:100%; width:100%"
            });

            this.mySplitterContainer =  new MySplitterContainer( {}, dojo.create('DIV'));
            this.mySplitterContainer.placeAt(dojo.byId('mapPlace'));
            dojo.place(this.mapDiv, dojo.byId("mapSplitHolder"));
            //domStyle.set(dojo.byId('mapDiv'), 'display', 'none');
            //domStyle.set(dojo.byId('mapDiv'), 'height', '50%');

            aspect.after(dojo.byId('mapSplitHolder'), "resize", lang.hitch(this, function() {
                this.map.resize();
                this.map.reposition();
            }));
            this.mySplitterContainer.startup();

            this.map.resize();
            this.map.reposition();
        },

        loadTable: function(myFeatureLayer){
            var myFeatureTable = new FeatureTable({
                "featureLayer" : myFeatureLayer.layerObject,
                "map" : this.map
            }, 'featureTableNode');

            on(myFeatureTable, "load", function(evt){
                console.log("The load event - ", evt);
            });

            on(myFeatureTable, "show-statistics", function(evt){
                console.log("show-statistics avgfield - ", evt.statistics.avgField);
                console.log("show-statistics countfield - ", evt.statistics.countField);
                console.log("show-statistics maxfield - ", evt.statistics.maxField);
                console.log("show-statistics minfield - ", evt.statistics.minField);
                console.log("show-statistics stddevfield - ", evt.statistics.stddevField);
                console.log("show-statistics sumfield - ", evt.statistics.sumField);
            });

            on(myFeatureTable, "error", function(evt){
                console.log("error event - ", evt);
            });

            on(myFeatureTable, "row-select", function(evt){
                console.log("select event - ", evt.rows[0].data);
            });

            on(myFeatureTable, "row-deselect", function(evt){
                console.log("deselect event - ", evt.rows[0].data);
            });

            on(myFeatureTable, "refresh", function(evt){
                console.log("refresh event - ", evt);
            });

            on(myFeatureTable, "column-resize", function(evt){
            //triggered by ColumnResizer extension
                console.log("column-resize event - ", evt);
            });

            on(myFeatureTable, "column-state-change", function(evt){
                // triggered by ColumnHider extension
                console.log("column-state-change event - ", evt);
            });

            on(myFeatureTable, "sort", function(evt){
                console.log("sort event - ", evt);
            });

            on(myFeatureTable, "filter", function(evt){
                console.log("filter event - ", evt);
            });

            myFeatureTable.startup();

            console.log("there...");
        },
    });

    if (has("extend-esri")) {
        lang.setObject("dijit.ShowFeatureTable", Widget, esriNS);
    }
    return Widget;
});