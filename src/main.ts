import * as core from '@actions/core'
import {context} from '@actions/github'
import fetch from 'node-fetch'
import {execSync} from 'child_process'

const previewComment = '@bee-bot merge preview'

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', {required: true})
    if (context.eventName === 'issue_comment') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comment: string = (context.payload as any).comment.body
      // If not preview-request comment
      if (!comment.startsWith(previewComment)) {
        return
      }
      // eslint-disable-next-line no-console
      console.log({commentBody: comment})
      // Get pull-req URL like "https://api.github.com/repos/nwtgck/actions-merge-preview/pulls/4"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pullReqUrl: string = (context.payload as any).issue.pull_request.url
      const res = await fetch(pullReqUrl, {
        headers: [
          [
            'Authorization',
            // TODO: user hard code
            `Basic ${Buffer.from(`nwtgck:${githubToken}`).toString('base64')}`
          ]
        ]
      })
      const resJson = await res.json()
      const prUserName: string = resJson.head.user.login
      const baseBranchName: string = resJson.base.ref
      const branchName: string = resJson.head.ref
      const fullRepoName: string = resJson.head.repo.full_name
      // TODO: Avoid branch name conflict
      const previewBranchName = `actions-merge-preview/${prUserName}-${branchName}`

      // TODO:
      execSync(`git config --global user.email "bee-bot-bot@protonmail.com"`)
      // TODO:
      execSync(`git config --global user.name "Bee Bot"`)
      // (from: https://stackoverflow.com/a/23987039/2885946)
      execSync(`git fetch --unshallow`)
      // eslint-disable-next-line no-console
      console.log(
        execSync(
          `git checkout -b ${previewBranchName} ${baseBranchName}`
        ).toString()
      )
      // eslint-disable-next-line no-console
      console.log(
        execSync(
          `git pull https://github.com/${fullRepoName}.git ${branchName}`
        ).toString()
      )
      // Push preview branch
      execSync(`git push -u origin ${previewBranchName}`)
    } else {
      // eslint-disable-next-line no-console
      console.warn(`event name is not 'issue_comment': ${context.eventName}`)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
