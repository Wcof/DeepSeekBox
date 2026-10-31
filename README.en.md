# DeepSeekBox: a plugin center for DeepSeek Harness

[中文](README.md) | **English**

**DeepSeekBox is a plugin center for DeepSeek Harness (DSH).** It lists, installs, updates, enables and disables DeepSeek Harness plugins in one panel, aggregates multiple plugin index sources, flags versions the running DSH cannot load, and can install a plugin straight from a git branch when upstream has not published a release yet.

DeepSeekBox is itself an installable DSH bundle, and it publishes a `format: 1` plugin index that any DSH instance can subscribe to.

- Host: DeepSeek Harness 0.2.1 series (built and verified on `0.2.1-rc.5`)
- Package / panel name: `deepseek-box` / Plugin Center
- License: MIT
- Index URL: `https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`
- Landing page: <https://wcof.github.io/DeepSeekBox/>

If you are looking for "where do I install DeepSeek Harness plugins" or "does DSH have a plugin marketplace", this is that layer. The plugin list comes from the host's real `pluginManager` / `pluginMarket` services — there is no second copy of the data.

## Why it exists

DeepSeek Harness already ships a Discover page and plugin management. DeepSeekBox talks to the same host services and adds four things on top:

1. **Multiple index sources in one list.** DSH browses one index at a time; DeepSeekBox merges every subscribed index into a single list, grouped by source, filterable by author, with per-index counts and errors.
2. **Visible version compatibility.** The `engines.dsh` range recorded in an index is shown as-is. A version your DSH cannot run is marked *Version mismatch* and cannot be installed, instead of failing halfway through and rolling back.
3. **Install from a branch.** The version chip in the card's bottom-left corner opens the repository's branch list, so you can install a fix that upstream has pushed to a branch but never released.
4. **Separate provenance labels.** *DSH official*, *DeepSeekBox catalog* and *Third-party* are three different badges — no blurring.

## Features

| Feature | What it does |
|---|---|
| Plugin management | Lists the real bundles and plugin rows in the current profile; enable/disable a whole bundle or a single row |
| Plugin market | Aggregates subscribed indexes with search, source filters, author facets, sorting and paging |
| Install & update | Install from an index entry, check for updates, update one or all |
| Install from branch | Click the version chip → pick a branch → install; shows branch version, required DSH range and the branch's own description |
| Compatibility flag | Marks the recommended version as *Version mismatch* and shows the required range |
| Index sources | Review subscribed indexes, subscribe to the DeepSeekBox index, open the current index file |
| Uninstall | Removes the dependency after a confirmation; the profile's plugin rows go with it |

There is no plugin configuration form: the DSH remote surface exposes bundle/row enablement plus install and remove only. Configuration schemas live on the model side (`Config.listConfigs`).

## Install

DeepSeekBox is a standard DSH bundle (`package.json` declares `dsh.bundle.patch`). Pick one of three ways.

### 1. From the plugin index (recommended)

1. Open the DeepSeek Harness **Discover** page, add this URL under *Index sources*:
   `https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`
2. Search for "Plugin Center" or `deepseek-box`, then install.
3. Restart the DSH window — host-side code is loaded at startup.

### 2. From GitHub

In the plugin center's **Install plugin** dialog, enter either:

- `github:Wcof/DeepSeekBox`
- `git+https://github.com/Wcof/DeepSeekBox#<commit-sha>` (pinned to a commit, useful for reproducing issues)

Or from the DSH CLI (`--profile` takes your profile name; desktop is usually `desktop`):

```bash
dsh plugin --profile web add github:Wcof/DeepSeekBox
```

### 3. From a local directory (development)

Enter the absolute path of this repository in the same dialog, e.g. `/Users/you/code/DeepSeekBox`. Run `npm run build` and commit `web/` after frontend changes — git installs do not run a build.

## Usage

### Plugin management

The top row shows counters (all / official / third-party / local); clicking a card filters the list. Each card shows title, package name, origin, runtime status and plugin-row count. **Details** opens the per-row enablement page.

### Plugin market

Entries are grouped by index source. Cards show provenance (DSH official / DeepSeekBox catalog / third-party), status (installable, installed, update available, version mismatch) and the current version. The toolbar offers search, source chips, multi-select author facets and four sort orders. Indexes longer than 100 entries are paged by `nextOffset`; when the page cap is hit, the list says so instead of silently truncating.

### Install from a branch

Click the version chip at the bottom-left of a card (for example `v0.3.1 ▾`) to open the repository's branches:

- each row shows the branch name, the version inside it, the `engines.dsh` requirement, and the branch's own title and description (branches can describe themselves differently);
- branches without `dsh.bundle` cannot be installed;
- the currently installed branch is marked, and switching branches requires uninstalling first.

You are installing **the branch's current head commit**, which upstream can move at any time. For a fixed version, wait for a tagged release and use the normal install path.

The branch list is read by the host half with `git ls-remote --heads` (no GitHub API quota), falling back to the GitHub REST API only when git is unavailable.

### Update checks

The panel silently compares installed versions with the index on open and shows a banner when updates exist. **Check for updates** forces an index refresh.

## Catalog and provenance labels

| Badge | Meaning | How it is decided |
|---|---|---|
| DSH official | Maintained or curated by DSH itself | Index entry has `official` in `metadata.labels` |
| DeepSeekBox catalog | Listed in this repository's index | Index entry has `deepseekbox` in `metadata.keywords` |
| Third-party | Comes from another subscribed index | Neither of the above |

**"DeepSeekBox catalog" is this project's curation, not an endorsement by DSH.** Inclusion criteria: the repository exists, it really is a DSH plugin (declares `dsh.bundle`, installable with `dsh plugin add`), version and license are verifiable from `package.json` / `LICENSE`, and the version corresponds to a release or a fixed commit. The index currently lists 10 plugins across six categories: reading, learning, productivity, UI, tools, models.

To suggest a plugin, open an issue with the repository URL, target version and license.

## Plugin index source

The index is published with the repository in DSH's `format: 1` and can be subscribed to by any DSH instance:

- GitHub Raw (always current `main`, recommended):
  `https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/index.json`
- jsDelivr (`main`, CDN cache up to ~12 hours):
  `https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json`
- jsDelivr (pinned to a commit, immutable):
  `https://cdn.jsdelivr.net/gh/Wcof/DeepSeekBox@<commit-sha>/index.json`

The index is generated from `src/data/catalog.ts` by `src/data/pluginIndex.ts`; `npm run build` writes the root `index.json` and validates it with `@deepseek-ai/dsh-plugin-market-index`. Every version carries `source: { type: "git", url, commit }`, and `engines.dsh` mirrors the `package.json` at that commit — leaving the field empty means "any DSH version", so it must not be filled in casually.

If jsDelivr lags, purge it: `https://purge.jsdelivr.net/gh/Wcof/DeepSeekBox@main/index.json`.

### Community catalog (full list)

The curated index only carries hand-picked entries. The repository also publishes a **community catalog** synced from [dsh-plugin.org](https://dsh-plugin.org), where every entry was verified at repository level: the repo is reachable, its `package.json` at that commit declares `dsh.bundle`, and the version comes from the package itself.

- `https://raw.githubusercontent.com/Wcof/DeepSeekBox/main/community.json`

Subscribe from DSH's Discover → Index sources, or click **Community catalog** in the plugin center's market toolbar. With thousands of entries, search beats paging; the list renders in batches with a **Show more** button.

Being listed there means "this repository really is a DSH bundle" — not that its behaviour or compatibility was tested. The host still decides installability by `engines.dsh`.

## Compatibility and limits

- Verified against DSH `0.2.1-rc.5` (npm `latest`). After a host upgrade, run `npm run check:engines` to re-check the index.
- Compatibility is decided host-side: when `engines.dsh` exists it is the only criterion (peer dependencies are ignored), evaluated as `semver.satisfies(runtime, range, { includePrerelease: true })`.
- Branch installs show the declared `engines.dsh` but cannot predict compatibility: the runtime version is not exposed to the page, and the decision happens at install time.
- One published version per plugin in the index. Other versions are reachable through branch installs or by bumping the index.
- No plugin configuration UI (see above).

## FAQ

**How is this different from the built-in Discover page?**
Both read the same host services. Discover browses one index at a time; DeepSeekBox merges sources and adds author facets, compatibility flags and branch installs.

**Is "DeepSeekBox catalog" the same as DSH official?**
No. It only means the plugin is listed in this repository's index. Official entries carry an `official` label.

**Why does a plugin say "version mismatch"?**
That version's `engines.dsh` does not include your DSH version. The card shows the required range; upgrade DSH or wait for the plugin to widen its range.

**How is a branch install different from a normal install?**
A normal install uses the commit recorded in the index. A branch install uses the branch's current head commit, which moves with upstream pushes — meant for unreleased fixes.

**Why restart after installing?**
Host-side plugin code loads when DSH starts. Frontend assets can hot-update; host code cannot.

**The index is subscribed but nothing shows up?**
Check the URL in a browser (it should return JSON), then click **Check for updates** to refresh the cache. jsDelivr caches for ~12 hours; use the purge link above if needed.

## Development

```bash
npm install
npm run dev              # dev server at http://localhost:5180 with a fake host
npm run build            # type check + build into web/, then index and bundle validation
npm run preview          # preview the build output
npm run validate:index   # run the official index validator only
npm run validate:bundle  # run the bundle self-check only
npm run check:engines    # compare index engines.dsh with upstream package.json
```

Stack: Vue 3 `<script setup>` + TypeScript + Vite, no UI library and no router, hand-written CSS. `web/` is the committed build artifact — DSH does not run a build when installing from git, and a missing `web/` returns 503.

### Layout

```
index.js            host half: /deepseekbox/ static route + /deepseekbox/api/rpc
client.js           client half: sidebar entry + iframe panel
cordis.patch.yml    bundle patch that inserts the plugin-center row
locale/{zh,en}.json titles and descriptions shown by DSH
src/                frontend source (components / stores / services / data / types / styles)
web/                committed build output
scripts/            index and bundle validation, self entry sync, engines check, dev fake host
index.json          published plugin index (generated on build)
```

### Data flow

The page only talks to `src/services/pluginService.ts`, which turns each action into `POST /deepseekbox/api/rpc` with `{ method, params }`; the host half forwards to DSH's `pluginManager` / `pluginMarket`. Methods: `status`, `listBundles`, `listPlugins`, `setBundleEnabled`, `setPluginEnabled`, `removeBundle`, `installBundle`, `listIndexes`, `setIndexes`, `searchMarket`, and `repoBranches` (the only method not backed by a DSH service — it reads repository branches).

The endpoint accepts POST from the same origin only, with a 512 KiB body limit. Install and remove run pnpm and can take minutes.

## Related

- [AGENTS.md](AGENTS.md) — engineering structure, boundaries, red lines, verification steps
- [ROADMAP.md](ROADMAP.md) — current status and history
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — the host this plugin runs in
- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) — community list of DSH plugins

## License

MIT, see [LICENSE](LICENSE).
