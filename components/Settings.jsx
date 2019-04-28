const { React } = require('powercord/webpack');
const { Button } = require('powercord/components');

module.exports = class CadencePluginUpdaterSettings extends React.Component {
  constructor (props) {
    super(props);
    this.plugin = props.plugin;
    this.state = {
      updating: false,
      reloadAvailable: false,
      pluginInfo: this.plugin.latestInfo
    }
  }

  doUpdate() {
    this.plugin.update(this);
  }

  render () {
    return <div>
      <div className="plugin-updater-button-container">
        <Button
          onClick={this.doUpdate.bind(this)}
          disabled={this.state.updating}
        >
          {this.state.updating ? "Updating plugins..." : "Update plugins"}
        </Button>

        {this.state.reloadAvailable && <Button className="plugin-updater-reload"
          onClick={() => location.reload()}
          disabled={this.state.updating}
        >
          Reload to apply updates
        </Button>}
      </div>

      <h5 className='h5-18_1nd title-3sZWYQ size12-3R0845 height16-2Lv3qA weightSemiBold-NJexzi marginBottom8-AtZOdT marginTop40-i-78cZ'>
        Plugin directory
      </h5>
      <div className='plugin-updater-list-item'>
        {this.plugin.cwd.cwd}
      </div>

      <h5 className='h5-18_1nd title-3sZWYQ size12-3R0845 height16-2Lv3qA weightSemiBold-NJexzi marginBottom8-AtZOdT marginTop40-i-78cZ'>
        Supported plugins
      </h5>
      {this.state.pluginInfo.map(info => (<div>
        <div className='plugin-updater-list-item'>
          <img
            src={"https://cadence.moe/friends/discord_icons/pu"+info.icon+".svg"}
          ></img>
          {info.name}
        </div>
        {info.message && <div className='plugin-updater-list-message'>
          {info.message}
        </div>}
      </div>))}
    </div>;
  }
};
