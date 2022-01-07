const { buildSync: esbuild } = require('esbuild')
const { join } = require('path')
const { 
	copyFileSync: copyFile, 
	renameSync: rename,
	existsSync: exists, 
	mkdirSync: mkdir,
	rmSync: rm
} = require('fs')

const defaultOptions = {
	outputPrefix: 'build',
	entryFile: 'app.js'
}

/** @param {AdapterSpecificOptions} options */
module.exports = function (overrides = {}) {
	const options = {
		...defaultOptions,
		...overrides
	}

	/** @type {import('@sveltejs/kit').Adapter} */
	return {
		name: 'adapter-static-lambda',
		async adapt(builder) {
			const { clientDir, serverDir, tempDir } = createBuildDirs(options.outputPrefix)

			builder.log(`Writing client assets to '${clientDir}'`)
      builder.writeClient(clientDir)
      builder.writeStatic(clientDir)

			builder.log(`Prerendering assets in '${clientDir}'`)
      await builder.prerender({ 
				all: true,
				dest: clientDir
			})

			builder.log(`Writing Lambda server to '${tempDir}'`)
      builder.writeServer(tempDir)
			rename(`${tempDir}/app.js`, `${tempDir}/server.js`)
			copyFile(`${__dirname}/lambda/app.js`, `${tempDir}/app.js`)
			copyFile(`${__dirname}/lambda/shims.js`, `${tempDir}/shims.js`)

			builder.log(`Bundling Lambda with CommonJS in '${serverDir}'`)
			esbuild({
        entryPoints: [`${tempDir}/app.js`],
				outfile: `${serverDir}/${options.entryFile}`,
				inject: [`${tempDir}/shims.js`],
				bundle: true,
        platform: 'node',
        format: 'cjs'
      })

			// todo: use ./svelte-kit/adapter-static-lambda/
			builder.log(`Removing temporary files in '${tempDir}'`)
			rm(tempDir, { recursive: true })
		}
	}
}

function createBuildDirs(outputPrefix) {
	if (exists(outputPrefix)) {
		rm(outputPrefix, { recursive: true })
	}
	mkdir(outputPrefix)

	const clientDir = join(outputPrefix, 'client')
	if (!exists(clientDir)) {
		mkdir(clientDir)
	}

	const serverDir = join(outputPrefix, 'server')
	if (!exists(serverDir)) {
		mkdir(serverDir)
	}

	const tempDir = join(outputPrefix, 'temp')
	if (!exists(tempDir)) {
		mkdir(tempDir)
	}

	return { clientDir, serverDir, tempDir }
}
