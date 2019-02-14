/****************************************************************************
    fcoo-settings-edit.js,

    (c) 2016, FCOO

    https://github.com/FCOO/fcoo-settings
    https://github.com/FCOO

    Methods for editing the settings

    This packages create a modal window using jquery-bootstrap to edit
    the settings.
    The contwent of the modal window is devided into accordions - each for each of the
    global events in fcoo-global-events

    A method fcoo.settings.addModalContent(id, content) is created and is used by different
    packages to add content to edit the settings

    The id of the global-evnts are given as const:
    fcoo.events.LANGUAGECHANGED
    fcoo.events.DATETIMEFORMATCHANGED
    fcoo.events.NUMBERFORMATCHANGED
    fcoo.events.LATLNGFORMATCHANGED
    fcoo.events.UNITCHANGED


****************************************************************************/

(function ($, window/*, document, undefined*/) {
    "use strict";

    //Create fcoo.settings-namespace
    window.fcoo = window.fcoo || {};
    var ns = window.fcoo.settings = window.fcoo.settings || {};

    ns.modalContent = {};
    ns.settingsId = [];

    var originalData = {};

    /*****************************************************
    fcoo.settings.addModalContent(id, content)
    *****************************************************/
    ns.addModalContent = function(globalEventId, content){
        ns.modalContent[globalEventId] = ns.modalContent[globalEventId] || [];

        content = $.isArray(content) ? content : [content];
        $.each( content, function( index, cont ){ ns.settingsId.push( cont.id ); });

        ns.modalContent[globalEventId] = ns.modalContent[globalEventId].concat( content );
    };


    /*****************************************************
    fcoo.settings.edit(id)
    Create and display the modal window with setting
    If id is given the corresponding accordion is open
    *****************************************************/
    ns.edit = function( id ){

        //Create the modal
        if (!ns.modalForm){
            var list = [];
            $.each(
                [
                    {id: window.fcoo.events.LANGUAGECHANGED,       header: {icon: 'fa-fw fa-comments',       text: {da: 'Sprog', en: 'Language'}} },
                    {id: window.fcoo.events.DATETIMEFORMATCHANGED, header: {icon: 'fa-fw fa-calendar-alt',   text: {da: 'Tidszone, Dato og Tid', en: 'Time Zone, Date, and Time'}} },
                    {id: window.fcoo.events.NUMBERFORMATCHANGED,   header: {                                 text: ['12',{da: 'Talformat', en: 'Number Format'}]} },
                    {id: window.fcoo.events.LATLNGFORMATCHANGED,   header: {icon: 'fa-fw fa-map-marker-alt', text: {da: 'Positioner', en: 'Positions'}} },
                    {id: window.fcoo.events.UNITCHANGED,           header: {icon: 'fa-fw fa-ruler',          text: {da: 'Enheder', en: 'Units'}} }
                ],
                function(index, accordInfo){
                    if (ns.modalContent[accordInfo.id] && ns.modalContent[accordInfo.id].length)
                        list.push({id: accordInfo.id, header: accordInfo.header, content: ns.modalContent[accordInfo.id]});
                }
            );

            ns.modalForm = $.bsModalForm({
                id     : 'fcoo-settings',
                show   : false,
                header : {icon: 'fa-cog', text: {da: 'Indstillinger', en:'Settings'}},
                content: {type: 'accordion', list: list },
                onSubmit: function( data ){
                    $.each(data, function(id, value){
                        if (value != originalData[id])
                            ns.set(id, value);
                    });
                }
            });
        }

        //Get data and save data
        originalData = {};
        $.each(ns.settingsId, function( index, id ){ originalData[id] = ns.get(id); });

        //Open accordion with id
        if (id)
            ns.modalForm.$bsModal.find('form > .accordion').bsOpenCard(id);

        ns.modalForm.edit(originalData);
    };



}(jQuery, this, document));
;
/****************************************************************************
    fcoo-settings.js, 

    (c) 2016, FCOO

    https://github.com/FCOO/fcoo-settings
    https://github.com/FCOO

****************************************************************************/

(function ($, window, document, undefined) {
    "use strict";
    
    //Create fcoo.settings-namespace
    window.fcoo = window.fcoo || {};
    var ns = window.fcoo.settings = window.fcoo.settings || {};

    var settings       = {},
        loadedValues   = {},
        queryValues    = {}, //values set in the url
        storageIdSave  = 'fcoo_settings',
        storageIdForce = 'fcoo_settings_FORCE';

        //Get query settings            
        try { 
            queryValues = JSON.parse( window.Url.queryString('settings') ); 
        }
        catch (e) { 
            queryValues = {}; 
        }

    /**********************************
    Setting( options )
    options = {id, validator, applyFunc, defaultValue, globalEvents )
    id [String]
    validator [null] | [String] | [function( value)]. If [String] => using Url.js-extensions validation
    applyFunc [function( value, id, defaultValue )] function to apply the settings for id
    defaultValue 
    globalEvents {String} = Id of global-events in fcoo.events that aare fired when the setting is changed
    onError [function( value, id )] (optional). Called if a new value is invalid according to validator
    **********************************/
    function Setting( options ) {
        this.options = options;
        this.options.applyFunc = options.applyFunc || function(){};
        this.value = null;
        this.saveValue = null;
        if ((this.options.defaultValue === undefined) && (typeof this.options.validator == 'string') )
            //Try to set default value based on the validator
            switch (this.options.validator){
                case 'BOOLEAN': this.options.defaultValue = false;  break;
                case 'NUMBER' : this.options.defaultValue = 0;      break;
            }
    }

    ns.Setting = Setting;

    //Extend the prototype
    ns.Setting.prototype = {
        apply:  function ( newValue, dontCallApplyFunc ){ 
                    var id = this.options.id;
                    newValue = (newValue === undefined) ? this.options.defaultValue : newValue;

                    if ( !window.Url.validateValue(''+newValue, this.options.validator) ){ 
                        if (this.options.onError)
                            this.options.onError( newValue, id );
                        newValue = this.options.defaultValue;
                    }
                    
                    this.value = newValue;

                    //Set saveValue = newValue unless it is the value from query-string
                    if ((queryValues[id] === null) || (newValue != queryValues[id]))
                        this.saveValue = newValue;
                    queryValues[id] = null;

                    if (!dontCallApplyFunc)
                        this.options.applyFunc( this.value, id, this.options.defaultValue );

                    //Fire global-events (if any)
                    if (this.options.globalEvents && window.fcoo.events && window.fcoo.events.fire)
                        window.fcoo.events.fire( this.options.globalEvents, id, this.value );

                }    
    };    

    /**********************************
    add( options )
    options = {id, validator, applyFunc, defaultValue, globalEvents )
    id [String]
    validator [null] | [String] | [function( value)]. If [String] = 
    defaultValue 
    **********************************/
    ns.add = function( options ){
        options = $.extend( {}, { callApply: true }, options );
        var setting = new ns.Setting( options );
        settings[options.id] = setting;
        setting.apply( loadedValues[setting.options.id], !options.callApply );                       
    };
    
    /**********************************
    set( id, value, reload )
    id [String]
    value [any]
    reload [Boolean] 
    **********************************/
    ns.set = function( id, value, reload ){
        var setting = settings[id];
        if (!setting)
          return false;

        //Use saved value if 'value' isn't given
        value = value === undefined ? this.get( id ) : value;
        setting.apply( value, reload );
        this.save( reload );

        if (reload)
          window.location.reload();
    };
    
    /**********************************
    get( id )
    id [String]
    **********************************/
    ns.get = function( id ){
        var setting = settings[id];
        return setting ? setting.value : undefined;
    };

    /**********************************
    loadFromLocalStorage()
    Load the settings from localStorage 'fcoo-settings'
    **********************************/
    ns.loadFromLocalStorage = function(){
        return JSON.parse( window.localStorage.getItem( storageIdSave ) || '{}' );
    };

    /**********************************
    load()
    Load the settings from
        1) sessionStorage 'fcoo-settings-FORCE', or
        2) Load settings from
            a: url param 'settings
            b: localStorage 'fcoo-settings'
            c: default values
    **********************************/
    ns.load = function(){
        //1) Try loading from storageIdForce 
        var str = window.sessionStorage.getItem( storageIdForce );
        if (str){
            window.sessionStorage.removeItem( storageIdForce );
            loadedValues = JSON.parse( str );
        }
        else {
            //2) Load settings from...
            //a: url param 'settings = queryValues

            //b: localStorage 'fcoo-settings', 
            var savedValues = this.loadFromLocalStorage();

            //c: default values - is set by fcoo.settings.add(...)

            //Combine the new settings
            loadedValues =  $.extend( {}, savedValues, queryValues );
        }

        $.each( settings, function( id, setting ){ 
            setting.apply( loadedValues[id] ); 
        });
    };
    
    /**********************************
    save( toForce, saveStr )
    Save the settings in 
    toForce == false: localStorage 'fcoo-settings'
    toForce == true : sessionStorage 'fcoo-settings-FORCE'

    saveStr (special case) the string to be saved and only when toForce==true
    **********************************/
    ns.save = function( toForce, saveStr ){
        //Save all saveValue from settings
        var settingValuesToSave = this.loadFromLocalStorage();
        $.each( settings, function( id, setting ){ 
            if (setting.saveValue)
                settingValuesToSave[ setting.options.id ] = setting.saveValue;
        });

        if (toForce){
            //Save all settings to sessionStorage 'fcoo-settings-FORCE'
            window.sessionStorage.setItem( storageIdForce, saveStr || JSON.stringify( settingValuesToSave ) );
        }
        else {
            window.localStorage.setItem( storageIdSave, JSON.stringify( settingValuesToSave ) );
        }
    };


    //Load the settings
    ns.load();

    /******************************************
    Initialize/ready 
    *******************************************/
//    $(function() { 
//    }); 

}(jQuery, this, document));