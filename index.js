const { Plugin } = require('powercord/entities');
const { resolve, join } = require('path');
const { React } = require('powercord/webpack');

const { promisify } = require('util');
const cp = require('child_process');
const exec = promisify(cp.exec);
const fsp = require("fs").promises;

const Settings = require('./components/Settings.jsx');

module.exports = class CadencePluginUpdater extends Plugin {
  constructor () {
    super();

    this.cwd = {
      cwd: join(__dirname, '..')
    };

    this.latestInfo = [];
    this.getPluginInfo();
  }

  async startPlugin () {
    this.loadCSS(resolve(__dirname, 'style.scss'));
    this.registerSettings('pc-cadence-pluginUpdater', 'Plugin Updater', props => React.createElement(Settings, {...props, plugin: this}));
  }

  async getPluginInfo() {
    let [pluginList, builtinList] = await Promise.all([
      fsp.readdir(this.cwd.cwd),
      exec("git ls-files", this.cwd)
    ]);
    builtinList = builtinList.stdout.split("\n").map(line => line.split("/")[0]).filter((item, index, array) => (item && array.indexOf(item) == index));
    console.log(builtinList);
    let info = await Promise.all(pluginList.map(p => {
      return fsp.stat(join(this.cwd.cwd, p, ".git"))
      .then(() => true) // .git exists
      .catch(() => false) // .git doesn't exist
      .then(git => {
        let result = {
          name: p,
          git,
          builtin: builtinList.includes(p),
          icon: git ? "tick" : "cross"
        }
        if (result.git) {
          result.priority = 0;
          result.icon = "tick";
        } else if (result.builtin) {
          result.priority = 2;
          result.icon = "dot";
        } else {
          result.priority = 1;
          result.icon = "cross";
        }
        return result;
      });
    }));
    info.sort((a, b) => (a.priority - b.priority));
    this.latestInfo = info;
    return info;
  }

  async update(settings) {
    settings.setState({updating: true});

    let pluginInfo = await this.getPluginInfo();
    pluginInfo.forEach(p => {
      if (p.git) p.icon = "updating";
      delete p.message;
      delete p.link;
      return p;
    });
    settings.setState({pluginInfo});

    let topIndex = 0;
    let reloadAvailable = settings.state.reloadAvailable;
    await Promise.all(pluginInfo.map(async p => {
      if (p.git) {
        let cwd = {
          cwd: join(this.cwd.cwd, p.name)
        }
        const log = thing => console.log(`[${p.name}]`, thing);
        //log("Running git pull --ff-only in "+cwd.cwd);

        let result = await exec("git pull --ff-only --verbose", cwd).catch(e => ({
          stdout: "",
          stderr: e.message.slice(e.message.indexOf("\n")+1)
        }));
        let moveToTop = false;

        if (result.stdout == "Already up to date.\n" || result.stdout == "Already up-to-date.\n") {
          p.icon = "tick";

        } else if (result.stdout.includes("\nFast-forward\n")) {
          let outLines = result.stdout.split("\n");
          let hashes = outLines.find(l => l.startsWith("Updating ")).split(" ")[1].split("..");
          let errLines = result.stderr.split("\n");
          let remote = errLines.find(l => l.startsWith("From ")).split(" ")[1];
          if (remote.startsWith("https://github.com/")) {
            p.link = remote+"/compare/"+hashes[0]+"..."+hashes[1]
            p.message = "Open changes on GitHub";
          }
          p.icon = "sparkles";
          reloadAvailable = true;
          moveToTop = true;

        } else if (result.stderr.includes("fatal: Not possible to fast-forward, aborting.\n")) {
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
        settings.setState({pluginInfo});
      }
    }));

    settings.setState({updating: false, reloadAvailable});
  }
};
