// @flow
import React, { Component } from 'react';
import { Link } from 'react-router';
import styles from './Home.css';


export default class Home extends Component {
  render() {
    return (
      <div>
        <div className={styles.container}>
          <h1> Home </h1>
          <p><Link to="/scan">上传文件扫描出贴</Link></p>
        </div>
      </div>
    );
  }
}
