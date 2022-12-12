/*****************************************************************************************
    fcoo-settings.js,

    (c) 2016, FCOO

    https://github.com/FCOO/fcoo-settings
    https://github.com/FCOO

    There are two versions of settings:
    A: fcoo.globalSetting: Global settings for all FCOO applications. Eq. language, date-format etc.
    B: fcoo.appSetting   : Application settings. Specific for each application

    Both type are created as SettingGroup in
    A: fcoo.globalSetting and saved in indexedDB "GLOBAL"
    B: fcoo.appSetting and saved in indexedDB named by sub-directory of the application

    A SettingGroup contains a list of Setting and all values in this.data = {};


    SettingGroup(options)
    options:
        storeId: The id of the indexedDB when saving the data
        data (optional): The initial data to be stored
        simpleMode (BOOLEAN) if true no setting in this.settings are use to store data. New data are set directly in this.data
        autoSave: BOOLEAN - if true the data are saved whenever they are changed. If false the method save() need to be called
//        dontSave: BOOLEAN - if true the data are not saved in indexedDB
        modalHeader: Header for the modal-window used to edit the data
        accordionList: []{id, header} - id and header for the different accordion used to edit the setting-group data.
                                     Content to each accordion are added using method SettingGroup.addModalContent: function(accordionId, content)
        flexWidth : Options for formModal
        onChanging: function(newData, originalData) - called when the data are changed during editing
        onSubmit  : function(newData, originalData) - called after the data was edited. newData = all changed data, originalData = the original version of the data

        reset : NULL, true, false or {
            icon   : STRING
            text   : STRING
            promise: FUNCTION( resolve: function(clossAll:BOOLEAN) ) functions that calls resolve() if all options are to be reset
        }

*****************************************************************************************/

(function ($, window, document, undefined) {
    "use strict";

    //Create fcoo-namespace
    var ns = window.fcoo = window.fcoo || {};

    //Global class-names for icons
    ns.icons = ns.icons || {};
    ns.icons.reset = 'fa fa-arrow-rotate-left';

    //Global texts
    ns.texts = ns.texts || {};
    ns.texts.reset = {da:'Nulstil', en:'Reset'};


    /***********************************************
    SettingGroup( options )
    ***********************************************/
    function SettingGroup( options ) {
        this.options = options;

        //Create localforage (indexedDB-reader) to save settings
        this.options.storeId =  this.options.storeId ||
                                window.URI().directory().replace(/^\/+|\/+$/g, '') || //directory trimmed from "/"
                                'APP';
        if (this.options.dontSave)
            this.firstLoadComplete = true;
        else {
            this.store = window.localforage.createInstance({name: this.options.storeId});
            this.firstLoadComplete = false;
        }

        //this.data = All settings. Each part of this.data is managed by a Setting in this.settings
        this.data = $.extend({}, this.options.data || {});
        this.settings = {};

        //Adjust reset-options
        if (this.options.reset)
            this.options.reset = $.extend({
                icon      : ns.icons.reset,
                text      : ns.texts.reset,
                promise   : function( resolve ){ resolve(); },
                finally   : function(){}
            }, this.options.reset === true ? {} : this.options.reset);

        //Calls this.beforeeunload when the page is unloaded
        $(window).on('beforeunload', $.proxy(this.beforeunload, this ));

        //** Edit settings in bsModalForm **
        //this.modalContent = {ID}CONTENT for modal-form to edit a part of values from this.data. More than one record in this.data can be edited in one this.modalContent
        this.modalContent = {};
        //this.modalFooter = {ID}FOOTER for modal-form to edit a part of values from this.data. More than one record in this.data can be edited in one this.modalContent
        this.modalFooter = {};
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
                setting.group = _this;
                _this.settings[settingOptions.id] = setting;
                setting.apply( _this.data[setting.options.id], !options.callApply );
                _this.data[setting.options.id] = setting.getValue();
            });
        },

        /***********************************************
        loadData( id, callback )
        Load data from this.store with item-id = id and callback
        ***********************************************/
        loadData: function(id, callback){
            return this.store.getItem(id || 'DEFAULT')
                       .then(callback || function(){});
        },

        /***********************************************
        load( id, afterLoad )
        Load data from this.store with item-id and update (apply) all Setting
        ***********************************************/
        load: function( id, afterLoad ){
            this.afterLoad = afterLoad;
            this.loadData(id, $.proxy(this.onLoad, this));
        },

        /***********************************************
        onLoad( data )
        ***********************************************/
        onLoad: function(data){
            data = data || {};
            $.extend(this.data, data);

            //Apply data to the Setting
            $.each( this.settings, function( id, setting ){
                setting.apply( data[id] );
            });
            if (this.afterLoad){
                this.afterLoad(this);
                this.afterLoad = null;
            }
            this.firstLoadComplete = true;
        },

        /***********************************************
        save( callback )
        Save the settings in indexedDB
        ***********************************************/
        save: function( data, id, callback ){
            //Prevent saving before loading is finish
            if (!this.firstLoadComplete)
                return;

            this.set( data );

            //Save all Value from settings
            var dataToSave = this.data;
            $.each( this.settings, function( id, setting ){
                if (setting.value)
                    dataToSave[ setting.options.id ] = setting.getValue();
            });

            if (!this.options.dontSave)
                this.store.setItem(id || 'DEFAULT', dataToSave).then(callback || function(){});
        },

        saveAs: function( id, callback ){
            this.save(null, id, callback);
        },

        /***********************************************
        delete( callback )
        Delete the settings in indexedDB
        ***********************************************/
        delete: function(id, callback){
            return this.store.removeItem(id || 'DEFAULT').then(callback || function(){});
        },


        /***********************************************
        set( data OR id, value)
        data {ID:VALUE}
        ***********************************************/
        set: function( dataOrId, value ){
            var data = {};
            if (arguments.length == 2)
                data[dataOrId] = value;
            else
                data = dataOrId;

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
        reset()
        ***********************************************/
        reset: function(){
            var _this = this;
            if (this.options.simpleMode)
                return;

            $.each( this.settings, function( id, setting ){
                if (setting.options.defaultValue !== undefined)
                    _this.set(id, setting.options.defaultValue);
            });

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
                return setting ? setting.getValue() : undefined;
            }
        },


        /***********************************************
        getDefault( id )
        id [String]
        ***********************************************/
        getDefault: function( id ){
            if (this.options.simpleMode)
                //Simple mode => No default data gioven
                return this.data[id];
            else {
                var setting = this.settings[id];
                return setting ? setting._adjustValue(setting.options.defaultValue) : undefined;
            }
        },

        /***********************************************
        getDefaultData()
        ***********************************************/
        getDefaultData: function(){
            var _this = this,
                result = {};
            if (this.options.simpleMode)
                //Simple mode => No default data given
                result = $.extend(true, {}, this.data);
            else
                $.each( this.settings, function(id){
                    result[id] = _this.getDefault(id);
                });

            return result;
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
        addModalContent(accordionId, content, footer)
        *****************************************************/
        addModalContent: function(accordionId, content, footer){
            this.modalContent[accordionId] = this.modalContent[accordionId] || [];
            content = $.isArray(content) ? content : [content];
            this.modalContent[accordionId] = this.modalContent[accordionId].concat( content );

            if (footer){
                this.modalFooter[accordionId] = this.modalFooter[accordionId] || [];
                footer = $.isArray(footer) ? footer : [footer];
                this.modalFooter[accordionId] = this.modalFooter[accordionId].concat( footer );
            }
        },

        /*****************************************************
        edit(id, data, preEdit)
        Create and display the modal window with setting
        If id is given the corresponding accordion is open
        data (optional) = special version of the data to be edited
        /*****************************************************/
        edit: function( id, data, preEdit ){
            //Create the modal
            if (!this.modalForm){
                var _this = this,
                    list  = [];
                $.each(this.options.accordionList, function(index, accordInfo){
                    if (_this.modalContent[accordInfo.id] && _this.modalContent[accordInfo.id].length)
                        list.push({
                            id: accordInfo.id,
                            header: accordInfo.header,
                            content: _this.modalContent[accordInfo.id],
                            footer : _this.modalFooter[accordInfo.id]
                        });
                });

                this.modalForm = $.bsModalForm(
                    $.extend(
                        this.options.modalOptions || {},
                        {
                            id        : this.options.storeId,
                            show      : false,
                            header    : this.options.modalHeader,
                            flexWidth : this.options.flexWidth,

                            content   : {type: 'accordion', list: list },

                            buttons   : this.options.reset && !this.options.simpleMode ? [{
                                            icon: this.options.reset.icon,
                                            text: this.options.reset.text,
                                            onClick: $.proxy(this._resetInForm, this)
                                        }] : undefined,

                            onChanging: $.proxy(this.onChanging, this),
                            onSubmit  : $.proxy(this.onSubmit,   this),
                            onCancel  : $.proxy(this.onCancel,   this),
                            onClose   : $.proxy(this.onClose,    this),

                        }
                    )
                );
            }

            //Get data and save data
            this.originalData = $.extend({}, this.data);

            //Open accordion with id
            if (id)
                this.modalForm.$bsModal.find('form > .accordion').bsOpenCard(id);

            if (preEdit)
                preEdit(this, data || this.data);

            this.modalForm.edit(data || this.data);
        },

        /*****************************************************
        editData(data)
        /*****************************************************/
        editData: function(data, preEdit){
            this.edit(null, data, preEdit);
        },

        _resetInForm: function(){
            this.reset();
            this.edit();
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
                if (setting){
                    if (setting.options.saveOnChanging && (_this.get(id) != value))
                        newData[id] = value;
                    if (setting.options.onChanging)
                        setting.options.onChanging(value);
                }
            });

            if (this.options.onChanging)
                this.options.onChanging(newData, this.data);
            this.set(newData);
        },

        /*****************************************************
        onSubmit(data)
        /*****************************************************/
        onSubmit: function(data){
            var _this = this,
                newData = {},
                changed = false;

            $.workingOn();

            $.each(data, function(id, value){
                if (value != _this.originalData[id]){
                    newData[id] = value;
                    changed = true;
                }
            });
            if (changed){
                if (this.options.autoSave && !this.options.dontSave)
                    this.save(newData);
                else
                    this.set(newData);

                if (this.options.onSubmit)
                    this.options.onSubmit(newData, this.originalData);
            }

            $.workingOff();

        },

        /*****************************************************
        onCancel
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

            if (this.options.onCancel)
                this.options.onCancel(this.originalData);
        },

        /*****************************************************
        onClose
        /*****************************************************/
        onClose: function(){
            if (this.options.onClose)
                this.options.onClose(this);
        },
    };





    /*******************************************************************************
    ********************************************************************************
    Setting( options )
    options =
        id [String]
        validator [null] | [String] | [function( value)]. If [String] => using Url.js-extensions validation
        applyFunc [function( value, id, defaultValue )] function to apply the settings for id
        defaultValue
        globalEvents {String} = Id of global-events in fcoo.events that aare fired when the setting is changed
        getValue [function(value, setting) return a value (optional) Used to adjust value before it is saved or used
        onError [function( value, id )] (optional). Called if a new value is invalid according to validator
        saveOnChanging [BOOLEAN]. If true the setting is saved during editing. When false the setting is only saved when edit-form submits
        onChanging [FUNCTION(value)]. Called when the value of the setting is changed during editing
        modernizr BOOLEAN` (optional) default=false: If true the modernizr-class descriped in `src\_fcoo-settings.scss` is updated
        modernizrOnlyValues []ID: List of the only values that are modernizr'ed. If empty all values are modernizr

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
            var _this = this,
                id = this.options.id;
            newValue = (newValue === undefined) ? this.options.defaultValue : newValue;
            if ( !window.Url.validateValue(''+newValue, this.options.validator) ){
                if (this.options.onError)
                    this.options.onError( newValue, id );
                    newValue = this.options.defaultValue;
            }

            this.value = newValue;

            if (!dontCallApplyFunc)
                this.options.applyFunc( this.value, id, this.options.defaultValue );

            //Update modernizr-classes (if any)
            //The modernizr-class is given from this.group.modernizrPrefix plus the id of setting plus the value (if not boolean)
            //Eq. In global-setting a Setting with id = "setting2" has the value "value3" =>
            //modernizr is on for "global-setting-setting2-value3" and off for all other classes with prefix "global-setting-setting2-[VALUE])
            if (this.options.modernizr){
                var modernizr = {}; //={ID:BOOLEAN}
                if ($.type(this.value) == 'boolean')
                    //Value is boolean => just set simgle modernizr-class = this.global-setting-[ID]
                    modernizr[id] = this.value;
                else {
                    //Find list of possible values in modal-content
                    var modalContent = {};
                    $.each(this.group.modalContent, function(groupId, contentList){
                        $.each(contentList, function(index, content){
                            if (content.id == id){
                                modalContent = content;
                                return false;
                            }
                        });
                    });
                    $.each(modalContent.list || modalContent.items || [], function(index, contentPart){
                        if (!_this.options.modernizrOnlyValues || (_this.options.modernizrOnlyValues.indexOf(contentPart.id) != -1))
                            modernizr[id+'-'+contentPart.id] = !!(newValue == contentPart.id);
                    });
                }
                //Updaet modernizr-classes
                $.each(modernizr, function(id, on){
                    window.modernizrToggle( _this.group.options.modernizrPrefix + id, on );
                });
            }

            //Fire global-events (if any)
            if (this.options.globalEvents && ns.events && ns.events.fire)
                ns.events.fire( this.options.globalEvents, id, this.getValue() );
        },


        _adjustValue: function( value ){
            return this.options.getValue ? this.options.getValue(value, this) : value;
        },

        getValue: function(){
            return this._adjustValue( this.value );
        }
    };


    /*************************************************************************************
    Create fcoo.globalSetting = setting-group for global (common) settings
    *************************************************************************************/
    var globalSetting = ns.globalSetting =
        new SettingGroup({
            storeId        : 'GLOBAL',
            autoSave       : true,
            reset          : true,
            flexWidth      : true,
            modernizrPrefix: 'global-setting-',

            modalHeader: {
                icon: 'fa-cog',
                text: {da: 'Indstillinger', en:'Settings'}
            },
            //Modal-options to allow close modal by clicking outside the modal
            modalOptions: {
                static             : false,
                closeWithoutWarning: true
            },

            accordionList: [
                {id: ns.events.LANGUAGECHANGED,       header: {icon: 'fa-comments',       iconClass: 'fa-fw', text: {da: 'Sprog', en: 'Language'}} },
                {id: ns.events.TIMEZONECHANGED,       header: {icon: 'fa-globe',          iconClass: 'fa-fw', text: {da: 'Tidszone', en: 'Time Zone'}} },
                {id: ns.events.DATETIMEFORMATCHANGED, header: {icon: 'fa-calendar-alt',   iconClass: 'fa-fw', text: {da: 'Dato og klokkeslæt', en: 'Date and Time'}} },
                {id: ns.events.LATLNGFORMATCHANGED,   header: {icon: 'fa-map-marker-alt', iconClass: 'fa-fw', text: {da: 'Positioner', en: 'Positions'}} },
                {id: ns.events.UNITCHANGED,           header: {icon: 'fa-ruler',          iconClass: 'fa-fw', text: {da: 'Enheder', en: 'Units'}} },
                {id: ns.events.NUMBERFORMATCHANGED,   header: {                                               text: ['12',{da: 'Talformat', en: 'Number Format'}], textClass:['fa-fw', ''] } },
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
            autoSave: true,
        });

    /*******************************************************
    Initialize/ready
    ********************************************************/
//    $(function() {
//    });

}(jQuery, this, document));