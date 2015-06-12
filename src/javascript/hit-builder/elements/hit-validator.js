// Copyright 2015 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


import Collection from '../../collection';
import debounce from 'lodash/function/debounce';
import HitElement from './hit-element';
import Model from '../../model';
import ParamElement from './param-element';
import ParamSelectElement from './param-select-element';
import ParamsCollection from '../params-collection';
import React from 'react';


const DEFAULT_HIT = 'v=1&t=pageview';
const HIT_TYPES = [
  'pageview',
  'screenview',
  'event',
  'transaction',
  'item',
  'social',
  'exception',
  'timing'
];


export default class HitValidator extends React.Component {

  constructor(props) {
    super(props)

    // Bind methods
    this.handleCreateNew = this.handleCreateNew.bind(this);
    this.handleEditExistingHit = this.handleEditExistingHit.bind(this);
    this.handleExistingHitChange = this.handleExistingHitChange.bind(this);
    this.handleAddParam = this.handleAddParam.bind(this);
    this.handleParamChange = this.handleParamChange.bind(this);

    // Don't validate too much.
    this.validateParams = debounce(this.validateParams, 500, {leading: true});

    this.state = {
      editing: false,
      generalErrors: [],
      paramErrors: {}
    };

    this.params = new ParamsCollection(DEFAULT_HIT)
        .on('add', this.handleParamChange)
        .on('remove', this.handleParamChange)
        .on('change', this.handleParamChange)
  }

  handleCreateNew() {
    this.setState({editing: true});
  }

  handleEditExistingHit() {
    // TODO(philipwalton): update the collection module so this doesn't
    // have to be destroyed.
    this.params.destroy();

    this.params = new ParamsCollection(this.state.existingHitValue)
        .on('add', this.handleParamChange)
        .on('remove', this.handleParamChange)
        .on('change', this.handleParamChange)

    this.setState({editing: true});
    this.validateParams();
  }

  handleExistingHitChange(e) {
    this.setState({existingHitValue: e.target.value});
  }

  handleAddParam() {
    this.params.add(new Model({name:'', value:''}));
  }

  handleParamChange() {
    this.forceUpdate();
    this.validateParams();
  }

  validateParams() {
    this.params.validate().then((response) => {
      let result = response.hitParsingResult[0];

      if (result.valid) {
        this.setState({valid: true, paramErrors: {}, generalErrors: []});
      }
      else {
        let {paramErrors, generalErrors} =
            this.getErrorsFromParserMessage(result.parserMessage);

        this.setState({valid: false, paramErrors, generalErrors});
      }

      console.log(result.valid ? 'Valid' : 'Error');
      for (let m of result.parserMessage) console.log(m);
    })
    .catch(log);
  }

  getErrorsFromParserMessage(messages) {
    let paramErrors = {};
    let generalErrors = [];

    for (let message of messages) {
      if (this.params.has(message.parameter)) {
        paramErrors[message.parameter] = message;
      }
      else {
        generalErrors.push(message);
      }
    }
    return {paramErrors, generalErrors};
  }

  render() {

    if (!this.state.editing) {

      let iconEdit =
          `<svg class="Icon" viewBox="0 0 16 16">
             <use xlink:href="/public/images/icons.svg#icon-pencil"></use>
           </svg>`;

      let iconCreate =
          `<svg class="Icon" viewBox="0 0 16 16">
             <use xlink:href="/public/images/icons.svg#icon-plus"></use>
           </svg>`;

      return (
        <div>

          <p><strong>Paste an existing hit into the text box below.</strong></p>

          <div className="FormControl">
            <textarea
              className="FormField"
              value={this.state.existingHitValue}
              onChange={this.handleExistingHitChange} />
          </div>

          <div className="FormControl">
            <button
              className="Button Button--icon"
              disabled={!this.state.existingHitValue}
              onClick={this.props.handleEditExistingHit}>
              <span dangerouslySetInnerHTML={{__html: iconEdit}} />&nbsp;
              Edit hit
            </button>
          </div>

          <p><strong>Or construct a new hit from scratch.</strong></p>

          <div>
            <button
              className="Button Button--icon Button--action"
              onClick={this.handleCreateNew}>
              <span dangerouslySetInnerHTML={{__html: iconCreate}} />&nbsp;
              Create new hit
            </button>
          </div>
        </div>
      )
    }
    else {

      return (
        <div>

          <HitElement hitUrl={this.params.toQueryString()} />

          <p style={{border:'1px solid',padding:'1em'}}>{this.state.generalErrors.map((e) => e.description)}</p>

          <ParamSelectElement
            model={this.params.models[0]}
            options={['1']}
            message={this.state.paramErrors['v']}
            onRemove={this.params.remove.bind(this.params, this.params.models[0])} />

          <ParamSelectElement
            model={this.params.models[1]}
            options={HIT_TYPES}
            message={this.state.paramErrors['t']}
            onRemove={this.params.remove.bind(this.params, this.params.models[1])} />

          <ParamElement
            model={this.params.models[2]}
            placeholder="UA-XXXXX-Y"
            message={this.state.paramErrors['tid']}
            onRemove={this.params.remove.bind(this.params, this.params.models[2])} />

          {this.params.models.slice(3).map((model) => {

            let param = model.get('name');
            let message = this.state.paramErrors[param];

            return (
              <ParamElement
                model={model}
                key={model.uid}
                message={message}
                onRemove={this.params.remove.bind(this.params, model)} />
            );
          })}
          <button onClick={this.handleAddParam}>+ Add new</button>
        </div>
      )
    }
  }
}
