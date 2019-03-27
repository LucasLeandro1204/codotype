const Promise = require('bluebird');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { inflate } = require('@codotype/util/lib/inflate')
const Generator = require('@codotype/generator')

// // // //
// Constants

const OUTPUT_DIRECTORY = 'codotype-build'
const CODOTYPE_MANIFEST_DIRECTORY = '.codotype'
const MODULES_ROOT = 'node_modules'
const GENERATOR_META_FILENAME = 'codotype-generator.json'
const GENERATOR_CLASS_PATH = 'generator'
const GENERATOR_README_FILENAME = 'README.md'

// // // //

// CodotypeRuntime class definition
module.exports = class CodotypeRuntime {

  // constructor
  // Handles options to run a single generator instance
  constructor(options = {}) {

    // Assigns this.options
    this.options = options;

    // TODO - add option for LOG_LEVEL
    // TODO - add option for FORCE (overwrite existing files, or prompt user to overwrite if changes are detected)

    // Assigns this.generators
    this.generators = [];

    // Assigns this.options.cwd
    this.options.cwd = process.cwd();

    // Returns the runtime instance
    return this
  }

  // registerGenerator
  // Registers an individual generator by it's node_modules name
  // i.e. 'codotype-generator-nuxt' in `node_modules/codotype-generator-nuxt'`
  registerGenerator ({ module_path, relative_path, absolute_path }) {

    // Resolves path to generator
    let engine_path = ''

    // Generator is located in node_modules
    if (module_path) {
      engine_path = path.join(this.options.cwd, MODULES_ROOT, module_path)
    } else if (relative_path) {
      engine_path = path.join(this.options.cwd, relative_path)
    } else {
      engine_path = absolute_path
    }

    // Construct the module path
    const generator_path = path.join(engine_path, GENERATOR_CLASS_PATH)
    const generator_meta_path = path.join(engine_path, GENERATOR_META_FILENAME)
    const generator_readme_path = path.join(engine_path, GENERATOR_README_FILENAME)

    // // // //
    // // // //
    // TODO - implement logging function
    // console.log(generator_path)
    // console.log(generator_meta_path)
    // console.log(generator_readme_path)
    // // // //
    // // // //

    // Try to load up the generator & associated metadata, catch error
    try {
      // Require the class dynamically
      const GeneratorClass = require(generator_path); // eslint-disable-line import/no-dynamic-require
      const GeneratorMeta = require(generator_meta_path); // eslint-disable-line import/no-dynamic-require

      // Pull in the generator's README.md
      const foundReadme = fs.existsSync(generator_readme_path);

      // Adds generator to this.generators if requirements are met
      // if (GeneratorClass && GeneratorMeta && foundReadme) {
      if (GeneratorClass && GeneratorMeta && foundReadme) {

        // Adds generator_path (VERY IMPORTANT) to GeneratorMeta
        GeneratorMeta.engine_path = engine_path
        GeneratorMeta.generator_path = generator_path

        // Adds readme_markown to GeneratorMeta
        GeneratorMeta.readme = fs.readFileSync(generator_readme_path, 'utf8')

        // Tracks GeneratorMeta in this.generators
        this.generators.push(GeneratorMeta)

        // Logs
        // console.info(`Registered ${GeneratorClass.name} generator`)
        // console.info(`Registered generator`)
        return
      }

      // Logs which generator is being run
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        console.log('REGISTRATION ERROR - GENERATOR NOT FOUND')
        throw err;
      } else {
        console.log('REGISTRATION ERROR - OTHER')
        throw err;
      }
    }
  }

  // writeBuildManifest
  // Writes the build and the blueprint data to the destination directory
  async writeBuildManifest ({ build }) {
    let output_directory = build.id || ''
    const destRoot = path.join(this.options.cwd, OUTPUT_DIRECTORY, output_directory, build.blueprint.identifier);
    await this.ensureDir(destRoot)

    const manifestDest = path.join(destRoot, CODOTYPE_MANIFEST_DIRECTORY);
    await this.ensureDir(manifestDest)

    // Writes two source files into the `.codotype` directory
    return new Promise((resolve, reject) => {
      fs.writeFileSync(path.join(manifestDest + '/codotype-build.json'), JSON.stringify(build, null, 2))
      fs.writeFileSync(path.join(manifestDest + `/${build.blueprint.identifier}-codotype-blueprint.json`), JSON.stringify(build.blueprint, null, 2))
      return resolve()
    });
  }

  // ensureDir
  // Ensures presence of directory for template compilation
  // TODO - this is repeated in @codotype/generator - should be abstracted, or only encapsulated in the runtime
  async ensureDir (dir) {
    return new Promise((resolve, reject) => {
      return fsExtra.ensureDir(dir, (err) => {
        if (err) return reject(err)
        return resolve()
      })
    })
  }

  // getGenerators
  // Returns an array of generators registered to this runtime instance
  getGenerators () {
    return this.generators;
  }

  // write
  // Method for write files to the filesystem
  // TODO - accept OUTPUT_DIRECTORY override
  async execute ({ build }) {

    // Pulls attributes out of build object
    let {
      id,
      blueprint,
      configuration,
      generator_id
    } = build

    // Inflates blueprint metadata
    // TODO - handle missing blueprint object
    blueprint = inflate({ blueprint });

    // TODO - annotate this
    await this.writeBuildManifest({ build })

    // Pulls generator from registry runtime registry
    // TODO - conflate each stage to its respective generator,
    // skipping / throwing errors on those whos generator is missing
    const generator = this.generators.find(g => g.id === generator_id)
    if (!generator) return
    const { generator_path } = generator

    // Sets output_directory default to build ID by default
    const output_directory = id || '';

    // Assigns `dest` option for generator
    // TODO - handle condition of missing blueprint.identifier
    const dest = path.join(this.options.cwd, OUTPUT_DIRECTORY, output_directory, blueprint.identifier);

    // Try to load up the generator from generator_path, catch error
    // TODO - this final check should be abstracted into a separate function
    try {
      // const GeneratorClass = require(generator_path); // eslint-disable-line import/no-dynamic-require
      const generatorPrototype = require(generator_path); // eslint-disable-line import/no-dynamic-require
      const resolved = require.resolve(generator_path);

      // Defines options for generator instance
      const generatorOptions = {
        blueprint,
        dest,
        resolved,
        meta: generator,
        configuration
      }

      // Logging
      // console.info(`Executing ${GeneratorClass.name} generators:`)
      console.info(`Executing generators:`)

      // Creates Generator instance
      const generatorInstance = new Generator(generatorPrototype, generatorOptions)

      // Invokes `generator.forEachSchema` once for each in blueprint.schemas
      await Promise.all(blueprint.schemas.map((schema) => generatorInstance.forEachSchema({ schema: schema, ...this.options })))

      // Invokes `generator.write()` once
      await generatorInstance.write(this.options)

      // Invokes generator.compileTemplatesInPlace()
      await generatorInstance.compileTemplatesInPlace()

      // Logs which generator is being run
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        console.log('RUNTIME ERROR - GENERATOR NOT FOUND')
      } else {
        console.log('RUNTIME ERROR - OTHER')
        throw err;
      }
      // return reject(err)
    }

    // Thank you message
    console.log('\nBuild complete\nThank you for using Codotype :)\nFollow us on github.com/codotype\n')
  }
}