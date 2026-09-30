// Workaround for vercel CLI on Windows (vercel/vercel#8762): the CLI's
// env-clone reads obj.PATH, which is undefined when the inherited env key is
// mixed-case "Path" -> build spawn loses PATH -> "spawn cmd.exe ENOENT".
// Rename the key to uppercase PATH before launching the CLI.
const { spawnSync } = require("child_process");

const pathValue = process.env.Path ?? process.env.PATH;
delete process.env.Path;
delete process.env.PATH;
process.env.PATH = pathValue;

const spawned = Object.keys(process.env).filter((k) => /^path$/i.test(k));
console.log("[wrapper] env path keys:", JSON.stringify(spawned));

const args = process.argv.slice(2);

// Inject the PATH sanitizer into every node child (vercel build runs nested
// node processes; NODE_OPTIONS propagates).
const fixPath = require("path").join(__dirname, "_vercel-fix.cjs");
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS
  ? `${process.env.NODE_OPTIONS} --require ${fixPath}`
  : `--require ${fixPath}`;

const r = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  args,
  { stdio: "inherit", env: process.env, shell: true, cwd: __dirname }
);
process.exit(r.status ?? 1);
