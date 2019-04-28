# Plugin Updater

## How do I use it?

1. Click "Update plugins"
2. Click "Reload to apply updates"

## How does it work?

It goes into the plugin folder and runs `git pull --ff-only` inside each folder.

## What do all the symbols mean?

### Before clicking update

|icon|meaning|
|-----|-------|
|![](https://cadence.moe/friends/discord_icons/putick.svg) tick|the plugin was cloned from git and can be updated
|![](https://cadence.moe/friends/discord_icons/pucross.svg) cross|the plugin was not cloned from git and cannot be updated|

### After clicking update

|icon|meaning|
|-----|-------|
|![](https://cadence.moe/friends/discord_icons/pucross.svg) cross|the plugin was not cloned from git and an update was not attempted|
|![](https://cadence.moe/friends/discord_icons/puupdating.svg) updating|the plugin is currently being updated|
|![](https://cadence.moe/friends/discord_icons/putick.svg) tick|the plugin was already the latest version|
|![](https://cadence.moe/friends/discord_icons/pusparkles.svg) updated|the plugin was updated to the latest version successfully|
|![](https://cadence.moe/friends/discord_icons/pufailed.svg) failed|there was a problem while trying to update, and you should resolve the situation manually|
|![](https://cadence.moe/friends/discord_icons/puunknown.svg) unknown|something unexpected happened, and you should investgate the situation manually, and open an issue about it|

## License

This plugin is licensed under the AGPL v3.0.

The symbols hosted on cadence.moe were created by me, and are also licensed under the AGPL v3.0. You can use the symbols without credit in any project with a compatible license. If you do not publish your project, you can use the symbols without restriction.