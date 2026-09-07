const { checkRelease } = require('./releasechecker')

function waitForRelease(document, currentVersion, quit, query, check = checkRelease) {
    const dialog = document.getElementById('releaseDialog')
    const title = document.getElementById('releaseTitle')
    const description = document.getElementById('releaseDescription')
    const message = document.getElementById('releaseMessage')
    const retry = document.getElementById('releaseRetry')
    const close = document.getElementById('releaseClose')
    close.textContent = query('close')
    retry.textContent = query('retry')
    close.onclick = quit
    dialog.addEventListener('cancel', event => event.preventDefault())
    dialog.showModal()

    return new Promise(resolve => {
        let checking = false
        async function run() {
            if (checking) return
            checking = true
            title.textContent = query('checkingTitle')
            description.textContent = query('checkingMessage')
            message.textContent = ''
            retry.hidden = true
            close.focus()
            try {
                const release = await check(currentVersion)
                if (release.status === 'required') {
                    title.textContent = query('requiredTitle')
                    description.textContent = query('versions', release)
                    message.textContent = release.message || query('defaultMessage')
                } else {
                    dialog.close()
                    resolve(release)
                }
            } catch (error) {
                console.error('Launcher release check failed:', error)
                title.textContent = query('errorTitle')
                description.textContent = query('errorMessage')
                retry.hidden = false
                retry.focus()
            } finally {
                checking = false
            }
        }
        retry.onclick = run
        run()
    })
}

function showReleaseNotice(document, release, query) {
    if (release.status !== 'available') return
    const notice = document.getElementById('releaseNotice')
    document.getElementById('releaseNoticeTitle').textContent = query('availableTitle')
    document.getElementById('releaseNoticeVersions').textContent = query('versions', release)
    document.getElementById('releaseNoticeMessage').textContent = release.message || query('defaultMessage')
    const dismiss = document.getElementById('releaseNoticeDismiss')
    dismiss.textContent = query('dismiss')
    dismiss.onclick = () => { notice.hidden = true }
    notice.hidden = false
}

function createAboutReleaseView(document, currentVersion, query, check = checkRelease) {
    const status = document.getElementById('settingsAboutReleaseStatus')
    const details = document.getElementById('settingsAboutReleaseDetails')
    const latest = document.getElementById('settingsAboutLatestVersion')
    const minimum = document.getElementById('settingsAboutMinimumVersion')
    const message = document.getElementById('settingsAboutReleaseMessage')
    const button = document.getElementById('settingsAboutCheckUpdates')
    let checking = false

    async function refresh() {
        if (checking) return
        checking = true
        button.disabled = true
        button.textContent = query('checkingButton')
        status.textContent = query('checkingTitle')
        details.hidden = true
        latest.textContent = ''
        minimum.textContent = ''
        message.textContent = ''
        message.hidden = true
        try {
            const release = await check(currentVersion)
            status.textContent = query(`${release.status}Title`)
            latest.textContent = release.latestVersion
            minimum.textContent = release.minimumVersion
            details.hidden = false
            message.textContent = release.status === 'current' ? '' : (release.message || query('updateInstructions'))
            message.hidden = !message.textContent
            button.textContent = query('checkButton')
        } catch (error) {
            console.error('About release check failed:', error)
            status.textContent = query('errorTitle')
            message.textContent = query('errorMessage')
            message.hidden = false
            button.textContent = query('retryButton')
        } finally {
            checking = false
            button.disabled = false
        }
    }

    button.onclick = refresh
    return { refresh }
}

module.exports = { waitForRelease, showReleaseNotice, createAboutReleaseView }
