const {resolve} = require('path')
const {readFileSync} = require('fs')
const {createHmac} = require('crypto')
const git = require('nodegit')

const target = new Date('2017/12/01').getTime()

const main = async () => {
  const shiba = await git.Repository.open('.')
  const hash = createHmac('sha256', readFileSync('.secret').toString())
    .update(process.env.REPO)
    .digest('hex')
  try {
    await shiba.checkoutBranch(hash)
  } catch (err) {
    const shibaMaster = await shiba.getMasterCommit()
    await shiba.createBranch(hash, shibaMaster)
    await shiba.checkoutBranch(hash)
  }
  const repo = await git.Repository.open(
    resolve(process.env.GOPATH, 'src', process.env.REPO)
  )
  let commit = await repo.getMasterCommit()
  let candidates = []
  while (true) {
    const parents = await commit.getParents()
    commit = parents[0]
    const date = commit.date()
    if (date > target) {
      const name = commit.author().name()
      if (name === 'jigsaw' || name === 'jgs') candidates.push(date)
    } else break
  }
  for (const date of candidates.reverse()) {
    const signature = git.Signature.create(
      'jigsaw',
      'm@jgs.me',
      date.getTime() / 1000,
      540
    )
    const head = await git.Reference.nameToId(shiba, 'HEAD')
    const parent = await shiba.getCommit(head)
    const index = await shiba.index()
    const tree = await index.writeTree()
    await shiba.createCommit(
      'HEAD',
      signature,
      signature,
      `:zap: ${date}`,
      tree,
      [parent]
    )
  }
}

main()
