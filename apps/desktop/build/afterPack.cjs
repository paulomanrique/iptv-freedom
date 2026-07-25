// electron-builder afterPack hook: bundle the arch-appropriate ffmpeg binary.
//
// The release matrix builds x64 + arm64 on a single runner per OS, so we cannot
// rely on the host-arch binary. Instead we depend on every per-arch
// @ffmpeg-installer package and, for each packaged arch, copy the matching
// binary into the app's Resources folder (where process.resourcesPath points).
const fs = require("fs");
const path = require("path");
const { Arch } = require("electron-builder");

// platform + arch -> @ffmpeg-installer package name.
// Windows-on-ARM emulates x64, so win32/arm64 reuses the win32-x64 binary.
function packageFor(platform, archName) {
  const map = {
    "darwin/x64": "darwin-x64",
    "darwin/arm64": "darwin-arm64",
    "linux/x64": "linux-x64",
    "linux/arm64": "linux-arm64",
    "win32/x64": "win32-x64",
    "win32/arm64": "win32-x64",
  };
  return map[`${platform}/${archName}`];
}

exports.default = async function afterPack(context) {
  const platform = context.electronPlatformName; // 'darwin' | 'win32' | 'linux'
  const archName = Arch[context.arch]; // 'x64' | 'arm64' | ...
  const pkg = packageFor(platform, archName);
  if (!pkg) {
    throw new Error(`afterPack: no ffmpeg binary mapped for ${platform}/${archName}`);
  }

  const binName = platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  // The @ffmpeg-installer package ships the binary next to its package.json.
  const srcDir = path.dirname(require.resolve(`@ffmpeg-installer/${pkg}/package.json`));
  const src = path.join(srcDir, binName);
  if (!fs.existsSync(src)) {
    throw new Error(`afterPack: ffmpeg binary not found at ${src}`);
  }

  // Destination = the packaged app's Resources dir (= runtime process.resourcesPath).
  const resourcesDir =
    platform === "darwin"
      ? path.join(
          context.appOutDir,
          `${context.packager.appInfo.productFilename}.app`,
          "Contents",
          "Resources",
        )
      : path.join(context.appOutDir, "resources");
  fs.mkdirSync(resourcesDir, { recursive: true });
  const dest = path.join(resourcesDir, binName);
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o755);
  console.log(`afterPack: bundled ffmpeg (${pkg}) -> ${dest}`);
};
