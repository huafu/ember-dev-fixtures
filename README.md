# ember-dev-fixtures

Allow you to run your application with an improved ember-data fixture adapter and fixtures defined
outside of the `app/` tree. The goal is to have a production build which does not contain anything
related to the fixtures, neither the adapter, while providing in-browser injected fixtures on dev
environments (no need of a server even locally, you can build and deploy on github pages for example
and it'll just work with the fixtures if you activated them in the config).


## Why is it good to use this addon?

- You can code your frontend without needing a backend.
- You can create new features for your application while the API is yet not ready for it.
- You can run unit/acceptance tests with many different situations thanks to fixture overlays.
- You can deploy a demo-application which would not need anything else than a static content web
server.
- You can distribute zip files as demo-applications where the user would just open the `index.html`
of the unpacked folder of the zip-file and it would work straight away.


## Installation

* `npm install --save-dev ember-dev-fixtures`
* or with the latest ember-cli: `ember install:addon ember-dev-fixtures`


## Usage

* By default the adapter will be used as the `adapter:application`, but you can override any other
adapter of your application by defining their names in `ENV.APP.devFixtures.adapters` array of your
`config/environment.js`.

* To disable the adapter in `development` environment, set `ENV.APP.devFixtures` to `false`. By
default it is activated for development environment and disabled for all others. You might want to
set it to `true` (or `{}`) for the test environment for example.

* Define your fixtures in `fixtures/<model-name>.js` files of your application as an array. You can
use the blueprint to generate it: `ember g dev-fixture <model-name>`.


## Extensions

* The adapter will take care of `async: false` (or undefined) relations in what it'll create the
correct payload for whatever request you'll do with the store.

* There is a basic `queryFixture` method which allow you to use `findQuery`.

* You can override the behavior of some models by defining extension of each model in
`fixtures/adapters/<model>.js`. It'll do `DevFixtureAdapter.extend(<your-extension>)`.

    There is a blueprint for this too: `ember g dev-fixture-adapter <model-name>`. Those, as well as
    the fixtures, won't be included in your production build or any build where you did not activated
    this addon (cf `ENV.APP.devFixtures.adapters` above).
    
* The powerfulness of this addon are the overlays. You can define base fixtures and then some overlays
that you'd activate with the query parameter `FIXTURES_OVERLAY=<overlay-name>`. An overlay is a folder
in the `fixtures` folders where your can define a file per model which will contain fixtures used to
extend (with merge) the base fixtures. Use `ember g dev-fixture overlay <overlay-name>` to create an
overlay config file and its folder, and `ember g dev-fixture-extension <model-name> --overlay=<overlay-name>`
to create a fixture extension.

    An overlay can include other overlay(s) thru its `_config.js` `include` property. At the end the
    fixtures will include the base fixtures, then merge with all `include` overlay's fixtures, then
    finally merge with that overlay's fixtures. If a fixture has a `__removeFixture` property set to
    `true`, then this record will be removed from the fixture array if it exists.
    
    You can also force an overlay per build with the `ENV.APP.devFixtures.overlay` config key in
    `config/environment.js`. Set it to the name of overlay you want to enable. The URL parameter
    will take precedence if it is found, else this one will be used, and finally the one found in the
    local storage if any from previous load. This allows you to call `startApp` in the acceptance
    tests with a different overlay: `startApp({devFixtures: {overlay: 'my-overlay'}});`.
    
* The `DevFixtureAdapter` was previously extending the `DS.FixtureAdapter` but it is now since `0.0.2`
a full rewrite, extending the `DS.Adapter`. It is working as if your serializer was a
`DS.RESTSerializer` and has useful methods so that you can add extension for each model or for all
with the `application` adapter. Here are some of the provided methods:

    - `simulateRemoteCall(<response>, <statusCode=200>, <statusText>)`: Simulates a response with
    the data given in `<response>`. If the `<statusCode>` is given and not `2xx` then the promise
    will be rejected, The `<statusText>` is either automatic regarding the `<statusCode>` or you can
    provide one.
    
    - `createSingleRecordResponse(<store>, <type>, <record>[, <other-type>, <other-records>, ...])`:
    creates a response JSON for a response containing one record.
    
    - `createMultiRecordsResponse(<store>, <type>, <records>[, <other-type>, <other-records>, ...])`:
    creates a response JSON for a response containing many records of the given type.
    
    - `createDeletedRecordResponse(<store>, <type>, <record>)`: creates a response JSON for a
    response containing a deleted record.
    
    - `updateFixtures(<store>, <type>, <fixtureRecord>[, <auto-gen-id>])`: Used to save the given
    record in the fixtures, doing a merge if it already exists.
    
    - `deleteLoadedFixture(<store>, <type>, <fixtureRecord>)`: used to delete the given record from
    the fixtures.
    
    - `createFixture(<store>, <type>, <fixtureRecord>)`: creates a new fixture for the given type
    and data.

* A `_fixtureMeta` attribute is added on all your models which have fixtures. For now it contains
one property only: `sources`. It is the list of all the fixture and overlay file path(s) that
have been used as source for that record.

## Author

[Huafu Gandon](http://huafu.github.io) - Follow me on twitter: [@huafu_g](https://twitter.com/huafu_g)

---

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).
