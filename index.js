#!/usr/bin/env node

const chalk       = require('chalk');
const clear       = require('clear');
const figlet      = require('figlet');
const fs          = require('fs');
const path        = require('path');
const fileEval    = require('file-eval');

class RequireJS2Webpack {

  constructor(mainConfigFile) {
    this.mainConfigFile = mainConfigFile;
    this.required = [];
    this.aliases = {};
    this.rules = [];
  }

  logRequiredModule(moduleName) {
    console.log(`Module '${moduleName}' was required.`);
    this.required.push(moduleName);
  }

  logConfigPaths(paths) {
    for(var moduleName in paths) {
      console.debug(`Module '${moduleName}' was mapped to ${paths[moduleName]}.`);
      this.aliases[moduleName] = paths[moduleName];
    }
  }

  logConfigShims(shims) {
    for(var shimName in shims) {
      var shim = shims[shimName];
      console.debug(`Shim '${shimName}' depends on ${shim.deps}.`);
      this.rules.push({
        test:`/${shimName}/`,
        use: [
          `imports-loader?this=>${shim.deps}`
        ]
      });
    }
  }

  async load() {

    var require = (modules) => {
      if (typeof modules === 'string') {
        this.logRequiredModule(modules);
      }

      if (typeof modules === 'object') {
        for(var moduleName of modules) {
          this.logRequiredModule(moduleName);
        }
      }
        
    };

    require.config = (config) => {
        this.logConfigPaths(config.paths);
        this.logConfigShims(config.shim);
    };

    await fileEval(this.mainConfigFile, {context:{require:require}});
  }

  async save(output) {
    console.debug(`Writing to '${output}'.`);

    var buffer = '';
    buffer += 'resolve: {\n';
    buffer += '\talias: {\n';
    for(var moduleName in this.aliases) {
      buffer += `\t\t'${moduleName}': '${this.aliases[moduleName]}',\n`;
    }
    buffer += '\t},\n';
    buffer += '\tmodule: {\n';
    buffer += '\t\trules: {\n';
    for(var rule of this.rules) {
      buffer += '\t\t\t{\n';
      buffer += `\t\t\t\ttest: ${rule.test},\n`;
      buffer += `\t\t\t\tuse: [\n\t\t\t\t\t"${rule.use}"\n\t\t\t\t],\n`;
      buffer += '\t\t\t},\n';
    }
    buffer += '\t\t},\n';
    buffer += '\t},\n';
    buffer += '}\n';

    buffer += 'define([';
    for(var moduleName of this.required) {
      buffer += `\t'${moduleName}',\n`;
    }
    buffer += '], function () {';
    buffer += '});';

    console.log(buffer);
  } 
}

const run = async () => {
  const mainConfigFile = process.argv[2];

  if(fs.existsSync(mainConfigFile)) {
    try {
      const converter = new RequireJS2Webpack(mainConfigFile);
      await converter.load();
      await converter.save(process.argv[3]);
    } catch(e) {
      console.log(e);
    }
  } else {
    console.log("na please enter a valid config file.");
  }
}


clear();
console.log(
  chalk.yellow(
    figlet.textSync('RequireJS 2 Webpack', { horizontalLayout: 'full' })
  )
);
run();