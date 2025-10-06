const ConfigManager = require('./configmanager')
const { LoggerUtil } = require('helios-core')
const path = require('path')

const logger = LoggerUtil.getLogger('ValidationFilter')

/**
 * Check if a file path matches any of the ignore patterns.
 * Supports glob-style patterns:
 * - * matches any characters except path separator
 * - ** matches any characters including path separators
 * - ? matches a single character
 * 
 * @param {string} filePath The file path to check
 * @param {Array<string>} patterns Array of glob patterns to match against
 * @returns {boolean} True if the file matches any pattern
 */
function matchesPattern(filePath, patterns) {
    if (!patterns || patterns.length === 0) {
        return false
    }

    // Normalize path separators to forward slashes for consistent matching
    const normalizedPath = filePath.replace(/\\/g, '/')
    
    for (const pattern of patterns) {
        const normalizedPattern = pattern.replace(/\\/g, '/')
        
        // Convert glob pattern to regex
        // Escape special regex characters except * and ?
        let regexPattern = normalizedPattern
            .replace(/[.+^${}()|[\]]/g, '\\$&')
            .replace(/\*\*/g, '___DOUBLESTAR___')
            .replace(/\*/g, '[^/]*')
            .replace(/___DOUBLESTAR___/g, '.*')
            .replace(/\?/g, '.')
        
        // Add anchors for exact matching
        regexPattern = '^' + regexPattern + '$'
        
        const regex = new RegExp(regexPattern, 'i') // Case insensitive
        
        if (regex.test(normalizedPath)) {
            return true
        }
        
        // Also check if the pattern matches just the filename
        const fileName = path.basename(normalizedPath)
        const fileNamePattern = path.basename(normalizedPattern)
        const fileNameRegex = new RegExp(
            '^' + fileNamePattern
                .replace(/[.+^${}()|[\]]/g, '\\$&')
                .replace(/\*\*/g, '___DOUBLESTAR___')
                .replace(/\*/g, '.*')
                .replace(/___DOUBLESTAR___/g, '.*')
                .replace(/\?/g, '.') + '$',
            'i'
        )
        
        if (fileNameRegex.test(fileName)) {
            return true
        }
    }
    
    return false
}

/**
 * Filter out assets that should be ignored based on configuration.
 * 
 * @param {Object} validationResults The validation results from FullRepair
 * @returns {Object} Filtered validation results
 */
function filterIgnoredAssets(validationResults) {
    const ignoredPatterns = ConfigManager.getIgnoredValidationFiles()
    
    if (!ignoredPatterns || ignoredPatterns.length === 0) {
        logger.debug('No ignored file patterns configured')
        return validationResults
    }
    
    logger.info(`Filtering validation results with ${ignoredPatterns.length} ignore pattern(s)`)
    logger.debug('Ignore patterns:', ignoredPatterns)
    
    const filteredResults = {}
    let totalFiltered = 0
    
    for (const [category, assets] of Object.entries(validationResults)) {
        const filteredAssets = assets.filter(asset => {
            const shouldIgnore = matchesPattern(asset.path, ignoredPatterns)
            
            if (shouldIgnore) {
                logger.debug(`Ignoring asset: ${asset.id} (${asset.path})`)
                totalFiltered++
            }
            
            return !shouldIgnore
        })
        
        filteredResults[category] = filteredAssets
    }
    
    if (totalFiltered > 0) {
        logger.info(`Filtered out ${totalFiltered} asset(s) from validation`)
    }
    
    return filteredResults
}

/**
 * Count the total number of invalid assets in validation results.
 * 
 * @param {Object} validationResults The validation results
 * @returns {number} Total count of invalid assets
 */
function countInvalidAssets(validationResults) {
    return Object.values(validationResults)
        .flatMap(assets => assets)
        .length
}

module.exports = {
    matchesPattern,
    filterIgnoredAssets,
    countInvalidAssets
}
