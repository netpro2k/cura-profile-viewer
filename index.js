import React from "react";
import ReactDom from "react-dom";
import JSZip from "jszip";
import ini from "ini";
import {groupBy} from "lodash/fp";

import fdmconfig from "./fdmprinter.def.json"
const getPropertyDefs = (settings, category) => {
    return Object.entries(settings).flatMap( ([key, {type, label, description, unit, default_value, children}]) => {
        if(type === "category") category = key;
        let ret = [[key, {label, description, unit, type, category, default_value}]];
        if(children) {
            ret = ret.concat(getPropertyDefs(children, category));
        }
        return ret;
    })
}
const propertyDefs = getPropertyDefs(fdmconfig.settings).reduce((o, [k,v]) => {
    o[k] = v;
    return o;
 }, {});
 console.log(propertyDefs);

class App extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  onDragOver(e) {
    e.preventDefault();
  }

  onDrop(e) {
    e.preventDefault();

    JSZip.loadAsync(e.dataTransfer.items[0].getAsFile()).then(zip => {
      const configs = [];
      zip.forEach((_, zipEntry) => {
        configs.push(zipEntry.async("text").then(ini.parse));
      });
      Promise.all(configs).then(c => {
        this.setState({ configs: c });
      });
    });
  }

  renderConfigValues(values) {
    const categories = groupBy( p => propertyDefs[p].category, Object.keys(values));
    return (
      <ul>
        {Object.entries(categories).map(([category, categoryProps]) => {
          return (
            <div>
              <h3>{propertyDefs[category].label}</h3>
              <ul>
                {categoryProps.map(prop => {
                  const { label, description, unit, default_value } = propertyDefs[prop];
                  const value = values[prop];
                  return (
                    <li title={`${description}. Default: ${default_value}${unit||""}`}>
                      <b>{label}:</b> {value}{unit}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </ul>
    );
  }

  render() {
    const { configs } = this.state;
    if (configs) {
      const [globalConfig, ...extruderConfigs] = configs;
      return (
        <div>
          <h1>{globalConfig.general.name}</h1>

          <h2>Global Settings</h2>
          {this.renderConfigValues(globalConfig.values)}

          <h2>Extruder Settings</h2>
          {extruderConfigs.map(extruderConfig =>
            this.renderConfigValues(extruderConfig.values)
          )}
        </div>
      );
    } else {
      return (
        <div
          id="drop_zone"
          onDrop={this.onDrop.bind(this)}
          onDragOver={this.onDragOver.bind(this)}
        >
          <p>Drop a Cura config here</p>
        </div>
      );
    }
  }
}

ReactDom.render(<App/>,document.getElementById("app"))
