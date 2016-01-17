import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import qs from 'querystring';
import queryParams from './query-params';
import reducer from './reducers';
import db from '../data-store';


let middlewear = [thunkMiddleware];


// Adds a logger in non-production mode.
let logger;
if (process.env.NODE_ENV != 'production') {
  // Uses `require` here instead of `import` so the module isn't included
  // in the production build.
  middlewear.push(require('redux-logger')());
}


let createStoreWithMiddleware = applyMiddleware(...middlewear)(createStore);


/**
 * Gets the query params used to populate the params model.
 * If params are found in the URL, they are used and merged with the defaults.
 * Otherwise the datastore is checked for params from a previous session, and
 * those are merged with the defaults.
 * If no params exist in the URL or the datastore, the defaults are returned.
 * @return {Object} The initial params.
 */
function getInitalQueryParamsAndUpdateUrl() {

  let defaultParams = {'start-date': '30daysAgo', 'end-date': 'yesterday'};
  let storedParams = db.get('query-explorer:params');
  let urlParams = qs.parse(location.search.slice(1));

  // Don't assume that the presence any query params means it's a Query
  // Explorer URL. Only use the query params if they exist and contain at least
  // a metric value.
  if (urlParams && urlParams['metrics']) {

    // Some of the Query Explorer links out in the wild have double-encoded
    // URL params. Check for the substring '%253A' (a colon, double-encoded),
    // and if found then double-decode all params.
    if (urlParams['metrics'].indexOf('%253A')) {
      urlParams = mapValues(urlParams, (value) => decodeURIComponent(value));
    }

    // Remove the query params in the URL to prevent losing state on refresh.
    // https://github.com/googleanalytics/ga-dev-tools/issues/61
    if (history && history.replaceState) {
      history.replaceState(history.state, document.title, location.pathname);
    }

    urlParams = queryParams.sanitize({...defaultParams, ...urlParams});
    store.set('query-explorer:params', urlParams);
    return urlParams;
  }
  else if (storedParams) {
    return queryParams.sanitize({...defaultParams, ...storedParams});
  }
  else {
    return defaultParams;
  }
}


/**
 * Gets the Query Explorer settings stored in local storage. If no settings
 * exist, an empty object is returned.
 * @return {Object} The settings object.
 */
function getDefaultSettingsAndUpdateTracker() {
  let settings = db.get('query-explorer:settings') || {};

  ga('set', 'dimension3', qs.stringify(settings));
  return settings;
}


function getDefaultSelect2Options() {
  return {
    metrics: [],
    dimensions: [],
    sort: [],
    segments: []
  }
}


let store = createStoreWithMiddleware(reducer, {
  isAuthorized: false,
  params: getInitalQueryParamsAndUpdateUrl(),
  select2Options: getDefaultSelect2Options(),
  settings: getDefaultSettingsAndUpdateTracker()
});


// TODO(philipwalton): create middleware to save the params and settings
// to localStorage.
store.subscribe(function() {
  let {params, settings} = store.getState();

  db.set('query-explorer:settings', settings);
  ga('set', 'dimension3', qs.stringify(settings));

  db.set('query-explorer:params', params);
});


export default store;
