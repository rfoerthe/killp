// import required modules and functions
import { describe, it } from 'mocha'
import defaultFunction from "./index.mjs"
import { Utils } from './index.mjs';

import {expect} from "chai"
import sinon from "sinon";
import os from 'os';

describe('Test index.mjs default function', () => {
  let consoleStub

  beforeEach(function() {
    consoleStub = sinon.stub(console, 'log');
  });

  afterEach(function () {
    consoleStub.restore()
  })

  it('should be an async function', () => {
    expect(defaultFunction).to.be.a('AsyncFunction');
  });

  it('should trigger an error if the port parameter is missing', async () => {
      await defaultFunction().catch(function(err) {
        expect(err.message).to.equal('No process running on port undefined');
      });
  });

  it('should terminate process on port 9000', async () => {
    let getProcessId
    if (os.platform() === 'win32') {
      getProcessId = sinon.stub(Utils.prototype, "getProcessIdWin32")
      getProcessId.withArgs(9000).returns(12345)
    } else {
      getProcessId = sinon.stub(Utils.prototype, "getProcessId")
      getProcessId.withArgs(9000).returns(12345)
    }
    const killProcess = sinon.stub(Utils.prototype, "killProcess").returns(true);

    await defaultFunction(9000, [], true, false)
    expect( console.log.calledWith('Terminated process: 12345') ).to.be.true;

    sinon.assert.calledWith(getProcessId, 9000)
    sinon.assert.calledWith(killProcess, 12345, true, false);
    getProcessId.restore()
    killProcess.restore()
  });

  it('should kill process on port 9000', async () => {
    let getProcessId
    if (os.platform() === 'win32') {
      getProcessId = sinon.stub(Utils.prototype, "getProcessIdWin32")
      getProcessId.withArgs(9000).returns(12345)
    } else {
      getProcessId = sinon.stub(Utils.prototype, "getProcessId")
      getProcessId.withArgs(9000).returns(12345)
    }
    const killProcess = sinon.stub(Utils.prototype, "killProcess").returns(true);

    await defaultFunction(9000, [], true, true)
    expect( console.log.calledWith('Killed process: 12345') ).to.be.true;

    sinon.assert.calledWith(getProcessId, 9000)
    sinon.assert.calledWith(killProcess, 12345, true, true);
    getProcessId.restore()
    killProcess.restore()
  });

  it('should terminate parent process of process on port 9010', async () => {
    let getProcessId
    if (os.platform() === 'win32') {
      getProcessId = sinon.stub(Utils.prototype, "getProcessIdWin32")
      getProcessId.withArgs(9010).returns(12345)
    } else {
      getProcessId = sinon.stub(Utils.prototype, "getProcessId")
      getProcessId.withArgs(9010).returns(12345)
    }
    const killProcess = sinon.stub(Utils.prototype, "killProcess").returns(true);
    const getParentProcess = sinon.stub(Utils.prototype, "getParentProcess")
    getParentProcess.withArgs(12345, ['node','node.exe']).returns({name: 'node', parentProcessId: 707111})

    await defaultFunction(9010, ['node','node.exe'], true, false)
    expect( console.log.calledWith('Terminated parent process \'node\': 707111') ).to.be.true;

    sinon.assert.calledWith(getProcessId, 9010)
    sinon.assert.calledWith(getParentProcess, 12345, ['node','node.exe'])
    sinon.assert.calledWith(killProcess, 707111, true, false);
    getProcessId.restore()
    getParentProcess.restore()
    killProcess.restore()
  });

});