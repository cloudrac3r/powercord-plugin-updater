const { Plugin } = require('powercord/entities');
const { resolve, join } = require('path');
const { sleep, createElement } = require('powercord/util');
const { ReactDOM, React } = require('powercord/webpack');
const { Toast } = require('powercord/components');

const { promisify } = require('util');
const cp = require('child_process');
const exec = promisify(cp.exec);
const fs = require("fs");
const fsp = fs.promises;

const Settings = require('./components/Settings.jsx');

module.exports = class CadencePluginUpdater extends Plugin {
  constructor () {
    super();

    this.cwd = {
      cwd: join(__dirname, '..')
    };

    this.getPluginInfo();
  }

  async startPlugin () {
    this.loadCSS(resolve(__dirname, 'style.scss'));
    this.registerSettings('pc-cadence-pluginUpdater', 'Plugin Updater', props => React.createElement(Settings, {...props, plugin: this}));
  }

  getPluginInfo() {
    let pluginList = fs.readdirSync(this.cwd.cwd);
    let info = pluginList.map(p => {
      let git = fs.existsSync(join(this.cwd.cwd, p, ".git"));
      return {
        name: p,
        git,
        icon: git ? "tick" : "cross"
      }
    }).sort((a, b) => (b.git - a.git));
    this.latestInfo = info;
    return info;
  }

  async update(settings) {
    let pluginInfo = this.getPluginInfo();
    settings.setState(state => ({
      updating: true,
      pluginInfo: pluginInfo.map(p => {
        if (p.git) p.icon = "updating";
        delete p.message;
        return p;
      })
    }));

    let topIndex = 0;
    let reloadAvailable = settings.state.reloadAvailable;
    await Promise.all(pluginInfo.map(async p => {
      if (p.git) {
        let cwd = {
          cwd: join(this.cwd.cwd, p.name)
        }
        const log = thing => console.log(`[${p.name}]`, thing);
        //log("Running git pull --ff-only in "+cwd.cwd);

        let result = await exec("git pull --ff-only", cwd).catch(e => ({
          stdout: "",
          stderr: e.message.slice(e.message.indexOf("\n")+1)
        }));
        let moveToTop = false;

        if (result.stdout == "Already up to date.\n") {
          p.icon = "tick";

        } else if (result.stdout.includes("\nFast-forward\n")) {
          p.icon = "sparkles";
          reloadAvailable = true;
          moveToTop = true;

        } else if (result.stderr == "fatal: Not possible to fast-forward, aborting.\n") {
          p.message = "Cannot fast-forward due to unmerged local changes. You'll need to merge manually.";
          p.icon = "failed";
          moveToTop = true;

        } else if (result.stderr.includes("Please commit your changes or stash them before you merge.\n")) {
          p.message = "Updating would overwrite local changes. You should commit or discard your current changes.";
          p.icon = "failed";
          moveToTop = true;

        } else if (result.stderr.includes("There is no tracking information for the current branch.\n")) {
          p.message = "This local branch isn't tracking a remote branch, so there's nothing to pull from.";
          p.icon = "tick";
          moveToTop = true;

        } else if (result.stderr.includes("You are not currently on a branch.\n")) {
          p.message = "You are not currently on a branch, so there's nowhere to pull from. Save your work to a branch, and checkout that branch.";
          p.icon = "failed";
          moveToTop = true;

        } else {
          p.message = "I'm not really sure what happened here. You should investigate the situation manually.";
          p.icon = "unknown";
          moveToTop = true;
        }

        if (moveToTop) {
          let index = pluginInfo.indexOf(p);
          if (index == -1) throw new Error("Yo how is the index -1, that's not possible");
          pluginInfo.splice(index, 1);
          pluginInfo.splice(topIndex++, 0, p);
        }

        //log(result);
        settings.setState({pluginInfo, reloadAvailable});
      }
    }));

    settings.setState({updating: false});
  }
};
