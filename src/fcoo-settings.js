/*****************************************************************************************
    fcoo-settings.js,

    (c) 2016, FCOO

    https://github.com/FCOO/fcoo-settings
    https://github.com/FCOO

    There are two versions of settings:
    A: fcoo.globalSetting: Global settings for all FCOO applications. Eq. language, date-format etc.
    B: fc..appSetting    : Application settings. Specific for each application

    Both type are ccreated as SettingGroup in
    A: fcoo.globalSetting and saved in indexedDB "GLOBAL"
    B: fcoo.appSetting and saved in indexedDB named by sub-directory of the application

    A SettingGroup contains a list of Setting and all values in this.data = {};


    SettingGroup(options)
    options:
        storeId: The id of the indexedDB when saving the data
        data (optional): The initial data to be stored
        simpleMode (BOOLEAN) if true no setting in this.settings are use to store data. New data are set directly in this.data
        autoSave: BOOLEAN - if true the data are saved whenever they are changed. If false the method save() need to be called

        modalHeader: Header for the modal-window used to edit the data
        accordionList: []{id, header} - id and header for the different accordion used to edit the setting-group data.
                                     Content to each accordion are added using method SettingGroup.addModalContent: function(accordionId, content)
        onSubmit: function(newData, originalData) - called after the data was edited. newData = all changed data, originalData = the original version of the data

*****************************************************************************************/

(function ($, window, document, undefined) {
    "use strict";

    //Create fcoo-namespace
    var ns = window.fcoo = window.fcoo || {};

    /***********************************************
    SettingGroup( options )
    ***********************************************/
    function SettingGroup( options ) {
        this.options = options;

        //Create localforage (indexedDB-reader) to save settings
        this.options.storeId =  this.options.storeId ||
                                window.URI().directory().replace(/^\/+|\/+$/g, '') || //directory trimmed from "/"
                                'GLOBAL';
        this.store = window.localforage.createInstance({name: this.options.storeId});

        //this.data = All settings. Each part of this.data is managed by a Setting in this.settings
        this.data = $.extend({}, this.options.data || {});
        this.settings = {};

        //Calls this.beforeeunload when the page is unloaded
        $(window).on('beforeunload', $.proxy(this.beforeunload, this ));

        //** Edit settings in bsModalForm **
        //this.modalContent = {ID}CONTENT for modal-form to edit a part of values from this.data. More than one record in this.data can be edited in one this.modalContent
        this.modalContent = {};

        this.load();
    }
    ns.SettingGroup = SettingGroup;

    //Extend the prototype
    ns.SettingGroup.prototype = {
        /***********************************************
        add( options )
        Create and add a Setting to the list and apply the current data
        options = {id, validator, applyFunc, defaultValue, globalEvents )
        id [String]
        validator [null] | [String] | [function( value)]. If [String] =
        defaultValue
        ***********************************************/
        add: function( options ){
            var _this = this;
            options = $.isArray(options) ? options : [options];
            $.each(options, function(index, settingOptions){
                settingOptions = $.extend( {}, { callApply: true }, settingOptions );
                var setting = new ns.Setting( settingOptions );
                _this.settings[settingOptions.id] = setting;

                //If data is loaded => apply (else wait for data to be loaded)
                if (_this.dataLoaded)
                    setting.apply( _this.data[setting.options.id], !options.callApply );
            });
        },

        /***********************************************
        loadData( id, callback )
        Load data from this.store with item-id = id and callback
        ***********************************************/
        loadData: function(id, callback){
            return this.store.getItem(id || 'DEFAULT')
                       .then(callback);
        },

        /***********************************************
        load( id )
        Load data from this.store with item-id and update (apply) all Setting
        ***********************************************/
        load: function( id ){
            this.dataLoaded = false;
            this.loadData(id, $.proxy(this.onLoad, this));
        },

        /***********************************************
        onLoad( data )
        ***********************************************/
        onLoad: function(data){
            var _this = this;
            $.extend(this.data, data);
            this.dataLoaded = true;

            //Apply data to the Setting
            $.each( this.settings, function( id, setting ){
                setting.apply( _this.data[id] );
            });
        },

        /***********************************************
        save( callback )
        Save the settings in indexedDB
        ***********************************************/
        save: function( data, id, callback ){
            this.set( data );

            //Save all Value from settings
            var dataToSave = this.data;
            $.each( this.settings, function( id, setting ){
                if (setting.value)
                    dataToSave[ setting.options.id ] = setting.value;
            });


            return this.store.setItem(id || 'DEFAULT', dataToSave).then(callback);
        },

        saveAs: function( id, callback ){
            this.save(null, id, callback);
        },

        /***********************************************
        delete( callback )
        Delete the settings in indexedDB
        ***********************************************/
        delete: function(id, callback){
            return this.store.removeItem(id || 'DEFAULT').then(callback);
        },


        /***********************************************
        set( data )
        data {ID:VALUE}
        ***********************************************/
        set: function( data ){
            if (this.options.simpleMode)
                $.extend(this.data, data);
            else {
                var _this = this;
                $.each(data, function(id, value){
                    var setting = _this.settings[id];
                    if (setting){
                        //Use saved value if 'value' isn't given
                        value = value === undefined ? _this.get( id ) : value;
                        setting.apply( value );
                        _this.data[id] = value;
                    }
                });
            }
        },

        /***********************************************
        get( id )
        id [String]
        ***********************************************/
        get: function( id ){
            if (this.options.simpleMode)
                return this.data[id];
            else {
                var setting = this.settings[id];
                return setting ? setting.value : undefined;
            }
        },

        /***********************************************
        beforeunload
        ***********************************************/
        beforeunload: function(){
            if (this.options.autoSave)
                this.save();
        },

        /*****************************************************
        ******************************************************
        Methods for editing setting in a bsModalform
        ******************************************************
        *****************************************************/

        /*****************************************************
        addModalContent(accordionId, content)
        *****************************************************/
        addModalContent: function(accordionId, content){
            this.modalContent[accordionId] = this.modalContent[accordionId] || [];
            content = $.isArray(content) ? content : [content];
            this.modalContent[accordionId] = this.modalContent[accordionId].concat( content );
        },

        /*****************************************************
        edit(id)
        Create and display the modal window with setting
        If id is given the corresponding accordion is open
        data (optional) = special version of the data to be edited
        /*****************************************************/
        edit: function( id, data ){
            //Create the modal
            if (!this.modalForm){
                var _this = this,
                    list  = [];
                $.each(this.options.accordionList, function(index, accordInfo){
                    if (_this.modalContent[accordInfo.id] && _this.modalContent[accordInfo.id].length)
                        list.push({id: accordInfo.id, header: accordInfo.header, content: _this.modalContent[accordInfo.id]});
                });

                this.modalForm = $.bsModalForm({
                    id      : this.options.storeId,
                    show    : false,
                    header  : this.options.modalHeader,
                    content : {type: 'accordion', list: list },

                    onChanging: $.proxy(this.onChanging, this),
                    onCancel  : $.proxy(this.onCancel,   this),
                    onSubmit  : $.proxy(this.onSubmit,   this)
                });
            }

            //Get data and save data
            this.originalData = $.extend({}, this.data);

            //Open accordion with id
            if (id)
                this.modalForm.$bsModal.find('form > .accordion').bsOpenCard(id);

            this.modalForm.edit(data || this.data);
        },

        /*****************************************************
        editData(data)
        /*****************************************************/
        editData: function(data){
            this.edit(null, data);
        },

        /*****************************************************
        onChanging(data)
        /*****************************************************/
        onChanging: function(data){
            var _this = this,
                newData = {};
            //Set data during editing
            $.each(data, function(id, value){
                var setting = _this.settings[id];
                if (setting && setting.options.saveOnChanging && (_this.get(id) != value))
                    newData[id] = value;
            });
            this.set(newData);
        },

        /*****************************************************
        onCancel(data)
        /*****************************************************/
        onCancel: function(){
            var _this = this,
                resetData = {};

            //Reset any setting that was changed during editing
            $.each(this.originalData, function(id, value){
                if (value != _this.get(id))
                    resetData[id] = value;
            });
            this.set(resetData);
        },

        /*****************************************************
        onSubmit(data)
        /*****************************************************/
        onSubmit: function(data){
            var _this = this,
                newData = {},
                changed = false;
            $.each(data, function(id, value){
                if (value != _this.originalData[id]){
                    newData[id] = value;
                    changed = true;
                }
            });
            if (changed){
                if (this.options.autoSave)
                    this.save(newData);
                else
                    this.set(newData);

                if (this.options.onSubmit)
                    this.options.onSubmit(newData, this.originalData);
            }
        }
    };

    /*******************************************************************************
    ********************************************************************************
    Setting( options )
    options = {id, validator, applyFunc, defaultValue, globalEvents )
    id [String]
    validator [null] | [String] | [function( value)]. If [String] => using Url.js-extensions validation
    applyFunc [function( value, id, defaultValue )] function to apply the settings for id
    defaultValue
    globalEvents {String} = Id of global-events in fcoo.events that aare fired when the setting is changed
    onError [function( value, id )] (optional). Called if a new value is invalid according to validator
    saveOnChanging [BOOLEAN]. If true the setting is saved during editing. When false the setting is only saved when edit-form submits
    ********************************************************************************
    ********************************************************************************/
    function Setting( options ) {
        this.options = options;
        this.options.applyFunc = options.applyFunc || function(){};
        this.value = null;

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

            if (!dontCallApplyFunc)
                this.options.applyFunc( this.value, id, this.options.defaultValue );

            //Fire global-events (if any)
            if (this.options.globalEvents && ns.events && ns.events.fire)
                ns.events.fire( this.options.globalEvents, id, this.value );
        }
    };


    /*************************************************************************************
    Create fcoo.globalSetting = setting-group for global (common) settings
    For backward compatibility: Try to load setting-data from localStorage
    *************************************************************************************/
    var localStorageId = 'fcoo_settings',
        localStorageDataStr = window.localStorage.getItem( localStorageId ) || '{}',
        localStorageData;

    try       { localStorageData = JSON.parse( localStorageDataStr ); }
    catch (e) { localStorageData = {}; }

    window.localStorage.removeItem( localStorageId );

    var globalSetting = ns.globalSetting =
        new SettingGroup({
            storeId : 'GLOBAL',
            data    : localStorageData,
            autoSave: true,

            modalHeader: {
                icon: 'fa-cog',
                text: {da: 'Indstillinger', en:'Settings'}
            },
            accordionList: [
                {id: ns.events.LANGUAGECHANGED,       header: {icon: 'fa-fw fa-comments',       text: {da: 'Sprog', en: 'Language'}} },
                {id: ns.events.TIMEZONECHANGED,       header: {icon: 'fa-fw fa-globe',          text: {da: 'Tidszone', en: 'Time Zone'}} },
                {id: ns.events.DATETIMEFORMATCHANGED, header: {icon: 'fa-fw fa-calendar-alt',   text: {da: 'Dato og klokkeslæt', en: 'Date and Time'}} },
                {id: ns.events.LATLNGFORMATCHANGED,   header: {icon: 'fa-fw fa-map-marker-alt', text: {da: 'Positioner', en: 'Positions'}} },
                {id: ns.events.UNITCHANGED,           header: {icon: 'fa-fw fa-ruler',          text: {da: 'Enheder', en: 'Units'}} },
                {id: ns.events.NUMBERFORMATCHANGED,   header: {                                 text: ['12',{da: 'Talformat', en: 'Number Format'}]} },
            ]
        });

    //For backward compatibility:
    $.each(['add', 'set', 'get', 'addModalContent'], function(index, id){
        ns[id] = $.proxy(globalSetting[id], globalSetting);
    });

    /*************************************************************************************
    Create fcoo.appSetting = setting-group for the settings of the application
    *************************************************************************************/
    ns.appSetting =
        new SettingGroup({
            simpleMode: true,
            autoSave  : true,
        });

    /*******************************************************
    Initialize/ready
    ********************************************************/
//    $(function() {
//    });

}(jQuery, this, document));