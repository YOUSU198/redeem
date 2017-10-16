import React, { Component } from 'react';
import './App.css';
import Faq from './Faq';
import web3, { initWeb3 } from './web3';
import BigNumber from 'bignumber.js'

const dstoken_abi = require('./abi/dstoken.json');
const redeemer_abi = require('./abi/redeemer.json');

class App extends Component {

  state = {
    connected: null,
    error: null,
    network: null,
    deadline: null,
    mkrBalance: new BigNumber(0),
    oldMkrBalance: new BigNumber(0),
    mkrAllowance: new BigNumber(0),
    oldMkrAllowance: new BigNumber(0)
  }

  old_mkr_address = '0x4bb514a7f83fbb13c2b41448208e89fabbcfe2fb';
  mkr_address = '0x4572baca0e43504234f86380fcdd38fbf81c7888';
  redeemer_address = '0x2c0f31271673cc29927be725104642aad65a253e';

  old_mkr = null;
  redeemer = null;

  componentWillMount() {
    setTimeout(() => {
      initWeb3(web3);
      web3.version.getNetwork((error, network) => {
        if (network !== "42") {
          // Only works in kovan
          this.setState({
            error: `Please connect to the kovan network and try again.`
          });
          return;
        }
        const old_mkr = web3.eth.contract(dstoken_abi).at(this.old_mkr_address);
        const mkr = web3.eth.contract(dstoken_abi).at(this.mkr_address);
        const redeemer = web3.eth.contract(redeemer_abi).at(this.redeemer_address);
        window.old_mkr = old_mkr;
        window.mkr = mkr;
        window.redeemer = redeemer;
        this.old_mkr = old_mkr;
        this.mkr = mkr;
        this.redeemer = redeemer;
        web3.eth.getAccounts((error, x) => {
          if (!error) {
            if (x.length > 0) {
              web3.eth.defaultAccount = x[0];
              this.setState({
                network,
                account: x[0]
              });
              this.getDeadline();
              old_mkr.allEvents({fromBlock:'latest'}, console.log)
              mkr.allEvents({fromBlock:'latest'}, console.log)
              this.checkAll();
              setInterval(this.checkAll, 5000);
            } else {
              this.setState( {
                error: 'No account found. Do you need to unlock Metamask?'
              });
            }
          }
        });
      });
    }, 500);
  }

  getDeadline = () => {
    this.redeemer.undo_deadline((e, deadline) => {
      this.setState({ deadline });
    })
  }

  checkAll = async () => {
    const mkrBalance = await this.getBalance(this.mkr, this.state.account);
    const oldMkrBalance = await this.getBalance(this.old_mkr, this.state.account);
    const mkrAllowance = await this.getAllowance(this.mkr, this.state.account);
    const oldMkrAllowance = await this.getAllowance(this.old_mkr, this.state.account);
    this.setState({
      mkrBalance,
      oldMkrBalance,
      mkrAllowance,
      oldMkrAllowance
    });
  }

  getBalance = (token, account) => {
    return new Promise((resolve, reject) => {
      token.balanceOf(account, (error, balance) => {
        if (!error) {
          resolve(balance);
        } else {
          reject(error);
        }
      });
    })
  }

  getAllowance = (token, account) => {
    return new Promise((resolve, reject) => {
      token.allowance(account, this.redeemer_address, (error, balance) => {
        if (!error) {
          resolve(balance);
        } else {
          reject(error);
        }
      });
    })
  }

  approve = (e) => {
    e.preventDefault();
    this.old_mkr.approve(this.redeemer_address, this.state.oldMkrBalance, (e, r) => {
      console.log(r);
    })
  }

  approve_undo = (e) => {
    e.preventDefault();
    this.mkr.approve(this.redeemer_address, this.state.mkrBalance, (e, r) => {
      console.log(r);
    })
  }

  redeem = (e) => {
    e.preventDefault();
    this.redeemer.redeem((e, r) => {
      console.log(r);
    })
  }

  undo = (e) => {
    e.preventDefault();
    this.redeemer.undo((e, r) => {
      console.log(r);
    })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container">
          <div className="row">
            <div className="col-sm-12">
              <h1 className="text-center">Redeem New MKR</h1>
              <p>
                {this.state.error}
              </p>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="container">
        <div className="row">
          <div className="col-sm-12">
            <h1 className="text-center">
              Redeem New MKR
            </h1>
            <p>
              Although the original MKR token was designed to be upgraded in-place, we have since transitioned to a "box"-oriented architecture where components can be individually verified much more easily, allowing the system as a whole to be analyzed in a manageable way.
            </p>
            <p>
              The new version of the MKR token will be a <kbd>DSToken</kbd> object which can be configured to enable protected operations (e.g. <kbd>burn</kbd>ing MKR tokens) by future SAI and DAI iterations. <kbd>DSToken</kbd> is an ERC20 implementation and extension which has just undergone a bytecode-level verification process by Trail of Bits.
            </p>
            {this.state.deadline &&
              <p>
                You can exchange old tokens for new ones at any time. But you will not be able to revert back to old tokens after {new Date(web3.toDecimal(this.state.deadline) * 1000).toString()}.
              </p>
            }
            {this.state.account &&
              <p>
                Your account: <strong>{this.state.account}</strong>
              </p>
            }
          </div>
          <div className="col-md-12">
            <div className="card-deck">
              <div className="card text-center">
                <div className="card-body">
                  <h3 className="card-title">Old MKR</h3>
                  <p className="card-text">
                    Your balance:
                  </p>
                  <p className="h1">
                    {web3 && web3.fromWei(this.state.oldMkrBalance).toString()}
                  </p>
                  {this.state.oldMkrBalance.gt(0) &&
                    !this.state.oldMkrBalance.eq(this.state.oldMkrAllowance) &&
                    <form onSubmit={this.approve}>
                      <h4>Step 1</h4>
                      <button type="input" className="btn btn-primary">Approve</button>
                      <p>
                        This transaction will approve the Redeemer to exchange your tokens.
                      </p>
                    </form>
                  }
                  {this.state.oldMkrAllowance.gt(0) &&
                    this.state.oldMkrAllowance.eq(this.state.oldMkrBalance) &&
                    <form onSubmit={this.redeem}>
                      <h4>Step 2</h4>
                      <button type="input" className="btn btn-primary">
                        Redeem {web3.fromWei(this.state.oldMkrAllowance).toString()} MKR
                      </button>
                      <p>
                        This transaction will remove your old MKR balance and replace it with new MKR tokens.
                      </p>
                    </form>
                  }
                </div>
                {/* <div className="card-footer text-white bg-dark">
                  <small className="text-muted">Last updated 3 mins ago</small>
                </div> */}
              </div>
              <div className="card text-center">
                <div className="card-body">
                  <h3 className="card-title">MKR</h3>
                  <p className="card-text">
                    Your balance:
                  </p>
                  <p className="h1">
                    {web3 && web3.fromWei(this.state.mkrBalance).toString()}
                  </p>
                  {this.state.mkrBalance.gt(0) &&
                    !this.state.mkrBalance.eq(this.state.mkrAllowance) &&
                    web3.toDecimal(this.state.deadline) > (Date.now() / 1000) &&
                    <form onSubmit={this.approve_undo}>
                      <button type="input" className="btn btn-primary">Approve Undo</button>
                    </form>
                  }
                  {this.state.mkrAllowance.gt(0) &&
                    <form onSubmit={this.undo}>
                      <button type="input" className="btn btn-primary">Undo</button>
                    </form>
                  }
                </div>
                {/* <div className="card-footer">
                  <small className="text-muted">Last updated 3 mins ago</small>
                </div> */}
              </div>
            </div>
          </div>
        </div>
        <Faq />
      </div>
    );
  }
}

export default App;