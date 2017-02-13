define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/window", "dojo/_base/fx", 
    "dojo/_base/html", "dojo/_base/lang", "dojo/has", "dojo/dom", 
    "dojo/dom-class", "dojo/dom-style", "dojo/dom-attr", "dojo/dom-construct", "dojo/dom-geometry", 
    "dojo/on", "dojo/mouse", "dojo/query", "dojo/Deferred"], function (
Evented, declare, win, fx, html, lang, has, dom, 
domClass, domStyle, domAttr, domConstruct, domGeometry, 
on, mouse, query, Deferred) {
    return declare([Evented], {

        map: null,
        tools: [],
        toollist: [],
        curTool: -1,
        scrollTimer: null,
        config: {},
        pTools: null,
        pMenu: null,
        pPages: null,

        constructor: function (config) {
            this.config = config;
        },

        startup: function () {
            var deferred = this._init();
            deferred.then(
                lang.hitch(this, function (config) {
                    // optional ready event to listen to
                    this.emit("ready", config);
                }), 
                lang.hitch(this, function (error) {
                    // optional error event to listen to
                    this.emit("error", error);
            }));
            return deferred;
        },

        _init: function () {
            //Don't need deferred now setting it up just in case
            var deferred;

            deferred = new Deferred();
            this.pTools = dom.byId("panelTools");
            this.pMenu = dom.byId("panelMenu");
            this.pPages = dom.byId("panelPages");
            deferred.resolve();

            this.leftPanel = dom.byId("leftPanel");
            this.leftPanelTop = leftPanel.offsetTop;

            document.body.onresize = this._verticalScrollsResize;

            return deferred.promise;
        },

        //Create a tool and return the div where you can place content
        createTool: function (tool, options) { 
            var settings = lang.mixin({}, {
                badgeName: '',
                badgeIcon: null,
                showLoading: false,
                panelClass: '',
                iconSet: 'white'
            }, options);
            var name = tool.name;

            // add tool
            var refNode = this.pTools;
            var tip = this.config.i18n.tooltips[name] || name;
            var panelTool = domConstruct.create("div", {
                className: "panelTool",
                tabindex: -1,
                id: "toolButton_" + name,
                // "aria-label": tip,
            }, refNode);
            var pTool = domConstruct.create("input", {
                type: "image",
                src: "images/icons_" + this.config.icons + "/" + name + ".png",
                title: tip,
            }, panelTool);

            if (!has("touch")) 
            {
                domAttr.set(pTool, "title", tip);
            }

            if(settings && settings.badgeName !== '') {
                var src = settings.badgeIcon ? settings.badgeIcon :"images/"+settings.badgeName+".png";
                var setIndicator = domConstruct.create("img", {
                    src: src,
                    class:"setIndicator",
                    style:"display:none;",
                    tabindex:0,
                    id: 'badge_'+settings.badgeName,
                    alt:""
                });
                domConstruct.place(setIndicator, panelTool);
            }

            on(pTool, "click", lang.hitch(this, this._toolClick, name));
            this.tools.push(name);

            // add page
            var page = domConstruct.create("div", {
                className: "page hideAttr",
                id: "page_" + name,
                // tabindex: 0
            }, this.pPages);

            var pageContent = domConstruct.create("div", {
                className: "pageContent",
                id: "pageContent_" + name,
                role: "dialog",
                "aria-labelledby": "pagetitle_" + name,
            }, page);

            var pageHeader = domConstruct.create("div", {
                id: "pageHeader_" + name,
                className: "pageHeader fr bg",
                //tabindex: 0,
            }, 
            pageContent);

            domConstruct.create("div", {
                className: "pageResizeTab",
                tabindex: 0,
            }, 
            pageHeader);

            domConstruct.create("h1", {
                className: "pageTitle fc",
                innerHTML: this.config.i18n.tooltips[name] || name,
                style: 'display:inline',
                id: "pagetitle_" + name
            }, pageHeader);

            if(settings.showLoading) {
                domConstruct.create("div", {
                    id: "loading_" + name,
                    class: 'hideLoading small-loading'
                }, pageHeader);
            }

            domConstruct.create('div', {
                class: 'pageHeaderTools',
                id: 'tools_'+name,
                'data-iconset': settings.iconSet
            }, pageHeader);

            var verticalScrollContainer = domConstruct.create('div', {
                class: 'verticalScrollContainer',
            }, pageContent);

            var pageBody = domConstruct.create("div", {
                className: "pageBody",
                tabindex: 0,
                id: "pageBody_" + name,
            }, verticalScrollContainer);

            var h = (document.body.clientHeight - dom.byId("leftPanel").offsetTop - 36) + 'px';
            domStyle.set(verticalScrollContainer, 'max-height', h);

            //var page = query(this.domNode).closest('.pageBody')[0]

            if(settings.panelClass !== '')
                domClass.add(pageBody, settings.panelClass);

            on(this, "updateTool_" + name, lang.hitch(this, function(name) {
                pageBody.focus();
            }));

            return pageBody;
        },

       _toolClick: function (name) {
            
            this._updateMap(); // ! out of place
            var active = false;
            var page = dom.byId("page_"+name);
            var hidden = page.classList.contains("hideAttr");
            var pages = query(".page");
            pages.forEach(function(p){
                if(hidden && p === page) {
                    active = true;
                }
            });

            pages.forEach(function(p){
                if(hidden && p === page) {
                    domClass.replace(p, "showAttr","hideAttr");
                } else {
                    domClass.replace(p,"hideAttr","showAttr");
                }
            });
            var tool = dom.byId("toolButton_"+name);
            var tools = query(".panelTool");           
            this.emit("updateTool", name);
            tools.forEach(lang.hitch(this, function(t){
                if(active && t === tool) {
                    domClass.add(t, "panelToolActive");
                    this.emit("updateTool_"+name);
                } else {
                    domClass.remove(t,"panelToolActive");
                }
            }));           

            domStyle.set(dom.byId("panelPages"), "visibility", active?'visible':'collapse');
            domStyle.set(dom.byId("leftPanel"), "display", active?'flex':'none');
        },

        _atachEnterKey: function(onButton, clickButton) {
            on(onButton, 'keydown', lang.hitch(clickButton, function(event){
            if(event.keyCode=='13')
                this.click();
            }));
        },

        _updateMap: function () {
            if (this.map) {
                this.map.resize();
                this.map.reposition();
            }
        },

        _verticalScrollsResize: function() {
            var pageBodyContents = query('.verticalScrollContainer'); 
            var h = (document.body.clientHeight - dom.byId("leftPanel").offsetTop - 36) + 'px';

            pageBodyContents.forEach(lang.hitch(this, function(node) {
                domStyle.set(node, 'max-height', h);
            }));
        },
    });
});
