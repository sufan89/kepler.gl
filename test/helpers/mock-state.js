import Immutable from 'immutable';
import cloneDeep from 'lodash.clonedeep';
import {UberVizColorPalette} from 'constants/uber-viz-colors';

import keplerGlReducer from 'reducers/core';
import * as VisStateActions from 'actions/vis-state-actions';

// fixtures
import {testFields, testAllData} from 'test/fixtures/test-csv-data';
import {fields, rows} from 'test/fixtures/geojson';

const geojsonFields = cloneDeep(fields);
const geojsonRows = cloneDeep(rows);

const csvInfo = {
  id: '190vdll3di',
  label: 'hello.csv',
  queryType: 'file',
  queryOption: 'csv',
  params: {file: null}
};

const geojsonInfo = {
  id: 'ieukmgne',
  label: 'zip.geojson',
  queryType: 'file',
  queryOption: 'geojson',
  params: {file: null}
};

function applyActions(reducer, initialState, actions) {
  const actionQ = Array.isArray(actions) ? actions : [actions];

  return actionQ.reduce(
    (updatedState, {action, payload}) =>
      reducer(updatedState, action(...payload)),
    initialState
  );
}

/**
 * Mock Initial App Sate
 * @returns {Immutable} appState
 */
export function mockInitialState() {
  const initialState = keplerGlReducer(undefined, {});
  return Immutable.fromJS(initialState);
}

export const InitialState = mockInitialState();

/**
 * Mock app state with uploaded geojson and csv file
 * @returns {Immutable} appState
 */
function mockStateWithFileUpload() {
  const initialState = InitialState.toJS();

  // load csv and geojson
  const updatedState = applyActions(keplerGlReducer, initialState, [
    {
      action: VisStateActions.updateVisData,
      payload: [
        [{info: csvInfo, data: {fields: testFields, rows: testAllData}}]
      ]
    },
    {
      action: VisStateActions.updateVisData,
      payload: [
        [{info: geojsonInfo, data: {fields: geojsonFields, rows: geojsonRows}}]
      ]
    }
  ]);

  // replace layer id and color with controlled value for easy testing
  updatedState.visState.layers.forEach((l, i) => {
    l.id = `${l.type}-${i}`;
    l.config.color = [i, i, i]
  });

  return Immutable.fromJS(updatedState);
}

function mockStateWithFilters(state) {
  const initialState =
    (state && state.toJS()) || mockStateWithFileUpload().toJS();

  const prepareState = applyActions(keplerGlReducer, initialState, [
    // add filter
    {action: VisStateActions.addFilter, payload: ['190vdll3di']},

    // set filter to 'time'
    {action: VisStateActions.setFilter, payload: [0, 'name', 'time']},

    // set filter value
    {
      action: VisStateActions.setFilter,
      payload: [0, 'value', [1474606800000, 1474617600000]]
    },

    // add another filter
    {action: VisStateActions.addFilter, payload: ['ieukmgne']},

    // set filter to 'RATE'
    {action: VisStateActions.setFilter, payload: [1, 'name', 'RATE']},

    // set filter value
    {action: VisStateActions.setFilter, payload: [1, 'value', ['a']]}
  ]);

  // replace filter id with controlled value for easy testing
  prepareState.visState.filters.forEach((f, i) => {
    f.id = `${f.name}-${i}`;
  });

  return Immutable.fromJS(prepareState);
}

function mockStateWithLayerDimensions(state) {
  const initialState =
    (state && state.toJS()) || mockStateWithFileUpload().toJS();

  const layer0 = initialState.visState.layers.find(
    l => l.config.dataId === '190vdll3di' && l.type === 'point'
  );

  const colorField = initialState.visState.datasets['190vdll3di'].fields.find(
    f => f.name === 'gps_data.types'
  );

  const colorFieldpayload = [layer0, {colorField}, 'color'];

  const colorRangePayload = [
    layer0,
    {colorRange: UberVizColorPalette.find(c => c.name === 'Uber Viz Sequential 2')},
    'color'
  ];

  // layers = [ 'point', 'geojson', 'hexagon' ]
  const reorderPayload = [[2, 0, 1]];

  const prepareState = applyActions(keplerGlReducer, initialState, [
    // change colorField
    {
      action: VisStateActions.layerVisualChannelConfigChange,
      payload: colorFieldpayload
    },

    // change colorRange
    {action: VisStateActions.layerVisConfigChange, payload: colorRangePayload},

    // add layer
    {action: VisStateActions.addLayer, payload: [{id: 'hexagon-2', color: [2, 2, 2]}]}
  ]);

  const newLayer = prepareState.visState.layers[2];

  // set new layer to hexagon
  const updateState = applyActions(keplerGlReducer, prepareState, [
    {action: VisStateActions.layerTypeChange, payload: [newLayer, 'hexagon']}
  ]);

  const hexagonLayer = updateState.visState.layers[2];
  hexagonLayer.id = 'hexagon-2';

  const updateLayerConfig = {
    dataId: '190vdll3di',
    columns: {
      lat: {value: 'gps_data.lat', fieldIdx: 1},
      lng: {value: 'gps_data.lng', fieldIdx: 2}
    },
    isConfigActive: false
  };

  const resultState = applyActions(keplerGlReducer, updateState, [
    // select hexagon layer columns
    {
      action: VisStateActions.layerConfigChange,
      payload: [hexagonLayer, updateLayerConfig]
    },

    // reorder Layer
    {action: VisStateActions.reorderLayer, payload: reorderPayload}
  ]);

  return Immutable.fromJS(resultState);
}

export const StateWFiles = mockStateWithFileUpload();
export const StateWFilters = mockStateWithFilters();
export const StateWFilesFiltersLayerColor = mockStateWithLayerDimensions(
  StateWFilters
);

// saved hexagon layer
export const expectedSavedLayer0 = {
  id: 'hexagon-2',
  type: 'hexagon',
  config: {
    dataId: '190vdll3di',
    label: 'new layer',
    color: [2, 2, 2],
    columns: {
      lat: 'gps_data.lat',
      lng: 'gps_data.lng'
    },
    isVisible: true,
    visConfig: {
      opacity: 0.8,
      worldUnitSize: 1,
      resolution: 8,
      colorRange: {
        name: 'Global Warming',
        type: 'sequential',
        category: 'Uber',
        colors: [
          '#5A1846',
          '#900C3F',
          '#C70039',
          '#E3611C',
          '#F1920E',
          '#FFC300'
        ]
      },
      coverage: 1,
      sizeRange: [0, 500],
      percentile: [0, 100],
      elevationPercentile: [0, 100],
      elevationScale: 5,
      'hi-precision': false,
      colorAggregation: 'average',
      sizeAggregation: 'average',
      enable3d: false
    }
  },
  visualChannels: {
    colorField: null,
    colorScale: 'quantile',
    sizeField: null,
    sizeScale: 'linear'
  }
};

export const expectedLoadedLayer0 = {
  id: 'hexagon-2',
  type: 'hexagon',
  config: {
    dataId: '190vdll3di',
    label: 'new layer',
    color: [2, 2, 2],
    columns: {
      lat: 'gps_data.lat',
      lng: 'gps_data.lng'
    },
    isVisible: true,
    visConfig: {
      opacity: 0.8,
      worldUnitSize: 1,
      resolution: 8,
      colorRange: {
        name: 'Global Warming',
        type: 'sequential',
        category: 'Uber',
        colors: [
          '#5A1846',
          '#900C3F',
          '#C70039',
          '#E3611C',
          '#F1920E',
          '#FFC300'
        ]
      },
      coverage: 1,
      sizeRange: [0, 500],
      percentile: [0, 100],
      elevationPercentile: [0, 100],
      elevationScale: 5,
      'hi-precision': false,
      colorAggregation: 'average',
      sizeAggregation: 'average',
      enable3d: false
    },
    colorField: null,
    colorScale: 'quantile',
    sizeField: null,
    sizeScale: 'linear'
  }
};

export const expectedSavedLayer1 = {
  id: 'point-0',
  type: 'point',
  config: {
    dataId: '190vdll3di',
    label: 'gps data',
    color: [0, 0, 0],
    columns: {
      lat: 'gps_data.lat',
      lng: 'gps_data.lng',
      altitude: null
    },
    isVisible: true,
    visConfig: {
      radius: 10,
      fixedRadius: false,
      opacity: 0.8,
      outline: false,
      thickness: 2,
      colorRange: {
        name: 'Uber Viz Sequential 2',
        type: 'sequential',
        category: 'Uber',
        colors: [
          '#E6FAFA',
          '#AAD7DA',
          '#68B4BB',
          '#00939C'
        ]
      },
      radiusRange: [
        0,
        50
      ],
      'hi-precision': false
    }
  },
  visualChannels: {
    colorField: {
      name: 'gps_data.types',
      type: 'string'
    },
    colorScale: 'ordinal',
    sizeField: null,
    sizeScale: 'linear'
  }
};

export const expectedLoadedLayer1 = {
  id: 'point-0',
  type: 'point',
  config: {
    dataId: '190vdll3di',
    label: 'gps data',
    color: [0, 0, 0],
    columns: {
      lat: 'gps_data.lat',
      lng: 'gps_data.lng',
      altitude: null
    },
    isVisible: true,
    visConfig: {
      radius: 10,
      fixedRadius: false,
      opacity: 0.8,
      outline: false,
      thickness: 2,
      colorRange: {
        name: 'Uber Viz Sequential 2',
        type: 'sequential',
        category: 'Uber',
        colors: [
          '#E6FAFA',
          '#AAD7DA',
          '#68B4BB',
          '#00939C'
        ]
      },
      radiusRange: [0, 50],
      'hi-precision': false
    },
    colorField: {
      name: 'gps_data.types',
      type: 'string'
    },
    colorScale: 'ordinal',
    sizeField: null,
    sizeScale: 'linear'
  }
};

export const expectedSavedLayer2 = {
  id :'geojson-1',
  type :'geojson',
  config :{
    dataId :'ieukmgne',
    label :'zip',
    color :[1, 1, 1],
    columns :{
      geojson :'_geojson'
    },
    isVisible :true,
    visConfig :{
      opacity :0.8,
      thickness :2,
      colorRange :{
        name :'Global Warming',
        type :'sequential',
        category :'Uber',
        colors :[
          '#5A1846',
          '#900C3F',
          '#C70039',
          '#E3611C',
          '#F1920E',
          '#FFC300'
        ]
      },
      radius :10,
      sizeRange :[0, 10],
      radiusRange :[0, 50],
      heightRange :[0, 500],
      elevationScale :5,
      'hi-precision' :false,
      stroked :true,
      filled :false,
      enable3d :false,
      wireframe :false
    }
  },
  visualChannels :{
    colorField :null,
    colorScale :'quantile',
    sizeField :null,
    sizeScale :'linear',
    heightField :null,
    heightScale :'linear',
    radiusField :null,
    radiusScale :'linear'
  }
};

export const expectedLoadedLayer2 = {
  id: 'geojson-1',
  type: 'geojson',
  config: {
    dataId: 'ieukmgne',
    label: 'zip',
    color: [1, 1, 1],
    columns: {
      geojson: '_geojson'
    },
    isVisible: true,
    visConfig: {
      opacity: 0.8,
      thickness: 2,
      colorRange: {
        name: 'Global Warming',
        type: 'sequential',
        category: 'Uber',
        colors: [
          '#5A1846',
          '#900C3F',
          '#C70039',
          '#E3611C',
          '#F1920E',
          '#FFC300'
        ]
      },
      radius: 10,
      sizeRange: [0, 10],
      radiusRange: [0, 50],
      heightRange: [0, 500],
      elevationScale: 5,
      'hi-precision': false,
      stroked: true,
      filled: false,
      enable3d: false,
      wireframe: false
    },
    colorField: null,
    colorScale: 'quantile',
    sizeField: null,
    sizeScale: 'linear',
    heightField: null,
    heightScale: 'linear',
    radiusField: null,
    radiusScale: 'linear'
  }
};