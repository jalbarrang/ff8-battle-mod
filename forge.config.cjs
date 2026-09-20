/** @type {import('@electron-forge/shared-types').ForgeConfig} */
module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/node_modules/{koffi,@koromix/koffi-win32-x64}/**/*'
    },
    executableName: 'FF8 Battle HP',
    ignore: [
      /^\/\.git($|\/)/,
      /^\/\.svelte-kit($|\/)/,
      /^\/dist($|\/)/,
      /^\/out($|\/)/,
      /^\/src($|\/)/,
      /^\/scripts($|\/)/,
      /^\/public($|\/)/,
      /^\/assets($|\/)/,
      /^\/patches($|\/)/,
      /^\/node_modules\/(?!koffi(?:\/|$)|@koromix(?:$|\/koffi-win32-x64(?:\/|$))).+/,
      /^\/\.(?:gitignore|npmrc)$/,
      /^\/(?:BUILD-NOTES|README)\.md$/,
      /^\/(?:forge|svelte|vite(?:\.[^.]+)?|tsconfig(?:\.[^.]+)?)\.config\.(?:cjs|js|ts)$/,
      /^\/pnpm-(?:lock|workspace)\.yaml$/,
      /^\/memory-dump\.txt$/,
      /^\/forge-(?:error|exit|package)\.(?:log|txt)$/
    ]
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'FF8BattleHP',
        setupExe: 'FF8-Battle-HP-Setup.exe',
        authors: 'Dennis Williams (dw1284), maintained by Juan Alb',
        description: 'External battle and party editor for Final Fantasy VIII (2013 Steam).'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    }
  ]
};
