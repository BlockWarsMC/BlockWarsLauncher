const { DistributionAPI } = require('helios-core/common')
const ConfigManager = require('./configmanager')
require('dotenv').config()

// Use environment variable for the distribution URL
exports.REMOTE_DISTRO_URL = process.env.REMOTE_DISTRO_URL

const api = new DistributionAPI(
    ConfigManager.getLauncherDirectory(),
    null, // Injected forcefully by the preloader.
    null, // Injected forcefully by the preloader.
    exports.REMOTE_DISTRO_URL,
    false
)

exports.DistroAPI = api