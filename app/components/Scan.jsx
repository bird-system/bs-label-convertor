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
    let file = Electron.remote.dialog.showOpenDialog({
      properties: ['openFile'],
      filters: {
        name: 'Files',
        extensions: ['csv', 'xslx']
      }
    });

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
    this.print({
      inputSku: '123',
      outputSku: 'Test123',
      quantity: 1
    });
  }

  print = (record) => {
    console.log(record);

    const compiled = _.template(fs.readFileSync(path.join(__dirname, '/templates/barcode.tmpl'), { encoding: 'utf8' }));
    const tempPath = Electron.remote.app.getPath('temp');
    const tempFilePath = path.join(tempPath, '/label-print.html');
    const tempFileLocation = `file://${tempFilePath}`;
    const win = new Electron.remote.BrowserWindow({
      show: false,
      webPreferences: {
        javascript: true,
        devTools: false
      }
    });
    const html = [];

    for (let i = 0; i < record.quantity; i += 1) {
      html.push(`<div class="printBlock"><svg class="barcode"
        jsbarcode-format="CODE128"
        jsbarcode-value="${record.outputSku}"
        jsbarcode-textmargin="0"
        jsbarcode-fontoptions="bold"
        jsbarcode-fontSize="30"
      ></svg></div>`);
    }

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
    }, {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity'
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
