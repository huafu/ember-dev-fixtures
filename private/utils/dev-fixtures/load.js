/* globals require */
import Ember from 'ember';
import { MODULE_PREFIX, RELATIVE_PATH } from './module';
import Adapter from './adapter';
import Overlay from './overlay';


var keys = Ember.keys;
var warn = Ember.warn;
var debug = Ember.debug;
var EnumerableUtils = Ember.EnumerableUtils;
var forEach = EnumerableUtils.forEach;


var matcher = new RegExp('^' + (MODULE_PREFIX + '/' + RELATIVE_PATH + '/').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
var OVERLAY_CONFIG = '_config';

var LOADED = false;

/**
 * Detect and load all modules
 *
 * @method devFixturesLoad
 */
export default function devFixturesLoad() {
  if (LOADED) {
    return;
  }
  LOADED = true;
  debug('[dev-fixtures] Reading all dependency modules...');

  forEach(keys(require.entries), function (name) {
    var base, matches, overlay;
    if (matcher.test(name)) {
      // if we are concerned by the module
      base = name.replace(matcher, '');
      if ((matches = base.match(/^adapters\/([^\/]+)$/))) {
        // it's an adapter extension
        Adapter.for(matches[1]);
      }
      else if ((matches = base.match(/^overlays\/([^\/]+)\/([^\/]+)$/))) {
        // it's an overlay fixtures or config
        overlay = Overlay.for(matches[1]);
        if (matches[2] !== OVERLAY_CONFIG) {
          // will load the fixture into the overlay and declare it
          overlay.get('fixtures.' + matches[2]);
        }
      }
      else if ((matches = base.match(/^([^\/]+)$/))) {
        // it's a base fixtures file
        Overlay.base().get('fixtures.' + matches[1]);
      }
      else {
        warn('[dev-fixtures] Ignoring file `' + name + '`.');
      }
    }
  });
}
