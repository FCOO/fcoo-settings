# fcoo-settings
>


## Description
Methods to get, set, load, and save settings for FCOOs applications

## Installation
### bower
`bower install https://github.com/FCOO/fcoo-settings.git --save`

## Demo
http://FCOO.github.io/fcoo-settings/demo/  (see control panel)

## Methods and Usage
In namespace `window.fcoo` two object are created:
    fcoo.globalSetting  //Contains all global settings (language, date-format etc.)
    fcoo.appSetting     //Contains the setting for the current application

### Get and set settings

#### `.add( options )`
    options = {id, applyFunc, validator, defaultValue, onError )

- `id [String]`: The id for the setting
- `applyFunc [Function( value )]`: Called when the value of setting `id` is changed. Used to change elements etc. on the page with the new setting
- `validator` (optional): See [fcoo/url.js-extensions](https://github.com/FCOO/url.js-extensions#validatevalue-value-validator-).
- `defaultValue [any]` (optional): Used if no value was found in `localStorage`
- `callApply [Boolean]` (optional) default=true: If true the `applyFunc` is called when the setting is added
- `globalEvents` (optional): Name(s) of events defined in [fcoo/fcoo-global-events](https://github.com/FCOO/fcoo-global-events) to be fired when the setting is changed.
- `onError [Function( value, id )` (optional): Called if a new value is invalid according to validator

#### `.set( {ID:VALUE} )`
Sets the value for settings `ID`
If `value` is `undefined` => use the saved value
The `applyFunc` is called with the new value

#### `.get( id )`
Return the current value (any type) of settings for `id`

#### `.load([id])`
Load the setting's data from `indexedDB`
`id` (optional) Load a different data-set
`load()` is called on loading the page, and normally it would not need to be called again

#### `.save(callback)`
Save the settings to `indexedDB`

#### `.saveAs(id, callback)`
Save the settings to `indexedDB` with a new `id`

## Edit global settings in a modal window
To allow the user to edit the global settings the following methods are defined to retrieve and display the modal.
The modal contain an accordion with e card for each of the global events in [fcoo/fcoo-global-events](https://github.com/FCOO/fcoo-global-events)
The different "Administrator" (see [FCOO/fcoo-web-application-settings](https://gitlab.com/FCOO/fcoo-web-application-settings)) will provide the content for each accordion card by calling `fcoo.settings.addModalContent(globalEventId, content)`
The modal is displayed by calling `fcoo.globalSetting.edit()`

#### `fcoo.globalSetting.addModalContent(globalEventId, content)`
Add content to for accordion card with `id` and `content` as array of `bsOptions` (see [FCOO/jquery-bootstrap](https://github.com/FCOO/jquery-bootstrap))

#### `fcoo.globalSetting.edit([id])`
Create and display the modal-window with edit-fields for the different groups given by the [global events](https://github.com/FCOO/fcoo-global-events)
If `id` is given the card with the id is open by default

## Copyright and License
This plugin is licensed under the [MIT license](https://github.com/FCOO/fcoo-settings/LICENSE).

Copyright (c) 2016 [FCOO](https://github.com/FCOO)

## Contact information

Niels Holt nho@fcoo.dk
