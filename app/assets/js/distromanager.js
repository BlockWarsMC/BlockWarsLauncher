const { DistributionAPI } = require('helios-core/common')
const ConfigManager = require('./configmanager')
const path = require('path')

// Try loading environment variables for both dev and packaged builds
require('dotenv').config()
try {
  const resourcesEnv = path.join(process.resourcesPath || '', '.env')
  require('dotenv').config({ path: resourcesEnv })
} catch (e) {
  // Ignore if not in an Electron packaged context
}

/**
 * Construct the distribution URL based on the branch setting
 * @returns {string} The distribution URL
 */
function getDistributionURL() {
    const baseURL = process.env.REMOTE_DISTRO_URL
    if (!baseURL) {
        throw new Error('REMOTE_DISTRO_URL environment variable is not set')
    }
    
    // Get the branch setting from ConfigManager
    const branch = ConfigManager.getDistributionBranch()
    
    // If branch is 'main' or empty, use distribution.json
    // Otherwise, use distribution_{branch}.json
    if (!branch || branch === 'main') {
        return baseURL
    } else {
        // Replace distribution.json with distribution_{branch}.json
        return baseURL.replace('distribution.json', `distribution_${branch}.json`)
    }
}

/**
 * Get the fallback distribution URL (always main)
 * @returns {string} The main distribution URL
 */
function getFallbackDistributionURL() {
    const baseURL = process.env.REMOTE_DISTRO_URL
    if (!baseURL) {
        throw new Error('REMOTE_DISTRO_URL environment variable is not set')
    }
    return baseURL
}

// Use environment variable for the distribution URL (exposed for debugging/telemetry)
exports.REMOTE_DISTRO_URL = process.env.REMOTE_DISTRO_URL

let api = null

/**
 * Initialize or refresh the DistributionAPI with the current branch setting
 */
function initializeDistributionAPI() {
    const distributionURL = getDistributionURL()
    
    if (api === null) {
        // First time initialization
        api = new DistributionAPI(
            ConfigManager.getLauncherDirectory(),
            null, // Injected forcefully by the preloader.
            null, // Injected forcefully by the preloader.
            distributionURL,
            false
        )
        
        // Set the commonDir and instanceDir as expected by the preloader
        api['commonDir'] = ConfigManager.getCommonDirectory()
        api['instanceDir'] = ConfigManager.getInstanceDirectory()
        
        // Override the getDistribution method to add fallback logic
        const originalGetDistribution = api.getDistribution.bind(api)
        api.getDistribution = async function() {
            try {
                const result = await originalGetDistribution()
                
                // Check if the result is valid (has servers array)
                if (result && result.servers && Array.isArray(result.servers) && result.servers.length > 0) {
                    return result
                } else {
                    throw new Error('Invalid distribution data - no servers found')
                }
            } catch (error) {
                // Create a new API instance with the fallback URL
                const fallbackURL = getFallbackDistributionURL()
                const fallbackAPI = new DistributionAPI(
                    ConfigManager.getLauncherDirectory(),
                    api.commonDir,
                    api.instanceDir,
                    fallbackURL,
                    api.devMode
                )
                
                return await fallbackAPI.getDistribution()
            }
        }
    } else {
        // Refresh with new URL
        api = new DistributionAPI(
            ConfigManager.getLauncherDirectory(),
            api.commonDir, // Preserve existing commonDir
            api.instanceDir, // Preserve existing instanceDir
            distributionURL,
            api.devMode // Preserve existing devMode
        )
        
        // Override the getDistribution method to add fallback logic
        const originalGetDistribution = api.getDistribution.bind(api)
        api.getDistribution = async function() {
            try {
                const result = await originalGetDistribution()
                
                // Check if the result is valid (has servers array)
                if (result && result.servers && Array.isArray(result.servers) && result.servers.length > 0) {
                    return result
                } else {
                    throw new Error('Invalid distribution data - no servers found')
                }
            } catch (error) {
                // Create a new API instance with the fallback URL
                const fallbackURL = getFallbackDistributionURL()
                const fallbackAPI = new DistributionAPI(
                    ConfigManager.getLauncherDirectory(),
                    api.commonDir,
                    api.instanceDir,
                    fallbackURL,
                    api.devMode
                )
                
                return await fallbackAPI.getDistribution()
            }
        }
    }
    return api
}

/**
 * Get the DistributionAPI instance, initializing it if necessary
 */
function getDistroAPI() {
    if (api === null) {
        return initializeDistributionAPI()
    }
    return api
}

/**
 * Refresh the DistributionAPI with the current branch setting
 */
function refreshDistributionAPI() {
    return initializeDistributionAPI()
}

// Export the API getter function directly
Object.defineProperty(exports, 'DistroAPI', {
    get: function() {
        return getDistroAPI()
    }
})

exports.getDistributionURL = getDistributionURL
exports.refreshDistributionAPI = refreshDistributionAPI