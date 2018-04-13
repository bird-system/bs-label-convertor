import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Switch, Input, Form, Button, Row, Col, Table } from 'antd';
import Electron from 'electron';
import _ from 'underscore';
import fs from 'fs';
import path from 'path';
import barcodeTemplate from '../templates/barcode.html';
import JsBarcodeText from '../templates/JsBarcode.all.min.js.html';
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
      printQuantityMap: {}, // inputSku -> printQuantity
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
        this.setState({
          data,
          printQuantityMap: {},
        });
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

    // console.log(barcodeTemplate);
    // const compiled = _.template(fs.readFileSync(path.join(__dirname, '/templates/barcode.html'), { encoding: 'utf8' }));
    const compiled = _.template(barcodeTemplate);
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
      jsbarcode-textMargin="0"
      jsbarcode-fontoptions="bold"
      jsbarcode-width="1"
      jsbarcode-height="28"
      jsbarcode-fontSize="14"
      jsbarcode-marginTop="12"
      jsbarcode-marginBottom="2"
    ></svg>
      <div class="additional-content">
        ${record.additionalOutput}
      </div>
    </div>`);

    fs.writeFileSync(
      path.join(tempPath, '/JsBarcode.all.min.js'),
      JsBarcodeText
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
      win.webContents.print({ silent: this.state.directPrint }, (success) => {
        if (!success) return;

        const printQuantityMap = Object.assign({}, this.state.printQuantityMap);
        const key = record.inputSku;
        const num = printQuantityMap[key] || 0;
        if (typeof num === 'number') {
          printQuantityMap[key] = num + 1;
        }

        this.setState({ printQuantityMap });
      });
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

  plusPrintQuantity = (record = {}) => {
    const printQuantityMap = Object.assign({}, this.state.printQuantityMap || {});
    const key = record.inputSku;

    if (key) {
      let num = printQuantityMap[key] || 0;
      num += 1;
      printQuantityMap[key] = num;
      this.setState({ printQuantityMap });
    }
  }

  minusPrintQuantity = (record = {}) => {
    const printQuantityMap = Object.assign({}, this.state.printQuantityMap || {});
    const key = record.inputSku;

    if (key) {
      let num = printQuantityMap[key] || 0;
      num -= 1;
      if (num < 0) {
        num = 0;
      }
      printQuantityMap[key] = num;
      this.setState({ printQuantityMap });
    }
  }

  addPrintQuantityToTableData = (data = []) => {
    const newData = [];
    const printQuantityMap = this.state.printQuantityMap || {};

    data.forEach((item = {}) => {
      const newItem = Object.assign({}, item);
      newItem.printQuantity = 0;

      const key = item.inputSku;
      if (key && printQuantityMap[key]) {
        newItem.printQuantity = printQuantityMap[key];
      }

      newData.push(newItem);
    });

    return newData;
  }

  downloadCSV = (csv, filename) => {
    // CSV file
    const csvFile = new Blob([csv], { type: 'text/csv' });

    // Download link
    const downloadLink = document.createElement('a');

    // File name
    downloadLink.download = filename;

    // Create a link to the file
    downloadLink.href = window.URL.createObjectURL(csvFile);

    // Hide download link
    downloadLink.style.display = 'none';

    // Add the link to DOM
    document.body.appendChild(downloadLink);

    // Click download link
    downloadLink.click();
  }

  exportTableToCSV = (filename) => {
    const csv = [];
    const rows = document.querySelectorAll('table tr');

    for (let i = 0; i < rows.length; i += 1) {
      const row = [];
      const cols = rows[i].querySelectorAll('td, th');

      for (let j = 0; j < cols.length; j += 1) {
        row.push(cols[j].innerText);
      }

      csv.push(row.join(','));
    }

    // Download CSV file
    this.downloadCSV(csv.join('\n'), filename);
  }

  render() {
    const columns = [
      {
        title: 'Input SKU',
        dataIndex: 'inputSku',
        key: 'inputSku'
      },
      {
        title: 'Output SKU',
        dataIndex: 'outputSku',
        key: 'outputSku'
      },
      {
        title: 'Additional content',
        dataIndex: 'additionalOutput',
        key: 'additionalOutput'
      },
      {
        title: 'Print QTY',
        dataIndex: 'printQuantity',
        key: 'printQuantity'
      },
      {
        title: 'Action',
        render: (text, record) => {
          return (
            <span>
              <Button
                icon="plus"
                onClick={() => this.plusPrintQuantity(record)}
              />

              <Button
                icon="minus"
                style={{ marginLeft: 10 }}
                onClick={() => this.minusPrintQuantity(record)}
              />
            </span>
          );
        }
      },
      {
        title: 'Print',
        render: (text, record) => {
          return (
            <span>
              <Button
                icon="printer"
                onClick={() => this.print(record)}
              />
            </span>
          );
        }
      },
    ];

    const tableData = this.addPrintQuantityToTableData(this.state.data);

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
          <Form layout="inline" className={styles.form}>
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
            <Form.Item>
              <Button
                icon="export"
                onClick={() => {
                  this.exportTableToCSV('barcodes.csv');
                }}
              >
                Export
              </Button>
            </Form.Item>
            {/* <Form.Item>
              <Button onClick={this.test}> Test </Button>
            </Form.Item> */}
          </Form>
        </Row>
        <Row>
          <Table
            columns={columns}
            dataSource={tableData}
            className={styles.container}
            rowKey="inputSku"
            pagination={{
              defaultPageSize: 500,
              showQuickJumper: true,
              showTotal: (paginationTotal, range) => `${range[0]}-${range[1]} of ${paginationTotal} items`,
            }}
          />
        </Row>
      </div>
    );
  }
}
