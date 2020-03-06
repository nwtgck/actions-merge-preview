import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'
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
        // eslint-disable-next-line no-console
        console.log(
          `HINT: Merge-preview is triggered when you comment "${previewComment}"`
        )
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const association = (context.payload as any).comment.author_association
      // If commenting user has no write permission
      if (!(association === 'OWNER' || association === 'COLLABORATOR')) {
        // eslint-disable-next-line no-console
        console.warn(
          `NOTE: The owner and the collaborators can trigger this action, but you are ${association}.`
        )
        return
      }
      // Get pull-req URL like "https://api.github.com/repos/nwtgck/actions-merge-preview/pulls/4"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pullReqUrl: string = (context.payload as any).issue.pull_request.url
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const githubUser: string = (context.payload as any).repository.owner.login
      // eslint-disable-next-line no-console
      console.log({githubUser})
      const res = await fetch(pullReqUrl, {
        headers: [
          [
            'Authorization',
            `Basic ${Buffer.from(`${githubUser}:${githubToken}`).toString(
              'base64'
            )}`
          ]
        ]
      })
      const resJson = await res.json()
      const prUserName: string = resJson.head.user.login
      const baseBranchName: string = resJson.base.ref
      const branchName: string = resJson.head.ref
      const fullRepoName: string = resJson.head.repo.full_name
      const previewBranchName = `actions-merge-preview/${prUserName}-${branchName}`

      // TODO:
      execSync(`git config --global user.email "bee-bot-bot@protonmail.com"`)
      // TODO:
      execSync(`git config --global user.name "Bee Bot"`)
      // (from: https://stackoverflow.com/a/23987039/2885946)
      execSync(`git fetch --unshallow --all`)
      // eslint-disable-next-line no-console
      console.log(execSync(`git checkout ${baseBranchName}`).toString())
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
      // NOTE: Force push (should be safe because preview branch always start with "actions-merge-preview/")
      execSync(`git push -fu origin ${previewBranchName}`)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseRepoFullName = (context.payload as any).repository.full_name
      // Create GitHub client
      const githubClient = new GitHub(githubToken)
      // Comment body
      const commentBody = `Preview branch:  \n<https://github.com/${baseRepoFullName}/tree/${previewBranchName}>`
      // Comment the deploy URL
      await githubClient.issues.createComment({
        // eslint-disable-next-line @typescript-eslint/camelcase
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: commentBody
      })
    } else {
      // eslint-disable-next-line no-console
      console.warn(`event name is not 'issue_comment': ${context.eventName}`)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
