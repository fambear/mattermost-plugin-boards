# Mattermost Boards

### A self-hosted plugin for managing boards within a Mattermost installation

Mattermost boards plugins is an open source, multilingual, self-hosted project management tool that's an alternative to Trello, Notion, and Asana.

## Try Mattermost Boards Plugin 

Access the latest releases of the mattermost boards plugin by downloading the `mattermost-plugin-focalboard.tar.gz` file from the releases in this repository: <https://github.com/mattermost/mattermost-plugin-boards/releases>. After downloading and installing the plugin in the System Console, select the menu in the top left corner and select **Boards**. 

### Getting started

Clone [mattermost](https://github.com/mattermost/mattermost-server) into sibling directory.

You also want to have the environment variable `MM_DEBUG"true"` set, otherwise the plugin
will be compiled for Linux, Windows, and Darwin ARM64 and x64 architecture every single time. Setting
the `MM_DEBUG` to `true` makes the plugin compile and build only for the OS and architecture
you are building on.

In your Mattermost configuration file, ensure that `PluginSettings.EnableUploads` is set to `true`, and `FileSettings.MaxFileSize` is
set to a large enough value to accept the plugin bundle (eg `256000000`).

### Installing Dependencies 

```sh
cd ./webapp
npm install
```

### Building the plugin

Run the following command in the plugin repository to prepare a compiled, distributable plugin ZIP file:

```bash
make dist
```

After a successful build, a `.tar.gz` file in the `/dist` folder will be created which can be uploaded to Mattermost. To avoid having to manually install your plugin, deploy your plugin using one of the following options.

##### Building in Dev Mode

Set the following environment variables to true before running `make dist`-

1. MM_DEBUG

### Deploying with Local Mode

If your Mattermost server is running locally, you can
enable [local mode](https://docs.mattermost.com/manage/mmctl-command-line-tool.html) to streamline deploying
your plugin. Edit your server configuration as follows:

```
{
    "ServiceSettings": {
        ...
        "EnableLocalMode": true,
        "LocalModeSocketLocation": "/var/tmp/mattermost_local.socket"
     }
}
```

and then deploy your plugin:

```bash
make deploy
```

If developing a plugin with a web app, watch for changes and deploy those automatically:

```bash
export MM_SERVICESETTINGS_SITEURL=http://localhost:8065
make watch-plugin
```

## How to Release

> **Warning:** merging to `main` deploys the plugin to the production Mattermost server
> automatically. There is no approval gate. Read [RELEASE.md](RELEASE.md) before merging.

Releases are driven entirely by the `version` field in `plugin.json`:

1. **Bump the version in `plugin.json`** in your feature branch:
   ```bash
   make show-version   # check the current one
   # edit plugin.json: "version": "9.2.5"
   ```

2. **Merge the PR into `main`.**

3. **GitHub Actions then automatically:**
   - runs `Check-in tests` (webapp lint + jest + `tsc`, and `golangci-lint` for the server);
   - on success triggers `Release Build`, which builds the plugin for **Linux AMD64 only**
     (`make dist-linux`, ~48 MB);
   - creates the git tag `v{version}` and a GitHub Release, uploading `boards-{version}.tar.gz`;
   - uploads and enables the plugin on the Mattermost server.

If you merge **without** bumping the version, the deployment still happens, but no new tag is
created and the artifact of the existing release is overwritten in place. See
[RELEASE.md](RELEASE.md) for why that is a problem.

For detailed instructions, see:
- [RELEASE.md](RELEASE.md) - Complete release guide, including limitations and risks
- [QUICKSTART-RELEASE.md](QUICKSTART-RELEASE.md) - Quick start
- [docs/RELEASE-WORKFLOW.md](docs/RELEASE-WORKFLOW.md) - Detailed workflow breakdown
- [docs/AUTO-UPDATE-GUIDE.md](docs/AUTO-UPDATE-GUIDE.md) - Auto-update setup

### Local Build

To build the release locally:

**Linux/macOS:**
```bash
./scripts/build-release.sh
```

**Windows:**
```powershell
.\scripts\build-release.ps1
```

Or manually:
```bash
make dist-linux   # linux-amd64 only, ~48 MB — what CI ships
make dist         # all five platforms, ~150-160 MB
```


### Unit testing

`make ci` is an alias for `make webapp-ci` and covers the web app only:

* **Web app lint**: `cd webapp; npm run check`
* **Web app unit tests**: `cd webapp; npm run test`
* **Web app type check**: `cd webapp; npm run check-types`

**Server tests are not run by `make ci`, and not by GitHub Actions either** — `make server-ci`
only runs `golangci-lint`. Run the Go tests yourself before checking in:

```bash
make server-test
```
