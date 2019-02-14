# fcoo-settings
>


## Description
Methods to get, set, load, and save settings for FCOOs applications

## Installation
### bower
`bower install https://github.com/FCOO/fcoo-settings.git --save`

## Demo
http://FCOO.github.io/fcoo-settings/demo/  (see control panel)
http://FCOO.github.io/fcoo-settings/demo/?settings={"test":66}  (see control panel)

## Methods and Usage
In namespace `window.fcoo` a object `settings` is created with the following methods

### Get and set settings

#### `fcoo.settings.add( options )`
    options = {id, applyFunc, validator, defaultValue, onError )

- `id [String]`: The id for the setting
- `applyFunc [Function( value )]`: Called when the value of setting `id` is changed. Used to change elements etc. on the page with the new setting
- `validator` (optional): See [fcoo/url.js-extensions](https://github.com/FCOO/url.js-extensions#validatevalue-value-validator-).
- `defaultValue [any]` (optional): Used if no value was found in `localStorage`
- `callApply [Boolean]` (optional) default=true: If true the `applyFunc` is called when the setting is added
- `globalEvents` (optional): Name(s) of events defined in [fcoo/fcoo-global-events](https://github.com/FCOO/fcoo-global-events) to be fired when the setting is changed.
- `onError [Function( value, id )` (optional): Called if a new value is invalid according to validator

#### `fcoo.settings.set( id, value, reload )`
Sets the value for settings `id`
If `value` is `undefined` => use the saved value
The `applyFunc` is called with the new value
If `reload==true` the pages is reloaded with the new settings

#### `fcoo.settings.get( id )`
Return the current value (any type) of settings for `id`

#### `fcoo.settings.load()`
Load the settings from the url `index.html?settings={"id":"value"}` or `localStorage`
`load()` is called on loading the page, and normally it would not need to be called again

#### `fcoo.settings.save()`
Save the settings to `localStorage`
Is called on `set(...)`, and normally it would not need to be called individual

## Force settings
In some cases it is desirable to temporally overwrite the saved settings.
This is done by calling the page with a parameter `?settings={..}&...` with a value = stringifyed JSON-object.
Ex.: `index.html?settings={"test":99}`

## Edit settings in a modal window
To allow the user to edit the settings the following methods are defined to retrieve and display the modal.
The modal contain an accordion with e card for each of the global events in [fcoo/fcoo-global-events](https://github.com/FCOO/fcoo-global-events)
The different "Administrator" (see [FCOO/fcoo-web-application-settings](https://gitlab.com/FCOO/fcoo-web-application-settings)) will provide the content for each accordion card by calling `fcoo.settings.addModalContent(globalEventId, content)`
The modal is displayed by calling `fcoo.settings.edit()`

#### `fcoo.settings.addModalContent(globalEventId, content)`
Add content to for accordion card with `id` and `content` as array of `bsOptions` (see [FCOO/jquery-bootstrap](https://github.com/FCOO/jquery-bootstrap))

#### `fcoo.settings.edit([id])`
Create and display the modal-window with edit-fields for the different groups given by the [global events](https://github.com/FCOO/fcoo-global-events)
If `id` is given the card with the id is open by default

## Copyright and License
This plugin is licensed under the [MIT license](https://github.com/FCOO/fcoo-settings/LICENSE).

Copyright (c) 2016 [FCOO](https://github.com/FCOO)

## Contact information

Niels Holt nho@fcoo.dk
