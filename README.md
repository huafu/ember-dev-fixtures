# ember-dev-fixtures

Allow you to run your application with an improved ember-data fixture adapter and fixtures defined
outside of the `app/` tree. The goal is to have a production build which does not contain anything
related to the fixtures, neither the adapter, while providing in-browser injected fixtures on dev
environments (no need of a server even locally, you can build and deploy on github pages for example
and it'll just work with the fixtures if you activated them in the config).


## Installation

* `npm install --save-dev ember-dev-fixtures`

* or with the latest ember-cli: `ember install:addon ember-dev-fixtures`


## Usage

* By default the adapter will be used as the `adapter:application`, but you can override any other
adapter of your application by defining their names in `devFixtures.adapters` array of your
`config/environment.js`.

* To disable the adapter in `development` environment, set `devFixtures` to `false`. By default it
is activated for development environment and disabled for all others. You might want to set it to
`true` (or `{}`) for the test environment for example.

* Define your fixtures in `fixtures/<model-name>.js` files of your application as an array. You can
use the blueprint to generate it: `ember g fixture <model-name>`.


## Extensions

* The adapter will take care of `async: false` (or undefined) relations in what it'll create the
correct payload for whatever request you'll do with the store.

* There is a basic `queryFixture` method which allow you to use `findQuery`.

* You can override the behavior of some models by defining extension of each model in
`fixtures/adapters/<model>.js`. It'll do `DevFixtureAdapter.extend(<your-extension>)`.

    There is a blueprint for this too: `ember g fixture-adapter <model-name>`. Those, as well as
    the fixtures, won't be included in your production build or any build where you did not activated
    this addon (cf `devFixtures.adapters` above).


## Author

Huafu Gandon - Follow me on twitter: [huafu_g](https://twitter.com/huafu_g)

---

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).
