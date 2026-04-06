// import required modules and functions
import { describe, it, beforeEach, afterEach } from 'mocha'
import defaultFunction from './index.mjs'
import { Support } from './index.mjs'

import {expect} from 'chai'
import sinon from 'sinon'
import os from 'os'

const isWindows = os.platform() === 'win32'
const getProcessIdMethod = isWindows ? 'getProcessIdWin32' : 'getProcessId'

describe('Test index.mjs default function', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should be an async function', () => {
    expect(defaultFunction).to.be.a('AsyncFunction')
  })

  it('should trigger an error if the port parameter is missing', async () => {
      await defaultFunction().catch(err => {
        expect(err.message).to.equal('No process running on port undefined')
      })
  })

  it('should terminate process on port 9000', async () => {
    const getProcessId = sandbox.stub(Support.prototype, getProcessIdMethod)
    getProcessId.withArgs(9000).returns(12345)
    const killProcess = sandbox.stub(Support.prototype, "killProcess").returns(true)

    await defaultFunction(9000, [], true, false)

    const expectedMsg = isWindows ? 'Killed process: 12345' : 'Terminated process: 12345'
    expect( console.log.calledWith(expectedMsg) ).to.be.true

    sinon.assert.calledWith(getProcessId, 9000)
    sinon.assert.calledWith(killProcess, 12345, true, false)
  })

  it('should kill process on port 9000', async () => {
    const getProcessId = sandbox.stub(Support.prototype, getProcessIdMethod)
    getProcessId.withArgs(9000).returns(12345)
    const killProcess = sandbox.stub(Support.prototype, "killProcess").returns(true)

    await defaultFunction(9000, [], true, true)
    expect( console.log.calledWith('Killed process: 12345') ).to.be.true

    sinon.assert.calledWith(getProcessId, 9000)
    sinon.assert.calledWith(killProcess, 12345, true, true)
  })

  it('should terminate parent process of process on port 9010', async () => {
    const getProcessId = sandbox.stub(Support.prototype, getProcessIdMethod)
    getProcessId.withArgs(9010).returns(12345)
    const killProcess = sandbox.stub(Support.prototype, "killProcess").returns(true)
    const getParentProcess = sandbox.stub(Support.prototype, "getParentProcess")
    getParentProcess.withArgs(12345, ['node','node.exe']).returns({name: 'node', parentProcessId: 707111})

    await defaultFunction(9010, ['node','node.exe'], true, false)

    const expectedMsg = isWindows ? 'Killed parent process \'node\': 707111' : 'Terminated parent process \'node\': 707111'
    expect( console.log.calledWith(expectedMsg) ).to.be.true

    sinon.assert.calledWith(getProcessId, 9010)
    sinon.assert.calledWith(getParentProcess, 12345, ['node','node.exe'])
    sinon.assert.calledWith(killProcess, 707111, true, false)
  })
})
