const { Plugin } = require('powercord/entities');
const { resolve, join } = require('path');
const { React } = require('powercord/webpack');

const { promisify } = require('util');
const cp = require('child_process');
const exec = promisify(cp.exec);
const fsp = require('fs').promises;

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
    this.registerSettings('powercord-plugin-updater', 'Plugin Updater', props => React.createElement(Settings, { ...props,
      plugin: this }));
  }

  async getPluginInfo () {
    const [ pluginList, builtinListExec ] = await Promise.all([
      fsp.readdir(this.cwd.cwd),
      exec('git ls-files', this.cwd)
    ]);
    const builtinList = builtinListExec.stdout.split('\n').map(line => line.split('/')[0]).filter((item, index, array) => (item && array.indexOf(item) === index));
    let info = await Promise.all(pluginList.map(async p => {
      const dirStat = await fsp.stat(join(this.cwd.cwd, p));
      if (!dirStat.isDirectory()) {
        return null;
      }
      const isBuiltIn = builtinList.includes(p);
      const gitExists = await fsp.stat(join(this.cwd.cwd, p, '.git')).then(() => true).catch(() => false);
      return {
        name: p,
        git: gitExists,
        builtin: isBuiltIn,
        icon:
          gitExists
            ? 'tick'
            : isBuiltIn
              ? 'dot'
              : 'cross',
        priority:
          gitExists
            ? 0
            : isBuiltIn
              ? 2
              : 1
      };
    }));
    info = info.filter(item => item !== null);
    info.sort((a, b) => (a.priority - b.priority));
    this.latestInfo = info;
    return info;
  }

  async update (settings) {
    settings.setState({ updating: true });

    const pluginInfo = await this.getPluginInfo();
    pluginInfo.forEach(p => {
      if (p.git) {
        p.icon = 'updating';
      }
      delete p.message;
      delete p.link;
      return p;
    });
    settings.setState({ pluginInfo });

    let topIndex = 0;
    let { reloadAvailable } = settings.state;
    await Promise.all(pluginInfo.map(async p => {
      if (p.git) {
        const cwd = {
          cwd: join(this.cwd.cwd, p.name)
        };
        /*
         * const log = thing => console.log(`[${p.name}]`, thing);
         * log("Running git pull --ff-only in "+cwd.cwd);
         */

        const result = await exec('git pull --ff-only --verbose', cwd).catch(e => ({
          stdout: '',
          stderr: e.message.slice(e.message.indexOf('\n') + 1)
        }));
        let moveToTop = false;

        if (result.stdout === 'Already up to date.\n' || result.stdout === 'Already up-to-date.\n') {
          p.icon = 'tick';
        } else if (result.stdout.includes('\nFast-forward\n')) {
          const outLines = result.stdout.split('\n');
          const hashes = outLines.find(l => l.startsWith('Updating ')).split(' ')[1].split('..');
          const errLines = result.stderr.split('\n');
          const remote = errLines.find(l => l.startsWith('From ')).split(' ')[1];
          if (remote.startsWith('https://github.com/')) {
            p.link = `${remote}/compare/${hashes[0]}...${hashes[1]}`;
            p.message = 'Open changes on GitHub';
          }
          p.icon = 'sparkles';
          reloadAvailable = true;
          moveToTop = true;
        } else if (result.stderr.includes('fatal: Not possible to fast-forward, aborting.\n')) {
          p.message = 'Cannot fast-forward due to unmerged local changes. You\'ll need to merge manually.';
          p.icon = 'failed';
          moveToTop = true;
        } else if (result.stderr.includes('Please commit your changes or stash them before you merge.\n')) {
          p.message = 'Updating would overwrite local changes. You should commit or discard your current changes.';
          p.icon = 'failed';
          moveToTop = true;
        } else if (result.stderr.includes('There is no tracking information for the current branch.\n')) {
          p.message = 'This local branch isn\'t tracking a remote branch, so there\'s nothing to pull from.';
          p.icon = 'tick';
          moveToTop = true;
        } else if (result.stderr.includes('You are not currently on a branch.\n')) {
          p.message = 'You are not currently on a branch, so there\'s nowhere to pull from. Save your work to a branch, and checkout that branch.';
          p.icon = 'failed';
          moveToTop = true;
        } else {
          p.message = 'I\'m not really sure what happened here. You should investigate the situation manually.';
          p.icon = 'unknown';
          moveToTop = true;
        }

        if (moveToTop) {
          const index = pluginInfo.indexOf(p);
          if (index === -1) {
            throw new Error('Yo how is the index -1, that\'s not possible');
          }
          pluginInfo.splice(index, 1);
          pluginInfo.splice(topIndex++, 0, p);
        }

        // log(result);
        settings.setState({ pluginInfo });
      }
    }));

    settings.setState({ updating: false,
      reloadAvailable });
  }
};
