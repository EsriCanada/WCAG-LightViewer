define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel", 
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on",
    "esri/dijit/Legend", "application/ShowFeatureTable/ShowFeatureTable", 
    "application/ShowBasemapGallery/ShowBasemapGallery",
    "dojo/text!application/TableOfContents/Templates/TableOfContents.html", 
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event", 
    "dojo/_base/array",
    "esri/symbols/TextSymbol", "esri/renderers/SimpleRenderer", "esri/layers/LabelLayer"
    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, on, 
        Legend, ShowFeatureTable, ShowBasemapGallery,
        dijitTemplate, 
        domClass, domAttr, domStyle, domConstruct, event, 
        array,
        TextSymbol, SimpleRenderer, LabelLayer
    ) {
    var Widget = declare("esri.dijit.TableOfContents", [_WidgetBase, _TemplatedMixin, Evented], {
        templateString: dijitTemplate,
        // defaults
        options: {
            theme: "TableOfContents",
            map: null,
            layers: null,
            dataItems:null,
            visible: true,
            hasLegend:true,
            hasFeatureTable:false,
            hasBasemapGallery:true,
            mapNode: dojo.byId('mapPlace')
        },

        // lifecycle: 1
        constructor: function (options, srcRefNode) {
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            // widget node
            this.domNode = srcRefNode;

            dojo.create("link", {
                href : "js/TableOfContents/Templates/Slider.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

            dojo.create("link", {
                href : "js/TableOfContents/Templates/TableOfContents.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);

            // properties
            this.set("defaults", defaults);

            this.set("map", defaults.map);
            this.set("layers", defaults.layers);
            this.set("dataItems", defaults.dataItems);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            // listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("layers", this._refreshLayers);
            this.watch("map", this.refresh);
            // classes
            this.css = {
                container: "toc-container",
                layer: "toc-layer",
                firstLayer: "toc-first-layer",
                title: "toc-title",
                titleContainer: "toc-title-container",
                content: "toc-content",
                titleCheckbox: "checkbox",
                checkboxCheck: "icon-check-1",
                titleText: "checkbox",
                accountText: "toc-account",
                visible: "toc-visible",
                settingsIcon: "icon-cog",
                settings: "toc-settings",
                actions: "toc-actions",
                account: "toc-account",
                clear: "clear"
            };

            this.toolsDiv = dojo.byId('tools_layers');
            this.iconset = this.toolsDiv.dataset.iconset;
        },

        // start widget. called by user
        startup: function () {
            // map not defined
            if (!this.map) {
                this.destroy();
                console.log("Error: TableOfContents, map required");
            }
            // when map is loaded
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },

        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function () {
            this._removeEvents();
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Public Events */
        /* ---------------- */
        // load
        // toggle
        // expand
        // collapse

        /* ---------------- */
        /* Public Functions */
        /* ---------------- */

        show: function () {
            this.set("visible", true);
        },

        hide: function () {
            this.set("visible", false);
        },

        refresh: function () {
            this._createList();
        },

        /* ----------------- */
        /* Private Functions */
        /* ----------------- */

        _createList: function () {
            var layers = this.layers;
            this._nodes = [];
            // kill events
            this._removeEvents();
            // clear node
            this._layersNode.innerHTML = "";
            domAttr.set(this._layersNode, "role", "list");
            // if we got layers
            if (layers && layers.length) {
                var toolsDiv = dojo.byId('tools_layers');
                //var iconset = toolsDiv.dataset.iconset;
                if(this.defaults.hasLegend) {
                    var expandCollapseLegends = domConstruct.create('img', {
                        id: 'expandCollapseLegends',
                        src: 'images/icons_' + this.iconset + '/legend.png',
                        alt: 'Legend',
                        role: 'button',
                        tabindex:0,
                        style:'width:20px; height:20px;',
                        title: "Expand or Collapse Legends"
                    },toolsDiv);
                    on(expandCollapseLegends, 'click', lang.hitch(this, function(evt) {
                        var flippers = dojo.query('.cbLegend');
                        if(flippers && flippers.length>0) {
                            var action = !flippers[0].checked;
                            for(var i=0; i<flippers.length; i++) {
                                var label = dojo.query('label[for="'+flippers[i].id+'"]')[0];
                                if(domStyle.get(label ,'display') !== 'none')
                                    flippers[i].checked = action;
                                else 
                                    flippers[i].checked = false;
                            }
                        }
                    }));
                }

                if(this.defaults.hasFeatureTable) {
                    var tableCloseNode = domConstruct.create("input",{
                        type:"radio",
                        name:"showFeatureTable",
                        //value:layer.id,
                        class:"tableRadio",
                        id:"radio_tableClose",
                        style:"display:none;",
                    }, toolsDiv);
                    tableCloseNode.checked= true;
                    on(tableCloseNode, "change", lang.hitch(this, this._layerShowTableChanged));

                    var closeTableBtn = domConstruct.create("img", {
                        id: 'radio_tableCloseImg',
                        src: 'images/icons_' + this.iconset + '/tableClose.png',
                        alt:'Close Feature Table',
                        role: "button",
                        tabindex:0,
                        title: 'Close Feature Table',
                    }, domConstruct.create("label",{
                        for:"radio_tableClose",
                    },toolsDiv));
                }

                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];

                    // ceckbox class
                    var titleCheckBoxClass = this.css.titleCheckbox;
                    // layer class
                    var layerClass = this.css.layer;
                    // first layer
                    if (i === (layers.length - 1)) {
                        layerClass += " ";
                        layerClass += this.css.firstLayer;
                    }
                    if (layer.visibility) {
                        layerClass += " ";
                        layerClass += this.css.visible;
                        titleCheckBoxClass += " ";
                        titleCheckBoxClass += this.css.checkboxCheck;
                    }

                    // layer node
                    var layerDiv = domConstruct.create("div", {
                        className: layerClass,
                        role: "listitem",
                    });
                    domConstruct.place(layerDiv, this._layersNode, "first");

                    // title of layer
                    var titleDiv = domConstruct.create("div", {
                        className: this.css.title,
                    }, layerDiv);
                    
                    // title container
                    var titleContainerDiv = domConstruct.create("div", {
                        className: this.css.titleContainer,
                        tabindex: -1,
                    }, titleDiv);
                    
                    titleCheckbox = domConstruct.create("input", 
                    {
                        id: "layer_ck_"+i,
                        className: titleCheckBoxClass, 
                        type: "checkbox",
                        tabindex: 0,
                        checked: layer.visibility,
                    }, titleContainerDiv);

                    var titleText = domConstruct.create("div", {
                        className: this.css.titleText,
                        title : layer.title,
                        // role: "presentation",
                        // tabindex:0,
                    }, titleContainerDiv);

                    domConstruct.create('label',{
                        for: 'layer_ck_'+i,
                        class: 'labelText',
                        tabindex: 0,
                        innerHTML: layer.title
                    }, titleText);

                    this._atachSpaceKey(titleContainerDiv, titleCheckbox);

                    var accountText = '';
                    if (layer.account) {
                        accountText = domConstruct.create("a", {
                            className: this.css.accountText,
                            id: layer.account
                        }, titleText);
                    }

                    if(this.defaults.hasFeatureTable) {
                        settingsDiv = domConstruct.create("div", {
                            className: "toc-settings",
                            //id: layer.settings
                        }, titleText);//titleContainerDiv);

                        if(layer.layerType === "VectorTileLayer")
                        {
                            domConstruct.create("img", {
                                src: 'images/icons_black/VectorTiles.png',
                                class: 'VectorTilesBtn',
                                alt:'Vector Tiles',
                                //role: "button",
                                //tabindex:0,
                                title: 'Vector Tiles',
                            }, settingsDiv);

                        }
                        else 
                        {
                            var tableNode = domConstruct.create("input",{
                                type:"radio",
                                name:"showFeatureTable",
                                value:layer.id,
                                class:"tableRadio",
                                id:"radio_"+layer.id,
                                style:"display:none;",
                            }, settingsDiv);
                            on(tableNode, "change", lang.hitch(this, this._layerShowTableChanged));

                            domConstruct.create("img", {
                                src: 'images/table.18.png',
                                class: 'tableBtn',
                                alt:'Table',
                                role: "button",
                                tabindex:0,
                                title: 'Feature Table',
                            }, domConstruct.create("label",{
                                for:"radio_"+layer.id,
                            },settingsDiv));
                        }
                    }

                    // settings
                    var settingsDiv, settingsIcon;
                    if (layer.layerObject && dojo.exists("settings", layer) && layer.layerObject.isEditable()) 
                    { 
                        settingsIcon = domConstruct.create("img", {
                            'src' : 'images/icon-cog.png',
                            alt:'Configuration',
                            role: "button",
                            tabindex:0,
                        }, settingsDiv);
                    }

                    // // clear css
                    // var clearCSS = domConstruct.create("div", {
                    //     className: this.css.clear
                    // }, titleContainerDiv);

                    // legend ?
                    if(this.defaults.hasLegend && this._showLegend(layer)) {
                        var divWrapLegend = domConstruct.create('div', {
                            class:'showLegendBtn',
                            title:'Show Legend',
                            tabindex:0
                        },
                        titleContainerDiv);

                        domConstruct.create('input',{
                            type:'checkbox',
                            id: 'cbLegend_'+layer.id,
                            class: 'cbLegend',
                        }, divWrapLegend);
                        

                        var expandLegendBtn = domConstruct.create('label',{
                            for: 'cbLegend_'+layer.id,
                            class: 'cbLegendLabel',
                        }, divWrapLegend);
                        domConstruct.create('img',{
                            src:'images/icons_black/down.png',
                            alt:'Show Legend',
                            class: 'flipper',
                            tabindex: 0,
                        }, expandLegendBtn);

                        var slider = domConstruct.create('input', {
                            type:'range',
                            class:'layerOpacitySlider',
                            value:100,
                            'data-layerid':layer.id,
                            title:'Opacity',
                        });
                        dojo.place(slider, expandLegendBtn, 'after');
                        on(slider, 'change', lang.hitch(this, this._layerSliderChanged));

                        var legend = new Legend({
                            map: this.map,
                            layerInfos: [{
                                defaultSymbol:true,
                                layer: layer.layerObject
                            }],
                        }, domConstruct.create("div", {
                            role:'application', 
                            class:'legend',
                        }, divWrapLegend));//titleContainerDiv));
                        legend.startup();
                    }
                    
                    // lets save all the nodes for events
                    var nodesObj = {
                        checkbox: titleCheckbox,
                        title: titleDiv,
                        titleContainer: titleContainerDiv,
                        titleText: titleText,
                        accountText: accountText,
                        settingsIcon: settingsIcon,
                        settingsDiv: settingsDiv,
                        layer: layerDiv
                    };
                    this._nodes.push(nodesObj);
                    // create click event
                    this._checkboxEvent(i);
                }
                this._setLayerEvents();
            }


            this.baseMap = this.dataItems.baseMap;
            if(this.baseMap) {

                var titleBaseCheckBoxClass = this.css.titleCheckbox;
                // layer class
                var layerBaseClass = this.css.layer;
                // first layer
                if (this.baseMap.visibility) {
                    layerBaseClass += " ";
                    layerBaseClass += this.css.visible;
                    titleBaseCheckBoxClass += " ";
                    titleBaseCheckBoxClass += this.css.checkboxCheck;
                }

                // layer node
                var layerBaseDiv = domConstruct.create("div", {
                    id:'layerBaseDiv',
                    className: layerBaseClass,
                    role: "listitem",
                    style:"background-color: silver;"
                });
                domConstruct.place(layerBaseDiv, this._layersNode, "last");

                // title of layer
                var titleBaseDiv = domConstruct.create("div", {
                    className: this.css.title,
                }, layerBaseDiv);
                
                // title container
                var titleBaseContainerDiv = domConstruct.create("div", {
                    className: this.css.titleContainer,
                    tabindex: -1,
                }, titleBaseDiv);
                
                var titleCheckbox = domConstruct.create("input", 
                {
                    id: "layer_ck_baseMap",
                    className: titleBaseCheckBoxClass, 
                    type: "checkbox",
                    tabindex: 0,
                    checked: this.baseMap.baseMapLayers[0].visibility,
                }, titleBaseContainerDiv);

                var titleBaseText = domConstruct.create("div", {
                    className: this.css.titleText,
                    title : "BaseMap: "+this.baseMap.title,
                    // role: "presentation",
                    // tabindex:0,
                }, titleBaseContainerDiv);

                var baseMapLabel = domConstruct.create('label',{
                    for: 'layer_ck_baseMap',
                    class: 'labelText',
                    style: 'font-style: italic;',
                    tabindex: 0,
                    innerHTML: this.baseMap.title
                }, titleBaseText);

                on(baseMapLabel, "click", lang.hitch(this, 
                    function (evt) {
                        var cb = dojo.byId('layer_ck_baseMap');
                        var action = !cb.checked;
                        for(var ib=0; ib<this.baseMap.baseMapLayers.length; ib++) {
                            this.baseMap.baseMapLayers[ib].layerObject.setVisibility(action);
                        }
                }));

                domConstruct.create('input',{
                    type:'checkbox',
                    id: 'cbBasemapGallery',
                    class: 'cbLegend',
                }, titleBaseContainerDiv);
                var expandBasemapGallery = domConstruct.create('label',{
                    for: 'cbBasemapGallery',
                    class: 'cbLegendLabel showLegendBtn',
                }, titleBaseContainerDiv);
                domConstruct.create('img',{
                    src:'images/icons_black/down.png',
                    alt:'Show BasemapGallery',
                    class: 'flipper',
                    tabindex: 0,
                }, expandBasemapGallery);

                var basemapSlider = domConstruct.create('input', {
                    type:'range',
                    class:'layerOpacitySlider',
                    value:100,
                    //'data-layerid':layer.id,
                    title:'Opacity',
                    style: 'display:none; top: auto; margin: -10px 0 0 0; background-color: transparent;',
                }, layerBaseDiv);

                on(cbBasemapGallery, 'click', lang.hitch(basemapSlider, function(evt) {
                    var expand = evt.target.checked;
                    domStyle.set(this, 'display', expand?'inherit':'none');
                }));

                on(titleCheckbox, 'click', lang.hitch(cbBasemapGallery, function(evt) {
                    var expand = evt.target.checked;
                    if(!expand && this.checked) {
                        this.click();
                    }
                    domStyle.set(this.labels[0], 'display', expand?'inherit':'none');
                }));

                if(this.defaults.hasBasemapGallery) {

                    var divWrapBaseMapGallery = domConstruct.create('div', {
                        class:'showLegendBtn',
                        title:'Show Legend',
                        tabindex:0
                    },
                    layerBaseDiv);

                    var baseMapDiv = domConstruct.create('div', {
                        id : 'baseMapDiv',
                        style: 'display:none;'
                    }, layerBaseDiv);

                    on(cbBasemapGallery, 'click', lang.hitch(baseMapDiv, function(evt) {
                        //console.log(this, evt);
                        var expand = evt.target.checked;
                        domStyle.set(this, 'display', expand?'inherit':'none');
                    }));

                    //on(slider, 'change', lang.hitch(this, this._layerSliderChanged));


                    var basemapGallery = new ShowBasemapGallery({
                        map: this.map,
                        basemapHost:{
                            sharinghost:'',
                            basemapgroup:'',
                        },
                        initialMap: this.baseMap,
                    }, baseMapDiv);
                    basemapGallery.startup();

                }
            }
        },

        _showLegend : function(layer) {
            for(var il=0; il < this.defaults.layers.length; il++) {
                if(this.defaults.layers[il].id === layer.id && 
                    (!layer.hasOwnProperty("showLegend") || layer.showLegend))
                    return true;
            }
            return false;
        },

        _layerSliderChanged: function(evt) {
            for(var il=0; il < this.defaults.layers.length; il++) {
                var layer = this.defaults.layers[il];
                if(layer.id === evt.target.dataset.layerid) {
                    //console.log(evt.target.value, layer, evt);
                    layer.layerObject.setOpacity(evt.target.value / 100.0);
                    break;
                }
            }
        },

        _layerShowTableChanged: function(arg)  {
            //var checked = arg.currentTarget.checked;
            console.log(arg);
            var tableCloseImg = dojo.byId('radio_tableCloseImg');
            var toolsDiv = dojo.byId('tools_layers');
            //var iconset = toolsDiv.dataset.iconset;
        
            //if(checked) {
            if(arg.target.id !== 'radio_tableClose') {
                var layerId = arg.currentTarget.defaultValue;
                for(var i = 0, m = null; i < this.layers.length; ++i) {
                    if(this.layers[i].id === layerId) {
                        if(this.featureTable) {
                            this.featureTable.destroy();
                            domConstruct.create("div", { id: 'featureTableNode'}, dojo.byId('featureTableContainer'));
                        }
                        this.featureTable.loadTable(this.layers[i]);

                        this.showBadge(true);

                        tableCloseImg.src = 'images/icons_' + this.iconset + '/tableClose.red.png';
                        break;
                    }
                }
            }
            else {
                tableCloseImg.src = 'images/icons_' + this.iconset + '/tableClose.png';

                this.featureTable.destroy();
            }
        },

        _atachSpaceKey: function(onButton, clickButton) {
            on(onButton, 'keyup', lang.hitch(clickButton, function(event){
                if(event.keyCode=='32')
                    this.click();
            }));
        },

        _refreshLayers: function () {
            this.refresh();
        },

        _removeEvents: function () {
            var i;
            // checkbox click events
            if (this._checkEvents && this._checkEvents.length) {
                for (i = 0; i < this._checkEvents.length; i++) {
                    this._checkEvents[i].remove();
                }
            }
            // layer visibility events
            if (this._layerEvents && this._layerEvents.length) {
                for (i = 0; i < this._layerEvents.length; i++) {
                    this._layerEvents[i].remove();
                }
            }
            this._checkEvents = [];
            this._layerEvents = [];
        },

        _toggleVisible: function (index, visible) {
            // update checkbox and layer visibility classes
            domClass.toggle(this._nodes[index].layer, this.css.visible, visible);
            domClass.toggle(this._nodes[index].checkbox, this.css.checkboxCheck, visible);
            
            this.emit("toggle", {
                index: index,
                visible: visible
            });

            if(visible) {
                domAttr.set(this._nodes[index].checkbox, "checked", "checked");
            }
            else {
                domAttr.set(this._nodes[index].checkbox, "checked", "");
            }
        },

        _layerEvent: function (layer, index) {
            // layer visibility changes
            var visChange = on(layer, "visibility-change", lang.hitch(this, function (evt) {
                // update checkbox and layer visibility classes
                this._toggleVisible(index, evt.visible);
            }));
            this._layerEvents.push(visChange);
        },

        _featureCollectionVisible: function (layer, index, visible) {
            // all layers either visible or not
            var equal;
            // feature collection layers turned on by default
            var visibleLayers = layer.visibleLayers;
            // feature collection layers
            var layers = layer.featureCollection.layers;
            // if we have layers set
            if (visibleLayers && visibleLayers.length) {
                // check if all layers have same visibility
                equal = array.every(visibleLayers, function (item) {
                    // check if current layer has same as first layer
                    return layers[item].layerObject.visible === visible;
                });
            }
            else {
                // check if all layers have same visibility
                equal = array.every(layers, function (item) {
                    // check if current layer has same as first layer
                    return item.layerObject.visible === visible;
                });
            }
            // all are the same
            if (equal) {
                this._toggleVisible(index, visible);
            }
        },

        _createFeatureLayerEvent: function (layer, index, i) {
            var layers = layer.featureCollection.layers;
            // layer visibility changes
            var visChange = on(layers[i].layerObject, "visibility-change", lang.hitch(this, function (evt) {
                var visible = evt.visible;
                this._featureCollectionVisible(layer, index, visible);
            }));
            this._layerEvents.push(visChange);
        },

        _featureLayerEvent: function (layer, index) {
            // feature collection layers
            var layers = layer.featureCollection.layers;
            if (layers && layers.length) {
                // make event for each layer
                for (var i = 0; i < layers.length; i++) {
                    this._createFeatureLayerEvent(layer, index, i);
                }
            }
        },

        _setLayerEvents: function () {
            // this function sets up all the events for layers
            var layers = this.get("layers");
            var layerObject;
            if (layers && layers.length) {
                // get all layers
                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];
                    // if it is a feature collection with layers
                    if (layer.featureCollection && layer.featureCollection.layers && layer.featureCollection.layers.length) {
                        this._featureLayerEvent(layer, i);
                    } else {
                        // 1 layer object
                        layerObject = layer.layerObject;
                        this._layerEvent(layerObject, i);
                    }
                }
            }
        },

        _toggleLayer: function (layerIndex) {
            // all layers
            if (this.layers && this.layers.length) {
                var newVis;
                var layer = this.layers[layerIndex];
                var layerObject = layer.layerObject;
                var featureCollection = layer.featureCollection;
                var visibleLayers;
                var i;
                if (featureCollection) {
                    // visible feature layers
                    visibleLayers = layer.visibleLayers;
                    // new visibility
                    newVis = !layer.visibility;
                    // set visibility for layer reference
                    layer.visibility = newVis;
                    // toggle all feature collection layers
                    if (visibleLayers && visibleLayers.length) {
                        // toggle visible sub layers
                        for (i = 0; i < visibleLayers.length; i++) {
                            layerObject = featureCollection.layers[visibleLayers[i]].layerObject;
                            // toggle to new visibility
                            layerObject.setVisibility(newVis);
                        }
                    }
                    else {
                        // toggle all sub layers
                        for (i = 0; i < featureCollection.layers.length; i++) {
                            layerObject = featureCollection.layers[i].layerObject;
                            // toggle to new visibility
                            layerObject.setVisibility(newVis);
                        }
                    }
                } else if (layerObject) {
                    newVis = !layer.layerObject.visible;
                    layer.visibility = newVis;
                    layerObject.setVisibility(newVis);
                }
            }
        },

        _checkboxEvent: function (index) {
            // when checkbox is clicked
            var checkEvent = on(this._nodes[index].checkbox, "click", lang.hitch(this, 
                function (evt) {
                // toggle layer visibility
                this._toggleLayer(index);
                //event.stop(evt);
            }));
            this._checkEvents.push(checkEvent);
        },

        _init: function () {
            this._visible();
            this._createList();

            if(this.defaults.hasFeatureTable) {
                var ft = new ShowFeatureTable({
                    map: this.map,
                }, this.defaults.mapNode);
                ft.startup();
                this.featureTable = ft;
                on(ft, "destroy", lang.hitch(this, function(evt) {
                    dojo.byId('radio_tableClose').click();
                }));
                on(ft, "destroied", lang.hitch(this, function(evt) {
                    this.showBadge(false);
                }));
            }

            this.set("loaded", true);
            this.emit("load", {});
        },

        _updateThemeWatch: function () {
            var oldVal = arguments[1];
            var newVal = arguments[2];
            domClass.remove(this.domNode, oldVal);
            domClass.add(this.domNode, newVal);
        },

        _visible: function () {
            if (this.get("visible")) {
                domStyle.set(this.domNode, "display", "block");
            } else {
                domStyle.set(this.domNode, "display", "none");
            }
        },

        showBadge: function(show) {
            var indicator = dojo.byId('badge_featureTableSelected'); // !
            if (show) {
                domStyle.set(indicator,'display','');
                // domAttr.set(indicator, "title", i18n.widgets.featureList.featureSelected);
                // domAttr.set(indicator, "alt", i18n.widgets.featureList.featureSelected);
            } else {
                domStyle.set(indicator,'display','none');
            }
        },    

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.TableOfContents", Widget, esriNS);
    }
    return Widget;
});