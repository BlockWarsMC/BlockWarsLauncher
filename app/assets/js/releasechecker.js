const got = require('got')
const semver = require('semver')

const path = require('path')

require('dotenv').config()
if (process.resourcesPath) {
    require('dotenv').config({ path: path.join(process.resourcesPath, '.env') })
}

const RELEASE_URL = process.env.RELEASE_URL

function evaluateRelease(manifest, currentVersion) {
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)
        || typeof manifest.latestVersion !== 'string' || !semver.valid(manifest.latestVersion)
        || typeof manifest.minimumVersion !== 'string' || !semver.valid(manifest.minimumVersion)
        || !semver.valid(currentVersion)
        || semver.gt(manifest.minimumVersion, manifest.latestVersion)
        || (manifest.message !== undefined && (typeof manifest.message !== 'string' || manifest.message.length > 2000))) {
        throw new Error('Invalid launcher release manifest or installed version')
    }

    return {
        status: semver.lt(currentVersion, manifest.minimumVersion) ? 'required'
            : semver.lt(currentVersion, manifest.latestVersion) ? 'available' : 'current',
        currentVersion,
        latestVersion: manifest.latestVersion,
        minimumVersion: manifest.minimumVersion,
        message: manifest.message?.trim() || ''
    }
}

async function checkRelease(currentVersion, request = got) {
    if (!RELEASE_URL) {
        throw new Error('RELEASE_URL environment variable is not set')
    }
    const manifest = await request(RELEASE_URL, {
        timeout: { request: 8000 },
        retry: { limit: 0 },
        headers: { 'cache-control': 'no-cache' }
    }).json()
    return evaluateRelease(manifest, currentVersion)
}

module.exports = { RELEASE_URL, evaluateRelease, checkRelease }
