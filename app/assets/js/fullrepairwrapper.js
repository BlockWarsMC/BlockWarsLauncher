const { FullRepair } = require('helios-core/dl')
const ConfigManager = require('./configmanager')
const { LoggerUtil } = require('helios-core')
const { matchesPattern } = require('./validationfilter')
const path = require('path')

const logger = LoggerUtil.getLogger('FullRepairWrapper')

/**
 * Wrapper for FullRepair that supports ignoring files during validation.
 * (Might move to helios-core in the future)
 */
class FullRepairWrapper {
    constructor(commonDirectory, instanceDirectory, launcherDirectory, serverId, devMode) {
        this.commonDirectory = commonDirectory
        this.instanceDirectory = instanceDirectory
        this.launcherDirectory = launcherDirectory
        this.serverId = serverId
        this.devMode = devMode
        this.fullRepair = null
    }

    /**
     * Spawn the receiver process with ignored patterns in environment.
     */
    spawnReceiver() {
        const ignoredPatterns = ConfigManager.getIgnoredValidationFiles()
        
        // Create the FullRepair instance
        this.fullRepair = new FullRepair(
            this.commonDirectory,
            this.instanceDirectory,
            this.launcherDirectory,
            this.serverId,
            this.devMode
        )
        
        // Pass ignored patterns via environment variables
        const envVars = {}
        if (ignoredPatterns && ignoredPatterns.length > 0) {
            envVars.IGNORED_VALIDATION_PATTERNS = JSON.stringify(ignoredPatterns)
            logger.info(`Passing ${ignoredPatterns.length} ignore pattern(s) to validation process`)
        }
        
        this.fullRepair.spawnReceiver(envVars)
    }

    /**
     * Destroy the receiver process.
     */
    destroyReceiver() {
        if (this.fullRepair) {
            this.fullRepair.destroyReceiver()
        }
    }

    /**
     * Get the child process.
     */
    get childProcess() {
        return this.fullRepair ? this.fullRepair.childProcess : null
    }

    /**
     * Verify files - delegates to the wrapped FullRepair instance.
     * 
     * @param {Function} onProgress Progress callback
     * @returns {Promise<number>} Number of invalid files
     */
    async verifyFiles(onProgress) {
        if (!this.fullRepair) {
            throw new Error('FullRepair not initialized. Call spawnReceiver() first.')
        }
        
        return await this.fullRepair.verifyFiles(onProgress)
    }

    /**
     * Download files - delegates to the wrapped FullRepair instance.
     * 
     * @param {Function} onProgress Progress callback
     * @returns {Promise<void>}
     */
    async download(onProgress) {
        if (!this.fullRepair) {
            throw new Error('FullRepair not initialized. Call spawnReceiver() first.')
        }
        
        return await this.fullRepair.download(onProgress)
    }

    /**
     * Check if a file should be ignored based on configured patterns.
     * This is a utility method for manual checking.
     * 
     * @param {string} filePath The file path to check
     * @returns {boolean} True if the file should be ignored
     */
    static shouldIgnoreFile(filePath) {
        const ignoredPatterns = ConfigManager.getIgnoredValidationFiles()
        return matchesPattern(filePath, ignoredPatterns)
    }
}

module.exports = {
    FullRepairWrapper
}
