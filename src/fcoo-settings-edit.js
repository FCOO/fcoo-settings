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