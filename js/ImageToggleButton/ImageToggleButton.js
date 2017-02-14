define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", 
    "dojo/dom", "esri/kernel", 
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", 
    "dojo/on", "dojo/query", "dijit/registry",
    "dojo/text!application/ImageToggleButton/templates/ImageToggleButton.html", 
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", 
    "dojo/dom-construct", "dojo/_base/event", "esri/lang", 
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, dom, esriNS,
        _WidgetBase, _TemplatedMixin, 
        on, query, registry,
        dijitTemplate,
        domClass, domAttr, domStyle, 
        domConstruct, event, esriLang
    ) {
    var Widget = declare("esri.dijit.ImageToggleButton", [
        _WidgetBase, 
        _TemplatedMixin,
        Evented], {
        templateString: dijitTemplate,
        
        options: {
            // labelText:'My Label',
            // showLabel:false,
            imgSelected: '',
            imgUnselected: '',
            imgClass: '',
            imgSelectedClass: '',
            imgUnselectedClass: '',
            titleSelected: 'Selected',
            titleUnselected: 'Unselected',
        },

        constructor: function (options, srcRefNode) {
            this.defaults = lang.mixin({}, this.options, options);
            this.id = this.defaults.id || dijit.registry.getUniqueId(this.declaredClass);
            this.domNode = srcRefNode;

            var link = document.createElement("link");
            link.href = "js/ImageToggleButton/Templates/ImageToggleButton.css";
            link.type = "text/css";
            link.rel = "stylesheet";
            query('html')[0].appendChild(link);
        },

        startup: function() {
            var cbInput = dojo.byId(this.id+'_cb');
            var cbLabel = dojo.byId(this.id+'_lbl');
            on(cbLabel, 'keydown', function(evt) {
                switch(evt.key) {
                    case " " :
                    case "Enter" :
                        evt.preventDefault();
                        cbInput.click();
                        break;
                }
            });

            on(cbInput, 'change', lang.hitch(this, function(ev) {
                this.emit('change', {checked: cbInput.checked});
            }));
        },

        isChecked : function() {
            return dojo.byId(this.id+'_cb').checked;
        },

    });

    if (has("extend-esri")) {
        lang.setObject("dijit.ShowFeatureTable", Widget, esriNS);
    }
    return Widget;
});
