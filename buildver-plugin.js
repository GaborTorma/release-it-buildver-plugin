'use strict'

import { Plugin } from 'release-it'
import semver from 'semver'

const BUILD_TYPES = ['build']
const RELEASE_TYPES = ['patch', 'minor', 'major']
const PRERELEASE_TYPES = ['prepatch', 'preminor', 'premajor']
const CONTINUATION_TYPES = ['prerelease', 'pre']
const ALL_RELEASE_TYPES = [
	...BUILD_TYPES,
	...RELEASE_TYPES,
	...PRERELEASE_TYPES,
	...CONTINUATION_TYPES,
]

const CHOICES = {
	latestIsPreRelease: [...RELEASE_TYPES, CONTINUATION_TYPES[0]],
	preRelease: PRERELEASE_TYPES,
	default: [...BUILD_TYPES, ...RELEASE_TYPES, ...PRERELEASE_TYPES],
}

const fixArgs = (args) => (args ? (typeof args === 'string' ? args.split(' ') : args) : [])

const getSemver = (version) => version?.match(/^.*(?=\+)/)?.[0] || version

const getNextSemver = (version, increment, preReleaseId) => {
	const ver = getSemver(version)
	return increment === 'build' ? ver : semver.inc(ver, increment, preReleaseId)
}

const getBuild = (version) => version?.match(/(?<=\+).*?(\d+).*$/)?.[1]

const getNextBuild = (version, start) => {
	const build = getBuild(version)
	return build ? parseInt(build) + 1 : start || 0
}

const defaultBuildOptions = { prefix: 'build', prefixSparator: '.', suffixSeparator: '-' }

const getMeta = (build, options = defaultBuildOptions) => {
	const prefix = options?.prefix ?? defaultBuildOptions.prefix
	const prefixSparator = options?.prefixSparator ?? defaultBuildOptions.prefixSparator
	const suffixSeparator = options?.suffixSeparator ?? defaultBuildOptions.suffixSeparator
	const suffix = options?.suffix
	let result = ''
	if (prefix) {
		result += prefix + prefixSparator
	}
	result += String(build)
	if (suffix) {
		result += suffixSeparator + suffix
	}
	return result
}

const getIncrementChoices = (context) => {
	const config = context['@gabortorma/release-it-buildver-plugin']
	const { isPreRelease, preReleaseId } = context.version
	const types = config.latestIsPreRelease
		? CHOICES.latestIsPreRelease
		: isPreRelease
		? CHOICES.preRelease
		: CHOICES.default
	return types.map((increment) => {
		const nextSemver = getNextSemver(context.latestVersion, increment, preReleaseId)
		const nextBuild = getNextBuild(context.latestVersion, config.build?.start)
		const meta = getMeta(nextBuild, config.build)
		return {
			name: `${increment} (${nextSemver}+${meta})`,
			value: increment,
		}
	})
}

const prompts = {
	incrementList: {
		type: 'list',
		message: () => 'Select increment (next version):',
		choices: (context) => getIncrementChoices(context),
		pageSize: 9,
	},
}

class Version extends Plugin {
	constructor(...args) {
		super(...args)
		this.registerPrompts(prompts)
	}

	getIncrement(options) {
		return options.increment
	}

	getIncrementedVersionCI(options) {
		return this.incrementVersion(options)
	}

	async getIncrementedVersion(options) {
		const { isCI } = this.config
		const version = this.incrementVersion(options)
		return version || (isCI ? null : await this.promptIncrementVersion(options))
	}

	promptIncrementVersion(options) {
		return new Promise((resolve) => {
			this.step({
				prompt: 'incrementList',
				task: (increment) =>
					increment
						? resolve(this.incrementVersion(Object.assign({}, options, { increment })))
						: this.step({ prompt: 'version', task: resolve }),
			})
		})
	}

	getSemver(version) {
		const ver = version?.match(/[0-9.-]+(?=\.\d+)/)?.[0]
		console.log('getSemver', ver)
		return ver
	}

	isPreRelease(version) {
		return Boolean(semver.prerelease(version))
	}

	isValid(version) {
		return Boolean(semver.valid(version))
	}

	incrementVersion({ latestVersion, increment, isPreRelease, preReleaseId }) {
		if (increment === false) {
			return latestVersion
		}

		const latestIsPreRelease = this.isPreRelease(latestVersion)
		const isValidVersion = this.isValid(increment)

		if (latestVersion) {
			this.setContext({ latestIsPreRelease })
		}

		if (isValidVersion && semver.gte(increment, latestVersion)) {
			return increment
		}

		if (isPreRelease && !increment && latestIsPreRelease) {
			return semver.inc(latestVersion, 'prerelease', preReleaseId)
		}

		if (this.config.isCI && !increment) {
			if (isPreRelease) {
				return semver.inc(latestVersion, 'prepatch', preReleaseId)
			} else {
				return semver.inc(latestVersion, 'patch')
			}
		}

		const normalizedType =
			RELEASE_TYPES.includes(increment) && isPreRelease ? `pre${increment}` : increment
		if (ALL_RELEASE_TYPES.includes(normalizedType)) {
			const nextSemver = getNextSemver(latestVersion, normalizedType, preReleaseId)
			const nextBuild = getNextBuild(latestVersion, this.options.build?.start)
			const meta = getMeta(nextBuild, this.options.build)
			this.nextVer = `${nextSemver}+${meta}`
			return this.nextVer
		}
	}

	async beforeRelease() {
		const { versionArgs } = this.options
		const args = [
			'--new-version',
			this.nextVer,
			'--no-commit-hooks',
			'--no-git-tag-version',
			...fixArgs(versionArgs),
		]
		this.log.info('Updating version by yarn...')
		await this.exec(`npx yarn version ${args.filter(Boolean).join(' ')}`)
		this.log.info('Updating package-lock by npm...')
		const task = () => this.exec('npm install --package-lock-only')
		return this.spinner.show({ task, label: 'yarn version' })
	}
}

export default Version
