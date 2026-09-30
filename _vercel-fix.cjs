// TEMP workaround injected via NODE_OPTIONS while running the Vercel CLI on
// Windows: some build-spawn stages write a corrupt uppercase PATH
// ("<...>\node_modules\.bin;undefined") next to a healthy mixed-case "Path",
// and cross-spawn/which prefers the corrupt PATH -> "spawn cmd.exe ENOENT".
// Sanitize the env at spawn time: if PATH is broken, restore it from Path.
const cp = require("child_process");
console.error("[vercel-fix] loaded, PATH keys will be sanitized at spawn");

function sanitize(opts) {
  try {
    const e = opts && opts.env;
    if (!e || typeof e.PATH !== "string") return;
    const broken =
      e.PATH.includes("undefined") ||
      e.PATH.trim() === "" ||
      (!/system32/i.test(e.PATH) && !/System32/i.test(e.PATH) && process.platform === "win32");
    if (broken) {
      const good = e.Path || e.path || process.env.Path || process.env.PATH;
      if (good && typeof good === "string" && !good.includes("undefined")) {
        e.PATH = good;
        delete e.Path;
        delete e.path;
      }
    }
  } catch (err) {
    /* never break the spawn itself */
  }
}

for (const fn of ["spawn", "spawnSync"]) {
  const orig = cp[fn];
  cp[fn] = function (cmd, args, opts) {
    sanitize(opts);
    return orig.apply(this, arguments);
  };
}

// Workaround 2: creating symlinks on Windows needs Developer Mode/admin.
// The vercel builder symlinks deduplicated function dirs (.func -> canonical).
// Retry EPERM/EACCES as a directory junction, which needs no privileges
// (junction targets must be absolute).
const fs = require("fs");
const path = require("path");

function isPermError(err) {
  return (
    !!err &&
    (err.code === "EPERM" || err.code === "EACCES") &&
    process.platform === "win32"
  );
}

function junctionTarget(target, dest) {
  const t = String(target);
  return path.isAbsolute(t) ? t : path.resolve(path.dirname(String(dest)), t);
}

for (const name of ["symlink", "symlinkSync"]) {
  const orig = fs[name];
  if (typeof orig !== "function") continue;
  if (name === "symlinkSync") {
    fs[name] = function (target, dest, type) {
      try {
        return orig.call(fs, target, dest, type);
      } catch (err) {
        if (isPermError(err)) {
          return orig.call(fs, junctionTarget(target, dest), dest, "junction");
        }
        throw err;
      }
    };
  } else {
    fs[name] = function (target, dest, type, cb) {
      if (typeof type === "function") {
        cb = type;
        type = undefined;
      }
      return orig.call(fs, target, dest, type, (err) => {
        if (isPermError(err)) {
          try {
            return orig.call(
              fs,
              junctionTarget(target, dest),
              dest,
              "junction",
              (err2) => cb && cb(err2)
            );
          } catch (e) {
            return cb && cb(err);
          }
        }
        return cb && cb(err);
      });
    };
  }
}
