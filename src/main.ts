import * as core from '@actions/core'
import {context} from '@actions/github'
import fetch from 'node-fetch'
import {execSync} from 'child_process'

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', {required: true})
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(context, null, 2))
    if (context.eventName === 'issue_comment') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comment: string = (context.payload as any).comment.body
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
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(resJson, null, 2))
      const prUserName: string = resJson.head.user.login
      const baseBranchName: string = resJson.base.ref
      const branchName: string = resJson.head.ref
      const fullRepoName: string = resJson.head.repo.full_name
      // eslint-disable-next-line no-console
      console.log(execSync(`git status`).toString())
      // eslint-disable-next-line no-console
      console.log(execSync(`git log`).toString())
      execSync(
        `git checkout -b merge-preview--${prUserName}-${branchName} ${baseBranchName}`
      )
      execSync(`git pull git@github.com:${fullRepoName}.git ${branchName}`)
    } else {
      // eslint-disable-next-line no-console
      console.warn(`event name is not 'issue_comment': ${context.eventName}`)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
