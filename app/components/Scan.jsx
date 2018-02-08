import React, { Component } from 'react';
import { Link } from 'react-router';
import { Switch, Input, Form, Button, Row, Col, Table } from 'antd';
import Electron from 'electron';
import _ from 'underscore';
import fs from 'fs';
import path from 'path';
// import ioBarcode from 'io-barcode';

import Parser from '../lib/Parser/CSV';

import styles from './Scan.css';

let data = [];
let win;

export default class Scan extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      file: '',
      inputSkuFilter: '',
      showPrintWindow: false,
      directPrint: true
    };
  }

  open = () => {
    let file = Electron.remote.dialog.showOpenDialog();

    if (file) {
      file = file[0];
      this.setState({ file });
      if (file.substr(file.length - 3, file.length) === 'csv') {
        const parser = new Parser(file);
        data = parser.parseCSV();
        this.setState({ data });
      }
    }
  }

  test = () => {
    this.setState({
      showPrintWindow: true,
      directPrint: false
    });
    this.print({
      inputSku: '123',
      outputSku: 'Test123',
      quantity: 1
    });
  }

  createPrintWindow = () => new Electron.remote.BrowserWindow({
    show: false,
    webPreferences: {
      javascript: true,
      devTools: true
    }
  });

  print = (record) => {
    console.log(record);
    console.log(win);

    const compiled = _.template(fs.readFileSync(path.join(__dirname, '/templates/barcode.html'), { encoding: 'utf8' }));
    const tempPath = Electron.remote.app.getPath('temp');
    const tempFilePath = path.join(tempPath, '/label-print.html');
    const tempFileLocation = `file://${tempFilePath}`;
    const html = [];

    if (win !== undefined) {
      win.destroy();
    }
    win = this.createPrintWindow();

    html.push(`<div class="printBlock"><svg class="barcode"
      jsbarcode-format="CODE128"
      jsbarcode-value="${record.outputSku}"
      jsbarcode-textmargin="0"
      jsbarcode-fontoptions="bold"
      jsbarcode-width="1"
      jsbarcode-height="40"
      jsbarcode-fontSize="16"
    ></svg>
      ${record.additionalOutput}
    </div>`);

    fs.writeFileSync(
      path.join(tempPath, '/JsBarcode.all.min.js'),
      fs.readFileSync(path.join(__dirname, './JsBarcode.all.min.js'))
    );
    fs.writeFileSync(
      tempFilePath,
      compiled({ barcodes: html.join('') })
    );
    win.loadURL(tempFileLocation);
    win.webContents.on('did-finish-load', () => {
      if (this.state.showPrintWindow) {
        win.show();
        // win.webContents.openDevTools();
      }
      win.webContents.print({ silent: this.state.directPrint });
    });
  }

  showPrintWindowSwitchOnChange = (checked) => {
    this.setState({ showPrintWindow: checked });
  }

  directPrintSwitchOnChange = (checked) => {
    this.setState({ directPrint: checked });
  }

  inputSkuInputOnEnter = (e) => {
    if (e.target.value === '') {
      this.setState({ data });
    } else {
      const filteredData = [];
      for (const record of data) {
        if (record.inputSku === e.target.value) {
          filteredData.push(record);
        }
      }
      this.setState({ data: filteredData });
      if (filteredData.length === 1) {
        this.print(filteredData[0]);
        this.setState({ inputSkuFilter: '' });
        this.inputSkuInput.focus();
      }
    }
  }

  inputSkuInputOnChange = (e) => {
    this.setState({
      inputSkuFilter: e.target.value
    });
  }

  render() {
    const columns = [{
      title: 'Input SKU',
      dataIndex: 'inputSku',
      key: 'inputSku'
    }, {
      title: 'Output SKU',
      dataIndex: 'outputSku',
      key: 'outputSku'
    },{
      title: 'Additional content',
      dataIndex: 'additionalOutput',
      key: 'additionalOutput'
    }, {
      title: 'Print',
      render: (text, record) => <Button onClick={() => this.print(record)}> &#128424; </Button>
    }];

    return (
      <div>
        <Row >
          <Col>
            <Link to="/"> &#8678; go back to home</Link>
          </Col>
          <Col>
            <Button onClick={this.open}>Open file</Button>
            <span className={styles.filename}>{this.state.file}</span>
          </Col>
        </Row>
        <Row>
          <Form inline className={styles.form}>
            <Form.Item>
              <Input
                placeholder="Input SKU"
                value={this.state.inputSkuFilter}
                onChange={this.inputSkuInputOnChange}
                onPressEnter={this.inputSkuInputOnEnter}
                ref={(input) => { this.inputSkuInput = input; }}
              />
            </Form.Item>
            <Form.Item>
              <span> Show Print Window?
                <Switch
                  defaultChecked={this.state.showPrintWindow}
                  onChange={this.showPrintWindowSwitchOnChange}
                />
              </span>
              <span> Direct Print?
                <Switch
                  defaultChecked={this.state.directPrint}
                  onChange={this.directPrintSwitchOnChange}
                />
              </span>
            </Form.Item>
            {/* <Form.Item>
              <Button onClick={this.test}> Test </Button>
            </Form.Item> */}
          </Form>
        </Row>
        <Row>
          <Table
            columns={columns}
            dataSource={this.state.data}
            className={styles.container}
            rowKey="inputSku"
          />
        </Row>
      </div>
    );
  }
}
