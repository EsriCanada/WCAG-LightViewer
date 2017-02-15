define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel", 
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on", "dojo/Deferred", 
    "esri/dijit/Legend", "application/ShowFeatureTable/ShowFeatureTable", 
    "application/ShowBasemapGallery/ShowBasemapGallery",
    "application/ImageToggleButton/ImageToggleButton", 
    "dojo/i18n!application/nls/TableOfContents",
    "dojo/text!application/TableOfContents/Templates/TableOfContents.html", 
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event", 
    "dojo/_base/array",
    "esri/symbols/TextSymbol", "esri/renderers/SimpleRenderer", "esri/layers/LabelLayer"
    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, on, Deferred,
        Legend, ShowFeatureTable, ShowBasemapGallery, ImageToggleButton,
        i18n, dijitTemplate, 
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
            mapNode: dojo.byId('mapPlace'),
            toolbar: null
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
                title: "toc-title",
                content: "toc-content",
                checkboxCheck: "icon-check-1",
                accountText: "toc-account",
                settingsIcon: "icon-cog",
                actions: "toc-actions",
                account: "toc-account",
                clear: "clear"
            };

            // this.toolsDiv = dojo.byId('tools_layers');
            // this.iconset = this.toolsDiv.dataset.iconset;
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

            // this._fixLegends();
            
            if(this.defaults.toolbar) {
                on(this.defaults.toolbar, 'updateTool_layers', lang.hitch(this, function(name) {
                    this._fixLegends();
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

        _startTarget: null,
        _dropTarget: null,

        _allowDrop: function (evt) {
            var target = evt.target.closest('.toc-title');
            if(target.id !== this._dropTarget.id)
            {
                this._dropTarget = target;
                //console.log(target.id, this._startTarget, this._dropTarget);
            }
            evt.preventDefault();
        },

        _drag: function(evt) {
            //evt.dataTransfer.setData("text", evt.target.id);
            this._dropTarget = 
            this._startTarget = evt.target.closest('.toc-title');
            //console.log(evt.target, this._startTarget);
            var bar = dojo.query('.dragabble', evt.target)[0];
            if(bar) {
                if(bar.setActive) {
                    bar.setActive();
                }
                else if(bar.focus) {
                    bar.focus();
                }
            }
            else {
                evt.preventDefault();
            }
            //console.log(this, evt);
        },

        _getLayerPosition:function(layer) {
            var layers = dojo.query('.toc-title', dojo.byId('pageBody_layers'));
            var layersIds = layers.map(function(l) {return l.id;});
            for(var i=0; i<layers.length; i++) {
                if(layers[i].id === layer.id) {
                    return i;
                }
            }
            return -1;
        },
        _drop: function (evt) {
            var indexStart = this._getLayerPosition(this._startTarget);
            var indexDrop = this._getLayerPosition(this._dropTarget);
            dojo.place(this._startTarget, this._dropTarget, indexStart<indexDrop?"after":"before");
            this.map.reorderLayer(this._startTarget.dataset.layerid, indexDrop);
            this._dropTarget = null;
            evt.preventDefault();
        },

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

                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];

                    // ceckbox class
                    var titleCheckBoxClass = "checkbox";
                    // layer class
                    //var layerClass = "toc-layer";
                    // first layer
                    // if (i === (layers.length - 1)) {
                    //     layerClass += " ";
                    //     layerClass += this.css.firstLayer;
                    // }
                    // if (layer.visibility) {
                    //     layerClass += " ";
                    //     layerClass += this.css.visible;
                    //     titleCheckBoxClass += " ";
                    //     titleCheckBoxClass += this.css.checkboxCheck;
                    // }

                    // layer node
                    var layerDiv = domConstruct.create("div", {
                        className: "toc-layer",
                        role: "listitem",
                    });
                    domConstruct.place(layerDiv, this._layersNode, "first");

                    // title of layer
                    var titleDiv = domConstruct.create("div", {
                        className: 'toc-title',
                        id: 'tocTitle_'+i,
                        'data-layerid': layer.id,
                    }, layerDiv);
                    
                    // title container
                    var titleContainerDiv = domConstruct.create("div", {
                        className: "toc-title-container",
                        tabindex: -1,
                        draggable: true,
                        id: 'titleContainerDiv_'+i,
                    }, titleDiv);
                    on(titleContainerDiv, 'dragstart', lang.hitch(this, this._drag));
                    //on(titleContainerDiv, 'dragover', lang.hitch(this, this._allowDrop));
                    on(titleContainerDiv, 'dragover', lang.hitch(this, this._allowDrop));
                    on(titleContainerDiv, 'dragend', lang.hitch(this, this._drop));
                    
                    var titleText = domConstruct.create("div", {
                        className: "checkbox",
                        title : layer.title,
                        // role: "presentation",
                        // tabindex:0,
                    }, titleContainerDiv);

                    var layerHandleDiv = domConstruct.create("div", {
                        className: 'dragabble',
                        //draggable: true,
                        title: i18n.widgets.tableOfContents.dragLayer,//"Drag to change layers' order, or\nclick and use up/down arrow keys.",
                        tabindex:0,
                    }, titleText);

                    var titleCheckbox = domConstruct.create("input", 
                    {
                        id: "layer_ck_"+i,
                        className: titleCheckBoxClass, 
                        type: "checkbox",
                        tabindex: 0,
                        checked: layer.visibility,
                    }, titleText);

                    domConstruct.create('label',{
                        for: 'layer_ck_'+i,
                        class: 'labelText',
                        tabindex: 0,
                        innerHTML: layer.title
                    }, titleText);

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
                            var cbShowTable = new ImageToggleButton({
                                imgSelected: 'images/icons_black/TableClose.Red.png',
                                imgUnselected: 'images/table.18.png',
                                value: layer.id,
                                class: 'cbShowTable',
                                imgClass: 'tableBtn',
                                titleSelected: i18n.widgets.tableOfContents.hideFeatureTable,
                                titleUnselected: i18n.widgets.tableOfContents.showFeatureTable,
                            }, domConstruct.create('div',{}, settingsDiv));
                            cbShowTable.startup();
                            on(cbShowTable, 'change', lang.hitch(this, this._layerShowTable));
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
                            title: i18n.widgets.tableOfContents.showLegend,
                            id:'legendBtn_'+i,
                            tabindex:0
                        },
                        titleDiv);

                        var expandLegendBtn = domConstruct.create('input',{
                            type:'checkbox',
                            id: 'cbLegend_'+i,
                            class: 'cbLegend',
                        }, divWrapLegend);
                        
                        var expandLegendLbl = domConstruct.create('label',{
                            for: 'cbLegend_'+i,
                            class: 'cbLegendLabel',
                        }, divWrapLegend);
                        
                        domConstruct.create('img',{
                            src:'images/icons_black/down.png',
                            alt:'Show Legend',
                            class: 'flipper',
                            tabindex: 0,
                        }, expandLegendLbl);

                        on(expandLegendBtn, 'click', lang.hitch(this, this._showHidelayerExpandArea));


                        var layerExpandArea = domConstruct.create('div', {
                            id: 'layerExpandArea_'+i,
                            class: 'layerExpandArea',
                            style: 'display: none;'
                        }, titleDiv);

                        var slider = domConstruct.create('input', {
                            type:'range',
                            class:'layerOpacitySlider',
                            value:100,
                            'data-layerid':layer.id,
                            title: i18n.widgets.tableOfContents.opacity,
                        }, layerExpandArea);
                        //dojo.place(slider, expandLegendBtn, 'after');
                        on(slider, 'input', lang.hitch(this, this._layerSliderChanged));

                        var legendTitle = i18n.widgets.tableOfContents.legendFor+layer.title;
                        var legend = new Legend({
                            map: this.map,
                            layerInfos: [{
                                defaultSymbol:true,
                                layer: layer.layerObject
                            }],
                        }, domConstruct.create("div", {
                            role:'application', 
                            class:'legend',
                            tabindex: 0,
                            title: legendTitle,
                            'aria-label': legendTitle,
                        }, layerExpandArea));
                        legend.startup();

                        on(titleCheckbox, 'click', lang.hitch(this, this._showHidelayerExpandAreaBtn));
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

                    this._checkboxEvent(i);
                }
                this._setLayerEvents();
            }


            this.baseMap = this.dataItems.baseMap;
            if(this.baseMap) {

                var titleBaseCheckBoxClass = "checkbox";

                var layerBaseDiv = domConstruct.create("div", {
                    id:'layerBaseDiv',
                    className: "toc-layer",
                    role: "listitem",
                    style:"background-color: silver;"
                });
                domConstruct.place(layerBaseDiv, this._layersNode, "last");

                // title of layer
                var titleBaseDiv = domConstruct.create("div", {
                    className: this.css.title,
                    style: 'min-height: 24px;',
                }, layerBaseDiv);
                
                // title container
                var titleBaseContainerDiv = domConstruct.create("div", {
                    className: "toc-title-container",
                    tabindex: -1,
                }, titleBaseDiv);
                
                var titleBaseText = domConstruct.create("div", {
                    className: "checkbox",
                    // title:'Show Basemap Gallery',
                    // role: "presentation",
                    // tabindex:0,
                }, titleBaseContainerDiv);

                var titleBasemapCheckbox = domConstruct.create("input", 
                {
                    type: "checkbox",
                    id: "layer_ck_baseMap",
                    className: titleBaseCheckBoxClass, 
                    tabindex: 0,
                    checked: this.baseMap.baseMapLayers[0].visibility,
                }, titleBaseText);

                var baseMapLabel = domConstruct.create('label',{
                    for: 'layer_ck_baseMap',
                    class: 'labelText',
                    style: 'font-style: italic;',
                    tabindex: 0,
                    innerHTML: this.baseMap.title,
                    title : "BaseMap: "+this.baseMap.title,
                }, titleBaseText);

                var divWrapLegend1 = domConstruct.create('div', {
                    class:'showLegendBtn',
                    title:'Show Basemap Gallery',
                    id:'legend1Btn',
                    tabindex:0,
                    style:'margin-left:-4px;'
                },
                titleBaseContainerDiv);

               var cbBasemapGallery = domConstruct.create('input',{
                    type:'checkbox',
                    id: 'cbBasemapGallery',
                    class: 'cbLegend',
                }, legend1Btn);
                var expandBasemapGallery = domConstruct.create('label',{
                    for: 'cbBasemapGallery',
                    class: 'cbLegendLabel showLegendBtn',
                }, legend1Btn);
                domConstruct.create('img',{
                    src:'images/icons_black/down.png',
                    alt:'Show BasemapGallery',
                    class: 'flipper',
                    tabindex: 0,
                }, expandBasemapGallery);

                var hideBasemapArea = domConstruct.create('div', {
                    style:'display:block',
                    class: 'hideBasemapArea',
                }, titleBaseContainerDiv);

                on(titleBasemapCheckbox, "click", lang.hitch(this, function (evt) {
                    var cb = dojo.byId('layer_ck_baseMap');
                    var action = cb.checked;
                    
                    hideBasemapArea.style.display = action?'block':'none';
                    domStyle.set(dojo.byId('legend1Btn'), 'display', action?'table':'none');

                    this.baseMap.setVisibility(action);
                }));

                 on(cbBasemapGallery, 'click', lang.hitch(this, function(evt) {
                    var expand = evt.target.checked;
                    domStyle.set(dojo.byId('showBasemapGallery'), 'display', expand?'inherit':'none');
                }));

                var basemapSlider = domConstruct.create('input', {
                    type:'range',
                    class:'layerOpacitySlider',
                    value:100,
                    //'data-layerid':layer.id,
                    title: i18n.widgets.tableOfContents.baseMapOpacity,
                    style: 'display:none;',
                }, hideBasemapArea);

                on(cbBasemapGallery, 'click', lang.hitch(basemapSlider, function(evt) {
                    var expand = evt.target.checked;
                    domStyle.set(this, 'display', expand?'inherit':'none');
                }));

                on(basemapSlider, 'input', lang.hitch(this, function(ev) {
                    this.baseMap.setOpacity(ev.currentTarget.value/100);
                }));


                if(this.defaults.hasBasemapGallery) {

                    var basemapGallery = new ShowBasemapGallery({
                        map: this.map,
                        basemapHost:{
                            sharinghost:'',
                            basemapgroup:'',
                        },
                        initialMap: this.baseMap,
                    }, hideBasemapArea);
                    basemapGallery.startup();

                    on(basemapGallery, "changed", lang.hitch(this, function(evt) {
                        var newBasemap = evt.newBasemap;
                        baseMapLabel.innerHTML = this.baseMap.title = basemapGallery.getLocalizedMapName(newBasemap.title);

                        this.baseMap = array.filter(Object.values(this.map._layers), function(l) {return l._basemapGalleryLayerType === "basemap";})[0];
                        this.baseMap.setOpacity(basemapSlider.value/100);
                    }));
                }
            }
        },

        _showHidelayerExpandArea : function(evt) {
            var expand = evt.target.checked;
            var id = evt.target.id;
            var thisLabel = dojo.byId('layerExpandArea_'+id.split('_')[1]);
            domStyle.set(dojo.byId(thisLabel), 'display', expand?'inherit':'none');
        },

        _showHidelayerExpandAreaBtn : function(evt) {
            var i = evt.target.id.split('_')[2];
            
            var expand = evt.target.checked;
            domStyle.set(dojo.byId('legendBtn_'+i), 'display', expand?'table':'none');
            
            var ck = dojo.byId('cbLegend_'+i).checked;
            domStyle.set(dojo.byId('layerExpandArea_'+i), 'display', (ck && expand)?'inherit':'none');
        },

        _showLegend : function(layer) {
            for(var il=0; il < this.defaults.layers.length; il++) {
                if(this.defaults.layers[il].id === layer.id && 
                    (!layer.hasOwnProperty("showLegend") || layer.showLegend))
                    return true;
            }
            return false;
        },

        _getLayerById: function(layerid) {
            for(var il=0; il < this.layers.length; il++) {
                var layer = this.defaults.layers[il];
                if(layer.id === layerid) {
                    return layer;
                }
            }
            return null;
        },

        _layerSliderChanged: function(evt) {
            var layer = this._getLayerById(evt.target.dataset.layerid);
            if(layer) {
                layer.layerObject.setOpacity(evt.target.value / 100.0);
            }
        },

        _layerShowTable: function(arg)  {
            var checked = arg.checked;
            if(!checked) {
                this.featureTable.destroy();
                this.showBadge(false);
                return;
            }

            var cbToggleBtns = dojo.query('.cbShowTable .cbToggleBtn');
            array.forEach(cbToggleBtns, function(cb) {
                cb.checked = cb.value === arg.value;
            });

            var layerId = arg.value;
            for(var i = 0, m = null; i < this.layers.length; ++i) {
                if(this.layers[i].id === layerId) {
                    if(this.featureTable) {
                        this.featureTable.destroy();
                        domConstruct.create("div", { id: 'featureTableNode'}, dojo.byId('featureTableContainer'));
                    }
                    this.featureTable.loadTable(this.layers[i]);

                    this.showBadge(true);
                    break;
                }
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
                    var checkedBtns = dojo.query('.TableOfContents .cbShowTable input:checked');
                    array.forEach(checkedBtns, function(checkedBtn) {
                        checkedBtn.click();
                    });
                }));
                on(ft, "destroied", lang.hitch(this, function(evt) {
                    this.showBadge(false);
                }));

                on(this.map, "extent-change", lang.hitch(this, this._fixLegends));
            }

            this.set("loaded", true);
            this.emit("load", {});
        },

        _delay: function(ms) {
            var deferred = new Deferred();
            setTimeout(function() {deferred.resolve(true);}, ms);
            return deferred.promise;
        },

        _fixLegends : function() {
            this._delay(200).then(lang.hitch(this, function() {
            var legends = dojo.query('div.legend');
            array.forEach(legends, lang.hitch(this, function(legend) {
                // domAttr.set(legend, 'tabindex', 0);
                // domAttr.set(legend, 'title', 'Legend');
                // domAttr.set(legend, 'aria-label', 'Legend');

                var tables = legend.querySelectorAll("table");
                array.forEach(tables, function(table) {
                    domAttr.set(table, 'role', "presentation");
                });

                var svgs = legend.querySelectorAll("svg");
                array.forEach(svgs, function(svg) {
                    domAttr.set(svg, 'title', "symbol");
                });

                var LegendServiceLabels = legend.querySelectorAll(".esriLegendServiceLabel");
                array.forEach(LegendServiceLabels, function(LegendServiceLabel) {
                    if (window.getComputedStyle(LegendServiceLabel).display !== 'none')
                    {
                        if(LegendServiceLabel.parentNode && LegendServiceLabel.nodeName !== 'H2') {
                            var h2 = domConstruct.create("h2",{
                                className: LegendServiceLabel.className,
                                innerHTML: LegendServiceLabel.innerHTML,
                                parentNode: LegendServiceLabel.parentNode,
                            });
                            LegendServiceLabel.parentNode.replaceChild(h2, LegendServiceLabel);
                        }

                        domAttr.set(LegendServiceLabel, 'tabindex', 0);
                    }
                });

                var LegendLayers = legend.querySelectorAll(".esriLegendLayer");
                array.forEach(LegendLayers, function(LegendLayer) {
                    //var LegendServiceLists = legend.querySelectorAll(".esriLegendLayer tbody");
                    var LegendServiceList = LegendLayer.querySelector("tbody");

                    domAttr.set(LegendServiceList, "role", "list");

                    array.forEach(LegendServiceList.childNodes, function(item) {
                        domAttr.set(item, "role", "listitem");
                        domAttr.set(item, "tabindex", "0");
                    });
                });

                var LegendLayerImages = legend.querySelectorAll(".esriLegendLayer image");
                array.forEach(LegendLayerImages, function(image) {
                    domAttr.set(image,'alt','');
                });

                var messages = legend.querySelectorAll(".esriLegendMsg");
                array.forEach(messages, function(message) {
                    domAttr.set(message,'tabindex',0);
                });
            }));
        }));
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
                // domAttr.set(indicator, "title", i18n.widgets.tableOfContents.showFeatureTable);
                domAttr.set(indicator, "alt", '');
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